import type { Prisma } from '@prisma/client';

const INSENSITIVE = 'insensitive' as const;

/** Split a search box value into tokens (max 4). Empty / whitespace → []. */
export function tokenizeListSearch(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .trim()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .slice(0, 4);
}

export function containsInsensitive(
  value: string,
): { contains: string; mode: 'insensitive' } {
  return { contains: value, mode: INSENSITIVE };
}

export function equalsInsensitive(
  value: string,
): { equals: string; mode: 'insensitive' } {
  return { equals: value, mode: INSENSITIVE };
}

export function startsWithInsensitive(
  value: string,
): { startsWith: string; mode: 'insensitive' } {
  return { startsWith: value, mode: INSENSITIVE };
}

type StringFilter = { contains: string; mode: 'insensitive' };

/**
 * True when the query looks like a SKU / barcode scan (single dense token).
 * Those should hit btree equality / prefix indexes (≈ O(log n)), not a wide
 * trigram OR across many columns.
 */
export function isSkuLikeLookup(raw: string | undefined | null): boolean {
  const tokens = tokenizeListSearch(raw);
  if (tokens.length !== 1) return false;
  const token = tokens[0]!;
  if (token.length < 2) return false;
  // Letters, digits, and common SKU separators — no spaces (already tokenized).
  return /^[A-Za-z0-9][A-Za-z0-9._\-/]*$/.test(token);
}

/** Phone / mobile lookup — prefer prefix/equality over multi-field fuzzy OR. */
export function isPhoneLikeLookup(raw: string | undefined | null): boolean {
  if (!raw?.trim()) return false;
  const trimmed = raw.trim();
  if (!/^[\d\s+().-]{7,20}$/.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, '');
  return digits.length >= 7;
}

/**
 * Fast product / stock text filter:
 * - SKU-like → equality + prefix on `sku` / `name` (btree-friendly)
 * - Otherwise → tokenized trigram `contains` on name + sku (+ optional extras)
 *
 * Prefer this over OR-ing contains across description/unit/location fields —
 * those defeat GIN trigram indexes and turn search into O(n).
 */
export function itemTextSearchWhere(
  search: string | undefined | null,
  options?: {
    /** Extra OR branches per token for fuzzy path only (e.g. carModel, brand). */
    extraFuzzyFields?: (token: string, contains: StringFilter) => object[];
  },
): { AND: Array<{ OR: object[] }> } | undefined {
  const tokens = tokenizeListSearch(search).filter((t) => t.length >= 2);
  if (tokens.length === 0) return undefined;

  if (isSkuLikeLookup(search)) {
    const token = tokenizeListSearch(search)[0]!;
    return {
      AND: [
        {
          OR: [
            { sku: equalsInsensitive(token) },
            { sku: startsWithInsensitive(token) },
            { name: equalsInsensitive(token) },
            { name: startsWithInsensitive(token) },
          ],
        },
      ],
    };
  }

  return {
    AND: tokens.map((token) => {
      const contains = containsInsensitive(token);
      const branches: object[] = [{ name: contains }, { sku: contains }];
      if (options?.extraFuzzyFields) {
        branches.push(...options.extraFuzzyFields(token, contains));
      }
      return { OR: branches };
    }),
  };
}

/**
 * OR branches matching the manually-entered Contact ID stored in
 * `Customer.details.contactId` (a vehicle registration number for automotive).
 * Stored values are normalized to upper-case, so the token is upper-cased too
 * (Prisma JSON path filters are case-sensitive).
 */
function contactIdJsonOr(token: string): object[] {
  const upper = token.toUpperCase();
  return [
    { details: { path: ['contactId'], string_starts_with: upper } },
    { details: { path: ['contactId'], string_contains: upper } },
  ];
}

/**
 * Customer / contact search:
 * - phone-like → phone equality + prefix (fast)
 * - single dense token → name equality + prefix + Contact ID (plate) match
 * - else → trigram contains on name / email / phone + Contact ID match
 */
export function contactTextSearchWhere(
  search: string | undefined | null,
): { AND: Array<{ OR: object[] }> } | undefined {
  const raw = search?.trim();
  if (!raw) return undefined;

  if (isPhoneLikeLookup(raw)) {
    const digits = raw.replace(/\D/g, '');
    return {
      AND: [
        {
          OR: [
            { phone: equalsInsensitive(raw) },
            { phone: startsWithInsensitive(raw) },
            { phone: containsInsensitive(digits) },
          ],
        },
      ],
    };
  }

  // A single dense token (a name word or a plate) must still match anywhere in
  // the name — customer names are often "OWNER VEHICLE PLATE", so prefix-only
  // matching would hide most records. Use `contains` on name/email plus the
  // fast prefix/equality branches (index-friendly) and the Contact ID match.
  if (isSkuLikeLookup(raw)) {
    const token = tokenizeListSearch(raw)[0]!;
    return {
      AND: [
        {
          OR: [
            { name: startsWithInsensitive(token) },
            { name: containsInsensitive(token) },
            { email: startsWithInsensitive(token) },
            { email: containsInsensitive(token) },
            ...contactIdJsonOr(token),
          ],
        },
      ],
    };
  }

  // Multi-word queries are names (trigram-indexed). Plates / Contact IDs are
  // single dense tokens handled by the sku-like branch above, so we skip the
  // unindexed JSON `details.contactId` scan here to keep name search fast.
  return tokenizedSearchWhere(raw, (token, contains) => [
    { name: contains },
    { email: contains },
    { phone: contains },
  ]);
}

/**
 * Build a Prisma `AND` of per-token `OR` clauses so multi-word queries
 * match when every token hits at least one field (e.g. "camry brake pad").
 *
 * `fieldsForToken` receives each token and returns OR branches for that token.
 */
export function tokenizedSearchWhere<T extends object>(
  search: string | undefined | null,
  fieldsForToken: (token: string, contains: StringFilter) => T[],
): { AND: Array<{ OR: T[] }> } | undefined {
  const tokens = tokenizeListSearch(search).filter((t) => t.length >= 2);
  if (tokens.length === 0) return undefined;
  return {
    AND: tokens.map((token) => ({
      OR: fieldsForToken(token, containsInsensitive(token)),
    })),
  };
}

/** Convenience: plain string columns on the root model. */
export function stringFieldOr(
  fields: string[],
  contains: StringFilter,
): Array<Record<string, StringFilter>> {
  return fields.map((field) => ({ [field]: contains }));
}

/** Nested relation string field, e.g. brand.name / customer.name. */
export function relationStringOr(
  relation: string,
  field: string,
  contains: StringFilter,
): Record<string, Record<string, StringFilter>> {
  return { [relation]: { [field]: contains } };
}

/** Type helper for Prisma where fragments. */
export type PrismaSearchAnd = {
  AND: Array<{ OR: Prisma.Enumerable<object>[] }>;
};

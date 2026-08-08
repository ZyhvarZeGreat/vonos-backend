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
 *
 * Short letter-only tokens (e.g. "OT", "LED") are NOT sku-like — they are
 * often suffixes inside product names ("TAPPING SWITCH OT") and must use
 * trigram `contains`, not name/sku prefix-only matching.
 */
export function isSkuLikeLookup(raw: string | undefined | null): boolean {
  const tokens = tokenizeListSearch(raw);
  if (tokens.length !== 1) return false;
  const token = tokens[0]!;
  if (token.length < 2) return false;
  // Letters, digits, and common SKU separators — no spaces (already tokenized).
  if (!/^[A-Za-z0-9][A-Za-z0-9._\-/]*$/.test(token)) return false;
  // Require a digit or SKU separator so plain words use contains search.
  return /[\d._\-/]/.test(token);
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
 * - SKU-like → equality + prefix on `sku` / `name` / `carModel` (btree-friendly)
 * - Otherwise → tokenized trigram `contains` on name + sku + carModel (+ optional extras)
 *
 * There is no separate part-number column — part numbers live in `sku` (and often `name`).
 * Model / fitment text lives in `carModel`.
 *
 * Prefer this over OR-ing contains across description/unit/location fields —
 * those defeat GIN trigram indexes and turn search into O(n).
 */
export function itemTextSearchWhere(
  search: string | undefined | null,
  options?: {
    /** Extra OR branches per token for fuzzy path only (e.g. brand, category). */
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
            // Mid-string SKU / name hits (e.g. code embedded in a longer label).
            { sku: containsInsensitive(token) },
            { name: equalsInsensitive(token) },
            { name: startsWithInsensitive(token) },
            { name: containsInsensitive(token) },
            { carModel: equalsInsensitive(token) },
            { carModel: startsWithInsensitive(token) },
            { carModel: containsInsensitive(token) },
          ],
        },
      ],
    };
  }

  return {
    AND: tokens.map((token) => {
      const contains = containsInsensitive(token);
      const branches: object[] = [
        { name: contains },
        { sku: contains },
        { carModel: contains },
      ];
      if (options?.extraFuzzyFields) {
        branches.push(...options.extraFuzzyFields(token, contains));
      }
      return { OR: branches };
    }),
  };
}

/**
 * Compact a plate / Contact ID for JSON matching: upper-case, strip spaces.
 * Stored Contact IDs are normalized to upper-case (often with hyphens).
 */
export function compactPlateToken(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * True when the query looks like a vehicle plate / Contact ID
 * (letters + digits with optional spaces or hyphens), e.g. `ABC-123XY`,
 * `ABC 123 XY`, `GWA425SF`.
 */
export function isPlateLikeLookup(raw: string | undefined | null): boolean {
  if (!raw?.trim()) return false;
  const compact = compactPlateToken(raw);
  if (compact.length < 3 || compact.length > 16) return false;
  // Must mix letters and digits (pure words/numbers are not plates).
  if (!/[A-Z]/.test(compact) || !/\d/.test(compact)) return false;
  return /^[A-Z0-9-]+$/.test(compact);
}

/**
 * OR branches matching the manually-entered Contact ID stored in
 * `Customer.details.contactId` (a vehicle registration number for automotive).
 * Stored values are normalized to upper-case, so the token is upper-cased too
 * (Prisma JSON path filters are case-sensitive).
 */
function contactIdJsonOr(token: string): object[] {
  const upper = compactPlateToken(token);
  if (!upper) return [];
  const withHyphen = upper.includes('-')
    ? upper
    : upper.replace(/^([A-Z]{1,4})(\d)/, '$1-$2');
  const branches = [
    { details: { path: ['contactId'], equals: upper } },
    { details: { path: ['contactId'], string_starts_with: upper } },
    { details: { path: ['contactId'], string_contains: upper } },
  ];
  if (withHyphen !== upper) {
    branches.push(
      { details: { path: ['contactId'], equals: withHyphen } },
      { details: { path: ['contactId'], string_starts_with: withHyphen } },
      { details: { path: ['contactId'], string_contains: withHyphen } },
    );
  }
  return branches;
}

/**
 * Customer / contact search:
 * - phone-like → phone equality + prefix (fast)
 * - plate-like → Contact ID (plate) match + name contains
 * - single dense token → name equality + prefix + Contact ID (plate) match
 * - else → trigram contains on name / email / phone (+ plate when token looks like one)
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

  // Spaced plates ("ABC 123 XY") fail isSkuLikeLookup — handle explicitly.
  if (isPlateLikeLookup(raw)) {
    const compact = compactPlateToken(raw);
    return {
      AND: [
        {
          OR: [
            { name: containsInsensitive(compact) },
            { name: containsInsensitive(raw) },
            ...contactIdJsonOr(compact),
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

  // Multi-word name queries: trigram on name/email/phone. Also OR a plate
  // match when the full query (spaces stripped) looks like a Contact ID.
  const tokenized = tokenizedSearchWhere(raw, (token, contains) => [
    { name: contains },
    { email: contains },
    { phone: contains },
    ...(isPlateLikeLookup(token) ? contactIdJsonOr(token) : []),
  ]);
  const joined = raw.replace(/\s+/g, '');
  if (isPlateLikeLookup(joined) || isPlateLikeLookup(raw)) {
    const plateOr = {
      OR: contactIdJsonOr(compactPlateToken(raw)),
    };
    if (!tokenized) return { AND: [plateOr] };
    return { AND: [{ OR: [tokenized, plateOr] }] };
  }
  return tokenized;
}

/**
 * Supplier / vendor contact search — same phone / dense-token / fuzzy paths
 * as customers, with supplier-specific fields.
 */
export function supplierTextSearchWhere(
  search: string | undefined | null,
):
  | { AND: Array<{ OR: object[] }> }
  | { OR: object[] }
  | undefined {
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

  if (isSkuLikeLookup(raw)) {
    const token = tokenizeListSearch(raw)[0]!;
    return {
      AND: [
        {
          OR: [
            { name: startsWithInsensitive(token) },
            { name: containsInsensitive(token) },
            { contactName: startsWithInsensitive(token) },
            { contactName: containsInsensitive(token) },
            { email: startsWithInsensitive(token) },
            { taxNumber: startsWithInsensitive(token) },
            { phone: startsWithInsensitive(token) },
          ],
        },
      ],
    };
  }

  const tokenized = tokenizedSearchWhere(raw, (_token, contains) => [
    { name: contains },
    { contactName: contains },
    { email: contains },
    { phone: contains },
    { address: contains },
    { taxNumber: contains },
    { notes: contains },
    { locationCode: contains },
  ]);

  // Full-phrase OR + tokenized AND — typing "Sunny Day 7" must still hit
  // "Sunny Day number seven" even when short tokens are dropped.
  return {
    OR: [
      { name: containsInsensitive(raw) },
      { contactName: containsInsensitive(raw) },
      { email: containsInsensitive(raw) },
      { phone: containsInsensitive(raw) },
      ...(tokenized ? [tokenized] : []),
    ],
  };
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

/**
 * Sales / invoice list search:
 * - invoice-like single token → equality + prefix on reference (btree-friendly)
 *   plus customer name/phone prefix
 * - else → tokenized contains across sale + customer fields
 */
export function saleTextSearchWhere(
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
            { customer: { phone: equalsInsensitive(raw) } },
            { customer: { phone: startsWithInsensitive(raw) } },
            { customer: { phone: containsInsensitive(digits) } },
          ],
        },
      ],
    };
  }

  if (isPlateLikeLookup(raw) || isSkuLikeLookup(raw)) {
    const token = isPlateLikeLookup(raw)
      ? compactPlateToken(raw)
      : tokenizeListSearch(raw)[0]!;
    const plateOr = contactIdJsonOr(token).map((branch) => ({
      customer: branch,
    }));
    return {
      AND: [
        {
          OR: [
            { reference: equalsInsensitive(token) },
            { reference: startsWithInsensitive(token) },
            { trackingNumber: equalsInsensitive(token) },
            { trackingNumber: startsWithInsensitive(token) },
            { customer: { name: startsWithInsensitive(token) } },
            { customer: { name: containsInsensitive(token) } },
            { customer: { phone: startsWithInsensitive(token) } },
            { job: { reference: startsWithInsensitive(token) } },
            ...plateOr,
            { notes: containsInsensitive(token) },
          ],
        },
      ],
    };
  }

  return tokenizedSearchWhere(raw, (_token, contains) => [
    { reference: contains },
    { paymentMethod: contains },
    { locationCode: contains },
    { notes: contains },
    { createdByName: contains },
    { cleanerName: contains },
    { shippingStatus: contains },
    { trackingNumber: contains },
    relationStringOr('customer', 'name', contains),
    relationStringOr('customer', 'phone', contains),
    relationStringOr('customer', 'email', contains),
    relationStringOr('job', 'reference', contains),
  ]);
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

import type { Prisma } from '@prisma/client';

const INSENSITIVE = 'insensitive' as const;

/** Split a search box value into tokens (max 6). Empty / whitespace → []. */
export function tokenizeListSearch(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .trim()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .slice(0, 6);
}

export function containsInsensitive(
  value: string,
): { contains: string; mode: 'insensitive' } {
  return { contains: value, mode: INSENSITIVE };
}

type StringFilter = { contains: string; mode: 'insensitive' };

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
  const tokens = tokenizeListSearch(search);
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

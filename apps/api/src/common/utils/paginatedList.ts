import type { Prisma } from '@prisma/client';

/** Shared list envelope for cursor-paginated endpoints. */
export interface PaginatedList<T> {
  items: T[];
  totalCount: number;
}

export function isPaginatedList<T>(
  value: unknown,
): value is PaginatedList<T> {
  return (
    typeof value === 'object' &&
    value != null &&
    Array.isArray((value as PaginatedList<T>).items) &&
    typeof (value as PaginatedList<T>).totalCount === 'number'
  );
}

/** Strip cursor clause so count matches the full filtered set. */
export type ListWhere = Prisma.JsonObject;

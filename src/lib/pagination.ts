/**
 * Shared list pagination + search-param parsing for tenant-scoped API routes.
 */

export interface ListParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
  q: string | null;
  status: string | null;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 500;

export function parseListParams(searchParams: URLSearchParams): ListParams {
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const rawLimit = parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT;
  const limit = Math.min(MAX_LIMIT, Math.max(1, rawLimit));
  const q = searchParams.get("q");
  const status = searchParams.get("status");
  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
    q: q && q.trim() ? q.trim() : null,
    status: status && status.trim() ? status.trim() : null,
  };
}

export interface Paginated<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function listResponse<T>(data: T[], total: number, page: number, limit: number): Paginated<T> {
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

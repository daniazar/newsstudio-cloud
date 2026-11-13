"use client";

import useSWRInfinite from "swr/infinite";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export interface InfiniteEnvelope<T> {
  data: T[];
  pagination?: { total: number; page: number; limit: number; totalPages: number };
}

export interface UseInfiniteListOptions {
  /** Page size. */
  limit?: number;
  /** URL query filters (e.g. { q, status, brandId }). Empty/undefined values are dropped. */
  filters?: Record<string, string | number | undefined | null>;
  /** Optional SWR refresh interval (ms). */
  refreshInterval?: number;
}

/**
 * Server-driven infinite list backed by the standardized `{ data, pagination }`
 * API envelope. Flattens pages into a single `items` array and exposes the bits
 * an IntersectionObserver sentinel needs (`setSize`, `isReachingEnd`).
 *
 * Pass `basePath = null` to disable fetching (conditional hooks).
 */
export function useInfiniteList<T = unknown>(
  basePath: string | null,
  opts: UseInfiniteListOptions = {}
) {
  const { limit = 20, filters = {}, refreshInterval } = opts;

  const qs = Object.entries(filters)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");

  const getKey = (pageIndex: number, previous: InfiniteEnvelope<T> | null) => {
    if (basePath === null) return null;
    // Stop when the previous page returned fewer than a full page.
    if (previous && (previous.data?.length ?? 0) < limit) return null;
    const sep = basePath.includes("?") ? "&" : "?";
    return `${basePath}${sep}page=${pageIndex + 1}&limit=${limit}${qs ? `&${qs}` : ""}`;
  };

  const swr = useSWRInfinite<InfiniteEnvelope<T>>(getKey, fetcher, {
    refreshInterval,
    revalidateFirstPage: true,
  });

  const pages = swr.data ?? [];
  const items: T[] = pages.flatMap((p) => p?.data ?? []);
  const total = pages[0]?.pagination?.total ?? items.length;
  const totalPages = pages[0]?.pagination?.totalPages ?? 0;

  const isLoadingInitial = !swr.data && !swr.error;
  const isLoadingMore =
    isLoadingInitial ||
    (swr.size > 0 && !!swr.data && typeof swr.data[swr.size - 1] === "undefined");
  const lastPageLen = pages.length ? pages[pages.length - 1]?.data?.length ?? 0 : 0;
  const isReachingEnd =
    totalPages > 0 ? swr.size >= totalPages : pages.length > 0 && lastPageLen < limit;

  return {
    items,
    total,
    size: swr.size,
    setSize: swr.setSize,
    isLoadingInitial,
    isLoadingMore,
    isReachingEnd,
    isValidating: swr.isValidating,
    error: swr.error,
    mutate: swr.mutate,
  };
}

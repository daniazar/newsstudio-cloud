import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  cache,
  cachedFetch,
  generateCacheKey,
  invalidateCachePattern,
} from "../indexedDB";

describe("IndexedDBCache Suite", () => {
  beforeEach(async () => {
    await cache.clear();
  });

  it("stores and retrieves data from cache", async () => {
    await cache.set("test-key", { value: 42 }, 10000);
    const result = await cache.get<{ value: number }>("test-key");
    expect(result).toEqual({ value: 42 });
  });

  it("returns null for non-existent keys", async () => {
    const result = await cache.get("missing-key");
    expect(result).toBeNull();
  });

  it("evicts expired entries based on TTL", async () => {
    await cache.set("short-lived", "temporary", 1);
    await new Promise((r) => setTimeout(r, 10));
    const result = await cache.get<string>("short-lived");
    expect(result).toBeNull();
  });

  it("enforces LRU eviction when memory cache exceeds capacity", async () => {
    // Fill cache with 255 items (capacity is 250)
    for (let i = 0; i < 255; i++) {
      await cache.set(`item-${i}`, { index: i }, 60000);
    }

    // Earliest items (0 to 4) should have been evicted
    const firstItem = await cache.get("item-0");
    expect(firstItem).toBeNull();

    // Later items should remain
    const recentItem = await cache.get<{ index: number }>("item-254");
    expect(recentItem).toEqual({ index: 254 });
  });

  it("refreshes LRU position on access so accessed items survive eviction", async () => {
    await cache.set("survivor", "staying alive", 60000);

    for (let i = 0; i < 150; i++) {
      await cache.set(`filler-${i}`, i, 60000);
    }

    // Access "survivor" to move it to the most-recently-used end
    const accessed = await cache.get<string>("survivor");
    expect(accessed).toBe("staying alive");

    // Add another 110 items (total pushed since survivor re-accessed: 110 < 250)
    for (let i = 150; i < 260; i++) {
      await cache.set(`filler-${i}`, i, 60000);
    }

    // "survivor" should still be present because it was refreshed
    const survivorStillThere = await cache.get<string>("survivor");
    expect(survivorStillThere).toBe("staying alive");
  });

  it("coalesces concurrent in-flight requests with cachedFetch", async () => {
    let callCount = 0;
    const fetcher = vi.fn(async () => {
      callCount++;
      await new Promise((r) => setTimeout(r, 20));
      return { payload: "data", callCount };
    });

    const [res1, res2, res3] = await Promise.all([
      cachedFetch("shared-key", fetcher, 5000),
      cachedFetch("shared-key", fetcher, 5000),
      cachedFetch("shared-key", fetcher, 5000),
    ]);

    expect(callCount).toBe(1);
    expect(res1).toEqual({ payload: "data", callCount: 1 });
    expect(res2).toEqual({ payload: "data", callCount: 1 });
    expect(res3).toEqual({ payload: "data", callCount: 1 });
  });

  it("generates deterministic cache keys from params", () => {
    const key1 = generateCacheKey("/api/stories", { page: 1, limit: 10, sort: "desc" });
    const key2 = generateCacheKey("/api/stories", { sort: "desc", limit: 10, page: 1 });
    expect(key1).toBe(key2);
  });

  it("invalidates cache entries by pattern", async () => {
    await cache.set("user:1:profile", "alice");
    await cache.set("user:2:profile", "bob");
    await cache.set("post:1", "hello");

    await invalidateCachePattern("user:");

    expect(await cache.get("user:1:profile")).toBeNull();
    expect(await cache.get("user:2:profile")).toBeNull();
    expect(await cache.get("post:1")).toBe("hello");
  });
});

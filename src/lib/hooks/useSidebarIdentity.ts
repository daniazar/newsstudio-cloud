"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useAuth, useOrganization } from "@clerk/nextjs";

/**
 * Tiny localStorage-backed store exposed through useSyncExternalStore. The
 * value is read synchronously on the client (so the UI paints from cache as
 * fast as possible) while staying hydration-safe — the server snapshot is
 * always null, so SSR and the hydration render agree, then the client swaps to
 * the cached value on the next tick. `set()` notifies subscribers in the same
 * tab; the native `storage` event keeps other tabs in sync.
 */
function createLocalStore(key: string) {
  const listeners = new Set<() => void>();
  let onStorage: ((e: StorageEvent) => void) | null = null;

  return {
    key,
    subscribe(cb: () => void) {
      listeners.add(cb);
      if (listeners.size === 1 && typeof window !== "undefined") {
        onStorage = (e: StorageEvent) => {
          if (e.key === key) listeners.forEach((l) => l());
        };
        window.addEventListener("storage", onStorage);
      }
      return () => {
        listeners.delete(cb);
        if (listeners.size === 0 && onStorage && typeof window !== "undefined") {
          window.removeEventListener("storage", onStorage);
          onStorage = null;
        }
      };
    },
    getSnapshot(): string | null {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    getServerSnapshot(): string | null {
      return null;
    },
    set(value: string | null) {
      try {
        if (value === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, value);
      } catch {
        /* localStorage unavailable (private mode / quota) — ignore */
      }
      listeners.forEach((l) => l());
    },
  };
}

const superAdminStore = createLocalStore("ns:isSuperAdmin");
const activeOrgStore = createLocalStore("ns:activeOrg");

export interface CachedOrg {
  id: string;
  name: string;
  imageUrl: string;
}

/**
 * Whether the signed-in user is a super admin. Paints instantly from the
 * localStorage cache, then reconciles against /api/admin/whoami and rewrites
 * the cache. Returns `false` until either the cache or the response says
 * otherwise (so super-admin-only UI defaults to hidden).
 */
export function useCachedSuperAdmin(): boolean {
  const raw = useSyncExternalStore(
    superAdminStore.subscribe,
    superAdminStore.getSnapshot,
    superAdminStore.getServerSnapshot,
  );
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      superAdminStore.set(null);
      return;
    }
    let cancelled = false;
    fetch("/api/admin/whoami")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        superAdminStore.set(d.isSuperAdmin ? "1" : "0");
      })
      .catch(() => {
        /* keep the cached value on network error */
      });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  return raw === "1";
}

/**
 * The active organization's display info (id / name / imageUrl). Paints
 * instantly from the localStorage cache, then reconciles with Clerk's
 * `useOrganization()` once its client SDK has loaded, rewriting the cache.
 */
export function useCachedActiveOrg(): { org: CachedOrg | null; isLoaded: boolean } {
  const raw = useSyncExternalStore(
    activeOrgStore.subscribe,
    activeOrgStore.getSnapshot,
    activeOrgStore.getServerSnapshot,
  );
  const { isLoaded, organization } = useOrganization();

  useEffect(() => {
    if (!isLoaded) return;
    activeOrgStore.set(
      organization
        ? JSON.stringify({ id: organization.id, name: organization.name, imageUrl: organization.imageUrl })
        : null,
    );
  }, [isLoaded, organization]);

  let org: CachedOrg | null = null;
  if (raw) {
    try {
      org = JSON.parse(raw) as CachedOrg;
    } catch {
      org = null;
    }
  }
  return { org, isLoaded };
}

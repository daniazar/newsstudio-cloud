/**
 * lib/hooks/usePresenterCache.ts
 *
 * IndexedDB-backed cache for per-scene InfiniteTalk generated videos.
 * Mirrors the in-memory blobMap pattern from VoiceStudio but persists to disk
 * since video files are too large for in-memory state across page refreshes.
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const DB_NAME = "newsStudio-presenter";
const DB_VERSION = 1;
const STORE_NAME = "videos";

export type PresenterStatus = "pending" | "generating" | "done" | "error" | "cached";

export interface PresenterSceneState {
  status: PresenterStatus;
  videoUrl?: string;      // Object URL for the cached blob
  errorMessage?: string;
  startedAt?: number;
  completedAt?: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: "segmentId" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(segmentId: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(segmentId);
    req.onsuccess = () => resolve(req.result?.blob ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(segmentId: string, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ segmentId, blob, createdAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDelete(segmentId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(segmentId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}


async function idbClear(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────

export function usePresenterCache(segmentIds: string[]) {
  const [scenes, setScenes] = useState<Record<string, PresenterSceneState>>({});
  const objectUrlsRef = useRef<Record<string, string>>({});

  // On mount: check IndexedDB for any cached videos for these segments
  useEffect(() => {
    if (segmentIds.length === 0) return;

    let cancelled = false;
    (async () => {
      const updates: Record<string, PresenterSceneState> = {};

      for (const id of segmentIds) {
        const blob = await idbGet(id);
        if (blob && !cancelled) {
          // Revoke any old URL before creating a new one
          if (objectUrlsRef.current[id]) {
            URL.revokeObjectURL(objectUrlsRef.current[id]);
          }
          const url = URL.createObjectURL(blob);
          objectUrlsRef.current[id] = url;
          updates[id] = { status: "cached", videoUrl: url };
        }
      }

      if (!cancelled && Object.keys(updates).length > 0) {
        setScenes((prev) => ({ ...prev, ...updates }));
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentIds.join(",")]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => {
      Object.values(urls).forEach(URL.revokeObjectURL);
    };
  }, []);

  const setSceneStatus = useCallback((
    segmentId: string,
    update: Partial<PresenterSceneState>
  ) => {
    setScenes((prev) => ({
      ...prev,
      [segmentId]: { ...(prev[segmentId] ?? { status: "pending" }), ...update },
    }));
  }, []);

  /**
   * Save a video blob to IndexedDB and create an Object URL for playback.
   */
  const saveVideo = useCallback(async (segmentId: string, blob: Blob) => {
    await idbPut(segmentId, blob);

    if (objectUrlsRef.current[segmentId]) {
      URL.revokeObjectURL(objectUrlsRef.current[segmentId]);
    }
    const url = URL.createObjectURL(blob);
    objectUrlsRef.current[segmentId] = url;

    setScenes((prev) => ({
      ...prev,
      [segmentId]: { status: "done", videoUrl: url, completedAt: Date.now() },
    }));
  }, []);

  /**
   * Delete a scene's video from IndexedDB and revoke its Object URL.
   */
  const deleteVideo = useCallback(async (segmentId: string) => {
    await idbDelete(segmentId);
    if (objectUrlsRef.current[segmentId]) {
      URL.revokeObjectURL(objectUrlsRef.current[segmentId]);
      delete objectUrlsRef.current[segmentId];
    }
    setScenes((prev) => {
      const next = { ...prev };
      delete next[segmentId];
      return next;
    });
  }, []);

  /**
   * Clear all cached videos from IndexedDB.
   */
  const clearAll = useCallback(async () => {
    await idbClear();
    Object.values(objectUrlsRef.current).forEach(URL.revokeObjectURL);
    objectUrlsRef.current = {};
    setScenes({});
  }, []);

  const getSceneState = useCallback(
    (segmentId: string): PresenterSceneState =>
      scenes[segmentId] ?? { status: "pending" },
    [scenes]
  );

  return {
    scenes,
    getSceneState,
    setSceneStatus,
    saveVideo,
    deleteVideo,
    clearAll,
  };
}

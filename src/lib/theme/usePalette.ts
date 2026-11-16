"use client";

import { useCallback, useLayoutEffect, useSyncExternalStore } from "react";
import { DEFAULT_PALETTE, type PaletteId } from "./palettes";
import {
  getActivePalette,
  setPalette as persistPalette,
  subscribe,
  syncPaletteFromStorage,
} from "./paletteStore";

const getServerSnapshot = (): PaletteId => DEFAULT_PALETTE;

/**
 * Current palette plus a setter. Safe to call from many components: they all
 * share one external store, and changes in other tabs propagate via `storage`.
 */
export function usePalette() {
  const palette = useSyncExternalStore(subscribe, getActivePalette, getServerSnapshot);
  const setPalette = useCallback((id: PaletteId) => persistPalette(id), []);
  return { palette, setPalette } as const;
}

/**
 * Mount once near the root. Re-applies the stored palette before paint after
 * React's dev-mode remount resets `<html>` attributes (no-op in production).
 */
export function PaletteSync() {
  useLayoutEffect(() => {
    syncPaletteFromStorage();
  }, []);
  return null;
}

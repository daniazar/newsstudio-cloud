/**
 * Palette state lives in the DOM (`<html data-palette>`) and is persisted to
 * `localStorage`. This module is a tiny framework-agnostic external store over
 * that state, consumed from React via `useSyncExternalStore` (see usePalette).
 *
 * Why the DOM is the source of truth: the inline init script (built by
 * `buildPaletteInitScript`) sets the attribute during HTML parsing, before
 * React hydrates, so there's no flash of the default palette. Reading the
 * attribute back keeps React in lockstep with what is actually painted.
 */
import {
  DEFAULT_PALETTE,
  PALETTE_ATTRIBUTE,
  PALETTE_IDS,
  PALETTE_STORAGE_KEY,
  isPaletteId,
  type PaletteId,
} from "./palettes";

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  for (const listener of listeners) listener();
}

/** Reads the persisted choice; invalid or unavailable storage yields `null`. */
export function readStoredPalette(): PaletteId | null {
  try {
    const value = window.localStorage.getItem(PALETTE_STORAGE_KEY);
    return isPaletteId(value) ? value : null;
  } catch {
    // Storage can throw (privacy mode, disabled cookies, sandboxed iframes).
    return null;
  }
}

/** The palette currently applied to the document. */
export function getActivePalette(): PaletteId {
  if (typeof document === "undefined") return DEFAULT_PALETTE;
  const value = document.documentElement.getAttribute(PALETTE_ATTRIBUTE);
  return isPaletteId(value) ? value : DEFAULT_PALETTE;
}

/** Applies a palette to the document without persisting it. */
export function applyPalette(id: PaletteId): void {
  if (document.documentElement.getAttribute(PALETTE_ATTRIBUTE) !== id) {
    document.documentElement.setAttribute(PALETTE_ATTRIBUTE, id);
  }
  notify();
}

/** Applies and persists a palette. Unknown ids are ignored. */
export function setPalette(id: PaletteId): void {
  if (!isPaletteId(id)) return;
  try {
    window.localStorage.setItem(PALETTE_STORAGE_KEY, id);
  } catch {
    // Non-fatal: the palette still applies for this page view.
  }
  applyPalette(id);
}

/**
 * Re-applies the persisted palette. Needed in development, where React Strict
 * Mode's remount resets `<html>` attributes to their JSX values; a no-op in
 * production because the init script already applied it.
 */
export function syncPaletteFromStorage(): void {
  applyPalette(readStoredPalette() ?? DEFAULT_PALETTE);
}

function onStorage(event: StorageEvent) {
  // Another tab changed the palette: follow it.
  if (event.key !== PALETTE_STORAGE_KEY) return;
  applyPalette(isPaletteId(event.newValue) ? event.newValue : DEFAULT_PALETTE);
}

export function subscribe(listener: Listener): () => void {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

/**
 * Source for the blocking `<script>` in the root layout's `<head>`.
 * Only allow-listed ids are applied, so a tampered storage value can't
 * inject arbitrary attribute content or leave the app unstyled.
 */
export function buildPaletteInitScript(): string {
  const key = JSON.stringify(PALETTE_STORAGE_KEY);
  const attr = JSON.stringify(PALETTE_ATTRIBUTE);
  const ids = JSON.stringify(PALETTE_IDS);
  return `(function(){try{var p=localStorage.getItem(${key});if(p&&${ids}.indexOf(p)!==-1)document.documentElement.setAttribute(${attr},p)}catch(e){}})()`;
}

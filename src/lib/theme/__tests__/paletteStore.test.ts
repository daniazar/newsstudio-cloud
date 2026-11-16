import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PALETTE_ATTRIBUTE, PALETTE_STORAGE_KEY } from "../palettes";
import {
  buildPaletteInitScript,
  getActivePalette,
  readStoredPalette,
  setPalette,
  subscribe,
  syncPaletteFromStorage,
} from "../paletteStore";

const html = () => document.documentElement;
const runInitScript = () => new Function(buildPaletteInitScript())();

beforeEach(() => {
  localStorage.clear();
  html().removeAttribute(PALETTE_ATTRIBUTE);
});

afterEach(() => vi.restoreAllMocks());

describe("init script", () => {
  it("applies a stored, allow-listed palette", () => {
    localStorage.setItem(PALETTE_STORAGE_KEY, "aurora");
    runInitScript();
    expect(html().getAttribute(PALETTE_ATTRIBUTE)).toBe("aurora");
  });

  it("ignores unknown or malicious values", () => {
    localStorage.setItem(PALETTE_STORAGE_KEY, '"><img src=x onerror=alert(1)>');
    runInitScript();
    expect(html().hasAttribute(PALETTE_ATTRIBUTE)).toBe(false);
  });

  it("does not throw when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(runInitScript).not.toThrow();
  });
});

describe("palette store", () => {
  it("defaults to obsidian", () => {
    expect(getActivePalette()).toBe("obsidian");
    expect(readStoredPalette()).toBeNull();
  });

  it("setPalette applies, persists and notifies subscribers", () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    setPalette("ember");
    expect(html().getAttribute(PALETTE_ATTRIBUTE)).toBe("ember");
    expect(localStorage.getItem(PALETTE_STORAGE_KEY)).toBe("ember");
    expect(getActivePalette()).toBe("ember");
    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });

  it("still applies the palette when storage writes fail", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    setPalette("graphite");
    expect(getActivePalette()).toBe("graphite");
  });

  it("follows palette changes made in another tab", () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    window.dispatchEvent(
      new StorageEvent("storage", { key: PALETTE_STORAGE_KEY, newValue: "midnight" }),
    );
    expect(getActivePalette()).toBe("midnight");
    expect(listener).toHaveBeenCalled();

    window.dispatchEvent(new StorageEvent("storage", { key: "unrelated", newValue: "aurora" }));
    expect(getActivePalette()).toBe("midnight");
    unsubscribe();
  });

  it("re-applies the stored palette after <html> attributes are reset", () => {
    setPalette("contrast");
    html().setAttribute(PALETTE_ATTRIBUTE, "obsidian"); // simulate React dev remount
    syncPaletteFromStorage();
    expect(getActivePalette()).toBe("contrast");
  });
});

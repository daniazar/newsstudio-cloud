import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PaletteSwitcher } from "../PaletteSwitcher";
import { PALETTES, PALETTE_ATTRIBUTE, PALETTE_STORAGE_KEY } from "@/lib/theme/palettes";
import { setPalette } from "@/lib/theme/paletteStore";

// Tell React this is a test environment so act() works without warnings.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

const active = () => document.documentElement.getAttribute(PALETTE_ATTRIBUTE);
const trigger = () => container.querySelector<HTMLButtonElement>("button[aria-haspopup]")!;
const radios = () => Array.from(container.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
const radioNamed = (label: string) => radios().find((r) => r.textContent?.includes(label))!;
const click = (el: Element) => act(() => el.dispatchEvent(new MouseEvent("click", { bubbles: true })));
const key = (el: Element | Document, k: string) =>
  act(() => el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true })));

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute(PALETTE_ATTRIBUTE);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<PaletteSwitcher />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.documentElement.removeAttribute(PALETTE_ATTRIBUTE);
});

describe("PaletteSwitcher", () => {
  it("shows the current palette and is collapsed by default", () => {
    expect(trigger().textContent).toContain("Color palette: Obsidian");
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector('[role="radiogroup"]')).toBeNull();
  });

  it("lists every palette as a radio with the current one checked and focused", () => {
    click(trigger());
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    expect(radios()).toHaveLength(PALETTES.length);
    const checked = radios().filter((r) => r.getAttribute("aria-checked") === "true");
    expect(checked).toHaveLength(1);
    expect(checked[0].textContent).toContain("Obsidian");
    expect(checked[0].tabIndex).toBe(0);
    expect(document.activeElement).toBe(checked[0]);
  });

  it("applies and persists a palette on click", () => {
    click(trigger());
    click(radioNamed("Aurora"));
    expect(active()).toBe("aurora");
    expect(localStorage.getItem(PALETTE_STORAGE_KEY)).toBe("aurora");
    expect(radioNamed("Aurora").getAttribute("aria-checked")).toBe("true");
    expect(trigger().textContent).toContain("Aurora");
  });

  it("supports arrow-key navigation with wrap-around and Escape to close", () => {
    click(trigger());
    key(radios()[0], "ArrowUp");
    expect(active()).toBe(PALETTES[PALETTES.length - 1].id);
    key(document.activeElement!, "Home");
    expect(active()).toBe(PALETTES[0].id);
    key(document.activeElement!, "ArrowDown");
    expect(active()).toBe(PALETTES[1].id);
    expect(document.activeElement).toBe(radios()[1]);

    key(document, "Escape");
    expect(container.querySelector('[role="radiogroup"]')).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it("closes on outside pointer down", () => {
    click(trigger());
    act(() => document.body.dispatchEvent(new Event("pointerdown", { bubbles: true })));
    expect(container.querySelector('[role="radiogroup"]')).toBeNull();
  });

  it("re-renders when the palette changes elsewhere (e.g. another tab or switcher)", () => {
    act(() => setPalette("ember"));
    expect(trigger().textContent).toContain("Ember");
  });
});

"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronUp, Palette as PaletteIcon } from "lucide-react";
import { PALETTES, getPalette, type Palette, type PaletteId } from "@/lib/theme/palettes";
import { getActivePalette } from "@/lib/theme/paletteStore";
import { usePalette } from "@/lib/theme/usePalette";

/** Miniature of the palette: canvas, a surface card, a text line and the accent. */
function PalettePreview({ palette, size = "md" }: { palette: Palette; size?: "sm" | "md" }) {
  const { background, surface, foreground, accent } = palette.swatch;
  const box = size === "sm" ? "w-5 h-5 rounded-md" : "w-10 h-8 rounded-lg";
  return (
    <span
      aria-hidden="true"
      className={`${box} relative shrink-0 overflow-hidden ring-1 ring-white/15`}
      style={{ backgroundColor: background }}
    >
      {size === "md" ? (
        <>
          <span
            className="absolute left-1 right-3 top-1 bottom-1 rounded-sm"
            style={{ backgroundColor: surface }}
          />
          <span
            className="absolute left-2 top-2 h-0.5 w-3 rounded-full opacity-80"
            style={{ backgroundColor: foreground }}
          />
          <span
            className="absolute right-1 bottom-1 h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: accent }}
          />
        </>
      ) : (
        <span
          className="absolute right-0.5 bottom-0.5 h-2 w-2 rounded-full"
          style={{ backgroundColor: accent }}
        />
      )}
    </span>
  );
}

/**
 * Lets the user choose the app color palette. The choice applies instantly,
 * persists per browser, and syncs across open tabs.
 */
export function PaletteSwitcher({ className = "" }: { className?: string }) {
  const { palette, setPalette } = usePalette();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listId = useId();
  const labelId = useId();
  const current = getPalette(palette);

  useEffect(() => {
    if (!open) return;
    // Move focus to the checked option, as a native radio group would.
    const index = PALETTES.findIndex((p) => p.id === getActivePalette());
    optionRefs.current[Math.max(index, 0)]?.focus();

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const select = (id: PaletteId, index: number) => {
    setPalette(id);
    optionRefs.current[index]?.focus();
  };

  // WAI-ARIA radio group pattern: arrows move focus AND selection (live preview).
  const onOptionKeyDown = (event: React.KeyboardEvent, index: number) => {
    const last = PALETTES.length - 1;
    let next: number | null = null;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") next = index === last ? 0 : index + 1;
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    else if (event.key === "Enter") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (next !== null) {
      event.preventDefault();
      select(PALETTES[next].id, next);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-white/[0.04] border border-border/80 hover:bg-white/[0.08] hover:border-border-hover text-subtle hover:text-foreground transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2 min-w-0">
          <PaletteIcon className="w-3.5 h-3.5 shrink-0 text-muted" aria-hidden="true" />
          <span className="text-[11px] font-semibold truncate">
            <span className="sr-only">Color palette: </span>
            {current.label}
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <PalettePreview palette={current} size="sm" />
          <ChevronUp
            aria-hidden="true"
            className={`w-3.5 h-3.5 text-muted transition-transform ${open ? "" : "rotate-180"}`}
          />
        </span>
      </button>

      {open && (
        <div
          id={listId}
          className="absolute bottom-full left-0 right-0 mb-2 z-50 p-1.5 rounded-xl glass-floating"
        >
          <p
            id={labelId}
            className="px-2 pt-1 pb-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-muted"
          >
            Color palette
          </p>
          <div role="radiogroup" aria-labelledby={labelId} className="space-y-0.5">
            {PALETTES.map((p, index) => {
              const checked = p.id === palette;
              return (
                <button
                  key={p.id}
                  ref={(el) => {
                    optionRefs.current[index] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  tabIndex={checked ? 0 : -1}
                  onClick={() => select(p.id, index)}
                  onKeyDown={(e) => onOptionKeyDown(e, index)}
                  className={`w-full flex items-center gap-2.5 p-1.5 rounded-lg text-left border transition-colors cursor-pointer ${
                    checked
                      ? "bg-accent/10 border-accent/40"
                      : "border-transparent hover:bg-white/[0.05]"
                  }`}
                >
                  <PalettePreview palette={p} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-bold text-foreground truncate">{p.label}</span>
                    <span className="block text-[10px] leading-snug text-subtle line-clamp-2">
                      {p.description}
                    </span>
                  </span>
                  <Check
                    aria-hidden="true"
                    className={`w-3.5 h-3.5 shrink-0 text-accent ${checked ? "opacity-100" : "opacity-0"}`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

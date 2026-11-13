/**
 * src/components/editor/shared/player/gizmo/GizmoBoundingBoxOverlay.tsx
 *
 * Reusable interactive bounding box overlay with hover states,
 * selection ring, drag interaction, and informative badge pill.
 */

import React from "react";
import { RotateCcw } from "lucide-react";
import { SelectedGizmoElement } from "./types";

export type GizmoThemeColor =
  | "emerald"
  | "yellow"
  | "blue"
  | "cyan"
  | "violet"
  | "indigo"
  | "amber";

const THEME_CLASSES: Record<
  GizmoThemeColor,
  {
    selectedRing: string;
    hoverRing: string;
    badgeBorder: string;
    badgeIcon: string;
    resetHover: string;
  }
> = {
  emerald: {
    selectedRing:
      "ring-2 ring-emerald-400 ring-offset-1 ring-offset-black/50 shadow-2xl shadow-emerald-500/30",
    hoverRing: "hover:ring-1 hover:ring-emerald-400/50",
    badgeBorder: "border-emerald-500/40 text-emerald-300",
    badgeIcon: "text-emerald-400",
    resetHover: "hover:bg-emerald-500/20 text-zinc-400 hover:text-emerald-200",
  },
  yellow: {
    selectedRing:
      "ring-2 ring-yellow-400 ring-offset-1 ring-offset-black/50 shadow-xl shadow-yellow-500/20",
    hoverRing: "hover:ring-1 hover:ring-yellow-400/50",
    badgeBorder: "border-yellow-500/40 text-yellow-300",
    badgeIcon: "text-yellow-400",
    resetHover: "hover:bg-yellow-500/20 text-zinc-400 hover:text-yellow-200",
  },
  blue: {
    selectedRing:
      "ring-2 ring-blue-400 ring-offset-1 ring-offset-black/50 shadow-xl shadow-blue-500/20",
    hoverRing: "hover:ring-1 hover:ring-blue-400/50",
    badgeBorder: "border-blue-500/40 text-blue-300",
    badgeIcon: "text-blue-400",
    resetHover: "hover:bg-blue-500/20 text-zinc-400 hover:text-blue-200",
  },
  cyan: {
    selectedRing:
      "ring-2 ring-cyan-400 ring-offset-1 ring-offset-black/50 shadow-xl shadow-cyan-500/20",
    hoverRing: "hover:ring-1 hover:ring-cyan-400/40",
    badgeBorder: "border-cyan-500/40 text-cyan-300",
    badgeIcon: "text-cyan-400",
    resetHover: "hover:bg-cyan-500/20 text-zinc-400 hover:text-cyan-200",
  },
  violet: {
    selectedRing:
      "ring-2 ring-violet-400 ring-offset-1 ring-offset-black/50 shadow-xl shadow-violet-500/20",
    hoverRing: "hover:ring-1 hover:ring-violet-400/40",
    badgeBorder: "border-violet-500/40 text-violet-300",
    badgeIcon: "text-violet-400",
    resetHover: "hover:bg-violet-500/20 text-zinc-400 hover:text-violet-200",
  },
  indigo: {
    selectedRing:
      "ring-2 ring-indigo-400 ring-offset-1 ring-offset-black/50 shadow-xl shadow-indigo-500/20",
    hoverRing: "hover:ring-1 hover:ring-indigo-400/40",
    badgeBorder: "border-indigo-500/40 text-indigo-300",
    badgeIcon: "text-indigo-400",
    resetHover: "hover:bg-indigo-500/20 text-zinc-400 hover:text-indigo-200",
  },
  amber: {
    selectedRing:
      "ring-2 ring-amber-400 ring-offset-1 ring-offset-black/50 shadow-xl shadow-amber-500/20",
    hoverRing: "hover:ring-1 hover:ring-amber-400/40",
    badgeBorder: "border-amber-500/40 text-amber-300",
    badgeIcon: "text-amber-400",
    resetHover: "hover:bg-amber-500/20 text-zinc-400 hover:text-amber-200",
  },
};

export interface GizmoBoundingBoxOverlayProps {
  box: {
    left: number | string;
    top: number | string;
    width: number | string;
    height: number | string;
  };
  elementId: SelectedGizmoElement;
  isSelected: boolean;
  isLocked?: boolean;
  colorTheme?: GizmoThemeColor;
  onSelect: (elem: SelectedGizmoElement) => void;
  onDoubleClickReset?: () => void;
  onPointerDown: (e: React.PointerEvent) => void;
  cursorClass?: string;
  badgeIcon: React.ReactNode;
  badgeTitle: string;
  badgeScale?: number;
  badgeCoords?: { x?: number; y?: number };
  badgePosition?: "center" | "left";
  onReset?: () => void;
  resetTitle?: string;
  hoverIcon?: React.ReactNode;
  children?: React.ReactNode;
}

function GizmoBoundingBoxOverlayComponent({
  box,
  elementId,
  isSelected,
  isLocked = false,
  colorTheme = "emerald",
  onSelect,
  onDoubleClickReset,
  onPointerDown,
  cursorClass = "cursor-move",
  badgeIcon,
  badgeTitle,
  badgeScale,
  badgeCoords,
  badgePosition = "center",
  onReset,
  resetTitle,
  hoverIcon,
  children,
}: GizmoBoundingBoxOverlayProps) {
  const theme = THEME_CLASSES[colorTheme] || THEME_CLASSES.emerald;

  const badgePositionClass =
    badgePosition === "left"
      ? "absolute -top-8 left-0"
      : "absolute -top-8 left-1/2 -translate-x-1/2";

  return (
    <div
      style={{
        position: "absolute",
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(elementId);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClickReset?.();
      }}
      className={`pointer-events-auto transition-shadow ${
        isSelected ? theme.selectedRing : theme.hoverRing
      }`}
    >
      <div
        onPointerDown={onPointerDown}
        className={`w-full h-full ${
          isLocked ? "cursor-not-allowed" : cursorClass
        } relative flex items-center justify-center group`}
      >
        {hoverIcon && (
          <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            {hoverIcon}
          </div>
        )}

        {isSelected && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className={`${badgePositionClass} flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-950/90 border ${theme.badgeBorder} text-[10px] font-bold shadow-xl backdrop-blur-md whitespace-nowrap z-40`}
          >
            <span className={theme.badgeIcon}>{badgeIcon}</span>
            <span>{badgeTitle}</span>

            {badgeScale !== undefined && (
              <>
                <span className="text-zinc-500">•</span>
                <span>{badgeScale}%</span>
              </>
            )}

            {badgeCoords && (
              <>
                <span className="text-zinc-500">•</span>
                <span className="font-mono text-[9px] text-zinc-400">
                  {badgeCoords.x !== undefined && (
                    <>X:{badgeCoords.x > 0 ? `+${badgeCoords.x}` : badgeCoords.x}{" "}</>
                  )}
                  {badgeCoords.y !== undefined && (
                    <>Y:{badgeCoords.y > 0 ? `+${badgeCoords.y}` : badgeCoords.y}</>
                  )}
                </span>
              </>
            )}

            {onReset && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onReset();
                }}
                title={resetTitle || "Reset Position"}
                className={`ml-1 p-0.5 rounded transition-colors ${theme.resetHover}`}
              >
                <RotateCcw className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}

export const GizmoBoundingBoxOverlay = React.memo(
  GizmoBoundingBoxOverlayComponent,
  (prev, next) => {
    return (
      prev.isSelected === next.isSelected &&
      prev.isLocked === next.isLocked &&
      prev.colorTheme === next.colorTheme &&
      prev.badgeScale === next.badgeScale &&
      prev.badgeTitle === next.badgeTitle &&
      prev.badgePosition === next.badgePosition &&
      prev.cursorClass === next.cursorClass &&
      prev.badgeCoords?.x === next.badgeCoords?.x &&
      prev.badgeCoords?.y === next.badgeCoords?.y &&
      prev.box.left === next.box.left &&
      prev.box.top === next.box.top &&
      prev.box.width === next.box.width &&
      prev.box.height === next.box.height
    );
  }
);

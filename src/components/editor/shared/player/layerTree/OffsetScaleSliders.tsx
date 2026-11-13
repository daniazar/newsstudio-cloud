/**
 * src/components/editor/shared/player/layerTree/OffsetScaleSliders.tsx
 *
 * Reusable fine-tuning slider controls for layer Offset X, Offset Y, and Scale.
 */

import React from "react";

export interface OffsetScaleSlidersProps {
  offsetX?: number;
  onUpdateOffsetX?: (val: number) => void;
  minX?: number;
  maxX?: number;
  stepX?: number;

  offsetY?: number;
  onUpdateOffsetY?: (val: number) => void;
  minY?: number;
  maxY?: number;
  stepY?: number;

  scale?: number;
  onUpdateScale?: (val: number) => void;
  minScale?: number;
  maxScale?: number;
  stepScale?: number;

  accentColor?: string;
  customExtraControls?: React.ReactNode;
}

const OffsetScaleSlidersComponent: React.FC<OffsetScaleSlidersProps> = ({
  offsetX,
  onUpdateOffsetX,
  minX = -800,
  maxX = 800,
  stepX = 5,

  offsetY,
  onUpdateOffsetY,
  minY = -1000,
  maxY = 1000,
  stepY = 5,

  scale,
  onUpdateScale,
  minScale = 0.5,
  maxScale = 2.5,
  stepScale = 0.05,

  accentColor = "accent-emerald-400",
  customExtraControls,
}) => {
  const hasX = onUpdateOffsetX !== undefined;
  const hasY = onUpdateOffsetY !== undefined;
  const hasScale = onUpdateScale !== undefined;

  return (
    <div className="space-y-2 pt-1 border-t border-zinc-800/80 text-[10px]">
      {(hasX || hasY) && (
        <div className={`grid ${hasX && hasY ? "grid-cols-2" : "grid-cols-1"} gap-2`}>
          {hasX && (
            <div>
              <div className="flex items-center justify-between text-zinc-500 font-mono">
                <span>Offset X</span>
                <span className="text-zinc-400">{offsetX ?? 0}px</span>
              </div>
              <input
                type="number"
                value={offsetX ?? 0}
                onChange={(e) => onUpdateOffsetX(parseInt(e.target.value) || 0)}
                className="w-full bg-black/60 border border-zinc-700/60 rounded px-1.5 py-0.5 text-zinc-200 font-mono text-[10px]"
              />
              <input
                type="range"
                min={minX}
                max={maxX}
                step={stepX}
                value={offsetX ?? 0}
                onChange={(e) => onUpdateOffsetX(parseInt(e.target.value) || 0)}
                className={`w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer ${accentColor} mt-1.5`}
              />
            </div>
          )}

          {hasY && (
            <div>
              <div className="flex items-center justify-between text-zinc-500 font-mono">
                <span>Offset Y</span>
                <span className="text-zinc-400">{offsetY ?? 0}px</span>
              </div>
              <input
                type="number"
                value={offsetY ?? 0}
                onChange={(e) => onUpdateOffsetY(parseInt(e.target.value) || 0)}
                className="w-full bg-black/60 border border-zinc-700/60 rounded px-1.5 py-0.5 text-zinc-200 font-mono text-[10px]"
              />
              <input
                type="range"
                min={minY}
                max={maxY}
                step={stepY}
                value={offsetY ?? 0}
                onChange={(e) => onUpdateOffsetY(parseInt(e.target.value) || 0)}
                className={`w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer ${accentColor} mt-1.5`}
              />
            </div>
          )}
        </div>
      )}

      {hasScale && (
        <div>
          <div className="flex items-center justify-between text-zinc-400">
            <span>Scale</span>
            <span className="font-mono">{Math.round((scale ?? 1.0) * 100)}%</span>
          </div>
          <input
            type="range"
            min={minScale}
            max={maxScale}
            step={stepScale}
            value={scale ?? 1.0}
            onChange={(e) => onUpdateScale(parseFloat(e.target.value))}
            className={`w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer ${accentColor}`}
          />
        </div>
      )}

      {customExtraControls}
    </div>
  );
};

export const OffsetScaleSliders = React.memo(OffsetScaleSlidersComponent);

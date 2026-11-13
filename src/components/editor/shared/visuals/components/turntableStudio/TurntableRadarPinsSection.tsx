/**
 * src/components/editor/shared/visuals/components/turntableStudio/TurntableRadarPinsSection.tsx
 *
 * Dynamic Feature Radar Callouts & Interactive Hotspot Overlay Controls:
 * - Toggle on/off radar pins
 * - Visual radar pin pills with coordinates, pulse colors, and punchy HUD labels
 * - One-click re-extraction from Product Bullet Points & Specifications
 * - Add, edit, and delete custom radar callouts
 */

import React from "react";
import {
  MapPin,
  RotateCcw,
  Plus,
  Trash2,
  Sliders,
  Check,
} from "lucide-react";
import { ProductSpec, TurntableRadarPin } from "@/lib/types/ecommerce";
import { extractDefaultRadarPins } from "@/lib/ecommerce/turntableRadarEngine";

interface TurntableRadarPinsSectionProps {
  enableRadarPins: boolean;
  onToggleRadarPins: (enabled: boolean) => void;
  radarPins: TurntableRadarPin[];
  onUpdateRadarPins: (pins: TurntableRadarPin[]) => void;
  productSpec?: ProductSpec;
  accentColor?: string;
}

export function TurntableRadarPinsSection({
  enableRadarPins,
  onToggleRadarPins,
  radarPins,
  onUpdateRadarPins,
  productSpec,
  accentColor = "#06b6d4",
}: TurntableRadarPinsSectionProps) {
  const handleReExtract = () => {
    const extracted = extractDefaultRadarPins(productSpec, accentColor, 240);
    onUpdateRadarPins(extracted);
  };

  const handleAddPin = () => {
    const newPin: TurntableRadarPin = {
      id: `pin_${Date.now()}`,
      label: "NEW FEATURE",
      detail: "Key spec highlight",
      x: 75,
      y: 40,
      pulseColor: accentColor,
      startFrame: 15,
      durationFrames: 210,
    };
    onUpdateRadarPins([...radarPins, newPin]);
  };

  const handleRemovePin = (id: string) => {
    onUpdateRadarPins(radarPins.filter((p) => p.id !== id));
  };

  const handleFieldChange = (
    id: string,
    field: keyof TurntableRadarPin,
    value: string | number
  ) => {
    onUpdateRadarPins(
      radarPins.map((p) => {
        if (p.id !== id) return p;
        return { ...p, [field]: value };
      })
    );
  };

  return (
    <div className="space-y-3 p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800/90 shadow-sm">
      {/* Header & Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-[11px] font-bold text-zinc-200 uppercase tracking-wider">
            Feature Radar Pins & Hotspots
          </span>
          <span className="text-[8.5px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            {radarPins.length} Pin{radarPins.length === 1 ? "" : "s"}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onToggleRadarPins(!enableRadarPins)}
          className={`px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            enableRadarPins
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
              : "bg-zinc-800/80 text-zinc-400 border border-zinc-700 hover:text-zinc-200"
          }`}
        >
          {enableRadarPins ? (
            <>
              <Check className="h-3 w-3 text-cyan-400" />
              <span>Overlay Active</span>
            </>
          ) : (
            <span>Disabled</span>
          )}
        </button>
      </div>

      <p className="text-[10px] text-zinc-400 leading-relaxed">
        Pulsating HUD radar pins overlay key specs during the 360° sweep. Coordinates automatically avoid the center packshot and bottom caption area.
      </p>

      {enableRadarPins && (
        <div className="space-y-2 pt-1 border-t border-zinc-800/80">
          {/* Quick Actions */}
          <div className="flex items-center justify-between">
            <span className="text-[9.5px] font-bold text-zinc-400 uppercase tracking-wide">
              Configured Radar Points
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleReExtract}
                className="text-[9px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition-colors px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40"
                title="Re-extract feature pins from product specs"
              >
                <RotateCcw className="h-2.5 w-2.5" />
                <span>Extract from Specs</span>
              </button>
              <button
                type="button"
                onClick={handleAddPin}
                className="text-[9px] font-bold text-zinc-200 hover:text-white flex items-center gap-1 cursor-pointer transition-colors px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700"
              >
                <Plus className="h-2.5 w-2.5 text-cyan-400" />
                <span>Add Pin</span>
              </button>
            </div>
          </div>

          {/* List of pins */}
          {radarPins.length === 0 ? (
            <div className="p-3 text-center border border-dashed border-zinc-800 rounded-lg text-[10px] text-zinc-500">
              No radar pins active. Click "Extract from Specs" or "Add Pin" to create feature callouts.
            </div>
          ) : (
            <div className="space-y-1.5">
              {radarPins.map((pin, idx) => (
                <div
                  key={pin.id || idx}
                  className="p-2 rounded-lg bg-black/60 border border-zinc-800/90 flex flex-col gap-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: pin.pulseColor || accentColor }}
                    />
                    <input
                      type="text"
                      value={pin.label}
                      onChange={(e) => handleFieldChange(pin.id, "label", e.target.value.toUpperCase())}
                      placeholder="CALLOUT TITLE (e.g. TITANIUM HINGE)"
                      className="flex-1 text-[10.5px] font-mono font-bold bg-transparent border-b border-zinc-800 focus:border-cyan-500 text-zinc-200 px-1 py-0.5 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={pin.detail || ""}
                      onChange={(e) => handleFieldChange(pin.id, "detail", e.target.value)}
                      placeholder="Detail..."
                      className="w-28 text-[9.5px] bg-transparent border-b border-zinc-800 focus:border-cyan-500 text-zinc-400 px-1 py-0.5 focus:outline-none truncate"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePin(pin.id)}
                      className="p-1 rounded text-zinc-500 hover:text-red-400 cursor-pointer transition-colors"
                      title="Delete radar pin"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Coordinates & Appearance Sub-row */}
                  <div className="flex items-center gap-3 text-[9px] text-zinc-400 font-mono px-1">
                    <div className="flex items-center gap-1">
                      <Sliders className="h-2.5 w-2.5 text-zinc-500" />
                      <span>X:</span>
                      <input
                        type="number"
                        min={5}
                        max={95}
                        value={pin.x}
                        onChange={(e) => handleFieldChange(pin.id, "x", Number(e.target.value))}
                        className="w-10 bg-zinc-900 border border-zinc-800 rounded px-1 text-center text-cyan-300"
                      />
                      <span>%</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span>Y:</span>
                      <input
                        type="number"
                        min={10}
                        max={85}
                        value={pin.y}
                        onChange={(e) => handleFieldChange(pin.id, "y", Number(e.target.value))}
                        className="w-10 bg-zinc-900 border border-zinc-800 rounded px-1 text-center text-cyan-300"
                      />
                      <span>%</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span>Color:</span>
                      <input
                        type="color"
                        value={pin.pulseColor || accentColor}
                        onChange={(e) => handleFieldChange(pin.id, "pulseColor", e.target.value)}
                        className="w-4 h-4 rounded border-0 bg-transparent cursor-pointer p-0"
                      />
                    </div>

                    <div className="ml-auto text-[8px] text-zinc-500">
                      Frame {pin.startFrame ?? 15}–{(pin.startFrame ?? 15) + (pin.durationFrames ?? 180)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

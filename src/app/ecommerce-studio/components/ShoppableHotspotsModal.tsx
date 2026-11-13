"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  Tag,
  Check,
  MapPin,
} from "lucide-react";
import { ProductSpec, ShoppableHotspot, ShoppableHotspotsConfig } from "@/lib/types/ecommerce";
import { generateDefaultHotspots } from "@/lib/ecommerce/shoppableHotspots";

interface ShoppableHotspotsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductSpec;
  config: ShoppableHotspotsConfig;
  onSaveConfig: (newConfig: ShoppableHotspotsConfig) => void;
}

export const ShoppableHotspotsModal: React.FC<ShoppableHotspotsModalProps> = ({
  isOpen,
  onClose,
  product,
  config,
  onSaveConfig,
}) => {
  const [enabled, setEnabled] = useState(config.enabled);
  const [hotspots, setHotspots] = useState<ShoppableHotspot[]>(config.hotspots || []);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);

  // Sync state on open
  useEffect(() => {
    if (!isOpen) return;
    if (config.hotspots && config.hotspots.length > 0) {
      setHotspots(config.hotspots);
      setSelectedHotspotId(config.hotspots[0].id);
    } else {
      const defaults = generateDefaultHotspots(product);
      setHotspots(defaults.hotspots);
      if (defaults.hotspots.length > 0) {
        setSelectedHotspotId(defaults.hotspots[0].id);
      }
    }
    setEnabled(config.enabled);
  }, [isOpen, config, product]);

  if (!isOpen) return null;

  const heroAssetUrl =
    product.assets?.find((a) => a.type === "hero_packshot" || a.isPrimary)?.url ||
    product.assets?.[0]?.url ||
    "/placeholder_product.png";

  const brandColor = product.brand?.primaryColor || "#06b6d4";

  // Handle clicking on the image canvas to move/create a pin
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    if (selectedHotspotId) {
      // Reposition selected hotspot
      setHotspots((prev) =>
        prev.map((h) => (h.id === selectedHotspotId ? { ...h, x, y } : h))
      );
    } else {
      // Add new hotspot at click position
      const newPin: ShoppableHotspot = {
        id: `pin_${Date.now()}`,
        title: product.title.slice(0, 24),
        price: product.price,
        x,
        y,
        startFrame: 90,
        durationFrames: 180,
        pulseColor: brandColor,
        calloutText: "Featured Highlight",
      };
      setHotspots((prev) => [...prev, newPin]);
      setSelectedHotspotId(newPin.id);
    }
  };

  const handleAddNewPin = () => {
    const newPin: ShoppableHotspot = {
      id: `pin_${Date.now()}`,
      title: product.title.slice(0, 24),
      price: product.price,
      x: 50,
      y: 50,
      startFrame: 90,
      durationFrames: 180,
      pulseColor: brandColor,
      calloutText: "New Hotspot Tag",
    };
    setHotspots((prev) => [...prev, newPin]);
    setSelectedHotspotId(newPin.id);
  };

  const handleDeletePin = (id: string) => {
    const remaining = hotspots.filter((h) => h.id !== id);
    setHotspots(remaining);
    if (selectedHotspotId === id) {
      setSelectedHotspotId(remaining[0]?.id || null);
    }
  };

  const handleResetDefaults = () => {
    const defaults = generateDefaultHotspots(product);
    setHotspots(defaults.hotspots);
    if (defaults.hotspots.length > 0) {
      setSelectedHotspotId(defaults.hotspots[0].id);
    }
  };

  const handleSave = () => {
    onSaveConfig({
      enabled,
      hotspots,
      showCardOnHover: true,
    });
    onClose();
  };

  const selectedPin = hotspots.find((h) => h.id === selectedHotspotId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#121216] border border-zinc-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#16161b]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Interactive Shoppable Hotspots
                <span className="text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 px-2 py-0.5 rounded-full font-semibold">
                  {hotspots.length} Pins
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Click anywhere on the product image to position time-synchronized purchase pins
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-zinc-300 cursor-pointer bg-zinc-800/80 px-3 py-1.5 rounded-lg border border-zinc-700">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-3.5 h-3.5 accent-cyan-500 rounded"
              />
              <span>Enable Hotspots Overlay</span>
            </label>

            <button
              onClick={handleResetDefaults}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Reset Defaults
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Split: Visual Canvas (Left) + Pin Inspector (Right) */}
        <div className="flex-1 grid grid-cols-12 overflow-hidden">
          {/* Left Canvas: Interactive Image Pinpoint Stage */}
          <div className="col-span-7 p-6 flex flex-col items-center justify-center bg-[#09090b] border-r border-zinc-800 select-none">
            <div className="relative max-w-sm w-full aspect-[9/16] bg-black/60 rounded-2xl overflow-hidden border border-zinc-700 shadow-2xl cursor-crosshair group">
              {/* Product Packshot */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroAssetUrl}
                alt={product.title}
                className="w-full h-full object-cover pointer-events-none"
              />

              {/* Click Surface Overlay */}
              <div
                onClick={handleCanvasClick}
                className="absolute inset-0 z-10"
                title="Click anywhere to move or place hotspot pin"
              >
                {/* Hotspot Pins Rendered on Canvas */}
                {hotspots.map((pin) => {
                  const isSelected = selectedHotspotId === pin.id;
                  return (
                    <div
                      key={pin.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedHotspotId(pin.id);
                      }}
                      style={{
                        left: `${pin.x}%`,
                        top: `${pin.y}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                      className={`absolute z-20 flex items-center cursor-pointer transition-transform ${
                        isSelected ? "scale-125 z-30" : "hover:scale-110"
                      }`}
                    >
                      {/* Pulse Circle */}
                      <div
                        style={{
                          backgroundColor: pin.pulseColor || brandColor,
                          boxShadow: `0 0 16px ${pin.pulseColor || brandColor}`,
                        }}
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-zinc-950 font-black text-xs shadow-lg ${
                          isSelected ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-950" : ""
                        }`}
                      >
                        +
                      </div>

                      {/* Tag Pill */}
                      <div className="ml-2 px-2.5 py-1 rounded-lg bg-zinc-950/90 backdrop-blur-md border border-white/20 text-[11px] font-bold text-white shadow-xl whitespace-nowrap">
                        {pin.calloutText || pin.title}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Hint badge */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md text-[10px] font-medium text-zinc-400 border border-white/10 pointer-events-none">
                Click image to position selected pin
              </div>
            </div>
          </div>

          {/* Right Panel: Hotspots List & Config Inspector */}
          <div className="col-span-5 p-6 flex flex-col justify-between overflow-y-auto bg-[#141418]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                  Configured Pins ({hotspots.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddNewPin}
                  className="flex items-center gap-1 text-xs font-bold text-cyan-400 hover:text-cyan-300"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Pin
                </button>
              </div>

              {/* Hotspots List */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {hotspots.map((pin, _idx) => {
                  const isSelected = selectedHotspotId === pin.id;
                  return (
                    <div
                      key={pin.id}
                      onClick={() => setSelectedHotspotId(pin.id)}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        isSelected
                          ? "bg-zinc-900 border-cyan-500 shadow-md ring-1 ring-cyan-500/30"
                          : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div
                          style={{ backgroundColor: pin.pulseColor || brandColor }}
                          className="w-3 h-3 rounded-full shrink-0"
                        />
                        <div className="truncate">
                          <div className="text-xs font-bold text-white truncate">
                            {pin.calloutText || pin.title}
                          </div>
                          <div className="text-[10px] text-zinc-400 font-mono">
                            X: {pin.x}% • Y: {pin.y}% • Frame {pin.startFrame}-{pin.startFrame! + pin.durationFrames!}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePin(pin.id);
                        }}
                        className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Selected Pin Inspector */}
              {selectedPin && (
                <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-3 pt-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                    <MapPin className="w-3.5 h-3.5" /> Selected Pin Settings
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">
                      Callout Title
                    </label>
                    <input
                      type="text"
                      value={selectedPin.calloutText || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setHotspots((prev) =>
                          prev.map((h) => (h.id === selectedPin.id ? { ...h, calloutText: val } : h))
                        );
                      }}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Linked Variant Selector */}
                  {product.variants && product.variants.length > 0 && (
                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 block mb-1">
                        Link to Store Variant
                      </label>
                      <select
                        value={selectedPin.variantId || ""}
                        onChange={(e) => {
                          const vId = e.target.value;
                          const foundVar = product.variants.find((v) => v.id === vId);
                          setHotspots((prev) =>
                            prev.map((h) =>
                              h.id === selectedPin.id
                                ? {
                                    ...h,
                                    variantId: vId,
                                    title: foundVar ? foundVar.title : h.title,
                                    price: foundVar ? foundVar.price : h.price,
                                    calloutText: foundVar ? foundVar.title : h.calloutText,
                                  }
                                : h
                            )
                          );
                        }}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="">-- No specific variant linked --</option>
                        {product.variants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.title} (${v.price.toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Timing: Start Frame & Duration */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 block mb-1">
                        Start Frame (0-600)
                      </label>
                      <input
                        type="number"
                        step={15}
                        value={selectedPin.startFrame ?? 90}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 0;
                          setHotspots((prev) =>
                            prev.map((h) => (h.id === selectedPin.id ? { ...h, startFrame: val } : h))
                          );
                        }}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 block mb-1">
                        Duration (Frames)
                      </label>
                      <input
                        type="number"
                        step={15}
                        value={selectedPin.durationFrames ?? 180}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 60;
                          setHotspots((prev) =>
                            prev.map((h) => (h.id === selectedPin.id ? { ...h, durationFrames: val } : h))
                          );
                        }}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Save Action */}
            <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-2">
              <button
                onClick={onClose}
                className="px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-cyan-500 text-zinc-950 hover:bg-cyan-400 transition-all shadow-md shadow-cyan-500/20"
              >
                <Check className="w-4 h-4" />
                Apply to Studio Player
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

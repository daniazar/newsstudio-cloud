"use client";

import React, { useState, useRef } from "react";
import {
  STUDIO_BACKGROUNDS,
  STUDIO_BG_CATEGORIES,
  StudioBackground,
  StudioBgCategory,
  StudioLightingTone,
  getStudioBackgroundById,
} from "@/lib/realtime/studioBackgrounds";
import {
  Sparkles,
  Check,
  Upload,
  Link as LinkIcon,
  Layers,
  X,
} from "lucide-react";

interface StudioBackgroundSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBgId: string;
  isChromaEnabled: boolean;
  onSelectBg: (bg: StudioBackground) => void;
  onToggleChroma: (enabled: boolean) => void;
  lightingTone?: StudioLightingTone;
  onLightingToneChange?: (tone: StudioLightingTone) => void;
}

export function StudioBackgroundSelectorModal({
  isOpen,
  onClose,
  selectedBgId,
  isChromaEnabled,
  onSelectBg,
  onToggleChroma,
  lightingTone = "neutral",
  onLightingToneChange,
}: StudioBackgroundSelectorModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<StudioBgCategory>("All");
  const [customUrlInput, setCustomUrlInput] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const filteredBackgrounds =
    selectedCategory === "All"
      ? STUDIO_BACKGROUNDS
      : STUDIO_BACKGROUNDS.filter((bg) => bg.category === selectedCategory);

  const _currentBg = getStudioBackgroundById(selectedBgId);

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrlInput.trim()) return;
    const customBg: StudioBackground = {
      id: customUrlInput.trim(),
      name: "Custom Studio Plate",
      imageUrl: customUrlInput.trim(),
      category: "Special",
      description: "Direct custom URL background plate.",
      badge: "Custom Link",
      lightingTone: lightingTone || "neutral",
    };
    onSelectBg(customBg);
    setCustomUrlInput("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const uploadedBg: StudioBackground = {
          id: dataUrl,
          name: file.name.replace(/\.[^/.]+$/, ""),
          imageUrl: dataUrl,
          category: "Special",
          description: "Local custom uploaded image.",
          badge: "Uploaded",
          lightingTone: lightingTone || "neutral",
        };
        onSelectBg(uploadedBg);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
      <div className="max-w-4xl w-full bg-[#0b0e14] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-950">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Virtual Broadcast Studio Sets
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                  GPU WebGL 60 FPS
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Select a virtual newsroom backdrop, upload custom plates, or calibrate chroma matting.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Chroma Quick Toggle */}
            <button
              onClick={() => onToggleChroma(!isChromaEnabled)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isChromaEnabled
                  ? "bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                  : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Chroma Matting: {isChromaEnabled ? "ON" : "OFF"}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Navigation Bar */}
        <div className="px-6 py-2.5 border-b border-white/10 bg-black/30 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {STUDIO_BG_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-950"
                  : "bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {cat === "All" && "🌐 All Sets"}
              {cat === "Newsroom" && "📺 Newsroom"}
              {cat === "Financial" && "📈 Financial & Markets"}
              {cat === "Breaking" && "🔥 Breaking News"}
              {cat === "Executive" && "👔 Executive"}
              {cat === "Special" && "🎙️ Talk & Lounge"}
              {cat === "Field" && "🌆 Outdoor & Field"}
              {cat === "Cyber" && "🤖 Cyber & Tech"}
              {cat === "Cyc" && "✨ Transparent Alpha"}
            </button>
          ))}
        </div>

        {/* Main Backgrounds Grid */}
        <div className="flex-1 p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBackgrounds.map((bg) => {
            const isSelected = bg.id === selectedBgId;
            return (
              <div
                key={bg.id}
                onClick={() => onSelectBg(bg)}
                className={`group relative rounded-2xl overflow-hidden border transition-all cursor-pointer flex flex-col bg-gray-900/60 backdrop-blur-md transform hover:scale-[1.015] ${
                  isSelected
                    ? "border-emerald-500 ring-2 ring-emerald-500/50 shadow-xl shadow-emerald-950/80"
                    : "border-white/10 hover:border-white/25 hover:bg-gray-900/90"
                }`}
              >
                {/* Thumbnail Image / Transparency Grid */}
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-black">
                  {bg.imageUrl === "transparent" ? (
                    <div className="w-full h-full bg-[radial-gradient(#ffffff22_1px,transparent_1px)] bg-[size:12px_12px] bg-gray-950 flex flex-col items-center justify-center p-3 text-center">
                      <span className="text-2xl mb-1">✨</span>
                      <span className="text-[11px] font-mono font-bold text-cyan-300">True 32-bit RGBA Alpha</span>
                      <span className="text-[9px] text-gray-400 font-mono">Remotion &amp; VP9 Editor</span>
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={bg.imageUrl}
                      alt={bg.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                  {/* Top Badge */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-black/70 backdrop-blur-md border border-white/20 text-emerald-300">
                      {bg.badge}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-mono uppercase bg-black/60 backdrop-blur-md border border-white/10 text-gray-300">
                      {bg.category}
                    </span>
                  </div>

                  {/* Selected Indicator */}
                  {isSelected && (
                    <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}

                  {/* Lighting Tone Indicator Badge */}
                  <div className={`absolute bottom-2 left-2.5 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border flex items-center gap-1.5 backdrop-blur-md shadow-sm ${
                    bg.lightingTone === "warm"
                      ? "bg-amber-950/80 text-amber-300 border-amber-500/40"
                      : bg.lightingTone === "cool"
                      ? "bg-cyan-950/80 text-cyan-300 border-cyan-500/40"
                      : bg.lightingTone === "red_alert"
                      ? "bg-rose-950/80 text-rose-300 border-rose-500/40 animate-pulse"
                      : "bg-slate-900/80 text-slate-300 border-slate-700/50"
                  }`}>
                    <span className="text-[9px]">
                      {bg.lightingTone === "warm" ? "🟡" : bg.lightingTone === "cool" ? "🔵" : bg.lightingTone === "red_alert" ? "🔴" : "⚪"}
                    </span>
                    <span className="uppercase tracking-wider">
                      {bg.lightingTone === "red_alert" ? "Emergency Red" : bg.lightingTone === "cool" ? "Cyber Cyan" : bg.lightingTone === "warm" ? "Warm Golden" : "Neutral 5600K"}
                    </span>
                  </div>
                </div>

                {/* Info Content */}
                <div className="p-3.5 flex flex-col flex-1 justify-between gap-1.5">
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                      {bg.name}
                    </h3>
                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mt-1">
                      {bg.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono">
                    <span className={isSelected ? "text-emerald-400 font-bold" : "text-gray-500"}>
                      {isSelected ? "● ACTIVE SET" : "Click to select"}
                    </span>
                    <span className="text-gray-400">16:9 • Ultra HD</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Custom Upload & Fine-Tuning Dock */}
        <div className="p-4 border-t border-white/10 bg-black/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Custom URL or File Upload Form */}
          <div className="flex-1 w-full flex items-center gap-2">
            <form onSubmit={handleApplyCustomUrl} className="flex-1 flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  placeholder="Paste custom image URL (https://...)..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors pl-8"
                />
                <LinkIcon className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              </div>
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-mono font-bold text-white transition-all cursor-pointer"
              >
                Apply URL
              </button>
            </form>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Plate</span>
            </button>
          </div>

          {/* Tone Atmosphere Selector */}
          {onLightingToneChange && (
            <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10 text-xs font-mono">
              <span className="text-[10px] text-gray-400 px-2">Tone:</span>
              <button
                onClick={() => onLightingToneChange("neutral")}
                className={`px-2 py-1 rounded-lg transition-all ${
                  lightingTone === "neutral"
                    ? "bg-white/20 text-white font-bold"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Neutral
              </button>
              <button
                onClick={() => onLightingToneChange("cool")}
                className={`px-2 py-1 rounded-lg transition-all ${
                  lightingTone === "cool"
                    ? "bg-cyan-500/30 text-cyan-300 font-bold border border-cyan-500/40"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Cool Blue
              </button>
              <button
                onClick={() => onLightingToneChange("warm")}
                className={`px-2 py-1 rounded-lg transition-all ${
                  lightingTone === "warm"
                    ? "bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Warm
              </button>
              <button
                onClick={() => onLightingToneChange("red_alert")}
                className={`px-2 py-1 rounded-lg transition-all ${
                  lightingTone === "red_alert"
                    ? "bg-red-500/30 text-red-300 font-bold border border-red-500/40"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Red Alert
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

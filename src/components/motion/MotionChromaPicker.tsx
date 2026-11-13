"use client";

import React, { useState, useRef, useEffect } from "react";
import { Upload, User, Sparkles, Shirt, Zap } from "lucide-react";
import { PERSONAS } from "@/lib/tts/personas";
import {
  RUBY_WARDROBE_POSES,
  RubyWardrobePose,
  PRESET_CHROMA_ANCHORS,
  ChromaAnchor,
} from "@/lib/realtime/rubyWardrobePresets";

export { PRESET_CHROMA_ANCHORS };
export type { ChromaAnchor, RubyWardrobePose };

export type SelectedChromaMedia = ChromaAnchor;


export interface MotionChromaPickerProps {
  selectedMedia?: SelectedChromaMedia;
  selectedAnchor?: SelectedChromaMedia;
  onSelectMedia?: (media: SelectedChromaMedia) => void;
  onSelectAnchor?: (anchor: SelectedChromaMedia) => void;
  onCustomImageUpload: (file: File, base64: string) => void;
}

export function MotionChromaPicker({
  selectedMedia,
  selectedAnchor,
  onSelectMedia,
  onSelectAnchor,
  onCustomImageUpload,
}: MotionChromaPickerProps) {
  const currentMedia = selectedMedia || selectedAnchor || PRESET_CHROMA_ANCHORS[0];
  const handleSelect = (m: SelectedChromaMedia) => {
    onSelectMedia?.(m);
    onSelectAnchor?.(m);
  };
  const [activeTab, setActiveTab] = useState<"wardrobe" | "personas">("wardrobe");
  const [selectedWardrobeCategory, setSelectedWardrobeCategory] = useState<string>("all");
  const [warmedPersonaIds, setWarmedPersonaIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/motion/persona-caches")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data?.caches) return;
        const ids = new Set<string>();
        for (const c of data.caches) {
          if (c.personaId) ids.add(c.personaId.toLowerCase());
        }
        setWarmedPersonaIds(ids);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredWardrobe =
    selectedWardrobeCategory === "all"
      ? RUBY_WARDROBE_POSES
      : RUBY_WARDROBE_POSES.filter((p) => p.category === selectedWardrobeCategory);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      const customMedia: SelectedChromaMedia = {
        id: `custom_${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ""),
        role: "Custom Upload",
        imageUrl: reader.result as string,
        isCustom: true,
      };
      handleSelect(customMedia);
      onCustomImageUpload(file, base64);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-surface-elevated/70 border border-border/80 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">Green Chroma Photo Vault</h3>
              <p className="text-[10px] text-muted flex items-center gap-1.5 flex-wrap">
                <span>Selected:</span>
                <span className="text-emerald-400 font-semibold">{currentMedia.name}</span>
                {(warmedPersonaIds.has(currentMedia.id.toLowerCase()) ||
                  warmedPersonaIds.has(currentMedia.id.toLowerCase().replace(/_body.*$/, "")) ||
                  (currentMedia.id.startsWith("ruby_") && warmedPersonaIds.has("ruby"))) && (
                  <span
                    className="text-[7px] font-mono font-bold px-1.5 py-0.2 rounded border text-amber-400 bg-amber-500/15 border-amber-500/30 flex items-center gap-0.5"
                    title="Appearance pre-warmed: VAE ref_latents + SigLIP vision tokens ready (<10ms load time)."
                  >
                    <Zap className="w-2 h-2 text-amber-400" />
                    <span>0ms WARMED</span>
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Custom</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Sub-Tabs: Ruby Wardrobe Poses vs Personas */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-black/40 border border-white/10 mb-3">
          <button
            onClick={() => setActiveTab("wardrobe")}
            className={`py-1.5 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "wardrobe"
                ? "bg-emerald-500 text-black shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Shirt className="w-3.5 h-3.5" />
            <span>Ruby Wardrobe Poses ({RUBY_WARDROBE_POSES.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("personas")}
            className={`py-1.5 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "personas"
                ? "bg-emerald-500 text-black shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Persona Vault ({PERSONAS.length})</span>
          </button>
        </div>

        {/* Tab 1: Ruby Wardrobe Poses */}
        {activeTab === "wardrobe" && (
          <div className="space-y-2.5">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-[10px] font-mono">
              {[
                { id: "all", label: `All (${RUBY_WARDROBE_POSES.length})` },
                { id: "Classic Broadcast", label: "Classic Broadcast" },
                { id: "Formal Gowns", label: "Formal Gowns" },
                { id: "Editorial & High-Glam", label: "Editorial & Glam" },
                { id: "3-Camera Studio Array", label: "3-Camera Array" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedWardrobeCategory(cat.id)}
                  className={`px-2 py-1 rounded-lg shrink-0 transition-all cursor-pointer ${
                    selectedWardrobeCategory === cat.id
                      ? "bg-emerald-950/90 border border-emerald-500 text-emerald-300 font-bold shadow-sm"
                      : "bg-white/5 border border-white/10 text-muted hover:bg-white/10 hover:text-foreground"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Scrollable Grid of Full-Body Chroma Photos */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
              {filteredWardrobe.map((pose) => {
                const isSelected = currentMedia.id === pose.id;
                return (
                  <button
                    key={pose.id}
                    onClick={() =>
                      handleSelect({
                        id: pose.id,
                        name: pose.label,
                        role: pose.outfit,
                        imageUrl: pose.src,
                        category: pose.category,
                      })
                    }
                    className={`p-1.5 rounded-xl border text-left text-xs transition-all flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? "bg-emerald-950/80 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/30 shadow-md"
                        : "bg-white/5 border-white/10 text-muted hover:bg-white/10 hover:text-foreground"
                    }`}
                  >
                    <div className="w-10 h-14 rounded-lg overflow-hidden bg-black/50 border border-white/10 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={pose.src}
                        alt={pose.label}
                        className="w-full h-full object-cover object-top"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/avatars/ruby.png";
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-[11px] truncate">{pose.label}</div>
                      <div className="text-[9px] text-muted truncate">{pose.pose}</div>
                      <div className="flex items-center gap-1 flex-wrap mt-0.5">
                        <span className="text-[8px] font-mono text-emerald-400 font-bold block">
                          Chroma 9:16
                        </span>
                        {warmedPersonaIds.has("ruby") && (
                          <span
                            className="text-[7px] font-mono font-bold px-1 py-0.2 rounded border text-amber-400 bg-amber-500/15 border-amber-500/30 flex items-center gap-0.5"
                            title="Ruby appearance pre-warmed: VAE ref_latents + SigLIP tokens (<10ms load)."
                          >
                            <Zap className="w-1.5 h-1.5 text-amber-400" />
                            <span>0ms WARMED</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Persona Avatars & Body References */}
        {activeTab === "personas" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
            {PERSONAS.map((p) => {
              const photoUrl = `/avatars/${p.id}_body_ref.png`;
              const isSelected = currentMedia.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() =>
                    handleSelect({
                      id: p.id,
                      name: p.name,
                      role: p.title,
                      imageUrl: photoUrl,
                    })
                  }
                  className={`p-1.5 rounded-xl border text-left text-xs transition-all flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? "bg-emerald-950/80 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/30 shadow-md"
                      : "bg-white/5 border-white/10 text-muted hover:bg-white/10 hover:text-foreground"
                  }`}
                >
                  <div className="w-10 h-14 rounded-lg overflow-hidden bg-black/50 border border-white/10 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoUrl}
                      alt={p.name}
                      className="w-full h-full object-cover object-top"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = p.avatarUrl;
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-[11px] truncate">{p.name}</div>
                    <div className="text-[9px] text-muted truncate">{p.title}</div>
                    <div className="flex items-center gap-1 flex-wrap mt-0.5">
                      <span className="text-[8px] font-mono text-emerald-400 font-bold block">
                        {p.language.toUpperCase()}
                      </span>
                      {warmedPersonaIds.has(p.id.toLowerCase()) && (
                        <span
                          className="text-[7px] font-mono font-bold px-1 py-0.2 rounded border text-amber-400 bg-amber-500/15 border-amber-500/30 flex items-center gap-0.5"
                          title="Appearance pre-warmed: VAE ref_latents + SigLIP tokens (<10ms load)."
                        >
                          <Zap className="w-1.5 h-1.5 text-amber-400" />
                          <span>0ms WARMED</span>
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Custom upload preview indicator */}
      {currentMedia.isCustom && (
        <div className="mt-2.5 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
          <span className="font-bold truncate">Custom Chroma Photo: {currentMedia.name}</span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-200">
            Active
          </span>
        </div>
      )}
    </div>
  );
}

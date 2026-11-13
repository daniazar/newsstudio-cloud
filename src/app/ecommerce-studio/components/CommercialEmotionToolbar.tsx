"use client";

import React from "react";
import { Zap, Sparkles, Shield, Volume1, Users, Music2 } from "lucide-react";

export interface CommercialEmotionToolbarProps {
  onInsertTag: (tag: string) => void;
  className?: string;
}

const EMOTION_TAGS = [
  {
    tag: "[emotion:urgent]",
    label: "Urgent",
    desc: "Brisk pace, sharp consonants for flash sales",
    icon: Zap,
    color: "bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20",
  },
  {
    tag: "[emotion:excited]",
    label: "Excited",
    desc: "Elevated pitch, high energy for reveals & unboxings",
    icon: Sparkles,
    color: "bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20",
  },
  {
    tag: "[emotion:authoritative]",
    label: "Authority",
    desc: "Confident, measured cadence for specs & durability",
    icon: Shield,
    color: "bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20",
  },
  {
    tag: "[emotion:whisper]",
    label: "ASMR Whisper",
    desc: "Intimate close-mic tone for beauty & textures",
    icon: Volume1,
    color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20",
  },
  {
    tag: "[emotion:relatable]",
    label: "Relatable",
    desc: "Warm, empathetic creator UGC cadence",
    icon: Users,
    color: "bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20",
  },
];

const SFX_TAGS = [
  { tag: "[sfx:whoosh]", label: "💨 Whoosh" },
  { tag: "[sfx:pop]", label: "🫧 Pop" },
  { tag: "[sfx:cash_register]", label: "💰 Ka-Ching" },
  { tag: "[sfx:camera_click]", label: "📸 Shutter" },
  { tag: "[sfx:ding]", label: "🔔 Ding" },
];

export const CommercialEmotionToolbar: React.FC<CommercialEmotionToolbarProps> = ({
  onInsertTag,
  className = "",
}) => {
  return (
    <div className={`space-y-2 py-1 ${className}`}>
      {/* Emotion Cadence Chips */}
      <div>
        <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" /> Commercial TTS Emotion Cadence
          </span>
          <span className="text-[9px] text-muted-foreground">Click to inject</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {EMOTION_TAGS.map((e) => {
            const Icon = e.icon;
            return (
              <button
                key={e.tag}
                type="button"
                onClick={() => onInsertTag(e.tag)}
                title={e.desc}
                className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all ${e.color}`}
              >
                <Icon className="w-2.5 h-2.5" />
                <span>{e.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SFX Timing Chips */}
      <div>
        <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1">
          <span className="flex items-center gap-1">
            <Music2 className="w-3 h-3 text-amber-400" /> Synchronized Sound Effects (SFX)
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SFX_TAGS.map((s) => (
            <button
              key={s.tag}
              type="button"
              onClick={() => onInsertTag(s.tag)}
              className="px-2 py-1 rounded-lg border border-white/10 bg-[#0c0c0f] hover:bg-white/10 text-white/80 hover:text-white text-[10px] font-mono font-semibold transition-all"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

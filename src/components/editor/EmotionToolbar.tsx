"use client";

import React from "react";
import { AlertTriangle, Sparkles } from "lucide-react";
import { DetectionResult } from "@/lib/ai/pronunciationDetector";

interface EmotionToolbarProps {
  /** Callback to insert tag at current cursor position in text area */
  onInsertTag: (tag: string) => void;
  /** Optional pronunciation analysis results for the current text */
  pronunciationResult?: DetectionResult;
  /** Callback to auto-expand all acronyms in current text */
  onExpandAcronyms?: () => void;
  /** Callback to apply tone preset tags */
  onApplyTonePreset?: (tone: "urgent" | "casual" | "analytical" | "hype") => void;
  /** Active language: "es" or "en" */
  language?: "es" | "en";
}

const EMOTION_BADGES = [
  { tag: "[urgent]", label: "🔴 Urgent", color: "bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30" },
  { tag: "[excited]", label: "⚡ Excited", color: "bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30" },
  { tag: "[whisper]", label: "🤫 Whisper", color: "bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30" },
  { tag: "[serious]", label: "🕊️ Serious", color: "bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30" },
  { tag: "[calm]", label: "☕ Calm", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30" },
] as const;

const SFX_BADGES = [
  { tag: "[sfx:whoosh]", label: "💨 Whoosh", sound: "/sfx/whoosh.mp3" },
  { tag: "[sfx:stinger]", label: "🚨 Stinger", sound: "/sfx/news_stinger.mp3" },
  { tag: "[sfx:camera]", label: "📸 Shutter", sound: "/sfx/camera_shutter.mp3" },
  { tag: "[sfx:pop]", label: "✨ Pop", sound: "/sfx/pop.mp3" },
  { tag: "[sfx:glitch]", label: "⚡ Glitch", sound: "/sfx/glitch.mp3" },
  { tag: "[sfx:bass_drop]", label: "💥 Impact", sound: "/sfx/bass_drop.mp3" },
  { tag: "[sfx:ding]", label: "🔔 Ding", sound: "/sfx/ding.mp3" },
] as const;

const PAUSE_BADGES = [
  { tag: "[pause: 0.3s]", label: "⏱️ 0.3s" },
  { tag: "[pause: 0.5s]", label: "⏱️ 0.5s" },
  { tag: "[pause: 1.0s]", label: "⏱️ 1.0s" },
] as const;

const CUE_BADGES = [
  { tag: "[camera:zoom_in]", label: "🎥 Zoom In" },
  { tag: "[graphic:lower_third]", label: "🏷️ Source Tag" },
] as const;

const ANIMATION_BADGES = [
  { tag: '[stat: +42% YoY | "Revenue Beat" | emerald]', label: "📊 Stat" },
  { tag: '[counter: 98400 | prefix=$ | suffix=USD | dur=1.5s]', label: "🔢 Counter" },
  { tag: '[entity: "Jensen Huang" | "CEO, NVIDIA" | icon=🟢]', label: "👤 Entity" },
  { tag: '[alert: "BREAKING NEWS" | red]', label: "🚨 Alert" },
  { tag: "[fx: fire]", label: "🔥 FX" },
] as const;

export function EmotionToolbar({
  onInsertTag,
  pronunciationResult,
  onExpandAcronyms,
  onApplyTonePreset,
}: EmotionToolbarProps) {
  const redCount = pronunciationResult?.counts.red || 0;
  const yellowCount = pronunciationResult?.counts.yellow || 0;

  const playSfxPreview = (url: string) => {
    try {
      const audio = new Audio(url);
      audio.volume = 0.4;
      audio.play().catch(() => {});
    } catch {}
  };

  return (
    <div className="space-y-2 p-2.5 bg-surface/80 rounded-xl border border-border text-xs mb-2">
      {/* Top Row: Emotions & Tone Presets */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mr-1">
            Tone:
          </span>
          {EMOTION_BADGES.map((b) => (
            <button
              key={b.tag}
              type="button"
              onClick={() => onInsertTag(b.tag)}
              className={`px-2 py-1 rounded-lg border text-[10px] font-semibold transition-all cursor-pointer ${b.color}`}
              title={`Insert ${b.tag} tag`}
            >
              {b.label}
            </button>
          ))}

          <div className="h-4 w-px bg-border mx-1" />

          {/* Pause Badges */}
          {PAUSE_BADGES.map((p) => (
            <button
              key={p.tag}
              type="button"
              onClick={() => onInsertTag(p.tag)}
              className="px-2 py-1 rounded-lg border border-border bg-white/5 hover:bg-white/10 text-foreground text-[10px] font-semibold transition-all cursor-pointer"
              title={`Insert ${p.tag} silence marker`}
            >
              {p.label}
            </button>
          ))}

          <div className="h-4 w-px bg-border mx-1" />

          {/* Visual Cues */}
          {CUE_BADGES.map((c) => (
            <button
              key={c.tag}
              type="button"
              onClick={() => onInsertTag(c.tag)}
              className="px-2 py-1 rounded-lg border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 text-[10px] font-semibold transition-all cursor-pointer"
              title={`Insert ${c.tag} cue`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Tone Shifter Presets */}
        {onApplyTonePreset && (
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-bold text-muted uppercase font-mono">Preset:</span>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  onApplyTonePreset(e.target.value as Parameters<typeof onApplyTonePreset>[0]);
                  e.target.value = "";
                }
              }}
              defaultValue=""
              className="px-2 py-1 bg-surface border border-border rounded-lg text-[10px] text-foreground focus:outline-none cursor-pointer"
            >
              <option value="" disabled>Shifter...</option>
              <option value="urgent">🚨 Urgent Breaking</option>
              <option value="casual">☕ Casual Podcast</option>
              <option value="analytical">📊 Analytical</option>
              <option value="hype">🔥 Viral Hype</option>
            </select>
          </div>
        )}
      </div>

      {/* Second Row: SFX Soundboard & Animated Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/50">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mr-1">
            SFX:
          </span>
          {SFX_BADGES.map((s) => (
            <button
              key={s.tag}
              type="button"
              onClick={() => {
                playSfxPreview(s.sound);
                onInsertTag(s.tag);
              }}
              className="px-2 py-0.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1"
              title={`Insert ${s.tag} sound effect`}
            >
              <span>{s.label}</span>
            </button>
          ))}

          <div className="h-4 w-px bg-border mx-1" />

          {/* On-the-Fly Animations */}
          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mr-0.5">
            Anim:
          </span>
          {ANIMATION_BADGES.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={() => onInsertTag(a.tag)}
              className="px-2 py-0.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-[10px] font-semibold transition-all cursor-pointer"
              title={`Insert ${a.tag} on-the-fly animation`}
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* Pronunciation Warning Summary */}
        {pronunciationResult && (redCount > 0 || yellowCount > 0) && (
          <div className="flex items-center gap-2">
            {redCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-bold">
                <AlertTriangle className="w-3 h-3" />
                {redCount} Acronyms
              </span>
            )}
            {yellowCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                {yellowCount} Warnings
              </span>
            )}
            {onExpandAcronyms && (
              <button
                type="button"
                onClick={onExpandAcronyms}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-[10px] font-bold transition-all cursor-pointer shadow-sm"
                title="Expand acronyms to phonetic Spanish/English text"
              >
                <Sparkles className="w-3 h-3" />
                Expand Acronyms
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * src/components/editor/shared/teleprompter/IlluminatedScriptTeleprompter.tsx
 *
 * Interactive Live Illuminated Script Teleprompter.
 * Directly tracks video playback frame-by-frame, illuminating words in real-time
 * as they are spoken. Allows clicking any word to seek the player to that exact timecode.
 */

import React, { useMemo } from "react";
import {
  Sparkles,
} from "lucide-react";
import { AdCaptionStyle } from "@/lib/types/ecommerce";
import { stripAllInlineTags } from "@/lib/sfx/inlineSfxParser";

export interface IlluminatedScriptTeleprompterProps {
  text?: string;
  sceneStartFrame: number;
  sceneDurationFrames: number;
  currentFrame: number;
  fps?: number;
  onSeekFrame: (frame: number) => void;
  sceneIndex?: number;
  totalScenes?: number;
  isPlaying?: boolean;
  captionStyle?: AdCaptionStyle;
  onChangeCaptionStyle?: (style: AdCaptionStyle) => void;
  accentColor?: string;
  compact?: boolean;
}

export interface TimedPrompterWord {
  word: string;
  startFrame: number;
  endFrame: number;
  isNumericOrCurrency: boolean;
  isPowerWord: boolean;
}

export const IlluminatedScriptTeleprompter: React.FC<IlluminatedScriptTeleprompterProps> = ({
  text = "",
  sceneStartFrame,
  sceneDurationFrames,
  currentFrame,
  fps = 30,
  onSeekFrame,
  sceneIndex = 0,
  totalScenes = 1,
  isPlaying = false,
  captionStyle = "kinetic_glow",
  onChangeCaptionStyle,
  accentColor: _accentColor = "#06b6d4",
  compact = false,
}) => {
  // Strip inline speech tags
  const clean = useMemo(() => stripAllInlineTags(text || "").replace(/\s+/g, " ").trim(), [text]);

  // Compute character-weighted word timing
  const timedWords = useMemo(() => {
    const rawWords = clean.split(/\s+/).filter(Boolean);
    if (rawWords.length === 0) return [];

    const totalChars = rawWords.reduce((acc, w) => acc + w.length, 0);
    const effectiveFrames = Math.max(15, sceneDurationFrames - 10);
    const speechLeadFrames = 3;

    let accumulatedOffset = speechLeadFrames;
    return rawWords.map((word) => {
      const wordWeight = word.length / totalChars;
      const wordDuration = Math.max(4, Math.round(wordWeight * effectiveFrames));
      const start = sceneStartFrame + accumulatedOffset;
      const end = start + wordDuration;
      accumulatedOffset += wordDuration;

      const cleanWord = word.toUpperCase().replace(/[^A-Z0-9$%]/g, "");
      const isNumericOrCurrency = /[0-9]|\$|%|€|£/.test(cleanWord);
      const isPowerWord = /^(OFF|SAVE|FREE|SALE|NUEVO|NEW|WATERPROOF|IMPERMEABLE|GARANTIZADO|GUARANTEED|BEST|TOP|EXCLUSIVE|TRANSFORM|CALIDAD|DESCUENTO)$/.test(
        cleanWord
      );

      return {
        word,
        startFrame: start,
        endFrame: end,
        isNumericOrCurrency,
        isPowerWord,
      };
    });
  }, [clean, sceneStartFrame, sceneDurationFrames]);

  // Active word index in current scene
  const _activeWordIdx = useMemo(() => {
    return timedWords.findIndex(
      (w) => currentFrame >= w.startFrame && currentFrame < w.endFrame
    );
  }, [timedWords, currentFrame]);

  // Scene timing progress (0 to 100%)
  const sceneProgressPercent = useMemo(() => {
    if (sceneDurationFrames <= 0) return 0;
    const elapsed = Math.max(0, currentFrame - sceneStartFrame);
    return Math.min(100, (elapsed / sceneDurationFrames) * 100);
  }, [currentFrame, sceneStartFrame, sceneDurationFrames]);

  const elapsedSec = Math.max(0, (currentFrame - sceneStartFrame) / fps);
  const totalSec = Math.max(0, sceneDurationFrames / fps);

  if (!clean) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-3 text-center">
        <span className="text-xs text-zinc-500 italic">
          No voiceover script in Scene #{sceneIndex + 1}. Add script in the Voice tab to see real-time illuminated teleprompter.
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 shadow-xl overflow-hidden transition-all">
      {/* ── 1. Teleprompter Header Bar ─────────────────────────────── */}
      <div className="px-3.5 py-2.5 bg-zinc-900/80 border-b border-zinc-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-zinc-100 tracking-wide flex items-center gap-1.5">
              Live Illuminated Teleprompter
              {isPlaying && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </span>
            <span className="text-[10px] text-zinc-400 block font-mono">
              Scene #{sceneIndex + 1}/{totalScenes} • {elapsedSec.toFixed(1)}s / {totalSec.toFixed(1)}s
            </span>
          </div>
        </div>

        {/* Style Preset Selector */}
        {onChangeCaptionStyle && (
          <div className="flex items-center gap-1">
            <label className="text-[10px] text-zinc-400 font-medium">Style:</label>
            <select
              value={captionStyle}
              onChange={(e) => onChangeCaptionStyle(e.target.value as AdCaptionStyle)}
              className="bg-zinc-900 border border-zinc-700/80 rounded-md px-2 py-1 text-[11px] text-zinc-200 focus:outline-none focus:border-emerald-500 font-semibold"
            >
              <option value="kinetic_glow">✨ Kinetic Glow (Hormozi)</option>
              <option value="beast_pop">⚡ Beast Pop (MrBeast)</option>
              <option value="karaoke_flow">🌊 Karaoke Flow</option>
              <option value="minimal_clean">⚪ Minimal Clean</option>
              <option value="hidden">🚫 Captions Hidden</option>
            </select>
          </div>
        )}
      </div>

      {/* ── 2. Interactive Word Illumination Canvas ──────────────────── */}
      <div className={`p-3.5 flex flex-wrap gap-1.5 items-center ${compact ? "max-h-24" : "max-h-36"} overflow-y-auto custom-scrollbar`}>
        {timedWords.map((item, idx) => {
          const isActive = currentFrame >= item.startFrame && currentFrame < item.endFrame;
          const isSpoken = currentFrame >= item.endFrame;

          return (
            <button
              key={`${item.startFrame}-${idx}`}
              type="button"
              onClick={() => onSeekFrame(item.startFrame)}
              title={`Click to jump to ${(item.startFrame / fps).toFixed(2)}s`}
              className={`text-xs px-2 py-1 rounded-md transition-all duration-75 text-left select-none ${
                isActive
                  ? "bg-gradient-to-r from-emerald-400 to-teal-300 text-black font-black shadow-lg shadow-emerald-500/40 ring-2 ring-emerald-300 scale-105 -translate-y-0.5 z-10"
                  : isSpoken
                  ? "bg-zinc-800/80 text-zinc-100 font-semibold border border-zinc-700/50 hover:bg-zinc-700 hover:border-zinc-600"
                  : "bg-zinc-900/40 text-zinc-500 font-normal hover:text-zinc-300 hover:bg-zinc-800/40 border border-transparent"
              }`}
            >
              {item.word}
            </button>
          );
        })}
      </div>

      {/* ── 3. Real-Time Scene Progress Bar ─────────────────────────── */}
      <div className="h-1 bg-zinc-900 w-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-75"
          style={{ width: `${sceneProgressPercent}%` }}
        />
      </div>
    </div>
  );
};

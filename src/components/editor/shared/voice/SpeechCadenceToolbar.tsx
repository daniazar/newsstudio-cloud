"use client";

import React, { useMemo } from "react";
import {
  Sparkles,
  Clock,
  Volume2,
  AlertTriangle,
  Wand2,
} from "lucide-react";

export interface SpeechCadenceToolbarProps {
  scriptText: string;
  onInsertTag: (tag: string) => void;
  onReplaceScript?: (newScript: string) => void;
  disabled?: boolean;
  className?: string;
  inline?: boolean;
}

interface EmotionTag {
  label: string;
  tag: string;
  color: string;
  icon: string;
}

interface PauseTag {
  label: string;
  tag: string;
  duration: string;
}

interface SfxTag {
  label: string;
  tag: string;
  soundType: string;
}

const EMOTION_TAGS: EmotionTag[] = [
  { label: "Urgent", tag: "[emotion:urgent]", color: "text-red-400 bg-red-500/10 border-red-500/30", icon: "🚨" },
  { label: "Excited", tag: "[emotion:excited]", color: "text-amber-400 bg-amber-500/10 border-amber-500/30", icon: "🔥" },
  { label: "Authoritative", tag: "[emotion:authoritative]", color: "text-blue-400 bg-blue-500/10 border-blue-500/30", icon: "🎙️" },
  { label: "Thoughtful", tag: "[emotion:thoughtful]", color: "text-purple-400 bg-purple-500/10 border-purple-500/30", icon: "💡" },
  { label: "Whisper", tag: "[emotion:whisper]", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30", icon: "🤫" },
  { label: "Warm", tag: "[emotion:happy]", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", icon: "✨" },
];

const PAUSE_TAGS: PauseTag[] = [
  { label: "Micro (0.2s)", tag: "[pause: 0.2s]", duration: "0.2s" },
  { label: "Comma (0.4s)", tag: "[pause: 0.4s]", duration: "0.4s" },
  { label: "Breath (0.7s)", tag: "[pause: 0.7s]", duration: "0.7s" },
  { label: "Dramatic (1.2s)", tag: "[pause: 1.2s]", duration: "1.2s" },
];

const SFX_TAGS: SfxTag[] = [
  { label: "Whoosh Heavy", tag: "[sfx:whoosh_heavy]", soundType: "Transition" },
  { label: "Ka-Ching / Cash", tag: "[sfx:ka_ching]", soundType: "Commercial" },
  { label: "Pop / UI", tag: "[sfx:pop]", soundType: "Feature" },
  { label: "Heavy Impact", tag: "[sfx:heavy_impact]", soundType: "Punch" },
  { label: "Glitch Buzz", tag: "[sfx:glitch]", soundType: "Tech" },
  { label: "Ambient Rise", tag: "[sfx:ambient_rise]", soundType: "Cinematic" },
];

// Problematic acronym dictionary for phonetics
interface AcronymRule {
  pattern: RegExp;
  acronym: string;
  replacement: string;
  reason: string;
}

const ACRONYM_RULES: AcronymRule[] = [
  {
    pattern: /\bSPC\b/g,
    acronym: "SPC",
    replacement: "S-P-C",
    reason: "Prevent neural phoneme slur; pronounce letters distinctly",
  },
  {
    pattern: /\bPVC\b/g,
    acronym: "PVC",
    replacement: "P-V-C",
    reason: "Pronounce individual letters P-V-C",
  },
  {
    pattern: /\bSKU\b/g,
    acronym: "SKU",
    replacement: "S-K-U",
    reason: "Pronounce letters S-K-U cleanly",
  },
  {
    pattern: /\bm²\b/g,
    acronym: "m²",
    replacement: "metros cuadrados",
    reason: "Spell out unit of area for natural cadence",
  },
  {
    pattern: /\bYoY\b/g,
    acronym: "YoY",
    replacement: "año contra año",
    reason: "Expand financial metric",
  },
  {
    pattern: /\bMoM\b/g,
    acronym: "MoM",
    replacement: "mes contra mes",
    reason: "Expand financial metric",
  },
  {
    pattern: /\bB2B\b/g,
    acronym: "B2B",
    replacement: "B to B",
    reason: "Natural English/Spanish business acronym",
  },
  {
    pattern: /\bAI\b/g,
    acronym: "AI",
    replacement: "A-I",
    reason: "Avoid reading as the word 'ai'",
  },
  {
    pattern: /\b(\d+)\s*mm\b/gi,
    acronym: "mm",
    replacement: "$1 milímetros",
    reason: "Expand measurement units for natural voice synthesis",
  },
  {
    pattern: /\b(\d+)\s*cm\b/gi,
    acronym: "cm",
    replacement: "$1 centímetros",
    reason: "Expand measurement units",
  },
];

export function SpeechCadenceToolbar({
  scriptText,
  onInsertTag,
  onReplaceScript,
  disabled = false,
  className = "",
  inline = false,
}: SpeechCadenceToolbarProps) {
  const [activeSubtab, setActiveSubtab] = React.useState<"emotions" | "pauses" | "sfx" | "linter">("emotions");

  // Detect issues in script
  const detectedIssues = useMemo(() => {
    if (!scriptText) return [];
    const issues: { rule: AcronymRule; matchCount: number }[] = [];

    for (const rule of ACRONYM_RULES) {
      const matches = scriptText.match(rule.pattern);
      if (matches && matches.length > 0) {
        issues.push({ rule, matchCount: matches.length });
      }
    }
    return issues;
  }, [scriptText]);

  const handleFixAllAcronyms = () => {
    if (!onReplaceScript || !scriptText) return;
    let fixed = scriptText;
    for (const { rule } of detectedIssues) {
      fixed = fixed.replace(rule.pattern, rule.replacement);
    }
    onReplaceScript(fixed);
  };

  const handleFixSingleAcronym = (rule: AcronymRule) => {
    if (!onReplaceScript || !scriptText) return;
    const fixed = scriptText.replace(rule.pattern, rule.replacement);
    onReplaceScript(fixed);
  };

  // Inline Docked Mode: Sits directly attached to script textarea
  if (inline) {
    return (
      <div className={`rounded-b-lg border border-t-0 border-zinc-700/80 bg-zinc-900/90 p-2.5 space-y-2 -mt-1.5 backdrop-blur-md ${className}`}>
        {/* Subtab Switcher */}
        <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-1.5">
          <div className="flex items-center gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => setActiveSubtab("emotions")}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                activeSubtab === "emotions"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
              }`}
            >
              <Sparkles className="h-3 w-3 text-cyan-400" />
              <span>Emotions</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubtab("pauses")}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                activeSubtab === "pauses"
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
              }`}
            >
              <Clock className="h-3 w-3 text-blue-400" />
              <span>Breathing Pauses</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubtab("sfx")}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                activeSubtab === "sfx"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
              }`}
            >
              <Volume2 className="h-3 w-3 text-amber-400" />
              <span>Sound Effects</span>
            </button>

            {detectedIssues.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveSubtab("linter")}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                  activeSubtab === "linter"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10"
                }`}
              >
                <AlertTriangle className="h-3 w-3 text-amber-400" />
                <span>Fix Acronyms ({detectedIssues.length})</span>
              </button>
            )}
          </div>

          <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">
            Click to insert tag
          </span>
        </div>

        {/* Active Chips Strip */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {activeSubtab === "emotions" &&
            EMOTION_TAGS.map((emo) => (
              <button
                key={emo.tag}
                type="button"
                disabled={disabled}
                onClick={() => onInsertTag(emo.tag)}
                title={`Insert ${emo.tag} into script`}
                className={`flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-medium transition-all hover:scale-105 cursor-pointer ${emo.color}`}
              >
                <span>{emo.icon}</span>
                <span>{emo.label}</span>
              </button>
            ))}

          {activeSubtab === "pauses" &&
            PAUSE_TAGS.map((p) => (
              <button
                key={p.tag}
                type="button"
                disabled={disabled}
                onClick={() => onInsertTag(p.tag)}
                title={`Insert ${p.tag} into script`}
                className="px-2 py-1 rounded-md border border-zinc-700/80 bg-zinc-800/80 hover:border-blue-500/50 hover:bg-blue-500/10 text-[11px] font-mono text-zinc-200 transition-colors cursor-pointer"
              >
                {p.label}
              </button>
            ))}

          {activeSubtab === "sfx" &&
            SFX_TAGS.map((sfx) => (
              <button
                key={sfx.tag}
                type="button"
                disabled={disabled}
                onClick={() => onInsertTag(sfx.tag)}
                title={`Insert ${sfx.tag} into script`}
                className="px-2 py-1 rounded-md border border-zinc-700/80 bg-zinc-800/80 hover:border-amber-500/50 hover:bg-amber-500/10 text-[11px] font-medium text-amber-300 transition-colors cursor-pointer"
              >
                {sfx.label}
              </button>
            ))}

          {activeSubtab === "linter" && detectedIssues.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 w-full">
              <div className="flex flex-wrap gap-1.5">
                {detectedIssues.map(({ rule, matchCount }) => (
                  <button
                    key={rule.acronym}
                    type="button"
                    onClick={() => handleFixSingleAcronym(rule)}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-amber-500/40 bg-amber-500/10 text-[11px] text-zinc-200 hover:border-amber-400 transition-colors cursor-pointer"
                    title={rule.reason}
                  >
                    <span className="font-bold text-amber-400">{rule.acronym}</span>
                    <span className="text-zinc-500">→</span>
                    <span className="font-mono text-zinc-300">{rule.replacement}</span>
                    <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 font-bold">
                      {matchCount}x
                    </span>
                  </button>
                ))}
              </div>

              {onReplaceScript && (
                <button
                  type="button"
                  onClick={handleFixAllAcronyms}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold hover:bg-amber-500/30 transition-colors cursor-pointer"
                >
                  <Wand2 className="h-3 w-3" />
                  <span>Expand All</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Standalone Card Mode (Default)
  return (
    <div
      className={`rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 space-y-3 backdrop-blur-md ${className}`}
    >
      {/* 1. Speech Emotions Row */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
          <span>Emotion & Delivery Cues</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {EMOTION_TAGS.map((emo) => (
            <button
              key={emo.tag}
              type="button"
              disabled={disabled}
              onClick={() => onInsertTag(emo.tag)}
              title={`Insert ${emo.tag} at cursor`}
              className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium transition-all hover:scale-105 ${emo.color}`}
            >
              <span>{emo.icon}</span>
              <span>{emo.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Cadence Breathing Pauses & SFX Tags */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-zinc-800/80">
        {/* Breathing Pauses */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
            <Clock className="h-3.5 w-3.5 text-blue-400" />
            <span>Breathing Pauses</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {PAUSE_TAGS.map((p) => (
              <button
                key={p.tag}
                type="button"
                disabled={disabled}
                onClick={() => onInsertTag(p.tag)}
                title={`Insert ${p.tag}`}
                className="px-2 py-1 rounded-md border border-zinc-800 bg-zinc-900/70 hover:border-zinc-700 hover:bg-zinc-800 text-[11px] font-mono text-zinc-300 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* SFX Tags */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
            <Volume2 className="h-3.5 w-3.5 text-amber-400" />
            <span>Sound Effects (SFX)</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {SFX_TAGS.map((sfx) => (
              <button
                key={sfx.tag}
                type="button"
                disabled={disabled}
                onClick={() => onInsertTag(sfx.tag)}
                title={`Insert ${sfx.tag}`}
                className="px-2 py-1 rounded-md border border-zinc-800 bg-zinc-900/70 hover:border-amber-500/40 hover:bg-amber-500/10 text-[11px] font-medium text-amber-300 transition-colors"
              >
                {sfx.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Pronunciation Linter & Acronym Expander */}
      {detectedIssues.length > 0 && onReplaceScript && (
        <div className="pt-2 border-t border-zinc-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>
                Pronunciation Linter ({detectedIssues.length} phonetic issues found)
              </span>
            </div>

            <button
              type="button"
              onClick={handleFixAllAcronyms}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold hover:bg-amber-500/30 transition-colors"
            >
              <Wand2 className="h-3 w-3" />
              <span>Expand All Phonetically</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {detectedIssues.map(({ rule, matchCount }) => (
              <button
                key={rule.acronym}
                type="button"
                onClick={() => handleFixSingleAcronym(rule)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-amber-500/40 bg-amber-500/10 text-[11px] text-zinc-200 hover:border-amber-400 transition-colors"
                title={rule.reason}
              >
                <span className="font-bold text-amber-400">{rule.acronym}</span>
                <span className="text-zinc-500">→</span>
                <span className="font-mono text-zinc-300">{rule.replacement}</span>
                <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 font-bold">
                  {matchCount}x
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

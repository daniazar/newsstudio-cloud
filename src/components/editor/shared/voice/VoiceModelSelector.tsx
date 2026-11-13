"use client";

import { getAvatarThumbnailUrl,handleAvatarImgError } from "@/lib/personas/avatarThumbnail";
import { PERSONAS,Persona,getPersonaById,resolvePersonaVoiceSettings } from "@/lib/tts/personas";
import {
ChevronDown,
Mic,
Play,
Sliders,
Sparkles,
Square,
User
} from "lucide-react";
import { useEffect,useMemo,useState } from "react";
import { useAudioAudition } from "../hooks/useAudioAudition";

export interface VoiceModelSelectorProps {
  editorMode?: "simple" | "pro";
  selectedEngine: string;
  onChangeEngine: (engine: string) => void;
  selectedModel: string;
  onChangeModel: (model: string) => void;
  selectedPersonaId?: string;
  onChangePersona?: (personaId: string, persona: Persona) => void;
  speed?: number;
  onChangeSpeed?: (speed: number) => void;
  pitchShift?: number;
  onChangePitchShift?: (pitch: number) => void;
  language?: string;
  isSpanish?: boolean;
  disableCloningIfDifferentLanguage?: boolean;
  onToggleDisableCloningIfDifferentLanguage?: (val: boolean) => void;
  sampleAudioUrl?: string;
  disabled?: boolean;
  className?: string;
  defaultCollapsed?: boolean;
}

export interface ModernEngineOption {
  id: string;
  name: string;
  tagline: string;
  badge: string;
  badgeColor: string;
  defaultModel: string;
  description: string;
}

export const MODERN_ENGINES: ModernEngineOption[] = [
  {
    id: "omni",
    name: "OmniVoice",
    tagline: "Expressive Zero-Shot Master",
    badge: "Default Studio",
    badgeColor: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    defaultModel: "k2-fsa/OmniVoice",
    description: "Next-gen zero-shot voice cloning with dynamic emotion, natural prosody, and multi-dialect voice matching.",
  },
  {
    id: "piper",
    name: "Piper ONNX",
    tagline: "Ultra-Low Latency (<100ms)",
    badge: "Default Fast",
    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    defaultModel: "en_US-lessac-high",
    description: "Instant neural phoneme synthesis designed for low latency, live previews, and streaming.",
  },
  {
    id: "f5_tts",
    name: "F5-TTS Flow Matching",
    tagline: "Studio Diffusion Master",
    badge: "Broadcast Master",
    badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    defaultModel: "SWivid/F5-TTS",
    description: "Flow-matching diffusion model conditioned on persona voice references for master broadcast quality.",
  },
  {
    id: "kokoro",
    name: "Kokoro 82M",
    tagline: "Sub-50ms Crystal Clear",
    badge: "Ultra-Fast",
    badgeColor: "bg-green-500/20 text-green-400 border-green-500/30",
    defaultModel: "hexgrad/Kokoro-82M",
    description: "Lightweight 82M broadcast engine with razor-sharp enunciation and instant turnaround.",
  },
  {
    id: "styletts2",
    name: "StyleTTS 2",
    tagline: "Acoustic Style & Emotion",
    badge: "Expressive",
    badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    defaultModel: "styletts2/default",
    description: "Rich acoustic style modeling that preserves emotional cadences and dramatic pitch curves.",
  },
  {
    id: "cosyvoice_3",
    name: "CosyVoice 3",
    tagline: "Multi-Lingual High Fidelity",
    badge: "Multi-Lingual",
    badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    defaultModel: "FunAudioLLM/CosyVoice-300M",
    description: "Multilingual zero-shot voice cloning with natural prosody and dialect support.",
  },
];

export function VoiceModelSelector({
  editorMode = "simple",
  selectedEngine = "omni",
  onChangeEngine,
  selectedModel,
  onChangeModel,
  selectedPersonaId = "ruby",
  onChangePersona,
  speed = 1.0,
  onChangeSpeed,
  pitchShift = 0,
  onChangePitchShift,
  language,
  isSpanish,
  disableCloningIfDifferentLanguage = true,
  onToggleDisableCloningIfDifferentLanguage,
  sampleAudioUrl,
  disabled = false,
  className = "",
  defaultCollapsed = true,
}: VoiceModelSelectorProps) {
  const { isPlaying, activeUrl, audition, stop } = useAudioAudition();
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [showPersonaDropdown, setShowPersonaDropdown] = useState(false);
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const isAdvancedVisible = editorMode === "pro" || advancedExpanded;

  // Resolve active Persona
  const activePersona: Persona = useMemo(() => {
    if (!selectedPersonaId) return PERSONAS[0];
    const normalized = selectedPersonaId.toLowerCase();
    return (
      PERSONAS.find(
        (p) =>
          p.id.toLowerCase() === normalized ||
          p.name.toLowerCase().includes(normalized) ||
          normalized.includes(p.id.toLowerCase())
      ) ||
      getPersonaById(selectedPersonaId) ||
      PERSONAS[0]
    );
  }, [selectedPersonaId]);

  // Determine effective target language (prop takes priority, otherwise check isSpanish, fallback to activePersona's language)
  const effectiveLang = (language || (isSpanish ? "es" : activePersona.language) || "es").toLowerCase();
  const personaNativeLang = (activePersona.language || "es").toLowerCase().split(/[-_]/)[0];
  const targetCleanLang = effectiveLang.split(/[-_]/)[0];
  const isLanguageMismatch = personaNativeLang !== targetCleanLang;

  // Voice settings decided by hierarchy: Language first -> Genre (gender) second -> Defaults in personas.ts -> Voice cloning features
  const resolvedVoice = useMemo(() => {
    return resolvePersonaVoiceSettings({
      persona: activePersona,
      engine: selectedEngine,
      language: effectiveLang,
      disableCloningIfDifferentLanguage,
    });
  }, [activePersona, selectedEngine, effectiveLang, disableCloningIfDifferentLanguage]);

  const decidedCheckpoint = resolvedVoice.checkpoint;

  // Keep parent's selectedModel in sync with decided checkpoint
  useEffect(() => {
    if (decidedCheckpoint && selectedModel !== decidedCheckpoint) {
      onChangeModel(decidedCheckpoint);
    }
  }, [decidedCheckpoint, selectedModel, onChangeModel]);

  const handleAudition = () => {
    const url = sampleAudioUrl || `/audio/samples/${activePersona.voiceFile || "default.wav"}`;
    if (isPlaying && activeUrl === url) {
      stop();
    } else {
      audition(url);
    }
  };

  const handleSelectEngine = (engine: ModernEngineOption) => {
    onChangeEngine(engine.id);
  };

  const handleSelectPersona = (persona: Persona) => {
    onChangePersona?.(persona.id, persona);
    setShowPersonaDropdown(false);
  };

  return (
    <div
      className={`rounded-xl border border-zinc-800 bg-zinc-950/80 backdrop-blur-md transition-all overflow-hidden ${className}`}
    >
      {/* Sleek Voice Tuning & Model Header Bar */}
      <div
        onClick={() => setIsCollapsed((prev) => !prev)}
        aria-expanded={!isCollapsed}
        aria-label="Toggle Voice Selector Panel"
        role="button"
        className="p-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-zinc-900/50 transition-colors select-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Voice Microphone Icon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-xs">
            <Mic className="h-5 w-5" />
          </div>

          {/* Voice Engine & Tuning Info */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                Voice Model & Speech Engine
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                {selectedEngine.toUpperCase()}: {decidedCheckpoint}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono border border-zinc-700/50">
                🌐 {resolvedVoice.language.toUpperCase()} ({resolvedVoice.locale})
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono mt-0.5 truncate">
              {resolvedVoice.isCloningEnabled ? (
                <span className="text-cyan-400 flex items-center gap-1 truncate">
                  <Sparkles className="h-3 w-3 shrink-0" />
                  Zero-Shot Clone: {resolvedVoice.referenceAudio}
                </span>
              ) : (
                <span className="text-zinc-400 truncate">
                  Standard {resolvedVoice.locale} Voice
                </span>
              )}
              <span className="text-zinc-600">·</span>
              <span>Speed: {speed.toFixed(2)}x</span>
              <span className="text-zinc-600">·</span>
              <span>Pitch: {pitchShift > 0 ? `+${pitchShift}` : `${pitchShift}`}st</span>
            </div>
          </div>
        </div>

        {/* Right Actions: Audition + Collapse Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleAudition();
            }}
            disabled={disabled}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              isPlaying
                ? "bg-emerald-500 text-black border-emerald-400 shadow-sm"
                : "bg-zinc-900 text-zinc-300 border-zinc-700 hover:text-white hover:bg-zinc-800"
            }`}
            title="Audition Persona Voice"
          >
            {isPlaying ? <Square className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3" />}
            <span className="hidden sm:inline">{isPlaying ? "Stop" : "Audition"}</span>
          </button>

          <button
            type="button"
            aria-expanded={!isCollapsed}
            aria-label="Toggle voice selector panel"
            className="p-1 text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isCollapsed ? "" : "rotate-180"}`} />
          </button>
        </div>
      </div>

      {/* Expanded Controls Body */}
      {!isCollapsed && (
        <div className="p-4 pt-2 border-t border-zinc-800/80 space-y-4">
          {/* Switch Persona Dropdown Trigger */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-emerald-400" />
                <span>Switch Active Voice Persona</span>
              </label>
              <span className="text-[10px] text-zinc-400">
                Click below to select another anchor
              </span>
            </div>

            <div className="relative">
              <button
                type="button"
                disabled={disabled}
                onClick={() => setShowPersonaDropdown((prev) => !prev)}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 transition-all text-left text-xs cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getAvatarThumbnailUrl(activePersona.avatarUrl || "/avatars/ruby.png")}
                    alt={activePersona.name}
                    loading="lazy"
                    onError={(e) => handleAvatarImgError(e, activePersona.avatarUrl || "/avatars/ruby.png")}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <span className="font-bold text-zinc-200">{activePersona.name}</span>
                  <span className="text-zinc-500 font-mono">({activePersona.language.toUpperCase()})</span>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${showPersonaDropdown ? "rotate-180" : ""}`} />
              </button>

              {/* Persona Picker Dropdown Menu */}
              {showPersonaDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1.5 z-30 max-h-60 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-1.5 shadow-xl space-y-1">
                  {PERSONAS.map((p) => {
                    const isCurrent = p.id === activePersona.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPersona(p)}
                        className={`w-full flex items-center justify-between p-2 rounded-md text-left transition-all cursor-pointer ${
                          isCurrent
                            ? "bg-emerald-500/10 border border-emerald-500/30 text-white"
                            : "hover:bg-zinc-900 text-zinc-300 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {p.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={getAvatarThumbnailUrl(p.avatarUrl)}
                              alt={p.name}
                              loading="lazy"
                              onError={(e) => handleAvatarImgError(e, p.avatarUrl || "/avatars/ruby.png")}
                              className="w-7 h-7 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400 font-bold">
                              {p.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="text-xs font-semibold">{p.name}</div>
                            <div className="text-[10px] text-zinc-500">{p.title}</div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[9px] font-mono text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded">
                            {p.language === "es" ? "🇦🇷 Spanish" : "🇺🇸 English"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

      {/* Progressive Disclosure: Advanced Engine & Acoustic Controls */}
      <div className="pt-2 border-t border-zinc-800/80 space-y-3">
        <button
          type="button"
          onClick={() => setAdvancedExpanded((prev) => !prev)}
          className="w-full flex items-center justify-between p-2.5 rounded-lg border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/80 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Sliders className="h-3.5 w-3.5 text-emerald-400" />
            <span>{isAdvancedVisible ? "Hide Advanced Engine & Acoustic Controls" : "Advanced Engine & Acoustic Controls"}</span>
            {!isAdvancedVisible && (
              <span className="text-[10px] text-zinc-500 font-mono font-normal">
                ({MODERN_ENGINES.find((e) => e.id === selectedEngine)?.name || selectedEngine} · {speed.toFixed(2)}x)
              </span>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${isAdvancedVisible ? "rotate-180" : ""}`} />
        </button>

        {isAdvancedVisible && (
          <div className="space-y-4 pt-1">
            {/* Engine Selection: Defaulting to Omni and Piper */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-zinc-400 block">
                Select Neural Engine (Modern-TTS):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {MODERN_ENGINES.map((engine) => {
                  const isSelected = selectedEngine === engine.id;

                  return (
                    <button
                      key={engine.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleSelectEngine(engine)}
                      className={`group relative flex flex-col p-2.5 rounded-lg border text-left transition-all ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-500/10 shadow-sm shadow-emerald-950/50 ring-1 ring-emerald-500/40"
                          : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/80"
                      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-xs font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors">
                          {engine.name}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${engine.badgeColor}`}>
                          {engine.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-emerald-400/90 font-mono">{engine.tagline}</p>
                      <p className="text-[10px] text-zinc-400 line-clamp-2 mt-1 leading-snug">
                        {engine.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cross-Lingual Voice Cloning Toggle */}
            {onToggleDisableCloningIfDifferentLanguage && (
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-800/80 bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={disableCloningIfDifferentLanguage ?? true}
                    onChange={(e) => onToggleDisableCloningIfDifferentLanguage(e.target.checked)}
                    disabled={disabled}
                    className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/20 h-4 w-4 cursor-pointer"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs text-zinc-200 font-medium">
                      Disable voice cloning if language differs from persona
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      Synthesizes with target-language native voice to prevent accented or distorted pronunciation.
                    </span>
                  </div>
                </label>
                {isLanguageMismatch && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold border bg-amber-500/10 text-amber-400 border-amber-500/30 whitespace-nowrap shrink-0 ml-2">
                    Different ({activePersona.language?.toUpperCase() || "EN"} → {effectiveLang.toUpperCase()})
                  </span>
                )}
              </div>
            )}

            {/* Speed & Pitch Factor Controls */}
            {(onChangeSpeed || onChangePitchShift) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {onChangeSpeed && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span>Speaking Rate / Speed:</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {speed.toFixed(2)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.7}
                      max={1.4}
                      step={0.05}
                      value={speed}
                      disabled={disabled}
                      onChange={(e) => onChangeSpeed(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer disabled:opacity-40"
                    />
                  </div>
                )}

                {onChangePitchShift && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span>Pitch Shift (Semitones):</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {pitchShift > 0 ? `+${pitchShift}` : pitchShift}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-6}
                      max={6}
                      step={1}
                      value={pitchShift}
                      disabled={disabled}
                      onChange={(e) => onChangePitchShift(parseInt(e.target.value, 10))}
                      className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer disabled:opacity-40"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )}
</div>
);
}

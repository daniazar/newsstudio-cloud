/**
 * src/components/editor/shared/sceneDetail/components/SceneScriptCadenceEditor.tsx
 *
 * Script editor with dual-tier text architecture:
 * 1. Visual Subtitles (text) — Standard broadcast formatting rendered in Remotion CaptionsLayer.
 * 2. Acoustic Spoken Script (spokenText) — Phonetically expanded text fed to neural TTS engines.
 *
 * Includes on-demand "✨ Normalize for Speech" LLM button, breathing cadence insertion,
 * phonetic tags, emotion presets, and audio synchronization alerts.
 */

import React, { useState } from "react";
import {
  AlertTriangle,
  Volume2,
  Sparkles,
  RefreshCw,
  Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmotionToolbar } from "@/components/editor/EmotionToolbar";
import { detectPronunciationIssues, expandAcronyms } from "@/lib/ai/pronunciationDetector";

export const TTS_ENGINES = [
  {
    id: "omni",
    label: "OmniVoice",
    sub: "k2-fsa",
    desc: "Autoregressive Speech-LLM. Clause ceiling ≤14 words, comma respiration, full year numbers verbalized.",
  },
  {
    id: "piper",
    label: "Piper ONNX",
    sub: "Latin G2P",
    desc: "Latin G2P. Verbalized currencies ($), hyphenated initialisms (C-E-O), proper noun framing, oxytone stops.",
  },
  {
    id: "kokoro",
    label: "Kokoro-82M",
    sub: "Style-Vocoder",
    desc: "Style-conditioned neural vocoder. Strict written accents, rising question contours, spaced initialisms.",
  },
  {
    id: "f5_tts",
    label: "F5-TTS",
    sub: "Diffusion ODE",
    desc: "Character-level flow matching. Strictly 0 digits & 0 symbols, character transliterations, punctuation resets.",
  },
] as const;

interface SceneScriptCadenceEditorProps {
  segmentIndex: number;
  segmentId: string;
  originalText: string;
  editedText: string;
  setEditedText: React.Dispatch<React.SetStateAction<string>>;
  originalSpokenText?: string | null;
  editedSpokenText?: string;
  setEditedSpokenText?: React.Dispatch<React.SetStateAction<string>>;
  personaId?: string | null;
  engine?: string;
  onUpdateText: (index: number, text: string, spokenText?: string | null) => void;
  onRegenerateAudio?: (segmentIndex: number, textOverride?: string) => Promise<void>;
}

export function SceneScriptCadenceEditor({
  segmentIndex,
  segmentId,
  originalText,
  editedText,
  setEditedText,
  originalSpokenText,
  editedSpokenText,
  setEditedSpokenText,
  personaId,
  engine = "omni",
  onUpdateText,
  onRegenerateAudio,
}: SceneScriptCadenceEditorProps) {
  const [selectedEngine, setSelectedEngine] = useState<string>(engine || "omni");
  const [prevEngine, setPrevEngine] = useState(engine);
  if (engine && prevEngine !== engine) {
    setPrevEngine(engine);
    setSelectedEngine(engine);
  }

  const [isPolishing, setIsPolishing] = useState(false);
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [isRegeneratingAudio, setIsRegeneratingAudio] = useState(false);
  const [showSpokenDrawer, setShowSpokenDrawer] = useState(
    Boolean(editedSpokenText || originalSpokenText)
  );

  const [localSpokenText, setLocalSpokenText] = useState(
    editedSpokenText !== undefined ? editedSpokenText : originalSpokenText || ""
  );

  const [prevSpokenProps, setPrevSpokenProps] = useState({
    edited: editedSpokenText,
    original: originalSpokenText,
  });
  if (
    prevSpokenProps.edited !== editedSpokenText ||
    prevSpokenProps.original !== originalSpokenText
  ) {
    setPrevSpokenProps({ edited: editedSpokenText, original: originalSpokenText });
    setLocalSpokenText(
      editedSpokenText !== undefined ? editedSpokenText : originalSpokenText || ""
    );
  }

  const [lastNormalizedVisual, setLastNormalizedVisual] = useState<string>(
    originalSpokenText ? originalText : ""
  );

  const isTextModified = editedText.trim() !== originalText.trim();
  const isSpokenModified = localSpokenText.trim() !== (originalSpokenText || "").trim();
  const isSpokenDesynced =
    Boolean(localSpokenText.trim()) &&
    Boolean(lastNormalizedVisual.trim()) &&
    editedText.trim() !== lastNormalizedVisual.trim();

  const handleSaveAll = () => {
    const spokenToSave = localSpokenText.trim() ? localSpokenText.trim() : null;
    onUpdateText(segmentIndex, editedText, spokenToSave);
  };

  const handleRegenAudio = async () => {
    if (!onRegenerateAudio || isRegeneratingAudio) return;
    setIsRegeneratingAudio(true);
    try {
      handleSaveAll();
      const textForAudio = localSpokenText.trim() || editedText;
      await onRegenerateAudio(segmentIndex, textForAudio);
    } finally {
      setIsRegeneratingAudio(false);
    }
  };

  const handleNormalizeSpokenText = async (engineOverride?: string) => {
    if (!editedText.trim() || isNormalizing) return;
    setIsNormalizing(true);
    const target = engineOverride || selectedEngine || "omni";

    try {
      const storyId = typeof window !== "undefined" ? window.location.pathname.split("/").pop() : "";
      let normalized: string | null = null;

      // 1. Try story-scoped API
      if (storyId) {
        try {
          const res = await fetch(`/api/stories/${storyId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "normalize-spoken-text",
              text: editedText,
              segmentId,
              personaId,
              engine: target,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            normalized = data.spokenText;
          }
        } catch {
          // Fall through to universal normalization API
        }
      }

      // 2. Fallback to universal normalization API
      if (!normalized) {
        const res = await fetch("/api/tts/normalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: editedText,
            engine: target,
            mode: "news",
          }),
        });
        if (res.ok) {
          const data = await res.json();
          normalized = data.spokenText;
        }
      }

      if (normalized) {
        setLocalSpokenText(normalized);
        if (setEditedSpokenText) setEditedSpokenText(normalized);
        setLastNormalizedVisual(editedText.trim());
        setShowSpokenDrawer(true);
        onUpdateText(segmentIndex, editedText, normalized);
      }
    } catch (err) {
      console.error("Spoken text normalization error:", err);
    } finally {
      setIsNormalizing(false);
    }
  };

  const handlePolishScript = async (
    mode: "cadence" | "phonetics" | "emotion" | "punchy" = "cadence"
  ) => {
    if (!editedText || isPolishing) return;

    setIsPolishing(true);
    try {
      const storyId = window.location.pathname.split("/").pop();
      const res = await fetch(`/api/stories/${storyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "polish-script",
          text: editedText,
          mode,
          segmentId,
        }),
      });

      if (res.ok) {
        const { polished } = await res.json();
        setEditedText(polished);
        onUpdateText(segmentIndex, polished, localSpokenText || null);
      }
    } catch (err) {
      console.error("Polishing failed:", err);
    } finally {
      setIsPolishing(false);
    }
  };

  return (
    <div className="mb-4">
      {/* Header with Title and Primary Action Buttons */}
      <div className="flex items-center justify-between mb-2 flex-wrap gap-1.5">
        <div>
          <label className="text-xs font-bold text-foreground block">
            Visual Subtitles & Speech
          </label>
          <span className="text-[10px] text-muted-foreground block">
            Subtitles display on-screen; Spoken Script feeds Modern-TTS
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Main "Normalize for Speech" Button */}
          <button
            type="button"
            onClick={() => handleNormalizeSpokenText()}
            disabled={isNormalizing || !editedText.trim()}
            className="text-[11px] font-bold px-2.5 py-1 rounded-md border border-purple-500/50 bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-purple-500/10 disabled:opacity-50"
            title={`Request LLM to expand numbers, initialisms, and pauses specifically for ${selectedEngine.toUpperCase()}`}
          >
            {isNormalizing ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Normalizing ({selectedEngine.toUpperCase()})...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 text-purple-300" />
                <span>Normalize ({selectedEngine.toUpperCase()})</span>
              </>
            )}
          </button>

          {/* Quick Polish Actions */}
          <button
            type="button"
            onClick={() => handlePolishScript("cadence")}
            disabled={isPolishing}
            className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition-all cursor-pointer"
            title="Add natural breathing pauses (...) and rhythmic cadence"
          >
            🌬️ Breaths
          </button>
          <button
            type="button"
            onClick={() => handlePolishScript("phonetics")}
            disabled={isPolishing}
            className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-all cursor-pointer"
            title="Expand acronyms and optimize phonetic spelling"
          >
            🎙️ Phonetics
          </button>
          <button
            type="button"
            onClick={() => handlePolishScript("emotion")}
            disabled={isPolishing}
            className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-all cursor-pointer"
            title="Inject anchor emotion tags ([urgent], [confident])"
          >
            🎭 Emotion
          </button>
          <button
            type="button"
            onClick={() => handlePolishScript("punchy")}
            disabled={isPolishing}
            className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-accent/40 bg-accent/15 text-accent hover:bg-accent/25 transition-all cursor-pointer"
            title="Make script punchy and energetic"
          >
            ⚡ Punchy
          </button>
        </div>
      </div>

      {/* Emotion & Prosody Toolbar */}
      <EmotionToolbar
        onInsertTag={(tag) => setEditedText((prev) => `${prev} ${tag}`.trim())}
        pronunciationResult={detectPronunciationIssues(editedText)}
        onExpandAcronyms={() => setEditedText((prev) => expandAcronyms(prev))}
      />

      {/* Quick Cadence & Emotion Chips */}
      <div className="flex items-center gap-1 my-2 overflow-x-auto pb-0.5 scrollbar-none text-[10px]">
        <span className="text-muted font-bold text-[9px] uppercase tracking-wider mr-0.5 flex-shrink-0">
          Cadence:
        </span>
        {[
          { label: "Pause (--)", token: " -- " },
          { label: "Breath (...)", token: " ... " },
          { label: "Beat (,)", token: ", " },
        ].map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => setEditedText((prev) => `${prev.trim()}${chip.token}`)}
            className="px-1.5 py-0.5 rounded border border-cyan-500/30 bg-cyan-500/5 text-cyan-300 hover:bg-cyan-500/15 transition-all cursor-pointer font-mono whitespace-nowrap"
          >
            {chip.label}
          </button>
        ))}
        <span className="text-muted font-bold text-[9px] uppercase tracking-wider mx-1 flex-shrink-0">
          |
        </span>
        <span className="text-muted font-bold text-[9px] uppercase tracking-wider mr-0.5 flex-shrink-0">
          Emotion:
        </span>
        {[
          { label: "[urgent]", token: " [urgent] " },
          { label: "[confident]", token: " [confident] " },
          { label: "[excited]", token: " [excited] " },
          { label: "[thoughtful]", token: " [thoughtful] " },
          { label: "[serious]", token: " [serious] " },
        ].map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => setEditedText((prev) => `${prev.trim()}${chip.token}`)}
            className="px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/5 text-amber-300 hover:bg-amber-500/15 transition-all cursor-pointer font-mono whitespace-nowrap"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Sync Detection Banner */}
      {isTextModified && (
        <div className="mb-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2 text-xs text-amber-300 animate-in fade-in">
          <span className="flex items-center gap-1.5 font-semibold text-[11px]">
            <span>⚠️</span> Text modified (Audio out of sync)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 transition-colors cursor-pointer"
            >
              Save
            </button>
            {onRegenerateAudio && (
              <button
                type="button"
                onClick={handleRegenAudio}
                disabled={isRegeneratingAudio}
                className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-black hover:bg-amber-300 transition-colors cursor-pointer flex items-center gap-1"
              >
                {isRegeneratingAudio ? (
                  <>
                    <span className="w-2.5 h-2.5 border border-black border-t-transparent rounded-full animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    <span>Regenerate Audio</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Field 1: Visual Subtitle Text */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-foreground/80">
            Visual Subtitles (On-Screen Captions)
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">
            {editedText.length} chars
          </span>
        </div>
        <textarea
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          placeholder="Enter on-screen visual dialogue..."
          className="w-full h-24 p-3 text-sm bg-surface border border-border rounded-lg text-foreground resize-none focus:border-accent focus:outline-none"
        />
      </div>

      {/* Field 2: Expandable Spoken Audio Script Drawer */}
      <div className="mt-2.5 border border-purple-500/25 rounded-lg overflow-hidden bg-background/50">
        <button
          type="button"
          onClick={() => setShowSpokenDrawer(!showSpokenDrawer)}
          className="w-full px-3 py-1.5 flex items-center justify-between text-xs font-semibold bg-surface/50 hover:bg-surface/80 transition-colors cursor-pointer border-b border-border/40"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]">{showSpokenDrawer ? "▼" : "▶"}</span>
            <span className="text-purple-300 font-bold">🎙️ Spoken Audio Script</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/15 border border-purple-500/30 text-purple-200">
              Acoustic TTS Input · {selectedEngine.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isSpokenDesynced && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono flex items-center gap-1">
                <AlertTriangle className="w-2.5 h-2.5" /> Out of sync
              </span>
            )}
            <span className="text-[10px] text-muted-foreground">
              {localSpokenText.trim()
                ? "Customized for Speech"
                : "Using Visual Text by default"}
            </span>
          </div>
        </button>

        {showSpokenDrawer && (
          <div className="p-3 space-y-2.5 animate-in fade-in duration-150 bg-purple-950/5">
            {/* Engine Selection Bar */}
            <div className="flex items-center justify-between gap-1.5 flex-wrap">
              <div className="flex items-center gap-1 text-[10px] font-mono text-neutral-400">
                <Cpu className="w-3 h-3 text-purple-400" />
                <span className="uppercase font-bold">Target Engine:</span>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {TTS_ENGINES.map((eng) => {
                  const isCurrent = selectedEngine === eng.id;
                  return (
                    <button
                      key={eng.id}
                      type="button"
                      onClick={() => {
                        setSelectedEngine(eng.id);
                        handleNormalizeSpokenText(eng.id);
                      }}
                      disabled={isNormalizing}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer ${
                        isCurrent
                          ? "bg-purple-500/30 border-purple-500/60 text-purple-200 font-bold shadow-sm"
                          : "bg-white/5 border-white/10 text-neutral-400 hover:text-white hover:bg-white/10"
                      }`}
                      title={eng.desc}
                    >
                      {eng.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Engine Directives Summary */}
            {(() => {
              const activeInfo = TTS_ENGINES.find((e) => e.id === selectedEngine) ?? TTS_ENGINES[0];
              return (
                <div className="p-2 rounded bg-black/40 border border-purple-500/20 text-[10px] font-mono text-purple-200/90 leading-tight">
                  <span className="text-purple-400 font-bold mr-1">Directives:</span>
                  {activeInfo.desc}
                </div>
              );
            })()}

            {/* Desync Warning Banner */}
            {isSpokenDesynced && (
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2 text-xs text-amber-300">
                <div className="flex items-center gap-1.5 min-w-0">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-[11px] truncate">
                    Visual subtitle modified — spoken script out of sync.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleNormalizeSpokenText()}
                  disabled={isNormalizing}
                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-black hover:bg-amber-300 transition-colors flex items-center gap-1 shrink-0 cursor-pointer shadow-sm"
                >
                  {isNormalizing ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  <span>Sync Now</span>
                </button>
              </div>
            )}

            {/* Quick Phonetic Chips for Spoken Script */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none text-[10px]">
              <span className="text-muted font-bold text-[9px] uppercase tracking-wider mr-0.5 flex-shrink-0">
                Phonetic:
              </span>
              {[
                { label: "Pause (--)", token: " -- " },
                { label: "Breath (...)", token: " ... " },
                { label: "Beat (,)", token: ", " },
                { label: "Initialism (-)", token: "-" },
                { label: "Ápel", token: "Ápel" },
                { label: "C-E-O", token: "C-E-O" },
                { label: "I-A", token: "I-A" },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() =>
                    setLocalSpokenText((prev) => `${prev.trim()} ${chip.token}`.trim())
                  }
                  className="px-1.5 py-0.5 rounded border border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-all cursor-pointer font-mono whitespace-nowrap text-[9px]"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <textarea
              value={localSpokenText}
              onChange={(e) => {
                setLocalSpokenText(e.target.value);
                if (setEditedSpokenText) setEditedSpokenText(e.target.value);
              }}
              placeholder={`Spoken acoustic text. Leave empty to automatically speak the visual subtitles, or click 'Normalize (${selectedEngine.toUpperCase()})'.`}
              className="w-full h-24 p-2.5 text-xs font-mono bg-surface/90 border border-purple-500/30 rounded text-foreground resize-none focus:border-purple-400 focus:outline-none leading-relaxed"
            />

            {/* Drawer Actions Footer */}
            <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleNormalizeSpokenText()}
                  disabled={isNormalizing || !editedText.trim()}
                  className="px-2 py-1 rounded text-[10px] font-bold bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {isNormalizing ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3 text-amber-300" />
                  )}
                  <span>Re-Normalize ({selectedEngine.toUpperCase()})</span>
                </button>

                {onRegenerateAudio && (
                  <button
                    type="button"
                    onClick={handleRegenAudio}
                    disabled={isRegeneratingAudio}
                    className="px-2 py-1 rounded text-[10px] font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {isRegeneratingAudio ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Volume2 className="w-3 h-3 text-purple-300" />
                    )}
                    <span>Test Voice</span>
                  </button>
                )}
              </div>

              {localSpokenText && (
                <button
                  type="button"
                  onClick={() => {
                    setLocalSpokenText("");
                    if (setEditedSpokenText) setEditedSpokenText("");
                    onUpdateText(segmentIndex, editedText, null);
                  }}
                  className="text-xs text-red-400 hover:text-red-300 underline cursor-pointer shrink-0"
                >
                  Reset Spoken
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Footer for Changes */}
      {(editedText !== originalText || isSpokenModified) && (
        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
          <Button size="sm" onClick={handleSaveAll}>
            Save Changes
          </Button>
          {onRegenerateAudio && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleRegenAudio}
              disabled={isRegeneratingAudio}
              className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
            >
              {isRegeneratingAudio ? "⚡ Generating Audio..." : "⚡ Save & Regenerate Audio"}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditedText(originalText);
              setLocalSpokenText(originalSpokenText || "");
              if (setEditedSpokenText) setEditedSpokenText(originalSpokenText || "");
            }}
          >
            Reset All
          </Button>
        </div>
      )}
    </div>
  );
}

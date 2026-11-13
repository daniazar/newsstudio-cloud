"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import {
  Play,
  Pause,
  Sparkles,
  Music,
  Radio,
  Sliders,
  Volume2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import type { MusicTrack } from "@/lib/music/types";

interface MusicGalleryModalProps {
  onSelect: (storageKey: string) => void;
  onClose: () => void;
  initialMood?: string;
  storyDuration?: number;
}

const PROMPT_PRESETS = [
  {
    label: "⚡ Breaking News",
    prompt: "Urgent breaking news electronic synth theme with heavy pulsing bass and dramatic brass stabs",
    mood: "dramatic",
    duration: 15,
  },
  {
    label: "📈 Financial Ticker",
    prompt: "Fast-paced corporate financial ticker beat with crisp electronic drums and clean synth arpeggios",
    mood: "upbeat",
    duration: 20,
  },
  {
    label: "🎙️ Podcast Intro",
    prompt: "Modern lo-fi chillhop beat with smooth electric piano chords and vinyl warmth for podcast intro",
    mood: "calm",
    duration: 15,
  },
  {
    label: "🌐 Tech Horizon",
    prompt: "Futuristic ambient tech bed with crystalline synthesizer pads and gentle driving pulse",
    mood: "ambient",
    duration: 30,
  },
  {
    label: "⚠️ Investigative",
    prompt: "Dark suspenseful orchestral drone with tension strings and low sub hits for investigative report",
    mood: "serious",
    duration: 25,
  },
];

export const MusicGalleryModal: React.FC<MusicGalleryModalProps> = ({
  onSelect,
  onClose,
  initialMood,
  storyDuration,
}) => {
  const [activeTab, setActiveTab] = useState<"ai_studio" | "stock_library">("ai_studio");

  // --- AI Studio State ---
  const [aiPrompt, setAiPrompt] = useState(
    "Urgent breaking news electronic synth theme with heavy pulsing bass and dramatic brass stabs"
  );
  const [aiMood, setAiMood] = useState<string>(initialMood || "dramatic");
  const [aiDuration, setAiDuration] = useState<number>(storyDuration ? Math.min(storyDuration, 120) : 15);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiGeneratedResult, setAiGeneratedResult] = useState<{
    storageKey: string;
    name: string;
    duration: number;
    provider: string;
    isFallback: boolean;
    fallbackProvider?: string;
  } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // --- Stock Search State ---
  const [searchQuery, setSearchQuery] = useState("");
  const [stockMood, setStockMood] = useState<string>(initialMood || "");
  const [stockResults, setStockResults] = useState<MusicTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeAudio, setActiveAudio] = useState<string | null>(null);
  const [downloadingTrack, setDownloadingTrack] = useState<string | null>(null);

  // --- Stock Search Handler ---
  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("query", searchQuery);
      else params.append("query", "news");

      if (stockMood) params.append("mood", stockMood);

      const res = await fetch(`/api/music/search?${params.toString()}`);
      if (!res.ok) throw new Error("Search failed");

      const data = await res.json();
      setStockResults(data.results || []);
    } catch (err) {
      console.error("Music search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    // Auto-search stock library on initial mount
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Initial mount search only
  }, []);

  // --- AI Music Generation Handler ---
  const handleGenerateAiMusic = async () => {
    if (!aiPrompt.trim()) return;
    setIsGeneratingAi(true);
    setAiError(null);
    setAiGeneratedResult(null);

    try {
      const res = await fetch("/api/music/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt.trim(),
          mood: aiMood,
          duration: aiDuration,
          instrumental: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.details || data.error || "Failed to generate AI music track");
      }

      setAiGeneratedResult({
        storageKey: data.storageKey,
        name: data.name,
        duration: data.duration,
        provider: data.provider,
        isFallback: data.isFallback,
        fallbackProvider: data.fallbackProvider,
      });

      // Auto-preview generated audio
      setActiveAudio(`/api/assets/${data.storageKey}`);
    } catch (err: unknown) {
      console.error("AI Music Generation error:", err);
      setAiError(err instanceof Error ? err.message : "Failed to generate track. Check Modern-TTS-Server (:8005).");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // --- Stock Download & Select Handler ---
  const handleDownloadAndSelect = async (track: MusicTrack) => {
    setDownloadingTrack(track.externalId);
    try {
      const res = await fetch("/api/music/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track }),
      });
      const data = await res.json();
      if (res.ok && data.storageKey) {
        onSelect("/api/assets/" + data.storageKey);
        onClose();
      } else {
        throw new Error(data.error || "Failed to download");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDownloadingTrack(null);
    }
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface-raised">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent">
              <Music size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Background Music Studio</h2>
              <p className="text-xs text-muted">
                Synthesize custom AI soundtracks via ACE-Step or browse copyright-safe stock audio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground text-xl p-1 rounded-md hover:bg-surface"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border bg-surface px-4">
          <button
            onClick={() => setActiveTab("ai_studio")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "ai_studio"
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <Sparkles size={16} />
            AI Music Generator (ACE-Step)
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent font-mono font-normal">
              Port 8005
            </span>
          </button>

          <button
            onClick={() => setActiveTab("stock_library")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "stock_library"
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <Radio size={16} />
            Stock Royalty-Free Library
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-raised text-muted font-mono font-normal">
              Pixabay / Jamendo
            </span>
          </button>
        </div>

        {/* Body Content */}
        {activeTab === "ai_studio" ? (
          <div className="flex-1 overflow-y-auto p-6 bg-background space-y-6">
            {/* Quick Presets */}
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">
                Quick Style Presets
              </label>
              <div className="flex flex-wrap gap-2">
                {PROMPT_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setAiPrompt(p.prompt);
                      setAiMood(p.mood);
                      setAiDuration(p.duration);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-border bg-surface text-xs text-foreground hover:border-accent hover:bg-accent/10 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt & Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Musical Style & Theme Prompt</span>
                  <span className="text-[11px] text-muted font-normal">
                    Describe instruments, tempo, and emotion
                  </span>
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. Modern electronic breaking news bed with fast synth arpeggio, dramatic strings, and subtle sub bass pulse..."
                  rows={3}
                  className="w-full bg-surface border border-border rounded-lg p-3 text-sm text-foreground focus:outline-none focus:border-accent resize-none"
                />
              </div>

              <div className="space-y-4 bg-surface p-4 rounded-lg border border-border">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Mood / Atmosphere
                  </label>
                  <select
                    value={aiMood}
                    onChange={(e) => setAiMood(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-accent"
                  >
                    <option value="dramatic">Dramatic / Breaking</option>
                    <option value="serious">Serious / Neutral</option>
                    <option value="upbeat">Upbeat / Energetic</option>
                    <option value="ambient">Ambient / Tech</option>
                    <option value="calm">Calm / Lo-Fi</option>
                    <option value="energetic">Energetic / Fast</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-foreground">Target Duration</label>
                    <span className="text-xs font-mono font-bold text-accent">{aiDuration}s</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={120}
                    step={5}
                    value={aiDuration}
                    onChange={(e) => setAiDuration(Number(e.target.value))}
                    className="w-full accent-accent cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted mt-0.5 font-mono">
                    <span>5s</span>
                    <span>30s</span>
                    <span>60s</span>
                    <span>120s</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Generate Action */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-xs text-muted">
                <Sliders size={14} className="text-accent" />
                <span>
                  Synthesizes 44.1kHz audio with automatic <strong>-14dB speech ducking</strong> in Remotion
                </span>
              </div>
              <Button
                onClick={handleGenerateAiMusic}
                isLoading={isGeneratingAi}
                size="md"
                className="gap-2 px-6"
              >
                <Sparkles size={16} />
                {isGeneratingAi ? "Synthesizing Music..." : "Generate AI Music Bed"}
              </Button>
            </div>

            {/* Error Display */}
            {aiError && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-3 text-destructive text-sm">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Generation Error</p>
                  <p className="text-xs text-destructive/90">{aiError}</p>
                </div>
              </div>
            )}

            {/* Generated Audio Preview Card */}
            {aiGeneratedResult && (
              <div className="p-5 rounded-xl border border-accent/40 bg-accent/5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow-md">
                      <Volume2 size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">
                          {aiGeneratedResult.name}
                        </span>
                        {aiGeneratedResult.isFallback ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Stock Fallback: {aiGeneratedResult.fallbackProvider}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            ACE-Step 1.5 Synthesis
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted mt-0.5">
                        Duration: {formatDuration(aiGeneratedResult.duration)} • Mood: {aiMood}
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      onSelect(`/api/assets/${aiGeneratedResult.storageKey}`);
                      onClose();
                    }}
                    size="sm"
                    className="gap-1.5"
                  >
                    <CheckCircle2 size={16} />
                    Apply Track to Story
                  </Button>
                </div>

                {/* Native Audio Controls */}
                <div className="w-full bg-surface p-3 rounded-lg border border-border flex items-center gap-4">
                  <audio
                    src={`/api/assets/${aiGeneratedResult.storageKey}`}
                    controls
                    autoPlay
                    className="w-full h-8"
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Stock Royalty-Free Library Tab */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search Bar */}
            <div className="p-4 border-b border-border flex gap-2 bg-surface">
              <input
                type="text"
                placeholder="Search royalty-free stock music (e.g. corporate, ambient, dramatic)..."
                className="flex-1 bg-background border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <select
                className="bg-background border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                value={stockMood}
                onChange={(e) => setStockMood(e.target.value)}
              >
                <option value="">Any Mood</option>
                <option value="upbeat">Upbeat</option>
                <option value="serious">Serious</option>
                <option value="dramatic">Dramatic</option>
                <option value="ambient">Ambient</option>
                <option value="calm">Calm</option>
                <option value="energetic">Energetic</option>
              </select>
              <Button onClick={handleSearch} isLoading={isSearching} size="sm">
                Search
              </Button>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-background">
              {isSearching ? (
                <div className="flex flex-col gap-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="w-full h-16 bg-surface animate-pulse rounded-lg border border-border/50"
                    ></div>
                  ))}
                </div>
              ) : stockResults.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted flex-col gap-2">
                  <span>No music tracks found in stock library.</span>
                  <span className="text-[10px]">Try adjusting your search keywords</span>
                </div>
              ) : (
                stockResults.map((track) => {
                  const isPlaying = activeAudio === track.previewUrl;
                  return (
                    <div
                      key={track.externalId}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface hover:border-accent/50 transition-colors group"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <button
                          onClick={() => setActiveAudio(isPlaying ? null : track.previewUrl)}
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                            isPlaying
                              ? "bg-accent text-accent-foreground"
                              : "bg-surface-raised hover:bg-accent/20 text-foreground"
                          }`}
                        >
                          {isPlaying ? (
                            <Pause size={18} />
                          ) : (
                            <Play size={18} className="translate-x-0.5" />
                          )}
                        </button>

                        <div className="flex flex-col">
                          <span className="font-semibold text-sm line-clamp-1">{track.name}</span>
                          <span className="text-xs text-muted">
                            {track.artist || track.provider} • {formatDuration(track.duration)} •{" "}
                            {track.mood}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {isPlaying && (
                          <audio
                            src={track.previewUrl}
                            autoPlay
                            onEnded={() => setActiveAudio(null)}
                            className="h-8 max-w-[200px]"
                            controls
                            controlsList="nodownload noplaybackrate"
                          />
                        )}

                        <Button
                          variant="secondary"
                          size="sm"
                          isLoading={downloadingTrack === track.externalId}
                          onClick={() => handleDownloadAndSelect(track)}
                          className="ml-4"
                        >
                          {downloadingTrack === track.externalId ? "Downloading..." : "Use Track"}
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

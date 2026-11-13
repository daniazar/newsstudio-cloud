"use client";

import React, { useState } from "react";
import {
  Sliders,
  Music,
  Mic,
  Volume2,
  Sparkles,
  ArrowDownUp,
  FolderOpen,
  ChevronDown,
} from "lucide-react";
import { MusicGalleryModal, CuratedMusicTrack } from "./MusicGalleryModal";

export interface AudioMixerSectionProps {
  bgmUrl?: string;
  onChangeBgmUrl?: (url: string) => void;
  bgmVolume?: number; // 0.0 to 1.0
  onChangeBgmVolume?: (vol: number) => void;
  voiceoverVolume?: number; // 0.0 to 1.0
  onChangeVoiceoverVolume?: (vol: number) => void;
  sfxVolume?: number; // 0.0 to 1.0
  onChangeSfxVolume?: (vol: number) => void;
  audioDuckingEnabled?: boolean;
  onChangeAudioDuckingEnabled?: (enabled: boolean) => void;
  duckingDb?: number; // -30 to -6 dB, default -16 dB
  onChangeDuckingDb?: (db: number) => void;
  disabled?: boolean;
  className?: string;
  defaultCollapsed?: boolean;
}

export function AudioMixerSection({
  bgmUrl,
  onChangeBgmUrl,
  bgmVolume = 0.2,
  onChangeBgmVolume,
  voiceoverVolume = 1.0,
  onChangeVoiceoverVolume,
  sfxVolume = 0.8,
  onChangeSfxVolume,
  audioDuckingEnabled = true,
  onChangeAudioDuckingEnabled,
  duckingDb = -16,
  onChangeDuckingDb,
  disabled = false,
  className = "",
  defaultCollapsed = true,
}: AudioMixerSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  const getBgmDisplayName = () => {
    if (!bgmUrl) return "No BGM Track Selected";
    const parts = bgmUrl.split("/");
    return parts[parts.length - 1].replace(/\.[^/.]+$/, "").replace(/_/g, " ");
  };

  const handleSelectTrack = (track: CuratedMusicTrack) => {
    onChangeBgmUrl?.(track.url);
  };

  if (isCollapsed) {
    return (
      <>
        <div
          className={`rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 backdrop-blur-md flex items-center justify-between gap-3 ${className}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sliders className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                  Audio Console
                </h4>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30 shrink-0">
                  {bgmUrl ? `🎵 ${getBgmDisplayName()}` : "No BGM"}
                </span>
                <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800 shrink-0 hidden sm:inline-block">
                  BGM: {Math.round(bgmVolume * 100)}% · Ducking: {audioDuckingEnabled ? `${duckingDb}dB` : "Off"}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                Soundtrack gain balance, SFX attenuation & smart voice ducking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onChangeBgmUrl && (
              <button
                type="button"
                onClick={() => setIsGalleryOpen(true)}
                disabled={disabled}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 hover:text-emerald-100 transition-all shadow-sm cursor-pointer"
              >
                <FolderOpen className="h-3.5 w-3.5 text-emerald-400" />
                <span>Music</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              aria-label="Expand audio console panel"
              className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Music Gallery Modal */}
        <MusicGalleryModal
          isOpen={isGalleryOpen}
          onClose={() => setIsGalleryOpen(false)}
          selectedTrackUrl={bgmUrl}
          onSelectTrack={handleSelectTrack}
        />
      </>
    );
  }

  return (
    <div
      className={`rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 backdrop-blur-md space-y-4 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Sliders className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-100">Broadcast Audio Console</h4>
            <p className="text-[11px] text-zinc-400">
              Commercial BGM soundtrack, ducking attenuation, and gain balance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onChangeBgmUrl && (
            <button
              type="button"
              onClick={() => setIsGalleryOpen(true)}
              disabled={disabled}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 hover:text-emerald-100 transition-all shadow-sm cursor-pointer"
            >
              <FolderOpen className="h-3.5 w-3.5 text-emerald-400" />
              <span>Browse Royalty-Free Music</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            aria-label="Collapse audio console panel"
            className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronDown className="h-4 w-4 rotate-180" />
          </button>
        </div>
      </div>

      {/* Audio Workflow Educational Notice */}
      <div className="p-3 rounded-lg bg-zinc-900/70 border border-zinc-800 text-[11px] text-zinc-300 space-y-1">
        <div className="flex items-center gap-1.5 font-semibold text-zinc-200">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
          <span>Audio Architecture: Voiceover vs Soundtrack</span>
        </div>
        <p className="text-zinc-400 leading-relaxed">
          • <strong>Scene Voiceovers</strong> are written and synthesized scene-by-scene in the <em>Scene</em> tab with neural TTS and automatic lip-sync.
          <br />
          • <strong>Soundtrack & Ducking</strong> are controlled globally here. When an anchor speaks, automated ducking smoothly lowers the background bed.
        </p>
      </div>

      {/* Selected BGM Display & Quick Selector Banner */}
      {onChangeBgmUrl && (
        <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-900/60 text-xs">
          <div className="flex items-center gap-2.5 truncate">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
              <Music className="h-4 w-4" />
            </div>
            <div className="truncate">
              <span className="text-[10px] text-zinc-400 block font-mono">ACTIVE BACKGROUND SOUNDTRACK</span>
              <span className="text-zinc-200 truncate font-semibold">
                {getBgmDisplayName()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-2">
            <button
              type="button"
              onClick={() => setIsGalleryOpen(true)}
              disabled={disabled}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors cursor-pointer"
            >
              {bgmUrl ? "Change Music" : "Pick Track"}
            </button>
            {bgmUrl && (
              <button
                type="button"
                onClick={() => onChangeBgmUrl("")}
                disabled={disabled}
                className="text-[11px] text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Gain Sliders Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        {/* Voiceover Volume */}
        {onChangeVoiceoverVolume && (
          <div className="space-y-1 rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-2.5">
            <div className="flex items-center justify-between text-xs text-zinc-300">
              <div className="flex items-center gap-1.5 font-semibold">
                <Mic className="h-3.5 w-3.5 text-emerald-400" />
                <span>Voiceover</span>
              </div>
              <span className="font-mono text-emerald-400 font-bold">
                {Math.round(voiceoverVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1.5}
              step={0.05}
              value={voiceoverVolume}
              disabled={disabled}
              onChange={(e) => onChangeVoiceoverVolume(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer disabled:opacity-40"
            />
          </div>
        )}

        {/* BGM Volume */}
        {onChangeBgmVolume && (
          <div className="space-y-1 rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-2.5">
            <div className="flex items-center justify-between text-xs text-zinc-300">
              <div className="flex items-center gap-1.5 font-semibold">
                <Music className="h-3.5 w-3.5 text-blue-400" />
                <span>BGM Bed</span>
              </div>
              <span className="font-mono text-blue-400 font-bold">
                {Math.round(bgmVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1.0}
              step={0.02}
              value={bgmVolume}
              disabled={disabled}
              onChange={(e) => onChangeBgmVolume(parseFloat(e.target.value))}
              className="w-full accent-blue-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer disabled:opacity-40"
            />
          </div>
        )}

        {/* SFX Volume */}
        {onChangeSfxVolume && (
          <div className="space-y-1 rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-2.5">
            <div className="flex items-center justify-between text-xs text-zinc-300">
              <div className="flex items-center gap-1.5 font-semibold">
                <Volume2 className="h-3.5 w-3.5 text-amber-400" />
                <span>SFX Effects</span>
              </div>
              <span className="font-mono text-amber-400 font-bold">
                {Math.round(sfxVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1.2}
              step={0.05}
              value={sfxVolume}
              disabled={disabled}
              onChange={(e) => onChangeSfxVolume(parseFloat(e.target.value))}
              className="w-full accent-amber-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer disabled:opacity-40"
            />
          </div>
        )}
      </div>

      {/* Automated Audio Ducking Formula */}
      {onChangeAudioDuckingEnabled && (
        <div className="pt-2 border-t border-zinc-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowDownUp className="h-4 w-4 text-emerald-400" />
              <div>
                <span className="text-xs font-semibold text-zinc-200">
                  Automated Audio Ducking
                </span>
                <p className="text-[10px] text-zinc-400">
                  Dynamically attenuates music bed while voiceover speaks
                </p>
              </div>
            </div>

            <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={audioDuckingEnabled}
                disabled={disabled}
                onChange={(e) => onChangeAudioDuckingEnabled(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/20"
              />
              <span className="text-zinc-200 font-medium">
                {audioDuckingEnabled ? "Active" : "Bypass"}
              </span>
            </label>
          </div>

          {audioDuckingEnabled && onChangeDuckingDb && (
            <div className="flex items-center justify-between gap-3 pt-1 text-xs">
              <span className="text-zinc-400">Ducking Attenuation:</span>
              <div className="flex items-center gap-2 flex-1 max-w-xs">
                <input
                  type="range"
                  min={-30}
                  max={-6}
                  step={1}
                  value={duckingDb}
                  disabled={disabled}
                  onChange={(e) => onChangeDuckingDb(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer disabled:opacity-40"
                />
                <span className="font-mono text-emerald-400 font-bold min-w-[45px] text-right">
                  {duckingDb} dB
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <MusicGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        selectedTrackUrl={bgmUrl}
        onSelectTrack={handleSelectTrack}
      />
    </div>
  );
}

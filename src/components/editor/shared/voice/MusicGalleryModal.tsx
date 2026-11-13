"use client";

import React, { useState } from "react";
import {
  Music,
  Search,
  Play,
  Square,
  Check,
  X,
} from "lucide-react";
import { useAudioAudition } from "../hooks/useAudioAudition";

export interface CuratedMusicTrack {
  id: string;
  title: string;
  artist: string;
  category: "upbeat" | "serious" | "ambient" | "dramatic" | "energetic";
  duration: string;
  bpm: number;
  url: string;
  tags: string[];
}

export const CURATED_BGM_TRACKS: CuratedMusicTrack[] = [
  {
    id: "bgm_corporate_future",
    title: "Corporate Future Innovation",
    artist: "AudioSphere",
    category: "upbeat",
    duration: "2:15",
    bpm: 120,
    url: "/audio/music/corporate_future.mp3",
    tags: ["Tech", "Modern", "Commercial"],
  },
  {
    id: "bgm_breaking_alert",
    title: "Breaking News Pulse",
    artist: "Broadcast Prime",
    category: "dramatic",
    duration: "1:48",
    bpm: 130,
    url: "/audio/music/breaking_alert.mp3",
    tags: ["News", "Urgent", "Pulse"],
  },
  {
    id: "bgm_minimal_luxury",
    title: "Minimal Luxury Elegance",
    artist: "Atelier Sound",
    category: "ambient",
    duration: "2:34",
    bpm: 95,
    url: "/audio/music/minimal_luxury.mp3",
    tags: ["Architecture", "Flooring", "Design"],
  },
  {
    id: "bgm_lofi_focus",
    title: "Lo-Fi Morning Coffee",
    artist: "ChillWave Studio",
    category: "ambient",
    duration: "2:04",
    bpm: 85,
    url: "/audio/music/lofi_focus.mp3",
    tags: ["Calm", "Lifestyle", "Warm"],
  },
  {
    id: "bgm_energetic_commercial",
    title: "High Energy Conversion",
    artist: "Viral Hooks Audio",
    category: "energetic",
    duration: "1:30",
    bpm: 128,
    url: "/audio/music/energetic_commercial.mp3",
    tags: ["Retail", "Promo", "Upbeat"],
  },
  {
    id: "bgm_deep_investigation",
    title: "Deep Investigative Journalism",
    artist: "Newsroom Noir",
    category: "serious",
    duration: "2:40",
    bpm: 110,
    url: "/audio/music/deep_investigation.mp3",
    tags: ["Analysis", "Documentary", "Solemn"],
  },
  {
    id: "bgm_tech_infographic",
    title: "Tech Infographic Synths",
    artist: "CyberModular",
    category: "upbeat",
    duration: "2:10",
    bpm: 118,
    url: "/audio/music/tech_infographic.mp3",
    tags: ["Financial", "Stats", "Clean"],
  },
];

export interface MusicGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTrackUrl?: string;
  onSelectTrack: (track: CuratedMusicTrack) => void;
}

export function MusicGalleryModal({
  isOpen,
  onClose,
  selectedTrackUrl,
  onSelectTrack,
}: MusicGalleryModalProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { isPlaying, activeUrl, audition, stop } = useAudioAudition();

  if (!isOpen) return null;

  const filteredTracks = CURATED_BGM_TRACKS.filter((t) => {
    if (activeCategory !== "all" && t.category !== activeCategory) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  });

  const handleAudition = (track: CuratedMusicTrack) => {
    if (isPlaying && activeUrl === track.url) {
      stop();
    } else {
      audition(track.url);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Music className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100">
                Royalty-Free Background Music Vault
              </h3>
              <p className="text-xs text-zinc-400">
                Select an audio bed for ducked automated broadcast mixing
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search & Categories */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, genre, mood..."
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/90 pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {["all", "upbeat", "dramatic", "ambient", "energetic", "serious"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md capitalize transition-colors ${
                  activeCategory === cat
                    ? "bg-emerald-500 text-black shadow-sm"
                    : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Track List */}
        <div className="divide-y divide-zinc-800/80 max-h-[360px] overflow-y-auto pr-1">
          {filteredTracks.map((track) => {
            const isSelected = selectedTrackUrl === track.url;
            const isThisPlaying = isPlaying && activeUrl === track.url;

            return (
              <div
                key={track.id}
                style={{
                  contentVisibility: "auto",
                  containIntrinsicSize: "200px 52px",
                }}
                className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                  isSelected
                    ? "bg-emerald-500/10 border border-emerald-500/30"
                    : "hover:bg-zinc-900/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleAudition(track)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                      isThisPlaying
                        ? "bg-emerald-500 text-black scale-105 shadow-md shadow-emerald-950/50"
                        : "bg-zinc-800 text-zinc-300 hover:bg-emerald-500 hover:text-black"
                    }`}
                  >
                    {isThisPlaying ? (
                      <Square className="h-3 w-3 fill-current" />
                    ) : (
                      <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                    )}
                  </button>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-100">
                        {track.title}
                      </span>
                      <span className="text-[10px] text-zinc-400">by {track.artist}</span>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-500">
                      <span>{track.duration}</span>
                      <span>•</span>
                      <span>{track.bpm} BPM</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        {track.tags.map((tg) => (
                          <span key={tg} className="px-1 rounded bg-zinc-800/80 text-zinc-400">
                            {tg}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTrack(track);
                      onClose();
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-emerald-500 text-black shadow"
                        : "border border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-emerald-500 hover:text-black"
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                    <span>{isSelected ? "Selected" : "Use Track"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

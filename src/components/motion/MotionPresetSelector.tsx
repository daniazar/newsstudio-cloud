"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import { Film, Upload, Activity, Mic, Search, Zap } from "lucide-react";
import { RUBY_ACTION_LOOPS, RubyActionLoop } from "@/lib/realtime/rubyWardrobePresets";

export interface SelectedDrivingMotion {
  id: string;
  label: string;
  src: string;
  desc?: string;
  icon?: string;
  isCustom?: boolean;
}

interface MotionPresetSelectorProps {
  selectedMotion: SelectedDrivingMotion;
  customVideoFile: File | null;
  customAudioFile: File | null;
  onSelectMotion: (motion: SelectedDrivingMotion) => void;
  onCustomVideoUpload: (file: File) => void;
  onCustomAudioUpload: (file: File) => void;
}

type MotionCategory = "all" | "broadcast" | "gestures" | "reactions";

export function MotionPresetSelector({
  selectedMotion,
  customVideoFile,
  customAudioFile,
  onSelectMotion,
  onCustomVideoUpload,
  onCustomAudioUpload,
}: MotionPresetSelectorProps) {
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const [activeCategory, setActiveCategory] = useState<MotionCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cachedLoopIds, setCachedLoopIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let isMounted = true;
    fetch("/api/motion/caches")
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted || !data.caches) return;
        const ids = new Set<string>();
        for (const c of data.caches) {
          if (c.loopId) {
            ids.add(c.loopId.toLowerCase());
            ids.add(`ruby_${c.loopId.toLowerCase()}`);
          }
        }
        setCachedLoopIds(ids);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const isLoopPrecached = (loop: RubyActionLoop) => {
    const rawId = loop.id.toLowerCase();
    const cleanId = rawId.replace(/^(ruby_|action_|loop_)/, "");
    if (cachedLoopIds.has(rawId) || cachedLoopIds.has(cleanId)) return true;
    const canonical = [
      "gesture_left",
      "gesture_right",
      "welcome",
      "signoff",
      "idle",
      "analyst",
      "look_notes",
      "nod",
      "breaking",
      "veo_master",
      "deep_thought_analyst",
      "look_down_notes",
      "emphasis_nod",
      "breaking_alert",
      "intro_welcome",
      "signoff_outro",
    ];
    return canonical.some((c) => rawId.includes(c) || cleanId.includes(c));
  };

  // Helper to map loop to recommended conditioning driver
  const getLoopConditioning = (loop: RubyActionLoop) => {
    const id = loop.id.toLowerCase();
    if (id.includes("gesture") || id.includes("point")) {
      return { driver: "2D DWPose", color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" };
    }
    if (id.includes("nod") || id.includes("analyst") || id.includes("notes")) {
      return { driver: "3D SMPL-X", color: "text-purple-400 bg-purple-500/15 border-purple-500/30" };
    }
    if (id.includes("alert") || id.includes("welcome")) {
      return { driver: "Audio+Pose", color: "text-amber-400 bg-amber-500/15 border-amber-500/30" };
    }
    return { driver: "In-Context", color: "text-sky-400 bg-sky-500/15 border-sky-500/30" };
  };

  const filteredLoops = useMemo(() => {
    return RUBY_ACTION_LOOPS.filter((loop) => {
      // Category filter
      if (activeCategory === "broadcast") {
        if (!["welcome", "idle", "signoff", "news_anchor"].some((k) => loop.id.includes(k))) return false;
      } else if (activeCategory === "gestures") {
        if (!["gesture", "point", "present"].some((k) => loop.id.includes(k))) return false;
      } else if (activeCategory === "reactions") {
        if (!["nod", "analyst", "look_notes", "alert"].some((k) => loop.id.includes(k))) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          loop.label.toLowerCase().includes(q) ||
          (loop.desc && loop.desc.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [activeCategory, searchQuery]);

  return (
    <div className="bg-surface-elevated/70 border border-border/80 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">Driving Motion & Gestures</h3>
              <p className="text-[10px] text-muted">
                Selected: <span className="text-sky-400 font-semibold">{selectedMotion.label}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => audioInputRef.current?.click()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-white/5 text-muted hover:text-foreground border border-border/70 hover:bg-white/10 transition-colors cursor-pointer"
              title="Upload speech audio for EchoMimicV3 / HOMA"
            >
              <Mic className="w-3.5 h-3.5 text-purple-400" />
              <span>{customAudioFile ? customAudioFile.name.slice(0, 10) + "..." : "Speech Audio (.wav)"}</span>
            </button>
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) onCustomAudioUpload(e.target.files[0]);
              }}
            />

            <button
              onClick={() => videoInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border border-sky-500/30 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{customVideoFile ? "Change Video" : "Upload Driving MP4"}</span>
            </button>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) onCustomVideoUpload(e.target.files[0]);
              }}
            />
          </div>
        </div>

        {customVideoFile && (
          <div className="mb-2.5 p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-between text-xs text-sky-300">
            <div className="flex items-center gap-2 truncate">
              <Film className="w-4 h-4 shrink-0 text-sky-400" />
              <span className="font-bold truncate">Custom Driving Video: {customVideoFile.name}</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-200">
              Active
            </span>
          </div>
        )}

        {/* Category Tabs & Quick Search */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pt-1 border-t border-border/40">
          <div className="flex items-center rounded-xl bg-surface border border-border/70 p-0.5 text-[10px] font-semibold">
            {(
              [
                { id: "all", label: "All" },
                { id: "broadcast", label: "Anchor" },
                { id: "gestures", label: "Gestures" },
                { id: "reactions", label: "Reactions" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                  activeCategory === tab.id
                    ? "bg-sky-500/20 text-sky-300 font-bold"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative flex items-center">
            <Search className="w-3 h-3 text-muted absolute left-2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search loops..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-6 pr-2 py-0.5 bg-surface border border-border/70 rounded-lg text-[10px] text-foreground focus:border-sky-500 focus:outline-none w-28"
            />
          </div>
        </div>

        {/* Action Loops Grid */}
        <div className="space-y-1.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
            {filteredLoops.map((loop: RubyActionLoop) => {
              const isSelected = selectedMotion.id === loop.id && !customVideoFile;
              const cond = getLoopConditioning(loop);

              return (
                <button
                  key={loop.id}
                  onClick={() =>
                    onSelectMotion({
                      id: loop.id,
                      label: loop.label,
                      src: loop.src,
                      desc: loop.desc,
                      icon: loop.icon,
                    })
                  }
                  className={`p-2 rounded-xl border text-left text-xs transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? "bg-sky-950/80 border-sky-500 text-sky-300 ring-2 ring-sky-500/30 shadow-md"
                      : "bg-white/5 border-white/10 text-muted hover:bg-white/10 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-base shrink-0">{loop.icon}</span>
                    <div className="truncate">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="font-bold text-[11px] truncate">{loop.label}</span>
                        <span className={`text-[7px] font-mono font-bold px-1 py-0.2 rounded border ${cond.color}`}>
                          {cond.driver}
                        </span>
                        {isLoopPrecached(loop) && (
                          <span
                            className="text-[7px] font-mono font-bold px-1 py-0.2 rounded border text-amber-400 bg-amber-500/15 border-amber-500/30 flex items-center gap-0.5"
                            title="Guidance pre-extracted: DWPose + SMPL-X Normals + VAE Latents ready for instant generation (<10ms load time)."
                          >
                            <Zap className="w-2 h-2 text-amber-400" />
                            <span>0ms PRE-CACHED</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] text-muted truncate">{loop.desc}</div>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0 shadow-[0_0_8px_#38bdf8]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

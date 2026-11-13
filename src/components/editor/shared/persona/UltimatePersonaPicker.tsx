"use client";

/**
 * src/components/editor/shared/persona/UltimatePersonaPicker.tsx
 *
 * Modularized UltimatePersonaPicker orchestrator:
 * - Collapsed summary bar with quick audition and loop rerolling
 * - Tab 1: Persona Directory Catalog with multi-attribute search and audio previews
 * - Tab 2: Wardrobe & Action Loops matrix with FSM Markov auto-sequencing
 */

import React, { useState, useMemo, useEffect, useDeferredValue } from "react";
import useSWR from "swr";
import Image from "next/image";
import { User, Shirt, ChevronDown } from "lucide-react";
import { PERSONAS, Persona, resolvePersonaVoiceSettings } from "@/lib/tts/personas";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
import {
  RUBY_ACTION_LOOPS,
  RUBY_WARDROBE_POSES,
  RubyWardrobePose,
} from "@/lib/realtime/rubyWardrobePresets";
import { useAudioAudition } from "../hooks/useAudioAudition";
import {
  MainTab,
  GenderFilter,
  ActionLoopRaw,
  MasterCoreLoopDef,
  MASTER_CORE_LOOPS,
  MATEO_WARDROBE_POSES,
  BLAZE_WARDROBE_POSES,
} from "./ultimatePersona/types";
import { cachedFetch } from "@/lib/cache/indexedDB";
import { CollapsedPersonaBar } from "./ultimatePersona/CollapsedPersonaBar";
import { PersonaDirectoryTab } from "./ultimatePersona/PersonaDirectoryTab";
import { WardrobeLoopsTab } from "./ultimatePersona/WardrobeLoopsTab";

// Re-export types and constants for external consumers
export type { MasterCoreLoopDef, ActionLoopRaw };
export { MASTER_CORE_LOOPS };

export interface DbPersonaItem {
  id: string;
  slug?: string;
  name: string;
  role?: string;
  avatarUrl?: string;
  avatars?: { imageUrl?: string }[];
  gender?: string;
  language?: string;
  description?: string;
  bio?: string;
  systemPrompt?: string;
  voiceFile?: string;
}

export interface UltimatePersonaPickerProps {
  selectedPersonaId: string;
  onSelectPersona: (personaId: string, persona: Persona) => void;
  selectedAttireId?: string;
  onSelectAttire?: (attireId: string, attireSrc: string) => void;
  selectedActionLoopId?: string;
  onSelectActionLoop?: (loopId: string, loopSrc?: string) => void;
  onAutoSequenceLoops?: (loops?: ActionLoopRaw[], personaId?: string) => void;
  onShuffleLoops?: (loops?: ActionLoopRaw[], personaId?: string) => void;
  onShuffleActiveSceneLoop?: (loops?: ActionLoopRaw[], personaId?: string) => void;
  isAutoSequencing?: boolean;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
  defaultCollapsed?: boolean;
  // Dynamic Voice Props for unified anchor badge
  selectedEngine?: string;
  selectedModel?: string;
  speechSpeed?: number;
  language?: string;
  isSpanish?: boolean;
}

export function UltimatePersonaPicker({
  selectedPersonaId,
  onSelectPersona,
  selectedAttireId,
  onSelectAttire,
  selectedActionLoopId,
  onSelectActionLoop,
  onAutoSequenceLoops,
  onShuffleLoops,
  onShuffleActiveSceneLoop,
  isAutoSequencing,
  className = "",
  compact = false,
  defaultCollapsed = true,
  selectedEngine,
  selectedModel,
  speechSpeed = 1.0,
  language,
  isSpanish,
}: UltimatePersonaPickerProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [activeTab, setActiveTab] = useState<MainTab>("personas");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [recentPersonaIds, setRecentPersonaIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("newsstudio_recent_personas");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [hoveredLoopId, setHoveredLoopId] = useState<string | null>(null);
  const [fetchedLoops, setFetchedLoops] = useState<ActionLoopRaw[]>([]);
  const [fetchedWardrobe, setFetchedWardrobe] = useState<RubyWardrobePose[]>([]);

  const handleSelectWithRecent = (personaId: string, persona: Persona) => {
    onSelectPersona(personaId, persona);
    try {
      const updated = [personaId, ...recentPersonaIds.filter((id) => id !== personaId)].slice(0, 5);
      setRecentPersonaIds(updated);
      localStorage.setItem("newsstudio_recent_personas", JSON.stringify(updated));
    } catch {
      // Ignore localStorage errors
    }
  };

  const { isPlaying, activeUrl, audition, stop } = useAudioAudition();

  // Load database personas (including custom cloned anchors)
  const { data: dbPersonasData } = useSWR<{ data?: DbPersonaItem[]; personas?: DbPersonaItem[] }>(
    "/api/personas?limit=100&lite=true",
    fetcher
  );

  const allPersonas = useMemo(() => {
    const dbList = dbPersonasData?.data || dbPersonasData?.personas || [];
    if (!dbList.length) return PERSONAS;

    const customList: Persona[] = dbList
      .filter((p: { id: string; slug?: string }) => !PERSONAS.some((sp) => sp.id === p.id || sp.id === p.slug))
      .map((p: DbPersonaItem) => ({
        id: p.slug || p.id,
        name: p.name,
        title: p.role || "News Anchor",
        avatarUrl: p.avatars?.[0]?.imageUrl || p.avatarUrl || "/avatars/ruby.png",
        gender: (p.gender === "male" ? "male" : "female") as "male" | "female",
        language: (p.language?.slice(0, 2) === "en" ? "en" : "es") as "en" | "es",
        description: p.description || p.bio || "",
        bio: p.bio || p.description || "",
        systemPrompt: p.systemPrompt || "You are a professional broadcast anchor.",
        voiceFile: p.voiceFile || `${p.slug || p.id}.wav`,
        params: {
          exaggeration: 1.0,
          cfgWeight: 1.0,
          temperature: 0.7,
          speed: 1.0,
          pitchShift: 0,
          maxNewTokens: 256,
          chunkSize: 100,
        },
        traits: {
          age: 28,
          heightCm: 172,
          heightFeet: "5'8\"",
          weightKg: 62,
          weightLbs: 136,
          skinTone: "natural",
          hair: "professional style",
          face: "Approachable professional presenter",
          build: "Athletic broadcast build",
        },
      }));

    return [...PERSONAS, ...customList];
  }, [dbPersonasData]);

  // Find currently active persona
  const currentPersona = useMemo(() => {
    if (selectedPersonaId) {
      const match = allPersonas.find(
        (p) =>
          p.id.toLowerCase() === selectedPersonaId.toLowerCase() ||
          p.name.toLowerCase() === selectedPersonaId.toLowerCase()
      );
      if (match) return match;
    }
    return (
      allPersonas.find((p) => p.id === "ruby" || p.id === "ruby_vance") ||
      allPersonas[0]
    );
  }, [allPersonas, selectedPersonaId]);

  // Persona identity variants
  const isRubyActive = useMemo(() => {
    return (
      currentPersona?.id === "ruby" ||
      currentPersona?.id === "ruby_vance" ||
      currentPersona?.id === "ruby_es" ||
      currentPersona?.name.toLowerCase().includes("ruby")
    );
  }, [currentPersona]);

  const isBlazeActive = useMemo(() => {
    return currentPersona?.id === "blaze" || currentPersona?.name?.toLowerCase().includes("blaze");
  }, [currentPersona]);

  const isMateoActive = useMemo(() => {
    return currentPersona?.id === "mateo" || currentPersona?.name.toLowerCase().includes("mateo");
  }, [currentPersona]);

  const hasActionLoops = useMemo(() => {
    return fetchedLoops.length > 0 || isRubyActive || isMateoActive || isBlazeActive;
  }, [fetchedLoops, isRubyActive, isMateoActive, isBlazeActive]);

  // Resolve voice model settings for this persona
  const resolvedVoice = useMemo(() => {
    return resolvePersonaVoiceSettings({
      persona: currentPersona,
      engine: selectedEngine || "omni",
      language: language || (isSpanish ? "es" : currentPersona.language) || "es",
    });
  }, [currentPersona, selectedEngine, language, isSpanish]);

  // Filtered Personas using React 19 deferred value for non-blocking 60fps typing
  const filteredPersonas = useMemo(() => {
    const q = deferredSearchQuery.toLowerCase().trim();
    return allPersonas.filter((p) => {
      if (genderFilter !== "all" && p.gender !== genderFilter) return false;
      if (languageFilter !== "all" && p.language !== languageFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.language.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    });
  }, [allPersonas, deferredSearchQuery, genderFilter, languageFilter]);

  // Compute recent personas objects
  const recentPersonas = useMemo(() => {
    if (!recentPersonaIds.length) return [];
    return recentPersonaIds
      .map((id) => allPersonas.find((p) => p.id.toLowerCase() === id.toLowerCase()))
      .filter((p): p is Persona => Boolean(p));
  }, [allPersonas, recentPersonaIds]);

  // Load action loops & wardrobe master poses dynamically from API with fallback to static presets
  useEffect(() => {
    let isMounted = true;
    const personaSlug = (currentPersona?.id || selectedPersonaId || "ruby").toLowerCase();

    const loadLoopsAndWardrobe = async () => {
      try {
        const cacheKey = `action-loops:${personaSlug}`;
        const data = await cachedFetch<{
          loops?: ActionLoopRaw[];
          items?: ActionLoopRaw[];
          wardrobePoses?: RubyWardrobePose[];
        }>(
          cacheKey,
          async () => {
            const res = await fetch(`/api/action-loops?persona=${personaSlug}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
          },
          6 * 60 * 60 * 1000 // 6-hour browser IndexedDB TTL
        );

        if (!isMounted) return;

        if (data) {
          const list = data.loops || data.items;
          if (Array.isArray(list)) {
            // Strictly filter list to only items belonging to this persona
            const filteredLoops = list.filter((it: ActionLoopRaw) => 
              !it.persona || it.persona.toLowerCase() === personaSlug || 
              (it.videoUrl && it.videoUrl.toLowerCase().includes(personaSlug))
            );
            setFetchedLoops(filteredLoops.length > 0 ? filteredLoops : list);
          } else {
            setFetchedLoops([]);
          }
          if (Array.isArray(data.wardrobePoses)) {
            // Strictly filter wardrobe poses to only items belonging to this persona
            const filteredPoses = data.wardrobePoses.filter((p: RubyWardrobePose) => {
              const idMatches = p.id?.toLowerCase().startsWith(personaSlug);
              const srcMatches = p.src?.toLowerCase().includes(`master_${personaSlug}_archive`) || 
                                 p.src?.toLowerCase().includes(`/${personaSlug}`) ||
                                 p.src?.toLowerCase().includes(`_${personaSlug}_`);
              return idMatches || srcMatches;
            });
            setFetchedWardrobe(filteredPoses.length > 0 ? filteredPoses : data.wardrobePoses);
          } else {
            setFetchedWardrobe([]);
          }
        } else {
          setFetchedLoops([]);
          setFetchedWardrobe([]);
        }
      } catch (err) {
        console.error("Error fetching action loops and wardrobe:", err);
      }
    };
    loadLoopsAndWardrobe();
    return () => {
      isMounted = false;
    };
  }, [currentPersona?.id, selectedPersonaId]);

  const wardrobePoses = useMemo(() => {
    const slug = (currentPersona?.id || selectedPersonaId || "").toLowerCase();
    
    // 1. If we have fetched wardrobe, verify items belong strictly to current persona
    if (fetchedWardrobe.length > 0) {
      const matched = fetchedWardrobe.filter((p) => {
        const idMatches = p.id?.toLowerCase().startsWith(slug);
        const srcMatches = p.src?.toLowerCase().includes(`master_${slug}_archive`) || 
                           p.src?.toLowerCase().includes(`/${slug}`) ||
                           p.src?.toLowerCase().includes(`_${slug}_`);
        return idMatches || srcMatches;
      });
      if (matched.length > 0) return matched;
    }
    
    // 2. Strict static fallback only if persona explicitly matches
    const isRuby = slug === "ruby" || slug === "ruby_vance" || slug === "ruby_es";
    if (isRuby) return RUBY_WARDROBE_POSES;
    if (slug === "mateo") return MATEO_WARDROBE_POSES;
    if (slug === "blaze") return BLAZE_WARDROBE_POSES;
    return [];
  }, [fetchedWardrobe, currentPersona?.id, selectedPersonaId]);

  const isFaceOnlyActive = useMemo(() => {
    return (
      selectedActionLoopId === "face_only" ||
      selectedAttireId === "face_only" ||
      selectedActionLoopId === "portrait" ||
      (!hasActionLoops && (!selectedActionLoopId || selectedActionLoopId.startsWith("ruby_")))
    );
  }, [selectedActionLoopId, selectedAttireId, hasActionLoops]);

  const allActionLoops = useMemo(() => {
    const slug = (currentPersona?.id || selectedPersonaId || "").toLowerCase();
    const isRuby = slug === "ruby" || slug === "ruby_vance" || slug === "ruby_es";

    if (fetchedLoops.length > 0) {
      const filtered = fetchedLoops.filter((f) => {
        if (!f.videoUrl) return true;
        const normUrl = f.videoUrl.toLowerCase();
        if (!isRuby && normUrl.includes("/ruby_burgundy/")) return false;
        if (slug !== "mateo" && normUrl.includes("/mateo_default_trait/")) return false;
        if (slug !== "blaze" && normUrl.includes("/blaze_silver_blazer/")) return false;
        return true;
      });

      return filtered.map((f: ActionLoopRaw) => ({
        id: f.id,
        label: f.name ? f.name.replace(/_/g, " ") : f.id,
        src: f.videoUrl,
        icon: f.type === "transition" ? "➡️" : f.type === "dynamic" || f.type === "dynamic_loop" ? "⚡" : f.type === "hair" ? "✨" : "💎",
        desc: f.desc || (f.startPose && f.endPose && f.startPose !== f.endPose ? `${f.startPose} ➔ ${f.endPose} (${Number(f.duration || 8).toFixed(1)}s)` : f.startPose ? `Pose ${f.startPose} (${Number(f.duration || 8).toFixed(1)}s)` : "Action Loop"),
        category: (f.type as MasterCoreLoopDef["category"]) || (f.id.startsWith("T") ? "transition" : "loop"),
        startPose: f.startPose,
        endPose: f.endPose,
        resolution: "1080p",
        durationSec: f.duration || 8.0,
      }));
    }
    if (isRuby) return RUBY_ACTION_LOOPS;
    return [];
  }, [fetchedLoops, currentPersona?.id, selectedPersonaId]);

  const handleAuditionVoice = (e: React.MouseEvent, persona: Persona) => {
    e.stopPropagation();
    const sampleFile = persona.voiceFile || `${persona.id}.wav`;
    const url = sampleFile.startsWith("/") ? sampleFile : `/audio/samples/${sampleFile}`;
    if (isPlaying && activeUrl === url) {
      stop();
    } else {
      audition(url);
    }
  };

  const activeCoreLoop = useMemo(() => {
    if (!hasActionLoops || isFaceOnlyActive) return null;
    return (
      MASTER_CORE_LOOPS.find((l) => l.id === selectedActionLoopId) ||
      MASTER_CORE_LOOPS.find((l) => selectedAttireId?.includes(l.id)) ||
      MASTER_CORE_LOOPS[0]
    );
  }, [selectedActionLoopId, selectedAttireId, hasActionLoops, isFaceOnlyActive]);

  // Collapsed View: Compact summary row showing active persona, loop preview, and quick reroll
  if (isCollapsed) {
    return (
      <CollapsedPersonaBar
        currentPersona={currentPersona}
        resolvedVoice={resolvedVoice}
        selectedEngine={selectedEngine}
        selectedModel={selectedModel}
        speechSpeed={speechSpeed}
        isFaceOnlyActive={isFaceOnlyActive}
        activeCoreLoop={activeCoreLoop}
        isPlaying={isPlaying}
        handleAuditionVoice={handleAuditionVoice}
        hasActionLoops={hasActionLoops}
        onShuffleActiveSceneLoop={() => onShuffleActiveSceneLoop?.(allActionLoops, currentPersona.id)}
        onShuffleLoops={() => onShuffleLoops?.(allActionLoops, currentPersona.id)}
        onExpand={() => setIsCollapsed(false)}
        className={className}
        compact={compact}
      />
    );
  }

  return (
    <div
      className={`rounded-xl border border-zinc-800 bg-zinc-950/80 backdrop-blur-md overflow-hidden ${className}`}
    >
      {/* Top Banner: Selected Anchor Summary & 2-Tab Bar */}
      <div className={`border-b border-zinc-800 ${compact ? "p-2.5" : "p-4"} bg-zinc-900/40`}>
        {compact ? (
          <div className="space-y-2">
            {/* Row 1: Selected Anchor Summary & Collapse Button */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative h-9 w-9 shrink-0 rounded-full border border-emerald-500/80 overflow-hidden shadow-sm">
                  <Image
                    src={currentPersona.avatarUrl || "/avatars/ruby.png"}
                    alt={currentPersona.name}
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-xs font-bold text-white tracking-wide truncate">
                      {currentPersona.name}
                    </h3>
                    <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-400 border border-emerald-500/30">
                      {currentPersona.language.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 truncate">{currentPersona.title}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                aria-label="Collapse panel"
                className="w-6 h-6 shrink-0 flex items-center justify-center rounded-lg border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all cursor-pointer"
                title="Collapse panel"
              >
                <ChevronDown className="h-3.5 w-3.5 rotate-180" />
              </button>
            </div>

            {/* Row 2: 2-Tab Switcher Full Width */}
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-zinc-900 p-1 border border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveTab("personas")}
                className={`flex items-center justify-center gap-1.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                  activeTab === "personas"
                    ? "bg-emerald-500 text-black shadow-sm font-bold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <User className="h-3 w-3" />
                <span>Anchors ({PERSONAS.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("wardrobe")}
                className={`flex items-center justify-center gap-1.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                  activeTab === "wardrobe"
                    ? "bg-emerald-500 text-black shadow-sm font-bold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Shirt className="h-3 w-3" />
                <span>Wardrobe</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 shrink-0 rounded-full border-2 border-emerald-500/80 overflow-hidden shadow-md shadow-emerald-950/50">
                <Image
                  src={currentPersona.avatarUrl || "/avatars/ruby.png"}
                  alt={currentPersona.name}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    {currentPersona.name}
                  </h3>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/30">
                    {currentPersona.gender.toUpperCase()} • {currentPersona.language.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 line-clamp-1">{currentPersona.title}</p>
              </div>
            </div>

            {/* 2-Tab Switcher & Collapse Button */}
            <div className="flex items-center gap-1 rounded-lg bg-zinc-900 p-1 border border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveTab("personas")}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  activeTab === "personas"
                    ? "bg-emerald-500 text-black shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <User className="h-3.5 w-3.5" />
                <span>Anchors ({PERSONAS.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("wardrobe")}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  activeTab === "wardrobe"
                    ? "bg-emerald-500 text-black shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Shirt className="h-3.5 w-3.5" />
                <span>Wardrobe & Loops ({hasActionLoops ? "5 Loops + Face" : "Portrait"})</span>
              </button>

              <div className="h-4 w-px bg-zinc-800 shrink-0 mx-0.5" />

              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                aria-label="Collapse panel"
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all cursor-pointer"
                title="Collapse panel"
              >
                <ChevronDown className="h-4 w-4 rotate-180" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TAB 1: Personas Catalog */}
      {activeTab === "personas" && (
        <PersonaDirectoryTab
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          genderFilter={genderFilter}
          setGenderFilter={setGenderFilter}
          languageFilter={languageFilter}
          setLanguageFilter={setLanguageFilter}
          filteredPersonas={filteredPersonas}
          recentPersonas={recentPersonas}
          selectedPersonaId={selectedPersonaId}
          onSelectPersona={handleSelectWithRecent}
          handleAuditionVoice={handleAuditionVoice}
          isPlaying={isPlaying}
          activeUrl={activeUrl}
          compact={compact}
        />
      )}

      {/* TAB 2: Wardrobe & Action Loops Matrix */}
      {activeTab === "wardrobe" && (
        <WardrobeLoopsTab
          hasActionLoops={hasActionLoops}
          allActionLoops={allActionLoops}
          wardrobePoses={wardrobePoses}
          isFaceOnlyActive={isFaceOnlyActive}
          selectedActionLoopId={selectedActionLoopId}
          selectedAttireId={selectedAttireId}
          hoveredLoopId={hoveredLoopId}
          setHoveredLoopId={setHoveredLoopId}
          onSelectActionLoop={onSelectActionLoop}
          onSelectAttire={onSelectAttire}
          onAutoSequenceLoops={(loops, personaId) => onAutoSequenceLoops?.(loops || allActionLoops, personaId || currentPersona.id)}
          onShuffleLoops={(loops, personaId) => onShuffleLoops?.(loops || allActionLoops, personaId || currentPersona.id)}
          onShuffleActiveSceneLoop={(loops, personaId) => onShuffleActiveSceneLoop?.(loops || allActionLoops, personaId || currentPersona.id)}
          currentPersona={currentPersona}
          isBlazeActive={isBlazeActive}
          isMateoActive={isMateoActive}
          isRubyActive={isRubyActive}
          compact={compact}
          isAutoSequencing={isAutoSequencing}
        />
      )}
    </div>
  );
}

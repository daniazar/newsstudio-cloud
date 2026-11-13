"use client";

import React, { useState, useMemo } from "react";
import {
  Sparkles,
  Clapperboard,
  User,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  X,
  Image as ImageIcon,
  MessageSquare,
  Zap,
  Globe2,
  Tag,
  Radio,
  Flame,
  Video,
} from "lucide-react";
import { getAllPersonas } from "@/lib/tts/personas";
import { useToast } from "@/components/global/ToastContainer";
import { useRouter } from "next/navigation";
import { planNewsBroadcastFsmSequence } from "@/lib/video/loopSelector";

export type NewsBroadcastArchetype =
  | "breaking_flash"
  | "deep_dive"
  | "primetime_brief"
  | "debate_perspectives"
  | "viral_social"
  | "market_ticker";

export interface ReviewSegment {
  id?: string;
  index: number;
  text: string;
  spokenText?: string | null;
  assetPath?: string | null;
  assetType?: string | null;
  personaId?: string | null;
  keyword?: string | null;
  imagePrompt?: string | null;
  sceneStrategy?: string | null;
  duration?: number;
  startTime?: number;
  endTime?: number;
  actionLoop?: string | null;
  presenterVideoPath?: string | null;
  cameraCue?: string | null;
  actionStateLabel?: string | null;
  startPose?: string | null;
  endPose?: string | null;
}

export interface ReviewScript {
  id?: string;
  headline: string;
  segments: ReviewSegment[];
  leadPersonaId?: string;
  archetype?: string;
  targetChannel?: string;
  aspectRatio?: string;
  rawJson?: unknown;
}

export interface StoryModalData {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  pubDate?: string | null;
  author?: string | null;
  link: string;
  feed: { id?: string; name: string };
  category?: string | null;
  articleImageUrls?: string | null;
  script?: {
    id: string;
    headline: string;
    segments: ReviewSegment[];
  } | null;
}

export interface NewsPreProductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  story: StoryModalData | null;
  onApproveSuccess?: (storyId: string) => void;
  onOpenEditor?: (storyId: string) => void;
}

interface NewsPreProductionContentProps {
  story: StoryModalData;
  onClose: () => void;
  onApproveSuccess?: (storyId: string) => void;
  onOpenEditor?: (storyId: string) => void;
}

const NEWS_ARCHETYPES: Array<{
  id: NewsBroadcastArchetype;
  label: string;
  desc: string;
  icon: string;
}> = [
  {
    id: "breaking_flash",
    label: "Breaking News Flash",
    desc: "Urgent lead anchor bulletin, live wire ticker, fast-paced stinger.",
    icon: "⚡",
  },
  {
    id: "deep_dive",
    label: "Deep Dive & Analysis",
    desc: "Measured investigative breakdown, data context, multi-angle scrutiny.",
    icon: "🔍",
  },
  {
    id: "primetime_brief",
    label: "Primetime Anchor Brief",
    desc: "Authoritative desk broadcast, clear narrative arc, polished studio tone.",
    icon: "🎙️",
  },
  {
    id: "debate_perspectives",
    label: "Debate & Perspectives",
    desc: "Two contrasting viewpoints, dialectical thesis/antithesis, balanced scrutiny.",
    icon: "⚔️",
  },
  {
    id: "viral_social",
    label: "Viral Social Byte",
    desc: "Vertical punchy hook, curiosity gap, rapid pace for TikTok/Reels/Shorts.",
    icon: "🔥",
  },
  {
    id: "market_ticker",
    label: "Financial & Market Ticker",
    desc: "Macro trends, quantitative metrics, market impact, financial ticker.",
    icon: "📊",
  },
];

const TARGET_CHANNELS = [
  { id: "youtube_broadcast", label: "YouTube Broadcast (16:9 Landscape)", ratio: "16:9" },
  { id: "tiktok_reels", label: "TikTok & Reels (9:16 Vertical)", ratio: "9:16" },
  { id: "youtube_shorts", label: "YouTube Shorts (9:16 Vertical)", ratio: "9:16" },
  { id: "instagram_feed", label: "Instagram & LinkedIn Feed (1:1 Square)", ratio: "1:1" },
  { id: "tv_broadcast_4k", label: "Television Stream Broadcast (16:9 4K)", ratio: "16:9" },
];

const PRESET_EDITORIAL_DIRECTIONS = [
  "Emphasize breaking urgency and live developing facts",
  "Maintain neutral, balanced journalistic objectivity",
  "Explain complex technical/financial jargon simply",
  "Add punchy provocative hook for high social retention",
  "Include call-to-action to follow for developing updates",
  "Highlight economic impact and market sentiment",
];

const SYNTHESIS_STEPS = [
  { id: 1, text: "Extracting Core Facts, Data Points & Article DNA..." },
  { id: 2, text: "Curating Lead Anchor Persona & Vocal Cadence..." },
  { id: 3, text: "Engineering Multi-Scene Broadcast Narrative (Hook, Story, Conclusion)..." },
  { id: 4, text: "Formulating B-Roll Stock Prompts & Visual Keywords..." },
  { id: 5, text: "Aligning Live Wire Ticker & Broadcast Overlay Badges..." },
  { id: 6, text: "Finalizing Kinetic Copy, Teleprompter Voiceover & Timings..." },
];

const NewsPreProductionContent: React.FC<NewsPreProductionContentProps> = ({
  story,
  onClose,
  onApproveSuccess,
  onOpenEditor,
}) => {
  const { toast } = useToast();
  const router = useRouter();

  const initialScript = useMemo(() => {
    if (story.script && story.script.segments && story.script.segments.length > 0) {
      return story.script as ReviewScript;
    }
    return null;
  }, [story.script]);

  // Wizard Stage: "brief" | "synthesizing" | "review"
  const [stage, setStage] = useState<"brief" | "synthesizing" | "review">(
    initialScript ? "review" : "brief"
  );

  // Brief Form State
  const [archetype, setArchetype] = useState<NewsBroadcastArchetype>("breaking_flash");
  const [selectedChannel, setSelectedChannel] = useState("youtube_broadcast");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [customDirection, setCustomDirection] = useState("");
  const [targetLanguage, setTargetLanguage] = useState<string>("es");
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("auto");
  const [customTickerText, setCustomTickerText] = useState(initialScript?.headline || "");

  // Synthesis Animation State
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Review State (Generated Script)
  const [generatedScript, setGeneratedScript] = useState<ReviewScript | null>(initialScript);
  const [reviewPersonaId, setReviewPersonaId] = useState<string>(
    initialScript?.segments?.[0]?.personaId || "ruby"
  );
  const [personaReasoning, setPersonaReasoning] = useState<string>(
    initialScript ? `Assigned anchor matching ${story.category || "broadcast news"} tone.` : ""
  );
  const [isApproving, setIsApproving] = useState(false);

  // Available Personas
  const personas = useMemo(() => getAllPersonas(), []);

  // Harvested Article Images
  const harvestedImages = useMemo<string[]>(() => {
    if (!story.articleImageUrls) return [];
    try {
      const parsed = JSON.parse(story.articleImageUrls);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [story.articleImageUrls]);

  // Handle Channel Change
  const handleChannelChange = (channelId: string) => {
    setSelectedChannel(channelId);
    const found = TARGET_CHANNELS.find((c) => c.id === channelId);
    if (found) setAspectRatio(found.ratio);
  };

  // Launch AI Broadcast Storyboard Synthesis
  const handleLaunchSynthesis = async () => {
    setStage("synthesizing");
    setCurrentStepIndex(0);

    // Run animated progress ticker
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < SYNTHESIS_STEPS.length - 1) return prev + 1;
        return prev;
      });
    }, 850);

    try {
      const res = await fetch(`/api/stories/${story.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-script",
          synchronous: true,
          archetype,
          targetChannel: selectedChannel,
          aspectRatio,
          language: targetLanguage,
          personaId: selectedPersonaId === "auto" ? undefined : selectedPersonaId,
          customDirection: customDirection.trim() || undefined,
          tickerText: customTickerText.trim() || undefined,
        }),
      });

      const data = await res.json();
      clearInterval(interval);

      if (!res.ok || !data.success || !data.script) {
        throw new Error(data.error || "Failed to synthesize news script");
      }

      const script = data.script as ReviewScript;

      const assignedPersona =
        script.leadPersonaId ||
        script.segments?.[0]?.personaId ||
        (selectedPersonaId !== "auto" ? selectedPersonaId : "ruby");

      // Auto-assign FSM sequence for the assigned persona
      const plannedBeats = planNewsBroadcastFsmSequence(script.segments, assignedPersona);
      const enrichedSegments = script.segments.map((seg, idx) => {
        const segMeta = seg as { actionLoop?: string; cameraCue?: string; actionStateLabel?: string; startPose?: string; endPose?: string };
        const beat = plannedBeats[idx] || plannedBeats.find((b) => b.index === seg.index);
        return {
          ...seg,
          personaId: assignedPersona,
          actionLoop: segMeta.actionLoop || beat?.clipId || "M1_loop_v1",
          presenterVideoPath: seg.presenterVideoPath || beat?.videoUrl,
          cameraCue: segMeta.cameraCue || beat?.cameraCue || "cam1_wide",
          actionStateLabel: segMeta.actionStateLabel || beat?.actionStateLabel || "M1 Anchor Stance",
          startPose: segMeta.startPose || beat?.startPose || "M1",
          endPose: segMeta.endPose || beat?.endPose || "M1",
        };
      });

      setGeneratedScript({
        ...script,
        leadPersonaId: assignedPersona,
        segments: enrichedSegments,
      });

      setReviewPersonaId(assignedPersona);
      setPersonaReasoning(
        `Gemini selected ${assignedPersona.toUpperCase()} to lead ${
          NEWS_ARCHETYPES.find((a) => a.id === archetype)?.label || "the broadcast"
        } with authoritative vocal cadence.`
      );

      setCurrentStepIndex(SYNTHESIS_STEPS.length - 1);
      setTimeout(() => {
        setStage("review");
        toast("✨ Storyboard Synthesized", "Gemini 2.5 Flash generated full broadcast script!", "success");
      }, 400);
    } catch (err: unknown) {
      clearInterval(interval);
      const errMsg = err instanceof Error ? err.message : "Could not generate storyboard";
      console.error("[NewsPreProductionModal] Synthesis failed:", err);
      toast("Synthesis Failed", errMsg, "error");
      setStage("brief");
    }
  };

  // Swap persona and dynamically re-plan FSM action loops in real time
  const handlePersonaChange = (newPersonaId: string) => {
    setReviewPersonaId(newPersonaId);
    if (!generatedScript || !generatedScript.segments) return;

    const plannedBeats = planNewsBroadcastFsmSequence(generatedScript.segments, newPersonaId);
    const updatedSegments = generatedScript.segments.map((seg, idx) => {
      const beat = plannedBeats[idx] || plannedBeats.find((b) => b.index === seg.index);
      return {
        ...seg,
        personaId: newPersonaId,
        actionLoop: beat?.clipId || seg.actionLoop || "M1_loop_v1",
        presenterVideoPath: beat?.videoUrl || seg.presenterVideoPath,
        cameraCue: beat?.cameraCue || seg.cameraCue || "cam1_wide",
        actionStateLabel: beat?.actionStateLabel || seg.actionStateLabel || "M1 Anchor Stance",
        startPose: beat?.startPose || seg.startPose || "M1",
        endPose: beat?.endPose || seg.endPose || "M1",
      };
    });

    setGeneratedScript({
      ...generatedScript,
      leadPersonaId: newPersonaId,
      segments: updatedSegments,
    });

    fetch(`/api/stories/${story.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "recast-persona",
        personaId: newPersonaId,
      }),
    }).catch((err) => console.error("Failed to recast persona on server:", err));
  };

  // Update Scene Speech or Headline inline in review mode
  const handleUpdateSceneText = (sceneIdx: number, val: string) => {
    if (!generatedScript || !generatedScript.segments) return;
    const updated = { ...generatedScript };
    const seg = updated.segments.find((s: ReviewSegment) => s.index === sceneIdx);
    if (seg) {
      seg.text = val;
      seg.spokenText = val;
    }
    setGeneratedScript(updated);
  };

  // Approve & Send to Production
  const handleApproveSendToProduction = async () => {
    setIsApproving(true);
    try {
      const res = await fetch(`/api/stories/${story.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send-to-production" }),
      });
      if (res.ok) {
        toast("Dispatched", "Story dispatched to automated production pipeline!", "success");
        if (onApproveSuccess) onApproveSuccess(story.id);
        onClose();
      } else {
        toast("Error", "Could not dispatch story to production", "error");
      }
    } catch {
      toast("Error", "Connection error", "error");
    } finally {
      setIsApproving(false);
    }
  };

  // Approve & Open in Studio Editor
  const handleApproveOpenEditor = () => {
    if (onOpenEditor) {
      onOpenEditor(story.id);
    } else {
      router.push(`/editor/${story.id}`);
    }
    onClose();
  };

  const currentPersona = personas.find(
    (p) => p.id.toLowerCase() === reviewPersonaId.toLowerCase()
  );

  return (
    <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-[#0e0e13] border border-cyan-500/30 shadow-2xl shadow-cyan-500/10 overflow-hidden text-white">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-blue-950/40 via-cyan-950/20 to-purple-950/30">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Clapperboard className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-cyan-400">
                Pre-Production Control Room
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-mono text-zinc-300">
                AI Broadcast Storyboard Synthesizer
              </span>
            </div>
            <h2 className="text-base font-bold text-white line-clamp-1">
              {story.title}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Step Indicators */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold">
            <span
              className={`px-2.5 py-1 rounded-lg border ${
                stage === "brief"
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                  : "bg-white/5 text-zinc-400 border-white/10"
              }`}
            >
              1. Broadcast Brief
            </span>
            <span className="text-zinc-600">→</span>
            <span
              className={`px-2.5 py-1 rounded-lg border ${
                stage === "synthesizing"
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse"
                  : "bg-white/5 text-zinc-400 border-white/10"
              }`}
            >
              2. AI Synthesis
            </span>
            <span className="text-zinc-600">→</span>
            <span
              className={`px-2.5 py-1 rounded-lg border ${
                stage === "review"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-white/5 text-zinc-400 border-white/10"
              }`}
            >
              3. Storyboard Review
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Modal Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* =================================================================== */}
        {/* STAGE 1: BROADCAST BRIEF & EDITORIAL DIRECTION                     */}
        {/* =================================================================== */}
        {stage === "brief" && (
          <div className="space-y-6">
            {/* Story Summary Card */}
            <div className="p-4 rounded-2xl bg-[#14141a] border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0 flex items-center justify-center">
                  {harvestedImages.length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={harvestedImages[0]}
                      alt={story.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Radio className="w-7 h-7 text-cyan-400/70" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                    <span>{story.feed?.name || "News Wire"}</span>
                    {story.pubDate && (
                      <span className="text-[10px] text-zinc-500">
                        • {new Date(story.pubDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold text-white line-clamp-1">
                    {story.title}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px] font-bold uppercase">
                      {story.category || "GENERAL NEWS"}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      • {harvestedImages.length > 0 ? `${harvestedImages.length} crawled images available` : "Full text parsed from RSS"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-zinc-400 bg-white/5 p-3 rounded-xl border border-white/5 max-w-sm">
                💡 Gemini 2.5 Flash will analyze this news article, assign an authoritative anchor persona, structure the multi-scene broadcast narrative, and generate teleprompter cadence.
              </div>
            </div>

            {/* Harvested Story Assets Strip (If Available) */}
            {harvestedImages.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                  Available Story Assets (AI Will Curate & Map to Scenes)
                </label>
                <div className="flex gap-2.5 overflow-x-auto pb-2">
                  {harvestedImages.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative w-24 h-24 rounded-xl overflow-hidden bg-black/50 border border-white/10 shrink-0 group"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Asset ${idx}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute top-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[9px] font-mono text-cyan-300 border border-white/10">
                        #{idx}
                      </div>
                      <div className="absolute bottom-1 left-1 right-1 bg-black/80 px-1 py-0.5 rounded text-[8px] font-semibold text-zinc-300 truncate text-center">
                        {idx === 0 ? "Hero Photo" : "Context"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Select Commercial / News Broadcast Archetype */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Select Broadcast Archetype
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {NEWS_ARCHETYPES.map((arch) => {
                  const isSelected = archetype === arch.id;
                  return (
                    <button
                      key={arch.id}
                      type="button"
                      onClick={() => setArchetype(arch.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? "bg-gradient-to-br from-cyan-950/50 to-blue-950/40 border-cyan-500 shadow-lg shadow-cyan-500/10"
                          : "bg-[#14141a] border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{arch.icon}</span>
                        <span className={`text-xs font-extrabold ${isSelected ? "text-cyan-300" : "text-white"}`}>
                          {arch.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                        {arch.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Channel & Language Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-blue-400" />
                  Target Distribution Channel
                </label>
                <select
                  value={selectedChannel}
                  onChange={(e) => handleChannelChange(e.target.value)}
                  className="w-full bg-[#14141a] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {TARGET_CHANNELS.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <Globe2 className="w-3.5 h-3.5 text-emerald-400" />
                  Language & Regional Dialect
                </label>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="w-full bg-[#14141a] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="es">Spanish (Español Latinoamericano / Rioplatense)</option>
                  <option value="en">English (US Broadcast / Global)</option>
                  <option value="pt">Portuguese (Brasil)</option>
                  <option value="fr">French (France)</option>
                  <option value="de">German (Deutschland)</option>
                </select>
              </div>
            </div>

            {/* Lead Anchor Persona Preference */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                Lead Anchor Persona
              </label>
              <select
                value={selectedPersonaId}
                onChange={(e) => setSelectedPersonaId(e.target.value)}
                className="w-full bg-[#14141a] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="auto">✨ Auto-Select (Gemini Matches Persona to Story Tone)</option>
                {personas.slice(0, 20).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.title} ({p.language.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Editorial Creative Direction */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                  Custom Editorial Direction (Optional)
                </label>
                <span className="text-[10px] text-zinc-400">Guides tone, angle, and hooks</span>
              </div>
              <textarea
                value={customDirection}
                onChange={(e) => setCustomDirection(e.target.value)}
                placeholder="e.g. Focus on geopolitical implications, maintain neutral tone, emphasize market volatility..."
                rows={2}
                className="w-full bg-[#14141a] border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 resize-none"
              />

              <div className="flex flex-wrap gap-1.5 pt-1">
                {PRESET_EDITORIAL_DIRECTIONS.map((preset, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCustomDirection(preset)}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 transition-colors"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Live Wire Ticker Override */}
            <div className="max-w-md space-y-1">
              <label className="text-[11px] font-bold text-zinc-400">
                Live Wire Ticker Override (Optional)
              </label>
              <input
                type="text"
                value={customTickerText}
                onChange={(e) => setCustomTickerText(e.target.value)}
                placeholder="e.g. DESARROLLOS DE ÚLTIMO MOMENTO EN VIVO..."
                className="w-full bg-[#14141a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Primary Action Button */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleLaunchSynthesis}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black font-black text-sm flex items-center gap-2 shadow-xl shadow-cyan-500/25 transition-all transform hover:scale-[1.02]"
              >
                <Sparkles className="w-4 h-4" />
                <span>Synthesize Bespoke Storyboard with Gemini →</span>
              </button>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STAGE 2: LIVE AI SYNTHESIS (ANIMATED PIPELINE)                     */}
        {/* =================================================================== */}
        {stage === "synthesizing" && (
          <div className="py-12 px-6 flex flex-col items-center justify-center space-y-8 max-w-lg mx-auto">
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-500 to-purple-600 p-0.5 animate-spin">
                <div className="w-full h-full bg-[#0e0e13] rounded-3xl" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-cyan-400">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-white">
                Creative Director Engine Active
              </h3>
              <p className="text-xs text-zinc-400">
                Gemini 2.5 Flash is directing a broadcast news storyboard for {story.title}
              </p>
            </div>

            {/* Progress Checklist */}
            <div className="w-full space-y-3 bg-[#14141a] p-5 rounded-2xl border border-white/10">
              {SYNTHESIS_STEPS.map((step, idx) => {
                const isDone = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3 text-xs transition-colors ${
                      isDone
                        ? "text-emerald-400"
                        : isCurrent
                        ? "text-cyan-300 font-bold"
                        : "text-zinc-600"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : isCurrent ? (
                      <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-zinc-700 shrink-0" />
                    )}
                    <span className="line-clamp-1">{step.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STAGE 3: CONTROL ROOM REVIEW DASHBOARD                             */}
        {/* =================================================================== */}
        {stage === "review" && generatedScript && (
          <div className="space-y-6">
            {/* Top Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-cyan-950/30 to-blue-950/40 border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">
                    Bespoke Storyboard Ready for Review
                  </h4>
                  <p className="text-xs text-zinc-300">
                    Gemini curated the anchor, scene strategy, teleprompter cadence, and ticker overlays.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStage("brief")}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-300 flex items-center gap-1.5 border border-white/10 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-Direct</span>
              </button>
            </div>

            {/* 3 Core Decision Cards: Anchor Persona, Layout/Ratio, Live Wire */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              {/* Card 1: Curated Anchor Persona */}
              <div className="p-4 rounded-2xl bg-[#14141a] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    Curated Anchor Persona
                  </span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    AI Matched
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-black/40 border border-white/10 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentPersona?.avatarUrl || "/avatars/ruby.png"}
                      alt={currentPersona?.name || reviewPersonaId}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-extrabold text-white truncate">
                      {currentPersona?.name || reviewPersonaId}
                    </div>
                    <div className="text-xs text-cyan-400 font-semibold truncate">
                      {currentPersona?.title || "Anchor Host"}
                    </div>
                  </div>
                </div>

                {personaReasoning && (
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-[11px] text-zinc-300 leading-relaxed italic">
                    &quot;{personaReasoning}&quot;
                  </div>
                )}

                <div className="pt-1">
                  <label className="text-[10px] font-bold text-zinc-400 block mb-1">
                    Swap Anchor Persona:
                  </label>
                  <select
                    value={reviewPersonaId}
                    onChange={(e) => handlePersonaChange(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    {personas.slice(0, 15).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.title})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Card 2: Broadcast Format & Layout */}
              <div className="p-4 rounded-2xl bg-[#14141a] border border-white/10 space-y-3">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-blue-400" />
                  Broadcast Format
                </span>

                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Aspect Ratio:</span>
                    <span className="font-mono font-bold text-white">{aspectRatio}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Scenes:</span>
                    <span className="font-bold text-white">
                      {generatedScript.segments?.length || 0} Scenes
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Channel:</span>
                    <span className="text-cyan-300 font-semibold truncate max-w-[150px]">
                      {TARGET_CHANNELS.find((c) => c.id === selectedChannel)?.label || selectedChannel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3: Live Wire Ticker */}
              <div className="p-4 rounded-2xl bg-[#14141a] border border-white/10 space-y-3">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  Live Wire Ticker
                </span>

                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[9px] font-black tracking-wider animate-pulse">
                      {targetLanguage === "es" ? "EN VIVO" : "LIVE WIRE"}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {targetLanguage === "es" ? "ÚLTIMO MOMENTO" : "BREAKING NEWS"}
                    </span>
                  </div>
                  <p className="text-xs text-white line-clamp-2 font-medium">
                    {customTickerText || generatedScript.headline || story.title}
                  </p>
                </div>
              </div>
            </div>

            {/* Multi-Scene Narrative Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <Clapperboard className="w-3.5 h-3.5 text-cyan-400" />
                  Multi-Scene Broadcast Narrative ({generatedScript.segments?.length || 0} Scenes)
                </h4>
                <span className="text-[10px] text-zinc-500">
                  Click dialogue to make quick edits before approving
                </span>
              </div>

              <div className="space-y-3">
                {generatedScript.segments?.map((seg: ReviewSegment, idx: number) => {
                  const sceneRole =
                    idx === 0
                      ? "Scene 1: Opening Hook & Intro"
                      : idx === 1
                      ? "Scene 2: Core Facts & Context"
                      : idx === (generatedScript.segments?.length || 1) - 1
                      ? `Scene ${idx + 1}: Conclusion & Wrap`
                      : `Scene ${idx + 1}: Deep Dive & Detail`;

                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-[#14141a] border border-white/10 space-y-2 hover:border-white/20 transition-colors"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px] font-bold">
                            {sceneRole}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-mono flex items-center gap-1.5">
                            <Video className="w-3 h-3 text-purple-400 shrink-0" />
                            <span>{seg.actionLoop || "M1_loop_v1"}</span>
                            <span className="text-zinc-500">•</span>
                            <span>{seg.cameraCue || "cam1_wide"}</span>
                            {seg.actionStateLabel && (
                              <>
                                <span className="text-zinc-500">•</span>
                                <span className="text-zinc-400 font-sans">{seg.actionStateLabel}</span>
                              </>
                            )}
                          </span>
                        </div>
                        {seg.keyword && (
                          <span className="text-[10px] text-zinc-500">
                            B-Roll Tag: #{seg.keyword}
                          </span>
                        )}
                      </div>

                      {/* Editable Dialogue */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 block">
                          Teleprompter Spoken Script:
                        </label>
                        <textarea
                          value={seg.text || ""}
                          onChange={(e) => handleUpdateSceneText(seg.index ?? idx, e.target.value)}
                          rows={2}
                          className="w-full bg-black/40 border border-white/5 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none font-sans"
                        />
                      </div>

                      {/* Image / B-Roll Visual Prompt */}
                      {seg.imagePrompt && (
                        <div className="text-[11px] text-zinc-400 flex items-start gap-1.5 pt-1">
                          <span className="text-zinc-500">🖼️ B-Roll Prompt:</span>
                          <span className="italic line-clamp-1">{seg.imagePrompt}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStage("brief")}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
              >
                ← Back to Brief
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleApproveSendToProduction}
                  disabled={isApproving}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {isApproving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Approve & Send to Production</span>
                </button>

                <button
                  type="button"
                  onClick={handleApproveOpenEditor}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all"
                >
                  <span>Approve & Open in Studio Editor</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export const NewsPreProductionModal: React.FC<NewsPreProductionModalProps> = ({
  isOpen,
  onClose,
  story,
  onApproveSuccess,
  onOpenEditor,
}) => {
  if (!isOpen || !story) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <NewsPreProductionContent
        key={story.id}
        story={story}
        onClose={onClose}
        onApproveSuccess={onApproveSuccess}
        onOpenEditor={onOpenEditor}
      />
    </div>
  );
};

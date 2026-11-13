"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Clapperboard,
  User,
  Layout,
  Camera,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  X,
  Image as ImageIcon,
  MessageSquare,
  Zap,
  Globe2,
  Tag,
  Layers,
} from "lucide-react";
import {
  ProductSpec,
  AdScript,
  VideoArchetype,
  AdAspectRatio,
  AdScene,
} from "@/lib/types/ecommerce";
import { INTEGRAL_LAYOUT_TEMPLATES } from "@/lib/ecommerce/layoutTemplates";
import { getAllPersonas } from "@/lib/tts/personas";
import { useToast } from "@/components/global/ToastContainer";

export interface EcommercePreProductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  productSpec: ProductSpec;
  campaignId?: string;
  onApproveStoryboard: (params: {
    script: AdScript;
    selectedPersonaId?: string;
    recommendedTemplateId?: string;
  }) => Promise<void> | void;
}

const ARCHETYPES: Array<{ id: VideoArchetype; label: string; desc: string; icon: string }> = [
  {
    id: "pdp_showcase",
    label: "PDP Showcase",
    desc: "360° product exploration, technical specs, and value highlights.",
    icon: "💎",
  },
  {
    id: "us_vs_them",
    label: "Us vs Them",
    desc: "Bold side-by-side comparison debunking cheap generic alternatives.",
    icon: "⚔️",
  },
  {
    id: "viral_ugc",
    label: "Viral UGC Hook",
    desc: "Problem-first relatable hook with emotional payoff and solution.",
    icon: "🔥",
  },
  {
    id: "flash_sale",
    label: "Flash Sale & Urgency",
    desc: "Scarcity countdown, bold discount badges, and immediate CTA.",
    icon: "⚡",
  },
  {
    id: "onboarding_guide",
    label: "Onboarding & Unboxing",
    desc: "Step-by-step setup tutorial, tactile unboxing, and tips.",
    icon: "📦",
  },
  {
    id: "amazon_compliant",
    label: "Amazon Compliant",
    desc: "Clean, objective demonstration with zero exaggerated claims.",
    icon: "🛡️",
  },
];

const TARGET_CHANNELS = [
  { id: "tiktok_shop", label: "TikTok Shop (9:16)", ratio: "9:16" as AdAspectRatio },
  { id: "instagram_reels", label: "Instagram Reels (9:16)", ratio: "9:16" as AdAspectRatio },
  { id: "shopify_pdp", label: "Shopify PDP (1:1)", ratio: "1:1" as AdAspectRatio },
  { id: "youtube_shorts", label: "YouTube Shorts (9:16)", ratio: "9:16" as AdAspectRatio },
  { id: "meta_ads", label: "Meta Feed (4:5)", ratio: "4:5" as AdAspectRatio },
];

const PRESET_DIRECTIONS = [
  "Emphasize premium craftsmanship and tactile finish",
  "Target busy parents who need quick durability and easy cleaning",
  "Highlight waterproof certification and scratch resistance",
  "Focus on high-speed performance and minimalist design",
  "Create high scarcity urgency with limited warehouse stock",
];

const SYNTHESIS_STEPS = [
  { id: 1, text: "Extracting Brand DNA, Typology & Technical Specifications..." },
  { id: 2, text: "Curating Presenter Persona for optimal demographic resonance..." },
  { id: 3, text: "Mapping Harvested Product Assets to Multi-Scene Narrative..." },
  { id: 4, text: "Engineering Bespoke Google Imagen 3 Photo Studio Prompt..." },
  { id: 5, text: "Synthesizing Bespoke Google Veo 8s Video Motion Prompt..." },
  { id: 6, text: "Selecting High-Conversion Integral Canvas Layout Template..." },
  { id: 7, text: "Finalizing Kinetic Copy, Teleprompter Voiceover & Timings..." },
];

export const EcommercePreProductionModal: React.FC<EcommercePreProductionModalProps> = ({
  isOpen,
  onClose,
  productSpec,
  campaignId,
  onApproveStoryboard,
}) => {
  const { toast } = useToast();

  // Wizard Stage: "brief" | "synthesizing" | "review"
  const [stage, setStage] = useState<"brief" | "synthesizing" | "review">("brief");

  // Brief Form State
  const [archetype, setArchetype] = useState<VideoArchetype>("pdp_showcase");
  const [selectedChannel, setSelectedChannel] = useState("tiktok_shop");
  const [aspectRatio, setAspectRatio] = useState<AdAspectRatio>("9:16");
  const [customDirection, setCustomDirection] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [targetLanguage, setTargetLanguage] = useState<string>("es");

  // Synthesis Animation State
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Review State (Synthesized Output)
  const [generatedScript, setGeneratedScript] = useState<AdScript | null>(null);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("ruby_vance");
  const [personaReasoning, setPersonaReasoning] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("tiktok_creator");
  const [templateReasoning, setTemplateReasoning] = useState<string>("");
  const [bespokePhotoPrompt, setBespokePhotoPrompt] = useState<string>("");
  const [bespokeVeoPrompt, setBespokeVeoPrompt] = useState<string>("");
  const [copiedPromptType, setCopiedPromptType] = useState<string | null>(null);
  const [activePromptTab, setActivePromptTab] = useState<"photo" | "video">("photo");
  const [isSaving, setIsSaving] = useState(false);

  // Roster of available anchor personas
  const personas = getAllPersonas();

  // Reset or initialize when opened
  useEffect(() => {
    if (isOpen) {
      if (productSpec.savedScript && productSpec.savedScript.scenes?.length > 0) {
        // If product already had a script, jump directly to review or allow review
        setGeneratedScript(productSpec.savedScript);
        setSelectedPersonaId(productSpec.savedScript.selectedPersonaId || "ruby_vance");
        setPersonaReasoning(productSpec.savedScript.personaReasoning || "Curated anchor persona matching product typology.");
        setSelectedTemplateId(productSpec.savedScript.recommendedTemplateId || "tiktok_creator");
        setTemplateReasoning(productSpec.savedScript.templateReasoning || "Optimized integral layout for vertical channels.");
        setBespokePhotoPrompt(productSpec.savedScript.bespokePhotoPrompt || "");
        setBespokeVeoPrompt(productSpec.savedScript.bespokeVeoPrompt || "");
        setStage("review");
      } else {
        setStage("brief");
        setGeneratedScript(null);
      }
    }
  }, [isOpen, productSpec]);

  if (!isOpen) return null;

  // Handle Channel change -> updates Aspect Ratio
  const handleChannelChange = (channelId: string) => {
    setSelectedChannel(channelId);
    const found = TARGET_CHANNELS.find((c) => c.id === channelId);
    if (found) setAspectRatio(found.ratio);
  };

  // Launch AI Storyboard Synthesis
  const handleLaunchSynthesis = async () => {
    setStage("synthesizing");
    setCurrentStepIndex(0);

    // Run step animation timer
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < SYNTHESIS_STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 900);

    try {
      const res = await fetch("/api/ecommerce/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productSpec,
          campaignId: campaignId || productSpec.id,
          archetype,
          targetChannel: selectedChannel,
          aspectRatio,
          durationSeconds: 20,
          promoCode: promoCode.trim() || undefined,
          userCreativeDirection: customDirection.trim() || undefined,
          language: targetLanguage,
          useLlm: true,
        }),
      });

      const data = await res.json();
      clearInterval(interval);

      if (!data.success || !data.script) {
        throw new Error(data.error || "Failed to synthesize storyboard");
      }

      const script: AdScript = data.script;
      setGeneratedScript(script);
      setSelectedPersonaId(script.selectedPersonaId || "ruby_vance");
      setPersonaReasoning(script.personaReasoning || "Matched by product category and audience tone.");
      setSelectedTemplateId(script.recommendedTemplateId || "tiktok_creator");
      setTemplateReasoning(script.templateReasoning || "Optimized integral canvas layout for maximum conversion.");
      setBespokePhotoPrompt(script.bespokePhotoPrompt || "");
      setBespokeVeoPrompt(script.bespokeVeoPrompt || "");

      setCurrentStepIndex(SYNTHESIS_STEPS.length - 1);
      setTimeout(() => {
        setStage("review");
        toast("✨ Storyboard Synthesized", "Gemini 2.5 Flash completed pre-production plan!", "success");
      }, 400);
    } catch (err: unknown) {
      clearInterval(interval);
      console.error("[PreProductionModal] Synthesis failed:", err);
      const errMsg = err instanceof Error ? err.message : "Could not generate storyboard";
      toast("Synthesis Failed", errMsg, "error");
      setStage("brief");
    }
  };

  // Copy prompt helper
  const handleCopyPrompt = (text: string, type: "photo" | "video") => {
    navigator.clipboard.writeText(text);
    setCopiedPromptType(type);
    toast("Copied to Clipboard", `Copied ${type === "photo" ? "Imagen 3" : "Veo"} prompt!`, "info");
    setTimeout(() => setCopiedPromptType(null), 2500);
  };

  // Update a scene in review mode
  const handleUpdateSceneHeadline = (sceneIdx: number, val: string) => {
    if (!generatedScript) return;
    const updated = { ...generatedScript };
    updated.scenes[sceneIdx].headline = val;
    setGeneratedScript(updated);
  };

  const handleUpdateSceneSpeech = (sceneIdx: number, val: string) => {
    if (!generatedScript) return;
    const updated = { ...generatedScript };
    updated.scenes[sceneIdx].voiceoverScript = val;
    setGeneratedScript(updated);
  };

  // Final Approval & Commit
  const handleApproveAndProceed = async () => {
    if (!generatedScript) return;
    setIsSaving(true);

    try {
      // Package final script with any manual edits
      const finalScript: AdScript = {
        ...generatedScript,
        selectedPersonaId,
        personaReasoning,
        recommendedTemplateId: selectedTemplateId,
        templateReasoning,
        bespokePhotoPrompt,
        bespokeVeoPrompt,
      };

      // Persist to DB
      const targetId = campaignId || productSpec.id;
      if (targetId) {
        await fetch("/api/ecommerce/products", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: targetId,
            script: finalScript,
            status: "SCRIPTED",
            presenterConfig: {
              enabled: true,
              personaId: selectedPersonaId,
              presenterName: personas.find((p) => p.id === selectedPersonaId)?.name || "Presenter",
              avatarSrc: personas.find((p) => p.id === selectedPersonaId)?.avatarUrl || "/avatars/ruby.png",
              position: "bottom_right",
              layoutMode: "bottom_right",
            },
          }),
        });
      }

      await onApproveStoryboard({
        script: finalScript,
        selectedPersonaId,
        recommendedTemplateId: selectedTemplateId,
      });

      onClose();
    } catch (err: unknown) {
      console.error("[PreProductionModal] Approval failed:", err);
      const errMsg = err instanceof Error ? err.message : "Failed to persist storyboard";
      toast("Error Saving", errMsg, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const currentPersona = personas.find((p) => p.id === selectedPersonaId);
  const currentTemplate = INTEGRAL_LAYOUT_TEMPLATES.find((t) => t.id === selectedTemplateId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
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
                  AI Storyboard Synthesizer
                </span>
              </div>
              <h2 className="text-base font-bold text-white line-clamp-1">
                {productSpec.title}
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
                1. Creative Brief
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
          {/* STAGE 1: CREATIVE BRIEF & DIRECTION                                */}
          {/* =================================================================== */}
          {stage === "brief" && (
            <div className="space-y-6">
              {/* Product Info Hero Pill */}
              <div className="p-4 rounded-2xl bg-[#14141a] border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={productSpec.assets?.[0]?.url || "/placeholder_product.png"}
                      alt={productSpec.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground">{productSpec.vendor}</div>
                    <div className="text-sm font-bold text-white line-clamp-1">{productSpec.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px] font-bold uppercase">
                        {productSpec.typology.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs font-mono font-bold text-white">
                        ${productSpec.price.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        • {productSpec.assets?.length || 0} harvested images ready
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-zinc-400 bg-white/5 p-3 rounded-xl border border-white/5 max-w-sm">
                  💡 Gemini 2.5 Flash will analyze this product, select the best matching anchor persona, assign images to scenes, and write a high-conversion video ad.
                </div>
              </div>

              {/* Harvested Product Assets Strip */}
              {productSpec.assets && productSpec.assets.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                    Available Product Assets (AI Will Curate & Map to Scenes)
                  </label>
                  <div className="flex gap-2.5 overflow-x-auto pb-2">
                    {productSpec.assets.map((asset, idx) => (
                      <div
                        key={idx}
                        className="relative w-24 h-24 rounded-xl overflow-hidden bg-black/50 border border-white/10 shrink-0 group"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={asset.url}
                          alt={`Asset ${idx}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute top-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[9px] font-mono text-cyan-300 border border-white/10">
                          #{idx}
                        </div>
                        <div className="absolute bottom-1 left-1 right-1 bg-black/80 px-1 py-0.5 rounded text-[8px] font-semibold text-zinc-300 truncate text-center">
                          {asset.type.replace(/_/g, " ")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Archetype Selector */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Select Commercial Video Archetype
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ARCHETYPES.map((arch) => {
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
                    <option value="en">English (US / Global Commercial)</option>
                    <option value="pt">Portuguese (Brasil)</option>
                  </select>
                </div>
              </div>

              {/* Creative Direction & Preset Chips */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                    Custom Creative Direction (Optional)
                  </label>
                  <span className="text-[10px] text-zinc-400">Guides tone, angle, and hooks</span>
                </div>
                <textarea
                  value={customDirection}
                  onChange={(e) => setCustomDirection(e.target.value)}
                  placeholder="e.g. Focus on pet owners dealing with muddy paws, highlight scratch resistance, use an upbeat energetic tone..."
                  rows={2}
                  className="w-full bg-[#14141a] border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 resize-none"
                />

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {PRESET_DIRECTIONS.map((preset, i) => (
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

              {/* Promo Code Input */}
              <div className="max-w-xs space-y-1">
                <label className="text-[11px] font-bold text-zinc-400">
                  Promo Code (Optional CTA badge)
                </label>
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="e.g. SAVE20 or FIRST10"
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
                  Gemini 2.5 Flash is directing an omnichannel commercial ad for {productSpec.title}
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
              {/* Banner */}
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
                      Gemini curated the anchor, integral layout, scene assets, and generative prompts for this product.
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

              {/* 3 Core Decision Cards: Persona, Template, Prompts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                
                {/* Card 1: Selected Anchor Persona */}
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
                        alt={currentPersona?.name || selectedPersonaId}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-extrabold text-white truncate">
                        {currentPersona?.name || selectedPersonaId}
                      </div>
                      <div className="text-xs text-cyan-400 font-semibold truncate">
                        {currentPersona?.title || "Anchor Host"}
                      </div>
                    </div>
                  </div>

                  {/* Persona Reasoning */}
                  {personaReasoning && (
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-[11px] text-zinc-300 leading-relaxed italic">
                      &quot;{personaReasoning}&quot;
                    </div>
                  )}

                  {/* Switch Persona Dropdown */}
                  <div className="pt-1">
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">
                      Swap Anchor Persona:
                    </label>
                    <select
                      value={selectedPersonaId}
                      onChange={(e) => setSelectedPersonaId(e.target.value)}
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

                {/* Card 2: Recommended Layout Template */}
                <div className="p-4 rounded-2xl bg-[#14141a] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Layout className="w-3.5 h-3.5 text-blue-400" />
                      Integral Canvas Layout
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                      High Impact
                    </span>
                  </div>

                  <div>
                    <div className="text-sm font-extrabold text-white">
                      {currentTemplate?.name || selectedTemplateId}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5 line-clamp-2">
                      {currentTemplate?.description}
                    </div>
                  </div>

                  {/* Template Reasoning */}
                  {templateReasoning && (
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-[11px] text-zinc-300 leading-relaxed italic">
                      &quot;{templateReasoning}&quot;
                    </div>
                  )}

                  {/* Switch Template Dropdown */}
                  <div className="pt-1">
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">
                      Swap Canvas Layout:
                    </label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      {INTEGRAL_LAYOUT_TEMPLATES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Card 3: Bespoke Generative Prompts */}
                <div className="p-4 rounded-2xl bg-[#14141a] border border-white/10 space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-purple-400" />
                        Bespoke Generative Prompts
                      </span>
                      <div className="flex gap-1 bg-black/40 p-0.5 rounded-lg border border-white/5">
                        <button
                          type="button"
                          onClick={() => setActivePromptTab("photo")}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            activePromptTab === "photo"
                              ? "bg-purple-500 text-white"
                              : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          Imagen 3
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivePromptTab("video")}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            activePromptTab === "video"
                              ? "bg-purple-500 text-white"
                              : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          Veo 8s
                        </button>
                      </div>
                    </div>

                    {activePromptTab === "photo" ? (
                      <div className="space-y-2">
                        <div className="text-[10px] font-mono text-zinc-400">
                          Google Imagen 3 • 4K Commercial Studio Packshot:
                        </div>
                        <div className="p-2.5 rounded-xl bg-black/60 border border-white/5 text-[11px] font-mono text-zinc-300 line-clamp-4 leading-relaxed">
                          {bespokePhotoPrompt || "Prompt not generated."}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyPrompt(bespokePhotoPrompt, "photo")}
                          className="w-full py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-300 flex items-center justify-center gap-1.5 border border-white/10 transition-colors"
                        >
                          {copiedPromptType === "photo" ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Imagen 3 Prompt</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-[10px] font-mono text-zinc-400">
                          Google Veo 8s • Dynamic Motion Commercial Prompt:
                        </div>
                        <div className="p-2.5 rounded-xl bg-black/60 border border-white/5 text-[11px] font-mono text-zinc-300 line-clamp-4 leading-relaxed">
                          {bespokeVeoPrompt || "Prompt not generated."}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyPrompt(bespokeVeoPrompt, "video")}
                          className="w-full py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-300 flex items-center justify-center gap-1.5 border border-white/10 transition-colors"
                        >
                          {copiedPromptType === "video" ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Veo 8s Prompt</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Scene Breakdown List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    Multi-Scene Storyboard Breakdown ({generatedScript.scenes.length} Scenes)
                  </label>
                  <span className="text-[10px] text-zinc-400">
                    Total Duration: {(generatedScript.totalFrames / 30).toFixed(1)}s • {generatedScript.totalFrames} frames
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {generatedScript.scenes.map((scene: AdScene, idx: number) => {
                    const startSec = (scene.startFrame / 30).toFixed(1);
                    const endSec = ((scene.startFrame + scene.durationFrames) / 30).toFixed(1);
                    return (
                      <div
                        key={scene.id || idx}
                        className="p-3.5 rounded-2xl bg-[#14141a] border border-white/10 space-y-3"
                      >
                        {/* Scene Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-cyan-500/20 text-cyan-300 text-xs font-black flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-white uppercase tracking-wider">
                              {scene.sceneType.replace(/_/g, " ")}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-400">
                            {startSec}s - {endSec}s ({scene.durationFrames}f)
                          </span>
                        </div>

                        {/* Mapped Media & Content */}
                        <div className="flex gap-3">
                          {/* Mapped Product Asset */}
                          <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={scene.primaryMediaUrl || "/placeholder_product.png"}
                              alt={`Scene ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-1 left-1 right-1 bg-black/80 px-1 py-0.5 rounded text-[8px] font-mono text-cyan-300 text-center truncate">
                              Mapped Asset
                            </div>
                          </div>

                          <div className="flex-1 min-w-0 space-y-1.5">
                            {/* Kinetic Headline */}
                            <div>
                              <label className="text-[9px] font-bold text-zinc-400 block">
                                Kinetic Headline
                              </label>
                              <input
                                type="text"
                                value={scene.headline || ""}
                                onChange={(e) => handleUpdateSceneHeadline(idx, e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-bold focus:outline-none focus:border-cyan-500"
                              />
                            </div>

                            {/* Voiceover Script */}
                            <div>
                              <label className="text-[9px] font-bold text-zinc-400 block">
                                Teleprompter Voiceover
                              </label>
                              <textarea
                                value={scene.voiceoverScript || ""}
                                onChange={(e) => handleUpdateSceneSpeech(idx, e.target.value)}
                                rows={2}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500 resize-none"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Action Direction */}
                        {(scene.cameraCue || scene.visualActionPrompt) && (
                          <div className="text-[10px] font-mono text-zinc-500 truncate">
                            🎬 Camera: {(scene.cameraCue || scene.visualActionPrompt).replace(/_/g, " ")}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStage("brief")}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Re-Roll with Different Direction</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleApproveAndProceed}
                    disabled={isSaving}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-black text-sm flex items-center gap-2 shadow-xl shadow-emerald-500/25 transition-all transform hover:scale-[1.02] disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Persisting Storyboard...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Approve & Open Video Editor →</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

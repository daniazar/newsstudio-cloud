"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  Shirt,
  Scissors,
  Layers,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Eye,
  Tag,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BlueprintItem, BlueprintType } from "@/lib/wardrobe/blueprintTypes";

export interface AiBlueprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: BlueprintType;
  currentPersonaGender?: string;
  onAddToCatalogAndTryOn: (blueprint: BlueprintItem, tryOn: boolean) => void;
}

const INSPIRATION_PROMPTS: Record<BlueprintType, string[]> = {
  attire: [
    "Emerald velvet tuxedo blazer with satin shawl lapel and tailored slim trousers",
    "Midnight blue silk keyhole halter evening gown with crystal waistband",
    "Bespoke charcoal pinstripe three-piece suit with peak lapels and silk pocket square",
    "Modular cyber techwear anorak with magnetic utility buckles and waterproof cargo pants",
    "Champagne charmeuse tie-neck blouse with high-waisted ivory crepe trousers",
    "Oxblood corded lace cocktail sheath dress with scalloped hemline",
  ],
  hair: [
    "Cyberpunk asymmetric bob with lavender micro-bangs and razor-sharp perimeter",
    "Honey blonde structured blunt lob with golden butter highlights and side parting",
    "Voluminous copper Hollywood waves with deep side sweep and mirror gloss luster",
    "Textured bronze curly shag with soft curtain bangs and dimensional ringlets",
    "Nordic platinum ice sleek high ponytail with mirror finish wrap",
    "Charcoal executive taper fade with textured crop on top and crisp hairline",
  ],
};

const ATTIRE_CATEGORIES = [
  { id: "broadcast", label: "🎙️ Prime Broadcast" },
  { id: "gala", label: "✨ Evening Gala" },
  { id: "executive", label: "💼 Executive" },
  { id: "casual", label: "☕ Casual Chic" },
  { id: "techwear", label: "🚀 Techwear" },
  { id: "edgy", label: "🖤 Edgy Leather" },
];

const HAIR_CATEGORIES = [
  { id: "broadcast_anchor", label: "🎙️ Broadcast Anchor" },
  { id: "executive_sleek", label: "💼 Executive Sleek" },
  { id: "editorial_gala", label: "✨ Editorial Gala" },
  { id: "modern_casual", label: "☕ Modern Casual" },
  { id: "bold_avantgarde", label: "⚡ Avant-Garde" },
  { id: "textured_curls", label: "🌀 Textured Curls" },
];

export const AiBlueprintModal = React.memo(function AiBlueprintModal({
  isOpen,
  onClose,
  initialType = "attire",
  currentPersonaGender,
  onAddToCatalogAndTryOn,
}: AiBlueprintModalProps) {
  const [type, setType] = useState<BlueprintType>(initialType);
  const [prompt, setPrompt] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [gender, setGender] = useState<"women" | "men" | "unisex">("unisex");
  const [category, setCategory] = useState<string>("broadcast");

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>("");
  const [generatedBlueprint, setGeneratedBlueprint] = useState<BlueprintItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sync initial configuration on open
  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      setCategory(initialType === "hair" ? "broadcast_anchor" : "broadcast");
      if (currentPersonaGender === "female") {
        setGender("women");
      } else if (currentPersonaGender === "male") {
        setGender("men");
      } else {
        setGender("unisex");
      }
      setGeneratedBlueprint(null);
      setError(null);
    }
  }, [isOpen, initialType, currentPersonaGender]);

  if (!isOpen) return null;

  const handleTypeChange = (newType: BlueprintType) => {
    setType(newType);
    setCategory(newType === "hair" ? "broadcast_anchor" : "broadcast");
    setGeneratedBlueprint(null);
    setError(null);
  };

  const handleApplyInspiration = (chipPrompt: string) => {
    setPrompt(chipPrompt);
    setError(null);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || prompt.trim().length < 3) {
      setError("Please describe the desired style in at least 3 characters.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedBlueprint(null);

    // Progressive step simulation for user feedback
    setGenerationStep("Compiling 4-Panel Canonical Broadcast Blueprint Prompt...");
    const stepTimer1 = setTimeout(() => {
      setGenerationStep("Synthesizing High-Fashion Neutral Studio Reference Plate...");
    }, 1200);

    const stepTimer2 = setTimeout(() => {
      setGenerationStep("Extracting SAM 3.1 & GroundingDINO Semantic Tracking Tokens...");
    }, 2800);

    try {
      const response = await fetch("/api/wardrobe/blueprint/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          type,
          gender,
          category,
          name: name.trim() || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success || !data.blueprint) {
        throw new Error(data.error || "Failed to generate AI master blueprint.");
      }

      setGeneratedBlueprint(data.blueprint);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      setError(msg);
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setIsGenerating(false);
      setGenerationStep("");
    }
  };

  const handleReset = () => {
    setGeneratedBlueprint(null);
    setError(null);
    setPrompt("");
    setName("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="bg-surface border border-border/80 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/80 flex items-center justify-between bg-surface-raised/80">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#10b981]" />
            <div>
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-emerald-400" />
                <span>AI Text-to-Blueprint Generator</span>
              </h3>
              <p className="text-[10px] font-mono text-muted">
                Canonical 4-Panel Broadcast Master Reference Plate
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-muted hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-5 flex-1">
          {generatedBlueprint ? (
            /* ========================================================= */
            /* INSPECTOR VIEW: Generated 4-Panel Master Blueprint Plate  */
            /* ========================================================= */
            <div className="flex flex-col gap-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold">
                      ✓ Master Blueprint Ready
                    </span>
                    <span className="text-[10px] font-mono text-muted">
                      Engine: <span className="text-purple-300 font-bold">{generatedBlueprint.engineUsed.toUpperCase()}</span>
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-foreground mt-1">
                    {generatedBlueprint.name}
                  </h4>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleReset}
                  className="font-mono text-xs text-muted hover:text-white"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  <span>Generate Another</span>
                </Button>
              </div>

              {/* Master 4-Panel Image Preview Plate */}
              <div className="relative rounded-2xl overflow-hidden border border-purple-500/40 bg-black/60 shadow-xl group aspect-video">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={generatedBlueprint.imageUrl}
                  alt={generatedBlueprint.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 flex items-center justify-between text-[11px] font-mono text-white/90">
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    <span>4-Angle Reference Plate</span>
                  </span>
                  <span className="text-[10px] text-muted font-bold uppercase">
                    {generatedBlueprint.type} • {generatedBlueprint.gender}
                  </span>
                </div>
              </div>

              {/* 4-Panel Technical Breakdown */}
              <div className="grid grid-cols-2 gap-2">
                {generatedBlueprint.panels.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-surface-raised/60 border border-border/80 flex flex-col gap-1 text-[11px]"
                  >
                    <span className="font-mono font-bold text-purple-300">
                      {idx === 0 ? "📐 Panel 1: Front" : idx === 1 ? "🔄 Panel 2: 45° Side" : idx === 2 ? "🔙 Panel 3: Back" : "🔍 Panel 4: Macro"}
                    </span>
                    <span className="text-muted text-[10px] leading-relaxed line-clamp-2">
                      {p}
                    </span>
                  </div>
                ))}
              </div>

              {/* Auto-Generated SAM 3.1 Tokens */}
              <div className="p-3.5 rounded-2xl bg-surface-raised/40 border border-border/80 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-foreground flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-purple-400" />
                    <span>Auto-Generated SAM 3.1 Tracking Tokens</span>
                  </span>
                  <span className="text-[10px] font-mono text-muted">Sub-Pixel Boundary Lock</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {generatedBlueprint.samPrompt.split(",").map((token, tIdx) => (
                    <span
                      key={tIdx}
                      className="px-2 py-0.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-200 text-[10px] font-mono font-bold"
                    >
                      {token.trim()}
                    </span>
                  ))}
                </div>
              </div>

              {/* Inspector Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/60">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onAddToCatalogAndTryOn(generatedBlueprint, false)}
                  className="font-mono text-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-muted" />
                  <span>Add to Catalog Only</span>
                </Button>

                <Button
                  size="sm"
                  variant="emerald-glow"
                  onClick={() => onAddToCatalogAndTryOn(generatedBlueprint, true)}
                  className="font-mono text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Add to Catalog & Try On</span>
                </Button>
              </div>
            </div>
          ) : (
            /* ========================================================= */
            /* INPUT FORM VIEW: Natural Language Prompt & Configuration */
            /* ========================================================= */
            <form onSubmit={handleGenerate} className="flex flex-col gap-4">
              {/* Type Switcher: Attire vs Hairstyle */}
              <div className="flex items-center p-1 rounded-2xl bg-black/40 border border-border/80">
                <button
                  type="button"
                  onClick={() => handleTypeChange("attire")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                    type === "attire"
                      ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                      : "text-muted hover:text-white"
                  }`}
                >
                  <Shirt className="w-4 h-4" />
                  <span>Custom Attire Blueprint</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange("hair")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                    type === "hair"
                      ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                      : "text-muted hover:text-white"
                  }`}
                >
                  <Scissors className="w-4 h-4" />
                  <span>Custom Hairstyle Blueprint</span>
                </button>
              </div>

              {/* Natural Language Prompt */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold text-foreground">
                    Natural Language Description Prompt
                  </label>
                  <span className="text-[10px] font-mono text-purple-400">
                    {type === "attire" ? "Invisible ghost mannequin" : "Ghost mannequin head"}
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    type === "attire"
                      ? "e.g. Emerald velvet tuxedo blazer with satin shawl lapel, gold crest buttons, and tailored black crepe trousers..."
                      : "e.g. Cyberpunk asymmetric bob with lavender micro-bangs, razor-sharp perimeter, and dimensional silver undertones..."
                  }
                  required
                  disabled={isGenerating}
                  className="bg-surface-raised border border-border/80 rounded-2xl p-3 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-purple-500 font-sans leading-relaxed resize-none transition-all"
                />
              </div>

              {/* Inspiration Chips */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-mono text-muted uppercase tracking-wider">
                  Quick Inspiration:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {INSPIRATION_PROMPTS[type].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyInspiration(chip)}
                      className="px-2.5 py-1 rounded-xl bg-surface-raised border border-border/80 text-[10px] font-sans text-muted hover:text-white hover:border-purple-500/50 text-left transition-colors cursor-pointer"
                    >
                      &ldquo;{chip}&rdquo;
                    </button>
                  ))}
                </div>
              </div>

              {/* Style Name (Optional), Gender & Category Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono font-bold text-foreground">Custom Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Auto-derived if blank"
                    disabled={isGenerating}
                    className="bg-surface-raised border border-border/80 rounded-xl px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono font-bold text-foreground">Gender Silhouette</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as "women" | "men" | "unisex")}
                    disabled={isGenerating}
                    className="bg-surface-raised border border-border/80 rounded-xl px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-purple-500"
                  >
                    <option value="women">🎙️ Women</option>
                    <option value="men">👔 Men</option>
                    <option value="unisex">🧥 Unisex</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono font-bold text-foreground">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={isGenerating}
                    className="bg-surface-raised border border-border/80 rounded-xl px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-purple-500"
                  >
                    {(type === "attire" ? ATTIRE_CATEGORIES : HAIR_CATEGORIES).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Progress & Error Feedback */}
              {isGenerating && (
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center gap-3 animate-in fade-in">
                  <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin shrink-0" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-mono font-bold text-purple-200">
                      Generating Canonical 4-Panel Master Blueprint...
                    </span>
                    <span className="text-[11px] font-mono text-purple-300/80">
                      {generationStep}
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center gap-2.5 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Canonical Spec Banner */}
              <div className="p-3 rounded-2xl bg-surface-raised/40 border border-border/80 flex items-start gap-2 text-[10px] text-muted font-mono leading-relaxed">
                <Layers className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  The generator automatically compiles a canonical 4-subpanel vertical layout: <strong>Direct Front View</strong>, <strong>45° Profile</strong>, <strong>Rear Tailoring</strong>, and <strong>Extreme Macro Texture</strong> against a neutral high-fashion studio backdrop with zero text/watermarks.
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isGenerating}
                  className="px-4 py-2 rounded-xl text-xs font-mono font-bold text-muted hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  size="sm"
                  variant="emerald-glow"
                  isLoading={isGenerating}
                  className="font-mono text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                  <span>{isGenerating ? "Synthesizing Blueprint..." : "Synthesize Master Blueprint"}</span>
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
});

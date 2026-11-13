"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import {
  Search,
  X,
  UserCheck,
  Sparkles,
  Scissors,
  Check,
  ArrowRight,
  Lock,
  Layers,
} from "lucide-react";
import { PERSONAS, Persona, getPersonaById } from "@/lib/tts/personas";
import { MorphologyPolicy, SleeveStyleOption } from "./types";

export interface PersonaSwapSelectorProps {
  targetPersonaId: string;
  onTargetPersonaSelect: (personaId: string) => void;
  keepOriginalHair: boolean;
  onKeepOriginalHairChange: (keepOriginalHair: boolean) => void;
  morphologyPolicy?: MorphologyPolicy;
  onMorphologyPolicyChange?: (policy: MorphologyPolicy) => void;
  sleeveStyle?: SleeveStyleOption;
  onSleeveStyleChange?: (style: SleeveStyleOption) => void;
  sourcePersonaName?: string;
  sourcePersonaId?: string;
  sourceGarment?: string;
}

export const PersonaSwapSelector = React.memo(function PersonaSwapSelector({
  targetPersonaId,
  onTargetPersonaSelect,
  keepOriginalHair,
  onKeepOriginalHairChange,
  morphologyPolicy = "strict_garment",
  onMorphologyPolicyChange,
  sleeveStyle = "auto",
  onSleeveStyleChange,
  sourcePersonaName = "Source Anchor",
  sourcePersonaId,
  sourceGarment = "tailored broadcast outfit",
}: PersonaSwapSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGender, setSelectedGender] = useState<"all" | "female" | "male">("all");

  // Filter available personas (excluding the current source persona if matching ID)
  const filteredPersonas = useMemo(() => {
    return PERSONAS.filter((p) => {
      // Don't show the exact same anchor as target if source is known
      if (sourcePersonaId && p.id.toLowerCase() === sourcePersonaId.toLowerCase()) {
        return false;
      }
      if (selectedGender !== "all" && p.gender !== selectedGender) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        p.name.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        (p.traits?.hair && p.traits.hair.toLowerCase().includes(q)) ||
        (p.traits?.skinTone && p.traits.skinTone.toLowerCase().includes(q)) ||
        p.id.toLowerCase().includes(q)
      );
    });
  }, [sourcePersonaId, selectedGender, searchQuery]);

  const activePersona: Persona | undefined = useMemo(() => {
    const match = filteredPersonas.find(
      (p) => p.id.toLowerCase() === targetPersonaId.toLowerCase()
    );
    if (match) return match;

    return filteredPersonas[0] || getPersonaById(targetPersonaId) || PERSONAS[0];
  }, [targetPersonaId, filteredPersonas]);

  React.useEffect(() => {
    if (activePersona && activePersona.id.toLowerCase() !== targetPersonaId.toLowerCase() && filteredPersonas.length > 0) {
      onTargetPersonaSelect(activePersona.id);
    }
  }, [activePersona, targetPersonaId, filteredPersonas.length, onTargetPersonaSelect]);

  return (
    <div className="flex flex-col gap-3 p-3 bg-surface-raised/40 rounded-xl border border-border/80">
      {/* Section Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-[11px] font-mono font-bold text-amber-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Select Target Persona Identity ({filteredPersonas.length})</span>
        </span>
        <span className="text-[10px] font-mono text-muted">
          Active:{" "}
          <span className="text-amber-300 font-bold">
            {activePersona ? activePersona.name : "None selected"}
          </span>
        </span>
      </div>

      {/* Identity Transference Concept Banner */}
      <div
        data-testid="persona-swap-banner"
        className="p-2.5 rounded-lg bg-gradient-to-r from-purple-950/40 via-amber-950/20 to-purple-950/40 border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="flex items-center gap-1 text-purple-300 font-bold">
            <span className="px-1.5 py-0.5 rounded bg-purple-500/20 border border-purple-500/40">
              {sourcePersonaName}
            </span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <div className="flex items-center gap-1 text-amber-300 font-bold">
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40">
              {activePersona?.name || "Target Anchor"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-muted shrink-0">
          <span
            className="flex items-center gap-1 text-emerald-400"
            title={`Preserved garment: ${sourceGarment}`}
          >
            <Lock className="w-3 h-3" />
            <span>100% Outfit & Motion Locked</span>
          </span>
          <span className="hidden md:inline">•</span>
          <span className="flex items-center gap-1 text-purple-300 hidden md:flex">
            <Layers className="w-3 h-3" />
            <span>Head/Face Swapped</span>
          </span>
        </div>
      </div>

      {/* Hair Transfer Mode Toggle */}
      <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-surface border border-border/70">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted flex items-center gap-1">
            <Scissors className="w-3 h-3 text-purple-400" />
            <span>Hairstyle Transfer Policy</span>
          </span>
          <span className="text-[9px] font-mono text-muted">
            {keepOriginalHair ? "Preserving source silhouette" : "Adopting target signature hair"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => onKeepOriginalHairChange(false)}
            aria-pressed={!keepOriginalHair}
            className={`p-2 rounded-lg text-left transition-all border flex items-start gap-2 cursor-pointer ${
              !keepOriginalHair
                ? "bg-purple-600/15 border-purple-500 text-white shadow-sm"
                : "bg-surface-raised/60 border-border/60 text-muted hover:text-foreground hover:bg-surface-raised"
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full border mt-0.5 shrink-0 flex items-center justify-center ${
                !keepOriginalHair
                  ? "border-purple-400 bg-purple-500 text-white"
                  : "border-border/80"
              }`}
            >
              {!keepOriginalHair && <Check className="w-2.5 h-2.5" />}
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-mono font-bold text-foreground">
                Adopt Target Persona Hair (Default)
              </span>
              <span className="text-[9px] font-mono text-muted leading-tight mt-0.5">
                Swaps head, facial geometry, AND injects {activePersona?.name || "target"}&apos;s signature hairstyle.
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onKeepOriginalHairChange(true)}
            aria-pressed={keepOriginalHair}
            className={`p-2 rounded-lg text-left transition-all border flex items-start gap-2 cursor-pointer ${
              keepOriginalHair
                ? "bg-purple-600/15 border-purple-500 text-white shadow-sm"
                : "bg-surface-raised/60 border-border/60 text-muted hover:text-foreground hover:bg-surface-raised"
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full border mt-0.5 shrink-0 flex items-center justify-center ${
                keepOriginalHair
                  ? "border-purple-400 bg-purple-500 text-white"
                  : "border-border/80"
              }`}
            >
              {keepOriginalHair && <Check className="w-2.5 h-2.5" />}
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-mono font-bold text-foreground">
                Retain Source Video Hair Silhouette
              </span>
              <span className="text-[9px] font-mono text-muted leading-tight mt-0.5">
                Pixel-locks the source anchor&apos;s haircut and volume, only inpainting face, eyes, and skin tone.
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Body Build & Attire Adaptation Policy Selector */}
      <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-surface border border-border/70">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Biometric Morphology &amp; Bust Adaptation</span>
          </span>
          <span className="text-[9px] font-mono text-muted">
            {morphologyPolicy === "adapt_persona_attire"
              ? `Adapting body &amp; attire to ${activePersona?.name || "target"} (${activePersona?.gender === "male" ? "Masculine executive suit" : "Signature blazer"})`
              : morphologyPolicy === "biometric_adaptation"
              ? `Biometric adaptation: re-contouring bust/chest to ${activePersona?.name || "target"}'s build`
              : "Strict garment cut &amp; bust silhouette locked"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
          {/* Option 1: Adapt Body & Signature Attire */}
          <button
            type="button"
            onClick={() => onMorphologyPolicyChange?.("adapt_persona_attire")}
            aria-pressed={morphologyPolicy === "adapt_persona_attire"}
            className={`p-2 rounded-lg text-left transition-all border flex items-start gap-2 cursor-pointer ${
              morphologyPolicy === "adapt_persona_attire"
                ? "bg-amber-600/15 border-amber-500 text-white shadow-sm ring-1 ring-amber-500/50"
                : "bg-surface-raised/60 border-border/60 text-muted hover:text-foreground hover:bg-surface-raised"
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full border mt-0.5 shrink-0 flex items-center justify-center ${
                morphologyPolicy === "adapt_persona_attire"
                  ? "border-amber-400 bg-amber-500 text-black"
                  : "border-border/80"
              }`}
            >
              {morphologyPolicy === "adapt_persona_attire" && <Check className="w-2.5 h-2.5" />}
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-mono font-bold text-foreground flex items-center gap-1">
                <span>✨ Adapt Body &amp; Attire</span>
                <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  New
                </span>
              </span>
              <span className="text-[9px] font-mono text-muted leading-tight mt-0.5">
                Adapts body build, chest, and clothing to match {activePersona?.name || "target"}&apos;s gender &amp; signature attire ({activePersona?.traits?.defaultAttire || "Tailored suit"}). Eliminates cross-gender dress mismatch.
              </span>
            </div>
          </button>

          {/* Option 2: Strict Garment Lock */}
          <button
            type="button"
            onClick={() => onMorphologyPolicyChange?.("strict_garment")}
            aria-pressed={morphologyPolicy === "strict_garment"}
            className={`p-2 rounded-lg text-left transition-all border flex items-start gap-2 cursor-pointer ${
              morphologyPolicy === "strict_garment"
                ? "bg-amber-600/15 border-amber-500 text-white shadow-sm"
                : "bg-surface-raised/60 border-border/60 text-muted hover:text-foreground hover:bg-surface-raised"
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full border mt-0.5 shrink-0 flex items-center justify-center ${
                morphologyPolicy === "strict_garment"
                  ? "border-amber-400 bg-amber-500 text-black"
                  : "border-border/80"
              }`}
            >
              {morphologyPolicy === "strict_garment" && <Check className="w-2.5 h-2.5" />}
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-mono font-bold text-foreground flex items-center gap-1">
                <span>🔒 Strict Garment Lock</span>
              </span>
              <span className="text-[9px] font-mono text-muted leading-tight mt-0.5">
                Locks 100% of dress boning, bust contours, tailored silhouette, and cleavage from source loop.
              </span>
            </div>
          </button>

          {/* Option 3: Biometric Silhouette Adaptation */}
          <button
            type="button"
            onClick={() => onMorphologyPolicyChange?.("biometric_adaptation")}
            aria-pressed={morphologyPolicy === "biometric_adaptation"}
            className={`p-2 rounded-lg text-left transition-all border flex items-start gap-2 cursor-pointer ${
              morphologyPolicy === "biometric_adaptation"
                ? "bg-amber-600/15 border-amber-500 text-white shadow-sm"
                : "bg-surface-raised/60 border-border/60 text-muted hover:text-foreground hover:bg-surface-raised"
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full border mt-0.5 shrink-0 flex items-center justify-center ${
                morphologyPolicy === "biometric_adaptation"
                  ? "border-amber-400 bg-amber-500 text-black"
                  : "border-border/80"
              }`}
            >
              {morphologyPolicy === "biometric_adaptation" && <Check className="w-2.5 h-2.5" />}
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-mono font-bold text-foreground flex items-center gap-1">
                <span>✨ Biometric Morphology Adaptation</span>
              </span>
              <span className="text-[9px] font-mono text-muted leading-tight mt-0.5">
                Adapts bust volume and decolletage to match {activePersona?.name || "target"}&apos;s physique ({activePersona?.traits?.build || "Athletic"}).
              </span>
            </div>
          </button>
        </div>

        {/* Sleeve Tailoring Coverage (Rendered when morphologyPolicy === "adapt_persona_attire") */}
        {morphologyPolicy === "adapt_persona_attire" && (
          <div className="mt-2 pt-2 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <span className="text-[10px] font-mono font-semibold text-muted flex items-center gap-1">
              <span>🧥 Sleeve Tailoring:</span>
              <span className="text-[9px] text-amber-300 font-normal">
                {sleeveStyle === "full_sleeves"
                  ? "Full suit jacket sleeves (covers arms down to wrists, shirt cuffs visible)"
                  : sleeveStyle === "sleeveless"
                  ? "Sleeveless (preserves bare arms from source video)"
                  : activePersona?.gender === "male" || /suit|blazer|jacket|shirt/i.test(activePersona?.traits?.defaultAttire || "")
                  ? "Auto-Detected: Full long sleeves (for tailored suit/blazer)"
                  : "Auto-Detected: Sleeveless (matching source loop)"}
              </span>
            </span>

            <div className="flex items-center gap-1 bg-surface-raised/80 p-0.5 rounded border border-border/60">
              <button
                type="button"
                onClick={() => onSleeveStyleChange?.("auto")}
                aria-pressed={sleeveStyle === "auto"}
                className={`px-2 py-0.5 text-[9px] font-mono rounded transition-colors ${
                  sleeveStyle === "auto"
                    ? "bg-amber-500 text-black font-bold"
                    : "text-muted hover:text-foreground"
                }`}
              >
                ⚡ Auto
              </button>
              <button
                type="button"
                onClick={() => onSleeveStyleChange?.("full_sleeves")}
                aria-pressed={sleeveStyle === "full_sleeves"}
                className={`px-2 py-0.5 text-[9px] font-mono rounded transition-colors ${
                  sleeveStyle === "full_sleeves"
                    ? "bg-amber-500 text-black font-bold"
                    : "text-muted hover:text-foreground"
                }`}
              >
                🧥 Full Sleeves
              </button>
              <button
                type="button"
                onClick={() => onSleeveStyleChange?.("sleeveless")}
                aria-pressed={sleeveStyle === "sleeveless"}
                className={`px-2 py-0.5 text-[9px] font-mono rounded transition-colors ${
                  sleeveStyle === "sleeveless"
                    ? "bg-amber-500 text-black font-bold"
                    : "text-muted hover:text-foreground"
                }`}
              >
                🎽 Sleeveless
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
        {/* Gender Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={() => setSelectedGender("all")}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold whitespace-nowrap transition-all ${
              selectedGender === "all"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-surface-raised border border-border/80 text-muted hover:text-white"
            }`}
          >
            🌟 All ({PERSONAS.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedGender("female")}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold whitespace-nowrap transition-all ${
              selectedGender === "female"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-surface-raised border border-border/80 text-muted hover:text-white"
            }`}
          >
            🎙️ Female Anchors
          </button>
          <button
            type="button"
            onClick={() => setSelectedGender("male")}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold whitespace-nowrap transition-all ${
              selectedGender === "male"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-surface-raised border border-border/80 text-muted hover:text-white"
            }`}
          >
            👔 Male Anchors
          </button>
        </div>

        {/* Search input */}
        <div className="relative shrink-0 w-full sm:w-48">
          <Search className="w-3 h-3 text-muted absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search personas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search target personas"
            className="w-full bg-surface-raised border border-border/80 rounded-lg pl-6 pr-5 py-1 text-[10px] text-foreground placeholder:text-muted focus:outline-none focus:border-amber-500 font-mono"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              aria-label="Clear persona search"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted hover:text-white"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>

      {/* Personas Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 overflow-y-auto max-h-[300px] pr-1">
        {filteredPersonas.length === 0 ? (
          <div className="col-span-full p-6 text-center text-muted font-mono text-[10px]">
            No personas found matching &ldquo;{searchQuery}&rdquo;
          </div>
        ) : (
          filteredPersonas.map((persona) => {
            const isSelected = activePersona?.id === persona.id;
            const hairSnippet = persona.traits?.hair || "Styled hair";
            const skinTone = persona.traits?.skinTone || "Fair skin";

            return (
              <div
                key={persona.id}
                data-persona-id={persona.id}
                role="button"
                tabIndex={0}
                onClick={() => onTargetPersonaSelect(persona.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onTargetPersonaSelect(persona.id);
                  }
                }}
                className={`relative flex flex-col rounded-xl overflow-hidden border p-2 text-left transition-all cursor-pointer select-none group ${
                  isSelected
                    ? "bg-gradient-to-b from-amber-500/20 to-purple-950/40 border-amber-400 shadow-md shadow-amber-500/20 ring-1 ring-amber-400/50"
                    : "bg-surface border-border/70 hover:border-purple-500/60 hover:bg-surface-raised"
                }`}
              >
                {/* Selection Check Badge */}
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 z-10 w-4 h-4 rounded-full bg-amber-400 text-black flex items-center justify-center shadow">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}

                {/* Avatar Portrait */}
                <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-black/40 mb-2 border border-border/50">
                  {persona.avatarUrl ? (
                    <Image
                      src={persona.avatarUrl}
                      alt={persona.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        // Fallback on image error
                        const target = e.currentTarget;
                        target.style.display = "none";
                      }}
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />

                  {/* Gender & Age Pill */}
                  <div className="absolute bottom-1 left-1 flex items-center gap-1">
                    <span className="px-1 py-0.2 rounded bg-black/70 border border-white/10 text-[9px] font-mono text-white/90">
                      {persona.gender === "female" ? "♀" : "♂"} {persona.traits?.age ? `${persona.traits.age}y` : ""}
                    </span>
                    <span className="px-1 py-0.2 rounded bg-purple-900/70 border border-purple-400/30 text-[9px] font-mono text-purple-200 uppercase">
                      {persona.language}
                    </span>
                  </div>
                </div>

                {/* Identity Info */}
                <div className="flex flex-col gap-0.5">
                  <h4 className="text-[11px] font-mono font-bold text-foreground truncate group-hover:text-amber-300 transition-colors">
                    {persona.name}
                  </h4>
                  <p className="text-[9px] font-mono text-muted truncate">
                    {persona.title}
                  </p>

                  {/* Physical Traits Pills */}
                  <div className="flex flex-col gap-1 mt-1 text-[9px] font-mono text-subtle">
                    <div className="flex items-center gap-1 truncate text-amber-200/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span className="truncate">{skinTone}</span>
                    </div>
                    <div className="flex items-center gap-1 truncate text-purple-200/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                      <span className="truncate" title={hairSnippet}>
                        {hairSnippet}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Target Preview Confirmation Card */}
      {activePersona && (
        <div className="p-2 rounded-lg bg-surface border border-amber-500/40 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] font-mono font-bold text-foreground">
                Target: {activePersona.name} ({activePersona.gender === "female" ? "Female" : "Male"}, {activePersona.traits?.age || 30}y, {activePersona.traits?.build || "Athletic"})
              </span>
              <span className="text-[9px] font-mono text-muted">
                {keepOriginalHair
                  ? "Preserving source hair. "
                  : `Signature hair: ${activePersona.traits?.hair?.substring(0, 45)}... `}
                {morphologyPolicy === "biometric_adaptation"
                  ? `• Biometric adaptation: re-contouring bust/chest to ${activePersona.traits?.build || "athletic build"}`
                  : "• Strict garment cut & bust silhouette locked"}
              </span>
            </div>
          </div>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 whitespace-nowrap shrink-0">
            Ready to Transfer
          </span>
        </div>
      )}
    </div>
  );
});

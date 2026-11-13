"use client";

import React from "react";
import { X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface CustomAttireFormState {
  name: string;
  description: string;
  gender: "female" | "male" | "unisex";
  category: "broadcast" | "gala" | "edgy" | "casual" | "techwear" | "executive";
  samPrompt: string;
}

export interface CustomAttireModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: CustomAttireFormState;
  setForm: React.Dispatch<React.SetStateAction<CustomAttireFormState>>;
  isCreating: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const CustomAttireModal = React.memo(function CustomAttireModal({
  isOpen,
  onClose,
  form,
  setForm,
  isCreating,
  onSubmit,
}: CustomAttireModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-surface border border-border/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="p-4 border-b border-border/80 flex items-center justify-between bg-surface-raised">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse shadow-[0_0_8px_#a855f7]" />
            <h3 className="text-sm font-mono font-bold uppercase text-foreground">
              Custom Attire Creator
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-muted hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={onSubmit} className="p-5 flex flex-col gap-4">
          <p className="text-xs text-muted leading-relaxed">
            Describe an attire. The system compiles a 4-panel multi-view reference plate (Front, Side, Back, Macro Accessories) on a pure green chroma wall, generates it via <span className="text-purple-300 font-mono font-bold">Gemini API / AGY CLI</span> (resolved by env variables), and registers it into the database for <span className="text-purple-300 font-bold">all personas</span>.
          </p>

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono font-bold text-foreground">Attire Name</label>
            <input
              type="text"
              placeholder="e.g. Royal Emerald Velvet Blazer Dress"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
              className="bg-surface-raised border border-border/80 rounded-xl px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted focus:outline-none focus:border-purple-500 transition-all"
            />
          </div>

          {/* Gender & Category Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono font-bold text-foreground">Gender Suitability</label>
              <select
                value={form.gender}
                onChange={(e) => setForm((prev) => ({ ...prev, gender: e.target.value as "female" | "male" | "unisex" }))}
                className="bg-surface-raised border border-border/80 rounded-xl px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-purple-500"
              >
                <option value="female">🎙️ Female</option>
                <option value="male">👔 Male</option>
                <option value="unisex">🧥 Unisex</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono font-bold text-foreground">Broadcast Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value as "broadcast" | "gala" | "edgy" | "casual" | "techwear" | "executive" }))}
                className="bg-surface-raised border border-border/80 rounded-xl px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-purple-500"
              >
                <option value="broadcast">🎙️ Prime Broadcast</option>
                <option value="gala">✨ Evening Gala</option>
                <option value="executive">💼 Executive</option>
                <option value="casual">☕ Casual Chic</option>
                <option value="techwear">🚀 Techwear</option>
                <option value="edgy">🖤 Edgy Leather</option>
              </select>
            </div>
          </div>

          {/* Description Prompt */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold text-foreground">Garment Description</label>
              <span className="text-[10px] font-mono text-purple-400">Pure ghost mannequin (no face/skin)</span>
            </div>
            <textarea
              rows={3}
              placeholder="e.g. Tailored emerald green cotton velvet blazer dress with peak lapels, gold crest buttons, and black silk camisole underneath"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              required
              className="bg-surface-raised border border-border/80 rounded-xl p-3 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-purple-500 font-sans leading-relaxed resize-none"
            />
          </div>

          {/* Optional SAM Prompt */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold text-muted">
                SAM 3.1 Segmentation Targets (Optional)
              </label>
              <span className="text-[10px] font-mono text-purple-400">
                🧠 Auto-derived via Vision LLM if blank
              </span>
            </div>
            <input
              type="text"
              placeholder="e.g. clothing, blazer dress, lapel, buttons (or leave blank for Vision LLM)"
              value={form.samPrompt}
              onChange={(e) => setForm((prev) => ({ ...prev, samPrompt: e.target.value }))}
              className="bg-surface-raised border border-border/80 rounded-xl px-3 py-1.5 text-xs font-mono text-foreground placeholder:text-muted focus:outline-none focus:border-purple-500"
            />
            <p className="text-[10px] text-muted leading-relaxed">
              When left blank, Gemini 2.5 Flash Vision automatically reads the synthesized 4-panel plate image, identifies all garments/trims, and formulates the SAM 3.1 & GroundingDINO segmentation prompt.
            </p>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="px-4 py-2 rounded-xl text-xs font-mono font-bold text-muted hover:text-white transition-colors"
            >
              Cancel
            </button>
            <Button
              type="submit"
              size="sm"
              variant="emerald-glow"
              isLoading={isCreating}
              className="font-mono text-xs flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isCreating ? "Synthesizing 4-View Plate..." : "Synthesize Plate & Add to DB"}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
});

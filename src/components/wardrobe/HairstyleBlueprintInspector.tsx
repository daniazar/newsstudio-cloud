"use client";

import React from "react";
import { Sparkles, Brain, CheckCircle2, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LazyThumbnail } from "./LazyThumbnail";
import {
  HairStyleItem,
  HairColorSwatch,
  getSwatchCssBackground,
} from "@/lib/wardrobe/hairCatalog";
import { SalonColorSelector } from "./SalonColorSelector";
import { getColorFamilyHex } from "./types";
import { useToast } from "@/components/global/ToastContainer";

export interface HairstyleBlueprintInspectorProps {
  hairstyle: HairStyleItem;
  selectedSwatch: HairColorSwatch | null;
  onSwatchSelect: (swatch: HairColorSwatch) => void;
  onResetSwatch: () => void;
  onInpaintTrigger: (hair: HairStyleItem) => void;
}

export const HairstyleBlueprintInspector = React.memo(function HairstyleBlueprintInspector({
  hairstyle,
  selectedSwatch,
  onSwatchSelect,
  onResetSwatch,
  onInpaintTrigger,
}: HairstyleBlueprintInspectorProps) {
  const { toast } = useToast();

  const activeColorHex = selectedSwatch ? selectedSwatch.hex : getColorFamilyHex(hairstyle.colorFamily);
  const activeColorName = selectedSwatch ? selectedSwatch.name : hairstyle.hairColor;

  return (
    <div className="w-full xl:w-[420px] xl:border-l border-t xl:border-t-0 border-border/80 bg-surface/80 p-4 xl:p-6 overflow-y-auto flex flex-col gap-5 shrink-0">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-mono uppercase tracking-widest text-purple-400 font-bold">
            Hairstyle Technical Blueprint
          </span>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
            ComfyUI Wan 2.1 Ready
          </span>
        </div>
        <h3 className="text-lg font-bold text-foreground">{hairstyle.name}</h3>
        <p className="text-xs text-muted mt-1 leading-relaxed">{hairstyle.description}</p>
      </div>

      {/* 4-Panel Master Blueprint View */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-foreground">
            4-Angle Technical Plate (Pure Chroma #00FF00)
          </span>
          <span className="text-[9px] font-mono text-emerald-400">Front • 45° • Profile • Back</span>
        </div>
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/10 shadow-xl group">
          <LazyThumbnail
            src={hairstyle.imageUrl}
            alt={hairstyle.name}
            aspectRatio="aspect-video"
            containerClassName="w-full h-full"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      </div>

      {/* Metadata Table */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="p-2.5 rounded-xl bg-surface-raised border border-border/80 flex flex-col gap-0.5">
          <span className="text-[10px] text-muted uppercase">Hair Length</span>
          <span className="font-bold text-foreground uppercase">{hairstyle.hairLength}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-surface-raised border border-border/80 flex flex-col gap-0.5">
          <span className="text-[10px] text-muted uppercase">Texture</span>
          <span className="font-bold text-foreground uppercase">{hairstyle.hairTexture}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-surface-raised border border-border/80 flex flex-col gap-0.5">
          <span className="text-[10px] text-muted uppercase">Category</span>
          <span className="font-bold text-purple-300 truncate">
            {hairstyle.category.replace(/_/g, " ")}
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-surface-raised border border-border/80 flex flex-col gap-0.5">
          <span className="text-[10px] text-muted uppercase">Target Color</span>
          <div className="flex items-center gap-1.5 font-bold text-foreground truncate">
            <span
              className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
              style={{ background: selectedSwatch ? getSwatchCssBackground(selectedSwatch) : activeColorHex }}
            />
            <span className="truncate">{activeColorName}</span>
          </div>
        </div>
      </div>

      {/* Advanced Hair Color Science: Salon Techniques & Dual-Tone Swatches */}
      <SalonColorSelector
        activeSwatch={selectedSwatch}
        onSwatchSelect={(swatch) => {
          if (swatch) {
            onSwatchSelect(swatch);
          } else {
            onResetSwatch();
          }
        }}
        showFormulaBadge={true}
      />

      {/* SAM 3.1 & GroundingDINO Tracking Tokens */}
      <div className="p-3 rounded-xl bg-surface-raised border border-border/80 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-foreground">
            <Brain className="w-3.5 h-3.5 text-purple-400" />
            <span>SAM 3.1 & GroundingDINO Target Tokens</span>
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(hairstyle.samPrompt);
              toast("Tokens Copied", "SAM 3.1 tracking tokens copied to clipboard", "success");
            }}
            className="text-[10px] font-mono text-purple-400 hover:text-purple-300 flex items-center gap-1"
          >
            <Copy className="w-3 h-3" />
            <span>Copy</span>
          </button>
        </div>
        <div className="text-[10px] font-mono text-purple-300 bg-black/40 p-2 rounded-lg border border-purple-500/20">
          {hairstyle.samPrompt}
        </div>
      </div>

      {/* Face Preservation Mask Safeguard */}
      <div className="p-3 rounded-xl bg-surface-raised border border-border/80 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs font-mono font-bold text-foreground">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Face Preservation Safeguard</span>
          </span>
          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
            Zero-Morph Locked
          </span>
        </div>
        <p className="text-[10px] font-mono text-muted leading-tight">
          {hairstyle.facePreservePrompt}
        </p>
      </div>

      {/* Neural Inpaint Pipeline Calibration */}
      <div className="p-3 rounded-xl bg-surface-raised border border-border/80 flex flex-col gap-2 text-[10px] font-mono">
        <span className="font-bold text-foreground uppercase tracking-wider text-[9px]">
          Morphological Inpainting Calibration
        </span>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-1.5 rounded bg-black/30 border border-white/5">
            <span className="text-muted block text-[8px]">Closing Kernel</span>
            <span className="text-emerald-400 font-bold">48 px</span>
          </div>
          <div className="p-1.5 rounded bg-black/30 border border-white/5">
            <span className="text-muted block text-[8px]">Chroma Expansion</span>
            <span className="text-emerald-400 font-bold">+20 px</span>
          </div>
          <div className="p-1.5 rounded bg-black/30 border border-white/5">
            <span className="text-muted block text-[8px]">Edge Feathering</span>
            <span className="text-emerald-400 font-bold">12 px</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 pt-2">
        <Button
          size="md"
          variant="emerald-glow"
          onClick={() => onInpaintTrigger(hairstyle)}
          className="w-full font-mono text-xs flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>Inpaint this Hairstyle onto Video Loop →</span>
        </Button>

        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              navigator.clipboard.writeText(hairstyle.prompt);
              toast("Prompt Copied", "Hairstyle prompt copied to clipboard", "success");
            }}
            className="font-mono text-xs flex items-center justify-center gap-1.5"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Prompt</span>
          </Button>

          <a
            href={hairstyle.imageUrl}
            download={`${hairstyle.id}_4view_plate.jpg`}
            className="px-3 py-1.5 rounded-lg bg-surface-raised border border-border hover:bg-white/5 text-xs font-mono font-bold text-foreground transition-colors inline-flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-purple-400" />
            <span>Download Plate</span>
          </a>
        </div>
      </div>
    </div>
  );
});

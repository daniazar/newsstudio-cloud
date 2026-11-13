// src/components/editor/SegmentPresetPicker.tsx

import React, { useState } from "react";
import { presetRegistry } from "@/lib/prompt/presetRegistry";
import { PresetSelector } from "../prompt-builder/PresetSelector";
import { TimelineEditor } from "./TimelineEditor";
import { Film, Settings, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/components/global/ToastContainer";

interface SegmentPresetPickerProps {
  segment: {
    id: string;
    index: number;
    text?: string;
    presetChoice?: string | null;
    personaImagePrompt?: string | null;
    presenterVideoPrompt?: string | null;
    personaId?: string | null;
  };
  storyId: string;
  personaDescription?: string;
  onUpdate: (updatedFields: { 
    presetChoice: string; 
    personaImagePrompt: string; 
    presenterVideoPrompt: string;
  }) => void;
}

export interface PresetSelectionResult {
  preset: string;
  compiledPrompt: string;
  compiledVideoPrompt?: string;
}

export function SegmentPresetPicker({
  segment,
  storyId,
  personaDescription = "A professional news presenter",
  onUpdate
}: SegmentPresetPickerProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Local scratch selections
  const [pendingSelection, setPendingSelection] = useState<{
    preset: string;
    compiledPrompt: string;
    compiledVideoPrompt: string;
  } | null>(null);

  const isFirstSegment = segment.index === 0;

  if (!isFirstSegment) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface/40 border border-border/40 text-[10px] text-muted font-bold uppercase select-none w-fit">
        <span>👤</span> Face Only (Neutral)
      </div>
    );
  }

  const currentPresetSlug = segment.presetChoice || "news-anchor-desk";
  const currentPreset = presetRegistry.get(currentPresetSlug) || presetRegistry.getAll()[0].preset;
  const currentThumbnail = presetRegistry.getPreviewImagePath(currentPresetSlug);

  const handleSelect = (res: PresetSelectionResult) => {
    setPendingSelection({
      preset: res.preset,
      compiledPrompt: res.compiledPrompt,
      compiledVideoPrompt: res.compiledVideoPrompt || ""
    });
  };

  const handleSave = async () => {
    if (!pendingSelection) {
      setIsOpen(false);
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/stories/${storyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-segment",
          segmentId: segment.id,
          presetChoice: pendingSelection.preset,
          personaImagePrompt: pendingSelection.compiledPrompt,
          presenterVideoPrompt: pendingSelection.compiledVideoPrompt
        })
      });

      if (!res.ok) {
        throw new Error("Failed to update preset choice");
      }

      toast("Success", "Studio preset updated successfully", "success");
      onUpdate({
        presetChoice: pendingSelection.preset,
        personaImagePrompt: pendingSelection.compiledPrompt,
        presenterVideoPrompt: pendingSelection.compiledVideoPrompt
      });
      setIsOpen(false);
    } catch (err: unknown) {
      toast("Error", err instanceof Error ? err.message : "Failed to update segment preset", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-between w-full p-3 rounded-2xl bg-surface-raised/40 hover:bg-surface-raised/80 border border-border/60 hover:border-border transition-all duration-200 text-left group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-16 rounded-lg bg-surface border border-border/80 overflow-hidden shrink-0 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentThumbnail}
              alt={currentPreset.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
            <div className="absolute inset-0 bg-black/10" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-accent font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" /> Story Visual Style
            </div>
            <h4 className="text-xs font-black text-foreground truncate mt-0.5">{currentPreset.name}</h4>
            <p className="text-[10px] text-muted truncate mt-0.5 max-w-[180px]">{currentPreset.description}</p>
          </div>
        </div>
        
        <Settings className="w-4 h-4 text-muted group-hover:text-foreground transition-colors shrink-0 ml-2" />
      </button>

      {/* Modal Dialog overlay */}
      {isOpen && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/60 z-[9999] flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-surface border border-border rounded-3xl shadow-2xl p-6 md:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                  <Film className="w-5 h-5 text-emerald-400" /> Select Visual Studio Preset
                </h3>
                <p className="text-[10px] text-muted mt-0.5">This preset is applied to the first scene (full body frame) of your news video.</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted hover:text-foreground text-sm cursor-pointer p-0.5"
                disabled={isSaving}
              >
                ✕
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto pr-1">
              <PresetSelector
                personaDescription={personaDescription}
                onSelect={handleSelect}
                selectedPreset={currentPresetSlug}
                compact
                compilerOptions={{
                  enableDuplicateStripping: true,
                  enableCategorySeparation: true,
                  enableQualityBoilerplate: true,
                  enableSfwWordSwap: false,
                  isAttireOnlyPreview: false,
                  studioApprovedOnly: true,
                  fullAttireOnly: false
                }}
              />

              <div className="mt-6 border-t border-border/40 pt-5">
                <TimelineEditor
                  value={pendingSelection?.compiledVideoPrompt ?? segment.presenterVideoPrompt ?? ""}
                  onChange={(newVideoPrompt) => {
                    setPendingSelection(prev => ({
                      preset: prev?.preset ?? currentPresetSlug,
                      compiledPrompt: prev?.compiledPrompt ?? segment.personaImagePrompt ?? "",
                      compiledVideoPrompt: newVideoPrompt
                    }));
                  }}
                  scriptText={segment.text || ""}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-border mt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 border border-border hover:bg-white/10 text-xs font-semibold text-subtle cursor-pointer active:scale-95"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Setting</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

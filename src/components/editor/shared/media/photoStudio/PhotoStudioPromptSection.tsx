/**
 * src/components/editor/shared/media/photoStudio/PhotoStudioPromptSection.tsx
 *
 * Staging environment categories, AI prompt textarea, preset templates,
 * and clickable lighting / atmosphere modifiers.
 */

import React from "react";
import { Dices } from "lucide-react";
import {
  PRODUCT_MEDIA_CATEGORIES,
  ENVIRONMENT_LIGHTING_MODIFIERS,
} from "@/lib/ecommerce/productMediaPresets";
import { isLightingModifierActive } from "@/lib/ecommerce/promptModifierReconciler";
import { SettingActionTemplate } from "@/lib/ecommerce/personaPromptHelper";

interface PhotoStudioPromptSectionProps {
  activeCategory: string;
  photoPrompt: string;
  onSelectCategory: (catKey: string) => void;
  onSelectPresetPrompt: (
    templateFn: (name: string, personaId?: string, attireId?: string) => string
  ) => void;
  onAddLightingModifier: (modId: string, phrase: string) => void;
  onResetPromptToTemplate: () => void;
  onChangePrompt: (val: string) => void;
  photoTemplateIndex?: number;
  availablePhotoTemplates?: SettingActionTemplate[];
  handleRerollPhotoTemplate?: () => void;
}

export function PhotoStudioPromptSection({
  activeCategory,
  photoPrompt,
  onSelectCategory,
  onSelectPresetPrompt,
  onAddLightingModifier,
  onResetPromptToTemplate,
  onChangePrompt,
  photoTemplateIndex = 0,
  availablePhotoTemplates = [],
  handleRerollPhotoTemplate,
}: PhotoStudioPromptSectionProps) {
  const currentCategoryConfig =
    PRODUCT_MEDIA_CATEGORIES[activeCategory] || PRODUCT_MEDIA_CATEGORIES.surface_material;

  return (
    <>
      {/* 1. Product Category Tabs */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-zinc-300 block">
          Product Kind & Staging Environment
        </label>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {Object.values(PRODUCT_MEDIA_CATEGORIES).map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-cyan-500 text-black shadow-md font-bold"
                    : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800"
                }`}
              >
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Staging Template Reroll Bar */}
      {handleRerollPhotoTemplate && (
        <div className="p-2 rounded-xl bg-zinc-900/90 border border-zinc-800">
          <button
            type="button"
            onClick={handleRerollPhotoTemplate}
            className="w-full p-2 rounded-lg bg-zinc-950 border border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-950/30 text-left transition-all group cursor-pointer"
            title="Click to cycle through the 6 architectural staging templates for this setting"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <Dices className="h-3.5 w-3.5 text-cyan-400 group-hover:rotate-180 transition-transform duration-300" />
                <span>Reroll Staging Template</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                {(photoTemplateIndex % 6) + 1}/6
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 truncate mt-1">
              {availablePhotoTemplates[photoTemplateIndex % (availablePhotoTemplates.length || 6)]?.label || "1/6: Architectural Staging"}
            </div>
          </button>
        </div>
      )}

      {/* 3. Prompt Input Box */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-zinc-300">
            Custom Staging Prompt (AI Formulated & Editable)
          </label>
          <button
            type="button"
            onClick={onResetPromptToTemplate}
            className="text-[10px] text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
          >
            Reset to Template
          </button>
        </div>
        <textarea
          value={photoPrompt}
          onChange={(e) => onChangePrompt(e.target.value)}
          rows={3}
          placeholder="e.g. Photorealistic architectural interior photograph of an expansive sunlit Scandinavian living room with..."
          className="w-full bg-black/70 border border-zinc-700/80 focus:border-cyan-500 rounded-lg p-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition-colors custom-scrollbar"
        />
      </div>

      {/* 3. Preset Prompt Buttons per Category */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-zinc-300 block">
          Staging Preset Prompts ({currentCategoryConfig.label})
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {currentCategoryConfig.photoPresets.map((preset) => {
            const isMatch = photoPrompt.includes(preset.label.split(" ")[1] || preset.id);
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPresetPrompt(preset.template)}
                className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                  isMatch
                    ? "border-cyan-500 bg-cyan-500/20 text-cyan-200 font-bold"
                    : "border-zinc-800 bg-zinc-900/60 hover:bg-zinc-855 text-zinc-300"
                }`}
              >
                <div className="truncate font-semibold">{preset.label}</div>
                <div className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
                  {preset.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Environment & Lighting Modifier Buttons */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-zinc-300 block">
          Lighting & Atmosphere Modifiers (Click to Add)
        </label>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {ENVIRONMENT_LIGHTING_MODIFIERS.map((mod) => {
            const hasModifier = isLightingModifierActive(photoPrompt, mod.id, mod.phrase);
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => onAddLightingModifier(mod.id, mod.phrase)}
                className={`px-2 py-1.5 rounded-lg border text-left text-[11px] transition-all cursor-pointer truncate ${
                  hasModifier
                    ? "border-cyan-500/80 bg-cyan-500/25 text-cyan-200 font-bold shadow-xs shadow-cyan-500/20"
                    : "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/80 text-zinc-400 hover:text-zinc-200"
                }`}
                title={hasModifier ? "Click to remove this lighting modifier" : `Add ${mod.label}`}
              >
                {hasModifier ? `✓ ${mod.label}` : mod.label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

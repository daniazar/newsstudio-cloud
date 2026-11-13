/**
 * src/components/editor/shared/visuals/components/veoStudio/VeoPromptMotionSection.tsx
 *
 * Prompt engineering controls for Veo diffusion:
 * Archetype categories, motion presets, prompt textarea with auto-sanitization,
 * and cinematography camera cue buttons.
 */

import React from "react";
import { ShieldCheck, Dices, Sparkles } from "lucide-react";
import { PRODUCT_MEDIA_CATEGORIES } from "@/lib/ecommerce/productMediaPresets";
import { filterPromptForSafety } from "@/lib/ecommerce/promptSafetyFilter";
import { reconcileCameraCue } from "@/lib/ecommerce/promptModifierReconciler";
import {
  reconcilePromptWithSceneDialogueAndReferences,
  PERFORMANCE_MOODS,
  SettingActionTemplate,
  SceneDialogueOption,
} from "@/lib/ecommerce/personaPromptHelper";

interface VeoPromptMotionSectionProps {
  veoCategory: string;
  setVeoCategory: (cat: string) => void;
  veoPrompt: string;
  setVeoPrompt: React.Dispatch<React.SetStateAction<string>>;
  isVeoUserDirtyRef: React.MutableRefObject<boolean>;
  veoCameraCue: string;
  setVeoCameraCue: (cue: string) => void;
  productName?: string;
  personaId?: string;
  attireId?: string;
  getResolvedEnglishPrompt: (cue?: string, allowSpeakingOverride?: boolean, langOverride?: string) => string;
  setVeoSuccessMessage: (msg: string | null) => void;
  veoAllowSpeaking?: boolean;
  handleToggleAllowSpeaking?: (allow: boolean) => void;
  veoLanguageOverride?: string;
  handleSelectLanguageOverride?: (lang: string) => void;
  detectedSceneLanguage?: string;
  sceneDialogue?: string;
  currentTemplateIndex?: number;
  availableActionTemplates?: SettingActionTemplate[];
  handleRerollActionTemplate?: () => void;
  currentDialogueIndex?: number;
  availableDialogueOptions?: SceneDialogueOption[];
  handleRerollDialogue?: () => void;
  veoPerformance?: string;
  veoPerformanceMood?: string;
  handleSelectPerformanceMood?: (moodId: string) => void;
  handleChangePerformance?: (clause: string) => void;
}

const CAMERA_PRESETS = [
  {
    id: "drone_flyover",
    label: "🚁 Floating Aerial Glide",
    phrase:
      "Smooth floating airborne tracking forward at steady speed, pure camera POV without visible drones or equipment.",
  },
  {
    id: "dolly_in_slow",
    label: "🔍 Slow Dolly Push",
    phrase: "Smooth 3D push-in toward the product with rich parallax.",
  },
  {
    id: "ambient_orbit_3d",
    label: "🌐 3D Ambient Orbit",
    phrase: "Very subtle continuous 3D arc orbit with shifting natural reflections.",
  },
  {
    id: "crane_down_desk",
    label: "🏗️ Studio Crane Boom",
    phrase: "Smooth robotic studio crane shot gently booming downward from high angle.",
  },
  {
    id: "dolly_out_reveal",
    label: "🔭 Slow Dolly Out",
    phrase: "Smooth continuous dolly pull-back revealing expansive wide environment.",
  },
];

export function VeoPromptMotionSection({
  veoCategory,
  setVeoCategory,
  veoPrompt,
  setVeoPrompt,
  isVeoUserDirtyRef,
  veoCameraCue,
  setVeoCameraCue,
  productName,
  personaId,
  attireId,
  getResolvedEnglishPrompt,
  setVeoSuccessMessage,
  veoAllowSpeaking = true,
  handleToggleAllowSpeaking = () => {},
  veoLanguageOverride = "auto",
  handleSelectLanguageOverride = () => {},
  detectedSceneLanguage = "Spanish",
  sceneDialogue = "",
  currentTemplateIndex = 0,
  availableActionTemplates = [],
  handleRerollActionTemplate,
  currentDialogueIndex = 0,
  availableDialogueOptions = [],
  handleRerollDialogue,
  veoPerformance = "",
  veoPerformanceMood = "energetic",
  handleSelectPerformanceMood,
  handleChangePerformance,
}: VeoPromptMotionSectionProps) {
  const currentCategoryConfig =
    PRODUCT_MEDIA_CATEGORIES[veoCategory] || PRODUCT_MEDIA_CATEGORIES.surface_material;

  const effectiveLang =
    veoLanguageOverride && veoLanguageOverride !== "auto"
      ? veoLanguageOverride
      : detectedSceneLanguage;

  return (
    <>
      {/* 1. Category Tabs */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-zinc-300 block">
          Product Kind & Video Staging Archetype
        </label>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {Object.values(PRODUCT_MEDIA_CATEGORIES).map((cat) => {
            const isSelected = veoCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  isVeoUserDirtyRef.current = false;
                  setVeoCategory(cat.id);
                  const first = cat.videoPresets[0];
                  if (first) {
                    const raw = first.template(productName || "the product", personaId, attireId);
                    const reconciled = reconcilePromptWithSceneDialogueAndReferences(raw, {
                      productName: productName || "the product",
                      dialogue: sceneDialogue,
                      language: effectiveLang,
                      allowSpeaking: veoAllowSpeaking,
                      performanceClause: veoPerformance,
                    });
                    setVeoPrompt(reconciled);
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-emerald-500 text-black shadow-md font-bold"
                    : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800"
                }`}
              >
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Video Motion Preset Buttons */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-zinc-300 block">
          Cinematic Video Motion Presets ({currentCategoryConfig.label})
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {currentCategoryConfig.videoPresets.map((vp) => (
            <button
              key={vp.id}
              type="button"
              onClick={() => {
                isVeoUserDirtyRef.current = false;
                const raw = vp.template(productName || "the product", personaId, attireId);
                const reconciled = reconcilePromptWithSceneDialogueAndReferences(raw, {
                  productName: productName || "the product",
                  dialogue: sceneDialogue,
                  language: effectiveLang,
                  allowSpeaking: veoAllowSpeaking,
                  performanceClause: veoPerformance,
                });
                setVeoPrompt(reconciled);
              }}
              className="p-2 rounded-lg border text-left text-xs transition-all cursor-pointer border-zinc-800 bg-zinc-900/60 hover:bg-zinc-850 hover:border-emerald-500/40 text-zinc-300 group"
            >
              <div className="flex items-center justify-between gap-1">
                <div className="truncate font-semibold">{vp.label}</div>
                {vp.badge && (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 group-hover:bg-emerald-500/20 group-hover:text-emerald-300 shrink-0">
                    {vp.badge}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">{vp.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 3. 6-Template Action & Dialogue Reroll Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 rounded-xl bg-zinc-900/90 border border-zinc-800">
        {handleRerollActionTemplate && (
          <button
            type="button"
            onClick={handleRerollActionTemplate}
            className="p-2 rounded-lg bg-zinc-950 border border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-950/30 text-left transition-all group cursor-pointer"
            title="Click to cycle through the 6 action & camera choreography templates for this setting"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <Dices className="h-3.5 w-3.5 text-emerald-400 group-hover:rotate-180 transition-transform duration-300" />
                <span>Reroll Action Template</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                {(currentTemplateIndex % 6) + 1}/6
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 truncate mt-1">
              {availableActionTemplates[currentTemplateIndex % (availableActionTemplates.length || 6)]?.label || "1/6: Curated Action"}
            </div>
          </button>
        )}

        {handleRerollDialogue && (
          <button
            type="button"
            onClick={handleRerollDialogue}
            disabled={!veoAllowSpeaking}
            className="p-2 rounded-lg bg-zinc-950 border border-purple-500/30 hover:border-purple-400 hover:bg-purple-950/30 text-left transition-all group cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Click to cycle through the 6 tailored dialogue angles for this product"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                <Dices className="h-3.5 w-3.5 text-purple-400 group-hover:rotate-180 transition-transform duration-300" />
                <span>Reroll Dialogue</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                {(currentDialogueIndex % 6) + 1}/6
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 truncate mt-1">
              {availableDialogueOptions[currentDialogueIndex % (availableDialogueOptions.length || 6)]?.label || "1/6: Commercial Angle"}
            </div>
          </button>
        )}
      </div>

      {/* 4. Prompt Input Box & Speaking / Audio Controls */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-zinc-300">
            Veo Cinematic Prompt (AI Storyboarded & Customizable)
          </label>
          <div className="flex items-center gap-2">
            {filterPromptForSafety(veoPrompt, { allowSpeaking: veoAllowSpeaking }) !== veoPrompt && (
              <button
                type="button"
                onClick={() => {
                  setVeoPrompt(filterPromptForSafety(veoPrompt, { allowSpeaking: veoAllowSpeaking }));
                  setVeoSuccessMessage(
                    "🛡️ Prompt sanitized: sensitive terms neutralized for Google Flow safety policy!"
                  );
                }}
                className="text-[10px] font-bold text-amber-300 hover:text-amber-200 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-500/50 rounded px-2 py-0.5 flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                title="Click to automatically sanitize sensitive words to Google Flow policy-compliant terminology"
              >
                <ShieldCheck className="h-3 w-3 text-amber-400" />
                <span>Auto-Sanitize Terms</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                isVeoUserDirtyRef.current = false;
                setVeoPrompt(getResolvedEnglishPrompt(veoCameraCue, veoAllowSpeaking, veoLanguageOverride));
              }}
              className="text-[10px] text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
            >
              Reset to Planned
            </button>
          </div>
        </div>

        {/* Speaking Dialogue, Audio Language & Customize Performance */}
        <div className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-900/80 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={veoAllowSpeaking}
                onChange={(e) => handleToggleAllowSpeaking(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/30 w-4 h-4 cursor-pointer accent-emerald-500"
              />
              <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <span>🗣️</span>
                <span>Persona Speaks On Camera</span>
              </span>
            </label>

            <div className="flex items-center gap-2">
              <label htmlFor="veo-lang-select" className="text-[11px] font-medium text-zinc-400 whitespace-nowrap">
                Audio Language:
              </label>
              <select
                id="veo-lang-select"
                value={veoLanguageOverride}
                onChange={(e) => handleSelectLanguageOverride(e.target.value)}
                disabled={!veoAllowSpeaking}
                className="bg-zinc-950 border border-zinc-700 rounded-md px-2 py-1 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <option value="auto">Auto-Detect ({detectedSceneLanguage})</option>
                <option value="Spanish">Spanish (Español)</option>
                <option value="English">English</option>
                <option value="Portuguese">Portuguese (Português)</option>
                <option value="French">French (Français)</option>
                <option value="German">German (Deutsch)</option>
                <option value="Italian">Italian (Italiano)</option>
              </select>
            </div>
          </div>

          {/* Customize Performance (Audio & Vocal Delivery Modifiers) */}
          {veoAllowSpeaking && (
            <div className="pt-2 border-t border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>Customize Performance (Audio Delivery Modifiers)</span>
                </label>
                <span className="text-[10px] text-zinc-500">Affects vocal tone, pacing & facial expression</span>
              </div>

              {/* Mood Quick Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {PERFORMANCE_MOODS.map((mood) => {
                  const isSelected = veoPerformanceMood === mood.id;
                  return (
                    <button
                      key={mood.id}
                      type="button"
                      onClick={() => handleSelectPerformanceMood?.(mood.id)}
                      className={`px-2 py-1.5 rounded-lg border text-left text-xs transition-all cursor-pointer flex items-center gap-1.5 truncate ${
                        isSelected
                          ? "border-amber-500 bg-amber-500/20 text-amber-200 font-bold shadow-xs shadow-amber-500/20"
                          : "border-zinc-800 bg-zinc-950/60 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200"
                      }`}
                      title={mood.description}
                    >
                      <span>{mood.emoji}</span>
                      <span className="truncate">{mood.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Editable Custom Performance Text Box */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-zinc-400">
                  <span>Delivery Modifier Clause:</span>
                  {veoPerformanceMood && (
                    <span className="text-zinc-500 italic truncate max-w-[200px]">
                      active: {veoPerformanceMood}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={veoPerformance || ""}
                  onChange={(e) => handleChangePerformance?.(e.target.value)}
                  placeholder="e.g. talking slowly, crying / deeply moving, energetic fast pitched, confident architect tone..."
                  className="w-full bg-zinc-950 border border-zinc-700/70 focus:border-amber-500 rounded-md px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}
        </div>

        <textarea
          value={veoPrompt}
          onChange={(e) => {
            isVeoUserDirtyRef.current = true;
            setVeoPrompt(e.target.value);
          }}
          rows={3}
          placeholder="e.g. Smooth floating aerial glide moving steadily forward across an expansive sunlit luxury living room..."
          className="w-full bg-black/70 border border-zinc-700/80 focus:border-emerald-500 rounded-lg p-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition-colors custom-scrollbar"
        />
      </div>

      {/* 4. Camera Cinematography Presets */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-zinc-300 block">Camera Motion Preset</label>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {CAMERA_PRESETS.map((cam) => {
            const isSelected = veoCameraCue === cam.id;
            return (
              <button
                key={cam.id}
                type="button"
                onClick={() => {
                  setVeoCameraCue(cam.id);
                  setVeoPrompt((prev) => reconcileCameraCue(prev, cam.phrase));
                }}
                className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-500/20 text-emerald-200 font-bold"
                    : "border-zinc-800 bg-zinc-900/60 hover:bg-zinc-855 text-zinc-300"
                }`}
              >
                <div className="truncate">{cam.label}</div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

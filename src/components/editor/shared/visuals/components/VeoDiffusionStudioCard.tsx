/**
 * src/components/editor/shared/visuals/components/VeoDiffusionStudioCard.tsx
 *
 * Unified Custom AI Media Generation Studio:
 * - Subtab switcher: Photo Studio vs Veo 3.1 Video Scene vs Collapsed
 * - CustomProductPhotoStudioCard: Custom AI commercial photo synthesis
 * - VeoVideoPreviewSection: Active scene video preview player & scene attachment dropdown
 * - VeoPromptMotionSection: Archetype tabs, motion presets, and camera cues
 * - VeoIngredientsSection: Conditioned reference ingredients (Character + Attire + Product)
 * - VeoJobStatusSection: Stopwatch timer, live status progress bar, tracked job card
 * - VeoActionBar: Polling frequency selector, manual check, and render trigger
 */

import React from "react";
import { Camera, Film, RotateCw, PanelLeftClose, CheckCircle2 } from "lucide-react";
import {
  AdScene,
  ExtractedProductAsset,
  ProductSpec,
} from "@/lib/types/ecommerce";
import type { SettingActionTemplate, SceneDialogueOption } from "@/lib/ecommerce/personaPromptHelper";
import { StudioSubtab } from "../types";
import { CustomProductPhotoStudioCard } from "../../media/CustomProductPhotoStudioCard";
import { VeoFailureDiagnosisPanel } from "./VeoFailureDiagnosisPanel";
import { VeoVideoPreviewSection } from "./veoStudio/VeoVideoPreviewSection";
import { VeoPromptMotionSection } from "./veoStudio/VeoPromptMotionSection";
import { VeoIngredientsSection } from "./veoStudio/VeoIngredientsSection";
import { VeoJobStatusSection } from "./veoStudio/VeoJobStatusSection";
import { VeoActionBar } from "./veoStudio/VeoActionBar";
import { TurntableStudioCard } from "./turntableStudio/TurntableStudioCard";
import type { useTurntableSceneGeneration } from "../hooks/useTurntableSceneGeneration";

export interface VeoDiffusionStudioCardProps {
  studioSubtab: StudioSubtab;
  setStudioSubtab: (tab: StudioSubtab) => void;
  turntable?: ReturnType<typeof useTurntableSceneGeneration>;
  currentScene: AdScene;
  onUpdateScene: (updates: Partial<AdScene>) => void;
  productAssets: ExtractedProductAsset[];
  productId?: string;
  productName?: string;
  productSpec?: ProductSpec;
  personaId?: string;
  attireId?: string;
  avatarSrc?: string;
  actionLoopId?: string;
  videoUrl?: string;
  allScenes?: AdScene[];
  onAddAsset?: (asset: ExtractedProductAsset) => void;
  onAssignMediaToScene?: (
    sceneIndex: number,
    mediaUrl: string,
    isVideo?: boolean,
    asBackground?: boolean
  ) => void;
  onInsertVideoScene?: (
    videoUrl: string,
    options?: { prompt?: string; durationSeconds?: number }
  ) => void;
  toast: (
    title: string,
    message: string,
    type?: "info" | "success" | "warning" | "error"
  ) => void;

  // Veo state and handlers from useVeoSceneGeneration
  veoCategory: string;
  setVeoCategory: (cat: string) => void;
  veoPrompt: string;
  setVeoPrompt: React.Dispatch<React.SetStateAction<string>>;
  isVeoUserDirtyRef: React.MutableRefObject<boolean>;
  veoCameraCue: string;
  setVeoCameraCue: (cue: string) => void;
  isGeneratingVeo: boolean;
  veoElapsedSeconds: number;
  veoStatusDetail: string;
  veoJobId: string | null;
  lastCheckedAt: Date | null;
  pollCadenceSeconds: number;
  setPollCadenceSeconds: (cadence: number) => void;
  veoError: string | null;
  setVeoError: (err: string | null) => void;
  veoSuccessMessage: string | null;
  setVeoSuccessMessage: (msg: string | null) => void;
  liveLogs: string[];
  showLiveLogsDrawer: boolean;
  setShowLiveLogsDrawer: React.Dispatch<React.SetStateAction<boolean>>;
  isCheckingNow: boolean;
  logsEndRef: React.RefObject<HTMLDivElement | null>;
  formatTimer: (seconds: number) => string;
  handleManualCheckNow: () => Promise<void>;
  handleResumePolling: (jobId: string) => void;
  handleClearJob: () => void;
  handleGenerateVeoScene: () => Promise<void>;
  handleDeleteVeoVideo: (url?: string) => Promise<void>;
  handleDetachMediaFromScene: (e?: React.MouseEvent, sceneZeroIndex?: number) => void;
  isDeletingVeo: boolean;
  activeVeoUrl?: string;
  selectedProductRefUrl: string | null;
  setSelectedProductRefUrl: (url: string | null) => void;
  resolvedPersonaImageUrl?: string | null;
  candidateProductUrls: string[];
  activeProductRefUrl: string | null;
  getResolvedEnglishPrompt: (cue?: string, allowSpeakingOverride?: boolean, langOverride?: string) => string;
  showVideoPreviewInStudio: boolean;
  setShowVideoPreviewInStudio: (show: boolean) => void;
  showVeoApplyMenu: boolean;
  setShowVeoApplyMenu: (show: boolean) => void;
  veoAllowSpeaking?: boolean;
  handleToggleAllowSpeaking?: (allow: boolean) => void;
  veoLanguageOverride?: string;
  handleSelectLanguageOverride?: (lang: string) => void;
  detectedSceneLanguage?: string;
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

export const VeoDiffusionStudioCard: React.FC<VeoDiffusionStudioCardProps> = ({
  studioSubtab,
  setStudioSubtab,
  turntable,
  currentScene,
  onUpdateScene,
  productAssets,
  productId,
  productName,
  productSpec,
  personaId,
  attireId,
  avatarSrc,
  actionLoopId,
  videoUrl,
  allScenes = [],
  onAddAsset,
  onAssignMediaToScene,
  onInsertVideoScene,
  toast,
  veoCategory,
  setVeoCategory,
  veoPrompt,
  setVeoPrompt,
  isVeoUserDirtyRef,
  veoCameraCue,
  setVeoCameraCue,
  currentTemplateIndex,
  availableActionTemplates,
  handleRerollActionTemplate,
  currentDialogueIndex,
  availableDialogueOptions,
  handleRerollDialogue,
  veoPerformance,
  veoPerformanceMood,
  handleSelectPerformanceMood,
  handleChangePerformance,
  isGeneratingVeo,
  veoElapsedSeconds,
  veoStatusDetail,
  veoJobId,
  lastCheckedAt,
  pollCadenceSeconds,
  setPollCadenceSeconds,
  veoError,
  setVeoError,
  veoSuccessMessage,
  setVeoSuccessMessage,
  liveLogs,
  showLiveLogsDrawer,
  setShowLiveLogsDrawer,
  isCheckingNow,
  logsEndRef,
  formatTimer,
  handleManualCheckNow,
  handleResumePolling,
  handleClearJob,
  handleGenerateVeoScene,
  handleDeleteVeoVideo,
  handleDetachMediaFromScene,
  isDeletingVeo,
  activeVeoUrl,
  selectedProductRefUrl: _selectedProductRefUrl,
  setSelectedProductRefUrl,
  resolvedPersonaImageUrl,
  candidateProductUrls,
  activeProductRefUrl,
  getResolvedEnglishPrompt,
  showVideoPreviewInStudio,
  setShowVideoPreviewInStudio,
  showVeoApplyMenu,
  setShowVeoApplyMenu,
  veoAllowSpeaking = true,
  handleToggleAllowSpeaking = () => {},
  veoLanguageOverride = "auto",
  handleSelectLanguageOverride = () => {},
  detectedSceneLanguage = "Spanish",
}) => {
  return (
    <div className="space-y-3">
      {/* Studio Subtab Switcher */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900/90 border border-zinc-800">
        <button
          type="button"
          onClick={() => setStudioSubtab("photo")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            studioSubtab === "photo"
              ? "bg-purple-600 text-white shadow-md shadow-purple-950/40"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
          }`}
        >
          <Camera className="h-3.5 w-3.5" />
          <span>Custom AI Photo Studio</span>
        </button>
        <button
          type="button"
          onClick={() => setStudioSubtab("video")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            studioSubtab === "video"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
          }`}
        >
          <Film className="h-3.5 w-3.5" />
          <span>✨ Custom Veo 3.1 Video Scene</span>
        </button>
        <button
          type="button"
          onClick={() => setStudioSubtab("turntable")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            studioSubtab === "turntable"
              ? "bg-cyan-600 text-white shadow-md shadow-cyan-950/40"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
          }`}
        >
          <RotateCw className="h-3.5 w-3.5" />
          <span>🔄 360° Neural Turntable</span>
        </button>
        <button
          type="button"
          onClick={() => setStudioSubtab(studioSubtab === "closed" ? "turntable" : "closed")}
          className={`px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
            studioSubtab === "closed"
              ? "bg-zinc-800 text-zinc-300 font-bold"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
          title="Collapse custom studio generator"
        >
          <PanelLeftClose className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Subtab 1: AI Photo Studio Card */}
      {studioSubtab === "photo" && (
        <CustomProductPhotoStudioCard
          currentScene={currentScene}
          onUpdateScene={onUpdateScene}
          productAssets={productAssets}
          productId={productId}
          productName={productName}
          productSpec={productSpec}
          personaId={personaId}
          attireId={attireId}
          avatarSrc={avatarSrc}
          actionLoopId={actionLoopId}
          videoUrl={videoUrl}
          allScenes={allScenes}
          onAddAsset={onAddAsset}
          onAssignMediaToScene={onAssignMediaToScene}
        />
      )}

      {/* Subtab 2: Veo 3.1 Video Scene Diffusion Studio */}
      {studioSubtab === "video" && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-3.5 shadow-xl shadow-emerald-950/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Film className="h-4 w-4 text-emerald-400" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-100 uppercase tracking-wide">
                    Custom Veo 3.1 Video Scene Diffusion
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Google Flow Ready
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  Synthesizes an 8s photorealistic commercial video scene conditioned on authentic product and persona reference photos.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 border border-emerald-500/30 text-emerald-400 font-bold">
              8s · 9:16 Veo 3.1
            </span>
          </div>

          {/* Messages & Error Diagnostics */}
          {veoSuccessMessage && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{veoSuccessMessage}</span>
            </div>
          )}

          {veoError && (
            <VeoFailureDiagnosisPanel
              veoError={veoError}
              veoPrompt={veoPrompt}
              onDismiss={() => setVeoError(null)}
              onUpdatePrompt={(prompt) => setVeoPrompt(prompt)}
              onSetSuccessMessage={setVeoSuccessMessage}
              onRetry={handleGenerateVeoScene}
            />
          )}

          {/* Active Video Preview Player & Scene Attachment */}
          <VeoVideoPreviewSection
            currentScene={currentScene}
            activeVeoUrl={activeVeoUrl}
            productAssets={productAssets}
            productSpec={productSpec}
            productName={productName}
            veoPrompt={veoPrompt}
            showVideoPreviewInStudio={showVideoPreviewInStudio}
            setShowVideoPreviewInStudio={setShowVideoPreviewInStudio}
            showVeoApplyMenu={showVeoApplyMenu}
            setShowVeoApplyMenu={setShowVeoApplyMenu}
            isGeneratingVeo={isGeneratingVeo}
            isDeletingVeo={isDeletingVeo}
            allScenes={allScenes}
            onUpdateScene={onUpdateScene}
            onAddAsset={onAddAsset}
            onInsertVideoScene={onInsertVideoScene}
            onAssignMediaToScene={onAssignMediaToScene}
            handleGenerateVeoScene={handleGenerateVeoScene}
            handleDeleteVeoVideo={handleDeleteVeoVideo}
            handleDetachMediaFromScene={handleDetachMediaFromScene}
            setVeoSuccessMessage={setVeoSuccessMessage}
            toast={toast}
          />

          {/* Prompt, Archetype Tabs, Motion Cues */}
          <VeoPromptMotionSection
            veoCategory={veoCategory}
            setVeoCategory={setVeoCategory}
            veoPrompt={veoPrompt}
            setVeoPrompt={setVeoPrompt}
            isVeoUserDirtyRef={isVeoUserDirtyRef}
            veoCameraCue={veoCameraCue}
            setVeoCameraCue={setVeoCameraCue}
            productName={productName}
            personaId={personaId}
            attireId={attireId}
            getResolvedEnglishPrompt={getResolvedEnglishPrompt}
            setVeoSuccessMessage={setVeoSuccessMessage}
            veoAllowSpeaking={veoAllowSpeaking}
            handleToggleAllowSpeaking={handleToggleAllowSpeaking}
            veoLanguageOverride={veoLanguageOverride}
            handleSelectLanguageOverride={handleSelectLanguageOverride}
            detectedSceneLanguage={detectedSceneLanguage}
            sceneDialogue={currentScene.voiceoverScript || currentScene.headline || ""}
            currentTemplateIndex={currentTemplateIndex}
            availableActionTemplates={availableActionTemplates}
            handleRerollActionTemplate={handleRerollActionTemplate}
            currentDialogueIndex={currentDialogueIndex}
            availableDialogueOptions={availableDialogueOptions}
            handleRerollDialogue={handleRerollDialogue}
            veoPerformance={veoPerformance}
            veoPerformanceMood={veoPerformanceMood}
            handleSelectPerformanceMood={handleSelectPerformanceMood}
            handleChangePerformance={handleChangePerformance}
          />

          {/* 3 Reference Ingredients Conditioning Bar */}
          <VeoIngredientsSection
            resolvedPersonaImageUrl={resolvedPersonaImageUrl}
            personaId={personaId}
            attireId={attireId}
            candidateProductUrls={candidateProductUrls}
            activeProductRefUrl={activeProductRefUrl}
            setSelectedProductRefUrl={setSelectedProductRefUrl}
          />

          {/* Live Generation Progress Card, Tracked Job Card, Telemetry Drawer */}
          <VeoJobStatusSection
            isGeneratingVeo={isGeneratingVeo}
            veoJobId={veoJobId}
            veoElapsedSeconds={veoElapsedSeconds}
            veoStatusDetail={veoStatusDetail}
            formatTimer={formatTimer}
            pollCadenceSeconds={pollCadenceSeconds}
            lastCheckedAt={lastCheckedAt}
            handleManualCheckNow={handleManualCheckNow}
            handleResumePolling={handleResumePolling}
            handleClearJob={handleClearJob}
            liveLogs={liveLogs}
            showLiveLogsDrawer={showLiveLogsDrawer}
            setShowLiveLogsDrawer={setShowLiveLogsDrawer}
            logsEndRef={logsEndRef}
            setVeoSuccessMessage={setVeoSuccessMessage}
            veoError={veoError}
            handleGenerateVeoScene={handleGenerateVeoScene}
          />

          {/* Duration & Generate Action Bar */}
          <VeoActionBar
            pollCadenceSeconds={pollCadenceSeconds}
            setPollCadenceSeconds={setPollCadenceSeconds}
            handleManualCheckNow={handleManualCheckNow}
            isGeneratingVeo={isGeneratingVeo}
            isCheckingNow={isCheckingNow}
            handleGenerateVeoScene={handleGenerateVeoScene}
            veoPrompt={veoPrompt}
            formatTimer={formatTimer}
            veoElapsedSeconds={veoElapsedSeconds}
          />
        </div>
      )}

      {/* Subtab 3: Neural Product Turntable Studio */}
      {studioSubtab === "turntable" && turntable && (
        <TurntableStudioCard
          currentScene={currentScene}
          onUpdateScene={onUpdateScene}
          productAssets={productAssets}
          productId={productId}
          productName={productName}
          productSpec={productSpec}
          personaId={personaId}
          attireId={attireId}
          avatarSrc={avatarSrc}
          allScenes={allScenes}
          onAddAsset={onAddAsset}
          onAssignMediaToScene={onAssignMediaToScene}
          toast={toast}
          {...turntable}
        />
      )}
    </div>
  );
};

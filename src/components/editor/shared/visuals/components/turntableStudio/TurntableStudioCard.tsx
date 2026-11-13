/**
 * src/components/editor/shared/visuals/components/turntableStudio/TurntableStudioCard.tsx
 *
 * Root container for Neural Product Turntable Studio:
 * - Engine Switcher (🚀 MiniMax H3 Local ComfyUI vs ✨ Google Veo 3.1 Cloud)
 * - 6 Typology-Aware Staging Archetypes (including Persona 360° Orbit)
 * - 24+ Contextual Environment Templates & AI Recommender
 * - Motion Kinematics, Telemetry Status, Video Preview & Action Bar
 */

import {
resolveContextualEnvironment
} from "@/lib/ecommerce/turntableEnvironmentEngine";
import {
AdScene,
ExtractedProductAsset,
ProductSpec,
ProductVariant,
TurntableCameraElevation,
TurntableEngine,
TurntableLightingStyle,
TurntableMotionPreset,
TurntablePedestalStyle,
TurntableRadarPin,
TurntableSocialProofConfig,
TurntableStagingArchetype,
TurntableStepMode,
} from "@/lib/types/ecommerce";
import { Cpu,Film,RotateCw } from "lucide-react";
import React from "react";
import { TurntableActionBar } from "./TurntableActionBar";
import { TurntableEnvironmentSection } from "./TurntableEnvironmentSection";
import { TurntableExportModal } from "./TurntableExportModal";
import { TurntableHookMatrixModal } from "./TurntableHookMatrixModal";
import { TurntableIngredientsSection } from "./TurntableIngredientsSection";
import { TurntableJobStatusSection } from "./TurntableJobStatusSection";
import { TurntableMotionSection } from "./TurntableMotionSection";
import { TurntableRadarPinsSection } from "./TurntableRadarPinsSection";
import { TurntableSocialProofSection } from "./TurntableSocialProofSection";
import { TurntableVideoPreviewSection } from "./TurntableVideoPreviewSection";

export interface TurntableStudioCardProps {
  currentScene: AdScene;
  onUpdateScene: (updates: Partial<AdScene>) => void;
  productAssets: ExtractedProductAsset[];
  productId?: string;
  productName?: string;
  productSpec?: ProductSpec;
  personaId?: string;
  attireId?: string;
  avatarSrc?: string;
  allScenes?: AdScene[];
  onAddAsset?: (asset: ExtractedProductAsset) => void;
  onAssignMediaToScene?: (
    sceneIndex: number,
    mediaUrl: string,
    isVideo?: boolean,
    asBackground?: boolean
  ) => void;
  toast: (
    title: string,
    message: string,
    type?: "info" | "success" | "warning" | "error"
  ) => void;

  // Hook state & handlers
  turntableEngine: TurntableEngine;
  setTurntableEngine: (engine: TurntableEngine) => void;
  stagingArchetype: TurntableStagingArchetype;
  setStagingArchetype: (arch: TurntableStagingArchetype) => void;
  motionPreset: TurntableMotionPreset;
  setMotionPreset: (preset: TurntableMotionPreset) => void;
  pedestalStyle: TurntablePedestalStyle;
  setPedestalStyle: (pedestal: TurntablePedestalStyle) => void;
  lightingStyle: TurntableLightingStyle;
  setLightingStyle: (lighting: TurntableLightingStyle) => void;
  stepMode: TurntableStepMode;
  setStepMode: (mode: TurntableStepMode) => void;
  environmentId: string;
  setEnvironmentId: (envId: string) => void;
  environmentPrompt: string;
  setEnvironmentPrompt: (prompt: string) => void;
  candidateProductUrls: string[];
  activeProductRefUrl: string | null;
  selectedProductRefUrl: string | null;
  setSelectedProductRefUrl: (url: string | null) => void;
  resolvedPersonaImageUrl?: string | null;
  turntablePrompt: string;
  setTurntablePrompt: React.Dispatch<React.SetStateAction<string>>;
  isTurntableUserDirtyRef: React.MutableRefObject<boolean>;
  isGeneratingTurntable: boolean;
  turntableJobId: string | null;
  turntableElapsedSeconds: number;
  turntableStatusDetail: string;
  turntableError: string | null;
  turntableSuccessMessage: string | null;
  liveLogs: string[];
  showLiveLogsDrawer: boolean;
  setShowLiveLogsDrawer: React.Dispatch<React.SetStateAction<boolean>>;
  isCheckingNow: boolean;
  pollCadenceSeconds: number;
  setPollCadenceSeconds: (cadence: number) => void;
  currentStep: number;
  totalSteps: number;
  progressPercent: number;
  vramUsedGb: number;
  activeTurntableUrl?: string;
  logsEndRef: React.RefObject<HTMLDivElement | null>;
  formatTimer?: (seconds: number) => string;
  handleUpdateParameter: (updates: Record<string, unknown>) => void;
  handleResetToCompiledPrompt: () => void;
  handleGenerateTurntableScene: () => Promise<void>;
  handleManualCheckNow: () => Promise<void>;
  handleClearJob: () => void;
  handleDetachMediaFromScene: (e?: React.MouseEvent) => void;
  handleDeleteTurntableVideo: () => Promise<void>;
  isDeletingTurntable: boolean;
  cameraElevation?: TurntableCameraElevation;
  setCameraElevation?: (elevation: TurntableCameraElevation) => void;
  handleChangeElevation?: (elevation: TurntableCameraElevation) => void;
  selectedVariantId?: string | null;
  handleSelectVariant?: (variantOrId: ProductVariant | string | null) => void;
  enableRadarPins?: boolean;
  handleToggleRadarPins?: (enabled: boolean) => void;
  radarPins?: TurntableRadarPin[];
  handleUpdateRadarPins?: (pins: TurntableRadarPin[]) => void;
  socialProof?: TurntableSocialProofConfig;
  handleUpdateSocialProof?: (config: TurntableSocialProofConfig) => void;
  isExportModalOpen?: boolean;
  handleOpenExportModal?: () => void;
  handleCloseExportModal?: () => void;
  isHookMatrixModalOpen?: boolean;
  handleOpenHookMatrixModal?: () => void;
  handleCloseHookMatrixModal?: () => void;
  onApplyHookVariants?: (variants: AdScene[]) => void;
}

export function TurntableStudioCard({
  currentScene,
  onUpdateScene,
  productAssets,
  productId: _productId,
  productName,
  productSpec,
  personaId = "ruby",
  attireId: _attireId,
  allScenes = [],
  onAddAsset,
  onAssignMediaToScene,
  toast,
  turntableEngine,
  setTurntableEngine: _setTurntableEngine,
  stagingArchetype,
  setStagingArchetype: _setStagingArchetype,
  motionPreset,
  setMotionPreset: _setMotionPreset,
  pedestalStyle,
  setPedestalStyle: _setPedestalStyle,
  lightingStyle,
  setLightingStyle: _setLightingStyle,
  stepMode,
  setStepMode,
  environmentId,
  setEnvironmentId: _setEnvironmentId,
  environmentPrompt,
  setEnvironmentPrompt: _setEnvironmentPrompt,
  candidateProductUrls,
  activeProductRefUrl,
  selectedProductRefUrl: _selectedProductRefUrl,
  setSelectedProductRefUrl,
  resolvedPersonaImageUrl,
  turntablePrompt,
  setTurntablePrompt,
  isTurntableUserDirtyRef,
  isGeneratingTurntable,
  turntableJobId,
  turntableElapsedSeconds,
  turntableStatusDetail,
  turntableError,
  turntableSuccessMessage,
  liveLogs,
  showLiveLogsDrawer,
  setShowLiveLogsDrawer,
  isCheckingNow,
  pollCadenceSeconds,
  setPollCadenceSeconds,
  currentStep,
  totalSteps,
  progressPercent,
  vramUsedGb,
  activeTurntableUrl,
  logsEndRef,
  formatTimer = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`,
  handleUpdateParameter,
  handleResetToCompiledPrompt,
  handleGenerateTurntableScene,
  handleManualCheckNow,
  handleClearJob,
  handleDetachMediaFromScene,
  handleDeleteTurntableVideo,
  isDeletingTurntable,
  cameraElevation = "eye_level",
  handleChangeElevation,
  selectedVariantId,
  handleSelectVariant,
  enableRadarPins = true,
  handleToggleRadarPins,
  radarPins = [],
  handleUpdateRadarPins,
  socialProof,
  handleUpdateSocialProof,
  isExportModalOpen = false,
  handleOpenExportModal,
  handleCloseExportModal,
  isHookMatrixModalOpen,
  handleOpenHookMatrixModal,
  handleCloseHookMatrixModal,
  onApplyHookVariants,
}: TurntableStudioCardProps) {
  const [internalHookMatrixOpen, setInternalHookMatrixOpen] = React.useState<boolean>(false);
  const isHookMatrixOpen = isHookMatrixModalOpen !== undefined ? isHookMatrixModalOpen : internalHookMatrixOpen;
  const onOpenHookMatrix = handleOpenHookMatrixModal || (() => setInternalHookMatrixOpen(true));
  const onCloseHookMatrix = handleCloseHookMatrixModal || (() => setInternalHookMatrixOpen(false));

  const handleAutoRecommend = () => {
    const recommended = resolveContextualEnvironment(productSpec, productName);
    handleUpdateParameter({
      environmentId: recommended.id,
      environmentPrompt: recommended.promptDescription,
    });
    toast(
      "Contextual Environment Matched",
      `Selected ${recommended.name} (${recommended.tagline}).`,
      "info"
    );
  };

  return (
    <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-3.5 shadow-xl shadow-cyan-950/10">
      {/* Studio Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RotateCw className="h-4 w-4 text-cyan-400" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-cyan-100 uppercase tracking-wide">
                Neural Product Turntable Studio
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {turntableEngine === "minimax_h3" ? "MiniMax H3 + TaoMate" : "Google Veo 3.1 Cloud"}
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              {turntableEngine === "minimax_h3"
                ? "Synthesizes single-pass rigid packshot sweeps with caustic lighting and 100% typography stability."
                : "Cloud diffusion sweep conditioned on authentic product and persona reference photos with cinematic camera orbit."}
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 border border-cyan-500/30 text-cyan-400 font-bold">
          {turntableEngine === "minimax_h3" ? "5.16s · 9:16 (768×1376)" : "8s · 9:16 (Veo 3.1)"}
        </span>
      </div>

      {/* Engine Switcher Toggle */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/70 border border-zinc-800">
        <button
          type="button"
          onClick={() => handleUpdateParameter({ engine: "minimax_h3" })}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            turntableEngine === "minimax_h3"
              ? "bg-cyan-600 text-white shadow-md shadow-cyan-950/40"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
          }`}
        >
          <Cpu className="h-3.5 w-3.5" />
          <span>🚀 MiniMax H3 (Local ComfyUI)</span>
        </button>

        <button
          type="button"
          onClick={() => handleUpdateParameter({ engine: "google_veo" })}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            turntableEngine === "google_veo"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
          }`}
        >
          <Film className="h-3.5 w-3.5" />
          <span>✨ Google Veo 3.1 (Google Flow Cloud)</span>
        </button>
      </div>

      {/* 1. Active Video Preview Section */}
      <TurntableVideoPreviewSection
        currentScene={currentScene}
        activeTurntableUrl={activeTurntableUrl}
        allScenes={allScenes}
        productAssets={productAssets}
        onUpdateScene={onUpdateScene}
        onAddAsset={onAddAsset}
        onAssignMediaToScene={onAssignMediaToScene}
        onOpenExportModal={handleOpenExportModal}
        onOpenHookMatrixModal={onOpenHookMatrix}
        handleDeleteTurntableVideo={handleDeleteTurntableVideo}
        handleDetachMediaFromScene={handleDetachMediaFromScene}
        isDeletingTurntable={isDeletingTurntable}
        toast={toast}
      />

      {/* 2. Job Status & Telemetry Section */}
      <TurntableJobStatusSection
        isGeneratingTurntable={isGeneratingTurntable}
        turntableJobId={turntableJobId}
        turntableElapsedSeconds={turntableElapsedSeconds}
        turntableStatusDetail={turntableStatusDetail}
        formatTimer={formatTimer}
        engine={turntableEngine}
        currentStep={currentStep}
        totalSteps={totalSteps}
        progressPercent={progressPercent}
        vramUsedGb={vramUsedGb}
        liveLogs={liveLogs}
        showLiveLogsDrawer={showLiveLogsDrawer}
        setShowLiveLogsDrawer={setShowLiveLogsDrawer}
        logsEndRef={logsEndRef}
        turntableError={turntableError}
        turntableSuccessMessage={turntableSuccessMessage}
        handleClearJob={handleClearJob}
        handleGenerateTurntableScene={handleGenerateTurntableScene}
      />

      {/* 3. Staging Archetype & Ingredients Section */}
      <TurntableIngredientsSection
        candidateProductUrls={candidateProductUrls}
        activeProductRefUrl={activeProductRefUrl}
        setSelectedProductRefUrl={setSelectedProductRefUrl}
        stagingArchetype={stagingArchetype}
        onSelectStagingArchetype={(arch) => handleUpdateParameter({ stagingArchetype: arch })}
        pedestalStyle={pedestalStyle}
        onSelectPedestalStyle={(ped) => handleUpdateParameter({ pedestalStyle: ped })}
        lightingStyle={lightingStyle}
        onSelectLightingStyle={(light) => handleUpdateParameter({ lightingStyle: light })}
        personaId={personaId}
        resolvedPersonaImageUrl={resolvedPersonaImageUrl}
        productSpec={productSpec}
        selectedVariantId={selectedVariantId}
        onSelectVariant={handleSelectVariant}
      />

      {/* 4. Contextual Environment & Backdrop Section */}
      <TurntableEnvironmentSection
        environmentId={environmentId}
        onSelectEnvironment={(preset) =>
          handleUpdateParameter({
            environmentId: preset.id,
            environmentPrompt: preset.promptDescription,
          })
        }
        environmentPrompt={environmentPrompt}
        onChangeEnvironmentPrompt={(prompt) => handleUpdateParameter({ environmentPrompt: prompt })}
        onAutoRecommendEnvironment={handleAutoRecommend}
      />

      {/* 4b. Dynamic Feature Radar Pins & Interactive Hotspots */}
      <TurntableRadarPinsSection
        enableRadarPins={Boolean(enableRadarPins)}
        onToggleRadarPins={(enabled) => handleToggleRadarPins?.(enabled)}
        radarPins={radarPins || []}
        onUpdateRadarPins={(pins) => handleUpdateRadarPins?.(pins)}
        productSpec={productSpec}
        accentColor={productSpec?.brand?.primaryColor || "#06b6d4"}
      />

      {/* 4c. Dynamic Social Proof & Scarcity Overlays */}
      <TurntableSocialProofSection
        socialProof={socialProof || currentScene.turntableSocialProof}
        onChange={(config) => {
          if (handleUpdateSocialProof) handleUpdateSocialProof(config);
          else onUpdateScene({ turntableSocialProof: config });
        }}
        productSpec={productSpec}
        accentColor={productSpec?.brand?.primaryColor || "#06b6d4"}
      />

      {/* 5. Motion Kinematics & Quality Section */}
      <TurntableMotionSection
        engine={turntableEngine}
        motionPreset={motionPreset}
        onSelectMotionPreset={(preset) => handleUpdateParameter({ motionPreset: preset })}
        cameraElevation={cameraElevation}
        onSelectCameraElevation={(elev) => {
          if (handleChangeElevation) handleChangeElevation(elev);
          else handleUpdateParameter({ cameraElevation: elev });
        }}
        stepMode={stepMode}
        onSelectStepMode={(mode) => setStepMode(mode)}
        turntablePrompt={turntablePrompt}
        setTurntablePrompt={setTurntablePrompt}
        isUserDirtyRef={isTurntableUserDirtyRef}
        onResetToCompiledPrompt={handleResetToCompiledPrompt}
      />

      {/* 6. Action Bar */}
      <TurntableActionBar
        engine={turntableEngine}
        stepMode={stepMode}
        pollCadenceSeconds={pollCadenceSeconds}
        setPollCadenceSeconds={setPollCadenceSeconds}
        handleManualCheckNow={handleManualCheckNow}
        isGeneratingTurntable={isGeneratingTurntable}
        isCheckingNow={isCheckingNow}
        handleGenerateTurntableScene={handleGenerateTurntableScene}
        turntablePrompt={turntablePrompt}
        formatTimer={formatTimer}
        turntableElapsedSeconds={turntableElapsedSeconds}
      />

      {/* Omnichannel 360° Export Media Kit & Storefront Embed Modal */}
      <TurntableExportModal
        isOpen={Boolean(isExportModalOpen)}
        onClose={handleCloseExportModal || (() => {})}
        videoUrl={activeTurntableUrl || ""}
        productName={productName}
        posterUrl={activeProductRefUrl || undefined}
        accentColor={productSpec?.brand?.primaryColor || "#06b6d4"}
        toast={toast}
      />

      {/* Paid Social A/B 3-Hook Variation Matrix Modal */}
      <TurntableHookMatrixModal
        isOpen={Boolean(isHookMatrixOpen)}
        onClose={onCloseHookMatrix}
        currentScene={currentScene}
        activeTurntableUrl={activeTurntableUrl || ""}
        productSpec={productSpec}
        accentColor={productSpec?.brand?.primaryColor || "#06b6d4"}
        onApplyHookVariants={(variants) => {
          if (onApplyHookVariants) {
            onApplyHookVariants(variants);
          } else if (variants[0]) {
            onUpdateScene(variants[0]);
          }
        }}
        toast={toast}
      />
    </div>
  );
}

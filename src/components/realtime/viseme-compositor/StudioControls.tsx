"use client";

import React from "react";
import {
  Sliders,
  Sparkles,
  Volume2,
  Box,
  Cpu,
  Trash2,
  Zap,
  Download,
  CheckCircle,
  Database,
  Film,
  UserCheck,
  Layers,
  Grid,
  Video,
  Activity,
  EyeOff,
  Flame,
  Link2,
  Target,
  RotateCcw,
} from "lucide-react";
import { IdlePresetType } from "@/lib/realtime/proceduralLivePortraitDriver";
import { STUDIO_BACKGROUNDS } from "@/lib/realtime/studioBackgrounds";
import {
  CameraId,
  CameraTransitionMode,
  BiophysicsOptions,
  ConversationalTurnMode,
  FacsManualOverrides,
} from "@/lib/realtime/liveAnchorStageEngine";
import { SentimentMode, AcousticSentimentTelemetry } from "@/components/conversational/WebglNeuralVisemeStage";

export interface PlatePresetSummary {
  id: string;
  name: string;
  type: "image" | "video";
  avatarSrc: string;
  description: string;
}

interface StudioControlsProps {
  // Avatar & Driver Plate
  activePlateId: string;
  onChangePlate: (id: string) => void;
  platePresets: PlatePresetSummary[];

  // Auto Kinematics & Live Expressions
  autoKinematics?: boolean;
  onToggleAutoKinematics?: () => void;
  showLandmarks?: boolean;
  onToggleLandmarks?: () => void;
  idlePreset?: IdlePresetType | string;
  onChangeIdlePreset?: (preset: IdlePresetType) => void;
  dominantBrow?: "left" | "right" | "none";
  onChangeDominantBrow?: (brow: "left" | "right" | "none") => void;
  orbitalYaw?: number;
  onChangeOrbitalYaw?: (yaw: number) => void;

  // Respiration & Dynamic Puppeteering Controls
  respirationScale?: number;
  onChangeRespirationScale?: (v: number) => void;
  puppeteeringTab?: "head" | "eyes" | "brows" | "mouth";
  onChangePuppeteeringTab?: (tab: "head" | "eyes" | "brows" | "mouth") => void;
  puppeteerPitch?: number;
  onChangePuppeteerPitch?: (v: number) => void;
  puppeteerYaw?: number;
  onChangePuppeteerYaw?: (v: number) => void;
  puppeteerRoll?: number;
  onChangePuppeteerRoll?: (v: number) => void;
  puppeteerBodyRoll?: number;
  onChangePuppeteerBodyRoll?: (v: number) => void;
  puppeteerPelvisRoll?: number;
  onChangePuppeteerPelvisRoll?: (v: number) => void;
  kinematicCoupling?: boolean;
  onToggleKinematicCoupling?: () => void;
  puppeteerLeanZ?: number;
  onChangePuppeteerLeanZ?: (v: number) => void;
  puppeteerShiftX?: number;
  onChangePuppeteerShiftX?: (v: number) => void;
  puppeteerShiftY?: number;
  onChangePuppeteerShiftY?: (v: number) => void;
  puppeteerGazeX?: number;
  onChangePuppeteerGazeX?: (v: number) => void;
  puppeteerGazeY?: number;
  onChangePuppeteerGazeY?: (v: number) => void;
  puppeteerWidening?: number;
  onChangePuppeteerWidening?: (v: number) => void;
  puppeteerBlinkLeft?: number;
  onChangePuppeteerBlinkLeft?: (v: number) => void;
  puppeteerBlinkRight?: number;
  onChangePuppeteerBlinkRight?: (v: number) => void;
  enableCorneaLighting?: boolean;
  onToggleCorneaLighting?: () => void;
  disableVideoBlinking?: boolean;
  onToggleDisableVideoBlinking?: () => void;
  puppeteerBrowRaise?: number;
  onChangePuppeteerBrowRaise?: (v: number) => void;
  puppeteerBrowFurrow?: number;
  onChangePuppeteerBrowFurrow?: (v: number) => void;
  puppeteerBrowAsymmetry?: number;
  onChangePuppeteerBrowAsymmetry?: (v: number) => void;
  puppeteerSmile?: number;
  onChangePuppeteerSmile?: (v: number) => void;

  // Emotional Sentiments & Conversational Affect (Phase 3)
  sentimentMode?: SentimentMode;
  onChangeSentimentMode?: (mode: SentimentMode) => void;
  sentimentIntensity?: number;
  onChangeSentimentIntensity?: (v: number) => void;
  sentimentTelem?: AcousticSentimentTelemetry | null;
  conversationalTurnMode?: ConversationalTurnMode;
  onChangeConversationalTurnMode?: (mode: ConversationalTurnMode) => void;
  facsOverrides?: FacsManualOverrides;
  onChangeFacsOverride?: (key: keyof FacsManualOverrides, value: number | null) => void;
  onClearFacsOverrides?: () => void;

  // Chroma Key & Alpha Transparency Controls
  enableChroma?: boolean;
  onToggleChroma?: () => void;
  transparentMode?: boolean;
  onToggleTransparentMode?: () => void;
  chromaMode?: 1 | 2 | 3;
  onChangeChromaMode?: (mode: 1 | 2 | 3) => void;
  autoDetectChroma?: boolean;
  onToggleAutoDetectChroma?: () => void;
  chromaSimilarity?: number;
  onChangeChromaSimilarity?: (v: number) => void;
  chromaSmoothness?: number;
  onChangeChromaSmoothness?: (v: number) => void;
  despillStrength?: number;
  onChangeDespillStrength?: (v: number) => void;
  selectedStudioBgId?: string;
  onChangeStudioBgId?: (id: string) => void;

  // Multi-Camera Director Controls
  activeCamera?: CameraId;
  onChangeActiveCamera?: (cam: CameraId) => void;
  cameraTransitionMode?: CameraTransitionMode;
  onChangeCameraTransitionMode?: (mode: CameraTransitionMode) => void;
  autoDirector?: boolean;
  onToggleAutoDirector?: () => void;

  codebookType: "ditto" | "ditto_fullface" | "musetalk" | "none";
  onChangeCodebook: (type: "ditto" | "ditto_fullface" | "musetalk" | "none") => void;
  onTriggerSample: (key: string, label: string) => void;
  activeAudioKey: string;
  isGenerating: boolean;
  jawDescentFactor: number;
  onChangeJawDescent: (v: number) => void;
  smoothFactor: number;
  onChangeSmoothFactor: (v: number) => void;
  offsetX: number;
  offsetY: number;
  onChangeOffsetX: (v: number) => void;
  onChangeOffsetY: (v: number) => void;
  scale: number;
  onChangeScale: (v: number) => void;
  showBoundingBox: boolean;
  onToggleBoundingBox: () => void;
  psnrDb: number;
  visemeCount: number;

  // Dynamic Relighting & Specularity (Tasks 3 & 5)
  rimIntensity?: number;
  onChangeRimIntensity?: (v: number) => void;
  lipMoisture?: number;
  onChangeLipMoisture?: (v: number) => void;
  enamelFresnel?: number;
  onChangeEnamelFresnel?: (v: number) => void;

  // WebGPU Model Controls
  isWebGPUReady: boolean;
  isWebGPUInitializing: boolean;
  webGPUProgress: number;
  webGPUStage: string;
  onInitWebGPU: () => void;
  onClearDiskCache: () => void;
  precision: "fp16" | "fp32";
  onChangePrecision: (p: "fp16" | "fp32") => void;
  stride: string;
  onChangeStride: (s: string) => void;
  batchSize: number;
  onChangeBatchSize: (b: number) => void;
  onPrecalcCodebook: () => void;
  onExportCodebook: () => void;

  // Video Export Controls
  isExportingVideo?: boolean;
  exportProgress?: number;
  exportStage?: string;
  onExportVideo?: (format?: "mp4" | "webm") => void;
  onCancelExport?: () => void;

  // Biomechanical Realism
  biophysicsOptions?: BiophysicsOptions;
  onChangeBiophysics?: (opts: Partial<BiophysicsOptions>) => void;

  // Auto FSM & Video Plate Modes
  videoMode: "auto_fsm" | "continuous" | "single_loop";
  onChangeVideoMode: (mode: "auto_fsm" | "continuous" | "single_loop") => void;
  isWebGLReady?: boolean;
  fsmBeatCount?: number;
}

const SAMPLE_TRACKS = [
  { key: "user_hello", label: "Hello (0.76s English)", lang: "EN", badge: "English" },
  { key: "user_hola", label: "Hola (0.44s Spanish)", lang: "ES", badge: "Spanish" },
  { key: "cli_voice_ruby", label: "Ruby Anchor (5.60s Rioplatense)", lang: "AR", badge: "Anchor ES" },
  { key: "ditto_dense", label: "Ditto Ground Truth (6.60s Speech)", lang: "EN", badge: "Ditto GT" },
  { key: "news_anchor_long", label: "Broadcast Long (28.3s Story)", lang: "EN", badge: "Long Story" },
];

export const StudioControls = React.memo<StudioControlsProps>(function StudioControls({
  activePlateId,
  onChangePlate,
  platePresets,

  autoKinematics = false,
  onToggleAutoKinematics = () => {},
  showLandmarks = false,
  onToggleLandmarks,
  idlePreset = "dynamic_flow",
  onChangeIdlePreset = () => {},

  respirationScale = 0.7,
  onChangeRespirationScale,
  puppeteeringTab = "head",
  onChangePuppeteeringTab,
  puppeteerPitch = 0,
  onChangePuppeteerPitch,
  puppeteerYaw = 0,
  onChangePuppeteerYaw,
  puppeteerRoll = 0,
  onChangePuppeteerRoll,
  puppeteerBodyRoll = 0,
  onChangePuppeteerBodyRoll,
  puppeteerPelvisRoll = 0,
  onChangePuppeteerPelvisRoll,
  kinematicCoupling = true,
  onToggleKinematicCoupling,
  puppeteerLeanZ = 0,
  onChangePuppeteerLeanZ,
  puppeteerShiftX = 0,
  onChangePuppeteerShiftX,
  puppeteerShiftY = 0,
  onChangePuppeteerShiftY,
  puppeteerGazeX = 0,
  onChangePuppeteerGazeX,
  puppeteerGazeY = 0,
  onChangePuppeteerGazeY,
  puppeteerWidening = 1.0,
  onChangePuppeteerWidening,
  puppeteerBlinkLeft = 0,
  onChangePuppeteerBlinkLeft,
  puppeteerBlinkRight = 0,
  onChangePuppeteerBlinkRight,
  enableCorneaLighting = true,
  onToggleCorneaLighting,
  disableVideoBlinking = true,
  onToggleDisableVideoBlinking,
  puppeteerBrowRaise = 0,
  onChangePuppeteerBrowRaise,
  puppeteerBrowFurrow = 0,
  onChangePuppeteerBrowFurrow,
  puppeteerBrowAsymmetry = 0,
  onChangePuppeteerBrowAsymmetry,
  puppeteerSmile = 0,
  onChangePuppeteerSmile,
  sentimentMode = "auto",
  onChangeSentimentMode,
  sentimentIntensity = 1.0,
  onChangeSentimentIntensity,
  sentimentTelem,
  conversationalTurnMode = "auto",
  onChangeConversationalTurnMode,
  facsOverrides = {},
  onChangeFacsOverride,
  onClearFacsOverrides,

  enableChroma = false,
  onToggleChroma = () => {},
  transparentMode = false,
  onToggleTransparentMode = () => {},
  chromaMode = 3,
  onChangeChromaMode = () => {},
  autoDetectChroma = true,
  onToggleAutoDetectChroma = () => {},
  chromaSimilarity = 0.35,
  onChangeChromaSimilarity = () => {},
  chromaSmoothness = 0.10,
  onChangeChromaSmoothness = () => {},
  despillStrength = 0.85,
  onChangeDespillStrength = () => {},
  selectedStudioBgId = "studio_plate_standup_skyline_9x16",
  onChangeStudioBgId = () => {},

  activeCamera = "CAM1_ANCHOR_CLOSE",
  onChangeActiveCamera = () => {},
  cameraTransitionMode = "dolly",
  onChangeCameraTransitionMode = () => {},
  autoDirector = false,
  onToggleAutoDirector = () => {},

  codebookType,
  onChangeCodebook,
  onTriggerSample,
  activeAudioKey,
  isGenerating,
  jawDescentFactor,
  onChangeJawDescent,
  smoothFactor,
  onChangeSmoothFactor,
  offsetX,
  offsetY,
  onChangeOffsetX,
  onChangeOffsetY,
  scale,
  onChangeScale,
  showBoundingBox,
  onToggleBoundingBox,
  psnrDb,
  visemeCount,

  isWebGPUReady,
  isWebGPUInitializing,
  webGPUProgress,
  webGPUStage,
  onInitWebGPU,
  onClearDiskCache,
  precision,
  onChangePrecision,
  stride,
  onChangeStride,
  batchSize,
  onChangeBatchSize,
  onPrecalcCodebook,
  onExportCodebook,
  isExportingVideo = false,
  exportProgress = 0,
  exportStage = "",
  onExportVideo,
  onCancelExport,
  videoMode = "auto_fsm",
  onChangeVideoMode,
  isWebGLReady = true,
  fsmBeatCount = 7,
}) {
  const activeFacsOverrideCount = React.useMemo(() => {
    const facsCount = Object.values(facsOverrides || {}).filter(
      (v) => v !== null && v !== undefined
    ).length;
    const poseCount =
      (Math.abs(puppeteerSmile) > 0.005 ? 1 : 0) +
      (Math.abs(puppeteerBrowRaise) > 0.005 ? 1 : 0) +
      (Math.abs(puppeteerBrowFurrow) > 0.005 ? 1 : 0) +
      (Math.abs(puppeteerBrowAsymmetry) > 0.005 ? 1 : 0) +
      (Math.abs(puppeteerBlinkLeft) > 0.005 ? 1 : 0) +
      (Math.abs(puppeteerBlinkRight) > 0.005 ? 1 : 0) +
      (Math.abs(puppeteerWidening - 1.0) > 0.005 ? 1 : 0) +
      (Math.abs(puppeteerGazeX) > 0.005 ? 1 : 0) +
      (Math.abs(puppeteerGazeY) > 0.005 ? 1 : 0);
    return facsCount + poseCount;
  }, [
    facsOverrides,
    puppeteerSmile,
    puppeteerBrowRaise,
    puppeteerBrowFurrow,
    puppeteerBrowAsymmetry,
    puppeteerBlinkLeft,
    puppeteerBlinkRight,
    puppeteerWidening,
    puppeteerGazeX,
    puppeteerGazeY,
  ]);

  const renderFacsSlider = (item: {
    key: keyof FacsManualOverrides;
    label: string;
    min: number;
    max: number;
    step: number;
    defaultVal: number;
  }) => {
    const rawOverride = facsOverrides?.[item.key];
    const isOverridden = rawOverride !== null && rawOverride !== undefined;
    const val = isOverridden ? (rawOverride as number) : item.defaultVal;
    return (
      <div key={item.key} className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-neutral-300 truncate">{item.label}</span>
          <div className="flex items-center gap-1.5">
            <span className={isOverridden ? "text-purple-300 font-bold" : "text-neutral-500"}>
              {isOverridden ? `${Math.round(val * 100)}%` : "AUTO"}
            </span>
            {isOverridden && (
              <button
                type="button"
                onClick={() => onChangeFacsOverride?.(item.key, null)}
                title="Release manual override back to Auto"
                className="px-1 rounded bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white text-[9px] cursor-pointer"
              >
                ×
              </button>
            )}
          </div>
        </div>
        <input
          type="range"
          min={item.min}
          max={item.max}
          step={item.step}
          value={val}
          onChange={(e) => onChangeFacsOverride?.(item.key, parseFloat(e.target.value))}
          className="w-full accent-purple-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 bg-neutral-900/60 rounded-2xl border border-neutral-800 p-4 text-xs font-sans text-neutral-300">
      {/* 0. Avatar & Driver Plate Selector */}
      <div className="flex flex-col gap-2.5 pb-3 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-white flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>0. Avatar &amp; Driver Plate</span>
          </label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleLandmarks}
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
                showLandmarks
                  ? "bg-cyan-950 border-cyan-400 text-cyan-200 shadow-cyan-500/20"
                  : "bg-black/60 border-neutral-700 text-neutral-400 hover:text-white"
              }`}
              title="Toggle 64/68 Facial Landmark Points Overlay (Eyes, Lips, Eyebrows, Jaw)"
            >
              <Target className="w-3 h-3 text-cyan-400" />
              <span>{showLandmarks ? "🔍 64 Pts: ON" : "🔍 64 Pts: OFF"}</span>
            </button>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              3DMM
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {platePresets.map((preset) => {
            const isActive = activePlateId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onChangePlate(preset.id)}
                className={`flex items-center gap-2 p-2 rounded-xl text-left border transition-all cursor-pointer ${
                  isActive
                    ? "bg-emerald-950/70 border-emerald-500/60 text-white shadow-md ring-1 ring-emerald-500/40"
                    : "bg-neutral-800/40 border-neutral-700/50 text-neutral-400 hover:text-white hover:bg-neutral-800/70"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preset.avatarSrc}
                  alt={preset.name}
                  className="w-8 h-8 rounded-lg object-cover border border-white/10 shrink-0"
                />
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-[11px] truncate text-neutral-200" title={preset.name}>
                      {preset.name.replace(/ (Vance|Rossi|Sterling|Burgundy)/g, "")}
                    </span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                  </div>
                  <span className="text-[9px] font-mono text-neutral-400 truncate" title={preset.description}>
                    {preset.description || (preset.type === "image" ? "Photo 1024" : "Video Loop")}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. Autonomous Behavior & Affect (Unified Turn State + Sentiment + Kinematics) */}
      <div className="flex flex-col gap-2.5 pb-3 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>1. Autonomous Behavior &amp; Affect</span>
          </label>
          <button
            type="button"
            onClick={onToggleAutoKinematics}
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium border transition-all cursor-pointer ${
              autoKinematics
                ? "bg-cyan-950/80 text-cyan-300 border-cyan-500/50 shadow-sm"
                : "bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white"
            }`}
          >
            {autoKinematics ? "● Auto Kinematics ON" : "○ Static Pose Only"}
          </button>
        </div>

        {/* Conversational Turn State Machine */}
        <div className="flex flex-col gap-1.5 pt-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-neutral-400 flex items-center gap-1">
              <Activity className="w-3 h-3 text-cyan-400" />
              <span>Conversational Turn State</span>
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold uppercase">
              {conversationalTurnMode}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1 p-0.5 rounded-lg bg-black/40 border border-white/10">
            {[
              { id: "auto", label: "⚡ Auto", desc: "Auto speech/idle transition" },
              { id: "speaking", label: "🗣️ Speak", desc: "Active prosodic speech & stress" },
              { id: "listening", label: "👂 Listen", desc: "Backchannel nod + warm smile + lip press" },
              { id: "thinking", label: "🤔 Think", desc: "Cognitive gaze aversion + brow asymmetry + chin raise" },
              { id: "idle", label: "😌 Idle", desc: "Calm resting baseline" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                title={t.desc}
                onClick={() => onChangeConversationalTurnMode?.(t.id as ConversationalTurnMode)}
                className={`py-1 px-1 rounded text-[9px] font-mono font-medium transition-all cursor-pointer truncate ${
                  conversationalTurnMode === t.id
                    ? "bg-cyan-500 text-black font-bold shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Emotional Sentiment & Prosody HUD */}
        <div className="flex flex-col gap-1.5 pt-1.5 border-t border-neutral-800/60">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-neutral-400 flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-400" />
              <span>Emotional Sentiment</span>
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-950 border border-amber-500/40 text-amber-300 font-bold uppercase">
              {sentimentMode} ({Math.round(sentimentIntensity * 100)}%)
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-black/40 border border-white/10">
            {[
              { id: "auto", label: "⚡ Auto" },
              { id: "angry", label: "😠 Angry" },
              { id: "happy", label: "😄 Happy" },
              { id: "somber", label: "😔 Somber" },
              { id: "surprised", label: "😲 Shock" },
              { id: "neutral", label: "😐 Neutral" },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onChangeSentimentMode?.(m.id as SentimentMode)}
                className={`py-1 px-1.5 rounded text-[10px] font-mono font-medium transition-all cursor-pointer ${
                  sentimentMode === m.id
                    ? "bg-amber-500 text-black font-bold shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1 pt-0.5">
            <div className="flex justify-between text-[10px] font-mono text-neutral-400">
              <span>Sentiment Intensity:</span>
              <span className="text-amber-400 font-bold">{Math.round(sentimentIntensity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="2.0"
              step="0.05"
              value={sentimentIntensity}
              onChange={(e) => onChangeSentimentIntensity?.(parseFloat(e.target.value))}
              className="w-full accent-amber-500 bg-white/10 rounded-lg h-1.5 cursor-pointer appearance-none"
            />
          </div>

          {sentimentMode === "auto" && sentimentTelem && (
            <div className="p-2 rounded-xl bg-black/50 border border-white/10 space-y-1.5 text-[9px] font-mono">
              <div className="flex justify-between items-center text-neutral-400">
                <span>Acoustic Energy (RMS):</span>
                <span className="text-cyan-300 font-bold">
                  {Math.round(sentimentTelem.energyRms * 100)}%
                </span>
              </div>
              <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-75"
                  style={{ width: `${Math.min(100, sentimentTelem.energyRms * 200)}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-neutral-400">
                <span>Agitation &amp; Stress Trigger:</span>
                <span className={`font-bold ${sentimentTelem.agitationScore > 0.38 ? "text-red-400" : "text-emerald-400"}`}>
                  {Math.round(sentimentTelem.agitationScore * 100)}%
                </span>
              </div>
              <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-75 ${sentimentTelem.agitationScore > 0.38 ? "bg-red-500" : "bg-emerald-400"}`}
                  style={{ width: `${Math.min(100, sentimentTelem.agitationScore * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Movement Preset & Respiration when Auto Kinematics is enabled */}
        {autoKinematics && (
          <div className="flex flex-col gap-2 pt-1.5 border-t border-neutral-800/60">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono text-neutral-400">
                Movement Style Preset
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {[
                  { id: "dynamic_flow", label: "Dynamic Flow" },
                  { id: "intense_anchor", label: "Intense Anchor" },
                  { id: "deep_analyst", label: "Deep Analyst" },
                  { id: "attentive_listener", label: "Attentive Listener" },
                  { id: "breaking_news", label: "Breaking News" },
                  { id: "warm_welcoming", label: "Warm Welcoming" },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onChangeIdlePreset(p.id as IdlePresetType)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-all text-center truncate cursor-pointer ${
                      idlePreset === p.id
                        ? "bg-cyan-950/70 border-cyan-500/60 text-cyan-200 shadow-sm ring-1 ring-cyan-500/30"
                        : "bg-neutral-800/50 border-neutral-700/60 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1 pt-0.5">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-neutral-400">🫁 Respiration (Breathing Depth)</span>
                <span className={`font-bold ${respirationScale === 0 ? "text-neutral-500" : "text-emerald-400"}`}>
                  {respirationScale === 0 ? "0.00x (OFF)" : `${respirationScale.toFixed(2)}x`}
                </span>
              </div>
              <input
                type="range"
                min={0.0}
                max={2.0}
                step={0.05}
                value={respirationScale}
                onChange={(e) => onChangeRespirationScale?.(parseFloat(e.target.value))}
                className="w-full accent-emerald-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer appearance-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. Manual Pose & FACS Overrides (Unified 4-Tab Matrix) */}
      <div className="flex flex-col gap-2.5 pb-3 border-b border-neutral-800">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-semibold text-white flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>2. Manual Pose &amp; FACS Overrides</span>
          </label>
          <div className="flex items-center gap-1.5">
            {activeFacsOverrideCount > 0 ? (
              <button
                type="button"
                onClick={() => onClearFacsOverrides?.()}
                title="Reset all manual pose & FACS overrides to 100% Auto Synthesis"
                className="px-2 py-0.5 rounded-full bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-200 text-[9px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Reset ({activeFacsOverrideCount})</span>
              </button>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[9px] font-mono">
                AUTO
              </span>
            )}
          </div>
        </div>

        {/* 4 Clean Domain Tabs: Head & Body | Eyes & Gaze | Brows & Cheeks | Mouth & Chin */}
        <div className="grid grid-cols-4 gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10 text-[10px] font-mono">
          <button
            type="button"
            onClick={() => onChangePuppeteeringTab?.("head")}
            className={`py-1 px-1 rounded-md transition-all cursor-pointer truncate ${
              puppeteeringTab === "head" ? "bg-sky-500 text-black font-bold" : "text-neutral-400 hover:text-white"
            }`}
          >
            Head &amp; Body
          </button>
          <button
            type="button"
            onClick={() => onChangePuppeteeringTab?.("eyes")}
            className={`py-1 px-1 rounded-md transition-all cursor-pointer truncate ${
              puppeteeringTab === "eyes" ? "bg-purple-500 text-white font-bold" : "text-neutral-400 hover:text-white"
            }`}
          >
            Eyes &amp; Gaze
          </button>
          <button
            type="button"
            onClick={() => onChangePuppeteeringTab?.("brows")}
            className={`py-1 px-1 rounded-md transition-all cursor-pointer truncate ${
              puppeteeringTab === "brows" ? "bg-amber-500 text-black font-bold" : "text-neutral-400 hover:text-white"
            }`}
          >
            Brows &amp; Cheeks
          </button>
          <button
            type="button"
            onClick={() => onChangePuppeteeringTab?.("mouth")}
            className={`py-1 px-1 rounded-md transition-all cursor-pointer truncate ${
              puppeteeringTab === "mouth" ? "bg-emerald-500 text-black font-bold" : "text-neutral-400 hover:text-white"
            }`}
          >
            Mouth &amp; Chin
          </button>
        </div>

        {/* Tab 1: Head & Body Kinematics */}
        {puppeteeringTab === "head" && (
          <div className="flex flex-col gap-2 pt-1 text-[11px] font-mono">
            <div>
              <div className="flex justify-between mb-1 text-[10px]">
                <span className="text-neutral-400">Head Yaw (Turn):</span>
                <span className="text-cyan-400 font-bold">{puppeteerYaw.toFixed(1)}°</span>
              </div>
              <input
                type="range"
                min={-25}
                max={25}
                step={0.5}
                value={puppeteerYaw}
                onChange={(e) => onChangePuppeteerYaw?.(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1 text-[10px]">
                <span className="text-neutral-400">Head Pitch (Nod):</span>
                <span className="text-cyan-400 font-bold">{puppeteerPitch.toFixed(1)}°</span>
              </div>
              <input
                type="range"
                min={-20}
                max={20}
                step={0.5}
                value={puppeteerPitch}
                onChange={(e) => onChangePuppeteerPitch?.(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Kinematic Chain Coupling Toggle */}
            <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px]">
              <span className="text-neutral-300 flex items-center gap-1.5">
                <Link2 className="w-3 h-3 text-emerald-400" />
                <span>Kinematic Chain (Auto-Compensate)</span>
              </span>
              <button
                type="button"
                onClick={onToggleKinematicCoupling}
                className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${
                  kinematicCoupling
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-neutral-800 text-neutral-400 border border-neutral-700"
                }`}
              >
                {kinematicCoupling ? "LINKED" : "ISOLATED"}
              </button>
            </div>

            <div>
              <div className="flex justify-between mb-1 text-[10px]">
                <span className="text-neutral-400">Head Roll (Tilt):</span>
                <span className="text-cyan-400 font-bold">{puppeteerRoll.toFixed(1)}°</span>
              </div>
              <input
                type="range"
                min={-9}
                max={9}
                step={0.5}
                value={puppeteerRoll}
                onChange={(e) => {
                  const newRoll = parseFloat(e.target.value);
                  const delta = newRoll - puppeteerRoll;
                  onChangePuppeteerRoll?.(newRoll);
                  if (kinematicCoupling) {
                    onChangePuppeteerBodyRoll?.(
                      Math.max(-3.0, Math.min(3.0, parseFloat((puppeteerBodyRoll + delta * 0.15).toFixed(1))))
                    );
                    onChangePuppeteerPelvisRoll?.(
                      Math.max(-9, Math.min(9, parseFloat((puppeteerPelvisRoll - delta * 0.20).toFixed(1))))
                    );
                  }
                }}
                className="w-full accent-cyan-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1 text-[10px]">
                <span className="text-neutral-400">Body / Torso Tilt:</span>
                <span className="text-emerald-400 font-bold">{puppeteerBodyRoll.toFixed(1)}°</span>
              </div>
              <input
                type="range"
                min={-3.0}
                max={3.0}
                step={0.1}
                value={puppeteerBodyRoll}
                onChange={(e) => {
                  const newBodyRoll = parseFloat(e.target.value);
                  const delta = newBodyRoll - puppeteerBodyRoll;
                  onChangePuppeteerBodyRoll?.(newBodyRoll);
                  if (kinematicCoupling) {
                    onChangePuppeteerRoll?.(
                      Math.max(-9, Math.min(9, parseFloat((puppeteerRoll + delta * 2.5).toFixed(1))))
                    );
                    onChangePuppeteerPelvisRoll?.(
                      Math.max(-9, Math.min(9, parseFloat((puppeteerPelvisRoll - delta * 2.0).toFixed(1))))
                    );
                  }
                }}
                className="w-full accent-emerald-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1 text-[10px]">
                <span className="text-neutral-400">Pelvis / Hip Tilt:</span>
                <span className="text-teal-400 font-bold">{puppeteerPelvisRoll.toFixed(1)}°</span>
              </div>
              <input
                type="range"
                min={-9}
                max={9}
                step={0.5}
                value={puppeteerPelvisRoll}
                onChange={(e) => {
                  const newPelvisRoll = parseFloat(e.target.value);
                  const delta = newPelvisRoll - puppeteerPelvisRoll;
                  onChangePuppeteerPelvisRoll?.(newPelvisRoll);
                  if (kinematicCoupling) {
                    onChangePuppeteerBodyRoll?.(
                      Math.max(-3.0, Math.min(3.0, parseFloat((puppeteerBodyRoll - delta * 0.12).toFixed(1))))
                    );
                    onChangePuppeteerRoll?.(
                      Math.max(-9, Math.min(9, parseFloat((puppeteerRoll - delta * 0.20).toFixed(1))))
                    );
                  }
                }}
                className="w-full accent-teal-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/5">
              <div>
                <div className="flex justify-between mb-1 text-[9px] text-neutral-400">
                  <span>Lean Z:</span>
                  <span className="text-indigo-400 font-bold">{(puppeteerLeanZ * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min={-0.10}
                  max={0.10}
                  step={0.01}
                  value={puppeteerLeanZ}
                  onChange={(e) => onChangePuppeteerLeanZ?.(parseFloat(e.target.value))}
                  className="w-full accent-indigo-400 h-1 bg-neutral-800 rounded cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1 text-[9px] text-neutral-400">
                  <span>Shift X:</span>
                  <span className="text-indigo-400 font-bold">{(puppeteerShiftX * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min={-0.06}
                  max={0.06}
                  step={0.01}
                  value={puppeteerShiftX}
                  onChange={(e) => onChangePuppeteerShiftX?.(parseFloat(e.target.value))}
                  className="w-full accent-indigo-400 h-1 bg-neutral-800 rounded cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1 text-[9px] text-neutral-400">
                  <span>Shift Y:</span>
                  <span className="text-indigo-400 font-bold">{(puppeteerShiftY * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min={-0.06}
                  max={0.06}
                  step={0.01}
                  value={puppeteerShiftY}
                  onChange={(e) => onChangePuppeteerShiftY?.(parseFloat(e.target.value))}
                  className="w-full accent-indigo-400 h-1 bg-neutral-800 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Eyes & Gaze */}
        {puppeteeringTab === "eyes" && (
          <div className="flex flex-col gap-2 pt-1 text-[11px] font-mono">
            <div>
              <div className="flex justify-between mb-1 text-[10px]">
                <span className="text-neutral-400">Gaze X (Left/Right):</span>
                <span className="text-purple-400 font-bold">{puppeteerGazeX.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={-1.0}
                max={1.0}
                step={0.05}
                value={puppeteerGazeX}
                onChange={(e) => onChangePuppeteerGazeX?.(parseFloat(e.target.value))}
                className="w-full accent-purple-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1 text-[10px]">
                <span className="text-neutral-400">Gaze Y (Up/Down):</span>
                <span className="text-purple-400 font-bold">{puppeteerGazeY.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={-1.0}
                max={1.0}
                step={0.05}
                value={puppeteerGazeY}
                onChange={(e) => onChangePuppeteerGazeY?.(parseFloat(e.target.value))}
                className="w-full accent-purple-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1 text-[10px]">
                <span className="text-neutral-400">Eye Widening (AU5):</span>
                <span className="text-purple-400 font-bold">{puppeteerWidening.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={0.80}
                max={1.30}
                step={0.05}
                value={puppeteerWidening}
                onChange={(e) => onChangePuppeteerWidening?.(parseFloat(e.target.value))}
                className="w-full accent-purple-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
              />
            </div>

            {renderFacsSlider({
              key: "duchenneTension",
              label: "Duchenne Squint / Crow's Feet (AU6/7)",
              min: 0.0,
              max: 1.0,
              step: 0.02,
              defaultVal: 0.0,
            })}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <div className="flex justify-between mb-1 text-[10px]">
                  <span className="text-neutral-400">Left Wink:</span>
                  <span className="text-rose-400 font-bold">{(puppeteerBlinkLeft * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min={0.0}
                  max={1.0}
                  step={0.05}
                  value={puppeteerBlinkLeft}
                  onChange={(e) => onChangePuppeteerBlinkLeft?.(parseFloat(e.target.value))}
                  className="w-full accent-rose-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1 text-[10px]">
                  <span className="text-neutral-400">Right Wink:</span>
                  <span className="text-rose-400 font-bold">{(puppeteerBlinkRight * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min={0.0}
                  max={1.0}
                  step={0.05}
                  value={puppeteerBlinkRight}
                  onChange={(e) => onChangePuppeteerBlinkRight?.(parseFloat(e.target.value))}
                  className="w-full accent-rose-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 pt-2 border-t border-white/5">
              <label className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/[0.08] transition-all">
                <span className="text-[10px] text-neutral-200 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>Cornea Lighting &amp; Specular Dome</span>
                </span>
                <input
                  type="checkbox"
                  checked={enableCorneaLighting}
                  onChange={onToggleCorneaLighting}
                  className="w-3.5 h-3.5 rounded border-white/20 bg-black/40 text-cyan-500 accent-cyan-400 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/[0.08] transition-all">
                <span className="text-[10px] text-neutral-200 flex items-center gap-1.5">
                  <EyeOff className="w-3 h-3 text-purple-400" />
                  <span>Disable Blinking on Videos</span>
                </span>
                <input
                  type="checkbox"
                  checked={disableVideoBlinking}
                  onChange={onToggleDisableVideoBlinking}
                  className="w-3.5 h-3.5 rounded border-white/20 bg-black/40 text-purple-500 accent-purple-400 cursor-pointer"
                />
              </label>
            </div>
          </div>
        )}

        {/* Tab 3: Brows & Cheeks */}
        {puppeteeringTab === "brows" && (
          <div className="flex flex-col gap-2 pt-1 text-[11px] font-mono">
            <div>
              <div className="flex justify-between mb-1 text-[10px]">
                <span className="text-neutral-400">Eyebrow Raise / Lower (AU1/AU2):</span>
                <span className="text-amber-400 font-bold">{puppeteerBrowRaise.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={-0.25}
                max={0.25}
                step={0.02}
                value={puppeteerBrowRaise}
                onChange={(e) => onChangePuppeteerBrowRaise?.(parseFloat(e.target.value))}
                className="w-full accent-amber-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1 text-[10px]">
                <span className="text-neutral-400">Eyebrow Furrow / Glabella (AU4):</span>
                <span className="text-amber-400 font-bold">{(puppeteerBrowFurrow * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min={0.0}
                max={1.0}
                step={0.05}
                value={puppeteerBrowFurrow}
                onChange={(e) => onChangePuppeteerBrowFurrow?.(parseFloat(e.target.value))}
                className="w-full accent-amber-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1 text-[10px]">
                <span className="text-neutral-400">Unilateral Brow Asymmetry:</span>
                <span className="text-cyan-400 font-bold">
                  {puppeteerBrowAsymmetry > 0
                    ? `+${(puppeteerBrowAsymmetry * 100).toFixed(1)}% R`
                    : puppeteerBrowAsymmetry < 0
                      ? `+${(Math.abs(puppeteerBrowAsymmetry) * 100).toFixed(1)}% L`
                      : "0.0%"}
                </span>
              </div>
              <input
                type="range"
                min={-0.12}
                max={0.12}
                step={0.01}
                value={puppeteerBrowAsymmetry}
                onChange={(e) => onChangePuppeteerBrowAsymmetry?.(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
              />
            </div>

            <div className="pt-1 border-t border-white/5 flex flex-col gap-2">
              {renderFacsSlider({
                key: "cheekPuff",
                label: "Cheek Puff / Buccal (AU13/34)",
                min: 0.0,
                max: 1.0,
                step: 0.02,
                defaultVal: 0.0,
              })}
              {renderFacsSlider({
                key: "noseSneer",
                label: "Nose Sneer / Alar Flare (AU9)",
                min: 0.0,
                max: 1.0,
                step: 0.02,
                defaultVal: 0.0,
              })}
            </div>
          </div>
        )}

        {/* Tab 4: Mouth & Chin (Works on Both Original & Inpainted Codebook Mouths) */}
        {puppeteeringTab === "mouth" && (
          <div className="flex flex-col gap-2 pt-1 text-[11px] font-mono">
            <div>
              <div className="flex justify-between mb-1 text-[10px]">
                <span className="text-neutral-400">Smile / Frown (AU12/15):</span>
                <span className={puppeteerSmile >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                  {puppeteerSmile > 0
                    ? `+${(puppeteerSmile * 100).toFixed(0)}% Smile`
                    : puppeteerSmile < 0
                      ? `${(puppeteerSmile * 100).toFixed(0)}% Frown`
                      : "Neutral"}
                </span>
              </div>
              <input
                type="range"
                min={-0.80}
                max={0.80}
                step={0.02}
                value={puppeteerSmile}
                onChange={(e) => onChangePuppeteerSmile?.(parseFloat(e.target.value))}
                className="w-full accent-emerald-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Quick Expression Presets */}
            <div className="grid grid-cols-3 gap-1.5 pb-1 border-b border-white/5">
              <button
                type="button"
                onClick={() => {
                  onChangePuppeteerSmile?.(0.55);
                  onChangePuppeteerBrowRaise?.(0.08);
                  onChangePuppeteerBrowFurrow?.(0.0);
                }}
                className={`py-1 px-1.5 rounded text-[10px] font-mono border transition-all cursor-pointer ${
                  puppeteerSmile > 0.2
                    ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300 font-bold"
                    : "bg-white/5 border-white/10 text-neutral-400 hover:text-white"
                }`}
              >
                😊 Smile
              </button>
              <button
                type="button"
                onClick={() => {
                  onChangePuppeteerSmile?.(-0.40);
                  onChangePuppeteerBrowRaise?.(-0.06);
                  onChangePuppeteerBrowFurrow?.(0.50);
                }}
                className={`py-1 px-1.5 rounded text-[10px] font-mono border transition-all cursor-pointer ${
                  puppeteerSmile < -0.2
                    ? "bg-rose-950/80 border-rose-500/50 text-rose-300 font-bold"
                    : "bg-white/5 border-white/10 text-neutral-400 hover:text-white"
                }`}
              >
                😠 Stern
              </button>
              <button
                type="button"
                onClick={() => onClearFacsOverrides?.()}
                className="py-1 px-1.5 rounded text-[10px] font-mono bg-neutral-800/80 border border-neutral-700 text-neutral-300 hover:text-white transition-all cursor-pointer"
              >
                😐 Reset All
              </button>
            </div>

            {renderFacsSlider({
              key: "asymmetry",
              label: "Smirk / Lip Asymmetry (AU12/14)",
              min: -1.0,
              max: 1.0,
              step: 0.05,
              defaultVal: 0.0,
            })}
            {renderFacsSlider({
              key: "upperLipLift",
              label: "Upper Lip Sneer / Lift (AU10)",
              min: 0.0,
              max: 1.0,
              step: 0.02,
              defaultVal: 0.0,
            })}
            {renderFacsSlider({
              key: "lowerLipDepress",
              label: "Lower Lip Depress (AU16)",
              min: 0.0,
              max: 1.0,
              step: 0.02,
              defaultVal: 0.0,
            })}
            {renderFacsSlider({
              key: "lipCompression",
              label: "Lip Pressor / Tension (AU24)",
              min: 0.0,
              max: 1.0,
              step: 0.02,
              defaultVal: 0.0,
            })}
            {renderFacsSlider({
              key: "chinRaise",
              label: "Chin Raise / Mentalis (AU17)",
              min: 0.0,
              max: 1.0,
              step: 0.02,
              defaultVal: 0.0,
            })}
          </div>
        )}
      </div>

      {/* 0.6 Chroma Key & Alpha Transparency Matrix */}
      <div className="flex flex-col gap-2.5 pb-3 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-white flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>0.6 Chroma Key & Alpha Transparency</span>
          </label>
          <button
            type="button"
            onClick={onToggleChroma}
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium border transition-all cursor-pointer ${
              enableChroma
                ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-sm"
                : "bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white"
            }`}
          >
            {enableChroma ? "● Chroma ON" : "○ Chroma OFF"}
          </button>
        </div>

        {enableChroma && (
          <div className="flex flex-col gap-2.5 pt-1">
            {/* Output Mode Switcher: Alpha Checkerboard vs Virtual Studio Set */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono text-neutral-400">
                Alpha Output Mode
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!transparentMode) onToggleTransparentMode();
                  }}
                  className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all cursor-pointer ${
                    transparentMode
                      ? "bg-emerald-950/70 border-emerald-500/60 text-emerald-200 shadow-sm ring-1 ring-emerald-500/30"
                      : "bg-neutral-800/50 border-neutral-700/60 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
                  }`}
                >
                  <Grid className="w-3 h-3" />
                  <span>🏁 Transparent Alpha</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (transparentMode) onToggleTransparentMode();
                  }}
                  className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all cursor-pointer ${
                    !transparentMode
                      ? "bg-cyan-950/70 border-cyan-500/60 text-cyan-200 shadow-sm ring-1 ring-cyan-500/30"
                      : "bg-neutral-800/50 border-neutral-700/60 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
                  }`}
                >
                  <Film className="w-3 h-3" />
                  <span>📺 Virtual Studio Set</span>
                </button>
              </div>
            </div>

            {/* Chroma Backdrop Mode Selector */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono text-neutral-400">
                Backdrop Key Mode
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { mode: 1, label: "Green", icon: "🟩", desc: "#00FF00" },
                  { mode: 2, label: "Blue", icon: "🟦", desc: "#0000FF" },
                  { mode: 3, label: "Grey", icon: "🔘", desc: "#696a6e" },
                ].map((item) => (
                  <button
                    key={item.mode}
                    type="button"
                    onClick={() => {
                      if (autoDetectChroma) onToggleAutoDetectChroma();
                      onChangeChromaMode(item.mode as 1 | 2 | 3);
                    }}
                    className={`flex flex-col items-center justify-center py-1 px-1 rounded-md text-[10px] font-mono border transition-all cursor-pointer ${
                      !autoDetectChroma && chromaMode === item.mode
                        ? "bg-emerald-950/70 border-emerald-500 text-emerald-200 font-bold"
                        : "bg-neutral-800/40 border-neutral-700/60 text-neutral-400 hover:text-neutral-200"
                    }`}
                  >
                    <span>{item.icon} {item.label}</span>
                    <span className="text-[8px] text-neutral-500">{item.desc}</span>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={onToggleAutoDetectChroma}
                  className={`flex flex-col items-center justify-center py-1 px-1 rounded-md text-[10px] font-mono border transition-all cursor-pointer ${
                    autoDetectChroma
                      ? "bg-purple-950/70 border-purple-500 text-purple-200 font-bold shadow-sm"
                      : "bg-neutral-800/40 border-neutral-700/60 text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  <span>🪄 Auto</span>
                  <span className="text-[8px] text-neutral-500">Detect</span>
                </button>
              </div>
            </div>

            {/* Virtual Studio Environment Picker (When not in transparent mode) */}
            {!transparentMode && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono text-neutral-400">
                  Virtual Studio Environment
                </span>
                <select
                  value={selectedStudioBgId}
                  onChange={(e) => onChangeStudioBgId(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-[11px] text-neutral-200 focus:outline-none focus:border-cyan-500"
                >
                  {STUDIO_BACKGROUNDS.map((bg) => (
                    <option key={bg.id} value={bg.id}>
                      {bg.name} ({bg.category})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sliders: Similarity, Smoothness, Despill */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5">
              <div className="flex flex-col gap-1 bg-black/40 p-2 rounded-lg border border-neutral-800/80">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-neutral-400">Similarity</span>
                  <span className="text-emerald-400 font-semibold">{chromaSimilarity.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.70"
                  step="0.01"
                  value={chromaSimilarity}
                  onChange={(e) => onChangeChromaSimilarity(parseFloat(e.target.value))}
                  className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              <div className="flex flex-col gap-1 bg-black/40 p-2 rounded-lg border border-neutral-800/80">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-neutral-400">Smoothness</span>
                  <span className="text-emerald-400 font-semibold">{chromaSmoothness.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.30"
                  step="0.01"
                  value={chromaSmoothness}
                  onChange={(e) => onChangeChromaSmoothness(parseFloat(e.target.value))}
                  className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              <div className="flex flex-col gap-1 bg-black/40 p-2 rounded-lg border border-neutral-800/80">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-neutral-400">Despill</span>
                  <span className="text-emerald-400 font-semibold">{despillStrength.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.00"
                  max="1.00"
                  step="0.05"
                  value={despillStrength}
                  onChange={(e) => onChangeDespillStrength(parseFloat(e.target.value))}
                  className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 0.7 Multi-Camera Broadcast Director */}
      <div className="flex flex-col gap-2.5 pb-3 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-white flex items-center gap-1.5">
            <Video className="w-3.5 h-3.5 text-blue-400" />
            <span>0.7 Multi-Camera Broadcast Director</span>
          </label>
          <button
            type="button"
            onClick={onToggleAutoDirector}
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium border transition-all cursor-pointer ${
              autoDirector
                ? "bg-blue-950/80 text-blue-300 border-blue-500/50 shadow-sm"
                : "bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white"
            }`}
          >
            {autoDirector ? "● Auto Director ON" : "○ Auto Director OFF"}
          </button>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          {/* Camera Selection Buttons */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-mono text-neutral-400">
              Broadcast Camera Viewport
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
              {[
                { id: "CAM1_ANCHOR_CLOSE" as CameraId, label: "CAM 1 Close", sub: "85mm Anchor" },
                { id: "CAM2_STUDIO_WIDE" as CameraId, label: "CAM 2 Wide", sub: "35mm Desk" },
                { id: "CAM3_SIDEBAR_TICKER" as CameraId, label: "CAM 3 Sidebar", sub: "50mm Angle" },
              ].map((c) => {
                const isActive = activeCamera === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onChangeActiveCamera(c.id)}
                    className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-lg border transition-all cursor-pointer ${
                      isActive
                        ? "bg-blue-950/80 border-blue-500/70 text-blue-200 shadow-sm ring-1 ring-blue-500/30"
                        : "bg-neutral-800/40 border-neutral-700/60 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
                    }`}
                  >
                    <span className="text-[11px] font-semibold">{c.label}</span>
                    <span className="text-[9px] font-mono opacity-70">{c.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Transition Mode Switcher: Dolly vs Cut */}
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[10px] font-mono text-neutral-400">
              Switching Transition Mode
            </span>
            <div className="flex items-center gap-1 bg-black/50 p-0.5 rounded-lg border border-neutral-800">
              {(["dolly", "cut"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onChangeCameraTransitionMode(m)}
                  className={`px-2.5 py-0.5 rounded text-[10px] font-mono uppercase transition-all cursor-pointer ${
                    cameraTransitionMode === m
                      ? "bg-blue-600 text-white font-bold"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {m === "dolly" ? "Smooth Dolly" : "Hard Cut"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 1. WebGPU Model & Neural Pipeline Setup */}
      <div className="flex flex-col gap-3 pb-3 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-white flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>1. Hardware Engine & WebGPU Models</span>
          </label>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
              isWebGPUReady
                ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40"
                : "bg-neutral-800/80 text-neutral-400 border-neutral-700/50"
            }`}
          >
            {isWebGPUReady ? "WebGPU Ready" : "0ms ROM Cache Active"}
          </span>
        </div>

        {/* Action Row: Init WebGPU & Clear Cache */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isWebGPUInitializing || isWebGPUReady}
            onClick={onInitWebGPU}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-medium text-xs border transition-all ${
              isWebGPUReady
                ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-300 cursor-default"
                : isWebGPUInitializing
                ? "bg-cyan-950/50 border-cyan-500/40 text-cyan-300 cursor-wait animate-pulse"
                : "bg-cyan-600 hover:bg-cyan-500 text-white border-transparent shadow-md active:scale-95 cursor-pointer"
            }`}
          >
            {isWebGPUReady ? (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                <span>WebGPU Loaded ({precision.toUpperCase()})</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                <span>{isWebGPUInitializing ? "Initializing GPU..." : "Initialize WebGPU (UNet + VAE)"}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClearDiskCache}
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 border border-neutral-700 text-neutral-400 hover:text-white transition-all cursor-pointer"
            title="Clear persistent browser Cache API for models"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Clear Cache</span>
          </button>
        </div>

        {/* Loading Progress Bar */}
        {isWebGPUInitializing && (
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-mono text-cyan-300">
              <span>{webGPUStage}</span>
              <span>{webGPUProgress}%</span>
            </div>
            <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-cyan-400 h-1.5 transition-all duration-200"
                style={{ width: `${webGPUProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Engine Fine-Tuning Grid */}
        <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
          {/* Precision Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono text-neutral-400">Precision:</label>
            <select
              value={precision}
              onChange={(e) => onChangePrecision(e.target.value as "fp16" | "fp32")}
              className="bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1 text-white text-[11px] focus:outline-none focus:border-cyan-500"
            >
              <option value="fp32">FP32 (Standard ONNX)</option>
              <option value="fp16">FP16⚡ (Shader-F16)</option>
            </select>
          </div>

          {/* Stride Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono text-neutral-400">Keyframe Stride:</label>
            <select
              value={stride}
              onChange={(e) => onChangeStride(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1 text-white text-[11px] focus:outline-none focus:border-cyan-500"
            >
              <option value="1">Dense 25 FPS (0ms)</option>
              <option value="adaptive">Adaptive Velocity</option>
              <option value="2">Fixed Stride 2</option>
              <option value="3">Fixed Stride 3</option>
            </select>
          </div>

          {/* Batch Size */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono text-neutral-400">Batch Size:</label>
            <select
              value={batchSize}
              onChange={(e) => onChangeBatchSize(Number(e.target.value))}
              className="bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1 text-white text-[11px] focus:outline-none focus:border-cyan-500"
            >
              <option value={1}>B = 1 (Low VRAM)</option>
              <option value={4}>B = 4 (Balanced)</option>
              <option value={8}>B = 8 (Max Throughput)</option>
            </select>
          </div>
        </div>

        {/* Codebook Baking Buttons for Current Video */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onPrecalcCodebook}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 font-medium text-[11px] transition-all cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Precalculate Codebook for Active Video</span>
          </button>
          <button
            type="button"
            onClick={onExportCodebook}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 hover:text-white text-[11px] transition-all cursor-pointer"
            title="Export baked codebook as JSON"
          >
            <Download className="w-3 h-3" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* 2. Neural Codebook Selector */}
      <div className="flex flex-col gap-2 pb-3 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-white flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>2. Active Viseme Codebook ROM</span>
          </label>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
            {visemeCount} Visemes • {psnrDb} dB PSNR
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Version 1: Mouth Only */}
          <button
            type="button"
            onClick={() => onChangeCodebook("ditto")}
            className={`px-3 py-2 rounded-xl text-left border transition-all ${
              codebookType === "ditto"
                ? "bg-emerald-950/50 border-emerald-500/50 text-emerald-300 shadow-md ring-1 ring-emerald-500/30"
                : "bg-neutral-800/40 border-neutral-700/50 text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <div className="font-semibold text-[11px] text-white flex items-center justify-between">
              <span>Ditto (Mouth Only)</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
            <p className="text-[9px] font-mono text-neutral-400 mt-0.5">Tight Oral • 42.4 dB</p>
          </button>

          {/* Version 2: Full Bottom Face */}
          <button
            type="button"
            onClick={() => onChangeCodebook("ditto_fullface")}
            className={`px-3 py-2 rounded-xl text-left border transition-all ${
              codebookType === "ditto_fullface"
                ? "bg-emerald-950/50 border-emerald-500/50 text-emerald-300 shadow-md ring-1 ring-emerald-500/30"
                : "bg-neutral-800/40 border-neutral-700/50 text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <div className="font-semibold text-[11px] text-white flex items-center justify-between">
              <span>Ditto (Full Face + Chin)</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
            <p className="text-[9px] font-mono text-neutral-400 mt-0.5">Mandible + Chin • 42.4 dB</p>
          </button>

          {/* MuseTalk */}
          <button
            type="button"
            onClick={() => onChangeCodebook("musetalk")}
            className={`px-3 py-2 rounded-xl text-left border transition-all ${
              codebookType === "musetalk"
                ? "bg-cyan-950/50 border-cyan-500/50 text-cyan-300 shadow-md"
                : "bg-neutral-800/40 border-neutral-700/50 text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <div className="font-semibold text-[11px] text-white">MuseTalk V3</div>
            <p className="text-[9px] font-mono text-neutral-400 mt-0.5">29.5 dB • Latent</p>
          </button>

          {/* Direct WebGPU */}
          <button
            type="button"
            onClick={() => onChangeCodebook("none")}
            className={`px-3 py-2 rounded-xl text-left border transition-all ${
              codebookType === "none"
                ? "bg-purple-950/50 border-purple-500/50 text-purple-300 shadow-md"
                : "bg-neutral-800/40 border-neutral-700/50 text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <div className="font-semibold text-[11px] text-white">Direct WebGPU</div>
            <p className="text-[9px] font-mono text-neutral-400 mt-0.5">UNet Inference</p>
          </button>
        </div>
      </div>

      {/* 3. Broadcast Video Plate & Auto FSM Choreography */}
      <div className="flex flex-col gap-2 pb-3 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-white flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-cyan-400" />
            <span>3. Video Plate & Auto FSM Choreography</span>
          </label>
          <div className="flex items-center gap-1.5">
            {isWebGLReady && (
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 text-cyan-400" />
                <span>WebGL2 (0.1ms)</span>
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {/* Mode 1: Auto FSM Broadcast Sequence */}
          <button
            type="button"
            onClick={() => onChangeVideoMode("auto_fsm")}
            className={`px-2.5 py-2 rounded-xl text-left border transition-all ${
              videoMode === "auto_fsm"
                ? "bg-cyan-950/60 border-cyan-500/60 text-cyan-300 shadow-md ring-1 ring-cyan-500/30"
                : "bg-neutral-800/40 border-neutral-700/50 text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <div className="font-semibold text-[11px] text-white flex items-center justify-between">
              <span>Auto FSM</span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            </div>
            <p className="text-[9px] font-mono text-neutral-400 mt-0.5">
              {fsmBeatCount} Beats • M1↔M5
            </p>
          </button>

          {/* Mode 2: Continuous Video Plate */}
          <button
            type="button"
            onClick={() => onChangeVideoMode("continuous")}
            className={`px-2.5 py-2 rounded-xl text-left border transition-all ${
              videoMode === "continuous"
                ? "bg-emerald-950/60 border-emerald-500/60 text-emerald-300 shadow-md ring-1 ring-emerald-500/30"
                : "bg-neutral-800/40 border-neutral-700/50 text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <div className="font-semibold text-[11px] text-white flex items-center justify-between">
              <span>Continuous</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
            <p className="text-[9px] font-mono text-neutral-400 mt-0.5">47.4s Video • 1138F</p>
          </button>

          {/* Mode 3: Single M1 Loop */}
          <button
            type="button"
            onClick={() => onChangeVideoMode("single_loop")}
            className={`px-2.5 py-2 rounded-xl text-left border transition-all ${
              videoMode === "single_loop"
                ? "bg-amber-950/60 border-amber-500/60 text-amber-300 shadow-md ring-1 ring-amber-500/30"
                : "bg-neutral-800/40 border-neutral-700/50 text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <div className="font-semibold text-[11px] text-white flex items-center justify-between">
              <span>M1 Idle Loop</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            </div>
            <p className="text-[9px] font-mono text-neutral-400 mt-0.5">7.7s Resting • 185F</p>
          </button>
        </div>
      </div>

      {/* 4. Quick Test Audio Tracks */}
      <div className="flex flex-col gap-2 pb-3 border-b border-neutral-800">
        <label className="text-xs font-semibold text-white flex items-center gap-1.5">
          <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>4. Select Audio & Articulate Speech</span>
        </label>

        <div className="grid grid-cols-2 gap-2">
          {SAMPLE_TRACKS.map((t) => {
            const isActive = activeAudioKey === t.key;
            return (
              <button
                key={t.key}
                type="button"
                disabled={isGenerating}
                onClick={() => onTriggerSample(t.key, t.label)}
                className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden ${
                  isActive
                    ? "bg-cyan-950/50 border-cyan-500/60 text-white shadow-md ring-1 ring-cyan-500/30"
                    : "bg-neutral-800/50 border-neutral-700/50 text-neutral-300 hover:text-white hover:bg-neutral-800"
                } ${isGenerating ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[11px] truncate">{t.label.split(" (")[0]}</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-black/40 text-neutral-400">
                    {t.badge}
                  </span>
                </div>
                <div className="text-[9px] font-mono text-neutral-400 mt-1 truncate">
                  {t.label.includes("(") ? t.label.split("(")[1].replace(")", "") : ""}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Biomechanical Calibration Sliders */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-white flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>5. Biomechanical & Geometric Tuning</span>
          </label>
          <button
            type="button"
            onClick={onToggleBoundingBox}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer ${
              showBoundingBox
                ? "bg-cyan-950 text-cyan-300 border-cyan-500/40"
                : "bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white"
            }`}
          >
            <Box className="w-3 h-3" />
            <span>ROI Box</span>
          </button>
        </div>

        {/* Mandibular Jaw Descent Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-neutral-400">Mandibular Jaw Descent:</span>
            <span className="text-amber-400">{jawDescentFactor.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min={0.0}
            max={2.5}
            step={0.05}
            value={jawDescentFactor}
            onChange={(e) => onChangeJawDescent(Number(e.target.value))}
            className="accent-amber-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Temporal Smoothing Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-neutral-400">Temporal Smoothing Factor:</span>
            <span className="text-emerald-400">{smoothFactor.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0.0}
            max={0.8}
            step={0.02}
            value={smoothFactor}
            onChange={(e) => onChangeSmoothFactor(Number(e.target.value))}
            className="accent-emerald-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* X / Y Position Offsets */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-neutral-400">Offset X:</span>
              <span className="text-white">{offsetX}px</span>
            </div>
            <input
              type="range"
              min={-20}
              max={20}
              value={offsetX}
              onChange={(e) => onChangeOffsetX(Number(e.target.value))}
              className="accent-cyan-500 h-1 bg-neutral-800 rounded cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-neutral-400">Offset Y:</span>
              <span className="text-white">{offsetY}px</span>
            </div>
            <input
              type="range"
              min={-20}
              max={20}
              value={offsetY}
              onChange={(e) => onChangeOffsetY(Number(e.target.value))}
              className="accent-cyan-500 h-1 bg-neutral-800 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Scale */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-neutral-400">Patch Scale:</span>
            <span className="text-white">{scale.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min={0.8}
            max={1.2}
            step={0.01}
            value={scale}
            onChange={(e) => onChangeScale(Number(e.target.value))}
            className="accent-cyan-500 h-1 bg-neutral-800 rounded cursor-pointer"
          />
        </div>
      </div>

      {/* 6. Synced Video Render & Export */}
      <div className="flex flex-col gap-2 pt-2 border-t border-neutral-800">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-white flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-cyan-400" />
            <span>6. Synced Video Hardware Export</span>
          </label>
          {isExportingVideo && (
            <span className="text-[10px] font-mono text-amber-400 animate-pulse">
              ● Recording {exportProgress}%
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={isExportingVideo}
            onClick={() => onExportVideo?.("mp4")}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-medium text-xs border transition-all ${
              isExportingVideo
                ? "bg-amber-950/60 border-amber-500/40 text-amber-300 animate-pulse cursor-wait"
                : "bg-cyan-600 hover:bg-cyan-500 text-white border-transparent shadow-lg active:scale-98 cursor-pointer"
            }`}
            title="Export full-resolution MP4 video (H.264 / AVC 60 FPS)"
          >
            <Download className="w-3.5 h-3.5" />
            <div className="flex flex-col items-start leading-tight">
              <span className="font-semibold text-[11px]">Export MP4</span>
              <span className="text-[9px] opacity-80 font-mono">Broadcast 60 FPS</span>
            </div>
          </button>

          <button
            type="button"
            disabled={isExportingVideo}
            onClick={() => onExportVideo?.("webm")}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-medium text-xs border transition-all ${
              isExportingVideo
                ? "bg-amber-950/60 border-amber-500/40 text-amber-300 animate-pulse cursor-wait"
                : "bg-purple-600 hover:bg-purple-500 text-white border-transparent shadow-lg active:scale-98 cursor-pointer"
            }`}
            title="Export 32-bit Transparent WebM with alpha channel (VP9 60 FPS)"
          >
            <Download className="w-3.5 h-3.5" />
            <div className="flex flex-col items-start leading-tight">
              <span className="font-semibold text-[11px]">Export WebM</span>
              <span className="text-[9px] opacity-80 font-mono">Alpha 60 FPS</span>
            </div>
          </button>
        </div>

        {isExportingVideo && (
          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
            <span className="truncate max-w-[220px]">{exportStage}</span>
            <button
              type="button"
              onClick={onCancelExport}
              className="text-red-400 hover:underline cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

StudioControls.displayName = "StudioControls";

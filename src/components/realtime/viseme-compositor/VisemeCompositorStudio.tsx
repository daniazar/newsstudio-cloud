"use client";

import { AcousticSentimentTelemetry,LandmarkCalibration,NEUTRAL_RAW_CALIBRATION,SentimentMode,WebglNeuralVisemeStageHandle } from "@/components/conversational/WebglNeuralVisemeStage";
import { AffineMouthCompositor,LandmarkTarget } from "@/lib/realtime/affineMouthCompositor";
import { AudioFeatureUnpacker } from "@/lib/realtime/audioFeatureUnpacker";
import { AudioVideoSyncClock } from "@/lib/realtime/audioVideoSyncClock";
import { HermiteEasing } from "@/lib/realtime/hermiteEasing";
import {
BiophysicsOptions,
CameraId,
CameraTransitionMode,
ChromaDetectionResult,
ConversationalTurnMode,
DEFAULT_BIOPHYSICS_OPTIONS,
FacsManualOverrides,
resolveClusterByJawDescent,
VisemeTimelineFrame,
} from "@/lib/realtime/liveAnchorStageEngine";
import { MultiAngleYawBlender } from "@/lib/realtime/multiAngleYawBlender";
import { PitchDetector } from "@/lib/realtime/pitchDetector";
import { IdlePresetType,ProceduralLivePortraitDriver } from "@/lib/realtime/proceduralLivePortraitDriver";
import { SyncedVideoExporter } from "@/lib/realtime/useSyncedVideoExporter";
import {
  AvatarCodebookBaker,
  BrowserVisemeCodebookGenerator,
  NeuralCodebookUpgradeClient,
  type BakedCodebookBundle,
  type InMemoryVisemeCodebook,
} from "@/lib/realtime/browserVisemeCodebookGenerator";
import { VisemeCodebookEntry, VisemeCodebookJson, VisemeCodebookService } from "@/lib/realtime/visemeCodebook";
import { AcousticSimHashEngine } from "@/lib/realtime/visemeSimHash";
import { WebGLVisemeCompositor } from "@/lib/realtime/webglVisemeCompositor";
import { WebGPUMuseTalkEngine } from "@/lib/realtime/webgpuMuseTalkEngine";
import { WhisperArticulationPredictor } from "@/lib/realtime/whisperArticulationPredictor";
import { planRubyAutoFsmSequence } from "@/lib/video/loopSelector";
import { ChoreographedBeatNode } from "@/lib/video/loopSelectorTypes";
import { Check, Loader2, Sparkles, Upload } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FsmTimelineStrip } from "./FsmTimelineStrip";
import { StudioCodebookGallery } from "./StudioCodebookGallery";
import { StudioControls } from "./StudioControls";
import { LogEntry, StudioTelemetryLog } from "./StudioTelemetryLog";
import { StudioViewport } from "./StudioViewport";

const CODEBOOK_BUILD_V = "256_ditto_7d_v23";

export interface PlatePreset {
  id: string;
  name: string;
  type: "image" | "video";
  src: string;
  width: number;
  height: number;
  codebookUrl: string;
  codebookLabel: string;
  landmark: LandmarkTarget;
  landmarksUrl?: string;
  aspectClass: string;
  avatarSrc: string;
  description: string;
  yawDeg?: number;
  pitchDeg?: number;
}

export function resolvePresetPersonaId(preset: Pick<PlatePreset, "id" | "src">): string {
  if (preset.id.startsWith("custom_")) {
    return preset.id;
  }
  if (
    preset.id === "ruby_m1_video" ||
    preset.id === "ruby_continuous_video" ||
    preset.src.includes("ruby_burgundy")
  ) {
    return "ruby_burgundy";
  }
  return preset.id.replace(/_(portrait|video)$/, "") || "ruby";
}

export const PLATE_PRESETS: PlatePreset[] = [
  {
    id: "ruby_portrait",
    name: "Ruby Vance (Portrait)",
    type: "image",
    src: "/avatars/ruby.png",
    width: 1024,
    height: 1024,
    codebookUrl: `/assets/avatars/visemes/ruby_ditto_codebook.json?v=${CODEBOOK_BUILD_V}`,
    codebookLabel: "Ruby Calibrated (Ditto HD)",
    landmark: { cx: 523.4, cy: 687.4, w: 193.8, h: 66.28, angle: 0.0, yawDeg: 0, pitchDeg: 0, leftEyeCenter: [391.7, 421.7], rightEyeCenter: [635.7, 412.2], headCenter: [528.8, 523.2], headRadius: [287.2, 336.5] },
    yawDeg: 0,
    pitchDeg: 0,
    aspectClass: "aspect-square",
    avatarSrc: "/avatars/ruby.png",
    description: "1024×1024 Calibrated Studio Anchor Portrait",
  },
  {
    id: "ruby_25deg",
    name: "Ruby Vance (25° Turn)",
    type: "image",
    src: "/avatars/ruby/rotation/ruby_25deg.jpg",
    width: 1024,
    height: 1024,
    codebookUrl: `/assets/avatars/visemes/ruby_25deg_ditto_codebook.json?v=${CODEBOOK_BUILD_V}`,
    codebookLabel: "Ruby 25° (Ditto HD)",
    landmark: { cx: 368.1, cy: 618.1, w: 144.6, h: 63.8, angle: 0.0, yawDeg: -25.0, pitchDeg: 0.0, leftEyeCenter: [309.7, 406.9], rightEyeCenter: [483.2, 400.2], headCenter: [478.2, 495.5], headRadius: [226.7, 300.5] },
    yawDeg: -25.0,
    pitchDeg: 0.0,
    aspectClass: "aspect-square",
    avatarSrc: "/avatars/ruby/rotation/ruby_25deg.jpg",
    description: "1024×1024 25° Gentle 3/4 Turn",
  },
  {
    id: "ruby_45deg",
    name: "Ruby Vance (45° Turn)",
    type: "image",
    src: "/avatars/ruby/rotation/ruby_45deg.jpg",
    width: 1024,
    height: 1024,
    codebookUrl: `/assets/avatars/visemes/ruby_45deg_ditto_codebook.json?v=${CODEBOOK_BUILD_V}`,
    codebookLabel: "Ruby 45° (Ditto HD)",
    landmark: { cx: 325.4, cy: 665.8, w: 154.1, h: 79.5, angle: 0.0, yawDeg: -45.0, pitchDeg: 0.0, leftEyeCenter: [271.1, 420.1], rightEyeCenter: [458.4, 412.1], headCenter: [469.9, 535.9], headRadius: [252.9, 315.4] },
    yawDeg: -45.0,
    pitchDeg: 0.0,
    aspectClass: "aspect-square",
    avatarSrc: "/avatars/ruby/rotation/ruby_45deg.jpg",
    description: "1024×1024 45° Broadcast 3/4 Turn",
  },
  {
    id: "ruby_65deg",
    name: "Ruby Vance (65° Turn)",
    type: "image",
    src: "/avatars/ruby/rotation/ruby_65deg.jpg",
    width: 1024,
    height: 1024,
    codebookUrl: `/assets/avatars/visemes/ruby_65deg_ditto_codebook.json?v=${CODEBOOK_BUILD_V}`,
    codebookLabel: "Ruby 65° (Ditto HD)",
    landmark: { cx: 314.3, cy: 647.2, w: 153.2, h: 79.3, angle: 0.0, yawDeg: -65.0, pitchDeg: 0.0, leftEyeCenter: [263.8, 400.6], rightEyeCenter: [446.3, 397.9], headCenter: [469.6, 513.5], headRadius: [246.7, 309.5] },
    yawDeg: -65.0,
    pitchDeg: 0.0,
    aspectClass: "aspect-square",
    avatarSrc: "/avatars/ruby/rotation/ruby_65deg.jpg",
    description: "1024×1024 65° Oblique Profile",
  },
  {
    id: "ruby_90deg",
    name: "Ruby Vance (90° Profile)",
    type: "image",
    src: "/avatars/ruby/rotation/ruby_90deg.jpg",
    width: 1024,
    height: 1024,
    codebookUrl: `/assets/avatars/visemes/ruby_90deg_ditto_codebook.json?v=${CODEBOOK_BUILD_V}`,
    codebookLabel: "Ruby 90° (Ditto HD)",
    landmark: { cx: 792.5, cy: 628.0, w: 96.3, h: 68.2, angle: -9.52, yawDeg: 90.0, pitchDeg: 0.0, leftEyeCenter: [691.4, 389.0], rightEyeCenter: [793.5, 377.7], headCenter: [560.4, 521.4], headRadius: [173.4, 293.0] },
    yawDeg: 90.0,
    pitchDeg: 0.0,
    aspectClass: "aspect-square",
    avatarSrc: "/avatars/ruby/rotation/ruby_90deg.jpg",
    description: "1024×1024 90° Lateral Profile",
  },
  {
    id: "mateo_portrait",
    name: "Mateo Rossi (Portrait)",
    type: "image",
    src: "/avatars/mateo.png",
    width: 1024,
    height: 1024,
    codebookUrl: `/assets/avatars/visemes/mateo_ditto_codebook.json?v=${CODEBOOK_BUILD_V}`,
    codebookLabel: "Mateo Calibrated (Ditto HD)",
    landmark: { cx: 516.3, cy: 756.9, w: 198.7, h: 57.5, angle: 0.0, leftEyeCenter: [401.9, 480.8], rightEyeCenter: [623.9, 479.8], headCenter: [517.8, 608.0], headRadius: [269.6, 336.4] },
    aspectClass: "aspect-square",
    avatarSrc: "/avatars/mateo.png",
    description: "1024×1024 Anchor Portrait",
  },
  {
    id: "blaze_portrait",
    name: "Blaze Vance (Portrait)",
    type: "image",
    src: "/avatars/blaze.png",
    width: 1024,
    height: 1024,
    codebookUrl: `/assets/avatars/visemes/blaze_ditto_codebook.json?v=${CODEBOOK_BUILD_V}`,
    codebookLabel: "Blaze Calibrated (Ditto HD)",
    landmark: { cx: 513.1, cy: 660.3, w: 170.9, h: 84.3, angle: 0.0, leftEyeCenter: [405.3, 444.3], rightEyeCenter: [613.5, 441.5], headCenter: [517.4, 526.2], headRadius: [244.4, 294.7] },
    aspectClass: "aspect-square",
    avatarSrc: "/avatars/blaze.png",
    description: "1024×1024 Anchor Portrait",
  },
  {
    id: "everett_portrait",
    name: "Everett Sterling (Portrait)",
    type: "image",
    src: "/avatars/everett.png",
    width: 1024,
    height: 1024,
    codebookUrl: `/assets/avatars/visemes/everett_ditto_codebook.json?v=${CODEBOOK_BUILD_V}`,
    codebookLabel: "Everett Calibrated (Ditto HD)",
    landmark: {
      cx: 519.6,
      cy: 745.2,
      w: 242.2,
      h: 72.18,
      angle: 0.0,
      leftEyeCenter: [378.9, 459.4],
      rightEyeCenter: [635.4, 453.8],
      headCenter: [507.1, 510.0],
      headRadius: [280.0, 330.0],
      iod: 270.0,
      chinY: 944.3,
    },
    aspectClass: "aspect-square",
    avatarSrc: "/avatars/everett.png",
    description: "1024×1024 Anchor Portrait",
  },
  {
    id: "yuki_anime",
    name: "Yuki (Anime Anchor)",
    type: "image",
    src: "/avatars/yuki_anime.png",
    width: 1024,
    height: 1024,
    codebookUrl: `/assets/avatars/visemes/yuki_anime_ditto_codebook.json?v=${CODEBOOK_BUILD_V}`,
    codebookLabel: "Yuki Calibrated (Ditto HD)",
    landmark: {
      cx: 512.0,
      cy: 466.9,
      w: 83.9,
      h: 27.51,
      angle: 0.0,
      yawDeg: 0,
      pitchDeg: 0,
      leftEyeCenter: [443.2, 353.4],
      rightEyeCenter: [581.3, 352.4],
      headCenter: [511.5, 410.0],
      headRadius: [180.0, 220.0],
      iod: 134.0,
      chinY: 536.8,
    },
    yawDeg: 0,
    pitchDeg: 0,
    aspectClass: "aspect-square",
    avatarSrc: "/avatars/yuki_anime.png",
    description: "1024×1024 Stylized Anime News Anchor",
  },
  {
    id: "ruby_m1_video",
    name: "Ruby Burgundy (M1 Video Loop)",
    type: "video",
    src: "/assets/action_loops/veo/ruby_burgundy_vertical_backup/ruby_burgundy_M1_loop_v1.mp4",
    width: 1080,
    height: 1920,
    codebookUrl: `/assets/avatars/visemes/ruby_burgundy_ditto_codebook.json?v=${CODEBOOK_BUILD_V}`,
    codebookLabel: "Ruby Burgundy Video (Ditto HD)",
    landmarksUrl: `/assets/avatars/visemes/ruby_burgundy_mediapipe_landmarks.json?v=${CODEBOOK_BUILD_V}`,
    landmark: {
      cx: 551.88,
      cy: 438.19,
      w: 94.5,
      h: 30.56,
      angle: -2.58,
      leftEyeCenter: [491.23, 330.05],
      rightEyeCenter: [595.69, 324.36],
      headCenter: [550.2, 375.84],
      headRadius: [127.16, 143.49],
    },
    aspectClass: "aspect-[9/16]",
    avatarSrc: "/avatars/ruby.png",
    description: "1080×1920 25 FPS Action Video Loop",
  },
  {
    id: "ruby_continuous_video",
    name: "Ruby Burgundy (Continuous FSM)",
    type: "video",
    src: "/assets/action_loops/veo/ruby_burgundy_vertical_backup/ruby_burgundy_continuous.mp4",
    width: 1080,
    height: 1920,
    codebookUrl: `/assets/avatars/visemes/ruby_burgundy_ditto_codebook.json?v=${CODEBOOK_BUILD_V}`,
    codebookLabel: "Ruby Burgundy FSM Suite",
    landmarksUrl: `/assets/avatars/visemes/ruby_burgundy_continuous_landmarks.json?v=${CODEBOOK_BUILD_V}`,
    landmark: {
      cx: 551.88,
      cy: 438.19,
      w: 94.5,
      h: 30.56,
      angle: -2.58,
      leftEyeCenter: [492.97, 329.73],
      rightEyeCenter: [597.44, 324.93],
      headCenter: [551.66, 375.74],
      headRadius: [127.16, 143.64],
    },
    aspectClass: "aspect-[9/16]",
    avatarSrc: "/avatars/ruby.png",
    description: "Multi-Beat Choreographed FSM Sequence",
  },
];

/**
 * Resolves the authoritative LandmarkTarget for a plate preset.
 * MediaPipe-detected landmarks stored in the loaded codebook (`codebookPlateLandmark`)
 * or live MediaPipe detection (`liveLandmark`) ALWAYS take precedence over static
 * `preset.landmark` fallback defaults so hardcoded preset numbers never overwrite
 * real detected geometry (cx, cy, w, h, angle, eye centers, head bounds).
 * Static `preset.yawDeg` / `preset.pitchDeg` are retained only for pre-rotated
 * profile plates (e.g., 25°/45°/65°/90° turn plates) where the 3D pose angle is fixed by the camera.
 */
function resolvePlateLandmark(
  preset: PlatePreset,
  codebookPlateLandmark?: LandmarkTarget | null,
  liveLandmark?: LandmarkTarget | null
): LandmarkTarget {
  const authoritative =
    preset.type !== "video"
      ? liveLandmark || codebookPlateLandmark || preset.landmark
      : preset.landmark;
  return {
    ...preset.landmark,
    ...(preset.type !== "video" && codebookPlateLandmark ? codebookPlateLandmark : undefined),
    ...(preset.type !== "video" && liveLandmark ? liveLandmark : undefined),
    yawDeg: preset.yawDeg ?? authoritative?.yawDeg ?? preset.landmark?.yawDeg,
    pitchDeg: preset.pitchDeg ?? authoritative?.pitchDeg ?? preset.landmark?.pitchDeg,
  };
}

interface DecodedFrameData {
  patch: CanvasImageSource;
  aperture: number;
  jawDescent: number;
  clusterId: number;
  jawDrop: number;
}

export const VisemeCompositorStudio: React.FC = () => {
  // Services (Instantiated once)
  const codebookService = useRef<VisemeCodebookService>(new VisemeCodebookService());
  const mouthCompositor = useRef<AffineMouthCompositor>(new AffineMouthCompositor());
  const webglCompositor = useRef<WebGLVisemeCompositor>(new WebGLVisemeCompositor());

  // HTML Element Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const webglCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Animation & Clock Refs
  const isPlayingRef = useRef(false);
  const vfcIdRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const decodedFramesRef = useRef<Map<number, DecodedFrameData>>(new Map());
  const presenceWeightsRef = useRef<Float32Array | null>(null);
  const avatarLandmarksRef = useRef<LandmarkTarget[]>([]);
  const continuousLandmarksRef = useRef<LandmarkTarget[]>([]);
  const fsmLandmarksMapRef = useRef<Record<string, LandmarkTarget[]>>({});
  const neutralPatchRef = useRef<CanvasImageSource | null>(null);
  const currentFrameRef = useRef<number>(0);
  const activeAudioKeyRef = useRef<string>("user_hello");
  const isInitialLoadedRef = useRef<boolean>(false);

  // Plate Selection & View Mode States (Defaults to Ruby Vance Portrait + Full Single View)
  const [activePlateId, setActivePlateId] = useState<string>("ruby_portrait");
  const [viewMode, setViewMode] = useState<"single" | "wipe" | "side-by-side">("single");
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [showLandmarks, setShowLandmarks] = useState<boolean>(false);

  // Biomechanical & Physiological Realism State
  const viewportStageRef = useRef<WebglNeuralVisemeStageHandle | null>(null);
  const [biophysicsOptions, setBiophysicsOptions] = useState<BiophysicsOptions>(DEFAULT_BIOPHYSICS_OPTIONS);
  const biophysicsOptionsRef = useRef<BiophysicsOptions>(biophysicsOptions);
  biophysicsOptionsRef.current = biophysicsOptions;
  const handleChangeBiophysics = useCallback((opts: Partial<BiophysicsOptions>) => {
    setBiophysicsOptions((prev) => ({ ...prev, ...opts }));
  }, []);

  // 3D Orbital Yaw Rotation (-90° to +90°)
  const [orbitalYaw, setOrbitalYawState] = useState<number>(0);
  const _yawBlenderRef = useRef<MultiAngleYawBlender>(new MultiAngleYawBlender());

  // Live Kinematics (3D Head Motion, Breathing, Blinks) States
  const [autoKinematics, setAutoKinematics] = useState<boolean>(true);
  const autoKinematicsRef = useRef<boolean>(autoKinematics);
  autoKinematicsRef.current = autoKinematics;
  const liveMouthLandmarkRef = useRef<(LandmarkTarget & { plateId?: string }) | null>(null);
  const [idlePreset, setIdlePreset] = useState<IdlePresetType>("dynamic_flow");
  const [dominantBrow, setDominantBrow] = useState<"left" | "right" | "none">("right");
  const sharedDriverRef = useRef<ProceduralLivePortraitDriver>(
    new ProceduralLivePortraitDriver({ idlePreset: "dynamic_flow" })
  );

  const handleChangeIdlePreset = useCallback((preset: IdlePresetType) => {
    setIdlePreset(preset);
    if (sharedDriverRef.current) {
      sharedDriverRef.current.setIdlePreset(preset);
    }
  }, []);

  // Respiration & Puppeteering States
  const [respirationScale, setRespirationScaleState] = useState<number>(0.7);
  const [puppeteeringTab, setPuppeteeringTab] = useState<"head" | "eyes" | "brows" | "mouth">("head");
  const [puppeteerPitch, setPuppeteerPitchState] = useState<number>(0);
  const [puppeteerYaw, setPuppeteerYawState] = useState<number>(0);
  const [puppeteerRoll, setPuppeteerRollState] = useState<number>(0);
  const [puppeteerBodyRoll, setPuppeteerBodyRollState] = useState<number>(0);
  const [puppeteerPelvisRoll, setPuppeteerPelvisRollState] = useState<number>(0);
  const [kinematicCoupling, setKinematicCoupling] = useState<boolean>(true);
  const [puppeteerLeanZ, setPuppeteerLeanZState] = useState<number>(0);
  const [puppeteerShiftX, setPuppeteerShiftXState] = useState<number>(0);
  const [puppeteerShiftY, setPuppeteerShiftYState] = useState<number>(0);
  const [puppeteerGazeX, setPuppeteerGazeX] = useState<number>(0);
  const [puppeteerGazeY, setPuppeteerGazeY] = useState<number>(0);
  const [puppeteerWidening, setPuppeteerWidening] = useState<number>(1.0);
  const [puppeteerBlinkLeft, setPuppeteerBlinkLeft] = useState<number>(0);
  const [puppeteerBlinkRight, setPuppeteerBlinkRight] = useState<number>(0);
  const [enableCorneaLighting, setEnableCorneaLighting] = useState<boolean>(true);
  const [disableVideoBlinking, setDisableVideoBlinking] = useState<boolean>(true);
  const [puppeteerBrowRaise, setPuppeteerBrowRaise] = useState<number>(0);
  const [puppeteerBrowFurrow, setPuppeteerBrowFurrow] = useState<number>(0);
  const [puppeteerBrowAsymmetry, setPuppeteerBrowAsymmetry] = useState<number>(0);
  const [puppeteerSmile, setPuppeteerSmile] = useState<number>(0);

  // Emotional Sentiment States
  const [sentimentMode, setSentimentMode] = useState<SentimentMode>("auto");
  const [sentimentIntensity, setSentimentIntensity] = useState<number>(1.0);
  const [sentimentTelem, setSentimentTelem] = useState<AcousticSentimentTelemetry | null>(null);

  // Phase 3: Conversational Turn State & Advanced FACS Overrides
  const [conversationalTurnMode, setConversationalTurnModeState] = useState<ConversationalTurnMode>("auto");
  const [facsOverrides, setFacsOverridesState] = useState<FacsManualOverrides>({});

  const handleChangeConversationalTurnMode = useCallback((mode: ConversationalTurnMode) => {
    setConversationalTurnModeState(mode);
    const engine = viewportStageRef.current?.getEngine();
    if (engine) {
      engine.setConversationalState(mode);
      engine.renderSingleFrame?.();
    }
  }, []);

  const handleChangeFacsOverride = useCallback(
    (key: keyof FacsManualOverrides, value: number | null) => {
      setFacsOverridesState((prev) => ({ ...prev, [key]: value }));
      const engine = viewportStageRef.current?.getEngine();
      if (engine) {
        engine.setFacsOverrides({ [key]: value });
        engine.renderSingleFrame?.();
      }
      if (!isPlayingRef.current) {
        renderSingleFrameRef.current(currentFrameRef.current, 0);
      }
    },
    []
  );

  const handleClearFacsOverrides = useCallback(() => {
    setFacsOverridesState({});
    setPuppeteerSmile(0);
    setPuppeteerBrowRaise(0);
    setPuppeteerBrowFurrow(0);
    setPuppeteerBrowAsymmetry(0);
    setPuppeteerBlinkLeft(0);
    setPuppeteerBlinkRight(0);
    setPuppeteerWidening(1.0);
    setPuppeteerGazeX(0);
    setPuppeteerGazeY(0);
    const engine = viewportStageRef.current?.getEngine();
    if (engine) {
      engine.clearFacsOverrides();
      engine.setManualPose({
        smileAmount: 0,
        eyebrowRaise: 0,
        eyebrowFurrow: 0,
        eyebrowAsymmetry: 0,
        blinkLeft: 0,
        blinkRight: 0,
        eyeWidening: 1.0,
        gazeX: 0,
        gazeY: 0,
      });
      engine.renderSingleFrame?.();
    }
    if (!isPlayingRef.current) {
      renderSingleFrameRef.current(currentFrameRef.current, 0);
    }
  }, []);

  // Landmark Calibration State (Defaults to Neutral 1.0)
  const [activeCalibration, setActiveCalibration] = useState<LandmarkCalibration>(() => ({
    ...NEUTRAL_RAW_CALIBRATION,
  }));
  const lastSentimentUpdateRef = useRef<number>(0);
  const handleThrottledSentimentTelemetry = useCallback((telem: AcousticSentimentTelemetry) => {
    const now = performance.now();
    if (now - lastSentimentUpdateRef.current >= 100) {
      lastSentimentUpdateRef.current = now;
      setSentimentTelem(telem);
    }
  }, []);

  const [customPresets, setCustomPresets] = useState<PlatePreset[]>([]);
  const allPlatePresets = useMemo(
    () => [...customPresets, ...PLATE_PRESETS],
    [customPresets]
  );
  const allPlatePresetsRef = useRef<PlatePreset[]>(allPlatePresets);
  allPlatePresetsRef.current = allPlatePresets;

  const customUploadInputRef = useRef<HTMLInputElement | null>(null);
  const customUploadFileRef = useRef<File | null>(null);
  const customUploadBasePresetRef = useRef<PlatePreset | null>(null);
  const customBakeAbortRef = useRef<AbortController | null>(null);
  const customRevokeFnsRef = useRef<Array<() => void>>([]);
  const customInMemoryByPresetRef = useRef<Map<string, InMemoryVisemeCodebook>>(new Map());
  const customFileByPresetRef = useRef<Map<string, File>>(new Map());
  const [activeInMemoryCodebook, setActiveInMemoryCodebook] =
    useState<InMemoryVisemeCodebook | null>(null);
  const [customBakeStatus, setCustomBakeStatus] = useState<{
    tier: "idle" | "baking_tier1a" | "baking_tier1b" | "tier1b_ready" | "baking_tier2" | "tier2_ready" | "error";
    progress: number;
    message: string;
  }>({ tier: "idle", progress: 0, message: "" });
  const [neuralBackendOnline, setNeuralBackendOnline] = useState<boolean>(false);

  useEffect(() => {
    const inMemoryMap = customInMemoryByPresetRef.current;
    const fileMap = customFileByPresetRef.current;
    return () => {
      customBakeAbortRef.current?.abort();
      inMemoryMap.clear();
      fileMap.clear();
      for (const fn of customRevokeFnsRef.current) {
        try {
          fn();
        } catch {
          // Ignore cleanup errors
        }
      }
      customRevokeFnsRef.current = [];
    };
  }, []);

  const activePreset = allPlatePresets.find((p) => p.id === activePlateId) || PLATE_PRESETS[0];
  const activePresetRef = useRef(activePreset);
  activePresetRef.current = activePreset;
  const activeImageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (activePreset.type === "image" && activePreset.src) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = activePreset.src;
      img.onload = () => {
        activeImageRef.current = img;
      };
    } else {
      activeImageRef.current = null;
    }
  }, [activePreset.type, activePreset.src]);

  // UI Reactive States (Default to Ditto Fullface + Chin)
  const [codebookType, setCodebookType] = useState<"ditto" | "ditto_fullface" | "musetalk" | "none">("ditto_fullface");
  const codebookTypeRef = useRef<"ditto" | "ditto_fullface" | "musetalk" | "none">("ditto_fullface");
  codebookTypeRef.current = codebookType;
  const [activeCodebookUrl, setActiveCodebookUrl] = useState<string>(
    `/assets/avatars/visemes/ruby_ditto_fullface_codebook.json?v=${CODEBOOK_BUILD_V}`
  );
  const [engineName, setEngineName] = useState<string>("Ditto Fullface + Chin");
  const [visemes, setVisemes] = useState<readonly VisemeCodebookEntry[]>([]);
  const [psnrDb, setPsnrDb] = useState(42.4);
  const [activeAudioKey, setActiveAudioKey] = useState<string>("user_hello");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const totalFramesRef = useRef<number>(0);
  const [syncAudio, setSyncAudio] = useState<HTMLAudioElement | null>(null);
  const [presenceWeight, setPresenceWeight] = useState(1.0);
  const [fps, setFps] = useState(60);

  // Auto-detect hardware display refresh rate on mount for HUD (e.g. 60Hz, 120Hz, 144Hz, 240Hz)
  useEffect(() => {
    let count = 0;
    const start = performance.now();
    let rafId: number;
    const measure = (now: number) => {
      count++;
      if (now - start >= 500) {
        const detectedFps = Math.round((count * 1000) / (now - start));
        setFps(detectedFps >= 30 ? detectedFps : 60);
      } else {
        rafId = requestAnimationFrame(measure);
      }
    };
    rafId = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(rafId);
  }, []);
  const [activeClusterId, setActiveClusterId] = useState<number | null>(null);
  const [activeAperture, setActiveAperture] = useState<number | null>(null);
  const [manualClusterId, setManualClusterId] = useState<number | null>(null);
  const manualClusterIdRef = useRef<number | null>(null);
  manualClusterIdRef.current = manualClusterId;
  const [timelineFrames, setTimelineFrames] = useState<Map<number, VisemeTimelineFrame> | null>(null);
  const [isLooping, setIsLooping] = useState(false);
  const isLoopingRef = useRef(isLooping);
  isLoopingRef.current = isLooping;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = isLooping;
    }
  }, [isLooping]);

  // Auto FSM & WebGL 2.0 States
  const [videoMode, setVideoMode] = useState<"auto_fsm" | "continuous" | "single_loop">("auto_fsm");
  const videoModeRef = useRef<"auto_fsm" | "continuous" | "single_loop">(videoMode);
  videoModeRef.current = videoMode;
  const [fsmSequence, setFsmSequence] = useState<ChoreographedBeatNode[]>([]);
  const [activeFsmBeatIndex, setActiveFsmBeatIndex] = useState<number>(0);
  const [isWebGLReady, setIsWebGLReady] = useState<boolean>(false);

  // Dynamically resolve video source based on videoMode (Continuous, Auto FSM, or Single Loop)
  const effectivePlateSrc = useMemo(() => {
    if (activePreset.type !== "video") return activePreset.src;
    if (videoMode === "continuous") {
      return "/assets/action_loops/veo/ruby_burgundy_vertical_backup/ruby_burgundy_continuous.mp4";
    }
    if (videoMode === "auto_fsm") {
      return fsmSequence[activeFsmBeatIndex]?.videoPath || activePreset.src;
    }
    return activePreset.src;
  }, [activePreset, videoMode, fsmSequence, activeFsmBeatIndex]);

  const effectiveLandmarksUrl = useMemo(() => {
    if (activePreset.type !== "video") return activePreset.landmarksUrl;
    if (videoMode === "continuous") {
      return `/assets/avatars/visemes/ruby_burgundy_continuous_landmarks.json?v=${CODEBOOK_BUILD_V}`;
    }
    if (videoMode === "auto_fsm") {
      return `/assets/avatars/visemes/ruby_burgundy_fsm_landmarks.json?v=${CODEBOOK_BUILD_V}`;
    }
    return activePreset.landmarksUrl;
  }, [activePreset, videoMode]);

  // Chroma Key & Alpha Transparency State
  const [enableChroma, setEnableChroma] = useState<boolean>(false);
  const [transparentMode, setTransparentMode] = useState<boolean>(true);
  const [chromaMode, setChromaMode] = useState<1 | 2 | 3>(3);
  const [autoDetectChroma, setAutoDetectChroma] = useState<boolean>(true);
  const [chromaKeyColor, setChromaKeyColor] = useState<[number, number, number]>([0x69 / 255, 0x6a / 255, 0x6e / 255]);
  const [chromaSimilarity, setChromaSimilarity] = useState<number>(0.35);
  const [chromaSmoothness, setChromaSmoothness] = useState<number>(0.10);
  const [despillStrength, setDespillStrength] = useState<number>(0.85);
  const [selectedStudioBgId, setSelectedStudioBgId] = useState<string>("studio_plate_standup_skyline_9x16");

  // Multi-Camera Director States
  const [activeCamera, setActiveCamera] = useState<CameraId>("CAM1_ANCHOR_CLOSE");
  const [cameraTransitionMode, setCameraTransitionMode] = useState<CameraTransitionMode>("dolly");
  const [autoDirector, setAutoDirector] = useState<boolean>(false);

  // Biomechanical Calibration State
  const [jawDescentFactor, setJawDescentFactor] = useState(1.0);
  const [smoothFactor, setSmoothFactor] = useState(0.35);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [showBoundingBox, setShowBoundingBox] = useState(false);

  // Dynamic Studio Relighting & Specularity States (Tasks 3 & 5)
  const [rimIntensity, setRimIntensity] = useState<number>(0.35);
  const [lipMoisture, setLipMoisture] = useState<number>(1.0);
  const [enamelFresnel, setEnamelFresnel] = useState<number>(1.0);

  // Mutable Synchronized Refs for Zero-Latency Animation Loop & Real-Time Tuning
  const showBoundingBoxRef = useRef(showBoundingBox);
  showBoundingBoxRef.current = showBoundingBox;
  const jawDescentFactorRef = useRef(jawDescentFactor);
  jawDescentFactorRef.current = jawDescentFactor;
  const offsetXRef = useRef(offsetX);
  offsetXRef.current = offsetX;
  const offsetYRef = useRef(offsetY);
  offsetYRef.current = offsetY;
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  const selectedStudioBgIdRef = useRef(selectedStudioBgId);
  selectedStudioBgIdRef.current = selectedStudioBgId;
  const rimIntensityRef = useRef(rimIntensity);
  rimIntensityRef.current = rimIntensity;
  const lipMoistureRef = useRef(lipMoisture);
  lipMoistureRef.current = lipMoisture;
  const enamelFresnelRef = useRef(enamelFresnel);
  enamelFresnelRef.current = enamelFresnel;

  // Task 4: Biomechanical Pitch (F0) & Pre-speech Respiration Refs
  const pitchF0Ref = useRef<Float32Array | null>(null);
  const respirationWeightsRef = useRef<Float32Array | null>(null);

  const isRenderingFrameRef = useRef(false);
  const renderSingleFrameRef = useRef<(targetAudioFrame: number, videoFrameIdx: number) => void>(() => {});
  const handleMouthLandmark = useCallback((lm: LandmarkTarget) => {
    const currentEngine = viewportStageRef.current?.getEngine();
    const activeEngineSrc = currentEngine?.getActiveSrc() || "";
    const expectedPreset = activePresetRef.current;
    
    // Guard against stale callbacks from the previous media plate
    if (expectedPreset.src && !activeEngineSrc.includes(expectedPreset.src)) {
      return;
    }
    // Guard against landmark coordinate jumps across avatars (e.g. Ruby cy=687 vs Yuki cy=462)
    if (expectedPreset.landmark && Math.abs(lm.cy - expectedPreset.landmark.cy) > 100) {
      return;
    }

    liveMouthLandmarkRef.current = {
      ...lm,
      plateId: activePresetRef.current.id,
    };
    if (!isPlayingRef.current && !isRenderingFrameRef.current) {
      renderSingleFrameRef.current(currentFrameRef.current, 0);
    }
  }, []);

  // Synchronized puppeteering state setters with immediate zero-latency single frame updates
  const puppeteerPitchRef = useRef(puppeteerPitch);
  puppeteerPitchRef.current = puppeteerPitch;
  const setPuppeteerPitch = useCallback((v: number | ((prev: number) => number)) => {
    const nextVal = typeof v === "function" ? v(puppeteerPitchRef.current) : v;
    puppeteerPitchRef.current = nextVal;
    setPuppeteerPitchState(nextVal);
    const engine = viewportStageRef.current?.getEngine();
    if (engine) {
      engine.setManualPose({ headPitch: nextVal });
      engine.renderSingleFrame?.();
    }
    if (!isPlayingRef.current) {
      renderSingleFrameRef.current(currentFrameRef.current, 0);
    }
  }, []);

  const puppeteerYawRef = useRef(puppeteerYaw);
  puppeteerYawRef.current = puppeteerYaw;
  const setPuppeteerYaw = useCallback((v: number | ((prev: number) => number)) => {
    const nextVal = typeof v === "function" ? v(puppeteerYawRef.current) : v;
    puppeteerYawRef.current = nextVal;
    setPuppeteerYawState(nextVal);
    const engine = viewportStageRef.current?.getEngine();
    if (engine) {
      engine.setManualPose({ headYaw: nextVal });
      engine.renderSingleFrame?.();
    }
    if (!isPlayingRef.current) {
      renderSingleFrameRef.current(currentFrameRef.current, 0);
    }
  }, []);

  const puppeteerRollRef = useRef(puppeteerRoll);
  puppeteerRollRef.current = puppeteerRoll;
  const setPuppeteerRoll = useCallback((v: number | ((prev: number) => number)) => {
    const nextVal = typeof v === "function" ? v(puppeteerRollRef.current) : v;
    puppeteerRollRef.current = nextVal;
    setPuppeteerRollState(nextVal);
    const engine = viewportStageRef.current?.getEngine();
    if (engine) {
      engine.setManualPose({ headRoll: nextVal });
      engine.renderSingleFrame?.();
    }
    if (!isPlayingRef.current) {
      renderSingleFrameRef.current(currentFrameRef.current, 0);
    }
  }, []);

  const puppeteerBodyRollRef = useRef(puppeteerBodyRoll);
  puppeteerBodyRollRef.current = puppeteerBodyRoll;
  const setPuppeteerBodyRoll = useCallback((v: number | ((prev: number) => number)) => {
    const nextVal = typeof v === "function" ? v(puppeteerBodyRollRef.current) : v;
    puppeteerBodyRollRef.current = nextVal;
    setPuppeteerBodyRollState(nextVal);
    const engine = viewportStageRef.current?.getEngine();
    if (engine) {
      engine.setManualPose({ bodyRoll: nextVal });
      engine.renderSingleFrame?.();
    }
    if (!isPlayingRef.current) {
      renderSingleFrameRef.current(currentFrameRef.current, 0);
    }
  }, []);

  const puppeteerPelvisRollRef = useRef(puppeteerPelvisRoll);
  puppeteerPelvisRollRef.current = puppeteerPelvisRoll;
  const setPuppeteerPelvisRoll = useCallback((v: number | ((prev: number) => number)) => {
    const nextVal = typeof v === "function" ? v(puppeteerPelvisRollRef.current) : v;
    puppeteerPelvisRollRef.current = nextVal;
    setPuppeteerPelvisRollState(nextVal);
    const engine = viewportStageRef.current?.getEngine();
    if (engine) {
      engine.setManualPose({ pelvisRoll: nextVal });
      engine.renderSingleFrame?.();
    }
    if (!isPlayingRef.current) {
      renderSingleFrameRef.current(currentFrameRef.current, 0);
    }
  }, []);

  const puppeteerLeanZRef = useRef(puppeteerLeanZ);
  puppeteerLeanZRef.current = puppeteerLeanZ;
  const setPuppeteerLeanZ = useCallback((v: number | ((prev: number) => number)) => {
    const nextVal = typeof v === "function" ? v(puppeteerLeanZRef.current) : v;
    puppeteerLeanZRef.current = nextVal;
    setPuppeteerLeanZState(nextVal);
    const engine = viewportStageRef.current?.getEngine();
    if (engine) {
      engine.setManualPose({ headLeanZ: nextVal });
      engine.renderSingleFrame?.();
    }
    if (!isPlayingRef.current) {
      renderSingleFrameRef.current(currentFrameRef.current, 0);
    }
  }, []);

  const puppeteerShiftXRef = useRef(puppeteerShiftX);
  puppeteerShiftXRef.current = puppeteerShiftX;
  const setPuppeteerShiftX = useCallback((v: number | ((prev: number) => number)) => {
    const nextVal = typeof v === "function" ? v(puppeteerShiftXRef.current) : v;
    puppeteerShiftXRef.current = nextVal;
    setPuppeteerShiftXState(nextVal);
    const engine = viewportStageRef.current?.getEngine();
    if (engine) {
      engine.setManualPose({ headShiftX: nextVal });
      engine.renderSingleFrame?.();
    }
    if (!isPlayingRef.current) {
      renderSingleFrameRef.current(currentFrameRef.current, 0);
    }
  }, []);

  const puppeteerShiftYRef = useRef(puppeteerShiftY);
  puppeteerShiftYRef.current = puppeteerShiftY;
  const setPuppeteerShiftY = useCallback((v: number | ((prev: number) => number)) => {
    const nextVal = typeof v === "function" ? v(puppeteerShiftYRef.current) : v;
    puppeteerShiftYRef.current = nextVal;
    setPuppeteerShiftYState(nextVal);
    const engine = viewportStageRef.current?.getEngine();
    if (engine) {
      engine.setManualPose({ headShiftY: nextVal });
      engine.renderSingleFrame?.();
    }
    if (!isPlayingRef.current) {
      renderSingleFrameRef.current(currentFrameRef.current, 0);
    }
  }, []);

  const respirationScaleRef = useRef(respirationScale);
  respirationScaleRef.current = respirationScale;
  const setRespirationScale = useCallback((v: number | ((prev: number) => number)) => {
    const nextVal = typeof v === "function" ? v(respirationScaleRef.current) : v;
    respirationScaleRef.current = nextVal;
    setRespirationScaleState(nextVal);
    const engine = viewportStageRef.current?.getEngine();
    if (engine) {
      engine.setManualPose({ respirationScale: nextVal });
      engine.renderSingleFrame?.();
    }
    if (!isPlayingRef.current) {
      renderSingleFrameRef.current(currentFrameRef.current, 0);
    }
  }, []);

  const orbitalYawRef = useRef(orbitalYaw);
  orbitalYawRef.current = orbitalYaw;
  const setOrbitalYaw = useCallback((v: number | ((prev: number) => number)) => {
    const nextVal = typeof v === "function" ? v(orbitalYawRef.current) : v;
    orbitalYawRef.current = nextVal;
    setOrbitalYawState(nextVal);
    const engine = viewportStageRef.current?.getEngine();
    if (engine) {
      engine.setContinuousOrbitalYaw(nextVal);
      engine.renderSingleFrame?.();
    }
    if (!isPlayingRef.current) {
      renderSingleFrameRef.current(currentFrameRef.current, 0);
    }
  }, []);
  const lastHudUpdateRef = useRef<number>(0);
  const activeFsmBeatIndexRef = useRef<number>(0);

  // WebGPU Engine States
  const [isWebGPUReady, setIsWebGPUReady] = useState(false);
  const [isWebGPUInitializing, setIsWebGPUInitializing] = useState(false);
  const [webGPUProgress, setWebGPUProgress] = useState(0);
  const [webGPUStage, setWebGPUStage] = useState("Idle");
  const [precision, setPrecision] = useState<"fp16" | "fp32">("fp32");
  const [stride, setStride] = useState<string>("1");
  const [batchSize, setBatchSize] = useState<number>(4);

  // Telemetry
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [cacheHits, setCacheHits] = useState(0);
  const [totalKeyframes, setTotalKeyframes] = useState(0);
  const [fuzzyHits, setFuzzyHits] = useState(0);
  const [latencyMs, setLatencyMs] = useState(0);

  // Synced Video Exporter State
  const videoExporterRef = useRef<SyncedVideoExporter>(new SyncedVideoExporter());
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStage, setExportStage] = useState("");

  // Append to log console
  const addLog = useCallback((message: string, type: "info" | "success" | "warn" | "error" = "info") => {
    const time = new Date().toLocaleTimeString("en-US", { hour12: false });
    const id = `${Date.now()}-${Math.random()}`;
    setLogs((prev) => [...prev.slice(-80), { id, time, message, type }]);
  }, []);
  const addLogRef = useRef(addLog);
  addLogRef.current = addLog;

  // 1. Load Active Plate Codebook and MediaPipe Tracking Metadata on mount
  const loadCodebookForPlate = useCallback(
    async (
      preset: PlatePreset,
      type?: "ditto" | "ditto_fullface" | "musetalk" | "none",
      options?: { skipEngineReload?: boolean }
    ) => {
      const activeType = type ?? codebookTypeRef.current;
      setCodebookType(activeType);
      if (activeType === "none") {
        setVisemes([]);
        addLog("Codebook disabled (Direct WebGPU UNet inference mode).", "info");
        return;
      }

      let url = preset.codebookUrl;
      let label = preset.codebookLabel;
      const isCustomPreset =
        preset.id.startsWith("custom_") || preset.codebookUrl.startsWith("blob:");
      const isAnglePreset = !isCustomPreset && preset.id.includes("deg");
      const isRubyPortrait = preset.id === "ruby_portrait";
      const isRubyVideo = preset.id === "ruby_m1_video" || preset.id === "ruby_continuous_video";

      if (!isCustomPreset) {
        if (activeType === "ditto") {
          if (isAnglePreset) {
            url = `/assets/avatars/visemes/${preset.id}_ditto_codebook.json?v=${CODEBOOK_BUILD_V}`;
            label = `${preset.name} (Mouth Only)`;
          } else if (isRubyPortrait) {
            url = `/assets/avatars/visemes/ruby_ditto_codebook.json?v=${CODEBOOK_BUILD_V}`;
            label = "Ruby Portrait (Ditto 512x512 HD)";
          } else if (isRubyVideo) {
            url = `/assets/avatars/visemes/ruby_burgundy_ditto_codebook.json?v=${CODEBOOK_BUILD_V}`;
            label = "Ruby Burgundy Video (Mouth Only)";
          } else {
            url = preset.codebookUrl.replace("_ditto_fullface_codebook.json", "_ditto_codebook.json");
            label = `${preset.name} (Mouth Only)`;
          }
        } else if (activeType === "ditto_fullface") {
          if (isAnglePreset) {
            url = `/assets/avatars/visemes/${preset.id}_ditto_fullface_codebook.json?v=${CODEBOOK_BUILD_V}`;
            label = `${preset.name} Full Face + Chin`;
          } else if (isRubyPortrait) {
            url = `/assets/avatars/visemes/ruby_ditto_fullface_codebook.json?v=${CODEBOOK_BUILD_V}`;
            label = "Ruby Portrait Full Face + Chin";
          } else if (isRubyVideo) {
            url = `/assets/avatars/visemes/ruby_burgundy_ditto_fullface_codebook.json?v=${CODEBOOK_BUILD_V}`;
            label = "Ruby Burgundy Video Fullface";
          } else {
            url = preset.codebookUrl.replace("_ditto_codebook.json", "_ditto_fullface_codebook.json");
            label = `${preset.name} Full Face + Chin`;
          }
        } else if (activeType === "musetalk") {
          if (isAnglePreset) {
            url = `/assets/avatars/visemes/${preset.id}_ditto_codebook.json?v=${CODEBOOK_BUILD_V}`;
            label = `${preset.name} (Ditto)`;
          } else if (isRubyVideo) {
            url = `/assets/avatars/visemes/ruby_burgundy_m1_codebook.json?v=${CODEBOOK_BUILD_V}`;
            label = "MuseTalk Canonical (Ruby Burgundy)";
          } else {
            url = preset.codebookUrl.replace("_ditto_fullface_codebook.json", "_ditto_codebook.json");
            label = isRubyPortrait ? "MuseTalk Canonical (Ruby Portrait)" : `${preset.name} (MuseTalk)`;
          }
        }
      }

      setActiveCodebookUrl(url);

      const currentStageEngine = viewportStageRef.current?.getEngine();
      if (currentStageEngine) {
        const mode =
          activeType === "ditto_fullface"
            ? "full_chin"
            : activeType === "musetalk"
              ? "musetalk"
              : "mouth_only";
        currentStageEngine.setVisemeCodebookMode(mode, true);
        if (!options?.skipEngineReload) {
          currentStageEngine.setCodebookUrl(url, false);
        }
      }

      try {
        addLog(`Loading ${label} (${preset.name})...`, "info");
        await codebookService.current.loadFromUrl(url, true);

        const loaded = codebookService.current.getVisemes();
        setVisemes(loaded);
        setPsnrDb(codebookService.current.psnr);
        setEngineName(codebookService.current.engine);
        setIsWebGLReady(true);

        // Preload neutral patch bitmap for dual-continuity blending
        const neutral = codebookService.current.getNeutralEntry();
        if (neutral?.predecodedBitmap) {
          neutralPatchRef.current = neutral.predecodedBitmap;
        }

        // Set landmark targets from MediaPipe precalculations in codebook (never overwritten by preset fallback)
        if (preset.type === "image") {
          avatarLandmarksRef.current = [
            resolvePlateLandmark(preset, codebookService.current.plateLandmark),
          ];
        } else if (preset.landmarksUrl) {
          try {
            const lRes = await fetch(preset.landmarksUrl);
            if (lRes.ok) {
              const lData = await lRes.json();
              if (Array.isArray(lData)) {
                avatarLandmarksRef.current = lData;
                if (preset.id === "ruby_continuous_video") {
                  continuousLandmarksRef.current = lData;
                }
              }
            }
          } catch {
            avatarLandmarksRef.current = [preset.landmark];
          }
        }

        addLog(
          `Codebook Ready! ${loaded.length} canonical visemes loaded into 0ms ROM cache (${codebookService.current.engine} • PSNR: ${codebookService.current.psnr} dB).`,
          "success"
        );
      } catch (e) {
        addLog(`Failed to load codebook: ${(e as Error).message}`, "error");
      }
      return url;
    },
    [addLog]
  );
  const loadCodebookForPlateRef = useRef(loadCodebookForPlate);
  loadCodebookForPlateRef.current = loadCodebookForPlate;

  // Legacy helper kept for backwards-compatible window handle
  const preloadRubyAngleBank = useCallback(async () => {
    const engine = viewportStageRef.current?.getEngine();
    if (engine) {
      await engine.prewarmAngleBank("ruby");
    }
  }, []);

  const loadCodebook = useCallback(
    async (type: "ditto" | "ditto_fullface" | "musetalk" | "none") => {
      return await loadCodebookForPlate(activePresetRef.current, type);
    },
    [loadCodebookForPlate]
  );

  // WebGPU Model Initialization Action
  const handleInitWebGPU = useCallback(async () => {
    setIsWebGPUInitializing(true);
    setWebGPUProgress(10);
    setWebGPUStage("Probing WebGPU adapter...");

    try {
      const engine = WebGPUMuseTalkEngine.getInstance();
      await engine.initialize({
        precision,
        batchSize,
        prewarm: true,
        onProgress: (p, stage) => {
          setWebGPUProgress(p);
          setWebGPUStage(stage);
          addLog(stage, "info");
        },
      });
      const engineStatus = engine.getStatus();
      setPrecision(engineStatus.precision);
      setIsWebGPUReady(true);
      addLog(`WebGPU Neural Engine Ready (${engineStatus.precision.toUpperCase()})!`, "success");
    } catch (e) {
      addLog(`WebGPU Init Error: ${(e as Error).message}`, "error");
    } finally {
      setIsWebGPUInitializing(false);
    }
  }, [addLog, batchSize, precision]);

  // Clear Browser Cache API
  const handleClearDiskCache = useCallback(async () => {
    try {
      await WebGPUMuseTalkEngine.getInstance().clearCache();
      addLog("Persistent browser Cache API for neural models cleared.", "warn");
    } catch (e) {
      addLog(`Clear cache error: ${(e as Error).message}`, "error");
    }
  }, [addLog]);

  // Precalculate & Export Codebook Actions
  const handlePrecalcCodebook = useCallback(() => {
    addLog("Precalculating codebook visemes for active video loop...", "info");
    // Trigger codebook re-seed
    loadCodebook(codebookType);
  }, [addLog, codebookType, loadCodebook]);

  const handleExportCodebook = useCallback(() => {
    try {
      const currentVisemes = codebookService.current.getVisemes();
      const exportJson = {
        formatVersion: "ditto-v1",
        createdAt: new Date().toISOString(),
        avatarId: "ruby_burgundy",
        highFidelityEngine: codebookService.current.engine,
        psnrDb: codebookService.current.psnr,
        visemeCount: currentVisemes.length,
        visemes: currentVisemes.map((v) => ({
          clusterId: v.clusterId,
          simHash: v.simHash,
          aperture: v.aperture,
          width: v.width,
          jawDescent: v.jawDescent,
          dataUrl: v.dataUrl,
        })),
      };
      const blob = new Blob([JSON.stringify(exportJson, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ruby_viseme_codebook_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addLog(`Exported codebook JSON (${currentVisemes.length} visemes) ✅`, "success");
    } catch (e) {
      addLog(`Export error: ${(e as Error).message}`, "error");
    }
  }, [addLog]);

  // 3. Render a single video frame with 478-point affine mouth alignment
  const renderSingleFrame = useCallback(
    (targetAudioFrame: number, videoFrameIdx: number) => {
      if (isRenderingFrameRef.current) return;
      isRenderingFrameRef.current = true;
      try {
        const stageEngine =
          viewportStageRef.current?.getEngine() ||
          (typeof window !== "undefined" ? window.__engine : null);
        if (stageEngine && manualClusterIdRef.current === null) {
          stageEngine.setTimelineFrame(targetAudioFrame);
        }

        const frameData = decodedFramesRef.current.get(targetAudioFrame);
      const presence = presenceWeightsRef.current
        ? presenceWeightsRef.current[targetAudioFrame] ?? 0.0
        : (manualClusterIdRef.current !== null ? 1.0 : (isPlayingRef.current ? 1.0 : 0.0));

      currentFrameRef.current = targetAudioFrame;

      // Throttle React state updates to ~15 Hz during active playback to eliminate UI thrashing
      const now = performance.now();
      if (!isPlayingRef.current || now - lastHudUpdateRef.current > 60) {
        lastHudUpdateRef.current = now;
        setPresenceWeight(presence);
        setCurrentFrame(targetAudioFrame);
        const loadedEntries = codebookService.current.getVisemes();
        const clusterOpts = loadedEntries.length > 0
          ? {
              preserveWidthTrack: true,
              apertures: loadedEntries.map((v) => v.aperture),
              widths: loadedEntries.map((v) => v.width),
            }
          : { preserveWidthTrack: true };
        if (manualClusterIdRef.current !== null) {
          const manualEntry = loadedEntries.find((v) => v.clusterId === manualClusterIdRef.current);
          const { clusterId: resolvedCid, effectiveAperture } = resolveClusterByJawDescent(
            manualClusterIdRef.current,
            manualEntry ? manualEntry.aperture : (frameData?.aperture ?? 0),
            jawDescentFactorRef.current,
            clusterOpts
          );
          setActiveClusterId(resolvedCid);
          setActiveAperture(effectiveAperture);
        } else if (frameData) {
          const { clusterId: resolvedCid, effectiveAperture } = resolveClusterByJawDescent(
            frameData.clusterId,
            frameData.aperture,
            jawDescentFactorRef.current,
            clusterOpts
          );
          setActiveClusterId(resolvedCid);
          setActiveAperture(effectiveAperture);
        } else {
          setActiveClusterId(null);
          setActiveAperture(null);
        }
      }

      // 1. Resolve Active Video Mode & Landmarks
      const preset = activePresetRef.current;
      let landmarks = avatarLandmarksRef.current;
      let effectiveVideoFrame = videoFrameIdx;
      const audioTimeSec = targetAudioFrame / 25.0;

      const hasLiveLandmark =
        liveMouthLandmarkRef.current !== null &&
        (liveMouthLandmarkRef.current as { plateId?: string }).plateId === preset.id &&
        (!preset.landmark || Math.abs(liveMouthLandmarkRef.current.cy - preset.landmark.cy) <= 100);

      if (preset.type === "image") {
        landmarks = [
          resolvePlateLandmark(
            preset,
            codebookService.current.plateLandmark,
            hasLiveLandmark ? liveMouthLandmarkRef.current : null
          ),
        ];
        effectiveVideoFrame = 0;
      } else if (videoModeRef.current === "continuous") {
        if (continuousLandmarksRef.current.length > 0) {
          landmarks = continuousLandmarksRef.current;
        }
      } else if (videoModeRef.current === "auto_fsm" && fsmSequence.length > 0) {
        const beatIdx = fsmSequence.findIndex(
          (n) => audioTimeSec >= n.startTimeSec && audioTimeSec < n.endTimeSec
        );
        const activeNode = beatIdx >= 0 ? fsmSequence[beatIdx] : fsmSequence[0];
        const effectiveBeatIdx = beatIdx >= 0 ? beatIdx : 0;
        if (effectiveBeatIdx !== activeFsmBeatIndexRef.current) {
          activeFsmBeatIndexRef.current = effectiveBeatIdx;
          setActiveFsmBeatIndex(effectiveBeatIdx);
        }

        // Advance video element source if on new choreographed beat
        if (videoRef.current && activeNode) {
          const currentSrc = videoRef.current.src;
          const targetFilename = activeNode.videoPath.split("/").pop() || "";
          if (targetFilename && !currentSrc.includes(targetFilename)) {
            videoRef.current.src = activeNode.videoPath;
            videoRef.current.currentTime = (audioTimeSec - activeNode.startTimeSec) % activeNode.durationSec;
            if (isPlayingRef.current) {
              videoRef.current.play().catch(() => {});
            }
          }
        }

        // Resolve landmarks for active FSM clip
        if (activeNode) {
          const clipKey = activeNode.videoPath.split("/").pop()?.replace(/\.mp4$/, "") || "";
          const clipLandmarks = fsmLandmarksMapRef.current[clipKey];
          if (clipLandmarks && clipLandmarks.length > 0) {
            landmarks = clipLandmarks;
            const beatLocalTime = Math.max(0, audioTimeSec - activeNode.startTimeSec);
            effectiveVideoFrame = Math.floor(beatLocalTime * 24.0);
          }
        }
      } else if (landmarks.length <= 1 && fsmLandmarksMapRef.current["ruby_burgundy_M1_loop_v1"]?.length) {
        landmarks = fsmLandmarksMapRef.current["ruby_burgundy_M1_loop_v1"];
      }

      const baseLandmark: LandmarkTarget =
        preset.type === "video" && landmarks.length > 1 && landmarks[effectiveVideoFrame % landmarks.length]
          ? landmarks[effectiveVideoFrame % landmarks.length]
          : resolvePlateLandmark(
              preset,
              codebookService.current.plateLandmark,
              hasLiveLandmark ? liveMouthLandmarkRef.current : null
            );

      // Task 4: Pre-Speech Respiratory Inhalation & Pitch (F0) Laryngeal Physics
      const respWeight = respirationWeightsRef.current
        ? (respirationWeightsRef.current[targetAudioFrame] ?? 0)
        : 0;
      const f0Val = pitchF0Ref.current
        ? (pitchF0Ref.current[targetAudioFrame] ?? 0.5)
        : 0.5;
      // Normal human larynx shifts vertically by ~2.5px between low register and high pitch
      const laryngealYOffset = (f0Val - 0.5) * 2.5;
      const respirationApertureLift = respWeight * 0.8;

      const isFromLiveStage = hasLiveLandmark;
      const currentOrbitalYaw = orbitalYawRef.current ?? orbitalYaw;
      const currentPuppeteerYaw = puppeteerYawRef.current ?? puppeteerYaw;
      const currentPuppeteerPitch = puppeteerPitchRef.current ?? puppeteerPitch;
      const currentPuppeteerRoll = puppeteerRollRef.current ?? puppeteerRoll;
      const currentLeanZ = puppeteerLeanZRef.current ?? puppeteerLeanZ;
      const currentShiftX = puppeteerShiftXRef.current ?? puppeteerShiftX;
      const currentShiftY = puppeteerShiftYRef.current ?? puppeteerShiftY;

      const deltaYawDeg = currentOrbitalYaw + currentPuppeteerYaw;
      const deltaPitchDeg = currentPuppeteerPitch;
      const deltaRollDeg = currentPuppeteerRoll;

      const targetBaseYaw = baseLandmark.yawDeg !== undefined ? baseLandmark.yawDeg : (preset.yawDeg ?? 0);
      const targetBasePitch = baseLandmark.pitchDeg !== undefined ? baseLandmark.pitchDeg : (preset.pitchDeg ?? 0);

      const effectiveYaw = isFromLiveStage
        ? (baseLandmark.yawDeg ?? 0)
        : targetBaseYaw + deltaYawDeg;
      const effectivePitch = isFromLiveStage
        ? (baseLandmark.pitchDeg ?? 0)
        : targetBasePitch + deltaPitchDeg;
      const effectiveAngle = isFromLiveStage
        ? (baseLandmark.angle ?? 0)
        : (baseLandmark.angle ?? 0) - deltaRollDeg;

      let targetLandmark: LandmarkTarget;

      if (isFromLiveStage) {
        targetLandmark = {
          ...baseLandmark,
          cy: baseLandmark.cy - laryngealYOffset,
          h: (baseLandmark.h && baseLandmark.h > 15.0 ? baseLandmark.h : baseLandmark.w * 0.3234) + respirationApertureLift,
          angle: effectiveAngle,
          yawDeg: effectiveYaw,
          pitchDeg: effectivePitch,
        };
      } else {
        const targetW = preset.width || 1024;
        const targetH = preset.height || 1024;
        const aspect = targetW / targetH;
        const normMx = baseLandmark.cx > 1.0 ? baseLandmark.cx / targetW : baseLandmark.cx;
        const normMy = baseLandmark.cy > 1.0 ? baseLandmark.cy / targetH : baseLandmark.cy;
        const normMw = baseLandmark.w > 1.0 ? baseLandmark.w / targetW : baseLandmark.w;
        const mouthRadiusX = normMw * 0.5;
        const mouthSpanH = (mouthRadiusX * 2.0 * targetW) / targetH;
        const bLm = baseLandmark as { iod?: number; chinY?: number };
        const eyeDistY = bLm.iod ? (bLm.iod * 0.72) / targetH : mouthSpanH * 1.31;
        const sinBaseAngle = Math.sin((baseLandmark.angle || 0) * (Math.PI / 180));
        const cosBaseAngle = Math.cos((baseLandmark.angle || 0) * (Math.PI / 180));
        const midX = normMx + eyeDistY * sinBaseAngle * (targetH / targetW);
        const midY = normMy - eyeDistY * cosBaseAngle;
        const engine = viewportStageRef.current?.getEngine();
        const engU = engine ? (engine as unknown as { uniforms?: { headCenter?: number[]; headRadius?: number[] } }).uniforms : null;
        const hx = (engU && engU.headCenter && engU.headCenter[0] > 0.01) ? engU.headCenter[0] : (baseLandmark.headCenter ? (baseLandmark.headCenter[0] > 1.0 ? baseLandmark.headCenter[0] / targetW : baseLandmark.headCenter[0]) : midX);
        const hy = (engU && engU.headCenter && engU.headCenter[1] > 0.01) ? engU.headCenter[1] : (baseLandmark.headCenter ? (baseLandmark.headCenter[1] > 1.0 ? baseLandmark.headCenter[1] / targetH : baseLandmark.headCenter[1]) : (midY + mouthSpanH * 0.08));
        const hrx = (engU && engU.headRadius && engU.headRadius[0] > 0.01) ? engU.headRadius[0] : (baseLandmark.headRadius ? (baseLandmark.headRadius[0] > 1.0 ? baseLandmark.headRadius[0] / targetW : baseLandmark.headRadius[0]) : (mouthRadiusX * 3.5));
        const normChinY = bLm.chinY ? bLm.chinY / targetH : (normMy + mouthSpanH * 0.85);
        const hry = (engU && engU.headRadius && engU.headRadius[1] > 0.01) ? engU.headRadius[1] : (baseLandmark.headRadius ? (baseLandmark.headRadius[1] > 1.0 ? baseLandmark.headRadius[1] / targetH : baseLandmark.headRadius[1]) : Math.max(mouthRadiusX * 4.8 * aspect, (normChinY - (midY - eyeDistY * 0.65)) * 0.65));

        // In fallback / static mode, apply kinematic shifts based on the DELTA rotations (puppeteering / orbital)
        // so that resting presets (like ruby_25deg) keep their calibrated baseline mouth position when sliders are at zero.
        const pitchRad = (deltaPitchDeg * Math.PI) / 180;
        const yawRad = (deltaYawDeg * Math.PI) / 180;
        const rollRad = (deltaRollDeg * Math.PI) / 180;

        const headDeltaX = (normMx - hx) * aspect;
        const headDeltaY = normMy - hy;
        const normHx = headDeltaX / Math.max(0.001, hrx * aspect);
        const normHy = headDeltaY / Math.max(0.001, hry);
        const _headDistSq = normHx * normHx + normHy * normHy;

        // The mouth is anatomically locked to the cranium and facial bone structure.
        const headAtten = 1.0;

        // 1. Perspective Depth (STAGE_1_HEAD_KINEMATICS exact match)
        const normHxDome = headDeltaX / Math.max(0.001, hrx * aspect * 1.15);
        const normHyDome = headDeltaY / Math.max(0.001, hry * (normMy < hy ? 1.55 : 1.05));
        const domeDistSq = normHxDome * normHxDome + normHyDome * normHyDome;
        const tDome = Math.max(0.0, Math.min(1.0, (domeDistSq - 0.75) / (1.75 - 0.75)));
        const smoothDome = 1.0 - tDome * tDome * (3.0 - 2.0 * tDome);
        const facialDepth = 0.14 + 0.86 * smoothDome;
        const sinYaw = Math.sin(yawRad);
        const sinPitch = Math.sin(pitchRad);
        const yawDispX = sinYaw * (hrx * 0.22) * facialDepth;
        const pitchDispY = sinPitch * (hry * 0.18) * facialDepth;

        // 2. Invert Yaw, Pitch, Shift, Lean
        const y_unpitch = normMy + pitchDispY;
        const x_unpitch = normMx + yawDispX;
        const x_unshift = x_unpitch + (currentShiftX || 0) * 0.035 * headAtten;
        const y_unshift = y_unpitch + (currentShiftY || 0) * 0.035 * headAtten;
        const leanScale = 1.0 / Math.max(0.01, 1.0 - (currentLeanZ || 0) * 0.20 * headAtten);
        const x_unlean = hx + (x_unshift - hx) * leanScale;
        const y_unlean = hy + (y_unshift - hy) * leanScale;

        // 3. Invert Roll around pivot (pivotY = hy + hry * 0.15)
        const pivotY = hy + hry * 0.15;
        const effectiveRollRad = -rollRad * headAtten;
        const cosR = Math.cos(effectiveRollRad);
        const sinR = Math.sin(effectiveRollRad);
        const pX = (x_unlean - hx) * aspect;
        const pY = y_unlean - pivotY;

        const normX = hx + (pX * cosR - pY * sinR) / aspect;
        const normY = pivotY + (pX * sinR + pY * cosR);

        const screenCx = normX * targetW;
        const screenCy = normY * targetH;

        const baseW = baseLandmark.w > 1.0 ? baseLandmark.w : baseLandmark.w * targetW;
        const rawH = baseLandmark.h && baseLandmark.h > 15.0 ? baseLandmark.h : baseW * 0.3234;
        const baseH = rawH > 1.0 ? rawH : rawH * targetH;

        const screenRw = (baseW * 0.5) * leanScale * Math.max(0.35, Math.cos(yawRad));
        const screenRh = (baseH * 0.5) * leanScale * Math.max(0.35, Math.cos(pitchRad));
        const screenAngle = (baseLandmark.angle ?? 0) - deltaRollDeg * headAtten;

        targetLandmark = {
          ...baseLandmark,
          cx: screenCx,
          cy: screenCy - laryngealYOffset,
          w: screenRw * 2.0,
          h: screenRh * 2.0 + respirationApertureLift,
          angle: screenAngle,
          yawDeg: effectiveYaw,
          pitchDeg: effectivePitch,
        };
      }

      if (typeof window !== "undefined") {
        window.__lastTargetLandmark = targetLandmark;
      }

      let layerB = frameData ? frameData.clusterId : 0;
      let effectivePresence = manualClusterIdRef.current !== null
        ? 1.0
        : (isPlayingRef.current ? Math.max(presence, respWeight * 0.35) : 0.0);

      let activeJawDrop = frameData?.jawDrop ?? 0;
      if (manualClusterIdRef.current !== null) {
        const loadedVisemes = codebookService.current.getVisemes();
        const manualEntry = loadedVisemes.find((v) => v.clusterId === manualClusterIdRef.current);
        const ap = manualEntry?.aperture || 0;
        const { clusterId: resolvedCid } = resolveClusterByJawDescent(
          manualClusterIdRef.current,
          ap,
          jawDescentFactorRef.current,
          loadedVisemes.length > 0
            ? {
                preserveWidthTrack: true,
                apertures: loadedVisemes.map((v) => v.aperture),
                widths: loadedVisemes.map((v) => v.width),
              }
            : { preserveWidthTrack: true }
        );
        layerB = resolvedCid;
        effectivePresence = jawDescentFactorRef.current <= 0.01 ? 0.0 : 1.0;
        activeJawDrop = manualClusterIdRef.current === 0 ? 0.0 : Math.min(10.0, (Math.max(0.0, ap) / 22.0) * 10.0);
      }

      const engine = viewportStageRef.current?.getEngine() || (typeof window !== "undefined" ? window.__engine : null);
      if (engine) {
        if (manualClusterIdRef.current !== null) {
          engine.setExplicitViseme(manualClusterIdRef.current, manualClusterIdRef.current, 1.0, effectivePresence, activeJawDrop);
        } else {
          engine.setTimelineFrame(targetAudioFrame);
        }
        if (!isPlayingRef.current) {
          engine.renderSingleFrame?.();
        }
      }
      // Sharp, pristine viseme rendering without optical double-exposure ghosting / smudged lipstick
      const _blendFactor = 1.0;

      // 2. Unified LiveAnchorStageEngine Rendering + Optional 2D ROI Bounding Box Overlay
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (showBoundingBoxRef.current) {
            const allVisemes = codebookService.current.getVisemes();
            const activeEntry = allVisemes.find((v) => v.clusterId === layerB) ?? allVisemes[layerB];
            const activeOpenness = activeEntry?.openness ?? (activeEntry?.aperture ? Math.min(1.0, activeEntry.aperture / 20.0) : 0.0);
            const activeMouthHeight = activeEntry?.mouthHeight;
            const refH0 = codebookService.current.canonicalAnchor?.h0 ?? 30.56;
            const mouthHeightRatio = (activeMouthHeight && refH0 > 0)
              ? (activeMouthHeight / refH0)
              : (1.0 + activeOpenness * 0.65);

            const effectiveJawDrop = codebookService.current.isFullFace
              ? 0
              : activeJawDrop * jawDescentFactorRef.current;
            const targetCX = targetLandmark.cx + offsetXRef.current;
            const targetCY = targetLandmark.cy + offsetYRef.current + effectiveJawDrop;
            const targetW = targetLandmark.w * scaleRef.current;
            const baseH = (targetLandmark.h ?? (targetLandmark.w * (refH0 / (codebookService.current.canonicalAnchor?.w0 ?? 94.5))));
            const targetH = (codebookService.current.isFullFace ? (targetLandmark.h ?? targetLandmark.w) : (baseH * mouthHeightRatio)) * scaleRef.current;

            ctx.save();
            ctx.strokeStyle = "#06b6d4";
            ctx.lineWidth = 2;
            ctx.strokeRect(targetCX - targetW / 2, targetCY - targetH / 2, targetW, targetH);
            ctx.restore();
          }
        }
      }
    } finally {
      isRenderingFrameRef.current = false;
    }
  },
    [fsmSequence, orbitalYaw, puppeteerLeanZ, puppeteerPitch, puppeteerRoll, puppeteerShiftX, puppeteerShiftY, puppeteerYaw]
  );

  renderSingleFrameRef.current = renderSingleFrame;
  if (typeof window !== "undefined") {
    window.__renderSingleFrame = renderSingleFrame;
    window.__compositor = webglCompositor.current;
    window.__webglCompositor = webglCompositor.current;
    window.__codebookService = codebookService.current;
    window.__loadCodebook = loadCodebook;
    window.__setManualClusterId = (cid: number | null) => {
      setManualClusterId(cid);
      manualClusterIdRef.current = cid;
      const engine = viewportStageRef.current?.getEngine() || (typeof window !== "undefined" ? window.__engine : null);
      if (cid === null || cid < 0) {
        setActiveClusterId(null);
        setActiveAperture(null);
        engine?.clearExplicitViseme();
        engine?.renderSingleFrame?.();
        renderSingleFrameRef.current(currentFrameRef.current, 0);
        return;
      }
      setActiveClusterId(cid);
      const entry = codebookService.current.getVisemes().find((v) => v.clusterId === cid);
      if (entry) setActiveAperture(entry.aperture);
      if (engine) {
        const ap = entry?.aperture || 0;
        const activeJawDrop = cid === 0 ? 0.0 : Math.min(10.0, (Math.max(0.0, ap) / 22.0) * 10.0);
        engine.setExplicitViseme(cid, cid, 1.0, 1.0, activeJawDrop);
        engine.renderSingleFrame?.();
      }
      renderSingleFrameRef.current(currentFrameRef.current, 0);
    };
    window.__setHeadYaw = (yaw: number) => {
      setPuppeteerYaw(yaw);
      puppeteerYawRef.current = yaw;
      renderSingleFrameRef.current(currentFrameRef.current, 0);
    };
    window.__setManualPose = (rawPose: unknown) => {
      const pose = (rawPose || {}) as {
      headYaw?: number;
      headPitch?: number;
      headRoll?: number;
      bodyRoll?: number;
      pelvisRoll?: number;
      headLeanZ?: number;
      headShiftX?: number;
      headShiftY?: number;
      leanZ?: number;
      shiftX?: number;
      shiftY?: number;
      eyeBlinkL?: number;
      eyeBlinkR?: number;
      blinkRight?: number;
      blinkLeft?: number;
      eyeWidening?: number;
      eyebrowRaise?: number;
      eyebrowFurrow?: number;
      eyebrowAsymmetry?: number;
      smileAmount?: number;
      respirationScale?: number;
      gazeX?: number;
      gazeY?: number;
    };
      if (pose.headYaw !== undefined) {
        setPuppeteerYaw(pose.headYaw);
        puppeteerYawRef.current = pose.headYaw;
      }
      if (pose.headPitch !== undefined) {
        setPuppeteerPitch(pose.headPitch);
        puppeteerPitchRef.current = pose.headPitch;
      }
      if (pose.headRoll !== undefined) {
        setPuppeteerRoll(pose.headRoll);
        puppeteerRollRef.current = pose.headRoll;
      }
      if (pose.bodyRoll !== undefined) {
        setPuppeteerBodyRoll(pose.bodyRoll);
        puppeteerBodyRollRef.current = pose.bodyRoll;
      }
      if (pose.pelvisRoll !== undefined) {
        setPuppeteerPelvisRoll(pose.pelvisRoll);
        puppeteerPelvisRollRef.current = pose.pelvisRoll;
      }
      if (pose.headLeanZ !== undefined) {
        setPuppeteerLeanZ(pose.headLeanZ);
        puppeteerLeanZRef.current = pose.headLeanZ;
      }
      if (pose.headShiftX !== undefined) {
        setPuppeteerShiftX(pose.headShiftX);
        puppeteerShiftXRef.current = pose.headShiftX;
      }
      if (pose.headShiftY !== undefined) {
        setPuppeteerShiftY(pose.headShiftY);
        puppeteerShiftYRef.current = pose.headShiftY;
      }
      if (pose.blinkRight !== undefined) setPuppeteerBlinkRight(pose.blinkRight);
      if (pose.blinkLeft !== undefined) setPuppeteerBlinkLeft(pose.blinkLeft);
      if (pose.eyeWidening !== undefined) setPuppeteerWidening(pose.eyeWidening);
      if (pose.eyebrowRaise !== undefined) setPuppeteerBrowRaise(pose.eyebrowRaise);
      if (pose.eyebrowFurrow !== undefined) setPuppeteerBrowFurrow(pose.eyebrowFurrow);
      if (pose.eyebrowAsymmetry !== undefined) setPuppeteerBrowAsymmetry(pose.eyebrowAsymmetry);
      if (pose.smileAmount !== undefined) setPuppeteerSmile(pose.smileAmount);
      if (pose.respirationScale !== undefined) setRespirationScale(pose.respirationScale);
      if (pose.gazeX !== undefined) setPuppeteerGazeX(pose.gazeX);
      if (pose.gazeY !== undefined) setPuppeteerGazeY(pose.gazeY);

      const engine = viewportStageRef.current?.getEngine() || (typeof window !== "undefined" ? window.__engine : null);
      if (engine) {
        if (pose.blinkLeft !== undefined && pose.blinkRight !== undefined && pose.blinkLeft === 0 && pose.blinkRight === 0) {
          engine.setDriverConfig?.({ blinkRate: 0, motionIntensity: 0 });
        }
        engine.setManualPose(pose);
        engine.renderSingleFrame?.();
      }
      renderSingleFrameRef.current(currentFrameRef.current, 0);
    };
    window.__setBlinkRight = (val: number) => {
      setPuppeteerBlinkRight(val);
      const engine = viewportStageRef.current?.getEngine() || (typeof window !== "undefined" ? window.__engine : null);
      if (engine) {
        engine.setManualPose({ blinkRight: val });
        engine.renderSingleFrame?.();
      }
    };
    window.__setBlinkLeft = (val: number) => {
      setPuppeteerBlinkLeft(val);
      const engine = viewportStageRef.current?.getEngine() || (typeof window !== "undefined" ? window.__engine : null);
      if (engine) {
        engine.setManualPose({ blinkLeft: val });
        engine.renderSingleFrame?.();
      }
    };
    window.__PLATE_PRESETS = PLATE_PRESETS;
    window.__preloadRubyAngleBank = preloadRubyAngleBank;
  }

  // Re-draw the active paused frame on calibration changes or ROI box toggle
  const redrawCurrentFrame = useCallback(() => {
    if (typeof window !== "undefined") {
      window.__redrawCurrentFrame = redrawCurrentFrame;
    }
    const preset = activePresetRef.current;
    if (preset.type === "image") {
      renderSingleFrameRef.current(currentFrameRef.current, 0);
      return;
    }
    const video = videoRef.current;
    const isContinuous = videoModeRef.current === "continuous";
    const totalVideoFrames = isContinuous
      ? (continuousLandmarksRef.current.length || 709)
      : (avatarLandmarksRef.current.length > 1 ? avatarLandmarksRef.current.length : 185);
    const defaultVideoFps = isContinuous ? 25.0 : 24.0;
    const videoDuration = video?.duration && Number.isFinite(video.duration) && video.duration > 0 ? video.duration : (totalVideoFrames / defaultVideoFps);
    const progress = (video && videoDuration > 0) ? (video.currentTime % videoDuration) / videoDuration : 0;
    const videoFrameIdx = Math.min(
      totalVideoFrames - 1,
      Math.max(0, Math.floor(progress * totalVideoFrames))
    );
    renderSingleFrameRef.current(currentFrameRef.current, videoFrameIdx);
  }, []);

  // Synchronize canvas immediately whenever ROI box toggle or tuning sliders change while paused
  useEffect(() => {
    if (!isPlayingRef.current) {
      redrawCurrentFrame();
    }
  }, [
    showBoundingBox,
    jawDescentFactor,
    offsetX,
    offsetY,
    scale,
    rimIntensity,
    lipMoisture,
    enamelFresnel,
    selectedStudioBgId,
    puppeteerYaw,
    puppeteerPitch,
    puppeteerRoll,
    puppeteerBodyRoll,
    puppeteerPelvisRoll,
    puppeteerLeanZ,
    puppeteerShiftX,
    puppeteerShiftY,
    puppeteerGazeX,
    puppeteerGazeY,
    puppeteerWidening,
    puppeteerBlinkLeft,
    puppeteerBlinkRight,
    puppeteerBrowRaise,
    puppeteerBrowFurrow,
    puppeteerBrowAsymmetry,
    puppeteerSmile,
    respirationScale,
    orbitalYaw,
    redrawCurrentFrame,
  ]);

  const stopPlayback = useCallback(() => {
    const wasPlaying = isPlayingRef.current;
    isPlayingRef.current = false;
    setIsPlaying(false);
    const activeEngine =
      viewportStageRef.current?.getEngine() ||
      (typeof window !== "undefined" ? window.__engine : null);
    if (activeEngine) {
      activeEngine.setSpeaking(false);
    }

    if (vfcIdRef.current !== null && videoRef.current && "cancelVideoFrameCallback" in videoRef.current) {
      videoRef.current.cancelVideoFrameCallback(vfcIdRef.current);
      vfcIdRef.current = null;
    }
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    if (audioRef.current) audioRef.current.pause();
    if (videoRef.current) videoRef.current.pause();

    const maxFrames = totalFramesRef.current;
    let pausedFrame = currentFrameRef.current;
    const isAtEnd =
      audioRef.current &&
      (audioRef.current.ended ||
        (maxFrames > 0 && pausedFrame >= maxFrames - 1) ||
        (audioRef.current.duration > 0 &&
          Number.isFinite(audioRef.current.duration) &&
          audioRef.current.currentTime >= audioRef.current.duration - 0.08));

    if (isAtEnd) {
      pausedFrame = 0;
      currentFrameRef.current = 0;
      if (audioRef.current) audioRef.current.currentTime = 0;
      if (videoRef.current) videoRef.current.currentTime = 0;
    }

    setCurrentFrame(pausedFrame);
    if (wasPlaying) {
      manualClusterIdRef.current = null;
      setManualClusterId(null);
    }
    if (activeEngine && manualClusterIdRef.current === null) {
      activeEngine.setTimelineFrame(pausedFrame);
    }
    const frameData = decodedFramesRef.current.get(pausedFrame);
    if (frameData && manualClusterIdRef.current === null) {
      setActiveClusterId(frameData.clusterId);
      setActiveAperture(frameData.aperture);
    }
  }, []);
  const stopPlaybackRef = useRef(stopPlayback);
  stopPlaybackRef.current = stopPlayback;

  const scheduleNextFrame = useCallback(() => {
    if (!isPlayingRef.current) return;
    const audio = audioRef.current;
    if (!audio) return;

    let frameCount = 0;
    let lastFpsTime = performance.now();
    const preset = activePresetRef.current;

    if (preset.type === "image") {
      // Audio-driven requestAnimationFrame loop for static image plate
      let lastAudioFrameTick = 0;
      const onAudioFrame = (now: number) => {
        if (!isPlayingRef.current) return;
        if (now - lastAudioFrameTick < 15.0) {
          rafIdRef.current = requestAnimationFrame(onAudioFrame);
          return;
        }
        lastAudioFrameTick = now;
        const targetAudioFrame = Math.floor(audio.currentTime * 25.0);

        currentFrameRef.current = targetAudioFrame;
        renderSingleFrameRef.current(targetAudioFrame, 0);

        frameCount++;
        if (now - lastFpsTime >= 1000) {
          setFps(frameCount);
          frameCount = 0;
          lastFpsTime = now;
        }

        const maxFrames = totalFramesRef.current > 0 ? totalFramesRef.current : totalFrames;
        if (targetAudioFrame < maxFrames && !audio.ended && !audio.paused) {
          rafIdRef.current = requestAnimationFrame(onAudioFrame);
        } else {
          if (isLoopingRef.current) {
            audio.currentTime = 0;
            currentFrameRef.current = 0;
            setCurrentFrame(0);
            if (typeof window !== "undefined" && window.__engine) {
              window.__engine.setTimelineFrame(0);
            }
            if (!audio.src || audio.src === window.location.href || !audio.src.includes(".wav")) {
              const fallbackKey = activeAudioKeyRef.current || "user_hello";
              audio.src = `/assets/audio_features/${fallbackKey}.wav`;
              audio.load();
            }
            audio.play().catch(() => {});
            rafIdRef.current = requestAnimationFrame(onAudioFrame);
            return;
          }
          stopPlayback();
          addLog("Playback completed.", "info");
        }
      };
      rafIdRef.current = requestAnimationFrame(onAudioFrame);
      return;
    }

    // Video-driven PLL sync loop for video plate
    const video = videoRef.current;
    if (!video) return;

    let lastVideoFrameTick = 0;
    const onFrame = (now: number, metadata?: VideoFrameCallbackMetadata) => {
      if (!isPlayingRef.current) return;
      if (now - lastVideoFrameTick < 15.0) {
        rafIdRef.current = requestAnimationFrame((t) => onFrame(t));
        return;
      }
      lastVideoFrameTick = now;

      const videoTime = metadata ? metadata.mediaTime : video.currentTime;
      const isContinuous = videoModeRef.current === "continuous";
      const totalVideoFrames = isContinuous
        ? (continuousLandmarksRef.current.length || 709)
        : (avatarLandmarksRef.current.length > 1 ? avatarLandmarksRef.current.length : 185);
      const defaultVideoFps = isContinuous ? 25.0 : 24.0;
      const videoDuration =
        video.duration && Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : totalVideoFrames / defaultVideoFps;
      const videoFps = (videoDuration > 0 && totalVideoFrames > 0) ? (totalVideoFrames / videoDuration) : defaultVideoFps;

      const sync = AudioVideoSyncClock.evaluateSync(
        videoTime,
        audio.currentTime,
        videoDuration,
        totalVideoFrames,
        videoFps,
        25.0
      );

      // PLL Drift Correction
      if (sync.requiresHardSeek) {
        video.currentTime = sync.expectedVideoTime;
        video.playbackRate = 1.0;
      } else {
        video.playbackRate = sync.recommendedPlaybackRate;
      }

      currentFrameRef.current = sync.targetAudioFrame;
      renderSingleFrameRef.current(sync.targetAudioFrame, sync.videoFrameIndex);

      frameCount++;
      if (now - lastFpsTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastFpsTime = now;
      }

      const maxFrames = totalFramesRef.current > 0 ? totalFramesRef.current : totalFrames;
      const isVideoStillRunning = videoModeRef.current === "continuous" && !video.ended && !video.paused;
      const isAudioStillRunning = sync.targetAudioFrame < maxFrames && !audio.ended && !audio.paused;

      if (isVideoStillRunning || isAudioStillRunning) {
        if (audio.ended && isVideoStillRunning) {
          audio.currentTime = 0;
          if (!audio.src || audio.src === window.location.href || !audio.src.includes(".wav")) {
            const fallbackKey = activeAudioKeyRef.current || "user_hello";
            audio.src = `/assets/audio_features/${fallbackKey}.wav`;
            audio.load();
          }
          audio.play().catch(() => {});
        }
        rafIdRef.current = requestAnimationFrame((t) => onFrame(t));
      } else {
        if (isLoopingRef.current) {
          audio.currentTime = 0;
          video.currentTime = 0;
          currentFrameRef.current = 0;
          setCurrentFrame(0);
          if (typeof window !== "undefined" && window.__engine) {
            window.__engine.setTimelineFrame(0);
          }
          if (!audio.src || audio.src === window.location.href || !audio.src.includes(".wav")) {
            const fallbackKey = activeAudioKeyRef.current || "user_hello";
            audio.src = `/assets/audio_features/${fallbackKey}.wav`;
            audio.load();
          }
          audio.play().catch(() => {});
          video.play().catch(() => {});
          rafIdRef.current = requestAnimationFrame((t) => onFrame(t));
          return;
        }
        stopPlayback();
        addLog("Playback completed.", "info");
      }
    };

    rafIdRef.current = requestAnimationFrame((t) => onFrame(t));
  }, [addLog, stopPlayback, totalFrames]);

  const startPlayback = useCallback(
    (fromBeginning = false) => {
      stopPlayback();
      manualClusterIdRef.current = null;
      setManualClusterId(null);
      const audio = audioRef.current;
      if (!audio) return;
      if (!audio.src || audio.src === window.location.href || !audio.src.includes(".wav")) {
        const fallbackKey = activeAudioKeyRef.current || "user_hello";
        audio.src = `/assets/audio_features/${fallbackKey}.wav`;
        audio.load();
      }
      const preset = activePresetRef.current;
      const video = videoRef.current;

      const isContinuous = videoModeRef.current === "continuous";
      const totalVideoFrames = isContinuous
        ? (continuousLandmarksRef.current.length || 709)
        : (avatarLandmarksRef.current.length > 1 ? avatarLandmarksRef.current.length : 185);
      const videoFps = isContinuous ? 25.0 : 24.0;
      const videoDuration =
        video?.duration && Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : totalVideoFrames / videoFps;

      const maxFrames = totalFramesRef.current > 0 ? totalFramesRef.current : totalFrames;
      const isAtEnd =
        fromBeginning ||
        audio.ended ||
        (audio.duration > 0 && Number.isFinite(audio.duration) && audio.currentTime >= audio.duration - 0.08) ||
        (maxFrames > 0 && currentFrameRef.current >= maxFrames - 1);

      const activeEngine =
        viewportStageRef.current?.getEngine() ||
        (typeof window !== "undefined" ? window.__engine : null);
      if (activeEngine) {
        activeEngine.clearExplicitViseme();
      }

      if (isAtEnd) {
        audio.currentTime = 0;
        if (video) video.currentTime = 0;
        currentFrameRef.current = 0;
        setCurrentFrame(0);
        if (activeEngine) {
          activeEngine.setTimelineFrame(0);
        }
      } else {
        const resumeAudioTime = currentFrameRef.current / 25.0;
        audio.currentTime = resumeAudioTime;
        if (video) {
          video.currentTime = videoDuration > 0 ? resumeAudioTime % videoDuration : 0;
        }
      }

      if (video) video.playbackRate = 1.0;
      isPlayingRef.current = true;
      setIsPlaying(true);
      if (activeEngine) {
        activeEngine.setSpeaking(true);
      }

      audio
        .play()
        .then(() => {
          if (!isPlayingRef.current) return;
          if (preset.type === "video" && video) {
            video.play().catch(() => {});
          }
          scheduleNextFrame();
        })
        .catch((e) => {
          if ((e as Error).name === "AbortError" || (e as Error).message.includes("interrupted")) {
            return;
          }
          addLog(`Audio play error: ${(e as Error).message}`, "error");
          stopPlayback();
        });
    },
    [addLog, scheduleNextFrame, stopPlayback, totalFrames]
  );
  const startPlaybackRef = useRef(startPlayback);
  startPlaybackRef.current = startPlayback;

  // Handle User Frame Scrubbing / Seeking (locks audio, plate & mouth overlay)
  const handleSeek = useCallback(
    (targetAudioFrame: number) => {
      stopPlayback();
      const maxFrames = totalFramesRef.current > 0 ? totalFramesRef.current : totalFrames;
      const clampedAudioFrame = Math.max(
        0,
        Math.min(maxFrames > 0 ? maxFrames - 1 : 184, targetAudioFrame)
      );
      currentFrameRef.current = clampedAudioFrame;
      setCurrentFrame(clampedAudioFrame);
      manualClusterIdRef.current = null;
      setManualClusterId(null);
      if (typeof window !== "undefined" && window.__engine) {
        window.__engine.clearExplicitViseme();
        window.__engine.setTimelineFrame(clampedAudioFrame);
      }
      const frameData = decodedFramesRef.current.get(clampedAudioFrame);
      if (frameData) {
        setActiveClusterId(frameData.clusterId);
        setActiveAperture(frameData.aperture);
      }

      const audioTime = clampedAudioFrame / 25.0;
      if (audioRef.current) {
        audioRef.current.currentTime = audioTime;
      }

      const preset = activePresetRef.current;
      if (preset.type === "image") {
        renderSingleFrame(clampedAudioFrame, 0);
        return;
      }

      const video = videoRef.current;
      const totalVideoFrames = avatarLandmarksRef.current.length || 185;
      const videoDuration =
        video?.duration && Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : totalVideoFrames / 24.0;

      const videoTime = videoDuration > 0 ? audioTime % videoDuration : 0;
      const progress = videoDuration > 0 ? videoTime / videoDuration : 0;
      const videoFrameIdx = Math.min(
        totalVideoFrames - 1,
        Math.max(0, Math.floor(progress * totalVideoFrames))
      );

      if (video) {
        video.currentTime = videoTime;
      }

      renderSingleFrame(clampedAudioFrame, videoFrameIdx);
    },
    [renderSingleFrame, stopPlayback, totalFrames]
  );

  // Synchronize canvas on video seeked events while paused
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleSeeked = () => {
      if (!isPlayingRef.current) {
        const totalVideoFrames = avatarLandmarksRef.current.length || 185;
        const videoDuration =
          video.duration && Number.isFinite(video.duration) && video.duration > 0
            ? video.duration
            : totalVideoFrames / 24.0;
        const progress = videoDuration > 0 ? (video.currentTime % videoDuration) / videoDuration : 0;
        const videoFrameIdx = Math.min(
          totalVideoFrames - 1,
          Math.max(0, Math.floor(progress * totalVideoFrames))
        );
        renderSingleFrame(currentFrameRef.current, videoFrameIdx);
      }
    };

    video.addEventListener("seeked", handleSeeked);
    return () => {
      video.removeEventListener("seeked", handleSeeked);
    };
  }, [renderSingleFrame]);

  // 5. Trigger Audio Speech Processing (0ms ROM Biomechanical Matching)
  const triggerSample = useCallback(
    async (key: string, label: string, autoPlay = true) => {
      if (!key) return;
      stopPlayback();
      activeAudioKeyRef.current = key;
      setActiveAudioKey(key);
      setIsGenerating(true);
      const t0 = performance.now();

      addLog(`Fetching acoustic Whisper features for "${label}"...`, "info");
      try {
        const [metaRes, binRes] = await Promise.all([
          fetch(`/assets/audio_features/${key}.audio_features.json`),
          fetch(`/assets/audio_features/${key}.audio_features.bin`),
        ]);

        if (!metaRes.ok || !binRes.ok) {
          throw new Error("Audio features not found on server.");
        }

        const meta = await metaRes.json();
        const binBuf = await binRes.arrayBuffer();

        // Fast Float16 unpack
        const u16 = new Uint16Array(binBuf);
        const whisperFloat32 = new Float32Array(u16.length);
        for (let i = 0; i < u16.length; i++) {
          whisperFloat32[i] = AudioFeatureUnpacker.decodeFloat16(u16[i]);
        }

        const numFrames: number = meta.numFrames;
        const silenceMask: boolean[] = meta.silenceMask || [];
        const rmsArr: number[] = meta.rms || [];

        // 1. Sustained silence mask: only true pauses (>= 5 contiguous frames = 200ms with rms < 0.010)
        // snap to Cluster 0, preventing inter-vowel consonant valleys from snapping the mouth shut.
        const effectiveSilenceMask = WhisperArticulationPredictor.computeSustainedSilenceMask(
          rmsArr,
          silenceMask,
          5,
          0.010
        );

        // Keep viseme codebook presence at 1.0 across all frames so silence renders Cluster 0 (silent codebook mouth)
        // and never drops to 0.0 to expose the underlying background video mouth.
        const presenceWeights = new Float32Array(numFrames).fill(1.0);
        presenceWeightsRef.current = presenceWeights;

        // Task 4: Precompute Pre-Speech Respiratory Inhalation trajectory (3-4 frame lookahead)
        const respirationWeights = HermiteEasing.computePreSpeechRespiration(numFrames, effectiveSilenceMask, 4);
        respirationWeightsRef.current = respirationWeights;

        // Setup audio element source
        if (audioRef.current) {
          audioRef.current.src = `/assets/audio_features/${key}.wav`;
          audioRef.current.load();
          if (typeof window !== "undefined" && window.__engine) {
            window.__engine.setSyncAudioElement(audioRef.current);
          }
        }

        // Task 4: Asynchronously extract F0 vocal pitch trajectory from audio
        PitchDetector.extractFromAudioUrl(`/assets/audio_features/${key}.wav`, 25.0)
          .then((pitchRes) => {
            if (pitchRes) {
              pitchF0Ref.current = pitchRes.normalizedPitch;
              setTimelineFrames((prev) => {
                if (!prev) return prev;
                for (const [f, entry] of prev.entries()) {
                  if (f < pitchRes.normalizedPitch.length) {
                    entry.f0 = pitchRes.normalizedPitch[f];
                  }
                }
                return prev;
              });
            }
          })
          .catch(() => {});

        decodedFramesRef.current.clear();
        const effectiveTotalFrames = videoModeRef.current === "continuous" ? Math.max(continuousLandmarksRef.current.length || 709, numFrames) : numFrames;
        totalFramesRef.current = effectiveTotalFrames;
        setTotalFrames(effectiveTotalFrames);

        // 2. Predict full 7D articulation trajectory from Whisper encoder tensors (25Hz frame-by-frame)
        const predicted7d = WhisperArticulationPredictor.predictSequence(whisperFloat32, numFrames);

        // 3. Resolve optimal codebook viseme at every 25Hz frame using 7D biomechanical + SimHash matching
        if (codebookService.current.getVisemes().length === 0 && codebookTypeRef.current !== "none") {
          await loadCodebookForPlateRef.current(activePresetRef.current, codebookTypeRef.current);
        }
        const fallbackNeutral: VisemeCodebookEntry = {
          clusterId: 0,
          simHash: "0000000000000000",
          aperture: 0.08,
          width: 94.5,
          jawDescent: 74.64,
          outerLipHeight: 30.56,
          upperLipY: 2.3,
          upperTeethLuma: 82.0,
          lowerTeethLuma: 95.0,
        };
        const neutralEntry =
          codebookService.current.getNeutralEntry() ||
          codebookService.current.getVisemes()[0] ||
          fallbackNeutral;
        const timelineMap = new Map<number, VisemeTimelineFrame>();
        let prevAp = 0.08;
        let prevWidth = 94.5;
        let prevClusterId: number | null = 0;
        let hits = 0;
        let fHits = 0;

        const selectedEntries: VisemeCodebookEntry[] = new Array(numFrames);

        for (let f = 0; f < numFrames; f++) {
          const pred = predicted7d[f] || {
            aperture: 0.08,
            width: 89.2,
            jawDescent: 73.8,
            outerLipHeight: 27.6,
            upperLipY: 2.3,
            upperTeethLuma: 82.0,
            lowerTeethLuma: 95.0,
          };

          let chosen: VisemeCodebookEntry = neutralEntry;
          if (effectiveSilenceMask[f] === 1) {
            chosen = neutralEntry;
            hits++;
          } else {
            const ctxSlices = [-2, -1, 0, 1, 2].map((d) => {
              const idx = Math.max(0, Math.min(numFrames - 1, f + d));
              return whisperFloat32.subarray(idx * 50 * 384, (idx + 1) * 50 * 384);
            });
            const hash = AcousticSimHashEngine.computeContextSimHash(ctxSlices);
            const match = codebookService.current.findBiomechanicalViseme(
              hash,
              pred.aperture,
              prevAp,
              prevClusterId,
              {
                hammingWeight: 0.08,
                energyWeight: 1.75,
                baseVelWeight: 0.24,
                smoothFactor: 0.0,
                maxVelocityPenalty: 6.0,
                consonantPenaltyWeight: 4.5,
                targetWidth: pred.width,
                prevWidth,
                targetJawDescent: pred.jawDescent,
                targetOuterLipHeight: pred.outerLipHeight,
                targetUpperLipY: pred.upperLipY,
                targetUpperTeethLuma: pred.upperTeethLuma,
                targetLowerTeethLuma: pred.lowerTeethLuma,
                clusterInertiaBonus: -0.65,
                excludeSilentClusterWhenActive: true,
              }
            );
            chosen = match?.entry || neutralEntry;
            hits++;
            if (match && match.dist > 0) fHits++;
          }

          selectedEntries[f] = chosen;
          prevAp = chosen.aperture ?? pred.aperture;
          prevWidth = chosen.width ?? prevWidth;
          prevClusterId = chosen.clusterId ?? prevClusterId;
        }

        // Temporal despiker pass: eliminate isolated 1-frame (40ms) cluster flickers during steady holds
        for (let f = 1; f < numFrames - 1; f++) {
          if (effectiveSilenceMask[f] === 1) continue;
          const cPrev = selectedEntries[f - 1];
          const cCurr = selectedEntries[f];
          const cNext = selectedEntries[f + 1];
          if (cCurr.clusterId !== cPrev.clusterId && cCurr.clusterId !== cNext.clusterId) {
            const pred = predicted7d[f];
            if (!pred) continue;
            const prevTeeth = cPrev.upperTeethLuma ?? 82;
            const currTeeth = cCurr.upperTeethLuma ?? 82;
            const nextTeeth = cNext.upperTeethLuma ?? 82;
            const isIsolatedTeethSpike =
              Math.abs(currTeeth - prevTeeth) > 28 &&
              Math.abs(currTeeth - nextTeeth) > 28 &&
              Math.abs(prevTeeth - nextTeeth) < 22;

            if (isIsolatedTeethSpike) {
              const prevApErr = cPrev.clusterId === 0 ? 1e9 : Math.abs((cPrev.aperture ?? 0) - pred.aperture);
              const nextApErr = cNext.clusterId === 0 ? 1e9 : Math.abs((cNext.aperture ?? 0) - pred.aperture);
              selectedEntries[f] = prevApErr <= nextApErr ? cPrev : cNext;
            } else if (cPrev.clusterId === cNext.clusterId && cPrev.clusterId !== 0) {
              if (
                Math.abs((cPrev.aperture ?? 0) - pred.aperture) < 2.8 &&
                Math.abs((cPrev.outerLipHeight ?? 30.56) - pred.outerLipHeight) < 5.5
              ) {
                selectedEntries[f] = cPrev;
              }
            } else {
              for (const nb of [cPrev, cNext]) {
                if (
                  nb.clusterId !== 0 &&
                  Math.abs((nb.aperture ?? 0) - pred.aperture) < 1.8 &&
                  Math.abs((nb.width ?? 94.5) - pred.width) < 2.5 &&
                  Math.abs((nb.outerLipHeight ?? 30.56) - pred.outerLipHeight) < 3.5
                ) {
                  selectedEntries[f] = nb;
                  break;
                }
              }
            }
          }
        }

        for (let f = 0; f < numFrames; f++) {
          const pred = predicted7d[f] || {
            aperture: 0.08,
            width: 89.2,
            jawDescent: 73.8,
            outerLipHeight: 27.6,
            upperLipY: 2.3,
            upperTeethLuma: 82.0,
            lowerTeethLuma: 95.0,
          };
          const chosen = selectedEntries[f];
          const prevChosen = f > 0 ? selectedEntries[f - 1] : chosen;
          const chosenAp = chosen.aperture ?? pred.aperture;
          const chosenJd = effectiveSilenceMask[f] === 1 ? 74.64 : pred.jawDescent;
          const chosenJawDrop = chosenAp <= 0.22 ? 0.0 : Math.min(10.0, (chosenAp / 26.0) * 10.0);

          if (chosen.predecodedBitmap) {
            decodedFramesRef.current.set(f, {
              patch: chosen.predecodedBitmap,
              aperture: chosenAp,
              jawDescent: chosenJd,
              clusterId: chosen.clusterId,
              jawDrop: chosenJawDrop,
            });
          }

          const dAp = Math.abs((chosen.aperture ?? 0) - (prevChosen.aperture ?? 0));
          const dOh = Math.abs((chosen.outerLipHeight ?? 30.56) - (prevChosen.outerLipHeight ?? 30.56));
          const adaptiveBlend = dAp > 7.5 || dOh > 12.0 ? 0.85 : 0.72;

          timelineMap.set(f, {
            clusterId: prevChosen.clusterId,
            clusterB: chosen.clusterId,
            blend: adaptiveBlend,
            jawDrop: chosenJawDrop,
            aperture: chosenAp,
            jawDescent: chosenJd,
            presence: 1.0,
            rms: rmsArr[f] ?? 0,
            f0: pitchF0Ref.current ? pitchF0Ref.current[f] : undefined,
          });
        }
        setTimelineFrames(timelineMap);
        const activeEngine =
          viewportStageRef.current?.getEngine() ||
          (typeof window !== "undefined" ? window.__engine : null);
        if (activeEngine) {
          activeEngine.setTimelineFrames(timelineMap);
        }

        const elapsed = Math.round(performance.now() - t0);
        setLatencyMs(elapsed);
        setCacheHits(hits);
        setTotalKeyframes(numFrames);
        setFuzzyHits(fHits);

        addLog(
          `Resolved ${hits} frames via 0ms ROM lookup in ${elapsed}ms (${fHits} fuzzy matches).`,
          "success"
        );

        // Plan or configure video plate source (only if active preset is video)
        if (activePresetRef.current.type === "video") {
          if (videoModeRef.current === "auto_fsm") {
            const audioDurationSec = numFrames / 25.0;
            const seq = planRubyAutoFsmSequence(audioDurationSec);
            setFsmSequence(seq);
            setActiveFsmBeatIndex(0);
            if (videoRef.current && seq.length > 0) {
              videoRef.current.src = seq[0].videoPath;
            }
          } else if (videoModeRef.current === "continuous") {
            if (videoRef.current && !videoRef.current.src.includes("ruby_burgundy_continuous.mp4")) {
              videoRef.current.src = "/assets/action_loops/veo/ruby_burgundy_vertical_backup/ruby_burgundy_continuous.mp4";
            }
          } else {
            if (videoRef.current && !videoRef.current.src.includes("ruby_burgundy_M1_loop_v1.mp4")) {
              videoRef.current.src = "/assets/action_loops/veo/ruby_burgundy_vertical_backup/ruby_burgundy_M1_loop_v1.mp4";
            }
          }
        }

        if (autoPlay) {
          startPlayback(true);
        } else {
          currentFrameRef.current = 0;
          setCurrentFrame(0);
          if (videoRef.current) videoRef.current.currentTime = 0;
          if (audioRef.current) audioRef.current.currentTime = 0;
          if (typeof window !== "undefined" && window.__engine) {
            window.__engine.setTimelineFrame(0);
          }
          renderSingleFrame(0, 0);
        }
      } catch (err) {
        addLog(`Speech synthesis error: ${(err as Error).message}`, "error");
      } finally {
        setIsGenerating(false);
      }
    },
    [addLog, renderSingleFrame, startPlayback, stopPlayback]
  );
  const triggerSampleRef = useRef(triggerSample);
  triggerSampleRef.current = triggerSample;

  // Switch codebook and immediately re-decode active audio track
  const applyCustomBakedBundleRef = useRef<
    ((
      basePreset: PlatePreset,
      bundle: BakedCodebookBundle,
      codebookLabel: string,
      retriggerAudio: boolean
    ) => Promise<PlatePreset>) | null
  >(null);

  const handleChangeCodebook = useCallback(
    async (type: "ditto" | "ditto_fullface" | "musetalk" | "none") => {
      codebookTypeRef.current = type;
      setCodebookType(type);
      const activePreset = activePresetRef.current;
      const isCustomPreset = activePreset.id.startsWith("custom_");
      const cachedCustom = isCustomPreset
        ? (customInMemoryByPresetRef.current.get(activePreset.id) ?? null)
        : null;

      await loadCodebookForPlate(activePreset, type, {
        skipEngineReload: Boolean(cachedCustom && type !== "none"),
      });

      if (isCustomPreset && (type === "ditto" || type === "ditto_fullface")) {
        const desiredVersion = type === "ditto_fullface" ? "full_bottom_face" : "mouth_only";
        const customFile =
          customFileByPresetRef.current.get(activePreset.id) ?? customUploadFileRef.current;
        if (
          customFile &&
          (!cachedCustom ||
            cachedCustom.codebookJson.visemeCount < 256 ||
            cachedCustom.codebookJson.versionType !== desiredVersion)
        ) {
          customBakeAbortRef.current?.abort();
          const abortCtrl = new AbortController();
          customBakeAbortRef.current = abortCtrl;
          const bakeMode = type === "ditto_fullface" ? "fullface" : "mouth_only";
          setCustomBakeStatus({
            tier: "baking_tier1b",
            progress: 0.08,
            message: `Re-baking 256 visemes (${type === "ditto_fullface" ? "Full Face + Chin" : "Mouth Only"})...`,
          });
          void AvatarCodebookBaker.bakeInWorker(customFile, {
            avatarId: activePreset.id,
            mode: bakeMode,
            generateNormals: true,
            signal: abortCtrl.signal,
            onProgress: (ev) => {
              if (abortCtrl.signal.aborted) return;
              setCustomBakeStatus({
                tier: "baking_tier1b",
                progress: ev.progress,
                message: ev.message,
              });
            },
          })
            .then(async (tier1b) => {
              if (abortCtrl.signal.aborted) {
                tier1b.blobUrls?.revoke();
                return;
              }
              if (applyCustomBakedBundleRef.current) {
                await applyCustomBakedBundleRef.current(
                  activePresetRef.current,
                  tier1b,
                  `${activePreset.name} (256 Studio + 4ch Normals)`,
                  true
                );
              }
              setCustomBakeStatus({
                tier: "tier1b_ready",
                progress: 1,
                message: `256 Visemes + 4ch Normals Ready (${(tier1b.elapsedMs / 1000).toFixed(1)}s)`,
              });
            })
            .catch(() => {
              // Keep existing active codebook if mode re-bake fails
            });
        }
      }

      const keyToReload = activeAudioKeyRef.current || "user_hello";
      await triggerSample(keyToReload, keyToReload, false);
    },
    [loadCodebookForPlate, triggerSample]
  );

  // Handler for switching Avatar & Driver Plate
  const handleSelectPlate = useCallback(
    async (presetIdOrPreset: string | PlatePreset) => {
      const preset =
        typeof presetIdOrPreset === "string"
          ? allPlatePresetsRef.current.find((p) => p.id === presetIdOrPreset)
          : presetIdOrPreset;
      if (!preset) return;
      customBakeAbortRef.current?.abort();
      customBakeAbortRef.current = null;
      const isCustom = preset.id.startsWith("custom_");
      const cachedInMemory = isCustom
        ? (customInMemoryByPresetRef.current.get(preset.id) ?? null)
        : null;
      setActiveInMemoryCodebook(cachedInMemory);
      if (!isCustom) {
        setCustomBakeStatus((prev) =>
          prev.tier === "idle" ? prev : { tier: "idle", progress: 0, message: "" }
        );
      }
      stopPlayback();
      liveMouthLandmarkRef.current = null;
      activePresetRef.current = preset;
      setActivePlateId(preset.id);
      const basePersonaId = resolvePresetPersonaId(preset);
      const initialEngine = viewportStageRef.current?.getEngine();
      if (initialEngine) {
        if (preset.src) {
          initialEngine.setPersona(basePersonaId, undefined, true);
          initialEngine.setMediaSource(preset.src);
        }
        initialEngine.setTargetLandmark(preset.landmark || null);
      }
      if (typeof window !== "undefined") {
        window.__activePlateId = preset.id;
      }
      addLog(`Selected Plate: ${preset.name} (${preset.type.toUpperCase()})`, "info");

      if (preset.type === "video") {
        setEnableChroma(true);
        if (preset.id === "ruby_continuous_video") {
          videoModeRef.current = "continuous";
          setVideoMode("continuous");
        } else if (preset.id === "ruby_m1_video") {
          videoModeRef.current = "single_loop";
          setVideoMode("single_loop");
        }
        if (videoRef.current) {
          videoRef.current.src = preset.src;
          videoRef.current.currentTime = 0;
        }
      } else {
        setEnableChroma(false);
      }

      const resolvedUrl = await loadCodebookForPlate(preset, codebookType, {
        skipEngineReload: Boolean(cachedInMemory && codebookType !== "none"),
      });
      const finalEngine = viewportStageRef.current?.getEngine();
      if (finalEngine) {
        const mode =
          codebookType === "ditto_fullface"
            ? "full_chin"
            : codebookType === "musetalk"
              ? "musetalk"
              : "mouth_only";
        finalEngine.setVisemeCodebookMode(mode, true);
        finalEngine.setPersona(basePersonaId, preset.src, true);
        const urlToLoad = resolvedUrl || preset.codebookUrl;
        if (!cachedInMemory && urlToLoad) {
          finalEngine.setCodebookUrl(urlToLoad, true);
          await finalEngine.loadVisemeCodebook(basePersonaId, preset.src, urlToLoad);
        }
        if (preset.src) {
          finalEngine.setMediaSource(preset.src);
        }
        const finalLm = resolvePlateLandmark(
          preset,
          codebookService.current.plateLandmark
        );
        finalEngine.setTargetLandmark(finalLm);
        finalEngine.renderSingleFrame?.();
      }

      // Re-trigger active sample to evaluate against new codebook
      if (activeAudioKeyRef.current) {
        await triggerSample(activeAudioKeyRef.current, "Active Audio", false);
      }
    },
    [addLog, codebookType, loadCodebookForPlate, stopPlayback, triggerSample]
  );
  if (typeof window !== "undefined") {
    window.__selectPlate = handleSelectPlate;
  }

  const applyCustomBakedBundle = useCallback(
    async (
      basePreset: PlatePreset,
      bundle: BakedCodebookBundle,
      codebookLabel: string,
      retriggerAudio: boolean
    ): Promise<PlatePreset> => {
      if (bundle.blobUrls?.revoke) {
        customRevokeFnsRef.current.push(bundle.blobUrls.revoke);
      }

      const lm: LandmarkTarget = {
        cx: bundle.geometry.plateLandmark.cx,
        cy: bundle.geometry.plateLandmark.cy,
        w: bundle.geometry.plateLandmark.w,
        h: bundle.geometry.plateLandmark.h,
        angle: bundle.geometry.plateLandmark.angle,
        iod: bundle.geometry.plateLandmark.iod,
        leftEyeCenter: bundle.geometry.plateLandmark.leftEyeCenter,
        rightEyeCenter: bundle.geometry.plateLandmark.rightEyeCenter,
        headCenter: bundle.geometry.plateLandmark.headCenter,
        headRadius: bundle.geometry.plateLandmark.headRadius,
      };

      const nextCodebookUrl = bundle.blobUrls?.codebookBlobUrl || basePreset.codebookUrl;
      const updatedPreset: PlatePreset = {
        ...basePreset,
        width: bundle.geometry.imageWidth,
        height: bundle.geometry.imageHeight,
        codebookUrl: nextCodebookUrl,
        codebookLabel,
        landmark: lm,
      };
      customInMemoryByPresetRef.current.set(updatedPreset.id, bundle.inMemory);
      setActiveInMemoryCodebook(bundle.inMemory);

      setCustomPresets((prev) => {
        const idx = prev.findIndex((p) => p.id === updatedPreset.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updatedPreset;
          return copy;
        }
        return [updatedPreset, ...prev];
      });

      customUploadBasePresetRef.current = updatedPreset;
      activePresetRef.current = updatedPreset;
      setActivePlateId(updatedPreset.id);
      setActiveCodebookUrl(nextCodebookUrl);
      setEnableChroma(false);

      // Populate StudioCodebookGallery & 0ms ROM matcher directly from in-memory JSON + blob atlas
      await codebookService.current.loadFromJson(
        bundle.codebookJson as unknown as VisemeCodebookJson,
        true
      );
      const loaded = codebookService.current.getVisemes();
      setVisemes(loaded);
      setPsnrDb(codebookService.current.psnr);
      setEngineName(codebookService.current.engine);
      setIsWebGLReady(true);

      const neutral = codebookService.current.getNeutralEntry();
      if (neutral?.predecodedBitmap) {
        neutralPatchRef.current = neutral.predecodedBitmap;
      }
      avatarLandmarksRef.current = [lm];

      const stageEngine = viewportStageRef.current?.getEngine();
      if (stageEngine) {
        const mode =
          bundle.codebookJson.versionType === "full_bottom_face" ? "full_chin" : "mouth_only";
        stageEngine.setVisemeCodebookMode(mode, true);
        stageEngine.setPersona(updatedPreset.id, updatedPreset.src, true);
        stageEngine.setMediaSource(updatedPreset.src);
        stageEngine.setTargetLandmark(lm);
        stageEngine.renderSingleFrame?.();
      }

      if (retriggerAudio && activeAudioKeyRef.current) {
        await triggerSample(activeAudioKeyRef.current, "Active Audio", false);
      }

      return updatedPreset;
    },
    [triggerSample]
  );
  applyCustomBakedBundleRef.current = applyCustomBakedBundle;

  const handleCustomPortraitUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      customBakeAbortRef.current?.abort();
      const abortCtrl = new AbortController();
      customBakeAbortRef.current = abortCtrl;

      const rawStem = file.name.replace(/\.[^/.]+$/, "");
      const cleanSlug =
        rawStem
          .replace(/[^a-zA-Z0-9_-]/g, "_")
          .replace(/_+/g, "_")
          .replace(/^_+|_+$/g, "")
          .toLowerCase() || "portrait";
      const customId = cleanSlug.startsWith("custom_") ? cleanSlug : `custom_${cleanSlug}`;
      const displayBase = rawStem.trim() || "Portrait";
      customUploadFileRef.current = file;
      customFileByPresetRef.current.set(customId, file);

      try {
        stopPlayback();
        setCustomBakeStatus({
          tier: "baking_tier1a",
          progress: 0.04,
          message: "Synthesizing <150ms instant preview...",
        });
        addLog(`Uploading custom portrait "${file.name}" -> Tier 1a instant preview...`, "info");

        const photoObjectUrl = URL.createObjectURL(file);
        customRevokeFnsRef.current.push(() => URL.revokeObjectURL(photoObjectUrl));

        // 1. Tier 1a (<150 ms): 64-viseme CIE Lab + resting-lip erasure preview
        const tier1a = await BrowserVisemeCodebookGenerator.generateFromFile(file, customId);
        if (abortCtrl.signal.aborted) return;

        const w = tier1a.bundle.geometry.imageWidth;
        const h = tier1a.bundle.geometry.imageHeight;
        const aspectRatio = w / Math.max(1, h);
        const aspectClass =
          aspectRatio < 0.8 ? "aspect-[9/16]" : aspectRatio > 1.25 ? "aspect-video" : "aspect-square";

        const initialPreset: PlatePreset = {
          id: customId,
          name: `${displayBase} (Custom)`,
          type: "image",
          src: photoObjectUrl,
          width: w,
          height: h,
          codebookUrl: tier1a.blobUrls?.codebookBlobUrl || "",
          codebookLabel: `${displayBase} (Tier 1a Instant 64)`,
          landmark: {
            cx: tier1a.bundle.geometry.plateLandmark.cx,
            cy: tier1a.bundle.geometry.plateLandmark.cy,
            w: tier1a.bundle.geometry.plateLandmark.w,
            h: tier1a.bundle.geometry.plateLandmark.h,
            angle: tier1a.bundle.geometry.plateLandmark.angle,
          },
          aspectClass,
          avatarSrc: photoObjectUrl,
          description: `${w}×${h} Custom Uploaded Portrait`,
        };

        const presetAfter1a = await applyCustomBakedBundle(
          initialPreset,
          tier1a.bundle,
          `${displayBase} (Tier 1a • 64 Visemes)`,
          true
        );

        addLog(
          `Tier 1a Preview Live in ${Math.round(tier1a.bundle.elapsedMs)}ms (64 visemes). Starting Tier 1b 256-viseme + 4ch normal studio bake...`,
          "success"
        );

        setCustomBakeStatus({
          tier: "baking_tier1b",
          progress: 0.08,
          message: "Baking 256 HD visemes + 4ch Scharr normals...",
        });

        // Probe optional Tier 2 GPU Neural backend in parallel
        void new NeuralCodebookUpgradeClient().probeAvailability().then((health) => {
          if (!abortCtrl.signal.aborted) {
            setNeuralBackendOnline(health.online);
          }
        });

        // 2. Tier 1b (~2s): 256-viseme CIE Lab + Multi-Scale Scharr 4ch normal/wetness atlas
        const bakeMode = codebookTypeRef.current === "ditto_fullface" ? "fullface" : "mouth_only";
        void AvatarCodebookBaker.bakeInWorker(file, {
          avatarId: customId,
          mode: bakeMode,
          generateNormals: true,
          signal: abortCtrl.signal,
          onProgress: (ev) => {
            if (abortCtrl.signal.aborted) return;
            setCustomBakeStatus({
              tier: "baking_tier1b",
              progress: ev.progress,
              message: ev.message,
            });
          },
        })
          .then(async (tier1b) => {
            if (abortCtrl.signal.aborted) {
              tier1b.blobUrls?.revoke();
              return;
            }
            await applyCustomBakedBundle(
              presetAfter1a,
              tier1b,
              `${displayBase} (256 Studio + 4ch Normals)`,
              true
            );
            setCustomBakeStatus({
              tier: "tier1b_ready",
              progress: 1,
              message: `256 Visemes + 4ch Normals Ready (${(tier1b.elapsedMs / 1000).toFixed(1)}s)`,
            });
            addLog(
              `Tier 1b Studio Bake Complete! 256 visemes + 4-channel specular normal atlas hot-swapped in ${(tier1b.elapsedMs / 1000).toFixed(2)}s.`,
              "success"
            );
          })
          .catch((bakeErr: unknown) => {
            if (abortCtrl.signal.aborted) return;
            setCustomBakeStatus({
              tier: "error",
              progress: 1,
              message:
                bakeErr instanceof Error
                  ? `Tier 1a active (${bakeErr.message})`
                  : "Tier 1a preview active",
            });
            addLog(
              `Tier 1b background bake fallback: ${bakeErr instanceof Error ? bakeErr.message : String(bakeErr)}`,
              "warn"
            );
          });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setCustomBakeStatus({ tier: "error", progress: 0, message: msg });
        addLog(`Custom portrait upload failed: ${msg}`, "error");
      } finally {
        if (e.target) e.target.value = "";
      }
    },
    [addLog, applyCustomBakedBundle, stopPlayback]
  );

  const handleUpgradeCustomNeural = useCallback(async () => {
    const activePreset = activePresetRef.current;
    const basePreset = activePreset.id.startsWith("custom_")
      ? activePreset
      : customUploadBasePresetRef.current;
    const file =
      (basePreset ? customFileByPresetRef.current.get(basePreset.id) : undefined) ??
      customUploadFileRef.current;
    if (!file || !basePreset) return;

    customBakeAbortRef.current?.abort();
    const abortCtrl = new AbortController();
    customBakeAbortRef.current = abortCtrl;

    try {
      setCustomBakeStatus({
        tier: "baking_tier2",
        progress: 0.08,
        message: "Synthesizing HD Neural 256-Viseme Codebook...",
      });
      addLog("Starting Tier 2 GPU Neural 256-Viseme Codebook upgrade...", "info");

      const client = new NeuralCodebookUpgradeClient();
      const tier2 = await client.upgradeFromFile(file, {
        avatarId: basePreset.id,
        mode: codebookTypeRef.current === "ditto_fullface" ? "fullface" : "mouth_only",
        signal: abortCtrl.signal,
        onProgress: (ev) => {
          if (abortCtrl.signal.aborted) return;
          setCustomBakeStatus({
            tier: "baking_tier2",
            progress: ev.progress,
            message: ev.message,
          });
        },
      });
      if (abortCtrl.signal.aborted) {
        tier2.blobUrls?.revoke();
        return;
      }
      await applyCustomBakedBundle(
        basePreset,
        tier2,
        `${basePreset.name} (HD Neural 256)`,
        true
      );
      setCustomBakeStatus({
        tier: "tier2_ready",
        progress: 1,
        message: "HD Neural 256-Viseme Codebook Active",
      });
      addLog("Tier 2 HD Neural 256-Viseme Codebook hot-swapped onto live stage!", "success");
    } catch (err: unknown) {
      if (abortCtrl.signal.aborted) return;
      const msg = err instanceof Error ? err.message : String(err);
      setCustomBakeStatus({
        tier: "tier1b_ready",
        progress: 1,
        message: "256 Studio Visemes Active",
      });
      addLog(`Tier 2 Neural upgrade unavailable (${msg}); keeping 256 Studio Codebook.`, "warn");
    }
  }, [addLog, applyCustomBakedBundle]);

  // Handler for continuous 3D Orbital Yaw Rotation (-90° to +90°)
  // Confined to multi-angle codebook mouth viseme blending without jumping background plates
  const handleOrbitalYawChange = useCallback(
    (yaw: number) => {
      setOrbitalYaw(yaw);
    },
    [setOrbitalYaw]
  );

  // 1. Audio Element Lifecycle & Global Playback Synchronization
  useEffect(() => {
    if (typeof window === "undefined") return;
    const audio = new Audio("/assets/audio_features/user_hello.wav");
    audio.preload = "auto";
    audio.load();
    audioRef.current = audio;
    setSyncAudio(audio);

    const handleEnded = () => {
      if (isLoopingRef.current) {
        audio.currentTime = 0;
        if (!audio.src || audio.src === window.location.href || !audio.src.includes(".wav")) {
          const fallbackKey = activeAudioKeyRef.current || "user_hello";
          audio.src = `/assets/audio_features/${fallbackKey}.wav`;
          audio.load();
        }
        audio.play().catch(() => {});
      } else {
        stopPlaybackRef.current();
        addLogRef.current("Playback completed.", "info");
      }
    };

    const handleTimeUpdate = () => {
      if (isPlayingRef.current) {
        const maxFrames = totalFramesRef.current;
        const curFrame = Math.floor(audio.currentTime * 25.0);
        if (
          audio.ended ||
          (maxFrames > 0 &&
            curFrame >= maxFrames &&
            audio.duration > 0 &&
            audio.currentTime >= audio.duration - 0.08)
        ) {
          handleEnded();
        }
      }
    };

    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
    };
  }, []);

  // 2. Initial Load: Default to Ruby Vance Portrait & Pair Calibrated Codebook
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isInitialLoadedRef.current) return;
    isInitialLoadedRef.current = true;

    async function loadMetadata() {
      try {
        const defaultPreset = PLATE_PRESETS[0]; // ruby_portrait
        avatarLandmarksRef.current = [defaultPreset.landmark];

        // Defer background video loop landmarks so initial portrait plate mount is completely freeze-free
        const deferVideoLandmarks = () => {
          Promise.allSettled([
            fetch(`/assets/avatars/visemes/ruby_burgundy_mediapipe_landmarks.json?v=${CODEBOOK_BUILD_V}`),
            fetch(`/assets/avatars/visemes/ruby_burgundy_continuous_landmarks.json?v=${CODEBOOK_BUILD_V}`),
            fetch(`/assets/avatars/visemes/ruby_burgundy_fsm_landmarks.json?v=${CODEBOOK_BUILD_V}`),
          ]).then(([m1Res, contRes, fsmRes]) => {
            if (m1Res.status === "fulfilled" && m1Res.value.ok) {
              m1Res.value.json().then((m1Data) => {
                if (Array.isArray(m1Data)) {
                  fsmLandmarksMapRef.current["ruby_burgundy_M1_loop_v1"] = m1Data;
                  if (activePresetRef.current.id === "ruby_m1_video") {
                    avatarLandmarksRef.current = m1Data;
                  }
                }
              });
            }
            if (contRes.status === "fulfilled" && contRes.value.ok) {
              contRes.value.json().then((contData) => {
                if (Array.isArray(contData)) {
                  continuousLandmarksRef.current = contData;
                  if (activePresetRef.current.id === "ruby_continuous_video") {
                    avatarLandmarksRef.current = contData;
                  }
                }
              });
            }
            if (fsmRes.status === "fulfilled" && fsmRes.value.ok) {
              fsmRes.value.json().then((fsmData) => {
                if (typeof fsmData === "object" && fsmData !== null) {
                  fsmLandmarksMapRef.current = fsmData;
                }
              });
            }
          });
        };

        if (typeof window !== "undefined" && "requestIdleCallback" in window) {
          window.requestIdleCallback(deferVideoLandmarks, { timeout: 6000 });
        } else {
          setTimeout(deferVideoLandmarks, 4000);
        }

        // Defer plate codebook parsing and WebGL texture array loading to allow UI and left panel to paint immediately,
        // then preload the default speech track ("user_hello") once the codebook is ready so timelineFrames are populated.
        setTimeout(() => {
          loadCodebookForPlateRef.current(defaultPreset, "ditto_fullface")
            .catch((err) => {
              addLogRef.current(`Init notice: ${(err as Error).message}`, "warn");
            })
            .finally(() => {
              triggerSampleRef.current?.("user_hello", "Hello (English)", false);
            });
        }, 50);
      } catch (err) {
        addLogRef.current(`Init notice: ${(err as Error).message}`, "warn");
      }
    }

    loadMetadata();
  }, []);

  // Handle switching video plate source mode (Auto FSM Choreography, 47.4s Continuous Sequence, or Single M1 Loop)
  const handleChangeVideoMode = useCallback(
    (mode: "auto_fsm" | "continuous" | "single_loop") => {
      stopPlayback();
      videoModeRef.current = mode;
      setVideoMode(mode);

      const video = videoRef.current;
      if (!video) return;

      if (mode === "auto_fsm") {
        const currentTotal = totalFramesRef.current > 0 ? totalFramesRef.current : totalFrames;
        const audioDurationSec = currentTotal > 0 ? currentTotal / 25.0 : 28.36;
        const seq = planRubyAutoFsmSequence(audioDurationSec);
        setFsmSequence(seq);
        setActiveFsmBeatIndex(0);
        if (seq.length > 0) {
          video.src = seq[0].videoPath;
        }
        addLog(`Switched to Auto FSM Choreography (${seq.length} connecting beats, 0 jump-cuts).`, "info");
      } else if (mode === "continuous") {
        video.src = "/assets/action_loops/veo/ruby_burgundy_vertical_backup/ruby_burgundy_continuous.mp4";
        if (continuousLandmarksRef.current.length > 0) {
          avatarLandmarksRef.current = continuousLandmarksRef.current;
        }
        const newTotal = Math.max(continuousLandmarksRef.current.length || 709, totalFramesRef.current);
        totalFramesRef.current = newTotal;
        setTotalFrames(newTotal);
        addLog("Switched to 28.4s Continuous Video Plate (709 frames).", "info");
      } else {
        video.src = "/assets/action_loops/veo/ruby_burgundy_vertical_backup/ruby_burgundy_M1_loop_v1.mp4";
        if (fsmLandmarksMapRef.current["ruby_burgundy_M1_loop_v1"]?.length) {
          avatarLandmarksRef.current = fsmLandmarksMapRef.current["ruby_burgundy_M1_loop_v1"];
        }
        addLog("Switched to Single Loop Video Plate (M1 Neutral Clasped).", "info");
      }

      video.currentTime = 0;
      currentFrameRef.current = 0;
      setCurrentFrame(0);
      if (audioRef.current) audioRef.current.currentTime = 0;
      renderSingleFrame(0, 0);
    },
    [addLog, renderSingleFrame, stopPlayback, totalFrames]
  );

  // Handle seeking directly to an FSM beat node
  const handleSeekBeat = useCallback(
    (beatIndex: number) => {
      if (fsmSequence.length === 0 || beatIndex < 0 || beatIndex >= fsmSequence.length) return;
      stopPlayback();
      const node = fsmSequence[beatIndex];
      setActiveFsmBeatIndex(beatIndex);

      const targetAudioFrame = Math.round(node.startTimeSec * 25.0);
      currentFrameRef.current = targetAudioFrame;
      setCurrentFrame(targetAudioFrame);

      if (audioRef.current) {
        audioRef.current.currentTime = node.startTimeSec;
      }

      const video = videoRef.current;
      if (video) {
        if (!video.src.includes(node.videoPath.split("/").pop() || "")) {
          video.src = node.videoPath;
        }
        video.currentTime = 0;
      }

      renderSingleFrame(targetAudioFrame, 0);
      addLog(`Jumped to FSM Beat ${beatIndex + 1}: ${node.actionStateLabel} (${node.startTimeSec.toFixed(1)}s)`, "info");
    },
    [addLog, fsmSequence, renderSingleFrame, stopPlayback]
  );

  // Synced Video Export Action (Broadcast MP4 / 32-bit Transparent WebM 60 FPS)
  const handleExportSyncedVideo = useCallback(async (format: "mp4" | "webm" = "mp4") => {
    if (isExportingVideo) return;
    stopPlayback();
    setIsExportingVideo(true);
    setExportProgress(0);
    setExportStage("Initializing 60 FPS video exporter...");
    addLog(`Starting synced video export for "${activeAudioKey}" (${format.toUpperCase()} 60 FPS, mode: ${videoMode})...`, "info");

    try {
      if ((!timelineFrames || timelineFrames.size === 0) && activeAudioKey) {
        await triggerSample(activeAudioKey, activeAudioKey, false);
      }

      const stageCanvas = viewportStageRef.current?.getCanvas();
      const overlayCanvas =
        showBoundingBoxRef.current || showLandmarks
          ? viewportStageRef.current?.getOverlayCanvas()
          : null;
      const stageEngine = viewportStageRef.current?.getEngine();

      if (stageCanvas) {
        let lastExportBeatIdx = -1;
        await videoExporterRef.current.exportStageRecording({
          format,
          fps: 60,
          stageCanvas,
          overlayCanvas,
          stageEngine,
          audioKey: activeAudioKey,
          audioElement: audioRef.current,
          transparent: transparentMode && enableChroma,
          onProgress: (p, stage) => {
            setExportProgress(p);
            setExportStage(stage);
          },
          onLog: (msg, type) => addLog(msg, type),
          onStartPlayback: () => {
            manualClusterIdRef.current = null;
            setManualClusterId(null);
            currentFrameRef.current = 0;
            setCurrentFrame(0);
            stageEngine?.clearExplicitViseme();
            stageEngine?.setSpeaking(true);
          },
          onFrameTick: (elapsedSec) => {
            const curFrame = Math.floor(elapsedSec * 25.0);
            currentFrameRef.current = curFrame;
            if (
              activePresetRef.current.type === "video" &&
              videoModeRef.current === "auto_fsm" &&
              fsmSequence.length > 0
            ) {
              let activeNodeIdx = fsmSequence.findIndex(
                (node) => elapsedSec >= node.startTimeSec && elapsedSec < node.endTimeSec
              );
              if (activeNodeIdx === -1) activeNodeIdx = fsmSequence.length - 1;
              if (activeNodeIdx >= 0 && activeNodeIdx !== lastExportBeatIdx) {
                lastExportBeatIdx = activeNodeIdx;
                const activeNode = fsmSequence[activeNodeIdx];
                setActiveFsmBeatIndex(activeNodeIdx);
                if (activeNode?.videoPath) {
                  stageEngine?.setMediaSource(activeNode.videoPath);
                }
              }
            }
          },
          onStopPlayback: () => {
            stopPlayback();
          },
        });
      } else {
        let activeLandmarks = avatarLandmarksRef.current;
        if (videoMode === "continuous" && continuousLandmarksRef.current.length > 0) {
          activeLandmarks = continuousLandmarksRef.current;
        }

        await videoExporterRef.current.export({
          activeAudioKey,
          codebookType,
          totalFrames,
          fps,
          videoElement: videoRef.current,
          decodedFrames: decodedFramesRef.current,
          presenceWeights: presenceWeightsRef.current,
          landmarks: activeLandmarks,
          landmarksMap: fsmLandmarksMapRef.current,
          fsmSequence,
          videoMode,
          neutralPatch: neutralPatchRef.current,
          mouthCompositor: mouthCompositor.current,
          compositorOptions: {
            offsetX,
            offsetY,
            scale,
            jawDescentFactor,
            showBoundingBoxes: false,
            canonicalAnchor: codebookService.current.canonicalAnchor,
            isFullFace: codebookService.current.isFullFace,
          },
          onProgress: (p, stage) => {
            setExportProgress(p);
            setExportStage(stage);
          },
          onLog: (msg, type) => addLog(msg, type),
        });
      }
    } catch (err) {
      if ((err as Error).message.includes("cancelled")) {
        addLog("Video export cancelled.", "warn");
      } else {
        addLog(`Video export failed: ${(err as Error).message}`, "error");
      }
    } finally {
      setIsExportingVideo(false);
      setExportProgress(0);
      setExportStage("");
    }
  }, [
    activeAudioKey,
    addLog,
    codebookType,
    enableChroma,
    fps,
    fsmSequence,
    isExportingVideo,
    jawDescentFactor,
    offsetX,
    offsetY,
    scale,
    showLandmarks,
    stopPlayback,
    timelineFrames,
    totalFrames,
    transparentMode,
    triggerSample,
    videoMode,
  ]);

  const handleCancelExport = useCallback(() => {
    videoExporterRef.current.cancel();
    setIsExportingVideo(false);
  }, []);

  // Memoized chroma detection handler with epsilon stabilization to avoid infinite render thrashing
  const handleChromaDetected = useCallback((res: ChromaDetectionResult) => {
    setChromaKeyColor((prev) => {
      const dr = Math.abs(prev[0] - res.color[0]);
      const dg = Math.abs(prev[1] - res.color[1]);
      const db = Math.abs(prev[2] - res.color[2]);
      if (dr < 0.015 && dg < 0.015 && db < 0.015) {
        return prev;
      }
      return [res.color[0], res.color[1], res.color[2]];
    });
    setChromaMode((prev) => (prev === res.chromaMode ? prev : res.chromaMode));
  }, []);

  const personaId = resolvePresetPersonaId(activePreset);
  const explicitViseme = useMemo(() => {
    // 1. Manual viseme selection from the gallery panel takes top priority
    if (manualClusterId !== null) {
      const entry = visemes.find((v) => v.clusterId === manualClusterId);
      const ap = entry ? entry.aperture : 0;
      const rawJawDrop = manualClusterId === 0 ? 0.0 : Math.min(10.0, (Math.max(0.0, ap) / 22.0) * 10.0);
      return {
        clusterA: manualClusterId,
        clusterB: manualClusterId,
        blendFactor: 0.0,
        presenceWeight: jawDescentFactor <= 0.01 ? 0.0 : 1.0,
        jawDrop: rawJawDrop,
      };
    }

    // When timelineFrames is active, the engine directly drives playback & scrubbing from the timeline!
    if (timelineFrames && timelineFrames.size > 0) {
      return null;
    }

    // 2. Scrubbed / paused frame fallback from decodedFrames
    const currentDecoded = decodedFramesRef.current.get(currentFrame);
    if (!currentDecoded) return null;
    const isSuppressed = jawDescentFactor <= 0.01;
    return {
      clusterA: currentDecoded.clusterId,
      clusterB: currentDecoded.clusterId,
      blendFactor: 0.0,
      presenceWeight: isSuppressed ? 0.0 : presenceWeight,
      jawDrop: currentDecoded.jawDrop ?? 0,
    };
  }, [manualClusterId, timelineFrames, visemes, currentFrame, presenceWeight, jawDescentFactor]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1800px] lg:h-full mx-auto p-4 md:px-6 md:py-4 text-white">
      {/* Studio Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start lg:h-full lg:min-h-0">
        {/* Left Column: Fixed Viewport & Canvas Stage */}
        <div className={`${viewMode === "side-by-side" ? "lg:col-span-8 xl:col-span-8" : "lg:col-span-6 xl:col-span-6"} flex flex-col gap-4 lg:h-full lg:min-h-0 lg:overflow-y-auto custom-scrollbar`}>
          <StudioViewport
            videoRef={videoRef}
            canvasRef={canvasRef}
            webglCanvasRef={webglCanvasRef}
            isWebGL={isWebGLReady}
            isPlaying={isPlaying}
            fps={fps}
            currentFrame={currentFrame}
            totalFrames={totalFrames}
            presenceWeight={presenceWeight}
            activeClusterId={activeClusterId}
            activeAperture={activeAperture}
            engineName={engineName}
            isLooping={isLooping}
            onPlayPause={() => (isPlaying ? stopPlayback() : startPlayback(false))}
            onSeek={handleSeek}
            onReplay={() => startPlayback(true)}
            onToggleLoop={() => setIsLooping((prev) => !prev)}
            isExportingVideo={isExportingVideo}
            exportProgress={exportProgress}
            exportStage={exportStage}
            onExportVideo={handleExportSyncedVideo}
            onCancelExport={handleCancelExport}
            fsmLabel={
              activePreset.type === "video" && videoMode === "auto_fsm" && fsmSequence[activeFsmBeatIndex]
                ? fsmSequence[activeFsmBeatIndex].actionStateLabel
                : null
            }
            plateType={activePreset.type}
            plateSrc={effectivePlateSrc}
            codebookUrl={activeCodebookUrl}
            inMemoryCodebook={codebookType === "none" ? null : activeInMemoryCodebook}
            landmarksUrl={effectiveLandmarksUrl}
            plateName={activePreset.name}
            plateAspectClass={activePreset.aspectClass}
            plateDimensions={{ width: activePreset.width, height: activePreset.height }}
            viewMode={viewMode}
            onChangeViewMode={setViewMode}
            sliderPos={sliderPos}
            onChangeSliderPos={setSliderPos}
            autoKinematics={autoKinematics}
            idlePreset={idlePreset}
            dominantBrow={dominantBrow}
            sharedDriver={sharedDriverRef.current}
            personaId={personaId}
            syncAudioElement={syncAudio || audioRef.current}
            explicitViseme={explicitViseme}
            onFpsUpdate={setFps}
            enableChroma={enableChroma}
            transparentMode={transparentMode}
            chromaKeyColor={chromaKeyColor}
            chromaSimilarity={chromaSimilarity}
            chromaSmoothness={chromaSmoothness}
            despillStrength={despillStrength}
            autoDetectChroma={autoDetectChroma}
            selectedStudioBgId={selectedStudioBgId}
            onChromaDetected={handleChromaDetected}
            activeCamera={activeCamera}
            cameraTransitionMode={cameraTransitionMode}
            autoDirector={autoDirector}
            onCameraSwitch={setActiveCamera}
            offsetX={offsetX}
            offsetY={offsetY}
            scale={scale}
            jawDescentFactor={jawDescentFactor}
            smoothFactor={smoothFactor}
            headYaw={puppeteerYaw}
            headPitch={puppeteerPitch}
            headRoll={puppeteerRoll}
            bodyRoll={puppeteerBodyRoll}
            pelvisRoll={puppeteerPelvisRoll}
            respirationScale={respirationScale}
            headLeanZ={puppeteerLeanZ}
            headShiftX={puppeteerShiftX}
            headShiftY={puppeteerShiftY}
            blinkLeft={puppeteerBlinkLeft}
            blinkRight={puppeteerBlinkRight}
            eyeWidening={puppeteerWidening}
            gazeX={puppeteerGazeX}
            gazeY={puppeteerGazeY}
            eyebrowRaise={puppeteerBrowRaise}
            eyebrowFurrow={puppeteerBrowFurrow}
            eyebrowAsymmetry={puppeteerBrowAsymmetry}
            smileAmount={puppeteerSmile}
            sentimentMode={sentimentMode}
            sentimentIntensity={sentimentIntensity}
            onSentimentTelemetry={handleThrottledSentimentTelemetry}
            disableVideoBlinking={disableVideoBlinking}
            enableCorneaLighting={enableCorneaLighting}
            visemeCodebookMode={
              codebookType === "ditto_fullface"
                ? "full_chin"
                : codebookType === "musetalk"
                  ? "musetalk"
                  : "mouth_only"
            }
            targetLandmark={
              resolvePlateLandmark(
                activePreset,
                activePreset.type !== "video" ? codebookService.current.plateLandmark : null
              ) ?? undefined
            }
            timelineFrames={timelineFrames}
            timelineFrame={currentFrame}
            stageRef={viewportStageRef}
            biophysicsOptions={biophysicsOptions}
            orbitalYaw={orbitalYaw}
            onMouthLandmark={handleMouthLandmark}
            showLandmarks={showLandmarks}
            onToggleLandmarks={() => setShowLandmarks((prev) => !prev)}
            showBoundingBox={showBoundingBox}
            calibration={activeCalibration}
            onCalibrationChange={setActiveCalibration}
          />

          {/* Interactive Auto FSM Broadcast Sequence Timeline Strip */}
          {activePreset.type === "video" && videoMode === "auto_fsm" && fsmSequence.length > 0 && (
            <FsmTimelineStrip
              sequence={fsmSequence}
              activeBeatIndex={activeFsmBeatIndex}
              currentTimeSec={currentFrame / 25.0}
              totalDurationSec={totalFrames / 25.0}
              onSeekBeat={handleSeekBeat}
              isPlaying={isPlaying}
            />
          )}
        </div>

        {/* Right Column: Independently Scrollable Controls, Gallery, and Telemetry */}
        <div className={`${viewMode === "side-by-side" ? "lg:col-span-4 xl:col-span-4" : "lg:col-span-6 xl:col-span-6"} flex flex-col gap-4 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:pr-2 lg:pb-12 custom-scrollbar`}>
          {/* Progressive Dual-Tier Custom Portrait -> 256-Viseme Studio Baker */}
          <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/35 via-slate-950/80 to-violet-950/30 p-3 space-y-2 shadow-lg">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-mono font-bold text-cyan-200 truncate">
                    Custom Portrait → 256-Viseme Baker
                  </div>
                  <div className="text-[10px] font-mono text-zinc-400 truncate">
                    &lt;150ms preview • ~2s 256 CIE Lab + 4ch Scharr normals
                  </div>
                </div>
              </div>
              <input
                ref={customUploadInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleCustomPortraitUpload}
              />
              <button
                type="button"
                onClick={() => customUploadInputRef.current?.click()}
                disabled={customBakeStatus.tier === "baking_tier1a"}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-50 shrink-0"
              >
                {customBakeStatus.tier === "baking_tier1a" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-300" />
                ) : (
                  <Upload className="w-3.5 h-3.5 text-cyan-300" />
                )}
                <span>Upload Photo</span>
              </button>
            </div>

            {customBakeStatus.tier !== "idle" && (
              <div className="space-y-1.5 pt-1 border-t border-white/10">
                <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                  <span className="text-cyan-100/90 flex items-center gap-1.5 min-w-0">
                    {(customBakeStatus.tier === "baking_tier1a" ||
                      customBakeStatus.tier === "baking_tier1b" ||
                      customBakeStatus.tier === "baking_tier2") ? (
                      <Loader2 className="w-3 h-3 animate-spin text-cyan-400 shrink-0" />
                    ) : (
                      <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                    )}
                    <span className="truncate">{customBakeStatus.message}</span>
                  </span>
                  {(customBakeStatus.tier === "baking_tier1a" ||
                    customBakeStatus.tier === "baking_tier1b" ||
                    customBakeStatus.tier === "baking_tier2") && (
                    <span className="text-cyan-400 font-bold shrink-0">
                      {Math.round(customBakeStatus.progress * 100)}%
                    </span>
                  )}
                  {neuralBackendOnline &&
                    activePreset.id.startsWith("custom_") &&
                    customBakeStatus.tier !== "baking_tier2" &&
                    customBakeStatus.tier !== "tier2_ready" && (
                      <button
                        type="button"
                        onClick={handleUpgradeCustomNeural}
                        className="px-2 py-0.5 rounded bg-violet-600/30 hover:bg-violet-600/50 border border-violet-400/50 text-violet-200 font-bold cursor-pointer shrink-0 transition-colors"
                        title="Upgrade to GPU Neural 256-Viseme Codebook"
                      >
                        ✨ Upgrade HD Neural
                      </button>
                    )}
                </div>
                {(customBakeStatus.tier === "baking_tier1a" ||
                  customBakeStatus.tier === "baking_tier1b" ||
                  customBakeStatus.tier === "baking_tier2") && (
                  <div className="w-full h-1.5 rounded-full bg-black/60 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-400 transition-all duration-150"
                      style={{
                        width: `${Math.max(4, Math.min(100, Math.round(customBakeStatus.progress * 100)))}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <StudioControls
            activePlateId={activePlateId}
            onChangePlate={handleSelectPlate}
            platePresets={allPlatePresets}
            showLandmarks={showLandmarks}
            onToggleLandmarks={() => setShowLandmarks((prev) => !prev)}
            orbitalYaw={orbitalYaw}
            onChangeOrbitalYaw={handleOrbitalYawChange}
            respirationScale={respirationScale}
            onChangeRespirationScale={setRespirationScale}
            puppeteeringTab={puppeteeringTab}
            onChangePuppeteeringTab={setPuppeteeringTab}
            puppeteerPitch={puppeteerPitch}
            onChangePuppeteerPitch={setPuppeteerPitch}
            puppeteerYaw={puppeteerYaw}
            onChangePuppeteerYaw={setPuppeteerYaw}
            puppeteerRoll={puppeteerRoll}
            onChangePuppeteerRoll={setPuppeteerRoll}
            puppeteerBodyRoll={puppeteerBodyRoll}
            onChangePuppeteerBodyRoll={setPuppeteerBodyRoll}
            puppeteerPelvisRoll={puppeteerPelvisRoll}
            onChangePuppeteerPelvisRoll={setPuppeteerPelvisRoll}
            kinematicCoupling={kinematicCoupling}
            onToggleKinematicCoupling={() => setKinematicCoupling((prev) => !prev)}
            puppeteerLeanZ={puppeteerLeanZ}
            onChangePuppeteerLeanZ={setPuppeteerLeanZ}
            puppeteerShiftX={puppeteerShiftX}
            onChangePuppeteerShiftX={setPuppeteerShiftX}
            puppeteerShiftY={puppeteerShiftY}
            onChangePuppeteerShiftY={setPuppeteerShiftY}
            puppeteerGazeX={puppeteerGazeX}
            onChangePuppeteerGazeX={setPuppeteerGazeX}
            puppeteerGazeY={puppeteerGazeY}
            onChangePuppeteerGazeY={setPuppeteerGazeY}
            puppeteerWidening={puppeteerWidening}
            onChangePuppeteerWidening={setPuppeteerWidening}
            puppeteerBlinkLeft={puppeteerBlinkLeft}
            onChangePuppeteerBlinkLeft={setPuppeteerBlinkLeft}
            puppeteerBlinkRight={puppeteerBlinkRight}
            onChangePuppeteerBlinkRight={setPuppeteerBlinkRight}
            enableCorneaLighting={enableCorneaLighting}
            onToggleCorneaLighting={() => setEnableCorneaLighting((prev) => !prev)}
            disableVideoBlinking={disableVideoBlinking}
            onToggleDisableVideoBlinking={() => setDisableVideoBlinking((prev) => !prev)}
            puppeteerBrowRaise={puppeteerBrowRaise}
            onChangePuppeteerBrowRaise={setPuppeteerBrowRaise}
            puppeteerBrowFurrow={puppeteerBrowFurrow}
            onChangePuppeteerBrowFurrow={setPuppeteerBrowFurrow}
            puppeteerBrowAsymmetry={puppeteerBrowAsymmetry}
            onChangePuppeteerBrowAsymmetry={setPuppeteerBrowAsymmetry}
            puppeteerSmile={puppeteerSmile}
            onChangePuppeteerSmile={setPuppeteerSmile}
            sentimentMode={sentimentMode}
            onChangeSentimentMode={setSentimentMode}
            sentimentIntensity={sentimentIntensity}
            onChangeSentimentIntensity={setSentimentIntensity}
            sentimentTelem={sentimentTelem}
            conversationalTurnMode={conversationalTurnMode}
            onChangeConversationalTurnMode={handleChangeConversationalTurnMode}
            facsOverrides={facsOverrides}
            onChangeFacsOverride={handleChangeFacsOverride}
            onClearFacsOverrides={handleClearFacsOverrides}
            autoKinematics={autoKinematics}
            onToggleAutoKinematics={() => setAutoKinematics((prev) => !prev)}
            idlePreset={idlePreset}
            onChangeIdlePreset={handleChangeIdlePreset}
            dominantBrow={dominantBrow}
            onChangeDominantBrow={setDominantBrow}
            enableChroma={enableChroma}
            onToggleChroma={() => setEnableChroma((prev) => !prev)}
            transparentMode={transparentMode}
            onToggleTransparentMode={() => setTransparentMode((prev) => !prev)}
            chromaMode={chromaMode}
            onChangeChromaMode={(m) => {
              setChromaMode(m);
              if (m === 1) setChromaKeyColor([0.0, 1.0, 0.0]);
              else if (m === 2) setChromaKeyColor([0.0, 0.0, 1.0]);
              else setChromaKeyColor([0x69 / 255, 0x6a / 255, 0x6e / 255]);
            }}
            autoDetectChroma={autoDetectChroma}
            onToggleAutoDetectChroma={() => setAutoDetectChroma((prev) => !prev)}
            chromaSimilarity={chromaSimilarity}
            onChangeChromaSimilarity={setChromaSimilarity}
            chromaSmoothness={chromaSmoothness}
            onChangeChromaSmoothness={setChromaSmoothness}
            despillStrength={despillStrength}
            onChangeDespillStrength={setDespillStrength}
            selectedStudioBgId={selectedStudioBgId}
            onChangeStudioBgId={setSelectedStudioBgId}
            activeCamera={activeCamera}
            onChangeActiveCamera={setActiveCamera}
            cameraTransitionMode={cameraTransitionMode}
            onChangeCameraTransitionMode={setCameraTransitionMode}
            autoDirector={autoDirector}
            onToggleAutoDirector={() => setAutoDirector((prev) => !prev)}
            videoMode={videoMode}
            onChangeVideoMode={handleChangeVideoMode}
            isWebGLReady={isWebGLReady}
            fsmBeatCount={fsmSequence.length}
            codebookType={codebookType}
            onChangeCodebook={handleChangeCodebook}
            onTriggerSample={triggerSample}
            activeAudioKey={activeAudioKey}
            isGenerating={isGenerating}
            jawDescentFactor={jawDescentFactor}
            onChangeJawDescent={(val) => {
              setJawDescentFactor(val);
              jawDescentFactorRef.current = val;
              viewportStageRef.current?.getEngine()?.setGeometricTuning({ jawDescentFactor: val });
              if (!isPlayingRef.current) redrawCurrentFrame();
            }}
            smoothFactor={smoothFactor}
            onChangeSmoothFactor={(val) => {
              setSmoothFactor(val);
              viewportStageRef.current?.getEngine()?.setGeometricTuning({ smoothFactor: val });
              if (!isPlayingRef.current) redrawCurrentFrame();
            }}
            offsetX={offsetX}
            offsetY={offsetY}
            onChangeOffsetX={(val) => {
              setOffsetX(val);
              offsetXRef.current = val;
              viewportStageRef.current?.getEngine()?.setGeometricTuning({ offsetX: val });
              if (!isPlayingRef.current) redrawCurrentFrame();
            }}
            onChangeOffsetY={(val) => {
              setOffsetY(val);
              offsetYRef.current = val;
              viewportStageRef.current?.getEngine()?.setGeometricTuning({ offsetY: val });
              if (!isPlayingRef.current) redrawCurrentFrame();
            }}
            scale={scale}
            onChangeScale={(val) => {
              setScale(val);
              scaleRef.current = val;
              viewportStageRef.current?.getEngine()?.setGeometricTuning({ scale: val });
              if (!isPlayingRef.current) redrawCurrentFrame();
            }}
            showBoundingBox={showBoundingBox}
            onToggleBoundingBox={() => {
              setShowBoundingBox((prev) => {
                const next = !prev;
                showBoundingBoxRef.current = next;
                viewportStageRef.current?.getEngine()?.setGeometricTuning({ showBoundingBox: next });
                if (!isPlayingRef.current) {
                  redrawCurrentFrame();
                }
                return next;
              });
            }}
            rimIntensity={rimIntensity}
            onChangeRimIntensity={(val) => {
              setRimIntensity(val);
              rimIntensityRef.current = val;
              if (!isPlayingRef.current) redrawCurrentFrame();
            }}
            lipMoisture={lipMoisture}
            onChangeLipMoisture={(val) => {
              setLipMoisture(val);
              lipMoistureRef.current = val;
              if (!isPlayingRef.current) redrawCurrentFrame();
            }}
            enamelFresnel={enamelFresnel}
            onChangeEnamelFresnel={(val) => {
              setEnamelFresnel(val);
              enamelFresnelRef.current = val;
              if (!isPlayingRef.current) redrawCurrentFrame();
            }}
            psnrDb={psnrDb}
            visemeCount={visemes.length}
            isWebGPUReady={isWebGPUReady}
            isWebGPUInitializing={isWebGPUInitializing}
            webGPUProgress={webGPUProgress}
            webGPUStage={webGPUStage}
            onInitWebGPU={handleInitWebGPU}
            onClearDiskCache={handleClearDiskCache}
            precision={precision}
            onChangePrecision={setPrecision}
            stride={stride}
            onChangeStride={setStride}
            batchSize={batchSize}
            onChangeBatchSize={setBatchSize}
            onPrecalcCodebook={handlePrecalcCodebook}
            onExportCodebook={handleExportCodebook}
            isExportingVideo={isExportingVideo}
            exportProgress={exportProgress}
            exportStage={exportStage}
            onExportVideo={handleExportSyncedVideo}
            onCancelExport={handleCancelExport}
            biophysicsOptions={biophysicsOptions}
            onChangeBiophysics={handleChangeBiophysics}
          />

          <StudioCodebookGallery
            visemes={visemes}
            activeClusterId={activeClusterId}
            onSelectViseme={(cid) => {
              const entry = visemes.find((v) => v.clusterId === cid);
              setManualClusterId(cid);
              manualClusterIdRef.current = cid;
              setActiveClusterId(cid);
              if (entry) {
                setActiveAperture(entry.aperture);
              }
              renderSingleFrameRef.current(currentFrameRef.current, 0);
            }}
          />

          <StudioTelemetryLog
            logs={logs}
            onClearLogs={() => setLogs([])}
            cacheHits={cacheHits}
            totalKeyframes={totalKeyframes}
            fuzzyHits={fuzzyHits}
            latencyMs={latencyMs}
          />
        </div>
      </div>
    </div>
  );
};

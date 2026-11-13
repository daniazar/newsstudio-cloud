"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Repeat,
  Sparkles,
  Download,
  Sliders,
  Columns,
  Maximize2,
  SplitSquareVertical,
  ChevronDown,
  Target,
  Copy,
  Check,
} from "lucide-react";

import {
  WebglNeuralVisemeStage,
  WebglNeuralVisemeStageHandle,
  BiophysicsOptions,
  SentimentMode,
  AcousticSentimentTelemetry,
  LandmarkCalibration,
  NEUTRAL_RAW_CALIBRATION,
} from "@/components/conversational/WebglNeuralVisemeStage";
import { IdlePresetType, ProceduralLivePortraitDriver } from "@/lib/realtime/proceduralLivePortraitDriver";
import { ChromaDetectionResult, CameraId, CameraTransitionMode, VisemeTimelineFrame } from "@/lib/realtime/liveAnchorStageEngine";
import { type InMemoryVisemeCodebook } from "@/lib/realtime/browserVisemeCodebookGenerator";
import { LandmarkTarget } from "@/lib/realtime/affineMouthCompositor";

const CHECKERBOARD_STYLE: React.CSSProperties = {
  backgroundImage: `
    linear-gradient(45deg, #32353e 25%, transparent 25%),
    linear-gradient(-45deg, #32353e 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #32353e 75%),
    linear-gradient(-45deg, transparent 75%, #32353e 75%)
  `,
  backgroundSize: "24px 24px",
  backgroundPosition: "0 0, 0 12px, 12px -12px, -12px 0px",
  backgroundColor: "#1b1c22",
};

export interface StudioViewportProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  webglCanvasRef?: React.RefObject<HTMLCanvasElement | null>;
  stageRef?: React.MutableRefObject<WebglNeuralVisemeStageHandle | null> | React.RefObject<WebglNeuralVisemeStageHandle | null>;
  isPlaying: boolean;
  fps: number;
  currentFrame: number;
  totalFrames: number;
  presenceWeight: number;
  activeClusterId: number | null;
  activeAperture: number | null;
  engineName: string;
  isLooping: boolean;
  onPlayPause: () => void;
  onSeek: (frame: number) => void;
  onReplay: () => void;
  onToggleLoop: () => void;
  isExportingVideo?: boolean;
  exportProgress?: number;
  exportStage?: string;
  onExportVideo?: (format?: "mp4" | "webm") => void;
  onCancelExport?: () => void;
  fsmLabel?: string | null;
  isWebGL?: boolean;
  biophysicsOptions?: Partial<BiophysicsOptions>;

  // Plate & View Mode Props
  plateType?: "image" | "video";
  plateSrc?: string;
  plateName?: string;
  plateAspectClass?: string;
  plateDimensions?: { width: number; height: number };
  viewMode?: "single" | "wipe" | "side-by-side";
  onChangeViewMode?: (mode: "single" | "wipe" | "side-by-side") => void;
  sliderPos?: number;
  onChangeSliderPos?: (pos: number) => void;

  // Auto Kinematics (LivePortrait 3DMM) Props
  autoKinematics?: boolean;
  idlePreset?: IdlePresetType | string;
  dominantBrow?: "left" | "right" | "none";
  sharedDriver?: ProceduralLivePortraitDriver;
  personaId?: string;
  syncAudioElement?: HTMLAudioElement | null;
  explicitViseme?: {
    clusterA: number;
    clusterB: number;
    blendFactor: number;
    presenceWeight: number;
    jawDrop?: number;
  } | null;
  onFpsUpdate?: (fps: number) => void;

  // Chroma Key & Alpha Transparency Props
  enableChroma?: boolean;
  transparentMode?: boolean;
  chromaKeyColor?: [number, number, number];
  chromaSimilarity?: number;
  chromaSmoothness?: number;
  despillStrength?: number;
  autoDetectChroma?: boolean;
  selectedStudioBgId?: string;
  onChromaDetected?: (result: ChromaDetectionResult) => void;

  // Codebook & Camera Director Props
  codebookUrl?: string;
  inMemoryCodebook?: InMemoryVisemeCodebook | null;
  landmarksUrl?: string;
  activeCamera?: CameraId;
  cameraTransitionMode?: CameraTransitionMode;
  autoDirector?: boolean;
  onCameraSwitch?: (cam: CameraId) => void;

  // Geometric & Biomechanical Tuning Props
  offsetX?: number;
  offsetY?: number;
  scale?: number;
  jawDescentFactor?: number;
  smoothFactor?: number;
  showBoundingBox?: boolean;
  showLandmarks?: boolean;
  onToggleLandmarks?: () => void;
  headYaw?: number;
  headPitch?: number;
  headRoll?: number;
  bodyRoll?: number;
  pelvisRoll?: number;
  respirationScale?: number;
  headLeanZ?: number;
  headShiftX?: number;
  headShiftY?: number;
  blinkLeft?: number;
  blinkRight?: number;
  eyeWidening?: number;
  gazeX?: number;
  gazeY?: number;
  eyebrowRaise?: number;
  eyebrowFurrow?: number;
  eyebrowAsymmetry?: number;
  smileAmount?: number;
  sentimentMode?: SentimentMode;
  sentimentIntensity?: number;
  onSentimentTelemetry?: (telemetry: AcousticSentimentTelemetry) => void;
  disableVideoBlinking?: boolean;
  enableCorneaLighting?: boolean;
  targetLandmark?: LandmarkTarget;
  timelineFrames?: Map<number, VisemeTimelineFrame> | null;
  timelineFrame?: number;
  orbitalYaw?: number;
  onMouthLandmark?: (landmark: LandmarkTarget) => void;
  calibration?: LandmarkCalibration;
  onCalibrationChange?: (calib: LandmarkCalibration) => void;
  showCalibrationPanel?: boolean;
  enableCalibrationPanel?: boolean;
  visemeCodebookMode?: "mouth_only" | "full_chin" | "musetalk";
}

export const DEFAULT_SHOW_CALIBRATION_PANEL = false;

export const StudioViewport: React.FC<StudioViewportProps> = ({
  videoRef,
  canvasRef,
  webglCanvasRef,
  isPlaying,
  fps,
  currentFrame,
  totalFrames,
  presenceWeight,
  activeClusterId,
  activeAperture,
  engineName,
  isLooping,
  onPlayPause,
  onSeek,
  onReplay,
  onToggleLoop,
  isExportingVideo = false,
  exportProgress = 0,
  exportStage = "",
  onExportVideo,
  onCancelExport,
  fsmLabel = null,
  isWebGL = true,

  plateType = "video",
  plateSrc = "",
  plateName = "Broadcast Plate",
  plateAspectClass = "aspect-video",
  plateDimensions = { width: 1920, height: 1080 },
  viewMode = "single",
  onChangeViewMode = () => {},
  sliderPos = 50,
  onChangeSliderPos = () => {},

  autoKinematics = false,
  idlePreset = "dynamic_flow",
  dominantBrow = "right",
  sharedDriver,
  personaId = "ruby",
  syncAudioElement,
  explicitViseme,
  onFpsUpdate,

  enableChroma = false,
  transparentMode = false,
  chromaKeyColor,
  chromaSimilarity,
  chromaSmoothness,
  despillStrength,
  autoDetectChroma = true,
  selectedStudioBgId,
  onChromaDetected,

  codebookUrl,
  inMemoryCodebook = null,
  landmarksUrl,
  activeCamera = "CAM1_ANCHOR_CLOSE",
  cameraTransitionMode = "dolly",
  autoDirector = false,
  onCameraSwitch,

  offsetX = 0,
  offsetY = 0,
  scale = 1.0,
  jawDescentFactor = 1.0,
  smoothFactor = 0.35,
  showBoundingBox = false,
  showLandmarks = false,
  onToggleLandmarks,
  headYaw = 0,
  headPitch = 0,
  headRoll = 0,
  bodyRoll = 0,
  pelvisRoll = 0,
  respirationScale = 1.0,
  headLeanZ = 0,
  headShiftX = 0,
  headShiftY = 0,
  blinkLeft = 0,
  blinkRight = 0,
  eyeWidening = 1.0,
  gazeX = 0,
  gazeY = 0,
  eyebrowRaise = 0,
  eyebrowFurrow = 0,
  eyebrowAsymmetry = 0,
  smileAmount = 0,
  sentimentMode,
  sentimentIntensity,
  onSentimentTelemetry,
  disableVideoBlinking,
  enableCorneaLighting = true,
  targetLandmark,
  timelineFrames,
  timelineFrame,
  biophysicsOptions,
  stageRef,
  orbitalYaw = 0,
  onMouthLandmark,
  calibration,
  onCalibrationChange,
  showCalibrationPanel = DEFAULT_SHOW_CALIBRATION_PANEL,
  enableCalibrationPanel = DEFAULT_SHOW_CALIBRATION_PANEL,
  visemeCodebookMode = "full_chin",
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const isCalibrationPanelEnabled = Boolean(showCalibrationPanel || enableCalibrationPanel);
  const [showCalibDrawer, setShowCalibDrawer] = useState(false);
  const [copiedCalib, setCopiedCalib] = useState(false);
  const [internalCalib, setInternalCalib] = useState<LandmarkCalibration>(() => ({
    ...NEUTRAL_RAW_CALIBRATION,
  }));

  const activeCalib = isCalibrationPanelEnabled
    ? calibration || internalCalib
    : NEUTRAL_RAW_CALIBRATION;
  const updateCalib = useCallback(
    (partial: Partial<LandmarkCalibration>) => {
      if (!isCalibrationPanelEnabled) return;
      const next = { ...activeCalib, ...partial };
      setInternalCalib(next);
      onCalibrationChange?.(next);
    },
    [activeCalib, isCalibrationPanelEnabled, onCalibrationChange]
  );

  const copyCalibration = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(activeCalib, null, 2));
      setCopiedCalib(true);
      setTimeout(() => setCopiedCalib(false), 2000);
    }
  }, [activeCalib]);

  // Mouse & Touch Drag Handlers for Wipe Split Line
  const updateSplitFromClientX = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      onChangeSliderPos(Math.round(pct));
    },
    [onChangeSliderPos]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      updateSplitFromClientX(e.clientX);
    },
    [isDragging, updateSplitFromClientX]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging || e.touches.length === 0) return;
      updateSplitFromClientX(e.touches[0].clientX);
    },
    [isDragging, updateSplitFromClientX]
  );

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    window.addEventListener("touchend", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("touchend", handleGlobalMouseUp);
    };
  }, []);

  // Synchronize video element source safely when plateSrc changes, preventing React DOM attribute thrashing
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !plateSrc || plateType !== "video") return;
    const targetFile = plateSrc.split("/").pop() || "";
    if (targetFile && !video.src.includes(targetFile)) {
      video.src = plateSrc;
      video.load();
    }
  }, [plateSrc, plateType, videoRef]);

  return (
    <div className="relative flex flex-col items-center justify-center bg-black/90 rounded-2xl border border-neutral-800 overflow-hidden shadow-2xl h-full min-h-[520px]">
      {/* View Mode Switcher Header Toolbar */}
      <div className="w-full flex items-center justify-between px-3 md:px-4 py-2 bg-neutral-900/90 border-b border-neutral-800 text-xs font-mono select-none gap-2">
        <div className="flex items-center gap-1.5 md:gap-2 min-w-0 shrink">
          <span className="text-[11px] text-neutral-400 font-semibold tracking-wide flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="hidden sm:inline">STAGE</span>
            <span>VIEWPORT</span>
          </span>
          <span className="text-neutral-600 shrink-0">•</span>
          <span className="text-neutral-300 font-medium truncate max-w-[120px] sm:max-w-[160px] md:max-w-[200px]">
            {plateName}
          </span>
          <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] bg-neutral-800 text-neutral-400 border border-neutral-700 shrink-0">
            {plateDimensions.width}×{plateDimensions.height}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* View Mode Buttons */}
          <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded-lg border border-neutral-800 shrink-0">
            <button
              type="button"
              onClick={() => onChangeViewMode("single")}
              className={`flex items-center gap-1 px-2 md:px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                viewMode === "single"
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
              }`}
              title="Single stage view (Full composite)"
            >
              <Maximize2 className="w-3 h-3 shrink-0" />
              <span>Single</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeViewMode("wipe")}
              className={`flex items-center gap-1 px-2 md:px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                viewMode === "wipe"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
              }`}
              title="Wipe Split Slider: compare 3DMM speech composite vs original resting face"
            >
              <SplitSquareVertical className="w-3 h-3 shrink-0" />
              <span>Wipe (Diff)</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeViewMode("side-by-side")}
              className={`flex items-center gap-1 px-2 md:px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                viewMode === "side-by-side"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
              }`}
              title="Side-by-Side: 3DMM Viseme Speech next to Original Resting Face"
            >
              <Columns className="w-3 h-3 shrink-0" />
              <span>Side-by-Side</span>
            </button>
          </div>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              disabled={isExportingVideo || totalFrames === 0}
              onClick={() => setShowExportMenu(!showExportMenu)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all border ${
                isExportingVideo
                  ? "bg-amber-950/70 border-amber-500/50 text-amber-300 animate-pulse cursor-wait"
                  : "bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white border-cyan-400/30 shadow-sm active:scale-95 cursor-pointer"
              }`}
              title="Hardware 60 FPS Video Export (MP4 / WebM Alpha)"
            >
              <Download className="w-3 h-3" />
              <span>{isExportingVideo ? `${exportProgress}%` : "Export"}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showExportMenu ? "rotate-180" : ""}`} />
            </button>

            {showExportMenu && !isExportingVideo && (
              <div className="absolute right-0 top-full mt-1.5 w-64 p-2 rounded-xl bg-neutral-950/95 backdrop-blur-xl border border-neutral-700 shadow-2xl z-50 space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-800 flex items-center justify-between">
                  <span>Hardware 60 FPS Export</span>
                  <span className="text-[9px] text-cyan-400 font-mono">Real-Time</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowExportMenu(false);
                    onExportVideo?.("mp4");
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-cyan-950/60 hover:text-cyan-200 border border-transparent hover:border-cyan-500/30 flex flex-col gap-0.5 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-white">
                    <span>📹 Broadcast MP4</span>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-1.5 py-0.2 rounded border border-cyan-500/30">60 FPS</span>
                  </div>
                  <div className="text-[10px] text-neutral-400 leading-tight">
                    High-bitrate H.264 video with synchronized audio.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowExportMenu(false);
                    onExportVideo?.("webm");
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-purple-950/60 hover:text-purple-200 border border-transparent hover:border-purple-500/30 flex flex-col gap-0.5 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-white">
                    <span>✨ Transparent WebM</span>
                    <span className="text-[10px] font-mono text-purple-400 bg-purple-950 px-1.5 py-0.2 rounded border border-purple-500/30">Alpha 60 FPS</span>
                  </div>
                  <div className="text-[10px] text-neutral-400 leading-tight">
                    32-bit VP9 with alpha transparency channel.
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Viewport Stage Area */}
      <div className="flex-1 w-full flex items-center justify-center p-3 overflow-hidden relative">
        {viewMode === "side-by-side" ? (
          /* SIDE-BY-SIDE MODE */
          <div className="flex flex-row items-center justify-center gap-4 w-full h-full max-h-[72vh] lg:max-h-[calc(100vh-16rem)]">
            {/* Left Panel: 3DMM Speech Composite */}
            <div className="flex flex-col items-center gap-1.5 h-full">
              <div className="flex items-center justify-between w-full px-1 text-[11px] font-mono text-cyan-300">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  3DMM Speech Composite
                </span>
                <span className="text-[10px] text-neutral-500">Live Visemes</span>
              </div>
              <div
                style={transparentMode && enableChroma ? CHECKERBOARD_STYLE : undefined}
                className={`relative ${plateAspectClass} h-full max-h-[68vh] lg:max-h-[calc(100vh-18rem)] w-auto rounded-xl overflow-hidden shadow-inner ${transparentMode && enableChroma ? "bg-transparent border-emerald-500/40" : "bg-neutral-950 border border-cyan-500/30"} flex items-center justify-center`}
              >
                <WebglNeuralVisemeStage
                  plateSrc={plateSrc}
                  plateType={plateType}
                  videoSrc={plateType === "video" ? plateSrc : undefined}
                  avatarSrc={plateType === "image" ? plateSrc : undefined}
                  personaId={personaId}
                  isSpeaking={isPlaying}
                  disableMouthChanges={false}
                  width={plateDimensions.width}
                  height={plateDimensions.height}
                  onMouthLandmark={onMouthLandmark}
                  wipeSplit={-1.0}
                  idlePreset={idlePreset}
                  dominantBrow={dominantBrow}
                  sharedDriver={sharedDriver}
                  syncAudioElement={syncAudioElement}
                  explicitViseme={explicitViseme}
                  onFpsUpdate={onFpsUpdate}
                  enableChroma={enableChroma}
                  transparentMode={transparentMode}
                  chromaKeyColor={chromaKeyColor}
                  chromaSimilarity={chromaSimilarity}
                  chromaSmoothness={chromaSmoothness}
                  despillStrength={despillStrength}
                  autoDetectChroma={autoDetectChroma}
                  selectedStudioBgId={selectedStudioBgId}
                  onChromaDetected={onChromaDetected}
                  codebookUrl={codebookUrl}
                  inMemoryCodebook={inMemoryCodebook}
                  landmarksUrl={landmarksUrl}
                  activeCamera={activeCamera}
                  cameraTransitionMode={cameraTransitionMode}
                  isAutoDirector={autoDirector}
                  onCameraSwitch={onCameraSwitch}
                  showTelemetryHud={false}
                  enableAutoMotion={autoKinematics}
                  offsetX={offsetX}
                  offsetY={offsetY}
                  scale={scale}
                  jawDescentFactor={jawDescentFactor}
                  smoothFactor={smoothFactor}
                  showBoundingBox={showBoundingBox}
                  showLandmarks={showLandmarks}
                  onToggleLandmarks={onToggleLandmarks}
                  headYaw={headYaw}
                  headPitch={headPitch}
                  headRoll={headRoll}
                  bodyRoll={bodyRoll}
                  pelvisRoll={pelvisRoll}
                  respirationScale={respirationScale}
                  headLeanZ={headLeanZ}
                  headShiftX={headShiftX}
                  headShiftY={headShiftY}
                  blinkLeft={blinkLeft}
                  blinkRight={blinkRight}
                  eyeWidening={eyeWidening}
                  gazeX={gazeX}
                  gazeY={gazeY}
                  eyebrowRaise={eyebrowRaise}
                  eyebrowFurrow={eyebrowFurrow}
                  eyebrowAsymmetry={eyebrowAsymmetry}
                  smileAmount={smileAmount}
                  sentimentMode={sentimentMode}
                  sentimentIntensity={sentimentIntensity}
                  onSentimentTelemetry={onSentimentTelemetry}
                  disableVideoBlinking={disableVideoBlinking ?? (plateType === "video")}
                  enableCorneaLighting={enableCorneaLighting}
                  targetLandmark={targetLandmark}
                  timelineFrames={timelineFrames}
                  timelineFrame={timelineFrame ?? currentFrame}
                  biophysicsOptions={biophysicsOptions}
                  stageRef={stageRef}
                  orbitalYaw={orbitalYaw}
                  calibration={activeCalib}
                  onCalibrationChange={updateCalib}
                  visemeCodebookMode={visemeCodebookMode}
                  className="w-full h-full object-cover"
                />
                {plateType === "video" && (
                  <video
                    ref={videoRef}
                    src={plateSrc ? `${plateSrc}${plateSrc.includes("?") ? "&" : "?"}vslot=dom` : undefined}
                    crossOrigin="anonymous"
                    playsInline
                    muted
                    loop
                    preload="auto"
                    className="hidden"
                  />
                )}

                <canvas
                  ref={webglCanvasRef}
                  width={plateDimensions.width}
                  height={plateDimensions.height}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none hidden"
                />

                <canvas
                  ref={canvasRef}
                  width={plateDimensions.width}
                  height={plateDimensions.height}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none block"
                />
              </div>
            </div>

            {/* Right Panel: Original Untouched Resting Face */}
            <div className="flex flex-col items-center gap-1.5 h-full">
              <div className="flex items-center justify-between w-full px-1 text-[11px] font-mono text-neutral-400">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  Original Plate (Resting Mouth)
                </span>
                <span className="text-[10px] text-purple-400">Reference Ground Truth</span>
              </div>
              <div
                style={transparentMode && enableChroma ? CHECKERBOARD_STYLE : undefined}
                className={`relative ${plateAspectClass} h-full max-h-[68vh] lg:max-h-[calc(100vh-18rem)] w-auto rounded-xl overflow-hidden shadow-inner ${transparentMode && enableChroma ? "bg-transparent border-emerald-500/40" : "bg-neutral-950 border border-neutral-800"} flex items-center justify-center`}
              >
                {plateType === "video" ? (
                  <video
                    src={plateSrc ? `${plateSrc}${plateSrc.includes("?") ? "&" : "?"}vslot=ref` : undefined}
                    crossOrigin="anonymous"
                    playsInline
                    muted
                    loop
                    preload="auto"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={plateSrc || undefined}
                    alt={`${plateName} Original`}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>
          </div>
        ) : (
          /* SINGLE & WIPE SLIDER MODES */
          <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
            style={transparentMode && enableChroma ? CHECKERBOARD_STYLE : undefined}
            className={`relative ${plateAspectClass} max-h-[75vh] lg:max-h-[calc(100vh-15.5rem)] w-auto max-w-full rounded-xl overflow-hidden shadow-inner ${transparentMode && enableChroma ? "bg-transparent" : "bg-neutral-950"} flex items-center justify-center select-none ${
              viewMode === "wipe" ? "cursor-ew-resize border border-emerald-500/40" : "border border-neutral-800"
            }`}
          >
            <WebglNeuralVisemeStage
              plateSrc={plateSrc}
              plateType={plateType}
              videoSrc={plateType === "video" ? plateSrc : undefined}
              avatarSrc={plateType === "image" ? plateSrc : undefined}
              personaId={personaId}
              isSpeaking={isPlaying}
              disableMouthChanges={false}
              width={plateDimensions.width}
              height={plateDimensions.height}
              onMouthLandmark={onMouthLandmark}
              disableVideoBlinking={disableVideoBlinking ?? (plateType === "video")}
              syncAudioElement={syncAudioElement}
              wipeSplit={viewMode === "wipe" ? sliderPos / 100 : -1.0}
              wipeInvert={0}
              visemeCodebookMode={visemeCodebookMode}
              idlePreset={idlePreset}
              dominantBrow={dominantBrow}
              sharedDriver={sharedDriver}
              explicitViseme={explicitViseme}
              onFpsUpdate={onFpsUpdate}
              enableChroma={enableChroma}
              transparentMode={transparentMode}
              chromaKeyColor={chromaKeyColor}
              chromaSimilarity={chromaSimilarity}
              chromaSmoothness={chromaSmoothness}
              despillStrength={despillStrength}
              autoDetectChroma={autoDetectChroma}
              selectedStudioBgId={selectedStudioBgId}
              onChromaDetected={onChromaDetected}
              codebookUrl={codebookUrl}
              inMemoryCodebook={inMemoryCodebook}
              landmarksUrl={landmarksUrl}
              activeCamera={activeCamera}
              cameraTransitionMode={cameraTransitionMode}
              isAutoDirector={autoDirector}
              onCameraSwitch={onCameraSwitch}
              showTelemetryHud={false}
              enableAutoMotion={autoKinematics}
              offsetX={offsetX}
              offsetY={offsetY}
              scale={scale}
              jawDescentFactor={jawDescentFactor}
              smoothFactor={smoothFactor}
              showBoundingBox={showBoundingBox}
              showLandmarks={showLandmarks}
              onToggleLandmarks={onToggleLandmarks}
              headYaw={headYaw}
              headPitch={headPitch}
              headRoll={headRoll}
              bodyRoll={bodyRoll}
              pelvisRoll={pelvisRoll}
              respirationScale={respirationScale}
              headLeanZ={headLeanZ}
              headShiftX={headShiftX}
              headShiftY={headShiftY}
              blinkLeft={blinkLeft}
              blinkRight={blinkRight}
              eyeWidening={eyeWidening}
              gazeX={gazeX}
              gazeY={gazeY}
              eyebrowRaise={eyebrowRaise}
              eyebrowFurrow={eyebrowFurrow}
              eyebrowAsymmetry={eyebrowAsymmetry}
              smileAmount={smileAmount}
              sentimentMode={sentimentMode}
              sentimentIntensity={sentimentIntensity}
              onSentimentTelemetry={onSentimentTelemetry}
              enableCorneaLighting={enableCorneaLighting}
              targetLandmark={targetLandmark}
              timelineFrames={timelineFrames}
              timelineFrame={timelineFrame ?? currentFrame}
              biophysicsOptions={biophysicsOptions}
              stageRef={stageRef}
              orbitalYaw={orbitalYaw}
              calibration={activeCalib}
              onCalibrationChange={updateCalib}
              className="w-full h-full object-cover border-0 rounded-none shadow-none"
            />
            {plateType === "video" && (
              <video
                ref={videoRef}
                src={plateSrc ? `${plateSrc}${plateSrc.includes("?") ? "&" : "?"}vslot=dom` : undefined}
                crossOrigin="anonymous"
                playsInline
                muted
                loop
                preload="auto"
                className="hidden"
              />
            )}

            {/* WebGL 2.0 Texture Array Viseme Canvas Overlay */}
            <canvas
              ref={webglCanvasRef}
              width={plateDimensions.width}
              height={plateDimensions.height}
              style={{
                clipPath:
                  viewMode === "wipe"
                    ? `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)`
                    : "none",
              }}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none hidden"
            />

            {/* 2D Canvas Fallback & ROI Overlay */}
            <canvas
              ref={canvasRef}
              width={plateDimensions.width}
              height={plateDimensions.height}
              style={{
                clipPath:
                  viewMode === "wipe"
                    ? `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)`
                    : "none",
              }}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none block"
            />

            {/* Wipe Vertical Divider Line & Draggable Handle */}
            {viewMode === "wipe" && (
              <div
                className="absolute top-0 bottom-0 z-20 w-1 bg-white cursor-ew-resize flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.85)] pointer-events-auto"
                style={{ left: `${sliderPos}%` }}
                onMouseDown={() => setIsDragging(true)}
                onTouchStart={() => setIsDragging(true)}
              >
                <div className="w-7 h-7 -ml-3 rounded-full bg-neutral-900 border-2 border-white flex items-center justify-center shadow-xl text-white text-[11px] font-mono font-bold select-none hover:scale-110 active:scale-95 transition-transform">
                  ◫
                </div>
              </div>
            )}

            {/* Live Landmark Tuner Drawer */}
            {isCalibrationPanelEnabled && showCalibDrawer && (
              <div className="absolute top-14 right-3 w-80 p-4 rounded-xl bg-black/95 backdrop-blur-xl border border-amber-500/40 z-40 space-y-3 pointer-events-auto shadow-2xl text-xs font-mono text-neutral-200 max-h-[75vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <span className="font-bold text-amber-400 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4" />
                    <span>Live Landmark Tuner</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={copyCalibration}
                      className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                      title="Copy Calibration JSON"
                    >
                      {copiedCalib ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateCalib({ ...NEUTRAL_RAW_CALIBRATION });
                      }}
                      className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/50 text-[10px] text-amber-300 font-bold hover:bg-amber-900 transition-colors cursor-pointer flex items-center gap-1"
                      title="Reset to 1.0 Neutral Calibration"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Neutral 1.0</span>
                    </button>
                  </div>
                </div>

                {/* Persona Calibration Status Tag */}
                <div className="flex items-center justify-between px-2 py-1 rounded bg-neutral-900/60 border border-neutral-800 text-[10px]">
                  <span className="text-neutral-400">Target Persona:</span>
                  <span className="text-amber-300 font-bold uppercase tracking-wider">
                    {personaId || "Ruby"} • Calibrated
                  </span>
                </div>

                {/* Sliders */}
                <div className="space-y-2.5 pt-1">
                  {/* Eye Height Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-neutral-400">👁️ Eye Height (Y):</span>
                      <span className="text-cyan-400 font-bold">{activeCalib.eyeYOffset > 0 ? `+${activeCalib.eyeYOffset.toFixed(3)}` : activeCalib.eyeYOffset.toFixed(3)}</span>
                    </div>
                    <input
                      type="range"
                      min="-0.12"
                      max="0.12"
                      step="0.002"
                      value={activeCalib.eyeYOffset}
                      onChange={(e) => updateCalib({ eyeYOffset: parseFloat(e.target.value) })}
                      className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                    />
                  </div>

                  {/* Eye Spacing (IOD) Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-neutral-400">👁️ Eye Spacing (IOD):</span>
                      <span className="text-cyan-400 font-bold">{activeCalib.eyeSpacingScale.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.70"
                      max="1.50"
                      step="0.01"
                      value={activeCalib.eyeSpacingScale}
                      onChange={(e) => updateCalib({ eyeSpacingScale: parseFloat(e.target.value) })}
                      className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                    />
                  </div>

                  {/* Eyebrow Height Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-neutral-400">🤨 Eyebrow Height (Y):</span>
                      <span className="text-amber-400 font-bold">{activeCalib.browYOffset > 0 ? `+${activeCalib.browYOffset.toFixed(3)}` : activeCalib.browYOffset.toFixed(3)}</span>
                    </div>
                    <input
                      type="range"
                      min="-0.08"
                      max="0.08"
                      step="0.002"
                      value={activeCalib.browYOffset}
                      onChange={(e) => updateCalib({ browYOffset: parseFloat(e.target.value) })}
                      className="w-full accent-amber-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                    />
                  </div>

                  {/* Nose Base Height Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-neutral-400">👃 Nose Base Height (Y):</span>
                      <span className="text-sky-400 font-bold">{activeCalib.noseBaseYOffset > 0 ? `+${activeCalib.noseBaseYOffset.toFixed(3)}` : activeCalib.noseBaseYOffset.toFixed(3)}</span>
                    </div>
                    <input
                      type="range"
                      min="-0.08"
                      max="0.08"
                      step="0.002"
                      value={activeCalib.noseBaseYOffset}
                      onChange={(e) => updateCalib({ noseBaseYOffset: parseFloat(e.target.value) })}
                      className="w-full accent-sky-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                    />
                  </div>

                  {/* Mouth Height Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-neutral-400">👄 Mouth Height (Y):</span>
                      <span className="text-rose-400 font-bold">{activeCalib.mouthYOffset > 0 ? `+${activeCalib.mouthYOffset.toFixed(3)}` : activeCalib.mouthYOffset.toFixed(3)}</span>
                    </div>
                    <input
                      type="range"
                      min="-0.15"
                      max="0.15"
                      step="0.002"
                      value={activeCalib.mouthYOffset}
                      onChange={(e) => updateCalib({ mouthYOffset: parseFloat(e.target.value) })}
                      className="w-full accent-rose-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                    />
                  </div>

                  {/* Mouth Width Scale Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-neutral-400">👄 Mouth Width:</span>
                      <span className="text-rose-400 font-bold">{activeCalib.mouthWidthScale.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.50"
                      max="1.80"
                      step="0.01"
                      value={activeCalib.mouthWidthScale}
                      onChange={(e) => updateCalib({ mouthWidthScale: parseFloat(e.target.value) })}
                      className="w-full accent-rose-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                    />
                  </div>

                  {/* Mouth Height Scale Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-neutral-400">👄 Lip Thickness:</span>
                      <span className="text-rose-400 font-bold">{activeCalib.mouthHeightScale.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.50"
                      max="1.80"
                      step="0.01"
                      value={activeCalib.mouthHeightScale}
                      onChange={(e) => updateCalib({ mouthHeightScale: parseFloat(e.target.value) })}
                      className="w-full accent-rose-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                    />
                  </div>

                  {/* Jaw / Chin Contour Scale Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-neutral-400">📐 Jaw & Skull Scale:</span>
                      <span className="text-purple-400 font-bold">{activeCalib.jawContourScale.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.60"
                      max="1.50"
                      step="0.01"
                      value={activeCalib.jawContourScale}
                      onChange={(e) => updateCalib({ jawContourScale: parseFloat(e.target.value) })}
                      className="w-full accent-purple-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Top Floating HUD Badges */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none text-[11px] font-mono select-none z-10 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{fps > 0 ? `${fps} FPS` : "60 FPS"}</span>
                  <span className="text-neutral-500">•</span>
                  <span className="text-white">{isPlaying ? "STREAMING" : "IDLE"}</span>
                </span>

                <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-cyan-300 border border-cyan-500/30 shadow-sm truncate max-w-[150px]">
                  {engineName}
                </span>

                {fsmLabel && (
                  <span className="px-2 py-0.5 rounded-md bg-purple-950/80 backdrop-blur-md text-purple-300 border border-purple-500/40 shadow-sm">
                    {fsmLabel}
                  </span>
                )}

                {/* 64 Calibration Points Overlay Toggle Button */}
                <button
                  type="button"
                  onClick={onToggleLandmarks}
                  className={`pointer-events-auto flex items-center gap-1.5 px-2.5 py-0.5 rounded-md backdrop-blur-md border text-[11px] font-mono font-bold transition-all cursor-pointer shadow-sm ${
                    showLandmarks
                      ? "bg-cyan-950/90 border-cyan-400 text-cyan-200 shadow-cyan-500/20"
                      : "bg-black/70 border-neutral-700/60 text-neutral-400 hover:text-white"
                  }`}
                  title="Toggle 64/68 Facial Landmark Points Overlay (Eyes, Lips, Eyebrows, Jaw)"
                >
                  <Target className="w-3 h-3 text-cyan-400" />
                  <span>{showLandmarks ? "🔍 64 Pts: ON" : "🔍 64 Pts: OFF"}</span>
                </button>

                {/* Real-Time Interactive Landmark Calibration Inspector Button (Hidden by default unless showCalibrationPanel / enableCalibrationPanel is true) */}
                {isCalibrationPanelEnabled && (
                  <button
                    type="button"
                    onClick={() => setShowCalibDrawer(!showCalibDrawer)}
                    className={`pointer-events-auto flex items-center gap-1.5 px-2.5 py-0.5 rounded-md backdrop-blur-md border text-[11px] font-mono font-bold transition-all cursor-pointer shadow-sm ${
                      showCalibDrawer
                        ? "bg-amber-950/90 border-amber-400 text-amber-200 shadow-amber-500/20"
                        : "bg-black/70 border-neutral-700/60 text-neutral-400 hover:text-white"
                    }`}
                    title="Open Real-Time Interactive Landmark Calibration Inspector"
                  >
                    <Sliders className="w-3 h-3 text-amber-400" />
                    <span>{showCalibDrawer ? "🎛️ Calibrate: ON" : "🎛️ Calibrate"}</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {activeClusterId !== null && (
                  <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-amber-300 border border-amber-500/30 shadow-sm flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Cluster #{activeClusterId}</span>
                    {activeAperture !== null && (
                      <span className="text-amber-400/80">({activeAperture.toFixed(1)}px)</span>
                    )}
                  </span>
                )}

                <span
                  className={`px-2 py-0.5 rounded-md backdrop-blur-md border shadow-sm ${
                    presenceWeight > 0.8
                      ? "bg-emerald-950/70 text-emerald-300 border-emerald-500/40"
                      : presenceWeight > 0.1
                      ? "bg-amber-950/70 text-amber-300 border-amber-500/40"
                      : "bg-neutral-900/70 text-neutral-400 border-neutral-700/40"
                  }`}
                >
                  Hermite: {(presenceWeight * 100).toFixed(0)}%
                </span>

                <span
                  className={`px-2 py-0.5 rounded-md backdrop-blur-md border shadow-sm ${
                    autoKinematics || isWebGL
                      ? "bg-cyan-950/80 text-cyan-300 border-cyan-500/40"
                      : "bg-neutral-900/70 text-neutral-400 border-neutral-700/40"
                  }`}
                >
                  {autoKinematics || isWebGL ? "WebGL2 GPU" : "Canvas 2D"}
                </span>
              </div>
            </div>

            {/* Wipe Mode Directional Badges & Floating Range Scrub Bar */}
            {viewMode === "wipe" && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 pointer-events-auto">
                <div className="flex items-center justify-between w-64 px-1 text-[10px] font-mono font-bold pointer-events-none select-none">
                  <span className="px-2 py-0.5 rounded bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 backdrop-blur-md shadow-lg">
                    ◀ 3DMM ({sliderPos}%)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-purple-950/90 text-purple-300 border border-purple-500/40 backdrop-blur-md shadow-lg">
                    Original ({100 - sliderPos}%) ▶
                  </span>
                </div>
                <div className="w-64 px-3 py-1.5 rounded-full bg-black/85 border border-white/20 backdrop-blur-md flex items-center gap-2 shadow-2xl">
                  <Sliders className="w-3 h-3 text-neutral-400 shrink-0" />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={sliderPos}
                    onChange={(e) => onChangeSliderPos(Number(e.target.value))}
                    className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                  />
                  <span className="text-[10px] font-mono text-neutral-300 shrink-0 w-8 text-right">
                    {sliderPos}%
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Playback Overlay Bar */}
      <div className="w-full bg-neutral-950 border-t border-neutral-800 p-3 flex flex-col gap-2">
        {/* Frame Scrubber */}
        <div className="flex items-center gap-3 text-xs font-mono text-neutral-300">
          <span className="text-[10px] text-neutral-400 min-w-[50px]">
            F#{currentFrame}
          </span>
          <input
            type="range"
            min={0}
            max={Math.max(1, totalFrames - 1)}
            value={currentFrame}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="flex-1 accent-emerald-500 h-1.5 bg-neutral-700/60 rounded-lg cursor-pointer"
          />
          <span className="text-[10px] text-neutral-400 min-w-[50px] text-right">
            {totalFrames > 0 ? `${totalFrames} F` : "0 F"}
          </span>
        </div>

        {/* Controls Button Row */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPlayPause}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? "Pause" : "Play"}</span>
            </button>

            <button
              type="button"
              onClick={onReplay}
              className="p-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-all cursor-pointer"
              title="Restart playback from frame 0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onToggleLoop}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                isLooping
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : "bg-neutral-800/80 text-neutral-400 border-transparent hover:text-white"
              }`}
              title="Toggle continuous looping"
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-400">
            <button
              type="button"
              disabled={isExportingVideo || totalFrames === 0}
              onClick={() => onExportVideo?.("mp4")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs border transition-all ${
                isExportingVideo
                  ? "bg-amber-950/70 border-amber-500/50 text-amber-300 animate-pulse cursor-wait"
                  : "bg-cyan-600 hover:bg-cyan-500 border-transparent text-white shadow-md active:scale-95 cursor-pointer"
              }`}
              title="Export full-resolution 60 FPS synced video with audio"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingVideo ? "Exporting..." : "Export Video"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Full-Screen Recording & Export Progress Overlay */}
      {isExportingVideo && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center gap-4">
          <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-950/80 border border-red-500/50 text-red-400 text-xs font-mono shadow-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span>● REC SYNCED STAGE (60 FPS HARDWARE COMPOSITE)</span>
          </div>

          <div className="flex flex-col gap-2 w-full max-w-xs">
            <div className="flex justify-between text-xs font-mono text-cyan-300">
              <span className="truncate max-w-[200px]">{exportStage || "Recording composite..."}</span>
              <span className="font-bold">{exportProgress}%</span>
            </div>
            <div className="w-full bg-neutral-800 rounded-full h-2.5 overflow-hidden border border-neutral-700">
              <div
                className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-2.5 transition-all duration-150"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </div>

          <p className="text-[11px] text-neutral-400 max-w-xs font-sans leading-relaxed">
            Recording stage composited with 3DMM kinematics, neural visemes, biophysics and synchronized audio track...
          </p>

          <button
            type="button"
            onClick={onCancelExport}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs text-neutral-300 hover:text-white transition-all cursor-pointer"
          >
            Cancel Export
          </button>
        </div>
      )}
    </div>
  );
};

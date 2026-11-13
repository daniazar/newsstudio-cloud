/**
 * src/components/ecommerce/turntable3d/Turntable3DPanel.tsx
 *
 * 3D Product Turntable studio card (docs/3D-TURNTABLE-PRD.md §10, FR-04).
 *
 * Flow: offline guard → source image + quality → Generate 3D → live step
 * progress (2 s polling) → interactive GLB preview → Accept / Re-generate →
 * background + camera preset (re-render) → transparent turntable preview →
 * "Use in scene". Previous generations for the campaign are listed as
 * revisions and can be re-opened with one click.
 *
 * Everything goes through `/api/ecommerce/turntable-3d/*` — this component
 * never talks to the Object3D-Server directly.
 */

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Check,
  ChevronDown,
  CircleCheck,
  CircleDashed,
  CircleX,
  Clock,
  Cpu,
  Download,
  Eye,
  Film,
  Grid,
  History,
  Loader,
  PowerOff,
  RefreshCw,
  Trash2,
  TriangleAlert,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { generateProductLatheMesh } from "@/lib/ecommerce/productLatheGenerator";
import type { ExtractedProductAsset } from "@/lib/types/ecommerce";
import {
  TURNTABLE_3D_BACKGROUNDS,
  TURNTABLE_3D_CAMERA_PRESETS,
  TURNTABLE_3D_DEFAULTS,
  type Product3DAssetDTO,
  type Turntable3DBackground,
  type Turntable3DCameraPreset,
  type Turntable3DQuality,
} from "@/lib/types/turntable3d";
import { TurntableViewer } from "./TurntableViewer";
import {
  canUseInScene,
  computeTurntable3DProgress,
  findAssetForSceneVideo,
  formatDurationMs,
  formatEstimatedSeconds,
  getSceneVideoUrl,
  getStatusLabel,
  getStepViews,
  isTerminalAssetStatus,
  pickDefaultSourceAsset,
  pickQuality,
  useTurntable3DJob,
  type Turntable3DStepView,
} from "./useTurntable3DJob";

export interface Turntable3DPanelProps {
  /** `ProductCampaign.id` the 3D assets belong to. */
  campaignId: string | null | undefined;
  /** Product images the user can pick as reconstruction source. */
  productAssets: ExtractedProductAsset[];
  /** Turntable video currently assigned to the scene (`AdScene.turntable3dVideoUrl`). */
  sceneVideoUrl?: string | null;
  /** Assign a finished turntable video to the scene. */
  onUseInScene: (turntableUrl: string) => void;
  /** Clear the scene's 3D video (reverts to the CSS 2D turntable). */
  onRemoveFromScene?: () => void;
  accentColor?: string;
  /** Render as a collapsible card (default true). */
  collapsible?: boolean;
  defaultOpen?: boolean;
}

const CHECKERBOARD_STYLE: React.CSSProperties = {
  backgroundColor: "#18181b",
  backgroundImage:
    "linear-gradient(45deg, #27272a 25%, transparent 25%), linear-gradient(-45deg, #27272a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #27272a 75%), linear-gradient(-45deg, transparent 75%, #27272a 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
};

const VIEWER_BACKGROUND = "radial-gradient(ellipse at 50% 35%, #27272a 0%, #09090b 75%)";

type PreviewTab = "model" | "video" | "angles";

export function Turntable3DPanel({
  campaignId,
  productAssets,
  sceneVideoUrl,
  onUseInScene,
  onRemoveFromScene,
  accentColor = "#06b6d4",
  collapsible = true,
  defaultOpen = true,
}: Turntable3DPanelProps) {
  const {
    engines,
    enginesLoading,
    online,
    qualityOptions,
    revisions,
    asset,
    activeAssetId,
    isSubmitting,
    submitError,
    submitNotice,
    assetError,
    estimatedSeconds,
    generate,
    rerender,
    loadAsset,
    refreshEngines,
  } = useTurntable3DJob(campaignId);

  const [open, setOpen] = useState(defaultOpen);
  const [sourceAssetId, setSourceAssetId] = useState<string | null>(null);
  const [quality, setQuality] = useState<Turntable3DQuality>(TURNTABLE_3D_DEFAULTS.quality);
  const [background, setBackground] = useState<Turntable3DBackground>(TURNTABLE_3D_DEFAULTS.background);
  const [cameraPreset, setCameraPreset] = useState<Turntable3DCameraPreset>(TURNTABLE_3D_DEFAULTS.cameraPreset);
  const [acceptedIds, setAcceptedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [previewTab, setPreviewTab] = useState<PreviewTab>("model");
  const [showContactSheetModal, setShowContactSheetModal] = useState(false);
  const [clientLatheAsset, setClientLatheAsset] = useState<Product3DAssetDTO | null>(null);
  const [isGeneratingLathe, setIsGeneratingLathe] = useState(false);
  const [latheError, setLatheError] = useState<string | null>(null);

  const [customAssets, setCustomAssets] = useState<ExtractedProductAsset[]>([]);
  const imageAssets = useMemo(() => {
    const standard = productAssets.filter((a) => Boolean(a?.url));
    return [...customAssets, ...standard];
  }, [customAssets, productAssets]);
  const selectedSource =
    imageAssets.find((a) => a.id === sourceAssetId) ?? pickDefaultSourceAsset(imageAssets);
  const effectiveQuality = pickQuality(qualityOptions, quality);
  const selectedQualityOption = qualityOptions.find((o) => o.value === effectiveQuality);

  // Combined revisions list including in-memory client lathe generations
  const allRevisions = useMemo(() => {
    if (!clientLatheAsset) return revisions;
    return [clientLatheAsset, ...revisions.filter((r) => r.id !== clientLatheAsset.id)];
  }, [clientLatheAsset, revisions]);

  // Handle client-side lathe generation
  const handleGenerateLathe = async () => {
    if (!selectedSource?.url) return;
    setIsGeneratingLathe(true);
    setLatheError(null);
    const startTime = performance.now();
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = selectedSource.url;
      await new Promise<void>((resolve, reject) => {
        if (img.complete && img.naturalWidth > 0) return resolve();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load product source image."));
      });

      const latheResult = await generateProductLatheMesh(img);
      const glbUrl = await latheResult.createGLBUrl();
      const elapsedMs = Math.round(performance.now() - startTime);

      const newLatheAsset: Product3DAssetDTO = {
        id: `lathe-${Date.now()}`,
        campaignId: campaignId || "local",
        status: "READY",
        engine: "threejs_lathe",
        quality: "draft",
        background,
        cameraPreset,
        frames: 0,
        fps: 30,
        width: 1024,
        height: 1024,
        meshUrl: glbUrl,
        turntableUrl: null,
        turntableMp4Url: null,
        previewUrl: selectedSource.url,
        contactSheetUrl: null,
        inferenceMs: elapsedMs,
        vertexCount: latheResult.geometry.attributes.position.count,
        textureSize: "2048×1024 (100% Sharp)",
        errorLog: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        job: null,
      };

      setClientLatheAsset(newLatheAsset);
      setPreviewTab("model");
    } catch (err) {
      console.error("[Turntable3DPanel] Lathe generation failed:", err);
      setLatheError((err as Error).message || "Failed to generate instant lathe mesh");
    } finally {
      setIsGeneratingLathe(false);
    }
  };

  // The asset currently selected for inspection and preview
  const displayedAsset =
    clientLatheAsset && (!activeAssetId || activeAssetId === clientLatheAsset.id)
      ? clientLatheAsset
      : asset;

  // Re-open the revision already used by this scene (once, when revisions arrive).
  const autoSelectedRef = useRef(false);
  useEffect(() => {
    if (autoSelectedRef.current || activeAssetId || revisions.length === 0) return;
    autoSelectedRef.current = true;
    const match = findAssetForSceneVideo(revisions, sceneVideoUrl);
    if (match) loadAsset(match.id);
  }, [revisions, sceneVideoUrl, activeAssetId, loadAsset]);

  // Sync the render selectors with the asset being inspected.
  const syncedAssetRef = useRef<string | null>(null);
  useEffect(() => {
    if (!displayedAsset || syncedAssetRef.current === displayedAsset.id) return;
    syncedAssetRef.current = displayedAsset.id;
    setQuality(displayedAsset.quality);
    setBackground(displayedAsset.background);
    setCameraPreset(displayedAsset.cameraPreset);
    setPreviewTab("model");
  }, [displayedAsset]);

  const sceneVideoAsset = findAssetForSceneVideo(allRevisions, sceneVideoUrl);
  const isRunning = Boolean(activeAssetId) && (!displayedAsset || !isTerminalAssetStatus(displayedAsset.status));
  const isReady = displayedAsset?.status === "READY";
  const isFailed = displayedAsset?.status === "FAILED";
  const assetVideoUrl = getSceneVideoUrl(displayedAsset);
  const isInScene = Boolean(sceneVideoUrl && assetVideoUrl && sceneVideoUrl === assetVideoUrl);
  const isAccepted = Boolean(displayedAsset && (acceptedIds.has(displayedAsset.id) || isInScene));
  const renderSettingsChanged = Boolean(
    displayedAsset && (displayedAsset.background !== background || displayedAsset.cameraPreset !== cameraPreset)
  );
  const controlsDisabled = !online || isSubmitting || isRunning;

  const handleGenerate = () => {
    void generate({
      sourceAssetId: selectedSource?.id || undefined,
      sourceImageUrl: selectedSource?.url || undefined,
      quality: effectiveQuality,
      background,
      cameraPreset,
    });
  };

  const handleAccept = () => {
    if (!displayedAsset) return;
    setAcceptedIds((prev) => new Set(prev).add(displayedAsset.id));
    setPreviewTab("video");
  };

  const handleRerender = () => {
    void rerender({ background, cameraPreset }).then((id) => {
      if (id) setPreviewTab("video");
    });
  };

  const handleUseInScene = () => {
    if (assetVideoUrl) onUseInScene(assetVideoUrl);
  };

  const statusPill = enginesLoading && !engines ? (
    <span className="flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
      <Loader className="h-2.5 w-2.5 animate-spin" /> Checking
    </span>
  ) : online ? (
    <span
      className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-300"
      title={engines?.gpu_name ? `${engines.gpu_name}${engines.vram_total_gb ? ` · ${engines.vram_total_gb} GB` : ""}` : undefined}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online
    </span>
  ) : (
    <span className="flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-mono text-red-300">
      <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Offline
    </span>
  );

  const header = (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <div
          className="rounded-lg border p-1.5"
          style={{ color: accentColor, borderColor: `${accentColor}4d`, backgroundColor: `${accentColor}1a` }}
        >
          <Box className="h-4 w-4" />
        </div>
        <div className="min-w-0 text-left">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-zinc-100">3D Turntable</span>
            {sceneVideoUrl && (
              <span className="rounded border border-cyan-500/30 bg-cyan-500/20 px-1.5 py-0.5 text-[9px] font-bold text-cyan-300">
                3D IN SCENE
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[10px] text-zinc-400">
            360° rotation from a single product photo · Local GPU
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {statusPill}
        {collapsible && (
          <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </div>
    </div>
  );

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        sceneVideoUrl ? "border-cyan-500/50 bg-cyan-950/10" : "border-zinc-800 bg-zinc-950/80"
      } ${open || !collapsible ? "space-y-3.5" : ""}`}
    >
      {collapsible ? (
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="block w-full cursor-pointer">
          {header}
        </button>
      ) : (
        header
      )}

      {(open || !collapsible) && (
        <>
          {/* Active-in-scene strip */}
          {sceneVideoUrl && (
            <div className="flex items-center gap-3 rounded-lg border border-cyan-500/30 bg-zinc-900/80 p-2">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-zinc-700" style={CHECKERBOARD_STYLE}>
                <video src={sceneVideoUrl} autoPlay loop muted playsInline className="h-full w-full object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-zinc-100">True 3D rotation active in this scene</p>
                <p className="truncate text-[10px] text-zinc-400">
                  {sceneVideoAsset
                    ? `${sceneVideoAsset.quality} · ${sceneVideoAsset.engine} · ${sceneVideoAsset.background}`
                    : "Replaces the CSS-rotated packshot; pedestal & particles are kept"}
                </p>
              </div>
              {onRemoveFromScene && (
                <button
                  type="button"
                  onClick={onRemoveFromScene}
                  className="flex shrink-0 items-center gap-1 rounded-md border border-red-500/40 bg-red-950/60 px-2 py-1 text-[11px] font-bold text-red-300 hover:bg-red-900/70"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove 3D video
                </button>
              )}
            </div>
          )}

          {/* Offline guard (AC-07) */}
          {!online && !(enginesLoading && !engines) && (
            <div className="flex flex-col gap-2 rounded-lg border border-red-500/30 bg-red-950/20 p-3">
              <div className="flex items-start gap-2.5">
                <PowerOff className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-red-200">Neural 3D service offline</p>
                  <p className="mt-0.5 text-[10px] text-zinc-400">
                    Object3D-Server is not reachable. Deep neural reconstruction is paused, but Instant Lathe 3D runs 100% locally in your browser.
                  </p>
                  {engines?.error && (
                    <p className="mt-1 truncate text-[10px] font-mono text-zinc-500" title={engines.error}>
                      {engines.error}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={refreshEngines}
                  className="flex shrink-0 items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-800"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry
                </button>
              </div>
              <div className="flex items-center justify-between rounded border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-200">
                <span className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  <span>Instant Lathe 3D is available offline (0 MB VRAM, 100% sharp text).</span>
                </span>
                <button
                  type="button"
                  onClick={handleGenerateLathe}
                  disabled={isGeneratingLathe || !selectedSource}
                  className="rounded bg-amber-400 px-2.5 py-1 text-[10px] font-bold text-black hover:bg-amber-300 disabled:opacity-50 transition-colors"
                >
                  {isGeneratingLathe ? "Generating…" : "Run Lathe 3D"}
                </button>
              </div>
            </div>
          )}

          {/* 1. Setup: source image picker (always active) */}
          <SourceImagePicker
            assets={imageAssets}
            selectedId={selectedSource?.id ?? null}
            onSelect={setSourceAssetId}
            onUpload={(newAsset) => setCustomAssets((prev) => [newAsset, ...prev])}
          />

          {/* Action buttons: Instant Lathe (0s, 0 VRAM, pure browser) + Neural 3D (Docker GPU) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleGenerateLathe}
              disabled={isGeneratingLathe || !selectedSource}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-500/15 px-3 py-2 text-xs font-bold text-amber-300 transition-all hover:bg-amber-500/25 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              title="Instant mathematical 360 lathe in browser (0s, 0 VRAM, 100% sharp packaging text)"
            >
              {isGeneratingLathe ? (
                <>
                  <Loader className="h-3.5 w-3.5 animate-spin text-amber-400" />
                  <span>Generating Lathe…</span>
                </>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  <span>Instant Lathe (Fast 3D)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={controlsDisabled || !selectedSource || !campaignId}
              className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-black text-black shadow-lg transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: accentColor }}
            >
              {isSubmitting || isRunning ? (
                <>
                  <Loader className="h-3.5 w-3.5 animate-spin" />
                  <span>{isSubmitting ? "Queuing…" : "Generating 3D…"}</span>
                </>
              ) : (
                <>
                  {displayedAsset ? <RefreshCw className="h-3.5 w-3.5" /> : <Box className="h-3.5 w-3.5" />}
                  <span>{displayedAsset ? "Neural Revision" : "Neural 3D"}</span>
                  {selectedQualityOption && (
                    <span className="font-mono font-normal opacity-70">
                      {formatEstimatedSeconds(selectedQualityOption.estimatedSeconds)}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>

          {latheError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-[11px] text-red-200">
              <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-red-400" />
              <span className="min-w-0 break-words">{latheError}</span>
            </div>
          )}

          {/* Neural Server Settings (Only active when online) */}
          <fieldset
            disabled={controlsDisabled}
            className={`space-y-3 transition-opacity ${!online ? "pointer-events-none opacity-40 grayscale" : ""}`}
            aria-disabled={!online}
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-300">Neural Engine Quality</span>
                {engines?.gpu_name && (
                  <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-500">
                    <Cpu className="h-3 w-3" />
                    {engines.gpu_name}
                    {engines.vram_total_gb ? ` · ${engines.vram_total_gb} GB` : ""}
                  </span>
                )}
              </div>
              <div className="overflow-hidden rounded-lg border border-zinc-800">
                <div className="grid grid-cols-[1.1fr_1.4fr_0.6fr_0.6fr] gap-2 border-b border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                  <span>Quality</span>
                  <span>Engine</span>
                  <span>Time</span>
                  <span>VRAM</span>
                </div>
                {qualityOptions.map((opt) => {
                  const selected = opt.value === effectiveQuality;
                  const unavailableHint = !opt.available
                    ? [opt.reason, opt.fallbackLabel ? `server falls back to ${opt.fallbackLabel}` : null]
                        .filter(Boolean)
                        .join(" — ")
                    : undefined;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={controlsDisabled || !opt.available}
                      onClick={() => setQuality(opt.value)}
                      title={unavailableHint}
                      className={`grid w-full grid-cols-[1.1fr_1.4fr_0.6fr_0.6fr] gap-2 px-2.5 py-2 text-left text-xs transition-colors ${
                        selected
                          ? "bg-cyan-500/10 text-cyan-300 font-semibold"
                          : opt.available
                          ? "text-zinc-300 hover:bg-zinc-800/60"
                          : "text-zinc-600 cursor-not-allowed bg-zinc-950/40"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`flex h-3 w-3 items-center justify-center rounded-full border ${
                            selected ? "border-cyan-400" : "border-zinc-600"
                          }`}
                        >
                          {selected && <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />}
                        </span>
                        {opt.label}
                        {opt.value === TURNTABLE_3D_DEFAULTS.quality && (
                          <span className="text-[8px] font-normal text-zinc-500">default</span>
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate">{opt.engineLabel}</span>
                        {!opt.available && opt.fallbackLabel && (
                          <span className="block truncate text-[9px] text-amber-500/80">→ {opt.fallbackLabel}</span>
                        )}
                      </span>
                      <span className="font-mono">{formatEstimatedSeconds(opt.estimatedSeconds)}</span>
                      <span className="font-mono">{opt.vramGb != null ? `${opt.vramGb} GB` : "—"}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {!displayedAsset && (
              <RenderSettings
                background={background}
                cameraPreset={cameraPreset}
                onBackground={setBackground}
                onCameraPreset={setCameraPreset}
              />
            )}
          </fieldset>

          {submitNotice && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-200">
              <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-amber-400" />
              <span className="min-w-0 break-words">{submitNotice}</span>
            </div>
          )}

          {(submitError || assetError) && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300">
              <TriangleAlert className="h-4 w-4 shrink-0 text-red-400" />
              <span className="min-w-0 break-words">{submitError || assetError}</span>
            </div>
          )}

          {/* 2. Live progress */}
          {activeAssetId && (isRunning || isFailed) && (
            <ProgressChecklist
              asset={asset}
              estimatedSeconds={estimatedSeconds}
              accentColor={accentColor}
            />
          )}

          {isFailed && asset?.errorLog && (
            <pre className="max-h-24 overflow-auto whitespace-pre-wrap rounded-lg border border-red-500/20 bg-black/60 p-2 text-[10px] text-red-300/90">
              {asset.errorLog}
            </pre>
          )}

          {/* 3. Preview, accept & render */}
          {displayedAsset && isReady && (
            <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
              <div className="flex items-center justify-between">
                <div className="flex rounded-md border border-zinc-800 bg-zinc-950 p-0.5">
                  {(["model", "video", "angles"] as const).map((tab) => {
                    if (tab === "angles" && !displayedAsset.contactSheetUrl) return null;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setPreviewTab(tab)}
                        disabled={tab === "video" && !assetVideoUrl}
                        className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-bold transition-colors disabled:opacity-40 ${
                          previewTab === tab ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        {tab === "model" ? (
                          <Box className="h-3 w-3" />
                        ) : tab === "video" ? (
                          <Film className="h-3 w-3" />
                        ) : (
                          <Grid className="h-3 w-3" />
                        )}
                        {tab === "model" ? "3D Model" : tab === "video" ? "Turntable Video" : "8 Angles"}
                      </button>
                    );
                  })}
                </div>
                <AssetMeta asset={displayedAsset} />
              </div>

              {previewTab === "model" ? (
                <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-zinc-800">
                  {displayedAsset.meshUrl ? (
                    <TurntableViewer
                      meshUrl={displayedAsset.meshUrl}
                      background={VIEWER_BACKGROUND}
                      onRegenerate={online ? handleGenerate : undefined}
                    />
                  ) : displayedAsset.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={displayedAsset.previewUrl} alt="3D preview" className="h-full w-full object-contain" style={{ background: VIEWER_BACKGROUND }} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[11px] text-zinc-500">
                      No mesh available for this revision
                    </div>
                  )}
                </div>
              ) : previewTab === "video" ? (
                <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-zinc-800" style={CHECKERBOARD_STYLE}>
                  {assetVideoUrl && (
                    <video
                      key={assetVideoUrl}
                      src={assetVideoUrl}
                      poster={displayedAsset.previewUrl ?? undefined}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="h-full w-full object-contain"
                    />
                  )}
                  <span className="absolute left-2 top-2 rounded bg-black/75 px-2 py-0.5 text-[10px] font-bold text-zinc-300">
                    {displayedAsset.width}×{displayedAsset.height} · {displayedAsset.frames}f @ {displayedAsset.fps}fps · {displayedAsset.background}
                  </span>
                </div>
              ) : (
                <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-zinc-800 bg-black/90 flex items-center justify-center group">
                  {displayedAsset.contactSheetUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={displayedAsset.contactSheetUrl}
                        alt="8-angle contact sheet"
                        className="h-full w-full object-contain cursor-pointer transition-transform duration-200 group-hover:scale-[1.01]"
                        onClick={() => setShowContactSheetModal(true)}
                      />
                      <span className="absolute left-2 top-2 rounded bg-black/80 px-2 py-0.5 text-[10px] font-bold text-zinc-300 flex items-center gap-1 border border-zinc-800">
                        <Grid className="h-3 w-3 text-amber-400" />
                        8-Angle Inspection (0°–315°)
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowContactSheetModal(true)}
                        className="absolute bottom-2 right-2 rounded-md bg-black/80 hover:bg-black px-2 py-1 text-[10px] text-zinc-300 hover:text-white transition-colors flex items-center gap-1 border border-zinc-700"
                        title="Enlarge inspection sheet"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Enlarge</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[11px] text-zinc-500">
                      No contact sheet available for this revision
                    </div>
                  )}
                </div>
              )}

              {/* Direct Asset Downloads Strip */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-md border border-zinc-800/80 bg-zinc-950/60 px-2.5 py-1.5">
                <span className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1">
                  <Download className="h-3 w-3 text-zinc-500" />
                  Direct Downloads:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {displayedAsset.meshUrl && (
                    <a
                      href={displayedAsset.meshUrl}
                      download={`product-mesh-${displayedAsset.quality}.glb`}
                      className="flex items-center gap-1 rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-cyan-300 hover:border-cyan-500/50 hover:bg-cyan-950/30 transition-colors"
                      title="Download glTF / GLB 3D mesh"
                    >
                      <Box className="h-2.5 w-2.5 text-cyan-400" />
                      GLB Mesh
                    </a>
                  )}
                  {displayedAsset.turntableUrl && (
                    <a
                      href={displayedAsset.turntableUrl}
                      download={`turntable-alpha-${displayedAsset.quality}.webm`}
                      className="flex items-center gap-1 rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-emerald-300 hover:border-emerald-500/50 hover:bg-emerald-950/30 transition-colors"
                      title="Download transparent VP9 WebM turntable video"
                    >
                      <Film className="h-2.5 w-2.5 text-emerald-400" />
                      WebM (Alpha)
                    </a>
                  )}
                  {displayedAsset.turntableMp4Url && (
                    <a
                      href={displayedAsset.turntableMp4Url}
                      download={`turntable-${displayedAsset.quality}.mp4`}
                      className="flex items-center gap-1 rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-purple-300 hover:border-purple-500/50 hover:bg-purple-950/30 transition-colors"
                      title="Download H.264 MP4 turntable video"
                    >
                      <Film className="h-2.5 w-2.5 text-purple-400" />
                      MP4
                    </a>
                  )}
                  {displayedAsset.contactSheetUrl && (
                    <a
                      href={displayedAsset.contactSheetUrl}
                      download={`contact-sheet-${displayedAsset.quality}.png`}
                      className="flex items-center gap-1 rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-amber-300 hover:border-amber-500/50 hover:bg-amber-950/30 transition-colors"
                      title="Download 8-angle contact sheet PNG"
                    >
                      <Grid className="h-2.5 w-2.5 text-amber-400" />
                      8-Angles PNG
                    </a>
                  )}
                </div>
              </div>

              {!isAccepted ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAccept}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-black text-black hover:bg-emerald-400"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={controlsDisabled || !selectedSource}
                    title={!online ? "3D service offline — start Docker container" : undefined}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Re-generate
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <RenderSettings
                    background={background}
                    cameraPreset={cameraPreset}
                    onBackground={setBackground}
                    onCameraPreset={setCameraPreset}
                    disabled={controlsDisabled}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRerender}
                      disabled={controlsDisabled || !renderSettingsChanged}
                      title={
                        !online
                          ? "3D service offline — start Docker container"
                          : !renderSettingsChanged
                          ? "Change background or camera to re-render"
                          : "Re-render the turntable video from the same mesh (no reconstruction)"
                      }
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Film className="h-3.5 w-3.5" />
                      Render Turntable Video
                    </button>
                    {isInScene ? (
                      <span className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-300">
                        <CircleCheck className="h-3.5 w-3.5" />
                        In scene
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleUseInScene}
                        disabled={!canUseInScene(asset)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black text-black hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ backgroundColor: accentColor }}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Use in scene
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. Revisions */}
          {allRevisions.length > 0 && (
            <RevisionsList
              revisions={allRevisions}
              activeAssetId={displayedAsset?.id ?? activeAssetId}
              sceneVideoUrl={sceneVideoUrl ?? null}
              onSelect={(id) => {
                if (clientLatheAsset && id === clientLatheAsset.id) {
                  setPreviewTab("model");
                } else {
                  loadAsset(id);
                }
              }}
            />
          )}
        </>
      )}

      {/* 8-Angle Contact Sheet Full Inspection Modal */}
      {showContactSheetModal && displayedAsset?.contactSheetUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
          <div className="relative flex max-h-[90vh] max-w-5xl flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/80 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Grid className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-bold text-zinc-100">8-Angle Multi-View Forensic Inspection</span>
                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-mono font-bold text-amber-300">
                  {displayedAsset.engine} · {displayedAsset.quality}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={displayedAsset.contactSheetUrl}
                  download={`contact-sheet-${displayedAsset.quality}.png`}
                  className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs font-bold text-zinc-200 hover:bg-zinc-800"
                >
                  <Download className="h-3 w-3" />
                  Download
                </a>
                <button
                  type="button"
                  onClick={() => setShowContactSheetModal(false)}
                  className="rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displayedAsset.contactSheetUrl}
                alt="8-angle contact sheet full view"
                className="max-h-[75vh] w-auto object-contain rounded border border-zinc-800"
              />
            </div>
            <div className="border-t border-zinc-800 bg-zinc-900/60 px-4 py-2 text-[10px] text-zinc-400 flex items-center justify-between">
              <span>Angles: 0°, 45°, 90°, 135°, 180°, 225°, 270°, 315° at {displayedAsset.cameraPreset} elevation</span>
              <span className="font-mono">Resolution: 8 × {displayedAsset.width}×{displayedAsset.height}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SourceImagePicker({
  assets,
  selectedId,
  onSelect,
  onUpload,
}: {
  assets: ExtractedProductAsset[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onUpload?: (asset: ExtractedProductAsset) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const newAsset: ExtractedProductAsset = {
      id: `upload-${Date.now()}`,
      url,
      type: "hero_packshot",
      altText: file.name,
    };
    onUpload?.(newAsset);
    onSelect(newAsset.id);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-zinc-300">Source photo</span>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 text-[10px] font-medium text-cyan-400 hover:text-cyan-300 hover:underline"
        >
          <Upload className="h-3 w-3" />
          Upload Image
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {assets.length === 0 ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 p-4 text-[11px] text-zinc-400 hover:border-zinc-500 hover:bg-zinc-900/40 transition-colors"
        >
          <Upload className="h-5 w-5 text-zinc-500" />
          <span>Click to upload a product photo (or drag & drop)</span>
        </div>
      ) : (
        <div className="grid max-h-40 grid-cols-5 gap-1.5 overflow-y-auto p-0.5 custom-scrollbar">
          {/* Upload Button Tile */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Upload new product photo"
            aria-label="Upload new product photo"
            className="flex flex-col items-center justify-center gap-1 rounded-md border border-dashed border-zinc-700 bg-zinc-900/40 text-zinc-400 hover:border-cyan-500/50 hover:text-cyan-300 transition-all aspect-square"
          >
            <Upload className="h-4 w-4" />
            <span className="text-[9px] font-medium">Upload</span>
          </button>
          {assets.map((a) => {
            const selected = a.id === selectedId;
            return (
              <button
                key={a.id || a.url}
                type="button"
                onClick={() => onSelect(a.id)}
                title={a.altText || a.type}
                aria-label={`Select product photo ${a.altText || a.type || ""}`}
                className={`relative aspect-square overflow-hidden rounded-md border-2 bg-white transition-all ${
                  selected ? "border-cyan-400 ring-2 ring-cyan-500/30" : "border-zinc-800 opacity-70 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.url} alt={a.altText || "Product image"} className="h-full w-full object-contain" />
                {selected && (
                  <span className="absolute right-0.5 top-0.5 rounded bg-cyan-400 p-0.5 text-black">
                    <Check className="h-2.5 w-2.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RenderSettings({
  background,
  cameraPreset,
  onBackground,
  onCameraPreset,
  disabled = false,
}: {
  background: Turntable3DBackground;
  cameraPreset: Turntable3DCameraPreset;
  onBackground: (v: Turntable3DBackground) => void;
  onCameraPreset: (v: Turntable3DCameraPreset) => void;
  disabled?: boolean;
}) {
  const selectClass =
    "w-full rounded-md border border-zinc-700 bg-black/60 px-2 py-1.5 text-xs text-zinc-100 focus:border-cyan-500 focus:outline-none disabled:opacity-50";
  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="space-y-1">
        <span className="block text-[10px] font-semibold text-zinc-400">Background</span>
        <select
          value={background}
          disabled={disabled}
          onChange={(e) => onBackground(e.target.value as Turntable3DBackground)}
          className={selectClass}
        >
          {TURNTABLE_3D_BACKGROUNDS.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1">
        <span className="block text-[10px] font-semibold text-zinc-400">Camera</span>
        <select
          value={cameraPreset}
          disabled={disabled}
          onChange={(e) => onCameraPreset(e.target.value as Turntable3DCameraPreset)}
          className={selectClass}
        >
          {TURNTABLE_3D_CAMERA_PRESETS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function StepIcon({ view }: { view: Turntable3DStepView }) {
  switch (view.state) {
    case "done":
      return <CircleCheck className="h-3.5 w-3.5 text-emerald-400" />;
    case "active":
      return <Loader className="h-3.5 w-3.5 animate-spin text-cyan-400" />;
    case "failed":
      return <CircleX className="h-3.5 w-3.5 text-red-400" />;
    default:
      return <CircleDashed className="h-3.5 w-3.5 text-zinc-600" />;
  }
}

function ProgressChecklist({
  asset,
  estimatedSeconds,
  accentColor,
}: {
  asset: Product3DAssetDTO | null;
  estimatedSeconds: number | null;
  accentColor: string;
}) {
  const progress = computeTurntable3DProgress(asset);
  const views = getStepViews(asset?.job?.currentStep ?? null, asset?.status ?? "PENDING", {
    progress,
    hasMesh: Boolean(asset?.meshUrl),
  });
  const failed = asset?.status === "FAILED";
  return (
    <div className="space-y-2.5 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
      <div className="flex items-center justify-between text-[11px]">
        <span className={`font-bold ${failed ? "text-red-300" : "text-zinc-200"}`}>
          {failed ? "3D generation failed" : asset ? getStatusLabel(asset.status) : "Queued"}
          {asset?.engine ? <span className="ml-1.5 font-mono font-normal text-zinc-500">{asset.engine}</span> : null}
        </span>
        <span className="flex items-center gap-1 font-mono text-zinc-400">
          {estimatedSeconds != null && !failed && (
            <>
              <Clock className="h-3 w-3" />
              {formatEstimatedSeconds(estimatedSeconds)} ·{" "}
            </>
          )}
          {Math.round(progress * 100)}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.max(progress * 100, failed ? 100 : 3)}%`, backgroundColor: failed ? "#ef4444" : accentColor }}
        />
      </div>
      <ul className="space-y-1.5">
        {views.map((view) => (
          <li
            key={view.step}
            className={`flex items-center gap-2 text-[11px] ${
              view.state === "active"
                ? "font-bold text-white"
                : view.state === "done"
                ? "text-zinc-400"
                : view.state === "failed"
                ? "font-bold text-red-300"
                : "text-zinc-600"
            }`}
          >
            <StepIcon view={view} />
            {view.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AssetMeta({ asset }: { asset: Product3DAssetDTO }) {
  const engineLabel =
    asset.engine === "threejs_lathe"
      ? "⚡ In-App Lathe 3D (0 VRAM · Instant)"
      : asset.engine;
  const parts = [
    engineLabel,
    asset.inferenceMs != null ? formatDurationMs(asset.inferenceMs) : null,
    asset.vertexCount != null ? `${asset.vertexCount.toLocaleString()} verts` : null,
    asset.textureSize,
  ].filter(Boolean);
  return <span className="truncate pl-2 text-[10px] font-mono text-zinc-500">{parts.join(" · ")}</span>;
}

function RevisionsList({
  revisions,
  activeAssetId,
  sceneVideoUrl,
  onSelect,
}: {
  revisions: Product3DAssetDTO[];
  activeAssetId: string | null;
  sceneVideoUrl: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-300">
        <History className="h-3.5 w-3.5 text-zinc-500" />
        Revisions ({revisions.length})
      </span>
      <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {revisions.map((rev) => {
          const active = rev.id === activeAssetId;
          const inScene = Boolean(sceneVideoUrl && getSceneVideoUrl(rev) === sceneVideoUrl);
          const isLathe = rev.engine === "threejs_lathe";
          const statusColor =
            rev.status === "READY"
              ? isLathe
                ? "text-amber-400 font-bold"
                : "text-emerald-400"
              : rev.status === "FAILED"
              ? "text-red-400"
              : "text-amber-400";
          return (
            <button
              key={rev.id}
              type="button"
              onClick={() => onSelect(rev.id)}
              title={`${rev.quality} · ${rev.engine} · ${new Date(rev.createdAt).toLocaleString()}`}
              aria-label={`Select revision ${rev.quality} ${rev.engine}`}
              className={`w-20 shrink-0 overflow-hidden rounded-lg border text-left transition-all ${
                active ? "border-cyan-400 ring-1 ring-cyan-500/30" : "border-zinc-800 hover:border-zinc-600"
              }`}
            >
              <div className="relative aspect-square w-full" style={CHECKERBOARD_STYLE}>
                {rev.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={rev.previewUrl} alt={`Revision ${rev.quality}`} className="h-full w-full object-contain" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Box className="h-5 w-5 text-zinc-600" />
                  </div>
                )}
                {isLathe && (
                  <span className="absolute right-1 top-1 rounded bg-amber-400 px-1 text-[8px] font-black text-black">
                    ⚡ LATHE
                  </span>
                )}
                {inScene && (
                  <span className="absolute left-1 top-1 rounded bg-cyan-400 px-1 text-[8px] font-black text-black">IN SCENE</span>
                )}
              </div>
              <div className="bg-zinc-950 px-1.5 py-1">
                <p className="truncate text-[9px] font-bold capitalize text-zinc-200">
                  {isLathe ? "⚡ Lathe 3D" : rev.quality}
                </p>
                <p className={`truncate text-[9px] ${statusColor}`}>
                  {isLathe ? "100% Sharp" : getStatusLabel(rev.status)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default Turntable3DPanel;

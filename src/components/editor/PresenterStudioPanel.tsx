"use client";

/**
 * src/components/editor/PresenterStudioPanel.tsx
 *
 * Full Broadcast Presenter Studio orchestrator.
 * Coordinates real-time lip-sync (MuseTalk), offline diffusion (LTX / InfiniteTalk),
 * wardrobe/attire switching, Chroma action loops, 3D background sets, and batch rendering.
 */

import { StudioBackgroundSelectorModal } from "@/components/conversational/StudioBackgroundSelectorModal";
import { UltimatePersonaPicker } from "@/components/editor/shared/persona/UltimatePersonaPicker";
import { Button } from "@/components/ui/Button";
import {
STUDIO_BACKGROUNDS,
getStudioBackgroundById,
type StudioBackground,
} from "@/lib/realtime/studioBackgrounds";
import { getPersonaById } from "@/lib/tts/personas";
import { ImageIcon,Sparkles } from "lucide-react";
import { useCallback,useEffect,useMemo,useState } from "react";
import { RealtimeLipSyncPreviewModal } from "./RealtimeLipSyncPreviewModal";

import { PresenterEngineSelector } from "./shared/presenter/components/PresenterEngineSelector";
import { PresenterSceneRow } from "./shared/presenter/components/PresenterSceneRow";
import { PresenterServerStatus } from "./shared/presenter/components/PresenterServerStatus";
import { PresenterStudioHeader } from "./shared/presenter/components/PresenterStudioHeader";
import { usePresenterBatchGeneration } from "./shared/presenter/hooks/usePresenterBatchGeneration";
import { usePresenterHealth } from "./shared/presenter/hooks/usePresenterHealth";
import {
ActionLoopOption,
BROADCAST_ACTION_LOOPS,
ModelSize,
PersonaAttire,
PresenterStudioPanelProps,
Segment,
getPersonaAttires,
} from "./shared/presenter/types";

export { BROADCAST_ACTION_LOOPS,getPersonaAttires };
export type { ActionLoopOption,ModelSize,PersonaAttire,PresenterStudioPanelProps,Segment };

export function PresenterStudioPanel({
  segments,
  storyId,
  comfyServer,
  sadtalkerServer,
  batchState,
  onVideoGenerated,
  onDeletePresenterVideo,
  onUpdateSegmentAvatar,
  onUpdateSegmentActionLoop,
  onUpdateSegmentCameraCue: _onUpdateSegmentCameraCue,
  selectedSceneIndex,
  onSelectScene,
  tts,
  onUpdateAsset,
  onUpdateSegmentStrategy,
  onUpdateSegmentPersona,
  onApplyPersonaToAll,
}: PresenterStudioPanelProps) {
  const [selectedModel, setSelectedModel] = useState<ModelSize>("musetalk");
  const [selectedAttireId, setSelectedAttireId] = useState<string>("ruby_blue_dress_chroma");
  const [selectedStudioBgId, setSelectedStudioBgId] = useState<string>(
    "studio_plate_videowall_standup_9x16"
  );
  const [isBgModalOpen, setIsBgModalOpen] = useState<boolean>(false);
  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null);
  const [testLipSyncSegment, setTestLipSyncSegment] = useState<Segment | null>(null);

  // Server health hook
  const health = usePresenterHealth(comfyServer, sadtalkerServer);

  // Only valid script segments (not intro/outro)
  const validSegments = useMemo(
    () => segments.filter((s) => s.index >= 0 && s.text?.trim()),
    [segments]
  );

  // Generation & cache hook
  const gen = usePresenterBatchGeneration({
    validSegments,
    storyId,
    selectedModel,
    batchState,
    tts,
    onVideoGenerated,
    onUpdateSegmentAvatar,
  });

  // Active persona & wardrobe resolution
  const segment0 = useMemo(() => segments.find((s) => s.index === 0), [segments]);
  const activePersonaId = (segment0?.personaId || "ruby").toLowerCase();
  const activePersona =
    getPersonaById(activePersonaId) ||
    tts?.clonedPersonas?.find((p: { id: string }) => p.id === activePersonaId);
  const activeAvatarUrl = segment0?.personaAvatarUrl || activePersona?.avatarUrl;

  const attires = useMemo(() => {
    return getPersonaAttires(activePersonaId, activeAvatarUrl);
  }, [activePersonaId, activeAvatarUrl]);

  const handleSelectAttire = useCallback(
    async (attire: PersonaAttire) => {
      setSelectedAttireId(attire.id);

      const leadSeg = segments.find((s) => s.index === 0) || segments[0];

      if (attire.type === "chroma_loops") {
        const bg = getStudioBackgroundById(selectedStudioBgId) || STUDIO_BACKGROUNDS[0];
        if (leadSeg) {
          onUpdateAsset?.(leadSeg.index, bg.imageUrl, "image");
          onUpdateSegmentStrategy?.(leadSeg.index, "chroma_broll");
        }

        for (const seg of segments) {
          if (seg.index !== (leadSeg ? leadSeg.index : 0)) {
            onUpdateSegmentStrategy?.(seg.index, "transparent_anchor");
          }
        }
        setSelectedModel("musetalk");
      } else if (attire.type === "in_environment") {
        if (leadSeg) {
          onUpdateSegmentStrategy?.(leadSeg.index, "in_environment");
        }
        for (const seg of segments) {
          if (seg.index !== (leadSeg ? leadSeg.index : 0)) {
            onUpdateSegmentStrategy?.(seg.index, "transparent_anchor");
          }
        }
      } else if (attire.type === "avatar_bubble") {
        for (const seg of segments) {
          onUpdateSegmentStrategy?.(seg.index, "bubble");
        }
        setSelectedModel("musetalk");
      }
    },
    [selectedStudioBgId, onUpdateAsset, onUpdateSegmentStrategy, segments]
  );

  // Sync selected attire when active persona changes
  useEffect(() => {
    if (attires.length > 0) {
      const matched = attires.find((a) => a.id === selectedAttireId);
      if (!matched) {
        setSelectedAttireId(attires[0].id);
        handleSelectAttire(attires[0]);
      }
    }
  }, [activePersonaId, attires, selectedAttireId, handleSelectAttire]);

  const handleSelectStudioBg = useCallback(
    (bg: StudioBackground) => {
      setSelectedStudioBgId(bg.id);
      setIsBgModalOpen(false);
      const leadSeg = segments.find((s) => s.index === 0) || segments[0];
      if (leadSeg) {
        onUpdateAsset?.(leadSeg.index, bg.imageUrl, "image");
        onUpdateSegmentStrategy?.(leadSeg.index, "chroma_broll");
      }
    },
    [segments, onUpdateAsset, onUpdateSegmentStrategy]
  );

  const activeScene = useMemo(() => {
    if (selectedSceneIndex !== null && selectedSceneIndex !== undefined) {
      const found = validSegments.find((s) => s.index === selectedSceneIndex);
      if (found) return found;
    }
    return validSegments[0] || null;
  }, [validSegments, selectedSceneIndex]);

  const handleSelectAttireFromPicker = useCallback(
    async (attireId: string, attireSrc: string) => {
      setSelectedAttireId(attireId);

      for (const seg of segments) {
        onUpdateSegmentAvatar?.(seg.index, attireSrc);
      }

      const isChroma =
        attireId.toLowerCase().includes("chroma") ||
        attireId.toLowerCase().includes("burgundy") ||
        attireId.toLowerCase().includes("m1") ||
        attireId.toLowerCase().includes("pose");

      if (isChroma) {
        const bg = getStudioBackgroundById(selectedStudioBgId) || STUDIO_BACKGROUNDS[0];
        const leadSeg = segments.find((s) => s.index === 0) || segments[0];
        if (leadSeg) {
          onUpdateAsset?.(leadSeg.index, bg.imageUrl, "image");
          onUpdateSegmentStrategy?.(leadSeg.index, "chroma_broll");
        }

        for (const seg of segments) {
          if (seg.index !== (leadSeg ? leadSeg.index : 0)) {
            onUpdateSegmentStrategy?.(seg.index, "transparent_anchor");
          }
        }
        setSelectedModel("musetalk");
      }
    },
    [
      segments,
      selectedStudioBgId,
      onUpdateSegmentAvatar,
      onUpdateAsset,
      onUpdateSegmentStrategy,
    ]
  );

  // Action loop updating & rerolling
  const handleUpdateActionLoop = useCallback(
    async (seg: Segment, actionLoop: string) => {
      let ms: Record<string, unknown> = {};
      try {
        if (seg.mediaSettings) ms = JSON.parse(seg.mediaSettings);
      } catch {}
      ms.actionLoop = actionLoop;
      onUpdateSegmentActionLoop?.(seg.index, actionLoop);
      try {
        await fetch(`/api/stories/${storyId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update-segment",
            segmentId: seg.id,
            mediaSettings: JSON.stringify(ms),
            actionLoop,
          }),
        });
      } catch (err) {
        console.error("Failed to update actionLoop:", err);
      }
    },
    [storyId, onUpdateSegmentActionLoop]
  );

  const handleRerollAllLoops = useCallback(
    async (passedLoops?: { id: string; type?: string }[], targetPersonaId?: string) => {
      const persona = (targetPersonaId || activePersonaId || "ruby").toLowerCase();
      let pool = passedLoops && passedLoops.length > 0 ? passedLoops.map((l) => l.id) : [];

      if (pool.length === 0) {
        try {
          const res = await fetch(`/api/action-loops?persona=${persona}`);
          if (res.ok) {
            const data = await res.json();
            const list = data?.loops || data?.items || [];
            pool = list
              .filter((l: { type?: string; id: string }) => l.type !== "transition" && !l.id.startsWith("T"))
              .map((l: { id: string }) => l.id);
          }
        } catch {}
      }

      if (pool.length === 0) {
        if (persona.includes("ruby")) {
          pool = BROADCAST_ACTION_LOOPS.filter((l) => l.category !== "Transitions").map((l) => l.id);
        } else {
          pool = [`${persona}_M1_loop_v1`];
        }
      }

      for (const seg of validSegments) {
        const candidates = pool.filter((id) => id !== seg.actionLoop);
        const chosen = candidates[Math.floor(Math.random() * candidates.length)] || pool[0];
        await handleUpdateActionLoop(seg, chosen);
      }
    },
    [validSegments, activePersonaId, handleUpdateActionLoop]
  );

  const handleRerollSingleLoop = useCallback(
    async (seg: Segment, passedLoops?: { id: string; type?: string }[], targetPersonaId?: string) => {
      const persona = (targetPersonaId || (seg as { personaId?: string }).personaId || activePersonaId || "ruby").toLowerCase();
      let pool = passedLoops && passedLoops.length > 0 ? passedLoops.map((l) => l.id) : [];

      if (pool.length === 0) {
        try {
          const res = await fetch(`/api/action-loops?persona=${persona}`);
          if (res.ok) {
            const data = await res.json();
            const list = data?.loops || data?.items || [];
            pool = list
              .filter((l: { type?: string; id: string }) => l.type !== "transition" && !l.id.startsWith("T"))
              .map((l: { id: string }) => l.id);
          }
        } catch {}
      }

      if (pool.length === 0) {
        if (persona.includes("ruby")) {
          pool = BROADCAST_ACTION_LOOPS.filter((l) => l.category !== "Transitions").map((l) => l.id);
        } else {
          pool = [`${persona}_M1_loop_v1`];
        }
      }

      const candidates = pool.filter((id) => id !== seg.actionLoop);
      const chosen = candidates[Math.floor(Math.random() * candidates.length)] || pool[0];
      await handleUpdateActionLoop(seg, chosen);
    },
    [activePersonaId, handleUpdateActionLoop]
  );

  const handleAutoSequenceAllLoops = useCallback(
    async (passedLoops?: { id: string; type?: string }[], targetPersonaId?: string) => {
      const persona = (targetPersonaId || activePersonaId || "ruby").toLowerCase();
      let pool = passedLoops && passedLoops.length > 0 ? passedLoops.map((l) => l.id) : [];

      if (pool.length === 0) {
        try {
          const res = await fetch(`/api/action-loops?persona=${persona}`);
          if (res.ok) {
            const data = await res.json();
            const list = data?.loops || data?.items || [];
            pool = list
              .filter((l: { type?: string; id: string }) => l.type !== "transition" && !l.id.startsWith("T"))
              .map((l: { id: string }) => l.id);
          }
        } catch {}
      }

      if (pool.length === 0) {
        if (persona.includes("ruby")) {
          pool = [
            "ruby_burgundy_M1_loop_v1",
            "ruby_burgundy_M2_loop_v1",
            "ruby_burgundy_M3_loop_v1",
            "ruby_burgundy_M4_loop_v1",
            "ruby_burgundy_M5_loop_v1",
          ];
        } else {
          pool = [`${persona}_M1_loop_v1`];
        }
      }

      const m1 = pool.find((id) => id.includes("M1")) || pool[0];
      const m2 = pool.find((id) => id.includes("M2")) || pool[1 % pool.length];
      const m3 = pool.find((id) => id.includes("M3")) || pool[2 % pool.length];
      const m4 = pool.find((id) => id.includes("M4")) || pool[3 % pool.length];
      const m5 = pool.find((id) => id.includes("M5")) || pool[4 % pool.length];

      const coreCycle = [m1, m2, m3, m4, m5].filter(Boolean);

      for (let i = 0; i < validSegments.length; i++) {
        const seg = validSegments[i];
        const loopId =
          i === 0
            ? m1
            : i === validSegments.length - 1 && validSegments.length > 1
            ? m5
            : coreCycle[i % coreCycle.length];

        await handleUpdateActionLoop(seg, loopId);
      }
    },
    [validSegments, activePersonaId, handleUpdateActionLoop]
  );

  return (
    <div className="h-full flex flex-col p-4 overflow-y-auto space-y-5">
      {/* 1. Header & Auto-Generate 1-Click Banner */}
      <PresenterStudioHeader
        doneCount={gen.doneCount}
        validSegmentsCount={validSegments.length}
        audioCount={gen.audioCount}
        selectedModel={selectedModel}
        isAnyGenerating={gen.isAnyGenerating}
        onGenerateAll={(force) => gen.generateAll(force)}
      />

      {/* 2. Anchor Persona, Wardrobe & Action Loops Studio */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-purple-400">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Anchor Persona, Wardrobe & Action Loops
            </span>
          </div>
          {activeScene && (
            <span className="text-[10px] font-mono text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-500/30">
              Active Scene {activeScene.index + 1}: {activeScene.actionLoop || "M1 Base"}
            </span>
          )}
        </div>

        <UltimatePersonaPicker
          compact={true}
          selectedPersonaId={activePersonaId}
          onSelectPersona={(id) => {
            onApplyPersonaToAll?.(id);
          }}
          selectedAttireId={selectedAttireId}
          onSelectAttire={(attireId, attireSrc) => {
            handleSelectAttireFromPicker(attireId, attireSrc);
          }}
          selectedActionLoopId={activeScene?.actionLoop || "ruby_burgundy_M1_loop_v1"}
          onSelectActionLoop={(loopId) => {
            if (activeScene) {
              handleUpdateActionLoop(activeScene, loopId);
            }
          }}
          onAutoSequenceLoops={handleAutoSequenceAllLoops}
          onShuffleLoops={handleRerollAllLoops}
          onShuffleActiveSceneLoop={(loops, personaId) => {
            if (activeScene) {
              handleRerollSingleLoop(activeScene, loops, personaId);
            }
          }}
          className="border-purple-500/30 shadow-xl shadow-purple-950/20"
        />

        {/* Studio Background Plate Selector (for Chroma attires) */}
        {selectedAttireId.includes("chroma") && (
          <div className="mt-3 p-3 rounded-xl bg-black/40 border border-purple-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-[11px] font-bold text-foreground">
                  Scene 1 Studio Background Plate
                </span>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="text-[10px] h-6 px-2 text-sky-300 border-sky-500/30 hover:bg-sky-500/10"
                onClick={() => setIsBgModalOpen(true)}
              >
                Change Background ▾
              </Button>
            </div>

            {/* Current Background Plate Preview */}
            {(() => {
              const bg = getStudioBackgroundById(selectedStudioBgId) || STUDIO_BACKGROUNDS[0];
              return (
                <div className="flex items-center gap-3 p-2 rounded-lg bg-surface/60 border border-border/60">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={bg.imageUrl}
                    alt={bg.name}
                    className="w-20 h-12 object-cover rounded-lg border border-border/80 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground truncate">{bg.name}</span>
                      <span className="text-[8px] font-mono text-muted bg-white/5 px-1 py-0.5 rounded">
                        {bg.category}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted truncate mt-0.5">{bg.description}</p>
                  </div>
                </div>
              );
            })()}

            <p className="text-[10px] text-muted-foreground/80 italic">
              ✨ <strong>Scene 1</strong> anchors inside this 3D studio background plate.{" "}
              <strong>Scenes 2+</strong> are rendered transparently over scene B-Roll using our
              WebGL shader.
            </p>
          </div>
        )}

        {isBgModalOpen && (
          <StudioBackgroundSelectorModal
            isOpen={isBgModalOpen}
            onClose={() => setIsBgModalOpen(false)}
            selectedBgId={selectedStudioBgId}
            isChromaEnabled={true}
            onSelectBg={handleSelectStudioBg}
            onToggleChroma={() => {}}
          />
        )}
      </div>

      {/* 3. Server Health Badges */}
      <PresenterServerStatus
        selectedModel={selectedModel}
        musetalkOnline={health.musetalkOnline}
        isCheckingMuse={health.isCheckingMuse}
        checkMuse={health.checkMuse}
        sadtalkerOnline={health.sadtalkerOnline}
        isCheckingSad={health.isCheckingSad}
        checkSad={health.checkSad}
        startSad={health.startSad}
        stopSad={health.stopSad}
        comfyOnline={health.comfyOnline}
        isCheckingComfy={health.isCheckingComfy}
        checkComfy={health.checkComfy}
        startComfy={health.startComfy}
        stopComfy={health.stopComfy}
      />

      {/* 4. Lip-Sync & Video Engine Model Selector */}
      <PresenterEngineSelector
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
      />

      {/* 5. Progress Summary */}
      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-raised border border-border">
        <span className="text-[10px] text-muted">
          {gen.doneCount}/{validSegments.length} scenes rendered
        </span>
        <div className="flex items-center gap-2">
          {gen.doneCount > 0 && (
            <button
              onClick={gen.presenterCache.clearAll}
              className="text-[9px] text-muted hover:text-red-400 transition-colors cursor-pointer"
            >
              clear all cache
            </button>
          )}
        </div>
      </div>

      {/* 6. Per-Scene List */}
      <div className="p-4 rounded-xl bg-surface-raised border border-border space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase text-muted">Scenes</p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleRerollAllLoops()}
              className="text-[9px] px-2 py-1 rounded border border-purple-500/40 text-purple-300 hover:bg-purple-500/10 font-bold uppercase transition-all cursor-pointer flex items-center gap-1"
              title="Reroll action loops for all scenes"
            >
              <span>🎲</span> Reroll Loops
            </button>
            <button
              onClick={() => gen.generateAll()}
              disabled={
                !health.isModelServerOnline(selectedModel) ||
                gen.isAnyGenerating ||
                gen.audioCount === 0
              }
              className={`text-[9px] px-2 py-1 rounded border font-bold uppercase transition-all cursor-pointer ${
                health.isModelServerOnline(selectedModel) &&
                !gen.isAnyGenerating &&
                gen.audioCount > 0
                  ? "border-purple-500/50 text-purple-300 hover:bg-purple-500/10"
                  : "border-border text-muted/40 cursor-not-allowed"
              }`}
            >
              🎬 Generate All
            </button>
          </div>
        </div>

        <div className="space-y-1 max-h-96 overflow-y-auto">
          {validSegments.map((seg) => {
            const cacheState = gen.presenterCache.getSceneState(seg.id);
            const isGenerating = gen.generatingIds.has(seg.id);
            const isGeneratingImage = gen.generatingImages.has(seg.id);
            const isExpanded = expandedVideoId === seg.id;
            const error = gen.errors[seg.id];
            const message = gen.generationMessages[seg.id];
            const isSelected = selectedSceneIndex === seg.index;

            return (
              <PresenterSceneRow
                key={seg.id}
                seg={seg}
                totalSegments={validSegments.length}
                isSelected={isSelected}
                selectedModel={selectedModel}
                activePersonaId={activePersonaId}
                isOnline={health.isModelServerOnline(selectedModel)}
                isGenerating={isGenerating}
                isGeneratingImage={isGeneratingImage}
                cacheState={cacheState}
                isExpanded={isExpanded}
                error={error}
                message={message}
                tts={tts}
                onSelectScene={() => onSelectScene?.(seg.index)}
                onUpdateAvatar={(url) => onUpdateSegmentAvatar(seg.index, url)}
                onUpdatePersona={(pId) => onUpdateSegmentPersona?.(seg.index, pId)}
                onDownloadAudio={() =>
                  gen.handleDownload(seg.audioPath!, `scene-${seg.index + 1}-audio.wav`)
                }
                onDownloadVideo={() =>
                  gen.handleDownload(
                    cacheState.videoUrl!,
                    `scene-${seg.index + 1}-presenter.mp4`
                  )
                }
                onToggleExpand={() => setExpandedVideoId(isExpanded ? null : seg.id)}
                onDeleteVideo={() => {
                  gen.presenterCache.deleteVideo(seg.id);
                  onDeletePresenterVideo?.(seg.id);
                }}
                onGenerateImage={() => gen.generateImageOnly(seg)}
                onGenerateVideo={() => gen.generateScene(seg)}
                onUpdateActionLoop={(loopId) => handleUpdateActionLoop(seg, loopId)}
                onRerollLoop={() => handleRerollSingleLoop(seg)}
                onTestLipSync={() => setTestLipSyncSegment(seg)}
              />
            );
          })}

          {validSegments.length === 0 && (
            <p className="text-[10px] text-muted text-center py-4 italic">
              No scenes found. Generate a script first.
            </p>
          )}
        </div>
      </div>

      {/* 7. Footer Info */}
      <div className="p-3 rounded-xl border border-dashed border-purple-500/20 bg-purple-500/3 space-y-1.5">
        <p className="text-[9px] font-bold text-purple-400/60 uppercase tracking-wider">
          How it works
        </p>
        <p className="text-[9px] text-muted leading-relaxed">
          Each scene generates a lip-synced video of the presenter avatar using InfiniteTalk (via
          ComfyUI) or MuseTalk (real-time). Videos are cached in your browser and used in the final
          Remotion render.
        </p>
      </div>

      {/* 8. Real-time Lip-Sync Preview Modal */}
      {testLipSyncSegment && (
        <RealtimeLipSyncPreviewModal
          isOpen={!!testLipSyncSegment}
          onClose={() => setTestLipSyncSegment(null)}
          segment={{
            index: testLipSyncSegment.index,
            text: testLipSyncSegment.text,
            spokenText: testLipSyncSegment.spokenText,
            audioPath: testLipSyncSegment.audioPath,
            personaId: testLipSyncSegment.personaId,
            actionLoop: testLipSyncSegment.actionLoop,
          }}
          storyId={storyId}
          tts={tts}
        />
      )}
    </div>
  );
}

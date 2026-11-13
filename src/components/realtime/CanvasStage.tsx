import React from "react";
import { PersonaLoopConfig } from "./types";

export interface PlannedNodePreview {
  beatIndex: number;
  code: string;
  label: string;
  tier: "tier1_ambient_idle" | "tier2_micro_beat" | "tier3_macro_action" | string;
  camera: "cam1_wide" | "cam2_left" | "cam3_closeup" | string;
  cueTag?: string;
  durationSec?: number;
}

interface CanvasStageProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  selectedPersona: PersonaLoopConfig;
  isSpeaking: boolean;
  isCueing: boolean;
  activeBeatIndex: number;
  currentLoopName: string;
  activeTier?: "tier1_ambient_idle" | "tier2_micro_beat" | "tier3_macro_action";
  activeCamera?: "cam1_wide" | "cam2_left" | "cam3_closeup";
  activeCueTag?: string;
  activeBuffer: "A" | "B";
  boundaryCountdown: number;
  frameIdx: number;
  volume: number;
  isMuted: boolean;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  recordedVideoUrl: string | null;
  recordedBlobSizeMb: string;
  onDownloadRecordedVideo: () => void;
  plannedNodes?: PlannedNodePreview[];
}

export const CanvasStage: React.FC<CanvasStageProps> = ({
  canvasRef,
  selectedPersona,
  isSpeaking,
  isCueing,
  activeBeatIndex,
  currentLoopName,
  activeTier = "tier1_ambient_idle",
  activeCamera = "cam1_wide",
  activeCueTag,
  activeBuffer,
  boundaryCountdown,
  frameIdx,
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
  recordedVideoUrl,
  recordedBlobSizeMb,
  onDownloadRecordedVideo,
  plannedNodes = [],
}) => {
  const loopTotalFrames = Math.round((selectedPersona.motionBeats[0]?.durationSec || 4.0) * 24);

  return (
    <div className="flex-1 min-w-0 relative flex flex-col items-center justify-center p-3 lg:p-4 bg-black/40">
      {/* Canvas Display Container */}
      <div className="relative w-full max-w-sm lg:max-w-md aspect-[9/16] max-h-[75vh] rounded-2xl overflow-hidden border border-cyan-500/30 bg-black shadow-[0_0_50px_rgba(0,240,255,0.1)] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={544}
          height={960}
          className="w-full h-full object-contain"
        />

        {/* Top-Left Live Status & Motion Tier Badge */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 z-20">
          <div className="flex items-center gap-2 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isSpeaking
                  ? "bg-purple-500 animate-pulse shadow-[0_0_8px_#a855f7]"
                  : isCueing
                  ? "bg-amber-400 animate-ping"
                  : "bg-emerald-500 shadow-[0_0_8px_#10b981]"
              }`}
            />
            <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-gray-200">
              {isSpeaking
                ? `👄 ${selectedPersona.name.toUpperCase()} (BEAT ${activeBeatIndex + 1})`
                : isCueing
                ? "⏳ CUEING AT BOUNDARY..."
                : `● ${selectedPersona.name.toUpperCase()} (IDLE LOOP)`}
            </span>
          </div>

          {/* Active Motion Tier & Camera Cue Badges */}
          {isSpeaking && (
            <div className="flex items-center gap-1.5">
              <span
                className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase border ${
                  activeTier === "tier3_macro_action"
                    ? "bg-amber-950/80 border-amber-500 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                    : activeTier === "tier2_micro_beat"
                    ? "bg-sky-950/80 border-sky-500 text-sky-300 shadow-[0_0_8px_rgba(14,165,233,0.3)]"
                    : "bg-emerald-950/80 border-emerald-500 text-emerald-300"
                }`}
              >
                {activeTier === "tier3_macro_action"
                  ? "⚡ TIER 3: MACRO"
                  : activeTier === "tier2_micro_beat"
                  ? "🎯 TIER 2: MICRO"
                  : "🌿 TIER 1: AMBIENT"}
              </span>

              <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase bg-black/70 border border-white/20 text-gray-300">
                🎥 {activeCamera === "cam3_closeup" ? "CAM 3 CLOSE" : activeCamera === "cam2_left" ? "CAM 2 ANALYSIS" : "CAM 1 WIDE"}
              </span>

              {activeCueTag && (
                <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-black uppercase bg-purple-950/90 border border-purple-400 text-purple-200 animate-pulse">
                  🏷️ [{activeCueTag}]
                </span>
              )}
            </div>
          )}
        </div>

        {/* Top-Right Live Volume Controls */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/15 z-20 shadow-lg group">
          <button
            onClick={onToggleMute}
            title={isMuted ? "Unmute Audio" : "Mute Audio"}
            className="text-gray-300 hover:text-cyan-400 text-xs transition-colors p-0.5 cursor-pointer"
          >
            {isMuted || volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-14 sm:w-16 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
          />
          <span className="text-[10px] font-mono font-bold text-cyan-400 min-w-[24px] text-right">
            {Math.round((isMuted ? 0 : volume) * 100)}%
          </span>
        </div>

        {/* Bottom Live FSM & Audio Progress Bar */}
        <div className="absolute bottom-3 left-3 right-3 bg-black/75 backdrop-blur-md p-2.5 rounded-xl border border-white/15 z-20 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-gray-300 truncate max-w-[140px]">
              Beat: <strong className="text-purple-400">{currentLoopName}</strong>
            </span>
            <span className="text-gray-400">
              Buffer: <strong className="text-emerald-400">{activeBuffer === "A" ? "Buffer A" : "Buffer B"}</strong>
            </span>
            <span className="text-gray-400">
              Boundary: <strong className="text-amber-400">{boundaryCountdown}f</strong>
            </span>
          </div>

          {/* Loop Timeline Bar */}
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden flex">
            <div
              className={`h-full transition-all duration-75 ${
                isSpeaking ? "bg-purple-500" : isCueing ? "bg-amber-400" : "bg-cyan-400"
              }`}
              style={{ width: `${((frameIdx % loopTotalFrames) / loopTotalFrames) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Live Multi-Video Motion Beat Sequence Progression HUD */}
      {isSpeaking && (
        <div className="mt-2.5 w-full max-w-sm lg:max-w-md bg-gradient-to-r from-purple-950/90 via-indigo-950/90 to-cyan-950/90 border border-purple-500/40 rounded-xl p-2.5 flex flex-col gap-1.5 shadow-xl animate-in fade-in">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-purple-300 font-bold flex items-center gap-1.5">
              <span className="animate-spin text-cyan-400">🎬</span>
              <span>Active Beat: {activeBeatIndex + 1}/{plannedNodes.length || selectedPersona.motionBeats.length}</span>
            </span>
            <span className="text-emerald-300 font-bold font-mono text-[9px] flex items-center gap-1">
              <span>✅ 0 Jump-Cuts Locked</span>
            </span>
          </div>

          {/* Beat Step Mini-Chips */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-none">
            {(plannedNodes.length > 0 ? plannedNodes : selectedPersona.motionBeats.map((b, i) => ({
              beatIndex: i,
              code: b.code,
              label: b.name,
              tier: "tier1_ambient_idle",
              camera: "cam1_wide",
              durationSec: b.durationSec,
            }))).map((node, idx) => (
              <div
                key={`${node.code}_${idx}`}
                className={`flex-1 min-w-[56px] p-1 rounded-lg border text-center font-mono transition-all ${
                  activeBeatIndex === idx
                    ? "bg-purple-500 border-white text-white font-bold shadow-[0_0_10px_#a855f7] scale-105"
                    : activeBeatIndex > idx
                    ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                    : "bg-black/40 border-white/10 text-gray-400"
                }`}
              >
                <div className="text-[8px] truncate font-bold">
                  {'cueTag' in node && node.cueTag ? `[${(node as { cueTag?: string }).cueTag}]` : node.code.replace(/^(RUBY_|P0\d_)/, "")}
                </div>

                <div className="text-[7px] text-gray-300 flex items-center justify-center gap-0.5">
                  <span>{((node.durationSec || 4.0) * idx).toFixed(1)}s</span>
                  {node.tier === "tier3_macro_action" && <span>⚡</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Finished Video Download Banner */}
      {recordedVideoUrl && (
        <div className="mt-3 w-full max-w-sm lg:max-w-md bg-gradient-to-r from-emerald-950/90 via-teal-950/90 to-cyan-950/90 border border-emerald-500/50 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-2xl shadow-emerald-950/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl shrink-0">🎬</span>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-emerald-200 truncate">Lip-Sync Video Captured</span>
              <span className="text-[10px] font-mono text-gray-300">Canvas Output • {recordedBlobSizeMb} MB</span>
            </div>
          </div>
          <button
            onClick={onDownloadRecordedVideo}
            className="shrink-0 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/60 cursor-pointer transform hover:scale-105 transition-all"
          >
            <span>📥</span>
            <span>DOWNLOAD CLIP</span>
          </button>
        </div>
      )}
    </div>
  );
};

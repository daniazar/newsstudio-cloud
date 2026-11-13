"use client";

import { ChoreographedBeatNode } from "@/lib/video/loopSelectorTypes";
import { ArrowRight,CheckCircle2,Film } from "lucide-react";
import React from "react";

interface FsmTimelineStripProps {
  sequence: ChoreographedBeatNode[];
  activeBeatIndex: number;
  currentTimeSec: number;
  totalDurationSec: number;
  onSeekBeat: (beatIndex: number) => void;
  isPlaying: boolean;
}

export const FsmTimelineStrip: React.FC<FsmTimelineStripProps> = ({
  sequence,
  activeBeatIndex,
  currentTimeSec,
  totalDurationSec,
  onSeekBeat,
  isPlaying,
}) => {
  if (!sequence || sequence.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 p-3 bg-neutral-950/80 rounded-xl border border-neutral-800 backdrop-blur-md">
      {/* Header telemetry */}
      <div className="flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center gap-2">
          <Film className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-white">Auto FSM Broadcast Sequence</span>
          <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/40 text-cyan-300 text-[10px]">
            {sequence.length} Beats
          </span>
        </div>

        <div className="flex items-center gap-3 text-neutral-400">
          <span>
            Beat <strong className="text-white">{activeBeatIndex + 1}</strong> of {sequence.length}
          </span>
          <span className="text-neutral-600">•</span>
          <span>
            {currentTimeSec.toFixed(1)}s / {totalDurationSec.toFixed(1)}s
          </span>
        </div>
      </div>

      {/* Nodes Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5 overflow-x-auto py-1">
        {sequence.map((node, idx) => {
          const isActive = idx === activeBeatIndex;
          const isPassed = currentTimeSec > node.endTimeSec;
          const isTransition = node.transitionType === "flf_pose_transition";

          // Calculate local beat progress (0 to 100%)
          let beatProgress = 0;
          if (isActive) {
            const beatElapsed = Math.max(0, currentTimeSec - node.startTimeSec);
            beatProgress = Math.min(100, Math.max(0, (beatElapsed / node.durationSec) * 100));
          } else if (isPassed) {
            beatProgress = 100;
          }

          // Format pose label
          const poseCode = node.startPose.replace(/^P0?/, "M").replace(/_.*$/, "");
          const endCode = node.endPose.replace(/^P0?/, "M").replace(/_.*$/, "");
          const label = isTransition ? `${poseCode} → ${endCode}` : poseCode;

          return (
            <button
              key={`fsm-beat-${node.beatIndex}`}
              onClick={() => onSeekBeat(idx)}
              className={`relative flex flex-col p-2 rounded-lg text-left transition-all overflow-hidden border ${
                isActive
                  ? "bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-500/10"
                  : isPassed
                  ? "bg-neutral-900/40 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                  : "bg-neutral-950/40 border-neutral-800/60 text-neutral-500 hover:border-neutral-700"
              }`}
            >
              {/* Progress fill bar */}
              <div
                className={`absolute bottom-0 left-0 h-0.5 transition-all duration-150 ${
                  isActive ? "bg-cyan-400" : isPassed ? "bg-emerald-500/50" : "bg-neutral-800"
                }`}
                style={{ width: `${beatProgress}%` }}
              />

              <div className="flex items-center justify-between w-full mb-1">
                <span
                  className={`text-[9px] font-mono px-1 py-0.2 rounded font-bold ${
                    isActive
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : isTransition
                      ? "bg-purple-950/60 text-purple-300 border border-purple-800/40"
                      : "bg-neutral-800/80 text-neutral-400"
                  }`}
                >
                  {isTransition ? "TRANS" : "BEAT"} #{node.beatIndex + 1}
                </span>

                {isActive && isPlaying && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                )}
                {isPassed && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500/70" />}
              </div>

              <div className="flex items-center gap-1 font-bold text-xs truncate">
                <span className={isActive ? "text-white" : isPassed ? "text-neutral-300" : "text-neutral-400"}>
                  {label}
                </span>
                {isTransition && <ArrowRight className="w-2.5 h-2.5 text-purple-400 shrink-0" />}
              </div>

              <span className="text-[10px] text-neutral-400 font-mono mt-0.5">
                {node.startTimeSec.toFixed(1)}s - {node.endTimeSec.toFixed(1)}s
              </span>

              <span className="text-[9px] text-neutral-500 truncate mt-0.5 capitalize">
                {node.actionStateLabel || node.actionStateId.replace(/^state_/, "").replace(/_/g, " ")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

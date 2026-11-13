/**
 * src/components/editor/shared/visuals/components/turntableStudio/TurntableMotionSection.tsx
 *
 * Kinematics & Quality Controls for Turntable Studio:
 * 1) Motion Presets (60° Hero Arc, 180° Turnaround, 360° Loop)
 * 2) Step Acceleration Mode (TaoMate 2-Step ⚡ vs TaoMate 3-Step 💎)
 * 3) Production Prompt Editor with Reset & Rigid Body Lock indicators
 */

import React from "react";
import {
  RotateCw,
  Zap,
  Gem,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Camera,
  Eye,
  ArrowDownRight,
  ArrowUpRight,
  Maximize,
} from "lucide-react";
import {
  TurntableEngine,
  TurntableMotionPreset,
  TurntableStepMode,
  TurntableCameraElevation,
} from "@/lib/types/ecommerce";
import {
  TURNTABLE_MOTION_PRESETS,
  TURNTABLE_CAMERA_ELEVATIONS,
} from "@/lib/ecommerce/turntablePromptCompiler";

interface TurntableMotionSectionProps {
  engine: TurntableEngine;
  motionPreset: TurntableMotionPreset;
  onSelectMotionPreset: (preset: TurntableMotionPreset) => void;
  cameraElevation?: TurntableCameraElevation;
  onSelectCameraElevation?: (elevation: TurntableCameraElevation) => void;
  stepMode: TurntableStepMode;
  onSelectStepMode: (step: TurntableStepMode) => void;
  turntablePrompt: string;
  setTurntablePrompt: React.Dispatch<React.SetStateAction<string>>;
  isUserDirtyRef: React.MutableRefObject<boolean>;
  onResetToCompiledPrompt: () => void;
}

export function TurntableMotionSection({
  engine,
  motionPreset,
  onSelectMotionPreset,
  cameraElevation = "eye_level",
  onSelectCameraElevation,
  stepMode,
  onSelectStepMode,
  turntablePrompt,
  setTurntablePrompt,
  isUserDirtyRef,
  onResetToCompiledPrompt,
}: TurntableMotionSectionProps) {
  return (
    <div className="space-y-3 p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800/90 shadow-sm">
      {/* 1. Motion Kinematics Presets */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <RotateCw className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-[11px] font-bold text-zinc-200 uppercase tracking-wider">
              4. Camera & Rotational Kinematics
            </span>
          </div>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
            {motionPreset}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 pt-0.5">
          {TURNTABLE_MOTION_PRESETS.map((m) => {
            const isSelected = motionPreset === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelectMotionPreset(m.id)}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "border-cyan-500 bg-cyan-500/15 text-white shadow-sm shadow-cyan-950/40"
                    : "border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800/70 text-zinc-300"
                }`}
                title={m.description}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-black/60 border border-zinc-700 text-cyan-300">
                    {m.angularExtent}
                  </span>
                  <span className="text-[8px] font-bold text-zinc-400 uppercase">
                    {m.badge}
                  </span>
                </div>
                <div className="text-[10.5px] font-bold leading-tight">{m.label}</div>
                <div className="text-[8.5px] text-zinc-400 leading-tight mt-0.5 line-clamp-1">
                  {m.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1b. Director Camera Perspective & Elevation */}
      <div className="space-y-1.5 pt-1 border-t border-zinc-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Camera className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-[11px] font-bold text-zinc-200 uppercase tracking-wider">
              Director Camera Elevation & Angle
            </span>
          </div>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-cyan-300 border border-zinc-700">
            {cameraElevation}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5 pt-0.5">
          {TURNTABLE_CAMERA_ELEVATIONS.map((c) => {
            const isSelected = cameraElevation === c.id;
            const Icon =
              c.id === "eye_level"
                ? Eye
                : c.id === "high_angle_35"
                ? ArrowDownRight
                : c.id === "low_angle_hero"
                ? ArrowUpRight
                : Maximize;

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectCameraElevation?.(c.id)}
                className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "border-cyan-500 bg-cyan-500/15 text-white shadow-sm shadow-cyan-950/40"
                    : "border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800/70 text-zinc-300"
                }`}
                title={c.description}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div
                    className={`p-1 rounded ${
                      isSelected ? "bg-cyan-500 text-black" : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                  </div>
                  <span className="text-[8.5px] font-mono font-bold px-1 py-0.2 rounded bg-black/60 border border-zinc-700 text-cyan-300">
                    {c.pitchDeg}
                  </span>
                </div>
                <div className="text-[10px] font-bold leading-tight truncate">{c.label}</div>
                <div className="text-[8px] text-zinc-400 leading-tight mt-0.5 line-clamp-1">
                  {c.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Step Mode (MiniMax H3) vs Cloud Mode (Veo 3.1) */}
      <div className="space-y-1.5 pt-1 border-t border-zinc-800/80">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-zinc-300 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-cyan-400" />
            <span>Diffusion Quality & Acceleration Profile</span>
          </span>
          {engine === "minimax_h3" ? (
            <span className="text-[8.5px] font-mono text-zinc-400">
              TaoMate Step Distillation
            </span>
          ) : (
            <span className="text-[8.5px] font-mono text-emerald-400 font-bold">
              Google Flow Cluster (8s · 30fps)
            </span>
          )}
        </div>

        {engine === "minimax_h3" ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onSelectStepMode("tao_2step")}
              className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex items-start gap-2 ${
                stepMode === "tao_2step"
                  ? "border-cyan-500 bg-cyan-500/15 text-white shadow-sm"
                  : "border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800/70 text-zinc-400"
              }`}
            >
              <div
                className={`p-1.5 rounded-md mt-0.5 ${
                  stepMode === "tao_2step" ? "bg-cyan-500 text-black" : "bg-zinc-800 text-zinc-400"
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10.5px] font-bold flex items-center gap-1">
                  <span>TaoMate 2-Step Turbo</span>
                  <span className="text-[8px] bg-cyan-500/30 text-cyan-200 px-1 rounded font-mono">
                    ⚡ 3.9m
                  </span>
                </div>
                <div className="text-[8.5px] text-zinc-400 leading-tight mt-0.5">
                  Ultra-fast, strict camera locking, rigid surface planarity.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onSelectStepMode("tao_3step")}
              className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex items-start gap-2 ${
                stepMode === "tao_3step"
                  ? "border-cyan-500 bg-cyan-500/15 text-white shadow-sm"
                  : "border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800/70 text-zinc-400"
              }`}
            >
              <div
                className={`p-1.5 rounded-md mt-0.5 ${
                  stepMode === "tao_3step" ? "bg-cyan-500 text-black" : "bg-zinc-800 text-zinc-400"
                }`}
              >
                <Gem className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10.5px] font-bold flex items-center gap-1">
                  <span>TaoMate 3-Step Precision</span>
                  <span className="text-[8px] bg-cyan-500/30 text-cyan-200 px-1 rounded font-mono">
                    💎 5.6m
                  </span>
                </div>
                <div className="text-[8.5px] text-zinc-400 leading-tight mt-0.5">
                  Finer caustic lighting, liquid clarity, and glass refractions.
                </div>
              </div>
            </button>
          </div>
        ) : (
          <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-[10px] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Google Flow Ready: High-fidelity cloud video diffusion (9:16 vertical)</span>
            </div>
            <span className="font-mono font-bold text-[9px] px-2 py-0.5 bg-black/60 rounded border border-emerald-500/40">
              8s · 240 Frames
            </span>
          </div>
        )}
      </div>

      {/* 3. Compiled Production Prompt Editor */}
      <div className="space-y-1.5 pt-1 border-t border-zinc-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wide">
              Diffusion Conditioning Prompt
            </span>
            <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Monolithic Body Locked
            </span>
          </div>
          <button
            type="button"
            onClick={onResetToCompiledPrompt}
            className="text-[9.5px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition-colors"
            title="Reset prompt back to the calibrated formula"
          >
            <RotateCcw className="h-2.5 w-2.5" />
            <span>Reset to Calibrated</span>
          </button>
        </div>

        <textarea
          rows={3}
          value={turntablePrompt}
          onChange={(e) => {
            isUserDirtyRef.current = true;
            setTurntablePrompt(e.target.value);
          }}
          className="w-full text-[10.5px] font-mono leading-relaxed bg-black/90 border border-zinc-800 hover:border-zinc-700 focus:border-cyan-500/50 rounded-lg p-2.5 text-zinc-300 focus:outline-none custom-scrollbar"
        />
      </div>
    </div>
  );
}

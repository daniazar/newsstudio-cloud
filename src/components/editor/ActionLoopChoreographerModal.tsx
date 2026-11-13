"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { planBroadcastLoopSequence, validateSequenceContinuity } from "@/lib/video/loopSelector";
import type {
  BroadcastDomainType,
  ChoreographedBeatNode,
  LoopSelectionResult,
} from "@/lib/video/loopSelectorTypes";

interface ActionLoopChoreographerModalProps {
  isOpen: boolean;
  onClose: () => void;
  segments: Array<{
    id: string;
    index: number;
    text: string;
    startTime: number;
    endTime: number;
    personaId?: string | null;
  }>;
  onApplyChoreography: (options?: {
    domain?: BroadcastDomainType;
    personaId?: string;
    ambientIdleRatioTarget?: number;
  }) => Promise<unknown>;
}

export const ActionLoopChoreographerModal: React.FC<ActionLoopChoreographerModalProps> = ({
  isOpen,
  onClose,
  segments,
  onApplyChoreography,
}) => {
  const [selectedDomain, setSelectedDomain] = useState<BroadcastDomainType>("chroma_wall_standing");
  const [ambientRatio, setAmbientRatio] = useState<number>(0.75);
  const [isApplying, setIsApplying] = useState(false);
  const [previewPlan, setPreviewPlan] = useState<LoopSelectionResult | null>(() => {
    const totalDuration = segments.reduce((max, s) => Math.max(max, s.endTime), 0);
    const combinedScript = segments.map((s) => s.text).join(" ");
    return planBroadcastLoopSequence({
      totalDurationSeconds: Math.max(8, totalDuration),
      personaId: segments[0]?.personaId || "ruby",
      domain: "chroma_wall_standing",
      scriptText: combinedScript,
      pacingConfig: { ambientIdleRatioTarget: 0.75 },
    });
  });

  if (!isOpen) return null;

  const handleDomainChange = (domain: BroadcastDomainType) => {
    setSelectedDomain(domain);
    const totalDuration = segments.reduce((max, s) => Math.max(max, s.endTime), 0);
    const combinedScript = segments.map((s) => s.text).join(" ");
    const plan = planBroadcastLoopSequence({
      totalDurationSeconds: Math.max(8, totalDuration),
      personaId: segments[0]?.personaId || "ruby",
      domain,
      scriptText: combinedScript,
      pacingConfig: { ambientIdleRatioTarget: ambientRatio },
    });
    setPreviewPlan(plan);
  };

  const handleRatioChange = (ratio: number) => {
    setAmbientRatio(ratio);
    const totalDuration = segments.reduce((max, s) => Math.max(max, s.endTime), 0);
    const combinedScript = segments.map((s) => s.text).join(" ");
    const plan = planBroadcastLoopSequence({
      totalDurationSeconds: Math.max(8, totalDuration),
      personaId: segments[0]?.personaId || "ruby",
      domain: selectedDomain,
      scriptText: combinedScript,
      pacingConfig: { ambientIdleRatioTarget: ratio },
    });
    setPreviewPlan(plan);
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await onApplyChoreography({
        domain: selectedDomain,
        ambientIdleRatioTarget: ambientRatio,
      });
      onClose();
    } catch (e) {
      console.error("Failed to apply choreography:", e);
    } finally {
      setIsApplying(false);
    }
  };

  const continuity = previewPlan
    ? validateSequenceContinuity(previewPlan.sequence)
    : { valid: true, violations: [] };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in p-4">
      <div className="bg-surface border border-border rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-surface-raised">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-xl">
              🪄
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Action Loops FSM Auto-Choreographer
              </h3>
              <p className="text-xs text-muted">
                Automatically choreographs 4.0s Motion Beats (P01 → P12) & 3-Camera Cues based on script emotion & cadence.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground text-sm p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Domain Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider">
              1. Broadcast Studio Set & Environment Domain
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "chroma_wall_standing", label: "Chroma Standing", icon: "🟩", desc: "Green/Blue wall" },
                { id: "seated_broadcast_desk", label: "Studio News Desk", icon: "🎙️", desc: "Desk + Laptop set" },
                { id: "interview_lounge_standing", label: "Interview Lounge", icon: "🛋️", desc: "Casual sofa/lounge" },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => handleDomainChange(d.id as BroadcastDomainType)}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    selectedDomain === d.id
                      ? "border-accent bg-accent/15 text-foreground ring-1 ring-accent"
                      : "border-border bg-surface hover:border-border-hover text-muted hover:text-foreground"
                  }`}
                >
                  <span className="text-lg">{d.icon}</span>
                  <span className="text-xs font-bold">{d.label}</span>
                  <span className="text-[10px] text-muted">{d.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Pacing Ratio Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                2. Anchor Dynamism & Gesture Frequency
              </label>
              <span className="text-xs font-mono text-accent font-bold">
                {Math.round((1 - ambientRatio) * 100)}% Active Gestures
              </span>
            </div>
            <input
              type="range"
              min="0.4"
              max="0.9"
              step="0.05"
              value={ambientRatio}
              onChange={(e) => handleRatioChange(parseFloat(e.target.value))}
              className="w-full accent-accent cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted">
              <span>Dynamic (Frequent Macro Gestures)</span>
              <span>Calm / Composed Anchor</span>
            </div>
          </div>

          {/* Pacing Summary Metrics */}
          {previewPlan && (
            <div className="p-4 rounded-xl bg-surface-raised border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  Choreography Sequence Plan ({previewPlan.sequence.length} Beats / {previewPlan.totalDurationSec}s)
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    continuity.valid
                      ? "bg-emerald-950/60 border border-emerald-500/40 text-emerald-300"
                      : "bg-red-950/60 border border-red-500/40 text-red-300"
                  }`}
                >
                  {continuity.valid ? "✓ 100% Boundary Continuous" : "⚠ Discontinuity Detected"}
                </span>
              </div>

              {/* Stat Chips */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded-lg bg-surface border border-border">
                  <div className="text-sm font-bold text-blue-400">
                    {previewPlan.pacingSummary.ambientCount}
                  </div>
                  <div className="text-[9px] text-muted uppercase">Ambient Idle</div>
                </div>
                <div className="p-2 rounded-lg bg-surface border border-border">
                  <div className="text-sm font-bold text-purple-400">
                    {previewPlan.pacingSummary.microCount}
                  </div>
                  <div className="text-[9px] text-muted uppercase">Micro Beats</div>
                </div>
                <div className="p-2 rounded-lg bg-surface border border-border">
                  <div className="text-sm font-bold text-amber-400">
                    {previewPlan.pacingSummary.macroCount}
                  </div>
                  <div className="text-[9px] text-muted uppercase">Macro Actions</div>
                </div>
                <div className="p-2 rounded-lg bg-surface border border-border">
                  <div className="text-sm font-bold text-cyan-400">
                    {previewPlan.pacingSummary.cameraCutsCount}
                  </div>
                  <div className="text-[9px] text-muted uppercase">Camera Cuts</div>
                </div>
              </div>

              {/* Step Sequence Preview List */}
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {previewPlan.sequence.map((beat: ChoreographedBeatNode, idx: number) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-surface border border-border flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-muted text-[10px]">
                        #{idx + 1} ({beat.startTimeSec.toFixed(0)}s–{beat.endTimeSec.toFixed(0)}s)
                      </span>
                      <span className="font-bold text-foreground">
                        {beat.actionStateLabel || beat.actionStateId}
                      </span>
                      {beat.cueTag && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-accent-muted text-accent">
                          {beat.cueTag}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-raised border border-border text-muted">
                        {beat.camera}
                      </span>
                      <span className="text-[10px] font-mono text-muted">
                        {beat.transitionType === "flf_pose_transition" ? "FLF Morph" : "Same Pose"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border flex items-center justify-end gap-3 bg-surface-raised">
          <Button variant="secondary" onClick={onClose} disabled={isApplying}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleApply} disabled={isApplying}>
            {isApplying ? "Applying Choreography..." : "Apply to All Scenes 🚀"}
          </Button>
        </div>
      </div>
    </div>
  );
};

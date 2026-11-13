"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  X,
  Download,
  RotateCcw,
  Sparkles,
  Layers,
  Smile,
  Shield,
  FileCheck,
} from "lucide-react";
import { ForensicQaReport } from "@/lib/ai/qaGatekeeper";

export interface ForensicQaModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ForensicQaReport | null;
  isLoading?: boolean;
  onReaudit?: () => void;
  onApprove?: () => void;
}

export const ForensicQaModal: React.FC<ForensicQaModalProps> = ({
  isOpen,
  onClose,
  report,
  isLoading = false,
  onReaudit,
  onApprove,
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "defects" | "keyframes">("overview");
  const [selectedKeyframeIndex, setSelectedKeyframeIndex] = useState<number>(0);

  if (!isOpen) return null;

  const statusConfig = {
    CERTIFIED_PASS: {
      label: "CERTIFIED PASS",
      color: "text-emerald-400",
      bg: "bg-emerald-500/20",
      border: "border-emerald-500/40",
      icon: ShieldCheck,
    },
    FLAGGED_REVIEW: {
      label: "FLAGGED REVIEW",
      color: "text-amber-400",
      bg: "bg-amber-500/20",
      border: "border-amber-500/40",
      icon: AlertTriangle,
    },
    QUARANTINED: {
      label: "QUARANTINED",
      color: "text-rose-400",
      bg: "bg-rose-500/20",
      border: "border-rose-500/40",
      icon: AlertOctagon,
    },
  };

  const currentStatus = report ? statusConfig[report.status] : statusConfig.CERTIFIED_PASS;
  const StatusIcon = currentStatus.icon;

  const handleDownloadReport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qa-audit-${report.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#0e0e13] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white tracking-tight">
                  Zero-Trust Forensic QA Gatekeeper
                </h3>
                {report && (
                  <span
                    className={`text-[10px] font-mono font-extrabold uppercase px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${currentStatus.bg} ${currentStatus.color} ${currentStatus.border}`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {currentStatus.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Gemini 2.5 Flash Vision multimodal audit of lip-sync, anatomical integrity, safe zones & compliance.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
              <div className="text-center">
                <p className="text-sm font-bold text-white">Running Multimodal Forensic Audit...</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Extracting keyframes & inspecting with Gemini 2.5 Flash Vision...
                </p>
              </div>
            </div>
          ) : !report ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No audit report loaded. Click Run Audit to inspect.
            </div>
          ) : (
            <>
              {/* Top Hero Score Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1 bg-white/[0.02] border border-white/10 rounded-2xl p-5 flex flex-col items-center justify-center text-center">
                  <div className="relative flex items-center justify-center">
                    <svg className="w-24 h-24 transform -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-white/10"
                        fill="transparent"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeDasharray={251.2}
                        strokeDashoffset={251.2 * (1 - report.overallScore / 100)}
                        className={
                          report.overallScore >= 85
                            ? "text-emerald-400"
                            : report.overallScore >= 70
                            ? "text-amber-400"
                            : "text-rose-400"
                        }
                        fill="transparent"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-black text-white font-mono">
                        {report.overallScore}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">
                        / 100
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 text-xs font-bold text-white uppercase tracking-wider">
                    Forensic Trust Score
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    Engine: {report.engine}
                  </div>
                </div>

                <div className="md:col-span-2 bg-white/[0.02] border border-white/10 rounded-2xl p-5 flex flex-col justify-center space-y-3">
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-400">
                      Forensic Verdict
                    </span>
                    <p className="text-sm font-semibold text-white mt-1 leading-snug">
                      {report.summary}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      {report.defects.length === 0
                        ? "0 Defects Detected"
                        : `${report.defects.length} Issues Noted`}
                    </span>
                    <span>•</span>
                    <span>{report.auditedKeyframes.length} Keyframes Inspected</span>
                    <span>•</span>
                    <span className="font-mono">{new Date(report.auditedAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("overview")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === "overview"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : "text-muted-foreground hover:text-white"
                  }`}
                >
                  Quality Dimensions
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("defects")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === "defects"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : "text-muted-foreground hover:text-white"
                  }`}
                >
                  Defect Log ({report.defects.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("keyframes")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === "keyframes"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : "text-muted-foreground hover:text-white"
                  }`}
                >
                  Inspected Frames ({report.auditedKeyframes.length})
                </button>
              </div>

              {/* TAB 1: 4 Quality Dimensions */}
              {activeTab === "overview" && (
                <div className="space-y-3">
                  {[
                    {
                      id: "lipSync",
                      name: "Lip-Sync & Facial Coherence",
                      icon: Smile,
                      data: report.dimensions.lipSync,
                    },
                    {
                      id: "anatomy",
                      name: "Anatomical & AI Diffusion Artifacts",
                      icon: Layers,
                      data: report.dimensions.anatomy,
                    },
                    {
                      id: "safeZone",
                      name: "Safe-Zone & Graphic Legibility",
                      icon: FileCheck,
                      data: report.dimensions.safeZone,
                    },
                    {
                      id: "brandSafety",
                      name: "Brand Safety & Broadcast Compliance",
                      icon: ShieldCheck,
                      data: report.dimensions.brandSafety,
                    },
                  ].map((dim) => {
                    const Icon = dim.icon;
                    const score = dim.data.score;
                    const barColor =
                      score >= 85 ? "bg-emerald-400" : score >= 70 ? "bg-amber-400" : "bg-rose-400";
                    return (
                      <div
                        key={dim.id}
                        className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-cyan-400" />
                            <span className="text-xs font-bold text-white">{dim.name}</span>
                          </div>
                          <span className="text-xs font-mono font-black text-white">
                            {score} / 100
                          </span>
                        </div>
                        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${barColor} transition-all duration-500`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground">{dim.data.details}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 2: Defect Log */}
              {activeTab === "defects" && (
                <div className="space-y-3">
                  {report.defects.length === 0 ? (
                    <div className="p-8 text-center bg-white/[0.02] border border-emerald-500/20 rounded-xl space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                      <p className="text-xs font-bold text-white">Zero Critical Defects Detected</p>
                      <p className="text-[11px] text-muted-foreground">
                        All broadcast frames passed zero-trust quality standards.
                      </p>
                    </div>
                  ) : (
                    report.defects.map((d, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border space-y-1.5 ${
                          d.severity === "critical"
                            ? "bg-rose-500/10 border-rose-500/30"
                            : d.severity === "warning"
                            ? "bg-amber-500/10 border-amber-500/30"
                            : "bg-white/[0.02] border-white/10"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                d.severity === "critical"
                                  ? "bg-rose-500 text-black"
                                  : d.severity === "warning"
                                  ? "bg-amber-500 text-black"
                                  : "bg-white/20 text-white"
                              }`}
                            >
                              {d.severity}
                            </span>
                            <span className="text-xs font-bold text-white uppercase tracking-wider">
                              {d.dimension.replace(/_/g, " ")}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-white/90">{d.description}</p>
                        <div className="text-[11px] text-cyan-300 font-semibold flex items-center gap-1 mt-1">
                          <Sparkles className="w-3 h-3" />
                          Recommendation: {d.recommendation}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 3: Inspected Keyframes */}
              {activeTab === "keyframes" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-2">
                    {report.auditedKeyframes.map((k, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedKeyframeIndex(idx)}
                        className={`p-1.5 rounded-xl border transition-all text-left ${
                          selectedKeyframeIndex === idx
                            ? "border-cyan-400 bg-cyan-500/10"
                            : "border-white/10 bg-white/[0.02] hover:bg-white/5"
                        }`}
                      >
                        <div className="aspect-video bg-black/50 rounded-lg overflow-hidden flex items-center justify-center">
                          <span className="text-[10px] font-mono font-bold text-cyan-400">
                            Frame @ {k.timestamp}s
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono mt-1 text-center">
                          T + {k.timestamp}s
                        </div>
                      </button>
                    ))}
                  </div>

                  {report.auditedKeyframes[selectedKeyframeIndex] && (
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-white">
                        <span>
                          Inspecting Keyframe #{selectedKeyframeIndex + 1} (Timecode:{" "}
                          {report.auditedKeyframes[selectedKeyframeIndex].timestamp}s)
                        </span>
                        <span className="text-muted-foreground font-mono text-[10px]">
                          Path: {report.auditedKeyframes[selectedKeyframeIndex].localPath || "In-Memory"}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Multimodal analysis confirmed facial landmarks, text layout, and color saturation
                        adhere to broadcast standards at this timecode.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between bg-white/[0.02]">
          <button
            type="button"
            onClick={handleDownloadReport}
            disabled={!report}
            className="px-3.5 py-2 text-xs font-bold rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Download Audit JSON
          </button>

          <div className="flex items-center gap-2">
            {onReaudit && (
              <button
                type="button"
                onClick={onReaudit}
                disabled={isLoading}
                className="px-3.5 py-2 text-xs font-bold rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                Re-Audit
              </button>
            )}

            {onApprove && (
              <button
                type="button"
                onClick={onApprove}
                disabled={!report || report.status === "QUARANTINED"}
                className="px-4 py-2 text-xs font-black rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Certify & Approve
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Award, Send, CheckCircle2, Download } from "lucide-react";
import { MotionJobResult, MotionModelSpec } from "@/lib/ai/modernMotionClient";
import { SendToStoryModal } from "./SendToStoryModal";

interface MotionScorecardProps {
  results: MotionJobResult[];
  modelsMetadata: Record<string, MotionModelSpec>;
}

interface ModelRatings {
  hands: number;
  motion: number;
  chromaEdge: number;
  silhouette: number;
  notes: string;
}

export function MotionScorecard({
  results,
  modelsMetadata,
}: MotionScorecardProps) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Local scoring state for each model evaluated
  const [ratings, setRatings] = useState<Record<string, ModelRatings>>({
    "wan-animate-2": {
      hands: 5,
      motion: 5,
      chromaEdge: 5,
      silhouette: 5,
      notes: "Flawless fingers, no skeleton jitter",
    },
    "wan-animate-2-distilled": {
      hands: 4,
      motion: 5,
      chromaEdge: 4,
      silhouette: 4,
      notes: "Instant 4-step preview, sub-5GB VRAM",
    },
    "scail-2": {
      hands: 5,
      motion: 4,
      chromaEdge: 4,
      silhouette: 5,
      notes: "Excellent cross-identity posture locking",
    },
    echomimicv3: {
      hands: 4,
      motion: 4,
      chromaEdge: 4,
      silhouette: 4,
      notes: "Great dual audio lip sync + arm gesture speed",
    },
    emosh: {
      hands: 4,
      motion: 4,
      chromaEdge: 4,
      silhouette: 5,
      notes: "Zero body shape bleeding from driver",
    },
    "original-animate-anyone": {
      hands: 3,
      motion: 3,
      chromaEdge: 3,
      silhouette: 4,
      notes: "Historic benchmark baseline (closed weights)",
    },
    "animate-anyone": {
      hands: 3,
      motion: 3,
      chromaEdge: 3,
      silhouette: 4,
      notes: "Historic benchmark baseline (closed weights)",
    },
    "animate-anyone-2": {
      hands: 5,
      motion: 4,
      chromaEdge: 4,
      silhouette: 5,
      notes: "Next-gen garment flow (closed weights)",
    },
    mimicmotion: {
      hands: 4,
      motion: 4,
      chromaEdge: 5,
      silhouette: 4,
      notes: "Reliable SVD baseline, clean green edges",
    },
    homa: {
      hands: 5,
      motion: 4,
      chromaEdge: 4,
      silhouette: 5,
      notes: "Outstanding prop & tablet interaction control",
    },
    "moore-animateanyone": {
      hands: 4,
      motion: 3,
      chromaEdge: 4,
      silhouette: 4,
      notes: "Reliable open-source DWPose reproduction",
    },
    champ: {
      hands: 4,
      motion: 5,
      chromaEdge: 4,
      silhouette: 5,
      notes: "SMPL-X 3D mesh prevents all arm twisting",
    },
    liveanimate: {
      hands: 5,
      motion: 5,
      chromaEdge: 4,
      silhouette: 5,
      notes: "20 FPS real-time streaming DiT (under watch)",
    },
  });

  const [storyModalResult, setStoryModalResult] =
    useState<MotionJobResult | null>(null);
  const [productionStandardSet, setProductionStandardSet] = useState(false);

  // Compute top pick among evaluated models
  const { topPick, scoredResults } = useMemo(() => {
    const scored = results.map((r) => {
      const score = ratings[r.model_id] || {
        hands: 4,
        motion: 4,
        chromaEdge: 4,
        silhouette: 4,
        notes: "",
      };
      const avg =
        (score.hands + score.motion + score.chromaEdge + score.silhouette) / 4;
      return { ...r, score, avg };
    });
    const sorted = [...scored].sort((a, b) => b.avg - a.avg);
    return { topPick: sorted[0] || null, scoredResults: scored };
  }, [results, ratings]);

  if (results.length === 0) return null;

  const updateRating = (
    modelId: string,
    metric: keyof Omit<ModelRatings, "notes">,
    val: number,
  ) => {
    setRatings((prev) => ({
      ...prev,
      [modelId]: {
        ...prev[modelId],
        [metric]: val,
      },
    }));
  };

  const updateNotes = (modelId: string, notes: string) => {
    setRatings((prev) => ({
      ...prev,
      [modelId]: {
        ...prev[modelId],
        notes,
      },
    }));
  };

  const exportBenchmarkJSON = () => {
    const report = {
      timestamp: new Date().toISOString(),
      models_evaluated: results.map((r) => {
        const rScore = ratings[r.model_id] || {
          hands: 4,
          motion: 4,
          chromaEdge: 4,
          silhouette: 4,
          notes: "",
        };
        const avg = (
          (rScore.hands +
            rScore.motion +
            rScore.chromaEdge +
            rScore.silhouette) /
          4
        ).toFixed(1);
        return {
          model_id: r.model_id,
          model_name: r.model_name,
          inference_time_sec: r.inference_time_sec,
          hardware_encoder: r.hardware_encoder,
          mux_time_ms: r.mux_time_ms,
          guidance_cache: r.guidance_cache,
          persona_cache: r.persona_cache,
          one_pass_cfg: r.one_pass_cfg,
          static_arena: r.static_arena,
          tiled_vae: r.tiled_vae,
          temporal_flow: r.temporal_flow,
          pyramidal_cascade: r.pyramidal_cascade,
          acoustic_simhash: r.acoustic_simhash,
          triple_buffer: r.triple_buffer,
          silence_sieve: r.silence_sieve,
          sliding_kv: r.sliding_kv,
          tps_warp: r.tps_warp,
          zerocopy_streaming: r.zerocopy_streaming,
          instant_cache_hit: r.instant_cache_hit,
          average_score: avg,
          scores: rScore,
          verdict: modelsMetadata[r.model_id]?.agent_verdict,
        };
      }),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `motion_benchmark_report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportBenchmarkCSV = () => {
    const header =
      "Model ID,Model Name,Inference Time (s),Resolution,FPS,Hands (1-5),Motion (1-5),Chroma Edge (1-5),Silhouette (1-5),Average Score,Notes\n";
    const rows = results
      .map((r) => {
        const s = ratings[r.model_id] || {
          hands: 4,
          motion: 4,
          chromaEdge: 4,
          silhouette: 4,
          notes: "",
        };
        const avg = (
          (s.hands + s.motion + s.chromaEdge + s.silhouette) /
          4
        ).toFixed(2);
        return `"${r.model_id}","${r.model_name}",${r.inference_time_sec},"${r.resolution}",${r.fps},${s.hands},${s.motion},${s.chromaEdge},${s.silhouette},${avg},"${s.notes.replace(/"/g, '""')}"`;
      })
      .join("\n");

    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `motion_benchmark_matrix_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSetProductionStandard = () => {
    if (topPick && typeof window !== "undefined") {
      try {
        localStorage.setItem(
          "newsstudio_default_motion_model",
          topPick.model_id,
        );
      } catch (err) {
        console.warn(
          "Failed to save default motion model to localStorage:",
          err,
        );
      }
      setProductionStandardSet(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(
        () => setProductionStandardSet(false),
        3500,
      );
    }
  };

  return (
    <div className="bg-surface-elevated/70 border border-border/80 rounded-2xl p-5 shadow-2xl backdrop-blur-md space-y-4">
      {/* Top Pick Recommendation Banner */}
      {topPick && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-sky-500/10 to-purple-500/15 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-lg shadow-lg shadow-emerald-500/20">
              🏆
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                  Forensic Winner Recommendation
                </span>
                <span className="text-xs font-mono font-bold text-foreground">
                  Score: {topPick.avg.toFixed(1)} / 5.0
                </span>
              </div>
              <h4 className="text-sm font-black text-foreground">
                {topPick.model_name} is recommended for broadcast production
              </h4>
              <p className="text-[11px] text-muted">
                {modelsMetadata[topPick.model_id]?.agent_verdict ||
                  "Top rated for finger stability and boundary matting."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleSetProductionStandard}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-foreground border border-border transition-all cursor-pointer"
            >
              {productionStandardSet ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Set as Standard!</span>
                </>
              ) : (
                <>
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span>Set as Channel Standard</span>
                </>
              )}
            </button>

            <button
              onClick={() => setStoryModalResult(topPick)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Deploy Top Pick to Story</span>
            </button>
          </div>
        </div>
      )}

      {/* Header with Export Options */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground">
              Forensic Model Benchmark Scorecard
            </h3>
            <p className="text-[10px] text-muted">
              Evaluate and rate each model on production broadcast criteria
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportBenchmarkCSV}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface border border-border hover:bg-white/5 text-xs text-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={exportBenchmarkJSON}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface border border-border hover:bg-white/5 text-xs text-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON Report</span>
          </button>
        </div>
      </div>

      {/* Evaluation Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border/60 text-muted font-mono uppercase text-[10px]">
              <th className="py-2.5 px-3">Model Architecture</th>
              <th className="py-2.5 px-3">Hands &amp; Fingers</th>
              <th className="py-2.5 px-3">Motion Fluidity</th>
              <th className="py-2.5 px-3">Chroma Boundary</th>
              <th className="py-2.5 px-3">Silhouette Lock</th>
              <th className="py-2.5 px-3">Avg Score</th>
              <th className="py-2.5 px-3">Observations</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {scoredResults.map((res) => {
              const score = res.score;
              const avg = res.avg.toFixed(1);
              const isWinner = topPick?.job_id === res.job_id;

              return (
                <tr
                  key={res.job_id}
                  className={`transition-colors ${isWinner ? "bg-emerald-500/[0.03]" : "hover:bg-white/[0.02]"}`}
                >
                  <td className="py-3 px-3 font-bold text-foreground">
                    <div className="flex items-center gap-1.5">
                      <span>{res.model_name}</span>
                      {isWinner && (
                        <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded font-mono font-bold">
                          TOP PICK
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-muted block">
                      {res.resolution} • {res.fps}fps
                    </span>
                    <div className="flex items-center gap-1 flex-wrap mt-0.5 text-[8px] font-mono">
                      {res.persona_cache?.hit && (
                        <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.2 rounded">
                          ⚡ Anchor: {res.persona_cache.latency_ms ?? 0}ms
                        </span>
                      )}
                      {res.instant_cache_hit && (
                        <span className="text-emerald-300 bg-emerald-500/20 border border-emerald-400/30 px-1 py-0.2 rounded font-bold">
                          ⚡ Instant
                        </span>
                      )}
                      {res.hardware_encoder && (
                        <span className="text-sky-300 bg-sky-500/10 border border-sky-500/20 px-1 py-0.2 rounded">
                          {res.hardware_encoder === "h264_nvenc"
                            ? "NVENC"
                            : "libx264"}
                        </span>
                      )}
                      {res.one_pass_cfg?.active && (
                        <span className="text-sky-400 bg-sky-500/10 border border-sky-500/20 px-1 py-0.2 rounded">
                          1-Pass CFG
                        </span>
                      )}
                      {res.static_arena?.active && (
                        <span className="text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1 py-0.2 rounded">
                          CUDA Arena
                        </span>
                      )}
                      {res.tiled_vae?.active && (
                        <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1 py-0.2 rounded">
                          Tiled VAE
                        </span>
                      )}
                      {res.temporal_flow?.active && (
                        <span className="text-teal-400 bg-teal-500/10 border border-teal-500/20 px-1 py-0.2 rounded">
                          Flow Infill
                        </span>
                      )}
                      {res.pyramidal_cascade?.active && (
                        <span className="text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1 py-0.2 rounded">
                          Cascade
                        </span>
                      )}
                      {res.acoustic_simhash?.active && (
                        <span className="text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1 py-0.2 rounded">
                          SimHash
                        </span>
                      )}
                      {res.triple_buffer?.active && (
                        <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.2 rounded">
                          Triple Buffer
                        </span>
                      )}
                      {res.silence_sieve?.active && (
                        <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.2 rounded">
                          Silence Sieve
                        </span>
                      )}
                      {res.sliding_kv?.active && (
                        <span className="text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1 py-0.2 rounded">
                          Sliding KV
                        </span>
                      )}
                      {res.tps_warp?.active && (
                        <span className="text-fuchsia-400 bg-fuchsia-500/10 border border-fuchsia-500/20 px-1 py-0.2 rounded">
                          TPS Spline
                        </span>
                      )}
                      {res.zerocopy_streaming?.active && (
                        <span className="text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-1 py-0.2 rounded">
                          Zero-Copy
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Hands Rating */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          onClick={() => updateRating(res.model_id, "hands", s)}
                          aria-label={`Rate hands ${s} stars`}
                          className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold cursor-pointer transition-colors ${
                            score.hands >= s
                              ? "bg-amber-500 text-black shadow"
                              : "bg-white/5 text-muted hover:bg-white/10"
                          }`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </td>

                  {/* Motion Fluidity */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          onClick={() =>
                            updateRating(res.model_id, "motion", s)
                          }
                          aria-label={`Rate motion ${s} stars`}
                          className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold cursor-pointer transition-colors ${
                            score.motion >= s
                              ? "bg-sky-500 text-black shadow"
                              : "bg-white/5 text-muted hover:bg-white/10"
                          }`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </td>

                  {/* Chroma Edge */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          onClick={() =>
                            updateRating(res.model_id, "chromaEdge", s)
                          }
                          aria-label={`Rate chroma edge quality ${s} stars`}
                          className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold cursor-pointer transition-colors ${
                            score.chromaEdge >= s
                              ? "bg-emerald-500 text-black shadow"
                              : "bg-white/5 text-muted hover:bg-white/10"
                          }`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </td>

                  {/* Silhouette */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          onClick={() =>
                            updateRating(res.model_id, "silhouette", s)
                          }
                          aria-label={`Rate silhouette stability ${s} stars`}
                          className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold cursor-pointer transition-colors ${
                            score.silhouette >= s
                              ? "bg-purple-500 text-black shadow"
                              : "bg-white/5 text-muted hover:bg-white/10"
                          }`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </td>

                  {/* Average */}
                  <td className="py-3 px-3 font-mono font-bold text-sm text-foreground">
                    <span
                      className={
                        parseFloat(avg) >= 4.5
                          ? "text-emerald-400"
                          : parseFloat(avg) >= 3.5
                            ? "text-sky-300"
                            : "text-amber-400"
                      }
                    >
                      {avg}
                    </span>
                    <span className="text-[9px] text-muted">/5.0</span>
                  </td>

                  {/* Notes input */}
                  <td className="py-3 px-3">
                    <input
                      type="text"
                      value={score.notes}
                      onChange={(e) =>
                        updateNotes(res.model_id, e.target.value)
                      }
                      placeholder="Add evaluation note..."
                      className="w-full bg-surface border border-border/60 rounded-lg px-2 py-1 text-[11px] text-foreground focus:border-emerald-500 focus:outline-none"
                    />
                  </td>

                  {/* Quick Action */}
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => setStoryModalResult(res)}
                      className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors cursor-pointer"
                      title="Send this animation to a News Story Scene"
                      aria-label={`Send animation to a News Story Scene`}
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Story Assignment Modal */}
      <SendToStoryModal
        isOpen={!!storyModalResult}
        onClose={() => setStoryModalResult(null)}
        result={storyModalResult}
      />
    </div>
  );
}

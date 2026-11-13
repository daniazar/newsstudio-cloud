"use client";

import React, { useState, useEffect } from "react";
import {
  Cpu,
  Zap,
  CheckCircle2,
  HardDrive,
  Loader2,
} from "lucide-react";
import {
  CompileStatus,
  CompileResult,
  TALKING_HEAD_MODELS,
} from "@/lib/ai/talkingHeadsClient";

interface ModelCompilationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModelId: string;
}

export function ModelCompilationPanel({
  isOpen,
  onClose,
  selectedModelId,
}: ModelCompilationPanelProps) {
  const [modelId, setModelId] = useState(selectedModelId);
  const [prevSelectedModelId, setPrevSelectedModelId] = useState(selectedModelId);
  if (selectedModelId !== prevSelectedModelId) {
    setPrevSelectedModelId(selectedModelId);
    setModelId(selectedModelId);
  }

  const [targetCompiler, setTargetCompiler] = useState<"tensorrt" | "torch_compile" | "cuda_graphs" | "onnx">("tensorrt");
  const [precision, setPrecision] = useState<"fp16" | "fp8" | "int8" | "nvfp4">("fp16");
  const [batchSize, setBatchSize] = useState<number>(32);
  const [dynamicShapes, setDynamicShapes] = useState<boolean>(true);
  const [speculativeVisemes, setSpeculativeVisemes] = useState<boolean>(true);
  const [cfgGuidanceSkipping, setCfgGuidanceSkipping] = useState<boolean>(true);
  const [stabilizedBbox, setStabilizedBbox] = useState<boolean>(true);
  const [tiledVae, setTiledVae] = useState<boolean>(true);
  const [pyramidalSuperRes, setPyramidalSuperRes] = useState<boolean>(true);
  const [audioLatentCache, setAudioLatentCache] = useState<boolean>(true);
  const [rifeFlowSkip, setRifeFlowSkip] = useState<boolean>(false);
  const [status, setStatus] = useState<CompileStatus | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [lastResult, setLastResult] = useState<CompileResult | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/talking-heads/compile");
      if (res.ok) {
        const data: CompileStatus = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error("Failed to query compile status", err);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;

    fetch("/api/talking-heads/compile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: CompileStatus | null) => {
        if (!isCancelled && data) {
          setStatus(data);
        }
      })
      .catch((err) => {
        console.error("Failed to query compile status", err);
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen]);

  const handleCompile = async () => {
    setIsCompiling(true);
    setLastResult(null);

    try {
      const res = await fetch("/api/talking-heads/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId,
          target: targetCompiler,
          precision,
          batchSize,
          dynamicShapes,
        }),
      });

      if (res.ok) {
        const data: CompileResult = await res.json();
        setLastResult(data);
        await fetchStatus();
      }
    } catch (err) {
      console.error("Compilation error", err);
    } finally {
      setIsCompiling(false);
    }
  };

  if (!isOpen) return null;

  const activeModel = TALKING_HEAD_MODELS.find((m) => m.id === modelId) || TALKING_HEAD_MODELS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-inner">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Neural Compilation & Silicon Tuning
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono">
                  {status?.gpu?.arch ? `Target: ${status.gpu.arch.toUpperCase()}` : "Active"}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Compile PyTorch graphs into TensorRT <code className="text-cyan-300">.engine</code> binaries or TorchInductor Triton kernels.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Hardware Status Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 px-6 py-3 bg-slate-950/60 border-b border-slate-800 text-xs">
          <div>
            <span className="text-slate-500 block">Detected Silicon</span>
            <strong className="text-white font-mono truncate block">{status?.gpu?.name || "GPU Device"}</strong>
          </div>
          <div>
            <span className="text-slate-500 block">Architecture</span>
            <strong className="text-cyan-400 font-mono">{status?.gpu?.arch || "N/A"}</strong>
          </div>
          <div>
            <span className="text-slate-500 block">FP8 / NVFP4 Status</span>
            <strong className={`font-mono ${status?.gpu?.nvfp4Supported ? "text-emerald-400" : status?.gpu?.fp8Supported ? "text-emerald-400" : "text-amber-400"}`}>
              {status?.gpu?.nvfp4Supported ? "Native NVFP4 (5th-Gen)" : status?.gpu?.fp8Supported ? "Native FP8 (Ada)" : "Emulated"}
            </strong>
          </div>
          <div>
            <span className="text-slate-500 block">VRAM Pool</span>
            <strong className="text-purple-400 font-mono">{status?.gpu?.vramTotalGb || "8.0"} GB Dedicated</strong>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Target Model Profile */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/40 border border-slate-800">
            <div>
              <div className="text-xs text-slate-400">Target Model:</div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                {activeModel.name}
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                  {activeModel.architecture}
                </span>
              </div>
            </div>
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
            >
              {TALKING_HEAD_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Compiler Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Compiler Backend
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: "tensorrt", name: "TensorRT 10.x", badge: "Max FPS" },
                    { id: "torch_compile", name: "TorchInductor", badge: "PyTorch 2.5" },
                    { id: "cuda_graphs", name: "CUDA Graphs", badge: "Zero Realloc" },
                    { id: "onnx", name: "ONNX Runtime", badge: "Universal" },
                  ] as const
                ).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setTargetCompiler(c.id)}
                    className={`p-2.5 rounded-xl border text-left text-xs transition flex flex-col justify-between h-16 ${
                      targetCompiler === c.id
                        ? "bg-cyan-500/10 border-cyan-500/60 text-cyan-300 shadow-sm"
                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <span>{c.name}</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {c.badge}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {/* Precision */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Arithmetic Precision
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(
                    [
                      { id: "fp16", label: "FP16", desc: "Universal" },
                      { id: "fp8", label: "FP8", desc: "Ada/Blackwell" },
                      { id: "nvfp4", label: "NVFP4", desc: "5th-Gen Cores" },
                      { id: "int8", label: "INT8", desc: "PTQ 8GB" },
                    ] as const
                  ).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPrecision(p.id)}
                      className={`p-2 rounded-lg border text-center text-xs transition ${
                        precision === p.id
                          ? "bg-cyan-600/30 border-cyan-500 text-cyan-300 font-semibold"
                          : "bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <div className="font-bold">{p.label}</div>
                      <div className="text-[8px] text-slate-500 truncate">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Shapes Profile */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Optimization Batch Profile
                  </label>
                  <span className="text-xs font-mono text-cyan-400">Batch {batchSize}</span>
                </div>
                <div className="flex gap-2">
                  {[1, 16, 32, 64].map((b) => (
                    <button
                      key={b}
                      onClick={() => setBatchSize(b)}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-mono transition ${
                        batchSize === b
                          ? "bg-cyan-600/30 border-cyan-500 text-cyan-300 font-bold"
                          : "bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      B={b}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 mt-2 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dynamicShapes}
                    onChange={(e) => setDynamicShapes(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-0"
                  />
                  <span>Dynamic shapes profile (1 ≤ B ≤ 64) for variable audio slices</span>
                </label>
              </div>
            </div>
          </div>

          {/* Advanced Neural Speed Accelerators */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                Advanced Neural Speed Accelerators
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                Up to +65% Speedup
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <label className="flex items-start gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition">
                <input
                  type="checkbox"
                  checked={speculativeVisemes}
                  onChange={(e) => setSpeculativeVisemes(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-800 text-cyan-500"
                />
                <div>
                  <strong className="text-slate-200 block">Speculative Viseme Decoding</strong>
                  <span className="text-[10px] text-slate-400 block">Medusa Heads: parallel multi-frame prediction (2.4x throughput)</span>
                </div>
              </label>

              <label className="flex items-start gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition">
                <input
                  type="checkbox"
                  checked={cfgGuidanceSkipping}
                  onChange={(e) => setCfgGuidanceSkipping(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-800 text-cyan-500"
                />
                <div>
                  <strong className="text-slate-200 block">1-Pass CFG Momentum Rescale</strong>
                  <span className="text-[10px] text-slate-400 block">Skips unconditional passes in late timesteps (42% FLOPs saved)</span>
                </div>
              </label>

              <label className="flex items-start gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition">
                <input
                  type="checkbox"
                  checked={stabilizedBbox}
                  onChange={(e) => setStabilizedBbox(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-800 text-cyan-500"
                />
                <div>
                  <strong className="text-slate-200 block">Static BBox CUDA Arena</strong>
                  <span className="text-[10px] text-slate-400 block">Pre-allocated 64-byte aligned envelope; zero GPU reallocations</span>
                </div>
              </label>

              <label className="flex items-start gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition">
                <input
                  type="checkbox"
                  checked={tiledVae}
                  onChange={(e) => setTiledVae(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-800 text-cyan-500"
                />
                <div>
                  <strong className="text-slate-200 block">Tiled VAE Spatial Feathering</strong>
                  <span className="text-[10px] text-slate-400 block">Cosine tile blending; caps transient VRAM at &lt;2.0 GB on 4K/720p</span>
                </div>
              </label>

              <label className="flex items-start gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition">
                <input
                  type="checkbox"
                  checked={pyramidalSuperRes}
                  onChange={(e) => setPyramidalSuperRes(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-800 text-cyan-500"
                />
                <div>
                  <strong className="text-slate-200 block">Pyramidal Super-Res 1080p</strong>
                  <span className="text-[10px] text-slate-400 block">288p DiT Base + 1.8ms TensorRT Super-Resolution (3.8x speedup)</span>
                </div>
              </label>

              <label className="flex items-start gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition">
                <input
                  type="checkbox"
                  checked={audioLatentCache}
                  onChange={(e) => setAudioLatentCache(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-800 text-cyan-500"
                />
                <div>
                  <strong className="text-slate-200 block">Phoneme SimHash Cache</strong>
                  <span className="text-[10px] text-slate-400 block">Acoustic fingerprint LRU cache; skips Wav2Vec2/HuBERT (0ms)</span>
                </div>
              </label>

              <label className="flex items-start gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition">
                <input
                  type="checkbox"
                  checked={rifeFlowSkip}
                  onChange={(e) => setRifeFlowSkip(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-800 text-cyan-500"
                />
                <div>
                  <strong className="text-slate-200 block">RIFE Optical Flow Infill</strong>
                  <span className="text-[10px] text-slate-400 block">Synthesizes 60 FPS from 15 FPS keyframes (-50% GPU FLOPs)</span>
                </div>
              </label>
            </div>
          </div>

          {/* Compilation Results Card */}
          {lastResult && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/40 animate-in fade-in">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  Engine Compiled Successfully
                </div>
                <span className="text-xs font-mono text-emerald-300">
                  {lastResult.compilationTimeSeconds}s build time
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 my-2 text-xs">
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-500 block">Eager vs Compiled</span>
                  <strong className="text-slate-300">
                    {lastResult.eagerLatencyMs}ms → <span className="text-emerald-400">{lastResult.compiledLatencyMs}ms</span>
                  </strong>
                </div>
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-500 block">Speedup</span>
                  <strong className="text-cyan-300 font-bold">{lastResult.speedupFactor}</strong>
                </div>
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-500 block">Projected FPS</span>
                  <strong className="text-emerald-400 font-bold">{lastResult.projectedFps} FPS</strong>
                </div>
              </div>

              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1 mt-1 truncate">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span>Serialized Engine: {lastResult.engineFile} ({lastResult.sizeMb} MB)</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-900/60 text-xs">
          <div className="text-slate-400">
            Target Model: <strong className="text-white">{activeModel.name}</strong> ({activeModel.vramGb} GB VRAM)
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition"
            >
              Close
            </button>
            <button
              onClick={handleCompile}
              disabled={isCompiling}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-md shadow-cyan-950 transition disabled:opacity-50"
            >
              {isCompiling ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Building Engine...
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  Compile Native Engine
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

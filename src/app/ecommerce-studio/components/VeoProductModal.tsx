"use client";

import React, { useState } from "react";
import {
  X,
  Copy,
  Check,
  Clapperboard,
  Terminal,
  Play,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { ProductSpec } from "@/lib/types/ecommerce";
import { useToast } from "@/components/global/ToastContainer";
import { pingLocalWorkerWake } from "@/lib/hooks/useLocalWorkerWake";

export interface VeoProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductSpec | null;
}

export const VeoProductModal: React.FC<VeoProductModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  const { toast } = useToast();
  const [persona, setPersona] = useState("ruby");
  const [fuseBeats, setFuseBeats] = useState(true);
  const [action, setAction] = useState("swatch_presentation");
  const [withAudio, setWithAudio] = useState(true);
  const [bgm, setBgm] = useState("luxury_commercial");
  const [sfx, setSfx] = useState("[sfx:whoosh]");
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationOutput, setGenerationOutput] = useState<{
    stdout: string;
    manifest?: Record<string, unknown> | null;
    manifestPath?: string | null;
  } | null>(null);

  if (!isOpen || !product) return null;

  const isSurface = product.typology === "surface_material";

  const cliCommand = [
    "npx tsx scripts/veo-video-cli.ts",
    "--mode=product_showcase",
    `--persona=${persona}`,
    `--product-name="${product.title.replace(/"/g, '\\"')}"`,
    `--product-category="${product.typology}"`,
    `--product-action="${action}"`,
    fuseBeats ? "--fuse" : "",
    withAudio ? "--with-audio" : "",
    `--bgm="${bgm}"`,
    `--sfx="${sfx}"`,
    product.assets?.[0]?.url ? `--product-image="${product.assets[0].url}"` : "",
    "--dry-run",
    "--non-interactive",
  ]
    .filter(Boolean)
    .join(" ");

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(cliCommand);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleRunGeneration = async () => {
    setIsGenerating(true);
    setGenerationOutput(null);

    try {
      const res = await fetch("/api/ecommerce/veo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: product.title,
          productImage: product.assets?.[0]?.url,
          productCategory: product.typology,
          productAction: action,
          personaSlug: persona,
          fuseBeats,
          withAudio,
          bgmGenre: bgm,
          sfxCue: sfx,
          dryRun: true,
        }),
      });

      const data = await res.json();
      if (data.queued && data.jobId) {
        void pingLocalWorkerWake("veo_generate");
        toast("Veo Queued", `Queued Veo job ${data.jobId} for local GPU synthesis.`, "info");
        for (let attempt = 0; attempt < 90; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 4000));
          const pollRes = await fetch(`/api/ecommerce/veo/generate?jobId=${encodeURIComponent(data.jobId)}`);
          if (!pollRes.ok) continue;
          const pollData = await pollRes.json();
          if (pollData.status === "DONE") {
            setGenerationOutput({
              stdout: typeof pollData.result === "string" ? pollData.result : JSON.stringify(pollData.result ?? {}),
              manifest: pollData.result?.manifest ?? null,
              manifestPath: pollData.result?.videoUrl ?? pollData.result?.manifestPath ?? null,
            });
            toast("Generation Completed", "Veo product scene generated successfully.", "success");
            return;
          }
          if (pollData.status === "FAILED" || pollData.status === "CANCELLED") {
            throw new Error(pollData.error || "Queued Veo job failed");
          }
        }
        throw new Error("Timed out waiting for Veo job completion");
      }
      if (data.success) {
        setGenerationOutput({
          stdout: data.stdout,
          manifest: data.manifest,
          manifestPath: data.manifestPath,
        });
        toast("Generation Completed", "Veo product scene generated successfully.", "success");
      } else {
        toast("Generation Failed", data.error || "Generation failed.", "error");
      }
    } catch (err: unknown) {
      toast("Generation Error", (err as Error).message || "Generation error", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#0e0e13] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-black font-black">
              <Clapperboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white tracking-tight">
                  Google Veo 3.1 Product Video Showcase
                </h3>
                <span className="text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Veo Action Beats
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Generate high-conversion custom product commercials featuring virtual anchors with physical interaction.
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
          {/* Product Summary Card */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-black/40 shrink-0 border border-white/10">
              {product.assets?.[0]?.url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={product.assets[0].url}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                  No Image
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {product.typology.replace(/_/g, " ")}
              </span>
              <h4 className="text-sm font-extrabold text-white mt-1 truncate">{product.title}</h4>
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{product.description}</p>
              <div className="text-xs font-mono font-bold text-white mt-1">
                {product.currency} ${product.price.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Persona Selector */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Presenter Anchor Persona</span>
              </label>
              <select
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                className="w-full bg-[#141418] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="ruby">Ruby Vance — Primary News Anchor (Studio / Luxury)</option>
                <option value="camila">Camila Santos — Lifestyle & Field Host (Argentine Spanish)</option>
                <option value="blaze">Blaze Sterling — High-Energy Commercial Host</option>
                <option value="marcus">Marcus Vance — Prestige Corporate Director</option>
              </select>
            </div>

            {/* Tri-Beat Fusion Toggle */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
              <label className="text-xs font-bold text-white flex items-center justify-between">
                <span>Commercial Structure</span>
                <span className="text-[10px] text-cyan-400 font-mono">24s Complete Story</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFuseBeats(true)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                    fuseBeats
                      ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                      : "bg-[#141418] border-white/10 text-muted-foreground"
                  }`}
                >
                  🔥 Tri-Beat Fusion (24s)
                </button>
                <button
                  type="button"
                  onClick={() => setFuseBeats(false)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                    !fuseBeats
                      ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                      : "bg-[#141418] border-white/10 text-muted-foreground"
                  }`}
                >
                  Single Beat (8s)
                </button>
              </div>
            </div>

            {/* Action Mode (if single beat) */}
            {!fuseBeats && (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 col-span-full">
                <label className="text-xs font-bold text-white">Specific Demonstration Action</label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="w-full bg-[#141418] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {isSurface ? (
                    <>
                      <option value="swatch_presentation">Swatch & Material Presentation (Hold plank/tile)</option>
                      <option value="torture_test">Torture Test (Waterproof & Scratch test)</option>
                      <option value="room_walkthrough">Room Walkthrough & Luxury Reveal</option>
                    </>
                  ) : (
                    <>
                      <option value="unbox">Unboxing & Packaging Reveal</option>
                      <option value="demo">Feature Demonstration & Use</option>
                      <option value="hold_and_present">Hero Hold & Presentation</option>
                    </>
                  )}
                </select>
              </div>
            )}

            {/* Voiceover & Audio Options */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
              <label className="text-xs font-bold text-white flex items-center justify-between">
                <span>Modern-TTS Voiceover</span>
                <input
                  type="checkbox"
                  checked={withAudio}
                  onChange={(e) => setWithAudio(e.target.checked)}
                  className="rounded border-white/10"
                />
              </label>
              <div className="text-[11px] text-muted-foreground">
                Synthesizes synced neural voiceover with Spanish Rioplatense / English accent.
              </div>
            </div>

            {/* BGM & SFX */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
              <label className="text-xs font-bold text-white">Music & Sound Design</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={bgm}
                  onChange={(e) => setBgm(e.target.value)}
                  className="bg-[#141418] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="luxury_commercial">Luxury Commercial</option>
                  <option value="corporate_clean">Corporate Clean</option>
                  <option value="upbeat_energetic">Upbeat Energetic</option>
                  <option value="minimal_acoustic">Minimal Acoustic</option>
                </select>
                <select
                  value={sfx}
                  onChange={(e) => setSfx(e.target.value)}
                  className="bg-[#141418] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="[sfx:whoosh]">[sfx:whoosh]</option>
                  <option value="[sfx:shimmer]">[sfx:shimmer]</option>
                  <option value="[sfx:pop]">[sfx:pop]</option>
                </select>
              </div>
            </div>
          </div>

          {/* CLI Command Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" /> CLI Terminal Command:
              </span>
              <button
                type="button"
                onClick={handleCopyCommand}
                className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 transition-colors"
              >
                {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{isCopied ? "Copied!" : "Copy Command"}</span>
              </button>
            </div>
            <pre className="p-3.5 rounded-xl bg-black/60 border border-white/10 font-mono text-[11px] text-cyan-300 overflow-x-auto whitespace-pre-wrap select-all">
              {cliCommand}
            </pre>
          </div>

          {/* Real-Time Output Preview */}
          {generationOutput && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Veo Storyboard & Prompt Synthesis Completed!</span>
              </div>
              {generationOutput.manifestPath && (
                <div className="text-[11px] font-mono text-muted-foreground break-all">
                  Manifest: <span className="text-white">{generationOutput.manifestPath}</span>
                </div>
              )}
              <details className="text-[11px] font-mono text-muted-foreground mt-2">
                <summary className="cursor-pointer text-cyan-300 hover:underline">View CLI Execution Logs</summary>
                <pre className="mt-2 p-3 bg-black/40 rounded-lg text-[10px] text-white/80 max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {generationOutput.stdout}
                </pre>
              </details>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between bg-white/[0.02]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleRunGeneration}
            disabled={isGenerating}
            className="px-5 py-2 text-xs font-black rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
          >
            {isGenerating ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{isGenerating ? "Synthesizing Storyboard..." : "⚡ Generate with Veo (Preview / Fast)"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

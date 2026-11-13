"use client";

import React, { useState } from "react";
import {
  Clapperboard,
  Terminal,
  Copy,
  Check,
  Sparkles,
  Layers,
  Volume2,
  UserCheck,
  Zap,
} from "lucide-react";
import { ProductSpec } from "@/lib/types/ecommerce";
import { useToast } from "@/components/global/ToastContainer";

export interface VeoStudioTabProps {
  product: ProductSpec;
}

export const VeoStudioTab: React.FC<VeoStudioTabProps> = ({ product }) => {
  const { toast } = useToast();
  const [persona, setPersona] = useState<string>("ruby");
  const [fuseBeats, setFuseBeats] = useState<boolean>(true);
  const [action, setAction] = useState<string>("swatch_presentation");
  const [withAudio, setWithAudio] = useState<boolean>(true);
  const [bgm, setBgm] = useState<string>("luxury_commercial");
  const [sfx, setSfx] = useState<string>("[sfx:whoosh]");
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationOutput, setGenerationOutput] = useState<{
    stdout: string;
    manifest?: Record<string, unknown> | null;
    manifestPath?: string | null;
  } | null>(null);

  const [selectedAssetUrl, setSelectedAssetUrl] = useState<string>(
    product.assets?.[0]?.url || ""
  );

  React.useEffect(() => {
    if (product.assets?.[0]?.url) {
      setSelectedAssetUrl(product.assets[0].url);
    }
  }, [product]);

  const isSurface = product.typology === "surface_material";
  const surfaceSpecs = product.typologySpecifics?.surfaceMaterial;

  const actionBeats = isSurface
    ? [
        {
          id: "swatch_presentation",
          title: "1. Swatch Presentation (8s)",
          desc: "Anchor holds sample plank/tile, showcasing grain texture & ultra-matte finish under studio lighting.",
          icon: "🪵",
        },
        {
          id: "torture_test",
          title: "2. Torture Durability Test (8s)",
          desc: "Live scratch coin test & water spill demonstration proving 100% waterproof click-lock barrier.",
          icon: "🛡️",
        },
        {
          id: "room_walkthrough",
          title: "3. Room Walkthrough Reveal (8s)",
          desc: "Presenter walks across newly finished room, demonstrating expansive floor transformation.",
          icon: "🏡",
        },
      ]
    : [
        {
          id: "unboxing_reveal",
          title: "1. Tactile Reveal (8s)",
          desc: "Anchor opens packaging, presenting product weight, finish, and ergonomics to camera.",
          icon: "📦",
        },
        {
          id: "feature_demo",
          title: "2. Hands-on Macro Demo (8s)",
          desc: "Close-up macro demonstration of key mechanisms, buttons, or physical durability.",
          icon: "🔍",
        },
        {
          id: "lifestyle_fit",
          title: "3. Everyday Context (8s)",
          desc: "Presenter integrates product into everyday lifestyle context with genuine reaction.",
          icon: "✨",
        },
      ];

  const personas = [
    {
      id: "ruby",
      name: "Ruby",
      title: "Argentine News & Commercial Anchor",
      locale: "es-AR (Rioplatense)",
      avatar: "👩‍💼",
    },
    {
      id: "camila",
      name: "Camila",
      title: "Home Decor & Architecture Specialist",
      locale: "es-AR / Latin America",
      avatar: "👩‍🎨",
    },
    {
      id: "marcus",
      name: "Marcus",
      title: "Commercial Durability & Tech Reviewer",
      locale: "en-US",
      avatar: "👨‍💻",
    },
    {
      id: "blaze",
      name: "Blaze",
      title: "High-Energy Viral Ad Host",
      locale: "es-MX / Global",
      avatar: "⚡",
    },
  ];

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
    selectedAssetUrl ? `--product-image="${selectedAssetUrl}"` : "",
    "--dry-run",
    "--non-interactive",
  ]
    .filter(Boolean)
    .join(" ");

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(cliCommand);
    setIsCopied(true);
    toast("Command Copied", "CLI command copied to clipboard.", "success");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleRunGeneration = async () => {
    setIsGenerating(true);
    setGenerationOutput(null);
    toast("Veo Generation Started", "Compiling action beats and executing pipeline...", "info");

    try {
      const res = await fetch("/api/ecommerce/veo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: product.title,
          productImage: selectedAssetUrl || product.assets?.[0]?.url,
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
      if (data.success) {
        setGenerationOutput({
          stdout: data.stdout,
          manifest: data.manifest,
          manifestPath: data.manifestPath,
        });
        toast("Veo Pipeline Executed", "Commercial manifest and fused storyboard generated!", "success");
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
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#09090c] text-white">
      {/* Veo Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-purple-950/30 border border-cyan-500/30 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Google Veo 3.1 Video Model
            </span>
            <span className="text-[10px] font-mono font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Physical Action Beats
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Custom Presenter Commercial Demonstration
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Generate cinematic commercials featuring hyper-photorealistic virtual anchors physically handling, demonstrating, and torture-testing this product in customized environments.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleRunGeneration}
            disabled={isGenerating}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black font-black text-xs flex items-center gap-2 shadow-xl shadow-cyan-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <Zap className={`w-4 h-4 text-black stroke-[3] ${isGenerating ? "animate-spin" : ""}`} />
            <span>{isGenerating ? "Generating Veo Storyboard..." : "⚡ Generate Veo Ad (Fast Preview)"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Configuration & Action Beats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Reference Card */}
          <div className="p-5 rounded-2xl bg-[#121216] border border-white/10 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-black/40 shrink-0 border border-white/10 relative">
                {selectedAssetUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={selectedAssetUrl}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                    No Image
                  </div>
                )}
                <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[9px] font-mono text-cyan-300">
                  Ref Image
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                  {product.vendor || "Storefront Item"} • {product.typology.replace(/_/g, " ")}
                </div>
                <h3 className="text-sm font-extrabold text-white truncate mt-0.5">
                  {product.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                  {product.description}
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-sm font-black text-white">
                    {product.currency && product.currency !== "USD" ? `${product.currency} $` : "$"}
                    {product.price.toLocaleString()}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-muted-foreground border border-white/10">
                    {product.assets?.length || 1} High-Res Assets Available
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Multi-Asset Gallery Reel */}
            {product.assets && product.assets.length > 1 && (
              <div className="pt-3 border-t border-white/10 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                  <span>Select Conditioning Photo ({product.assets.length} photos extracted)</span>
                  <span className="text-cyan-400">Click to switch Veo anchor reference</span>
                </div>
                <div className="flex items-center gap-3 overflow-x-auto pb-1">
                  {product.assets.map((ast, idx) => {
                    const isSelected = selectedAssetUrl === ast.url;
                    return (
                      <button
                        key={ast.id || idx}
                        type="button"
                        onClick={() => setSelectedAssetUrl(ast.url)}
                        className={`relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                          isSelected
                            ? "border-cyan-400 shadow-md shadow-cyan-500/20 scale-105"
                            : "border-white/10 hover:border-white/30 opacity-70 hover:opacity-100"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={ast.url} alt={`Asset ${idx + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 inset-x-0 bg-black/80 text-[8px] font-mono text-center py-0.5 text-white/90 truncate">
                          {ast.type === "hero_packshot"
                            ? "Packshot"
                            : ast.type === "lifestyle_context"
                            ? "Ambiente"
                            : `Foto ${idx + 1}`}
                        </div>
                        {isSelected && (
                          <div className="absolute top-1 right-1 bg-cyan-400 text-black rounded-full p-0.5">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Technical Specifications Breakdown Card */}
            {(surfaceSpecs || (product.bulletPoints && product.bulletPoints.length > 0)) && (
              <div className="pt-3 border-t border-white/10 space-y-2">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Technical Specifications (Included in Video Descriptions & Scripts)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {surfaceSpecs?.thickness && (
                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
                      <div className="text-[9px] font-mono text-muted-foreground uppercase">Espesor</div>
                      <div className="text-xs font-black text-cyan-300">{surfaceSpecs.thickness}</div>
                    </div>
                  )}
                  {surfaceSpecs?.dimensions && (
                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
                      <div className="text-[9px] font-mono text-muted-foreground uppercase">Dimensiones</div>
                      <div className="text-xs font-black text-blue-300">{surfaceSpecs.dimensions}</div>
                    </div>
                  )}
                  {surfaceSpecs?.usageClass && (
                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
                      <div className="text-[9px] font-mono text-muted-foreground uppercase">Capa de Uso</div>
                      <div className="text-xs font-black text-amber-300 truncate">{surfaceSpecs.usageClass}</div>
                    </div>
                  )}
                  {surfaceSpecs?.rectified && (
                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
                      <div className="text-[9px] font-mono text-muted-foreground uppercase">Rectificado</div>
                      <div className="text-xs font-black text-purple-300">{surfaceSpecs.rectified}</div>
                    </div>
                  )}
                  {surfaceSpecs?.yieldPerBox && (
                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
                      <div className="text-[9px] font-mono text-muted-foreground uppercase">Rendimiento</div>
                      <div className="text-xs font-black text-emerald-300">{surfaceSpecs.yieldPerBox}</div>
                    </div>
                  )}
                  {surfaceSpecs?.origin && (
                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
                      <div className="text-[9px] font-mono text-muted-foreground uppercase">Origen</div>
                      <div className="text-xs font-black text-white">{surfaceSpecs.origin}</div>
                    </div>
                  )}
                  {surfaceSpecs?.sku && (
                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
                      <div className="text-[9px] font-mono text-muted-foreground uppercase">SKU</div>
                      <div className="text-xs font-mono font-bold text-white/90">{surfaceSpecs.sku}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Persona Selection */}
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Select Virtual Presenter</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {personas.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPersona(p.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                    persona === p.id
                      ? "bg-cyan-500/15 border-cyan-500 shadow-md shadow-cyan-500/10"
                      : "bg-[#121216] border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="text-2xl mb-1.5">{p.avatar}</div>
                  <div className="font-extrabold text-xs text-white flex items-center gap-1">
                    <span>{p.name}</span>
                    {persona === p.id && <Check className="w-3.5 h-3.5 text-cyan-400 ml-auto" />}
                  </div>
                  <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                    {p.title}
                  </div>
                  <div className="text-[9px] font-mono text-cyan-400/80 mt-1">
                    {p.locale}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Action Beats Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>Commercial Action Beats</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer bg-white/5 hover:bg-white/10 px-3 py-1 rounded-xl border border-white/10 transition-colors">
                <input
                  type="checkbox"
                  checked={fuseBeats}
                  onChange={(e) => setFuseBeats(e.target.checked)}
                  className="rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-0"
                />
                <span className="text-[11px] font-bold text-white">
                  🔥 Tri-Beat Fusion (24s Full Commercial)
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {actionBeats.map((beat) => (
                <button
                  key={beat.id}
                  type="button"
                  onClick={() => setAction(beat.id)}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    action === beat.id && !fuseBeats
                      ? "bg-purple-500/15 border-purple-500 shadow-md shadow-purple-500/10"
                      : fuseBeats
                      ? "bg-gradient-to-br from-[#141418] to-purple-950/20 border-purple-500/30"
                      : "bg-[#121216] border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="text-xl mb-1">{beat.icon}</div>
                  <div className="text-xs font-black text-white flex items-center gap-1">
                    <span>{beat.title}</span>
                    {action === beat.id && !fuseBeats && (
                      <Check className="w-3.5 h-3.5 text-purple-400 ml-auto" />
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                    {beat.desc}
                  </p>
                </button>
              ))}
            </div>
            {fuseBeats && (
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>
                  <strong>Full 24-Second Fusion Enabled:</strong> The pipeline will generate all 3 camera beats sequentially and stitch them seamlessly with transition crossfades into a complete commercial.
                </span>
              </div>
            )}
          </div>

          {/* Audio & Sound Cues */}
          <div className="p-4 rounded-2xl bg-[#121216] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white flex items-center gap-2">
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Audio & Sound Design</span>
              </span>
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={withAudio}
                  onChange={(e) => setWithAudio(e.target.checked)}
                  className="rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-0"
                />
                <span className="text-muted-foreground">Piper Neural Voiceover</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground">
                  Background Music Genre
                </label>
                <select
                  value={bgm}
                  onChange={(e) => setBgm(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="luxury_commercial">✨ Luxury & Architectural Commercial</option>
                  <option value="modern_tech">⚡ Modern Electronic & Tech</option>
                  <option value="cinematic_ambient">🎬 Warm Acoustic & Ambient</option>
                  <option value="high_energy">🔥 High-Energy Hype Drops</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground">
                  SFX Transition Cue
                </label>
                <select
                  value={sfx}
                  onChange={(e) => setSfx(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="[sfx:whoosh]">💨 [sfx:whoosh] Dynamic Cinematic Sweep</option>
                  <option value="[sfx:stinger]">🔔 [sfx:stinger] Impact Bell Chime</option>
                  <option value="[sfx:pop]">✨ [sfx:pop] Clean UI Acoustic Pop</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Terminal CLI Command & Output */}
        <div className="space-y-4 flex flex-col">
          {/* Copyable CLI Command Box */}
          <div className="rounded-2xl bg-[#0c0c10] border border-white/10 overflow-hidden shadow-xl flex flex-col">
            <div className="px-4 py-2.5 bg-white/[0.03] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs font-mono font-bold text-white">Veo CLI Command</span>
              </div>
              <button
                type="button"
                onClick={handleCopyCommand}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-bold text-white flex items-center gap-1 transition-colors"
              >
                {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{isCopied ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <div className="p-3 bg-black/60 font-mono text-[11px] text-cyan-300/90 overflow-x-auto leading-relaxed max-h-36 select-all">
              <code>{cliCommand}</code>
            </div>
            <div className="px-4 py-2 bg-white/[0.02] border-t border-white/5 text-[10px] text-muted-foreground flex items-center justify-between">
              <span>Run standalone in PowerShell or execute directly via API button</span>
            </div>
          </div>

          {/* Real-Time Output & Storyboard Manifest */}
          <div className="rounded-2xl bg-[#0c0c10] border border-white/10 p-4 space-y-3 flex-1 flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-mono font-bold text-white flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Execution Output & Manifest</span>
              </span>
              {generationOutput?.manifestPath && (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Ready
                </span>
              )}
            </div>

            {generationOutput ? (
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[350px]">
                {generationOutput.manifestPath && (
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="text-[10px] font-mono text-muted-foreground">Manifest File:</div>
                    <div className="text-xs font-mono text-cyan-300 break-all">
                      {generationOutput.manifestPath}
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-black/60 border border-white/5 font-mono text-[10px] text-white/80 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {generationOutput.stdout}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground space-y-2">
                <Clapperboard className="w-8 h-8 text-white/10" />
                <p className="text-xs">
                  Click <strong>&quot;Generate Veo Ad (Fast Preview)&quot;</strong> to compile action beats into a storyboard manifest.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

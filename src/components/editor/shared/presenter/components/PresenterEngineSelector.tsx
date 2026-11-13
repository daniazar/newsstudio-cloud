/**
 * src/components/editor/shared/presenter/components/PresenterEngineSelector.tsx
 *
 * Model selection grid and hardware advisory footnotes for presenter synthesis engines.
 */

import React from "react";
import { ModelSize } from "../types";

interface PresenterEngineSelectorProps {
  selectedModel: ModelSize;
  onSelectModel: (model: ModelSize) => void;
}

const ENGINES: { id: ModelSize; title: string; subtitle: string }[] = [
  { id: "veo", title: "☁️ Google Veo 3.1", subtitle: "~15–30 sec · Zero VRAM Cloud API" },
  { id: "minimax", title: "⚡ MiniMax + TaoMate", subtitle: "~15–30 sec · 2-step distilled diffusion" },
  { id: "musetalk", title: "⚡ MuseTalk (Realtime)", subtitle: "~5–15 sec · 40 FPS real-time (Port 8010)" },
  { id: "ditto", title: "🕺 Ditto (Motion-Space)", subtitle: "~5–20 sec · 25 FPS diffusion (Port 8010)" },
  { id: "sadtalker", title: "⚡ SadTalker (API)", subtitle: "~1–3 min · Fast external service" },
  { id: "1.3b", title: "⚡ 1.3B (Fast)", subtitle: "~15–40 min · Lower VRAM · Good quality" },
  { id: "14b", title: "💎 14B (Quality)", subtitle: "~30–90 min · High VRAM · Best quality" },
  { id: "ltx", title: "🎬 LTX 2.5 (Base)", subtitle: "~5–10 min · High-speed physics base" },
  { id: "eros", title: "🎬 Eros LTX", subtitle: "~5–10 min · Distilled Eros fine-tune" },
  { id: "sulphur", title: "🎬 Sulphur LTX", subtitle: "~5–10 min · Distilled Sulphur fine-tune" },
];

export function PresenterEngineSelector({
  selectedModel,
  onSelectModel,
}: PresenterEngineSelectorProps) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase text-muted">Lip-Sync & Video Engine Model</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {ENGINES.map(({ id, title, subtitle }) => {
          const isSelected = selectedModel === id;
          return (
            <button
              key={id}
              onClick={() => onSelectModel(id)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? id === "musetalk" || id === "ditto"
                    ? "border-emerald-500 bg-emerald-500/10"
                    : id === "veo"
                    ? "border-cyan-500 bg-cyan-500/10"
                    : "border-purple-500 bg-purple-500/10"
                  : "border-border bg-surface hover:border-muted"
              }`}
            >
              <div
                className={`text-[11px] font-bold ${
                  isSelected
                    ? id === "musetalk" || id === "ditto"
                      ? "text-emerald-300"
                      : id === "veo"
                      ? "text-cyan-300"
                      : "text-purple-300"
                    : "text-foreground"
                }`}
              >
                {title}
              </div>
              <div className="text-[9px] text-muted mt-0.5">{subtitle}</div>
            </button>
          );
        })}
      </div>
      {selectedModel === "veo" && (
        <p className="text-[9px] text-cyan-400/80 italic">
          ☁️ Google Veo 3.1 synthesizes 4s/8s broadcast scenes directly in the cloud via Gemini API. Zero local VRAM needed.
        </p>
      )}
      {selectedModel === "minimax" && (
        <p className="text-[9px] text-amber-400/80 italic">
          ⚡ MiniMax H3 + TaoMate LoRA executes ultra-fast 2-step/3-step video diffusion on ComfyUI.
        </p>
      )}
      {selectedModel === "musetalk" && (
        <p className="text-[9px] text-emerald-400/80 italic">
          💡 MuseTalk utilizes 4.0s green-screen action loops for instantaneous lip-sync synthesis and
          transparent corner overlays.
        </p>
      )}
      {selectedModel === "14b" && (
        <p className="text-[9px] text-yellow-500/80 italic">
          ⚠️ 14B requires ~12–16GB VRAM. Ensure ComfyUI is configured with GGUF quantization.
        </p>
      )}
      {(selectedModel === "ltx" || selectedModel === "eros" || selectedModel === "sulphur") && (
        <p className="text-[9px] text-purple-400/80 italic">
          💡 LTX models run in 5-10 minutes. Ensure corresponding Safetensors checkpoints are
          downloaded.
        </p>
      )}
    </div>
  );
}

import { Player, PlayerRef } from "@remotion/player";
import { ProductAdComposition } from "@/remotion/ProductAdComposition";
import { AdScript, ProductSpec, AdAspectRatio } from "@/lib/types/ecommerce";
import { ASPECT_RATIO_OPTIONS } from "@/app/ecommerce-studio/constants/studioConstants";
import { Smartphone, Monitor, Square } from "lucide-react";

export interface StudioPreviewPlayerPanelProps {
  script: AdScript | null;
  product: ProductSpec;
  aspectRatio: AdAspectRatio;
  setAspectRatio: (aspectRatio: AdAspectRatio) => void;
  playerRef?: React.RefObject<PlayerRef | null>;
}

export const StudioPreviewPlayerPanel: React.FC<StudioPreviewPlayerPanelProps> = ({
  script,
  product,
  aspectRatio,
  setAspectRatio,
  playerRef,
}) => {
  const selectedConfig = ASPECT_RATIO_OPTIONS.find((a) => a.id === aspectRatio) || ASPECT_RATIO_OPTIONS[0];

  const totalFrames = (script?.scenes || []).reduce((acc, s) => acc + (s.durationFrames || 90), 0) || 300;

  return (
    <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 space-y-4 flex flex-col items-center">
      <div className="w-full flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-200">Video Canvas Preview</h2>
        <div className="flex items-center gap-1.5 p-1 bg-zinc-950 border border-zinc-800 rounded-xl">
          {ASPECT_RATIO_OPTIONS.map((opt) => {
            const isSelected = aspectRatio === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setAspectRatio(opt.id)}
                className={`p-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 ${
                  isSelected ? "bg-cyan-600 text-white" : "text-zinc-400 hover:text-white"
                }`}
                title={opt.label}
              >
                {opt.id === "9:16" && <Smartphone className="w-3.5 h-3.5" />}
                {opt.id === "1:1" && <Square className="w-3.5 h-3.5" />}
                {opt.id === "16:9" && <Monitor className="w-3.5 h-3.5" />}
                <span className="font-semibold">{opt.id}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="relative bg-black rounded-xl overflow-hidden border border-zinc-800 shadow-2xl flex items-center justify-center max-h-[520px]"
        style={{
          width: aspectRatio === "9:16" ? "290px" : aspectRatio === "1:1" ? "420px" : "100%",
          aspectRatio: aspectRatio === "9:16" ? "9/16" : aspectRatio === "1:1" ? "1/1" : "16/9",
        }}
      >
        {script ? (
          <Player
            ref={playerRef}
            component={ProductAdComposition as unknown as React.ComponentType<Record<string, unknown>>}
            inputProps={{
              script,
              product,
            }}
            durationInFrames={Math.max(60, totalFrames)}
            compositionWidth={selectedConfig.width}
            compositionHeight={selectedConfig.height}
            fps={30}
            controls
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <div className="text-center p-6 text-zinc-500 text-xs">
            No active script loaded for preview.
          </div>
        )}
      </div>
    </div>
  );
};

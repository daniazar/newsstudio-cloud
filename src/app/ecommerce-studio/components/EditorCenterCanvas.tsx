import React from "react";
import { Player, PlayerRef } from "@remotion/player";
import { ProductAdComposition } from "@/remotion/ProductAdComposition";
import { AdScript, ProductSpec, AdAspectRatio } from "@/lib/types/ecommerce";
import { ASPECT_RATIO_OPTIONS } from "@/app/ecommerce-studio/constants/studioConstants";

export interface EditorCenterCanvasProps {
  script: AdScript | null;
  product: ProductSpec;
  aspectRatio: AdAspectRatio;
  playerRef?: React.RefObject<PlayerRef | null>;
}

export const EditorCenterCanvas: React.FC<EditorCenterCanvasProps> = ({
  script,
  product,
  aspectRatio,
  playerRef,
}) => {
  const selectedConfig = ASPECT_RATIO_OPTIONS.find((a) => a.id === aspectRatio) || ASPECT_RATIO_OPTIONS[0];

  const totalFrames = (script?.scenes || []).reduce((acc, s) => acc + (s.durationFrames || 90), 0) || 300;

  return (
    <div className="flex-1 bg-zinc-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div
        className="relative bg-black rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl flex items-center justify-center max-h-[640px]"
        style={{
          width: aspectRatio === "9:16" ? "360px" : aspectRatio === "1:1" ? "520px" : "100%",
          aspectRatio: aspectRatio === "9:16" ? "9/16" : aspectRatio === "1:1" ? "1/1" : "16/9",
        }}
      >
        {script ? (
          <Player
            ref={playerRef}
            component={ProductAdComposition as unknown as React.ComponentType<Record<string, unknown>>}
            inputProps={{
              productSpec: product,
              script,
              aspectRatio,
              audioMode: "voiceover_tts",
            }}
            durationInFrames={Math.max(60, totalFrames)}
            compositionWidth={selectedConfig.width}
            compositionHeight={selectedConfig.height}
            fps={30}
            controls
            acknowledgeRemotionLicense
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <div className="text-center p-6 text-zinc-500 text-xs">
            No video script loaded.
          </div>
        )}
      </div>
    </div>
  );
};

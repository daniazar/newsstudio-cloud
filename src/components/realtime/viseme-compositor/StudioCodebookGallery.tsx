"use client";

import React from "react";
import { VisemeCodebookEntry } from "@/lib/realtime/visemeCodebook";
import { Layers, Sparkles } from "lucide-react";

interface StudioCodebookGalleryProps {
  visemes: readonly VisemeCodebookEntry[];
  activeClusterId: number | null;
  onSelectViseme: (clusterId: number) => void;
}

const VisemeTileThumbnail: React.FC<{
  entry: VisemeCodebookEntry;
  index: number;
  total: number;
  defaultAtlas?: string;
}> = ({ entry, index, total, defaultAtlas }) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    if (!entry.dataUrl && !entry.atlasUrl && !defaultAtlas && entry.predecodedBitmap && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(
          entry.predecodedBitmap,
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
        );
      }
    }
  }, [entry, defaultAtlas]);

  const cropStyle: React.CSSProperties = {
    transform: "scale(2.3)",
    transformOrigin: "50% 49.5%",
  };

  if (entry.dataUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={entry.dataUrl}
        alt={`Viseme ${entry.clusterId}`}
        loading="lazy"
        className="w-full h-full object-cover block"
        style={cropStyle}
      />
    );
  }

  const atlas = entry.atlasUrl || defaultAtlas;
  if (atlas) {
    const cols = entry.atlasCols || 8;
    const rows = entry.atlasRows || Math.max(1, Math.ceil(total / cols));
    const col = entry.col ?? (index % cols);
    const row = entry.row ?? Math.floor(index / cols);
    const posX = cols > 1 ? (col / (cols - 1)) * 100 : 0;
    const posY = rows > 1 ? (row / (rows - 1)) * 100 : 0;

    return (
      <div
        className="w-full h-full"
        style={{
          backgroundImage: `url("${atlas}")`,
          backgroundSize: `${cols * 100}% ${rows * 100}%`,
          backgroundPosition: `${posX}% ${posY}%`,
          backgroundRepeat: "no-repeat",
          ...cropStyle,
        }}
      />
    );
  }

  if (entry.predecodedBitmap) {
    return (
      <canvas
        ref={canvasRef}
        width={64}
        height={64}
        className="w-full h-full object-cover block"
        style={cropStyle}
      />
    );
  }

  return <div className="text-[10px] font-mono text-neutral-600">N/A</div>;
};

export const StudioCodebookGallery: React.FC<StudioCodebookGalleryProps> = ({
  visemes,
  activeClusterId,
  onSelectViseme,
}) => {
  if (!visemes || visemes.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 bg-neutral-900/40 rounded-2xl border border-neutral-800 text-neutral-500 font-mono text-xs shrink-0">
        No codebook visemes loaded. Select a codebook engine to inspect.
      </div>
    );
  }

  const defaultAtlas = visemes.find((v) => Boolean(v.atlasUrl))?.atlasUrl;

  // Determine strictly one unique active tile index to eliminate duplicate visual highlights
  const firstActiveIndex =
    activeClusterId !== null
      ? visemes.findIndex((v) => v.clusterId === activeClusterId)
      : -1;

  return (
    <div className="flex flex-col gap-3 bg-neutral-900/60 rounded-2xl border border-neutral-800 p-4 shrink-0">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-white flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          <span>Canonical {visemes.length}-Viseme Codebook ROM</span>
        </label>
        <span className="text-[10px] font-mono text-neutral-400">
          Click any viseme to preview static overlay
        </span>
      </div>

      <div
        className="grid grid-cols-4 sm:grid-cols-6 xl:grid-cols-8 auto-rows-max gap-2 max-h-[360px] overflow-y-auto pr-1"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))" }}
      >
        {visemes.map((v, index) => {
          const isActive = index === firstActiveIndex;
          return (
            <button
              key={`${v.clusterId}-${index}`}
              type="button"
              data-cluster-id={v.clusterId}
              onClick={() => onSelectViseme(v.clusterId)}
              className={`group relative flex flex-col items-stretch rounded-xl p-1 border transition-all text-left shrink-0 cursor-pointer ${
                isActive
                  ? "bg-amber-500/20 border-amber-400 shadow-lg ring-2 ring-amber-400/50 scale-105 z-10"
                  : "bg-neutral-800/40 border-neutral-700/50 hover:border-neutral-500 hover:bg-neutral-800"
              }`}
            >
              {/* Thumbnail Container */}
              <div
                style={{ aspectRatio: "1 / 1" }}
                className="w-full aspect-square shrink-0 rounded-lg bg-neutral-950 flex items-center justify-center overflow-hidden relative border border-neutral-800/80"
              >
                <VisemeTileThumbnail
                  entry={v}
                  index={index}
                  total={visemes.length}
                  defaultAtlas={defaultAtlas}
                />

                {/* Aperture Level Meter (Sleek Bottom Gauge) */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60 pointer-events-none z-10 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all"
                    style={{
                      width: `${Math.min(100, Math.max(4, (v.aperture / 25.0) * 100))}%`,
                      opacity: isActive ? 1.0 : 0.75,
                    }}
                  />
                </div>

                {isActive && (
                  <span className="absolute top-1 right-1 p-0.5 rounded bg-amber-400 text-black shadow-sm z-20">
                    <Sparkles className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>

              {/* Viseme Info Footer */}
              <div className="flex items-center justify-between gap-0.5 w-full mt-1 px-0.5 text-[8.5px] font-mono tracking-tighter leading-tight shrink-0 min-w-0">
                <span className={`shrink-0 ${isActive ? "text-amber-300 font-bold" : "text-neutral-400"}`}>
                  #{v.clusterId}
                </span>
                <span className={`shrink-0 ${isActive ? "text-amber-200" : "text-neutral-500"}`}>
                  {v.aperture.toFixed(1)}px
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

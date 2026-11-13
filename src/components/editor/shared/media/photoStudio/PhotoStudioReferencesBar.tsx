/**
 * src/components/editor/shared/media/photoStudio/PhotoStudioReferencesBar.tsx
 *
 * Multi-conditioning reference images preview bar.
 * Displays the presenter attire reference and product packshot references
 * passed directly into the Gemini / Imagen 3 CLI.
 */

import React from "react";
import { Image as ImageIcon } from "lucide-react";

interface PhotoStudioReferencesBarProps {
  effectiveReferenceUrls: string[];
}

export function PhotoStudioReferencesBar({
  effectiveReferenceUrls,
}: PhotoStudioReferencesBarProps) {
  return (
    <div className="space-y-1.5 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ImageIcon className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-[11px] font-semibold text-zinc-300">
            Multi-Conditioning References ({effectiveReferenceUrls.length} Active)
          </span>
        </div>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
          {effectiveReferenceUrls.length >= 2 ? "✓ Attire + Product Active" : "1 Reference Active"}
        </span>
      </div>
      <p className="text-[10px] text-zinc-400">
        These reference photos (persona in selected attire first, then product packshots) are passed
        directly to Imagen 3 / Gemini to preserve authentic presenter wardrobe, product texture, and
        geometry.
      </p>
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 custom-scrollbar">
        {effectiveReferenceUrls.map((url, idx) => (
          <div
            key={`${url}-${idx}`}
            className="relative group rounded-lg overflow-hidden border border-cyan-500/40 bg-black h-12 w-12 shrink-0 shadow"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Ref #${idx + 1}`} className="w-full h-full object-cover" />
            <span className="absolute bottom-0 inset-x-0 bg-black/80 backdrop-blur-xs text-[8px] text-cyan-300 text-center font-bold font-mono py-0.5">
              {idx === 0 ? "👤 Attire" : `📦 Prod #${idx}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * src/components/editor/shared/visuals/components/veoStudio/VeoIngredientsSection.tsx
 *
 * 3-Ingredient conditioning panel for Google Flow:
 * 1) Persona Character Studio model
 * 2) Persona attire reference photo
 * 3) User-selectable product reference photos
 */

import React from "react";
import { Film } from "lucide-react";

interface VeoIngredientsSectionProps {
  personaId?: string;
  attireId?: string;
  resolvedPersonaImageUrl?: string | null;
  candidateProductUrls: string[];
  activeProductRefUrl: string | null;
  setSelectedProductRefUrl: (url: string | null) => void;
}

export function VeoIngredientsSection({
  personaId,
  attireId: _attireId,
  resolvedPersonaImageUrl,
  candidateProductUrls,
  activeProductRefUrl,
  setSelectedProductRefUrl,
}: VeoIngredientsSectionProps) {
  return (
    <div className="space-y-2 p-3 rounded-lg bg-zinc-900/70 border border-zinc-800/90 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Film className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-[11px] font-semibold text-zinc-200">
            Multi-Conditioning References (3 Ingredients in Flow)
          </span>
        </div>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          {candidateProductUrls.length > 0 ? "✓ 3/3 Ingredients Ready" : "Attire + Flow Ready"}
        </span>
      </div>
      <p className="text-[10px] text-zinc-400 leading-relaxed">
        Google Flow accepts <strong>3 ingredients</strong>: 1) Persona Character Studio model, 2)
        Persona in current attire, and 3) <strong>1 Product photo</strong>. Click a product photo
        below to select which one to condition authentic geometry and texture.
      </p>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 custom-scrollbar">
        {/* Ingredient 1: Persona Character Studio Object */}
        <div
          className="relative group rounded-lg overflow-hidden border border-purple-500/50 bg-gradient-to-b from-purple-950/60 to-black h-13 w-13 shrink-0 shadow flex flex-col items-center justify-center p-1 text-center"
          title="Ingredient 1: Google Flow Character Studio Object (provides 3D body continuity & persona voice identity)"
        >
          <span className="text-base leading-none">👤</span>
          <span className="text-[7.5px] text-purple-200 font-bold font-mono leading-tight truncate max-w-full mt-0.5">
            {personaId ? personaId.charAt(0).toUpperCase() + personaId.slice(1) : "Ruby"}
          </span>
          <span className="absolute top-0.5 right-0.5 text-[6.5px] bg-purple-500 text-white font-extrabold px-1 rounded-full">
            Char
          </span>
          <span className="absolute bottom-0 inset-x-0 bg-purple-950/90 text-[7px] text-purple-300 font-bold text-center py-0.2">
            Ingred #1
          </span>
        </div>

        {/* Ingredient 2: Persona Attire Reference Photo */}
        {resolvedPersonaImageUrl && (
          <div
            className="relative group rounded-lg overflow-hidden border-2 border-emerald-500/70 bg-black h-13 w-13 shrink-0 shadow"
            title="Ingredient 2: Persona in Current Attire (locks wardrobe, fabric, and styling)"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolvedPersonaImageUrl}
              alt="Persona Attire"
              className="w-full h-full object-cover"
            />
            <span className="absolute top-0.5 right-0.5 text-[6.5px] bg-emerald-600 text-white font-extrabold px-1 rounded-full">
              ✓ Attire
            </span>
            <span className="absolute bottom-0 inset-x-0 bg-black/85 text-[7px] text-emerald-300 font-bold text-center py-0.2">
              Ingred #2
            </span>
          </div>
        )}

        {/* Vertical Divider */}
        <div className="h-10 w-px bg-zinc-800 shrink-0 mx-0.5" />

        {/* Ingredient 3: Selectable Product Reference Photos */}
        {candidateProductUrls.length > 0 ? (
          candidateProductUrls.map((url, idx) => {
            const isSelected = url === activeProductRefUrl;
            return (
              <button
                key={`${url}-${idx}`}
                type="button"
                onClick={() => setSelectedProductRefUrl(url)}
                className={`relative group rounded-lg overflow-hidden h-13 w-13 shrink-0 shadow transition-all cursor-pointer text-left ${
                  isSelected
                    ? "border-2 border-emerald-400 ring-2 ring-emerald-400/40 scale-102 bg-emerald-950/50"
                    : "border border-zinc-700/80 hover:border-emerald-500/60 opacity-60 hover:opacity-100 bg-black"
                }`}
                title={
                  isSelected
                    ? `Active Product Reference (Ingredient #3: Prod #${idx + 1})`
                    : `Click to select Prod #${idx + 1} as the active product reference`
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Prod #${idx + 1}`} className="w-full h-full object-cover" />
                {isSelected ? (
                  <span className="absolute top-0.5 right-0.5 text-[6.5px] bg-emerald-400 text-black font-extrabold px-1 rounded-full shadow">
                    ✓ Active
                  </span>
                ) : (
                  <span className="absolute top-0.5 right-0.5 text-[6.5px] bg-black/70 text-zinc-400 font-medium px-1 rounded-full group-hover:bg-zinc-800">
                    Pick
                  </span>
                )}
                <span
                  className={`absolute bottom-0 inset-x-0 text-[7px] text-center font-bold font-mono py-0.2 ${
                    isSelected
                      ? "bg-emerald-900/90 text-emerald-200 font-extrabold"
                      : "bg-black/85 text-zinc-400"
                  }`}
                >
                  📦 Prod #{idx + 1}
                </span>
              </button>
            );
          })
        ) : (
          <div className="text-[10px] text-zinc-500 italic flex items-center h-13 px-2 border border-dashed border-zinc-800 rounded-lg">
            No product photos found
          </div>
        )}
      </div>

      {candidateProductUrls.length > 1 && (
        <div className="flex items-center justify-between text-[9px] text-zinc-400 pt-0.5">
          <span>
            Selected:{" "}
            <strong className="text-emerald-300">
              Prod #{candidateProductUrls.indexOf(activeProductRefUrl || "") + 1}
            </strong>{" "}
            of {candidateProductUrls.length} available
          </span>
          <span className="text-zinc-500 italic">Tap any photo above to switch</span>
        </div>
      )}
    </div>
  );
}

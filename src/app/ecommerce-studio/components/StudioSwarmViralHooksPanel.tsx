import React from "react";
import { SWARM_ANGLES } from "@/lib/ecommerce/abTestingSwarm";
import { generateViralHooks, ViralHookVariant } from "@/lib/ecommerce/hookGenerator";
import { SAMPLE_FLOORING } from "@/lib/ecommerce/sampleProducts";
import { Zap, Flame } from "lucide-react";

export interface StudioSwarmViralHooksPanelProps {
  onSelectHook?: (hook: ViralHookVariant) => void;
}

export const StudioSwarmViralHooksPanel: React.FC<StudioSwarmViralHooksPanelProps> = ({
  onSelectHook,
}) => {
  const sampleHooks = generateViralHooks(SAMPLE_FLOORING);

  return (
    <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          A/B Swarm & Viral Hooks Engine
        </h2>
        <span className="text-xs text-amber-400 font-semibold flex items-center gap-1">
          <Flame className="w-3.5 h-3.5" /> High Direct Response
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {SWARM_ANGLES.map((angle) => (
          <div
            key={angle.angleId}
            className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 space-y-1"
          >
            <div className="font-bold text-amber-400">{angle.angleTitle}</div>
            <p className="text-[11px] text-zinc-400 line-clamp-2">"{angle.customHook}"</p>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-zinc-800">
        <h3 className="text-xs font-semibold text-zinc-300 mb-2">Suggested High-CTR Hooks</h3>
        <div className="space-y-2">
          {sampleHooks.slice(0, 3).map((hook) => (
            <div
              key={hook.id}
              onClick={() => onSelectHook && onSelectHook(hook)}
              className="p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 hover:border-amber-500/40 cursor-pointer transition-all flex items-start justify-between gap-3"
            >
              <div>
                <p className="text-xs font-medium text-white">"{hook.headline}"</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">{hook.subheadline || hook.voiceoverScript}</p>
              </div>
              <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/50 px-2 py-0.5 rounded-md shrink-0">
                {hook.badgeLabel}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

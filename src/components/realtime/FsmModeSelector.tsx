import React from "react";

export type FsmSequenceMode = "director_fsm" | "stochastic" | "sequential";

interface FsmModeSelectorProps {
  sequenceMode: FsmSequenceMode;
  onSelectSequenceMode: (mode: FsmSequenceMode) => void;
  disabled?: boolean;
}

export const FsmModeSelector: React.FC<FsmModeSelectorProps> = ({
  sequenceMode,
  onSelectSequenceMode,
  disabled,
}) => {
  return (
    <div className="space-y-1.5 bg-black/40 p-2.5 rounded-xl border border-white/5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-gray-200 flex items-center gap-1.5">
          <span>🎬</span>
          <span>Motion Beat &amp; Transition Orchestration</span>
        </span>
        <span className="text-[9px] font-mono text-cyan-400 font-bold">
          {sequenceMode === "director_fsm"
            ? "🎬 SMART PACING DIRECTOR"
            : sequenceMode === "stochastic"
            ? "🎲 STOCHASTIC MARKOV"
            : "🔢 SEQUENTIAL"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {/* 1. Smart Pacing Director Mode */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelectSequenceMode("director_fsm")}
          className={`p-1.5 rounded-lg border text-left text-[10px] font-mono transition-all cursor-pointer ${
            sequenceMode === "director_fsm"
              ? "bg-gradient-to-br from-emerald-950/90 to-teal-950/90 border-emerald-400 text-emerald-200 font-bold shadow-[0_0_12px_rgba(16,185,129,0.3)]"
              : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
          } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          <div className="flex items-center gap-1 text-emerald-300 font-bold">
            <span>🎬 Director FSM</span>
          </div>
          <div className="text-[8px] text-gray-400 mt-0.5 leading-tight">
            NLP tags, 3-tier pacing &amp; camera cues.
          </div>
        </button>

        {/* 2. Stochastic Markov Mode */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelectSequenceMode("stochastic")}
          className={`p-1.5 rounded-lg border text-left text-[10px] font-mono transition-all cursor-pointer ${
            sequenceMode === "stochastic"
              ? "bg-purple-950/70 border-purple-500 text-purple-200 font-bold shadow-[0_0_10px_rgba(168,85,247,0.2)]"
              : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
          } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          <div className="flex items-center gap-1 text-purple-300 font-bold">
            <span>🎲 Stochastic</span>
          </div>
          <div className="text-[8px] text-gray-400 mt-0.5 leading-tight">
            Markov weighted anti-fatigue lottery.
          </div>
        </button>

        {/* 3. Sequential Mode */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelectSequenceMode("sequential")}
          className={`p-1.5 rounded-lg border text-left text-[10px] font-mono transition-all cursor-pointer ${
            sequenceMode === "sequential"
              ? "bg-cyan-950/70 border-cyan-500 text-cyan-200 font-bold shadow-[0_0_10px_rgba(0,240,255,0.2)]"
              : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
          } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          <div className="flex items-center gap-1 text-cyan-300 font-bold">
            <span>🔢 Sequential</span>
          </div>
          <div className="text-[8px] text-gray-400 mt-0.5 leading-tight">
            Linear progression Beat 1 → 2 → 3.
          </div>
        </button>
      </div>
    </div>
  );
};

import React from "react";
import { PersonaLoopConfig, PERSONA_CONFIGS } from "./types";

interface PersonaSelectorProps {
  selectedPersona: PersonaLoopConfig;
  onSelectPersona: (persona: PersonaLoopConfig) => void;
  disabled?: boolean;
}

export const PersonaSelector: React.FC<PersonaSelectorProps> = ({
  selectedPersona,
  onSelectPersona,
  disabled,
}) => {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
        1. Select Broadcast Avatar & Action Suite
      </label>
      <div className="grid grid-cols-2 gap-1.5">
        {PERSONA_CONFIGS.map((p) => (
          <button
            key={p.id}
            disabled={disabled}
            onClick={() => onSelectPersona(p)}
            className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
              selectedPersona.id === p.id
                ? "bg-cyan-950/70 border-cyan-500 text-cyan-200 shadow-[0_0_12px_rgba(0,240,255,0.15)]"
                : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-200"
            } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <div className="w-8 h-8 rounded-full bg-cyan-900/60 border border-cyan-500/40 flex items-center justify-center text-xs font-bold shrink-0">
              {p.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate text-gray-100">{p.name}</div>
              <div className="text-[9px] text-gray-400 truncate">{p.voiceLang}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

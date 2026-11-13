import React from "react";
import { VOICE_OPTIONS } from "./types";

interface VoiceSelectorProps {
  selectedVoiceId: string;
  onSelectVoiceId: (voiceId: string) => void;
  genderFilter: "all" | "female" | "male";
  onSelectGenderFilter: (filter: "all" | "female" | "male") => void;
  disabled?: boolean;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  selectedVoiceId,
  onSelectVoiceId,
  genderFilter,
  onSelectGenderFilter,
  disabled,
}) => {
  const selectedVoice =
    VOICE_OPTIONS.find((v) => v.id === selectedVoiceId) || VOICE_OPTIONS[0];

  const filteredVoiceOptions = VOICE_OPTIONS.filter((v) => {
    if (genderFilter === "all") return true;
    return v.gender === genderFilter;
  });

  return (
    <div className="space-y-1.5 bg-black/40 p-2.5 rounded-xl border border-white/5">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-mono uppercase tracking-wider text-gray-300 font-bold flex items-center gap-1.5">
          <span>🎙️</span>
          <span>2. Voice Persona & Timbre</span>
        </label>
        {/* Gender Filter Tabs */}
        <div className="flex items-center gap-0.5 bg-white/5 p-0.5 rounded-lg border border-white/10">
          <button
            type="button"
            onClick={() => onSelectGenderFilter("all")}
            className={`px-1.5 py-0.5 text-[9px] font-mono rounded cursor-pointer transition-colors ${
              genderFilter === "all" ? "bg-cyan-500 text-black font-bold" : "text-gray-400 hover:text-white"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => onSelectGenderFilter("female")}
            className={`px-1.5 py-0.5 text-[9px] font-mono rounded cursor-pointer transition-colors ${
              genderFilter === "female" ? "bg-purple-500 text-white font-bold" : "text-gray-400 hover:text-white"
            }`}
          >
            👩 Female
          </button>
          <button
            type="button"
            onClick={() => onSelectGenderFilter("male")}
            className={`px-1.5 py-0.5 text-[9px] font-mono rounded cursor-pointer transition-colors ${
              genderFilter === "male" ? "bg-blue-500 text-white font-bold" : "text-gray-400 hover:text-white"
            }`}
          >
            👨 Male
          </button>
        </div>
      </div>

      <select
        value={selectedVoiceId}
        onChange={(e) => onSelectVoiceId(e.target.value)}
        disabled={disabled}
        className="w-full bg-white/5 border border-white/15 rounded-lg p-2 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500 cursor-pointer"
      >
        {filteredVoiceOptions.map((v) => (
          <option key={v.id} value={v.id} className="bg-[#0b0e17] text-white">
            {v.gender === "female" ? "👩" : "👨"} {v.name} • {v.style} ({v.language.toUpperCase()})
          </option>
        ))}
      </select>
      <div className="text-[9px] text-gray-400 italic px-0.5">
        {selectedVoice.description}
      </div>
    </div>
  );
};

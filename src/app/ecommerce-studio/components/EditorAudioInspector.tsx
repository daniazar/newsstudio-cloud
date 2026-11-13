import React from "react";
import { Volume2 } from "lucide-react";

export interface EditorAudioInspectorProps {
  selectedEngine: string;
  setSelectedEngine: (engine: string) => void;
  selectedVoiceModel: string;
  setSelectedVoiceModel: (model: string) => void;
  speechSpeed: number;
  setSpeechSpeed: (speed: number) => void;
  selectedMusicTrack: string;
  setSelectedMusicTrack: (track: string) => void;
  backgroundMusicVolume: number;
  setBackgroundMusicVolume: (volume: number) => void;
}

export const EditorAudioInspector: React.FC<EditorAudioInspectorProps> = ({
  selectedEngine,
  setSelectedEngine,
  selectedVoiceModel: _selectedVoiceModel,
  setSelectedVoiceModel: _setSelectedVoiceModel,
  speechSpeed,
  setSpeechSpeed,
  selectedMusicTrack,
  setSelectedMusicTrack,
  backgroundMusicVolume,
  setBackgroundMusicVolume,
}) => {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
        <Volume2 className="w-4 h-4 text-cyan-400" />
        Voiceover & Music Controls
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">TTS Neural Engine</label>
        <select
          value={selectedEngine}
          onChange={(e) => setSelectedEngine(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
        >
          <option value="piper">Piper WASM (Local Neural Fast)</option>
          <option value="kokoro">Kokoro TTS (HD Voice Synthesis)</option>
          <option value="elevenlabs">ElevenLabs HQ Studio</option>
        </select>
      </div>

      <div>
        <div className="flex justify-between text-xs text-zinc-400 mb-1">
          <span>Speech Speed ({speechSpeed.toFixed(1)}x)</span>
        </div>
        <input
          type="range"
          min={0.7}
          max={1.5}
          step={0.05}
          value={speechSpeed}
          onChange={(e) => setSpeechSpeed(parseFloat(e.target.value))}
          className="w-full accent-cyan-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">Background Music Track</label>
        <select
          value={selectedMusicTrack}
          onChange={(e) => setSelectedMusicTrack(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
        >
          <option value="upbeat_electro">Upbeat E-Commerce Electro</option>
          <option value="minimalist_luxury">Minimalist Ambient Luxury</option>
          <option value="hype_trap">High-Energy UGC Trap</option>
          <option value="acoustic_warm">Warm Acoustic Lifestyle</option>
        </select>
      </div>

      <div>
        <div className="flex justify-between text-xs text-zinc-400 mb-1">
          <span>Music Volume ({Math.round(backgroundMusicVolume * 100)}%)</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={backgroundMusicVolume}
          onChange={(e) => setBackgroundMusicVolume(parseFloat(e.target.value))}
          className="w-full accent-cyan-500"
        />
      </div>
    </div>
  );
};

import React from "react";

interface BroadcastSettingsCardProps {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  switchPolicy: "boundary_locked" | "instant";
  onToggleSwitchPolicy: () => void;
}

export const BroadcastSettingsCard: React.FC<BroadcastSettingsCardProps> = ({
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
  switchPolicy,
  onToggleSwitchPolicy,
}) => {
  return (
    <div className="space-y-2.5 pt-1 border-t border-white/10">
      <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-300">
        Broadcast & Audio Settings
      </h3>

      {/* Master Volume Controls */}
      <div className="bg-black/40 p-2.5 rounded-xl border border-white/5 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-gray-200 flex items-center gap-1.5">
            <span>{isMuted || volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}</span>
            <span>Master Volume</span>
          </span>
          <span className="font-mono text-cyan-400 font-bold text-[11px]">
            {Math.round((isMuted ? 0 : volume) * 100)}%
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <button
            onClick={onToggleMute}
            className={`px-2 py-0.5 rounded text-[9px] font-mono border transition-colors cursor-pointer ${
              isMuted
                ? "bg-red-950 border-red-500 text-red-300 font-bold"
                : "bg-white/5 border-white/15 text-gray-300 hover:text-white"
            }`}
          >
            {isMuted ? "MUTED" : "MUTE"}
          </button>
        </div>

        {/* Quick Volume Preset Buttons */}
        <div className="flex items-center gap-1 pt-0.5">
          {[0.25, 0.5, 0.75, 1.0].map((v) => (
            <button
              key={v}
              onClick={() => onVolumeChange(v)}
              className={`flex-1 py-0.5 rounded text-[9px] font-mono border transition-colors cursor-pointer ${
                !isMuted && volume === v
                  ? "bg-cyan-950 border-cyan-500 text-cyan-300 font-bold"
                  : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
              }`}
            >
              {Math.round(v * 100)}%
            </button>
          ))}
        </div>
      </div>

      {/* Switch Policy Toggle */}
      <div className="flex items-center justify-between py-1 bg-black/40 p-2 rounded-xl border border-white/5">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-gray-200">Switching Mode</span>
          <span className="text-[9px] text-gray-400">
            {switchPolicy === "boundary_locked"
              ? "Wait for loop boundary (0 jump cut)"
              : "Instant cut switch"}
          </span>
        </div>
        <button
          onClick={onToggleSwitchPolicy}
          className={`px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold border transition-colors cursor-pointer ${
            switchPolicy === "boundary_locked"
              ? "bg-cyan-950 border-cyan-500 text-cyan-300 shadow-[0_0_8px_rgba(0,240,255,0.2)]"
              : "bg-white/10 border-white/20 text-gray-400"
          }`}
        >
          {switchPolicy === "boundary_locked" ? "BOUNDARY LOCK" : "INSTANT CUT"}
        </button>
      </div>

      <div className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/5 text-[10px] font-mono">
        <span className="text-gray-400">SYNC ENGINE:</span>
        <span className="text-emerald-400 font-bold">1:1 MASTER CLOCK LOCK</span>
      </div>
    </div>
  );
};

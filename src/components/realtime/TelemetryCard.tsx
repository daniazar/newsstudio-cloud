import React from "react";

interface TelemetryCardProps {
  fps: number;
  compositorLatencyMs: number;
  ttsLatencyMs: number;
  customEngine: string;
}

export const TelemetryCard: React.FC<TelemetryCardProps> = ({
  fps,
  compositorLatencyMs,
  ttsLatencyMs,
  customEngine,
}) => {
  return (
    <div className="bg-white/5 rounded-xl p-3 border border-white/10 space-y-2">
      <div className="flex items-center justify-between text-[10px] font-mono uppercase text-gray-400 border-b border-white/10 pb-1">
        <span>Hardware Telemetry</span>
        <span className="text-emerald-400 font-bold">CLIENT RENDER</span>
      </div>

      <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
        <div className="bg-black/40 p-1.5 rounded-lg border border-white/5">
          <div className="text-gray-500 text-[8px]">COMPOSITING FPS</div>
          <div className="text-cyan-400 font-bold text-xs">{fps} FPS</div>
        </div>

        <div className="bg-black/40 p-1.5 rounded-lg border border-white/5">
          <div className="text-gray-500 text-[8px]">FRAME LATENCY</div>
          <div className="text-emerald-400 font-bold text-xs">{compositorLatencyMs} ms</div>
        </div>

        <div className="bg-black/40 p-1.5 rounded-lg border border-white/5">
          <div className="text-gray-500 text-[8px]">TTS REAL-TIME LATENCY</div>
          <div className="text-purple-400 font-bold text-xs">{ttsLatencyMs} ms</div>
        </div>

        <div className="bg-black/40 p-1.5 rounded-lg border border-white/5">
          <div className="text-gray-500 text-[8px]">ACTIVE TTS ENGINE</div>
          <div className="text-amber-400 font-bold text-xs">{customEngine.toUpperCase()}</div>
        </div>
      </div>
    </div>
  );
};

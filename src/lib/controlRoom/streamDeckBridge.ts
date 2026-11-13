/**
 * src/lib/controlRoom/streamDeckBridge.ts
 *
 * Broadcast Stream Deck & RTMP Companion Bridge.
 * Controls live switcher macros, DSK overlays, camera source routing,
 * and RTMP live streaming telemetry for mobile and tablet touch companion screens.
 */

export interface StreamDeckKeyConfig {
  id: string;
  row: number;
  col: number;
  label: string;
  sublabel?: string;
  icon: string;
  category: "camera" | "transition" | "dsk" | "sfx" | "stream";
  activeColor: string;
  targetAction: string;
}

export interface StreamTelemetry {
  isStreaming: boolean;
  rtmpUrl: string;
  bitrateKbps: number;
  fps: number;
  resolution: string;
  droppedFrames: number;
  uptimeSeconds: number;
}

export const INITIAL_STREAM_TELEMETRY: StreamTelemetry = {
  isStreaming: false,
  rtmpUrl: "rtmp://live.newsstudio.ai/app/live_feed_ruby",
  bitrateKbps: 6000,
  fps: 60.0,
  resolution: "1080p60",
  droppedFrames: 0,
  uptimeSeconds: 0,
};

export const STREAM_DECK_KEYS: StreamDeckKeyConfig[] = [
  // Row 1: Camera Feeds & Master Stream
  { id: "cam1", row: 0, col: 0, label: "CAM 1", sublabel: "WIDE", icon: "🎥", category: "camera", activeColor: "#ef4444", targetAction: "cam1_wide" },
  { id: "cam2", row: 0, col: 1, label: "CAM 2", sublabel: "TIGHT", icon: "👤", category: "camera", activeColor: "#ef4444", targetAction: "cam2_tight" },
  { id: "cam3", row: 0, col: 2, label: "CAM 3", sublabel: "DATA", icon: "📊", category: "camera", activeColor: "#ef4444", targetAction: "cam3_dataviz" },
  { id: "cam4", row: 0, col: 3, label: "CAM 4", sublabel: "B-ROLL", icon: "🛰️", category: "camera", activeColor: "#ef4444", targetAction: "cam4_broll" },
  { id: "stream", row: 0, col: 4, label: "ON AIR", sublabel: "RTMP", icon: "🔴", category: "stream", activeColor: "#ef4444", targetAction: "toggle_stream" },

  // Row 2: Transitions & Breaking Overlays
  { id: "cut", row: 1, col: 0, label: "CUT", sublabel: "0F", icon: "⚡", category: "transition", activeColor: "#ef4444", targetAction: "cut" },
  { id: "auto", row: 1, col: 1, label: "AUTO", sublabel: "0.5s", icon: "🔄", category: "transition", activeColor: "#10b981", targetAction: "auto_dissolve" },
  { id: "wipe_l", row: 1, col: 2, label: "WIPE L", sublabel: "15F", icon: "◀", category: "transition", activeColor: "#f59e0b", targetAction: "wipe_left" },
  { id: "wipe_r", row: 1, col: 3, label: "WIPE R", sublabel: "15F", icon: "▶", category: "transition", activeColor: "#f59e0b", targetAction: "wipe_right" },
  { id: "dsk1", row: 1, col: 4, label: "ALERT", sublabel: "DSK 1", icon: "🚨", category: "dsk", activeColor: "#ef4444", targetAction: "dsk1BreakingAlert" },

  // Row 3: DSK Graphics & SFX Soundboard
  { id: "dsk2", row: 2, col: 0, label: "LOWER 3RD", sublabel: "DSK 2", icon: "🏷️", category: "dsk", activeColor: "#3b82f6", targetAction: "dsk2LowerThird" },
  { id: "dsk3", row: 2, col: 1, label: "TICKER", sublabel: "DSK 3", icon: "📈", category: "dsk", activeColor: "#10b981", targetAction: "dsk3TickerTape" },
  { id: "dsk4", row: 2, col: 2, label: "CHAT", sublabel: "DSK 4", icon: "💬", category: "dsk", activeColor: "#8b5cf6", targetAction: "dsk4StreamChat" },
  { id: "sfx_stinger", row: 2, col: 3, label: "STINGER", sublabel: "SFX", icon: "🔔", category: "sfx", activeColor: "#f59e0b", targetAction: "play_stinger" },
  { id: "sfx_applause", row: 2, col: 4, label: "APPLAUSE", sublabel: "SFX", icon: "👏", category: "sfx", activeColor: "#ec4899", targetAction: "play_applause" },
];

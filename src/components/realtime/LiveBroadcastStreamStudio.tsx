"use client";

import React, { useState } from "react";
import { ContinuousVideoQueuePlayer } from "./ContinuousVideoQueuePlayer";
import { useMuseTalkStreamPipeline, StreamBeatInput } from "./useMuseTalkStreamPipeline";
import {
  Play,
  Square,
  Radio,
  Layers,
  Volume2,
  RefreshCw,
  Send,
} from "lucide-react";

const RUBY_GESTURE_OPTIONS = [
  { id: "ruby_intro_welcome", name: "Intro & Welcome", duration: 4.28 },
  { id: "ruby_breaking_alert", name: "Breaking News Alert", duration: 4.28 },
  { id: "ruby_gesture_right", name: "Right Hand Gesture", duration: 8.56 },
  { id: "ruby_emphasis_nod", name: "Affirmative Nod", duration: 4.28 },
  { id: "ruby_look_down_notes", name: "Look at Prompter/Notes", duration: 4.28 },
  { id: "ruby_gesture_left", name: "Left Hand Sweep", duration: 8.56 },
  { id: "ruby_deep_thought_analyst", name: "Analytical Deep Dive", duration: 8.56 },
  { id: "ruby_listen_tilt", name: "Engaged Listening Tilt", duration: 8.56 },
  { id: "ruby_idle", name: "Neutral Rest Base", duration: 4.28 },
  { id: "ruby_signoff_outro", name: "Sign-Off & Outro", duration: 4.28 },
];

const ATTIRE_OPTIONS = [
  { id: "sapphire_dress", name: "Royal Sapphire Dress", color: "from-blue-600 to-indigo-700" },
  { id: "midnight_leather", name: "Midnight Leather Jacket", color: "from-gray-800 to-black" },
  { id: "emerald_suit", name: "Executive Emerald Blazer", color: "from-emerald-700 to-teal-800" },
  { id: "crimson_studio", name: "Crimson Broadcast Suit", color: "from-red-600 to-rose-800" },
];

const SAMPLE_1MIN_SCRIPT: StreamBeatInput[] = [
  { avatarId: "ruby_intro_welcome", text: "Welcome to Ruby NewsStudio. Today we explore real-time neural streaming architectures." },
  { avatarId: "ruby_breaking_alert", text: "Breaking news: subvideo transmission achieves sub-second first-frame delivery." },
  { avatarId: "ruby_gesture_right", text: "Leading technology firms reported exceptional quarterly gains today, driven by accelerated neural deployment." },
  { avatarId: "ruby_emphasis_nod", text: "Analysts confirm that real-time video inference is reshaping digital media workflows permanently." },
  { avatarId: "ruby_look_down_notes", text: "Looking at the latest market indicators, semiconductor equities surged over four percent." },
  { avatarId: "ruby_gesture_left", text: "On the international stage, central banks signaled coordinated computational expansion." },
  { avatarId: "ruby_deep_thought_analyst", text: "Taking a deeper look at the fundamentals, enterprise infrastructure demand shows no signs of slowing down." },
  { avatarId: "ruby_listen_tilt", text: "Our technical panel notes that hardware-accelerated pipelines are setting brand-new broadcast benchmarks." },
  { avatarId: "ruby_idle", text: "We will continue monitoring these developments live from our studio newsroom throughout the evening." },
  { avatarId: "ruby_signoff_outro", text: "Thank you for watching Ruby NewsStudio. Stay tuned, and have a wonderful evening." },
];

export function LiveBroadcastStreamStudio() {
  const [selectedAttire, setSelectedAttire] = useState<string>("sapphire_dress");
  const [selectedVoiceModel, setSelectedVoiceModel] = useState<string>("piper_multilingual");
  const [inputText, setInputText] = useState<string>("");
  const [selectedGesture, setSelectedGesture] = useState<string>("ruby_intro_welcome");

  const {
    isStreaming,
    subvideoQueue,
    metrics,
    startStream,
    stopStream,
    setCurrentPlayingChunk,
  } = useMuseTalkStreamPipeline();

  const handleLaunch1MinBroadcast = () => {
    startStream(SAMPLE_1MIN_SCRIPT, "ruby");
  };

  const handleSendCustomBeat = () => {
    if (!inputText.trim()) return;
    const customBeat: StreamBeatInput = {
      avatarId: selectedGesture,
      text: inputText.trim(),
    };
    startStream([customBeat], "ruby");
    setInputText("");
  };

  return (
    <div className="flex flex-col h-full bg-[#07090e] text-white overflow-hidden rounded-2xl border border-white/10">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-black/60 border-b border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Ruby Vance • Live Broadcast Stream
              <span className="text-[10px] font-mono uppercase bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                Real-Time TensorRT
              </span>
            </h3>
          </div>
        </div>

        {/* Telemetry Metrics */}
        <div className="flex items-center gap-4 text-xs font-mono text-gray-300">
          <div>
            <span className="text-gray-500">TTFB:</span>{" "}
            <span className="text-cyan-400 font-bold">
              {metrics.ttfbMs !== null ? `${metrics.ttfbMs}ms` : "--"}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Buffer:</span>{" "}
            <span className="text-emerald-400 font-bold">{subvideoQueue.length} chunks</span>
          </div>
          <div>
            <span className="text-gray-500">Total Chunks:</span>{" "}
            <span className="text-purple-400 font-bold">{metrics.chunksReceived} / {metrics.totalBeats || "--"}</span>
          </div>
        </div>
      </div>

      {/* Main Studio Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Live Video Stage */}
        <div className="flex-1 relative flex items-center justify-center bg-black p-4">
          <div className="relative w-full h-full max-w-4xl rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-[#030508]">
            <ContinuousVideoQueuePlayer
              queue={subvideoQueue}
              idleVideoSrc="/assets/action_loops/ruby_master_suite/ruby_idle.mp4"
              minBufferCount={1}
              onChunkPlayed={setCurrentPlayingChunk}
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Right: Broadcast Control Room */}
        <div className="w-96 bg-gray-950/90 border-l border-white/10 flex flex-col p-4 space-y-4 overflow-y-auto">
          {/* Action Triggers */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              Broadcast Automation
            </label>
            <button
              onClick={handleLaunch1MinBroadcast}
              disabled={isStreaming}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 hover:from-emerald-500 hover:to-cyan-400 font-bold text-xs text-white shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {isStreaming ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Streaming 1-Min Broadcast...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Launch 1-Min 10-Gesture Broadcast
                </>
              )}
            </button>
            {isStreaming && (
              <button
                onClick={stopStream}
                className="w-full py-2 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/40 font-bold text-xs text-red-300 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5" />
                Stop Stream Pipeline
              </button>
            )}
          </div>

          {/* Attire Swapper */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              Anchor Attire Preset
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ATTIRE_OPTIONS.map((attire) => (
                <button
                  key={attire.id}
                  onClick={() => setSelectedAttire(attire.id)}
                  className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                    selectedAttire === attire.id
                      ? "bg-white/15 border-blue-400 text-white shadow-md"
                      : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  <div className={`w-full h-1.5 rounded-full bg-gradient-to-r ${attire.color} mb-1.5`} />
                  <span className="line-clamp-1">{attire.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Voice Model Selection */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-purple-400" />
              Voice Model Engine
            </label>
            <select
              value={selectedVoiceModel}
              onChange={(e) => setSelectedVoiceModel(e.target.value)}
              className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-gray-200 font-mono outline-none"
            >
              <option value="piper_multilingual">Piper ONNX Multilingual (Port 8005)</option>
              <option value="cosyvoice_neural">CosyVoice Neural Zero-Shot</option>
              <option value="styletts2_expressive">StyleTTS2 Expressive Prosody</option>
            </select>
          </div>

          {/* Interactive Custom Teleprompter Input */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <label className="text-xs font-mono uppercase tracking-wider text-gray-400">
              Live Speech / Gesture Injection
            </label>
            <select
              value={selectedGesture}
              onChange={(e) => setSelectedGesture(e.target.value)}
              className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-cyan-300 font-mono outline-none"
            >
              {RUBY_GESTURE_OPTIONS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.duration}s)
                </option>
              ))}
            </select>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter custom speech for anchor..."
              rows={3}
              className="w-full bg-black/60 border border-white/15 rounded-xl p-3 text-xs text-gray-200 placeholder-gray-500 outline-none resize-none"
            />
            <button
              onClick={handleSendCustomBeat}
              disabled={!inputText.trim() || isStreaming}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              Queue Custom Beat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

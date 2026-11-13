"use client";

import { Mic,Play,Radio,RefreshCw,Send,Sparkles,Square } from "lucide-react";
import React,{ useRef,useState } from "react";

interface AudioDriveControllerProps {
  onGenerateWithAudio: (audioData: {
    audioPath?: string;
    audioBase64?: string;
    label: string;
  }) => void;
  isGenerating: boolean;
}

export function AudioDriveController({
  onGenerateWithAudio,
  isGenerating,
}: AudioDriveControllerProps) {
  const [activeTab, setActiveTab] = useState<"samples" | "mic" | "tts">("samples");
  const [activeSample, setActiveSample] = useState<"en" | "es" | null>(null);
  const [playingSample, setPlayingSample] = useState<"en" | "es" | "tts" | "mic" | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isSynthesizingTts, setIsSynthesizingTts] = useState<boolean>(false);
  const [lastRecordedBase64, setLastRecordedBase64] = useState<string | null>(null);
  const [customText, setCustomText] = useState<string>(
    "Good evening. Global technology markets surged today following groundbreaking announcements in real-time neural avatar intelligence."
  );
  const [ttsVoice, setTtsVoice] = useState<string>("ruby_multilingual");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Handle Benchmark Sample Trigger
  const handleTriggerSample = (lang: "en" | "es") => {
    setActiveSample(lang);
    const audioPath =
      lang === "en"
        ? "/assets/demo_realtime/sample_speech_en.wav"
        : "/assets/demo_realtime/sample_speech_es.wav";

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      setPlayingSample(null);
    }

    onGenerateWithAudio({
      audioPath,
      label: lang === "en" ? "EN Broadcast Benchmark" : "ES Breaking News Benchmark",
    });
  };

  const togglePreview = (lang: "en" | "es", e: React.MouseEvent) => {
    e.stopPropagation();
    const audioPath =
      lang === "en"
        ? "/assets/demo_realtime/sample_speech_en.wav"
        : "/assets/demo_realtime/sample_speech_es.wav";

    if (playingSample === lang) {
      previewAudioRef.current?.pause();
      setPlayingSample(null);
    } else {
      if (previewAudioRef.current) {
        previewAudioRef.current.src = audioPath;
        previewAudioRef.current.currentTime = 0;
        previewAudioRef.current.play().catch(() => {});
        setPlayingSample(lang);
      }
    }
  };

  // Start Mic Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      // Start canvas waveform
      const drawWave = () => {
        if (!canvasRef.current || !analyserRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / dataArray.length) * 2;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height;
          ctx.fillStyle = "#06b6d4";
          ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
          x += barWidth;
        }

        animFrameRef.current = requestAnimationFrame(drawWave);
      };
      drawWave();

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        stream.getTracks().forEach((t) => t.stop());

        const audioBlob = new Blob(recordedChunksRef.current, { type: "audio/wav" });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = (reader.result as string).split(",")[1];
          setLastRecordedBase64(base64Audio);
          onGenerateWithAudio({
            audioBase64: base64Audio,
            label: "Live Mic Audio Take",
          });
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.warn("Microphone permission denied:", err);
    }
  };

  // Stop Mic Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Trigger TTS Generation via Modern-TTS
  const handleTtsGenerate = async () => {
    if (!customText.trim()) return;
    setIsSynthesizingTts(true);

    try {
      const res = await fetch("/api/tts/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          text: customText.trim(),
          personaId: ttsVoice.split("_")[0],
          language: ttsVoice.includes("latam") ? "es" : "en",
          format: "json",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audio_b64) {
          onGenerateWithAudio({
            audioBase64: data.audio_b64,
            label: `TTS: ${ttsVoice} (${customText.slice(0, 24)}...)`,
          });
          return;
        }
      }

      // Fallback if TTS server returns error
      onGenerateWithAudio({
        audioPath: ttsVoice.includes("latam")
          ? "/assets/demo_realtime/sample_speech_es.wav"
          : "/assets/demo_realtime/sample_speech_en.wav",
        label: `TTS: ${ttsVoice} (Sample Track)`,
      });
    } catch {
      onGenerateWithAudio({
        audioPath: "/assets/demo_realtime/sample_speech_en.wav",
        label: `TTS: ${ttsVoice} (Fallback)`,
      });
    } finally {
      setIsSynthesizingTts(false);
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-[#090d16] border border-white/10 space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-mono uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 text-purple-400" />
          Driving Audio Source
        </label>
        {/* Mode Switcher */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/40 border border-white/10 text-[10px] font-mono">
          <button
            onClick={() => setActiveTab("samples")}
            className={`px-2 py-1 rounded-md transition-colors ${
              activeTab === "samples" ? "bg-purple-600 text-white font-bold" : "text-gray-400 hover:text-white"
            }`}
          >
            Benchmarks
          </button>
          <button
            onClick={() => setActiveTab("mic")}
            className={`px-2 py-1 rounded-md transition-colors ${
              activeTab === "mic" ? "bg-purple-600 text-white font-bold" : "text-gray-400 hover:text-white"
            }`}
          >
            Live Mic
          </button>
          <button
            onClick={() => setActiveTab("tts")}
            className={`px-2 py-1 rounded-md transition-colors ${
              activeTab === "tts" ? "bg-purple-600 text-white font-bold" : "text-gray-400 hover:text-white"
            }`}
          >
            TTS Script
          </button>
        </div>
      </div>

      {/* Hidden audio element for previewing sounds */}
      <audio ref={previewAudioRef} onEnded={() => setPlayingSample(null)} />

      {/* Tab 1: Benchmark Samples */}
      {activeTab === "samples" && (
        <div className="grid grid-cols-2 gap-2.5">
          <div
            onClick={() => handleTriggerSample("en")}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer group ${
              activeSample === "en"
                ? "bg-cyan-950/40 border-cyan-400 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-400/40"
                : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/15"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-white flex items-center gap-1">
                🇺🇸 English Broadcast
              </span>
              <button
                type="button"
                onClick={(e) => togglePreview("en", e)}
                className="p-1 rounded-md bg-white/10 hover:bg-cyan-500 hover:text-black text-cyan-300 transition-colors"
                title={playingSample === "en" ? "Stop Preview" : "Listen to Sample"}
              >
                {playingSample === "en" ? (
                  <Square className="w-3 h-3 fill-current" />
                ) : (
                  <Play className="w-3 h-3 fill-current" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-gray-400 line-clamp-1 font-mono">
              4.28s • 24kHz WAV
            </p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10px] text-cyan-400 font-mono font-bold flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                Click to Infer
              </span>
              <span className="text-[9px] text-gray-500 font-mono">
                {playingSample === "en" ? "Playing..." : "Preview"}
              </span>
            </div>
          </div>

          <div
            onClick={() => handleTriggerSample("es")}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer group ${
              activeSample === "es"
                ? "bg-emerald-950/40 border-emerald-400 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400/40"
                : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/15"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-white flex items-center gap-1">
                🇦🇷 Spanish Breaking
              </span>
              <button
                type="button"
                onClick={(e) => togglePreview("es", e)}
                className="p-1 rounded-md bg-white/10 hover:bg-emerald-500 hover:text-black text-emerald-300 transition-colors"
                title={playingSample === "es" ? "Stop Preview" : "Listen to Sample"}
              >
                {playingSample === "es" ? (
                  <Square className="w-3 h-3 fill-current" />
                ) : (
                  <Play className="w-3 h-3 fill-current" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-gray-400 line-clamp-1 font-mono">
              5.12s • 24kHz WAV
            </p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                Click to Infer
              </span>
              <span className="text-[9px] text-gray-500 font-mono">
                {playingSample === "es" ? "Playing..." : "Preview"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Live Mic Input */}
      {activeTab === "mic" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <canvas
              ref={canvasRef}
              width={200}
              height={36}
              className="flex-1 bg-black/60 rounded-xl border border-white/10 h-9"
            />
            {isRecording ? (
              <button
                onClick={stopRecording}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 animate-pulse cursor-pointer"
              >
                <Square className="w-3.5 h-3.5" />
                Stop &amp; Infer
              </button>
            ) : (
              <button
                onClick={startRecording}
                disabled={isGenerating}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5" />
                Record Voice
              </button>
            )}
          </div>
          <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
            <span>
              {isRecording ? "Listening... Speak clearly into your microphone" : "Click record to test real-time voice driving"}
            </span>
            {lastRecordedBase64 && !isRecording && (
              <button
                type="button"
                onClick={() => {
                  if (previewAudioRef.current) {
                    previewAudioRef.current.src = `data:audio/wav;base64,${lastRecordedBase64}`;
                    previewAudioRef.current.currentTime = 0;
                    previewAudioRef.current.play().catch(() => {});
                  }
                }}
                className="text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
              >
                ▶ Listen to Take
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Custom Text-to-Speech */}
      {activeTab === "tts" && (
        <div className="space-y-2.5">
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            rows={2}
            className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-xs text-gray-200 outline-none focus:border-purple-400 resize-none font-sans"
            placeholder="Type script text to synthesize with Modern-TTS..."
          />
          <div className="flex items-center justify-between gap-3">
            <select
              value={ttsVoice}
              onChange={(e) => setTtsVoice(e.target.value)}
              className="bg-black/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-gray-300"
            >
              <option value="ruby_multilingual">Ruby Vance (Prime Anchor)</option>
              <option value="isabel_latam">Isabel Morales (LATAM Lead)</option>
              <option value="blaze_tech">Blaze Sterling (Cyberpunk Host)</option>
              <option value="sophia_ai">Sophia Chen (AI Specialist)</option>
            </select>

            <button
              onClick={handleTtsGenerate}
              disabled={isGenerating || isSynthesizingTts || !customText.trim()}
              className="py-1.5 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSynthesizingTts ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Synthesizing...
                </>
              ) : (
                <>
                  <Send className="w-3 h-3" />
                  Synthesize &amp; Infer
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

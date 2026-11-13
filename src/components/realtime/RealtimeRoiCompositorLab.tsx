"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  PersonaLoopConfig,
  PERSONA_CONFIGS,
  PREGENERATED_SCRIPTS,
  VOICE_OPTIONS,
  MotionBeat,
} from "./types";
import { CanvasStage, PlannedNodePreview } from "./CanvasStage";
import { PersonaSelector } from "./PersonaSelector";
import { VoiceSelector } from "./VoiceSelector";
import { FsmModeSelector, FsmSequenceMode } from "./FsmModeSelector";
import { ScriptSelector } from "./ScriptSelector";
import { TelemetryCard } from "./TelemetryCard";
import { BroadcastSettingsCard } from "./BroadcastSettingsCard";
import { planBroadcastLoopSequence } from "@/lib/video/loopSelector";
import { MotionTier, CameraRigId, ChoreographedBeatNode } from "@/lib/video/loopSelectorTypes";

export function RealtimeRoiCompositorLab() {
  // Persona & Script State
  const [selectedPersona, setSelectedPersona] = useState<PersonaLoopConfig>(PERSONA_CONFIGS[0]);
  const [selectedScriptId, setSelectedScriptId] = useState<string>("es_2min_special");
  const [customText, setCustomText] = useState<string>(
    "¡Último momento! Bienvenidos a la transmisión en vivo de NewsStudio con sincronización labial neuronal en tiempo real. [DATA] Los mercados globales registran importantes avances en tecnología. [BREAKING] Atención a las últimas cotizaciones. [CONCLUSION] Gracias por acompañarnos."
  );
  const [customEngine, setCustomEngine] = useState<string>("omnivoice");
  const [customLanguage, setCustomLanguage] = useState<string>("es");
  const [isGeneratingTts, setIsGeneratingTts] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"pregen" | "custom">("pregen");

  // Voice Persona & Gender Filter State
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("ruby_female");
  const [genderFilter, setGenderFilter] = useState<"all" | "female" | "male">("all");

  // Playback & FSM State
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isCueing, setIsCueing] = useState<boolean>(false);
  const [activeBuffer, setActiveBuffer] = useState<"A" | "B">("A");
  const [currentLoopName, setCurrentLoopName] = useState<string>("P01_NEUTRAL_IDLE");
  const [activeBeatIndex, setActiveBeatIndex] = useState<number>(0);
  const [activeTier, setActiveTier] = useState<MotionTier>("tier1_ambient_idle");
  const [activeCamera, setActiveCamera] = useState<CameraRigId>("cam1_wide");
  const [activeCueTag, setActiveCueTag] = useState<string | undefined>(undefined);
  const [plannedNodes, setPlannedNodes] = useState<PlannedNodePreview[]>([]);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);

  // Motion Beat Sequencing Mode (Director FSM vs Stochastic vs Sequential)
  const [sequenceMode, setSequenceMode] = useState<FsmSequenceMode>("director_fsm");
  const plannedBeatSequenceRef = useRef<number[]>([]);
  const choreographedNodesRef = useRef<ChoreographedBeatNode[]>([]);

  const [switchPolicy, setSwitchPolicy] = useState<"boundary_locked" | "instant">("boundary_locked");

  // Audio Volume State
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Live Telemetry
  const [fps, setFps] = useState<number>(60);
  const [frameIdx, setFrameIdx] = useState<number>(0);
  const [boundaryCountdown, setBoundaryCountdown] = useState<number>(96);
  const [compositorLatencyMs, setCompositorLatencyMs] = useState<number>(1.8);
  const [ttsLatencyMs, setTtsLatencyMs] = useState<number>(280);

  // Element Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoARef = useRef<HTMLVideoElement | null>(null);
  const beatVideoElementsRef = useRef<HTMLVideoElement[]>([]);
  const currentPlayingBeatIdxRef = useRef<number>(-1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAbortControllerRef = useRef<AbortController | null>(null);

  // Timing & Animation Refs
  const lastTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const isSpeakingRef = useRef<boolean>(false);
  const isCueingRef = useRef<boolean>(false);
  const activeBufferRef = useRef<"A" | "B">("A");
  const selectedPersonaRef = useRef<PersonaLoopConfig>(PERSONA_CONFIGS[0]);
  const cueTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize refs
  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
    isCueingRef.current = isCueing;
    activeBufferRef.current = activeBuffer;
    selectedPersonaRef.current = selectedPersona;
  }, [isSpeaking, isCueing, activeBuffer, selectedPersona]);

  // Synchronize audio volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const selectedScript =
    PREGENERATED_SCRIPTS.find((s) => s.id === selectedScriptId) || PREGENERATED_SCRIPTS[0];

  const selectedVoice =
    VOICE_OPTIONS.find((v) => v.id === selectedVoiceId) || VOICE_OPTIONS[0];

  /**
   * Maps an FSM choreographed beat node to a concrete motion beat index in the persona's video pool.
   */
  const mapNodeToMotionBeatIndex = (
    node: ChoreographedBeatNode,
    motionBeats: MotionBeat[]
  ): number => {
    if (motionBeats.length === 0) return 0;

    const normState = node.actionStateId.toLowerCase();
    const normPose = node.endPose.toLowerCase();
    const normTag = (node.cueTag || "").toLowerCase();

    // 1. Direct code/name match
    const exactIdx = motionBeats.findIndex(
      (b) =>
        b.code.toLowerCase() === normState ||
        b.code.toLowerCase() === normPose ||
        b.name.toLowerCase().includes(normState)
    );
    if (exactIdx !== -1) return exactIdx;

    // 2. Semantic cue tag matching
    if (normTag.includes("breaking") || normTag.includes("alert")) {
      const alertIdx = motionBeats.findIndex((b) => b.code.includes("ALERT") || b.name.toLowerCase().includes("breaking"));
      if (alertIdx !== -1) return alertIdx;
    }
    if (normTag.includes("nod") || normTag.includes("emphasis")) {
      const nodIdx = motionBeats.findIndex((b) => b.code.includes("NOD") || b.name.toLowerCase().includes("nod"));
      if (nodIdx !== -1) return nodIdx;
    }
    if (normTag.includes("data") || normTag.includes("explain")) {
      const expIdx = motionBeats.findIndex(
        (b) => b.code.includes("P02") || b.name.toLowerCase().includes("explanatory") || b.code.includes("ANALYST")
      );
      if (expIdx !== -1) return expIdx;
    }
    if (normTag.includes("greeting") || normTag.includes("welcome") || normTag.includes("intro")) {
      const introIdx = motionBeats.findIndex(
        (b) => b.code.includes("INTRO") || b.code.includes("P03") || b.name.toLowerCase().includes("welcome")
      );
      if (introIdx !== -1) return introIdx;
    }
    if (normTag.includes("outro") || normTag.includes("conclusion") || normTag.includes("signoff")) {
      const signoffIdx = motionBeats.findIndex(
        (b) => b.code.includes("SIGNOFF") || b.name.toLowerCase().includes("signoff") || b.code.includes("OUTRO")
      );
      if (signoffIdx !== -1) return signoffIdx;
    }
    if (normTag.includes("notes") || normTag.includes("script")) {
      const notesIdx = motionBeats.findIndex((b) => b.code.includes("NOTES") || b.name.toLowerCase().includes("notes"));
      if (notesIdx !== -1) return notesIdx;
    }

    // 3. Match pose codes
    if (normPose.includes("p02") || normPose.includes("explanatory")) {
      const idx = motionBeats.findIndex((b) => b.code.includes("P02") || b.name.toLowerCase().includes("explanatory"));
      if (idx !== -1) return idx;
    }
    if (normPose.includes("p03") || normPose.includes("open")) {
      const idx = motionBeats.findIndex((b) => b.code.includes("P03") || b.name.toLowerCase().includes("welcoming"));
      if (idx !== -1) return idx;
    }

    // 4. Fallback: modulo distribution
    return node.beatIndex % motionBeats.length;
  };

  // Stochastic FSM Sequence Generator
  const generateFsmBeatSequence = (estimatedBeats: number, totalBeatsInPool: number): number[] => {
    if (totalBeatsInPool <= 1) return new Array(estimatedBeats).fill(0);
    const seq: number[] = [0]; // Always begin with Intro / Lead Welcoming beat (Index 0)
    for (let i = 1; i < estimatedBeats; i++) {
      const isLastBeat = i === estimatedBeats - 1;
      if (isLastBeat && totalBeatsInPool >= 2) {
        seq.push(totalBeatsInPool - 1); // Conclude on Signoff Outro
      } else {
        const prev = seq[i - 1];
        const pool: number[] = [];
        for (let b = 0; b < totalBeatsInPool; b++) {
          if (b !== prev && (!isLastBeat && totalBeatsInPool > 3 ? b !== totalBeatsInPool - 1 : true)) {
            pool.push(b);
          }
        }
        const chosen = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : (prev + 1) % totalBeatsInPool;
        seq.push(chosen);
      }
    }
    return seq;
  };

  // Switch persona handler
  const handleSelectPersona = (persona: PersonaLoopConfig) => {
    setSelectedPersona(persona);
    selectedPersonaRef.current = persona;
    setIsSpeaking(false);
    setIsCueing(false);
    setActiveBuffer("A");
    setCurrentLoopName("P01_NEUTRAL_IDLE");
    setActiveBeatIndex(0);
    setActiveTier("tier1_ambient_idle");
    setActiveCamera("cam1_wide");
    setActiveCueTag(undefined);
    setPlannedNodes([]);
    currentPlayingBeatIdxRef.current = -1;

    if (cueTimeoutRef.current) clearTimeout(cueTimeoutRef.current);

    if (videoARef.current) {
      videoARef.current.src = persona.idleVideo;
      videoARef.current.currentTime = 0;
      videoARef.current.muted = true;
      videoARef.current.play().then(() => setIsVideoPlaying(true)).catch(() => {});
    }

    beatVideoElementsRef.current.forEach((vid, idx) => {
      if (vid && persona.motionBeats[idx]) {
        vid.src = persona.motionBeats[idx].videoUrl;
        vid.currentTime = 0;
        vid.muted = true;
        vid.load();
      }
    });
  };

  // MediaRecorder & Canvas Export State
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [, setIsRecording] = useState<boolean>(false);
  const [recordedBlobSizeMb, setRecordedBlobSizeMb] = useState<string>("0.0");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined" || !("MediaRecorder" in window)) return;

    try {
      const canvasStream = canvas.captureStream(30);

      // Attach audio track directly from master audio element
      if (audioRef.current && (audioRef.current as unknown as { captureStream?: () => MediaStream }).captureStream) {
        try {
          const audioStream = (audioRef.current as unknown as { captureStream: () => MediaStream }).captureStream();
          const audioTracks = audioStream.getAudioTracks();
          if (audioTracks.length > 0) {
            canvasStream.addTrack(audioTracks[0]);
          }
        } catch (e) {
          console.warn("Audio capture note:", e);
        }
      }

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : "video/webm";

      const recorder = new MediaRecorder(canvasStream, {
        mimeType,
        videoBitsPerSecond: 4000000,
      });

      recordedChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const sizeMb = (blob.size / (1024 * 1024)).toFixed(2);
        const url = URL.createObjectURL(blob);
        setRecordedVideoUrl(url);
        setRecordedBlobSizeMb(sizeMb);
        setIsRecording(false);
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("MediaRecorder start failed:", err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  }, []);

  const downloadRecordedVideo = () => {
    if (!recordedVideoUrl) return;
    const a = document.createElement("a");
    a.href = recordedVideoUrl;
    a.download = `newsstudio_${selectedPersona.id}_multibeat_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Boundary Flip Executor -> starts multi-video loop sequence
  const executeBoundarySwitch = useCallback(() => {
    if (cueTimeoutRef.current) {
      clearTimeout(cueTimeoutRef.current);
      cueTimeoutRef.current = null;
    }
    isCueingRef.current = false;
    isSpeakingRef.current = true;
    setIsCueing(false);
    setIsSpeaking(true);
    setActiveBuffer("B");

    const persona = selectedPersonaRef.current;
    const beats = persona.motionBeats;
    const beatDuration = beats[0]?.durationSec || 4.0;
    const audioDuration = audioRef.current?.duration || 120.0;
    const estimatedBeats = Math.max(1, Math.ceil(audioDuration / beatDuration));
    const scriptText = activeTab === "pregen" ? selectedScript.text : customText;

    if (sequenceMode === "director_fsm") {
      // 1. SMART PACING DIRECTOR FSM
      const domain = persona.id.includes("studio") ? "seated_broadcast_desk" : "chroma_wall_standing";
      const loopPlan = planBroadcastLoopSequence({
        totalDurationSeconds: audioDuration,
        personaId: persona.id,
        domain,
        scriptText,
        beatDurationSec: beatDuration,
      });

      choreographedNodesRef.current = loopPlan.sequence;

      const mappedIndices: number[] = [];
      const nodePreviews: PlannedNodePreview[] = [];

      loopPlan.sequence.forEach((node) => {
        const beatIdx = mapNodeToMotionBeatIndex(node, beats);
        mappedIndices.push(beatIdx);
        nodePreviews.push({
          beatIndex: node.beatIndex,
          code: beats[beatIdx]?.code || node.actionStateId,
          label: node.actionStateLabel || beats[beatIdx]?.name || "Motion Beat",
          tier: node.tier,
          camera: node.camera,
          cueTag: node.cueTag,
          durationSec: node.durationSec,
        });
      });

      plannedBeatSequenceRef.current = mappedIndices;
      setPlannedNodes(nodePreviews);
      if (nodePreviews[0]) {
        setActiveTier(nodePreviews[0].tier as MotionTier);
        setActiveCamera(nodePreviews[0].camera as CameraRigId);
        setActiveCueTag(nodePreviews[0].cueTag);
      }
    } else if (sequenceMode === "stochastic") {
      // 2. STOCHASTIC MARKOV
      plannedBeatSequenceRef.current = generateFsmBeatSequence(estimatedBeats, beats.length);
      const previews: PlannedNodePreview[] = plannedBeatSequenceRef.current.map((idx, beatNum) => ({
        beatIndex: beatNum,
        code: beats[idx]?.code || `BEAT_${idx + 1}`,
        label: beats[idx]?.name || "Stochastic Beat",
        tier: "tier1_ambient_idle",
        camera: "cam1_wide",
        durationSec: beatDuration,
      }));
      setPlannedNodes(previews);
    } else {
      // 3. SEQUENTIAL
      plannedBeatSequenceRef.current = Array.from({ length: estimatedBeats }, (_, i) => i % beats.length);
      const previews: PlannedNodePreview[] = plannedBeatSequenceRef.current.map((idx, beatNum) => ({
        beatIndex: beatNum,
        code: beats[idx]?.code || `BEAT_${idx + 1}`,
        label: beats[idx]?.name || "Sequential Beat",
        tier: "tier1_ambient_idle",
        camera: "cam1_wide",
        durationSec: beatDuration,
      }));
      setPlannedNodes(previews);
    }

    const initialBeatIdx = plannedBeatSequenceRef.current[0] || 0;
    currentPlayingBeatIdxRef.current = initialBeatIdx;
    startRecording();

    // Start initial beat video smoothly
    const firstVid = beatVideoElementsRef.current[initialBeatIdx];
    if (firstVid) {
      firstVid.currentTime = 0;
      firstVid.muted = true;
      firstVid.play().catch(() => {});
    }

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [sequenceMode, activeTab, selectedScript.text, customText, startRecording]);

  // Main Canvas Rendering Loop with Fluid Boundary-Locked Multi-Video Sequences
  useEffect(() => {
    let animId: number;
    const loopFps = 24;

    const renderLoop = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const startPerf = performance.now();
          const videoA = videoARef.current;
          const beats = selectedPersonaRef.current.motionBeats;
          const beatDuration = beats[0]?.durationSec || 4.0;
          const loopTotalFrames = Math.round(beatDuration * loopFps);

          let activeVideo: HTMLVideoElement | null = null;

          // When speaking, smoothly orchestrate multi-video motion beats (Director FSM / Stochastic / Sequential)
          if (isSpeakingRef.current && audioRef.current && !audioRef.current.paused) {
            const masterAudioTime = audioRef.current.currentTime;
            const beatOrdinal = Math.floor(masterAudioTime / beatDuration);
            const beatIdx = plannedBeatSequenceRef.current[beatOrdinal] !== undefined
              ? plannedBeatSequenceRef.current[beatOrdinal]
              : (beatOrdinal % beats.length);
            const beatLocalTime = masterAudioTime - (beatOrdinal * beatDuration);

            setActiveBeatIndex(beatIdx);
            setCurrentLoopName(beats[beatIdx]?.code || "P02_MOTION_BEAT");

            // Update live tier and camera from choreographed node
            const currentNode = choreographedNodesRef.current[beatOrdinal];
            if (currentNode) {
              setActiveTier(currentNode.tier);
              setActiveCamera(currentNode.camera);
              setActiveCueTag(currentNode.cueTag);
            }

            const curBeatVideo = beatVideoElementsRef.current[beatIdx];

            // Clean beat transition: start next beat with 0 decoder seek thrash
            if (beatIdx !== currentPlayingBeatIdxRef.current) {
              const prevVid = beatVideoElementsRef.current[currentPlayingBeatIdxRef.current];
              if (prevVid && prevVid !== curBeatVideo) {
                prevVid.pause();
                prevVid.currentTime = 0;
              }
              if (curBeatVideo) {
                curBeatVideo.currentTime = 0;
                curBeatVideo.muted = true;
                curBeatVideo.play().catch(() => {});
              }
              currentPlayingBeatIdxRef.current = beatIdx;
            }

            if (curBeatVideo && (curBeatVideo.readyState >= 1 || curBeatVideo.currentTime > 0)) {
              activeVideo = curBeatVideo;
              if (curBeatVideo.paused) {
                curBeatVideo.play().catch(() => {});
              }
              // Soft resync ONLY on major buffer drift (> 350ms), preventing hardware decoder stalling!
              if (Math.abs(curBeatVideo.currentTime - beatLocalTime) > 0.35) {
                curBeatVideo.currentTime = beatLocalTime;
              }
            }
          } else {
            activeVideo = videoA;
            if (videoA && videoA.paused) {
              videoA.play().catch(() => {});
            }
          }

          if (activeVideo && (activeVideo.readyState >= 1 || activeVideo.videoWidth > 0)) {
            ctx.drawImage(activeVideo, 0, 0, canvas.width, canvas.height);
            if (!isVideoPlaying) setIsVideoPlaying(true);

            const curLoopTime = activeVideo.currentTime % beatDuration;
            const curFrame = Math.floor(curLoopTime * loopFps);
            const remainingFrames = loopTotalFrames - curFrame;

            setFrameIdx(curFrame);
            setBoundaryCountdown(remainingFrames);

            // Boundary flip check
            if (isCueingRef.current && remainingFrames <= 2) {
              executeBoundarySwitch();
            }
          } else {
            ctx.fillStyle = "#0a0d14";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#1e293b";
            ctx.font = "bold 16px monospace";
            ctx.textAlign = "center";
            ctx.fillText("Loading Video Stream...", canvas.width / 2, canvas.height / 2);
          }

          const endPerf = performance.now();
          setCompositorLatencyMs(Math.round((endPerf - startPerf) * 100) / 100);

          frameCountRef.current++;
          const now = performance.now();
          if (now - lastTimeRef.current >= 1000) {
            setFps(frameCountRef.current);
            frameCountRef.current = 0;
            lastTimeRef.current = now;
          }
        }
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [executeBoundarySwitch, isVideoPlaying]);

  // Initial video play on mount
  useEffect(() => {
    const startVideos = () => {
      if (videoARef.current) {
        videoARef.current.muted = true;
        videoARef.current.play().then(() => setIsVideoPlaying(true)).catch(() => {});
      }
    };
    startVideos();
    window.addEventListener("click", startVideos, { once: true });
    return () => window.removeEventListener("click", startVideos);
  }, []);

  // Audio completion handler -> return to idle loop cleanly
  const handleAudioEnded = () => {
    stopRecording();
    if (cueTimeoutRef.current) {
      clearTimeout(cueTimeoutRef.current);
      cueTimeoutRef.current = null;
    }
    isSpeakingRef.current = false;
    isCueingRef.current = false;
    setIsSpeaking(false);
    setIsCueing(false);
    setActiveBuffer("A");
    setCurrentLoopName("P01_NEUTRAL_IDLE");
    setActiveBeatIndex(0);
    setActiveTier("tier1_ambient_idle");
    setActiveCamera("cam1_wide");
    setActiveCueTag(undefined);
    setPlannedNodes([]);
    currentPlayingBeatIdxRef.current = -1;

    beatVideoElementsRef.current.forEach((vid) => {
      if (vid) {
        vid.pause();
        vid.currentTime = 0;
      }
    });

    if (videoARef.current) {
      videoARef.current.muted = true;
      videoARef.current.play().then(() => setIsVideoPlaying(true)).catch(() => {});
    }
  };

  // Trigger Real-Time Lip-Sync
  const triggerLipSync = () => {
    if (isSpeakingRef.current || isCueingRef.current) return;

    if (switchPolicy === "boundary_locked") {
      isCueingRef.current = true;
      setIsCueing(true);
      if (cueTimeoutRef.current) clearTimeout(cueTimeoutRef.current);
      cueTimeoutRef.current = setTimeout(() => {
        if (isCueingRef.current) {
          executeBoundarySwitch();
        }
      }, 4100);
    } else {
      executeBoundarySwitch();
    }
  };

  // Browser Web Speech fallback helper
  const triggerBrowserWebSpeech = (textToSpeak: string, lang: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = lang === "es" ? "es-ES" : "en-US";
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        setIsGeneratingTts(false);
        triggerLipSync();
      };

      utterance.onend = () => {
        handleAudioEnded();
      };

      window.speechSynthesis.speak(utterance);
    } else {
      setIsGeneratingTts(false);
      triggerLipSync();
    }
  };

  // Universal Real-Time Synthesis & Lip-Sync Trigger with Full Semantic Context
  const startRealtimeSynthesisAndLipSync = async (textOverride?: string, langOverride?: string) => {
    const text = (textOverride || (activeTab === "pregen" ? selectedScript.text : customText)).trim();
    const lang = langOverride || (activeTab === "pregen" ? (selectedScript.language.toLowerCase().includes("spanish") ? "es" : "en") : customLanguage);

    if (!text || isSpeaking || isGeneratingTts) return;

    if (customEngine === "webspeech") {
      triggerBrowserWebSpeech(text, lang);
      return;
    }

    if (ttsAbortControllerRef.current) {
      ttsAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    ttsAbortControllerRef.current = abortController;

    setIsGeneratingTts(true);
    const startTtsTime = performance.now();

    try {
      const res = await fetch("/api/tts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({
          text,
          engine: customEngine,
          language: lang,
          persona_id: selectedVoice.personaId,
          reference_audio_filename: selectedVoice.voiceFile,
        }),
      });

      if (abortController.signal.aborted) return;

      if (!res.ok) {
        throw new Error(`TTS server responded with ${res.status}`);
      }

      const audioBlob = await res.blob();
      if (abortController.signal.aborted) return;

      const audioUrl = URL.createObjectURL(audioBlob);
      const ttsLatency = Math.round(performance.now() - startTtsTime);
      setTtsLatencyMs(ttsLatency);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.oncanplay = () => {
          if (!abortController.signal.aborted) {
            setIsGeneratingTts(false);
            triggerLipSync();
          }
        };
        audioRef.current.load();
        setTimeout(() => {
          if (isGeneratingTts && !abortController.signal.aborted) {
            setIsGeneratingTts(false);
            triggerLipSync();
          }
        }, 300);
      } else {
        setIsGeneratingTts(false);
        triggerLipSync();
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError" || abortController.signal.aborted) {
        setIsGeneratingTts(false);
        return;
      }
      console.warn("Modern-TTS Server error, falling back to Web Speech:", err);
      setIsGeneratingTts(false);
      triggerBrowserWebSpeech(text, lang);
    }
  };

  // Stop / Reset to Idle (Instant & Deterministic)
  const stopLipSync = () => {
    // 1. Abort in-flight network TTS generation
    if (ttsAbortControllerRef.current) {
      ttsAbortControllerRef.current.abort();
      ttsAbortControllerRef.current = null;
    }

    // 2. Cancel browser speech
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    // 3. Clear cueing timers
    if (cueTimeoutRef.current) {
      clearTimeout(cueTimeoutRef.current);
      cueTimeoutRef.current = null;
    }

    // 4. Pause and reset audio element
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
    }

    // 5. Pause and reset all beat video decoders
    beatVideoElementsRef.current.forEach((vid) => {
      if (vid) {
        vid.pause();
        vid.currentTime = 0;
      }
    });

    // 6. Stop live recording
    stopRecording();

    // 7. Synchronously update refs to prevent renderLoop from continuing to draw speech frames
    isSpeakingRef.current = false;
    isCueingRef.current = false;
    activeBufferRef.current = "A";
    currentPlayingBeatIdxRef.current = -1;

    // 8. Update React UI state
    setIsSpeaking(false);
    setIsCueing(false);
    setIsGeneratingTts(false);
    setActiveBuffer("A");
    setCurrentLoopName("P01_NEUTRAL_IDLE");
    setActiveBeatIndex(0);
    setActiveTier("tier1_ambient_idle");
    setActiveCamera("cam1_wide");
    setActiveCueTag(undefined);
    setPlannedNodes([]);

    // 9. Re-activate idle video loop immediately
    if (videoARef.current) {
      videoARef.current.muted = true;
      videoARef.current.play().then(() => setIsVideoPlaying(true)).catch(() => {});
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col xl:flex-row overflow-hidden bg-[#07090e] text-white">
      {/* Hidden Offscreen Media Decoder Elements */}
      <div
        style={{
          position: "absolute",
          top: -9999,
          left: -9999,
          width: 1,
          height: 1,
          opacity: 0.01,
          pointerEvents: "none",
          overflow: "hidden",
        }}
        aria-hidden="true"
      >
        <video
          ref={videoARef}
          src={selectedPersona.idleVideo}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
        />
        {selectedPersona.motionBeats.map((beat, idx) => (
          <video
            key={`${selectedPersona.id}_beat_${idx}`}
            ref={(el) => {
              if (el) beatVideoElementsRef.current[idx] = el;
            }}
            src={beat.videoUrl}
            loop
            muted
            playsInline
            preload="auto"
          />
        ))}
        <audio
          ref={audioRef}
          onEnded={handleAudioEnded}
          preload="auto"
        />
      </div>

      {/* LEFT: Live Video Canvas Stage */}
      <CanvasStage
        canvasRef={canvasRef}
        selectedPersona={selectedPersona}
        isSpeaking={isSpeaking}
        isCueing={isCueing}
        activeBeatIndex={activeBeatIndex}
        currentLoopName={currentLoopName}
        activeTier={activeTier}
        activeCamera={activeCamera}
        activeCueTag={activeCueTag}
        activeBuffer={activeBuffer}
        boundaryCountdown={boundaryCountdown}
        frameIdx={frameIdx}
        volume={volume}
        isMuted={isMuted}
        onVolumeChange={(vol) => {
          setVolume(vol);
          if (isMuted && vol > 0) setIsMuted(false);
        }}
        onToggleMute={() => setIsMuted(!isMuted)}
        recordedVideoUrl={recordedVideoUrl}
        recordedBlobSizeMb={recordedBlobSizeMb}
        onDownloadRecordedVideo={downloadRecordedVideo}
        plannedNodes={plannedNodes}
      />

      {/* RIGHT: Live Control Cockpit & Persona Selection */}
      <div className="w-full xl:w-96 shrink-0 border-t xl:border-t-0 xl:border-l border-white/10 bg-gray-950/90 backdrop-blur-xl p-4 flex flex-col gap-4 overflow-y-auto z-20 max-h-[90vh] xl:max-h-full">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 border border-cyan-500/40 text-cyan-300 uppercase">
              Real-Time Demo
            </span>
            <h2 className="text-sm font-bold text-gray-100">256px ROI Lip-Sync Lab</h2>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Browser-side compositing of lightweight $256\times256$ mouth patches over boundary-locked video loops.
          </p>
        </div>

        {/* 1. AI Persona Selector */}
        <PersonaSelector
          selectedPersona={selectedPersona}
          onSelectPersona={handleSelectPersona}
          disabled={isSpeaking || isCueing || isGeneratingTts}
        />

        {/* 2. Voice & Speaker Identity Selector (Female / Male) */}
        <VoiceSelector
          selectedVoiceId={selectedVoiceId}
          onSelectVoiceId={setSelectedVoiceId}
          genderFilter={genderFilter}
          onSelectGenderFilter={setGenderFilter}
          disabled={isSpeaking || isCueing || isGeneratingTts}
        />

        <FsmModeSelector
          sequenceMode={sequenceMode}
          onSelectSequenceMode={(mode: FsmSequenceMode) => setSequenceMode(mode)}
          disabled={isSpeaking || isCueing || isGeneratingTts}
        />


        {/* 4. Script Selection Tabs */}
        <ScriptSelector
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          selectedScriptId={selectedScriptId}
          onSelectScriptId={setSelectedScriptId}
          customText={customText}
          onChangeCustomText={setCustomText}
          customEngine={customEngine}
          onChangeCustomEngine={setCustomEngine}
          customLanguage={customLanguage}
          onChangeCustomLanguage={setCustomLanguage}
          disabled={isSpeaking || isCueing || isGeneratingTts}
        />

        {/* 5. Action Trigger Button */}
        <div className="flex flex-col gap-2 pt-1">
          {!isSpeaking && !isCueing && !isGeneratingTts ? (
            <button
              onClick={() => startRealtimeSynthesisAndLipSync()}
              className="w-full py-3.5 rounded-xl font-black text-xs text-black tracking-wider uppercase shadow-lg transition-all cursor-pointer transform hover:scale-[1.01] flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 shadow-cyan-950/60"
            >
              <span>🚀</span>
              <span>{activeTab === "pregen" ? "START REAL-TIME SYNTHESIS & LIP-SYNC" : `SYNTHESIZE WITH ${customEngine.toUpperCase()} & LIP-SYNC`}</span>
            </button>
          ) : (
            <button
              onClick={stopLipSync}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-xs tracking-wider uppercase transition-all shadow-xl shadow-red-950/80 cursor-pointer flex items-center justify-center gap-2 transform active:scale-95"
            >
              <span>⏹️</span>
              <span>{isGeneratingTts ? "CANCEL / STOP GENERATION" : "STOP / RETURN TO IDLE LOOP"}</span>
            </button>
          )}
        </div>

        {/* 6. Hardware Telemetry Card */}
        <TelemetryCard
          fps={fps}
          compositorLatencyMs={compositorLatencyMs}
          ttsLatencyMs={ttsLatencyMs}
          customEngine={customEngine}
        />

        {/* 7. Broadcast & Master Audio Settings */}
        <BroadcastSettingsCard
          volume={volume}
          isMuted={isMuted}
          onVolumeChange={(vol) => {
            setVolume(vol);
            if (isMuted && vol > 0) setIsMuted(false);
          }}
          onToggleMute={() => setIsMuted(!isMuted)}
          switchPolicy={switchPolicy}
          onToggleSwitchPolicy={() =>
            setSwitchPolicy(
              switchPolicy === "boundary_locked" ? "instant" : "boundary_locked"
            )
          }
        />
      </div>
    </div>
  );
}

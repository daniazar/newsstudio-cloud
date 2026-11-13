"use client";

const TTS_MODE = process.env.NEXT_PUBLIC_TTS_MODE || "server";

import { useToast } from "@/components/global/ToastContainer";
import { Button } from "@/components/ui/Button";
import { DEFAULT_VOICE_PARAMS,PERSONAS,Persona,VoiceParams,getPersonaById } from "@/lib/tts/personas";
import type { UseModernTtsReturn } from "@/lib/tts/useModernTts";
import React,{ useMemo,useRef,useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const LANGUAGE_LABELS: Record<string, string> = {
  en: "🇺🇸 English",
  es: "🇪🇸 Español",
  fr: "🇫🇷 Français",
  it: "🇮🇹 Italiano",
  de: "🇩🇪 Deutsch",
  pt: "🇧🇷 Português",
  zh: "🇨🇳 中文",
  ja: "🇯🇵 日本語",
};

export interface ClonedPersona {
  id: string;
  name: string;
  role?: string;
  language?: string;
  gender?: string;
  referenceAudioKey?: string;
  voiceParams?: string | null;
  slug?: string;
  isSystemPersona?: boolean;
  avatars?: { isDefault?: boolean; url?: string }[];
  params?: VoiceParams;
}

interface VoiceStudioPanelProps {
  tts: UseModernTtsReturn;
  batchState?: {
    isBatching?: boolean;
    batchResults?: Record<number, string>;
    blobMap?: Record<number, Blob>;
    setBlobMap?: (updater: (prev: Record<string, Blob>) => Record<string, Blob>) => void;
    setBatchResults?: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
    runBatch?: (...args: unknown[]) => void;
    cancelBatch?: () => void;
    [key: string]: unknown;
  };
  segments: { index: number; text?: string; spokenText?: string; personaId?: string; [key: string]: unknown }[];
  activeSegment?: { index: number; text?: string; spokenText?: string; personaId?: string; [key: string]: unknown } | null;
  onSegmentVoiceUpdate?: (segmentIndex: number, personaId: string, params: VoiceParams) => void;
  onSegmentDurationUpdate?: (segmentIndex: number, duration: number) => void;
  onAudioGenerated?: (segmentIndex: number, blob: Blob) => Promise<void>;
  onGenerateAll?: () => void;
}

interface SliderRowProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  hint?: string;
}

const SliderRow: React.FC<SliderRowProps> = ({ label, min, max, step, value, onChange, format, hint }) => (
  <div className="space-y-1">
    <div className="flex justify-between items-center">
      <label className="text-[10px] font-bold uppercase text-muted">{label}</label>
      <span className="text-[10px] font-mono text-accent">{format ? format(value) : value.toFixed(2)}</span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full accent-accent h-1.5 cursor-pointer"
    />
    {hint && <p className="text-[9px] text-muted leading-tight italic">{hint}</p>}
  </div>
);

export const VoiceStudioPanel: React.FC<VoiceStudioPanelProps> = ({
  tts, batchState, segments, activeSegment, onSegmentVoiceUpdate, onSegmentDurationUpdate, onGenerateAll: _onGenerateAll, onAudioGenerated,
}) => {
  const { data: dbPersonasRaw, mutate } = useSWR<Record<string, unknown>>("/api/personas?limit=500", fetcher);
  const dbPersonas = Array.isArray(dbPersonasRaw) ? dbPersonasRaw : (dbPersonasRaw?.data ?? dbPersonasRaw?.personas ?? []);
  const clonedPersonas = (dbPersonas as ClonedPersona[]).filter((p) => !p.isSystemPersona);
  const { toast } = useToast();
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("ruby");
  const [customParams, setCustomParams] = useState<VoiceParams>(DEFAULT_VOICE_PARAMS);
  const [isCustom, setIsCustom] = useState(false);
  const [filterGender, setFilterGender] = useState<"all" | "female" | "male">("all");
  const [filterLang, setFilterLang] = useState<string>("all");
  const [isFinetuneOpen, setIsFinetuneOpen] = useState(false);

  // Internal scene selection for "Test a Scene" — independent of timeline click
  const [selectedTestSceneIdx, setSelectedTestSceneIdx] = useState<number | null>(null);
  const testSegment = segments.find(s => s.index === selectedTestSceneIdx) ?? null;

  const [cloneMode, setCloneMode] = useState<"upload" | "record" | null>(null);
  const [referenceBlob, setReferenceBlob] = useState<Blob | null>(null);
  const [referenceDuration, setReferenceDuration] = useState<number>(0);
  const [isRecording, setIsRecording] = useState(false);
  const [cloneName, setCloneName] = useState("");
  const [cloneTitle, setCloneTitle] = useState("");
  const [cloneAvatars, setCloneAvatars] = useState<string[]>([]);
  const [cloneBio, setCloneBio] = useState("");
  const [cloneGender, setCloneGender] = useState<"female" | "male">("female");
  const [cloneLang, setCloneLang] = useState("en");
  const [isSavingClone, setIsSavingClone] = useState(false);
  const [isOptimizingCadence, setIsOptimizingCadence] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleOptimizeAllCadence = async () => {
    setIsOptimizingCadence(true);
    try {
      const storyId = window.location.pathname.split("/").pop();
      const res = await fetch(`/api/stories/${storyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "polish-script", mode: "all_segments" }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch (e) {
      console.error("Failed to optimize script cadence:", e);
    } finally {
      setIsOptimizingCadence(false);
    }
  };

  const selectedPersona = useMemo(() => {
    return getPersonaById(selectedPersonaId) || clonedPersonas.find((p) => p.id === selectedPersonaId);
  }, [selectedPersonaId, clonedPersonas]);
  
  const activeParams: VoiceParams = isCustom ? customParams : (selectedPersona && "voiceParams" in selectedPersona && selectedPersona.voiceParams ? JSON.parse(selectedPersona.voiceParams) : (selectedPersona?.params ?? DEFAULT_VOICE_PARAMS));

  const filteredPersonas = useMemo(() => {
    return PERSONAS.filter((p) => {
      if (filterGender !== "all" && p.gender !== filterGender) return false;
      if (filterLang !== "all" && p.language !== filterLang) return false;
      return true;
    });
  }, [filterGender, filterLang]);

  const handleSelectPersona = (persona: Persona | ClonedPersona | Record<string, unknown>) => {
    const pId = ("id" in persona ? (persona.id as string) : "") || ("slug" in persona ? (persona.slug as string) : "") || "ruby";
    setSelectedPersonaId(pId);
    const vp = "voiceParams" in persona && typeof persona.voiceParams === "string" ? persona.voiceParams : null;
    const pParams = "params" in persona && persona.params ? (persona.params as VoiceParams) : DEFAULT_VOICE_PARAMS;
    setCustomParams(vp ? JSON.parse(vp) : pParams);
    setIsCustom(false);
  };

  const handleParamChange = (key: keyof VoiceParams, value: number) => {
    // If we change a 'baked' param (one that requires model inference), clear the current generated blobs.
    // Live params like speed and pitchShift don't require clearing because they are applied during playback.
    const liveParams: (keyof VoiceParams)[] = ["speed", "pitchShift"];
    if (!liveParams.includes(key)) {
      batchState?.setBlobMap?.(() => ({})); 
    }
    
    setIsCustom(true);
    setCustomParams((prev) => ({ ...prev, [key]: value }));
  };

  const handlePreviewCurrentSegment = async () => {
    const seg = testSegment ?? activeSegment;
    if (!seg?.text) return;

    let referenceAudioSource: string | undefined;
    const cloned = clonedPersonas.find((p) => p.id === selectedPersonaId || p.slug === selectedPersonaId) as { voices?: { audioPath: string }[] } | undefined;
    if (cloned && cloned.voices && cloned.voices.length > 0) {
      referenceAudioSource = cloned.voices[0].audioPath;
    }

    const textToSpeak = seg.spokenText?.trim() || seg.text;
    const blob = await tts.generateAudio(`scene-${seg.index}`, textToSpeak, selectedPersonaId, activeParams, referenceAudioSource);
    if (blob) {
      batchState?.setBlobMap?.((prev) => ({ ...prev, [seg.index]: blob }));
      batchState?.setBatchResults?.((prev) => ({ ...prev, [seg.index]: "done" }));
      tts.previewAudio(blob, activeParams.speed, activeParams.pitchShift);
    }
  };

  const _handleAssignToSegment = () => {
    if (!activeSegment) return;
    onSegmentVoiceUpdate?.(activeSegment.index, selectedPersonaId, activeParams);
  };

  // Map valid segments
  const validSegments = useMemo(() => segments.filter((s) => s.index >= 0 && s.text?.trim()), [segments]);

  const handleGenerateAll = () => {
    batchState?.runBatch?.(
      validSegments, 
      (seg: { personaId?: string }) => seg.personaId || selectedPersonaId, 
      activeParams,
      onSegmentDurationUpdate,
      onAudioGenerated
    );
  };

  const handleRetryFailed = () => {
    if (!batchState) return;
    const failedSegments = validSegments.filter((s) => batchState.batchResults?.[s.index] === "error");
    batchState.runBatch?.(
      failedSegments, 
      (seg: { personaId?: string }) => seg.personaId || selectedPersonaId, 
      activeParams,
      onSegmentDurationUpdate,
      onAudioGenerated
    );
  };

  const handlePlayScene = (segIndex: number) => {
    const blob = batchState?.blobMap?.[segIndex];
    if (blob) tts.previewAudio(blob, activeParams.speed, activeParams.pitchShift);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setReferenceBlob(blob);
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onloadedmetadata = () => setReferenceDuration(Math.round(audio.duration));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
    } catch {
      toast("Microphone Denied", "Microphone access was denied. Please allow microphone permissions in your browser.", "error");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReferenceBlob(file);
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.onloadedmetadata = () => setReferenceDuration(Math.round(audio.duration));
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setCloneAvatars(prev => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSaveClone = async () => {
    if (!referenceBlob || !cloneName.trim()) {
      toast("Missing Fields", "Please provide a name and a voice reference.", "warning");
      return;
    }
    setIsSavingClone(true);
    try {
      const slug = "clone_" + Date.now();
      const paramsToSave = { ...DEFAULT_VOICE_PARAMS, pitchShift: cloneGender === "male" ? -4 : 0 };

      // 1. Create persona
      const personaRes = await fetch("/api/personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          name: cloneName,
          role: cloneTitle || "Cloned Voice",
          gender: cloneGender,
          language: cloneLang,
          description: `Cloned voice (${referenceDuration}s reference). ${cloneBio}`,
          voiceParams: paramsToSave
        })
      });
      if (!personaRes.ok) throw new Error("Failed to create persona");
      const persona = await personaRes.json();

      // 2. Upload Voice
      const fd = new FormData();
      fd.append("file", referenceBlob, "clone_ref.webm");
      fd.append("label", "Primary Voice Reference");
      const voiceRes = await fetch(`/api/personas/${persona.id}/voice`, {
        method: "POST",
        body: fd
      });
      if (!voiceRes.ok) throw new Error("Failed to upload voice reference");

      await mutate();
      setCloneName("");
      setCloneTitle("");
      setCloneBio("");
      setReferenceBlob(null);
      setCloneAvatars([]);
      setCloneMode(null);
      toast("Voice Cloned", `Successfully cloned voice "${cloneName}"!`, "success");
    } catch (e) {
      console.error(e);
      toast("Save Failed", "Failed to save voice clone.", "error");
    } finally {
      setIsSavingClone(false);
    }
  };

  const _handleClearGlobalCache = () => {
    if (window.confirm("Are you sure you want to clear the entire TTS cache? All cached audio will be deleted.")) {
      tts.clearCache();
      batchState?.setBlobMap?.(() => ({}));
      batchState?.setBatchResults?.(() => ({}));
    }
  };

  const handleRemoveSceneAudio = (segIndex: number) => {
    batchState?.setBlobMap?.((prev) => {
      const copy = { ...prev };
      delete copy[segIndex];
      return copy;
    });
    batchState?.setBatchResults?.((prev) => ({ ...prev, [segIndex]: "pending" }));
  };

  const handleClearSceneCache = async (segIndex: number, text: string) => {
    await tts.deleteCacheEntry(segIndex.toString(), text, activeParams);
    batchState?.setBlobMap?.((prev) => {
      const copy = { ...prev };
      delete copy[segIndex];
      return copy;
    });
    batchState?.setBatchResults?.((prev) => ({ ...prev, [segIndex]: "pending" }));
  };


  const modelLoaded = tts.modelStatus === "ready";

  return (
    <div className="h-full flex flex-col p-4 overflow-y-auto space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center gap-2 text-accent">
        <span className="text-xl">🎙️</span>
        <h3 className="text-sm font-bold uppercase tracking-widest">Voice Studio</h3>
      </div>

      {/* ── Model Status ── */}
      {(() => {
        const isOnline = tts.serverOnline;
        return (
          <div className={`p-4 rounded-xl border space-y-3 ${isOnline ? "bg-green-500/5 border-green-500/30" : "bg-red-500/5 border-red-500/30"}`}>
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-2" title={isOnline ? "Modern-TTS server is active." : "Server is not running. Start with: npm run modern-tts:studio"}>
                 <div className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500 animate-pulse"}`} />
                 <span className="text-xs font-bold">{isOnline ? "Modern-TTS Online" : "Modern-TTS Offline"}</span>
               </div>
               <div className="flex items-center gap-2">
                 <button onClick={tts.checkHealth} className="text-[9px] text-muted hover:text-accent transition-colors cursor-pointer" title="Check server status">↺ refresh</button>
                 <span className="text-[9px] font-mono text-muted">port 8005</span>
                 <button onClick={tts.clearCache} className="text-[9px] text-muted hover:text-red-400 transition-colors cursor-pointer">free vram</button>
               </div>
             </div>

             {/* Profile Switcher */}
             {isOnline && (
               <div className="flex items-center justify-between pt-1 border-t border-accent/10">
                 <span className="text-[9px] uppercase font-bold text-muted">VRAM Profile</span>
                 <div className="flex items-center gap-1">
                   {(["lightweight", "studio", "full"] as const).map((tier) => (
                     <button
                       key={tier}
                       onClick={() => tts.setProfileTier(tier)}
                       className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-mono transition-all cursor-pointer ${
                         tts.activeProfile === tier
                           ? "bg-accent text-white font-bold"
                           : "bg-surface-raised text-muted hover:text-foreground border border-border"
                       }`}
                     >
                       {tier}
                     </button>
                   ))}
                 </div>
               </div>
             )}

             {!isOnline ? (
               <p className="text-[10px] text-red-400/80">Please start Modern-TTS Server (npm run modern-tts:studio).</p>
              ) : (
                tts.generatingIds.size > 0 && (
                  <div className="flex flex-col gap-1.5 border-t border-accent/10 pt-1.5">
                    <div className="flex items-center gap-2 text-[10px] text-yellow-500 font-mono">
                      <span className="animate-spin">⚙️</span>
                      <span>{tts.downloadProgress.stage || "Synthesizing speech..."}</span>
                      {tts.downloadProgress.loaded > 0 && (
                        <span className="ml-auto text-accent font-bold">{Math.round(tts.downloadProgress.loaded)}%</span>
                      )}
                    </div>
                    {tts.downloadProgress.loaded > 0 && (
                      <div className="h-1 w-full bg-surface-raised rounded-full overflow-hidden border border-accent/10">
                        <div 
                          className="h-full bg-accent transition-all duration-300"
                          style={{ width: `${tts.downloadProgress.loaded}%` }}
                        />
                      </div>
                    )}
                  </div>
                )
              )}
          </div>
        );
      })()}

      {/* ── Batch Generation ── */}
      <div className="p-4 rounded-xl bg-surface-raised border border-border space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase text-muted">Batch Generation</p>
        </div>

        {/* ALWAYS SHOW THE LIST */}
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {validSegments.map((seg) => {
            const status = batchState?.batchResults?.[seg.index] ?? "pending";
            const hasBlob = !!batchState?.blobMap?.[seg.index];
            const activePersonaId = seg.personaId || selectedPersonaId;
            
            return (
              <div key={seg.index} className="flex items-center gap-2 py-1 group border-b border-border/50 last:border-0">
                <span className={`text-[10px] w-4 text-center flex-shrink-0 ${
                  status === "done" ? "text-accent" :
                  status === "cached" ? "text-accent/60" :
                  status === "generating" ? "text-yellow-400" :
                  status === "error" ? "text-red-400" : "text-muted/30"
                }`}>
                  {status === "done" ? "✓" : status === "cached" ? "⚡" : status === "generating" ? "▶" : status === "error" ? "✗" : "○"}
                </span>
                <span className={`text-[9px] flex-1 truncate ${
                  status === "generating" ? "text-foreground font-medium" : "text-muted"
                }`}>
                  <span className="font-bold text-muted/80 mr-1">{seg.index + 1}:</span> 
                  {seg.text ? (seg.text.slice(0, 30) + (seg.text.length > 30 ? "…" : "")) : ""}
                </span>
                
                {/* Persona Selector for this scene */}
                <select
                  value={activePersonaId}
                  onChange={(e) => onSegmentVoiceUpdate?.(seg.index, e.target.value, activeParams)}
                  className="w-24 text-[9px] bg-surface-raised border border-border rounded px-1 py-1 text-foreground focus:border-accent focus:outline-none cursor-pointer flex-shrink-0"
                >
                  <optgroup label="Predefined">
                    {PERSONAS.map(p => {
                      const isSuggested = seg.suggestedPersonaId === p.id;
                      return (
                        <option key={p.id} value={p.id}>
                          {p.name} {isSuggested ? "🤖" : ""}
                        </option>
                      );
                    })}
                  </optgroup>
                  {clonedPersonas.length > 0 && (
                    <optgroup label="Cloned">
                      {clonedPersonas.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </optgroup>
                  )}
                </select>

                {hasBlob && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handlePlayScene(seg.index)}
                      className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/10 hover:bg-accent/20 text-accent text-[9px] flex items-center justify-center cursor-pointer transition-colors"
                      title="Play generated audio"
                    >
                      ▶
                    </button>
                    <button
                      onClick={() => handleRemoveSceneAudio(seg.index)}
                      className="flex-shrink-0 text-[9px] text-muted hover:text-red-400 transition-colors cursor-pointer px-1"
                      title="Delete audio assignment (keep cache)"
                    >
                      🗑️
                    </button>
                    <button
                      onClick={() => handleClearSceneCache(seg.index, seg.text ?? "")}
                      className="flex-shrink-0 text-[8px] text-amber-400/80 hover:text-amber-300 transition-colors cursor-pointer px-1"
                      title="Delete audio + delete cached file"
                    >
                      ⚡✕
                    </button>
                  </div>
                )}
                {status === "generating" && (
                  <span className="flex-shrink-0 inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                )}
              </div>
            );
          })}
        </div>

        {/* Buttons at the bottom */}
        <div className="flex gap-2">
          {batchState?.isBatching ? (
            <Button size="sm" variant="ghost" className="w-full" onClick={batchState.cancelBatch}>
              ✕ Cancel Batch
            </Button>
          ) : (
            <>
              <Button size="sm" className="flex-1" onClick={handleGenerateAll} disabled={TTS_MODE !== "server" && !modelLoaded}>
                {Object.values(batchState?.batchResults || {}).some(s => s === "done" || s === "cached") ? "🔄 Re-generate Missing" : `🎙️ Generate All ${validSegments.length} Scenes`}
              </Button>
              {Object.values(batchState?.batchResults || {}).filter(s => s === "error").length > 0 && (
                <button
                  onClick={handleRetryFailed}
                  className="flex-shrink-0 text-[9px] text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400/50 px-2 rounded cursor-pointer transition-colors"
                >
                  🔄 Retry Failed
                </button>
              )}
            </>
          )}
        </div>

        <p className="text-[9px] text-muted leading-tight">
          Audio is cached. Only re-generates scenes where text or params changed.
        </p>
      </div>

      {/* ── Preset Filters + Grid ── */}
      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase text-muted">Voice Presets</p>

        {/* Filter controls */}
        <div className="flex gap-2 flex-wrap">
          {(["all", "female", "male"] as const).map((g) => (
            <button key={g} onClick={() => setFilterGender(g)}
              className={`text-[10px] px-2 py-1 rounded border font-bold uppercase cursor-pointer transition-all ${
                filterGender === g ? "bg-accent text-accent-foreground border-accent" : "border-border text-muted hover:text-foreground"
              }`}>
              {g === "all" ? "All" : g === "female" ? "♀ Female" : "♂ Male"}
            </button>
          ))}
          <div className="flex-1" />
          <select value={filterLang} onChange={(e) => setFilterLang(e.target.value)}
            className="text-[10px] bg-surface border border-border rounded px-2 py-1 text-muted cursor-pointer focus:outline-none focus:border-accent">
            <option value="all">All Languages</option>
            {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
        </div>

        {/* Built-in Preset Grid */}
        <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
          {filteredPersonas.map((persona) => {
            const isSelected = persona.id === selectedPersonaId && !isCustom;
            return (
              <button key={persona.id} onClick={() => handleSelectPersona(persona)}
                className={`relative text-left p-3 rounded-xl border transition-all cursor-pointer overflow-hidden ${
                  isSelected ? "border-2 shadow-lg border-accent" : "border-border bg-surface hover:border-muted"
                }`}>
                {/* Background Avatar */}
                <div 
                  className="absolute top-0 right-0 bottom-0 w-1/2 opacity-20 pointer-events-none"
                  style={{
                    backgroundImage: `url(${persona.avatarUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'top center',
                    maskImage: 'linear-gradient(to right, transparent, black)'
                  }}
                />
                <div className="relative z-10">
                  <div className="text-[11px] font-bold truncate text-foreground">{persona.name}</div>
                  <div className="text-[9px] font-semibold text-accent truncate">{persona.title}</div>
                  <div className="text-[9px] text-muted leading-tight line-clamp-2 mt-1">{persona.description}</div>
                  <div className="flex items-center gap-1 mt-1.5">
                    <span className="text-[8px] bg-surface-raised px-1.5 py-0.5 rounded text-muted uppercase">
                      {LANGUAGE_LABELS[persona.language]?.split(" ")[0]}
                    </span>
                    <span className="text-[8px] bg-surface-raised px-1.5 py-0.5 rounded text-muted uppercase">
                      {persona.gender === "male" ? "♂" : "♀"}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Cloned Personas */}
        {clonedPersonas.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {clonedPersonas.map((persona: ClonedPersona) => {
              const isSelected = persona.id === selectedPersonaId && !isCustom;
              const defaultAvatar = (persona.avatars as { isDefault?: boolean; url?: string }[])?.find((a) => a.isDefault)?.url || (persona.avatars as { url?: string }[])?.[0]?.url;
              return (
                <div key={persona.id} className="relative group">
                  <button
                    onClick={() => handleSelectPersona(persona)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer overflow-hidden ${
                      isSelected ? "border-2 shadow-lg border-accent bg-accent/5" : "border-border bg-surface hover:border-muted"
                    }`}
                  >
                    {/* Background Avatar */}
                    {defaultAvatar && (
                      <div 
                        className="absolute top-0 right-0 bottom-0 w-1/2 opacity-20 pointer-events-none"
                        style={{
                          backgroundImage: `url(${defaultAvatar})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'top center',
                          maskImage: 'linear-gradient(to right, transparent, black)'
                        }}
                      />
                    )}
                    <div className="relative z-10">
                        <div className="text-xl mb-1">🧬</div>
                      <div className="text-[11px] font-bold truncate">{persona.name}</div>
                      <div className="text-[9px] text-purple-400 truncate">{persona.role}</div>
                      <div className="text-[8px] text-muted mt-1">{persona.language} · {persona.gender}</div>
                    </div>
                  </button>
                  <button onClick={async () => {
                    if (!confirm("Delete this cloned persona?")) return;
                    await fetch(`/api/personas/${persona.id}`, { method: "DELETE" });
                    mutate();
                  }}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-[9px] text-red-400 hover:text-red-300 p-1 cursor-pointer z-20">
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Clone a Voice ── */}
        <div className="p-4 rounded-xl border border-dashed border-purple-500/30 bg-purple-500/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🧬</span>
              <span className="text-[11px] font-bold text-purple-300">Clone a Voice</span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setCloneMode(cloneMode === "upload" ? null : "upload")}
                className={`text-[9px] px-2 py-1 rounded border cursor-pointer transition-all font-bold ${
                  cloneMode === "upload" ? "bg-purple-500 text-white border-purple-500" : "border-border text-muted hover:border-purple-500/50"
                }`}>
                📁 Upload
              </button>
              <button onClick={() => setCloneMode(cloneMode === "record" ? null : "record")}
                className={`text-[9px] px-2 py-1 rounded border cursor-pointer transition-all font-bold ${
                  cloneMode === "record" ? "bg-purple-500 text-white border-purple-500" : "border-border text-muted hover:border-purple-500/50"
                }`}>
                🎤 Record
              </button>
            </div>
          </div>

          {!cloneMode && (
            <p className="text-[9px] text-muted leading-relaxed">
              Upload or record 5–30s of clear speech. Modern TTS will mimic that voice for generation.
            </p>
          )}

          {cloneMode === "upload" && (
            <div>
              <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 rounded border border-dashed border-purple-400/40 text-[10px] text-muted hover:text-purple-300 hover:border-purple-400 transition-all cursor-pointer">
                {referenceBlob
                  ? `✅ Loaded (${referenceDuration}s) — click to replace`
                  : "Click to select an audio file (.mp3, .wav, .m4a...)"}
              </button>
            </div>
          )}

          {cloneMode === "record" && (
            <div>
              {!referenceBlob ? (
                <button onClick={isRecording ? stopRecording : startRecording}
                  className={`w-full py-2 rounded border text-[10px] font-bold cursor-pointer transition-all ${
                    isRecording
                      ? "border-red-500 bg-red-500/10 text-red-400 animate-pulse"
                      : "border-purple-400/40 text-muted hover:text-purple-300 hover:border-purple-400"
                  }`}>
                  {isRecording ? "⏹ Stop Recording" : "⏺ Start Recording"}
                </button>
              ) : (
                <div className="text-[10px] text-purple-300">
                  ✅ Recorded {referenceDuration}s —{" "}
                  <button onClick={() => setReferenceBlob(null)} className="text-muted hover:text-red-400 cursor-pointer">redo</button>
                </div>
              )}
            </div>
          )}

          {referenceBlob && cloneMode && (
            <div className="space-y-2 pt-2 border-t border-purple-500/20">
              <input type="text" placeholder="Name this voice (e.g. 'Alex')" value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                className="w-full bg-surface border border-border rounded px-2 py-1.5 text-xs text-foreground focus:border-purple-500 focus:outline-none" />
              
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <input type="text" placeholder="Title (e.g. 'News Anchor')" value={cloneTitle}
                    onChange={(e) => setCloneTitle(e.target.value)}
                    className="w-full bg-surface border border-border rounded px-2 py-1.5 text-xs text-foreground focus:border-purple-500 focus:outline-none" />
                </div>
                <div className="w-16 flex-shrink-0">
                  <input ref={avatarInputRef} type="file" accept="image/*" multiple onChange={handleAvatarUpload} className="hidden" />
                  <div className="flex gap-1 overflow-x-auto pb-1 min-h-[32px]">
                    {cloneAvatars.map((src, idx) => (
                      <div key={idx} className="relative w-8 h-8 flex-shrink-0 rounded overflow-hidden border border-border group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} className="w-full h-full object-cover" />
                        <button 
                          onClick={() => setCloneAvatars(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[8px] text-white transition-opacity"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => avatarInputRef.current?.click()}
                      className="w-8 h-8 rounded border border-dashed border-purple-400/40 flex items-center justify-center hover:border-purple-400 transition-all cursor-pointer bg-surface flex-shrink-0"
                    >
                      <span className="text-[10px] text-muted">+</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <select value={cloneGender} onChange={(e) => setCloneGender(e.target.value as "female" | "male")}
                  className="flex-1 text-[10px] bg-surface border border-border rounded px-2 py-1 text-muted focus:outline-none focus:border-purple-500">
                  <option value="female">♀ Female</option>
                  <option value="male">♂ Male</option>
                </select>
                <select value={cloneLang} onChange={(e) => setCloneLang(e.target.value)}
                  className="flex-1 text-[10px] bg-surface border border-border rounded px-2 py-1 text-muted focus:outline-none focus:border-purple-500">
                  {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
              </div>
              <Button size="sm" className="w-full" onClick={handleSaveClone} isLoading={isSavingClone} disabled={!cloneName.trim()}>
                Save as Preset
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Fine-Tune Sliders (collapsible) ── */}
      <div className="rounded-xl bg-surface-raised border border-border overflow-hidden">
        <button
          onClick={() => setIsFinetuneOpen(o => !o)}
          aria-expanded={isFinetuneOpen}
          className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-surface transition-colors"
        >
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-bold uppercase text-muted">Voice Settings</p>
            {isCustom && <span className="text-[9px] bg-accent/10 text-accent px-2 py-0.5 rounded font-bold">CUSTOM</span>}
          </div>
          <span className="text-muted text-[10px]">{isFinetuneOpen ? "▲" : "▼"}</span>
        </button>
        {isFinetuneOpen && (
          <div className="px-4 pb-4 space-y-6">
            {/* Inference Params Group */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-[8px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-bold uppercase">Inference</span>
                <span className="text-[9px] text-muted-foreground">Changing these clears cached audio</span>
              </div>
              
              <SliderRow label="Exaggeration" min={0} max={1} step={0.05} value={activeParams.exaggeration}
                onChange={(v) => handleParamChange("exaggeration", v)} hint="Higher = more expressive/dramatic" />
              <SliderRow label="CFG Weight" min={0} max={1} step={0.05} value={activeParams.cfgWeight}
                onChange={(v) => handleParamChange("cfgWeight", v)} hint="Consistency of voice identity" />
              <SliderRow label="Temperature" min={0.5} max={1.5} step={0.05} value={activeParams.temperature}
                onChange={(v) => handleParamChange("temperature", v)} hint="Higher = more natural variation" />
              <SliderRow label="Max Tokens" min={256} max={2048} step={128} value={activeParams.maxNewTokens}
                onChange={(v) => handleParamChange("maxNewTokens", v)}
                format={(v) => `${v} (~${Math.round(v / 48)}s)`} hint="Maximum audio length" />
              <SliderRow label="Chunk Size" min={50} max={400} step={10} value={activeParams.chunkSize ?? 200}
                onChange={(v) => handleParamChange("chunkSize", v)}
                format={(v) => `${v} words`} hint="Smaller = lower VRAM usage. Larger = better intonation." />
            </div>

            {/* Live Playback Params Group */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <span className="text-[8px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-bold uppercase">Live Preview</span>
                <span className="text-[9px] text-muted-foreground">Changes apply instantly to cached audio</span>
              </div>
              
              <SliderRow label="Speed" min={0.5} max={2.0} step={0.05} value={activeParams.speed}
                onChange={(v) => handleParamChange("speed", v)}
                format={(v) => `${v.toFixed(2)}×`} hint="Post-processing playback rate" />
              <SliderRow label="Pitch Shift" min={-6} max={6} step={1} value={activeParams.pitchShift}
                onChange={(v) => handleParamChange("pitchShift", v)}
                format={(v) => `${v > 0 ? "+" : ""}${v} st`} hint="Semitones. Negative = deeper." />
            </div>

            {isCustom && (
              <button onClick={() => { setIsCustom(false); if (selectedPersona) { const vp = "voiceParams" in selectedPersona && typeof selectedPersona.voiceParams === "string" ? selectedPersona.voiceParams : null; setCustomParams(vp ? JSON.parse(vp) : ("params" in selectedPersona && selectedPersona.params ? selectedPersona.params : DEFAULT_VOICE_PARAMS)); } }}
                className="text-[9px] text-muted hover:text-accent transition-colors cursor-pointer w-full text-center">
                ↺ Reset to preset defaults
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── AI Speech Cadence & Breath Optimizer ── */}
      <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">🌬️</span>
            <p className="text-[10px] font-bold uppercase text-cyan-300">Speech Cadence &amp; Breath Optimizer</p>
          </div>
        </div>
        <p className="text-[10px] text-muted leading-tight">
          Automatically injects breathing pauses (<code className="text-cyan-300">...</code>, <code className="text-cyan-300">—</code>) and phonetic normalization across all segments for realistic neural TTS prosody.
        </p>
        <Button
          size="sm"
          variant="secondary"
          className="w-full text-xs font-bold border-cyan-500/40 text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 cursor-pointer shadow-sm"
          onClick={handleOptimizeAllCadence}
          isLoading={isOptimizingCadence}
        >
          ✨ Auto-Optimize All Segments Cadence
        </Button>
      </div>

      {/* ── Single-Scene Test ── */}
      <div className="p-4 rounded-xl bg-surface-raised border border-border space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase text-muted">Test a Scene</p>
          {testSegment && Boolean(batchState?.blobMap?.[testSegment.index]) && (
            <span className="text-[9px] text-accent/70">✓ cached</span>
          )}
        </div>

        {/* Scene picker dropdown */}
        <select
          value={selectedTestSceneIdx ?? ""}
          onChange={(e) => setSelectedTestSceneIdx(e.target.value === "" ? null : Number(e.target.value))}
          className="w-full text-[10px] bg-surface border border-border rounded px-2 py-1.5 text-foreground focus:border-accent focus:outline-none cursor-pointer"
        >
          <option value="">— pick a scene —</option>
          {segments.filter(s => s.index >= 0 && s.text?.trim()).map(s => (
            <option key={s.index} value={s.index}>
              Scene {s.index + 1}: {s.text ? (s.text.slice(0, 40) + (s.text.length > 40 ? "…" : "")) : ""}
            </option>
          ))}
        </select>

        {testSegment && (
          <div className="space-y-2">
            <p className="text-[10px] text-muted italic line-clamp-2">&ldquo;{testSegment.text?.slice(0, 80)}&rdquo;</p>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={handlePreviewCurrentSegment}
                isLoading={tts.generatingIds.size > 0} disabled={TTS_MODE !== "server" && !modelLoaded}>
                🎙️ Generate &amp; Play
              </Button>
              {Boolean(batchState?.blobMap?.[testSegment.index]) && (
                <button onClick={() => handlePlayScene(testSegment.index)}
                  className="px-3 rounded-lg border border-accent/30 text-accent hover:bg-accent/10 text-[10px] font-bold cursor-pointer transition-all flex-shrink-0"
                  title="Replay cached audio">▶</button>
              )}
            </div>
          </div>
        )}
      </div>


    </div>
  );
};

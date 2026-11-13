"use client";

import { useToast } from "@/components/global/ToastContainer";
import { VoiceRecorder } from "@/components/personas/VoiceRecorder";
import { PresetSelector } from "@/components/prompt-builder/PresetSelector";
import {
AlertTriangle,
ArrowLeft,
BarChart2,
Edit2,
FileText,
Image,
Paintbrush,
Pause,
Play,
Save,
Shield,
Star,
Trash2,
User,Volume2
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React,{ use,useRef,useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface AvatarItem {
  id: string;
  label: string;
  url: string;
  storageKey: string;
  frameType: string;
  isDefault: boolean;
}

interface VoiceItem {
  id: string;
  label: string;
  audioPath: string;
  storageKey: string;
  isDefault: boolean;
  language: string;
  duration: number;
}

interface PersonaDetails {
  id: string;
  slug: string;
  name: string;
  role: string;
  gender: string;
  language: string;
  description: string;
  bio?: string;
  systemPrompt: string;
  visualPrompt?: string;
  visualPromptNeutral?: string;
  voiceParams: string; // JSON String
  avatarType: string;
  defaultAvatarId: string | null;
  isActive: boolean;
  isSystemPersona: boolean;
  avatars: AvatarItem[];
  voices: VoiceItem[];
  imagePairs: ImagePairItem[];
  stats?: {
    videosCount: number;
    scenesCount: number;
    totalScreenTime: number;
    weeklyUsage: { label: string; value: number; count: number }[];
  };
}

interface ImagePairItem {
  id: string;
  label: string;
  image1Key: string;
  image2Key: string | null;
  url1: string;
  url2: string | null;
}

export default function PersonaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const { data: persona, mutate } = useSWR<PersonaDetails>(
    rawId ? `/api/personas/${rawId}` : null,
    fetcher
  );

  const [activeTab, setActiveTab] = useState<"info" | "avatars" | "pairs" | "voice" | "prompt" | "visual" | "stats">("info");

  // Info Form States
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [gender, setGender] = useState("");
  const [language, setLanguage] = useState("");
  const [description, setDescription] = useState("");
  const [bio, setBio] = useState("");
  const [avatarType, setAvatarType] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Prompt Form State
  const [systemPrompt, setSystemPrompt] = useState("");
  const [visualPrompt, setVisualPrompt] = useState("");
  const [visualPromptNeutral, setVisualPromptNeutral] = useState("");
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);

  // New Avatar input states
  const [newAvatarLabel, setNewAvatarLabel] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [editingAvatarId, setEditingAvatarId] = useState<string | null>(null);
  const [editingAvatarLabel, setEditingAvatarLabel] = useState("");

  // New Image Pair input states
  const [newPairLabel, setNewPairLabel] = useState("");
  const [isUploadingPair, setIsUploadingPair] = useState(false);
  
  const [newVoicePath, setNewVoicePath] = useState("");
  const [newVoiceLabel, setNewVoiceLabel] = useState("");
  const [isUploadingVoice, setIsUploadingVoice] = useState(false);

  // Testing voice states
  const [testText, setTestText] = useState("Hello, welcome to Ruby News Studio. This is a test text to validate my artificial intelligence presenter voice.");
  const [testingVoice, setTestingVoice] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [testAudioUrl, setTestAudioUrl] = useState<string | null>(null);

  // Audio Play States
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioPlayersRef = useRef<Record<string, HTMLAudioElement>>({});

  const [syncedPersonaId, setSyncedPersonaId] = useState<string | null>(null);
  if (persona && persona.id !== syncedPersonaId) {
    setSyncedPersonaId(persona.id);
    setName(persona.name);
    setRole(persona.role);
    setGender(persona.gender);
    setLanguage(persona.language);
    setDescription(persona.description || "");
    setBio(persona.bio || "");
    setAvatarType(persona.avatarType);
    setIsActive(persona.isActive);
    setSystemPrompt(persona.systemPrompt || "");
    setVisualPrompt(persona.visualPrompt || "");
    setVisualPromptNeutral(persona.visualPromptNeutral || "");
  }

  if (!persona) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-muted font-medium">Loading presenter details...</span>
      </div>
    );
  }

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/personas/${persona.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          role,
          gender,
          language,
          description,
          bio,
          avatarType,
          isActive,
        }),
      });

      if (res.ok) {
        toast("Success", "General information updated successfully", "success");
        mutate();
      } else {
        const err = await res.json();
        toast("Error", err.error || "Could not update information", "error");
      }
    } catch {
      toast("Error", "Error connecting to server", "error");
    }
  };

  const handleSavePrompt = async () => {
    try {
      const res = await fetch(`/api/personas/${persona.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt, visualPrompt, visualPromptNeutral }),
      });

      if (res.ok) {
        toast("Success", "Script instructions updated", "success");
        mutate();
      } else {
        toast("Error", "Error updating prompt", "error");
      }
    } catch {
      toast("Error", "Error connecting to server", "error");
    }
  };

  const handleDeletePersona = async () => {
    if (confirm(`Are you sure you want to permanently delete ${persona.name}?`)) {
      try {
        const res = await fetch(`/api/personas/${persona.slug}`, {
          method: "DELETE",
        });

        const data = await res.json();
        if (res.ok) {
          toast("Success", "Persona deleted successfully", "success");
          router.push("/personas");
        } else {
          toast("Security", data.error || "Could not delete persona", "error");
        }
      } catch {
        toast("Error", "Error connecting to server", "error");
      }
    }
  };

  const handleSaveVoice = async (blob: Blob, label: string) => {
    if (!persona) return;
    setIsUploadingVoice(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, `voice_clone.webm`);
      formData.append("label", label);

      const res = await fetch(`/api/personas/${persona.id}/voice`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(await res.text());

      toast("Success", "Custom voice reference saved.", "success");
      mutate();
    } catch (e) {
      toast("Error", "Failed to save voice reference.", "error");
      console.error(e);
    } finally {
      setIsUploadingVoice(false);
    }
  };

  const handleDeleteVoice = async (voiceId: string) => {
    if (!persona) return;
    if (!confirm("Are you sure you want to delete this voice reference?")) return;
    
    try {
      const res = await fetch(`/api/personas/${persona.id}/voice?voiceId=${voiceId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      toast("Success", "Voice reference deleted.", "success");
      mutate();
    } catch {
      toast("Error", "Failed to delete voice reference.", "error");
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !persona) return;

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("label", newAvatarLabel || file.name);
      
      const res = await fetch(`/api/personas/${persona.id}/avatar`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        toast("Success", "Avatar uploaded successfully", "success");
        setNewAvatarLabel("");
        mutate();
      } else {
        const d = await res.json();
        toast("Error", d.error || "Could not upload avatar", "error");
      }
    } catch {
      toast("Error", "Upload failed", "error");
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handlePairUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const file1 = (form.elements.namedItem("image1") as HTMLInputElement).files?.[0];
    const file2 = (form.elements.namedItem("image2") as HTMLInputElement).files?.[0];
    
    if (!file1 || !persona) return;

    setIsUploadingPair(true);
    try {
      const formData = new FormData();
      formData.append("image1", file1);
      if (file2) formData.append("image2", file2);
      formData.append("label", newPairLabel || "Scene Pair");
      
      const res = await fetch(`/api/personas/${persona.id}/image-pairs`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        toast("Success", "Scene pair uploaded successfully", "success");
        setNewPairLabel("");
        form.reset();
        mutate();
      } else {
        const d = await res.json();
        toast("Error", d.error || "Could not upload pair", "error");
      }
    } catch {
      toast("Error", "Upload failed", "error");
    } finally {
      setIsUploadingPair(false);
    }
  };

  const handleDeletePair = async (pairId: string) => {
    if (!persona) return;
    if (!confirm("Are you sure you want to delete this scene pair?")) return;
    
    try {
      const res = await fetch(`/api/personas/${persona.id}/image-pairs?pairId=${pairId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      toast("Success", "Scene pair deleted.", "success");
      mutate();
    } catch {
      toast("Error", "Failed to delete pair.", "error");
    }
  };

  const handleGeneratePrompts = async () => {
    setIsGeneratingPrompts(true);
    const _toastId = toast("Generating...", "Asking AI to write the prompts. This may take a few seconds.", "info");
    
    try {
      const res = await fetch(`/api/personas/${persona.slug}/generate-prompts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role, description, bio }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate prompts");
      }

      const generated = await res.json();
      setSystemPrompt(generated.systemPrompt || "");
      setVisualPrompt(generated.visualPrompt || "");
      setVisualPromptNeutral(generated.visualPromptNeutral || "");
      
      toast("Success", "AI successfully generated the prompts!", "success");
    } catch (e) {
      toast("Error", e instanceof Error ? e.message : "Error generating prompts", "error");
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  const handleDeleteAvatar = async (avatarId: string) => {
    if (!persona) return;
    if (!confirm("Are you sure you want to delete this photo?")) return;
    
    try {
      const res = await fetch(`/api/personas/${persona.id}/avatar?avatarId=${avatarId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      toast("Success", "Photo deleted.", "success");
      mutate();
    } catch {
      toast("Error", "Failed to delete photo.", "error");
    }
  };

  const handleUpdateAvatarLabel = async (avatarId: string) => {
    if (!persona) return;
    try {
      const res = await fetch(`/api/personas/${persona.id}/avatar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarId, label: editingAvatarLabel })
      });
      if (!res.ok) throw new Error(await res.text());
      toast("Success", "Label updated.", "success");
      setEditingAvatarId(null);
      mutate();
    } catch {
      toast("Error", "Failed to update label.", "error");
    }
  };

  const handleSetDefaultAvatar = async (avatarId: string) => {
    try {
      const res = await fetch(`/api/personas/${persona.slug}/avatars`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarId }),
      });

      if (res.ok) {
        toast("Success", "Default avatar set", "success");
        mutate();
      }
    } catch {
      toast("Error", "Error setting default avatar", "error");
    }
  };

  const _handleAddVoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVoicePath) return;

    try {
      const res = await fetch(`/api/personas/${persona.slug}/voices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newVoiceLabel || "WAV Voice File",
          audioPath: newVoicePath,
          storageKey: newVoicePath,
          isDefault: persona.voices.length === 0,
          language: persona.language,
        }),
      });

      if (res.ok) {
        toast("Success", "Voice added successfully", "success");
        setNewVoicePath("");
        setNewVoiceLabel("");
        mutate();
      }
    } catch {
      toast("Error", "Could not add voice", "error");
    }
  };

  const handleTestVoice = async () => {
    setTestingVoice(true);
    setTestProgress(0);
    setTestAudioUrl(null);

    const defaultVoice = persona.voices.find(v => v.isDefault) || persona.voices[0];
    const voiceFile = defaultVoice ? defaultVoice.label.split("(")[1]?.replace(")", "") || persona.name + ".wav" : "Emily.wav";

    try {
      const res = await fetch("/api/tts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: testText,
          personaId: persona.slug || persona.id,
          reference_audio_filename: voiceFile,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Modern-TTS server synthesis failed");
      }

      setTestProgress(50);
      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const data = await res.json();
        if (data.audio_b64) {
          const url = `data:audio/${data.format || "wav"};base64,${data.audio_b64}`;
          setTestAudioUrl(url);
        }
      } else {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setTestAudioUrl(url);
      }

      setTestProgress(100);
      toast("Voice Generated", "Modern TTS completed voice synthesis successfully.", "success");
    } catch (err: unknown) {
      toast("TTS Error", err instanceof Error ? err.message : "Could not connect to Modern-TTS.", "error");
    } finally {
      setTestingVoice(false);
      setTestProgress(0);
    }
  };

  const togglePlayAudio = (voiceId: string, path: string) => {
    let audioUrl = path;
    if (!path.startsWith("/") && !path.startsWith("http")) {
      audioUrl = `/api/tts/${path}`;
    }

    if (playingVoiceId === voiceId) {
      audioPlayersRef.current[voiceId]?.pause();
      setPlayingVoiceId(null);
    } else {
      // Pause previously playing if any
      if (playingVoiceId && audioPlayersRef.current[playingVoiceId]) {
        audioPlayersRef.current[playingVoiceId].pause();
      }

      // Play current
      if (!audioPlayersRef.current[voiceId]) {
        audioPlayersRef.current[voiceId] = new Audio(audioUrl);
        audioPlayersRef.current[voiceId].onended = () => setPlayingVoiceId(null);
      }
      
      audioPlayersRef.current[voiceId].play().catch((err) => {
        console.error("Audio playback error:", err);
        toast("Error", "Could not play voice track", "error");
      });
      setPlayingVoiceId(voiceId);
    }
  };

  const _pathBasename = (url: string) => {
    return url.split("/").pop() || "avatar.png";
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Top action row */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <Link
          href="/personas"
          className="flex items-center gap-1.5 text-xs font-bold text-subtle hover:text-foreground tracking-wide uppercase transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Personas
        </Link>

        {/* System Persona Label */}
        {persona.isSystemPersona ? (
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/20 px-2.5 py-1 rounded-xl shadow">
            <Shield className="w-3.5 h-3.5" /> System Presenter
          </span>
        ) : (
          <button
            onClick={handleDeletePersona}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-error border border-error/30 hover:border-error hover:bg-error/10 rounded-xl transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete Presenter
          </button>
        )}
      </div>

      {/* Hero display card */}
      <div className="p-6 backdrop-blur-md bg-surface/30 border border-border/80 rounded-3xl flex flex-col md:flex-row gap-6 items-center shadow-lg">
        {/* Avatar Portrait */}
        <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl overflow-hidden border border-border bg-surface-raised flex-shrink-0 relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={persona.avatars.find(a => a.id === persona.defaultAvatarId)?.url || persona.avatars[0]?.url || "/avatars/placeholder.png"}
            alt={persona.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Core details */}
        <div className="flex-grow space-y-1.5 text-center md:text-left">
          <span className="px-2.5 py-0.5 rounded bg-background border border-border text-subtle font-bold text-[10px] uppercase tracking-wide inline-block">
            {persona.role}
          </span>
          <h2 className="text-2xl font-black text-foreground tracking-tight leading-none">
            {persona.name}
          </h2>
          <p className="text-xs text-subtle font-medium leading-relaxed max-w-2xl">
            {persona.description || "No description provided."}
          </p>

          {/* Quick Studio Launchpad */}
          <div className="pt-2 flex items-center gap-2 flex-wrap justify-center md:justify-start">
            <span className="text-[10px] font-mono uppercase font-bold text-muted mr-1">Studio Launch:</span>
            <Link
              href={`/wardrobe-studio?personaId=${persona.slug}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-semibold transition-all hover:scale-105"
            >
              <span>👗</span>
              <span>Wardrobe</span>
            </Link>
            <Link
              href={`/voice-studio?personaId=${persona.slug}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition-all hover:scale-105"
            >
              <span>🎙️</span>
              <span>Voice</span>
            </Link>
            <Link
              href={`/field-reporter-studio?personaId=${persona.slug}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-semibold transition-all hover:scale-105"
            >
              <span>🎥</span>
              <span>Field Reporter</span>
            </Link>
            <Link
              href={`/roundtable-studio?anchor1=${persona.slug}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[11px] font-semibold transition-all hover:scale-105"
            >
              <span>🏛️</span>
              <span>Roundtable</span>
            </Link>
            <Link
              href={`/interview-studio?host=${persona.slug}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold transition-all hover:scale-105"
            >
              <span>🎬</span>
              <span>Interview</span>
            </Link>
            <Link
              href={`/vtuber-studio?personaId=${persona.slug}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[11px] font-semibold transition-all hover:scale-105"
            >
              <span>⚡</span>
              <span>VTuber</span>
            </Link>
            <Link
              href={`/tools/thumbnail-builder?personaId=${persona.slug}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-semibold transition-all hover:scale-105"
            >
              <span>🖼️</span>
              <span>Thumbnail</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex items-center border-b border-border/60 gap-4 overflow-x-auto pb-0.5">
        <TabButton id="info" active={activeTab === "info"} onClick={() => setActiveTab("info")} label="Information" icon={<User className="w-4 h-4" />} />
        <TabButton id="avatars" active={activeTab === "avatars"} onClick={() => setActiveTab("avatars")} label="Photo Gallery" icon={<Image className="w-4 h-4" />} />
        <TabButton id="pairs" active={activeTab === "pairs"} onClick={() => setActiveTab("pairs")} label="Scene Pairs" icon={<Image className="w-4 h-4" />} />
        <TabButton id="voice" active={activeTab === "voice"} onClick={() => setActiveTab("voice")} label="Voice Model" icon={<Volume2 className="w-4 h-4" />} />
        <TabButton id="prompt" active={activeTab === "prompt"} onClick={() => setActiveTab("prompt")} label="Director Prompt" icon={<FileText className="w-4 h-4" />} />
        <TabButton id="visual" active={activeTab === "visual"} onClick={() => setActiveTab("visual")} label="Visual Presets" icon={<Paintbrush className="w-4 h-4" />} />
        <TabButton id="stats" active={activeTab === "stats"} onClick={() => setActiveTab("stats")} label="Metrics" icon={<BarChart2 className="w-4 h-4" />} />
      </div>

      {/* Tabs display */}
      <div className="space-y-4">
        {/* Info Tab */}
        {activeTab === "info" && (
          <form onSubmit={handleSaveInfo} className="p-6 backdrop-blur-md bg-surface/20 border border-border/60 rounded-3xl space-y-5 shadow-inner">
            <h3 className="text-sm font-bold text-foreground border-b border-border pb-2.5">Profile Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-subtle uppercase">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs focus:border-accent outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-subtle uppercase">Role / Position</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs focus:border-accent outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-subtle uppercase">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground outline-none cursor-pointer"
                >
                  <option value="en">English (EN)</option>
                  <option value="es">Spanish (ES)</option>
                  <option value="fr">French (FR)</option>
                  <option value="it">Italian (IT)</option>
                  <option value="de">German (DE)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-subtle uppercase">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground outline-none cursor-pointer"
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </div>

            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-subtle uppercase">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs focus:border-accent outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-subtle uppercase">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs focus:border-accent outline-none resize-y"
                placeholder="Detailed biography of the persona..."
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-border/40">
              <div>
                <h4 className="text-xs font-bold text-foreground">Active Status</h4>
                <p className="text-[10px] text-muted">Allows the AI to select this presenter for new scripts.</p>
              </div>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 accent-accent cursor-pointer"
              />
            </div>

            <div className="flex justify-between items-center border-t border-border pt-4 mt-2">
              <div>
                {!persona.isSystemPersona && (
                  <button
                    type="button"
                    onClick={handleDeletePersona}
                    className="flex items-center gap-1.5 px-4 py-2 bg-error/10 hover:bg-error/15 border border-error/20 text-error rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Presenter
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4.5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Save className="w-4 h-4" /> Save Changes
              </button>
            </div>
          </form>
        )}

        {/* Avatars Tab */}
        {activeTab === "avatars" && (
          <div className="p-6 backdrop-blur-md bg-surface/20 border border-border/60 rounded-3xl space-y-6 shadow-inner">
            <h3 className="text-sm font-bold text-foreground border-b border-border pb-2.5">Portrait Portfolio</h3>
            
            {/* Gallery Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {persona.avatars.map((av) => (
                <div
                  key={av.id}
                  className={`group relative aspect-[4/5] rounded-2xl border overflow-hidden bg-background shadow flex flex-col justify-end p-3 ${
                    av.isDefault ? "border-accent ring-2 ring-accent/10" : "border-border/80"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={av.url}
                    alt={av.label}
                    className="absolute inset-0 w-full h-full object-cover"
                  />

                  {/* Actions overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    {!av.isDefault && (
                      <button
                        onClick={() => handleSetDefaultAvatar(av.id)}
                        className="p-2 rounded-xl bg-surface hover:bg-surface-overlay text-warning border border-border shadow cursor-pointer active:scale-90 transition-transform"
                        title="Set as default"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingAvatarId(av.id);
                        setEditingAvatarLabel(av.label);
                      }}
                      className="p-2 rounded-xl bg-surface hover:bg-surface-overlay text-blue-400 border border-border shadow cursor-pointer active:scale-90 transition-transform"
                      title="Edit label"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAvatar(av.id)}
                      className="p-2 rounded-xl bg-surface hover:bg-surface-overlay text-error border border-border shadow cursor-pointer active:scale-90 transition-transform"
                      title="Delete photo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Default Tag */}
                  {av.isDefault && (
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[8px] font-bold bg-accent/90 border border-emerald-400/20 text-white tracking-widest uppercase flex items-center gap-0.5">
                      ⭐ Main
                    </span>
                  )}
                  
                  {editingAvatarId === av.id ? (
                    <div className="z-10 bg-background/95 backdrop-blur border border-accent/50 p-1.5 rounded-xl shadow flex items-center gap-1.5">
                      <input
                        type="text"
                        autoFocus
                        value={editingAvatarLabel}
                        onChange={(e) => setEditingAvatarLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdateAvatarLabel(av.id);
                          if (e.key === "Escape") setEditingAvatarId(null);
                        }}
                        className="w-full bg-transparent border-none outline-none text-[10px] font-semibold text-foreground px-1"
                      />
                      <button onClick={() => handleUpdateAvatarLabel(av.id)} className="text-emerald-400 hover:text-emerald-300 p-0.5 cursor-pointer">
                        <Save className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <span className="z-10 bg-background/90 backdrop-blur border border-border/40 text-[9px] font-semibold text-foreground px-2 py-1 rounded-lg truncate shadow">
                      {av.label}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* File Upload adder */}
            <div className="p-4 rounded-2xl bg-white/[0.01] border border-border/50 space-y-4 max-w-xl">
              <h4 className="text-xs font-bold text-foreground">🔗 Upload new photo</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted uppercase">Label</label>
                  <input
                    type="text"
                    value={newAvatarLabel}
                    onChange={(e) => setNewAvatarLabel(e.target.value)}
                    placeholder="e.g. Serious Pose 02"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs focus:border-accent outline-none"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted uppercase">Upload File</label>
                  <div className="flex gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={isUploadingAvatar}
                      className="flex-grow px-3 py-1.5 rounded-xl bg-background border border-border text-xs focus:border-accent outline-none file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-semibold file:bg-accent/10 file:text-accent hover:file:bg-accent/20 cursor-pointer disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Pairs Tab */}
        {activeTab === "pairs" && (
          <div className="p-6 backdrop-blur-md bg-surface/20 border border-border/60 rounded-3xl space-y-6 shadow-inner">
            <h3 className="text-sm font-bold text-foreground border-b border-border pb-2.5">Scene Pairs</h3>
            
            {/* Pairs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {persona.imagePairs?.map((pair) => (
                <div
                  key={pair.id}
                  className="group relative rounded-2xl border border-border/80 overflow-hidden bg-background shadow flex flex-col"
                >
                  <div className="flex h-32 w-full">
                    {/* Primary Image */}
                    <div className={`relative h-full ${pair.image2Key ? 'w-1/2 border-r border-border/50' : 'w-full'}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={pair.url1}
                        alt="Primary Angle"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-black/60 text-white">1</span>
                    </div>
                    {/* Secondary Image */}
                    {pair.image2Key && pair.url2 && (
                      <div className="relative h-full w-1/2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={pair.url2}
                          alt="Secondary Angle"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-black/60 text-white">2</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-foreground truncate shadow">
                      {pair.label}
                    </span>
                    <button
                      onClick={() => handleDeletePair(pair.id)}
                      className="p-1.5 rounded-lg bg-error/10 hover:bg-error/20 text-error cursor-pointer active:scale-90 transition-transform"
                      title="Delete pair"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              
              {(!persona.imagePairs || persona.imagePairs.length === 0) && (
                <div className="col-span-full py-8 text-center text-xs text-muted border border-dashed border-border rounded-2xl">
                  No scene pairs uploaded yet.
                </div>
              )}
            </div>

            {/* File Upload adder */}
            <form onSubmit={handlePairUpload} className="p-4 rounded-2xl bg-white/[0.01] border border-border/50 space-y-4 max-w-2xl">
              <h4 className="text-xs font-bold text-foreground">🔗 Upload new scene pair</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted uppercase">Label</label>
                  <input
                    type="text"
                    value={newPairLabel}
                    onChange={(e) => setNewPairLabel(e.target.value)}
                    placeholder="e.g. Desk Front & Side"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs focus:border-accent outline-none"
                  />
                </div>
                
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={isUploadingPair}
                    className="w-full px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isUploadingPair ? "Uploading..." : "Save Pair"}
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted uppercase">Primary Image (Required)</label>
                  <input
                    type="file"
                    name="image1"
                    accept="image/*"
                    required
                    disabled={isUploadingPair}
                    className="w-full px-3 py-1.5 rounded-xl bg-background border border-border text-xs focus:border-accent outline-none file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-semibold file:bg-accent/10 file:text-accent hover:file:bg-accent/20 cursor-pointer disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted uppercase">Second Angle Image (Optional)</label>
                  <input
                    type="file"
                    name="image2"
                    accept="image/*"
                    disabled={isUploadingPair}
                    className="w-full px-3 py-1.5 rounded-xl bg-background border border-border text-xs focus:border-accent outline-none file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-semibold file:bg-accent/10 file:text-accent hover:file:bg-accent/20 cursor-pointer disabled:opacity-50"
                  />
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Voice Tab */}
        {activeTab === "voice" && (
          <div className="p-6 backdrop-blur-md bg-surface/20 border border-border/60 rounded-3xl space-y-6 shadow-inner">
            <h3 className="text-sm font-bold text-foreground border-b border-border pb-2.5">Voice Reference Files</h3>

            {/* Voices List */}
            <div className="space-y-3 max-w-2xl">
              {persona.voices.map((v) => (
                <div
                  key={v.id}
                  className={`p-4 rounded-2xl border flex items-center justify-between shadow bg-background/50 ${
                    v.isDefault ? "border-accent/40" : "border-border/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Play button */}
                    <button
                      onClick={() => togglePlayAudio(v.id, v.audioPath)}
                      className="w-10 h-10 rounded-full bg-accent-muted text-accent border border-accent/20 flex items-center justify-center hover:scale-105 transition-transform cursor-pointer active:scale-95"
                    >
                      {playingVoiceId === v.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 pl-0.5" />}
                    </button>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">{v.label}</h4>
                      <p className="text-[10px] text-muted">ID: {v.storageKey} | Language: {v.language.toUpperCase()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {v.isDefault ? (
                      <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-accent/15 border border-accent/30 text-accent">
                        ⭐ Predefined
                      </span>
                    ) : (
                      <>
                        <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-white/5 border border-border text-subtle">
                          Reference
                        </span>
                        <button
                          onClick={() => handleDeleteVoice(v.id)}
                          className="p-1.5 text-muted hover:text-red-400 bg-background border border-border rounded-lg shadow-sm transition-colors"
                          title="Delete voice reference"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Upload/Record Component */}
            <div className="max-w-2xl">
              <VoiceRecorder onSave={handleSaveVoice} isUploading={isUploadingVoice} />
            </div>

            {/* Test Voice Section */}
            <div className="p-4.5 rounded-3xl bg-white/[0.01] border border-border/50 space-y-4 max-w-xl">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  🎙️ Test Presenter Voice
                </h4>
                <p className="text-[10px] text-muted">Synthesizes neural voice preview via Modern-TTS-Server (port 8005).</p>
              </div>

              <textarea
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                rows={3}
                className="w-full p-3 rounded-2xl bg-background border border-border text-xs text-foreground placeholder:text-muted outline-none focus:border-accent resize-none"
              />

              <div className="flex items-center gap-4">
                <button
                  onClick={handleTestVoice}
                  disabled={testingVoice || persona.voices.length === 0}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {testingVoice ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Synthesizing... {testProgress}%</span>
                    </>
                  ) : (
                    <span>Test Voice</span>
                  )}
                </button>

                {testAudioUrl && (
                  <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-4">
                    <span className="text-xs font-semibold text-success">✓ Audio Ready</span>
                    <audio src={testAudioUrl} controls className="h-8 max-w-xs scale-90" />
                  </div>
                )}
              </div>
              
              {persona.voices.length === 0 && (
                <div className="p-3.5 rounded-xl bg-warning/10 border border-warning/20 text-warning text-[10px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Warning: You must add or configure a reference voice file to generate TTS tests.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* System Prompt Tab */}
        {activeTab === "prompt" && (
          <div className="p-6 backdrop-blur-md bg-surface/20 border border-border/60 rounded-3xl space-y-5 shadow-inner">
            <div className="border-b border-border pb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">Generation Prompts</h3>
                <p className="text-[10px] text-muted">Instructions assigned to the language and image models.</p>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGeneratePrompts}
                  disabled={isGeneratingPrompts || !name || !role}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent/10 border border-accent/20 hover:bg-accent/20 text-accent text-[10px] font-bold uppercase tracking-wider transition-all ${
                    isGeneratingPrompts || !name || !role ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-95 shadow-sm"
                  }`}
                >
                  {isGeneratingPrompts ? (
                    <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Star className="w-3 h-3" />
                  )}
                  {isGeneratingPrompts ? "Generating..." : "Generate with AI"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSystemPrompt(persona.systemPrompt || "");
                    setVisualPrompt(persona.visualPrompt || "");
                    setVisualPromptNeutral(persona.visualPromptNeutral || "");
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-border hover:bg-white/10 text-[10px] font-bold uppercase tracking-wider cursor-pointer active:scale-95"
                >
                  Revert changes
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-subtle uppercase">LLM Personality Directives</label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={6}
                  className="w-full p-4 rounded-2xl bg-background border border-border text-xs text-foreground placeholder:text-muted outline-none focus:border-accent leading-relaxed resize-y"
                  placeholder="Write the guidelines here to shape the news script..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-subtle uppercase">Visual Prompt</label>
                <textarea
                  value={visualPrompt}
                  onChange={(e) => setVisualPrompt(e.target.value)}
                  rows={4}
                  className="w-full p-4 rounded-2xl bg-background border border-border text-xs text-foreground placeholder:text-muted outline-none focus:border-accent leading-relaxed resize-y"
                  placeholder="Image generation prompt for this persona..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-subtle uppercase">Visual Prompt Neutral</label>
                <textarea
                  value={visualPromptNeutral}
                  onChange={(e) => setVisualPromptNeutral(e.target.value)}
                  rows={4}
                  className="w-full p-4 rounded-2xl bg-background border border-border text-xs text-foreground placeholder:text-muted outline-none focus:border-accent leading-relaxed resize-y"
                  placeholder="Neutral image generation prompt for this persona..."
                />
              </div>
            </div>

            <div className="flex justify-between items-center border-t border-border pt-4">
              <span className="text-[10px] text-muted font-bold uppercase">
                Characters: {systemPrompt.length}
              </span>
              <button
                type="button"
                onClick={handleSavePrompt}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Save className="w-4 h-4" /> Save Directives
              </button>
            </div>
          </div>
        )}

        {/* Visual Presets Tab */}
        {activeTab === "visual" && (
          <div className="p-6 backdrop-blur-md bg-surface/20 border border-border/60 rounded-3xl space-y-6 shadow-inner animate-in fade-in duration-200">
            <div className="border-b border-border pb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">Visual Setting Presets</h3>
                <p className="text-[10px] text-muted font-medium mt-0.5">Customize the visual base prompt and camera angles using studio presets.</p>
              </div>
              <button
                type="button"
                onClick={handleSavePrompt}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Save className="w-4 h-4" /> Save Presets Prompt
              </button>
            </div>

            <PresetSelector
              personaDescription={description || `${name}, a professional presenter`}
              onSelect={(res) => {
                setVisualPrompt(res.compiledPrompt);
                // Also clean and transform neutral prompt close-up
                const neutral = res.compiledPrompt
                  .replace(/medium shot|waist up|chest-up|torso shot|full-body/gi, "close-up portrait headshot")
                  .replace(/sitting at a news desk|standing outdoors|standing in front of|standing behind/gi, "solid neutral studio background");
                setVisualPromptNeutral(neutral);
              }}
              selectedPreset="news-anchor-desk"
            />
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === "stats" && (
          <div className="p-6 backdrop-blur-md bg-surface/20 border border-border/60 rounded-3xl space-y-6 shadow-inner">
            <h3 className="text-sm font-bold text-foreground border-b border-border pb-2.5">Performance Metrics</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="p-4 rounded-2xl border border-border/60 bg-background/30 flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Produced Videos</span>
                <span className="text-2xl font-black text-foreground">{persona.stats?.videosCount || 0}</span>
                <p className="text-[9px] text-muted mt-1">Videos in which this presenter was main.</p>
              </div>

              <div className="p-4 rounded-2xl border border-border/60 bg-background/30 flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Assigned Scenes</span>
                <span className="text-2xl font-black text-foreground">{persona.stats?.scenesCount || 0}</span>
                <p className="text-[9px] text-muted mt-1">Individual scenes in Remotion and Inngest.</p>
              </div>

              <div className="p-4 rounded-2xl border border-border/60 bg-background/30 flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Total Screen Time</span>
                <span className="text-2xl font-black text-foreground">
                  {persona.stats?.totalScreenTime ? (persona.stats.totalScreenTime / 60).toFixed(1) : "0"}m
                </span>
                <p className="text-[9px] text-muted mt-1">Total minutes of generated dialogue.</p>
              </div>
            </div>

            {/* Weekly performance mock chart */}
            <div className="p-4.5 rounded-2xl border border-border/50 bg-background/20 space-y-4">
              <h4 className="text-xs font-bold text-foreground">Weekly usage performance (Last 5 weeks)</h4>
              <div className="space-y-3">
                {persona.stats?.weeklyUsage?.map((week, idx) => (
                  <ChartRow key={idx} label={week.label} value={week.value} count={week.count} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ id: _id, active, onClick, label, icon }: { id: string; active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
        active 
          ? "bg-foreground text-background" 
          : "text-muted hover:text-foreground hover:bg-white/5"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ChartRow({ label, value, count }: { label: string; value: number; count: number }) {
  return (
    <div className="flex items-center gap-4 text-xs font-semibold text-subtle">
      <span className="w-20">{label}</span>
      <div className="flex-grow h-3 bg-background/80 rounded-full overflow-hidden border border-border/40">
        <div 
          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full" 
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="w-10 text-right font-bold text-foreground">{count} clips</span>
    </div>
  );
}

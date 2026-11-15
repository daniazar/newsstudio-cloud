"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import {
  Save,
  RefreshCw,
  Globe,
  Bot,
  Check,
  Search,
  User,
  Zap,
  Mic,
  Layers,
  PlayCircle,
  Smile,
  Code2
} from "lucide-react";
import { PERSONAS } from "@/lib/tts/personas";
import { getVoiceProfileByPersonaId } from "@/lib/tts/voiceCatalog";
import { useToast } from "@/components/global/ToastContainer";
import { LOCAL_WORKER_BASE_URL } from "@/lib/hooks/useLocalWorkerWake";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const PIPER_MODELS = [
  { id: "en_US-lessac-high", name: "English (US) — Lessac High", lang: "en-US", tier: "Studio Clear" },
  { id: "en_US-libritts_r-medium", name: "English (US) — LibriTTS-R Medium", lang: "en-US", tier: "Warm Broadcast" },
  { id: "en_US-amy-medium", name: "English (US) — Amy Medium", lang: "en-US", tier: "Conversational" },
  { id: "en_GB-alan-medium", name: "English (UK) — Alan Medium", lang: "en-GB", tier: "British Anchor" },
  { id: "es_AR-tomas-medium", name: "Spanish (Argentina) — Tomás Medium", lang: "es-AR", tier: "Rioplatense Anchor" },
  { id: "es_AR-daniela-high", name: "Spanish (Argentina) — Daniela High", lang: "es-AR", tier: "Rioplatense News" },
  { id: "es_ES-davefx-medium", name: "Spanish (Spain) — DaveFX Medium", lang: "es-ES", tier: "Peninsular Studio" },
  { id: "es_ES-carlfm-x_low", name: "Spanish (Spain) — CarlFM Fast", lang: "es-ES", tier: "Ultra Low Latency" },
  { id: "es_MX-ald-medium", name: "Spanish (Mexico) — ALD Medium", lang: "es-MX", tier: "LatAm Broadcast" },
  { id: "fr_FR-siwis-medium", name: "French (France) — Siwis Medium", lang: "fr", tier: "Parisian News" },
  { id: "de_DE-thorsten-high", name: "German (Germany) — Thorsten High", lang: "de", tier: "Berlin Broadcast" },
  { id: "pt_BR-faber-medium", name: "Portuguese (Brazil) — Faber Medium", lang: "pt-BR", tier: "Brazilian Anchor" },
  { id: "it_IT-riccardo-medium", name: "Italian (Italy) — Riccardo Medium", lang: "it", tier: "Italian Studio" },
  { id: "ja_JP-kokoro-medium", name: "Japanese (Japan) — Kokoro Medium", lang: "ja", tier: "Tokyo Voice" }
];

const MODERN_ENGINES = [
  {
    id: "piper",
    name: "Piper ONNX",
    tagline: "Ultra-Low Latency (<100ms RTF)",
    badge: "Real-Time / Discord",
    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    defaultModel: "en_US-lessac-high",
    description: "Instant neural phoneme synthesis designed for live voice calls, Discord bots, and interactive streaming."
  },
  {
    id: "f5_tts",
    name: "F5-TTS Flow Matching",
    tagline: "Zero-Shot Studio Master",
    badge: "Broadcast Master",
    badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    defaultModel: "jpgallegoar/F5-Spanish",
    description: "Diffusion-based Flow Matching conditioned on persona reference WAVs for ultra-expressive broadcast narration."
  },
  {
    id: "orpheus",
    name: "Orpheus-TTS 3B",
    tagline: "Emotive Speech LLM",
    badge: "Emotive LLM",
    badgeColor: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    defaultModel: "unsloth/orpheus-3b-0.1-ft",
    description: "3B Speech-LLM with SNAC 24kHz codec. Native emotive tags like <laugh>, <sigh>, <gasp>, and expressive pauses."
  },
  {
    id: "omnivoice",
    name: "OmniVoice",
    tagline: "Next-gen Qwen + HiggsAudio",
    badge: "Next-Gen",
    badgeColor: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    defaultModel: "k2-fsa/OmniVoice",
    description: "Next-gen zero-shot neural cloning with Qwen backbone and HiggsAudioV2 tokenizer for high-fidelity multi-lingual audio."
  },
  {
    id: "kokoro",
    name: "Kokoro 82M",
    tagline: "Sub-50ms Crystal Broadcast",
    badge: "Ultra-Fast",
    badgeColor: "bg-green-500/20 text-green-400 border-green-500/30",
    defaultModel: "hexgrad/Kokoro-82M",
    description: "Lightweight 82M broadcast engine with pristine enunciation and instant sub-50ms synthesis turnaround."
  },
  {
    id: "styletts2",
    name: "StyleTTS 2",
    tagline: "Acoustic Style & Emotion",
    badge: "Expressive",
    badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    defaultModel: "styletts2/default",
    description: "Rich acoustic style modeling that preserves emotional cadences and dramatic pitch curves."
  },
  {
    id: "cosyvoice_3",
    name: "CosyVoice 3",
    tagline: "Multi-Lingual High Fidelity",
    badge: "Multi-Lingual",
    badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    defaultModel: "FunAudioLLM/CosyVoice-300M",
    description: "Multilingual zero-shot voice cloning with natural prosody and multilingual dialect support."
  },
  {
    id: "xtts_v2",
    name: "XTTS v2",
    tagline: "17-Language Multi-Clone",
    badge: "17 Languages",
    badgeColor: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    defaultModel: "marianbasti/XTTS-v2-argentinian-spanish",
    description: "Mature multi-lingual zero-shot voice cloning model supporting 17 international languages."
  },
  {
    id: "chattts",
    name: "ChatTTS",
    tagline: "Conversational & Laughter",
    badge: "Conversational",
    badgeColor: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    defaultModel: "2noise/ChatTTS",
    description: "Conversational dialogue engine with natural laughter, oral interjections, and pause control."
  },
  {
    id: "melotts",
    name: "MeloTTS",
    tagline: "BERT Phonetic Alignment",
    badge: "Multi-Accent",
    badgeColor: "bg-teal-500/20 text-teal-400 border-teal-500/30",
    defaultModel: "myshell-ai/MeloTTS-Spanish",
    description: "High-speed multi-accent neural TTS with VITS + BERT phonetic alignment."
  }
];

const LANGUAGE_OPTIONS = [
  { code: "auto", label: "Auto-Detect / Dynamic Match", flag: "🌐" },
  { code: "es-AR", label: "Spanish (Argentina / Rioplatense)", flag: "🇦🇷" },
  { code: "es-ES", label: "Spanish (Spain / Peninsular)", flag: "🇪🇸" },
  { code: "es-MX", label: "Spanish (Mexico / LATAM)", flag: "🇲🇽" },
  { code: "es", label: "Spanish (Generic)", flag: "🇪🇸" },
  { code: "en-US", label: "English (US Broadcast)", flag: "🇺🇸" },
  { code: "en-GB", label: "English (UK British)", flag: "🇬🇧" },
  { code: "en", label: "English (Generic)", flag: "🇺🇸" },
  { code: "fr", label: "French (France)", flag: "🇫🇷" },
  { code: "de", label: "German (Germany)", flag: "🇩🇪" },
  { code: "pt-BR", label: "Portuguese (Brazil)", flag: "🇧🇷" },
  { code: "it", label: "Italian (Italy)", flag: "🇮🇹" },
  { code: "ja", label: "Japanese (Japan)", flag: "🇯🇵" },
  { code: "zh", label: "Mandarin Chinese", flag: "🇨🇳" }
];

const PRESET_SCRIPTS = [
  {
    label: "Breaking News Lead (EN)",
    lang: "en-US",
    text: "Breaking news tonight: Artificial intelligence models have achieved sub-one-hundred millisecond turnaround in live voice broadcasts."
  },
  {
    label: "Argentine Tech & Finance (es-AR)",
    lang: "es-AR",
    text: "Buenas noches a todos. En los mercados financieros de hoy, las acciones de tecnología lideran una jornada con subas históricas en Wall Street."
  },
  {
    label: "Orpheus Emotive Test (EN)",
    lang: "en-US",
    text: "Wait, are you serious? <laugh> That's honestly unbelievable! <gasp> Let me check the live charts right now."
  },
  {
    label: "Discord Voice Banter (Bilingual)",
    lang: "auto",
    text: "Hey everyone! Ruby here, live on voice. What tech breakthroughs or market trends are we breaking down today?"
  },
  {
    label: "Cultural & Investigative (es-ES)",
    lang: "es-ES",
    text: "Bienvenidos a nuestro informe especial. Hoy analizamos el impacto de la inteligencia artificial en la creación de contenidos multimedia."
  }
];

interface DbPersonaRaw {
  id: string;
  slug?: string;
  name: string;
  role?: string;
  title?: string;
  gender?: string;
  language?: string;
  avatarUrl?: string;
  avatars?: { imageUrl?: string }[];
  description?: string;
  bio?: string;
}

function VoiceStudioContent() {
  const searchParams = useSearchParams();
  const urlPersonaId = searchParams?.get("personaId") || searchParams?.get("persona");
  const { toast } = useToast();

  // Settings State
  const [activePersonaId, setActivePersonaId] = useState<string>(urlPersonaId || "ruby");
  const [engine, setEngine] = useState<string>("piper");
  const [selectedModel, setSelectedModel] = useState<string>("en_US-lessac-high");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("auto");
  const [languageMode, setLanguageMode] = useState<"auto_detect" | "locked">("auto_detect");
  const [speedFactor, setSpeedFactor] = useState<number>(1.0);
  const [pitchShift, setPitchShift] = useState<number>(0.0);
  const [applyYeismo, setApplyYeismo] = useState<boolean>(true);
  const [referenceAudio, setReferenceAudio] = useState<string>("Emily.wav");
  const [wakeWordOnly, setWakeWordOnly] = useState<boolean>(false);
  const [ollamaModel, setOllamaModel] = useState<string>("qwen2.5:3b");

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("all");
  const [selectedGenderFilter, setSelectedGenderFilter] = useState("all");
  const [selectedLangFilter, setSelectedLangFilter] = useState("all");

  // Live Testing & Audio State
  const [testText, setTestText] = useState(PRESET_SCRIPTS[0].text);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch custom personas from DB
  const { data: personasData } = useSWR<{ personas?: DbPersonaRaw[]; data?: DbPersonaRaw[] }>(
    "/api/personas?limit=100&lite=true",
    fetcher
  );

  const allPersonas = useMemo(() => {
    const dbList = (personasData?.personas || personasData?.data || []).map((p: DbPersonaRaw) => ({
      id: p.slug || p.id,
      name: p.name,
      title: p.role || p.title || "Custom Anchor",
      gender: p.gender || "neutral",
      language: p.language || "es-AR",
      avatarUrl: p.avatars?.[0]?.imageUrl || p.avatarUrl || `/avatars/${p.slug || p.id}.png`,
      description: p.description || p.bio || "Custom AI News Anchor",
      voiceFile: `${p.slug || p.id}.wav`,
      traits: {
        age: 30,
        gender: p.gender || "neutral",
        ethnicity: "Neutral",
        style: "Professional Broadcast",
        pace: "moderate",
        energy: "high",
        face: p.name,
        body: "Professional",
        eyes: "Brown",
        hair: "Dark",
        attire: "Suit",
        lighting: "Studio",
        camera: "Medium Shot",
      },
      voice: {
        piperModel: "es_AR-tomas-medium",
        piperSpeed: 1.0,
        f5ReferenceWav: `${p.slug || p.id}.wav`,
        f5ReferenceText: "Buenas noches a todos.",
        language: p.language || "es-AR",
        gender: p.gender || "neutral",
        recommendedSpeed: 1.0,
        recommendedPitch: 0.0,
        applyYeismo: true,
        traits: ["Clear", "Broadcast"],
      },
    }));

    const map = new Map<string, unknown>();
    for (const p of PERSONAS) {
      map.set(p.id, p);
    }
    for (const p of dbList) {
      if (!map.has(p.id)) {
        map.set(p.id, p);
      }
    }
    return Array.from(map.values()) as typeof PERSONAS;
  }, [personasData]);

  // Service Health State
  const [serverHealth, setServerHealth] = useState<{
    modernTts: "online" | "offline" | "local" | "checking";
    ollama: "online" | "offline" | "local" | "checking";
  }>({
    modernTts: "checking",
    ollama: "checking"
  });

  const applyPersonaVoiceDefaults = (pId: string) => {
    setActivePersonaId(pId);
    const profile = getVoiceProfileByPersonaId(pId);
    if (profile) {
      setReferenceAudio(profile.voiceFile || `${pId}.wav`);
      if (engine === "piper" && profile.tier1) {
        setSelectedModel(profile.tier1.model);
        setSpeedFactor(profile.tier1.speedFactor || 1.0);
        setPitchShift(profile.tier1.pitchShift || 0.0);
      } else if (profile.tier2) {
        setSpeedFactor(profile.tier2.speedFactor || 1.0);
        setPitchShift(profile.tier2.pitchShift || 0.0);
      }
    } else {
      const custom = allPersonas.find((p) => p.id === pId);
      const customVoice = (custom as unknown as { voice?: { f5ReferenceWav?: string; piperModel?: string; recommendedSpeed?: number; applyYeismo?: boolean } })?.voice;
      if (customVoice) {
        setReferenceAudio(customVoice.f5ReferenceWav || `${pId}.wav`);
        if (customVoice.piperModel) setSelectedModel(customVoice.piperModel);
        if (customVoice.recommendedSpeed) setSpeedFactor(customVoice.recommendedSpeed);
        if (typeof customVoice.applyYeismo === "boolean") setApplyYeismo(customVoice.applyYeismo);
      }
    }
  };

  const [prevUrlPersona, setPrevUrlPersona] = useState<string | null>(urlPersonaId);
  if (urlPersonaId && urlPersonaId !== prevUrlPersona) {
    setPrevUrlPersona(urlPersonaId);
    applyPersonaVoiceDefaults(urlPersonaId);
  }

  const handleSelectPersona = (pId: string) => {
    applyPersonaVoiceDefaults(pId);
  };

  // Load Saved Settings on Mount
  useEffect(() => {
    fetch("/api/voice-settings")
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          if (data.activePersonaId && !urlPersonaId) setActivePersonaId(data.activePersonaId);
          if (data.defaultEngine) setEngine(data.defaultEngine);
          if (data.selectedModel) setSelectedModel(data.selectedModel);
          if (data.selectedLanguage) setSelectedLanguage(data.selectedLanguage);
          if (data.languageMode) setLanguageMode(data.languageMode);
          if (typeof data.speedFactor === "number") setSpeedFactor(data.speedFactor);
          if (typeof data.pitchShift === "number") setPitchShift(data.pitchShift);
          if (typeof data.applyYeismo === "boolean") setApplyYeismo(data.applyYeismo);
          if (data.referenceAudio) setReferenceAudio(data.referenceAudio);
          if (data.discordSync) {
            setWakeWordOnly(!!data.discordSync.wakeWordOnly);
            if (data.discordSync.model) setOllamaModel(data.discordSync.model);
          }
        }
      })
      .catch((err) => console.error("Error loading voice settings:", err));

    let mounted = true;
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        if (mounted) {
          const ttsStatus = data?.services?.tts?.status;
          const ollamaStatus = data?.services?.ollama?.status;
          setServerHealth({
            modernTts: ttsStatus === "online" ? "online" : ttsStatus === "unconfigured" ? "local" : "offline",
            ollama: ollamaStatus === "online" ? "online" : ollamaStatus === "unconfigured" ? "local" : "offline",
          });
        }
      })
      .catch(() => {
        if (mounted) {
          setServerHealth({ modernTts: "offline", ollama: "offline" });
        }
      });

    return () => {
      mounted = false;
    };
  }, [urlPersonaId]);

  // Active Persona Object
  const activePersona = useMemo(() => {
    return allPersonas.find((p) => p.id === activePersonaId) || allPersonas[0] || PERSONAS[0];
  }, [allPersonas, activePersonaId]);

  // Dual-Tier Profile for Active Persona
  const activeDualTierProfile = useMemo(() => {
    return getVoiceProfileByPersonaId(activePersonaId);
  }, [activePersonaId]);

  // Filtered Personas
  const filteredPersonas = useMemo(() => {
    return allPersonas.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesGender = selectedGenderFilter === "all" || p.gender === selectedGenderFilter;
      const matchesLang = selectedLangFilter === "all" || p.language === selectedLangFilter;
      
      const matchesRole =
        selectedRoleFilter === "all" ||
        (selectedRoleFilter === "anchor" && (p.title.toLowerCase().includes("anchor") || p.title.toLowerCase().includes("host"))) ||
        (selectedRoleFilter === "analyst" && (p.title.toLowerCase().includes("analyst") || p.title.toLowerCase().includes("finance") || p.title.toLowerCase().includes("tech"))) ||
        (selectedRoleFilter === "reporter" && (p.title.toLowerCase().includes("reporter") || p.title.toLowerCase().includes("field"))) ||
        (selectedRoleFilter === "culture" && (p.title.toLowerCase().includes("culture") || p.title.toLowerCase().includes("creative") || p.title.toLowerCase().includes("lifestyle")));

      return matchesSearch && matchesGender && matchesLang && matchesRole;
    });
  }, [allPersonas, searchQuery, selectedGenderFilter, selectedLangFilter, selectedRoleFilter]);

  // Handle Engine Switch with auto default model
  const handleSelectEngine = (newEngineId: string) => {
    setEngine(newEngineId);
    const engObj = MODERN_ENGINES.find((e) => e.id === newEngineId);
    if (engObj && engObj.defaultModel) {
      setSelectedModel(engObj.defaultModel);
    }
  };

  // Insert Emotive Tag into Script Textarea
  const insertEmotiveTag = (tag: string) => {
    setTestText((prev) => `${prev} ${tag} `);
  };

  // Test Synthesis
  const handleTestSynthesis = async () => {
    if (!testText.trim()) return;
    setIsSynthesizing(true);
    setLastLatencyMs(null);

    try {
      const payload = {
        text: testText,
        engine,
        checkpoint: selectedModel,
        personaId: activePersonaId,
        referenceAudio,
        pitchShift,
        speedFactor,
        language: selectedLanguage === "auto" ? (activePersona.language || "es") : selectedLanguage,
        applyYeismo
      };

      let response = await fetch("/api/voice-settings/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const contentType = response.headers.get("Content-Type") || "";
      if (!response.ok || contentType.includes("application/json")) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.remoteWorkerRequired || response.status === 503) {
          const isHttpOrigin =
            typeof window !== "undefined" && window.location.protocol === "http:";
          if (!isHttpOrigin) {
            toast(
              "Local Worker Unreachable",
              errorData.error ||
                "Start your local PC worker (npm run worker) to synthesize previews from the cloud.",
              "error"
            );
            return;
          }

          try {
            response = await fetch(`${LOCAL_WORKER_BASE_URL}/tts/preview`, {
              method: "POST",
              mode: "cors",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });
          } catch {
            toast(
              "Local Worker Unreachable",
              `Voice preview requires the local PC worker at ${LOCAL_WORKER_BASE_URL}. Start it with: npm run worker`,
              "error"
            );
            return;
          }

          if (!response.ok) {
            const workerError = await response.json().catch(() => ({}));
            throw new Error(workerError.error || `Local worker synthesis failed (${response.status})`);
          }
        } else {
          throw new Error(errorData.error || `Synthesis failed (${response.status})`);
        }
      }

      const latencyHeader = response.headers.get("X-Synthesis-Latency-Ms");
      if (latencyHeader) {
        setLastLatencyMs(parseInt(latencyHeader, 10));
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      setAudioUrl(url);

      // Play audio automatically
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch(() => {});
        }
      }, 50);

      toast("Synthesis Complete", `Generated via ${engine} in ${latencyHeader || "120"}ms`, "success");
    } catch (err: unknown) {
      console.error("Preview failed:", err);
      toast("Synthesis Error", err instanceof Error ? err.message : "Preview failed", "error");
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const payload = {
        activePersonaId,
        defaultEngine: engine,
        selectedModel,
        selectedLanguage,
        languageMode,
        speedFactor,
        pitchShift,
        applyYeismo,
        referenceAudio,
        discordSync: {
          enabled: true,
          wakeWordOnly,
          model: ollamaModel
        }
      };

      const res = await fetch("/api/voice-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to save settings");

      toast("Settings Saved", `Active voice updated for ${activePersona.name} across Studio and Discord Bot!`, "success");
    } catch (err: unknown) {
      toast("Save Failed", err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedLangObj = LANGUAGE_OPTIONS.find((l) => l.code === selectedLanguage) || LANGUAGE_OPTIONS[0];

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header & Quick Telemetry Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-sky-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-400/30 text-white">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black text-foreground tracking-tight">
                    Voice Matrix &amp; Persona Studio
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    TTS ENGINE :8005
                  </span>
                </div>
                <p className="text-xs text-subtle font-normal mt-0.5">
                  Configure Modern-TTS multi-tier engines (Piper ONNX, F5-TTS, Orpheus, OmniVoice, Kokoro), acoustic style sliders, and phonetic prosody
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-raised border border-border/80 text-xs font-mono">
              <span className="text-subtle">Modern-TTS :8005:</span>
              <span className={`flex items-center gap-1 font-bold ${serverHealth.modernTts === "online" ? "text-emerald-400" : "text-amber-400"}`}>
                <span className={`w-2 h-2 rounded-full ${serverHealth.modernTts === "online" ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-amber-400"}`} />
                {serverHealth.modernTts.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-raised border border-border/80 text-xs font-mono">
              <span className="text-subtle">Ollama :11434:</span>
              <span className={`flex items-center gap-1 font-bold ${serverHealth.ollama === "online" ? "text-emerald-400" : "text-amber-400"}`}>
                <span className={`w-2 h-2 rounded-full ${serverHealth.ollama === "online" ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-amber-400"}`} />
                {serverHealth.ollama.toUpperCase()}
              </span>
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all duration-200 cursor-pointer shadow-lg shadow-emerald-500/25 active:scale-95 border border-emerald-400/30 disabled:opacity-50 self-start"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Saving..." : "Save Active Preset"}</span>
            </button>
          </div>
        </div>

        {/* Live Payload Indicator Bar */}
        <div className="bg-surface/80 border border-border rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap font-mono">
            <span className="text-muted-foreground font-sans font-semibold flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-emerald-400" />
              Active Engine Payload:
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
              {engine}
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Lang: <strong className="text-white">{selectedLanguage}</strong> {selectedLangObj.flag}
            </span>
            <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 truncate max-w-[220px]">
              Model: {selectedModel}
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Speed: {speedFactor.toFixed(2)}x
            </span>
            <span className="px-2 py-0.5 rounded bg-white/5 text-muted-foreground border border-border">
              Pitch: {pitchShift > 0 ? `+${pitchShift}` : pitchShift}st
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-[11px]">Turn Mode:</span>
            <span className="font-semibold text-emerald-400 font-mono text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {languageMode === "auto_detect" ? "🌐 Auto-Detect" : "🔒 Locked"}
            </span>
          </div>
        </div>

        {/* Main 3-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* ================================================================= */}
          {/* COLUMN 1: Persona Vault & Filtering (4 Cols) */}
          {/* ================================================================= */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-400" />
                  Select Anchor / Persona
                </h2>
                <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-semibold border border-emerald-500/20">
                  {filteredPersonas.length} Available
                </span>
              </div>

              {/* Filters */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by name, title, traits..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-background border border-border text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  <select
                    value={selectedRoleFilter}
                    onChange={(e) => setSelectedRoleFilter(e.target.value)}
                    className="p-1.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none"
                  >
                    <option value="all">All Genres</option>
                    <option value="anchor">News Anchor</option>
                    <option value="analyst">Tech / Finance</option>
                    <option value="reporter">Field Reporter</option>
                    <option value="culture">Culture & Host</option>
                  </select>

                  <select
                    value={selectedGenderFilter}
                    onChange={(e) => setSelectedGenderFilter(e.target.value)}
                    className="p-1.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none"
                  >
                    <option value="all">All Genders</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>

                  <select
                    value={selectedLangFilter}
                    onChange={(e) => setSelectedLangFilter(e.target.value)}
                    className="p-1.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none"
                  >
                    <option value="all">All Languages</option>
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </select>
                </div>
              </div>

              {/* Persona List Scroll Area */}
              <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                {filteredPersonas.map((persona) => {
                  const isSelected = persona.id === activePersonaId;
                  const profile = getVoiceProfileByPersonaId(persona.id);

                  return (
                    <div
                      key={persona.id}
                      onClick={() => handleSelectPersona(persona.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                        isSelected
                          ? "bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/10"
                          : "bg-background/60 hover:bg-background border-border/70 hover:border-border"
                      }`}
                    >
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-white/5 border border-border shrink-0">
                        {persona.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={persona.avatarUrl}
                            alt={persona.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-emerald-400">
                            {persona.name.charAt(0)}
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-emerald-500 flex items-center justify-center">
                            <Check className="w-2 h-2 text-white" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold truncate text-foreground">{persona.name}</h3>
                          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground">
                            {persona.language}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{persona.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                            {profile?.tier1?.model?.split("-")[0] || "Piper ONNX"}
                          </span>
                          <span className="text-[9px] text-muted-foreground truncate">
                            {persona.voiceFile || profile?.voiceFile || `${persona.id}.wav`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* COLUMN 2: Modern-TTS Engine Matrix (Orpheus, Omni, Kokoro, Piper) (5 Cols) */}
          {/* ================================================================= */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Active Persona Banner Card */}
            <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white/5 border border-emerald-500/30 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activePersona.avatarUrl || "/avatars/placeholder.png"}
                    alt={activePersona.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-foreground">{activePersona.name}</h2>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                      ACTIVE
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{activePersona.title}</p>
                  <p className="text-[11px] text-emerald-400/90 italic line-clamp-1 mt-0.5">
                    {activeDualTierProfile?.tier2?.timbreIdentity || activePersona.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Modern-TTS Engine Grid */}
            <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  Modern-TTS Neural Engines & Models
                </h3>
                <span className="text-xs text-muted-foreground font-mono">10 Engines Active</span>
              </div>

              {/* Engine Grid Cards (Scrollable) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-1">
                {MODERN_ENGINES.map((eng) => {
                  const isSelected = engine === eng.id;
                  return (
                    <div
                      key={eng.id}
                      onClick={() => handleSelectEngine(eng.id)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500"
                          : "bg-background/60 hover:bg-background border-border/70"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">{eng.name}</span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${eng.badgeColor}`}>
                          {eng.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-1 mt-1">
                        {eng.tagline}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Dynamic Model Dropdown */}
              <div className="space-y-2 pt-2 border-t border-border">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Selected Model / Checkpoint:</span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {engine === "piper" ? "ONNX Neural Checkpoint" : "HuggingFace Checkpoint"}
                  </span>
                </label>

                {engine === "piper" ? (
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    {PIPER_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} [{m.tier}]
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    placeholder="e.g. unsloth/orpheus-3b-0.1-ft or k2-fsa/OmniVoice"
                    className="w-full p-2.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-emerald-500 font-mono"
                  />
                )}
              </div>

              {/* Acoustic Reference Audio File */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Acoustic Timbre Reference (.wav):</span>
                  <span className="text-[10px] text-muted-foreground font-mono">10s Voice Embedding</span>
                </label>
                <input
                  type="text"
                  value={referenceAudio}
                  onChange={(e) => setReferenceAudio(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-emerald-500 font-mono"
                  placeholder="e.g. Emily.wav or tomas.wav"
                />
              </div>

              {/* Fine-Tuning Sliders */}
              <div className="space-y-3 pt-2 border-t border-border">
                {/* Speed Slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Pacing / Speed Factor:</span>
                    <span className="font-mono text-emerald-400 font-bold">{speedFactor.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.70"
                    max="1.40"
                    step="0.05"
                    value={speedFactor}
                    onChange={(e) => setSpeedFactor(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>

                {/* Pitch Shift Slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Pitch Shift (Semitones):</span>
                    <span className="font-mono text-emerald-400 font-bold">{pitchShift > 0 ? `+${pitchShift.toFixed(1)}` : pitchShift.toFixed(1)} st</span>
                  </div>
                  <input
                    type="range"
                    min="-3.0"
                    max="3.0"
                    step="0.5"
                    value={pitchShift}
                    onChange={(e) => setPitchShift(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>

                {/* Argentine Yeismo Toggle */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-xs font-semibold text-foreground">Yeísmo Rehilado (Argentine Phonetics)</span>
                    <p className="text-[10px] text-muted-foreground">Normalizes &apos;ll&apos; and &apos;y&apos; sounds for authentic Rioplatense pronunciation</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setApplyYeismo(!applyYeismo)}
                    className={`w-11 h-6 rounded-full transition-colors flex items-center p-1 ${
                      applyYeismo ? "bg-emerald-500 justify-end" : "bg-white/10 justify-start"
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* ================================================================= */}
          {/* COLUMN 3: Language Selector, Emotive Tags & Live Audio Tester (3 Cols) */}
          {/* ================================================================= */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* Language & Dialect Selector Card */}
            <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  Target Language Indicator
                </h3>
                <span className="text-base">{selectedLangObj.flag}</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Passed Language Code to Modern-TTS:</label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="w-full mt-1.5 p-2.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-emerald-500 font-semibold"
                  >
                    {LANGUAGE_OPTIONS.map((opt) => (
                      <option key={opt.code} value={opt.code}>
                        {opt.flag} {opt.label} ({opt.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Turn-Taking Mode:</label>
                  <div className="grid grid-cols-2 gap-2 text-xs mt-1.5">
                    <button
                      type="button"
                      onClick={() => setLanguageMode("auto_detect")}
                      className={`p-2 rounded-xl border text-center font-semibold transition-all ${
                        languageMode === "auto_detect"
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                          : "bg-background border-border text-muted-foreground"
                      }`}
                    >
                      🌐 Auto-Detect
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguageMode("locked")}
                      className={`p-2 rounded-xl border text-center font-semibold transition-all ${
                        languageMode === "locked"
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                          : "bg-background border-border text-muted-foreground"
                      }`}
                    >
                      🔒 Enforced Lock
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Synthesis Tester Card */}
            <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Live Audio Tester
                </h3>
                {lastLatencyMs && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-mono font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                    ⚡ {lastLatencyMs}ms
                  </span>
                )}
              </div>

              {/* Sample Presets */}
              <div className="flex gap-1 flex-wrap">
                {PRESET_SCRIPTS.map((ps, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTestText(ps.text);
                      if (ps.lang) setSelectedLanguage(ps.lang);
                    }}
                    className="text-[10px] px-2 py-1 rounded bg-background border border-border text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {ps.label}
                  </button>
                ))}
              </div>

              {/* Emotive Tags Bar for Orpheus / ChatTTS */}
              {(engine === "orpheus" || engine === "chattts") && (
                <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-1">
                  <span className="text-[10px] font-bold text-purple-400 flex items-center gap-1">
                    <Smile className="w-3 h-3" /> Insert Emotive Tags:
                  </span>
                  <div className="flex gap-1 flex-wrap">
                    {["<laugh>", "<sigh>", "<gasp>", "<yawn>", "<snicker>"].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => insertEmotiveTag(tag)}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/30 transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Script Textarea */}
              <textarea
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                rows={3}
                className="w-full p-2.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-emerald-500 resize-none font-sans"
                placeholder="Enter custom speech script to test voice synthesis..."
              />

              {/* Action Buttons & Audio Player */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleTestSynthesis}
                  disabled={isSynthesizing}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all"
                >
                  {isSynthesizing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Synthesizing via {engine}...
                    </>
                  ) : (
                    <>
                      <PlayCircle className={`w-4 h-4 ${isPlaying ? "text-emerald-200 animate-pulse" : ""}`} />
                      {isPlaying ? "Playing Voice Audio..." : "Test Voice Synthesis"}
                    </>
                  )}
                </button>

                {audioUrl && (
                  <div className="pt-2">
                    <audio
                      ref={audioRef}
                      src={audioUrl}
                      controls
                      className="w-full h-8"
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onEnded={() => setIsPlaying(false)}
                    />
                  </div>
                )}
              </div>

            </div>

            {/* Discord Bot Direct Sync Card */}
            <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Bot className="w-4 h-4 text-purple-400" />
                  Discord Voice Sync
                </h3>
                <span className="text-[10px] bg-purple-500/20 text-purple-400 font-bold px-2 py-0.5 rounded-full border border-purple-500/30">
                  Bot Engine
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Ollama Reasoning LLM:</span>
                  <span className="font-mono text-foreground font-bold">{ollamaModel}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="font-semibold text-foreground">Wake Word Trigger Mode</span>
                    <p className="text-[10px] text-muted-foreground">Only speaks when name is addressed</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWakeWordOnly(!wakeWordOnly)}
                    className={`w-9 h-5 rounded-full transition-colors flex items-center p-0.5 ${
                      wakeWordOnly ? "bg-purple-500 justify-end" : "bg-white/10 justify-start"
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                  </button>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

export default function VoiceStudioSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-xs">
          Loading Voice Studio...
        </div>
      }
    >
      <VoiceStudioContent />
    </Suspense>
  );
}


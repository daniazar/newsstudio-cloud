"use client";

import { InfiniteScrollSentinel } from "@/components/global/InfiniteScrollSentinel";
import { useToast } from "@/components/global/ToastContainer";
import { useInfiniteList } from "@/lib/hooks/useInfiniteList";
import { Globe,LayoutGrid,List,Paintbrush,Plus,Search,Star,Upload,Users } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import React,{ useEffect,useState } from "react";

const PresetSelector = dynamic(
  () => import("@/components/prompt-builder/PresetSelector").then((m) => m.PresetSelector),
  { ssr: false }
);
interface PersonaItem {
  id: string;
  slug: string;
  name: string;
  role: string;
  gender: string;
  language: string;
  description: string;
  avatarType: string;
  defaultAvatarId: string | null;
  isActive: boolean;
  isSystemPersona: boolean;
  avatars: Array<{ id: string; url: string; isDefault: boolean }>;
  voices: Array<{ id: string; audioPath: string; isDefault: boolean }>;
}

export default function PersonasGalleryPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Filter States
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const [filterGender, setFilterGender] = useState("all");
  const [filterLang, setFilterLang] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const {
    items: personas,
    total,
    setSize,
    size,
    isReachingEnd,
    isLoadingMore,
    isLoadingInitial,
    mutate,
  } = useInfiniteList<PersonaItem>("/api/personas", {
    limit: 24,
    filters: {
      q: debouncedSearch || undefined,
      gender: filterGender !== "all" ? filterGender : undefined,
      lang: filterLang !== "all" ? filterLang : undefined,
      type: filterType !== "all" ? filterType : undefined,
      status: filterStatus !== "all" ? filterStatus : undefined,
    },
  });
  const personasLoaded = !isLoadingInitial;

  // Create Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"info" | "visual">("info");
  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newGender, setNewGender] = useState("female");
  const [newLang, setNewLang] = useState("en");
  const [newDesc, setNewDesc] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const [newBio, setNewBio] = useState("");
  const [newVisualPrompt, setNewVisualPrompt] = useState("");
  const [newVisualPromptNeutral, setNewVisualPromptNeutral] = useState("");

  const [aiPrompt, setAiPrompt] = useState("");
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoMimeType, setPhotoMimeType] = useState<string>("image/jpeg");
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [voiceBase64, setVoiceBase64] = useState<string | null>(null);
  const [voiceFileName, setVoiceFileName] = useState<string | null>(null);
  type RejuvenatePreset = "none" | "young_rookie" | "prime_anchor" | "mature_senior";
  type GlamourLevel = "natural" | "broadcast_studio_hd" | "red_carpet_celebrity";
  type BodyMod = "original" | "athletic_toned" | "voluptuous_hourglass" | "slender_runway" | "muscular_bodybuilder" | "curvy_plus";
  type OutfitPreset = "keep_photo" | "executive_anchor_suit" | "cocktail_gala" | "cyberpunk_techwear" | "outdoor_storm_jacket";

  const [rejuvenatePreset, setRejuvenatePreset] = useState<RejuvenatePreset>("none");
  const [glamourLevel, setGlamourLevel] = useState<GlamourLevel>("natural");
  const [genderSwap, setGenderSwap] = useState(false);
  const [bodyMod, setBodyMod] = useState<BodyMod>("original");
  const [outfitPreset, setOutfitPreset] = useState<OutfitPreset>("keep_photo");
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast("Error", "Please select a valid image file (PNG/JPG).", "error");
      return;
    }

    setPhotoMimeType(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPhotoPreviewUrl(result);
      setPhotoBase64(result);
    };
    reader.readAsDataURL(file);
  };

  const handleVoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVoiceFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setVoiceBase64(result);
      toast("Success", `Audio sample "${file.name}" loaded for voice cloning.`, "success");
    };
    reader.readAsDataURL(file);
  };

  const getAvatarUrl = (p: PersonaItem) => {
    const defaultAv = p.avatars.find(a => a.isDefault) || p.avatars[0];
    return defaultAv ? defaultAv.url : "/avatars/placeholder.png";
  };

  const getLanguageLabel = (lang: string) => {
    switch (lang) {
      case "en": return "English (EN)";
      case "es": return "Spanish (ES)";
      case "fr": return "French (FR)";
      case "it": return "Italian (IT)";
      case "de": return "German (DE)";
      default: return lang.toUpperCase();
    }
  };

  const getLanguageFlag = (lang: string) => {
    switch (lang) {
      case "en": return "🇺🇸";
      case "es": return "🇪🇸";
      case "fr": return "🇫🇷";
      case "it": return "🇮🇹";
      case "de": return "🇩🇪";
      case "pt": return "🇧🇷";
      case "zh": return "🇨🇳";
      case "ja": return "🇯🇵";
      default: return "🌐";
    }
  };

  // Personas directly from server-driven query
  const filteredPersonas = personas ?? [];

  const handleAutoGenerate = async () => {
    setIsAutoGenerating(true);
    toast(
      "Generating...",
      photoBase64 ? "Gemini Vision is analyzing photo, extracting body proportions, and applying transformations." : "Designing your persona. This may take a moment.",
      "info"
    );

    try {
      if (photoBase64) {
        const res = await fetch("/api/personas/clone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: photoBase64,
            mimeType: photoMimeType,
            guidance: aiPrompt || undefined,
            rejuvenate: rejuvenatePreset !== "none" ? rejuvenatePreset : undefined,
            glamourLevel: glamourLevel !== "natural" ? glamourLevel : undefined,
            genderSwap: genderSwap ? true : undefined,
            bodyMod: bodyMod !== "original" ? bodyMod : undefined,
            outfitPreset: outfitPreset !== "keep_photo" ? outfitPreset : undefined,
            voiceBase64: voiceBase64 || undefined,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to clone persona from image");
        }

        const data = await res.json();
        const p = data.persona;
        setNewSlug(p.id || "");
        setNewName(p.name || "");
        setNewRole(p.title || "");
        setNewGender(p.gender || "female");
        setNewLang(p.language || "en");
        setNewDesc(p.description || "");
        setNewPrompt(p.systemPrompt || "");
        setNewBio(p.bio || "");
        setNewVisualPrompt(`${p.traits.build}. Hair: ${p.traits.hair}. Face: ${p.traits.face}. Attire: ${p.traits.defaultAttire}.`);
        setNewVisualPromptNeutral(`A hyper-photorealistic close-up portrait of ${p.traits.age}-year-old ${p.name}. Hair: ${p.traits.hair}. Face: ${p.traits.face}. Solid medium-grey studio backdrop.`);

        toast("Success", `Persona "${p.name}" cloned & transformed with extracted body proportions!`, "success");
      } else {
        const res = await fetch("/api/personas/generate-full", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: aiPrompt,
            imageBase64: photoBase64,
            mimeType: photoMimeType,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to generate persona");
        }

        const generated = await res.json();
        setNewSlug(generated.slug || "");
        setNewName(generated.name || "");
        setNewRole(generated.role || "");
        setNewGender(generated.gender || "male");
        setNewLang(generated.language || "en");
        setNewDesc(generated.description || "");
        setNewPrompt(generated.systemPrompt || "");
        setNewBio(generated.bio || "");
        setNewVisualPrompt(generated.visualPrompt || "");
        setNewVisualPromptNeutral(generated.visualPromptNeutral || "");

        toast("Success", "Persona generated successfully! You can review and tweak before saving.", "success");
      }
    } catch (e) {
      toast("Error", e instanceof Error ? e.message : "Error generating persona", "error");
    } finally {
      setIsAutoGenerating(false);
    }
  };

  const handlePresetSelect = (res: { compiledPrompt: string }) => {
    setNewVisualPrompt(res.compiledPrompt);
    // Clean and transform the compiled prompt into a close-up neutral headshot for SadTalker face lip-sync
    const neutral = res.compiledPrompt
      .replace(/medium shot|waist up|chest-up|torso shot|full-body/gi, "close-up portrait headshot")
      .replace(/sitting at a news desk|standing outdoors|standing in front of|standing behind/gi, "solid neutral studio background");
    setNewVisualPromptNeutral(neutral);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!newSlug || !newName || !newRole) {
      toast("Error", "Please complete all required fields.", "error");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: newSlug,
          name: newName,
          role: newRole,
          gender: newGender,
          language: newLang,
          description: newDesc,
          systemPrompt: newPrompt,
          bio: newBio,
          visualPrompt: newVisualPrompt,
          visualPromptNeutral: newVisualPromptNeutral,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast("Error", data.error || "Could not create the persona.", "error");
      } else {
        toast("Success", `Persona ${newName} successfully created`, "success");
        setIsModalOpen(false);
        // Clear fields
        setNewSlug("");
        setNewName("");
        setNewRole("");
        setNewDesc("");
        setNewPrompt("");
        setNewBio("");
        setNewVisualPrompt("");
        setNewVisualPromptNeutral("");
        mutate();
      }
    } catch {
      toast("Error", "Error connecting to the server", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 border border-emerald-400/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                  Persona Vault
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  NEURAL ANCHORS
                </span>
              </div>
              <p className="text-xs text-subtle font-normal mt-0.5">
                Manage virtual television anchors, cloned voice models, and multi-lingual avatars
                {personasLoaded && <span className="ml-1.5 font-mono font-bold text-emerald-400">· {total} on-air</span>}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all duration-200 cursor-pointer shadow-lg shadow-emerald-500/25 active:scale-95 border border-emerald-400/30 self-start"
        >
          <Plus className="w-4 h-4" /> New Persona
        </button>
      </div>

      {/* Filter and search panel */}
      <div className="p-3.5 glass-panel-raised border border-white/10 rounded-2xl flex flex-col md:flex-row gap-3 items-center justify-between shadow-lg">
        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, role, slug..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-raised/90 border border-border/80 text-foreground placeholder:text-muted text-xs focus:border-emerald-500/60 outline-none transition-all font-medium"
          />
        </div>

        {/* Filter bars */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-surface-raised/90 border border-border/80 rounded-xl px-2.5 py-1">
            <span className="text-[9px] font-mono font-bold text-muted uppercase">Lang:</span>
            <select
              value={filterLang}
              onChange={(e) => setFilterLang(e.target.value)}
              className="bg-transparent text-xs text-foreground font-semibold outline-none cursor-pointer p-0.5"
            >
              <option value="all">All</option>
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="it">Italian</option>
              <option value="de">German</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-surface-raised/90 border border-border/80 rounded-xl px-2.5 py-1">
            <span className="text-[9px] font-mono font-bold text-muted uppercase">Gender:</span>
            <select
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value)}
              className="bg-transparent text-xs text-foreground font-semibold outline-none cursor-pointer p-0.5"
            >
              <option value="all">All</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-surface-raised/90 border border-border/80 rounded-xl px-2.5 py-1">
            <span className="text-[9px] font-mono font-bold text-muted uppercase">Origin:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-transparent text-xs text-foreground font-semibold outline-none cursor-pointer p-0.5"
            >
              <option value="all">All</option>
              <option value="system">Default</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-surface-raised/90 border border-border/80 rounded-xl px-2.5 py-1">
            <span className="text-[9px] font-mono font-bold text-muted uppercase">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-xs text-foreground font-semibold outline-none cursor-pointer p-0.5"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-center bg-surface-raised/90 border border-border/80 rounded-xl overflow-hidden p-0.5 ml-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === "grid" ? "bg-emerald-500 text-white shadow-sm font-bold" : "text-muted hover:text-foreground"}`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === "table" ? "bg-emerald-500 text-white shadow-sm font-bold" : "text-muted hover:text-foreground"}`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid gallery */}
      {!personasLoaded ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-muted font-mono font-medium">Loading persona matrix...</span>
        </div>
      ) : filteredPersonas.length === 0 ? (
        <div className="text-center py-24 border border-border/80 rounded-3xl max-w-md mx-auto p-8 glass-panel-raised flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-border flex items-center justify-center text-emerald-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-black text-foreground">No Presenter Matches</h3>
            <p className="text-xs text-subtle mt-1 leading-relaxed">
              Try adjusting the filter query or create a new custom AI persona.
            </p>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredPersonas.map((p) => (
            <a
              key={p.id}
              href={`/personas/${p.slug}`}
              className="group relative flex flex-col rounded-3xl border border-border/80 glass-panel-raised overflow-hidden hover:border-emerald-500/50 shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            >
              {/* Photo Area */}
              <div className="aspect-[4/5] w-full bg-surface-raised relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getAvatarUrl(p)}
                  alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* System Badge */}
                <span className={`absolute top-3 left-3 px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold tracking-wider uppercase border backdrop-blur-md shadow ${
                  p.isSystemPersona
                    ? "bg-emerald-950/80 border-emerald-500/30 text-emerald-400"
                    : "bg-sky-950/80 border-sky-500/30 text-sky-400"
                }`}>
                  {p.isSystemPersona ? "System" : "Clone"}
                </span>

                {/* State dot */}
                <span className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full border border-background shadow-lg ${
                  p.isActive ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-slate-600"
                }`} />

                {/* Info gradient overlay */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/60 to-transparent p-4 flex flex-col justify-end pt-12">
                  <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    <span className="px-2 py-0.5 text-[9px] font-mono font-bold tracking-wider uppercase rounded-md bg-background/80 border border-border/60 text-subtle shadow-sm">
                      {p.role}
                    </span>
                    <span className="px-2 py-0.5 text-[9px] font-mono font-bold tracking-wider uppercase rounded-md bg-background/80 border border-border/60 text-subtle shadow-sm flex items-center gap-1">
                      <span>{getLanguageFlag(p.language)}</span>
                      <span>{p.language}</span>
                    </span>
                    <span className="px-2 py-0.5 text-[9px] font-mono font-bold tracking-wider uppercase rounded-md bg-background/80 border border-border/60 text-subtle shadow-sm" title={p.gender}>
                      {p.gender === "female" ? "♀ F" : "♂ M"}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-foreground tracking-tight leading-none group-hover:text-emerald-300 transition-colors">
                    {p.name}
                  </h3>
                </div>
              </div>

              {/* Quick Launch Studios Toolbar */}
              <div className="px-3.5 py-2.5 bg-surface-raised/95 border-t border-white/5 flex items-center justify-between gap-1 text-[11px] text-subtle">
                <span className="text-[9px] font-mono uppercase font-bold text-muted">Voice:</span>
                <div className="flex items-center gap-1.5">
                  <a
                    href={`/voice-studio?personaId=${p.slug}`}
                    onClick={(e) => e.stopPropagation()}
                    title="Voice Studio"
                    className="hover:scale-125 transition-transform"
                  >
                    🎙️
                  </a>
                </div>
              </div></a>
          ))}
        </div>
      ) : (
        <div className="bg-surface/30 backdrop-blur-md border border-border/80 rounded-2xl overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-border/60 bg-surface/50 text-[10px] uppercase tracking-wider text-muted font-bold">
                  <th className="p-4 pl-6 w-16">Avatar</th>
                  <th className="p-4">Persona</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Language</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Quick Studio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-sm">
                {filteredPersonas.map((p) => (
                  <tr key={p.id} onClick={() => router.push(`/personas/${p.slug}`)} className="hover:bg-surface-raised/30 transition-colors group cursor-pointer">
                    <td className="p-4 pl-6">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-border bg-black relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={getAvatarUrl(p)} alt={p.name} className="w-full h-full object-cover" />
                        {p.isSystemPersona && (
                           <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-black" title="System Persona" />
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-foreground group-hover:text-accent transition-colors block">
                        {p.name}
                      </div>
                      <span className="text-[10px] text-muted font-mono">{p.slug}</span>
                    </td>
                    <td className="p-4 text-subtle font-medium">{p.role}</td>
                    <td className="p-4 text-muted">
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5" />
                        <span>{getLanguageLabel(p.language)}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center pr-6">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${p.isActive ? "bg-success/10 text-success border border-success/20" : "bg-muted/10 text-muted border border-muted/20"}`}>
                        {p.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <a
                          href={`/wardrobe-studio?personaId=${p.slug}`}
                          onClick={(e) => e.stopPropagation()}
                          title="Wardrobe Studio"
                          className="hover:scale-125 transition-transform"
                        >
                          👗
                        </a>
                        <a
                          href={`/voice-studio?personaId=${p.slug}`}
                          onClick={(e) => e.stopPropagation()}
                          title="Voice Studio"
                          className="hover:scale-125 transition-transform"
                        >
                          🎙️
                        </a>
                        <a
                          href={`/field-reporter-studio?personaId=${p.slug}`}
                          onClick={(e) => e.stopPropagation()}
                          title="Field Reporter Studio"
                          className="hover:scale-125 transition-transform"
                        >
                          🎥
                        </a>
                        <a
                          href={`/roundtable-studio?anchor1=${p.slug}`}
                          onClick={(e) => e.stopPropagation()}
                          title="Roundtable Studio"
                          className="hover:scale-125 transition-transform"
                        >
                          🏛️
                        </a>
                        <a
                          href={`/interview-studio?host=${p.slug}`}
                          onClick={(e) => e.stopPropagation()}
                          title="Interview Studio"
                          className="hover:scale-125 transition-transform"
                        >
                          🎬
                        </a>
                        <a
                          href={`/vtuber-studio?personaId=${p.slug}`}
                          onClick={(e) => e.stopPropagation()}
                          title="VTuber Studio"
                          className="hover:scale-125 transition-transform"
                        >
                          ⚡
                        </a>
                        <a
                          href={`/tools/thumbnail-builder?personaId=${p.slug}`}
                          onClick={(e) => e.stopPropagation()}
                          title="Thumbnail Builder"
                          className="hover:scale-125 transition-transform"
                        >
                          🖼️
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Infinite scroll trigger */}
      {personasLoaded && filteredPersonas.length > 0 && (
        <InfiniteScrollSentinel
          onIntersect={() => setSize(size + 1)}
          disabled={isReachingEnd || isLoadingMore}
        />
      )}

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/60 z-[9999] flex items-center justify-center p-4">
          <div className={`w-full bg-surface border border-border rounded-3xl shadow-2xl p-6 md:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-200 transition-all ${modalTab === "visual" ? "max-w-4xl" : "max-w-lg"}`}>
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <span>➕</span> Create Custom Persona
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted hover:text-foreground text-sm cursor-pointer p-0.5"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex gap-4 border-b border-border/60 pb-1.5">
              <button
                type="button"
                onClick={() => setModalTab("info")}
                className={`pb-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  modalTab === "info"
                    ? "border-emerald-500 text-emerald-400 font-extrabold"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                <span>📝</span> Basic Info
              </button>
              <button
                type="button"
                onClick={() => setModalTab("visual")}
                className={`pb-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  modalTab === "visual"
                    ? "border-emerald-500 text-emerald-400 font-extrabold"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                <Paintbrush className="w-3.5 h-3.5" /> Visual Style Builder
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {modalTab === "info" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Auto-generate section */}
                  <div className="p-3.5 bg-accent/5 border border-accent/20 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-accent uppercase flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5" /> Auto-Generate Persona with AI (Text or Photo 📷)
                      </label>
                    </div>

                    <div className="flex items-center gap-3">
                      {photoPreviewUrl ? (
                        <div className="relative w-14 h-16 rounded-lg border border-accent/40 overflow-hidden shrink-0 group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photoPreviewUrl} alt="Upload preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => { setPhotoPreviewUrl(null); setPhotoBase64(null); }}
                            className="absolute top-0.5 right-0.5 bg-black/80 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] hover:bg-red-600 transition-colors"
                            title="Remove photo"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-14 h-16 rounded-lg border border-dashed border-accent/40 hover:border-accent bg-accent/10 text-accent hover:text-accent-hover cursor-pointer transition-all shrink-0">
                          <Upload className="w-4 h-4 mb-0.5" />
                          <span className="text-[8px] font-bold uppercase">Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handlePhotoUpload}
                          />
                        </label>
                      )}

                      <div className="flex-grow flex gap-2">
                        <input
                          type="text"
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          placeholder={photoBase64 ? "Optional details (e.g. Rioplatense accent, Financial Analyst)..." : "e.g. A British tech journalist in his 30s..."}
                          className="flex-grow px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground placeholder:text-muted outline-none focus:border-accent"
                        />
                        <button
                          type="button"
                          onClick={handleAutoGenerate}
                          disabled={isAutoGenerating || (!aiPrompt && !photoBase64)}
                          className="px-3.5 py-2 bg-accent/20 hover:bg-accent/30 text-accent font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all disabled:opacity-50 flex items-center justify-center min-w-[95px] cursor-pointer"
                        >
                          {isAutoGenerating ? (
                            <div className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                          ) : photoBase64 ? (
                            "🪄 Clone & Transform"
                          ) : (
                            "Generate"
                          )}
                        </button>
                      </div>
                    </div>

                    {photoBase64 && (
                      <div className="pt-2 border-t border-accent/20 space-y-2 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-accent uppercase tracking-wider">
                            🧬 Persona Transformation, Body Sculpting & Voice Cloning Suite
                          </span>
                          <label className="flex items-center gap-1.5 text-[10px] text-foreground cursor-pointer font-medium">
                            <input
                              type="checkbox"
                              checked={genderSwap}
                              onChange={(e) => setGenderSwap(e.target.checked)}
                              className="rounded border-border text-accent focus:ring-accent"
                            />
                            <span>Gender Swap Counterpart</span>
                          </label>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-muted uppercase">Rejuvenation</label>
                            <select
                              value={rejuvenatePreset}
                              onChange={(e) => setRejuvenatePreset(e.target.value as RejuvenatePreset)}
                              className="w-full px-2 py-1 rounded-lg bg-background border border-border text-[10px] text-foreground outline-none"
                            >
                              <option value="none">Original Age</option>
                              <option value="young_rookie">👶 Rookie (21-25yo)</option>
                              <option value="prime_anchor">📺 Prime (30-35yo)</option>
                              <option value="mature_senior">🎙️ Senior (55-65yo)</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-muted uppercase">Glamour Glow</label>
                            <select
                              value={glamourLevel}
                              onChange={(e) => setGlamourLevel(e.target.value as GlamourLevel)}
                              className="w-full px-2 py-1 rounded-lg bg-background border border-border text-[10px] text-foreground outline-none"
                            >
                              <option value="natural">Natural Photo</option>
                              <option value="broadcast_studio_hd">✨ Studio HD 3-Point</option>
                              <option value="red_carpet_celebrity">💎 Red Carpet Gala</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-muted uppercase">Body & Bust</label>
                            <select
                              value={bodyMod}
                              onChange={(e) => setBodyMod(e.target.value as BodyMod)}
                              className="w-full px-2 py-1 rounded-lg bg-background border border-border text-[10px] text-foreground outline-none"
                            >
                              <option value="original">Original Physique</option>
                              <option value="athletic_toned">🏋️ Athletic Toned</option>
                              <option value="voluptuous_hourglass">⏳ Curvy Hourglass (34D/36DD)</option>
                              <option value="slender_runway">👗 Slender Runway</option>
                              <option value="muscular_bodybuilder">💪 Muscular</option>
                              <option value="curvy_plus">✨ Curvy Plus</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-muted uppercase">Wardrobe Style</label>
                            <select
                              value={outfitPreset}
                              onChange={(e) => setOutfitPreset(e.target.value as OutfitPreset)}
                              className="w-full px-2 py-1 rounded-lg bg-background border border-border text-[10px] text-foreground outline-none"
                            >
                              <option value="keep_photo">Keep Photo Attire</option>
                              <option value="executive_anchor_suit">👔 Royal Executive Suit</option>
                              <option value="cocktail_gala">👗 Emerald Gala Gown</option>
                              <option value="cyberpunk_techwear">⚡ Neon Techwear</option>
                              <option value="outdoor_storm_jacket">🧥 Weatherproof Storm</option>
                            </select>
                          </div>
                        </div>

                        {/* Voice Sample Audio Upload */}
                        <div className="flex items-center gap-2 pt-1">
                          <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-accent/40 bg-accent/10 text-accent hover:text-accent-hover text-[10px] font-bold uppercase cursor-pointer transition-colors">
                            <span>🎙️</span>
                            <span>{voiceFileName ? `Voice: ${voiceFileName}` : "Upload Voice Sample (.wav / .mp3)"}</span>
                            <input
                              type="file"
                              accept="audio/*"
                              className="hidden"
                              onChange={handleVoiceUpload}
                            />
                          </label>
                          {voiceFileName && (
                            <button
                              type="button"
                              onClick={() => { setVoiceFileName(null); setVoiceBase64(null); }}
                              className="text-[10px] text-muted hover:text-red-400"
                            >
                              ✕ Remove
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-subtle uppercase">Identifier (Slug) *</label>
                      <input
                        type="text"
                        required
                        value={newSlug}
                        onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""))}
                        placeholder="e.g. taylor_tech"
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted focus:border-accent outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-subtle uppercase">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="e.g. Taylor Miller"
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted focus:border-accent outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-subtle uppercase">Role / Position *</label>
                      <input
                        type="text"
                        required
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        placeholder="e.g. Legal Correspondent"
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted focus:border-accent outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-subtle uppercase">Language</label>
                      <select
                        value={newLang}
                        onChange={(e) => setNewLang(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground outline-none cursor-pointer"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="it">Italian</option>
                        <option value="de">German</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-subtle uppercase">Gender</label>
                      <select
                        value={newGender}
                        onChange={(e) => setNewGender(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground outline-none cursor-pointer"
                      >
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-subtle uppercase">Short Description</label>
                    <input
                      type="text"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="e.g. Analyst presenter focused on trends and artificial intelligence."
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted focus:border-accent outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-subtle uppercase">LLM System Instructions Prompt</label>
                    <textarea
                      value={newPrompt}
                      onChange={(e) => setNewPrompt(e.target.value)}
                      placeholder="e.g. Act as Taylor, a professional tech analyst. Use short direct sentences..."
                      rows={3}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted focus:border-accent outline-none resize-none"
                    />
                  </div>
                </div>
              )}

              {modalTab === "visual" && (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 animate-in fade-in duration-200">
                  <PresetSelector
                    personaDescription={newDesc || `${newName}, a ${newGender} ${newRole}`}
                    onSelect={handlePresetSelect}
                    selectedPreset="news-anchor-desk"
                  />
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-border mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-border hover:bg-white/10 text-xs font-semibold text-subtle cursor-pointer active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {loading && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>Save Persona</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect, use } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Key,
  Tv, Radio, Camera, Smartphone, Link as LinkIcon, Settings,
  Clock, Users, Layers
} from "lucide-react";
import { useToast } from "@/components/global/ToastContainer";
import ChannelDetailsView from "@/components/brands/ChannelDetailsView";
import BrandAnalyticsDashboard from "@/components/brands/BrandAnalyticsDashboard";
import type {
  BrandDetailItem,
  BrandSocialChannel,
  SocialChannelPublish,
  BrandPersona,
  BrandRssGroup,
  BrandRssFeed,
} from "@/lib/types/brand";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type BrandDetails = BrandDetailItem;

export default function BrandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  // SWR queries
  const { data: brand, mutate } = useSWR<BrandDetails>(id ? `/api/brands/${id}` : null, fetcher);
  const { data: globalRssGroupsRaw } = useSWR<{ groups?: BrandRssGroup[]; data?: BrandRssGroup[] } | BrandRssGroup[]>("/api/feeds/groups", fetcher);
  const globalRssGroups: BrandRssGroup[] = Array.isArray(globalRssGroupsRaw) ? globalRssGroupsRaw : (globalRssGroupsRaw?.groups ?? globalRssGroupsRaw?.data ?? []);
  const { data: globalPersonasRaw } = useSWR<{ data?: BrandPersona[]; personas?: BrandPersona[] } | BrandPersona[]>("/api/personas?limit=500&lite=true", fetcher);
  const globalPersonas: BrandPersona[] = Array.isArray(globalPersonasRaw) ? globalPersonasRaw : (globalPersonasRaw?.data ?? globalPersonasRaw?.personas ?? []);
  const { data: globalRssFeedsRaw } = useSWR<{ data?: BrandRssFeed[]; feeds?: BrandRssFeed[] } | BrandRssFeed[]>("/api/feeds?limit=500&lite=true", fetcher);
  const globalRssFeeds: BrandRssFeed[] = Array.isArray(globalRssFeedsRaw) ? globalRssFeedsRaw : (globalRssFeedsRaw?.data ?? globalRssFeedsRaw?.feeds ?? []);

  // Tab State
  const [activeTab, setActiveTab] = useState<"overview" | "credentials" | "uploads" | "settings">("overview");
  const [activePlatformTab, setActivePlatformTab] = useState<string>("overview");

  // Form Settings states
  const [titleTemplate, setTitleTemplate] = useState("{{title}}");
  const [descriptionTemplate, setDescriptionTemplate] = useState("");
  const [watermarkStorageKey, setWatermarkStorageKey] = useState("");
  const [hashtagBank, setHashtagBank] = useState("");
  const [autoPublish, setAutoPublish] = useState(false);
  
  const [isUploadingWatermark, setIsUploadingWatermark] = useState(false);
  const [isGeneratingHashtags, setIsGeneratingHashtags] = useState(false);

  // Brand Identity States
  const [toneOfVoice, setToneOfVoice] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [captionStyle, setCaptionStyle] = useState("");
  const [preferredMusicMood, setPreferredMusicMood] = useState("");
  const [introVideoStorageKey, setIntroVideoStorageKey] = useState("");
  const [outroVideoStorageKey, setOutroVideoStorageKey] = useState("");
  const [logoStorageKeys, setLogoStorageKeys] = useState("");
  const [isUploadingIntro, setIsUploadingIntro] = useState(false);
  const [isUploadingOutro, setIsUploadingOutro] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isGeneratingAesthetics, setIsGeneratingAesthetics] = useState(false);

  // Link selectors
  const [selectedRssGroupId, setSelectedRssGroupId] = useState("");
  const [selectedPersonaId, setSelectedPersonaId] = useState("");

  // Single Feed state
  const [selectedFeedId, setSelectedFeedId] = useState("");
  const [isAddingFeed, setIsAddingFeed] = useState(false);

  useEffect(() => {
    if (brand) {
      setTitleTemplate(brand.titleTemplate || "");
      setDescriptionTemplate(brand.descriptionTemplate || "");
      setWatermarkStorageKey(brand.watermarkStorageKey || "");
      setHashtagBank(brand.hashtagBank || "");
      setAutoPublish(brand.autoPublish || false);
      setToneOfVoice(brand.toneOfVoice || "");
      setPrimaryColor(brand.primaryColor || "");
      setSecondaryColor(brand.secondaryColor || "");
      setCaptionStyle(brand.captionStyle || "");
      setPreferredMusicMood(brand.preferredMusicMood || "");
      setIntroVideoStorageKey(brand.introVideoStorageKey || "");
      setOutroVideoStorageKey(brand.outroVideoStorageKey || "");
      setLogoStorageKeys(brand.logoStorageKeys || "");
    }
  }, [brand]);

  if (!brand) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-muted font-medium">Loading brand details...</span>
      </div>
    );
  }

  const handleLinkRssGroup = async () => {
    if (!selectedRssGroupId) return;

    if (brand.rssGroups.some(g => g.id === selectedRssGroupId)) {
      toast("Alert", "This RSS Group is already linked to this brand.", "info");
      return;
    }

    const linkedRssGroupIds = [...brand.rssGroups.map(g => g.id), selectedRssGroupId];

    try {
      const res = await fetch(`/api/brands/${brand.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedRssGroupIds })
      });

      if (res.ok) {
        toast("Success", "RSS Group linked successfully", "success");
        setSelectedRssGroupId("");
        mutate();
      } else {
        toast("Error", "Failed to link RSS Group", "error");
      }
    } catch {
      toast("Error", "Connection error", "error");
    }
  };

  const handleUnlinkRssGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`Are you sure you want to unlink '${groupName}'?`)) return;

    const linkedRssGroupIds = brand.rssGroups
      .filter(g => g.id !== groupId)
      .map(g => g.id);

    try {
      const res = await fetch(`/api/brands/${brand.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedRssGroupIds })
      });

      if (res.ok) {
        toast("Success", "RSS Group unlinked successfully", "success");
        mutate();
      } else {
        toast("Error", "Failed to unlink RSS Group", "error");
      }
    } catch {
      toast("Error", "Connection error", "error");
    }
  };

  const handleAddSingleFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeedId) return;

    setIsAddingFeed(true);
    try {
      const res = await fetch(`/api/brands/${brand.id}/rss-feeds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedId: selectedFeedId }),
      });

      const data = await res.json();
      if (res.ok) {
        toast("Success", "RSS Feed added and group created successfully", "success");
        setSelectedFeedId("");
        mutate();
      } else {
        toast("Error", data.error || "Failed to add RSS Feed", "error");
      }
    } catch {
      toast("Error", "Connection error", "error");
    } finally {
      setIsAddingFeed(false);
    }
  };

  const handleLinkPersona = async () => {
    if (!selectedPersonaId) return;

    if (brand.personas.some(p => p.id === selectedPersonaId)) {
      toast("Alert", "This Persona is already linked to this brand.", "info");
      return;
    }

    const linkedPersonaIds = [...brand.personas.map(p => p.id), selectedPersonaId];

    try {
      const res = await fetch(`/api/brands/${brand.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedPersonaIds })
      });

      if (res.ok) {
        toast("Success", "Persona linked successfully", "success");
        setSelectedPersonaId("");
        mutate();
      } else {
        toast("Error", "Failed to link Persona", "error");
      }
    } catch {
      toast("Error", "Connection error", "error");
    }
  };

  const handleUnlinkPersona = async (personaId: string, personaName: string) => {
    if (!confirm(`Are you sure you want to unlink '${personaName}'?`)) return;

    const linkedPersonaIds = brand.personas
      .filter(p => p.id !== personaId)
      .map(p => p.id);

    try {
      const res = await fetch(`/api/brands/${brand.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedPersonaIds })
      });

      if (res.ok) {
        toast("Success", "Persona unlinked successfully", "success");
        mutate();
      } else {
        toast("Error", "Failed to unlink Persona", "error");
      }
    } catch {
      toast("Error", "Connection error", "error");
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/brands/${brand.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          titleTemplate, descriptionTemplate, watermarkStorageKey, hashtagBank, autoPublish,
          toneOfVoice, primaryColor, secondaryColor, captionStyle, preferredMusicMood,
          introVideoStorageKey, outroVideoStorageKey, logoStorageKeys
        })
      });

      if (res.ok) {
        toast("Saved", "Brand settings and templates saved", "success");
        mutate();
      } else {
        toast("Error", "Failed to save settings", "error");
      }
    } catch {
      toast("Error", "Connection error", "error");
    }
  };

  const handleUploadWatermark = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingWatermark(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("segmentId", `brand-${brand?.id}-watermark`);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.key) {
        setWatermarkStorageKey(data.key);
        toast("Success", "Watermark uploaded successfully", "success");
      } else {
        toast("Error", "Failed to upload watermark", "error");
      }
    } catch {
      toast("Error", "Connection error", "error");
    } finally {
      setIsUploadingWatermark(false);
    }
  };

  const handleGenericUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string, setter: React.Dispatch<React.SetStateAction<string>>, setUploading: (val: boolean) => void, append: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("segmentId", `brand-${brand?.id}-${fieldName}`);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.key) {
        if (append) {
          setter((prev: string) => prev ? `${prev},${data.key}` : data.key);
        } else {
          setter(data.key);
        }
        toast("Success", `${fieldName} uploaded`, "success");
      } else {
        toast("Error", `Failed to upload ${fieldName}`, "error");
      }
    } catch {
      toast("Error", "Connection error", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateAesthetics = async () => {
    setIsGeneratingAesthetics(true);
    try {
      const res = await fetch(`/api/brands/${brand?.id}/aesthetics`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data) {
        if (data.toneOfVoice) setToneOfVoice(data.toneOfVoice);
        if (data.primaryColor) setPrimaryColor(data.primaryColor);
        if (data.secondaryColor) setSecondaryColor(data.secondaryColor);
        if (data.captionStyle) setCaptionStyle(data.captionStyle);
        if (data.preferredMusicMood) setPreferredMusicMood(data.preferredMusicMood);
        toast("Success", "Brand aesthetics generated by AI", "success");
      } else {
        toast("Error", data.error || "Failed to generate aesthetics", "error");
      }
    } catch {
      toast("Error", "Connection error", "error");
    } finally {
      setIsGeneratingAesthetics(false);
    }
  };

  const handleGenerateHashtags = async () => {
    setIsGeneratingHashtags(true);
    try {
      const res = await fetch(`/api/brands/${brand?.id}/hashtags`, { method: "POST" });
      const data = await res.json();
      if (data.hashtags) {
        setHashtagBank(data.hashtags);
        toast("Success", "Hashtags generated", "success");
      } else {
        toast("Error", "Failed to generate hashtags", "error");
      }
    } catch {
      toast("Error", "Connection error", "error");
    } finally {
      setIsGeneratingHashtags(false);
    }
  };

  // Combine publishes
  const allPublishes: SocialChannelPublish[] = (brand.channels.flatMap(c => c.publishes || []).filter(Boolean) as SocialChannelPublish[]).sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );

  const getPlatformIcon = (plat: string) => {
    switch (plat) {
      case "youtube": return <Tv className="w-5 h-5 text-red-500" />;
      case "instagram": return <Camera className="w-5 h-5 text-pink-500" />;
      case "tiktok": return <Smartphone className="w-5 h-5 text-cyan-400" />;
      default: return <Clock className="w-5 h-5 text-muted" />;
    }
  };

  const totalFollowers = brand.channels.reduce((acc, c) => acc + (c.subscriberCount || 0) + (c.followerCount || 0), 0);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">

      {/* Top Breadcrumb row */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <button
          onClick={() => router.push("/brands")}
          className="flex items-center gap-1.5 text-xs font-bold text-subtle hover:text-foreground tracking-wide uppercase transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Brands
        </button>
      </div>

      {/* Hero display block */}
      <div className="p-6 backdrop-blur-md bg-surface/30 border border-border/80 rounded-3xl flex flex-col md:flex-row gap-6 items-center shadow shadow-emerald-500/[0.01]">
        <div className="w-16 h-16 rounded-2xl bg-background/50 border border-border/60 flex items-center justify-center shadow-inner flex-shrink-0 relative overflow-hidden">
          {brand.profileImageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={brand.profileImageUrl} alt={brand.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl">📺</span>
          )}
        </div>

        <div className="flex-grow space-y-1 text-center md:text-left">
          <h2 className="text-xl font-black text-foreground tracking-tight leading-none">
            {brand.name}
          </h2>
          <p className="text-xs text-muted font-semibold">
            Global Handle: <span className="text-accent">{brand.handle}</span>
          </p>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-center px-4 border-r border-border">
            <span className="block text-[10px] text-muted font-bold uppercase tracking-wider">Total Audience</span>
            <span className="block text-lg font-black text-foreground">{totalFollowers.toLocaleString()}</span>
          </div>
          <div className="text-center px-4">
            <span className="block text-[10px] text-muted font-bold uppercase tracking-wider">Active Platforms</span>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              {brand.channels.filter(c => c.isConnected).map(c => (
                <span key={c.id} title={c.platform}>{getPlatformIcon(c.platform)}</span>
              ))}
              {brand.channels.filter(c => c.isConnected).length === 0 && <span className="text-xs text-muted">-</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation buttons */}
      <div className="flex border-b border-border/60 overflow-x-auto gap-4 bg-white/[0.01]">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeTab === "overview" ? "border-accent text-accent-hover bg-accent-subtle/10" : "border-transparent text-subtle hover:text-foreground"
            }`}
        >
          <Tv className="w-4 h-4" /> Overview
        </button>
        <button
          onClick={() => setActiveTab("credentials")}
          className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeTab === "credentials" ? "border-accent text-accent-hover bg-accent-subtle/10" : "border-transparent text-subtle hover:text-foreground"
            }`}
        >
          <Key className="w-4 h-4" /> Platforms
        </button>
        <button
          onClick={() => setActiveTab("uploads")}
          className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeTab === "uploads" ? "border-accent text-accent-hover bg-accent-subtle/10" : "border-transparent text-subtle hover:text-foreground"
            }`}
        >
          <Radio className="w-4 h-4" /> Uploads
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeTab === "settings" ? "border-accent text-accent-hover bg-accent-subtle/10" : "border-transparent text-subtle hover:text-foreground"
            }`}
        >
          <Settings className="w-4 h-4" /> Brand Settings
        </button>
      </div>

      {/* Tabs View Content */}
      <div className="space-y-4">

        {/* 1. Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <BrandAnalyticsDashboard brand={brand} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Linked RSS Groups */}
            <div className="p-5 backdrop-blur-md bg-surface/20 border border-border/60 rounded-3xl space-y-4 shadow-inner">
              <h3 className="text-xs font-bold text-foreground border-b border-border pb-2.5 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-accent" /> Assigned RSS Groups
              </h3>
              <p className="text-[10px] text-muted">News from these groups will be used to generate scripts for this brand.</p>

              {/* Link Form */}
              <div className="flex gap-2">
                <select
                  value={selectedRssGroupId}
                  onChange={(e) => setSelectedRssGroupId(e.target.value)}
                  className="flex-grow px-3 py-1.5 rounded-xl bg-background border border-border text-xs text-foreground outline-none cursor-pointer"
                >
                  <option value="">Select an RSS Group...</option>
                  {globalRssGroups && globalRssGroups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleLinkRssGroup}
                  disabled={!selectedRssGroupId}
                  className="px-3.5 py-1.5 rounded-xl bg-accent-muted text-accent-hover border border-accent/20 hover:bg-accent-subtle text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  Link
                </button>
              </div>

              {/* Add Single Feed Form */}
              <div className="pt-3 mt-3 border-t border-border/40">
                <p className="text-[10px] text-muted mb-2">Or add a single RSS feed (auto-creates a group for this brand):</p>
                <form onSubmit={handleAddSingleFeed} className="flex gap-2">
                  <select
                    value={selectedFeedId}
                    onChange={(e) => setSelectedFeedId(e.target.value)}
                    className="flex-grow px-3 py-1.5 rounded-xl bg-background border border-border text-xs text-foreground outline-none cursor-pointer focus:border-accent"
                    required
                  >
                    <option value="">Select an existing RSS Feed...</option>
                    {globalRssFeeds && globalRssFeeds.map((f: BrandRssFeed) => (
                      <option key={f.id} value={f.id}>{f.name} ({f.url})</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={isAddingFeed || !selectedFeedId}
                    className="px-3.5 py-1.5 rounded-xl bg-accent-muted text-accent-hover border border-accent/20 hover:bg-accent-subtle text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  >
                    {isAddingFeed ? "Adding..." : "Add Feed"}
                  </button>
                </form>
              </div>

              {/* Linked items list */}
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {brand.rssGroups.length === 0 ? (
                  <div className="text-center py-6 text-[10px] text-muted italic">
                    No linked RSS groups.
                  </div>
                ) : (
                  brand.rssGroups.map((g) => (
                    <div key={g.id} className="p-2.5 rounded-xl bg-background border border-border flex flex-col gap-2 text-xs font-semibold text-foreground">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate font-bold">📡 {g.name}</span>
                        <button
                          onClick={() => handleUnlinkRssGroup(g.id, g.name)}
                          className="text-subtle hover:text-error transition-colors p-1 cursor-pointer"
                          title="Unlink"
                        >
                          ✕
                        </button>
                      </div>
                      {g.feeds && g.feeds.length > 0 && (
                        <div className="pl-4 border-l-2 border-border/40 space-y-1 mt-1">
                          {g.feeds.map((f: BrandRssFeed) => (
                            <div key={f.id} className="text-[10px] text-muted truncate flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-accent"></span> {f.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Linked Personas */}
            <div className="p-5 backdrop-blur-md bg-surface/20 border border-border/60 rounded-3xl space-y-4 shadow-inner">
              <h3 className="text-xs font-bold text-foreground border-b border-border pb-2.5 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-warning" /> Assigned Personas
              </h3>
              <p className="text-[10px] text-muted">These AI anchors will represent the brand and read the scripts.</p>

              {/* Link Form */}
              <div className="flex gap-2">
                <select
                  value={selectedPersonaId}
                  onChange={(e) => setSelectedPersonaId(e.target.value)}
                  className="flex-grow px-3 py-1.5 rounded-xl bg-background border border-border text-xs text-foreground outline-none cursor-pointer"
                >
                  <option value="">Select a Persona...</option>
                  {globalPersonas && globalPersonas.map((p: BrandPersona) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                  ))}
                </select>
                <button
                  onClick={handleLinkPersona}
                  disabled={!selectedPersonaId}
                  className="px-3.5 py-1.5 rounded-xl bg-warning/20 text-warning border border-warning/30 hover:bg-warning/30 text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  Link
                </button>
              </div>

              {/* Linked items list */}
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {brand.personas.length === 0 ? (
                  <div className="text-center py-6 text-[10px] text-muted italic">
                    No linked Personas.
                  </div>
                ) : (
                  brand.personas.map((p) => (
                    <div key={p.id} className="p-2.5 rounded-xl bg-background border border-border flex items-center justify-between gap-3 text-xs font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-surface border border-border overflow-hidden">
                          {p.avatarImageUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={p.avatarImageUrl} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-white/5" />
                          )}
                        </div>
                        <span className="truncate">{p.name}</span>
                        <span className="text-[9px] text-muted border border-border rounded px-1">{p.role}</span>
                      </div>
                      <button
                        onClick={() => handleUnlinkPersona(p.id, p.name)}
                        className="text-subtle hover:text-error transition-colors p-1 cursor-pointer"
                        title="Unlink"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
          </div>
        )}

        {/* 2. Credentials Tab */}
        {activeTab === "credentials" && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 border-b border-border/40 pb-4 overflow-x-auto scrollbar-hide">
              <button 
                onClick={() => setActivePlatformTab("overview")}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all ${activePlatformTab === "overview" ? "bg-accent/10 text-accent border border-accent/20" : "bg-surface text-muted hover:text-foreground border border-border/60"}`}
              >
                Platforms Overview
              </button>
              
              {brand.channels.filter((c: BrandSocialChannel) => c.isConnected).map((channel: BrandSocialChannel) => (
                <button 
                  key={channel.id}
                  onClick={() => setActivePlatformTab(channel.platform)}
                  className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1.5 ${activePlatformTab === channel.platform ? "bg-accent/10 text-accent border border-accent/20" : "bg-surface text-muted hover:text-foreground border border-border/60"}`}
                >
                  {channel.platform === "youtube" ? <Tv className="w-3.5 h-3.5" /> : 
                   channel.platform === "instagram" ? <Camera className="w-3.5 h-3.5" /> : 
                   <Smartphone className="w-3.5 h-3.5" />}
                  {channel.platform}
                </button>
              ))}
            </div>

            {activePlatformTab === "overview" ? (
              <PlatformSetupWizard brand={brand} onUpdate={() => mutate()} />
            ) : (
              (() => {
                const activeChannel = brand.channels.find((c: BrandSocialChannel) => c.platform === activePlatformTab);
                return activeChannel ? (
                  <ChannelDetailsView 
                    channel={activeChannel} 
                    mutate={() => mutate()} 
                  />
                ) : null;
              })()
            )}
          </div>
        )}

        {/* 3. Uploads Tab */}
        {activeTab === "uploads" && (
          <div className="p-5 backdrop-blur-md bg-surface/20 border border-border/60 rounded-3xl space-y-4 shadow-inner">
            <h3 className="text-xs font-bold text-foreground border-b border-border pb-2.5 flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-accent" /> Completed Uploads Log
            </h3>
            <p className="text-[10px] text-muted">List of vault videos that have been distributed to this brand's profiles.</p>

            <div className="overflow-x-auto rounded-2xl border border-border/80 bg-background/50 shadow-inner">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/85 bg-white/[0.01] text-[10px] font-bold text-muted uppercase tracking-wider">
                    <th className="py-3 px-4">Video / News</th>
                    <th className="py-3 px-4">Platform</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs font-semibold text-subtle">
                  {allPublishes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted italic">
                        No videos published yet.
                      </td>
                    </tr>
                  ) : (
                    allPublishes.map((pub: SocialChannelPublish) => {
                      const formattedDate = pub.publishedAt
                        ? new Date(pub.publishedAt).toLocaleDateString()
                        : pub.scheduledFor
                          ? `Sched: ${new Date(pub.scheduledFor).toLocaleDateString()}`
                          : pub.createdAt ? new Date(pub.createdAt).toLocaleDateString() : "-";

                      // Find the platform for this publish
                      const plat = brand.channels.find(c => c.publishes?.some((p: SocialChannelPublish) => p.id === pub.id))?.platform || "unknown";

                      return (
                        <tr key={pub.id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="py-2.5 px-4 font-bold text-foreground line-clamp-1 max-w-[280px]">
                            {pub.video?.story?.title || "Deleted Story"}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-[10px] text-muted">
                            <span className="flex items-center gap-1">
                              {getPlatformIcon(plat)} <span className="uppercase">{plat}</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-muted">
                            {formattedDate}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold tracking-widest uppercase border ${pub.status === "PUBLISHED"
                                ? "bg-success/15 border-success/35 text-success"
                                : pub.status === "SCHEDULED"
                                  ? "bg-warning/15 border-warning/35 text-warning animate-pulse"
                                  : "bg-error/15 border-error/35 text-error"
                              }`}>
                              {pub.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            {pub.video?.outputPath && (
                              <a
                                href={pub.video.outputPath}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-accent hover:underline"
                              >
                                View Clip <LinkIcon className="w-3 h-3" />
                              </a>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. Settings Tab */}
        {activeTab === "settings" && (
          <form onSubmit={handleSaveSettings} className="p-6 backdrop-blur-md bg-surface/20 border border-border/60 rounded-3xl space-y-5 shadow-inner max-w-2xl">
            <h3 className="text-sm font-bold text-foreground border-b border-border pb-2.5 flex items-center gap-1.5">
              <Settings className="w-4.5 h-4.5 text-accent" /> Distribution Preferences & Templates
            </h3>

            {/* Toggle auto-publish */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-border/40">
              <div>
                <h4 className="text-xs font-bold text-foreground">Immediate Auto-publish</h4>
                <p className="text-[10px] text-muted">Automatically uploads videos to all connected networks upon render completion (bypasses the vault).</p>
              </div>
              <input
                type="checkbox"
                checked={autoPublish}
                onChange={(e) => setAutoPublish(e.target.checked)}
                className="w-4 h-4 accent-accent cursor-pointer"
              />
            </div>

            {/* Title Template */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-subtle uppercase">Global Title Template</label>
              <input
                type="text"
                value={titleTemplate}
                onChange={(e) => setTitleTemplate(e.target.value)}
                placeholder={`${brand.name}`}
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs focus:border-accent outline-none"
              />
              <p className="text-[9px] text-muted">Supports placeholders like <code>{"{{title}}"}</code> to insert the news headline.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-subtle uppercase">Global Description / Caption Body</label>
              <textarea
                value={descriptionTemplate}
                onChange={(e) => setDescriptionTemplate(e.target.value)}
                placeholder={`Check out the latest update from ${brand.name}!\\n\\n{{description}}`}
                rows={5}
                className="w-full p-3.5 rounded-xl bg-background border border-border text-xs focus:border-accent outline-none resize-none leading-relaxed"
              />
              <p className="text-[9px] text-muted">Generic template that will pre-fill video uploads on all platforms.</p>
            </div>

            {/* Hashtag Bank */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-subtle uppercase">Hashtag Bank</label>
                <button
                  type="button"
                  onClick={handleGenerateHashtags}
                  disabled={isGeneratingHashtags}
                  className="text-[9px] font-bold text-accent hover:underline flex items-center gap-1 disabled:opacity-50"
                >
                  {isGeneratingHashtags ? "Generating..." : "✨ Generate with AI"}
                </button>
              </div>
              <input
                type="text"
                value={hashtagBank}
                onChange={(e) => setHashtagBank(e.target.value)}
                placeholder="#news #update #trending"
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs focus:border-accent outline-none"
              />
              <p className="text-[9px] text-muted">These hashtags will automatically be appended to all social media posts.</p>
            </div>

            {/* Watermark Storage Key */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-subtle uppercase">Watermark Storage Key (S3)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={watermarkStorageKey}
                  onChange={(e) => setWatermarkStorageKey(e.target.value)}
                  placeholder="watermarks/brand-logo.png"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs focus:border-accent outline-none"
                />
                <label className="flex items-center justify-center px-4 rounded-xl bg-white/5 border border-border hover:bg-white/10 text-xs font-bold cursor-pointer transition-colors">
                  {isUploadingWatermark ? "..." : "Upload"}
                  <input type="file" accept="image/png" className="hidden" onChange={handleUploadWatermark} disabled={isUploadingWatermark} />
                </label>
              </div>
              <p className="text-[9px] text-muted">Path to a transparent PNG in storage. It will be overlaid on all rendered videos for this brand.</p>
            </div>

            {/* Identity & Aesthetic */}
            <div className="pt-4 mt-2 border-t border-border/50">
              <h3 className="text-sm font-bold text-foreground border-b border-border pb-2.5 flex items-center justify-between mb-4">
                <span className="flex items-center gap-1.5">Identity & Aesthetic</span>
                <button
                  type="button"
                  onClick={handleGenerateAesthetics}
                  disabled={isGeneratingAesthetics}
                  className="text-[9px] font-bold text-accent hover:underline flex items-center gap-1 disabled:opacity-50"
                >
                  {isGeneratingAesthetics ? "Generating..." : "✨ Auto-Generate with AI"}
                </button>
              </h3>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-subtle uppercase">Brand Tone of Voice</label>
                  <textarea
                    value={toneOfVoice}
                    onChange={(e) => setToneOfVoice(e.target.value)}
                    placeholder="e.g. Sarcastic, professional, Gen-Z, upbeat tech bro..."
                    rows={2}
                    className="w-full p-3.5 rounded-xl bg-background border border-border text-xs focus:border-accent outline-none resize-none leading-relaxed"
                  />
                  <p className="text-[9px] text-muted">Injects this persona instruction into the AI script generation.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-subtle uppercase">Primary Color (Hex)</label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={primaryColor || "#ffffff"} onChange={e => setPrimaryColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                      <input type="text" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} placeholder="#000000" className="flex-1 px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs focus:border-accent outline-none" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-subtle uppercase">Secondary Color (Hex)</label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={secondaryColor || "#ffffff"} onChange={e => setSecondaryColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                      <input type="text" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} placeholder="#000000" className="flex-1 px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs focus:border-accent outline-none" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-subtle uppercase">Caption Style</label>
                    <select
                      value={captionStyle}
                      onChange={(e) => setCaptionStyle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs focus:border-accent outline-none"
                    >
                      <option value="">Global Default</option>
                      <option value="beast">Mr. Beast (Dynamic)</option>
                      <option value="minimal">Minimalist (Clean)</option>
                      <option value="breaking">Breaking News</option>
                      <option value="karaoke">Karaoke (Bouncy)</option>
                      <option value="tiktok">TikTok (Classic Outline)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-subtle uppercase">Preferred Music Mood</label>
                    <input
                      type="text"
                      value={preferredMusicMood}
                      onChange={(e) => setPreferredMusicMood(e.target.value)}
                      placeholder="e.g. dramatic, lofi, tech"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs focus:border-accent outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-subtle uppercase">Custom Logo Variations</label>
                  <div className="flex gap-2 mb-2">
                    <label className="flex items-center justify-center px-4 py-2 rounded-xl bg-white/5 border border-border hover:bg-white/10 text-xs font-bold cursor-pointer">
                      {isUploadingLogo ? "..." : "Upload Logo"}
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleGenericUpload(e, 'logo', setLogoStorageKeys, setIsUploadingLogo, true)} disabled={isUploadingLogo} />
                    </label>
                  </div>
                  {logoStorageKeys ? (
                    <div className="flex flex-wrap gap-3">
                      {logoStorageKeys.split(",").filter(Boolean).map(key => (
                        <div key={key} className="relative group">
                          {/* Fallback to minio localhost for dev if env doesn't exist */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={`${process.env.NEXT_PUBLIC_S3_ENDPOINT || "http://localhost:9000"}/${process.env.NEXT_PUBLIC_S3_BUCKET_NAME || "news-studio"}/${key.trim()}`} 
                            alt="Logo Variation" 
                            className="w-16 h-16 object-contain rounded-lg border border-border bg-black/20 p-2" 
                          />
                          <button 
                            type="button" 
                            className="absolute -top-2 -right-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
                            onClick={() => setLogoStorageKeys(logoStorageKeys.split(",").filter(k => k.trim() !== key.trim()).join(","))}
                          >×</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[9px] text-muted">Upload PNG logos to be randomly selected during intro/outro.</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-subtle uppercase">Custom Intro Video</label>
                  <div className="flex gap-2">
                    <input type="text" value={introVideoStorageKey} onChange={e => setIntroVideoStorageKey(e.target.value)} placeholder="videos/intro.mp4" className="flex-1 px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs focus:border-accent outline-none" />
                    <label className="flex items-center justify-center px-4 rounded-xl bg-white/5 border border-border hover:bg-white/10 text-xs font-bold cursor-pointer">
                      {isUploadingIntro ? "..." : "Upload Intro"}
                      <input type="file" accept="video/mp4" className="hidden" onChange={e => handleGenericUpload(e, 'intro', setIntroVideoStorageKey, setIsUploadingIntro)} disabled={isUploadingIntro} />
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-subtle uppercase">Custom Outro Video</label>
                  <div className="flex gap-2">
                    <input type="text" value={outroVideoStorageKey} onChange={e => setOutroVideoStorageKey(e.target.value)} placeholder="videos/outro.mp4" className="flex-1 px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs focus:border-accent outline-none" />
                    <label className="flex items-center justify-center px-4 rounded-xl bg-white/5 border border-border hover:bg-white/10 text-xs font-bold cursor-pointer">
                      {isUploadingOutro ? "..." : "Upload Outro"}
                      <input type="file" accept="video/mp4" className="hidden" onChange={e => handleGenericUpload(e, 'outro', setOutroVideoStorageKey, setIsUploadingOutro)} disabled={isUploadingOutro} />
                    </label>
                  </div>
                </div>

              </div>
            </div>

            <div className="flex justify-end border-t border-border pt-4 mt-2">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <SaveIcon className="w-4 h-4" /> Save Preferences
              </button>
            </div>
          </form>
        )}

      </div>

    </div>
  );
}

function PlatformSetupWizard({ brand, onUpdate }: { brand: BrandDetailItem, onUpdate: () => void }) {
  const { toast } = useToast();
  const [activePlatformWizard, setActivePlatformWizard] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);

  const availablePlatforms = [
    { id: "youtube", name: "YouTube", icon: Tv, color: "text-red-500", desc: "Connect via Google Cloud Console" },
    { id: "tiktok", name: "TikTok", icon: Smartphone, color: "text-cyan-400", desc: "Connect via TikTok Developers" },
    { id: "instagram", name: "Instagram", icon: Camera, color: "text-pink-500", desc: "Connect via Meta App Dashboard" }
  ];

  const getPlatformSteps = (platform: string) => {
    if (platform === "youtube") {
      return [
        { title: "Create Project", description: <>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-accent hover:underline font-bold">Google Cloud Console</a> and create a new project. Then search for 'YouTube Data API v3' in the Library and click 'Enable'.</> },
        { title: "Auth Branding", description: "In the left menu, go to 'APIs & Services' > 'Auth' (or 'OAuth consent screen'). In the new Google Auth Platform UI, go to 'Branding' to set your App Name and Support Emails." },
        { title: "Add Test Users", description: "Click on the 'Audience' tab in the left menu. Under 'Test Users', click 'Add Users' and add the exact Google email address you will use to log into your YouTube channel." },
        { title: "Create Credentials", description: "Click on the 'Clients' tab in the left menu. Click 'Create OAuth client' and choose 'Web application'. Under 'Authorized redirect URIs', add exactly: http://localhost:3000/api/auth/youtube" },
        { title: "Enter Keys", description: "Once created, a modal will appear with your Client ID and Client Secret. Copy and paste them below." }
      ];
    }
    if (platform === "tiktok") {
      return [
        { title: "TikTok Developer Portal", description: <>Log in to the <a href="https://developers.tiktok.com/" target="_blank" rel="noreferrer" className="text-accent hover:underline font-bold">TikTok for Developers portal</a> and create a new Web app.</> },
        { title: "App Configuration", description: "Set your OAuth Redirect URIs and add your Privacy Policy and Terms of Service URLs." },
        { title: "Permissions", description: "Submit your app for review, requesting the 'video.publish' and 'user.info.basic' scopes." },
        { title: "Enter Keys", description: "Copy your Client Key (Client ID) and Client Secret from the App Settings and paste them below." }
      ];
    }
    if (platform === "instagram") {
      return [
        { title: "Meta App Dashboard", description: <>Go to <a href="https://developers.facebook.com/apps/" target="_blank" rel="noreferrer" className="text-accent hover:underline font-bold">Meta for Developers</a>, create a new 'Business' or 'Consumer' app, and link it to your Facebook Page.</> },
        { title: "Add Instagram Graph API", description: "Add the 'Instagram Graph API' product to your app. Connect your Instagram Professional account." },
        { title: "Configure OAuth", description: "Set up Facebook Login for Business and add your exact OAuth Redirect URIs." },
        { title: "Enter Keys", description: "Copy the App ID (Client ID) and App Secret from Settings > Basic and paste them below." }
      ];
    }
    return [];
  };

  const handleStartWizard = async (platformId: string) => {
    setIsCreatingChannel(true);
    try {
      // Create the channel in the DB if it doesn't exist
      const res = await fetch(`/api/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId: brand.id, platform: platformId })
      });
      if (res.ok) {
        onUpdate();
        setActivePlatformWizard(platformId);
        setWizardStep(1);
        setClientId("");
        setClientSecret("");
      } else {
        toast("Error", "Could not initialize channel setup", "error");
      }
    } catch {
      toast("Error", "Connection error", "error");
    } finally {
      setIsCreatingChannel(false);
    }
  };

  const handleSaveCredentials = async (channelId: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/channels/${channelId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, clientSecret })
      });

      if (res.ok) {
        toast("Saved", "Credentials encrypted and saved successfully", "success");
        onUpdate();
        // Go to next step (authentication)
        setWizardStep(getPlatformSteps(activePlatformWizard!).length + 1);
      } else {
        toast("Error", "Error saving credentials", "error");
      }
    } catch {
      toast("Error", "Connection error", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleOAuthReconnect = (channelId: string, platform: string) => {
    if (platform === "youtube") {
      window.location.href = `/api/brands/oauth/youtube?channelId=${channelId}&brandId=${brand.id}`;
    } else {
      toast("Info", "OAuth not implemented for this platform yet", "info");
      setActivePlatformWizard(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Platform Cards Grid */}
      {!activePlatformWizard && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availablePlatforms.map((platform) => {
            const existingChannel = brand.channels.find((c: BrandSocialChannel) => c.platform === platform.id);
            const isConnected = existingChannel?.isConnected;
            const hasCredentials = existingChannel?.hasCredentials;

            return (
              <div key={platform.id} className="p-5 backdrop-blur-md bg-surface/20 border border-border/60 rounded-3xl flex flex-col justify-between shadow-inner h-full min-h-[160px]">
                <div>
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase mb-1">
                    <platform.icon className={`w-5 h-5 ${platform.color}`} />
                    {platform.name}
                  </h4>
                  <p className="text-[10px] text-muted">{platform.desc}</p>
                </div>

                <div className="mt-4 pt-4 border-t border-border/40">
                  {isConnected ? (
                    <div className="flex flex-col gap-4">
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="bg-background/50 border border-border/40 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                          <span className="text-lg font-black text-foreground">{existingChannel.subscriberCount?.toLocaleString() || existingChannel.followerCount?.toLocaleString() || "0"}</span>
                          <span className="text-[9px] uppercase font-bold text-muted tracking-wider">Followers</span>
                        </div>
                        <div className="bg-background/50 border border-border/40 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                          <span className="text-lg font-black text-foreground">{existingChannel.publishes?.length || 0}</span>
                          <span className="text-[9px] uppercase font-bold text-muted tracking-wider">Uploads</span>
                        </div>
                        <div className="bg-background/50 border border-border/40 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                          <span className="text-lg font-black text-foreground">
                            {existingChannel.publishes?.reduce((acc: number, p: SocialChannelPublish) => acc + (p.viewCount || 0), 0).toLocaleString() || "0"}
                          </span>
                          <span className="text-[9px] uppercase font-bold text-muted tracking-wider">Visualizations</span>
                        </div>
                        <div className="bg-background/50 border border-border/40 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                          <span className="text-lg font-black text-warning">1/10</span>
                          <span className="text-[9px] uppercase font-bold text-muted tracking-wider">API Quota</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-3 border-t border-border/40">
                        <span className="text-[10px] font-bold text-success bg-success/15 border border-success/35 px-2 py-1 rounded flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> CONNECTED
                        </span>
                        <button
                          onClick={() => handleOAuthReconnect(existingChannel.id, existingChannel.platform)}
                          className="text-[10px] text-accent hover:underline font-bold"
                        >
                          Re-authenticate
                        </button>
                      </div>
                    </div>
                  ) : hasCredentials ? (
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-bold text-warning bg-warning/15 border border-warning/35 px-2 py-1 rounded self-start">NEEDS AUTHENTICATION</span>
                      <button
                        onClick={() => handleOAuthReconnect(existingChannel.id, existingChannel.platform)}
                        className="w-full py-1.5 bg-accent-muted text-accent-hover text-xs font-bold rounded-xl"
                      >
                        Authenticate Now
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleStartWizard(platform.id)}
                      disabled={isCreatingChannel}
                      className="w-full py-2 bg-white/5 hover:bg-white/10 border border-border rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                    >
                      Set Up {platform.name}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Setup Wizard */}
      {activePlatformWizard && (
        <div className="max-w-2xl mx-auto p-6 backdrop-blur-md bg-surface/30 border border-border/80 rounded-3xl shadow-2xl relative">
          <button
            onClick={() => setActivePlatformWizard(null)}
            className="absolute top-4 right-4 text-muted hover:text-foreground text-xs font-bold flex items-center gap-1"
          >
            ✕ Cancel Setup
          </button>

          <h3 className="text-lg font-bold text-foreground mb-6 uppercase flex items-center gap-2">
            Setting up {activePlatformWizard}
          </h3>

          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/60 before:to-transparent">
            {getPlatformSteps(activePlatformWizard).map((step, idx) => {
              const stepNumber = idx + 1;
              const isCurrent = wizardStep === stepNumber;
              const isPast = wizardStep > stepNumber;

              return (
                <div key={idx} className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group ${isCurrent ? 'opacity-100' : 'opacity-40'}`}>
                  {/* Icon */}
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-md ${isPast ? 'bg-success text-black' : isCurrent ? 'bg-accent text-white' : 'bg-surface text-muted'}`}>
                    <span className="text-xs font-bold">{stepNumber}</span>
                  </div>

                  {/* Content */}
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-border/50 bg-surface/50 shadow-inner">
                    <h4 className="font-bold text-sm text-foreground mb-1">{step.title}</h4>
                    <p className="text-[10px] text-muted">{step.description}</p>

                    {/* Inputs rendering on the 'Enter Keys' step */}
                    {isCurrent && idx === getPlatformSteps(activePlatformWizard).length - 1 && (
                      <div className="mt-4 space-y-3 pt-3 border-t border-border/40">
                        <input
                          type="text"
                          value={clientId}
                          onChange={(e) => setClientId(e.target.value)}
                          placeholder="Client ID"
                          className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs focus:border-accent outline-none"
                        />
                        <input
                          type="password"
                          value={clientSecret}
                          onChange={(e) => setClientSecret(e.target.value)}
                          placeholder="Client Secret"
                          className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs focus:border-accent outline-none"
                        />
                        <button
                          onClick={() => {
                            const existingChannel = brand.channels.find((c: BrandSocialChannel) => c.platform === activePlatformWizard);
                            handleSaveCredentials(existingChannel!.id);
                          }}
                          disabled={saving || (!clientId || !clientSecret)}
                          className="w-full py-2 bg-accent-muted text-accent-hover font-bold text-xs rounded-xl transition-all disabled:opacity-50"
                        >
                          {saving ? "Saving..." : "Save API Keys"}
                        </button>
                      </div>
                    )}

                    {/* Next button for informative steps */}
                    {isCurrent && idx < getPlatformSteps(activePlatformWizard).length - 1 && (
                      <button
                        onClick={() => setWizardStep(s => s + 1)}
                        className="mt-3 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-xs font-bold rounded-lg transition-colors border border-border/60"
                      >
                        Next Step
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Final Authentication Step */}
            {wizardStep > getPlatformSteps(activePlatformWizard).length && (
              <div className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group opacity-100`}>
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-md bg-emerald-500 text-white`}>
                  <span className="text-xs font-bold">✓</span>
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 shadow-inner">
                  <h4 className="font-bold text-sm text-foreground mb-1">Final Authentication</h4>
                  <p className="text-[10px] text-muted mb-4">Click below to authorize NewsStudio to post on your behalf.</p>
                  <button
                    onClick={() => {
                      const existingChannel = brand.channels.find((c: BrandSocialChannel) => c.platform === activePlatformWizard);
                      handleOAuthReconnect(existingChannel!.id, activePlatformWizard);
                    }}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95"
                  >
                    Authenticate Now
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}

function SaveIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

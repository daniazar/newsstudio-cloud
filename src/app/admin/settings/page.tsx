"use client";

import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { useUser } from "@clerk/nextjs";
import { useToast } from "@/components/global/ToastContainer";
import { 
  Settings2, Bot, Server, Image as ImageIcon, 
  Zap, Save, RefreshCw, ShieldAlert, ArrowRight, Eye, EyeOff, Music, Clock,
  Layers, Sparkles, Cpu
} from "lucide-react";
import { ByokManager } from "@/components/admin/ByokManager";
import { TokenSpendDashboard } from "@/components/admin/TokenSpendDashboard";
import { useCachedSuperAdmin } from "@/lib/hooks/useSidebarIdentity";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface LlmTierSettings {
  realtime: string;
  structured: string;
  reasoning: string;
  vision: string;
}

interface AdminSettings {
  llm: {
    provider: string;
    model: string;
    apiKey: string;
    openaiCompatibleApiKey?: string;
    tiers?: {
      gemini: LlmTierSettings;
      ollama: LlmTierSettings;
      "openai-compatible"?: LlmTierSettings;
    };
  };
  servers: { ttsUrl: string; comfyuiUrl: string; ollamaUrl: string; openaiCompatibleUrl?: string };
  stock: { providerPriority: string[]; pexelsApiKey: string; pixabayApiKey: string };
  music: { providerPriority: string[]; };
  rendering: { defaultAspectRatio: string; defaultCaptionStyle: string; defaultBgMusicVolume: number };
  automation: { globalAutoScript: boolean; globalAutoPublish: boolean; globalRequireApproval: boolean; schedulerIntervalMinutes: number };
}

export default function AdminSettingsPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { toast } = useToast();
  const cachedSuperAdmin = useCachedSuperAdmin();
  const role = user?.publicMetadata?.role;
  const hasMetadataAdminRole = role === "admin" || role === "superadmin";

  const {
    data: whoamiData,
    error: whoamiError,
    isLoading: isWhoamiLoading,
  } = useSWR<{ isSuperAdmin?: boolean }>(
    isLoaded && isSignedIn && !hasMetadataAdminRole ? "/api/admin/whoami" : null,
    fetcher
  );

  const isAdmin = Boolean(
    isSignedIn && (hasMetadataAdminRole || cachedSuperAdmin || whoamiData?.isSuperAdmin)
  );

  const { data: initialSettings, mutate } = useSWR<AdminSettings>(
    isAdmin ? "/api/admin/settings" : null,
    fetcher
  );

  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialSettings && typeof initialSettings === "object" && !("error" in initialSettings)) {
      setSettings(JSON.parse(JSON.stringify(initialSettings))); // Deep copy
    }
  }, [initialSettings]);

  const isCheckingAdminAccess = Boolean(
    isLoaded &&
      isSignedIn &&
      !isAdmin &&
      (isWhoamiLoading || (whoamiData === undefined && !whoamiError))
  );

  if (!isLoaded || isCheckingAdminAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-muted font-medium">
          {isCheckingAdminAccess ? "Verifying admin permissions..." : "Loading..."}
        </span>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6 md:p-8 max-w-xl mx-auto min-h-[60vh] flex flex-col justify-center items-center text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-error/10 border border-error/30 flex items-center justify-center shadow-lg animate-bounce">
          <ShieldAlert className="w-10 h-10 text-error" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-foreground">Access Denied</h1>
          <p className="text-xs text-muted font-semibold">Settings requires administrator privileges.</p>
        </div>
        <a href="/" className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white/5 border border-border hover:bg-white/10 rounded-xl font-bold text-xs">
          Return to Dashboard <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-3">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-muted font-medium">Loading settings...</span>
      </div>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast("Saved", "System settings have been updated.", "success");
        mutate();
      } else {
        toast("Error", "Could not save settings.", "error");
      }
    } catch {
      toast("Error", "Connection error.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleKeyVis = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-6 sticky top-0 bg-background/95 backdrop-blur z-10 pt-2">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-accent" /> System Configuration
          </h1>
          <p className="text-xs text-muted font-medium mt-1">
            Global overrides for LLMs, AI services, rendering defaults, and pipeline automation.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 bg-accent text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-accent-hover transition-all active:scale-95 shadow-md shadow-accent/20 disabled:opacity-50"
        >
          {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LLM Config */}
        <div className="backdrop-blur-md bg-surface/30 border border-border/80 rounded-3xl p-6 space-y-5 shadow">
          <h3 className="text-sm font-black text-foreground flex items-center gap-2 border-b border-border/60 pb-3">
            <Bot className="w-4 h-4 text-emerald-400" /> Language Model (LLM)
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-subtle uppercase">Provider</label>
              <select
                value={settings.llm.provider}
                onChange={e => setSettings({ ...settings, llm: { ...settings.llm, provider: e.target.value } })}
                className="w-full mt-1.5 px-3 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:border-accent"
              >
                <option value="gemini">Google Gemini (Recommended)</option>
                <option value="ollama">Ollama (Local)</option>
                <option value="openai-compatible">OpenAI-Compatible (vLLM / OpenRouter / Groq)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-subtle uppercase">Model Version</label>
              <input
                type="text"
                value={settings.llm.model}
                onChange={e => setSettings({ ...settings, llm: { ...settings.llm, model: e.target.value } })}
                className="w-full mt-1.5 px-3 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:border-accent"
                placeholder={settings.llm.provider === "openai-compatible" ? "e.g. gpt-4o-mini" : "e.g. gemini-2.5-flash"}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-subtle uppercase">
                {settings.llm.provider === "openai-compatible" ? "OpenAI-Compatible API Key" : "API Key"}
              </label>
              <div className="relative mt-1.5">
                <input
                  type={showKeys["llm"] ? "text" : "password"}
                  value={
                    settings.llm.provider === "openai-compatible"
                      ? (settings.llm.openaiCompatibleApiKey || "")
                      : settings.llm.apiKey
                  }
                  onChange={e => {
                    if (settings.llm.provider === "openai-compatible") {
                      setSettings({
                        ...settings,
                        llm: {
                          ...settings.llm,
                          openaiCompatibleApiKey: e.target.value,
                        },
                      });
                    } else {
                      setSettings({ ...settings, llm: { ...settings.llm, apiKey: e.target.value } });
                    }
                  }}
                  placeholder={settings.llm.provider === "openai-compatible" ? "Optional for local vLLM (sk-...)" : ""}
                  className="w-full px-3 py-2 pr-10 bg-background border border-border rounded-xl text-xs outline-none focus:border-accent font-mono"
                />
                <button type="button" onClick={() => toggleKeyVis("llm")} className="absolute right-3 top-2.5 text-muted hover:text-foreground">
                  {showKeys["llm"] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Task-Tier Model Routing */}
            <div className="pt-3 border-t border-border/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-subtle uppercase flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-cyan-400" /> Task-Tier Model Routing
                </span>
                <span className="text-[9px] text-muted font-mono uppercase">
                  {settings.llm.provider} Tiers
                </span>
              </div>
              <p className="text-[9px] text-muted">
                Task complexity routing dynamically resolves models for real-time streaming, structured JSON extraction, deep reasoning, and vision.
              </p>

              {/* Realtime Tier */}
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-border/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-bold text-foreground flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" /> Real-Time Tier
                  </label>
                  <span className="text-[8px] text-muted">Live broadcast, audio STT, TTS phonetics</span>
                </div>
                <input
                  type="text"
                  value={
                    settings.llm.provider === "gemini"
                      ? settings.llm.tiers?.gemini?.realtime ?? "gemini-2.5-flash"
                      : settings.llm.provider === "openai-compatible"
                      ? settings.llm.tiers?.["openai-compatible"]?.realtime ?? "gpt-4o-mini"
                      : settings.llm.tiers?.ollama?.realtime ?? "qwen2.5:3b"
                  }
                  onChange={(e) => {
                    const currentProvider = (settings.llm.provider as "gemini" | "ollama" | "openai-compatible") || "gemini";
                    const currentTiers = {
                      gemini: { realtime: "gemini-2.5-flash", structured: "gemini-2.5-flash", reasoning: "gemini-2.5-pro", vision: "gemini-2.5-flash" },
                      ollama: { realtime: "qwen2.5:3b", structured: "qwen3.5:9b", reasoning: "qwen3.5:32b", vision: "llava" },
                      "openai-compatible": { realtime: "gpt-4o-mini", structured: "gpt-4o-mini", reasoning: "gpt-4o", vision: "gpt-4o-mini" },
                      ...(settings.llm.tiers || {}),
                    };
                    setSettings({
                      ...settings,
                      llm: {
                        ...settings.llm,
                        tiers: {
                          ...currentTiers,
                          [currentProvider]: {
                            ...currentTiers[currentProvider],
                            realtime: e.target.value,
                          },
                        },
                      },
                    });
                  }}
                  className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-mono outline-none focus:border-accent"
                />
              </div>

              {/* Structured Tier */}
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-border/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-bold text-foreground flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-400" /> Structured Tier
                  </label>
                  <span className="text-[8px] text-muted">7 Studio parsers, Newsroom scripts, E-com</span>
                </div>
                <input
                  type="text"
                  value={
                    settings.llm.provider === "gemini"
                      ? settings.llm.tiers?.gemini?.structured ?? "gemini-2.5-flash"
                      : settings.llm.provider === "openai-compatible"
                      ? settings.llm.tiers?.["openai-compatible"]?.structured ?? "gpt-4o-mini"
                      : settings.llm.tiers?.ollama?.structured ?? "qwen3.5:9b"
                  }
                  onChange={(e) => {
                    const currentProvider = (settings.llm.provider as "gemini" | "ollama" | "openai-compatible") || "gemini";
                    const currentTiers = {
                      gemini: { realtime: "gemini-2.5-flash", structured: "gemini-2.5-flash", reasoning: "gemini-2.5-pro", vision: "gemini-2.5-flash" },
                      ollama: { realtime: "qwen2.5:3b", structured: "qwen3.5:9b", reasoning: "qwen3.5:32b", vision: "llava" },
                      "openai-compatible": { realtime: "gpt-4o-mini", structured: "gpt-4o-mini", reasoning: "gpt-4o", vision: "gpt-4o-mini" },
                      ...(settings.llm.tiers || {}),
                    };
                    setSettings({
                      ...settings,
                      llm: {
                        ...settings.llm,
                        tiers: {
                          ...currentTiers,
                          [currentProvider]: {
                            ...currentTiers[currentProvider],
                            structured: e.target.value,
                          },
                        },
                      },
                    });
                  }}
                  className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-mono outline-none focus:border-accent"
                />
              </div>

              {/* Reasoning Tier */}
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-border/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-bold text-foreground flex items-center gap-1">
                    <Cpu className="w-3 h-3 text-purple-400" /> Reasoning Tier
                  </label>
                  <span className="text-[8px] text-muted">Forensic analysis, debates, fact checking</span>
                </div>
                <input
                  type="text"
                  value={
                    settings.llm.provider === "gemini"
                      ? settings.llm.tiers?.gemini?.reasoning ?? "gemini-2.5-pro"
                      : settings.llm.provider === "openai-compatible"
                      ? settings.llm.tiers?.["openai-compatible"]?.reasoning ?? "gpt-4o"
                      : settings.llm.tiers?.ollama?.reasoning ?? "qwen3.5:32b"
                  }
                  onChange={(e) => {
                    const currentProvider = (settings.llm.provider as "gemini" | "ollama" | "openai-compatible") || "gemini";
                    const currentTiers = {
                      gemini: { realtime: "gemini-2.5-flash", structured: "gemini-2.5-flash", reasoning: "gemini-2.5-pro", vision: "gemini-2.5-flash" },
                      ollama: { realtime: "qwen2.5:3b", structured: "qwen3.5:9b", reasoning: "qwen3.5:32b", vision: "llava" },
                      "openai-compatible": { realtime: "gpt-4o-mini", structured: "gpt-4o-mini", reasoning: "gpt-4o", vision: "gpt-4o-mini" },
                      ...(settings.llm.tiers || {}),
                    };
                    setSettings({
                      ...settings,
                      llm: {
                        ...settings.llm,
                        tiers: {
                          ...currentTiers,
                          [currentProvider]: {
                            ...currentTiers[currentProvider],
                            reasoning: e.target.value,
                          },
                        },
                      },
                    });
                  }}
                  className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-mono outline-none focus:border-accent"
                />
              </div>

              {/* Vision Tier */}
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-border/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-bold text-foreground flex items-center gap-1">
                    <ImageIcon className="w-3 h-3 text-pink-400" /> Vision Tier
                  </label>
                  <span className="text-[8px] text-muted">SAM segmentation, QA inspect, product photos</span>
                </div>
                <input
                  type="text"
                  value={
                    settings.llm.provider === "gemini"
                      ? settings.llm.tiers?.gemini?.vision ?? "gemini-2.5-flash"
                      : settings.llm.provider === "openai-compatible"
                      ? settings.llm.tiers?.["openai-compatible"]?.vision ?? "gpt-4o-mini"
                      : settings.llm.tiers?.ollama?.vision ?? "llava"
                  }
                  onChange={(e) => {
                    const currentProvider = (settings.llm.provider as "gemini" | "ollama" | "openai-compatible") || "gemini";
                    const currentTiers = {
                      gemini: { realtime: "gemini-2.5-flash", structured: "gemini-2.5-flash", reasoning: "gemini-2.5-pro", vision: "gemini-2.5-flash" },
                      ollama: { realtime: "qwen2.5:3b", structured: "qwen3.5:9b", reasoning: "qwen3.5:32b", vision: "llava" },
                      "openai-compatible": { realtime: "gpt-4o-mini", structured: "gpt-4o-mini", reasoning: "gpt-4o", vision: "gpt-4o-mini" },
                      ...(settings.llm.tiers || {}),
                    };
                    setSettings({
                      ...settings,
                      llm: {
                        ...settings.llm,
                        tiers: {
                          ...currentTiers,
                          [currentProvider]: {
                            ...currentTiers[currentProvider],
                            vision: e.target.value,
                          },
                        },
                      },
                    });
                  }}
                  className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-mono outline-none focus:border-accent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* AI Services */}
        <div className="backdrop-blur-md bg-surface/30 border border-border/80 rounded-3xl p-6 space-y-5 shadow">
          <h3 className="text-sm font-black text-foreground flex items-center gap-2 border-b border-border/60 pb-3">
            <Server className="w-4 h-4 text-purple-400" /> AI Microservices
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-subtle uppercase">Modern TTS Server URL</label>
              <input
                type="text"
                value={settings.servers.ttsUrl}
                onChange={e => setSettings({ ...settings, servers: { ...settings.servers, ttsUrl: e.target.value } })}
                className="w-full mt-1.5 px-3 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:border-accent font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-subtle uppercase">ComfyUI / InfiniteTalk URL</label>
              <input
                type="text"
                value={settings.servers.comfyuiUrl}
                onChange={e => setSettings({ ...settings, servers: { ...settings.servers, comfyuiUrl: e.target.value } })}
                className="w-full mt-1.5 px-3 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:border-accent font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-subtle uppercase">Ollama URL (Local LLM)</label>
              <input
                type="text"
                value={settings.servers.ollamaUrl}
                onChange={e => setSettings({ ...settings, servers: { ...settings.servers, ollamaUrl: e.target.value } })}
                className="w-full mt-1.5 px-3 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:border-accent font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-subtle uppercase">OpenAI-Compatible URL (vLLM / OpenRouter)</label>
              <input
                type="text"
                value={settings.servers.openaiCompatibleUrl || ""}
                onChange={e => setSettings({ ...settings, servers: { ...settings.servers, openaiCompatibleUrl: e.target.value } })}
                className="w-full mt-1.5 px-3 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:border-accent font-mono"
                placeholder="http://localhost:8000/v1"
              />
            </div>
          </div>
        </div>

        {/* Stock & Assets */}
        <div className="backdrop-blur-md bg-surface/30 border border-border/80 rounded-3xl p-6 space-y-5 shadow">
          <h3 className="text-sm font-black text-foreground flex items-center gap-2 border-b border-border/60 pb-3">
            <ImageIcon className="w-4 h-4 text-blue-400" /> Stock Assets
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-subtle uppercase">Provider Priority (comma separated)</label>
              <input
                type="text"
                value={settings.stock.providerPriority.join(", ")}
                onChange={e => setSettings({ ...settings, stock: { ...settings.stock, providerPriority: e.target.value.split(",").map(s => s.trim()) } })}
                className="w-full mt-1.5 px-3 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:border-accent"
                placeholder="pexels, pixabay"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-subtle uppercase">Pexels API Key</label>
              <div className="relative mt-1.5">
                <input
                  type={showKeys["pexels"] ? "text" : "password"}
                  value={settings.stock.pexelsApiKey}
                  onChange={e => setSettings({ ...settings, stock: { ...settings.stock, pexelsApiKey: e.target.value } })}
                  className="w-full px-3 py-2 pr-10 bg-background border border-border rounded-xl text-xs outline-none focus:border-accent font-mono"
                />
                <button type="button" onClick={() => toggleKeyVis("pexels")} className="absolute right-3 top-2.5 text-muted hover:text-foreground">
                  {showKeys["pexels"] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-subtle uppercase">Pixabay API Key</label>
              <div className="relative mt-1.5">
                <input
                  type={showKeys["pixabay"] ? "text" : "password"}
                  value={settings.stock.pixabayApiKey}
                  onChange={e => setSettings({ ...settings, stock: { ...settings.stock, pixabayApiKey: e.target.value } })}
                  className="w-full px-3 py-2 pr-10 bg-background border border-border rounded-xl text-xs outline-none focus:border-accent font-mono"
                />
                <button type="button" onClick={() => toggleKeyVis("pixabay")} className="absolute right-3 top-2.5 text-muted hover:text-foreground">
                  {showKeys["pixabay"] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Music Assets */}
        <div className="backdrop-blur-md bg-surface/30 border border-border/80 rounded-3xl p-6 space-y-5 shadow">
          <h3 className="text-sm font-black text-foreground flex items-center gap-2 border-b border-border/60 pb-3">
            <Music className="w-4 h-4 text-pink-400" /> Music Assets
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-subtle uppercase">Provider Priority (comma separated)</label>
              <input
                type="text"
                value={settings.music?.providerPriority.join(", ") || ""}
                onChange={e => setSettings({ ...settings, music: { ...settings.music, providerPriority: e.target.value.split(",").map(s => s.trim()) } })}
                className="w-full mt-1.5 px-3 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:border-accent"
                placeholder="pixabay-music, jamendo-music"
              />
              <p className="text-[9px] text-muted mt-1.5">Available: pixabay-music, jamendo-music, ccmixter-music</p>
            </div>
          </div>
        </div>

        {/* Global Pipeline Automation */}
        <div className="backdrop-blur-md bg-surface/30 border border-border/80 rounded-3xl p-6 space-y-5 shadow">
          <h3 className="text-sm font-black text-foreground flex items-center gap-2 border-b border-border/60 pb-3">
            <Zap className="w-4 h-4 text-amber-400" /> Default Automation Fallbacks
          </h3>
          <p className="text-[10px] text-muted">
            These global settings apply when a specific Schedule or RSS feed does not explicitly override them.
          </p>
          <div className="space-y-4 pt-2">
            {/* Scheduler Interval */}
            <div className="p-3 bg-white/[0.02] border border-border/40 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-accent" />
                <h4 className="text-xs font-bold text-foreground">Scheduler Evaluation Interval</h4>
              </div>
              <p className="text-[9px] text-muted">How often the master cron evaluator checks for due schedules (in minutes). Lower values = more frequent checks.</p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={1440}
                  step={1}
                  value={settings.automation.schedulerIntervalMinutes ?? 30}
                  onChange={e => setSettings({ ...settings, automation: { ...settings.automation, schedulerIntervalMinutes: Math.max(1, Math.min(1440, parseInt(e.target.value) || 30)) } })}
                  className="w-24 px-3 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:border-accent text-center font-mono"
                />
                <span className="text-[10px] text-muted font-semibold">minutes</span>
                <div className="flex gap-1.5 ml-auto">
                  {[15, 30, 60].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setSettings({ ...settings, automation: { ...settings.automation, schedulerIntervalMinutes: v } })}
                      className={`px-2.5 py-1 text-[9px] font-bold rounded-lg border transition-all cursor-pointer ${
                        settings.automation.schedulerIntervalMinutes === v
                          ? "bg-accent/15 border-accent/30 text-accent"
                          : "bg-white/5 border-border/40 text-muted hover:text-foreground"
                      }`}
                    >
                      {v}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Toggle switches */}
            {[
              { key: "globalAutoScript", label: "Auto-Script Generation", desc: "Automatically generate AI scripts for all newly ingested stories" },
              { key: "globalRequireApproval", label: "Require Human Approval", desc: "Pause pipeline after script generation for manual review" },
              { key: "globalAutoPublish", label: "Auto-Publish", desc: "Automatically upload finished videos to assigned platforms" },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between p-3 bg-white/[0.02] border border-border/40 rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-foreground">{label}</h4>
                  <p className="text-[9px] text-muted">{desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.automation[key as keyof typeof settings.automation] as boolean}
                    onChange={(e) => setSettings({ ...settings, automation: { ...settings.automation, [key]: e.target.checked } })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-subtle after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent peer-checked:after:bg-white" />
                </label>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Multi-Tenant BYOK Controls */}
      <ByokManager />

      {/* Token Consumption & LLM Spend Telemetry */}
      <TokenSpendDashboard />
    </div>
  );
}

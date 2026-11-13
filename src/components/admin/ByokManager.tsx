"use client";

import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { useToast } from "@/components/global/ToastContainer";
import {
  Key,
  Building2,
  Save,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface CompanyItem {
  id: string;
  name: string;
  tier: string;
  hasByok: boolean;
  updatedAt: string | null;
}

interface ByokDetailResponse {
  companyId: string;
  hasByok: boolean;
  credentials: {
    companyId: string;
    provider?: string;
    geminiApiKey?: string;
    ollamaBaseUrl?: string;
    openaiCompatibleApiKey?: string;
    openaiCompatibleBaseUrl?: string;
    tierModels?: Record<string, string>;
    customTiers?: {
      gemini?: Record<string, string>;
      ollama?: Record<string, string>;
      "openai-compatible"?: Record<string, string>;
    };
    updatedAt?: string;
  } | null;
}

export function ByokManager() {
  const { toast } = useToast();
  const { data: orgData, mutate: mutateOrgs } = useSWR<{ companies: CompanyItem[] }>(
    "/api/admin/settings/byok",
    fetcher
  );

  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [provider, setProvider] = useState<"gemini" | "ollama" | "openai-compatible">("gemini");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState("");
  const [openaiCompatibleApiKey, setOpenaiCompatibleApiKey] = useState("");
  const [openaiCompatibleBaseUrl, setOpenaiCompatibleBaseUrl] = useState("");
  const [realtimeModel, setRealtimeModel] = useState("");
  const [structuredModel, setStructuredModel] = useState("");
  const [reasoningModel, setReasoningModel] = useState("");
  const [visionModel, setVisionModel] = useState("");

  // Select first company by default if none selected
  useEffect(() => {
    if (orgData?.companies && orgData.companies.length > 0 && !selectedOrgId) {
      setSelectedOrgId(orgData.companies[0].id);
    }
  }, [orgData, selectedOrgId]);

  // Fetch details for the selected company
  const { data: detailData, mutate: mutateDetail, isLoading: isLoadingDetail } =
    useSWR<ByokDetailResponse>(
      selectedOrgId ? `/api/admin/settings/byok?companyId=${encodeURIComponent(selectedOrgId)}` : null,
      fetcher
    );

  useEffect(() => {
    if (!detailData || detailData.companyId !== selectedOrgId) {
      return;
    }
    if (detailData.credentials) {
      const c = detailData.credentials;
      const activeProv = (
        c.provider === "ollama" || c.provider === "openai-compatible" ? c.provider : "gemini"
      ) as "gemini" | "ollama" | "openai-compatible";
      setProvider(activeProv);
      setGeminiApiKey(c.geminiApiKey || "");
      setOllamaBaseUrl(c.ollamaBaseUrl || "");
      setOpenaiCompatibleApiKey(c.openaiCompatibleApiKey || "");
      setOpenaiCompatibleBaseUrl(c.openaiCompatibleBaseUrl || "");
      setRealtimeModel(c.tierModels?.realtime || c.customTiers?.[activeProv]?.realtime || "");
      setStructuredModel(c.tierModels?.structured || c.customTiers?.[activeProv]?.structured || "");
      setReasoningModel(c.tierModels?.reasoning || c.customTiers?.[activeProv]?.reasoning || "");
      setVisionModel(c.tierModels?.vision || c.customTiers?.[activeProv]?.vision || "");
    } else {
      setProvider("gemini");
      setGeminiApiKey("");
      setOllamaBaseUrl("");
      setOpenaiCompatibleApiKey("");
      setOpenaiCompatibleBaseUrl("");
      setRealtimeModel("");
      setStructuredModel("");
      setReasoningModel("");
      setVisionModel("");
    }
  }, [detailData, selectedOrgId]);

  const handleOrgChange = (newOrgId: string) => {
    setSelectedOrgId(newOrgId);
    setShowKey(false);
    // Optimistically reset form for the incoming org while loading
    setGeminiApiKey("");
    setOllamaBaseUrl("");
    setOpenaiCompatibleApiKey("");
    setOpenaiCompatibleBaseUrl("");
    setRealtimeModel("");
    setStructuredModel("");
    setReasoningModel("");
    setVisionModel("");
  };

  const handleSave = async () => {
    if (!selectedOrgId) {
      toast("Error", "Please select an organization first.", "error");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        companyId: selectedOrgId,
        provider,
        geminiApiKey,
        ollamaBaseUrl,
        openaiCompatibleApiKey,
        openaiCompatibleBaseUrl,
        tierModels: {
          realtime: realtimeModel.trim(),
          structured: structuredModel.trim(),
          reasoning: reasoningModel.trim(),
          vision: visionModel.trim(),
        },
        customTiers: {
          [provider]: {
            realtime: realtimeModel.trim(),
            structured: structuredModel.trim(),
            reasoning: reasoningModel.trim(),
            vision: visionModel.trim(),
          },
        },
      };

      const res = await fetch("/api/admin/settings/byok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast("Saved", `BYOK credentials updated for ${selectedOrgId}`, "success");
        mutateOrgs();
        mutateDetail();
      } else {
        const err = await res.json().catch(() => ({}));
        toast("Error", err.error || "Failed to save BYOK credentials.", "error");
      }
    } catch {
      toast("Error", "Network connection failed.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    if (!selectedOrgId) return;
    if (!confirm(`Are you sure you want to remove BYOK credentials for "${selectedOrgId}"? It will revert to global system settings.`)) {
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/settings/byok?companyId=${encodeURIComponent(selectedOrgId)}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast("Removed", `BYOK credentials cleared for ${selectedOrgId}.`, "success");
        mutateOrgs();
        mutateDetail();
      } else {
        toast("Error", "Could not remove credentials.", "error");
      }
    } catch {
      toast("Error", "Network connection failed.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const currentOrg = orgData?.companies?.find((c) => c.id === selectedOrgId);

  return (
    <div className="backdrop-blur-md bg-surface/30 border border-border/80 rounded-3xl p-6 space-y-6 shadow">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h3 className="text-sm font-black text-foreground flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" /> Multi-Tenant BYOK (Bring Your Own Key) Controls
          </h3>
          <p className="text-[11px] text-muted mt-0.5">
            Configure custom API keys, private Ollama endpoints, and per-tenant model tiers scoped to Clerk organizations.
          </p>
        </div>

        {currentOrg?.hasByok && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" /> Active BYOK Scoped
          </span>
        )}
      </div>

      {/* Organization Selector */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-subtle uppercase flex items-center gap-1.5">
          <Building2 className="w-3 h-3 text-accent" /> Select Organization / Tenant Context
        </label>
        <div className="flex gap-2">
          <select
            value={selectedOrgId}
            onChange={(e) => handleOrgChange(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:border-accent"
          >
            {orgData?.companies?.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name} ({org.id}) {org.hasByok ? "★ [BYOK Active]" : `• [${org.tier.toUpperCase()}]`}
              </option>
            ))}
            {(!orgData?.companies || orgData.companies.length === 0) && (
              <option value="">No organizations found</option>
            )}
          </select>
          <input
            type="text"
            placeholder="Or enter custom orgId..."
            value={selectedOrgId}
            onChange={(e) => handleOrgChange(e.target.value)}
            className="w-48 px-3 py-2 bg-background border border-border rounded-xl text-xs font-mono outline-none focus:border-accent"
          />
        </div>
      </div>

      {isLoadingDetail ? (
        <div className="flex items-center justify-center py-10 gap-2">
          <RefreshCw className="w-4 h-4 text-accent animate-spin" />
          <span className="text-xs text-muted">Loading tenant BYOK profile...</span>
        </div>
      ) : (
        <div className="space-y-4 pt-1">
          {/* Provider Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-subtle uppercase">Preferred Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as "gemini" | "ollama" | "openai-compatible")}
                className="w-full mt-1.5 px-3 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:border-accent"
              >
                <option value="gemini">Google Gemini (Cloud)</option>
                <option value="ollama">Ollama (Private Cluster)</option>
                <option value="openai-compatible">OpenAI-Compatible • vLLM / OpenRouter / Groq</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-subtle uppercase">
                {provider === "openai-compatible" ? "OpenAI-Compatible Base URL" : "Private Ollama Endpoint"}
              </label>
              {provider === "openai-compatible" ? (
                <input
                  type="text"
                  placeholder="http://localhost:8000/v1 or https://openrouter.ai/api/v1"
                  value={openaiCompatibleBaseUrl}
                  onChange={(e) => setOpenaiCompatibleBaseUrl(e.target.value)}
                  className="w-full mt-1.5 px-3 py-2 bg-background border border-border rounded-xl text-xs font-mono outline-none focus:border-accent"
                />
              ) : (
                <input
                  type="text"
                  placeholder="http://localhost:11434 or https://ollama.tenant.internal"
                  value={ollamaBaseUrl}
                  onChange={(e) => setOllamaBaseUrl(e.target.value)}
                  className="w-full mt-1.5 px-3 py-2 bg-background border border-border rounded-xl text-xs font-mono outline-none focus:border-accent"
                />
              )}
            </div>
          </div>

          {/* API Key */}
          <div>
            <label className="text-[10px] font-bold text-subtle uppercase flex items-center justify-between">
              <span>
                {provider === "openai-compatible" ? "Tenant OpenAI-Compatible API Key" : "Tenant Gemini API Key"}
              </span>
              <span className="text-[9px] text-muted font-normal">
                {provider === "openai-compatible"
                  ? "Optional for local vLLM/LM Studio. Masked per AGENTS.md §3.5."
                  : "Masked per AGENTS.md §3.5 (••••1234). Entering new key replaces it."}
              </span>
            </label>
            <div className="relative mt-1.5">
              {provider === "openai-compatible" ? (
                <input
                  type={showKey ? "text" : "password"}
                  placeholder="sk-... (Leave masked to keep existing, or blank for local vLLM)"
                  value={openaiCompatibleApiKey}
                  onChange={(e) => setOpenaiCompatibleApiKey(e.target.value)}
                  className="w-full px-3 py-2 pr-10 bg-background border border-border rounded-xl text-xs outline-none focus:border-accent font-mono"
                />
              ) : (
                <input
                  type={showKey ? "text" : "password"}
                  placeholder="AIzaSy... (Leave masked to keep existing)"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  className="w-full px-3 py-2 pr-10 bg-background border border-border rounded-xl text-xs outline-none focus:border-accent font-mono"
                />
              )}
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-2.5 text-muted hover:text-foreground"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Tenant-Specific Task-Tier Overrides */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-border/60 space-y-3">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <h4 className="text-xs font-bold text-foreground">Tenant Model Tier Overrides (Optional)</h4>
            </div>
            <p className="text-[10px] text-muted">
              Override models for this tenant. Leave blank to inherit global system tier settings.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[9px] font-bold text-subtle uppercase">Real-time Tier</label>
                <input
                  type="text"
                  placeholder={
                    provider === "openai-compatible"
                      ? "e.g. gpt-4o-mini"
                      : "e.g. gemini-2.5-flash or qwen2.5:3b"
                  }
                  value={realtimeModel}
                  onChange={(e) => setRealtimeModel(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-mono outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-subtle uppercase">Structured Tier</label>
                <input
                  type="text"
                  placeholder={
                    provider === "openai-compatible"
                      ? "e.g. gpt-4o-mini"
                      : "e.g. gemini-2.5-flash or qwen3.5:9b"
                  }
                  value={structuredModel}
                  onChange={(e) => setStructuredModel(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-mono outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-subtle uppercase">Reasoning Tier</label>
                <input
                  type="text"
                  placeholder={
                    provider === "openai-compatible"
                      ? "e.g. gpt-4o"
                      : "e.g. gemini-2.5-pro or qwen3.5:32b"
                  }
                  value={reasoningModel}
                  onChange={(e) => setReasoningModel(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-mono outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-subtle uppercase">Vision Tier</label>
                <input
                  type="text"
                  placeholder={
                    provider === "openai-compatible"
                      ? "e.g. gpt-4o-mini"
                      : "e.g. gemini-2.5-flash or llava"
                  }
                  value={visionModel}
                  onChange={(e) => setVisionModel(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-mono outline-none focus:border-accent"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-border/60">
            {currentOrg?.hasByok ? (
              <button
                type="button"
                onClick={handleClear}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-error border border-error/30 hover:bg-error/10 rounded-xl transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Revert to Global Settings
              </button>
            ) : (
              <div className="text-[10px] text-muted">Currently using global system settings</div>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !selectedOrgId}
              className="flex items-center gap-1.5 px-5 py-2 bg-accent text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-accent-hover transition-all active:scale-95 shadow-md shadow-accent/20 disabled:opacity-50 cursor-pointer ml-auto"
            >
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save BYOK for Tenant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState } from "react";
import useSWR from "swr";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Coins, Cpu, TrendingUp, BarChart3, RefreshCw, CheckCircle2 } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface TokenSummary {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  totalCalls: number;
}

interface ProviderUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  calls: number;
}

interface ModelUsage {
  model: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  calls: number;
}

interface TimelineEntry {
  date: string;
  geminiTokens: number;
  ollamaTokens: number;
  totalTokens: number;
  estimatedCost: number;
  calls: number;
}

interface TokenStatsResponse {
  summary: TokenSummary;
  byProvider: Record<string, ProviderUsage>;
  byModel: ModelUsage[];
  timeline: TimelineEntry[];
}

export function TokenSpendDashboard({ companyId: propCompanyId }: { companyId?: string } = {}) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(propCompanyId || "");
  const [days, setDays] = useState<number>(30);

  const { data: orgData } = useSWR<{ companies: Array<{ id: string; name: string; tier: string }> }>(
    "/api/admin/settings/byok",
    fetcher
  );

  const activeCompanyId = propCompanyId !== undefined ? propCompanyId : selectedCompanyId;
  const url = activeCompanyId
    ? `/api/admin/settings/tokens?companyId=${encodeURIComponent(activeCompanyId)}&days=${days}`
    : `/api/admin/settings/tokens?days=${days}`;

  const { data, error, isLoading, mutate } = useSWR<TokenStatsResponse>(url, fetcher);

  const formatTokens = (val: number) => {
    if (!val) return "0";
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(1)}k`;
    return val.toLocaleString();
  };

  const formatCost = (cost: number) => {
    if (!cost) return "$0.00";
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    return `$${cost.toFixed(2)}`;
  };

  return (
    <div className="backdrop-blur-md bg-surface/30 border border-border/80 rounded-3xl p-6 space-y-6 shadow">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h3 className="text-sm font-black text-foreground flex items-center gap-2">
            <Coins className="w-4 h-4 text-emerald-400" /> Token Consumption & LLM Spend Telemetry
          </h3>
          <p className="text-[11px] text-muted mt-0.5">
            Normalized telemetry tracked automatically via Vercel AI SDK middleware into Prisma.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {propCompanyId === undefined && orgData?.companies && orgData.companies.length > 0 && (
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="px-2.5 py-1 bg-background border border-border/60 rounded-xl text-[10px] font-bold text-foreground outline-none focus:border-accent"
            >
              <option value="">All Organizations (Global)</option>
              {orgData.companies.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.id})
                </option>
              ))}
            </select>
          )}

          <div className="flex rounded-xl bg-background border border-border/60 p-0.5">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                  days === d
                    ? "bg-accent text-white shadow-sm"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => mutate()}
            disabled={isLoading}
            className="p-1.5 rounded-xl border border-border hover:bg-white/5 text-muted hover:text-foreground transition-all"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {isLoading && !data ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <RefreshCw className="w-6 h-6 text-accent animate-spin" />
          <span className="text-xs text-muted">Aggregating token telemetry...</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-error/10 border border-error/30 text-xs text-error">
          Failed to load token telemetry. Please verify database connectivity.
        </div>
      ) : (
        <>
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-border/60 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-subtle flex items-center gap-1.5">
                <BarChart3 className="w-3 h-3 text-cyan-400" /> Total Tokens
              </span>
              <div className="text-xl font-black text-foreground">
                {formatTokens(data?.summary.totalTokens || 0)}
              </div>
              <div className="text-[9px] text-muted flex gap-2">
                <span>Prompt: {formatTokens(data?.summary.promptTokens || 0)}</span>
                <span>•</span>
                <span>Comp: {formatTokens(data?.summary.completionTokens || 0)}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-border/60 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-subtle flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3 text-emerald-400" /> Estimated Spend
              </span>
              <div className="text-xl font-black text-emerald-400">
                {formatCost(data?.summary.estimatedCost || 0)}
              </div>
              <div className="text-[9px] text-muted">
                Cloud LLM cost (Google Gemini API)
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-border/60 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-subtle flex items-center gap-1.5">
                <Cpu className="w-3 h-3 text-purple-400" /> Local Ollama
              </span>
              <div className="text-xl font-black text-purple-400">
                {formatTokens(data?.byProvider.ollama?.totalTokens || 0)}
              </div>
              <div className="text-[9px] text-muted flex items-center gap-1 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-2.5 h-2.5" /> $0.00 (Self-hosted GPU)
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-border/60 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-subtle">
                LLM Invocations
              </span>
              <div className="text-xl font-black text-foreground">
                {(data?.summary.totalCalls || 0).toLocaleString()}
              </div>
              <div className="text-[9px] text-muted">
                Gateway generate & stream calls
              </div>
            </div>
          </div>

          {/* Timeline Chart */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-accent" /> Daily Token Volume ({days} Days)
            </h4>
            <div className="h-56 w-full pt-2">
              {data?.timeline && data.timeline.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="geminiGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="ollamaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="date"
                      stroke="rgba(255,255,255,0.3)"
                      fontSize={10}
                      tickFormatter={(val) => val.slice(5)}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.3)"
                      fontSize={10}
                      tickFormatter={(val) => formatTokens(val)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(18, 18, 26, 0.95)",
                        borderColor: "rgba(255, 255, 255, 0.15)",
                        borderRadius: "12px",
                        fontSize: "11px",
                      }}
                      formatter={(val: unknown) => [typeof val === "number" ? val.toLocaleString() : "0", "Tokens"]}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    <Area
                      type="monotone"
                      dataKey="geminiTokens"
                      name="Gemini Cloud"
                      stroke="#06b6d4"
                      fillOpacity={1}
                      fill="url(#geminiGrad)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="ollamaTokens"
                      name="Ollama Local"
                      stroke="#a855f7"
                      fillOpacity={1}
                      fill="url(#ollamaGrad)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-muted">
                  No token usage logged in this period.
                </div>
              )}
            </div>
          </div>

          {/* Model Breakdown Table */}
          {data?.byModel && data.byModel.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/60">
              <h4 className="text-xs font-bold text-foreground">Usage by Model</h4>
              <div className="overflow-x-auto rounded-xl border border-border/60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.02] border-b border-border/60 text-[10px] uppercase font-bold text-subtle">
                    <tr>
                      <th className="p-2.5">Model</th>
                      <th className="p-2.5">Provider</th>
                      <th className="p-2.5 text-right">Invocations</th>
                      <th className="p-2.5 text-right">Tokens</th>
                      <th className="p-2.5 text-right">Est. Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-mono">
                    {data.byModel.map((item) => (
                      <tr key={`${item.provider}:${item.model}`} className="hover:bg-white/[0.02]">
                        <td className="p-2.5 font-sans font-medium text-foreground">{item.model}</td>
                        <td className="p-2.5 font-sans">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              item.provider === "gemini"
                                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                                : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            }`}
                          >
                            {item.provider}
                          </span>
                        </td>
                        <td className="p-2.5 text-right text-muted">{item.calls.toLocaleString()}</td>
                        <td className="p-2.5 text-right text-foreground">{item.totalTokens.toLocaleString()}</td>
                        <td className="p-2.5 text-right text-emerald-400 font-bold">{formatCost(item.estimatedCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

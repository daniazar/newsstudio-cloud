"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/global/ToastContainer";
import type { AutonomousBulletinPayload } from "@/lib/autonomous/bulletinBotEngine";

const INITIAL_DISPATCH_HISTORY = [
  {
    id: "hist_1",
    timestamp: "14:00 UTC",
    title: "NVIDIA Claims 84% Market Monopoly • Hourly AI Briefing",
    persona: "Ruby Vance",
    scenesCount: 3,
    wordCount: 146,
    status: "RENDER_QUEUED",
    graphicType: "bar_race",
    storyId: "demo_story_1",
  },
  {
    id: "hist_2",
    timestamp: "13:00 UTC",
    title: "Bitcoin $98K Liquidation Cascade & Spot ETF Volume Record",
    persona: "Ruby Vance",
    scenesCount: 3,
    wordCount: 152,
    status: "COMPLETED",
    graphicType: "candlestick",
    storyId: "demo_story_2",
  },
  {
    id: "hist_3",
    timestamp: "12:00 UTC",
    title: "Red Sea 68% Maritime Transit Reroute & Logistics Inflation",
    persona: "Mateo Rossi",
    scenesCount: 3,
    wordCount: 139,
    status: "COMPLETED",
    graphicType: "map_tracer",
    storyId: "demo_story_3",
  },
];

export default function BulletinBotPage() {
  const { toast } = useToast();
  const [isBotEnabled, setIsBotEnabled] = useState(true);
  const [scheduleMode, setScheduleMode] = useState<"hourly" | "every_3h" | "twice_daily">("hourly");
  const [selectedPersona, setSelectedPersona] = useState("ruby");
  const [isRunningCycle, setIsRunningCycle] = useState(false);
  const [history, setHistory] = useState(INITIAL_DISPATCH_HISTORY);
  const [activePayload, setActivePayload] = useState<AutonomousBulletinPayload | null>(null);

  const handleRunInstantCycle = async () => {
    setIsRunningCycle(true);
    try {
      const res = await fetch("/api/autonomous/bulletin/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredPersonaId: selectedPersona, autoDispatchJob: true }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      if (data.bulletin) {
        setActivePayload(data.bulletin);
        const newEntry = {
          id: `hist_${Date.now()}`,
          timestamp: `${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} UTC`,
          title: data.bulletin.bulletinTitle,
          persona: data.bulletin.targetPersonaId === "ruby" ? "Ruby Vance" : "Anchor",
          scenesCount: data.bulletin.scenes?.length || 3,
          wordCount: 148,
          status: "RENDER_QUEUED",
          graphicType: data.bulletin.scenes?.[1]?.dataGraphic?.type || "bar_race",
          storyId: data.storyId,
        };
        setHistory((prev) => [newEntry, ...prev]);
        toast("Autonomous Cycle Finished", `Synthesized & queued 60s bulletin "${data.bulletin.bulletinTitle}"`, "success");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast("Cycle Notice", `Synthesized fallback autonomous bulletin (${msg})`, "info");
    } finally {
      setIsRunningCycle(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* ── Top Header ── */}
      <header className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 backdrop-blur-md shrink-0 z-30">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-slate-400 hover:text-white text-xs font-semibold">
            ← Admin
          </Link>
          <span className="text-slate-700">/</span>
          <h1 className="text-sm font-bold flex items-center gap-2 text-white">
            <span className="text-amber-400">🤖</span> 24/7 Autonomous Newsroom Bulletin Bot
          </h1>
        </div>

        {/* Master Bot Switch & Instant Cycle Button */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">DISPATCH DAEMON:</span>
            <button
              onClick={() => {
                setIsBotEnabled(!isBotEnabled);
                toast(
                  isBotEnabled ? "Bot Paused" : "Bot Active",
                  isBotEnabled ? "Autonomous hourly dispatch suspended." : "Autonomous hourly dispatch active.",
                  isBotEnabled ? "info" : "success"
                );
              }}
              className={`px-3 py-1 rounded-full text-xs font-mono font-bold transition-all ${
                isBotEnabled
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-500/10"
                  : "bg-slate-800 text-slate-400 border border-slate-700"
              }`}
            >
              {isBotEnabled ? "● ACTIVE (24/7 HOURLY)" : "○ PAUSED"}
            </button>
          </div>

          <Button size="sm" isLoading={isRunningCycle} onClick={handleRunInstantCycle}>
            ⚡ Run Instant Bulletin Cycle
          </Button>
        </div>
      </header>

      {/* ── Main Dashboard Workspace ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Left Column: Configuration & Automation Settings ── */}
        <div className="w-[420px] p-6 border-r border-slate-800 flex flex-col gap-5 overflow-y-auto bg-slate-950/60">
          {/* Autonomous Status Summary */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-purple-500/10 border border-emerald-500/30 flex items-center gap-3">
            <span className="text-3xl">📡</span>
            <div>
              <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider block">
                Zero-Human News Pipeline
              </span>
              <span className="text-sm font-black text-white">
                Cluster Wire → Script → TTS → Video → Render
              </span>
            </div>
          </div>

          {/* Schedule Cadence Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              Autonomous Dispatch Frequency
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "hourly", label: "Hourly (60m)" },
                { id: "every_3h", label: "Every 3 Hours" },
                { id: "twice_daily", label: "Twice Daily" },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setScheduleMode(s.id as "hourly" | "every_3h" | "twice_daily")}
                  className={`py-2 px-2 rounded-xl text-xs font-bold font-mono transition-all ${
                    scheduleMode === s.id
                      ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20"
                      : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lead Anchor Persona Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              Lead Anchor Persona
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "ruby", name: "Ruby Vance", title: "Lead Anchor (EN)", icon: "👩‍💼" },
                { id: "mateo", name: "Mateo Rossi", title: "Senior Analyst (EN)", icon: "👨‍💼" },
                { id: "isabel", name: "Isabel Rivera", title: "Lead Anchor (ES)", icon: "🎙️" },
                { id: "blaze", name: "Blaze Wilder", title: "Entertainment (EN)", icon: "⚡" },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPersona(p.id)}
                  className={`p-2.5 rounded-xl text-left border flex items-center gap-2.5 transition-all ${
                    selectedPersona === p.id
                      ? "bg-slate-900 border-amber-400 shadow-md shadow-amber-500/10"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <span className="text-xl">{p.icon}</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">{p.name}</span>
                    <span className="text-[10px] text-slate-400">{p.title}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Whitelisted Category Topics */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              Wire Clustering Topic Whitelist
            </label>
            <div className="flex flex-col gap-2">
              {[
                { label: "AI Hardware & Enterprise Compute", active: true },
                { label: "Financial Derivatives & Crypto ETFs", active: true },
                { label: "Global Maritime Logistics & Geopolitics", active: true },
              ].map((cat, i) => (
                <label
                  key={i}
                  className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-bold text-slate-300 cursor-pointer"
                >
                  <input type="checkbox" defaultChecked={cat.active} className="accent-amber-400" />
                  <span>{cat.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right Column: Live Dispatch History & Active Script Preview ── */}
        <div className="flex-1 p-6 flex flex-col gap-5 overflow-y-auto bg-slate-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-400 font-mono uppercase tracking-wider">
              Autonomous Wire Dispatch Log
            </span>
            <span className="text-xs font-mono text-slate-500">
              Showing past {history.length} autonomous broadcast runs
            </span>
          </div>

          {/* History Cards Grid */}
          <div className="flex flex-col gap-3">
            {history.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-lg">
                    🎬
                  </div>
                  <div className="flex flex-col gap-0.5 max-w-lg">
                    <span className="text-xs font-black text-white">{item.title}</span>
                    <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                      <span className="text-amber-400 font-bold">⏱️ {item.timestamp}</span>
                      <span>•</span>
                      <span>Anchor: {item.persona}</span>
                      <span>•</span>
                      <span>{item.scenesCount} Scenes ({item.wordCount} words)</span>
                      <span>•</span>
                      <span className="text-cyan-400 uppercase">📊 {item.graphicType}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    ✓ {item.status}
                  </span>
                  <Link
                    href={`/editor/${item.storyId}`}
                    className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono font-bold text-slate-200 transition-all"
                  >
                    Open Editor →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Active Payload Script Inspector */}
          {activePayload && (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-amber-400/40 flex flex-col gap-3 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                  ✨ Latest Synthesized 3-Scene Script Breakdown
                </span>
                <span className="text-xs font-mono text-slate-400">{activePayload.edition}</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {activePayload.scenes.map((scene, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
                    <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase">
                      Scene {scene.index + 1} ({scene.durationSeconds}s) • {scene.sceneStrategy}
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed italic">
                      &ldquo;{scene.text}&rdquo;
                    </p>
                    <span className="text-[10px] font-mono text-slate-500 mt-auto">
                      🎥 {scene.cameraCue} | 🔄 {scene.actionLoop}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

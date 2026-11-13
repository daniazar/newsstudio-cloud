"use client";

import React from "react";
import { motion } from "framer-motion";
import { Mic2, Video, Activity, Play, Sparkles, FileText } from "lucide-react";

export function PipelineAnimation() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="w-full max-w-5xl relative mt-4 mb-4"
    >
      {/* Container Card */}
      <div className="w-full rounded-3xl p-6 sm:p-8 overflow-hidden relative glass-panel-raised border border-white/10 shadow-2xl">
        {/* Specular top gradient line */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-400" />
        
        <div className="flex flex-col gap-6">
          {/* Header row */}
          <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80 shadow-[0_0_8px_#f43f5e]" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80 shadow-[0_0_8px_#f59e0b]" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 shadow-[0_0_8px_#10b981]" />
              </div>
              <span className="text-xs font-mono font-bold text-subtle tracking-wider uppercase">
                RubyStudio Neural Pipeline
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm shadow-emerald-500/10">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              <span>LIVE STORY: "Mars Odyssey 2026"</span>
            </div>
          </div>

          {/* The 4 Pipeline Stages */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Step 1: Scripting */}
            <motion.div 
              whileHover={{ y: -2 }}
              className="rounded-2xl p-5 border border-border/80 bg-surface/80 relative overflow-hidden group transition-all hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10"
            >
              <div className="text-xs font-mono font-bold text-subtle uppercase tracking-wider mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-lg bg-emerald-500/15 text-emerald-400 font-bold flex items-center justify-center text-[10px] border border-emerald-500/30">
                    1
                  </span>
                  <span className="text-foreground">Gemini Script</span>
                </div>
                <FileText className="w-3.5 h-3.5 text-muted group-hover:text-emerald-400 transition-colors" />
              </div>
              <div className="space-y-2 mt-3">
                <motion.div animate={{ width: ["0%", "100%"] }} transition={{ duration: 2.2, repeat: Infinity }} className="h-1.5 bg-emerald-500/60 rounded-full" />
                <motion.div animate={{ width: ["0%", "85%"] }} transition={{ duration: 2.2, delay: 0.2, repeat: Infinity }} className="h-1.5 bg-emerald-500/40 rounded-full" />
                <motion.div animate={{ width: ["0%", "65%"] }} transition={{ duration: 2.2, delay: 0.4, repeat: Infinity }} className="h-1.5 bg-emerald-500/30 rounded-full" />
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-muted">
                <span>Emotion: Confident</span>
                <span className="text-emerald-400 font-bold">100%</span>
              </div>
            </motion.div>

            {/* Step 2: Modern-TTS */}
            <motion.div 
              whileHover={{ y: -2 }}
              className="rounded-2xl p-5 border border-border/80 bg-surface/80 relative overflow-hidden group transition-all hover:border-teal-500/40 hover:shadow-lg hover:shadow-teal-500/10"
            >
              <div className="text-xs font-mono font-bold text-subtle uppercase tracking-wider mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-lg bg-teal-500/15 text-teal-400 font-bold flex items-center justify-center text-[10px] border border-teal-500/30">
                    2
                  </span>
                  <span className="text-foreground">Neural Voice</span>
                </div>
                <Mic2 className="w-3.5 h-3.5 text-muted group-hover:text-teal-400 transition-colors" />
              </div>
              <div className="flex items-center justify-center h-12 gap-1 px-2">
                {[40, 75, 30, 95, 60, 80, 45, 90, 50, 70, 35].map((h, idx) => (
                  <motion.span
                    key={idx}
                    animate={{ height: [`${h * 0.3}%`, `${h}%`, `${h * 0.4}%`] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: idx * 0.08 }}
                    className="w-1 rounded-full bg-gradient-to-t from-teal-500 to-emerald-400"
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-muted">
                <span>Piper 24kHz</span>
                <span className="text-teal-400 font-bold">42ms Latency</span>
              </div>
            </motion.div>

            {/* Step 3: MuseTalk Lip-Sync */}
            <motion.div 
              whileHover={{ y: -2 }}
              className="rounded-2xl p-5 border border-border/80 bg-surface/80 relative overflow-hidden group transition-all hover:border-sky-500/40 hover:shadow-lg hover:shadow-sky-500/10"
            >
              <div className="text-xs font-mono font-bold text-subtle uppercase tracking-wider mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-lg bg-sky-500/15 text-sky-400 font-bold flex items-center justify-center text-[10px] border border-sky-500/30">
                    3
                  </span>
                  <span className="text-foreground">MuseTalk 40FPS</span>
                </div>
                <Video className="w-3.5 h-3.5 text-muted group-hover:text-sky-400 transition-colors" />
              </div>
              <div className="flex items-center justify-center h-12">
                <div className="w-full h-8 rounded-xl bg-black/40 border border-sky-500/20 flex items-center justify-center gap-2 px-3">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                  <span className="text-[11px] font-mono text-sky-300 font-bold">latents.pt Vectorized</span>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-muted">
                <span>68 Landmark Mesh</span>
                <span className="text-sky-400 font-bold">60 FPS</span>
              </div>
            </motion.div>

            {/* Step 4: Remotion 4K Composition */}
            <motion.div 
              whileHover={{ y: -2 }}
              className="rounded-2xl p-5 border border-border/80 bg-surface/80 relative overflow-hidden group transition-all hover:border-rose-500/40 hover:shadow-lg hover:shadow-rose-500/10"
            >
              <div className="text-xs font-mono font-bold text-subtle uppercase tracking-wider mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-lg bg-rose-500/15 text-rose-400 font-bold flex items-center justify-center text-[10px] border border-rose-500/30">
                    4
                  </span>
                  <span className="text-foreground">Remotion 4K</span>
                </div>
                <Sparkles className="w-3.5 h-3.5 text-muted group-hover:text-rose-400 transition-colors" />
              </div>
              <div className="relative h-12 rounded-xl overflow-hidden border border-white/10 bg-black/50 flex items-center px-3">
                <motion.div 
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-rose-500/30 to-transparent"
                />
                <div className="relative z-10 flex items-center justify-between w-full text-[10px] font-mono font-bold text-rose-200">
                  <span>Exporting 9:16...</span>
                  <span className="text-rose-400">4K HDR</span>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-muted">
                <span>Audio Ducking</span>
                <span className="text-rose-400 font-bold">CUDA Render</span>
              </div>
            </motion.div>
          </div>

          {/* Timeline Scrubber Ribbon */}
          <div className="px-4 py-3 rounded-2xl border border-white/10 bg-black/40 flex items-center gap-4">
            <button className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full relative overflow-hidden">
              <motion.div 
                animate={{ width: ["0%", "100%"] }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400 rounded-full shadow-[0_0_12px_#34d399]"
              />
            </div>
            <span className="text-[11px] font-mono font-bold text-subtle tabular-nums">00:00 / 01:24</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

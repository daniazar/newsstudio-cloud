"use client";

import React from "react";
import { motion } from "framer-motion";
import { Bot, Mic2, Video, Share2, Sparkles } from "lucide-react";

export function Features() {
  const features = [
    {
      icon: Bot,
      title: "Autonomous Scripting",
      desc: "Automatically extracts context from breaking RSS feeds, writes TV broadcast scripts with Gemini 2.5, and formats emotion tags.",
      badge: "LLM AGENT",
      color: "emerald"
    },
    {
      icon: Mic2,
      title: "Modern-TTS Engine",
      desc: "Zero-shot neural voice synthesis (:8005) with Piper, F5-TTS, StyleTTS2, automated breathing pauses, and cadence engineering.",
      badge: "24kHz HI-FI",
      color: "sky"
    },
    {
      icon: Video,
      title: "MuseTalk Real-Time Lip-Sync",
      desc: "40 FPS real-time neural lip-sync engine with offline VAE latents.pt caching and 68-point facial landmark precision.",
      badge: "40 FPS CUDA",
      color: "amber"
    },
    {
      icon: Share2,
      title: "4K Composition & Publishing",
      desc: "16-layer Remotion broadcast rendering with WebGL chroma keying, audio ducking, ticker tapes, and direct YouTube syndication.",
      badge: "REMOTION 4K",
      color: "rose"
    },
  ];

  return (
    <section className="relative z-10 py-20 px-6 max-w-6xl mx-auto">
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-border/80 text-[11px] font-mono font-bold text-emerald-400 mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>PRODUCTION-READY AI STACK</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground mb-4">
          Complete Broadcast Pipeline
        </h2>
        <p className="text-base sm:text-lg text-subtle font-medium max-w-2xl mx-auto leading-relaxed">
          RubyStudio orchestrates a full TV production pipeline into a decoupled, high-speed automated workflow.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="group flex flex-col justify-between p-6 rounded-3xl glass-panel-raised border-white/10 transition-all duration-200 hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/10"
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <f.icon className="w-6 h-6 text-emerald-400" />
                </div>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-white/[0.04] border border-border/60 text-subtle">
                  {f.badge}
                </span>
              </div>
              <h3 className="text-lg font-black text-foreground tracking-tight mb-2">
                {f.title}
              </h3>
              <p className="text-xs text-subtle font-normal leading-relaxed">
                {f.desc}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

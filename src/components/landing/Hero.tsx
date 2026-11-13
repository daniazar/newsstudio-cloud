"use client";

import { motion } from "framer-motion";
import { ArrowRight,Radio,Sparkles } from "lucide-react";
import React from "react";
import { ContactModal } from "./ContactModal";
import { PipelineAnimation } from "./PipelineAnimation";

export function Hero() {
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  return (
    <section className="relative z-10 flex flex-col items-center justify-center pt-8 pb-12 px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center max-w-4xl"
      >
        {/* Luminous Top Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel border-white/10 mb-8 shadow-lg shadow-emerald-500/10">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <span className="text-xs font-mono font-bold tracking-wider uppercase text-foreground">
            AUTONOMOUS BROADCAST ORCHESTRATION v2.0
          </span>
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-foreground leading-[1.08] mb-6">
          <span>The Next Generation</span>{" "}
          <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 bg-clip-text text-transparent">
            AI News Broadcast Engine
          </span>
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-subtle max-w-2xl mb-10 font-medium leading-relaxed">
          Transform breaking RSS stories into professional television broadcasts in minutes. Zero-shot neural voice cloning, 40 FPS real-time lip-sync, and 4K Remotion composition.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-12">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="group relative inline-flex items-center gap-2 px-8 py-3.5 text-sm font-bold text-white rounded-2xl overflow-hidden transition-all duration-200 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-105 active:scale-95 border border-emerald-400/40 cursor-pointer"
          >
            <span>Get Enterprise Access</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <a
            href="/newsroom"
            className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-bold text-foreground rounded-2xl glass-panel hover:bg-white/10 hover:border-white/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Radio className="w-4 h-4 text-emerald-400" />
            <span>Open Control Center</span>
          </a>
        </div>
        
        {/* Animated Pipeline Stage Visualizer */}
        <PipelineAnimation />
      </motion.div>
      <ContactModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </section>
  );
}

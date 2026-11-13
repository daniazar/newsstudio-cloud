"use client";

import React from "react";
import { motion } from "framer-motion";

export function Stats() {
  const stats = [
    { value: "10x", label: "Production Speed" },
    { value: "28+", label: "Neural Personas" },
    { value: "24/7", label: "Autonomous Pipeline" },
    { value: "4K HDR", label: "Export Quality" },
  ];

  return (
    <section className="relative z-10 py-12 px-6 border-y border-border/80 bg-surface/50 backdrop-blur-md">
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
        {stats.map((stat, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="text-center px-4 pt-4 sm:pt-0"
          >
            <div className="text-4xl md:text-5xl font-black tracking-tight mb-1.5 bg-gradient-to-r from-foreground via-slate-200 to-slate-400 bg-clip-text text-transparent font-mono tabular-nums">
              {stat.value}
            </div>
            <div className="text-[11px] font-mono font-bold text-muted uppercase tracking-widest">
              {stat.label}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

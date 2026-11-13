"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { InteractiveAgentNetwork } from "@/components/landing/InteractiveAgentNetwork";
import { Hero } from "@/components/landing/Hero";
import { Stats } from "@/components/landing/Stats";
import { Features } from "@/components/landing/Features";
import { Contact } from "@/components/landing/Contact";
import { Footer } from "@/components/landing/Footer";
import { useUser, UserButton } from "@clerk/nextjs";
import { Radio, ArrowRight } from "lucide-react";

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const { isLoaded, isSignedIn } = useUser();
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground font-sans selection:bg-emerald-500/30">
      {/* Background Interactive Agent Network Animation */}
      <div className="absolute inset-0 z-0 opacity-40">
        <InteractiveAgentNetwork />
      </div>

      {/* Ambient Atmospheric Glow Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-sky-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Navigation Bar */}
      <header className="relative z-50 max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 border border-emerald-400/30">
            <span className="text-white font-black text-base tracking-tighter">R</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-foreground tracking-tight">RubyStudio</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-muted font-mono uppercase tracking-wider">Autonomous AI Newsroom</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isLoaded && isSignedIn ? (
            <>
              <Link 
                href="/newsroom" 
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-emerald-500 transition-all hover:scale-105 active:scale-95"
              >
                <Radio className="w-3.5 h-3.5" />
                Control Center
              </Link>
              <UserButton />
            </>
          ) : (
            <>
              <Link 
                href="/sign-in" 
                className="px-4 py-2 rounded-xl text-xs font-semibold text-subtle hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link 
                href="/sign-in" 
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold glass-panel text-white border-white/10 hover:border-emerald-500/40 hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
              >
                Launch Studio
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="relative z-10 w-full flex flex-col">
        <Hero />
      </main>

      {/* Additional Interactive Sections */}
      <Stats />
      <Features />
      <Contact />
      <Footer />
    </div>
  );
}

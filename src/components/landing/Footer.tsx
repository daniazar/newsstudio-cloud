"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative z-10 py-12 text-center text-muted text-xs font-mono border-t border-border/80 bg-surface/40 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-black text-xs">
            R
          </div>
          <span className="font-bold tracking-tight text-foreground text-sm font-sans">
            RubyStudio AI
          </span>
          <span className="text-[10px] text-muted">© 2026 Autonomous Newsroom Orchestrator</span>
        </div>

        <div className="flex items-center gap-6 text-subtle">
          <Link href="/newsroom" className="hover:text-emerald-400 transition-colors">
            Control Center
          </Link>
          <Link href="/pipeline" className="hover:text-emerald-400 transition-colors">
            Pipeline
          </Link>
          <Link href="/personas" className="hover:text-emerald-400 transition-colors">
            Personas
          </Link>
          <Link href="/admin/telemetry" className="hover:text-emerald-400 transition-colors">
            Telemetry
          </Link>
        </div>
      </div>
    </footer>
  );
}

"use client";

import React from "react";

interface BadgeProps {
  variant?: "default" | "success" | "warning" | "error" | "info" | "accent" | "ruby";
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variantStyles = {
  default: "bg-white/5 text-subtle border-border/80",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm shadow-emerald-500/10",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-sm shadow-amber-500/10",
  error: "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-sm shadow-rose-500/10",
  ruby: "bg-rose-500/15 text-rose-300 border-rose-500/30 shadow-sm shadow-rose-500/20",
  info: "bg-sky-500/10 text-sky-400 border-sky-500/20 shadow-sm shadow-sky-500/10",
  accent: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-sm shadow-emerald-500/15",
};

export const Badge: React.FC<BadgeProps> = ({
  variant = "default",
  children,
  className = "",
  dot = false,
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-bold tracking-tight border backdrop-blur-sm ${variantStyles[variant]} ${className}`}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shrink-0" />
      )}
      {children}
    </span>
  );
};

"use client";

import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "emerald-glow" | "ruby-live" | "glass";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  children: React.ReactNode;
}

const variantStyles = {
  primary:
    "bg-accent text-white font-bold hover:bg-accent-hover shadow-lg shadow-accent/20 active:scale-[0.98]",
  "emerald-glow":
    "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold hover:from-emerald-400 hover:to-emerald-500 shadow-lg shadow-emerald-500/25 border border-emerald-400/30 active:scale-[0.98]",
  "ruby-live":
    "bg-gradient-to-r from-rose-600 to-rose-700 text-white font-bold hover:from-rose-500 hover:to-rose-600 shadow-lg shadow-rose-600/30 border border-rose-400/30 active:scale-[0.98]",
  glass:
    "glass-panel text-foreground font-semibold hover:border-white/20 hover:bg-white/10 active:scale-[0.98]",
  secondary:
    "bg-surface-raised text-foreground border border-border hover:border-border-hover hover:bg-surface-overlay active:scale-[0.98]",
  ghost: "text-subtle hover:text-foreground hover:bg-white/5 active:scale-[0.98]",
  danger: "bg-error/10 text-error hover:bg-error/20 border border-error/20 active:scale-[0.98]",
};

const sizeStyles = {
  sm: "px-3 py-1.5 text-xs rounded-xl",
  md: "px-4 py-2 text-sm rounded-xl",
  lg: "px-6 py-3 text-base rounded-2xl",
};

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  isLoading = false,
  className = "",
  children,
  disabled,
  ...props
}) => {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-medium tracking-tight cursor-pointer transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin h-4 w-4 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
};

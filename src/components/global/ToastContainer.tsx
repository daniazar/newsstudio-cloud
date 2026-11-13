"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type ToastType = "success" | "error" | "info" | "warning" | "loading";

export interface Toast {
  id: string;
  title: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (title: string, message: string, type?: ToastType, id?: string) => string;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const isMountedRef = React.useRef(false);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const removeToast = useCallback((id: string) => {
    if (!isMountedRef.current) return;
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (title: string, message: string, type: ToastType = "info", customId?: string) => {
      const id = customId || Math.random().toString(36).substring(2, 9);
      
      // Defer state update out of current render turn to prevent React unmounted/render warnings
      setTimeout(() => {
        if (!isMountedRef.current) return;
        setToasts((prev) => {
          if (customId) {
            const idx = prev.findIndex((t) => t.id === customId);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = { id: customId, title, message, type };
              return next;
            }
          }
          // Deduplicate: If an active toast with identical title & message is already visible, do not duplicate
          if (prev.some((t) => t.title === title && t.message === message)) {
            return prev;
          }
          // Cap to at most 4 concurrent toasts to prevent vertical bombardment
          const trimmed = prev.length >= 4 ? prev.slice(prev.length - 3) : prev;
          return [...trimmed, { id, title, message, type }];
        });
      }, 0);

      // Auto-dismiss after 4 seconds (loading toasts hold for 9s if not resolved)
      const timeoutDuration = type === "loading" ? 9000 : 4000;
      setTimeout(() => {
        removeToast(id);
      }, timeoutDuration);

      return id;
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
            layout
            className="pointer-events-auto w-full backdrop-blur-xl bg-surface/85 border border-border rounded-2xl shadow-xl flex gap-3.5 p-4 overflow-hidden relative"
          >
            {/* Elegant side bar coloring */}
            <div className={`absolute top-0 left-0 w-1.5 h-full ${getTypeColor(toast.type)}`} />

            {/* Icon */}
            <div className="flex-shrink-0 text-xl pt-0.5">
              {getTypeIcon(toast.type)}
            </div>

            {/* Content */}
            <div className="flex-grow space-y-1">
              <h4 className="text-sm font-bold text-foreground tracking-tight leading-tight">
                {toast.title}
              </h4>
              <p className="text-xs text-subtle font-medium leading-normal">
                {toast.message}
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => removeToast(toast.id)}
              aria-label="Close"
              className="flex-shrink-0 text-muted hover:text-foreground text-sm self-start leading-none opacity-60 hover:opacity-100 transition-opacity p-0.5"
            >
              ✕
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function getTypeColor(type: ToastType): string {
  switch (type) {
    case "success":
      return "bg-success animate-pulse";
    case "error":
      return "bg-error";
    case "warning":
      return "bg-warning";
    case "loading":
      return "bg-indigo-500 animate-pulse";
    case "info":
    default:
      return "bg-info";
  }
}

function getTypeIcon(type: ToastType): React.ReactNode {
  switch (type) {
    case "success":
      return "✅";
    case "error":
      return "❌";
    case "warning":
      return "⚠️";
    case "loading":
      return <span className="inline-block animate-spin text-lg">⏳</span>;
    case "info":
    default:
      return "🔔";
  }
}

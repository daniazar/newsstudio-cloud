/**
 * src/components/editor/shared/visuals/components/VeoFailureDiagnosisPanel.tsx
 *
 * Dedicated failure diagnostics alert box for Veo generation errors:
 * detects Google Content Safety policy rejections (bodice, corset, neckline triggers),
 * provides 1-click prompt auto-sanitization, technical stack trace drawer,
 * external link to Google Flow project, and retry actions.
 */

import React from "react";
import { AlertCircle, ShieldCheck, ExternalLink, RefreshCw, Terminal } from "lucide-react";
import { filterPromptForSafety } from "@/lib/ecommerce/promptSafetyFilter";
import { DEFAULT_FLOW_PROJECT_URL } from "../types";
import { openGoogleFlow, inspectFlowErrors } from "@/lib/ecommerce/flowLauncher";

export interface VeoFailureDiagnosisPanelProps {
  veoError: string;
  veoPrompt: string;
  onDismiss: () => void;
  onUpdatePrompt: (prompt: string) => void;
  onSetSuccessMessage: (msg: string | null) => void;
  onRetry: () => void;
}

export const VeoFailureDiagnosisPanel: React.FC<VeoFailureDiagnosisPanelProps> = ({
  veoError,
  veoPrompt,
  onDismiss,
  onUpdatePrompt,
  onSetSuccessMessage,
  onRetry,
}) => {
  const isPolicyViolation =
    veoError.toLowerCase().includes("policy") ||
    veoError.toLowerCase().includes("violate") ||
    veoError.toLowerCase().includes("bodice") ||
    veoError.toLowerCase().includes("corset") ||
    veoError.toLowerCase().includes("safety") ||
    veoPrompt.toLowerCase().includes("bodice") ||
    veoPrompt.toLowerCase().includes("corset");

  const canAutoSanitize =
    filterPromptForSafety(veoPrompt) !== veoPrompt ||
    veoPrompt.toLowerCase().includes("bodice") ||
    veoPrompt.toLowerCase().includes("corset");

  return (
    <div className="rounded-xl border border-rose-500/50 bg-rose-950/40 p-3.5 space-y-2.5 shadow-lg shadow-rose-950/30">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-black text-rose-200 flex items-center gap-1.5 flex-wrap">
              <span>Veo 3.1 Generation Failed</span>
              {isPolicyViolation ? (
                <span className="px-2 py-0.2 rounded-full bg-rose-500/20 border border-rose-500/40 text-[9px] font-bold text-rose-300">
                  🛡️ Google Safety Policy Rejection
                </span>
              ) : (
                <span className="px-2 py-0.2 rounded-full bg-amber-500/20 border border-amber-500/40 text-[9px] font-bold text-amber-300">
                  Cluster Generation Failure
                </span>
              )}
            </div>
            <div className="text-[11px] text-zinc-300 mt-1 leading-snug">
              {isPolicyViolation ? (
                <span>
                  <strong className="text-rose-300">Why it failed:</strong> Google Flow rejected
                  the video under its content safety policy. Words like{" "}
                  <code className="text-rose-300 font-mono font-bold">bodice</code> or{" "}
                  <code className="text-rose-300 font-mono font-bold">corset</code>, or revealing
                  reference photo necklines trigger automated policy drops.
                </span>
              ) : (
                <span>
                  <strong className="text-rose-300">Why it failed:</strong>{" "}
                  {veoError.split("\n")[0]}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="text-zinc-400 hover:text-white text-xs p-1 cursor-pointer transition-colors"
          title="Dismiss alert"
        >
          ✕
        </button>
      </div>

      {/* Technical Snippet Drawer */}
      <div className="bg-black/70 rounded-md p-2 font-mono text-[9px] text-rose-300/80 max-h-20 overflow-y-auto custom-scrollbar border border-rose-950/80 leading-relaxed whitespace-pre-wrap">
        {veoError}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-rose-500/20">
        <div className="flex items-center gap-1.5 flex-wrap">
          {canAutoSanitize && (
            <button
              type="button"
              onClick={() => {
                const sanitized = filterPromptForSafety(veoPrompt);
                onUpdatePrompt(sanitized);
                onDismiss();
                onSetSuccessMessage(
                  "🛡️ Prompt auto-sanitized: 'bodice' replaced with tailored velvet blazer!"
                );
              }}
              className="px-2.5 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Auto-Sanitize & Fix Prompt</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => openGoogleFlow(DEFAULT_FLOW_PROJECT_URL)}
            className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
            title="Open Google Flow project in browser and bring active automation session to front"
          >
            <ExternalLink className="h-3 w-3 text-blue-400" />
            <span>View in Google Flow</span>
          </button>

          <button
            type="button"
            onClick={() => inspectFlowErrors(DEFAULT_FLOW_PROJECT_URL)}
            className="px-2.5 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
            title="Inspect real-time remote DevTools console, network activity, and interactive live screencast of the Flow browser"
          >
            <Terminal className="h-3 w-3 text-amber-400" />
            <span>Inspect Errors (DevTools)</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            onDismiss();
            onRetry();
          }}
          className="px-2.5 py-1 rounded-md bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          <span>Retry Generation</span>
        </button>
      </div>
    </div>
  );
};

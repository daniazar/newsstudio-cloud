/**
 * src/components/ecommerce/turntable3d/TurntableViewer.tsx
 *
 * SSR-safe interactive GLB viewer for the 3D Product Turntable mode
 * (PRD §10 "Interactive 3D Viewer Component", FR-04.3).
 *
 * three.js / React Three Fiber touch `window` and WebGL at import time, so the
 * actual scene (`TurntableViewerScene`) is code-split and loaded client-only via
 * `next/dynamic({ ssr: false })`. This wrapper also owns the error boundary, so
 * a broken GLB, a failed chunk load, or a missing WebGL context all render the
 * same recoverable "3D model failed to load" state.
 */

"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Loader, RefreshCw, TriangleAlert } from "lucide-react";
import type { TurntableViewerSceneProps } from "./TurntableViewerScene";

export type TurntableViewerProps = TurntableViewerSceneProps & {
  /** Called from the error state's "Re-generate" action. */
  onRegenerate?: () => void;
};

function ViewerSpinner() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-400">
      <Loader className="h-6 w-6 animate-spin text-cyan-400" />
      <span className="text-[10px] font-mono uppercase tracking-wider">Starting 3D viewer…</span>
    </div>
  );
}

const TurntableViewerScene = dynamic(() => import("./TurntableViewerScene"), {
  ssr: false,
  loading: () => <ViewerSpinner />,
});

interface ViewerErrorBoundaryProps {
  onRetry: () => void;
  onRegenerate?: () => void;
  children: React.ReactNode;
}

interface ViewerErrorBoundaryState {
  error: Error | null;
}

class ViewerErrorBoundary extends React.Component<ViewerErrorBoundaryProps, ViewerErrorBoundaryState> {
  state: ViewerErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ViewerErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[TurntableViewer] Failed to load 3D model:", error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center">
        <TriangleAlert className="h-6 w-6 text-amber-400" />
        <p className="text-xs font-bold text-zinc-100">3D model failed to load — try re-generating</p>
        <p className="max-w-[90%] truncate text-[10px] font-mono text-zinc-500" title={this.state.error.message}>
          {this.state.error.message}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <button
            type="button"
            // The parent re-keys this boundary after clearing the loader cache.
            onClick={this.props.onRetry}
            className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-800"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
          {this.props.onRegenerate && (
            <button
              type="button"
              onClick={this.props.onRegenerate}
              className="flex items-center gap-1 rounded-md bg-cyan-500 px-2.5 py-1 text-[11px] font-bold text-black hover:bg-cyan-400"
            >
              Re-generate
            </button>
          )}
        </div>
      </div>
    );
  }
}

export function TurntableViewer({ onRegenerate, ...sceneProps }: TurntableViewerProps) {
  const [attempt, setAttempt] = React.useState(0);

  const handleRetry = React.useCallback(() => {
    // Drop the cached (failed) loader result so useGLTF refetches.
    void import("@react-three/drei")
      .then(({ useGLTF }) => useGLTF.clear(sceneProps.meshUrl))
      .catch(() => undefined)
      .finally(() => setAttempt((n) => n + 1));
  }, [sceneProps.meshUrl]);

  return (
    <ViewerErrorBoundary
      // Reset the boundary whenever a different model (or a retry) is requested.
      key={`${sceneProps.meshUrl}#${attempt}`}
      onRetry={handleRetry}
      onRegenerate={onRegenerate}
    >
      <TurntableViewerScene {...sceneProps} />
    </ViewerErrorBoundary>
  );
}

export default TurntableViewer;

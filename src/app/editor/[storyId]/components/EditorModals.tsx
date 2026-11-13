"use client";

import React from "react";
import { Button } from "@/components/ui/Button";

interface EditorModalsProps {
  showRenderConfirm: boolean;
  onCancelRenderConfirm: () => void;
  onProceedRenderConfirm: () => void;

  showStopRenderConfirm: boolean;
  onCancelStopRender: () => void;
  onProceedStopRender: () => void;

  deleteSceneTarget: { id: string } | null;
  onCancelDeleteScene: () => void;
  onProceedDeleteScene: (segmentId: string) => void;
}

export const EditorModals: React.FC<EditorModalsProps> = ({
  showRenderConfirm,
  onCancelRenderConfirm,
  onProceedRenderConfirm,
  showStopRenderConfirm,
  onCancelStopRender,
  onProceedStopRender,
  deleteSceneTarget,
  onCancelDeleteScene,
  onProceedDeleteScene,
}) => {
  return (
    <>
      {/* Re-render Confirmation Modal */}
      {showRenderConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="bg-surface border border-border rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-2xl">
                🎬
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Replace existing video?</h3>
                <p className="text-sm text-muted">
                  A completed video already exists for this story. Re-rendering will replace the current file.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={onCancelRenderConfirm}>
                Cancel
              </Button>
              <Button variant="primary" className="flex-1" onClick={onProceedRenderConfirm}>
                Re-render & Replace
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stop Render Confirmation Modal */}
      {showStopRenderConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="bg-surface border border-red-500/30 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-2xl">
                🛑
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Stop rendering?</h3>
                <p className="text-sm text-muted">
                  This will immediately terminate the production render. You will need to start over from the beginning.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={onCancelStopRender}>
                Continue Rendering
              </Button>
              <Button variant="danger" className="flex-1" onClick={onProceedStopRender}>
                Yes, Stop
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Scene Confirmation Modal */}
      {deleteSceneTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="bg-surface border border-red-500/30 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-2xl">
                🗑️
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Delete this scene?</h3>
                <p className="text-sm text-muted">
                  This action cannot be undone. The video timeline will be automatically adjusted to close the gap.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={onCancelDeleteScene}>
                Keep Scene
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => onProceedDeleteScene(deleteSceneTarget.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

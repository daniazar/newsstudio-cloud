"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Bookmark,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Video,
  Layers,
  Check,
  Plus,
  Play,
  Trash2,
  Link as LinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  PersonaLook,
  PersonaLookCategory,
  PoseTag,
  PersonaLookLoopItem,
  PERSONA_LOOK_CATEGORIES,
  DEFAULT_POSE_SLOTS,
} from "@/lib/wardrobe/personaLookTypes";

export interface RecentJobItem {
  id: string;
  outfitName?: string;
  outputPublicUrl?: string | null;
  config?: {
    outfitName?: string;
    outputPublicUrl?: string;
    sourceVideoPath?: string;
  };
}

export interface SavePersonaLookModalProps {
  isOpen: boolean;
  onClose: () => void;
  personaId: string;
  personaName: string;
  videoUrl: string;
  thumbnailUrl?: string;
  outfitName: string;
  outfitId?: string;
  hairstyleName?: string;
  hairstyleId?: string;
  hairColorSwatch?: string;
  lightingPreset?: string;
  poseTag?: PoseTag;
  existingLoops?: Record<string, PersonaLookLoopItem>;
  existingLooks?: PersonaLook[];
  recentJobs?: RecentJobItem[];
  onLookSaved?: (look: PersonaLook) => void;
}

export const SavePersonaLookModal = React.memo(function SavePersonaLookModal({
  isOpen,
  onClose,
  personaId,
  personaName,
  videoUrl,
  thumbnailUrl,
  outfitName,
  outfitId,
  hairstyleName,
  hairstyleId,
  hairColorSwatch,
  lightingPreset,
  poseTag = "M1",
  existingLoops,
  existingLooks: propExistingLooks,
  recentJobs: propRecentJobs,
  onLookSaved,
}: SavePersonaLookModalProps) {
  // Mode: creating a brand new look vs updating an existing saved look
  const [saveMode, setSaveMode] = useState<"new" | "update">("new");
  const [selectedExistingLookId, setSelectedExistingLookId] = useState<string>("");
  const [availableLooks, setAvailableLooks] = useState<PersonaLook[]>(propExistingLooks || []);
  const [availableJobs, setAvailableJobs] = useState<RecentJobItem[]>(propRecentJobs || []);

  // Form state
  const [lookTitle, setLookTitle] = useState(() =>
    hairstyleName
      ? `${personaName} — ${outfitName} & ${hairstyleName}`
      : `${personaName} — ${outfitName}`
  );
  const [category, setCategory] = useState<PersonaLookCategory>("prime_time");
  const [isDefault, setIsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Active pose tag for the transformed video
  const [activeTransformedPose, setActiveTransformedPose] = useState<PoseTag>(() => poseTag || "M1");
  const [previewSlot, setPreviewSlot] = useState<PoseTag>(() => poseTag || "M1");

  // Multi-loop set state
  const [configuredLoops, setConfiguredLoops] = useState<Record<string, PersonaLookLoopItem>>(() => {
    const initialSlot = poseTag || "M1";
    const defaultAction =
      initialSlot === "M2"
        ? "state_explanatory_right"
        : initialSlot === "M3"
        ? "state_intro_welcome"
        : "state_idle";

    return {
      ...(existingLoops || {}),
      [initialSlot]: {
        poseTag: initialSlot,
        actionName: defaultAction,
        videoUrl,
        isPrimary: initialSlot === "M1",
      },
    };
  });

  // Custom URL input toggle per slot
  const [customUrlSlot, setCustomUrlSlot] = useState<PoseTag | null>(null);
  const [customUrlInput, setCustomUrlInput] = useState<string>("");

  // Fetch saved looks and recent jobs if not provided via props
  const fetchAuxiliaryData = useCallback(async () => {
    if (!personaId) return;

    if (!propExistingLooks || propExistingLooks.length === 0) {
      try {
        const res = await fetch(`/api/wardrobe/looks?personaId=${encodeURIComponent(personaId)}`);
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.looks)) {
          setAvailableLooks(data.looks);
        }
      } catch {
        // ignore
      }
    } else {
      setAvailableLooks(propExistingLooks);
    }

    if (!propRecentJobs || propRecentJobs.length === 0) {
      try {
        const res = await fetch("/api/wardrobe/inpaint");
        const data = await res.json();
        if (res.ok && Array.isArray(data.recentJobs)) {
          setAvailableJobs(data.recentJobs);
        }
      } catch {
        // ignore
      }
    } else {
      setAvailableJobs(propRecentJobs);
    }
  }, [personaId, propExistingLooks, propRecentJobs]);

  // Reset and auto-populate state when modal opens
  useEffect(() => {
    if (isOpen) {
      const title = hairstyleName
        ? `${personaName} — ${outfitName} & ${hairstyleName}`
        : `${personaName} — ${outfitName}`;
      setLookTitle(title);
      setCategory("prime_time");
      setActiveTransformedPose(poseTag || "M1");
      setPreviewSlot(poseTag || "M1");
      setIsDefault(false);
      setError(null);
      setSavedSuccess(false);
      setIsSaving(false);
      setSaveMode("new");
      setSelectedExistingLookId("");
      setCustomUrlSlot(null);
      setCustomUrlInput("");

      const initialSlot = poseTag || "M1";
      const defaultAction =
        initialSlot === "M2"
          ? "state_explanatory_right"
          : initialSlot === "M3"
          ? "state_intro_welcome"
          : "state_idle";

      const initialLoops: Record<string, PersonaLookLoopItem> = {
        ...(existingLoops || {}),
        [initialSlot]: {
          poseTag: initialSlot,
          actionName: defaultAction,
          videoUrl,
          isPrimary: initialSlot === "M1",
        },
      };

      setConfiguredLoops(initialLoops);
      fetchAuxiliaryData();
    }
  }, [isOpen, personaName, outfitName, hairstyleName, poseTag, videoUrl, existingLoops, fetchAuxiliaryData]);

  if (!isOpen) return null;

  const configuredCount = Object.keys(configuredLoops).length;
  const isFullSuite = configuredCount >= 3;

  // Active preview video URL in the header card
  const rawPreviewUrl =
    configuredLoops[previewSlot]?.videoUrl ||
    configuredLoops[activeTransformedPose]?.videoUrl ||
    videoUrl;
  const currentPreviewUrl = rawPreviewUrl
    ? rawPreviewUrl.replace(/^public[\\/]/, "").replace(/^([^/])/, "/$1")
    : "";

  // Switch which pose tag the active transformed inpaint video is bound to
  const handleSelectTransformedPose = (newPose: PoseTag) => {
    setActiveTransformedPose(newPose);
    setPreviewSlot(newPose);

    const defaultAction =
      newPose === "M2"
        ? "state_explanatory_right"
        : newPose === "M3"
        ? "state_intro_welcome"
        : "state_idle";

    setConfiguredLoops((prev) => {
      const next = { ...prev };
      // Assign active transformed video to new pose
      next[newPose] = {
        poseTag: newPose,
        actionName: defaultAction,
        videoUrl,
        isPrimary: newPose === "M1",
      };
      return next;
    });
  };

  // Detach / mark pending for a specific slot
  const handleDetachSlot = (slotTag: PoseTag, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfiguredLoops((prev) => {
      const next = { ...prev };
      delete next[slotTag];
      return next;
    });
    if (previewSlot === slotTag) {
      setPreviewSlot(activeTransformedPose);
    }
  };

  // Attach active inpaint video to a slot
  const handleAttachActiveToSlot = (slotTag: PoseTag, defaultAction: string) => {
    setPreviewSlot(slotTag);
    setConfiguredLoops((prev) => ({
      ...prev,
      [slotTag]: {
        poseTag: slotTag,
        actionName: defaultAction,
        videoUrl,
        isPrimary: slotTag === "M1",
      },
    }));
  };

  // Attach a completed job video to a slot
  const handleAttachJobVideo = (slotTag: PoseTag, defaultAction: string, jobUrl: string) => {
    const cleanUrl = jobUrl.replace(/^public[\\/]/, "").replace(/^([^/])/, "/$1");
    setPreviewSlot(slotTag);
    setConfiguredLoops((prev) => ({
      ...prev,
      [slotTag]: {
        poseTag: slotTag,
        actionName: defaultAction,
        videoUrl: cleanUrl,
        isPrimary: slotTag === "M1",
      },
    }));
  };

  // Attach custom URL to slot
  const handleAttachCustomUrl = (slotTag: PoseTag, defaultAction: string) => {
    if (!customUrlInput.trim()) return;
    const cleanUrl = customUrlInput.trim().replace(/^public[\\/]/, "").replace(/^([^/])/, "/$1");
    setPreviewSlot(slotTag);
    setConfiguredLoops((prev) => ({
      ...prev,
      [slotTag]: {
        poseTag: slotTag,
        actionName: defaultAction,
        videoUrl: cleanUrl,
        isPrimary: slotTag === "M1",
      },
    }));
    setCustomUrlSlot(null);
    setCustomUrlInput("");
  };

  // Handle switching to Update Existing Look mode
  const handleSelectExistingLookToUpdate = (lookId: string) => {
    setSelectedExistingLookId(lookId);
    const found = availableLooks.find((l) => l.id === lookId);
    if (found) {
      setLookTitle(found.lookName);
      setCategory(found.category);
      setIsDefault(Boolean(found.isDefault));

      // Merge existing look's loops with the active inpaint loop
      const defaultAction =
        activeTransformedPose === "M2"
          ? "state_explanatory_right"
          : activeTransformedPose === "M3"
          ? "state_intro_welcome"
          : "state_idle";

      setConfiguredLoops({
        ...(found.loops || {}),
        [activeTransformedPose]: {
          poseTag: activeTransformedPose,
          actionName: defaultAction,
          videoUrl,
          isPrimary: activeTransformedPose === "M1",
        },
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookTitle.trim()) {
      setError("Please enter a title for this look.");
      return;
    }

    if (Object.keys(configuredLoops).length === 0) {
      setError("Please attach at least one action loop video to this look.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const primaryUrl =
        configuredLoops.M1?.videoUrl ||
        configuredLoops[activeTransformedPose]?.videoUrl ||
        Object.values(configuredLoops)[0]?.videoUrl ||
        videoUrl;

      const payload = {
        id: saveMode === "update" && selectedExistingLookId ? selectedExistingLookId : undefined,
        personaId,
        lookName: lookTitle.trim(),
        category,
        videoUrl: primaryUrl,
        primaryVideoUrl: primaryUrl,
        loops: configuredLoops,
        thumbnailUrl: thumbnailUrl || undefined,
        outfitName,
        outfitId: outfitId || undefined,
        hairstyleName: hairstyleName || undefined,
        hairstyleId: hairstyleId || undefined,
        hairColorSwatch: hairColorSwatch || undefined,
        lightingPreset: lightingPreset || undefined,
        poseTag: activeTransformedPose,
        isDefault,
        metadata: {
          savedFromStudio: true,
          savedAt: new Date().toISOString(),
          configuredLoopCount: Object.keys(configuredLoops).length,
          isFullSuite,
          saveMode,
        },
      };

      const res = await fetch("/api/wardrobe/looks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save persona look.");
      }

      setSavedSuccess(true);
      if (onLookSaved) {
        onLookSaved(data.look);
      }

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="glass-panel-raised border border-border/80 w-full max-w-2xl rounded-3xl p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/40">
              <Bookmark className="w-4 h-4 fill-amber-300/40" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>Save as Persona Look</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    isFullSuite
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-purple-500/20 text-purple-300 border-purple-500/30"
                  }`}
                >
                  {isFullSuite ? "3/3 Full Broadcast Suite" : `${configuredCount}/3 Loops Configured`}
                </span>
              </h3>
              <p className="text-[10px] font-mono text-muted">
                Bundle Full-Mesh FSM action loops into {personaName}&apos;s broadcast vault
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close save look modal"
            className="p-1 rounded-lg text-muted hover:text-white hover:bg-surface-raised transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Preview & Details Strip */}
        <div className="p-3.5 rounded-2xl bg-surface/60 border border-border/80 flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative w-28 sm:w-32 aspect-[9/16] rounded-xl overflow-hidden bg-black border border-purple-500/40 shadow-md shrink-0">
            {currentPreviewUrl ? (
              <video
                key={currentPreviewUrl}
                src={currentPreviewUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted">
                <Video className="w-6 h-6 text-purple-400" />
              </div>
            )}
            <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[8px] font-mono text-white flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{previewSlot} Preview</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-2 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>{personaName}</span>
            </div>
            <div className="text-[11px] font-mono text-foreground">
              <span className="text-muted">Outfit:</span>{" "}
              <span className="font-semibold text-white">{outfitName}</span>
            </div>
            {hairstyleName && (
              <div className="text-[11px] font-mono text-foreground">
                <span className="text-muted">Hairstyle:</span>{" "}
                <span className="font-semibold text-white">{hairstyleName}</span>
              </div>
            )}
            {hairColorSwatch && (
              <div className="text-[11px] font-mono text-foreground flex items-center gap-1.5">
                <span className="text-muted">Hair Color:</span>
                <span
                  className="w-2.5 h-2.5 rounded-full border border-white/40"
                  style={{ backgroundColor: hairColorSwatch }}
                />
                <span className="font-semibold text-white">{hairColorSwatch}</span>
              </div>
            )}
            {lightingPreset && (
              <div className="text-[11px] font-mono text-foreground">
                <span className="text-muted">Lighting:</span>{" "}
                <span className="font-semibold text-white">{lightingPreset}</span>
              </div>
            )}
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          {/* Mode Selector: Create New vs Update Existing Look */}
          {availableLooks.length > 0 && (
            <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-surface/40 border border-border/70">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted">
                  Look Vault Target
                </span>
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => {
                      setSaveMode("new");
                      setSelectedExistingLookId("");
                    }}
                    className={`px-2.5 py-0.5 rounded-lg border transition-all ${
                      saveMode === "new"
                        ? "bg-purple-600 text-white border-purple-500 font-bold shadow-sm"
                        : "text-muted hover:text-white border-transparent"
                    }`}
                  >
                    + Create New Look
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSaveMode("update");
                      if (availableLooks.length > 0) {
                        handleSelectExistingLookToUpdate(availableLooks[0].id);
                      }
                    }}
                    className={`px-2.5 py-0.5 rounded-lg border transition-all ${
                      saveMode === "update"
                        ? "bg-purple-600 text-white border-purple-500 font-bold shadow-sm"
                        : "text-muted hover:text-white border-transparent"
                    }`}
                  >
                    ↻ Update Existing Look
                  </button>
                </div>
              </div>

              {saveMode === "update" && (
                <div className="pt-2">
                  <select
                    value={selectedExistingLookId}
                    onChange={(e) => handleSelectExistingLookToUpdate(e.target.value)}
                    className="w-full bg-surface-raised border border-border/80 rounded-xl px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-purple-500"
                  >
                    {availableLooks.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.lookName} ({Object.keys(l.loops || {}).length}/3 Loops configured)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Active Inpainted Video Pose Tag Selector Pills */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-purple-400" />
                <span>Active Video Motion Beat</span>
              </span>
              <span className="text-[10px] font-mono text-purple-300">
                Assigns active inpaint result to this pose
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(["M1", "M2", "M3"] as PoseTag[]).map((tag) => {
                const isSelected = activeTransformedPose === tag;
                const slotMeta = DEFAULT_POSE_SLOTS.find((s) => s.poseTag === tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleSelectTransformedPose(tag)}
                    aria-pressed={isSelected}
                    className={`p-2 rounded-xl text-left border transition-all flex flex-col gap-0.5 ${
                      isSelected
                        ? "bg-purple-600/30 border-purple-500 text-white ring-1 ring-purple-500/50 shadow-md"
                        : "bg-surface-raised border-border/60 text-muted hover:text-white hover:border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-mono">{tag}</span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                    </div>
                    <span className="text-[10px] font-medium text-foreground truncate">
                      {slotMeta?.label.split(": ")[1] || tag}
                    </span>
                    <span className="text-[9px] font-mono text-muted truncate">
                      {slotMeta?.actionName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Editable Look Title */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="look-title-input"
              className="text-xs font-mono font-bold uppercase tracking-wider text-muted"
            >
              Look Name / Title
            </label>
            <input
              id="look-title-input"
              type="text"
              value={lookTitle}
              onChange={(e) => setLookTitle(e.target.value)}
              placeholder="e.g. Ruby Vance — Emerald Velvet Tuxedo & Honey Bob"
              required
              className="w-full bg-surface-raised border border-border/80 rounded-xl px-3.5 py-2 text-xs font-mono text-foreground placeholder:text-muted focus:outline-none focus:border-purple-500/80 transition-all shadow-inner"
            />
          </div>

          {/* Full-Mesh FSM Multi-Loop Set Slots */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>Finite State Machine (FSM) Loop Set</span>
              </span>
              <span className="text-[10px] font-mono text-muted">
                3 boundary-locked beats for broadcast switching
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {DEFAULT_POSE_SLOTS.map((slot) => {
                const isAttached = Boolean(configuredLoops[slot.poseTag]);
                const isPreview = previewSlot === slot.poseTag;
                const isTransformedActive = activeTransformedPose === slot.poseTag;

                // Completed jobs with video outputs to attach
                const attachableJobs = availableJobs.filter(
                  (j) => j.outputPublicUrl || j.config?.outputPublicUrl
                );

                return (
                  <div
                    key={slot.poseTag}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-2 relative ${
                      isPreview
                        ? "bg-purple-600/20 border-purple-500 ring-1 ring-purple-500/40"
                        : isAttached
                        ? "bg-surface-raised border-emerald-500/40 hover:border-emerald-500/60"
                        : "bg-surface/40 border-border/60 hover:border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-foreground">{slot.label}</span>
                        {isTransformedActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Active Transformed Loop" />
                        )}
                      </div>
                      {isAttached ? (
                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/30 flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5" />
                          Ready
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono text-amber-300/80 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/30">
                          Pending
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-0.5 text-[9px] font-mono text-muted">
                      <span className="text-purple-300 truncate">{slot.actionName}</span>
                      <span className="line-clamp-1">{slot.description}</span>
                    </div>

                    {/* Slot Controls */}
                    <div className="flex flex-col gap-1.5 pt-1 border-t border-border/40 text-[10px] font-mono">
                      {isAttached ? (
                        <div className="flex items-center justify-between gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewSlot(slot.poseTag)}
                            className="text-purple-300 hover:text-white flex items-center gap-1 transition-colors"
                          >
                            <Play className="w-2.5 h-2.5 fill-purple-400" />
                            <span>Preview</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDetachSlot(slot.poseTag, e)}
                            className="text-muted hover:text-red-400 flex items-center gap-0.5 transition-colors"
                            aria-label={`Detach loop ${slot.poseTag}`}
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                            <span>Detach</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => handleAttachActiveToSlot(slot.poseTag, slot.actionName)}
                            className="px-2 py-1 rounded bg-purple-600/30 text-purple-200 hover:bg-purple-600/50 border border-purple-500/40 flex items-center justify-center gap-1 text-[10px] font-mono font-bold transition-all"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Attach Active Video</span>
                          </button>

                          {attachableJobs.length > 0 && (
                            <select
                              aria-label={`Attach recent job to ${slot.poseTag}`}
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleAttachJobVideo(slot.poseTag, slot.actionName, e.target.value);
                                }
                              }}
                              className="w-full bg-surface-raised border border-border/70 rounded px-1.5 py-0.5 text-[9px] font-mono text-muted hover:text-white focus:outline-none"
                            >
                              <option value="" disabled>
                                ⌛ Attach Recent Job...
                              </option>
                              {attachableJobs.map((j) => (
                                <option
                                  key={j.id}
                                  value={j.outputPublicUrl || j.config?.outputPublicUrl || ""}
                                >
                                  {j.outfitName || j.config?.outfitName || j.id.slice(0, 10)}
                                </option>
                              ))}
                            </select>
                          )}

                          {customUrlSlot === slot.poseTag ? (
                            <div className="flex items-center gap-1 pt-1">
                              <input
                                type="text"
                                value={customUrlInput}
                                onChange={(e) => setCustomUrlInput(e.target.value)}
                                placeholder="Paste video URL..."
                                className="w-full bg-black/60 border border-border rounded px-1.5 py-0.5 text-[9px] font-mono text-white focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleAttachCustomUrl(slot.poseTag, slot.actionName)}
                                className="p-1 rounded bg-emerald-600 text-white text-[9px]"
                              >
                                <Check className="w-2.5 h-2.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setCustomUrlSlot(null)}
                                className="p-1 rounded bg-surface text-muted hover:text-white text-[9px]"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setCustomUrlSlot(slot.poseTag);
                                setCustomUrlInput("");
                              }}
                              className="text-muted hover:text-purple-300 text-[9px] flex items-center justify-center gap-1 transition-colors"
                            >
                              <LinkIcon className="w-2.5 h-2.5" />
                              <span>Custom URL</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Broadcast Category Pills */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted">
              Broadcast Category
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PERSONA_LOOK_CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    aria-pressed={isSelected}
                    className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all text-left flex flex-col gap-0.5 border ${
                      isSelected
                        ? "bg-purple-600/30 border-purple-500 text-white shadow-md shadow-purple-600/20"
                        : "bg-surface-raised border-border/60 text-muted hover:text-white hover:border-border"
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className="text-[9px] font-normal text-muted truncate">
                      {cat.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Set as Default Checkbox */}
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-surface/40 border border-border/60 cursor-pointer select-none hover:bg-surface transition-colors">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-surface-raised border-border/80"
            />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground">
                Set as Default Look for this Persona
              </span>
              <span className="text-[10px] font-mono text-muted">
                Pre-selected whenever {personaName} is cast in new stories and scripts
              </span>
            </div>
          </label>

          {/* Feedback states */}
          {error && (
            <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/50 flex items-center gap-2 text-xs font-mono text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {savedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/50 flex items-center gap-2 text-xs font-mono text-emerald-300 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>✓ Successfully saved {configuredCount}-loop suite to {personaName}&apos;s Persona Look Vault!</span>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
              className="text-xs font-mono"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="emerald-glow"
              size="sm"
              isLoading={isSaving}
              disabled={savedSuccess}
              className="text-xs font-mono flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Look...</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                  <span>Save to Persona Vault</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
});

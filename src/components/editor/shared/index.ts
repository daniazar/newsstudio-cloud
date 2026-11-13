/**
 * src/components/editor/shared/index.ts
 *
 * Centralized export hub for the Unified Video Editor Architecture.
 * Shared across News Studio (app/editor/[storyId]) and E-Commerce Studio (app/ecommerce-studio).
 */

// Hooks
export * from "./hooks/useAudioAudition";
export * from "./hooks/usePlayerTransport";
export * from "./hooks/useSafeZones";
export * from "./hooks/useUndoRedo";

// Header & Action Hub Suite
export * from "./header/EditorActionHub";

// Timeline Suite
export * from "./timeline/TimelineSceneAdapter";
export * from "./timeline/UnifiedTimeline";
export * from "./timeline/TimelineRuler";
export * from "./timeline/TimelinePlayhead";
export * from "./timeline/SceneBlock";
export * from "./timeline/StoryboardReorderModal";

// Persona & Presenter Suite
export * from "./persona/PresenterPlacementControls";
export * from "./persona/ScenePresenterControls";
export * from "./persona/UltimatePersonaPicker";
export * from "./persona/LipSyncStudioCard";
export * from "./persona/BatchPresenterScenesCard";
export * from "./presenter/types";

// Voice & Speech Suite
export * from "./voice/VoiceModelSelector";
export * from "./voice/SpeechCadenceToolbar";
export * from "./voice/AudioMixerSection";
export * from "./voice/MusicGalleryModal";
export * from "./voice/BatchVoiceGenerationCard";

// Player & Viewport Suite
export * from "./player/PlayerViewport";
export * from "./player/SafeZonesOverlay";
export * from "./player/EditorCanvasGizmo";
export * from "./player/EditorLayerTree";
export * from "./player/PlayerTransportControls";

// Visuals, B-Roll & Overlays Suite
export * from "./media/UnifiedMediaStudioModal";
export * from "./visuals/AssetGalleryModal";
export * from "./visuals/KinematicCameraToolbar";
export * from "./visuals/OverlaysStudioSection";
export * from "./visuals/SceneVisualsPicker";
export * from "./visuals/AutoMatchAssetsCard";
export * from "./backdrop/GlobalBackdropPicker";

// Export & Distribution Suite
export * from "./export/OmnichannelExportModal";
export * from "./export/LocalizationMatrixModal";
export * from "./export/SocialPublishModal";

// Teleprompter & Live Speech Suite
export * from "./teleprompter/IlluminatedScriptTeleprompter";

// Shortcuts & Help Suite
export * from "./shortcuts/KeyboardShortcutsModal";

// Intro & Outro Suite
export * from "./intro-outro/IntroOutroStudioSection";

/**
 * src/lib/ai/comfyClient.ts
 *
 * Proxy entry point for the ComfyUI client library.
 * Re-exports everything from the modular submodules under src/lib/ai/comfy/
 * to maintain complete backward compatibility with the rest of the application.
 */

export * from "./comfy/types";
export * from "./comfy/utils";
export * from "./comfy/api";
export * from "./comfy/workflowBuilder";
export * from "./comfy/imageGen";
export * from "./comfy/videoGen";
export * from "./comfy/comfyLauncher";
export * from "./comfy/generationLock";
export * from "./comfy/wardrobeInpaintWorkflow";
export * from "./comfy/hairstyleInpaintWorkflow";
export * from "./comfy/compoundInpaintWorkflow";
export * from "./comfy/personaSwapWorkflow";


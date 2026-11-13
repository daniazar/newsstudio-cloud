/**
 * scripts/gemini-cli/types.ts
 *
 * Domain types and interfaces for the Gemini Image Generation & Multi-Reference Compositor CLI.
 */

import { Persona } from "../../src/lib/tts/personas";

export interface PersonaAttire {
  id: string;
  label: string;
  description: string;
  relativePath?: string;
  personaId?: string; // If tied to a specific persona
  category?: "broadcast" | "edgy_leather" | "casual" | "gala" | "sport_fitness" | "techwear";
}

export interface HairstylePreset {
  id: string;
  label: string;
  prompt: string;
  category?: "waves" | "straight" | "updo" | "short" | "braids" | "signature";
}

export interface StudioPlate {
  id: string;
  label: string;
  relativePath: string;
  description: string;
  zone?: string;
  isChroma?: boolean;
}

export interface CameraPreset {
  id: string;
  label: string;
  cameraAngle: string;
  lens: string;
  framing: string;
  defaultPose: string;
}

export interface ExpressionPreset {
  id: string;
  label: string;
  prompt: string;
}

export interface GesturePreset {
  id: string;
  label: string;
  prompt: string;
  category: "seated" | "standing" | "lounge" | "all";
}

export interface CompositeSceneConfig {
  persona: Persona;
  studioPlateKey: string;
  wardrobeKey: string;
  cameraPresetKey: string;
  aspectRatio: string;
  hairstyleKey?: string;
  customHairstyle?: string;
  lightingKey?: string;
  chromaMode?: "auto" | "green" | "blue" | "none";
  expressionKey?: string;
  customExpression?: string;
  gestureKey?: string;
  customGesture?: string;
  customAttire?: string;
  customBackdrop?: string;
  propKey?: string;
  customProp?: string;
  fabricKey?: string;
  colorKey?: string;
  arGraphicsKey?: string;
  todKey?: string;
  imageName?: string;
  saveToDb?: boolean;
  transparent?: boolean;
  engine: "agy" | "api" | "tool_json";
  hasPersonaImageRef?: boolean;
  hasAttireImageRef?: boolean;
  hasStudioImageRef?: boolean;
  rejuvenate?: string | number | boolean;
  glamourLevel?: string;
  genderSwap?: boolean;
  bodyMod?: string;
}



export interface CompiledScenePrompt {
  prompt: string;
  imagePaths: string[];
  baseName: string;
  aspectRatio: string;
  outputPath?: string;
}


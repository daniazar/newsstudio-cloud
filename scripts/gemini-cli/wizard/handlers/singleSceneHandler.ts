/**
 * scripts/gemini-cli/wizard/handlers/singleSceneHandler.ts
 */

import prompts from "prompts";
import { Persona } from "../../../../src/lib/tts/personas";
import { CAMERA_ARRAY_PRESETS } from "../../cameraPresets";
import { EXPRESSION_PRESETS } from "../../expressionPresets";
import { GESTURE_PRESETS } from "../../gesturePresets";
import { BROADCAST_PROPS, TEXTILE_FABRICS, COLOR_SWAPS, AR_HOLOGRAPHIC_GRAPHICS } from "../../propsAndFabrics";
import { CompositeSceneConfig } from "../../types";
import {
  promptStudioSelection,
  promptAttireSelection,
  promptChromaSelection,
  promptHairstyleSelection,
  promptLightingSelection,
  promptAspectSelection,
  promptEngineSelection,
  promptBooleanSelection,
} from "../commonPrompts";

export async function handleSingleSceneConfigPrompt(
  persona: Persona,
  initialStudioKey?: string,
  initialCameraKey?: string
): Promise<{ config: CompositeSceneConfig; engine: "agy" | "api" | "tool_json" } | null> {
  const studioKey = initialStudioKey || (await promptStudioSelection());
  if (!studioKey) return null;

  const attireRes = await promptAttireSelection(persona);
  const hairRes = await promptHairstyleSelection(persona);

  const camRes = await prompts({
    type: "select",
    name: "camera",
    message: "Select Studio Camera Angle & Lens Framing:",
    initial: initialCameraKey ? Math.max(0, Object.keys(CAMERA_ARRAY_PRESETS).indexOf(initialCameraKey)) : 0,
    choices: Object.entries(CAMERA_ARRAY_PRESETS).map(([k, v]) => ({
      title: v.label,
      value: k,
    })),
  });
  if (!camRes.camera) return null;

  const lightKey = await promptLightingSelection();
  const chromaMode = await promptChromaSelection();

  // Expression
  const exprRes = await prompts({
    type: "select",
    name: "expr",
    message: "Select Anchor Facial Expression:",
    choices: [
      ...Object.entries(EXPRESSION_PRESETS).map(([k, v]) => ({
        title: v.label,
        value: k,
      })),
      { title: "✏️ Custom Expression Prompt", value: "custom" },
    ],
  });

  let expressionKey = exprRes.expr !== "custom" ? exprRes.expr : undefined;
  let customExpression: string | undefined;
  if (exprRes.expr === "custom") {
    const cExpr = await prompts({
      type: "text",
      name: "text",
      message: "Enter custom facial expression description:",
      initial: "Confident slight smirk with sharp analytical focus",
    });
    customExpression = cExpr.text;
  }

  // Gesture
  const gestRes = await prompts({
    type: "select",
    name: "gesture",
    message: "Select Arm, Hand & Body Gesture:",
    choices: [
      ...Object.entries(GESTURE_PRESETS).map(([k, v]) => ({
        title: v.label,
        value: k,
      })),
      { title: "✏️ Custom Body Gesture Prompt", value: "custom" },
    ],
  });

  let gestureKey = gestRes.gesture !== "custom" ? gestRes.gesture : undefined;
  let customGesture: string | undefined;
  if (gestRes.gesture === "custom") {
    const cGest = await prompts({
      type: "text",
      name: "text",
      message: "Enter custom body gesture description:",
      initial: "Hands resting naturally on desk surface",
    });
    customGesture = cGest.text;
  }

  // Prop
  const propRes = await prompts({
    type: "select",
    name: "prop",
    message: "Select Handheld Anchor Prop (Optional):",
    choices: [
      { title: "🚫 No Special Prop", value: "none" },
      ...Object.entries(BROADCAST_PROPS).map(([k, v]) => ({
        title: v.name,
        value: k,
      })),
    ],
  });
  const propKey = propRes.prop !== "none" ? propRes.prop : undefined;

  // AR Infographic
  const arRes = await prompts({
    type: "select",
    name: "ar",
    message: "Select 3D Holographic AR Infographic (Optional):",
    choices: [
      { title: "🚫 None (Standard Studio Room)", value: "none" },
      ...Object.entries(AR_HOLOGRAPHIC_GRAPHICS).map(([k, v]) => ({
        title: v.name,
        value: k,
      })),
    ],
  });
  const arGraphicsKey = arRes.ar !== "none" ? arRes.ar : undefined;

  // Fabric Override
  const fabricRes = await prompts({
    type: "select",
    name: "fabric",
    message: "Select Fabric / Textile Texture Override (Optional):",
    choices: [
      { title: "🧵 Default Fabric Texture from Character Wardrobe", value: "none" },
      ...Object.entries(TEXTILE_FABRICS).map(([k, v]) => ({
        title: v.name,
        value: k,
      })),
    ],
  });
  const fabricKey = fabricRes.fabric !== "none" ? fabricRes.fabric : undefined;

  // Color Override
  const colorRes = await prompts({
    type: "select",
    name: "color",
    message: "Select Color Palette Override (Optional):",
    choices: [
      { title: "🎨 Default Colors from Character Plate", value: "none" },
      ...Object.entries(COLOR_SWAPS).map(([k, v]) => ({
        title: v.toUpperCase(),
        value: k,
      })),
    ],
  });
  const colorKey = colorRes.color !== "none" ? colorRes.color : undefined;

  const aspectRatio = await promptAspectSelection();

  // Save to DB and Transparent Matting toggles with clean arrow keys
  const saveToDb = await promptBooleanSelection(
    "💾 Automatically register output in Prisma Database & Video Editor?",
    "✅ Yes — Register in Database & Assets Vault",
    "❌ No — Save image file to disk only",
    true
  );

  const transparent = await promptBooleanSelection(
    "✂️ Automatically convert to 32-bit Transparent PNG (Alpha matting)?",
    "✅ Yes — Extract 32-bit RGBA Alpha with BiRefNet",
    "❌ No — Keep original background",
    chromaMode !== "none" && studioKey.includes("chroma")
  );

  const engine = await promptEngineSelection();

  return {
    config: {
      persona,
      studioPlateKey: studioKey,
      wardrobeKey: attireRes.wardrobeKey,
      cameraPresetKey: camRes.camera,
      hairstyleKey: hairRes.key,
      customHairstyle: hairRes.custom,
      lightingKey: lightKey,
      chromaMode,
      expressionKey,
      customExpression,
      gestureKey,
      customGesture,
      propKey,
      fabricKey,
      colorKey,
      arGraphicsKey,
      aspectRatio,
      saveToDb,
      transparent,
      engine,
    },
    engine,
  };
}

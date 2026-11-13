/**
 * scripts/gemini-cli/fieldReporterGenerator.ts
 *
 * NewsStudio Outdoor Field Reporter & Breaking Crisis Mode.
 * Composes exterior live broadcast scenes with dynamic weather physics,
 * tactile field gear, and realistic broadcast camera optics.
 */

import { Persona, PERSONAS } from "../../src/lib/tts/personas";
import { resolvePersonaAvatarPath } from "./personaAttires";
import { resolveHairstylePrompt } from "./hairstylePresets";
import { CompiledScenePrompt } from "./types";
import { runWithAgy } from "./engines/agyRunner";
import { runWithApi } from "./engines/apiRunner";
import { outputToolJson } from "./engines/jsonRunner";
import { renderTerminalImagePreview } from "./terminalPreview";

export interface FieldEnvironment {
  id: string;
  name: string;
  location: string;
  weather: string;
  lighting: string;
  gear: string;
}

export const FIELD_ENVIRONMENTS: Record<string, FieldEnvironment> = {
  hurricane_coastal: {
    id: "hurricane_coastal",
    name: "🌪️ Hurricane Coastal Sea Wall",
    location: "violent stormy coastal promenade, crashing sea spray waves, bending palm trees in heavy tropical storm",
    weather: "heavy torrential rain streaks, intense wind blowing hair sideways, water droplets on broadcast camera lens",
    lighting: "dark brooding storm clouds, dramatic emergency vehicle strobe reflections",
    gear: "wearing a heavy-duty bright yellow water-resistant broadcast storm jacket with hood down, holding a black handheld microphone with branded yellow foam windscreen, laminated PRESS ID lanyard visible around neck",
  },
  warzone_crisis: {
    id: "warzone_crisis",
    name: "🛡️ Breaking Crisis / Warzone Exterior",
    location: "distressed European or Middle-Eastern city square with military barricades, satellite broadcast trucks, and armored vehicles in background",
    weather: "hazy smoky atmosphere, distant amber flares, crisp overcast skies",
    lighting: "harsh cold daylight with high contrast shadows and realistic dust particles in air",
    gear: "wearing a navy blue tactical journalist flak jacket with bold white 'PRESS' lettering on chest over dark tactical turtleneck, holding broadcast field microphone with news logo flag",
  },
  wall_street_exterior: {
    id: "wall_street_exterior",
    name: "📈 Wall Street Stock Exchange Exterior",
    location: "bustling New York financial district in front of the New York Stock Exchange building, crowded traders and yellow cabs moving in blurred background",
    weather: "crisp autumn morning air, subtle lens flare from low sun",
    lighting: "golden morning sunlight bouncing off neoclassical stone columns and glass high-rises",
    gear: "wearing a tailored charcoal wool overcoat over broadcast suit, holding silver microphone with embossed 'NEWSSTUDIO' logo flag, digital stock tablet tucked under arm",
  },
  red_carpet_gala: {
    id: "red_carpet_gala",
    name: "✨ Hollywood Red Carpet / Gala Entrance",
    location: "glamorous velvet red carpet rope line with glittering step-and-repeat sponsor wall and paparazzi flashbulbs firing in soft background bokeh",
    weather: "clear nighttime air with glittering specular lens flares",
    lighting: "dramatic Hollywood red carpet high-intensity tungsten and flashbulb lighting",
    gear: "wearing a high-fashion designer tailored evening coat or sleek cocktail blazer, holding a luxury wireless gold-plated broadcast microphone",
  },
  tech_keynote_exterior: {
    id: "tech_keynote_exterior",
    name: "🚀 Silicon Valley Tech Convention Keynote",
    location: "futuristic glass convention center plaza, glowing neon holographic sponsor displays, innovative tech attendees in background",
    weather: "clear blue sky with sleek geometric architecture reflections",
    lighting: "modern bright 5600K architectural daylight with cool cyan reflections",
    gear: "wearing a minimalist techwear bomber jacket over dark mock-neck, wearing sleek clear smart glasses, holding slim wireless mic",
  },
};

export interface FieldReporterOptions {
  persona: Persona;
  environmentKey?: string;
  customLocation?: string;
  aspectRatio?: "16:9" | "9:16" | "1:1" | "4:3";
  engine: "agy" | "api" | "tool_json";
  dryRun?: boolean;
  preview?: boolean;
}

export function compileFieldReporterPrompt(
  persona: Persona,
  env: FieldEnvironment,
  aspectRatio: string = "16:9"
): CompiledScenePrompt {
  const t = persona.traits;
  const genderTag = persona.gender === "male" ? "male broadcast field correspondent" : "female broadcast field correspondent";
  const hairstyle = resolveHairstylePrompt(persona, "signature");
  const avatarPath = resolvePersonaAvatarPath(persona);

  const prompt = `Create a brand new ${aspectRatio} wide-angle on-location outdoor television news broadcast scene:
Use Reference 1 ONLY to match the facial features, eye color, and likeness of ${t.age}-year-old ${genderTag} ${persona.name} (${t.face}, ${t.skinTone || "natural skin tone"}).
DO NOT copy the framing, suit/blazer, or grey studio background of Reference 1.

SCENE & COMPOSITION:
• LOCATION & ENVIRONMENT: ${persona.name} is standing outdoors in ${env.location}.
• WEATHER & ATMOSPHERE: ${env.weather}.
• ON-LOCATION WARDROBE & GEAR: ${env.gear}, holding a handheld broadcast microphone to report live.
• HAIRSTYLE & WEATHER REACTION: ${hairstyle}, visibly reacting to outdoor wind and atmospheric humidity.
• CAMERA FRAMING & OPTICS: Medium waist-up broadcast television framing standing in foreground, ${env.lighting}. Shot on 35mm broadcast camera, 8k photo, raw documentary photography, master television broadcast quality.`;

  return {
    prompt,
    imagePaths: avatarPath ? [avatarPath] : [],
    baseName: `field_${persona.id}_${env.id}_${Date.now().toString().slice(-6)}`,
    aspectRatio,
  };
}


export async function runFieldReporterMode(options: FieldReporterOptions): Promise<string | null> {
  const envKey = options.environmentKey || "hurricane_coastal";
  const env = FIELD_ENVIRONMENTS[envKey] || FIELD_ENVIRONMENTS.hurricane_coastal;
  const aspectRatio = options.aspectRatio || "16:9";

  console.log("\n==================================================================");
  console.log(`🌦️ NEWSSTUDIO — ON-LOCATION FIELD REPORTER GENERATOR`);
  console.log("==================================================================");
  console.log(`Persona:      ${options.persona.name} [${options.persona.id}]`);
  console.log(`Environment:  ${env.name}`);
  console.log(`Aspect Ratio: ${aspectRatio}`);
  console.log(`Engine:       ${options.engine.toUpperCase()}\n`);

  const compiled = compileFieldReporterPrompt(options.persona, env, aspectRatio);
  console.log(`Image Name:   ${compiled.baseName}`);
  console.log(`\nPrompt:\n"${compiled.prompt}"\n`);

  if (options.dryRun) {
    console.log("ℹ️ [DRY-RUN] Field reporter prompt compiled successfully without invoking generator.\n");
    return null;
  }

  let generatedPath: string | null = null;
  if (options.engine === "agy") {
    generatedPath = await runWithAgy(compiled);
  } else if (options.engine === "api") {
    generatedPath = await runWithApi(compiled);
  } else {
    outputToolJson(compiled);
  }

  if (generatedPath && options.preview) {
    await renderTerminalImagePreview(generatedPath, 64);
  }

  return generatedPath;
}

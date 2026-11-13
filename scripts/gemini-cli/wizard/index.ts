/**
 * scripts/gemini-cli/wizard/index.ts
 *
 * Master Interactive Wizard for NewsStudio Image CLI.
 * Dispatches to modular strategy handlers for all 19 broadcast workflows.
 */

import prompts from "prompts";
import { Persona } from "../../../src/lib/tts/personas";
import { CompositeSceneConfig } from "../types";
import { promptPersonaSelection } from "./commonPrompts";

// Handlers
import { handleDomainSetWorkflow } from "./handlers/domainSetHandler";
import { handleStoryboardWorkflow } from "./handlers/storyboardHandler";
import { handleFieldReporterWorkflow } from "./handlers/fieldReporterHandler";
import { handleRoundtableWorkflow } from "./handlers/roundtableHandler";
import { handleTurntableWorkflow } from "./handlers/turntableHandler";
import { handleLookbookWorkflow } from "./handlers/lookbookHandler";
import { handleLoopSuiteWorkflow } from "./handlers/loopSuiteHandler";
import { handleDualAnchorWorkflow } from "./handlers/dualAnchorHandler";
import { handleThumbnailWorkflow } from "./handlers/thumbnailHandler";
import { handleMultiviewWorkflow } from "./handlers/multiviewHandler";
import { handleStudioWorkflow } from "./handlers/studioHandler";
import { handleAuditWorkflow } from "./handlers/auditHandler";
import { handleLoRADatasetWorkflow } from "./handlers/loraDatasetHandler";
import { handleSkyboxWorkflow } from "./handlers/skyboxHandler";
import { handleWarMapWorkflow } from "./handlers/warMapHandler";
import { handleMagazineWorkflow } from "./handlers/magazineHandler";
import { handleEraBroadcastWorkflow } from "./handlers/eraBroadcastHandler";
import { handleSeasonalWardrobeWorkflow } from "./handlers/seasonalWardrobeHandler";
import { handleIncidentBlueprintWorkflow } from "./handlers/incidentBlueprintHandler";
import { handleSingleSceneConfigPrompt } from "./handlers/singleSceneHandler";
import { handleClonePersonaWorkflow } from "./handlers/clonePersonaHandler";

export interface WizardResult {
  config?: CompositeSceneConfig;
  engine?: "agy" | "api" | "tool_json";
  isCustomHandled?: boolean;
}

export async function runInteractiveWizard(
  initialPersonaId?: string,
  initialStudioKey?: string,
  initialCameraKey?: string
): Promise<WizardResult | null> {
  const modeRes = await prompts({
    type: "select",
    name: "mode",
    message: "Select NewsStudio Generation Workflow Mode:",
    choices: [
      { title: "🧬 Persona Cloning Studio (Clone Character, Attire & Likeness from Image)", value: "clone_persona" },
      { title: "🏛️ Domain Master Image Set (Generate Cohesive M1..MK Keyframes for Specific Domain)", value: "domain_set" },
      { title: "🎬 Complete Multi-Scene Storyboard Pipeline (Story Script -> Keyframes)", value: "storyboard" },
      { title: "⚡ Single Broadcast Scene (Custom Character, Attire & Studio Plate)", value: "single_scene" },
      { title: "🌩️ Outdoor Field Reporter (Extreme Weather & Live Events)", value: "field_reporter" },
      { title: "👥 3-Presenter Roundtable Panel (Ruby + Mateo + Blaze)", value: "roundtable" },
      { title: "🔄 8-Angle 360° Character Turntable Blueprint", value: "turntable" },
      { title: "👗 AI Virtual Wardrobe Lookbook (6 or 12 High-Fashion Outfits)", value: "lookbook" },
      { title: "🔁 4.0s Boundary-Locked Action Loop Master Suite", value: "loop_master_suite" },
      { title: "👫 Dual-Anchor Studio Dialogue & Co-Host Panel", value: "dual_anchor" },
      { title: "🔥 Viral YouTube Video Thumbnail & Cover Hook Builder", value: "thumbnail" },
      { title: "🎞️ 4-in-1 Master Multiview Turnaround Strip (Single-Pass 16:9 / 4-Shot Stitch)", value: "multiview_strip" },
      { title: "🏛️ Virtual Studio Set Generator (Ultra-Wide 32:9 Video Wall & Sets)", value: "generate_studio" },
      { title: "🛡️ Gemini Vision Automated Set Cohesion & Audit Harness", value: "audit_harness" },
      { title: "🧠 48-Scenario Synthetic LoRA Training Dataset Generator", value: "lora_dataset" },
      { title: "🌐 360° Equirectangular Virtual Studio Cyclorama Skybox", value: "skybox_360" },
      { title: "🗺️ 3D Holographic Geopolitical & Tactical Situation War Maps", value: "war_map" },
      { title: "📰 Forbes / Time Magazine Anchor Editorial Cover", value: "magazine_cover" },
      { title: "📻 Historical Era Broadcast (1950s Black & White, 70s Analog, 90s CRT)", value: "era_broadcast" },
      { title: "🍂 Seasonal Weather Wardrobe Capsule & Red Carpet Gala Suite", value: "seasonal_wardrobe" },
      { title: "📐 Technical Architectural Blueprint & Forensic Incident Cutaway", value: "incident_blueprint" },
    ],
  });

  if (!modeRes.mode) return null;

  switch (modeRes.mode) {
    case "clone_persona":
      await handleClonePersonaWorkflow();
      return { isCustomHandled: true };
    case "domain_set":
      await handleDomainSetWorkflow(initialPersonaId);
      return { isCustomHandled: true };

    case "storyboard":
      await handleStoryboardWorkflow();
      return { isCustomHandled: true };

    case "field_reporter":
      await handleFieldReporterWorkflow(initialPersonaId);
      return { isCustomHandled: true };

    case "roundtable":
      await handleRoundtableWorkflow();
      return { isCustomHandled: true };

    case "turntable":
      await handleTurntableWorkflow(initialPersonaId);
      return { isCustomHandled: true };

    case "lookbook":
      await handleLookbookWorkflow(initialPersonaId);
      return { isCustomHandled: true };

    case "loop_master_suite":
      await handleLoopSuiteWorkflow(initialPersonaId);
      return { isCustomHandled: true };

    case "dual_anchor":
      await handleDualAnchorWorkflow();
      return { isCustomHandled: true };

    case "thumbnail":
      await handleThumbnailWorkflow(initialPersonaId);
      return { isCustomHandled: true };

    case "multiview_strip":
      await handleMultiviewWorkflow(initialPersonaId);
      return { isCustomHandled: true };

    case "generate_studio":
      await handleStudioWorkflow();
      return { isCustomHandled: true };

    case "audit_harness":
      await handleAuditWorkflow();
      return { isCustomHandled: true };

    case "lora_dataset":
      await handleLoRADatasetWorkflow(initialPersonaId);
      return { isCustomHandled: true };

    case "skybox_360":
      await handleSkyboxWorkflow();
      return { isCustomHandled: true };

    case "war_map":
      await handleWarMapWorkflow();
      return { isCustomHandled: true };

    case "magazine_cover":
      await handleMagazineWorkflow(initialPersonaId);
      return { isCustomHandled: true };

    case "era_broadcast":
      await handleEraBroadcastWorkflow(initialPersonaId);
      return { isCustomHandled: true };

    case "seasonal_wardrobe":
      await handleSeasonalWardrobeWorkflow(initialPersonaId);
      return { isCustomHandled: true };

    case "incident_blueprint":
      await handleIncidentBlueprintWorkflow();
      return { isCustomHandled: true };

    case "single_scene":
    default: {
      const persona = await promptPersonaSelection(initialPersonaId || "ruby");
      if (!persona) return null;
      return await handleSingleSceneConfigPrompt(persona, initialStudioKey, initialCameraKey);
    }
  }
}

export * from "./commonPrompts";

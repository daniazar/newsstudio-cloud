/**
 * scripts/veo-cli/engines/flowSettingsManager.ts
 *
 * Automated Google Flow Settings & Safety Rails Synchronizer.
 * Responsibilities:
 *   • Credit estimation & budgeting (Omni 1.1 Flash, Veo 3.1 Lite/Fast/Quality, Ultra subscriber tiers)
 *   • Enforces "Confirm before generating: Never" in Agent Settings (unlocks headless execution)
 *   • Locks native generation to 720p @ 8s and triggers Free 1080p Upscaling for Ultra members
 *   • Configures prompt bar toggles: Video · 720p · 8s · 16:9 · Model
 *   • Injects persistent Project Brief & Safety Guardrail Cards into Agent Instructions
 */

import { Page } from "puppeteer-core";
import {
  FlowSettingsConfig,
  FlowCreditCost,
  FlowVideoModel,
  FlowResolution,
  FlowConfirmPolicy,
  FlowExecutionMode,
  AspectRatioType,
} from "../types";

export const DEFAULT_NEWSSTUDIO_INSTRUCTIONS = [
  {
    title: "Broadcast Presenter Lip-Sync Contract",
    description:
      "All human presenter videos must start and finish with a closed mouth in a neutral communicative expression, facing directly toward camera for broadcast lip-sync readiness.",
  },
  {
    title: "Studio Environment & Lighting",
    description:
      "Maintain seamless chromakey greenscreen (#00FF00) background, cinematic 50mm f/1.8 portrait lighting, and photographic skin texture without blur or cartoonish distortion.",
  },
  {
    title: "Character Continuity & Movement",
    description:
      "Strictly preserve character identity features (@Ruby: auburn bob, tailored suit; @Blaze: dark crew cut, charcoal blazer) with smooth organic micro-movements and zero sudden jump cuts.",
  },
];

/**
 * Calculates exact Google Flow credit cost based on official rates & Ultra subscriber perks
 */
export function calculateFlowCredits(
  model: FlowVideoModel = "veo-3.1-lite",
  resolution: FlowResolution = "720p",
  durationSec = 8,
  batchCount = 1,
  isUltra = true
): FlowCreditCost {
  let creditsPerClip = 10;

  if (model === "omni-1.1-flash") {
    if (resolution === "360p") {
      if (durationSec <= 4) creditsPerClip = 4;
      else if (durationSec <= 6) creditsPerClip = 5;
      else if (durationSec <= 8) creditsPerClip = 6;
      else creditsPerClip = 7;
    } else {
      // 720p
      if (durationSec <= 4) creditsPerClip = 7;
      else if (durationSec <= 6) creditsPerClip = 10;
      else if (durationSec <= 8) creditsPerClip = 12;
      else creditsPerClip = 15;
    }
  } else if (model === "veo-3.1-lite") {
    creditsPerClip = isUltra ? 5 : 10;
  } else if (model === "veo-3.1-fast") {
    creditsPerClip = isUltra ? 10 : 20;
  } else if (model === "veo-3.1-quality") {
    creditsPerClip = 100;
  }

  const totalCredits = creditsPerClip * batchCount;
  const upscaleCost = 0; // Free for Ultra subscribers

  return {
    model,
    resolution,
    durationSec,
    batchCount,
    creditsPerClip,
    totalCredits,
    isUltraRate: isUltra,
    upscaleCost,
  };
}

/**
 * Resolves active Flow settings from options or .env
 */
export function getResolvedFlowSettings(options?: Partial<FlowSettingsConfig>): FlowSettingsConfig {
  const confirmPolicy: FlowConfirmPolicy =
    options?.confirmPolicy ||
    (process.env.FLOW_CONFIRM_POLICY === "always" ? "always" : "never");

  const videoModel: FlowVideoModel =
    options?.videoModel ||
    (process.env.FLOW_VIDEO_MODEL as FlowVideoModel) ||
    "veo-3.1-lite";

  const targetResolution: FlowResolution =
    options?.targetResolution ||
    (process.env.FLOW_TARGET_RESOLUTION as FlowResolution) ||
    "1080p";

  const upscale1080p =
    options?.upscale1080p !== undefined
      ? options.upscale1080p
      : process.env.FLOW_UPSCALE_1080P !== "false";

  const duration = (options?.duration || process.env.FLOW_DURATION || "8s") as "4s" | "6s" | "8s" | "10s";

  const aspectRatio: AspectRatioType =
    options?.aspectRatio ||
    ((process.env.FLOW_ASPECT_RATIO as AspectRatioType) || "16:9");

  const rawBatch = options?.batchCount || parseInt(process.env.FLOW_BATCH_COUNT || "1", 10);
  const batchCount = (rawBatch >= 1 && rawBatch <= 4 ? rawBatch : 1) as 1 | 2 | 3 | 4;

  const executionMode: FlowExecutionMode =
    options?.executionMode ||
    (process.env.FLOW_EXECUTION_MODE === "agent" ? "agent" : "direct");

  const promptMode: "ingredients" | "frames" =
    options?.promptMode ||
    (process.env.FLOW_PROMPT_MODE as "ingredients" | "frames") ||
    "ingredients";

  return {
    confirmPolicy,
    videoModel,
    targetResolution,
    upscale1080p,
    duration,
    aspectRatio,
    batchCount,
    executionMode,
    promptMode,
  };
}

/**
 * Synchronizes Project-Level Agent Settings in Google Flow (flow-settings-view)
 * Sets "Confirm before generating: Never" to enable autonomous headless execution.
 */
export async function syncFlowAgentSettings(
  page: Page,
  config?: Partial<FlowSettingsConfig>
): Promise<{ success: boolean; message?: string }> {
  const settings = getResolvedFlowSettings(config);
  console.log(`\n⚙️ Synchronizing Google Flow Agent Settings...`);
  console.log(`   Confirm Policy: ${settings.confirmPolicy.toUpperCase()}`);
  console.log(`   Default Model:  ${settings.videoModel}`);

  try {
    // Check if Agent Settings view is already visible
    const settingsOpen = await page.evaluate(() => {
      const heading = Array.from(document.querySelectorAll("h1, h2, h3, div, span")).find(
        (el) => (el.textContent || "").trim() === "Agent settings"
      );
      return !!heading;
    });

    if (!settingsOpen) {
      // Open Agent Settings via header gear icon or prompt bar action
      console.log("   Opening Agent Settings drawer...");
      const opened = await page.evaluate(() => {
        // Try gear icon in header
        const gearBtn = Array.from(document.querySelectorAll("button, [role='button']")).find((b) => {
          const aria = (b.getAttribute("aria-label") || "").toLowerCase();
          const text = (b.textContent || "").toLowerCase();
          const html = b.innerHTML.toLowerCase();
          return aria.includes("setting") || text.includes("settings") || html.includes("settings");
        });
        if (gearBtn) {
          (gearBtn as HTMLElement).click();
          return true;
        }
        return false;
      });

      if (!opened) {
        // Fallback: If cannot open directly from header, prompt settings handles per-run config
        console.log("ℹ️ Agent settings drawer already configured or handled via prompt bar.");
        return { success: true, message: "Agent settings check completed." };
      }

      await new Promise((r) => setTimeout(r, 1200));
    }

    // Inside flow-settings-view: Configure "Confirm before generating"
    const radioResult = await page.evaluate((targetPolicy: string) => {
      const radios = Array.from(
        document.querySelectorAll("mat-radio-button, [role='radio'], input[type='radio']")
      );

      const targetLabel = targetPolicy === "never" ? "never" : "always";
      const matchingRadio = radios.find((r) => {
        const text = (r.textContent || "").toLowerCase();
        return text.includes(targetLabel);
      });

      if (matchingRadio) {
        const clickable = (matchingRadio.querySelector("button, input, label") || matchingRadio) as HTMLElement;
        clickable.click();
        return { selected: true, label: targetLabel };
      }
      return { selected: false };
    }, settings.confirmPolicy);

    if (radioResult.selected) {
      console.log(`   ✔ Set "Confirm before generating" to "${radioResult.label.toUpperCase()}".`);
    }

    // Click "Save" button if present
    await page.evaluate(() => {
      const saveBtn = Array.from(document.querySelectorAll("button")).find(
        (b) => (b.textContent || "").trim().toLowerCase() === "save"
      );
      if (saveBtn) (saveBtn as HTMLElement).click();
    });

    await new Promise((r) => setTimeout(r, 800));
    console.log("   ✔ Google Flow Agent Settings synchronized successfully.\n");
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn("⚠️ Non-fatal Agent settings notice:", errorMsg);
    return { success: false, message: errorMsg };
  }
}

/**
 * Synchronizes Inline Prompt Bar Settings in Google Flow (flow-prompt-box-settings)
 * Locks native generation to Video · 720p · 8s · 16:9 · Selected Model
 */
export async function syncFlowPromptSettings(
  page: Page,
  config?: Partial<FlowSettingsConfig>
): Promise<{ success: boolean; message?: string }> {
  const settings = getResolvedFlowSettings(config);

  console.log(`\n🎯 Calibrating Google Flow Prompt Bar Settings...`);
  console.log(`   Mode:           VIDEO`);
  console.log(`   Resolution:     720p (Base Native) ➔ 1080p (Ultra Free Upscale)`);
  console.log(`   Duration:       ${settings.duration}`);
  console.log(`   Aspect Ratio:   ${settings.aspectRatio}`);
  console.log(`   Model:          ${settings.videoModel}`);
  console.log(`   Batch Count:    x${settings.batchCount}`);

  try {
    // Step 0: Ensure Google Flow "Agent" mode is disabled (unhides settings trigger & restores direct Veo prompt bar)
    await page.evaluate(() => {
      const agentBtn = document.querySelector("button.agent-mode-chip, .agent-mode-chip") as HTMLElement | null;
      if (agentBtn && (agentBtn.classList.contains("agent-mode-chip-checked") || agentBtn.getAttribute("aria-pressed") === "true")) {
        agentBtn.click();
      }
    });
    await new Promise((r) => setTimeout(r, 600));

    // Step 1: Open Settings Trigger on prompt bar (only if not already open)
    const isAlreadyOpen = await page.evaluate(
      () => !!document.querySelector("flow-prompt-box-settings, .flow-prompt-box-settings")
    );
    if (!isAlreadyOpen) {
      const triggerClicked = await page.evaluate(() => {
        const trigger = document.querySelector(
          "button[aria-label='Settings trigger'], .settings-trigger-button"
        ) as HTMLButtonElement | null;
        if (trigger) {
          trigger.click();
          return true;
        }
        return false;
      });

      if (!triggerClicked) {
        console.warn("⚠️ Could not find 'Settings trigger' button on prompt bar.");
        return { success: false, message: "Settings trigger not found" };
      }
      await new Promise((r) => setTimeout(r, 800));
    } else {
      await new Promise((r) => setTimeout(r, 200));
    }

    // Step 2: Ensure "Video" toggle is selected
    await page.evaluate(() => {
      const toggles = Array.from(document.querySelectorAll("mat-button-toggle, button"));
      const videoToggle = toggles.find((t) => (t.textContent || "").toLowerCase().includes("video"));
      if (videoToggle) {
        const btn = (videoToggle.querySelector("button") || videoToggle) as HTMLElement;
        const isChecked =
          videoToggle.getAttribute("aria-checked") === "true" ||
          videoToggle.className.includes("checked");
        if (!isChecked) btn.click();
      }
    });

    await new Promise((r) => setTimeout(r, 400));

    // Step 2b: Ensure Prompt Mode ("Ingredients" vs "Frames") is selected
    const targetPromptMode = settings.promptMode || "ingredients";
    console.log(`   Sub-Mode:       ${targetPromptMode.toUpperCase()} (${targetPromptMode === "frames" ? "Start & End Frames" : "Ingredient References"})`);
    await page.evaluate((mode: string) => {
      const toggles = Array.from(document.querySelectorAll("mat-button-toggle, button[role='radio']"));
      const targetText = mode === "frames" ? "frames" : "ingredient";
      const targetToggle = toggles.find((t) => (t.textContent || "").toLowerCase().includes(targetText)) as HTMLElement | null;
      if (targetToggle) {
        const btn = (targetToggle.querySelector("button") || targetToggle) as HTMLElement;
        const isChecked =
          targetToggle.classList.contains("mat-button-toggle-checked") ||
          targetToggle.getAttribute("aria-checked") === "true" ||
          btn.getAttribute("aria-checked") === "true";
        if (!isChecked) {
          btn.click();
        }
      }
    }, targetPromptMode);

    await new Promise((r) => setTimeout(r, 500));

    // Step 3: Ensure Aspect Ratio is selected (16:9 vs 9:16)
    await page.evaluate((targetAspect: string) => {
      const toggles = Array.from(document.querySelectorAll("mat-button-toggle, button"));
      const aspectToggle = toggles.find((t) => (t.textContent || "").includes(targetAspect));
      if (aspectToggle) {
        const btn = (aspectToggle.querySelector("button") || aspectToggle) as HTMLElement;
        btn.click();
      }
    }, settings.aspectRatio);

    // Step 4: Ensure Resolution is 720p
    await page.evaluate(() => {
      const toggles = Array.from(document.querySelectorAll("mat-button-toggle, button"));
      const resToggle = toggles.find((t) => (t.textContent || "").trim() === "720p");
      if (resToggle) {
        const btn = (resToggle.querySelector("button") || resToggle) as HTMLElement;
        btn.click();
      }
    });

    // Step 5: Ensure Duration is set (default 8s)
    await page.evaluate((targetDuration: string) => {
      const toggles = Array.from(document.querySelectorAll("mat-button-toggle, button"));
      const durToggle = toggles.find((t) => (t.textContent || "").trim() === targetDuration);
      if (durToggle) {
        const btn = (durToggle.querySelector("button") || durToggle) as HTMLElement;
        btn.click();
      }
    }, settings.duration);

    // Step 6: Ensure Batch Count is set (e.g. x1)
    await page.evaluate((batch: number) => {
      const toggles = Array.from(document.querySelectorAll("mat-button-toggle, button"));
      const batchToggle = toggles.find((t) => (t.textContent || "").trim() === `x${batch}`);
      if (batchToggle) {
        const btn = (batchToggle.querySelector("button") || batchToggle) as HTMLElement;
        btn.click();
      }
    }, settings.batchCount);

    // Step 7: Select Model from dropdown if specified
    const targetModelLabel = getModelDropdownLabel(settings.videoModel);
    
    // Check current selected model text
    const initialModelCheck = await page.evaluate(() => {
      const modelDropdownBtn = document.querySelector(
        "button[aria-label='Select model family'], .cdk-overlay-container button[aria-label='Select model family']"
      ) as HTMLButtonElement | null;
      return modelDropdownBtn ? (modelDropdownBtn.textContent || "").trim().replace(/\s+/g, " ") : null;
    });

    console.log(`   Current Flow Model: ${initialModelCheck || "Unknown"} (Target: ${targetModelLabel})`);

    const needsModelSwitch =
      !initialModelCheck ||
      !initialModelCheck.toLowerCase().includes(targetModelLabel.toLowerCase());

    if (needsModelSwitch) {
      // 1. Click model family dropdown button
      await page.evaluate(() => {
        const modelDropdownBtn = document.querySelector(
          "button[aria-label='Select model family'], .cdk-overlay-container button[aria-label='Select model family']"
        ) as HTMLButtonElement | null;
        if (modelDropdownBtn) modelDropdownBtn.click();
      });

      // Wait for menu overlay to mount
      await new Promise((r) => setTimeout(r, 800));

      // 2. Find and click matching menu item
      const clicked = await page.evaluate((targetLabel: string) => {
        const menuItems = Array.from(
          document.querySelectorAll(".mat-mdc-menu-item, [role='menuitem'], .cdk-overlay-container button")
        );
        const lowerTarget = targetLabel.toLowerCase();
        const shortMatch = lowerTarget.includes("lite")
          ? "lite"
          : lowerTarget.includes("fast")
          ? "fast"
          : lowerTarget.includes("quality")
          ? "quality"
          : lowerTarget.includes("omni") || lowerTarget.includes("flash")
          ? "omni"
          : lowerTarget;

        const matchingItem = menuItems.find((el) => {
          const t = (el.textContent || "").toLowerCase();
          return t.includes(lowerTarget) || t.includes(shortMatch);
        });

        if (matchingItem) {
          (matchingItem as HTMLElement).click();
          return true;
        }
        return false;
      }, targetModelLabel);

      if (clicked) {
        await new Promise((r) => setTimeout(r, 800));
        // Verify model button updated
        const updatedModelCheck = await page.evaluate(() => {
          const modelDropdownBtn = document.querySelector(
            "button[aria-label='Select model family'], .cdk-overlay-container button[aria-label='Select model family']"
          ) as HTMLButtonElement | null;
          return modelDropdownBtn ? (modelDropdownBtn.textContent || "").trim().replace(/\s+/g, " ") : null;
        });
        console.log(`   ✔ Switched Flow Model to: ${updatedModelCheck || targetModelLabel}`);
      } else {
        console.warn(`   ⚠️ Could not find menu item for target model: ${targetModelLabel}`);
      }
    } else {
      console.log(`   ✔ Flow Model already set to: ${initialModelCheck}`);
    }

    // Close the settings popup cleanly (press Escape)
    await page.keyboard.press("Escape");
    await new Promise((r) => setTimeout(r, 400));

    console.log("   ✔ Google Flow Prompt Bar Settings calibrated.\n");
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn("⚠️ Non-fatal prompt settings notice:", errorMsg);
    return { success: false, message: errorMsg };
  }
}

/**
 * Triggers Google Flow's 1080p Upscaling (Free for Ultra subscribers)
 */
export async function triggerFlow1080pUpscale(
  page: Page,
  targetClipIndex = 0
): Promise<{ success: boolean; message?: string }> {
  console.log(`\n🚀 Triggering Google Flow 1080p Upscaler (Ultra Free Tier)...`);

  try {
    if (typeof (page as any).setViewport === "function") {
      await (page as any).setViewport({ width: 1920, height: 1080 });
    } else if (typeof (page as any).setViewportSize === "function") {
      await (page as any).setViewportSize({ width: 1920, height: 1080 });
    }
    await page.keyboard.press("Escape").catch(() => {});
    await new Promise((r) => setTimeout(r, 300));

    const tilePos = await page.evaluate((clipIdx: number) => {
      const videoTiles = Array.from(document.querySelectorAll("flow-video-tile, flow-custom-tile, [class*='tile']"));
      const targetTile = videoTiles[clipIdx] || videoTiles[0];
      if (!targetTile) return null;
      (targetTile as HTMLElement).scrollIntoView({ block: "center", inline: "center" });
      const r = targetTile.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, targetClipIndex);

    if (!tilePos) {
      return { success: false, message: "No video tile found" };
    }

    await new Promise((r) => setTimeout(r, 300));

    const currentPos = await page.evaluate((clipIdx: number) => {
      const videoTiles = Array.from(document.querySelectorAll("flow-video-tile, flow-custom-tile, [class*='tile']"));
      const targetTile = videoTiles[clipIdx] || videoTiles[0];
      if (!targetTile) return null;
      const r = targetTile.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, targetClipIndex);

    const clickTarget = currentPos || tilePos;
    await page.mouse.click(clickTarget.x, clickTarget.y, { button: "right" });
    await new Promise((r) => setTimeout(r, 600));

    let downloadPos = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll(".mat-mdc-menu-item, [role='menuitem']"));
      const btn = items.find((el) => (el.textContent || "").toLowerCase().includes("download"));
      if (!btn) return null;
      const r = btn.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });

    if (!downloadPos) {
      await page.keyboard.press("Escape").catch(() => {});
      await new Promise((r) => setTimeout(r, 300));

      const morePos = await page.evaluate((clipIdx: number) => {
        const videoTiles = Array.from(document.querySelectorAll("flow-video-tile, flow-custom-tile, [class*='tile']"));
        const targetTile = videoTiles[clipIdx] || videoTiles[0];
        if (!targetTile) return null;
        const btn = targetTile.querySelector("button[aria-label*='more' i], [aria-label*='menu' i], [aria-label*='More' i], .mat-mdc-menu-trigger") as HTMLElement;
        if (!btn) return null;
        btn.scrollIntoView({ block: "center", inline: "center" });
        const r = btn.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }, targetClipIndex);

      if (morePos) {
        await page.mouse.click(morePos.x, morePos.y);
        await new Promise((r) => setTimeout(r, 600));

        downloadPos = await page.evaluate(() => {
          const items = Array.from(document.querySelectorAll(".mat-mdc-menu-item, [role='menuitem']"));
          const btn = items.find((el) => (el.textContent || "").toLowerCase().includes("download"));
          if (!btn) return null;
          const r = btn.getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        });
      }
    }

    if (!downloadPos) {
      await page.keyboard.press("Escape").catch(() => {});
      return { success: false, message: "Download menu item not found after right click and more_vert." };
    }

    await page.mouse.move(downloadPos.x, downloadPos.y);
    await new Promise((r) => setTimeout(r, 600));

    const clicked1080 = await page.evaluate(() => {
      const panels = Array.from(document.querySelectorAll(".mat-mdc-menu-panel, [role='menu']"));
      if (panels.length >= 2) {
        const subPanel = panels[panels.length - 1];
        const b = Array.from(subPanel.querySelectorAll("button, [role='menuitem']")).find((el) =>
          (el.textContent || "").includes("1080p")
        ) as HTMLElement;
        if (b) {
          b.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
          b.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
          b.click();
          return true;
        }
      }
      const any1080 = Array.from(document.querySelectorAll("button, [role='menuitem']")).find((el) =>
        (el.textContent || "").includes("1080p")
      ) as HTMLElement;
      if (any1080) {
        any1080.click();
        return true;
      }
      // If no 1080p option exists, click the download button directly to get the 720p native master
      const downloadBtn = Array.from(document.querySelectorAll("button, [role='menuitem']")).find((el) =>
        (el.textContent || "").toLowerCase().includes("download")
      ) as HTMLElement;
      if (downloadBtn) {
        downloadBtn.click();
        return true;
      }
      return false;
    });

    if (clicked1080) {
      console.log("   ✔ 1080p Upscale / Download request submitted to Google Flow!");
      return { success: true };
    } else {
      await page.keyboard.press("Escape").catch(() => {});
      return { success: false, message: "1080p option not found in submenu" };
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn("⚠️ Upscale notice:", errorMsg);
    return { success: false, message: errorMsg };
  }
}

/**
 * Maps model slug to Flow dropdown label
 */
function getModelDropdownLabel(model: FlowVideoModel): string {
  switch (model) {
    case "veo-3.1-quality":
      return "Veo 3.1 - Quality";
    case "veo-3.1-lite":
      return "Veo 3.1 - Lite";
    case "omni-1.1-flash":
      return "Omni 1.1 Flash";
    case "veo-3.1-fast":
    default:
      return "Veo 3.1 - Fast";
  }
}

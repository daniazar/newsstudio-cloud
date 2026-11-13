/**
 * scripts/veo-cli/engines/flowWebRunner.ts
 *
 * Dedicated Autonomous Web Runner for Google Flow (flow.google.com).
 * Features:
 *   • Chrome Session Persistence (Connects to port 9222 or launches with Google profile)
 *   • On-Demand Persona Character Registration (@Ruby, @Blaze, etc.)
 *   • 8-Second Veo 3.1 Master Chroma Video Generation
 *   • Attire and Secondary Kinematics Injection
 *   • Automated Video Download & Registration into Workspace
 *   • Optional Palindromic Looping for Forward Articulation Modes
 */

import puppeteer, { Browser, Page } from "puppeteer-core";
import { CompiledVeoPrompt, VeoGenerationResult, FlowProjectConfig, FlowVideoModel, FlowConfirmPolicy } from "../types";
import { getVeoActionLoopsDir, printClickablePath } from "../artifactManager";
import { getFlowCharacterConfig, FlowCharacterConfig } from "../flowCharacterRegistry";
import { generatePalindromicLoop } from "../processors/loopHarmonizer";
import { getCachedFlowProjects, FlowProjectItem } from "./flowProjectManager";
import {
  calculateFlowCredits,
  getResolvedFlowSettings,
  syncFlowAgentSettings,
  syncFlowPromptSettings,
  triggerFlow1080pUpscale,
} from "./flowSettingsManager";
import { ensureChromeDebugRunning } from "./chromeBootstrapper";
import { filterPromptForSafety } from "../../../src/lib/ecommerce/promptSafetyFilter";
import { cliLogger } from "../../common/cliTelemetry";
import fs from "fs";
import path from "path";
import { spawnSync, execSync } from "child_process";

const CHROME_PATH = fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
  ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  : "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const USER_DATA_DIR = path.join(process.env.LOCALAPPDATA || "C:\\Users\\danie\\AppData\\Local", "Google", "Chrome", "AutomationData");
const USER_DOWNLOADS_DIR = path.join(process.env.USERPROFILE || "C:\\Users\\danie", "Downloads");

export const DEFAULT_FLOW_PROJECT_ID = "065b7352-6e4f-4aa9-b420-eab8beeebcdd";
export const DEFAULT_FLOW_PROJECT_NAME = "News Studio";
export const DEFAULT_FLOW_PROJECT_URL = `https://flow.google.com/project/${DEFAULT_FLOW_PROJECT_ID}`;

export interface FlowWebOptions {
  headless?: boolean;
  createPalindrome?: boolean;
  timeoutMs?: number;
  projectId?: string;
  projectUrl?: string;
  projectName?: string;
  flowModel?: FlowVideoModel;
  confirmPolicy?: FlowConfirmPolicy;
  syncSettings?: boolean;
  upscale1080p?: boolean;
  wardrobe?: string;
  bodyMode?: "prompt" | "upload" | "auto";
  promptMode?: "ingredients" | "frames" | "auto";
  existingPage?: Page;
  allowRegistration?: boolean;
}

/**
 * Resolves the Google Flow project configuration (defaults to "News Studio" project)
 */
export function resolveFlowProjectConfig(options?: FlowWebOptions): FlowProjectConfig {
  const query = (options?.projectUrl || options?.projectId || "").trim();

  // Check if passed string matches a known project by name or ID in cache
  try {
    const cached = getCachedFlowProjects();
    if (query) {
      const match = cached.find((c: FlowProjectItem) =>
        c.name.toLowerCase() === query.toLowerCase() ||
        c.id.toLowerCase() === query.toLowerCase() ||
        c.url.toLowerCase() === query.toLowerCase()
      );
      if (match) {
        return {
          projectId: match.id,
          projectName: match.name,
          projectUrl: match.url,
        };
      }
    }
  } catch {}

  let projectId =
    options?.projectId ||
    process.env.FLOW_PROJECT_ID ||
    DEFAULT_FLOW_PROJECT_ID;

  let projectUrl =
    options?.projectUrl ||
    process.env.FLOW_PROJECT_URL ||
    DEFAULT_FLOW_PROJECT_URL;

  // If projectUrl is a UUID or slug rather than full URL, convert to full URL
  if (projectUrl && !projectUrl.startsWith("http")) {
    projectId = projectUrl;
    projectUrl = `https://flow.google.com/project/${projectUrl}`;
  } else if (projectUrl && projectUrl.includes("/project/")) {
    const extractedId = projectUrl.split("/project/")[1]?.split(/[?#/]/)[0];
    if (extractedId) projectId = extractedId;
  }

  const projectName =
    options?.projectName ||
    process.env.FLOW_PROJECT_NAME ||
    DEFAULT_FLOW_PROJECT_NAME;

  return { projectId, projectUrl, projectName };
}

/**
 * Brings Chrome OS window to the foreground on Windows
 */
export function bringChromeWindowToForeground(): void {
  try {
    const psScript = `
      $wshell = New-Object -ComObject wscript.shell

      # 1. Target window by title (Google Flow or News Studio)
      $target = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object {
        $_.MainWindowTitle -match 'News Studio|Google Flow|Flow'
      } | Select-Object -First 1

      # 2. If not found by title, target by port 9222 connection
      if (-not $target) {
        $conn = Get-NetTCPConnection -LocalPort 9222 -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($conn -and $conn.OwningProcess) {
          $target = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        }
      }

      if ($target) {
        $wshell.AppActivate($target.Id)
      }
    `;
    spawnSync("powershell.exe", ["-NoProfile", "-Command", psScript]);
  } catch {}
}

/**
 * Updates the floating in-browser status banner in Google Flow
 */
export async function updateFlowBanner(page: Page, message: string, icon = "🎬"): Promise<void> {
  try {
    await page.evaluate((msg: string, icn: string) => {
      let banner = document.getElementById("newsstudio-status-banner");
      if (!banner) {
        banner = document.createElement("div");
        banner.id = "newsstudio-status-banner";
        banner.style.position = "fixed";
        banner.style.top = "18px";
        banner.style.left = "50%";
        banner.style.transform = "translateX(-50%)";
        banner.style.zIndex = "9999999";
        banner.style.background = "#1e1b4b";
        banner.style.color = "#ffffff";
        banner.style.padding = "10px 24px";
        banner.style.borderRadius = "9999px";
        banner.style.boxShadow = "0 10px 25px rgba(0,0,0,0.6), 0 0 20px #6366f1";
        banner.style.fontFamily = "system-ui, -apple-system, sans-serif";
        banner.style.fontSize = "14px";
        banner.style.fontWeight = "600";
        banner.style.border = "2px solid #818cf8";
        banner.style.transition = "all 0.3s ease";
        banner.style.pointerEvents = "none";
        document.body.appendChild(banner);
      }
      banner.textContent = `${icn} NewsStudio: ${msg}`;
    }, message, icon);
  } catch {}
}

/**
 * Ensures Google Flow is open and focused on the correct section (root video canvas or character)
 */
export async function ensureFlowProjectPage(
  browser: Browser,
  projectConfig: FlowProjectConfig,
  targetSection: "root" | "character" = "root"
): Promise<Page> {
  const pages = await browser.pages();
  const targetUrl = targetSection === "character"
    ? `https://flow.google.com/project/${projectConfig.projectId}/character`
    : `https://flow.google.com/project/${projectConfig.projectId}`;

  // 1. Look for a tab already within this project ID
  let page = pages.find((p: Page) => p.url().includes(projectConfig.projectId));
  if (page) {
    const currentUrl = page.url().replace(/\/$/, "");
    const expectedUrl = targetUrl.replace(/\/$/, "");

    if (currentUrl !== expectedUrl) {
      console.log(`📍 Switching tab from [${currentUrl}] to [${expectedUrl}]...`);
      // Dismiss subviews (such as /character/ or /edit/) if active
      await page.evaluate(() => {
        const btn = document.querySelector(
          'button[aria-label*="Done" i], button.back-button, button[aria-label*="Back" i]'
        ) as HTMLElement | null;
        if (btn) btn.click();
      });
      await new Promise((r) => setTimeout(r, 1000));

      await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
      await new Promise((r) => setTimeout(r, 2000));
    }

    await page.bringToFront();
    bringChromeWindowToForeground();
    await updateFlowBanner(page, `Connected to [${projectConfig.projectName}]`, "🎬");
    return page;
  }

  // 2. Look for any open flow.google.com tab
  page = pages.find((p: Page) => p.url().includes("flow.google.com"));
  if (page) {
    console.log(`📍 Found open Flow tab (${page.url()}). Navigating to [${projectConfig.projectName}]...`);
    await page.bringToFront();
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await new Promise((r) => setTimeout(r, 2500));
    bringChromeWindowToForeground();
    await updateFlowBanner(page, `Connected to [${projectConfig.projectName}]`, "🎬");
    return page;
  }

  // 3. Open a new tab and navigate
  const targetPage = pages.length > 0 ? pages[0] : await browser.newPage();
  console.log(`🚀 Navigating to Google Flow project [${projectConfig.projectName}]...`);
  await targetPage.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
  await new Promise((r) => setTimeout(r, 3000));
  await targetPage.bringToFront();
  bringChromeWindowToForeground();
  await updateFlowBanner(targetPage, `Connected to [${projectConfig.projectName}]`, "🎬");
  return targetPage;
}

/**
 * Launches an interactive, visible Chrome window directly on the user's desktop (WinSta0\\Default)
 */
export async function launchInteractiveChromeWindow(url?: string): Promise<void> {
  const targetUrl = url || DEFAULT_FLOW_PROJECT_URL;
  await ensureChromeDebugRunning({ targetUrl });
}

/**
 * Connects to active Chrome on port 9222 or launches an interactive visible window on the user's desktop
 */
export async function getChromeBrowser(headless: boolean = false): Promise<Browser> {
  let isConnected = false;
  try {
    const res = await fetch("http://127.0.0.1:9222/json/version");
    if (res.ok) isConnected = true;
  } catch {}

  if (!isConnected) {
    await launchInteractiveChromeWindow();
  }

  try {
    const browser = await puppeteer.connect({
      browserURL: "http://127.0.0.1:9222",
      protocolTimeout: 240000,
    });
    console.log("✔ Connected to active Chrome debugging session on port 9222.");
    return browser as unknown as Browser;
  } catch {
    console.log("🚀 Fallback: Launching Google Chrome directly via Puppeteer...");
    return await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: headless ? true : false,
      userDataDir: USER_DATA_DIR,
      defaultViewport: null,
      args: [
        "--new-window",
        "--start-maximized",
        "--remote-debugging-port=9222",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-blink-features=AutomationControlled",
      ],
      protocolTimeout: 240000,
    });
  }
}

/**
 * Registers or updates a Persona in Google Flow Characters section
 */
export async function registerPersonaInFlow(
  personaSlug: string,
  options: FlowWebOptions = {}
): Promise<{ success: boolean; characterConfig: FlowCharacterConfig; error?: string }> {
  const config = getFlowCharacterConfig(personaSlug);
  const projectConfig = resolveFlowProjectConfig(options);

  console.log("\n==================================================================");
  console.log(`👤 REGISTERING PERSONA IN GOOGLE FLOW CHARACTERS: [${config.characterName}]`);
  console.log("==================================================================");
  console.log(`Project:        ${projectConfig.projectName} (${projectConfig.projectUrl})`);
  console.log(`Tag:            ${config.tag}`);
  console.log(`Attire:         ${config.defaultAttire}`);
  console.log(`Headshot:       ${config.headshotPath || "None"}`);
  console.log(`Body Ref:       ${config.bodyRefPath || "None"}`);
  console.log(`Chroma Master:  ${config.chromaMasterPath || "None"}`);
  console.log("------------------------------------------------------------------");

  // Copy registration summary to Windows clipboard
  try {
    const regText = `Character Name: ${config.characterName}\nTag: ${config.tag}\nDescription: ${config.description}\nAttire: ${config.defaultAttire}`;
    spawnSync("powershell.exe", ["-NoProfile", "-Command", `Set-Clipboard -Value @'\n${regText}\n'@`]);
    console.log("📋 Character traits copied to Windows Clipboard!");
  } catch {}

  let browser: Browser | null = null;
  let page: Page;
  try {
    if (options.existingPage) {
      page = options.existingPage;
      const targetUrl = `https://flow.google.com/project/${projectConfig.projectId}/character`;
      console.log(`📍 Navigating active Flow page to Character Studio: ${targetUrl}...`);
      await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
      await new Promise((r) => setTimeout(r, 2000));
    } else {
      browser = await getChromeBrowser(options.headless ?? false);
      page = await ensureFlowProjectPage(browser, projectConfig, "character");
    }
    bringChromeWindowToForeground();
    await updateFlowBanner(page, `Registering Character: [${config.characterName}]...`, "👤");

    await new Promise((r) => setTimeout(r, 2000));

    const hasHeadshot = config.headshotPath && fs.existsSync(config.headshotPath);

    if (hasHeadshot) {
      console.log(`📤 Uploading Persona Headshot reference: ${config.headshotPath}`);
      await updateFlowBanner(page, `Uploading Headshot: [${path.basename(config.headshotPath!)}]...`, "🖼️");

      // Intercept file chooser and click the footer Upload button
      try {
        const [fileChooser] = await Promise.all([
          page.waitForFileChooser({ timeout: 12000 }),
          page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll("button, div[role='button']"));
            const uploadBtn = btns.find((b) => {
              const t = (b.textContent || "").toLowerCase();
              const aria = (b.getAttribute("aria-label") || "").toLowerCase();
              return (t.includes("upload") && !t.includes("download")) || aria.includes("upload");
            });
            if (uploadBtn) {
              (uploadBtn as HTMLElement).click();
            }
          }),
        ]);

        await fileChooser.accept([config.headshotPath!]);
        console.log("✔ Headshot reference uploaded to Google Flow.");
      } catch (uploadErr) {
        console.warn("⚠️ FileChooser error on initial upload, checking for fallback input:", uploadErr);
        const fileInput = await page.$('input[type="file"]');
        if (fileInput) {
          await fileInput.uploadFile(config.headshotPath!);
          console.log("✔ Headshot uploaded via fallback input element.");
        }
      }

      // Check for and accept "Rights to use this image" modal
      await new Promise((r) => setTimeout(r, 1500));
      for (let attempt = 0; attempt < 8; attempt++) {
        const accepted = await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll("button, div[role='button']"));
          const agreeBtn = btns.find((b) => (b.textContent || "").trim().toLowerCase() === "i agree");
          if (agreeBtn) {
            (agreeBtn as HTMLElement).click();
            return true;
          }
          return false;
        });
        if (accepted) {
          console.log("✔ Rights consent modal accepted ('I agree').");
          break;
        }
        await new Promise((r) => setTimeout(r, 800));
      }

      // Wait for Character Studio Editor to mount
      console.log("⏳ Waiting for Character Studio Editor to load...");
      let editorReady = false;
      for (let attempt = 0; attempt < 15; attempt++) {
        await new Promise((r) => setTimeout(r, 1000));
        editorReady = await page.evaluate(() => {
          return !!(
            document.querySelector("input.name-input, .pencil-button") ||
            document.querySelector("textarea.personality-textarea")
          );
        });
        if (editorReady) break;
      }

      if (editorReady) {
        console.log("✔ Character Studio Editor is active.");

        // Resolve chosen attire / wardrobe
        const chosenAttire = options.wardrobe || config.defaultAttire;

        // Determine body reference strategy: "prompt" (inline Flow generation) vs "upload" (turnaround image)
        const shouldUsePromptGen =
          options.bodyMode === "prompt" ||
          (!config.bodyRefPath && options.bodyMode !== "upload");

        if (shouldUsePromptGen) {
          console.log(`✨ Generating Body Reference inline in Google Flow prompt space using Nano Banana Pro...`);
          await updateFlowBanner(page, `Generating Body Reference via Flow Nano Banana Pro...`, "🍌");

          try {
            // Click "Create body" chip button
            await page.evaluate(() => {
              const chips = Array.from(document.querySelectorAll(".chip-button, button"));
              const bodyChip = chips.find((c) => (c.textContent || "").toLowerCase().includes("body"));
              if (bodyChip) (bodyChip as HTMLElement).click();
            });
            await new Promise((r) => setTimeout(r, 1500));

            // Wait for prompt box to become ready
            const promptBox = await page.$(".ProseMirror");
            if (promptBox) {
              await promptBox.click();
              await page.keyboard.down("Control");
              await page.keyboard.press("A");
              await page.keyboard.up("Control");
              await page.keyboard.press("Backspace");

              const bodyPrompt = `Full length 4-view 360-degree character turnaround reference sheet for ${config.characterName}: 1) Front view, 2) Right profile, 3) Back view, 4) Left profile. Wearing ${chosenAttire}. Standing neutral pose against studio cyclorama.`;
              await page.keyboard.type(bodyPrompt, { delay: 10 });
              await new Promise((r) => setTimeout(r, 800));

              // Click Start generation button
              const genBtn = await page.$('button[aria-label="Start generation"], .generate-icon-button');
              if (genBtn) {
                await genBtn.click();
                console.log("🚀 Flow body generation triggered! Waiting for completion...");

                // Poll until generation reaches 100% or finishes
                for (let poll = 0; poll < 30; poll++) {
                  await new Promise((r) => setTimeout(r, 2000));
                  const progress = await page.evaluate(() => {
                    const text = document.body.innerText;
                    const match = text.match(/(\d+)%/);
                    return match ? match[1] : null;
                  });
                  if (progress) {
                    await updateFlowBanner(page, `Generating Body Reference: ${progress}%...`, "⏳");
                  }
                  if (!progress || progress === "100") {
                    console.log("✔ Body reference generated successfully inside Google Flow.");
                    await new Promise((r) => setTimeout(r, 2000));
                    break;
                  }
                }
              }
            }
          } catch (inlineErr) {
            console.warn("ℹ️ Inline body generation error (proceeding):", inlineErr);
          }
        } else if (config.bodyRefPath && fs.existsSync(config.bodyRefPath)) {
          console.log(`📤 Uploading Body Reference: ${config.bodyRefPath}`);
          await updateFlowBanner(page, `Uploading Body Reference: [${path.basename(config.bodyRefPath)}]...`, "🧍");

          try {
            // 1. Click "Create body" / "Body" chip
            await page.evaluate(() => {
              const chips = Array.from(document.querySelectorAll(".chip-button, button, div[role='button']"));
              const bodyChip = chips.find((c) => (c.textContent || "").toLowerCase().includes("body"));
              if (bodyChip) (bodyChip as HTMLElement).click();
            });
            await new Promise((r) => setTimeout(r, 1500));

            // 2. Intercept FileChooser and click Upload button
            const [bodyChooser] = await Promise.all([
              page.waitForFileChooser({ timeout: 12000 }),
              page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll("button, div[role='button']"));
                const uploadBtn = btns.find((b) => {
                  const t = (b.textContent || "").trim().toLowerCase();
                  return (t === "upload" || t.includes("upload")) && !t.includes("download");
                });
                if (uploadBtn) (uploadBtn as HTMLElement).click();
              }),
            ]);

            await bodyChooser.accept([config.bodyRefPath]);
            console.log("✔ Body reference uploaded.");
            await new Promise((r) => setTimeout(r, 2000));

            // 3. Handle rights consent if prompted
            for (let attempt = 0; attempt < 5; attempt++) {
              const agreed = await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll("button, div[role='button']"));
                const agreeBtn = btns.find((b) => (b.textContent || "").trim().toLowerCase() === "i agree");
                if (agreeBtn) {
                  (agreeBtn as HTMLElement).click();
                  return true;
                }
                return false;
              });
              if (agreed) {
                console.log("✔ Body rights consent accepted ('I agree').");
                break;
              }
              await new Promise((r) => setTimeout(r, 800));
            }
          } catch (bodyErr) {
            console.warn("ℹ️ Body reference upload skipped or handled:", bodyErr);
          }
        }

        // 1. Set Character Name
        console.log(`📝 Writing Character Name [${config.characterName}]...`);
        await updateFlowBanner(page, `Setting name [${config.characterName}]...`, "✍️");

        try {
          const nameInput = await page.$('input.name-input, input.editable-text-input');
          if (nameInput) {
            await nameInput.click({ clickCount: 3 });
            await page.keyboard.down("Control");
            await page.keyboard.press("A");
            await page.keyboard.up("Control");
            await page.keyboard.press("Backspace");
            await page.keyboard.type(config.characterName, { delay: 15 });
            await page.keyboard.press("Enter");
            console.log(`✔ Character name set to [${config.characterName}].`);
          } else {
            await page.evaluate(() => {
              const pencil = document.querySelector('button[aria-label="Edit name"], .pencil-button');
              if (pencil) (pencil as HTMLElement).click();
            });
            await new Promise((r) => setTimeout(r, 600));

            const inp = await page.$('input.name-input, input.editable-text-input');
            if (inp) {
              await inp.click({ clickCount: 3 });
              await page.keyboard.down("Control");
              await page.keyboard.press("A");
              await page.keyboard.up("Control");
              await page.keyboard.press("Backspace");
              await page.keyboard.type(config.characterName, { delay: 15 });
              await page.keyboard.press("Enter");
              console.log(`✔ Character name set to [${config.characterName}].`);
            }
          }
        } catch (nameErr) {
          console.warn("ℹ️ Could not set character name via input:", nameErr);
        }

        // 2. Select Google Flow Voice
        if (config.voiceName) {
          console.log(`🎙️ Selecting Google Flow Voice: [${config.voiceName}]...`);
          await updateFlowBanner(page, `Selecting Voice: [${config.voiceName}]...`, "🎙️");

          try {
            // Click "Select a voice" button
            const voiceOpened = await page.evaluate(() => {
              const btns = Array.from(document.querySelectorAll("button"));
              const voiceBtn = btns.find(
                (b) =>
                  (b.textContent || "").includes("Select a voice") ||
                  b.className.includes("voice-selector")
              );
              if (voiceBtn) {
                (voiceBtn as HTMLElement).click();
                return true;
              }
              return false;
            });

            if (voiceOpened) {
              await new Promise((r) => setTimeout(r, 1500));

              // Click target voice by name in the modal
              const voiceSelected = await page.evaluate((targetVoice: string) => {
                const all = Array.from(document.querySelectorAll("*"));
                const match = all.find(
                  (el) =>
                    el.children.length === 0 &&
                    (el.textContent || "").trim().toLowerCase() === targetVoice.toLowerCase()
                );
                if (match) {
                  const clickable = match.closest("button") || match.parentElement || match;
                  (clickable as HTMLElement).click();
                  return true;
                }
                return false;
              }, config.voiceName);

              if (voiceSelected) {
                console.log(`✔ Voice [${config.voiceName}] selected in library.`);
                await new Promise((r) => setTimeout(r, 800));

                // If sample dialogue exists, inject it into the dialogue preview box
                if (config.sampleDialogue) {
                  try {
                    const sampleBox = await page.$(
                      'textarea[placeholder*="dialogue"], input[placeholder*="dialogue"], .cdk-overlay-container textarea'
                    );
                    if (sampleBox) {
                      await sampleBox.click();
                      await page.keyboard.down("Control");
                      await page.keyboard.press("A");
                      await page.keyboard.up("Control");
                      await page.keyboard.press("Backspace");
                      await page.keyboard.type(config.sampleDialogue.slice(0, 120), { delay: 10 });
                    }
                  } catch {}
                }

                // Click "Add to character" button
                await page.evaluate(() => {
                  const btns = Array.from(document.querySelectorAll("button"));
                  const addBtn = btns.find(
                    (b) => (b.textContent || "").trim().toLowerCase() === "add to character"
                  );
                  if (addBtn) (addBtn as HTMLElement).click();
                });
                console.log(`✔ Voice [${config.voiceName}] bound to character.`);
                await new Promise((r) => setTimeout(r, 1200));
              }
            }
          } catch (voiceErr) {
            console.warn("ℹ️ Voice selection error (proceeding):", voiceErr);
          }
        }

        // 3. Fill Character Info (Description & Continuity Contract)
        console.log(`📝 Writing Character info description...`);
        await updateFlowBanner(page, `Writing character continuity contract...`, "📜");

        try {
          const focused = await page.evaluate(() => {
            const t = document.querySelector('textarea.personality-textarea, textarea[placeholder*="character acts"]');
            if (t) {
              t.scrollIntoView({ behavior: "instant", block: "center" });
              (t as HTMLElement).focus();
              return true;
            }
            return false;
          });

          if (focused) {
            await page.keyboard.down("Control");
            await page.keyboard.press("A");
            await page.keyboard.up("Control");
            await page.keyboard.press("Backspace");
            await page.keyboard.type(config.description, { delay: 1 });
            console.log("✔ Character info description written successfully via keyboard events.");
          } else {
            console.warn("⚠️ personality-textarea not found for typing.");
          }
        } catch (descErr) {
          console.warn("ℹ️ Could not type description via keyboard:", descErr);
        }

        await new Promise((r) => setTimeout(r, 1500));

        // 4. Click Done editing (Save to project canvas)
        console.log("💾 Saving Character to Google Flow project canvas...");
        await updateFlowBanner(page, `Saving [${config.characterName}] to canvas...`, "💾");

        const saved = await page.evaluate(() => {
          const doneBtn =
            document.querySelector<HTMLElement>('button[aria-label="Done editing"], button.check-button') ||
            Array.from(document.querySelectorAll("button")).find(
              (b) => (b.textContent || "").trim().toLowerCase() === "done"
            );
          if (doneBtn) {
            doneBtn.click();
            return true;
          }
          return false;
        });

        if (saved) {
          console.log("✔ Done editing clicked. Waiting for canvas sync...");
          await new Promise((r) => setTimeout(r, 4000));
        }
      }
    } else {
      // Fallback: Text prompt character creation
      console.log(`📝 Injecting character prompt into description box...`);
      await page.evaluate((desc: string) => {
        const pm = document.querySelector(".ProseMirror");
        if (pm) {
          (pm as HTMLElement).focus();
          document.execCommand("insertText", false, desc);
        }
      }, config.description);

      await new Promise((r) => setTimeout(r, 1500));

      console.log("🚀 Triggering character generation...");
      await page.evaluate(() => {
        const genBtn = document.querySelector('button[aria-label="Start generation"], .generate-icon-button');
        if (genBtn) (genBtn as HTMLElement).click();
      });
      await new Promise((r) => setTimeout(r, 5000));
    }

    await updateFlowBanner(page, `Character Registered: [${config.characterName}]!`, "🎉");

    console.log(`\n🎉 Persona [${config.characterName}] (${config.tag}) successfully registered in Google Flow!`);
    console.log(`   Project: ${projectConfig.projectName} (${projectConfig.projectUrl})`);
    console.log(`   Tag in prompts: ${config.tag}`);
    config.allReferenceImages.forEach((img, idx) => {
      console.log(`   Ref ${idx + 1}: file:///${img.replace(/\\/g, "/")}`);
    });
    console.log("==================================================================\n");

    return { success: true, characterConfig: config };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("❌ Google Flow Character Registration Error:", errorMsg);
    return { success: false, characterConfig: config, error: errorMsg };
  } finally {
    if (!options.existingPage && browser && typeof browser.disconnect === "function") {
      try { browser.disconnect(); } catch {}
    }
  }
}

/**
 * Attaches a registered Flow character chip (e.g. Blaze Wilder or Ruby Vance) to the prompt bar.
 * If the character is not yet registered in the Flow project, autonomously registers them
 * via Character Studio and attaches the resulting character chip.
 */
export async function ensureCharacterChipAttached(
  page: Page,
  characterName: string,
  options: FlowWebOptions = {}
): Promise<boolean> {
  if (!characterName) return false;
  const cleanName = characterName.replace(/^@/, "").trim();
  const slug = cleanName.toLowerCase().split(/\s+/)[0];
  let displayName = cleanName;
  let aliases = [cleanName];
  try {
    const charConfig = getFlowCharacterConfig(slug);
    if (charConfig) {
      displayName = charConfig.shortName || charConfig.characterName;
      aliases = charConfig.aliases || [displayName, charConfig.characterName, cleanName];
    }
  } catch {}
  if (!aliases.includes(displayName)) aliases.unshift(displayName);
  if (!aliases.includes(cleanName)) aliases.push(cleanName);

  try {
    // 1. Check if Character chip is already attached in the prompt box
    const alreadyAttached = await page.evaluate(() => {
      const box = document.querySelector("flow-base-prompt-box, flow-prompt-bar");
      if (!box) return false;
      const charChip = box.querySelector("flow-character-ingredient-chip");
      return !!charChip;
    });

    if (alreadyAttached) {
      console.log(`✔ Character chip [${displayName}] already attached to prompt bar.`);
      return true;
    }

    // 2. Open "Add ingredients" menu (.add-menu-trigger)
    console.log(`📍 Attaching existing character chip [${displayName}] via Add Ingredients menu...`);
    let isMenuOpen = await page.evaluate(() => {
      return !!document.querySelector(
        ".cdk-overlay-container button[role='option'], .cdk-overlay-container button.asset-item, .cdk-overlay-container flow-add-menu-popover-content"
      );
    });

    if (!isMenuOpen) {
      const triggerClicked = await page.evaluate(() => {
        const box = document.querySelector("flow-base-prompt-box, flow-prompt-bar");
        const btn = box?.querySelector(
          'button[aria-label="Add ingredients to the prompt box"], button.add-menu-trigger'
        ) as HTMLElement | null;
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });

      if (!triggerClicked) {
        console.log(`ℹ️ Add ingredients trigger not found; proceeding with text prompt.`);
        return false;
      }
      await new Promise((r) => setTimeout(r, 1200));
    }

    // 3. Search and select the existing character item from the overlay
    let selected = await page.evaluate((aliasesList: string[]) => {
      const items = Array.from(
        document.querySelectorAll(
          '.cdk-overlay-container button[role="option"], .cdk-overlay-container button, .cdk-overlay-container .asset-item'
        )
      );

      // 1. Match item containing any alias AND "character"
      for (const alias of aliasesList) {
        const match = items.find((el) => {
          const text = (el.textContent || "").toLowerCase();
          return text.includes(alias.toLowerCase()) && text.includes("character");
        }) as HTMLElement | null;
        if (match) {
          match.click();
          return true;
        }
      }

      // 2. Match item containing any alias
      for (const alias of aliasesList) {
        const match = items.find((el) => {
          const text = (el.textContent || "").toLowerCase();
          return text.includes(alias.toLowerCase());
        }) as HTMLElement | null;
        if (match) {
          match.click();
          return true;
        }
      }

      return false;
    }, aliases);

    // If not found in initial overlay list, type in search box to filter
    if (!selected) {
      try {
        const searchInput = await page.$(
          '.cdk-overlay-container input[placeholder*="Search" i], .cdk-overlay-container input, input.search-input'
        );
        if (searchInput) {
          await searchInput.click({ clickCount: 3 });
          await page.keyboard.down("Control");
          await page.keyboard.press("A");
          await page.keyboard.up("Control");
          await page.keyboard.press("Backspace");
          // Search with shortName (e.g. RubyV)
          await page.keyboard.type(displayName, { delay: 15 });
          await new Promise((r) => setTimeout(r, 900));

          selected = await page.evaluate((aliasesList: string[]) => {
            const items = Array.from(
              document.querySelectorAll(
                '.cdk-overlay-container button[role="option"], .cdk-overlay-container button, .cdk-overlay-container .asset-item'
              )
            );
            for (const alias of aliasesList) {
              const match = items.find((el) => {
                const text = (el.textContent || "").toLowerCase();
                return text.includes(alias.toLowerCase());
              }) as HTMLElement | null;
              if (match) {
                match.click();
                return true;
              }
            }
            return false;
          }, aliases);
        }
      } catch {}
    }

    // 4. If selected, click "Add to prompt", close overlay, and verify chip inside prompt box
    if (selected) {
      await new Promise((r) => setTimeout(r, 600));
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll(".cdk-overlay-container button"));
        const addBtn = buttons.find((b) =>
          (b.textContent || "").trim().toLowerCase().includes("add to prompt")
        ) as HTMLElement | null;
        if (addBtn) addBtn.click();
      });
      await new Promise((r) => setTimeout(r, 800));
      await page.keyboard.press("Escape").catch(() => {});
      await new Promise((r) => setTimeout(r, 400));

      const chipAttached = await page.evaluate(() => {
        const box = document.querySelector("flow-base-prompt-box, flow-prompt-bar");
        return !!box?.querySelector("flow-character-ingredient-chip");
      });

      if (chipAttached) {
        console.log(`✔ Attached existing character chip [${displayName}]!`);
        return true;
      }
    }

    // 5. If character was NOT found: Close overlay cleanly
    await page.keyboard.press("Escape").catch(() => {});
    await new Promise((r) => setTimeout(r, 500));

    // Only register a new Character if explicitly allowed (persona was never loaded as one)
    if (!options.allowRegistration) {
      console.log(`ℹ️ Character [${displayName}] not found in Google Flow library. Proceeding without character chip (will not auto-create).`);
      return false;
    }

    console.log(`⚠️ Persona [${displayName}] was never loaded as a character in Google Flow. Registering new character once...`);
    await updateFlowBanner(page, `Registering new Character [${displayName}] in Flow...`, "👤");
    const regResult = await registerPersonaInFlow(slug, {
      ...options,
      existingPage: page,
    });

    if (!regResult.success) {
      console.warn(`⚠️ Could not register [${displayName}]: ${regResult.error || "Unknown error"}`);
      return false;
    }

    // Navigate back to root project canvas
    const projectConfig = resolveFlowProjectConfig(options);
    const rootUrl = `https://flow.google.com/project/${projectConfig.projectId}`;
    await page.goto(rootUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await new Promise((r) => setTimeout(r, 3000));

    // Re-attach the newly registered character without re-registering
    return await ensureCharacterChipAttached(page, displayName, { ...options, allowRegistration: false });
  } catch (err: unknown) {
    console.warn("⚠️ Notice attaching character chip:", err);
    await page.keyboard.press("Escape").catch(() => {});
    return false;
  }
}

/**
 * Attaches up to 3 conditioned reference images (persona reference first, product photos second)
 * into Google Flow's prompt bar ingredients.
 */
/**
 * Searches for or uploads an asset image into Google Flow via the open cdk-overlay-container.
 * Handles:
 * 1. Matching existing ready assets in the overlay list.
 * 2. Uploading new assets via file chooser.
 * 3. Polling for upload completion until Google Flow finishes processing (no progress bar, not uploading).
 * 4. Clicking the ready asset, which automatically attaches the ingredient chip to the prompt box.
 */
async function selectOrUploadAssetInOverlay(
  page: Page,
  filePath: string,
  cleanBase: string
): Promise<boolean> {
  const fileName = path.basename(filePath);

  // Helper to find and click an asset item that is ready (not uploading)
  const tryClickReadyAsset = async (targetName: string): Promise<boolean> => {
    return await page.evaluate((name: string) => {
      const items = Array.from(
        document.querySelectorAll(
          ".cdk-overlay-container button.asset-item, .cdk-overlay-container button[role='option'], .cdk-overlay-container flow-asset-list-item, .cdk-overlay-container .asset-item"
        )
      );
      const match = items.find((el) => {
        const text = (el.textContent || "").toLowerCase();
        return text.includes(name.toLowerCase());
      }) as HTMLElement | null;

      if (match) {
        const text = (match.textContent || "").toLowerCase();
        const isUploading =
          text.includes("uploading") ||
          match.querySelector("mat-progress-bar, mat-spinner, [role='progressbar']") !== null;
        if (!isUploading) {
          const btn = (match.tagName === "BUTTON" ? match : match.querySelector("button")) || match;
          btn.click();
          return true;
        }
      }
      return false;
    }, targetName);
  };

  // Step 1: Check if item already exists and is ready in the overlay list
  let clicked = await tryClickReadyAsset(cleanBase);
  if (clicked) {
    console.log(`✔ Found existing ready asset [${fileName}] in Flow library, attached!`);
    await new Promise((r) => setTimeout(r, 800));
    return true;
  }

  // Step 2: If not found or still uploading, trigger file upload
  console.log(`📤 Uploading reference [${fileName}] into Flow project library...`);
  try {
    const fileInput = await page.$('.cdk-overlay-container input[type="file"], input[type="file"]');
    if (fileInput) {
      await fileInput.uploadFile(filePath);
    } else {
      const [fileChooser] = await Promise.all([
        page.waitForFileChooser({ timeout: 5000 }),
        page.evaluate(() => {
          const uploadBtn = document.querySelector(
            ".cdk-overlay-container button.upload-button, .cdk-overlay-container [aria-label*='Upload' i], button.upload-button"
          ) as HTMLElement | null;
          if (uploadBtn) uploadBtn.click();
        }),
      ]);
      await fileChooser.accept([filePath]);
    }
  } catch (uploadErr) {
    console.warn(`⚠️ File upload trigger notice for [${fileName}]:`, uploadErr);
  }

  // Step 3: Poll until upload is processed and ready (up to 30 seconds, polling every 500ms)
  console.log(`⏳ Waiting for Google Flow to process upload [${fileName}]...`);
  for (let attempt = 0; attempt < 60; attempt++) {
    await new Promise((r) => setTimeout(r, 500));
    clicked = await tryClickReadyAsset(cleanBase);
    if (clicked) {
      console.log(`🎉 [${fileName}] processed and attached at ${(attempt + 1) * 0.5}s!`);
      await new Promise((r) => setTimeout(r, 800));
      return true;
    }
  }

  console.warn(`⚠️ Timed out waiting for [${fileName}] to finish uploading in Flow.`);
  return false;
}

/**
 * Attaches up to 3 conditioned reference images (persona reference first, product photos second)
 * into Google Flow's prompt bar ingredients.
 */
export async function ensureReferenceImagesAttached(
  page: Page,
  imagePaths: string[],
  maxImages: number = 3
): Promise<number> {
  try {
    // Check if Character chip is already attached in prompt box
    const hasCharChip = await page.evaluate(() => {
      const box = document.querySelector("flow-base-prompt-box, flow-prompt-bar");
      return !!box?.querySelector("flow-character-ingredient-chip");
    });

    // Strict 3-ingredient Google Flow limit:
    // If character chip is attached (1), at most 2 reference images can be attached (total = 3).
    // If no character chip is attached (0), at most 3 reference images can be attached (total = 3).
    const effectiveMaxImages = hasCharChip ? Math.min(maxImages, 2) : Math.min(maxImages, 3);
    const validPaths = (imagePaths || [])
      .map((p) => (typeof p === "string" ? path.resolve(p.trim()) : ""))
      .filter((p) => p && fs.existsSync(p))
      .slice(0, effectiveMaxImages);

    if (validPaths.length === 0) return 0;

    // Remove any stale image chips left over from previous runs so we don't exceed 3 ingredients
    await page.evaluate(() => {
      const box = document.querySelector("flow-base-prompt-box, flow-prompt-bar");
      if (!box) return;
      const oldImageChips = Array.from(
        box.querySelectorAll("flow-image-ingredient-chip")
      );
      for (const chip of oldImageChips) {
        const btn = chip.querySelector(".hover-icon-overlay, mat-icon, button") as HTMLElement | null;
        if (btn) btn.click();
      }
    });
    await new Promise((r) => setTimeout(r, 400));

    console.log(`📍 Attaching ${validPaths.length} conditioned reference photo(s) to Google Flow prompt bar (Max allowed with Character: ${effectiveMaxImages})...`);
    let attachedCount = 0;

    for (let i = 0; i < validPaths.length; i++) {
      const refPath = validPaths[i];
      const fileName = path.basename(refPath);
      const cleanBase = fileName.replace(/\.[^/.]+$/, "");

      // Check if menu is open; if not, open it
      const isMenuOpen = await page.evaluate(() => {
        return !!document.querySelector(
          ".cdk-overlay-container button[role='option'], .cdk-overlay-container button.asset-item, .cdk-overlay-container flow-add-menu-popover-content"
        );
      });

      if (!isMenuOpen) {
        let triggerClicked = await page.evaluate(() => {
          const box = document.querySelector("flow-base-prompt-box, flow-prompt-bar");
          const btn = box?.querySelector(
            'button[aria-label="Add ingredients to the prompt box"], button.add-menu-trigger'
          ) as HTMLElement | null;
          if (btn) {
            btn.click();
            return true;
          }
          return false;
        });

        if (!triggerClicked) {
          console.log("ℹ️ Add ingredients trigger button not visible; checking if Flow is in Frames mode and recovering...");
          // Try auto-recovery: open settings and switch to Ingredients mode
          await page.evaluate(() => {
            const btn = document.querySelector("button[aria-label='Settings trigger'], .settings-trigger-button") as HTMLElement | null;
            if (btn) btn.click();
          });
          await new Promise((r) => setTimeout(r, 800));

          await page.evaluate(() => {
            const toggles = Array.from(document.querySelectorAll("mat-button-toggle"));
            const ingToggle = toggles.find((t) => (t.textContent || "").toLowerCase().includes("ingredient")) as HTMLElement | null;
            if (ingToggle) {
              const btn = (ingToggle.querySelector("button") || ingToggle) as HTMLElement;
              btn.click();
            }
          });
          await new Promise((r) => setTimeout(r, 600));
          await page.keyboard.press("Escape").catch(() => {});
          await new Promise((r) => setTimeout(r, 600));

          // Re-try finding the Add ingredients button
          triggerClicked = await page.evaluate(() => {
            const box = document.querySelector("flow-base-prompt-box, flow-prompt-bar");
            const btn = box?.querySelector(
              'button[aria-label="Add ingredients to the prompt box"], button.add-menu-trigger'
            ) as HTMLElement | null;
            if (btn) {
              btn.click();
              return true;
            }
            return false;
          });

          if (!triggerClicked) {
            console.warn("⚠️ Add ingredients trigger button still not visible after recovery; proceeding with text prompt.");
            break;
          }
        }
        await new Promise((r) => setTimeout(r, 1200));
      }

      const selected = await selectOrUploadAssetInOverlay(page, refPath, cleanBase);
      if (selected) {
        await new Promise((r) => setTimeout(r, 400));
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll(".cdk-overlay-container button"));
          const addBtn = buttons.find((b) =>
            (b.textContent || "").trim().toLowerCase().includes("add to prompt")
          ) as HTMLElement | null;
          if (addBtn) addBtn.click();
        });
        await new Promise((r) => setTimeout(r, 600));

        // Check if chip was added to prompt bar
        const currentChipCount = await page.evaluate(() => {
          const box = document.querySelector("flow-base-prompt-box, flow-prompt-bar");
          return box?.querySelectorAll("flow-image-ingredient-chip").length || 0;
        });

        if (currentChipCount > attachedCount) {
          attachedCount = currentChipCount;
        } else {
          attachedCount++;
        }
        console.log(`✔ Attached reference photo ${attachedCount}/${validPaths.length} [${fileName}] as Flow ingredient!`);
        cliLogger.stage("ATTACHING_INGREDIENTS", `Attached reference [${fileName}] as Flow ingredient`);
        await new Promise((r) => setTimeout(r, 800));
      }
    }

    // Close the overlay cleanly if still open
    await page.keyboard.press("Escape").catch(() => {});
    await new Promise((r) => setTimeout(r, 500));

    // Verify attached chips in prompt bar (count top-level chips)
    const chipCount = await page.evaluate(() => {
      const box = document.querySelector("flow-base-prompt-box, flow-prompt-bar");
      if (!box) return 0;
      return box.querySelectorAll("flow-character-ingredient-chip, flow-image-ingredient-chip").length;
    });
    console.log(`✔ Verified Flow prompt bar contains ${chipCount} ingredient chip elements (Character: ${hasCharChip ? 1 : 0}, Images: ${attachedCount}).`);

    return attachedCount;
  } catch (err) {
    console.warn("⚠️ Notice attaching reference images:", err);
    await page.keyboard.press("Escape").catch(() => {});
    return 0;
  }
}

/**
 * Attaches Start and/or End conditioning frames in Google Flow Frames Mode (for avatar master videos & action loops)
 */
export async function ensureFramesAttached(
  page: Page,
  startFramePath?: string,
  endFramePath?: string
): Promise<{ startAttached: boolean; endAttached: boolean }> {
  let startAttached = false;
  let endAttached = false;

  // 1. Attach Start Frame
  if (startFramePath && fs.existsSync(startFramePath)) {
    const fileName = path.basename(startFramePath);
    const cleanBase = fileName.replace(/\.[^/.]+$/, "");
    console.log(`📍 Attaching Start Frame [${fileName}] for avatar loop...`);

    const startBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("flow-base-prompt-box button, .base-prompt-box button"));
      const b = btns.find((el) => (el.textContent || "").trim().toLowerCase() === "start") as HTMLElement | null;
      if (b) {
        b.click();
        return true;
      }
      return false;
    });

    if (startBtn) {
      await new Promise((r) => setTimeout(r, 1200));
      const selected = await selectOrUploadAssetInOverlay(page, startFramePath, cleanBase);
      startAttached = selected;
      if (selected) {
        console.log(`✔ Start frame [${fileName}] attached successfully!`);
      }
      await page.keyboard.press("Escape").catch(() => {});
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  // 2. Attach End Frame
  if (endFramePath && fs.existsSync(endFramePath)) {
    const fileName = path.basename(endFramePath);
    const cleanBase = fileName.replace(/\.[^/.]+$/, "");
    console.log(`📍 Attaching End Frame [${fileName}] for boundary-locked loop...`);

    const endBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("flow-base-prompt-box button, .base-prompt-box button"));
      const b = btns.find((el) => (el.textContent || "").trim().toLowerCase() === "end") as HTMLElement | null;
      if (b) {
        b.click();
        return true;
      }
      return false;
    });

    if (endBtn) {
      await new Promise((r) => setTimeout(r, 1200));
      const selected = await selectOrUploadAssetInOverlay(page, endFramePath, cleanBase);
      endAttached = selected;
      if (selected) {
        console.log(`✔ End frame [${fileName}] attached successfully!`);
      }
      await page.keyboard.press("Escape").catch(() => {});
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  return { startAttached, endAttached };
}

/**
 * Generates an 8-second master video on Google Flow (flow.google.com)
 */
export async function runVeoWithFlowWeb(
  compiled: CompiledVeoPrompt,
  options: FlowWebOptions = {}
): Promise<VeoGenerationResult> {
  const outputDir = compiled.outputDirectory
    ? path.resolve(process.cwd(), compiled.outputDirectory)
    : getVeoActionLoopsDir();
  const targetFile = path.join(outputDir, `${compiled.baseName}.mp4`);

  const projectConfig = resolveFlowProjectConfig({
    ...options,
    projectId: options.projectId || compiled.flowProjectId,
    projectUrl: options.projectUrl || compiled.flowProjectUrl,
    projectName: options.projectName || compiled.flowProjectName,
  });

  const settings = getResolvedFlowSettings({
    videoModel: options.flowModel || (compiled.model as any) || "veo-3.1-lite",
    confirmPolicy: options.confirmPolicy,
    aspectRatio: compiled.aspectRatio,
    duration: `${compiled.durationSeconds}s` as "4s" | "6s" | "8s" | "10s",
  });

  const creditCost = calculateFlowCredits(
    settings.videoModel,
    "720p",
    compiled.durationSeconds,
    1,
    true
  );

  console.log("\n==================================================================");
  console.log(`🎬 GOOGLE FLOW (VEO 3.1) AUTONOMOUS VIDEO GENERATION`);
  console.log("==================================================================");
  console.log(`Project:       ${projectConfig.projectName} (${projectConfig.projectUrl})`);
  console.log(`BaseName:      ${compiled.baseName}`);
  console.log(`Resolution:    720p (Base Native) ➔ 1080p (Ultra Free Upscale)`);
  console.log(`Model:         ${settings.videoModel} (${creditCost.creditsPerClip} credits, Ultra tier)`);
  console.log(`Duration:      ${compiled.durationSeconds}s`);
  console.log(`Aspect Ratio:  ${compiled.aspectRatio || "16:9"}`);
  console.log(`Confirm Mode:  ${settings.confirmPolicy.toUpperCase()}`);
  if (compiled.characterTag) {
    console.log(`Character:     ${compiled.characterTag}`);
  }
  if (compiled.attire) {
    console.log(`Attire:        ${compiled.attire}`);
  }
  console.log(`Prompt:        "${compiled.prompt.substring(0, 100)}..."`);
  console.log("------------------------------------------------------------------");

  // Copy prompt to clipboard
  try {
    spawnSync("powershell.exe", ["-NoProfile", "-Command", `Set-Clipboard -Value @'\n${compiled.prompt}\n'@`]);
    console.log("📋 Full prompt copied to Windows Clipboard!");
  } catch {}

  let browser: Browser | null = null;

  try {
    browser = await getChromeBrowser(options.headless ?? false);
    const page = await ensureFlowProjectPage(browser, projectConfig);

    // Set download path to action_loops dir
    try {
      const client = await page.target().createCDPSession();
      await client.send("Page.setDownloadBehavior", {
        behavior: "allow",
        downloadPath: outputDir,
      });
    } catch {}

    await new Promise((r) => setTimeout(r, 2000));

    // Decide whether this is a Frames workflow (action loops / avatar master videos / FLF) or Ingredients workflow (Persona + Products)
    const isFramesWorkflow =
      options.promptMode === "frames" ||
      Boolean(compiled.endImagePath) ||
      (options.promptMode !== "ingredients" &&
        !Array.isArray(compiled.referenceImagePaths) &&
        Boolean(compiled.imagePath) &&
        (compiled.motionMode === "seamless_loop" || compiled.motionMode === "forward_articulation"));

    settings.promptMode = isFramesWorkflow ? "frames" : "ingredients";

    // Calibrate Flow settings (Confirm: Never + Prompt Settings: Video · 720p · 8s · 16:9 · Model · Mode)
    await updateFlowBanner(page, `Calibrating Prompt Settings (Video · 720p · 8s · ${settings.promptMode.toUpperCase()})...`, "⚙️");
    if (options.syncSettings) {
      await syncFlowAgentSettings(page, settings);
    }
    await syncFlowPromptSettings(page, settings);

    const targetCharName = (compiled.characterTag || "").replace(/^@/, "").trim();
    let textToType = filterPromptForSafety(compiled.prompt);
    if (targetCharName && !isFramesWorkflow) {
      const regex = new RegExp(`^@?${targetCharName}\\s*`, "i");
      textToType = textToType.replace(regex, "");
    }
    // Re-verify clean syntax
    textToType = filterPromptForSafety(textToType);

    // Step 1: Attach Conditioning FIRST (Character Chip + Reference Photos, or Frames Mode)
    let hasCharChip = false;
    if (isFramesWorkflow) {
      console.log("📍 Attaching Start & End conditioning frames (Avatar / Action Loop Mode)...");
      await updateFlowBanner(page, "Attaching Start & End Conditioning Frames...", "🎞️");
      await ensureFramesAttached(page, compiled.imagePath, compiled.endImagePath);
    } else {
      // Ingredients mode: Attach character chip + reference photos
      if (targetCharName) {
        hasCharChip = await ensureCharacterChipAttached(page, targetCharName, options);
      }

      const refImageCandidates: string[] = [];
      if (compiled.imagePath && fs.existsSync(compiled.imagePath)) {
        refImageCandidates.push(path.resolve(compiled.imagePath));
      }
      if (Array.isArray(compiled.referenceImagePaths)) {
        for (const p of compiled.referenceImagePaths) {
          const resolved = path.resolve(p);
          if (fs.existsSync(resolved) && !refImageCandidates.includes(resolved)) {
            refImageCandidates.push(resolved);
          }
        }
      }
      if (refImageCandidates.length > 0) {
        const maxImages = hasCharChip ? 2 : 3;
        console.log(`📍 Attaching ${Math.min(refImageCandidates.length, maxImages)} reference photo(s)...`);
        await updateFlowBanner(page, `Attaching ${Math.min(refImageCandidates.length, maxImages)} reference photo(s)...`, "🖼️");
        await ensureReferenceImagesAttached(page, refImageCandidates, maxImages);
      }
    }

    await new Promise((r) => setTimeout(r, 600));

    // Step 2: Inject Multiline Prompt safely into ProseMirror
    // Using document.execCommand('insertText') and Shift+Enter avoids Puppeteer's keyboard.type
    // which fires standalone Enter keypresses on newlines and causes premature generation!
    console.log("📍 Typing prompt into Google Flow prompt bar...");
    await updateFlowBanner(page, `Injecting Prompt for ${compiled.characterTag || "Presenter"}...`, "📝");

    const promptInserted = await page.evaluate((text: string) => {
      const box = document.querySelector("flow-base-prompt-box, flow-prompt-bar");
      const pm = box?.querySelector(".ProseMirror, [contenteditable='true']") as HTMLElement | null;
      if (!pm) return false;

      pm.focus();
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(pm);
      sel?.removeAllRanges();
      sel?.addRange(range);

      document.execCommand("insertText", false, text);
      pm.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, cancelable: true, inputType: "insertText", data: " " }));
      pm.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true, inputType: "insertText", data: " " }));
      return true;
    }, textToType);

    if (promptInserted) {
      // Subtle space + backspace key strokes to trigger Angular form change detection without submitting
      await page.keyboard.press("Space");
      await page.keyboard.press("Backspace");
      await new Promise((r) => setTimeout(r, 500));
      console.log("✔ Prompt typed successfully into Google Flow!");
    } else {
      // Fallback selector typing with Shift+Enter for newlines
      const promptSelectors = [
        'flow-base-prompt-box div[contenteditable="true"].ProseMirror',
        'div[contenteditable="true"].ProseMirror',
        'flow-base-prompt-box div[contenteditable="true"]',
        'div[contenteditable="true"]',
        'flow-base-prompt-box [role="textbox"]',
        'textarea',
      ];
      for (const sel of promptSelectors) {
        try {
          const el = await page.$(sel);
          if (el) {
            await el.click();
            await page.keyboard.down("Control");
            await page.keyboard.press("A");
            await page.keyboard.up("Control");
            await page.keyboard.press("Backspace");

            const paragraphs = textToType.split(/\r?\n/);
            for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
              if (paragraphs[pIdx]) {
                await page.keyboard.type(paragraphs[pIdx], { delay: 1 });
              }
              if (pIdx < paragraphs.length - 1) {
                await page.keyboard.down("Shift");
                await page.keyboard.press("Enter");
                await page.keyboard.up("Shift");
              }
            }
            console.log("✔ Prompt typed successfully into Google Flow!");
            break;
          }
        } catch {}
      }
    }

    await new Promise((r) => setTimeout(r, 800));

    // Ensure generate button is enabled in ProseMirror
    await page.evaluate(() => {
      const box = document.querySelector("flow-base-prompt-box, flow-prompt-bar");
      const btn = box?.querySelector("button.generate-icon-button, button[aria-label='Start generation']") as HTMLButtonElement | null;
      if (btn && btn.disabled) {
        const editor = box?.querySelector(".ProseMirror, [contenteditable='true']") as HTMLElement | null;
        if (editor) {
          editor.focus();
          editor.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
    });

    // Record current top video tile ID to prevent downloading stale previous video
    const initialFirstTileMediaId = await page.evaluate(() => {
      const firstTile = document.querySelector("flow-video-tile");
      if (!firstTile) return null;
      const img = firstTile.querySelector("img");
      const src = img ? img.src : "";
      const idMatch =
        src.match(/flow-content\.google\/(?:image|video)\/([a-zA-Z0-9_-]+)/) ||
        src.match(/\/asb\/([a-zA-Z0-9_-]+)/);
      return idMatch ? idMatch[1] : null;
    });

    // Step 2: Trigger Generation
    console.log("📍 Clicking 'Generate' button...");
    await updateFlowBanner(page, "Submitting to Google Veo 3.1 Cluster...", "🚀");
    const generateClicked = await page.evaluate(() => {
      // First try start generation button
      const startBtn = document.querySelector(
        "button[aria-label='Start generation'], flow-generate-icon-button button"
      ) as HTMLButtonElement | null;
      if (startBtn && !startBtn.disabled) {
        startBtn.click();
        return true;
      }

      const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
      const genBtn = buttons.find((b) => {
        const text = (b.textContent || "").trim().toLowerCase();
        const aria = (b.getAttribute("aria-label") || "").toLowerCase();
        return (
          text === "generate" ||
          text === "create" ||
          text === "generar" ||
          text === "crear" ||
          aria.includes("generate") ||
          aria.includes("create")
        );
      });
      if (genBtn) {
        (genBtn as HTMLElement).click();
        return true;
      }
      return false;
    });

    if (generateClicked) {
      console.log("✔ 'Generate' clicked! Veo 3.1 rendering started on Google cluster.");
    } else {
      console.log("Pressing Enter to submit generation...");
      await page.keyboard.press("Enter");
    }

    console.log(`\n⏳ Rendering ${compiled.durationSeconds}s video in Google Flow (~60–120s)...`);
    await updateFlowBanner(page, `Rendering ${compiled.durationSeconds}s Video in Google Flow (~60–120s)...`, "⏳");
    const timeout = options.timeoutMs || 240000;
    const downloadedPath = await waitForFlowVideo(page, outputDir, USER_DOWNLOADS_DIR, compiled.baseName, timeout, initialFirstTileMediaId);

    if (downloadedPath && fs.existsSync(downloadedPath)) {
      console.log(`\n🎉 Google Flow Video Generated & Saved to Workspace Successfully!`);
      printClickablePath(downloadedPath);
      await updateFlowBanner(page, "Video Generated & Saved to Workspace Successfully!", "🎉");

      // Trigger 1080p Ultra free upscaling if enabled
      if (settings.upscale1080p) {
        await updateFlowBanner(page, "Triggering 1080p Ultra Free Upscaling...", "✨");
        await triggerFlow1080pUpscale(page);
      }

      // If forward_articulation mode or palindrome requested, generate 16s seamless loop
      if (compiled.motionMode === "forward_articulation" || options.createPalindrome) {
        console.log(`\n🔄 Generating Palindromic (Forward + Reverse) Seamless Cycle...`);
        const palindromePath = await generatePalindromicLoop(downloadedPath, { outputDir });
        if (palindromePath) {
          return {
            success: true,
            videoPath: palindromePath,
            durationSeconds: compiled.durationSeconds * 2,
            baseName: path.basename(palindromePath, ".mp4"),
          };
        }
      }

      return {
        success: true,
        videoPath: downloadedPath,
        durationSeconds: compiled.durationSeconds,
        baseName: compiled.baseName,
      };
    }

    console.log(`\n💡 If video finished generating in Flow:`);
    console.log(`   Click Download ➔ Save to: file:///${targetFile.replace(/\\/g, "/")}\n`);

    return {
      success: false,
      baseName: compiled.baseName,
      error: "Awaiting manual download from Google Flow",
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("\n❌ Google Flow Automation Notice:", errorMsg);
    return { success: false, baseName: compiled.baseName, error: errorMsg };
  } finally {
    if (browser && typeof browser.disconnect === "function") {
      try { browser.disconnect(); } catch {}
    }
  }
}

/**
 * Monitors downloads and DOM for video output
 */
async function waitForFlowVideo(
  page: Page,
  targetDir: string,
  downloadsDir: string,
  baseName: string,
  timeoutMs: number,
  initialFirstTileMediaId?: string | null
): Promise<string | null> {
  const startTime = Date.now();
  const targetFile = path.join(targetDir, `${baseName}.mp4`);
  let elapsedSec = 0;

  let activeUpsampledUrl: string | null = null;
  const reqListener = (req: any) => {
    const url = req.url();
    if (url.includes("_upsampled") && url.includes("Expires=")) {
      activeUpsampledUrl = url;
    }
  };
  page.on("request", reqListener);

  try {
    while (Date.now() - startTime < timeoutMs) {
      await new Promise((r) => setTimeout(r, 4000));
      elapsedSec += 4;
      process.stdout.write(` ⏱️ ${elapsedSec}s `);

      // Check for direct 1080p signed URL capture
      if (activeUpsampledUrl) {
        try {
          execSync(`curl.exe -s "${activeUpsampledUrl}" -o "${targetFile}"`);
          if (fs.existsSync(targetFile) && fs.statSync(targetFile).size > 100000) {
            console.log(`\n✔ Downloaded verified 1080p Full HD video stream: ${targetFile}`);
            return targetFile;
          }
        } catch {}
      }

      // 1. Check targetDir for direct file
      if (fs.existsSync(targetFile) && fs.statSync(targetFile).size > 100000) {
        return targetFile;
      }

      // 2. Check targetDir for any new mp4
      if (fs.existsSync(targetDir)) {
        try {
          const files = fs.readdirSync(targetDir);
          for (const file of files) {
            if (file.toLowerCase().endsWith(".mp4")) {
              const fullPath = path.join(targetDir, file);
              const stats = fs.statSync(fullPath);
              if (stats.mtimeMs >= startTime && stats.size > 100000) {
                if (fullPath !== targetFile) {
                  fs.copyFileSync(fullPath, targetFile);
                  try { fs.unlinkSync(fullPath); } catch {}
                }
                return targetFile;
              }
            }
          }
        } catch {}
      }

      // 3. Check Downloads folder
      if (fs.existsSync(downloadsDir)) {
        try {
          const files = fs.readdirSync(downloadsDir);
          for (const file of files) {
            if (file.toLowerCase().endsWith(".mp4")) {
              const fullPath = path.join(downloadsDir, file);
              const stats = fs.statSync(fullPath);
              if (stats.mtimeMs >= startTime && stats.size > 100000) {
                fs.copyFileSync(fullPath, targetFile);
                console.log(`\n✔ Detected downloaded video in Downloads: ${file} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
                return targetFile;
              }
            }
          }
        } catch {}
      }

      // 3b. Check Flow page for completed video tile and direct RPC URL
      try {
        const flowTileInfo = await page.evaluate(async (ignoreId: string | null | undefined) => {
          const tiles = Array.from(document.querySelectorAll("flow-video-tile"));
          if (tiles.length === 0) return null;
          const firstTile = tiles[0];
          const text = (firstTile.textContent || "").toLowerCase();
          const isFailed = text.includes("failed") || text.includes("violate");
          const isGenerating = text.includes("generating") || text.includes("creating") || text.includes("rendering");

          const errorEl = firstTile.querySelector(".error-message, flow-error-tile, [class*='error']");
          const errorText = errorEl ? (errorEl.textContent || "").trim().replace(/\s+/g, " ") : (isFailed ? text : "");

          const img = firstTile.querySelector("img");
          const src = img ? img.src : "";
          const idMatch =
            src.match(/flow-content\.google\/(?:image|video)\/([a-zA-Z0-9_-]+)/) ||
            src.match(/\/asb\/([a-zA-Z0-9_-]+)/);
          const mediaId = idMatch ? idMatch[1] : null;

          // Ignore stale previous tile if it hasn't updated yet
          if (ignoreId && mediaId === ignoreId) {
            return null;
          }

          // Call as29s RPC to get signed CDN video URL
          let signedVideoUrl: string | null = null;
          if (mediaId && !isGenerating && !isFailed) {
            try {
              const at = (window as any).WIZ_global_data?.SNlM0e || "";
              const fReq = JSON.stringify([[["as29s", JSON.stringify([mediaId]), null, "generic"]]]);
              const body = new URLSearchParams();
              body.set("f.req", fReq);
              if (at) body.set("at", at);

              const resp = await fetch("/_/AiSandboxAngularFrontend/data/batchexecute?rpcids=as29s", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
                body: body.toString(),
                credentials: "include",
              });
              if (resp.ok) {
                const textResp = await resp.text();
                const clean = textResp.replace(/^\)\]\}'\s*/, "");
                const parsed = JSON.parse(clean);
                const innerData = JSON.parse(parsed[0][2]);
                if (innerData && innerData[7] && innerData[7][0] && innerData[7][0][8]) {
                  signedVideoUrl = innerData[7][0][8];
                }
              }
            } catch {}
          }

          return {
            mediaId,
            isFailed,
            errorText,
            isGenerating,
            signedVideoUrl,
          };
        }, initialFirstTileMediaId);

        // Immediate fail-fast detection: stop waiting 240s if Flow tile shows failure
        if (flowTileInfo?.isFailed) {
          const rawErr = flowTileInfo.errorText || "Sorry, this video failed to generate.";
          console.error(`\n❌ Google Flow video tile reported failure: ${rawErr}`);
          cliLogger.stage("FAILED", `Google Flow tile reported failure: ${rawErr}`);
          await updateFlowBanner(page, `Generation Failed in Google Flow (${rawErr.slice(0, 40)}...)`, "❌");

          let reason = "Google Flow generation was rejected on Google cluster.";
          const isPolicyTrigger =
            rawErr.toLowerCase().includes("failed") ||
            rawErr.toLowerCase().includes("violate") ||
            rawErr.toLowerCase().includes("policy") ||
            rawErr.toLowerCase().includes("safety");

          if (isPolicyTrigger) {
            reason = "Google Content Policy Rejection: The video was rejected by Google Flow because the prompt contained sensitive fashion terms ('bodice' / 'corset') or the reference image neckline triggered Google's automated safety filter. (No credits charged).";
          } else {
            reason = `Google Flow Cluster Failure: ${rawErr} (No credits charged).`;
          }

          throw new Error(`[FLOW_POLICY_OR_CLUSTER_FAILED] ${reason}`);
        }

        if (flowTileInfo?.signedVideoUrl) {
          console.log(`\n✔ Resolved Flow signed video stream for media [${flowTileInfo.mediaId}]! Downloading...`);
          cliLogger.stage("DOWNLOADING_RPC", `Resolved Flow signed video stream for media [${flowTileInfo.mediaId}]. Downloading...`);
          try {
            execSync(`curl.exe -s "${flowTileInfo.signedVideoUrl}" -o "${targetFile}"`);
            if (fs.existsSync(targetFile) && fs.statSync(targetFile).size > 100000) {
              console.log(`✔ Downloaded full video directly via Google Flow RPC: ${targetFile}`);
              cliLogger.stage("COMPLETED", `Downloaded full video via Google Flow RPC to ${targetFile}`);
              // Sync to action_loops folder as well
              const actionLoopsTarget = path.join(getVeoActionLoopsDir(), `${baseName}.mp4`);
              if (targetFile !== actionLoopsTarget) {
                try {
                  fs.copyFileSync(targetFile, actionLoopsTarget);
                } catch {}
              }
              return targetFile;
            }
          } catch (dlErr) {
            console.warn("⚠️ Curl download notice:", dlErr);
          }
        }
      } catch (domErr: any) {
        if (domErr instanceof Error && domErr.message.includes("[FLOW_POLICY_OR_CLUSTER_FAILED]")) {
          throw domErr;
        }
      }
    }
  } finally {
    page.off("request", reqListener);
  }

  return null;
}

/**
 * Standalone runner for synchronizing Google Flow Agent Settings & Prompt Bar Defaults
 */
export async function syncFlowProjectEnvironment(
  options: FlowWebOptions = {}
): Promise<{ success: boolean; error?: string }> {
  const projectConfig = resolveFlowProjectConfig(options);
  let browser: Browser | null = null;

  try {
    console.log("==================================================================");
    console.log(`🔧 SYNCHRONIZING GOOGLE FLOW SETTINGS: ${projectConfig.projectName}`);
    console.log("==================================================================");

    browser = await getChromeBrowser(options.headless ?? false);
    const page = await ensureFlowProjectPage(browser, projectConfig);

    const settings = getResolvedFlowSettings({
      videoModel: options.flowModel,
      confirmPolicy: options.confirmPolicy,
    });

    await syncFlowAgentSettings(page, settings);
    await syncFlowPromptSettings(page, settings);

    console.log("✔ Settings successfully calibrated in Google Flow!");
    console.log("==================================================================\n");

    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("❌ Failed to synchronize Flow settings:", errorMsg);
    return { success: false, error: errorMsg };
  } finally {
    if (browser && typeof browser.disconnect === "function") {
      try { browser.disconnect(); } catch {}
    }
  }
}

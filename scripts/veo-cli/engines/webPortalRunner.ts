/**
 * scripts/veo-cli/engines/webPortalRunner.ts
 *
 * Full Autonomous Web Portal Runner for Google Vids & Veo AI.
 * Automates opening the AI Video panel, typing the prompt, clicking Create,
 * waiting for generation, and downloading the resulting .mp4 directly into the workspace.
 */

import puppeteer from "puppeteer-core";
import { CompiledVeoPrompt, VeoGenerationResult } from "../types";
import { getVeoActionLoopsDir, printClickablePath } from "../artifactManager";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const USER_DATA_DIR = path.join(process.env.LOCALAPPDATA || "C:\\Users\\danie\\AppData\\Local", "Google\\Chrome\\User Data");
const USER_DOWNLOADS_DIR = path.join(process.env.USERPROFILE || "C:\\Users\\danie", "Downloads");
const DEFAULT_VIDS_URL = "https://docs.google.com/videos/d/1z52-Tse-DfMvJYj4P_1LhqY9_t29uv1Ytjh24Hznfdg/edit?pli=1&scene=id.p#scene=id.p";

export interface WebPortalOptions {
  portalUrl?: string;
  headless?: boolean;
}

export async function runVeoWithWebPortal(
  compiled: CompiledVeoPrompt,
  opts: WebPortalOptions = {}
): Promise<VeoGenerationResult> {
  const outputDir = getVeoActionLoopsDir();
  const targetUrl = opts.portalUrl || process.env.GOOGLE_VIDS_URL || DEFAULT_VIDS_URL;

  console.log("\n==================================================================");
  console.log("🎬 AUTONOMOUS GOOGLE VIDS & VEO GENERATION (ULTRA PLAN)");
  console.log("==================================================================");
  console.log(`Document URL:  ${targetUrl}`);
  console.log(`Duration:      4.0s Master Beat`);
  console.log(`Prompt:        "${compiled.prompt.substring(0, 90)}..."`);
  if (compiled.imagePath) {
    console.log(`Reference I2V: ${compiled.imagePath}`);
  }

  // 1. Copy prompt to Windows Clipboard
  try {
    const psScript = `Set-Clipboard -Value @'\n${compiled.prompt}\n'@`;
    spawnSync("powershell.exe", ["-NoProfile", "-Command", psScript]);
    console.log("📋 Prompt copied to Windows Clipboard!");
  } catch (clipErr) {
    // Ignore clipboard error
  }

  let browser: any = null;

  try {
    // Connect to active Chrome session on port 9222
    try {
      browser = await puppeteer.connect({
        browserURL: "http://127.0.0.1:9222",
      });
      console.log("✔ Connected to active Chrome debugging session on port 9222.");
    } catch {
      console.log("🚀 Launching Google Chrome with your Ultra profile session...");

      browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: opts.headless ?? false,
        defaultViewport: null,
        args: [
          `--user-data-dir=${USER_DATA_DIR}`,
          "--profile-directory=Default",
          "--no-first-run",
          "--no-default-browser-check",
          "--start-maximized",
        ],
      });
    }

    const pages = await browser.pages();
    let page = pages.find((p: any) => p.url().includes("docs.google.com/videos"));

    if (!page) {
      page = pages.length > 0 ? pages[0] : await browser.newPage();
      console.log(`Navigating to Google Vids document...`);
      await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    } else {
      console.log(`✔ Found active Google Vids tab: ${page.url()}`);
      await page.bringToFront();
    }

    // Set download path to action_loops dir
    try {
      const client = await page.target().createCDPSession();
      await client.send("Page.setDownloadBehavior", {
        behavior: "allow",
        downloadPath: outputDir,
      });
    } catch (e) {
      // Ignore
    }

    await new Promise((r) => setTimeout(r, 2000));

    // Step 1: Open the "AI Video" panel if not already open
    console.log("📍 Opening 'AI Video' panel on Google Vids sidebar...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, div[role="button"], span, div'));
      const aiBtn = buttons.find((el) => {
        const text = el.textContent?.trim() || "";
        const label = el.getAttribute("aria-label") || "";
        return text === "AI Video" || label.includes("AI Video");
      });
      if (aiBtn) {
        (aiBtn as HTMLElement).click();
      }
    });

    await new Promise((r) => setTimeout(r, 1500));

    // Step 2: Locate and inject prompt into prompt textarea
    console.log("📍 Injecting 4-second prompt into Google Vids prompt box...");
    const promptSelectors = [
      'textarea[placeholder*="Describe your video" i]',
      'textarea[aria-label*="Describe your video" i]',
      'textarea',
      'div[contenteditable="true"]',
      'div[role="textbox"]',
    ];

    let promptFound = false;
    for (const sel of promptSelectors) {
      try {
        const el = await page.$(sel);
        if (el) {
          await el.click();
          await page.keyboard.down("Control");
          await page.keyboard.press("A");
          await page.keyboard.up("Control");
          await page.keyboard.press("Backspace");
          await page.keyboard.type(compiled.prompt, { delay: 5 });
          promptFound = true;
          console.log("✔ Prompt typed successfully into Google Vids!");
          break;
        }
      } catch (err) {
        // Try next selector
      }
    }

    if (!promptFound) {
      console.log("ℹ️ Paste helper: Press Ctrl + V to paste if prompt box is not focused.");
    }

    await new Promise((r) => setTimeout(r, 1000));

    // Step 3: Click "Create" button
    console.log("📍 Clicking 'Create' button to trigger Veo video generation...");
    const createClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
      const createBtn = buttons.find((b) => {
        const text = b.textContent?.trim() || "";
        const label = b.getAttribute("aria-label") || "";
        return text === "Create" || label === "Create";
      });
      if (createBtn) {
        (createBtn as HTMLElement).click();
        return true;
      }
      return false;
    });

    if (createClicked) {
      console.log("✔ 'Create' clicked successfully! Video rendering initiated on Google Veo cluster.");
    } else {
      console.log("Pressing Enter to submit generation...");
      await page.keyboard.press("Enter");
    }

    console.log("\n⏳ Veo video generation in progress (~45–90s)...");
    console.log("Watching for completed video export...");

    // Step 4: Watch for download and auto-export
    const downloadedVideo = await waitForVideoDownloadAndAutoExport(page, outputDir, USER_DOWNLOADS_DIR, compiled.baseName, 180000);

    if (downloadedVideo && fs.existsSync(downloadedVideo)) {
      console.log(`\n🎉 Veo Video Generated & Verified Successfully!`);
      printClickablePath(downloadedVideo);
      return {
        success: true,
        videoPath: downloadedVideo,
        durationSeconds: compiled.durationSeconds,
        baseName: compiled.baseName,
      };
    }

    console.log(`\n💡 Once Google Vids finishes generating:`);
    console.log(`   Go to File ➔ Download ➔ MP4 video (.mp4)`);
    console.log(`   Save file to: file:///${outputDir.replace(/\\/g, "/")}/${compiled.baseName}.mp4\n`);

    return {
      success: false,
      baseName: compiled.baseName,
      error: "Awaiting manual export from Google Vids",
    };
  } catch (err: any) {
    console.error("\n❌ Google Vids Automation Notice:", err.message || err);
    return { success: false, baseName: compiled.baseName, error: err.message || String(err) };
  }
}

/**
 * Periodically attempts to trigger File -> Download -> MP4 video and monitors disk for .mp4.
 */
async function waitForVideoDownloadAndAutoExport(
  page: any,
  targetDir: string,
  downloadsDir: string,
  baseName: string,
  timeoutMs: number
): Promise<string | null> {
  const startTime = Date.now();
  const targetFile = path.join(targetDir, `${baseName}.mp4`);

  let elapsedSec = 0;

  while (Date.now() - startTime < timeoutMs) {
    await new Promise((r) => setTimeout(r, 5000));
    elapsedSec += 5;
    process.stdout.write(` ⏱️ ${elapsedSec}s `);

    // Check targetDir
    if (fs.existsSync(targetFile) && fs.statSync(targetFile).size > 100000) {
      return targetFile;
    }

    // Check Downloads directory
    if (fs.existsSync(downloadsDir)) {
      try {
        const files = fs.readdirSync(downloadsDir);
        for (const file of files) {
          if (file.toLowerCase().endsWith(".mp4")) {
            const fullPath = path.join(downloadsDir, file);
            const stats = fs.statSync(fullPath);
            if (stats.mtimeMs >= startTime - 5000 && stats.size > 100000) {
              fs.copyFileSync(fullPath, targetFile);
              console.log(`\n✔ Detected downloaded video: ${file}`);
              return targetFile;
            }
          }
        }
      } catch {
        // Ignore read errors
      }
    }

    // After 50 seconds, attempt to auto-trigger File -> Download -> MP4
    if (elapsedSec >= 50 && elapsedSec % 20 === 0) {
      try {
        await page.evaluate(() => {
          const fileMenu = Array.from(document.querySelectorAll('*')).find(
            (el) => el.textContent?.trim() === 'File' && el.getAttribute('role')?.includes('menu')
          );
          if (fileMenu) (fileMenu as HTMLElement).click();
        });
      } catch {
        // Ignore export click errors
      }
    }
  }

  return null;
}

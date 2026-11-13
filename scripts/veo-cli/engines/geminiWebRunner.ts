/**
 * scripts/veo-cli/engines/geminiWebRunner.ts
 *
 * Dedicated Visible/Headful Runner for Google Gemini Web App (gemini.google.com/app).
 * Features:
 *   • Google AI Ultra Subscription automation ($0 extra API cost)
 *   • Universal Completion & Failure Response Inspector:
 *       - Checks if Gemini stopped thinking / generating without producing a video
 *       - Detects high traffic ("unusually high traffic right now generating videos and am at full capacity...")
 *       - Detects prompt cut-off ("It looks like your message got cut off!...")
 *       - Detects policy refusals, generic text answers, and missing video cards
 *   • Automatic exponential backoff & fresh-thread retry engine (up to 3 attempts)
 *   • Direct clipboard & file-input image attachment
 *   • Live download monitoring with cross-directory scanning
 */

import puppeteer from "puppeteer-core";
import { CompiledVeoPrompt, VeoGenerationResult } from "../types";
import { getVeoActionLoopsDir, printClickablePath } from "../artifactManager";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const GEMINI_WEB_URL = "https://gemini.google.com/app";
let cachedConversationUrl: string | null = null;

export interface GeminiWebOptions {
  headless?: boolean;
  maxRetries?: number;
}

export type GeminiErrorType = "high_traffic" | "cut_off" | "no_video_text_only" | "refusal" | "timeout" | "unknown";

interface GeminiDetectionResult {
  hasError: boolean;
  errorType?: GeminiErrorType;
  errorMessage?: string;
  isStillThinking?: boolean;
  hasVideo?: boolean;
}

/**
 * Universally scans Gemini chat DOM to check if Gemini has stopped thinking/generating
 * and whether a video or failure text response was produced.
 */
async function inspectGeminiResponseUniversal(page: any): Promise<GeminiDetectionResult> {
  try {
    const status = await page.evaluate(() => {
      // 1. Check if Gemini is still thinking / generating / streaming
      const stopBtns = Array.from(document.querySelectorAll('button, div[role="button"]')).filter((b) => {
        const aria = (b.getAttribute("aria-label") || "").toLowerCase();
        const testId = (b.getAttribute("data-testid") || "").toLowerCase();
        return aria.includes("stop") || testId.includes("stop") || b.classList.contains("stop-button");
      });
      const spinners = document.querySelectorAll(
        '.loading, .spinner, mat-spinner, [role="progressbar"], .generating-video, .animating'
      );

      // 2. Extract latest model response text
      const responseNodes = Array.from(
        document.querySelectorAll(
          "model-response, .model-response, message-content, [data-message-author='0'], .response-container, .markdown"
        )
      );
      let latestText = "";
      if (responseNodes.length > 0) {
        const lastNode = responseNodes[responseNodes.length - 1];
        latestText = (lastNode.textContent || "").trim();
      }

      const textLower = (latestText || "").toLowerCase();
      const isGeneratingVideoText =
        textLower.includes("generating your video") ||
        textLower.includes("check back to see when your video is ready") ||
        textLower.includes("defining the scope") ||
        textLower.includes("refining the prompt") ||
        textLower.includes("detailing the motion") ||
        textLower.includes("answer now");

      const isStillThinking = stopBtns.length > 0 || spinners.length > 0 || isGeneratingVideoText;

      // 3. Check if a video element or download button exists in the conversation
      const videoElements = document.querySelectorAll('video, .video-player, video-player, a[download*=".mp4"]');
      const downloadBtns = Array.from(
        document.querySelectorAll('button, a[download], [aria-label*="Download" i], mat-icon')
      ).filter((b) => {
        const aria = (b.getAttribute("aria-label") || "").toLowerCase();
        const text = (b.textContent || "").toLowerCase();
        return aria.includes("download") || text.includes("download");
      });
      const hasVideo = videoElements.length > 0 || downloadBtns.length > 0;

      return { isStillThinking, hasVideo, latestText };
    });

    if (status.hasVideo) {
      return { hasError: false, hasVideo: true, isStillThinking: status.isStillThinking };
    }

    const textLower = status.latestText.toLowerCase();

    // Specific Error Category 1: High Traffic / Capacity
    if (
      textLower.includes("unusually high traffic") ||
      textLower.includes("full capacity") ||
      textLower.includes("too many requests") ||
      textLower.includes("experiencing high traffic") ||
      (textLower.includes("capacity") && textLower.includes("try again later"))
    ) {
      return {
        hasError: true,
        errorType: "high_traffic",
        errorMessage: status.latestText || "I'm sorry, I'm experiencing unusually high traffic right now generating videos and am at full capacity. Please try again later.",
      };
    }

    // Specific Error Category 2: Prompt Cut Off
    if (
      textLower.includes("got cut off") ||
      textLower.includes("message got cut off") ||
      textLower.includes("provide the full prompt") ||
      textLower.includes("clarify what you would like me to generate")
    ) {
      return {
        hasError: true,
        errorType: "cut_off",
        errorMessage: status.latestText || "It looks like your message got cut off! Could you please provide the full prompt or clarify what you would like me to generate or change?",
      };
    }

    // Specific Error Category 3: Safety / Refusal
    if (
      textLower.includes("i cannot generate") ||
      textLower.includes("i am unable to generate") ||
      textLower.includes("violates our policy") ||
      textLower.includes("cannot fulfill this request")
    ) {
      return {
        hasError: true,
        errorType: "refusal",
        errorMessage: status.latestText || "Gemini policy / capability refusal response.",
      };
    }

    // Universal Fallback: Thinking stopped completely, but NO video was generated
    if (!status.isStillThinking && !status.hasVideo && status.latestText.length > 0) {
      return {
        hasError: true,
        errorType: "no_video_text_only",
        errorMessage: status.latestText.substring(0, 200),
      };
    }

    return { hasError: false, isStillThinking: status.isStillThinking };
  } catch {
    return { hasError: false };
  }
}

/**
 * Main execution function with automated retry and backoff logic.
 */
export async function runVeoWithGeminiWeb(
  compiled: CompiledVeoPrompt,
  opts: GeminiWebOptions = {}
): Promise<VeoGenerationResult> {
  const maxRetries = opts.maxRetries ?? 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log("\n==================================================================");
    console.log(`✨ GOOGLE GEMINI ADVANCED WEB RUNNER [Attempt ${attempt}/${maxRetries}]`);
    console.log("==================================================================");
    console.log(`URL:           ${GEMINI_WEB_URL}`);
    console.log(`Plan:          Google AI Ultra ($0 Extra Cost)`);
    console.log(`Duration:      4.0s Master Beat Loop`);
    console.log(`Prompt:        "${compiled.prompt.substring(0, 90)}..."`);
    if (compiled.imagePath) {
      console.log(`Anchor I2V:    ${compiled.imagePath}`);
    }

    const result = await attemptGeminiWebGeneration(compiled, attempt);

    if (result.success) {
      return result;
    }

    const errorType = (result as any).errorType as GeminiErrorType | undefined;

    if (attempt < maxRetries) {
      if (errorType === "high_traffic") {
        const cooldownSec = 35 * attempt;
        console.log(`\n⚠️ [GEMINI HIGH TRAFFIC DETECTED]: Gemini video servers are at capacity.`);
        console.log(`⏳ Cooling down for ${cooldownSec}s before retrying in a clean thread...`);
        cachedConversationUrl = null;
        for (let s = cooldownSec; s > 0; s--) {
          process.stdout.write(` ${s}s `);
          await new Promise((r) => setTimeout(r, 1000));
        }
        console.log("\n");
      } else if (errorType === "cut_off") {
        console.log(`\n⚠️ [PROMPT TRUNCATION DETECTED]: Gemini indicated message was cut off.`);
        console.log(`🔄 Resetting chat session and re-submitting full prompt directly via clipboard...`);
        cachedConversationUrl = null;
        await new Promise((r) => setTimeout(r, 4000));
      } else if (errorType === "no_video_text_only") {
        console.log(`\n⚠️ [NO VIDEO GENERATED / TEXT ONLY]: Gemini responded with text only without generating a video.`);
        console.log(`Response text: "${result.error}"`);
        console.log(`🔄 Resetting chat thread and retrying in a fresh session...`);
        cachedConversationUrl = null;
        await new Promise((r) => setTimeout(r, 6000));
      } else {
        const cooldownSec = 10 * attempt;
        console.log(`\n⚠️ Generation attempt ${attempt} failed (${result.error}). Retrying in ${cooldownSec}s...`);
        cachedConversationUrl = null;
        await new Promise((r) => setTimeout(r, cooldownSec * 1000));
      }
    }
  }

  return {
    success: false,
    baseName: compiled.baseName,
    error: `Exhausted ${maxRetries} retry attempts without successful video generation.`,
  };
}

async function attemptGeminiWebGeneration(
  compiled: CompiledVeoPrompt,
  attempt: number
): Promise<VeoGenerationResult & { errorType?: GeminiErrorType }> {
  const outputDir = compiled.outputDirectory || getVeoActionLoopsDir();
  const userDownloadsDir = path.join(process.env.USERPROFILE || "C:\\Users\\danie", "Downloads");

  // Copy prompt to Windows clipboard
  const fullPromptText = `Create a 4-second video: ${compiled.prompt}`;
  try {
    const psScript = `Set-Clipboard -Value @'\n${fullPromptText}\n'@`;
    spawnSync("powershell.exe", ["-NoProfile", "-Command", psScript]);
    console.log("📋 Prompt copied to Windows Clipboard (Ready for Ctrl + V)!");
  } catch {}

  let browser: any = null;

  try {
    const chromePath = fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
      ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
      : "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
    const userDataDir = path.join(process.env.LOCALAPPDATA || "C:\\Users\\danie\\AppData\\Local", "Google", "Chrome", "AutomationData");

    try {
      browser = await puppeteer.connect({ browserURL: "http://127.0.0.1:9222", protocolTimeout: 240000 });
      console.log("✔ Connected to active Chrome session on port 9222.");
    } catch {
      console.log("🚀 Launching visible Google Chrome window directly on screen...");
      browser = await puppeteer.launch({
        headless: false,
        executablePath: chromePath,
        userDataDir: userDataDir,
        defaultViewport: null,
        args: [
          "--start-maximized",
          "--remote-debugging-port=9222",
          "--no-first-run",
          "--no-default-browser-check",
          "--disable-blink-features=AutomationControlled"
        ],
        protocolTimeout: 240000
      });
      console.log("✔ Launched visible Chrome browser window on screen!");
    }

    const pages = await browser.pages();
    let page = pages.find((p: any) => p.url().includes("gemini.google.com/app"));

    const shouldReuse = false;

    if (!page) {
      page = pages.length > 0 ? pages[0] : await browser.newPage();
      console.log(`Navigating to ${GEMINI_WEB_URL}...`);
      await page.goto(GEMINI_WEB_URL, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
    } else {
      console.log(`✔ Found active Gemini tab: ${page.url()}`);
      await page.bringToFront().catch(() => {});
      console.log("🆕 Navigating to fresh clean Gemini chat thread...");
      await page.goto(GEMINI_WEB_URL, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 2500));
    }

    // Set download behavior
    try {
      const client = await page.target().createCDPSession();
      await client.send("Page.setDownloadBehavior", {
        behavior: "allow",
        downloadPath: outputDir,
      });
    } catch {}

    await new Promise((r) => setTimeout(r, 2000));

    // Helper to safely focus chat input without stale element handle errors
    const focusChatInput = async (): Promise<boolean> => {
      const inputSelectors = [
        'div.ql-editor[contenteditable="true"]',
        'div[contenteditable="true"][role="textbox"]',
        'rich-textarea [contenteditable="true"]',
        'textarea',
        'div[contenteditable="true"]',
      ];
      for (const sel of inputSelectors) {
        try {
          const el = await page.$(sel);
          if (el) {
            await el.click();
            return true;
          }
        } catch {}
      }
      return false;
    };

    await focusChatInput();

    // Upload Reference Images
    const imagesToUpload = [compiled.imagePath, compiled.endImagePath].filter(
      (p): p is string => Boolean(p && fs.existsSync(p))
    );

    if (imagesToUpload.length > 0) {
      console.log(`📎 Uploading ${imagesToUpload.length} reference image(s): ${imagesToUpload.map((p) => path.basename(p)).join(", ")}...`);
      let uploaded = false;

      // Method A: Direct File Input (Pure in-world event dispatch, zero cross-world handle passing)
      try {
        let fileInputs = await page.$$('input[type="file"]');
        if (fileInputs.length === 0) {
          await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, div[role="button"], mat-icon, span'));
            const plusBtn = btns.find((b) => {
              const aria = b.getAttribute("aria-label")?.toLowerCase() || "";
              const text = b.textContent?.trim() || "";
              return aria.includes("add") || aria.includes("upload") || text === "+" || text.includes("add_photo");
            });
            if (plusBtn) (plusBtn as HTMLElement).click();
          });
          await new Promise((r) => setTimeout(r, 800));
          fileInputs = await page.$$('input[type="file"]');
        }

        if (fileInputs.length > 0) {
          const targetInput = fileInputs[fileInputs.length - 1];
          await targetInput.uploadFile(...imagesToUpload);
          // Safely dispatch events inside the page world without passing handle argument
          await page.evaluate(() => {
            const inputs = document.querySelectorAll('input[type="file"]');
            if (inputs.length > 0) {
              const lastInput = inputs[inputs.length - 1];
              lastInput.dispatchEvent(new Event("change", { bubbles: true }));
              lastInput.dispatchEvent(new Event("input", { bubbles: true }));
            }
          });
          uploaded = true;
          console.log(`✔ ${imagesToUpload.length} image(s) uploaded directly via file input!`);
        }
      } catch (err: any) {
        console.warn("⚠️ File input upload notice:", err.message);
      }

      // Method B: Windows Clipboard Paste Fallback
      if (!uploaded) {
        const copyScript = path.join(process.cwd(), "scripts", "copy-image-to-clipboard.ps1");
        for (const imgPath of imagesToUpload) {
          console.log(`📋 Pasting image: ${path.basename(imgPath)} via Windows Clipboard...`);
          spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", copyScript, "-ImagePath", imgPath]);
          await focusChatInput();
          await page.keyboard.down("Control");
          await page.keyboard.press("V");
          await page.keyboard.up("Control");
          await new Promise((r) => setTimeout(r, 1500));
        }
      }

      console.log("⏳ Waiting 4s for image preview chips to mount...");
      await new Promise((r) => setTimeout(r, 4000));
    }

    // Paste prompt directly via clipboard
    console.log("💬 Injecting policy-safe video prompt into Gemini chat input...");
    try {
      const psScript = `Set-Clipboard -Value @'\n${fullPromptText}\n'@`;
      spawnSync("powershell.exe", ["-NoProfile", "-Command", psScript]);
    } catch {}

    await focusChatInput();
    await page.keyboard.down("Control");
    await page.keyboard.press("V");
    await page.keyboard.up("Control");
    console.log("✔ Prompt pasted into Gemini chat!");

    await new Promise((r) => setTimeout(r, 1000));

    // Submit message
    console.log("🚀 Submitting message to Gemini...");
    let sent = false;
    try {
      sent = await page.evaluate(() => {
        const sendBtns = Array.from(document.querySelectorAll('button, div[role="button"]'));
        const sendBtn = sendBtns.find(
          (b) =>
            b.getAttribute("aria-label")?.toLowerCase().includes("send") ||
            b.getAttribute("data-testid")?.includes("send") ||
            b.classList.contains("send-button")
        );
        if (sendBtn) {
          (sendBtn as HTMLElement).click();
          return true;
        }
        return false;
      });
    } catch {}

    if (!sent) {
      try {
        await page.keyboard.press("Enter");
      } catch {}
    }
    console.log("✔ Prompt submitted! Generating video on Google Gemini...");

    console.log("\n⏳ Video generation in progress (~45–90s)...");
    console.log("👀 You can watch the live generation progress in the Chrome window.");
    console.log("Watching for completed video export...");

    // Watch for video download or failure text
    const downloadResult = await waitForGeminiVideoDownloadOrError(
      page,
      outputDir,
      userDownloadsDir,
      compiled.baseName,
      240000
    );

    if (downloadResult.success && downloadResult.filePath && fs.existsSync(downloadResult.filePath)) {
      try {
        cachedConversationUrl = page.url();
      } catch {}
      console.log(`\n🎉 Veo Video Saved & Verified Successfully!`);
      printClickablePath(downloadResult.filePath);
      return {
        success: true,
        videoPath: downloadResult.filePath,
        durationSeconds: compiled.durationSeconds,
        baseName: compiled.baseName,
      };
    }

    return {
      success: false,
      baseName: compiled.baseName,
      error: downloadResult.errorMessage || "Awaiting download from Gemini Web chat",
      errorType: downloadResult.errorType,
    };
  } catch (err: any) {
    console.error("\n❌ Gemini Web Automation Notice:", err.message || err);
    return { success: false, baseName: compiled.baseName, error: err.message || String(err), errorType: "unknown" };
  } finally {
    if (browser) {
      await browser.disconnect().catch(() => {});
    }
  }
}

/**
 * Helper to check if a file is an MP4 video by reading its header bytes.
 */
function isMp4File(filePath: string): boolean {
  try {
    if (!fs.existsSync(filePath) || fs.statSync(filePath).size < 100000) return false;
    const fd = fs.openSync(filePath, "r");
    const buffer = Buffer.alloc(32);
    fs.readSync(fd, buffer, 0, 32, 0);
    fs.closeSync(fd);
    return buffer.includes(Buffer.from("ftyp")) || buffer.includes(Buffer.from("isom")) || buffer.includes(Buffer.from("mp4"));
  } catch {
    return false;
  }
}

/**
 * Periodically searches for video download buttons on Gemini, checks disk, and inspects errors universally.
 */
async function waitForGeminiVideoDownloadOrError(
  page: any,
  targetDir: string,
  downloadsDir: string,
  baseName: string,
  timeoutMs: number
): Promise<{ success: boolean; filePath?: string; errorType?: GeminiErrorType; errorMessage?: string }> {
  const startTime = Date.now();
  const targetFile = path.join(targetDir, `${baseName}.mp4`);
  const tempDir = path.join(process.env.LOCALAPPDATA || "C:\\Users\\danie\\AppData\\Local", "Temp");

  let elapsedSec = 0;

  while (Date.now() - startTime < timeoutMs) {
    await new Promise((r) => setTimeout(r, 4000));
    elapsedSec += 4;
    process.stdout.write(` ⏱️ ${elapsedSec}s `);

    // 1. Check targetDir directly for targetFile or any recent mp4
    if (fs.existsSync(targetFile) && isMp4File(targetFile)) {
      const stats = fs.statSync(targetFile);
      if (stats.mtimeMs >= startTime) {
        return { success: true, filePath: targetFile };
      }
    }
    if (fs.existsSync(targetDir)) {
      try {
        const files = fs.readdirSync(targetDir);
        for (const file of files) {
          const fullPath = path.join(targetDir, file);
          const stats = fs.statSync(fullPath);
          if (stats.mtimeMs >= startTime && isMp4File(fullPath)) {
            if (fullPath !== targetFile) {
              fs.copyFileSync(fullPath, targetFile);
              try { fs.unlinkSync(fullPath); } catch {}
            }
            console.log(`\n✔ Detected downloaded video in output dir: ${file} -> ${path.basename(targetFile)}`);
            return { success: true, filePath: targetFile };
          }
        }
      } catch {}
    }

    // 2. Check Downloads directory for newly created video files
    if (fs.existsSync(downloadsDir)) {
      try {
        const files = fs.readdirSync(downloadsDir);
        for (const file of files) {
          const fullPath = path.join(downloadsDir, file);
          const stats = fs.statSync(fullPath);
          if (stats.mtimeMs >= startTime && isMp4File(fullPath)) {
            fs.copyFileSync(fullPath, targetFile);
            console.log(`\n✔ Detected downloaded video in Downloads: ${file}`);
            return { success: true, filePath: targetFile };
          }
        }
      } catch {}
    }

    // 3. Check Temp directories
    if (fs.existsSync(tempDir)) {
      try {
        const tempEntries = fs.readdirSync(tempDir);
        for (const entry of tempEntries) {
          if (entry.includes("playwright") || entry.includes("scoped_dir") || entry.includes("chrome")) {
            const subDir = path.join(tempDir, entry);
            if (fs.statSync(subDir).isDirectory()) {
              const subFiles = fs.readdirSync(subDir);
              for (const subFile of subFiles) {
                const fullPath = path.join(subDir, subFile);
                const stats = fs.statSync(fullPath);
                if (stats.mtimeMs >= startTime && isMp4File(fullPath)) {
                  fs.copyFileSync(fullPath, targetFile);
                  console.log(`\n✔ Detected downloaded video stream in Temp: ${subFile}`);
                  return { success: true, filePath: targetFile };
                }
              }
            }
          }
        }
      } catch {}
    }

    // 4. Trigger download if a video element or download button exists in the DOM (after 10s)
    if (elapsedSec >= 10) {
      try {
        await page.evaluate(() => {
          const v = document.querySelector("video");
          const src = v ? (v.src || v.currentSrc) : null;
          if (src) {
            const a = document.createElement("a");
            a.href = src;
            a.download = "video.mp4";
            document.body.appendChild(a);
            a.click();
            a.remove();
          }

          const downloadBtns = Array.from(
            document.querySelectorAll('button, a[download], [aria-label*="Download" i], mat-icon')
          );
          const btn = downloadBtns.find(
            (b) =>
              b.getAttribute("aria-label")?.toLowerCase().includes("download") ||
              b.hasAttribute("download") ||
              b.textContent?.toLowerCase().includes("download")
          );
          if (btn) {
            (btn as HTMLElement).click();
          }
        });
      } catch {}
    }

    // 5. Check for Universal Failure / Thinking Stopped Without Video in the DOM (after 16s)
    if (elapsedSec >= 16) {
      const errorCheck = await inspectGeminiResponseUniversal(page);
      if (errorCheck.hasError) {
        console.log(`\n⚠️ Gemini generation failure detected [${errorCheck.errorType}]: "${errorCheck.errorMessage}"`);
        return {
          success: false,
          errorType: errorCheck.errorType,
          errorMessage: errorCheck.errorMessage,
        };
      }
    }
  }

  return {
    success: false,
    errorType: "timeout",
    errorMessage: `Timed out waiting for video download after ${timeoutMs / 1000}s.`,
  };
}

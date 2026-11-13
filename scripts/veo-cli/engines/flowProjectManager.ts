/**
 * scripts/veo-cli/engines/flowProjectManager.ts
 *
 * Discovers, caches, and provides interactive selection between
 * registered Google Flow projects (e.g. "News Studio", etc.).
 */

import fs from "fs";
import path from "path";
import puppeteer, { Browser } from "puppeteer-core";
import prompts from "prompts";
import { FlowProjectConfig } from "../types";
import { DEFAULT_FLOW_PROJECT_ID, DEFAULT_FLOW_PROJECT_NAME, DEFAULT_FLOW_PROJECT_URL } from "./flowWebRunner";

export interface FlowProjectItem {
  id: string;
  name: string;
  url: string;
  lastUpdated?: string;
  isDefault?: boolean;
}

const CACHE_FILE = path.resolve(process.cwd(), "public/assets/action_loops/flow_projects_cache.json");

/**
 * Returns list of default seeded projects
 */
export function getSeededProjects(): FlowProjectItem[] {
  const currentEnvId = process.env.FLOW_PROJECT_ID || DEFAULT_FLOW_PROJECT_ID;
  const currentEnvName = process.env.FLOW_PROJECT_NAME || DEFAULT_FLOW_PROJECT_NAME;
  const currentEnvUrl = process.env.FLOW_PROJECT_URL || DEFAULT_FLOW_PROJECT_URL;

  return [
    {
      id: currentEnvId,
      name: currentEnvName,
      url: currentEnvUrl,
      isDefault: true,
    },
  ];
}

/**
 * Reads cached Google Flow projects from disk
 */
export function getCachedFlowProjects(): FlowProjectItem[] {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
      if (Array.isArray(data) && data.length > 0) {
        return data as FlowProjectItem[];
      }
    }
  } catch {}

  const seeded = getSeededProjects();
  saveCachedFlowProjects(seeded);
  return seeded;
}

/**
 * Saves Google Flow projects list to disk
 */
export function saveCachedFlowProjects(projects: FlowProjectItem[]): void {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(projects, null, 2), "utf-8");
  } catch {}
}

/**
 * Scrapes all registered Google Flow projects from the active browser session
 */
export async function scrapeFlowProjectsFromBrowser(options: { headless?: boolean } = {}): Promise<FlowProjectItem[]> {
  console.log("🔍 Scanning Google Flow (flow.google.com) for registered projects...");

  const CHROME_PATH = fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
  const USER_DATA_DIR = path.join(process.env.LOCALAPPDATA || "C:\\Users\\danie\\AppData\\Local", "Google", "Chrome", "AutomationData");

  let browser: Browser | null = null;
  let shouldCloseBrowser = false;

  try {
    try {
      browser = await puppeteer.connect({
        browserURL: "http://127.0.0.1:9222",
        protocolTimeout: 30000,
      });
      console.log("✔ Connected to active Chrome debugging session on port 9222.");
    } catch {
      browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: options.headless ?? false,
        userDataDir: USER_DATA_DIR,
        defaultViewport: null,
        args: [
          "--start-maximized",
          "--remote-debugging-port=9222",
          "--no-first-run",
          "--no-default-browser-check",
          "--disable-blink-features=AutomationControlled",
        ],
        protocolTimeout: 30000,
      });
      shouldCloseBrowser = true;
    }

    const page = await browser.newPage();
    await page.goto("https://flow.google.com/", { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 3500));

    const discovered = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/project/"]'));
      const found: { id: string; name: string; url: string }[] = [];

      links.forEach((a) => {
        const href = a.getAttribute("href") || "";
        const match = href.match(/\/project\/([a-zA-Z0-9_-]+)/);
        if (!match || !match[1]) return;
        const id = match[1];

        if (found.find((f) => f.id === id)) return;

        // Traverse up parent tree to find card title
        let container: HTMLElement | null = a as HTMLElement;
        let cardTitle = "";
        for (let i = 0; i < 6 && container; i++) {
          container = container.parentElement;
          if (container) {
            const lines = (container.innerText || "")
              .split("\n")
              .map((s) => s.trim())
              .filter((s) => s && s.toLowerCase() !== "open project" && s.toLowerCase() !== "edit" && s.toLowerCase() !== "delete");
            if (lines.length > 0) {
              cardTitle = lines[0];
              break;
            }
          }
        }

        found.push({
          id,
          name: cardTitle || "Untitled Project",
          url: `https://flow.google.com/project/${id}`,
        });
      });

      return found;
    });

    await page.close();

    if (shouldCloseBrowser) {
      await browser.close();
    } else {
      browser.disconnect();
    }

    const currentDefaultId = process.env.FLOW_PROJECT_ID || DEFAULT_FLOW_PROJECT_ID;
    const existing = getCachedFlowProjects();

    const merged: FlowProjectItem[] = [...discovered.map((d) => ({
      ...d,
      isDefault: d.id === currentDefaultId,
    }))];

    // Ensure seeded projects are retained
    for (const item of existing) {
      if (!merged.find((m) => m.id === item.id)) {
        merged.push(item);
      }
    }

    saveCachedFlowProjects(merged);
    console.log(`✔ Found ${merged.length} registered Google Flow projects.`);
    return merged;
  } catch (err: unknown) {
    console.warn("⚠️ Could not scan remote Flow projects:", (err as Error).message);
    if (browser && typeof browser.disconnect === "function") {
      try { browser.disconnect(); } catch {}
    }
    return getCachedFlowProjects();
  }
}

/**
 * Updates the active project variables in .env
 */
export function updateActiveProjectInEnv(project: FlowProjectConfig): void {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (!fs.existsSync(envPath)) return;

    let envContent = fs.readFileSync(envPath, "utf-8");

    // Replace or append FLOW_PROJECT_ID
    if (/^FLOW_PROJECT_ID=.*/m.test(envContent)) {
      envContent = envContent.replace(/^FLOW_PROJECT_ID=.*/m, `FLOW_PROJECT_ID="${project.projectId}"`);
    } else {
      envContent += `\nFLOW_PROJECT_ID="${project.projectId}"`;
    }

    // Replace or append FLOW_PROJECT_NAME
    if (/^FLOW_PROJECT_NAME=.*/m.test(envContent)) {
      envContent = envContent.replace(/^FLOW_PROJECT_NAME=.*/m, `FLOW_PROJECT_NAME="${project.projectName}"`);
    } else {
      envContent += `\nFLOW_PROJECT_NAME="${project.projectName}"`;
    }

    // Replace or append FLOW_PROJECT_URL
    if (/^FLOW_PROJECT_URL=.*/m.test(envContent)) {
      envContent = envContent.replace(/^FLOW_PROJECT_URL=.*/m, `FLOW_PROJECT_URL="${project.projectUrl}"`);
    } else {
      envContent += `\nFLOW_PROJECT_URL="${project.projectUrl}"`;
    }

    fs.writeFileSync(envPath, envContent, "utf-8");
    console.log(`✔ Updated .env active Google Flow project to [${project.projectName}]!`);
  } catch (err: unknown) {
    console.warn("⚠️ Could not update .env:", (err as Error).message);
  }
}

/**
 * Interactive prompt for selecting or discovering a Google Flow project
 */
export async function promptSelectFlowProject(): Promise<FlowProjectConfig> {
  console.log("\n==================================================================");
  console.log("📁 GOOGLE FLOW PROJECT SELECTION");
  console.log("==================================================================");

  let projects = getCachedFlowProjects();

  const choices = projects.map((p) => ({
    title: `${p.isDefault ? "🌟 " : "📁 "}${p.name} [${p.id}]${p.isDefault ? " (Default)" : ""}`,
    value: p.id,
  }));

  choices.push({
    title: "🔍 Scan Google Flow site for registered projects...",
    value: "__SCAN__",
  });

  choices.push({
    title: "➕ Enter Custom Project URL or UUID...",
    value: "__CUSTOM__",
  });

  const res = await prompts({
    type: "select",
    name: "selectedId",
    message: "Select Google Flow Project to use:",
    choices,
    initial: 0,
  });

  if (!res.selectedId) {
    // Default fallback
    return {
      projectId: DEFAULT_FLOW_PROJECT_ID,
      projectName: DEFAULT_FLOW_PROJECT_NAME,
      projectUrl: DEFAULT_FLOW_PROJECT_URL,
    };
  }

  // Handle Scan Option
  if (res.selectedId === "__SCAN__") {
    const refreshed = await scrapeFlowProjectsFromBrowser();
    projects = refreshed;
    const scanChoices = refreshed.map((p) => ({
      title: `${p.isDefault ? "🌟 " : "📁 "}${p.name} [${p.id}]${p.isDefault ? " (Default)" : ""}`,
      value: p.id,
    }));
    scanChoices.push({
      title: "➕ Enter Custom Project URL or UUID...",
      value: "__CUSTOM__",
    });

    const secondRes = await prompts({
      type: "select",
      name: "selectedId",
      message: "Select from discovered Google Flow projects:",
      choices: scanChoices,
      initial: 0,
    });

    if (secondRes.selectedId && secondRes.selectedId !== "__CUSTOM__") {
      const match = projects.find((p) => p.id === secondRes.selectedId);
      if (match) {
        await promptSaveDefault(match);
        return {
          projectId: match.id,
          projectName: match.name,
          projectUrl: match.url,
        };
      }
    } else if (secondRes.selectedId === "__CUSTOM__") {
      return await promptCustomProject();
    }
  }

  // Handle Custom Entry Option
  if (res.selectedId === "__CUSTOM__") {
    return await promptCustomProject();
  }

  const selected = projects.find((p) => p.id === res.selectedId);
  if (selected) {
    await promptSaveDefault(selected);
    return {
      projectId: selected.id,
      projectName: selected.name,
      projectUrl: selected.url,
    };
  }

  return {
    projectId: DEFAULT_FLOW_PROJECT_ID,
    projectName: DEFAULT_FLOW_PROJECT_NAME,
    projectUrl: DEFAULT_FLOW_PROJECT_URL,
  };
}

async function promptCustomProject(): Promise<FlowProjectConfig> {
  const custom = await prompts([
    {
      type: "text",
      name: "input",
      message: "Enter Google Flow Project URL or UUID:",
      validate: (v: string) => v.trim().length > 5 ? true : "Please enter a valid URL or UUID",
    },
    {
      type: "text",
      name: "name",
      message: "Enter Display Name for this Project:",
      initial: "Custom Flow Project",
    },
  ]);

  if (!custom.input) {
    return {
      projectId: DEFAULT_FLOW_PROJECT_ID,
      projectName: DEFAULT_FLOW_PROJECT_NAME,
      projectUrl: DEFAULT_FLOW_PROJECT_URL,
    };
  }

  let projectId = custom.input.trim();
  let projectUrl = projectId;

  if (projectUrl.includes("/project/")) {
    const extracted = projectUrl.split("/project/")[1]?.split(/[?#/]/)[0];
    if (extracted) projectId = extracted;
  } else if (!projectUrl.startsWith("http")) {
    projectUrl = `https://flow.google.com/project/${projectId}`;
  }

  const result: FlowProjectConfig = {
    projectId,
    projectName: custom.name || "Custom Flow Project",
    projectUrl,
  };

  const cached = getCachedFlowProjects();
  if (!cached.find((c) => c.id === projectId)) {
    cached.push({
      id: projectId,
      name: result.projectName,
      url: projectUrl,
      isDefault: false,
    });
    saveCachedFlowProjects(cached);
  }

  await promptSaveDefault(result);
  return result;
}

async function promptSaveDefault(project: FlowProjectConfig | FlowProjectItem): Promise<void> {
  const pName = "projectName" in project ? project.projectName : project.name;
  const pId = "projectId" in project ? project.projectId : project.id;
  const pUrl = "projectUrl" in project ? project.projectUrl : project.url;

  const saveRes = await prompts({
    type: "confirm",
    name: "save",
    message: `Save [${pName}] as default in .env?`,
    initial: false,
  });

  if (saveRes.save) {
    updateActiveProjectInEnv({
      projectId: pId,
      projectName: pName,
      projectUrl: pUrl,
    });
  }
}

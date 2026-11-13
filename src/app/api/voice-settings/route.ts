import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SETTINGS_DIR = path.resolve(process.cwd(), "data");
const SETTINGS_FILE = path.join(SETTINGS_DIR, "voice-studio-settings.json");

export interface VoiceStudioSettings {
  activePersonaId: string;
  defaultEngine: "piper" | "f5_tts" | "styletts2" | "cosyvoice_3" | "xtts_v2" | "kokoro";
  selectedModel: string;
  selectedLanguage: string; // "auto" | "en" | "es" | "es_AR" | "es_ES" | "fr" | "de" | "ja"
  languageMode: "auto_detect" | "locked";
  speedFactor: number;
  pitchShift: number;
  applyYeismo: boolean;
  referenceAudio: string;
  discordSync: {
    enabled: boolean;
    wakeWordOnly: boolean;
    model: string;
  };
  customPersonaOverrides: Record<string, unknown>;
  updatedAt: string;
}

function getDefaultSettings(): VoiceStudioSettings {
  return {
    activePersonaId: "ruby",
    defaultEngine: "piper",
    selectedModel: "en_US-lessac-high",
    selectedLanguage: "auto",
    languageMode: "auto_detect",
    speedFactor: 1.0,
    pitchShift: 0.0,
    applyYeismo: true,
    referenceAudio: "Emily.wav",
    discordSync: {
      enabled: true,
      wakeWordOnly: false,
      model: "qwen2.5:3b"
    },
    customPersonaOverrides: {},
    updatedAt: new Date().toISOString()
  };
}

import { prisma } from "@/lib/prisma";

const SETTINGS_KEY = "voice_studio_settings";

async function loadVoiceSettings(): Promise<VoiceStudioSettings> {
  const defaults = getDefaultSettings();
  try {
    const record = await prisma.systemSetting.findFirst({
      where: { key: SETTINGS_KEY, companyId: null },
    });
    if (record) {
      const parsed = JSON.parse(record.value);
      return { ...defaults, ...parsed };
    }

    // Migration fallback if local JSON exists
    try {
      const content = await fs.promises.readFile(SETTINGS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      const merged: VoiceStudioSettings = { ...defaults, ...parsed };
      await saveVoiceSettings(merged).catch(() => {});
      return merged;
    } catch (e: unknown) {
      if ((e as { code?: string })?.code !== 'ENOENT') {
        console.error("[VoiceSettings API] Error reading fallback settings file:", e);
      }
    }
  } catch (err) {
    console.error("[VoiceSettings API] Error reading settings from DB:", err);
  }
  return defaults;
}

async function saveVoiceSettings(settings: VoiceStudioSettings): Promise<void> {
  const existing = await prisma.systemSetting.findFirst({
    where: { key: SETTINGS_KEY, companyId: null },
  });
  if (existing) {
    await prisma.systemSetting.update({
      where: { id: existing.id },
      data: { value: JSON.stringify(settings, null, 2) },
    });
  } else {
    await prisma.systemSetting.create({
      data: {
        key: SETTINGS_KEY,
        companyId: null,
        value: JSON.stringify(settings, null, 2),
      },
    });
  }
}

export async function GET() {
  try {
    const settings = await loadVoiceSettings();
    return NextResponse.json(settings);
  } catch (err: unknown) {
    console.error("[VoiceSettings API] Error in GET handler:", err);
    return NextResponse.json(getDefaultSettings());
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const current = await loadVoiceSettings();

    const updated: VoiceStudioSettings = {
      ...current,
      ...body,
      updatedAt: new Date().toISOString()
    };

    await saveVoiceSettings(updated);

    return NextResponse.json({ success: true, settings: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[VoiceSettings API] Error saving settings:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

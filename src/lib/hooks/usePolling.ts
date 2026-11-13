"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "newsstudio_polling_settings";
const EVENT_NAME = "newsstudio_polling_settings_change";

export interface PollingSettings {
  enabled: boolean;
  interval: number; // in seconds
}

const DEFAULT_SETTINGS: PollingSettings = {
  enabled: true,
  interval: 30, // 30 seconds default
};

const ENV_DISABLE_POLLING = process.env.NEXT_PUBLIC_DISABLE_POLLING === "true";

export function usePolling() {
  const [settings, setSettings] = useState<PollingSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed.enabled === "boolean" && typeof parsed.interval === "number") {
          setSettings(parsed);
        }
      }
    } catch (e) {
      console.error("[usePolling] Failed to parse polling settings", e);
    }
  }, []);

  const updateSettings = useCallback((newSettings: Partial<PollingSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (typeof window !== "undefined") {
        setTimeout(() => {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            // Dispatch a custom event so other hook instances in the same window sync immediately
            window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: updated }));
          } catch (e) {
            console.error("[usePolling] Failed to save settings to localStorage", e);
          }
        }, 0);
      }
      return updated;
    });
  }, []);

  useEffect(() => {
    const handleSettingsChange = (e: Event) => {
      const customEvent = e as CustomEvent<PollingSettings>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
      } else {
        // Fallback if detail is not provided
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            setSettings(JSON.parse(stored));
          }
        } catch (err) {
          console.error("[usePolling] Failed to sync custom event", err);
        }
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setSettings(JSON.parse(e.newValue));
        } catch (err) {
          console.error("[usePolling] Failed to sync cross-tab storage change", err);
        }
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener(EVENT_NAME, handleSettingsChange);
      window.addEventListener("storage", handleStorageChange);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(EVENT_NAME, handleSettingsChange);
        window.removeEventListener("storage", handleStorageChange);
      }
    };
  }, []);

  return {
    enabled: ENV_DISABLE_POLLING ? false : settings.enabled,
    interval: settings.interval,
    updateSettings,
    isOverridden: ENV_DISABLE_POLLING,
  };
}

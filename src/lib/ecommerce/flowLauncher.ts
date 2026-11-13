/**
 * src/lib/ecommerce/flowLauncher.ts
 *
 * Reliable launcher for Google Flow & Automation Browser Inspector:
 * 1. Invokes the backend CDP activator to restore/maximize the dedicated
 *    automated Chrome window on Windows.
 * 2. Provides direct DevTools inspector access so users can view live screencast,
 *    DOM elements, network requests, and console errors in their current browser.
 */

import { DEFAULT_FLOW_PROJECT_URL } from "@/components/editor/shared/visuals/types";

export interface OpenFlowOptions {
  url?: string;
  inspectErrors?: boolean;
}

export async function openGoogleFlow(
  urlOrOptions?: string | OpenFlowOptions
): Promise<{ success: boolean; action?: string; devtoolsUrl?: string }> {
  const options: OpenFlowOptions =
    typeof urlOrOptions === "string"
      ? { url: urlOrOptions }
      : urlOrOptions || {};

  const targetUrl = options.url || DEFAULT_FLOW_PROJECT_URL;

  try {
    const res = await fetch("/api/ecommerce/flow/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: targetUrl }),
    });

    const data = await res.json().catch(() => ({}));

    // 1. If inspectErrors requested and devtoolsUrl is available, open the remote DevTools inspector
    if (options.inspectErrors && data.devtoolsUrl) {
      if (typeof window !== "undefined") {
        window.open(data.devtoolsUrl, "_blank", "noopener,noreferrer");
      }
    } else {
      // 2. Direct browser navigation: ALWAYS open the Flow project tab in the user's active browser
      // This ensures the user instantly sees the tab even if Windows focus-stealing prevention blocks background window focus.
      if (typeof window !== "undefined") {
        try {
          window.open(targetUrl, "_blank", "noopener,noreferrer");
        } catch {
          window.location.href = targetUrl;
        }
      }
    }

    return {
      success: Boolean(data.success),
      action: data.action,
      devtoolsUrl: data.devtoolsUrl,
    };
  } catch (err) {
    console.warn("[openGoogleFlow] Notice focusing Chrome window:", err);
    if (typeof window !== "undefined") {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
    return { success: false };
  }
}

/**
 * Opens the live remote DevTools inspector for the active Google Flow automation session.
 * Displays interactive screencast, console errors, and network payloads.
 */
export async function inspectFlowErrors(
  url: string = DEFAULT_FLOW_PROJECT_URL
): Promise<void> {
  await openGoogleFlow({ url, inspectErrors: true });
}


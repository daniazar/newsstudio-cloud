"use client";

import React from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { SWRConfig } from "swr";

const Sidebar = dynamic(() => import("./Sidebar").then((m) => m.Sidebar), {
  ssr: false,
});
const NotificationDropdown = dynamic(
  () => import("./NotificationDropdown").then((m) => m.NotificationDropdown),
  { ssr: false }
);
const AmbientClusterHUD = dynamic(
  () => import("./AmbientClusterHUD").then((m) => m.AmbientClusterHUD),
  { ssr: false }
);

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  React.useEffect(() => {
    // Intercept known Chromium DevTools Live Metrics / INP observer bug
    // Chromium Issue 555794190: "Cannot read properties of undefined (reading 'startTime') at et.reportAllChanges"
    // Triggered by DevTools Performance panel injecting web-vitals into VM scripts during soft navigations
    const handleGlobalError = (event: ErrorEvent) => {
      const msg = event?.message || "";
      const isDevToolsVitalsError =
        (msg.includes("Cannot read properties of undefined (reading 'startTime')") ||
          msg.includes("reportAllChanges")) &&
        (!event.filename || event.filename.includes("VM") || event.filename.includes("<anonymous>"));

      if (isDevToolsVitalsError) {
        event.stopImmediatePropagation();
        event.preventDefault();
        return true;
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event?.reason;
      const msg = reason?.message || (typeof reason === "string" ? reason : "");
      const isDevToolsVitalsError =
        msg.includes("Cannot read properties of undefined (reading 'startTime')") ||
        msg.includes("reportAllChanges");

      if (isDevToolsVitalsError) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    };

    const originalConsoleError = console.error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.error = (...args: any[]) => {
      const msg = args
        .map((arg) => (typeof arg === "string" ? arg : arg instanceof Error ? arg.message : String(arg)))
        .join(" ");
      const isDevToolsVitalsError =
        msg.includes("Cannot read properties of undefined (reading 'startTime')") ||
        msg.includes("reportAllChanges");

      const isOrtWarning =
        msg.includes("[W:onnxruntime:") ||
        msg.includes("[I:onnxruntime:") ||
        msg.includes("VerifyEachNodeIsAssignedToAnEp") ||
        msg.includes("Rerunning with verbose output on a non-minimal build") ||
        (msg.includes("onnxruntime") && !msg.includes("[E:onnxruntime:"));

      if (isOrtWarning) {
        console.warn(...args);
        return;
      }

      if (!isDevToolsVitalsError) {
        originalConsoleError.apply(console, args);
      }
    };

    window.addEventListener("error", handleGlobalError, true);
    window.addEventListener("unhandledrejection", handleUnhandledRejection, true);

    return () => {
      window.removeEventListener("error", handleGlobalError, true);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection, true);
      console.error = originalConsoleError;
    };
  }, []);

  const isAuthPage = pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up") || pathname === "/login";
  const isLandingPage = pathname === "/";

  const swrOptions = React.useMemo(
    () => ({
      revalidateOnFocus: false,
      dedupingInterval: 30000,
      revalidateOnReconnect: false,
      errorRetryCount: 1,
    }),
    []
  );

  if (isAuthPage || isLandingPage) {
    return (
      <SWRConfig value={swrOptions}>
        <main className="min-h-screen w-full bg-background text-foreground">{children}</main>
      </SWRConfig>
    );
  }

  const isEditorPage =
    pathname.includes("/editor") ||
    pathname.includes("/streamer-avatar") ||
    pathname.includes("/viseme-compositor");

  return (
    <SWRConfig value={swrOptions}>
      <div className="min-h-screen bg-background text-foreground">
        {/* Premium Navigation Sidebar */}
        <Sidebar />
        {/* Floating Notifications Panel for Desktop */}
        <div className="hidden lg:block fixed top-6 right-6 z-50">
          <NotificationDropdown standalone />
        </div>
        {/* Main content shifts to the right on desktop, top-padded on mobile */}
        <main
          className={`min-h-screen pt-16 lg:pt-0 lg:ml-64 transition-all duration-300 ${
            isEditorPage ? "h-screen overflow-hidden pb-0" : "pb-12"
          }`}
        >
          {children}
        </main>
        {/* Persistent Bottom Cluster HUD */}
        <AmbientClusterHUD />
      </div>
    </SWRConfig>
  );
}

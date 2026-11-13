"use client";

import { useEffect, useRef } from "react";

export function IdleShutdown() {
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    const throttledUpdate = () => {
      const now = Date.now();
      // Send a heartbeat to the backend at most once every 60 seconds
      if (now - lastUpdateRef.current > 60000) {
        lastUpdateRef.current = now;
        fetch("/api/heartbeat", { method: "POST" }).catch(() => {});
      }
    };

    window.addEventListener("mousemove", throttledUpdate);
    window.addEventListener("keydown", throttledUpdate);
    window.addEventListener("click", throttledUpdate);
    window.addEventListener("scroll", throttledUpdate);
    window.addEventListener("app-activity", throttledUpdate);

    // Initial heartbeat on mount
    throttledUpdate();

    return () => {
      window.removeEventListener("mousemove", throttledUpdate);
      window.removeEventListener("keydown", throttledUpdate);
      window.removeEventListener("click", throttledUpdate);
      window.removeEventListener("scroll", throttledUpdate);
      window.removeEventListener("app-activity", throttledUpdate);
    };
  }, []);

  return null;
}

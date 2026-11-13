"use client";

import { useState, useCallback, useEffect } from "react";

export function useComfyServer() {
  const [comfyOnline, setComfyOnline] = useState<boolean | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const checkHealth = useCallback(async () => {
    setIsCheckingHealth(true);
    try {
      const res = await fetch("/api/presenter/server");
      const data = await res.json();
      setComfyOnline(data.online);
    } catch {
      setComfyOnline(false);
    } finally {
      setIsCheckingHealth(false);
    }
  }, []);

  const startServer = useCallback(async () => {
    setIsCheckingHealth(true);
    try {
      await fetch("/api/presenter/server", { method: "POST" });
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        const res = await fetch("/api/presenter/server");
        const data = await res.json();
        if (data.online || attempts >= 15) {
          setComfyOnline(data.online);
          setIsCheckingHealth(false);
          clearInterval(interval);
        }
      }, 2000);
    } catch {
      setIsCheckingHealth(false);
    }
  }, []);

  const stopServer = useCallback(async () => {
    setIsCheckingHealth(true);
    try {
      await fetch("/api/presenter/server", { method: "DELETE" });
      setTimeout(checkHealth, 2000);
    } catch {
      setIsCheckingHealth(false);
    }
  }, [checkHealth]);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return { comfyOnline, isCheckingHealth, checkHealth, startServer, stopServer };
}

"use client";

import { useState, useCallback, useEffect } from "react";

export function useSadTalkerServer() {
  const [sadtalkerOnline, setSadtalkerOnline] = useState<boolean | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const checkHealth = useCallback(async () => {
    setIsCheckingHealth(true);
    try {
      const res = await fetch("/api/presenter/sadtalker/server");
      const data = await res.json();
      setSadtalkerOnline(data.online);
    } catch {
      setSadtalkerOnline(false);
    } finally {
      setIsCheckingHealth(false);
    }
  }, []);

  const startServer = useCallback(async () => {
    setIsCheckingHealth(true);
    try {
      await fetch("/api/presenter/sadtalker/server", { method: "POST" });
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        const res = await fetch("/api/presenter/sadtalker/server");
        const data = await res.json();
        if (data.online || attempts >= 15) {
          setSadtalkerOnline(data.online);
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
      await fetch("/api/presenter/sadtalker/server", { method: "DELETE" });
      setTimeout(checkHealth, 2000);
    } catch {
      setIsCheckingHealth(false);
    }
  }, [checkHealth]);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return { sadtalkerOnline, isCheckingHealth, checkHealth, startServer, stopServer };
}

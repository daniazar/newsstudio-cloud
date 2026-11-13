/**
 * src/lib/ecommerce/mediapipeLanguageDetector.ts
 *
 * Client-Side MediaPipe Neural Language Detector for Web & E-Commerce Studio UI.
 * Powered by @mediapipe/tasks-text and Google's language_detector.tflite model.
 *
 * Features:
 * - On-device WebAssembly execution directly in browser
 * - Safe environment checks (bypasses Node.js/SSR without throwing errors)
 * - Returns ISO language codes (e.g. "es", "en") with neural confidence probabilities
 * - React hook `useMediaPipeLanguageDetector` for real-time validation in E-Commerce Studio
 */

import { useState, useEffect, useRef } from "react";

export interface MediaPipeDetectionResult {
  language: "es" | "en" | "pt" | "fr" | "de" | "ja" | string;
  probability: number;
  isReliable: boolean;
  allDetections: Array<{ language: string; probability: number }>;
}

// MediaPipe types (lazy-loaded to avoid SSR crashes)
type MediaPipeLanguageDetectorInstance = {
  detect: (text: string) => {
    languages: Array<{
      languageCode: string;
      probability: number;
    }>;
  };
  close?: () => void;
};

let detectorSingleton: MediaPipeLanguageDetectorInstance | null = null;
let initializationPromise: Promise<MediaPipeLanguageDetectorInstance | null> | null = null;

const MEDIAPIPE_WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-text@0.10.14/wasm";
const MEDIAPIPE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/language_detector/language_detector/float32/1/language_detector.tflite";

/**
 * Initializes and returns the singleton instance of MediaPipe LanguageDetector in the browser.
 * Returns null if executed on server-side or if WebAssembly/WASM is unavailable.
 */
export async function getMediaPipeLanguageDetector(): Promise<MediaPipeLanguageDetectorInstance | null> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }

  if (detectorSingleton) {
    return detectorSingleton;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      const { FilesetResolver, LanguageDetector } = await import("@mediapipe/tasks-text");
      const textFileset = await FilesetResolver.forTextTasks(MEDIAPIPE_WASM_CDN);
      const detector = await LanguageDetector.createFromOptions(textFileset, {
        baseOptions: {
          modelAssetPath: MEDIAPIPE_MODEL_URL,
        },
        maxResults: 3,
      });

      detectorSingleton = detector as unknown as MediaPipeLanguageDetectorInstance;
      return detectorSingleton;
    } catch (error) {
      console.warn("[MediaPipe] Client LanguageDetector initialization warning:", error);
      return null;
    } finally {
      initializationPromise = null;
    }
  })();

  return initializationPromise;
}

/**
 * Detects the language of a text string using MediaPipe in the browser.
 * Returns null if running in Node.js, if MediaPipe fails, or if text is empty.
 */
export async function detectLanguageWithMediaPipe(
  text: string
): Promise<MediaPipeDetectionResult | null> {
  if (!text || typeof text !== "string" || !text.trim()) {
    return null;
  }

  try {
    const detector = await getMediaPipeLanguageDetector();
    if (!detector) return null;

    const result = detector.detect(text.trim());
    if (!result || !result.languages || result.languages.length === 0) {
      return null;
    }

    const detections = result.languages.map((d) => ({
      language: d.languageCode.toLowerCase(),
      probability: d.probability,
    }));

    const top = detections[0];
    const isReliable = top.probability >= 0.45;

    return {
      language: top.language,
      probability: top.probability,
      isReliable,
      allDetections: detections,
    };
  } catch (err) {
    console.warn("[MediaPipe] detectLanguageWithMediaPipe error:", err);
    return null;
  }
}

/**
 * React hook for using MediaPipe Language Detection in client components.
 */
export function useMediaPipeLanguageDetector() {
  const [isReady, setIsReady] = useState(() => Boolean(detectorSingleton));
  const [isInitializing, setIsInitializing] = useState(
    () => typeof window !== "undefined" && !detectorSingleton
  );
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    if (typeof window === "undefined" || detectorSingleton) return;

    getMediaPipeLanguageDetector()
      .then((det) => {
        if (isMountedRef.current) {
          setIsReady(Boolean(det));
          setIsInitializing(false);
        }
      })
      .catch(() => {
        if (isMountedRef.current) {
          setIsReady(false);
          setIsInitializing(false);
        }
      });

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const detect = async (text: string): Promise<MediaPipeDetectionResult | null> => {
    return detectLanguageWithMediaPipe(text);
  };

  return {
    isReady,
    isInitializing,
    detect,
  };
}

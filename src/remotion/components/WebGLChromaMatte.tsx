"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { delayRender, continueRender } from "remotion";
import {
  WebGLChromaMatte as BaseWebGLChromaMatte,
  WebGLChromaMatteProps,
} from "@/components/media/WebGLChromaMatte";

export type { ChromaMatteMode, MediaType, WebGLChromaMatteProps } from "@/components/media/WebGLChromaMatte";

export const WebGLChromaMatte: React.FC<WebGLChromaMatteProps> = (props) => {
  const [handle] = useState(() => {
    try {
      return delayRender(`WebGLChromaMatte: ${props.src}`);
    } catch {
      return null;
    }
  });

  const continuedRef = useRef(false);

  const safeContinue = useCallback(() => {
    if (handle !== null && !continuedRef.current) {
      continuedRef.current = true;
      try {
        continueRender(handle);
      } catch {}
    }
  }, [handle]);

  const onReady = useCallback(() => {
    safeContinue();
    props.onReady?.();
  }, [safeContinue, props]);

  // Safety timeout to prevent infinite render blocking + unmount cleanup
  useEffect(() => {
    if (handle === null) return;
    const timer = setTimeout(() => {
      safeContinue();
    }, 4000);

    return () => {
      clearTimeout(timer);
      safeContinue();
    };
  }, [handle, safeContinue]);

  return <BaseWebGLChromaMatte {...props} onReady={onReady} />;
};

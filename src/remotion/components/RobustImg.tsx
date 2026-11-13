/* eslint-disable @next/next/no-img-element */
import React, { useState, useCallback, useEffect, useRef } from "react";
import { delayRender, continueRender } from "remotion";
import { resolveSrc } from "../utils/resolveSrc";

interface RobustImgProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
}

export const RobustImg: React.FC<RobustImgProps> = ({ src, ...props }) => {
  const resolvedSrc = resolveSrc(src);
  const [handle] = useState(() => (resolvedSrc ? delayRender(`Loading image ${resolvedSrc}`) : null));
  const [hasError, setHasError] = useState(false);
  const continuedRef = useRef(false);

  const safeContinue = useCallback(() => {
    if (handle !== null && !continuedRef.current) {
      continuedRef.current = true;
      try {
        continueRender(handle);
      } catch {
        // Guard against already continued handles
      }
    }
  }, [handle]);

  const onImageLoad = useCallback(() => {
    safeContinue();
  }, [safeContinue]);

  const onImageError = useCallback(() => {
    console.warn(`[RobustImg] Image failed to load: ${resolvedSrc || src}`);
    setHasError(true);
    safeContinue();
  }, [safeContinue, resolvedSrc, src]);

  // Fallback timeout to prevent infinite hangs if events don't fire + unmount safety
  useEffect(() => {
    if (handle === null) return;
    const timeout = setTimeout(() => {
      console.warn(`[RobustImg] Image load timed out: ${resolvedSrc || src}`);
      safeContinue();
    }, 6000); // 6 seconds max wait per image

    return () => {
      clearTimeout(timeout);
      safeContinue();
    };
  }, [handle, safeContinue, resolvedSrc, src]);

  if (hasError || !resolvedSrc) return null;

  return <img src={resolvedSrc} onLoad={onImageLoad} onError={onImageError} {...props} />;
};


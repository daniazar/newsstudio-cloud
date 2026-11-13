"use client";

import React, { useRef, useEffect, useState } from "react";
import { delayRender, continueRender } from "remotion";
import { resolveSrc } from "../utils/resolveSrc";
import { VERTEX_SHADER, FRAGMENT_SHADER, compileShader } from "./chromaShader";

export interface ChromaKeyImageProps {
  src: string;
  className?: string;
  style?: React.CSSProperties;
  /** Target chroma key color in normalized RGB [0..1] (default: neon lime [0.05, 0.75, 0.22]) */
  keyColor?: [number, number, number];
  /** Green key sensitivity threshold (0.0 to 1.0, default: 0.38) */
  similarity?: number;
  /** Smoothness of alpha edge transition (0.0 to 1.0, default: 0.08) */
  smoothness?: number;
  /** Spill suppression strength (0.0 to 1.0, default: 0.85) */
  despillStrength?: number;
  /** Matte choke / erosion in pixels to eliminate edge green fringe (default: 1.5) */
  matteErosion?: number;
  /** Ambient rim light color for edge contour harmonization [0..1] (default: subtle cyan [0.0, 0.94, 1.0]) */
  rimColor?: [number, number, number];
  /** Ambient rim light strength (0.0 to 1.0, default: 0.28) */
  rimStrength?: number;
  /** Ambient color tint matching the studio set / background [0..1] (default: neutral [1.0, 1.0, 1.0]) */
  ambientTint?: [number, number, number];
  /** CSS object-fit for canvas display (default: 'contain') */
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
  /** CSS object-position for canvas display (default: 'bottom center') */
  objectPosition?: string;
  /** Optional callback fired when the image fails to load */
  onError?: () => void;
}

export const ChromaKeyImage: React.FC<ChromaKeyImageProps> = ({
  src,
  className,
  style,
  keyColor = [0.05, 0.75, 0.22],
  similarity = 0.38,
  smoothness = 0.08,
  despillStrength = 0.85,
  matteErosion = 1.5,
  rimColor = [0.0, 0.94, 1.0],
  rimStrength = 0.28,
  ambientTint = [1.0, 1.0, 1.0],
  objectFit: propObjectFit,
  objectPosition: propObjectPosition,
  onError: propOnError,
}) => {
  const effectiveObjectFit = propObjectFit ?? (style?.objectFit as ChromaKeyImageProps["objectFit"]) ?? "contain";
  const effectiveObjectPosition = propObjectPosition ?? (style?.objectPosition as string) ?? "bottom center";

  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const hasError = failedSrc === src;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const continuedRef = useRef(false);

  useEffect(() => {
    if (!src || hasError) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    continuedRef.current = false;
    let handle: number | null = null;
    try {
      handle = delayRender(`ChromaKeyImage ${src}`);
    } catch {
      handle = null;
    }

    const safeContinue = () => {
      if (!continuedRef.current) {
        continuedRef.current = true;
        if (handle !== null) {
          try {
            continueRender(handle);
          } catch {}
        }
      }
    };

    const timeout = setTimeout(() => {
      console.warn(`[ChromaKeyImage] Timed out loading: ${src}`);
      safeContinue();
    }, 6000);

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
      premultipliedAlpha: false,
    });

    if (!gl) {
      safeContinue();
      return;
    }

    const vert = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vert || !frag) {
      safeContinue();
      return;
    }

    const program = gl.createProgram();
    if (!program) {
      safeContinue();
      return;
    }

    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      safeContinue();
      return;
    }

    gl.useProgram(program);

    const uVideoTextureLoc = gl.getUniformLocation(program, "u_videoTexture");
    const uKeyColorLoc = gl.getUniformLocation(program, "u_keyColor");
    const uSimilarityLoc = gl.getUniformLocation(program, "u_similarity");
    const uSmoothnessLoc = gl.getUniformLocation(program, "u_smoothness");
    const uDespillStrengthLoc = gl.getUniformLocation(program, "u_despillStrength");
    const uTexelSizeLoc = gl.getUniformLocation(program, "u_texelSize");
    const uRimColorLoc = gl.getUniformLocation(program, "u_rimColor");
    const uRimStrengthLoc = gl.getUniformLocation(program, "u_rimStrength");
    const uAmbientTintLoc = gl.getUniformLocation(program, "u_ambientTint");

    // Quad geometry: [x, y, u, v]
    const quad = new Float32Array([
      -1, -1, 0, 1,
       1, -1, 1, 1,
      -1,  1, 0, 0,
       1,  1, 1, 0,
    ]);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, "a_position");
    const aTex = gl.getAttribLocation(program, "a_texCoord");

    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);

    gl.enableVertexAttribArray(aTex);
    gl.vertexAttribPointer(aTex, 2, gl.FLOAT, false, 16, 8);

    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    let isCancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      clearTimeout(timeout);
      if (isCancelled) {
        safeContinue();
        return;
      }

      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.useProgram(program);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.uniform1i(uVideoTextureLoc, 0);

        gl.uniform3f(uKeyColorLoc, keyColor[0], keyColor[1], keyColor[2]);
        gl.uniform1f(uSimilarityLoc, similarity);
        gl.uniform1f(uSmoothnessLoc, smoothness);
        gl.uniform1f(uDespillStrengthLoc, despillStrength);
        gl.uniform2f(uTexelSizeLoc, matteErosion / canvas.width, matteErosion / canvas.height);
        gl.uniform3f(uRimColorLoc, rimColor[0], rimColor[1], rimColor[2]);
        gl.uniform1f(uRimStrengthLoc, rimStrength);
        gl.uniform3f(uAmbientTintLoc, ambientTint[0], ambientTint[1], ambientTint[2]);

        gl.bindVertexArray(vao);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }

      safeContinue();
    };

    img.onerror = () => {
      clearTimeout(timeout);
      if (!isCancelled) {
        setFailedSrc(src);
        propOnError?.();
      }
      safeContinue();
    };

    img.src = resolveSrc(src);

    return () => {
      clearTimeout(timeout);
      isCancelled = true;
      safeContinue();
      gl.deleteVertexArray(vao);
      gl.deleteTexture(texture);
      gl.deleteBuffer(vbo);
      gl.deleteProgram(program);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
    };
  }, [src, hasError, keyColor, similarity, smoothness, despillStrength, matteErosion, rimColor, rimStrength, ambientTint, propOnError]);

  if (hasError || !src) {
    return (
      <div style={{ position: "relative", width: "100%", height: "100%", ...style }} className={className} />
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", ...style }} className={className}>
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          objectFit: effectiveObjectFit,
          objectPosition: effectiveObjectPosition,
          display: "block",
        }}
      />
    </div>
  );
};

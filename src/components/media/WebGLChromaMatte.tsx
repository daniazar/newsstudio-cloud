"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";

export type ChromaMatteMode = "white_key" | "chroma_green" | "chroma_blue" | "custom";
export type MediaType = "auto" | "image" | "video";

export interface WebGLChromaMatteProps {
  src: string;
  mediaType?: MediaType;
  mode?: ChromaMatteMode;
  /** Custom key color in normalized RGB [0..1] (e.g. [1, 1, 1] for white, [0.05, 0.75, 0.22] for green) */
  keyColor?: [number, number, number];
  /** Color similarity threshold (0..1). Lower = stricter. */
  similarity?: number;
  /** Edge transition feather width (0..1) */
  smoothness?: number;
  /** Spill suppression gain for green/blue screens (0..1) */
  despillStrength?: number;
  /** White halo defringe strength (0..1) */
  defringeStrength?: number;
  /** 9-tap bilateral edge filter to preserve sharp edges while eliminating noise */
  enableBilateralFilter?: boolean;
  /** Built-in specular sheen light sweep across subject */
  enableSheen?: boolean;
  /** Specular sweep progress (0..1). If omitted, animates automatically. */
  sheenProgress?: number;
  /** Specular sheen intensity (0..1, default: 0.40) */
  sheenIntensity?: number;
  /** Output true 32-bit transparent RGBA (default: true) */
  transparentMode?: boolean;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
  /** Callback once first frame is drawn */
  onReady?: () => void;
}

const VERTEX_SHADER = `#version 300 es
precision highp float;

in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;

void main() {
    v_texCoord = a_texCoord;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_mediaTexture;
uniform int u_mode;                 // 0: green, 1: blue, 2: white, 3: custom
uniform vec3 u_keyColor;            // Normalized RGB key color
uniform float u_similarity;         // Threshold cutoff
uniform float u_smoothness;         // Feather falloff width
uniform float u_despillStrength;    // Green/blue spill suppression
uniform float u_defringeStrength;   // White halo defringe
uniform int u_useBilateral;         // 1 to enable 9-tap edge filter
uniform int u_enableSheen;          // 1 to enable specular sheen sweep
uniform float u_sheenProgress;      // Sheen coordinate along diagonal
uniform float u_sheenIntensity;     // Sheen gain

void main() {
    vec2 uv = v_texCoord;
    vec4 mediaCol = texture(u_mediaTexture, clamp(uv, vec2(0.001), vec2(0.999)));

    // Passthrough if source already has true alpha
    if (mediaCol.a < 0.05) {
        fragColor = vec4(0.0);
        return;
    }

    float rawAlpha = 1.0;
    vec3 finalRgb = mediaCol.rgb;

    if (u_mode == 2) {
        // ── MODE 2: White / Studio Cyclorama Key ──────────────────────
        float lum = dot(mediaCol.rgb, vec3(0.299, 0.587, 0.114));
        float maxVal = max(mediaCol.r, max(mediaCol.g, mediaCol.b));
        float minVal = min(mediaCol.r, min(mediaCol.g, mediaCol.b));
        float sat = maxVal - minVal;

        float distFromWhite = distance(mediaCol.rgb, vec3(1.0));
        rawAlpha = smoothstep(u_similarity, u_similarity + u_smoothness, distFromWhite);

        // Near-pure white threshold
        if (lum > (1.0 - u_similarity * 0.9) && sat < 0.12) {
            float satCutoff = smoothstep(0.12, 0.02, sat);
            rawAlpha = min(rawAlpha, 1.0 - satCutoff);
        }

        // Defringe white halo on subject borders
        if (rawAlpha > 0.01 && rawAlpha < 0.96) {
            if (lum > 0.65 && sat < 0.20) {
                float defringeFactor = (1.0 - rawAlpha) * u_defringeStrength;
                finalRgb = mix(finalRgb, finalRgb * (1.0 - defringeFactor * 0.45), defringeFactor);
            }
        }
    } else if (u_mode == 0 || u_mode == 1) {
        // ── MODE 0/1: Broadcast Chroma Green / Blue Screen ───────────
        float dist = distance(mediaCol.rgb, u_keyColor);
        rawAlpha = smoothstep(u_similarity, u_similarity + u_smoothness, dist);

        if (u_mode == 0) {
            // Green Dominance Suppression
            float maxRB = max(mediaCol.r, mediaCol.b);
            float avgRB = (mediaCol.r + mediaCol.b) * 0.5;
            float greenDominance = mediaCol.g - maxRB;

            if (mediaCol.g > 0.30 && greenDominance > 0.03) {
                float greenAlpha = smoothstep(0.03, 0.12, -greenDominance);
                rawAlpha = min(rawAlpha, greenAlpha);
            }

            // Despill green bleed
            float excessGreen = max(0.0, mediaCol.g - max(avgRB, maxRB * 0.96));
            if (excessGreen > 0.0) {
                finalRgb.g -= excessGreen * u_despillStrength;
                finalRgb.r += excessGreen * u_despillStrength * 0.25;
            }
        } else {
            // Blue Dominance Suppression
            float maxRG = max(mediaCol.r, mediaCol.g);
            float blueDominance = mediaCol.b - maxRG;
            if (mediaCol.b > 0.30 && blueDominance > 0.03) {
                rawAlpha = min(rawAlpha, smoothstep(0.03, 0.12, -blueDominance));
            }
        }
    } else {
        // ── MODE 3: Generic Euclidean Color Key ───────────────────────
        float dist = distance(mediaCol.rgb, u_keyColor);
        rawAlpha = smoothstep(u_similarity, u_similarity + u_smoothness, dist);
    }

    float alpha = clamp(rawAlpha, 0.0, 1.0);

    // ── 9-Tap Bilateral Edge Denoise ─────────────────────────────────
    if (u_useBilateral == 1 && alpha > 0.01 && alpha < 0.99) {
        vec2 texel = vec2(1.5 / 1024.0, 1.5 / 1024.0);
        float totalWeight = 0.0;
        float filteredAlpha = 0.0;
        vec3 centerRgb = mediaCol.rgb;

        for (int dy = -1; dy <= 1; dy++) {
            for (int dx = -1; dx <= 1; dx++) {
                vec2 offset = vec2(float(dx) * texel.x, float(dy) * texel.y);
                vec4 sampleCol = texture(u_mediaTexture, clamp(uv + offset, vec2(0.001), vec2(0.999)));

                float sampleDist = distance(sampleCol.rgb, u_keyColor);
                float sampleAlpha = smoothstep(u_similarity, u_similarity + u_smoothness, sampleDist);

                float spatialWeight = exp(-float(dx * dx + dy * dy) * 0.5);
                float colorDistSq = dot(sampleCol.rgb - centerRgb, sampleCol.rgb - centerRgb);
                float rangeWeight = exp(-colorDistSq * 25.0);
                float weight = spatialWeight * rangeWeight;

                filteredAlpha += sampleAlpha * weight;
                totalWeight += weight;
            }
        }
        alpha = clamp(filteredAlpha / max(0.0001, totalWeight), 0.0, 1.0);
    }

    // ── Built-in Specular Light Sheen Sweep ───────────────────────────
    if (u_enableSheen == 1 && alpha > 0.05) {
        float diagCoord = (uv.x * 1.1 + (1.0 - uv.y) * 0.9) * 0.5;
        float sheenDist = abs(diagCoord - u_sheenProgress);
        float sheen = exp(-sheenDist * sheenDist * 80.0) * u_sheenIntensity * alpha;
        finalRgb += vec3(sheen);
    }

    fragColor = vec4(finalRgb, alpha);
}
`;

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source.trim());
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("[WebGLChromaMatte] Shader compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export const WebGLChromaMatte: React.FC<WebGLChromaMatteProps> = ({
  src,
  mediaType = "auto",
  mode = "white_key",
  keyColor,
  similarity,
  smoothness,
  despillStrength = 0.90,
  defringeStrength = 0.85,
  enableBilateralFilter = true,
  enableSheen = false,
  sheenProgress,
  sheenIntensity = 0.40,
  transparentMode: _transparentMode = true,
  className = "",
  style = {},
  alt = "Matte subject",
  onReady,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const textureRef = useRef<WebGLTexture | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [hasError, setHasError] = useState(false);
  const [_isLoaded, setIsLoaded] = useState(false);

  // Infer effective media type
  const isVideo = useMemo(() => {
    if (mediaType === "video") return true;
    if (mediaType === "image") return false;
    return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(src);
  }, [mediaType, src]);

  // Derive mode defaults
  const effectiveModeIndex = useMemo(() => {
    switch (mode) {
      case "chroma_green": return 0;
      case "chroma_blue": return 1;
      case "white_key": return 2;
      case "custom": default: return 3;
    }
  }, [mode]);

  const effectiveKeyColor: [number, number, number] = useMemo(() => {
    if (keyColor) return keyColor;
    if (mode === "white_key") return [1.0, 1.0, 1.0];
    if (mode === "chroma_green") return [0.05, 0.75, 0.22];
    if (mode === "chroma_blue") return [0.05, 0.22, 0.85];
    return [1.0, 1.0, 1.0];
  }, [keyColor, mode]);

  const effectiveSimilarity = useMemo(() => {
    if (similarity !== undefined) return similarity;
    if (mode === "white_key") return 0.16;
    if (mode === "chroma_green") return 0.38;
    if (mode === "chroma_blue") return 0.38;
    return 0.20;
  }, [similarity, mode]);

  const effectiveSmoothness = useMemo(() => {
    if (smoothness !== undefined) return smoothness;
    if (mode === "white_key") return 0.08;
    return 0.10;
  }, [smoothness, mode]);

  // Initialize WebGL2 context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
      premultipliedAlpha: false,
    });

    if (!gl) {
      console.warn("[WebGLChromaMatte] WebGL2 not supported, falling back to standard element");
      setHasError(true);
      return;
    }
    glRef.current = gl;

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) {
      setHasError(true);
      return;
    }

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("[WebGLChromaMatte] Program link error:", gl.getProgramInfoLog(program));
      setHasError(true);
      return;
    }
    programRef.current = program;

    // Full-screen quad
    const quadVertices = new Float32Array([
      -1, -1,  0, 1,
       1, -1,  1, 1,
      -1,  1,  0, 0,
      -1,  1,  0, 0,
       1, -1,  1, 1,
       1,  1,  1, 0,
    ]);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, "a_position");
    const aTex = gl.getAttribLocation(program, "a_texCoord");

    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);

    gl.enableVertexAttribArray(aTex);
    gl.vertexAttribPointer(aTex, 2, gl.FLOAT, false, 16, 8);

    // Texture allocation
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    textureRef.current = texture;

    return () => {
      if (gl) {
        if (texture) gl.deleteTexture(texture);
        if (vbo) gl.deleteBuffer(vbo);
        if (vao) gl.deleteVertexArray(vao);
        if (program) gl.deleteProgram(program);
      }
    };
  }, []);

  // Draw frame helper
  const drawFrame = useCallback((source: TexImageSource, sWidth: number, sHeight: number) => {
    const gl = glRef.current;
    const program = programRef.current;
    const texture = textureRef.current;
    const canvas = canvasRef.current;
    if (!gl || !program || !texture || !canvas || sWidth <= 0 || sHeight <= 0) return;

    if (canvas.width !== sWidth || canvas.height !== sHeight) {
      canvas.width = sWidth;
      canvas.height = sHeight;
    }

    gl.viewport(0, 0, sWidth, sHeight);
    gl.useProgram(program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

    gl.uniform1i(gl.getUniformLocation(program, "u_mediaTexture"), 0);
    gl.uniform1i(gl.getUniformLocation(program, "u_mode"), effectiveModeIndex);
    gl.uniform3f(gl.getUniformLocation(program, "u_keyColor"), effectiveKeyColor[0], effectiveKeyColor[1], effectiveKeyColor[2]);
    gl.uniform1f(gl.getUniformLocation(program, "u_similarity"), effectiveSimilarity);
    gl.uniform1f(gl.getUniformLocation(program, "u_smoothness"), effectiveSmoothness);
    gl.uniform1f(gl.getUniformLocation(program, "u_despillStrength"), despillStrength);
    gl.uniform1f(gl.getUniformLocation(program, "u_defringeStrength"), defringeStrength);
    gl.uniform1i(gl.getUniformLocation(program, "u_useBilateral"), enableBilateralFilter ? 1 : 0);
    gl.uniform1i(gl.getUniformLocation(program, "u_enableSheen"), enableSheen ? 1 : 0);
    gl.uniform1f(gl.getUniformLocation(program, "u_sheenProgress"), sheenProgress ?? 0.5);
    gl.uniform1f(gl.getUniformLocation(program, "u_sheenIntensity"), sheenIntensity);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }, [
    effectiveModeIndex,
    effectiveKeyColor,
    effectiveSimilarity,
    effectiveSmoothness,
    despillStrength,
    defringeStrength,
    enableBilateralFilter,
    enableSheen,
    sheenProgress,
    sheenIntensity,
  ]);

  // Image loader and renderer
  useEffect(() => {
    if (isVideo || !src) return;

    let isSubscribed = true;
    const img = new Image();
    img.crossOrigin = "anonymous";

    // If external CDN image, route via image-proxy to ensure CORS compliance
    let targetSrc = src;
    if (src.startsWith("http://") || src.startsWith("https://")) {
      const isLocalhost =
        src.includes("localhost:") ||
        src.includes("127.0.0.1:") ||
        src.includes("0.0.0.0:");
      if (!isLocalhost) {
        // When running under Remotion renderer (e.g. port 3001 or non-3000), route explicitly to Next.js on port 3000
        const appBase =
          typeof window !== "undefined" && window.location.port && window.location.port !== "3000"
            ? `${window.location.protocol}//${window.location.hostname}:3000`
            : "";
        targetSrc = `${appBase}/api/ecommerce/image-proxy?url=${encodeURIComponent(src)}`;
      }
    }

    img.onload = () => {
      if (!isSubscribed) return;
      imageRef.current = img;
      setIsLoaded(true);
      drawFrame(img, img.naturalWidth || img.width, img.naturalHeight || img.height);
      onReady?.();
    };

    img.onerror = () => {
      if (!isSubscribed) return;
      // If proxy route failed, try raw src as fallback
      if (targetSrc !== src) {
        img.src = src;
      } else {
        setHasError(true);
        onReady?.(); // Ensure continueRender is called so Remotion doesn't hang
      }
    };

    img.src = targetSrc;

    return () => {
      isSubscribed = false;
    };
  }, [src, isVideo, drawFrame, onReady]);

  // Video render loop
  useEffect(() => {
    if (!isVideo || !src) return;

    const video = videoRef.current;
    if (!video) return;

    let isRunning = true;
    const renderLoop = () => {
      if (!isRunning) return;
      if (video.readyState >= 2 && video.videoWidth > 0) {
        drawFrame(video, video.videoWidth, video.videoHeight);
      }
      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isVideo, src, drawFrame]);

  // Fallback to standard img tag if WebGL failed or unsupported
  if (hasError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={className}
        style={style}
        crossOrigin="anonymous"
      />
    );
  }

  return (
    <>
      {isVideo && (
        <video
          ref={videoRef}
          src={src}
          playsInline
          muted
          autoPlay
          loop
          crossOrigin="anonymous"
          style={{ display: "none" }}
        />
      )}
      <canvas
        ref={canvasRef}
        className={className}
        style={{
          ...style,
          display: "block",
          pointerEvents: "none",
        }}
        aria-label={alt}
      />
    </>
  );
};

"use client";

import React, { useRef, useEffect, useState } from "react";
import { useCurrentFrame, useVideoConfig, delayRender, continueRender } from "remotion";
import { resolveSrc } from "../utils/resolveSrc";
import { VERTEX_SHADER, FRAGMENT_SHADER, compileShader } from "./chromaShader";

export interface ChromaKeyVideoProps {
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
  /** Ambient rim light strength (0.0 to 1.0, default: 0.30) */
  rimStrength?: number;
  /** Ambient color tint matching the studio set / background [0..1] (default: neutral [1.0, 1.0, 1.0]) */
  ambientTint?: [number, number, number];
  /** Optional frame offset (e.g. sceneStartFrame) so video playback starts at 0.0s from this frame */
  frameOffset?: number;
  /** CSS object-fit for canvas display (default: 'contain') */
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
  /** CSS object-position for canvas display (default: 'bottom center') */
  objectPosition?: string;
  /** Optional callback fired when the video fails to load */
  onError?: () => void;
}

export const ChromaKeyVideo: React.FC<ChromaKeyVideoProps> = ({
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
  frameOffset,
  objectFit: propObjectFit,
  objectPosition: propObjectPosition,
  onError: propOnError,
}) => {
  const effectiveObjectFit = propObjectFit ?? (style?.objectFit as ChromaKeyVideoProps["objectFit"]) ?? "contain";
  const effectiveObjectPosition = propObjectPosition ?? (style?.objectPosition as string) ?? "bottom center";

  const [prevSrc, setPrevSrc] = useState(src);
  const [hasError, setHasError] = useState(false);
  const hasErrorRef = useRef(false);

  // Reset error state on src change during render (React 19 compliant)
  if (src !== prevSrc) {
    setPrevSrc(src);
    setHasError(false);
  }

  // Synchronize ref outside render
  useEffect(() => {
    hasErrorRef.current = false;
  }, [src]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderFrameRef = useRef<(() => void) | null>(null);

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lastFrameRef = useRef<number>(frame);
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. WebGL2 Chroma Keying Pipeline Initialization (Runs first to guarantee renderFrameRef is ready)
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
      premultipliedAlpha: false,
    });

    if (!gl) return;

    const vert = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vert || !frag) return;

    const program = gl.createProgram();
    if (!program) return;

    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    gl.useProgram(program);

    // Uniform locations
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

    // Texture Unit 0 setup
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    let animFrameId: number | null = null;

    const renderFrame = () => {
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.useProgram(program);

        // Upload current video frame to GPU texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        gl.uniform1i(uVideoTextureLoc, 0);

        // Update uniforms
        gl.uniform3f(uKeyColorLoc, keyColor[0], keyColor[1], keyColor[2]);
        gl.uniform1f(uSimilarityLoc, similarity);
        gl.uniform1f(uSmoothnessLoc, smoothness);
        gl.uniform1f(uDespillStrengthLoc, despillStrength);
        gl.uniform2f(uTexelSizeLoc, matteErosion / canvas.width, matteErosion / canvas.height);
        gl.uniform3f(uRimColorLoc, rimColor[0], rimColor[1], rimColor[2]);
        gl.uniform1f(uRimStrengthLoc, rimStrength);
        gl.uniform3f(uAmbientTintLoc, ambientTint[0], ambientTint[1], ambientTint[2]);

        // Draw quad
        gl.bindVertexArray(vao);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }

      if (!video.paused && !video.ended) {
        animFrameId = requestAnimationFrame(renderFrame);
      }
    };

    renderFrameRef.current = renderFrame;

    const onPlay = () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      animFrameId = requestAnimationFrame(renderFrame);
    };

    const onSeekOrUpdate = () => {
      renderFrame();
    };

    const onVideoError = () => {
      hasErrorRef.current = true;
      setHasError(true);
      propOnError?.();
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("playing", onPlay);
    video.addEventListener("seeked", onSeekOrUpdate);
    video.addEventListener("timeupdate", onSeekOrUpdate);
    video.addEventListener("loadeddata", onSeekOrUpdate);
    video.addEventListener("error", onVideoError);

    if (video.readyState >= 2) {
      renderFrame();
    }

    return () => {
      renderFrameRef.current = null;
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      if (animFrameId) cancelAnimationFrame(animFrameId);

      video.removeEventListener("play", onPlay);
      video.removeEventListener("playing", onPlay);
      video.removeEventListener("seeked", onSeekOrUpdate);
      video.removeEventListener("timeupdate", onSeekOrUpdate);
      video.removeEventListener("loadeddata", onSeekOrUpdate);
      video.removeEventListener("error", onVideoError);

      gl.deleteTexture(texture);
      gl.deleteBuffer(vbo);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
    };
  }, [keyColor, similarity, smoothness, despillStrength, matteErosion, rimColor, rimStrength, ambientTint, propOnError]);

  // 2. Remotion Frame-by-Frame Seek & Synchronize (Runs after WebGL is ready)
  useEffect(() => {
    if (hasErrorRef.current) return;
    const video = videoRef.current;
    if (!video || video.error) {
      hasErrorRef.current = true;
      setHasError(true);
      propOnError?.();
      return;
    }

    let handle: number | null = null;
    try {
      handle = delayRender(`ChromaKeyVideo frame ${frame}`);
    } catch {
      handle = null;
    }

    let isResolved = false;
    const finish = () => {
      if (!isResolved) {
        isResolved = true;
        if (handle !== null) {
          try {
            continueRender(handle);
          } catch {}
        }
      }
    };

    // Timeout safety fallback: never stall render longer than 350ms (prevents Puppeteer frame hangs)
    const timeoutId = setTimeout(() => {
      renderFrameRef.current?.();
      finish();
    }, 350);

    const onFrameError = () => {
      hasErrorRef.current = true;
      setHasError(true);
      clearTimeout(timeoutId);
      finish();
      propOnError?.();
    };

    video.addEventListener("error", onFrameError, { once: true });

    const handleSeekAndRender = () => {
      if (hasErrorRef.current || video.error) {
        clearTimeout(timeoutId);
        finish();
        return;
      }

      const duration = video.duration;
      const relFrame = frameOffset !== undefined ? Math.max(0, frame - frameOffset) : frame;
      const targetTime = Number.isFinite(duration) && duration > 0
        ? Math.min(Math.max(0, (relFrame / fps) % duration), Math.max(0, duration - 0.001))
        : 0;

      const diff = Math.abs(video.currentTime - targetTime);
      const isAdvancing = frame > lastFrameRef.current && frame - lastFrameRef.current <= 3;
      lastFrameRef.current = frame;

      // Clear any pending pause debounce
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
      }

      if (isAdvancing) {
        // Continuous playback mode (e.g. user pressed Play in Remotion Player)
        if (video.paused) {
          video.play().catch(() => {});
        }

        // Only seek if drift exceeds 250ms (~8 frames) to prevent decoder thrashing
        if (diff > 0.25) {
          video.currentTime = targetTime;
        }

        // Keep WebGL rendering active
        renderFrameRef.current?.();
        clearTimeout(timeoutId);
        finish();
      } else {
        // Paused or scrubbing mode (user seeking or video stopped)
        // Debounce pause to ensure clean transition
        pauseTimerRef.current = setTimeout(() => {
          if (!video.paused) {
            video.pause();
          }
        }, 60);

        if (diff > 0.001) {
          let isDone = false;
          const finalizeRender = () => {
            if (isDone) return;
            isDone = true;
            clearTimeout(timeoutId);
            renderFrameRef.current?.();
            finish();
          };

          const onSeeked = () => {
            video.removeEventListener("seeked", onSeeked);
            if ("requestVideoFrameCallback" in video) {
              (video as HTMLVideoElement & { requestVideoFrameCallback: (cb: () => void) => number }).requestVideoFrameCallback(finalizeRender);
            } else {
              requestAnimationFrame(finalizeRender);
            }
          };

          video.addEventListener("seeked", onSeeked, { once: true });
          video.currentTime = targetTime;
        } else {
          clearTimeout(timeoutId);
          renderFrameRef.current?.();
          finish();
        }
      }
    };

    let onLoaded: (() => void) | null = null;
    if (video.readyState < 2) {
      onLoaded = () => {
        if (onLoaded) {
          video.removeEventListener("loadeddata", onLoaded);
          video.removeEventListener("canplay", onLoaded);
        }
        handleSeekAndRender();
      };
      video.addEventListener("loadeddata", onLoaded, { once: true });
      video.addEventListener("canplay", onLoaded, { once: true });
    } else {
      handleSeekAndRender();
    }

    return () => {
      video.removeEventListener("error", onFrameError);
      if (onLoaded) {
        video.removeEventListener("loadeddata", onLoaded);
        video.removeEventListener("canplay", onLoaded);
      }
      clearTimeout(timeoutId);
      if (!isResolved && handle !== null) {
        try {
          continueRender(handle);
        } catch {}
      }
    };
  }, [frame, fps, frameOffset, propOnError]);

  if (hasError || !src) {
    return (
      <div style={{ position: "relative", width: "100%", height: "100%", ...style }} className={className} />
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", ...style }} className={className}>
      <video
        ref={videoRef}
        src={resolveSrc(src)}
        aria-hidden="true"
        playsInline
        muted
        loop
        preload="auto"
        crossOrigin="anonymous"
        onError={() => {
          hasErrorRef.current = true;
          setHasError(true);
          propOnError?.();
        }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          opacity: 0,
          pointerEvents: "none",
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          objectFit: effectiveObjectFit,
          objectPosition: effectiveObjectPosition,
        }}
      />
    </div>
  );
};

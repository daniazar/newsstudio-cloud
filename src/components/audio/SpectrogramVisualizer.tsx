"use client";

import React, { useRef, useEffect } from "react";

interface SpectrogramVisualizerProps {
  audioElement?: HTMLAudioElement | null;
  isPlaying: boolean;
  className?: string;
}

export function SpectrogramVisualizer({
  audioElement,
  isPlaying,
  className = "",
}: SpectrogramVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!audioElement || !canvasRef.current) return;

    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }

      const ctx = audioCtxRef.current;
      if (!analyserRef.current) {
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.85;
        analyserRef.current = analyser;

        if (!sourceRef.current) {
          try {
            sourceRef.current = ctx.createMediaElementSource(audioElement);
            sourceRef.current.connect(analyser);
            analyser.connect(ctx.destination);
          } catch {
            // Element might already be connected
          }
        }
      }
    } catch (err) {
      console.warn("[Spectrogram] Web Audio setup warning:", err);
    }
  }, [audioElement]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      if (!isPlaying || !analyserRef.current) {
        ctx.strokeStyle = "rgba(168, 85, 247, 0.2)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        return;
      }

      const analyser = analyserRef.current;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      const barWidth = (width / bufferLength) * 1.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height;

        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, "#06b6d4");
        gradient.addColorStop(0.5, "#a855f7");
        gradient.addColorStop(1, "#f43f5e");

        ctx.fillStyle = gradient;
        ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);

        x += barWidth;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      width={360}
      height={64}
      className={`w-full rounded-xl bg-background/60 border border-border/60 ${className}`}
    />
  );
}

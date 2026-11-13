"use client";

import React, { useEffect, useRef } from "react";

interface SphereParticle {
  x: number;
  y: number;
  z: number;
  originalX: number;
  originalY: number;
  originalZ: number;
  color: string;
  length: number;
  speed: number;
}

export function InteractiveSphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const particles: SphereParticle[] = [];
    const numParticles = 400;
    const colors = ["#4f46e5", "#06b6d4", "#e11d48", "#10b981", "#8b5cf6"];

    // Initialize particles on a sphere
    for (let i = 0; i < numParticles; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const r = 350 + Math.random() * 50; // Sphere radius range
      
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      
      particles.push({
        x, y, z,
        originalX: x, originalY: y, originalZ: z,
        color: colors[Math.floor(Math.random() * colors.length)],
        length: 4 + Math.random() * 8,
        speed: 0.001 + Math.random() * 0.002
      });
    }

    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;
    let time = 0;

    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse coordinates to center
      targetMouseX = (e.clientX - width / 2) * 0.5;
      targetMouseY = (e.clientY - height / 2) * 0.5;
    };

    window.addEventListener("mousemove", handleMouseMove);
    
    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener("resize", handleResize);

    let animationFrameId: number;

    const render = () => {
      time += 0.005;
      
      // Smooth mouse follow
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2 + mouseX * 0.3;
      const centerY = height / 2 + mouseY * 0.3;

      // Rotation angles based on mouse and time
      const rotX = time + mouseY * 0.002;
      const rotY = time + mouseX * 0.002;

      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);

      particles.forEach((p) => {
        // Rotate around X
        const y1 = p.originalY * cosX - p.originalZ * sinX;
        const z1 = p.originalY * sinX + p.originalZ * cosX;
        
        // Rotate around Y
        const x2 = p.originalX * cosY + z1 * sinY;
        const z2 = -p.originalX * sinY + z1 * cosY;
        
        const y2 = y1;

        // Apply 3D perspective projection
        const focalLength = 1000;
        const scale = focalLength / (focalLength + z2);
        
        const screenX = centerX + x2 * scale;
        const screenY = centerY + y2 * scale;
        
        // Calculate the tail of the vector line
        const _tailX = centerX + (x2 - p.length * (x2/p.originalX||1)) * scale;
        const _tailY = centerY + (y2 - p.length * (y2/p.originalY||1)) * scale;

        // Opacity fades based on depth (z2)
        const depthOpacity = Math.max(0.1, Math.min(1, (z2 + 500) / 1000));

        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        // Add a slight angle to make them look like moving vectors
        ctx.lineTo(screenX + (x2 * 0.02) * scale, screenY + (y2 * 0.02) * scale);
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = depthOpacity * 0.8;
        ctx.lineWidth = 1.5 * scale;
        ctx.stroke();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.8 }}
    />
  );
}

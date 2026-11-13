"use client";

import React, { useEffect, useRef } from "react";

export function InteractiveAgentNetwork() {
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

    const particles: { x: number; y: number; vx: number; vy: number; radius: number; color: string; originalX: number; originalY: number }[] = [];
    const numParticles = Math.floor((width * height) / 12000); // Responsive number of particles
    
    // Warm fiery colors for a dark background
    const colors = ["#ef4444", "#f59e0b", "#f97316", "#fbbf24", "#dc2626"];

    for (let i = 0; i < numParticles; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      particles.push({
        x,
        y,
        originalX: x,
        originalY: y,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const mouse = { x: width / 2, y: height / 2, radius: 250 };
    const targetMouse = { x: width / 2, y: height / 2 };

    const handleMouseMove = (e: MouseEvent) => {
      targetMouse.x = e.clientX;
      targetMouse.y = e.clientY;
    };

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", handleResize);

    let animationFrameId: number;

    const render = () => {
      // Smooth mouse follow
      mouse.x += (targetMouse.x - mouse.x) * 0.1;
      mouse.y += (targetMouse.y - mouse.y) * 0.1;

      ctx.clearRect(0, 0, width, height);

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Slowly drift back to original position to maintain structure
        p.vx += (p.originalX - p.x) * 0.0001;
        p.vy += (p.originalY - p.y) * 0.0001;

        // Apply velocity
        p.x += p.vx;
        p.y += p.vy;

        // Friction
        p.vx *= 0.98;
        p.vy *= 0.98;

        // Mouse interaction (Repel / Assemble)
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < mouse.radius) {
          const forceDirectionX = dx / distance;
          const forceDirectionY = dy / distance;
          const force = (mouse.radius - distance) / mouse.radius;
          
          // Particles get pulled slightly towards the mouse but also orbit
          p.vx += forceDirectionX * force * 0.2;
          p.vy += forceDirectionY * force * 0.2;
          
          // Add a tangential force for orbit effect
          p.vx += forceDirectionY * force * 0.5;
          p.vy -= forceDirectionX * force * 0.5;
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        // Connect particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx2 = p.x - p2.x;
          const dy2 = p.y - p2.y;
          const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

          // Connect if close to each other AND close to mouse
          if (dist2 < 80) {
            const mouseDist1 = Math.sqrt(Math.pow(mouse.x - p.x, 2) + Math.pow(mouse.y - p.y, 2));
            const mouseDist2 = Math.sqrt(Math.pow(mouse.x - p2.x, 2) + Math.pow(mouse.y - p2.y, 2));
            
            if (mouseDist1 < mouse.radius * 1.5 || mouseDist2 < mouse.radius * 1.5) {
               ctx.beginPath();
               ctx.moveTo(p.x, p.y);
               ctx.lineTo(p2.x, p2.y);
               // Opacity based on distance between particles and distance to mouse
               const alpha = (1 - dist2 / 80) * Math.max(0, 1 - Math.min(mouseDist1, mouseDist2) / (mouse.radius * 1.5));
               ctx.strokeStyle = `rgba(249, 115, 22, ${alpha * 0.5})`; // Orange line
               ctx.lineWidth = 1.5;
               ctx.stroke();
            }
          }
        }
      }

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
      style={{ opacity: 0.9 }}
    />
  );
}

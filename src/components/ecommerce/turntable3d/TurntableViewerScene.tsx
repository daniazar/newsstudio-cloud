/**
 * src/components/ecommerce/turntable3d/TurntableViewerScene.tsx
 *
 * React Three Fiber implementation of the interactive GLB viewer (PRD §10,
 * FR-04.3). Browser-only — never import this file directly from a page; use
 * the SSR-safe `TurntableViewer` wrapper, which loads it via `next/dynamic`
 * with `ssr: false`.
 *
 * Lighting choice: drei's `<Environment preset="studio" />` downloads its HDRI
 * from a public CDN at runtime, which breaks the local-first / offline studio.
 * Instead we build the studio environment procedurally from `<Lightformer>`
 * panels rendered into a cube map (no network), plus a key/fill/rim light rig
 * and a contact shadow.
 */

"use client";

import React, { Suspense, useCallback, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Center,
  Clone,
  ContactShadows,
  Environment,
  Html,
  Lightformer,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";
import type { OnCenterCallbackProps } from "@react-three/drei";
import { Loader, MousePointerClick, RotateCw } from "lucide-react";

export interface TurntableViewerSceneProps {
  /** URL of the normalized GLB (`Product3DAsset.meshUrl`). */
  meshUrl: string;
  /** Initial auto-rotate state (default true). Clicking the canvas toggles it. */
  autoRotate?: boolean;
  /** CSS background behind the canvas (default transparent). */
  background?: string;
  className?: string;
}

/** Normalized meshes are ≤ 1 unit, but we fit to a unit sphere regardless. */
const TARGET_RADIUS = 1;
/** Max pointer travel (px) between down/up that still counts as a click, not an orbit drag. */
const CLICK_TOLERANCE_PX = 4;

interface FitState {
  scale: number;
  /** Distance from model center to its lowest point after scaling. */
  floorY: number;
}

function ProductModel({ url, onFit }: { url: string; onFit: (fit: FitState) => void }) {
  const gltf = useGLTF(url);

  const handleCentered = useCallback(
    ({ boundingSphere, height }: OnCenterCallbackProps) => {
      const radius = boundingSphere.radius > 0 ? boundingSphere.radius : 1;
      const scale = TARGET_RADIUS / radius;
      onFit({ scale, floorY: -(height * scale) / 2 });
    },
    [onFit]
  );

  return (
    <Center onCentered={handleCentered}>
      <Clone object={gltf.scene} />
    </Center>
  );
}

function StudioEnvironment() {
  return (
    <Environment resolution={256} frames={1}>
      {/* Large soft overhead key */}
      <Lightformer form="rect" intensity={2.2} color="#ffffff" position={[0, 5, -1]} rotation-x={Math.PI / 2} scale={[10, 6, 1]} />
      {/* Side strip boxes for crisp product edge highlights */}
      <Lightformer form="rect" intensity={1.6} color="#ffffff" position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[8, 1.5, 1]} />
      <Lightformer form="rect" intensity={1.6} color="#ffffff" position={[5, 1, -1]} rotation-y={-Math.PI / 2} scale={[8, 1.5, 1]} />
      {/* Back rim ring */}
      <Lightformer form="ring" intensity={1.2} color="#dbeafe" position={[0, 1.5, -6]} scale={4} />
      {/* Subtle warm bounce from the floor */}
      <Lightformer form="rect" intensity={0.35} color="#fde68a" position={[0, -3, 0]} rotation-x={-Math.PI / 2} scale={[10, 10, 1]} />
    </Environment>
  );
}

function LoadingIndicator() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2 text-zinc-300 pointer-events-none select-none">
        <Loader className="h-6 w-6 animate-spin text-cyan-400" />
        <span className="text-[10px] font-mono uppercase tracking-wider whitespace-nowrap">Loading 3D model…</span>
      </div>
    </Html>
  );
}

export default function TurntableViewerScene({
  meshUrl,
  autoRotate: initialAutoRotate = true,
  background = "transparent",
  className = "",
}: TurntableViewerSceneProps) {
  const [autoRotate, setAutoRotate] = useState(initialAutoRotate);
  const [fit, setFit] = useState<FitState>({ scale: 1, floorY: -TARGET_RADIUS });
  const pointerDown = useRef<{ x: number; y: number } | null>(null);

  const handleFit = useCallback((next: FitState) => {
    setFit((prev) =>
      Math.abs(prev.scale - next.scale) < 1e-6 && Math.abs(prev.floorY - next.floorY) < 1e-6 ? prev : next
    );
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerDown.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = pointerDown.current;
    pointerDown.current = null;
    if (!start) return;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) <= CLICK_TOLERANCE_PX) {
      setAutoRotate((v) => !v);
    }
  };

  return (
    <div
      className={`relative h-full w-full ${className}`}
      style={{ background }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [2.2, 1.3, 2.6], fov: 38, near: 0.05, far: 100 }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: false }}
      >
        <ambientLight intensity={0.25} />
        <directionalLight position={[3, 5, 4]} intensity={1.4} />
        <directionalLight position={[-4, 2, -3]} intensity={0.5} color="#bfdbfe" />

        <Suspense fallback={<LoadingIndicator />}>
          <group scale={fit.scale}>
            <ProductModel url={meshUrl} onFit={handleFit} />
          </group>
          <ContactShadows position={[0, fit.floorY - 0.002, 0]} opacity={0.55} scale={4} blur={2.4} far={2} resolution={512} />
          <StudioEnvironment />
        </Suspense>

        <OrbitControls
          makeDefault
          autoRotate={autoRotate}
          autoRotateSpeed={1.5}
          enablePan={false}
          enableDamping
          minDistance={1.2}
          maxDistance={8}
        />
      </Canvas>

      <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1.5 rounded-md border border-zinc-700/70 bg-black/70 px-2 py-1 text-[10px] font-semibold text-zinc-300 backdrop-blur">
        {autoRotate ? (
          <RotateCw className="h-3 w-3 animate-spin text-cyan-400 [animation-duration:3s]" />
        ) : (
          <MousePointerClick className="h-3 w-3 text-zinc-400" />
        )}
        <span>{autoRotate ? "Auto-rotate · click to pause" : "Paused · drag to orbit, click to spin"}</span>
      </div>
    </div>
  );
}

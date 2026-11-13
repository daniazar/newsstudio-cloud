"use client";

import React, { Suspense, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Html,
  Lightformer,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";
import * as THREE from "three";
import { Loader } from "lucide-react";

export interface Neural3DLabViewerProps {
  glbUrl: string;
  motionMode?: "hero" | "360" | "pause";
  wireframe?: boolean;
  exposure?: number;
  baseYaw?: number;
  className?: string;
}

function ProductModel({
  url,
  wireframe,
  motionMode,
  baseYaw = 0,
  onFloorY,
}: {
  url: string;
  wireframe?: boolean;
  motionMode?: "hero" | "360" | "pause";
  baseYaw?: number;
  onFloorY?: (y: number) => void;
}) {
  const gltf = useGLTF(url);
  const modelRef = useRef<THREE.Group | null>(null);
  const phaseRef = useRef<number>(0);

  // Normalize geometry once deterministically
  const { normalizedScene, floorY } = React.useMemo(() => {
    if (!gltf.scene) return { normalizedScene: null, floorY: -0.7 };
    const cloned = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z, 0.001);
    const targetSize = 0.85;
    const scale = targetSize / maxDim;

    // Offset to center at (0, 0, 0)
    cloned.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
    cloned.scale.setScalar(scale);

    // Shadows & materials
    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => {
            if ("wireframe" in m) (m as THREE.MeshStandardMaterial).wireframe = Boolean(wireframe);
          });
        } else if (mesh.material && "wireframe" in mesh.material) {
          (mesh.material as THREE.MeshStandardMaterial).wireframe = Boolean(wireframe);
        }
      }
    });

    const calculatedFloorY = -(size.y * scale) / 2.0;
    return { normalizedScene: cloned, floorY: calculatedFloorY };
  }, [gltf.scene, wireframe]);

  useEffect(() => {
    if (onFloorY) onFloorY(floorY);
  }, [floorY, onFloorY]);

  useFrame((_, delta) => {
    if (!modelRef.current) return;

    if (motionMode === "hero") {
      // 30° Hero Sweep Arc with subtle pitch wobble
      phaseRef.current += delta * 1.6;
      const yawAmp = THREE.MathUtils.degToRad(18);
      const pitchAmp = THREE.MathUtils.degToRad(3.5);
      modelRef.current.rotation.y = baseYaw + Math.sin(phaseRef.current) * yawAmp;
      modelRef.current.rotation.x = Math.cos(phaseRef.current) * pitchAmp;
    } else if (motionMode === "360") {
      modelRef.current.rotation.x = 0;
      modelRef.current.rotation.y += delta * 0.9;
    } else if (motionMode === "pause") {
      modelRef.current.rotation.x = 0;
      modelRef.current.rotation.y = baseYaw;
    }
  });

  if (!normalizedScene) return null;

  return (
    <group ref={modelRef}>
      <primitive object={normalizedScene} />
    </group>
  );
}

function StudioLighting() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 4]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-4, 2, -3]} intensity={1.2} color="#bfdbfe" />
      <directionalLight position={[0, 4, -4]} intensity={1.5} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.0} color="#ffffff" position={[0, 5, -1]} rotation-x={Math.PI / 2} scale={[10, 6, 1]} />
        <Lightformer form="rect" intensity={1.5} color="#ffffff" position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[8, 1.5, 1]} />
        <Lightformer form="rect" intensity={1.5} color="#ffffff" position={[5, 1, -1]} rotation-y={-Math.PI / 2} scale={[8, 1.5, 1]} />
      </Environment>
    </>
  );
}

function LoaderOverlay() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2 text-zinc-300 pointer-events-none select-none bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-zinc-800 backdrop-blur shadow-2xl">
        <Loader className="h-5 w-5 animate-spin text-emerald-400" />
        <span className="text-[11px] font-mono tracking-wider text-zinc-300">Loading 3D mesh…</span>
      </div>
    </Html>
  );
}

export default function Neural3DLabViewer({
  glbUrl,
  motionMode = "hero",
  wireframe = false,
  exposure = 1.0,
  baseYaw = 0,
  className = "",
}: Neural3DLabViewerProps) {
  const [floorY, setFloorY] = useState<number>(-0.68);

  return (
    <div className={`relative h-full w-full bg-[#0b0c10] overflow-hidden ${className}`}>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0.0, 3.8], fov: 34, near: 0.05, far: 100 }}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: exposure,
        }}
      >
        <Suspense fallback={<LoaderOverlay />}>
          <ProductModel
            key={glbUrl}
            url={glbUrl}
            wireframe={wireframe}
            motionMode={motionMode}
            baseYaw={baseYaw}
            onFloorY={setFloorY}
          />
          <ContactShadows
            position={[0, floorY - 0.002, 0]}
            opacity={0.45}
            scale={3.5}
            blur={2.0}
            far={2}
            resolution={512}
          />
          <StudioLighting />
        </Suspense>

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.05}
          enablePan={false}
          minDistance={1.0}
          maxDistance={5.0}
          target={[0, 0, 0]}
        />
      </Canvas>

      {/* Grid Floor */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.04)_0%,transparent_70%)]" />
    </div>
  );
}

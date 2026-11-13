"use client";

import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import gsap from "gsap";
import * as THREE from "three";
import CameraRig from "./CameraRig";
import Deer from "./Deer";
import Droplets from "./Droplets";
import Forest from "./Forest";
import Lake from "./Lake";
import Mist from "./Mist";
import Bottles3D from "./Bottles3D";
import Shore from "./Shore";
import Sky from "./Sky";
import Steam from "./Steam";
import StagParticles from "./StagParticles";
import Terrain from "./Terrain";
import { DEER_POSITION, DEER_ROTATION, STATES, SUN_DIR, intro, pointer } from "./story";

/** Starts the stag's formation once the model and the particles are ready. */
function Intro({ reduceMotion }: { reduceMotion: boolean }) {
  useEffect(() => {
    if (reduceMotion) {
      intro.form = 1;
      return;
    }
    intro.form = 0;
    const tween = gsap.to(intro, { form: 1, duration: 3.8, ease: "power2.inOut", delay: 0.5 });
    return () => {
      tween.kill();
    };
  }, [reduceMotion]);
  return null;
}

export default function Scene() {
  // pixel ratio ceiling; the device's own ratio is used when it is lower
  const [maxDpr, setMaxDpr] = useState(1.5);
  const [quality, setQuality] = useState<"high" | "low">("high");
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const small = Math.min(window.innerWidth, window.innerHeight) < 700;
    if (small) {
      setQuality("low");
      setMaxDpr(1.25);
    }
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
      pointer.moved = performance.now() / 1000;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <Canvas
      dpr={[1, maxDpr]}
      camera={{ fov: 34, near: 0.1, far: 600, position: [STATES.hero.cx, STATES.hero.cy, STATES.hero.cz] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.localClippingEnabled = true;
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.toneMappingExposure = 1.0;
      }}
    >
      <PerformanceMonitor onDecline={() => setMaxDpr(1)} onIncline={() => setMaxDpr(quality === "high" ? 1.75 : 1.4)} />
      <fog attach="fog" args={["#efd9bb", 90, 560]} />
      <hemisphereLight args={["#ffe6c4", "#56633f", 0.72]} />
      {/* the low sun, from the left of the valley */}
      <directionalLight position={[-90, 40, -24]} intensity={3.4} color="#ffcd8c" />
      <directionalLight position={[30, 22, 45]} intensity={0.6} color="#dfe7f2" />
      <Environment resolution={256} frames={1}>
        <Sky animated={false} />
        <Lightformer form="circle" intensity={7} color="#ffe0b0" position={[SUN_DIR[0] * 50, 6, SUN_DIR[2] * 50]} scale={9} />
        <Lightformer form="rect" intensity={1.6} color="#ffffff" position={[26, 9, 18]} scale={[14, 6, 1]} />
        {/* soft panels so the glass catches bright edges, like a studio */}
        <Lightformer form="rect" intensity={2.4} color="#fff7ea" position={[0, 14, 26]} scale={[34, 8, 1]} />
        <Lightformer form="rect" intensity={5} color="#ffffff" position={[2, 22, -2]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
        <Lightformer form="ring" intensity={4} color="#fff3dc" position={[-6, 8, 16]} scale={4} />
        <Lightformer form="rect" intensity={3} color="#ffffff" position={[-16, 4, 14]} scale={[3, 16, 1]} />
        <Lightformer form="rect" intensity={2.6} color="#ffffff" position={[17, 4, 10]} scale={[3, 16, 1]} />
        <mesh position-y={-2} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[120, 32]} />
          <meshBasicMaterial color="#4c5a3c" />
        </mesh>
      </Environment>

      <Sky />
      <Terrain quality={quality} />
      <Forest quality={quality} />
      <Shore quality={quality} />
      <Mist />
      <Suspense fallback={null}>
        <Lake quality={quality} />
        <group position={DEER_POSITION} rotation-y={DEER_ROTATION}>
          <Deer />
          <StagParticles />
        </group>
        <Droplets count={quality === "high" ? 44 : 24} />
        <Bottles3D />
        <Steam />
        <Intro reduceMotion={reduceMotion} />
      </Suspense>
      <CameraRig reduceMotion={reduceMotion} />
    </Canvas>
  );
}

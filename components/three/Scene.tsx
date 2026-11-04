"use client";

import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import gsap from "gsap";
import * as THREE from "three";
import Bottle from "./Bottle";
import CameraRig from "./CameraRig";
import Deer from "./Deer";
import Lake from "./Lake";
import Mist from "./Mist";
import Mountains from "./Mountains";
import Sky from "./Sky";
import StagParticles from "./StagParticles";
import { DEER_POSITION, DEER_ROTATION, STATES, intro, pointer } from "./story";

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
  const [dpr, setDpr] = useState(1.5);
  const [quality, setQuality] = useState<"high" | "low">("high");
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const small = Math.min(window.innerWidth, window.innerHeight) < 700;
    if (small) {
      setQuality("low");
      setDpr(1.25);
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
      dpr={dpr}
      camera={{ fov: 34, near: 0.1, far: 400, position: [STATES.hero.cx, STATES.hero.cy, STATES.hero.cz] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.localClippingEnabled = true;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(quality === "high" ? 1.75 : 1.4)} />
      <fog attach="fog" args={["#e4f2fb", 24, 95]} />
      <hemisphereLight args={["#ffffff", "#bfe0f5", 0.9]} />
      <directionalLight position={[6, 9, 5]} intensity={1.8} color="#fff4e2" />
      <Environment resolution={256} frames={1}>
        <mesh scale={60}>
          <sphereGeometry args={[1, 32, 16]} />
          <meshBasicMaterial side={THREE.BackSide} color="#cfe8f8" />
        </mesh>
        <Lightformer form="rect" intensity={3} position={[0, 7, -4]} scale={[16, 4, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={2.2} position={[7, 2.5, 4]} rotation-y={-Math.PI / 2} scale={[7, 3, 1]} color="#fff1dc" />
        <Lightformer form="rect" intensity={1.8} position={[-7, 2.5, 3]} rotation-y={Math.PI / 2} scale={[7, 3, 1]} color="#bfe6ff" />
        <Lightformer form="ring" intensity={2.4} position={[0, 3, 9]} scale={2.5} color="#ffffff" />
      </Environment>

      <Sky />
      <Mountains />
      <Mist />
      <Suspense fallback={null}>
        <Lake quality={quality} />
        <group position={DEER_POSITION} rotation-y={DEER_ROTATION}>
          <Deer />
          <StagParticles />
        </group>
        <Bottle />
        <Intro reduceMotion={reduceMotion} />
      </Suspense>
      <CameraRig reduceMotion={reduceMotion} />
    </Canvas>
  );
}

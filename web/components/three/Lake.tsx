"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshReflectorMaterial } from "@react-three/drei";
import * as THREE from "three";
import { BOTTLE_POSITION, HOOVES, deerToWorld, intro, story } from "./story";

const rippleVertex = /* glsl */ `
  varying vec2 vP;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vP = w.xz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const rippleFragment = /* glsl */ `
  uniform float uTime, uAmp;
  uniform vec2 uHoof[4];
  uniform vec2 uSpring;
  uniform vec3 uDrops[6];
  varying vec2 vP;
  float crest(float d, float freq, float speed) { return pow(0.5 + 0.5 * sin(d * freq - uTime * speed), 12.0); }
  void main() {
    float rings = 0.0;
    for (int i = 0; i < 4; i++) { float d = length(vP - uHoof[i]); rings += crest(d, 16.0, 2.2) * exp(-d * 1.5); }
    float ds = length(vP - uSpring);
    rings += crest(ds, 10.0, 1.6) * exp(-ds * 0.6) * 1.2;
    for (int i = 0; i < 6; i++) {
      float age = uTime - uDrops[i].z;
      if (age > 0.0 && age < 2.4) {
        float e = (length(vP - uDrops[i].xy) - age * 0.45) * 22.0;
        rings += exp(-e * e) * exp(-age * 1.6) * 1.4;
      }
    }
    float fade = 1.0 - smoothstep(4.0, 12.0, length(vP));
    gl_FragColor = vec4(vec3(1.0), clamp(rings * uAmp * 0.55, 0.0, 0.85) * fade);
  }
`;

/** A still, mirror-like lake with ripples around the hooves, the spring and falling drops. */
export default function Lake({ quality }: { quality: "high" | "low" }) {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmp: { value: 0.4 },
      uHoof: { value: HOOVES.map(([x, z]) => new THREE.Vector2(...deerToWorld(x, z))) },
      uSpring: { value: new THREE.Vector2(BOTTLE_POSITION[0], BOTTLE_POSITION[2]) },
      uDrops: { value: Array.from({ length: 6 }, () => new THREE.Vector3(0, 0, -10)) },
    }),
    [],
  );
  const rippleMaterial = useMemo(
    () => new THREE.ShaderMaterial({ uniforms, vertexShader: rippleVertex, fragmentShader: rippleFragment, transparent: true, depthWrite: false }),
    [uniforms],
  );
  const drops = useMemo(() => ({ next: 0, index: 0 }), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    uniforms.uTime.value = t;
    uniforms.uAmp.value = story.ripple * (0.4 + 0.6 * Math.min(1, intro.form));
    // water dripping from the stag back into the lake
    if (t > drops.next && story.reveal > 0.5) {
      const [hx, hz] = HOOVES[Math.floor(Math.random() * HOOVES.length)];
      const [x, z] = deerToWorld(hx + (Math.random() - 0.5) * 0.5, hz + (Math.random() - 0.5) * 0.3);
      uniforms.uDrops.value[drops.index].set(x, z, t);
      drops.index = (drops.index + 1) % 6;
      drops.next = t + 0.5 + Math.random() * 0.9;
    }
  });

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} renderOrder={0}>
        <planeGeometry args={[160, 160]} />
        <MeshReflectorMaterial
          resolution={quality === "high" ? 1024 : 512}
          blur={[260, 70]}
          mixBlur={0.7}
          mixStrength={2.4}
          mixContrast={1}
          mirror={0.8}
          depthScale={0.35}
          minDepthThreshold={0.5}
          maxDepthThreshold={1.3}
          color="#a9d6f1"
          metalness={0.2}
          roughness={0.8}
        />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.015} renderOrder={4} material={rippleMaterial}>
        <planeGeometry args={[30, 30]} />
      </mesh>
    </group>
  );
}

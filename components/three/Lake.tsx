"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshReflectorMaterial } from "@react-three/drei";
import * as THREE from "three";
import { BOTTLE_POSITION, HOOVES, deerToWorld, intro, splashes, story } from "./story";

const MAX_DROPS = 12;

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
  uniform vec3 uDrops[${MAX_DROPS}];
  uniform vec3 uBright, uDark;
  varying vec2 vP;
  void main() {
    // signed wave height: crests catch the sky, troughs show the darker water
    float w = 0.0;
    for (int i = 0; i < 4; i++) {
      float d = length(vP - uHoof[i]);
      w += sin(d * 9.0 - uTime * 1.7) * exp(-d * 0.55) * smoothstep(0.05, 0.35, d);
    }
    float ds = length(vP - uSpring);
    w += sin(ds * 8.0 - uTime * 1.4) * exp(-ds * 0.7) * 0.8;
    for (int i = 0; i < ${MAX_DROPS}; i++) {
      float age = uTime - uDrops[i].z;
      if (age > 0.0 && age < 2.6) {
        float e = (length(vP - uDrops[i].xy) - age * 0.42) * 20.0;
        w += exp(-e * e) * exp(-age * 1.5) * 1.6;
      }
    }
    float fade = 1.0 - smoothstep(5.0, 15.0, length(vP - vec2(0.8, -1.2)));
    float crest = pow(max(w, 0.0), 1.6);
    float trough = pow(max(-w, 0.0), 1.6);
    vec3 col = crest > trough ? uBright : uDark;
    float a = clamp(max(crest * 0.6, trough * 0.32) * uAmp, 0.0, 0.8) * fade;
    gl_FragColor = vec4(col, a);
    #include <colorspace_fragment>
  }
`;

/** A still, mirror-like lake: rings spread from the stag's legs, the spring and every falling drop. */
export default function Lake({ quality }: { quality: "high" | "low" }) {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmp: { value: 0.4 },
      uHoof: { value: HOOVES.map(([x, z]) => new THREE.Vector2(...deerToWorld(x, z))) },
      uSpring: { value: new THREE.Vector2(BOTTLE_POSITION[0], BOTTLE_POSITION[2]) },
      uDrops: { value: Array.from({ length: MAX_DROPS }, () => new THREE.Vector3(0, 0, -10)) },
      uBright: { value: new THREE.Color("#fff4dc") },
      uDark: { value: new THREE.Color("#2f4f4c") },
    }),
    [],
  );
  const rippleMaterial = useMemo(
    () => new THREE.ShaderMaterial({ uniforms, vertexShader: rippleVertex, fragmentShader: rippleFragment, transparent: true, depthWrite: false }),
    [uniforms],
  );
  const drops = useMemo(() => ({ index: 0 }), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    uniforms.uTime.value = t;
    uniforms.uAmp.value = story.ripple * (0.4 + 0.6 * Math.min(1, intro.form));
    // every drop that lands becomes a ring
    while (splashes.length) {
      const drop = splashes.shift()!;
      uniforms.uDrops.value[drops.index].set(drop.x, drop.z, drop.t);
      drops.index = (drops.index + 1) % MAX_DROPS;
    }
  });

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[1.5, 0, -4]} renderOrder={0}>
        <planeGeometry args={[70, 60]} />
        <MeshReflectorMaterial
          resolution={quality === "high" ? 1024 : 512}
          blur={[90, 30]}
          mixBlur={0.35}
          mixStrength={1.25}
          mixContrast={1}
          mirror={0.94}
          depthScale={0.25}
          minDepthThreshold={0.6}
          maxDepthThreshold={1.2}
          color="#93bbb9"
          metalness={0}
          roughness={1}
        />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0.8, 0.015, -1.2]} renderOrder={4} material={rippleMaterial}>
        <planeGeometry args={[32, 32]} />
      </mesh>
    </group>
  );
}

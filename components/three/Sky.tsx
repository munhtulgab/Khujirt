"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SUN_DIR } from "./story";

const vertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uSun, uHorizon, uLow, uMid, uZenith, uWarm, uGlow, uCore, uCloud, uCloudLit, uGround;
  uniform float uTime;
  varying vec3 vDir;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; }
    return s;
  }

  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    float sd = max(dot(d, uSun), 0.0);
    float hh = max(h, 0.0);

    vec3 col = mix(uHorizon, uLow, smoothstep(0.0, 0.07, hh));
    col = mix(col, uMid, smoothstep(0.05, 0.28, hh));
    col = mix(col, uZenith, smoothstep(0.22, 0.8, hh));
    // the side of the sky around the sun is warmer
    col = mix(col, uWarm, pow(sd, 3.0) * 0.6 * (1.0 - smoothstep(0.0, 0.5, hh)));

    // thin evening clouds, lit from below by the sun
    if (h > 0.0) {
      vec2 uv = d.xz / (h + 0.09);
      uv = uv * vec2(0.32, 1.1) + vec2(uTime * 0.005, 0.0);
      float c = fbm(uv * 1.25);
      float cover = smoothstep(0.5, 0.78, c) * smoothstep(0.015, 0.09, h) * (1.0 - smoothstep(0.2, 0.55, h));
      vec3 cloud = mix(uCloud, uCloudLit, pow(sd, 5.0));
      col = mix(col, cloud, cover * 0.6);
    } else {
      col = mix(uHorizon, uGround, smoothstep(0.0, -0.25, h));
    }

    // sun glow and disk
    col += uGlow * (pow(sd, 14.0) * 0.45 + pow(sd, 160.0) * 0.9);
    col = mix(col, uCore, smoothstep(0.99955, 0.99978, sd));

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

export function makeSkyMaterial() {
  const c = (hex: string) => ({ value: new THREE.Color(hex) });
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    toneMapped: false,
    uniforms: {
      uSun: { value: new THREE.Vector3(...SUN_DIR) },
      uTime: { value: 0 },
      uHorizon: c("#f9d9a6"),
      uLow: c("#efdcc3"),
      uMid: c("#cdd3d4"),
      uZenith: c("#94abc4"),
      uWarm: c("#ffcf86"),
      uGlow: c("#ffc57a"),
      uCore: c("#fffaf0"),
      uCloud: c("#eadccc"),
      uCloudLit: c("#ffeccb"),
      uGround: c("#9aa184"),
    },
    vertexShader,
    fragmentShader,
  });
}

/** Golden-hour sky: soft blue overhead, a warm glowing horizon, the low sun and thin clouds. */
export default function Sky({ animated = true }: { animated?: boolean }) {
  const material = useMemo(() => makeSkyMaterial(), []);
  useFrame((state) => {
    if (animated) material.uniforms.uTime.value = state.clock.elapsedTime;
  });
  return (
    <mesh renderOrder={-10} frustumCulled={false} material={material}>
      <sphereGeometry args={[200, 48, 24]} />
    </mesh>
  );
}

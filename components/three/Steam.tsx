"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { fbm, rng } from "./noise";
import { HOOVES, SUN_DIR, deerToWorld, splashes, story } from "./story";

/**
 * Steam rising from the hot springs in the shallows, as the hunter Shunkhlai saw it at sunrise on
 * the east bank of the Khujirt river: thin wisps that climb, widen, drift with the morning air and
 * glow where they stand against the low sun. The springs also stir small rings on the water.
 * Everything moves on the GPU from the clock; the CPU only sets the density.
 */

const PER_SPRING = 13;

/** Springs: under and around the stag, in the warm shallows (world x, z, strength). */
const SPRINGS: [number, number, number][] = (() => {
  const list: [number, number, number][] = HOOVES.map(([x, z]) => [...deerToWorld(x, z), 1] as [number, number, number]);
  list.push([-0.9, -2.4, 0.9], [2.6, -2.2, 0.8], [0.4, -3.8, 1], [3.8, -0.4, 0.7], [-2.4, -0.6, 0.7], [-3.6, -3.2, 0.9], [5.2, -3.4, 0.8]);
  return list;
})();

/** Soft, wispy puff with a ragged edge. */
function makeSteamTexture(size = 128) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = (x / size) * 2 - 1;
      const v = (y / size) * 2 - 1;
      const d = Math.hypot(u * 1.05, v * 0.9);
      const n = fbm(x * 0.045 + 3.7, y * 0.06 - 1.3, 4) * 0.5 + 0.5;
      const a = Math.max(0, 1 - d) ** 1.6 * THREE.MathUtils.smoothstep(n, 0.28, 0.78);
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(Math.min(1, a * 1.7) * 255);
    }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const vertexShader = /* glsl */ `
  attribute vec3 aOrigin;
  attribute vec4 aParams; // phase, life (s), size, seed
  uniform float uTime;
  uniform vec3 uSunDir;
  varying vec2 vUv;
  varying float vAlpha;
  varying float vSun;

  void main() {
    float life = aParams.y;
    float seed = aParams.w;
    float age = fract(uTime / life + aParams.x);
    float t = age * life;
    vec3 p = aOrigin;
    // climb, slowing as the plume cools; drift with the morning air; curl
    p.y += 2.6 * (1.0 - exp(-t * 0.16)) * (0.8 + 0.4 * seed);
    p.x += t * 0.07 + sin(uTime * 0.37 + seed * 6.2831 + t * 0.45) * 0.22 * age;
    p.z += -t * 0.02 + cos(uTime * 0.29 + seed * 4.1 + t * 0.4) * 0.16 * age;
    float size = aParams.z * (0.5 + 2.6 * pow(age, 0.75));

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float a = seed * 6.2831 + t * 0.06 * (seed - 0.5);
    mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));
    mv.xy += rot * position.xy * size;
    gl_Position = projectionMatrix * mv;

    vUv = uv;
    vAlpha = smoothstep(0.0, 0.12, age) * pow(1.0 - age, 1.15);
    vec3 world = (modelMatrix * vec4(p, 1.0)).xyz;
    vSun = pow(max(dot(normalize(world - cameraPosition), uSunDir), 0.0), 5.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uDensity;
  uniform vec3 uCool, uWarm;
  varying vec2 vUv;
  varying float vAlpha;
  varying float vSun;

  void main() {
    float a = texture2D(uMap, vUv).a * vAlpha * uDensity;
    if (a < 0.003) discard;
    // grey-blue in the shade, gold where the low sun shines through it
    vec3 col = mix(uCool, uWarm, clamp(0.2 + vSun * 1.6, 0.0, 1.0));
    gl_FragColor = vec4(col, a);
    #include <colorspace_fragment>
  }
`;

export default function Steam() {
  const texture = useMemo(() => makeSteamTexture(), []);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDensity: { value: 0 },
      uMap: { value: texture },
      uSunDir: { value: new THREE.Vector3(...SUN_DIR) },
      uCool: { value: new THREE.Color("#f3f6f6") },
      uWarm: { value: new THREE.Color("#ffd9a6") },
    }),
    [texture],
  );

  const mesh = useMemo(() => {
    const plane = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = plane.index;
    geo.setAttribute("position", plane.getAttribute("position"));
    geo.setAttribute("uv", plane.getAttribute("uv"));
    const count = SPRINGS.length * PER_SPRING;
    const origin = new Float32Array(count * 3);
    const params = new Float32Array(count * 4);
    const r = rng(311);
    let n = 0;
    for (const [x, z, k] of SPRINGS)
      for (let i = 0; i < PER_SPRING; i++, n++) {
        const a = r() * Math.PI * 2;
        const d = Math.sqrt(r()) * 0.45;
        origin.set([x + Math.cos(a) * d, 0.02, z + Math.sin(a) * d], n * 3);
        params.set([i / PER_SPRING + r() * 0.08, 7 + r() * 5, (0.55 + r() * 0.5) * (0.7 + 0.3 * k), r()], n * 4);
      }
    geo.setAttribute("aOrigin", new THREE.InstancedBufferAttribute(origin, 3));
    geo.setAttribute("aParams", new THREE.InstancedBufferAttribute(params, 4));
    geo.instanceCount = count;
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    const m = new THREE.Mesh(geo, mat);
    m.frustumCulled = false;
    m.renderOrder = 6;
    return m;
  }, [uniforms]);

  useEffect(
    () => () => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      texture.dispose();
    },
    [mesh, texture],
  );

  const bubbling = useMemo(() => ({ next: 0, r: rng(83) }), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    uniforms.uTime.value = t;
    uniforms.uDensity.value = story.steam * 0.95;
    // "булаг зөөлөн зөөлөн оргилж": the springs well up gently, each one ringing the water
    if (story.steam > 0.05 && t > bubbling.next) {
      const [x, z] = SPRINGS[Math.floor(bubbling.r() * SPRINGS.length)];
      splashes.push({ x: x + (bubbling.r() - 0.5) * 0.3, z: z + (bubbling.r() - 0.5) * 0.3, t });
      bubbling.next = t + (0.5 + bubbling.r() * 1.2) / Math.max(0.3, story.steam);
    }
  });

  return <primitive object={mesh} />;
}

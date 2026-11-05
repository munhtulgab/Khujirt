"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { heightAt, lakeDistance, normalAt, shorePoint } from "./landscape";
import { fbm, rng } from "./noise";

const VARIANTS = 4;
const TEX_W = 160;
const TEX_H = 384;

/* ---------------------------------------------------------------- painted spruces */

function paintTier(ctx: CanvasRenderingContext2D, cx: number, y0: number, y1: number, half: number, r: () => number) {
  for (const side of [-1, 1]) {
    const tipX = cx + side * half;
    const tipY = y1 + (r() - 0.3) * (y1 - y0) * 0.35;
    ctx.beginPath();
    ctx.moveTo(cx, y0);
    ctx.quadraticCurveTo(cx + side * half * 0.5, y0 + (y1 - y0) * 0.3, tipX, tipY);
    // ragged underside of the branch, back to the stem
    const n = 7;
    for (let i = 1; i <= n; i++) {
      const u = 1 - i / n;
      const sag = (y1 - y0) * (0.06 + 0.28 * Math.sin(u * Math.PI)) * (i % 2 ? 1 : 0.35);
      ctx.lineTo(cx + side * half * u, tipY + sag * 0.6 - (1 - u) * (y1 - y0) * 0.25 + (r() - 0.5) * 3);
    }
    ctx.closePath();
    const g = ctx.createLinearGradient(cx, y0, tipX, tipY);
    g.addColorStop(0, "hsl(145, 34%, 6%)");
    // the evening sun comes from the left
    g.addColorStop(1, side < 0 ? `hsl(${88 + r() * 14}, ${30 + r() * 10}%, ${22 + r() * 9}%)` : `hsl(${132 + r() * 10}, 28%, ${11 + r() * 5}%)`);
    ctx.fillStyle = g;
    ctx.fill();
  }
}

function paintSpruce(ctx: CanvasRenderingContext2D, ox: number, r: () => number) {
  const W = TEX_W;
  const H = TEX_H;
  const cx = ox + W * 0.5;
  const top = H * (0.012 + r() * 0.02);
  const foot = H * (0.86 + r() * 0.04);
  ctx.fillStyle = "#281c14";
  ctx.fillRect(cx - W * 0.022, H * 0.74, W * 0.044, H * 0.26);
  const tiers = 15 + Math.floor(r() * 6);
  for (let k = tiers - 1; k >= 0; k--) {
    const t = k / (tiers - 1);
    const y0 = top + (foot - top) * Math.max(0, t - 0.1);
    const y1 = top + (foot - top) * Math.min(1, t + 0.02);
    const half = W * 0.47 * Math.pow(t, 0.9) * (0.8 + r() * 0.32) + W * 0.025;
    paintTier(ctx, cx, y0, y1, half, r);
  }
  // needles: short strokes where there is foliage
  const data = ctx.getImageData(ox, 0, W, H).data;
  for (let i = 0; i < 1600; i++) {
    const x = Math.floor(r() * W);
    const y = Math.floor(r() * H * 0.9);
    if (data[(y * W + x) * 4 + 3] < 200) continue;
    const left = x < W * 0.5;
    const l = left ? 18 + r() * 16 : 8 + r() * 9;
    ctx.strokeStyle = `hsla(${left ? 90 + r() * 25 : 130 + r() * 15}, 32%, ${l}%, 0.85)`;
    ctx.lineWidth = 1 + r();
    const dir = x < W * 0.5 ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(ox + x, y);
    ctx.lineTo(ox + x + dir * (2 + r() * 4), y + 1 + r() * 3);
    ctx.stroke();
  }
}

function spruceAtlas() {
  const canvas = document.createElement("canvas");
  canvas.width = TEX_W * VARIANTS;
  canvas.height = TEX_H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  for (let v = 0; v < VARIANTS; v++) paintSpruce(ctx, v * TEX_W, rng(101 + v * 37));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Two crossed cards of unit height. Normals lean up and towards the viewer so every tree is lit evenly. */
function crossGeometry() {
  const a = new THREE.PlaneGeometry(TEX_W / TEX_H, 1).translate(0, 0.5, 0);
  const b = a.clone().rotateY(Math.PI / 2);
  const g = mergeGeometries([a, b]);
  a.dispose();
  b.dispose();
  const n = g.getAttribute("normal") as THREE.BufferAttribute;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 0.86, 0.51);
  return g;
}

/* ---------------------------------------------------------------- wind */

/** Wind: the tops sway a little, each plant with its own phase. Optionally picks a column of a texture atlas per instance. */
export function addWind(material: THREE.Material, strength: number, uniforms: { uTime: { value: number } }, atlasColumns = 0) {
  // the numbers are baked into the shader text, so give each combination its own program
  material.customProgramCacheKey = () => `wind-${strength}-${atlasColumns}`;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    let vs = shader.vertexShader
      .replace("#include <common>", `#include <common>\nuniform float uTime;${atlasColumns ? "\nattribute float aVariant;" : ""}`)
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec2 seed = instanceMatrix[3].xz;
        #else
          vec2 seed = vec2(0.0);
        #endif
        float gust = sin(uTime * 1.1 + seed.x * 0.31 + seed.y * 0.17) * 0.65 + sin(uTime * 2.3 + seed.x * 0.9) * 0.35;
        float bend = position.y * position.y * ${strength.toFixed(3)};
        transformed.x += gust * bend;
        transformed.z += gust * bend * 0.45;`,
      );
    if (atlasColumns)
      vs = vs.replace("#include <uv_vertex>", `#include <uv_vertex>\n#ifdef USE_MAP\n  vMapUv.x = (vMapUv.x + aVariant) / ${atlasColumns.toFixed(1)};\n#endif`);
    shader.vertexShader = vs;
  };
}

/* ---------------------------------------------------------------- placement */

interface Placement {
  x: number;
  y: number;
  z: number;
  s: number;
  rot: number;
  variant: number;
  tint: number;
}

function placeTrees(count: number): Placement[] {
  const r = rng(2024);
  const list: Placement[] = [];
  const n = new THREE.Vector3();
  let tries = 0;
  while (list.length < count && tries < count * 40) {
    tries++;
    const x = -160 + r() * 320;
    const z = -130 + r() * 80;
    const d = lakeDistance(x, z);
    if (d < 1.32) continue;
    const h = heightAt(x, z);
    if (h < 0.3 || h > 16) continue;
    normalAt(x, z, 0.8, n);
    if (n.y < 0.72) continue;
    // forest in clumps, thinning towards the meadow by the water
    const clump = fbm(x * 0.045 + 11, z * 0.045 - 4, 3);
    const deep = THREE.MathUtils.smoothstep(d, 1.32, 1.9);
    if (clump + 0.35 < r() * 0.95 * (2 - deep)) continue;
    const s = (2.6 + r() * r() * 5.2) * (0.75 + 0.35 * deep);
    list.push({ x, y: h - 0.1, z, s, rot: (r() - 0.5) * 0.5, variant: Math.floor(r() * VARIANTS), tint: r() });
  }
  return list;
}

/** Tall spruces standing on both banks, framing the stag. */
function heroTrees(): Placement[] {
  const spots: [number, -1 | 1, number, number][] = [
    [-9, 1, 1.2, 15],
    [-12.5, 1, 1.32, 11],
    [-21, 1, 1.18, 13],
    [-12, -1, 1.45, 14],
    [-22, -1, 1.52, 11],
    [-27, 1, 1.26, 12],
  ];
  return spots.map(([z0, side, k, s], i) => {
    const [x, z] = shorePoint(z0, side, k);
    return { x, y: heightAt(x, z) - 0.2, z, s, rot: (i % 3) * 0.12 - 0.12, variant: i % VARIANTS, tint: 0.35 + 0.08 * i };
  });
}

/* ---------------------------------------------------------------- component */

export default function Forest({ quality }: { quality: "high" | "low" }) {
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  const texture = useMemo(() => spruceAtlas(), []);
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      map: texture,
      alphaTest: 0.45,
      alphaToCoverage: true,
      roughness: 0.95,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    addWind(m, 0.04, uniforms, VARIANTS);
    return m;
  }, [texture, uniforms]);

  const mesh = useMemo(() => {
    const trees = [...heroTrees(), ...placeTrees(quality === "high" ? 3400 : 1400)];
    const geometry = crossGeometry();
    geometry.setAttribute("aVariant", new THREE.InstancedBufferAttribute(new Float32Array(trees.map((t) => t.variant)), 1));
    const im = new THREE.InstancedMesh(geometry, material, trees.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const c = new THREE.Color();
    trees.forEach((t, i) => {
      q.setFromAxisAngle(up, t.rot);
      const w = t.s * (0.85 + t.tint * 0.3);
      m.compose(new THREE.Vector3(t.x, t.y, t.z), q, new THREE.Vector3(w, t.s, w));
      im.setMatrixAt(i, m);
      c.setRGB(0.86 + 0.26 * t.tint, 0.92 + 0.14 * t.tint, 0.84 + 0.16 * (1 - t.tint));
      im.setColorAt(i, c);
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.frustumCulled = false;
    return im;
  }, [material, quality]);

  useEffect(() => () => {
    mesh.geometry.dispose();
    mesh.dispose();
  }, [mesh]);
  useEffect(() => () => {
    material.dispose();
    texture.dispose();
  }, [material, texture]);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
  });

  return <primitive object={mesh} />;
}

"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { addWind } from "./Forest";
import { LAKE, heightAt, lakeDistance, shorePoint } from "./landscape";
import { noise2, rng } from "./noise";

/** A rounded boulder with moss on top. */
function rockGeometry(seed: number) {
  const g = new THREE.IcosahedronGeometry(1, 3);
  const pos = g.getAttribute("position") as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const k = 1 + 0.16 * noise2(v.x * 1.3 + seed, v.z * 1.3 + v.y * 0.7) + 0.06 * noise2(v.x * 3.1 - seed, v.y * 3.1);
    v.multiplyScalar(k);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  const normals = g.getAttribute("normal") as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const stone = new THREE.Color("#77736d");
  const light = new THREE.Color("#9a958d");
  const moss = new THREE.Color("#56663a");
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const n = noise2(pos.getX(i) * 2.2 + seed, pos.getZ(i) * 2.2) * 0.5 + 0.5;
    c.copy(stone).lerp(light, n * 0.7);
    c.lerp(moss, THREE.MathUtils.smoothstep(normals.getY(i), 0.55, 0.9) * 0.55);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return g;
}

/** A tuft of grass blades, dark at the root and sunlit at the tips. */
function tuftGeometry() {
  const r = rng(99);
  const blades: THREE.BufferGeometry[] = [];
  const root = new THREE.Color("#25401a");
  const tip = new THREE.Color("#8fae45");
  for (let i = 0; i < 9; i++) {
    const h = 0.55 + r() * 0.6;
    const w = 0.03 + r() * 0.025;
    const lean = 0.08 + r() * 0.22;
    const a = r() * Math.PI * 2;
    const g = new THREE.BufferGeometry();
    // two segments so the blade can bend
    const verts = new Float32Array([-w, 0, 0, w, 0, 0, -w * 0.6, h * 0.55, lean * 0.4, w * 0.6, h * 0.55, lean * 0.4, 0, h, lean]);
    g.setAttribute("position", new THREE.BufferAttribute(verts, 3));
    g.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
    const cols = new Float32Array(15);
    [0, 0, 0.55, 0.55, 1].forEach((t, k) => {
      const c = root.clone().lerp(tip, t * (0.75 + r() * 0.25));
      cols.set([c.r, c.g, c.b], k * 3);
    });
    g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    g.rotateY(a);
    g.translate((r() - 0.5) * 0.25, 0, (r() - 0.5) * 0.25);
    g.computeVertexNormals();
    blades.push(g);
  }
  const merged = mergeGeometries(blades);
  blades.forEach((b) => b.dispose());
  return merged;
}

interface Spot {
  x: number;
  y: number;
  z: number;
  s: number;
  rot: number;
}

/** Points around the shoreline (d = distance in lake radii, 1 = water's edge). */
function shoreSpots(count: number, dMin: number, dMax: number, seed: number, minH: number, maxH: number): Spot[] {
  const r = rng(seed);
  const out: Spot[] = [];
  let tries = 0;
  while (out.length < count && tries < count * 60) {
    tries++;
    const a = r() * Math.PI * 2;
    const k = dMin + r() * (dMax - dMin);
    const x = LAKE.cx + Math.sin(a) * LAKE.rx * k * 1.05;
    const z = LAKE.cz - Math.cos(a) * LAKE.rz * k * 1.05;
    const d = lakeDistance(x, z);
    if (d < dMin || d > dMax) continue;
    const h = heightAt(x, z);
    if (h < minH || h > maxH) continue;
    out.push({ x, y: h, z, s: r(), rot: r() * Math.PI * 2 });
  }
  return out;
}

export default function Shore({ quality }: { quality: "high" | "low" }) {
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  const rocks = useMemo(() => {
    const geometry = rockGeometry(3.7);
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0 });
    const spots = shoreSpots(quality === "high" ? 46 : 24, 0.9, 1.16, 11, -0.9, 0.9);
    // a few big boulders on the banks near the stag
    const r = rng(77);
    for (const [z0, side, k] of [[-6, 1, 1.0], [-8.5, 1, 1.04], [-4, 1, 1.07], [-11, -1, 1.0], [-14, -1, 1.05], [-3, -1, 1.06]] as [number, -1 | 1, number][]) {
      const [x, z] = shorePoint(z0, side, k);
      spots.push({ x, y: heightAt(x, z), z, s: 0.75 + r() * 0.25, rot: r() * Math.PI });
    }
    const im = new THREE.InstancedMesh(geometry, material, spots.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    spots.forEach((p, i) => {
      const size = 0.3 + p.s * p.s * 1.3;
      q.setFromEuler(new THREE.Euler(p.s * 0.4, p.rot, p.s * 0.2));
      m.compose(new THREE.Vector3(p.x, p.y - size * 0.25, p.z), q, new THREE.Vector3(size * 1.3, size * 0.62, size));
      im.setMatrixAt(i, m);
    });
    im.instanceMatrix.needsUpdate = true;
    return im;
  }, [quality]);

  const grass = useMemo(() => {
    const geometry = tuftGeometry();
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, side: THREE.DoubleSide });
    addWind(material, 0.16, uniforms);
    const spots = [
      ...shoreSpots(quality === "high" ? 1300 : 500, 0.97, 1.22, 5, 0.02, 1.2),
      ...shoreSpots(quality === "high" ? 700 : 250, 1.22, 1.9, 6, 0.1, 2.5),
    ];
    const im = new THREE.InstancedMesh(geometry, material, spots.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const c = new THREE.Color();
    spots.forEach((p, i) => {
      const size = 0.22 + p.s * 0.3;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.rot);
      m.compose(new THREE.Vector3(p.x, p.y - 0.03, p.z), q, new THREE.Vector3(size * 1.6, size * (0.8 + p.s * 0.5), size * 1.6));
      im.setMatrixAt(i, m);
      c.setRGB(0.85 + 0.25 * p.s, 0.92 + 0.12 * p.s, 0.75 + 0.2 * (1 - p.s));
      im.setColorAt(i, c);
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.frustumCulled = false;
    return im;
  }, [quality, uniforms]);

  const flowers = useMemo(() => {
    const geometry = new THREE.IcosahedronGeometry(0.05, 1);
    const material = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0 });
    const spots = shoreSpots(quality === "high" ? 160 : 60, 1.0, 1.6, 8, 0.05, 1.5);
    const im = new THREE.InstancedMesh(geometry, material, spots.length);
    const m = new THREE.Matrix4();
    const palette = ["#ffffff", "#fff3b0", "#d9c8ff", "#f6f0ff"].map((h) => new THREE.Color(h));
    spots.forEach((p, i) => {
      const k = 0.45 + p.s * 0.5;
      m.compose(new THREE.Vector3(p.x, p.y + 0.16 + p.s * 0.16, p.z), new THREE.Quaternion(), new THREE.Vector3(k, k * 0.6, k));
      im.setMatrixAt(i, m);
      im.setColorAt(i, palette[i % palette.length]);
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    return im;
  }, [quality]);

  useEffect(() => () => {
    for (const im of [rocks, grass, flowers]) {
      im.geometry.dispose();
      (im.material as THREE.Material).dispose();
      im.dispose();
    }
  }, [rocks, grass, flowers]);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <group>
      <primitive object={rocks} />
      <primitive object={grass} />
      <primitive object={flowers} />
    </group>
  );
}

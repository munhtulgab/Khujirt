"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SUMMITS, axis, colorAt, heightAt } from "./landscape";
import { hover, peakLabelEls, story } from "./story";

function buildTerrain(quality: "high" | "low") {
  const k = quality === "high" ? 1 : 2;
  const xs = axis(-215, 215, -72, 72, 0.8 * k, 2.4 * k);
  const zs = axis(34, -214, 34, -64, 0.8 * k, 1.25 * k);
  const nx = xs.length;
  const nz = zs.length;
  const positions = new Float32Array(nx * nz * 3);
  let p = 0;
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const x = xs[i];
      const z = zs[j];
      positions[p++] = x;
      positions[p++] = heightAt(x, z);
      positions[p++] = z;
    }
  const index = new Uint32Array((nx - 1) * (nz - 1) * 6);
  let q = 0;
  for (let j = 0; j < nz - 1; j++)
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i;
      const b = a + 1;
      const c = a + nx;
      const d = c + 1;
      // counter-clockwise seen from above, so the surface faces the sky
      index[q++] = a;
      index[q++] = b;
      index[q++] = c;
      index[q++] = b;
      index[q++] = d;
      index[q++] = c;
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  geometry.computeVertexNormals();

  const normals = geometry.getAttribute("normal") as THREE.BufferAttribute;
  const colors = new Float32Array(nx * nz * 3);
  const c = new THREE.Color();
  for (let v = 0; v < nx * nz; v++) {
    colorAt(positions[v * 3], positions[v * 3 + 2], positions[v * 3 + 1], normals.getY(v), c);
    colors[v * 3] = c.r;
    colors[v * 3 + 1] = c.g;
    colors[v * 3 + 2] = c.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();
  return geometry;
}

/** Meadow, lake bed, forested slopes and the snowy ridge, plus the summit labels. */
export default function Terrain({ quality }: { quality: "high" | "low" }) {
  const geometry = useMemo(() => buildTerrain(quality), [quality]);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 }),
    [],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  const v = useMemo(() => new THREE.Vector3(), []);
  // Summit names live in a DOM overlay (see Experience); project each summit to the screen.
  useFrame(({ camera, size }) => {
    const focus = hover.peak;
    for (const s of SUMMITS) {
      const el = peakLabelEls[s.id];
      if (!el) continue;
      let on = Math.max(story.peaks, focus === s.id ? 1 : 0);
      if (focus && focus !== s.id) on *= 0.35;
      el.style.opacity = on.toFixed(2);
      const active = focus === s.id ? "true" : "false";
      if (el.dataset.active !== active) el.dataset.active = active;
      if (on < 0.01) continue;
      v.set(s.x, s.h + 4, s.z).project(camera);
      el.style.transform = `translate3d(${((v.x * 0.5 + 0.5) * size.width).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * size.height).toFixed(1)}px, 0) translate(-50%, -100%)`;
      el.style.visibility = v.z < 1 ? "visible" : "hidden";
    }
  });

  return <mesh geometry={geometry} material={material} renderOrder={-2} />;
}

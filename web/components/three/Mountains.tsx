"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { PeakId } from "@/lib/i18n";
import { hover, peakLabelEls, story } from "./story";

interface Peak {
  id: PeakId;
  x: number;
  h: number;
  w: number;
}

/** The three sacred mountains, on the middle ridge. */
const PEAKS: Peak[] = [
  { id: "shunkhlai", x: -17, h: 10.5, w: 7 },
  { id: "gua", x: 1, h: 13, w: 8 },
  { id: "shiveet", x: 18, h: 10, w: 7 },
];

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/** A ridge silhouette as a flat shape: gentle noise plus a few gaussian peaks. */
function ridgeShape(seed: number, width: number, base: number, roughness: number, peaks: { x: number; h: number; w: number }[]) {
  const r = rng(seed);
  const phases = [r() * 6.28, r() * 6.28, r() * 6.28];
  const shape = new THREE.Shape();
  const steps = 220;
  shape.moveTo(-width / 2, -2);
  for (let i = 0; i <= steps; i++) {
    const x = -width / 2 + (width * i) / steps;
    let y = base;
    y += Math.sin(x * 0.11 + phases[0]) * roughness + Math.sin(x * 0.27 + phases[1]) * roughness * 0.5 + Math.sin(x * 0.63 + phases[2]) * roughness * 0.22;
    for (const p of peaks) y = Math.max(y, base + (p.h - base) * Math.exp(-((x - p.x) ** 2) / (2 * p.w * p.w)) + Math.sin(x * 0.9 + p.x) * 0.25);
    shape.lineTo(x, y);
  }
  shape.lineTo(width / 2, -2);
  shape.lineTo(-width / 2, -2);
  return shape;
}

/** Snow cap that hugs the top of a peak. */
function snowShape(p: Peak, base: number) {
  const shape = new THREE.Shape();
  const span = p.w * 0.9;
  const cut = p.h - (p.h - base) * 0.22;
  const top = (x: number) => base + (p.h - base) * Math.exp(-((x - p.x) ** 2) / (2 * p.w * p.w));
  shape.moveTo(p.x - span, Math.min(top(p.x - span), cut));
  for (let i = 0; i <= 40; i++) {
    const x = p.x - span + (2 * span * i) / 40;
    shape.lineTo(x, top(x) + 0.02);
  }
  for (let i = 40; i >= 0; i--) {
    const x = p.x - span + (2 * span * i) / 40;
    const jag = Math.sin(x * 3.1) * 0.35 + Math.sin(x * 7.3) * 0.18;
    shape.lineTo(x, Math.min(top(x), cut + jag));
  }
  return shape;
}

function basic(color: string) {
  return new THREE.MeshBasicMaterial({ color, toneMapped: false, fog: true });
}

const MID_Z = -42;
const BASE_Y = -1;

export default function Mountains() {
  const layers = useMemo(() => {
    const far = new THREE.ShapeGeometry(ridgeShape(3, 220, 7, 2.2, [{ x: -40, h: 13, w: 9 }, { x: 34, h: 12, w: 10 }]));
    const mid = new THREE.ShapeGeometry(ridgeShape(11, 160, 4.5, 1.2, PEAKS));
    const near = new THREE.ShapeGeometry(ridgeShape(23, 140, 2.2, 0.9, [{ x: -30, h: 5, w: 6 }, { x: 28, h: 4.6, w: 6 }]));
    const snow = PEAKS.map((p) => new THREE.ShapeGeometry(snowShape(p, 4.5)));
    return { far, mid, near, snow };
  }, []);
  const mats = useMemo(
    () => ({ far: basic("#a8cbe6"), mid: basic("#5d97c8"), near: basic("#3f7bb2"), snow: basic("#f7fbff") }),
    [],
  );
  const v = useMemo(() => new THREE.Vector3(), []);

  // Peak names live in a DOM overlay (see Experience); project each summit to the screen every frame.
  useFrame(({ camera, size }) => {
    const focus = hover.peak;
    for (const p of PEAKS) {
      const el = peakLabelEls[p.id];
      if (!el) continue;
      let on = Math.max(story.peaks, focus === p.id ? 1 : 0);
      if (focus && focus !== p.id) on *= 0.35;
      el.style.opacity = on.toFixed(2);
      const active = focus === p.id ? "true" : "false";
      if (el.dataset.active !== active) el.dataset.active = active;
      if (on < 0.01) continue;
      v.set(p.x, BASE_Y + p.h + 1.5, MID_Z).project(camera);
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
      el.style.visibility = v.z < 1 ? "visible" : "hidden";
    }
  });

  return (
    <group>
      <mesh geometry={layers.far} material={mats.far} position={[0, -1, -70]} renderOrder={-5} />
      <group position={[0, BASE_Y, MID_Z]}>
        <mesh geometry={layers.mid} material={mats.mid} renderOrder={-4} />
        {layers.snow.map((g, i) => (
          <mesh key={i} geometry={g} material={mats.snow} position-z={0.05} renderOrder={-3} />
        ))}
      </group>
      <mesh geometry={layers.near} material={mats.near} position={[0, -1, -26]} renderOrder={-2} />
    </group>
  );
}

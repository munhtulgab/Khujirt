import * as THREE from "three";
import type { PeakId } from "@/lib/i18n";
import { fbm, noise2, ridged, smoothstep } from "./noise";

/**
 * The valley of the legend as one height function, in the middle month of autumn: warm shallows in
 * a meadow of golden grass, slopes of larch and spruce rising on both sides and, behind, the snowy
 * ridge: Gua in the middle, Shiveet to the east and, on Gua's western shoulder, the rocky crag of
 * Shunkhlai, named after the hunter of the legend.
 * Everything that sits on the ground (trees, rocks, grass, the summit labels) samples it.
 */

export const LAKE = { cx: 2, cz: -16, rx: 15, rz: 25 };

/** The three mountains of the legend, on the far ridge (x, z, peak height, spread, crags). */
export const NAMED_PEAKS: { id: PeakId; x: number; z: number; h: number; s: number; crag: number }[] = [
  // "Гуа уулын баруун сэрвэн хадтай өндөрлөг": the rocky height on Gua's western side
  { id: "shunkhlai", x: -27, z: -138, h: 34, s: 9.5, crag: 1 },
  { id: "gua", x: 4, z: -146, h: 42, s: 15, crag: 0 },
  { id: "shiveet", x: 44, z: -128, h: 34, s: 13, crag: 0 },
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 0 at the lake centre, 1 at the shoreline. */
export function lakeDistance(x: number, z: number) {
  const dx = (x - LAKE.cx) / LAKE.rx;
  const dz = (z - LAKE.cz) / LAKE.rz;
  return Math.hypot(dx, dz) + noise2(x * 0.08 + 3.1, z * 0.08 - 1.7) * 0.12 + noise2(x * 0.3, z * 0.3) * 0.03;
}

/** Centre line of the valley. */
const valleyX = (z: number) => 2 + 9 * Math.sin(z * 0.017 + 0.6);

export function heightAt(x: number, z: number): number {
  // meadow and lake bed
  const d = lakeDistance(x, z);
  const land = smoothstep(0.94, 1.28, d);
  const meadow = 0.24 + 0.32 * (fbm(x * 0.05, z * 0.05, 3) * 0.5 + 0.5) + Math.max(0, -z - 46) * 0.035;
  let h = lerp(-1.3, meadow, land);

  // forested walls of the valley
  const halfW = 24 + Math.max(0, -z) * 0.12;
  const s = Math.max(0, Math.abs(x - valleyX(z)) - halfW);
  if (s > 0) {
    const wall = Math.pow(s, 1.22) * 0.36 * (0.75 + 0.5 * (fbm(x * 0.025, z * 0.025, 3) * 0.5 + 0.5));
    h += wall * smoothstep(30, 5, z);
  }

  // the snowy ridge
  const m = smoothstep(-76, -120, z) * smoothstep(-212, -180, z);
  if (m > 0) {
    const r = ridged(x * 0.012 + 4.0, z * 0.012, 5);
    let mount = 5 + r * 20;
    for (const p of NAMED_PEAKS) {
      const dx = x - p.x;
      const dz = (z - p.z) * 0.85;
      const g = Math.exp(-(dx * dx + dz * dz) / (2 * p.s * p.s));
      // a pointed summit carved by ridges; Shunkhlai is a ragged crest of rock towers
      let peak = p.h * Math.pow(g, 0.85) * (0.72 + 0.4 * ridged(x * 0.028 + p.x, z * 0.028, 4));
      if (p.crag) peak += p.crag * g * (ridged(x * 0.11 + 5.3, z * 0.11 - 2.1, 3) * 7 + ridged(x * 0.24, z * 0.24 + 9, 2) * 2.5 - 3.5);
      mount = Math.max(mount, peak);
    }
    // gullies, crags and ribs on the high slopes
    const rough = smoothstep(6, 18, mount);
    mount += (ridged(x * 0.05, z * 0.05, 3) * 4.5 + ridged(x * 0.12 + 7, z * 0.12, 3) * 2.2 + fbm(x * 0.25, z * 0.25, 2) * 0.8) * rough;
    h = Math.max(h, lerp(h, mount, m));
  }

  // a low saddle on the left where the evening sun sets
  if (z < -40) {
    const a = x / (8.4 - z) + 0.41;
    const gap = Math.exp(-(a * a) / (2 * 0.06 * 0.06)) * smoothstep(-40, -85, z);
    if (gap > 0.01) h = lerp(h, Math.min(h, 3 + h * 0.18), gap * 0.85);
  }
  return h;
}

export function normalAt(x: number, z: number, e = 0.6, out = new THREE.Vector3()) {
  const hx = heightAt(x + e, z) - heightAt(x - e, z);
  const hz = heightAt(x, z + e) - heightAt(x, z - e);
  return out.set(-hx, 2 * e, -hz).normalize();
}

/** A point on land beside the lake at depth z: side −1 = left bank, +1 = right bank. */
export function shorePoint(z: number, side: -1 | 1, k = 1.15): [number, number] {
  const t = (z - LAKE.cz) / (LAKE.rz * k);
  const half = LAKE.rx * k * Math.sqrt(Math.max(0, 1 - t * t));
  return [LAKE.cx + side * half, z];
}

/** Summit positions for the mountain labels. */
export const SUMMITS = NAMED_PEAKS.map((p) => {
  let best = { x: p.x, z: p.z, h: -Infinity };
  for (let dx = -8; dx <= 8; dx += 2)
    for (let dz = -8; dz <= 8; dz += 2) {
      const h = heightAt(p.x + dx, p.z + dz);
      if (h > best.h) best = { x: p.x + dx, z: p.z + dz, h };
    }
  return { id: p.id, ...best };
});

/* ---------------------------------------------------------------- colours */

const C = {
  bed: new THREE.Color("#5f6b55"),
  wet: new THREE.Color("#3c4426"),
  grassA: new THREE.Color("#7a7f38"),
  grassB: new THREE.Color("#b49a4e"),
  forestA: new THREE.Color("#252a1a"),
  forestB: new THREE.Color("#3a3520"),
  rockA: new THREE.Color("#4f5156"),
  rockB: new THREE.Color("#78736d"),
  snow: new THREE.Color("#f3f5f7"),
  haze: new THREE.Color("#8e9db3"),
};
const tmp = new THREE.Color();
const tmp2 = new THREE.Color();

/** Ground colour from height, slope and distance (aerial perspective is baked in). */
export function colorAt(x: number, z: number, h: number, ny: number, out: THREE.Color) {
  const n = fbm(x * 0.09, z * 0.09, 3) * 0.5 + 0.5;
  const n2 = noise2(x * 0.35, z * 0.35) * 0.5 + 0.5;

  if (h < -0.05) {
    out.copy(C.bed).multiplyScalar(0.8 + 0.4 * n2);
  } else {
    // meadow → forest → rock → snow
    out.copy(C.grassA).lerp(C.grassB, smoothstep(0.35, 0.8, n) * 0.8);
    const shore = smoothstep(0.3, 0.0, h);
    out.lerp(C.wet, shore * 0.6);

    const beyond = smoothstep(1.3, 1.65, lakeDistance(x, z) + n * 0.2);
    const forest = Math.max(beyond, smoothstep(1.4, 3.2, h + n * 1.5)) * (1 - smoothstep(12, 17, h + n * 4)) * smoothstep(0.55, 0.75, ny);
    tmp.copy(C.forestA).lerp(C.forestB, n2);
    out.lerp(tmp, forest);

    const rock = Math.max(smoothstep(0.72, 0.5, ny) * smoothstep(1.5, 4, h), smoothstep(13, 19, h + n * 4));
    tmp2.copy(C.rockA).lerp(C.rockB, n2);
    out.lerp(tmp2, rock);

    // snow lies on ledges and in gullies; steep faces stay bare rock
    const snowLine = 21 + n * 7 - (1 - ny) * 3;
    const snow = Math.max(
      smoothstep(snowLine, snowLine + 3, h) * smoothstep(0.42, 0.68, ny),
      smoothstep(33, 39, h) * smoothstep(0.22, 0.45, ny),
    );
    out.lerp(C.snow, snow);
  }

  const dist = Math.hypot(x, z - 8);
  out.lerp(C.haze, smoothstep(50, 220, dist) * 0.32);
  return out;
}

/** Grid coordinates: fine near the lake, coarser at the edges. */
export function axis(from: number, to: number, fineFrom: number, fineTo: number, fine: number, coarse: number) {
  const out: number[] = [];
  let v = from;
  const dir = Math.sign(to - from);
  while ((to - v) * dir > 0) {
    out.push(v);
    const inFine = (v - fineFrom) * (v - fineTo) <= 0;
    v += dir * (inFine ? fine : coarse);
  }
  out.push(to);
  return out;
}

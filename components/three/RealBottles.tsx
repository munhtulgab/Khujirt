"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PRODUCTS, type Packaging } from "@/lib/content";
import { rng } from "./noise";
import { splashes, story } from "./story";

/**
 * The whole Khujirt range, every bottle size, standing in the shallows in front of the stag.
 * Photos are the real product shots from gem.mn, loaded through Next's same-origin image optimizer
 * so WebGL may read them; a light studio background, if present, is cut away in the browser.
 */

/** The smaller PET sizes of Хужирт ус are shown with the 0.86 L bottle shot. */
const SMALL_WATER = "https://cdnp.cody.mn/spree/images/2844882/large/Khujirt_pet__0.860.png";

/** "330 мл" → 330, "1.5 л" → 1500 */
function millilitres(volume: string) {
  const v = volume.trim().toLowerCase();
  const n = parseFloat(v.replace(",", "."));
  return v.endsWith("мл") || v.endsWith("ml") ? n : n * 1000;
}

/** Height in scene units; bottles grow roughly with the cube root of their volume. */
function bottleHeight(packaging: Packaging, ml: number) {
  return (packaging === "glass" ? 0.72 : 0.68) * Math.cbrt(ml / 330);
}

interface Slot {
  key: string;
  src: string;
  height: number;
  x: number;
  z: number;
  delay: number;
}

/** Each product a little family (largest bottle at the back), the families side by side in front of the stag. */
const LINEUP: Slot[] = (() => {
  const families = PRODUCTS.filter((p) => p.volumes.length > 0);
  const slots: Slot[] = [];
  const offsets: Record<number, [number, number][]> = {
    1: [[0, 0]],
    2: [[-0.11, -0.06], [0.15, 0.17]],
    3: [[0, -0.14], [-0.21, 0.15], [0.21, 0.19]],
  };
  families.forEach((p, k) => {
    const sizes = [...p.volumes].sort((a, b) => millilitres(b) - millilitres(a));
    const u = families.length > 1 ? k / (families.length - 1) : 0.5;
    const cx = -0.95 + u * 3.1;
    const cz = 1.15 + Math.sin(u * Math.PI) * 0.45;
    const place = offsets[Math.min(3, sizes.length)] ?? offsets[3];
    sizes.slice(0, 3).forEach((v, j) => {
      const ml = millilitres(v);
      const [dx, dz] = place[j];
      slots.push({
        key: `${p.slug}-${ml}`,
        src: p.slug === "khujirt" && ml < 1000 ? SMALL_WATER : p.image,
        height: bottleHeight(p.packaging, ml),
        x: cx + dx,
        z: cz + dz,
        delay: u * 0.22 + j * 0.03,
      });
    });
  });
  return slots;
})();

function optimized(src: string) {
  return `/_next/image?url=${encodeURIComponent(src)}&w=828&q=75`;
}

/**
 * Make a light studio background transparent. Each row's silhouette (pixels clearly different from
 * the background) is kept whole, and rows where a white label reaches the outline borrow the
 * silhouette of the rows above and below, so labels are not mistaken for background.
 */
function cutOutBackground(img: ImageData) {
  const { width: w, height: h, data } = img;
  const at = (x: number, y: number) => (y * w + x) * 4;
  // already transparent around the edges? keep it as it is
  const corners = [at(0, 0), at(w - 1, 0), at(0, h - 1), at(w - 1, h - 1)];
  if (corners.filter((i) => data[i + 3] < 16).length >= 3) return;

  // background colour from the border
  let br = 0, bg = 0, bb = 0, n = 0;
  for (let x = 0; x < w; x += 3)
    for (const y of [0, h - 1]) {
      const i = at(x, y);
      br += data[i]; bg += data[i + 1]; bb += data[i + 2]; n++;
    }
  br /= n; bg /= n; bb /= n;
  if (Math.min(br, bg, bb) < 200) return; // not a light studio background; leave the photo alone
  const diff = (i: number) => Math.max(Math.abs(data[i] - br), Math.abs(data[i + 1] - bg), Math.abs(data[i + 2] - bb));

  // silhouette span of every row
  const L = new Int32Array(h).fill(-1);
  const R = new Int32Array(h).fill(-1);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) if (diff(at(x, y)) > 36) { L[y] = x; break; }
    if (L[y] >= 0) for (let x = w - 1; x >= 0; x--) if (diff(at(x, y)) > 36) { R[y] = x; break; }
  }
  const width = (y: number) => (L[y] >= 0 ? R[y] - L[y] : 0);
  const EL = Int32Array.from(L);
  const ER = Int32Array.from(R);
  const K = Math.max(6, Math.round(h * 0.32));
  for (let y = 0; y < h; y++) {
    let ya = -1;
    let yb = -1;
    for (let k = 1; k <= K && (ya < 0 || yb < 0); k++) {
      if (ya < 0 && y - k >= 0 && width(y - k) > 4) ya = y - k;
      if (yb < 0 && y + k < h && width(y + k) > 4) yb = y + k;
    }
    if (ya < 0 || yb < 0) continue;
    if (width(y) < 0.8 * Math.min(width(ya), width(yb))) {
      EL[y] = Math.min(L[ya], L[yb]);
      ER[y] = Math.max(R[ya], R[yb]);
    }
  }

  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (EL[y] >= 0 && x >= EL[y] && x <= ER[y]) continue; // inside the bottle
      const i = at(x, y);
      // outside: background fades out, anti-aliased edges keep a soft, un-mixed fringe
      const a = Math.min(1, Math.max(0, (diff(i) - 10) / 40));
      if (a <= 0.01) {
        data[i + 3] = 0;
        continue;
      }
      data[i] = Math.min(255, Math.max(0, (data[i] - (1 - a) * br) / a));
      data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - (1 - a) * bg) / a));
      data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - (1 - a) * bb) / a));
      data[i + 3] = Math.round(a * data[i + 3]);
    }
}

interface Photo {
  texture: THREE.CanvasTexture;
  aspect: number;
}

async function loadPhoto(src: string): Promise<Photo | null> {
  const img = new Image();
  img.decoding = "async";
  img.src = optimized(src);
  try {
    await img.decode();
  } catch {
    return null;
  }
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) return null;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h);
  cutOutBackground(data);
  ctx.putImageData(data, 0, 0);

  // crop to the bottle
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (data.data[(y * w + x) * 4 + 3] > 24) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) return null;
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;
  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  out.getContext("2d")!.drawImage(canvas, x0, y0, cw, ch, 0, 0, cw, ch);
  const texture = new THREE.CanvasTexture(out);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return { texture, aspect: cw / ch };
}

export default function RealBottles() {
  const [photos, setPhotos] = useState<Record<string, Photo | null>>({});
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), []);
  const ringClock = useMemo(() => ({ next: 0, r: rng(17) }), []);

  // each photo once, however many sizes use it
  useEffect(() => {
    let alive = true;
    const loaded: Photo[] = [];
    for (const src of new Set(LINEUP.map((b) => b.src)))
      loadPhoto(src).then((p) => {
        if (!alive) return p?.texture.dispose();
        if (p) loaded.push(p);
        setPhotos((prev) => ({ ...prev, [src]: p }));
      });
    return () => {
      alive = false;
      loaded.forEach((p) => p.texture.dispose());
    };
  }, []);

  const materials = useMemo(() => {
    const out: Record<string, THREE.MeshBasicMaterial> = {};
    for (const [src, p] of Object.entries(photos))
      if (p)
        out[src] = new THREE.MeshBasicMaterial({
          map: p.texture,
          alphaTest: 0.35,
          alphaToCoverage: true,
          toneMapped: false,
          fog: false,
          side: THREE.DoubleSide,
          color: new THREE.Color("#fff7ee"),
        });
    return out;
  }, [photos]);
  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const cam = state.camera.position;
    let shown = 0;
    LINEUP.forEach((slot, i) => {
      const mesh = meshes.current[i];
      if (!mesh) return;
      // they slip under the surface one after another when the story moves on, and rise again
      const b = THREE.MathUtils.smoothstep(story.bottle, slot.delay, slot.delay + 0.75);
      mesh.visible = b > 0.01;
      if (!mesh.visible) return;
      shown++;
      mesh.position.set(slot.x, -0.06 + Math.sin(t * 0.8 + i) * 0.006 - (1 - b) * (slot.height + 0.3), slot.z);
      mesh.rotation.set(0, Math.atan2(cam.x - slot.x, cam.z - slot.z), Math.sin(t * 0.6 + i * 1.7) * 0.01);
    });
    // now and then a ring spreads from the foot of a bottle
    if (shown > 0 && t > ringClock.next) {
      const slot = LINEUP[Math.floor(ringClock.r() * LINEUP.length)];
      splashes.push({ x: slot.x, z: slot.z, t });
      ringClock.next = t + 0.6 + ringClock.r() * 1.1;
    }
  });

  return (
    <group>
      {LINEUP.map((slot, i) => {
        const photo = photos[slot.src];
        const material = materials[slot.src];
        if (!photo || !material) return null;
        return (
          <mesh
            key={slot.key}
            ref={(el) => {
              meshes.current[i] = el;
            }}
            geometry={geometry}
            material={material}
            scale={[slot.height * photo.aspect, slot.height, 1]}
            renderOrder={1}
          />
        );
      })}
    </group>
  );
}

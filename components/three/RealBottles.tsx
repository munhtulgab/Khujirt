"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PRODUCTS } from "@/lib/content";
import { BOTTLE_POSITION, story } from "./story";

/**
 * The real Khujirt bottles (product photos from gem.mn) standing in the shallows next to the stag.
 * Photos come through Next's same-origin image optimizer so WebGL may read them; a white studio
 * background, if there is one, is cut away in the browser before the photo becomes a texture.
 */

const SHOWN: { slug: string; dx: number; dz: number; height: number }[] = [
  { slug: "khujirt-shil", dx: 0, dz: 0, height: 2.1 },
  { slug: "khujirt", dx: -0.72, dz: -0.75, height: 2.25 },
];

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

async function loadBottle(src: string): Promise<{ texture: THREE.CanvasTexture; aspect: number } | null> {
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

function Bottle({ src, dx, dz, height }: { src: string; dx: number; dz: number; height: number }) {
  const [photo, setPhoto] = useState<{ texture: THREE.CanvasTexture; aspect: number } | null>(null);
  const ref = useRef<THREE.Mesh>(null);
  const base = useMemo(() => new THREE.Vector3(BOTTLE_POSITION[0] + dx, 0, BOTTLE_POSITION[2] + dz), [dx, dz]);

  useEffect(() => {
    let alive = true;
    loadBottle(src).then((p) => {
      if (alive) setPhoto(p);
      else p?.texture.dispose();
    });
    return () => {
      alive = false;
    };
  }, [src]);
  useEffect(() => () => photo?.texture.dispose(), [photo]);

  const material = useMemo(
    () =>
      photo
        ? new THREE.MeshBasicMaterial({
            map: photo.texture,
            alphaTest: 0.35,
            alphaToCoverage: true,
            toneMapped: false,
            fog: false,
            side: THREE.DoubleSide,
            color: new THREE.Color("#fff7ee"),
          })
        : null,
    [photo],
  );
  useEffect(() => () => material?.dispose(), [material]);

  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    const b = THREE.MathUtils.clamp(story.bottle, 0, 1);
    // standing in the shallows; it slips under the surface when the story moves on
    mesh.position.set(base.x, height / 2 - 0.12 + Math.sin(t * 0.8 + dx) * 0.012 - (1 - b) * (height + 0.4), base.z);
    // always turned to the viewer
    mesh.rotation.set(0, Math.atan2(state.camera.position.x - base.x, state.camera.position.z - base.z), Math.sin(t * 0.6 + dz) * 0.008);
    mesh.visible = b > 0.01;
  });

  if (!photo || !material) return null;
  return (
    <mesh ref={ref} material={material} renderOrder={1}>
      <planeGeometry args={[height * photo.aspect, height]} />
    </mesh>
  );
}

export default function RealBottles() {
  const bottles = SHOWN.map((s) => {
    const product = PRODUCTS.find((p) => p.slug === s.slug);
    return product ? { ...s, src: product.image } : null;
  }).filter((b): b is (typeof SHOWN)[number] & { src: string } => b !== null);
  return (
    <group>
      {bottles.map((b) => (
        <Bottle key={b.slug} src={b.src} dx={b.dx} dz={b.dz} height={b.height} />
      ))}
    </group>
  );
}

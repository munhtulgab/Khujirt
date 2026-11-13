"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PRODUCTS, type Packaging, type ProductCategory } from "@/lib/content";
import { analyzeBottle, type BottleShape } from "./bottleShape";
import { buildBottle, type BottleModel } from "./bottleModel";
import { rng } from "./noise";
import { splashes, story } from "./story";

/**
 * The whole Khujirt range, every bottle size, standing in the warm shallows in front of the stag —
 * as real 3D bottles. Each one is built from its own product photo: the outline gives the shape
 * of the glass or PET, and the printed label and cap are taken from the photo and wrapped on.
 */

/** Photos of the glass bottles (supplied by Khujirt). */
const GLASS_PHOTOS: Record<string, string> = {
  "khujirt-shil": "/bottles/khujirt-glass-natural.webp",
  "khujirt-tsangis": "/bottles/khujirt-glass-cranberry.webp",
  "khuijrt-sparkling": "/bottles/khujirt-glass-sparkling.webp",
};
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
  return (packaging === "glass" ? 0.74 : 0.7) * Math.cbrt(ml / 330);
}

interface Source {
  src: string;
  kind: "glass" | "pet";
  emboss: boolean;
  bubbles: boolean;
}

interface Slot {
  key: string;
  source: Source;
  height: number;
  x: number;
  z: number;
  delay: number;
  /** how far the bottle stays turned from the camera, so its roundness shows */
  turn: number;
}

const sparkling = (c: ProductCategory) => c === "sparkling";

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
      const glass = p.packaging === "glass";
      const src = glass ? GLASS_PHOTOS[p.slug] ?? p.image : p.slug === "khujirt" && ml < 1000 ? SMALL_WATER : p.image;
      const [dx, dz] = place[j];
      slots.push({
        key: `${p.slug}-${ml}`,
        source: { src, kind: glass ? "glass" : "pet", emboss: glass, bubbles: sparkling(p.category) },
        height: bottleHeight(p.packaging, ml),
        x: cx + dx,
        z: cz + dz,
        delay: u * 0.22 + j * 0.03,
        turn: ((k + j) % 2 ? 1 : -1) * (0.22 + 0.1 * ((k * 3 + j) % 3)),
      });
    });
  });
  return slots;
})();

/** Remote photos go through Next's image optimizer: same origin, so WebGL may read the pixels. */
function photoUrl(src: string) {
  return src.startsWith("/") ? src : `/_next/image?url=${encodeURIComponent(src)}&w=828&q=80`;
}

async function loadShape(src: string): Promise<BottleShape | null> {
  const img = new Image();
  img.decoding = "async";
  img.src = photoUrl(src);
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
  return analyzeBottle(data.data, w, h);
}

/** A copy of a built bottle that shares its geometry and materials. */
function instance(model: BottleModel) {
  const copy = model.group.clone(true);
  const from: THREE.Object3D[] = [];
  const to: THREE.Object3D[] = [];
  model.group.traverse((o) => from.push(o));
  copy.traverse((o) => to.push(o));
  from.forEach((o, i) => {
    if (o.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender) to[i].onBeforeRender = o.onBeforeRender;
  });
  return copy;
}

export default function Bottles3D() {
  const [models, setModels] = useState<Record<string, BottleModel | null>>({});
  const groups = useRef<(THREE.Group | null)[]>([]);
  const ringClock = useMemo(() => ({ next: 0, r: rng(17) }), []);

  // each photo once, however many sizes use it; one at a time, so the page stays responsive
  useEffect(() => {
    let alive = true;
    const built: BottleModel[] = [];
    const sources = new Map<string, Source>();
    for (const s of LINEUP) sources.set(s.source.src, s.source);
    (async () => {
      for (const source of sources.values()) {
        const shape = await loadShape(source.src);
        if (!alive) return;
        const model = shape ? buildBottle(shape, source) : null;
        if (model) built.push(model);
        setModels((prev) => ({ ...prev, [source.src]: model }));
        await new Promise((r) => setTimeout(r, 40));
      }
    })();
    return () => {
      alive = false;
      built.forEach((m) => m.dispose());
    };
  }, []);

  const instances = useMemo(
    () => LINEUP.map((slot) => (models[slot.source.src] ? instance(models[slot.source.src]!) : null)),
    [models],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const cam = state.camera.position;
    let shown = 0;
    LINEUP.forEach((slot, i) => {
      const g = groups.current[i];
      if (!g) return;
      // they slip under the surface one after another when the story moves on, and rise again
      const b = THREE.MathUtils.smoothstep(story.bottle, slot.delay, slot.delay + 0.75);
      g.visible = b > 0.01;
      if (!g.visible) return;
      shown++;
      g.position.set(slot.x, -0.06 + Math.sin(t * 0.8 + i) * 0.006 - (1 - b) * (slot.height + 0.3), slot.z);
      const face = Math.atan2(cam.x - slot.x, cam.z - slot.z);
      g.rotation.set(Math.sin(t * 0.5 + i) * 0.006, face + slot.turn + Math.sin(t * 0.23 + i * 1.3) * 0.08, Math.sin(t * 0.6 + i * 1.7) * 0.01);
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
        const obj = instances[i];
        if (!obj) return null;
        return (
          <group
            key={slot.key}
            ref={(el) => {
              groups.current[i] = el;
            }}
            scale={slot.height}
          >
            <primitive object={obj} />
          </group>
        );
      })}
    </group>
  );
}

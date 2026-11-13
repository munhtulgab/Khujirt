import * as THREE from "three";
import { radiusAt, type BottleShape, type LabelBand } from "./bottleShape";

/**
 * A bottle in 3D from the shape read off its product photo (bottleShape.ts), one unit tall, base at
 * y = 0. The glass or PET is refractive (it bends the valley behind it), filled with water up to the
 * shoulder; the real printed label and cap from the photo are wrapped onto the surface.
 */

export type BottleKind = "glass" | "pet";

export interface BottleModel {
  group: THREE.Group;
  /** diameter at the widest point / height */
  aspect: number;
  /** water level, 0..1 of the height */
  fill: number;
  /** radius (units of height) at a height, for placing things inside */
  radiusAt: (t: number) => number;
  dispose: () => void;
}

const RADIAL = 64;

/* ---------------------------------------------------------------- shared materials and textures */

let embossTexture: THREE.CanvasTexture | null = null;

/** "KHUJIRT" moulded into the glass, running up the lower body as on the real bottles. */
function getEmboss() {
  if (embossTexture) return embossTexture;
  // texture space: u = around the bottle (front at the centre), v = height
  const W = 512;
  const H = 640;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2, H * (1 - 0.235)); // centred at 23.5 % of the height
  ctx.rotate(-Math.PI / 2); // reads from the base upwards
  ctx.filter = "blur(1.6px)";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const text = "KHUJIRT";
  let size = 60;
  ctx.font = `500 ${size}px "Cormorant Variable", "Cormorant", Georgia, "Times New Roman", serif`;
  // the lettering runs over ~38 % of the height
  const target = H * 0.38;
  const measured = ctx.measureText(text).width || target;
  size = Math.min(80, size * (target / measured));
  ctx.font = `500 ${size}px "Cormorant Variable", "Cormorant", Georgia, "Times New Roman", serif`;
  // the u axis spans the whole circumference: squeeze the letters so they keep their proportions
  ctx.scale(1, 0.78);
  ctx.fillText(text, 0, 0);
  ctx.restore();
  embossTexture = new THREE.CanvasTexture(canvas);
  embossTexture.wrapS = THREE.RepeatWrapping;
  embossTexture.colorSpace = THREE.NoColorSpace;
  return embossTexture;
}

const sharedMaterials = new Map<string, THREE.Material>();

function glassMaterial(kind: BottleKind, filled: boolean, emboss: boolean) {
  const key = `${kind}-${filled}-${emboss}`;
  const cached = sharedMaterials.get(key);
  if (cached) return cached as THREE.MeshPhysicalMaterial;
  const glass = kind === "glass";
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#ffffff"),
    transmission: 1,
    // full of water: the whole bottle acts as a lens; above the water only the walls refract
    thickness: filled ? 0.24 : 0.03,
    ior: filled ? (glass ? 1.42 : 1.4) : glass ? 1.5 : 1.57,
    roughness: glass ? 0.03 : 0.06,
    metalness: 0,
    attenuationColor: new THREE.Color(glass ? "#cdebe6" : "#e2f0fb"),
    attenuationDistance: glass ? 2.4 : 4,
    clearcoat: glass ? 1 : 0.6,
    clearcoatRoughness: 0.04,
    specularIntensity: 1,
    specularColor: new THREE.Color("#fff8ee"),
    envMapIntensity: glass ? 1.8 : 1.5,
    dispersion: glass ? 0.12 : 0,
  });
  if (emboss) {
    m.bumpMap = getEmboss();
    m.bumpScale = 2.2;
  }
  sharedMaterials.set(key, m);
  return m;
}

function meniscusMaterial() {
  const cached = sharedMaterials.get("meniscus");
  if (cached) return cached;
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color("#eaf8fb"), side: THREE.DoubleSide, toneMapped: false });
  sharedMaterials.set("meniscus", m);
  return m;
}

let bubbleSprite: THREE.CanvasTexture | null = null;
function getBubbleSprite() {
  if (bubbleSprite) return bubbleSprite;
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(16, 16, 2, 16, 16, 15);
  grad.addColorStop(0, "rgba(255,255,255,0.15)");
  grad.addColorStop(0.7, "rgba(255,255,255,0.95)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.beginPath();
  g.arc(16, 16, 15, 0, Math.PI * 2);
  g.fill();
  bubbleSprite = new THREE.CanvasTexture(c);
  return bubbleSprite;
}

/* ---------------------------------------------------------------- geometry */

/** Surface of revolution through (radius, height) points, with u around and v = height. */
function lathe(points: THREE.Vector2[]) {
  const g = new THREE.LatheGeometry(points, RADIAL);
  const pos = g.getAttribute("position") as THREE.BufferAttribute;
  const uv = g.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const seam = Math.abs(x) < 1e-6 && z < 0 ? 1 : Math.atan2(x, z) / (Math.PI * 2) + 0.5;
    uv.setXY(i, seam, pos.getY(i));
  }
  return g;
}

/** The printed label (or cap) of a band, wrapped onto the surface just outside the glass. */
function bandGeometry(shape: BottleShape, band: LabelBand, offset: number) {
  const H = shape.height;
  const rows = Math.max(2, Math.min(72, band.bottom - band.top + 1));
  const halves: [number, number, number][] = band.wrap
    ? [
        [-Math.PI / 2, Math.PI / 2, 1],
        [Math.PI / 2, (Math.PI * 3) / 2, -1],
      ]
    : [[-Math.PI / 2 * 0.985, (Math.PI / 2) * 0.985, 1]];
  const cols = band.wrap ? 40 : 44;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  const cxCrop = shape.width / 2;
  for (const [from, to, side] of halves) {
    const base = positions.length / 3;
    for (let i = 0; i < rows; i++) {
      const k = band.top + ((band.bottom - band.top) * i) / (rows - 1);
      const y = 1 - k / (H - 1);
      const r = radiusAt(shape, y);
      const dr = (radiusAt(shape, Math.min(1, y + 0.004)) - radiusAt(shape, Math.max(0, y - 0.004))) / 0.008;
      const rPx = (r * H);
      for (let j = 0; j <= cols; j++) {
        const th = from + ((to - from) * j) / cols;
        const s = Math.sin(th);
        const c = Math.cos(th);
        positions.push((r + offset) * s, y, (r + offset) * c);
        const n = new THREE.Vector3(s, -dr, c).normalize();
        normals.push(n.x, n.y, n.z);
        // the photo shows the front: a point at angle θ was photographed at x = r·sin θ
        // (the back of a wrap-around label repeats the front, reading the right way round)
        const xPx = cxCrop + rPx * s * side;
        uvs.push(xPx / shape.width, y);
      }
    }
    for (let i = 0; i < rows - 1; i++)
      for (let j = 0; j < cols; j++) {
        const a = base + i * (cols + 1) + j;
        const b = a + cols + 1;
        index.push(a, b, a + 1, b, b + 1, a + 1);
      }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(index);
  return g;
}

/* ---------------------------------------------------------------- the bottle */

export function buildBottle(
  shape: BottleShape,
  opts: { kind: BottleKind; emboss: boolean; bubbles: boolean },
): BottleModel {
  const H = shape.height;
  const group = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];
  const r = (t: number) => radiusAt(shape, t);
  const capStart = 1 - shape.capBottom / (H - 1);
  // water up to a little below the neck
  const fill = Math.max(0.5, capStart - (opts.kind === "glass" ? 0.07 : 0.06));

  // ---- body: filled part and the empty neck
  const STEPS = 110;
  const lower: THREE.Vector2[] = [new THREE.Vector2(0, 0.004)];
  const upper: THREE.Vector2[] = [];
  for (let i = 0; i <= STEPS; i++) {
    const t = (capStart + 0.006) * (i / STEPS);
    const p = new THREE.Vector2(Math.max(0.002, r(t)), t);
    if (t <= fill) lower.push(p);
    if (t >= fill - 0.004) upper.push(p);
  }
  // a little in-turned lip under the cap
  upper.push(new THREE.Vector2(r(capStart) * 0.82, capStart + 0.006));
  const lowerGeo = lathe(lower);
  const upperGeo = lathe(upper);
  disposables.push(lowerGeo, upperGeo);
  const filled = new THREE.Mesh(lowerGeo, glassMaterial(opts.kind, true, opts.emboss));
  const neck = new THREE.Mesh(upperGeo, glassMaterial(opts.kind, false, false));
  group.add(filled, neck);

  // ---- the water's surface: a bright meniscus ring
  const rf = r(fill);
  const ringGeo = new THREE.RingGeometry(rf * 0.84, rf * 0.975, RADIAL).rotateX(-Math.PI / 2).translate(0, fill, 0);
  disposables.push(ringGeo);
  group.add(new THREE.Mesh(ringGeo, meniscusMaterial()));

  // ---- the cap (solid, in the colour of the photo; the photo itself is wrapped over it)
  const capPoints: THREE.Vector2[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = capStart - 0.004 + (1 - capStart + 0.004) * (i / 24);
    capPoints.push(new THREE.Vector2(Math.max(0.002, r(Math.min(1, t)) * 0.992), Math.min(1, t)));
  }
  capPoints.push(new THREE.Vector2(0, 1));
  const capGeo = lathe(capPoints);
  disposables.push(capGeo);
  const capMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setRGB(...shape.capColor, THREE.SRGBColorSpace),
    roughness: 0.42,
    metalness: 0,
  });
  disposables.push(capMat);
  group.add(new THREE.Mesh(capGeo, capMat));

  // ---- the real label and cap from the photo
  const canvas = document.createElement("canvas");
  canvas.width = shape.width;
  canvas.height = shape.height;
  canvas.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(shape.decal), shape.width, shape.height), 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  disposables.push(tex);
  const decalMat = new THREE.MeshStandardMaterial({
    map: tex,
    emissiveMap: tex,
    emissive: new THREE.Color("#ffffff"),
    emissiveIntensity: 0.32,
    alphaTest: 0.5,
    alphaToCoverage: true,
    roughness: opts.kind === "pet" ? 0.36 : 0.5,
    metalness: 0,
    envMapIntensity: 0.6,
  });
  disposables.push(decalMat);
  const capBand: LabelBand = { top: 0, bottom: Math.max(1, shape.capBottom - 1), wrap: true };
  for (const band of [capBand, ...shape.bands]) {
    const g = bandGeometry(shape, band, band === capBand ? 0.0012 : 0.0028);
    disposables.push(g);
    group.add(new THREE.Mesh(g, decalMat));
  }

  // ---- sparkling water: bubbles rising inside (opaque, so the glass refracts them)
  if (opts.bubbles) {
    const N = 34;
    const pos = new Float32Array(N * 3);
    const speed = new Float32Array(N);
    const start = new Float32Array(N);
    const seedAngle = new Float32Array(N);
    const seedRad = new Float32Array(N);
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < N; i++) {
      speed[i] = 0.05 + rand() * 0.09;
      seedAngle[i] = rand() * Math.PI * 2;
      seedRad[i] = Math.sqrt(rand()) * 0.78;
      start[i] = rand() * fill;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.016,
      map: getBubbleSprite(),
      alphaTest: 0.5,
      color: new THREE.Color("#f6fcff"),
      sizeAttenuation: true,
      depthWrite: true,
    });
    disposables.push(geo, mat);
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    // positions follow the clock (this runs once per render pass, not once per frame)
    points.onBeforeRender = () => {
      const now = performance.now() / 1000;
      for (let i = 0; i < N; i++) {
        const y = (start[i] + speed[i] * now) % (fill - 0.03);
        const rr = r(y) * seedRad[i];
        const a = seedAngle[i] + Math.sin(now * 2 + i) * 0.08;
        pos[i * 3] = Math.sin(a) * rr;
        pos[i * 3 + 1] = Math.max(0.015, y);
        pos[i * 3 + 2] = Math.cos(a) * rr;
      }
      geo.attributes.position.needsUpdate = true;
    };
    group.add(points);
  }

  let maxR = 0;
  for (let i = 0; i <= 100; i++) maxR = Math.max(maxR, r(i / 100));
  return {
    group,
    aspect: maxR * 2,
    fill,
    radiusAt: r,
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}

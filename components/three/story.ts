import type { PeakId } from "@/lib/i18n";

/**
 * Shared, mutable story state. GSAP ScrollTrigger tweens these numbers as the page scrolls;
 * the R3F scene reads them every frame. Nothing here causes React re-renders.
 */
export type StoryKey = "hero" | "wound" | "source" | "heal" | "today" | "facts" | "products" | "contact";

export interface StoryState {
  /** camera position */
  cx: number;
  cy: number;
  cz: number;
  /** camera look-at target */
  lx: number;
  ly: number;
  lz: number;
  /** horizontal shift of the subject on wide screens (+ moves it right) */
  shift: number;
  /** vertical shift on phones (+ moves the subject up) */
  my: number;
  /** mist density over the mountains (1 = heavy, 0 = clear) */
  mist: number;
  /** how much of the water stag stands above the lake (0..1) */
  reveal: number;
  /** stag dissolving into rising bubbles (0..1) */
  disperse: number;
  /** floating bottle visibility (0..1) */
  bottle: number;
  /** mountain name labels (0..1) */
  peaks: number;
  /** ripple strength on the lake (0..1) */
  ripple: number;
  /** wounded tint (0..1) */
  wound: number;
  /** healing glow (0..1) */
  heal: number;
}

export const STATES: Record<StoryKey, StoryState> = {
  hero:     { cx: 0.2,  cy: 1.7, cz: 8.4,  lx: 0.25, ly: 1.5, lz: -0.2, shift: 0.17,  my: -0.2,  mist: 1,    reveal: 1, disperse: 0, bottle: 1, peaks: 0, ripple: 0.35, wound: 0, heal: 0 },
  wound:    { cx: -3.4, cy: 1.9, cz: 4.4,  lx: 0.5,  ly: 1.7, lz: -1.1, shift: -0.18, my: 0.16,  mist: 0.85, reveal: 1, disperse: 0, bottle: 0, peaks: 0, ripple: 0.5,  wound: 1, heal: 0 },
  source:   { cx: 0.6,  cy: 5.5, cz: 18,   lx: 0.5,  ly: 9.5, lz: -40,  shift: 0,     my: 0.1,   mist: 0.5,  reveal: 1, disperse: 0, bottle: 0, peaks: 1, ripple: 1,    wound: 0.4, heal: 0 },
  heal:     { cx: 3.6,  cy: 1.7, cz: 3.8,  lx: 0.6,  ly: 1.75, lz: -1.1, shift: -0.2, my: 0.16,  mist: 0.32, reveal: 1, disperse: 0, bottle: 0, peaks: 0, ripple: 0.9,  wound: 0, heal: 1 },
  today:    { cx: 0.2,  cy: 1.7, cz: 8.0,  lx: 0.25, ly: 1.5, lz: -0.2, shift: -0.16, my: 0.12,  mist: 0.22, reveal: 1, disperse: 0, bottle: 1, peaks: 0, ripple: 0.45, wound: 0, heal: 0 },
  facts:    { cx: 0.4,  cy: 3.0, cz: 9.6,  lx: 0.4,  ly: 2.2, lz: -1.5, shift: 0,     my: 0,     mist: 0.15, reveal: 0, disperse: 1, bottle: 0, peaks: 0, ripple: 0.7,  wound: 0, heal: 0 },
  products: { cx: 0.6,  cy: 3.6, cz: 12,   lx: 0.4,  ly: 2.6, lz: -2,   shift: 0,     my: 0,     mist: 0.1,  reveal: 0, disperse: 1, bottle: 0, peaks: 0, ripple: 0.4,  wound: 0, heal: 0 },
  contact:  { cx: 0.2,  cy: 2.0, cz: 9.2,  lx: 0.3,  ly: 1.6, lz: -0.6, shift: 0.22,  my: -0.05, mist: 0.4,  reveal: 1, disperse: 0, bottle: 1, peaks: 0, ripple: 0.5,  wound: 0, heal: 0 },
};

export const story: StoryState = { ...STATES.hero };

/** Intro progress: the stag forming out of the lake (0 → 1). */
export const intro = { form: 0 };

/** Pointer in normalised device coordinates, tracked on window (the canvas sits behind the page). */
export const pointer = { x: 0, y: 0, moved: -10 };

/** A mountain the visitor is hovering in the legend, highlighted in the scene. */
export const hover: { peak: PeakId | null } = { peak: null };

/** DOM elements of the mountain name labels (rendered by Experience, positioned by Mountains). */
export const peakLabelEls: Partial<Record<PeakId, HTMLElement | null>> = {};

/* ---- scene layout ---- */
export const DEER_SCALE = 3.2;
// the stag stands in the shallows: hooves a little under the surface
export const DEER_POSITION: [number, number, number] = [0.8, -0.26, -1.2];
export const DEER_ROTATION = -2.6;
export const BOTTLE_POSITION: [number, number, number] = [-0.95, 0.62, 1.35];

/** Pose of the idle animation the point cloud was sampled at, and the transform that puts the
 *  model on the lake facing +x with height 1 (from scripts used to prepare public/models). */
export const POSE_TIME = 10.25;
export const DEER_XF = { ang: 0.09116788182560863, cx: 19.14979250906179, cz: -11.679680048370848, minY: -0.6665227560852329, H: 182.7729732477573 };

/** Hooves in normalised model space (x, z), used for the ripples. */
export const HOOVES: [number, number][] = [
  [0.065, 0.017],
  [0.024, 0.117],
  [-0.442, 0.035],
  [-0.233, 0.135],
];

/** Normalised (x, z) of a point of the stag → world (x, z) on the lake. */
export function deerToWorld(x: number, z: number): [number, number] {
  const c = Math.cos(DEER_ROTATION);
  const s = Math.sin(DEER_ROTATION);
  const lx = x * DEER_SCALE;
  const lz = z * DEER_SCALE;
  return [DEER_POSITION[0] + lx * c + lz * s, DEER_POSITION[2] - lx * s + lz * c];
}

/** Low evening sun, behind the left shoulder of the valley. */
// (kept free of three.js imports: this module is also used by the page outside the 3D chunk)
const sunLength = Math.hypot(-0.38, 0.14, -0.92);
export const SUN_DIR: [number, number, number] = [-0.38 / sunLength, 0.14 / sunLength, -0.92 / sunLength];

/** Drops of water falling from the stag; the lake turns each landing into a ring. */
export const splashes: { x: number; z: number; t: number }[] = [];

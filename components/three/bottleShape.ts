/**
 * Reads a real product photo of a bottle and returns what is needed to build it in 3D:
 * the outline (radius at every height), where the cap ends, where the printed label is, and
 * the label itself as an image whose clear-glass parts are transparent.
 *
 * Works on a plain RGBA pixel buffer (no DOM), for photos on a light studio background or with a
 * transparent one. The bottle must stand upright and face the camera, as product shots do.
 */

export interface LabelBand {
  /** rows of the cropped photo, top = 0 */
  top: number;
  bottom: number;
  /** printed all the way round (seen on both sides of the silhouette) */
  wrap: boolean;
}

export interface BottleShape {
  /** cropped photo size: the bottle's bounding box, centred on its axis */
  width: number;
  height: number;
  /** half-width of the bottle at every row of the crop, in pixels */
  radius: Float32Array;
  /** largest radius, in pixels */
  maxRadius: number;
  /** first row below the cap */
  capBottom: number;
  /** printed parts (the cap is the first band) */
  bands: LabelBand[];
  /** average colour of the cap, 0..1 */
  capColor: [number, number, number];
  /** RGBA, width × height: the photo where it is printed or a cap, transparent where it is glass */
  decal: Uint8ClampedArray;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

function median(values: number[]) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[s.length >> 1];
}

/** Saturation and value (0..1) of a pixel. */
function sv(data: Uint8ClampedArray, i: number): [number, number] {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return [max ? (max - min) / max : 0, max / 255];
}

export function analyzeBottle(src: Uint8ClampedArray, w: number, h: number): BottleShape | null {
  const at = (x: number, y: number) => (y * w + x) * 4;

  // ---------------------------------------------------------- background and silhouette
  const corners = [at(0, 0), at(w - 1, 0), at(0, h - 1), at(w - 1, h - 1)];
  const transparentBg = corners.filter((i) => src[i + 3] < 24).length >= 3;
  let br = 255;
  let bg = 255;
  let bb = 255;
  if (!transparentBg) {
    let n = 0;
    br = bg = bb = 0;
    for (let x = 0; x < w; x += 2)
      for (const y of [0, h - 1]) {
        const i = at(x, y);
        br += src[i];
        bg += src[i + 1];
        bb += src[i + 2];
        n++;
      }
    br /= n;
    bg /= n;
    bb /= n;
    if (Math.min(br, bg, bb) < 190) return null; // not a studio shot
  }
  const isBottle = (x: number, y: number) => {
    const i = at(x, y);
    if (src[i + 3] < 60) return false;
    if (transparentBg) return true;
    return Math.max(Math.abs(src[i] - br), Math.abs(src[i + 1] - bg), Math.abs(src[i + 2] - bb)) > 22;
  };

  const L = new Int32Array(h).fill(-1);
  const R = new Int32Array(h).fill(-1);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w - 1; x++)
      if (isBottle(x, y) && isBottle(x + 1, y)) {
        L[y] = x;
        break;
      }
    if (L[y] < 0) continue;
    for (let x = w - 1; x > 0; x--)
      if (isBottle(x, y) && isBottle(x - 1, y)) {
        R[y] = x;
        break;
      }
  }
  const span = (y: number) => (L[y] >= 0 && R[y] > L[y] ? R[y] - L[y] + 1 : 0);
  let maxSpan = 0;
  for (let y = 0; y < h; y++) maxSpan = Math.max(maxSpan, span(y));
  if (maxSpan < 12) return null;

  // the bottle: the tallest group of rows wider than a sliver; short gaps are bridged, because
  // white label paper at the outline looks just like the white background
  const minSpan = Math.max(3, maxSpan * 0.04);
  const bridge = Math.max(4, Math.round(maxSpan * 0.6));
  let top = -1;
  let bottom = -1;
  let groupStart = -1;
  let lastOn = -1;
  for (let y = 0; y <= h; y++) {
    const on = y < h && span(y) >= minSpan;
    if (on) {
      if (groupStart < 0 || y - lastOn > bridge) {
        if (groupStart >= 0 && lastOn - groupStart > bottom - top) {
          top = groupStart;
          bottom = lastOn;
        }
        groupStart = y;
      }
      lastOn = y;
    }
  }
  if (groupStart >= 0 && lastOn - groupStart > bottom - top) {
    top = groupStart;
    bottom = lastOn;
  }
  const H = bottom - top + 1;
  if (H < 40 || H < maxSpan * 1.2) return null;

  // rows where the outline vanished or dents in (white paper against the white background)
  // borrow it from the nearest good rows above and below
  const near = Math.max(3, Math.round(H * 0.04));
  const good = new Uint8Array(h);
  for (let y = top; y <= bottom; y++) {
    const sy = span(y);
    if (sy < minSpan) continue;
    let above = 0;
    let below = 0;
    for (let k = 1; k <= near; k++) {
      if (!above && y - k >= top && span(y - k) >= minSpan) above = span(y - k);
      if (!below && y + k <= bottom && span(y + k) >= minSpan) below = span(y + k);
    }
    good[y] = above && below && sy < 0.78 * Math.min(above, below) ? 0 : 1;
  }
  for (let y = top; y <= bottom; y++) {
    if (good[y]) continue;
    let a = y;
    while (a > top && !good[a]) a--;
    let b = y;
    while (b < bottom && !good[b]) b++;
    if (!good[a] || !good[b]) continue;
    const f = (y - a) / (b - a);
    L[y] = Math.round(L[a] + (L[b] - L[a]) * f);
    R[y] = Math.round(R[a] + (R[b] - R[a]) * f);
  }

  const centres: number[] = [];
  for (let y = top; y <= bottom; y++) if (span(y) > maxSpan * 0.5) centres.push((L[y] + R[y]) / 2);
  const cx = median(centres);

  // half-widths, smoothed (median then box) so highlights on the edge do not dent the glass
  const raw = new Float32Array(H);
  for (let k = 0; k < H; k++) raw[k] = span(top + k) / 2;
  const med = new Float32Array(H);
  for (let k = 0; k < H; k++) {
    const win: number[] = [];
    for (let j = Math.max(0, k - 2); j <= Math.min(H - 1, k + 2); j++) win.push(raw[j]);
    med[k] = median(win);
  }
  const radius = new Float32Array(H);
  for (let k = 0; k < H; k++) {
    let s = 0;
    let n = 0;
    for (let j = Math.max(0, k - 1); j <= Math.min(H - 1, k + 1); j++) {
      s += med[j];
      n++;
    }
    radius[k] = s / n;
  }
  let maxRadius = 0;
  for (let k = 0; k < H; k++) maxRadius = Math.max(maxRadius, radius[k]);

  // ---------------------------------------------------------- per-row colour statistics
  const ink = new Float32Array(H); // printed (saturated or dark) share of the row
  const colour = new Float32Array(H); // saturated share (cap colour, labels)
  const bright = new Float32Array(H); // share of pixels as light as clear glass on white
  const tint = new Float32Array(H); // lightly tinted share (pale label paper)
  for (let k = 0; k < H; k++) {
    const y = top + k;
    const r = radius[k];
    const x0 = Math.round(cx - r * 0.84);
    const x1 = Math.round(cx + r * 0.84);
    let n = 0;
    let nInk = 0;
    let nCol = 0;
    let nBright = 0;
    let nTint = 0;
    for (let x = Math.max(0, x0); x <= Math.min(w - 1, x1); x++) {
      const i = at(x, y);
      if (src[i + 3] < 60) continue;
      const [s, v] = sv(src, i);
      n++;
      if ((s > 0.28 && v > 0.2) || v < 0.37) nInk++;
      if (s > 0.25 && v > 0.2) nCol++;
      if (v > 0.84 && s < 0.12) nBright++;
      if (s > 0.1 && v > 0.2) nTint++;
    }
    ink[k] = n ? nInk / n : 0;
    colour[k] = n ? nCol / n : 0;
    bright[k] = n ? nBright / n : 0;
    tint[k] = n ? nTint / n : 0;
  }

  // ---------------------------------------------------------- the cap
  // It is a cylinder at the top: it ends where the outline widens into the neck, or earlier where a
  // stretch of clear glass shows below a coloured cap.
  const capRef = median(Array.from(radius.slice(Math.round(H * 0.01), Math.max(2, Math.round(H * 0.035)))));
  let capBottom = Math.round(H * 0.12);
  for (let k = Math.round(H * 0.03); k < Math.round(H * 0.25); k++) {
    if (radius[k] > capRef * 1.14) {
      capBottom = k;
      break;
    }
  }
  const glassy = (k: number) => colour[k] < 0.1 && bright[k] > 0.45;
  for (let k = Math.round(H * 0.03); k < capBottom - 3; k++) {
    if (glassy(k) && glassy(k + 1) && glassy(k + 2) && glassy(k + 3)) {
      capBottom = k;
      break;
    }
  }

  // ---------------------------------------------------------- printed label bands
  const solid = new Uint8Array(H);
  for (let k = capBottom; k < H; k++) solid[k] = ink[k] >= 0.14 ? 1 : 0;
  // close small gaps (lines of white text, thin white stripes)
  const gap = Math.max(3, Math.round(H * 0.04));
  for (let k = capBottom; k < H; k++) {
    if (solid[k]) continue;
    let a = k;
    while (a < H && !solid[a]) a++;
    const before = k > capBottom && solid[k - 1];
    if (before && a < H && a - k <= gap) solid.fill(1, k, a);
    k = a;
  }
  const bands: LabelBand[] = [];
  for (let k = capBottom; k < H; k++) {
    if (!solid[k]) continue;
    let e = k;
    while (e + 1 < H && solid[e + 1]) e++;
    if (e - k + 1 >= Math.max(3, H * 0.015)) {
      // pale parts of the print (light tints, thin lettering) above and below the bold block
      let bottomRow = e;
      const limit = Math.min(H - 1, e + Math.round(H * 0.05));
      const pale = (j: number) => j >= 0 && j < H && (ink[j] >= 0.015 || tint[j] >= 0.1);
      // (a row or two between lines of thin lettering may be blank)
      while (bottomRow < limit && (pale(bottomRow + 1) || (pale(bottomRow + 2) && bottomRow + 2 <= limit) || (pale(bottomRow + 3) && bottomRow + 3 <= limit))) bottomRow++;
      let topRow = k;
      const ceiling = Math.max(capBottom + 2, k - Math.round(H * 0.07));
      while (topRow > ceiling && pale(topRow - 1)) topRow--;
      // the paper runs a little past the last printed line
      const margin = Math.round(H * 0.012);
      bottomRow = Math.min(H - 1, bottomRow + margin);
      topRow = Math.max(capBottom + 2, topRow - Math.round(margin / 2));
      const shares = Array.from(ink.slice(k, e + 1));
      bands.push({ top: topRow, bottom: bottomRow, wrap: median(shares) >= 0.45 });
    }
    k = e;
  }

  // ---------------------------------------------------------- cap colour
  let cr = 0;
  let cg = 0;
  let cb = 0;
  let cn = 0;
  for (let k = Math.round(capBottom * 0.15); k < capBottom; k++) {
    const y = top + k;
    for (let x = Math.round(cx - radius[k] * 0.7); x <= Math.round(cx + radius[k] * 0.7); x++) {
      const i = at(x, y);
      if (src[i + 3] < 60) continue;
      cr += src[i];
      cg += src[i + 1];
      cb += src[i + 2];
      cn++;
    }
  }
  const capColor: [number, number, number] = cn ? [cr / cn / 255, cg / cn / 255, cb / cn / 255] : [0.3, 0.5, 0.8];

  // ---------------------------------------------------------- decal: the printed parts of the photo
  const width = Math.ceil(maxRadius) * 2 + 4;
  const ox = Math.round(cx) - (width >> 1);
  const decal = new Uint8ClampedArray(width * H * 4);
  const printed = new Uint8Array(H);
  printed.fill(1, 0, capBottom);
  for (const b of bands) printed.fill(1, b.top, b.bottom + 1);
  for (let k = 0; k < H; k++) {
    if (!printed[k]) continue;
    const y = top + k;
    const left = L[y];
    const right = R[y];
    for (let dx = 0; dx < width; dx++) {
      const x = ox + dx;
      if (x < 0 || x >= w || left < 0) continue;
      const i = at(x, y);
      const o = (k * width + dx) * 4;
      // soft 1 px edge so the outline does not shimmer
      const edge = clamp01(Math.min(x - left + 1, right - x + 1));
      const a = edge * (src[i + 3] / 255);
      if (a <= 0) continue;
      decal[o] = src[i];
      decal[o + 1] = src[i + 1];
      decal[o + 2] = src[i + 2];
      decal[o + 3] = Math.round(a * 255);
    }
  }
  // fill the outermost transparent texels with their neighbours' colour, so filtering at the
  // silhouette edge does not bleed white or black into the print
  for (let k = 0; k < H; k++) {
    if (!printed[k]) continue;
    const row = k * width * 4;
    let first = -1;
    let last = -1;
    for (let dx = 0; dx < width; dx++)
      if (decal[row + dx * 4 + 3] > 0) {
        if (first < 0) first = dx;
        last = dx;
      }
    if (first < 0) continue;
    for (let dx = 0; dx < first; dx++) decal.copyWithin(row + dx * 4, row + first * 4, row + first * 4 + 3);
    for (let dx = last + 1; dx < width; dx++) decal.copyWithin(row + dx * 4, row + last * 4, row + last * 4 + 3);
  }

  const radiusCrop = new Float32Array(H);
  for (let k = 0; k < H; k++) radiusCrop[k] = radius[k];
  return { width, height: H, radius: radiusCrop, maxRadius, capBottom, bands, capColor, decal };
}

/** Radius (in units of the bottle's height) at height t (0 = base, 1 = top of the cap). */
export function radiusAt(shape: BottleShape, t: number) {
  const k = (1 - t) * (shape.height - 1);
  const k0 = Math.max(0, Math.min(shape.height - 1, Math.floor(k)));
  const k1 = Math.min(shape.height - 1, k0 + 1);
  const f = k - k0;
  return (shape.radius[k0] * (1 - f) + shape.radius[k1] * f) / shape.height;
}

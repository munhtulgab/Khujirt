import * as THREE from "three";

/** Tiling normal map of soft, crossing water ripples (generated, no image files). */
export function makeRippleNormalMap(size = 256): THREE.CanvasTexture {
  const h = new Float32Array(size * size);
  const waves = [
    [3, 2, 0.0, 1],
    [-2, 5, 1.3, 0.7],
    [6, -3, 2.1, 0.45],
    [-7, -6, 0.6, 0.3],
    [11, 4, 4.0, 0.18],
  ];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let v = 0;
      const u = (x / size) * Math.PI * 2;
      const w = (y / size) * Math.PI * 2;
      for (const [kx, ky, ph, a] of waves) v += Math.sin(kx * u + ky * w + ph) * a;
      h[y * size + x] = v;
    }
  }
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const at = (x: number, y: number) => h[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * 0.9;
      const dy = (at(x, y + 1) - at(x, y - 1)) * 0.9;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      img.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

/** Soft cloud puff used for the mist sprites. */
export function makeCloudTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 22; i++) {
    const x = size * (0.25 + rnd() * 0.5);
    const y = size * (0.35 + rnd() * 0.3);
    const r = size * (0.12 + rnd() * 0.2);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(255,255,255,0.32)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Bottle label: white wrap with the real Khujirt logo on the front and a small line of text behind. */
export function makeLabelTexture(logo: HTMLImageElement): THREE.CanvasTexture {
  const W = 2048;
  const H = 520;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  const shade = ctx.createLinearGradient(0, 0, W, 0);
  shade.addColorStop(0, "rgba(47,143,209,0.16)");
  shade.addColorStop(0.5, "rgba(47,143,209,0)");
  shade.addColorStop(1, "rgba(47,143,209,0.16)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#1d4e7a";
  ctx.fillRect(0, 18, W, 10);
  ctx.fillRect(0, H - 28, W, 10);
  ctx.fillStyle = "#c8202a";
  ctx.fillRect(0, 34, W, 4);
  ctx.fillRect(0, H - 38, W, 4);
  // logo, centred on the front of the bottle
  const lh = 400;
  const lw = (logo.naturalWidth / logo.naturalHeight) * lh;
  ctx.drawImage(logo, W / 2 - lw / 2, (H - lh) / 2, lw, lh);
  // back of the bottle (wraps around u = 0 / 1)
  ctx.fillStyle = "#1d4e7a";
  ctx.textAlign = "center";
  ctx.font = '600 40px "Onest Variable", system-ui, sans-serif';
  ctx.fillText("БАЙГАЛИЙН ЭРДЭСТ УС", 0, H / 2 + 14);
  ctx.fillText("БАЙГАЛИЙН ЭРДЭСТ УС", W, H / 2 + 14);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

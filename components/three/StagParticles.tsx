"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { DEER_SCALE, intro, pointer, story } from "./story";

const POINTS_URL = "/models/stag-points.bin";

const vertexShader = /* glsl */ `
  uniform float uTime, uForm, uDisperse, uMouseF, uSize, uPR, uH;
  uniform vec3 uMouse;
  attribute vec3 aStart;
  attribute vec4 aRand;
  attribute float aPart;
  varying float vAlpha;
  varying vec3 vColor;
  float easeIO(float t) { return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0; }
  void main() {
    vec3 tgt = position;
    float hN = tgt.y / uH;
    // water lifts off the lake and gathers into the stag: hooves first, antlers last
    float t = easeIO(clamp(uForm * 1.8 - aRand.x * 0.5 - hN * 0.3, 0.0, 1.0));
    float a = uTime * (0.35 + aRand.y * 0.6) + aRand.z * 6.2831;
    vec3 start = aStart + vec3(cos(a), 0.0, sin(a)) * 0.3 * (1.0 - t);
    vec3 p = mix(start, tgt, t);
    p.y += sin(t * 3.14159) * 0.7 * (0.4 + aRand.y);
    p += 0.012 * t * vec3(sin(uTime * 1.7 + aRand.z * 20.0), sin(uTime * 1.3 + aRand.w * 20.0), cos(uTime * 1.5 + aRand.z * 14.0));
    // dissolving into rising mineral bubbles
    float rise = mod(aRand.y * 9.0 + uTime * (0.22 + aRand.w * 0.35), 9.0) - 0.5;
    vec3 bubble = vec3(aStart.x * 1.6 + sin(uTime * 0.7 + aRand.z * 9.0) * 0.25, rise, aStart.z * 1.5 + cos(uTime * 0.6 + aRand.z * 7.0) * 0.25);
    p = mix(p, bubble, smoothstep(0.0, 1.0, uDisperse));
    // the cursor parts the water
    vec3 dm = p - uMouse;
    float dist = length(dm);
    p += (dm / max(dist, 0.0001)) * uMouseF * smoothstep(0.9, 0.0, dist) * 0.5;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.55 + aRand.w * 0.9) * uPR / -mv.z;
    vec3 deep = vec3(0.114, 0.306, 0.478);
    vec3 sky = vec3(0.184, 0.561, 0.82);
    vec3 foam = vec3(0.86, 0.95, 1.0);
    vColor = mix(mix(sky, deep, aRand.z * 0.6), foam, clamp(aPart * 0.5 + aRand.y * 0.35, 0.0, 1.0));
    float forming = 1.0 - smoothstep(0.82, 1.0, uForm) * 0.9;
    vAlpha = max(forming, uDisperse * 0.85) * (0.35 + 0.65 * t) * (0.75 + 0.25 * sin(uTime * 2.0 + aRand.z * 30.0));
  }
`;

const fragmentShader = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.15, d);
    if (a <= 0.01) discard;
    gl_FragColor = vec4(vColor, a * vAlpha);
  }
`;

/** The particles that rise from the lake and become the stag (and later its bubbles). */
export default function StagParticles() {
  const buffer = useLoader(THREE.FileLoader, POINTS_URL, (loader) => {
    (loader as THREE.FileLoader).setResponseType("arraybuffer");
  }) as unknown as ArrayBuffer;
  const ref = useRef<THREE.Points>(null);
  const { camera, gl } = useThree();

  const { geometry, uniforms } = useMemo(() => {
    const q = new Int16Array(buffer);
    const total = q.length / 4;
    const small = typeof window !== "undefined" && Math.min(window.innerWidth, window.innerHeight) < 700;
    const count = Math.min(total, small ? 9000 : total);
    const pos = new Float32Array(count * 3);
    const start = new Float32Array(count * 3);
    const rnd = new Float32Array(count * 4);
    const part = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (q[i * 4] / 20000) * DEER_SCALE;
      pos[i * 3 + 1] = (q[i * 4 + 1] / 20000) * DEER_SCALE;
      pos[i * 3 + 2] = (q[i * 4 + 2] / 20000) * DEER_SCALE;
      part[i] = q[i * 4 + 3];
      const ang = Math.random() * Math.PI * 2;
      const r = 0.5 + Math.pow(Math.random(), 0.7) * 3.4;
      start[i * 3] = Math.cos(ang) * r;
      start[i * 3 + 1] = -0.03 + Math.random() * 0.1;
      start[i * 3 + 2] = Math.sin(ang) * r * 0.65;
      for (let k = 0; k < 4; k++) rnd[i * 4 + k] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aStart", new THREE.BufferAttribute(start, 3));
    g.setAttribute("aRand", new THREE.BufferAttribute(rnd, 4));
    g.setAttribute("aPart", new THREE.BufferAttribute(part, 1));
    const u = {
      uTime: { value: 0 },
      uForm: { value: 0 },
      uDisperse: { value: 0 },
      uMouse: { value: new THREE.Vector3(99, 99, 99) },
      uMouseF: { value: 0 },
      uSize: { value: small ? 22 : 20 },
      uPR: { value: 1 },
      uH: { value: DEER_SCALE },
    };
    return { geometry: g, uniforms: u };
  }, [buffer]);

  const material = useMemo(
    () => new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false }),
    [uniforms],
  );

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  const helpers = useMemo(
    () => ({ ray: new THREE.Raycaster(), plane: new THREE.Plane(), hit: new THREE.Vector3(), ndc: new THREE.Vector2(), dir: new THREE.Vector3(), center: new THREE.Vector3() }),
    [],
  );

  useFrame((state, delta) => {
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uForm.value = intro.form;
    uniforms.uDisperse.value = story.disperse;
    uniforms.uPR.value = gl.getPixelRatio();
    const points = ref.current;
    const visible = intro.form < 1 || story.disperse > 0.01;
    if (points) points.visible = visible;
    const active = visible && performance.now() / 1000 - pointer.moved < 1.4 ? 1 : 0;
    uniforms.uMouseF.value += (active - uniforms.uMouseF.value) * Math.min(1, delta * 4);
    if (points && uniforms.uMouseF.value > 0.01) {
      const h = helpers;
      points.getWorldPosition(h.center).y += DEER_SCALE * 0.45;
      h.ndc.set(pointer.x, pointer.y);
      h.ray.setFromCamera(h.ndc, camera);
      camera.getWorldDirection(h.dir);
      h.plane.setFromNormalAndCoplanarPoint(h.dir.negate(), h.center);
      if (h.ray.ray.intersectPlane(h.plane, h.hit)) uniforms.uMouse.value.copy(points.worldToLocal(h.hit));
    }
  });

  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} renderOrder={6} />;
}

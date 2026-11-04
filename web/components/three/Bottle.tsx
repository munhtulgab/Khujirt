"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { BOTTLE_POSITION, story } from "./story";
import { makeLabelTexture } from "./textures";

const PROFILE: [number, number][] = [
  [0, 0], [0.25, 0], [0.29, 0.02], [0.31, 0.06], [0.31, 1.08], [0.3, 1.2], [0.27, 1.32],
  [0.21, 1.46], [0.15, 1.58], [0.125, 1.66], [0.12, 1.8], [0.13, 1.82], [0.13, 1.86],
];
const BUBBLES = 60;

/** A floating glass Khujirt bottle with the real logo on its label and bubbles rising inside. */
export default function Bottle() {
  const logo = useLoader(THREE.ImageLoader, "/brand/khujirt-logo.webp");
  const group = useRef<THREE.Group>(null);
  const bubbles = useRef<THREE.InstancedMesh>(null);

  const parts = useMemo(() => {
    const shell = new THREE.LatheGeometry(PROFILE.map(([r, y]) => new THREE.Vector2(r, y)), 96);
    const label = new THREE.CylinderGeometry(0.317, 0.317, 0.52, 96, 1, true, Math.PI, Math.PI * 2);
    label.translate(0, 0.66, 0);
    const cap = new THREE.CylinderGeometry(0.14, 0.14, 0.2, 48);
    cap.translate(0, 1.95, 0);
    const bubble = new THREE.SphereGeometry(0.016, 10, 8);
    return { shell, label, cap, bubble };
  }, []);

  const mats = useMemo(() => {
    const labelTex = makeLabelTexture(logo);
    return {
      glass: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#ffffff"),
        transmission: 1,
        thickness: 0.2,
        roughness: 0.02,
        ior: 1.48,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        attenuationColor: new THREE.Color("#cfeaff"),
        attenuationDistance: 2.5,
        specularIntensity: 1,
        envMapIntensity: 1.6,
      }),
      label: new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.38, metalness: 0, side: THREE.DoubleSide }),
      cap: new THREE.MeshStandardMaterial({ color: new THREE.Color("#1d4e7a"), roughness: 0.32, metalness: 0.25 }),
      bubble: new THREE.MeshStandardMaterial({ color: new THREE.Color("#ffffff"), roughness: 0.15, metalness: 0 }),
      labelTex,
    };
  }, [logo]);

  const seeds = useMemo(
    () => Array.from({ length: BUBBLES }, () => ({ a: Math.random() * Math.PI * 2, r: Math.random() * 0.24, y: Math.random() * 1.3, v: 0.12 + Math.random() * 0.25, s: 0.5 + Math.random() }))
    , [],
  );

  useEffect(() => () => {
    Object.values(parts).forEach((g) => g.dispose());
    mats.glass.dispose();
    mats.label.dispose();
    mats.cap.dispose();
    mats.bubble.dispose();
    mats.labelTex.dispose();
  }, [parts, mats]);

  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const sc = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const g = group.current;
    if (!g) return;
    const b = THREE.MathUtils.clamp(story.bottle, 0, 1);
    g.visible = b > 0.02;
    g.position.set(BOTTLE_POSITION[0], BOTTLE_POSITION[1] + Math.sin(t * 0.9) * 0.06 - (1 - b) * 3.2, BOTTLE_POSITION[2]);
    g.rotation.set(0, 0.35 + Math.sin(t * 0.35) * 0.3, Math.sin(t * 0.6) * 0.025);
    const inst = bubbles.current;
    if (!inst) return;
    seeds.forEach((s, i) => {
      const y = 0.06 + ((s.y + t * s.v) % 1.3);
      v.set(Math.cos(s.a + t * 0.3) * s.r, y, Math.sin(s.a + t * 0.3) * s.r);
      sc.setScalar(s.s);
      m.compose(v, q, sc);
      inst.setMatrixAt(i, m);
    });
    inst.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={group} scale={0.96}>
      <mesh geometry={parts.label} material={mats.label} />
      <mesh geometry={parts.cap} material={mats.cap} />
      <instancedMesh ref={bubbles} args={[parts.bubble, mats.bubble, BUBBLES]} frustumCulled={false} />
      <mesh geometry={parts.shell} material={mats.glass} />
    </group>
  );
}

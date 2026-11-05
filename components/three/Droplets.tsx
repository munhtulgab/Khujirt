"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { rng } from "./noise";
import { HOOVES, deerToWorld, intro, splashes, story } from "./story";

interface Drop {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  alive: boolean;
  next: number;
  size: number;
}

/**
 * Water dripping from the stag's belly and splashing up around its hooves. Each drop that lands
 * is handed to the lake, which turns it into a spreading ring.
 */
export default function Droplets({ count = 40 }: { count?: number }) {
  const mesh = useMemo(() => {
    const geometry = new THREE.SphereGeometry(1, 10, 8);
    const material = new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      roughness: 0.02,
      metalness: 0,
      transmission: 1,
      thickness: 0.08,
      ior: 1.33,
      envMapIntensity: 2.4,
      specularIntensity: 1,
    });
    const im = new THREE.InstancedMesh(geometry, material, count);
    im.frustumCulled = false;
    return im;
  }, [count]);

  const drops = useMemo<Drop[]>(
    () => Array.from({ length: count }, (_, i) => ({ x: 0, y: -10, z: 0, vx: 0, vy: 0, vz: 0, alive: false, next: 1 + i * 0.15, size: 0.02 })),
    [count],
  );
  const random = useMemo(() => rng(31), []);
  const tmp = useMemo(
    () => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(), d: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) }),
    [],
  );

  useEffect(() => () => {
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
    mesh.dispose();
  }, [mesh]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05);
    const active = story.reveal > 0.6 && intro.form > 0.95;
    const r = random;
    const { m, q, p, s, d, up } = tmp;

    drops.forEach((drop, i) => {
      if (!drop.alive && active && t > drop.next) {
        if (r() < 0.65) {
          // a drop gathering under the belly and falling
          const [x, z] = deerToWorld(-0.42 + r() * 0.47, 0.03 + r() * 0.1);
          drop.x = x;
          drop.z = z;
          drop.y = 0.7 + r() * 0.8;
          drop.vx = (r() - 0.5) * 0.15;
          drop.vz = (r() - 0.5) * 0.15;
          drop.vy = -r() * 0.3;
        } else {
          // a splash thrown up around a hoof
          const [hx, hz] = HOOVES[Math.floor(r() * HOOVES.length)];
          const [x, z] = deerToWorld(hx, hz);
          const a = r() * Math.PI * 2;
          const speed = 0.35 + r() * 0.7;
          drop.x = x;
          drop.z = z;
          drop.y = 0.03;
          drop.vx = Math.cos(a) * speed;
          drop.vz = Math.sin(a) * speed;
          drop.vy = 1.3 + r() * 1.5;
        }
        drop.size = 0.016 + r() * 0.026;
        drop.alive = true;
      }

      if (drop.alive) {
        drop.vy -= 5.6 * dt;
        drop.x += drop.vx * dt;
        drop.y += drop.vy * dt;
        drop.z += drop.vz * dt;
        if (drop.y <= 0) {
          drop.alive = false;
          drop.next = t + 0.15 + r() * 1.4;
          splashes.push({ x: drop.x, z: drop.z, t });
          if (splashes.length > 24) splashes.splice(0, splashes.length - 24);
        }
      }

      if (drop.alive) {
        const speed = Math.hypot(drop.vx, drop.vy, drop.vz);
        d.set(drop.vx, drop.vy, drop.vz);
        if (speed > 1e-4) q.setFromUnitVectors(up, d.normalize());
        else q.identity();
        m.compose(p.set(drop.x, drop.y, drop.z), q, s.set(drop.size, drop.size * (1 + Math.min(speed * 0.4, 1.8)), drop.size));
      } else {
        m.compose(p.set(0, -60, 0), q.identity(), s.set(0.0001, 0.0001, 0.0001));
      }
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <primitive object={mesh} />;
}

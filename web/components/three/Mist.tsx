"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { makeCloudTexture } from "./textures";
import { story } from "./story";

interface Puff {
  x: number;
  y: number;
  z: number;
  s: number;
  speed: number;
  base: number;
}

/** Morning mist lying on the mountains and the lake. It clears as the visitor scrolls. */
export default function Mist() {
  const texture = useMemo(() => makeCloudTexture(), []);
  const puffs = useMemo<Puff[]>(() => {
    let seed = 42;
    const r = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const list: Puff[] = [];
    for (let i = 0; i < 16; i++) list.push({ x: -40 + r() * 80, y: 1.5 + r() * 4, z: -46 + r() * 22, s: 14 + r() * 14, speed: 0.15 + r() * 0.25, base: 0.75 + r() * 0.25 });
    for (let i = 0; i < 6; i++) list.push({ x: -12 + r() * 24, y: 0.4 + r() * 0.8, z: -14 + r() * 10, s: 8 + r() * 6, speed: 0.1 + r() * 0.15, base: 0.4 + r() * 0.2 });
    return list;
  }, []);
  const materials = useMemo(
    () => puffs.map(() => new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, opacity: 0, fog: true })),
    [puffs, texture],
  );
  const refs = useRef<(THREE.Sprite | null)[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    puffs.forEach((p, i) => {
      const sprite = refs.current[i];
      if (!sprite) return;
      sprite.position.x = p.x + Math.sin(t * 0.05 * p.speed * 10 + i) * 3;
      materials[i].opacity = p.base * (0.25 + 0.75 * story.mist);
    });
  });

  return (
    <group>
      {puffs.map((p, i) => (
        <sprite
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          material={materials[i]}
          position={[p.x, p.y, p.z]}
          scale={[p.s, p.s * 0.45, 1]}
          renderOrder={2}
        />
      ))}
    </group>
  );
}

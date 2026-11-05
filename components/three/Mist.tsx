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

/** Evening haze in the valley and over the lake. It thins as the visitor scrolls. */
export default function Mist() {
  const texture = useMemo(() => makeCloudTexture(), []);
  const puffs = useMemo<Puff[]>(() => {
    let seed = 42;
    const r = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const list: Puff[] = [];
    // haze in the valley, catching the low sun
    for (let i = 0; i < 14; i++) list.push({ x: -70 + r() * 140, y: 3 + r() * 6, z: -110 + r() * 50, s: 30 + r() * 24, speed: 0.15 + r() * 0.25, base: 0.1 + r() * 0.1 });
    // thin breath of mist over the far side of the lake
    for (let i = 0; i < 6; i++) list.push({ x: -14 + r() * 32, y: 0.35 + r() * 0.6, z: -46 + r() * 9, s: 9 + r() * 7, speed: 0.1 + r() * 0.15, base: 0.12 + r() * 0.1 });
    return list;
  }, []);
  const materials = useMemo(
    () => puffs.map(() => new THREE.SpriteMaterial({ map: texture, color: "#fff0da", transparent: true, depthWrite: false, opacity: 0, fog: false })),
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

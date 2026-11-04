"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { STATES, pointer, story } from "./story";

/** Eases the camera towards the story state and keeps the subject clear of the text column. */
export default function CameraRig({ reduceMotion }: { reduceMotion: boolean }) {
  const { camera, size } = useThree();
  const look = useMemo(() => new THREE.Vector3(STATES.hero.lx, STATES.hero.ly, STATES.hero.lz), []);
  const goalPos = useMemo(() => new THREE.Vector3(), []);
  const goalLook = useMemo(() => new THREE.Vector3(), []);
  const shift = useRef({ x: STATES.hero.shift, y: 0 });

  useFrame((_, delta) => {
    const mobile = size.width < 768;
    const aspect = size.width / size.height;
    goalLook.set(story.lx, story.ly, story.lz);
    goalPos.set(story.cx, story.cy, story.cz);
    // pull back on narrow screens so the whole stag fits
    if (aspect < 1.25) goalPos.sub(goalLook).multiplyScalar(Math.min(2.3, 1.4 / aspect)).add(goalLook);
    if (!mobile && !reduceMotion) {
      goalPos.x += pointer.x * 0.4;
      goalPos.y += pointer.y * 0.22;
    }
    const k = reduceMotion ? 1 : 1 - Math.exp(-delta * 2.4);
    camera.position.lerp(goalPos, k);
    look.lerp(goalLook, k);
    camera.lookAt(look);
    shift.current.x += ((mobile ? 0 : story.shift) - shift.current.x) * k;
    shift.current.y += ((mobile ? story.my : 0) - shift.current.y) * k;
    const cam = camera as THREE.PerspectiveCamera;
    cam.setViewOffset(size.width, size.height, -shift.current.x * size.width, shift.current.y * size.height, size.width, size.height);
  });

  return null;
}

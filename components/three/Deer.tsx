"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { DEER_SCALE, DEER_XF, POSE_TIME, intro, story } from "./story";
import { makeRippleNormalMap } from "./textures";

const MODEL = "/models/deer.glb";
const BLUE = new THREE.Color("#2f8fd1");
const AMBER = new THREE.Color("#e39a5c");

/**
 * The stag as clear blue water: a transmissive, refractive body with moving ripples on its skin.
 * A clipping plane lets it rise out of the lake (intro) and sink back into it (scroll).
 */
export default function Deer() {
  const { scene, animations } = useGLTF(MODEL, false, true);
  const { actions, names, mixer } = useAnimations(animations, scene);

  const clip = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), []);
  const normalMap = useMemo(() => makeRippleNormalMap(), []);
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#dcf2ff"),
        transmission: 1,
        thickness: 0.9,
        ior: 1.33,
        roughness: 0.08,
        metalness: 0,
        attenuationColor: BLUE.clone(),
        attenuationDistance: 1.4,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        specularIntensity: 1,
        envMapIntensity: 1.35,
        normalMap,
        normalScale: new THREE.Vector2(0.35, 0.35),
        emissive: new THREE.Color("#7fd4ff"),
        emissiveIntensity: 0,
        clippingPlanes: [clip],
      }),
    [clip, normalMap],
  );

  useEffect(() => {
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.material = material;
      mesh.frustumCulled = false;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
    });
    const action = names[0] ? actions[names[0]] : null;
    if (action) {
      action.reset().play();
      action.time = POSE_TIME;
      mixer.update(0);
    }
    return () => {
      action?.stop();
    };
  }, [scene, material, actions, names, mixer]);

  useEffect(() => () => {
    material.dispose();
    normalMap.dispose();
  }, [material, normalMap]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // how much of the stag stands above the water
    const rise = THREE.MathUtils.smoothstep(intro.form, 0.3, 1);
    const fraction = Math.min(rise, story.reveal);
    clip.constant = fraction * (DEER_SCALE + 0.2) - 0.02;
    // living water on its skin
    normalMap.offset.set(Math.sin(t * 0.11) * 0.06, (t * 0.035) % 1);
    // wounded: warmer, denser water; healing: an inner glow
    material.attenuationColor.copy(BLUE).lerp(AMBER, story.wound * 0.75);
    material.attenuationDistance = 1.4 - story.wound * 0.6;
    material.emissiveIntensity = story.heal * (0.22 + 0.14 * Math.sin(t * 2.4));
  });

  return (
    <group scale={DEER_SCALE / DEER_XF.H}>
      <group position={[-DEER_XF.cx, -DEER_XF.minY, -DEER_XF.cz]}>
        <group rotation-y={DEER_XF.ang}>
          <primitive object={scene} />
        </group>
      </group>
    </group>
  );
}

useGLTF.preload(MODEL, false, true);

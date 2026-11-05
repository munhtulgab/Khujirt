"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { DEER_SCALE, DEER_XF, POSE_TIME, intro, story } from "./story";
import { makeRippleNormalMap } from "./textures";

const MODEL = "/models/deer.glb";
const CLEAR = new THREE.Color("#9fd9d2");
const AMBER = new THREE.Color("#e39a5c");

/**
 * The stag as clear water, like glass: a transmissive, refractive body with moving ripples on its skin.
 * A clipping plane lets it rise out of the lake (intro) and sink back into it (scroll).
 */
export default function Deer() {
  const { scene, animations } = useGLTF(MODEL, false, true);
  const { actions, names, mixer } = useAnimations(animations, scene);

  const clip = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), []);
  const rim = useMemo(() => ({ value: new THREE.Color("#fff1dc").multiplyScalar(0.85) }), []);
  const normalMap = useMemo(() => makeRippleNormalMap(), []);
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#ffffff"),
        transmission: 1,
        thickness: 2.4,
        ior: 1.45,
        roughness: 0.025,
        metalness: 0,
        attenuationColor: CLEAR.clone(),
        attenuationDistance: 1.7,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        specularIntensity: 1,
        specularColor: new THREE.Color("#fff6e8"),
        dispersion: 0.3,
        envMapIntensity: 2.6,
        normalMap,
        normalScale: new THREE.Vector2(0.14, 0.14),
        emissive: new THREE.Color("#9fe3ff"),
        emissiveIntensity: 0,
        clippingPlanes: [clip],
      }),
    [clip, normalMap],
  );

  // Bright contour where the glass turns away from the eye, as light gathers at the edges of water.
  useEffect(() => {
    material.customProgramCacheKey = () => "deer-rim";
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uRim = rim;
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform vec3 uRim;")
        .replace(
          "#include <opaque_fragment>",
          `float facing = clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0);
          outgoingLight += uRim.value * pow(1.0 - facing, 2.6);
          #include <opaque_fragment>`.replace("uRim.value", "uRim"),
        );
    };
    material.needsUpdate = true;
  }, [material, rim]);

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
    material.attenuationColor.copy(CLEAR).lerp(AMBER, story.wound * 0.75);
    material.attenuationDistance = 1.7 - story.wound * 0.9;
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

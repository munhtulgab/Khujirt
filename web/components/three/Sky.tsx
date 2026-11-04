"use client";

import { useMemo } from "react";
import * as THREE from "three";

/** Soft morning sky: clear blue overhead, a pale glowing horizon and a hint of sun. */
export default function Sky() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTop: { value: new THREE.Color("#7cc0ec") },
          uHorizon: { value: new THREE.Color("#eef8fe") },
          uBottom: { value: new THREE.Color("#d3ebf9") },
          uSun: { value: new THREE.Vector3(0.55, 0.35, -0.75).normalize() },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_Position = p.xyww;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uTop, uHorizon, uBottom, uSun;
          varying vec3 vDir;
          void main() {
            float h = vDir.y;
            vec3 col = h > 0.0 ? mix(uHorizon, uTop, pow(h, 0.55)) : mix(uHorizon, uBottom, pow(-h, 0.4));
            float sun = max(dot(normalize(vDir), uSun), 0.0);
            col += vec3(1.0, 0.93, 0.8) * (pow(sun, 18.0) * 0.35 + pow(sun, 400.0) * 0.6);
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }
        `,
        toneMapped: false,
      }),
    [],
  );
  return (
    <mesh renderOrder={-10} frustumCulled={false} material={material}>
      <sphereGeometry args={[200, 48, 24]} />
    </mesh>
  );
}

import * as THREE from "three";
import React, { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

type Props = {
  target: React.RefObject<THREE.Object3D | null>;
  fadeOpacity?: number; // target opacity when occluding
  fadeSpeed?: number; // higher = faster fade
};

function isDescendantOf(obj: THREE.Object3D, ancestor: THREE.Object3D) {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    if (cur === ancestor) return true;
    cur = cur.parent;
  }
  return false;
}

export default function OcclusionFader({
  target,
  fadeOpacity = 0.12,
  fadeSpeed = 6,
}: Props) {
  const { camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const tracked = useRef(
    new Map<
      THREE.Mesh,
      {
        targetOpacity: number;
        original?: {
          transparent: boolean;
          opacity: number;
          depthWrite: boolean;
        };
      }
    >()
  );

  useFrame((_, delta) => {
    const targetObj = target.current;
    if (!targetObj) return;

    const from = new THREE.Vector3();
    const to = new THREE.Vector3();
    camera.getWorldPosition(from);
    targetObj.getWorldPosition(to);
    const dir = new THREE.Vector3().subVectors(to, from);
    const dist = dir.length();
    if (dist < 0.001) return;
    dir.normalize();

    const rc = raycaster.current;
    rc.set(from, dir);
    rc.far = dist - 0.01;
    const hits = rc.intersectObjects(scene.children, true);

    const occludingMeshes = new Set<THREE.Mesh>();
    for (const hit of hits) {
      const obj = hit.object;
      if (!(obj instanceof THREE.Mesh)) continue;
      if (isDescendantOf(obj, targetObj)) continue; // don't fade the character itself
      occludingMeshes.add(obj);
    }

    occludingMeshes.forEach((mesh) => {
      const entry = tracked.current.get(mesh) || { targetOpacity: 1 };
      entry.targetOpacity = fadeOpacity;
      // Clone and store original material state if first time
      if (!entry.original) {
        const mat = mesh.material as THREE.Material;
        entry.original = {
          transparent: (mat as any).transparent ?? false,
          opacity: (mat as any).opacity ?? 1,
          depthWrite: (mat as any).depthWrite ?? true,
        };
        // Clone material to avoid affecting shared instances
        mesh.material = mat.clone();
      }
      tracked.current.set(mesh, entry);
    });

    // Any tracked mesh not in current occluders should restore to opacity 1
    tracked.current.forEach((entry, mesh) => {
      if (!occludingMeshes.has(mesh)) {
        entry.targetOpacity = 1;
      }
    });

    // Animate fades
    const lerpA = 1 - Math.exp(-fadeSpeed * delta);
    tracked.current.forEach((entry, mesh) => {
      const mat = mesh.material as unknown as THREE.Material & {
        opacity: number;
        transparent: boolean;
        depthWrite: boolean;
      };
      if (!mat) return;
      // Ensure blending enabled while fading
      mat.transparent = true;
      // Lerp toward target opacity
      mat.opacity = THREE.MathUtils.lerp(
        mat.opacity ?? 1,
        entry.targetOpacity,
        lerpA
      );
      // Disable depthWrite while faded so the character remains visible
      mat.depthWrite =
        mat.opacity >= 0.99 ? entry.original?.depthWrite ?? true : false;

      // When fully restored, clean up and restore original flags
      if (entry.targetOpacity === 1 && mat.opacity >= 0.99) {
        mat.opacity = entry.original?.opacity ?? 1;
        mat.transparent = entry.original?.transparent ?? false;
        mat.depthWrite = entry.original?.depthWrite ?? true;
        tracked.current.delete(mesh);
      }
    });
  });

  return null;
}

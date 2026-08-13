import type * as THREE from 'three';

// Static-matrix freeze. Three r165 recomposes every Object3D's local matrix and
// re-multiplies its world matrix EVERY frame while matrixAutoUpdate is true (the
// default); on this scene that is thousands of never-moving prop/terrain nodes
// paying real per-frame CPU (updateMatrixWorld + multiplyMatrices dominate the
// walk profile). Freezing a fully-built static subtree computes its world
// matrices once and stops the per-frame churn. Children ADDED to a frozen
// parent later keep their default auto-update and compose against the parent's
// (already final) matrixWorld, so lazily-streamed content under a frozen root
// still behaves normally.
//
// Contract for callers: only freeze a subtree whose node TRANSFORMS never
// change after build (visibility toggles, uniform animation, and attribute
// rewrites are all fine; they do not touch the matrix). Any transform-animated
// descendant (campfire flames) must be re-enabled by the caller right after
// the freeze: `node.matrixAutoUpdate = true`.
export function freezeStaticMatrices(root: THREE.Object3D): void {
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    o.matrixAutoUpdate = false;
  });
}

/**
 * Freeze a subtree whose complete membership and transforms are final.
 *
 * matrixAutoUpdate=false avoids local recomposition, but Three still descends
 * into that object on every scene update. Disabling matrixWorldAutoUpdate on
 * the subtree root lets the parent scene skip the whole static branch. Callers
 * must not add transform-bearing descendants after this stronger freeze.
 */
export function freezeStaticSubtreeMatrices(root: THREE.Object3D): void {
  freezeStaticMatrices(root);
  root.matrixWorldAutoUpdate = false;
}

/**
 * Write an Object3D's local transform into `matrixWorld` when the object has
 * opted out of auto world-matrix refresh (`matrixWorldAutoUpdate = false`).
 *
 * Three r165's `updateMatrixWorld` / `updateWorldMatrix` only copy into
 * `matrixWorld` when `matrixWorldAutoUpdate === true`. Calling them on a
 * manually-managed camera therefore leaves `matrixWorld` at identity forever:
 * the chase view sticks at the boot pose (the v0.33 camera freeze). After every
 * pose write on such an object, call this instead of `updateMatrixWorld()`.
 */
export function commitManualMatrixWorld(obj: THREE.Object3D): void {
  if (obj.matrixAutoUpdate) obj.updateMatrix();
  if (obj.parent === null) {
    obj.matrixWorld.copy(obj.matrix);
  } else {
    obj.matrixWorld.multiplyMatrices(obj.parent.matrixWorld, obj.matrix);
  }
  obj.matrixWorldNeedsUpdate = false;
}

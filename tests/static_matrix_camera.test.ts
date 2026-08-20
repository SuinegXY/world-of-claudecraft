import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { lookAtFrozen, refreshFrozenWorldMatrix } from '../src/render/static_matrix';

// Three r185: updateMatrixWorld gates the node's OWN compose on
// matrixWorldAutoUpdate. A plain updateMatrixWorld / lookAt on a frozen camera
// no longer writes matrixWorld; refreshFrozenWorldMatrix / lookAtFrozen restore
// the explicit-refresh contract the chase camera needs.

describe('refreshFrozenWorldMatrix / lookAtFrozen (r185)', () => {
  it('writes matrixWorld after a pose change when matrixWorldAutoUpdate is false', () => {
    const cam = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    cam.matrixWorldAutoUpdate = false;
    cam.position.set(10, 4, -6);

    // The broken path under r185: updateMatrixWorld clears the dirty bit without
    // composing, so the view would stick at identity.
    cam.updateMatrixWorld();
    expect(cam.matrixWorld.elements[12]).toBe(0);
    expect(cam.matrixWorld.elements[13]).toBe(0);
    expect(cam.matrixWorld.elements[14]).toBe(0);

    refreshFrozenWorldMatrix(cam);
    expect(cam.matrixWorld.elements[12]).toBeCloseTo(10, 5);
    expect(cam.matrixWorld.elements[13]).toBeCloseTo(4, 5);
    expect(cam.matrixWorld.elements[14]).toBeCloseTo(-6, 5);
  });

  it('keeps matrixWorld in sync across successive pose writes', () => {
    const cam = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    cam.matrixWorldAutoUpdate = false;
    cam.position.set(1, 2, 3);
    refreshFrozenWorldMatrix(cam);
    cam.position.set(7, 8, 9);
    refreshFrozenWorldMatrix(cam);
    expect(cam.matrixWorld.elements[12]).toBeCloseTo(7, 5);
    expect(cam.matrixWorld.elements[13]).toBeCloseTo(8, 5);
    expect(cam.matrixWorld.elements[14]).toBeCloseTo(9, 5);
  });

  it('aims from the current position under a frozen matrixWorld flag', () => {
    const cam = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    cam.matrixWorldAutoUpdate = false;
    cam.position.set(10, 4, -6);
    lookAtFrozen(cam, new THREE.Vector3(2, 3, -2));
    expect(cam.matrixWorld.elements[12]).toBeCloseTo(10, 5);
    expect(cam.matrixWorld.elements[13]).toBeCloseTo(4, 5);
    expect(cam.matrixWorld.elements[14]).toBeCloseTo(-6, 5);
    // lookAt must have left a non-identity orientation (element 0 alone is not
    // enough: prove the forward axis points roughly toward the target).
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    const toTarget = new THREE.Vector3(2 - 10, 3 - 4, -2 - -6).normalize();
    expect(forward.dot(toTarget)).toBeGreaterThan(0.99);
  });
});

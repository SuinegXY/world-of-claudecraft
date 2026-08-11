import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { commitManualMatrixWorld } from '../src/render/static_matrix';

// Three r165: updateMatrixWorld does not write matrixWorld when
// matrixWorldAutoUpdate is false. The v0.33 chase-camera freeze was exactly
// that: pose writes looked correct on camera.position, but the renderer kept
// sampling the boot identity matrixWorld.

describe('commitManualMatrixWorld', () => {
  it('writes matrixWorld after a pose change when matrixWorldAutoUpdate is false', () => {
    const cam = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    cam.matrixWorldAutoUpdate = false;
    cam.position.set(10, 4, -6);
    cam.lookAt(2, 3, -2);

    // The broken path the v0.33 overhaul used: updateMatrixWorld is a no-op for
    // matrixWorld under the flag, so the view would stick at identity.
    cam.updateMatrixWorld();
    expect(cam.matrixWorld.elements[12]).toBe(0);
    expect(cam.matrixWorld.elements[13]).toBe(0);
    expect(cam.matrixWorld.elements[14]).toBe(0);

    commitManualMatrixWorld(cam);
    expect(cam.matrixWorld.elements[12]).toBeCloseTo(10, 5);
    expect(cam.matrixWorld.elements[13]).toBeCloseTo(4, 5);
    expect(cam.matrixWorld.elements[14]).toBeCloseTo(-6, 5);
  });

  it('keeps matrixWorld in sync across successive pose writes', () => {
    const cam = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    cam.matrixWorldAutoUpdate = false;
    cam.position.set(1, 2, 3);
    commitManualMatrixWorld(cam);
    cam.position.set(7, 8, 9);
    commitManualMatrixWorld(cam);
    expect(cam.matrixWorld.elements[12]).toBeCloseTo(7, 5);
    expect(cam.matrixWorld.elements[13]).toBeCloseTo(8, 5);
    expect(cam.matrixWorld.elements[14]).toBeCloseTo(9, 5);
  });
});

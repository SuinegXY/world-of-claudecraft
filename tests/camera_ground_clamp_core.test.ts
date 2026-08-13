import { describe, expect, it } from 'vitest';
import {
  CAM_PITCH_MIN,
  cameraOrbitPoint,
  chaseCameraFloorY,
  clampChaseCameraToGround,
  pitchToClearFloor,
  RAISED_PAD_CLEARANCE,
  RAISED_PAD_DROP,
} from '../src/render/camera_ground_clamp_core';

describe('cameraOrbitPoint', () => {
  it('matches the classic chase orbit at default pitch', () => {
    const p = cameraOrbitPoint(Math.PI, 0.32, 12, 0, 2, 0);
    expect(p.x).toBeCloseTo(0 - Math.sin(Math.PI) * Math.cos(0.32) * 12, 6);
    expect(p.y).toBeCloseTo(2 + Math.sin(0.32) * 12, 6);
    expect(p.z).toBeCloseTo(0 - Math.cos(Math.PI) * Math.cos(0.32) * 12, 6);
  });
});

describe('pitchToClearFloor', () => {
  it('returns null when the orbit already clears', () => {
    expect(pitchToClearFloor(3.5, 12, 2.1, 0.32)).toBeNull();
  });

  it('lifts a worm-eye pitch so the orbit meets the floor', () => {
    const eyeY = 3.5;
    const dist = 12;
    const floorY = 2.1;
    const lifted = pitchToClearFloor(eyeY, dist, floorY, CAM_PITCH_MIN);
    expect(lifted).not.toBeNull();
    expect(lifted!).toBeGreaterThan(CAM_PITCH_MIN);
    expect(eyeY + Math.sin(lifted!) * dist).toBeGreaterThanOrEqual(floorY - 1e-6);
  });
});

describe('chaseCameraFloorY', () => {
  it('keeps the terrain floor on flat ground', () => {
    expect(chaseCameraFloorY(2.1, 1.5)).toBe(2.1);
  });

  it('raises the floor under a raised pad the terrain sample misses', () => {
    const feetY = 8;
    const terrainFloor = 1.5;
    expect(feetY + RAISED_PAD_CLEARANCE - terrainFloor).toBeGreaterThan(RAISED_PAD_DROP);
    expect(chaseCameraFloorY(terrainFloor, feetY)).toBe(feetY + RAISED_PAD_CLEARANCE);
  });
});

describe('clampChaseCameraToGround', () => {
  it('passes the orbit through when clear of the floor', () => {
    const r = clampChaseCameraToGround({
      yaw: Math.PI,
      pitch: 0.32,
      dist: 12,
      pivotX: 0,
      eyeY: 3.5,
      pivotZ: 0,
      feetY: 1.5,
      floorAt: () => 2.1,
    });
    expect(r.lifted).toBe(false);
    expect(r.pitch).toBe(0.32);
    expect(r.y).toBeGreaterThan(2.1);
  });

  it('lifts pitch out of a worm-eye trap and writes a clear orbit', () => {
    const r = clampChaseCameraToGround({
      yaw: Math.PI,
      pitch: CAM_PITCH_MIN,
      dist: 12,
      pivotX: 0,
      eyeY: 3.5,
      pivotZ: 0,
      feetY: 1.5,
      floorAt: () => 2.1,
    });
    expect(r.lifted).toBe(true);
    expect(r.pitch).toBeGreaterThan(CAM_PITCH_MIN);
    expect(r.y).toBeGreaterThanOrEqual(2.1 - 1e-4);
  });

  it('will not sit under a raised pad when the cam sample is the low terrain', () => {
    const feetY = 8;
    const r = clampChaseCameraToGround({
      yaw: Math.PI,
      pitch: CAM_PITCH_MIN,
      dist: 12,
      pivotX: 0,
      eyeY: feetY + 2,
      pivotZ: 0,
      feetY,
      floorAt: () => 1.5, // terrain under the lens, not the pad
    });
    expect(r.y).toBeGreaterThanOrEqual(feetY + RAISED_PAD_CLEARANCE - 1e-4);
    expect(r.lifted).toBe(true);
  });
});

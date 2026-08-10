import { describe, expect, it } from 'vitest';

import {
  DEFAULT_CAMERA_OFFSET,
  DEFAULT_POINTER_SENSITIVITY,
  cameraOffsetFromUniform,
  computePointerUniform,
} from './pointerCamera';

/**
 * Tests for the pointer-to-camera mapping.
 *
 * These assert the resulting camera angle in radians rather than raw pixels,
 * because the angle is the thing that was actually wrong: the unmapped shader
 * swung roughly +/-0.9 rad of yaw across a widescreen viewport.
 */

// A representative 16:9 backing store.
const W = 1280;
const H = 720;
const ASPECT = W / H;

describe('computePointerUniform', () => {
  it('rests at the shader default when the pointer is centred', () => {
    const uniform = computePointerUniform(0.5, 0.5, W, H);
    const { yaw, pitch } = cameraOffsetFromUniform(uniform, W, H);

    // Centre must reproduce the shader's own no-mouse default, so the view does
    // not jump when the pointer first moves.
    expect(yaw).toBeCloseTo(DEFAULT_CAMERA_OFFSET.x * ASPECT, 5);
    expect(pitch).toBeCloseTo(DEFAULT_CAMERA_OFFSET.y, 5);
  });

  it('keeps total yaw travel within the sensitivity budget', () => {
    const left = cameraOffsetFromUniform(computePointerUniform(0, 0.5, W, H), W, H);
    const right = cameraOffsetFromUniform(computePointerUniform(1, 0.5, W, H), W, H);

    const travel = Math.abs(right.yaw - left.yaw);
    expect(travel).toBeCloseTo(DEFAULT_POINTER_SENSITIVITY, 4);
  });

  it('keeps total pitch travel within the sensitivity budget', () => {
    const top = cameraOffsetFromUniform(computePointerUniform(0.5, 0, W, H), W, H);
    const bottom = cameraOffsetFromUniform(computePointerUniform(0.5, 1, W, H), W, H);

    const travel = Math.abs(top.pitch - bottom.pitch);
    expect(travel).toBeCloseTo(DEFAULT_POINTER_SENSITIVITY, 4);
  });

  it('makes both axes equally sensitive despite the shader aspect multiply', () => {
    const left = cameraOffsetFromUniform(computePointerUniform(0, 0.5, W, H), W, H);
    const right = cameraOffsetFromUniform(computePointerUniform(1, 0.5, W, H), W, H);
    const top = cameraOffsetFromUniform(computePointerUniform(0.5, 0, W, H), W, H);
    const bottom = cameraOffsetFromUniform(computePointerUniform(0.5, 1, W, H), W, H);

    const yawTravel = Math.abs(right.yaw - left.yaw);
    const pitchTravel = Math.abs(top.pitch - bottom.pitch);

    // Without the aspect pre-division, yaw travel would be ~1.78x pitch travel.
    expect(yawTravel).toBeCloseTo(pitchTravel, 4);
  });

  it('is far calmer than feeding raw pointer pixels', () => {
    // Raw Shadertoy behaviour: iMouse = pointer pixels directly.
    const rawLeft = cameraOffsetFromUniform({ x: 0, y: H / 2 }, W, H);
    const rawRight = cameraOffsetFromUniform({ x: W, y: H / 2 }, W, H);
    const rawTravel = Math.abs(rawRight.yaw - rawLeft.yaw);

    const left = cameraOffsetFromUniform(computePointerUniform(0, 0.5, W, H), W, H);
    const right = cameraOffsetFromUniform(computePointerUniform(1, 0.5, W, H), W, H);
    const mappedTravel = Math.abs(right.yaw - left.yaw);

    // The raw mapping spans ~1.78 rad of yaw; the mapped one must be a fraction.
    expect(rawTravel).toBeGreaterThan(1.7);
    expect(mappedTravel).toBeLessThan(rawTravel / 4);
  });

  it('moves the camera in the direction of the pointer', () => {
    const left = cameraOffsetFromUniform(computePointerUniform(0.1, 0.5, W, H), W, H);
    const right = cameraOffsetFromUniform(computePointerUniform(0.9, 0.5, W, H), W, H);
    expect(right.yaw).toBeGreaterThan(left.yaw);

    // Pointer nearer the top of the window raises the pitch (GL y is flipped).
    const top = cameraOffsetFromUniform(computePointerUniform(0.5, 0.1, W, H), W, H);
    const bottom = cameraOffsetFromUniform(computePointerUniform(0.5, 0.9, W, H), W, H);
    expect(top.pitch).toBeGreaterThan(bottom.pitch);
  });

  it('never returns (0,0), which the shader treats as "no pointer"', () => {
    // Sweep the viewport, including an absurd sensitivity, and the corners.
    for (const sensitivity of [0.3, 1, 4, 20]) {
      for (const nx of [0, 0.25, 0.5, 0.75, 1]) {
        for (const ny of [0, 0.25, 0.5, 0.75, 1]) {
          const u = computePointerUniform(nx, ny, W, H, sensitivity);
          expect(u.x === 0 && u.y === 0).toBe(false);
        }
      }
    }
  });

  it('clamps a pointer that leaves the viewport', () => {
    const past = cameraOffsetFromUniform(computePointerUniform(1.8, -0.6, W, H), W, H);
    const edge = cameraOffsetFromUniform(computePointerUniform(1, 0, W, H), W, H);

    expect(past.yaw).toBeCloseTo(edge.yaw, 5);
    expect(past.pitch).toBeCloseTo(edge.pitch, 5);
  });

  it('respects a custom sensitivity', () => {
    const calm = cameraOffsetFromUniform(
      computePointerUniform(1, 0.5, W, H, 0.1),
      W,
      H,
    );
    const lively = cameraOffsetFromUniform(
      computePointerUniform(1, 0.5, W, H, 0.6),
      W,
      H,
    );
    const centre = DEFAULT_CAMERA_OFFSET.x * ASPECT;

    expect(Math.abs(calm.yaw - centre)).toBeLessThan(Math.abs(lively.yaw - centre));
  });

  it('survives degenerate viewport sizes', () => {
    const u = computePointerUniform(0.5, 0.5, 0, 0);
    expect(Number.isFinite(u.x)).toBe(true);
    expect(Number.isFinite(u.y)).toBe(true);
  });

  it('handles a NaN pointer without producing NaN output', () => {
    const u = computePointerUniform(Number.NaN, Number.NaN, W, H);
    expect(Number.isFinite(u.x)).toBe(true);
    expect(Number.isFinite(u.y)).toBe(true);
  });

  it('keeps portrait viewports equally balanced', () => {
    // Portrait inverts the aspect ratio, so the correction must work both ways.
    const pw = 720;
    const ph = 1280;
    const left = cameraOffsetFromUniform(computePointerUniform(0, 0.5, pw, ph), pw, ph);
    const right = cameraOffsetFromUniform(computePointerUniform(1, 0.5, pw, ph), pw, ph);
    const top = cameraOffsetFromUniform(computePointerUniform(0.5, 0, pw, ph), pw, ph);
    const bottom = cameraOffsetFromUniform(computePointerUniform(0.5, 1, pw, ph), pw, ph);

    expect(Math.abs(right.yaw - left.yaw)).toBeCloseTo(
      Math.abs(top.pitch - bottom.pitch),
      4,
    );
  });
});

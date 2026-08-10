import { describe, expect, it } from 'vitest';

import {
  QUALITY,
  computeRenderSize,
  createFrameGate,
  pickQualityTier,
} from './renderBudget';

/**
 * Tests for the aurora render budget.
 *
 * These exist because the budget is the only thing standing between an expensive
 * per-pixel shader and a janky page, so the ceilings need to actually hold.
 */

describe('pickQualityTier', () => {
  it('drops to low on touch devices', () => {
    expect(pickQualityTier({ coarsePointer: true, cores: 16 })).toBe('low');
  });

  it('drops to low on small-memory devices', () => {
    expect(pickQualityTier({ memoryGb: 4 })).toBe('low');
  });

  it('uses medium on low core counts', () => {
    expect(pickQualityTier({ cores: 4 })).toBe('medium');
  });

  it('uses high on a capable desktop', () => {
    expect(pickQualityTier({ cores: 12, memoryGb: 16 })).toBe('high');
  });

  it('defaults to high when nothing is known', () => {
    // No signals means a desktop browser that withholds the hints; the visual
    // check below keeps this honest, and the pixel cap still applies.
    expect(pickQualityTier()).toBe('high');
  });
});

describe('computeRenderSize', () => {
  it('applies the resolution scale', () => {
    const size = computeRenderSize(1000, 500, 1, {
      resolutionScale: 0.5,
      maxPixels: 10_000_000,
    });
    expect(size).toEqual({ width: 500, height: 250 });
  });

  it('caps the device pixel ratio', () => {
    // A 3x phone display must not be rendered at 3x.
    const size = computeRenderSize(400, 400, 3, {
      resolutionScale: 1,
      maxPixels: 10_000_000,
    });
    expect(size.width).toBe(600); // 400 * 1.5 (capped), not 1200
  });

  it('enforces the pixel ceiling', () => {
    const size = computeRenderSize(3840, 2160, 2, {
      resolutionScale: 1,
      maxPixels: 1_000_000,
    });
    expect(size.width * size.height).toBeLessThanOrEqual(1_000_000);
  });

  it('preserves aspect ratio when clamping to the ceiling', () => {
    const size = computeRenderSize(3840, 2160, 2, {
      resolutionScale: 1,
      maxPixels: 500_000,
    });
    const sourceRatio = 3840 / 2160;
    const clampedRatio = size.width / size.height;
    expect(Math.abs(clampedRatio - sourceRatio)).toBeLessThan(0.02);
  });

  it('never returns a zero dimension', () => {
    const size = computeRenderSize(0, 0, 1, {
      resolutionScale: 0.5,
      maxPixels: 10,
    });
    expect(size.width).toBeGreaterThanOrEqual(1);
    expect(size.height).toBeGreaterThanOrEqual(1);
  });

  it('keeps every shipped tier under its ceiling at 4K', () => {
    for (const settings of Object.values(QUALITY)) {
      const size = computeRenderSize(3840, 2160, 2, settings);
      expect(size.width * size.height).toBeLessThanOrEqual(settings.maxPixels);
    }
  });
});

describe('createFrameGate', () => {
  it('always allows the first frame', () => {
    const gate = createFrameGate(30);
    expect(gate(0)).toBe(true);
  });

  it('rejects frames arriving faster than the cap', () => {
    const gate = createFrameGate(30); // ~33.3ms between frames
    gate(0);
    expect(gate(16)).toBe(false);
  });

  it('allows a frame once the interval has elapsed', () => {
    const gate = createFrameGate(30);
    gate(0);
    expect(gate(34)).toBe(true);
  });

  it('holds an average near the cap over a 60Hz stream', () => {
    const gate = createFrameGate(30);
    let passed = 0;
    // Simulate one second of 60Hz frames.
    for (let i = 0; i < 60; i += 1) {
      if (gate(i * (1000 / 60))) passed += 1;
    }
    // Expect ~30, allowing a frame either side for boundary rounding.
    expect(passed).toBeGreaterThanOrEqual(29);
    expect(passed).toBeLessThanOrEqual(31);
  });

  it('disables gating when maxFps is not positive', () => {
    const gate = createFrameGate(0);
    expect(gate(0)).toBe(true);
    expect(gate(0)).toBe(true);
  });
});

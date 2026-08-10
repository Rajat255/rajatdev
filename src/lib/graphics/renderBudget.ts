/**
 * Pure render-budget helpers for the WebGL aurora background.
 *
 * The aurora shader is expensive per pixel (roughly 250 noise evaluations per
 * fragment per frame), so it is never rendered at native resolution or at the
 * display's full refresh rate. These helpers own that arithmetic and are kept
 * free of DOM and WebGL access so the budgeting rules are unit-testable.
 */

/** Quality tiers. Lower tiers trade visual density for GPU headroom. */
export type QualityTier = 'high' | 'medium' | 'low';

export interface QualitySettings {
  /** Fraction of the CSS pixel size actually rendered, then upscaled by CSS. */
  resolutionScale: number;
  /** Hard ceiling on rendered pixels, so a 4K or 5K display cannot melt. */
  maxPixels: number;
  /** Raymarch step count compiled into the shader. */
  steps: number;
  /** Frame-rate cap. The aurora drifts slowly, so 30fps reads as smooth. */
  maxFps: number;
}

/**
 * Settings per tier.
 *
 * GPU cost per second is roughly `pixels x steps x fps`.
 *
 * These are deliberately set to run the effect at full quality on anything that
 * is not a phone. Worth being clear about where that cost lands: it is paid by
 * the visitor's GPU on every frame, not by the server delivering the page. A
 * beefier host makes no difference to how smoothly this renders.
 *
 * The knobs are not equivalent for looks:
 *
 * - `resolutionScale` and `maxPixels` are the only ones affecting sharpness. The
 *   aurora is a soft, low-frequency field that survives upscaling, but stars are
 *   single-pixel detail that does not; below roughly 0.8x of CSS resolution they
 *   smear, and at any sub-native scale they alias as the view moves.
 * - `steps` and `maxFps` are close to free visually. Per-step contribution decays
 *   as `exp2(-i * 0.065)`, so steps past ~26 add light that is hard to see.
 *
 * If a machine struggles, the knob to turn first is `maxFps` (60 to 30 halves the
 * cost for very little perceived change), then `steps`. Drop `resolutionScale`
 * last, because that is the one that makes the stars mushy.
 */
export const QUALITY: Record<QualityTier, QualitySettings> = {
  // Native resolution, the original step count, and an uncapped frame rate.
  // `maxPixels` is high enough that a 1440p or 1600p laptop renders 1:1 and only
  // 4K-and-above panels get scaled back, where the shader's softness means the
  // downscale is invisible anyway.
  high: { resolutionScale: 1, maxPixels: 5_300_000, steps: 48, maxFps: 60 },
  medium: { resolutionScale: 0.85, maxPixels: 3_000_000, steps: 40, maxFps: 60 },
  // Touch devices only. Phones are thermally limited and on a battery, and this
  // is decoration, so this tier stays conservative.
  low: { resolutionScale: 0.6, maxPixels: 1_000_000, steps: 26, maxFps: 30 },
};

export interface DeviceProfile {
  /** `navigator.hardwareConcurrency`, when available. */
  cores?: number;
  /** True when the primary pointer is coarse (touch), used as a phone proxy. */
  coarsePointer?: boolean;
  /** `navigator.deviceMemory`-style hint in GB, when available. */
  memoryGb?: number;
}

/**
 * Picks a quality tier from coarse device signals.
 *
 * There is no reliable way to measure GPU capability up front, so this leans on
 * proxies and deliberately errs low: an unnecessarily soft background is a much
 * better failure mode than a janky one.
 */
export function pickQualityTier(profile: DeviceProfile = {}): QualityTier {
  const { cores, coarsePointer, memoryGb } = profile;

  // Touch devices are treated as mobile GPUs on a battery budget, and are the
  // only class of device stepped down by default.
  if (coarsePointer) return 'low';

  // Everything else runs at full quality. Only a genuinely tiny machine — one or
  // two cores, or 2GB of RAM — gets held back, and only to `medium`. The earlier
  // thresholds (4 cores, 4GB) demoted a lot of perfectly capable laptops.
  if (typeof cores === 'number' && cores > 0 && cores <= 2) return 'medium';
  if (typeof memoryGb === 'number' && memoryGb > 0 && memoryGb <= 2) return 'medium';

  return 'high';
}

export interface RenderSize {
  width: number;
  height: number;
}

/**
 * Computes the backing-store size for the canvas.
 *
 * Applies, in order: the device pixel ratio (capped, since supersampling this
 * shader is pure waste), the tier's resolution scale, and finally the absolute
 * pixel ceiling. Always returns at least 1x1 so a zero-sized canvas can never
 * produce an invalid framebuffer.
 */
export function computeRenderSize(
  cssWidth: number,
  cssHeight: number,
  devicePixelRatio: number,
  settings: Pick<QualitySettings, 'resolutionScale' | 'maxPixels'>,
  // 2x rather than 1.5x, so a Retina display renders the star field at its real
  // pixel density instead of upscaling it. Anything beyond 2x is supersampling a
  // soft effect, which is pure waste, and `maxPixels` remains the real ceiling.
  maxDpr = 2,
): RenderSize {
  const safeCssWidth = Math.max(1, cssWidth);
  const safeCssHeight = Math.max(1, cssHeight);
  const dpr = Math.min(Math.max(devicePixelRatio || 1, 1), maxDpr);

  let width = safeCssWidth * dpr * settings.resolutionScale;
  let height = safeCssHeight * dpr * settings.resolutionScale;

  // Scale both axes by the same factor so the aspect ratio is preserved.
  const pixels = width * height;
  if (pixels > settings.maxPixels) {
    const factor = Math.sqrt(settings.maxPixels / pixels);
    width *= factor;
    height *= factor;
  }

  return {
    width: Math.max(1, Math.floor(width)),
    height: Math.max(1, Math.floor(height)),
  };
}

/**
 * Creates a frame-rate gate.
 *
 * Returns a predicate that reports whether enough time has passed to render
 * again, recording the timestamp when it allows a frame through. The first call
 * always passes so there is no initial blank frame. A non-positive `maxFps`
 * disables the gate entirely.
 */
export function createFrameGate(maxFps: number): (nowMs: number) => boolean {
  if (!(maxFps > 0)) return () => true;

  const minIntervalMs = 1000 / maxFps;
  let lastMs: number | null = null;

  return (nowMs: number): boolean => {
    if (lastMs === null) {
      lastMs = nowMs;
      return true;
    }
    // A small tolerance stops a 30fps cap from dropping to 20 when frames land
    // a fraction of a millisecond early on a 60Hz display.
    if (nowMs - lastMs + 0.5 >= minIntervalMs) {
      lastMs = nowMs;
      return true;
    }
    return false;
  };
}

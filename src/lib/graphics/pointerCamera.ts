/**
 * Pointer-to-camera mapping for the aurora shader.
 *
 * The shader derives its camera angle from `iMouse` like this:
 *
 *   vec2 mo = iMouse.xy / iResolution.xy - 0.5;   // -0.5 .. +0.5
 *   mo.x *= iResolution.x / iResolution.y;        // scaled by aspect ratio
 *   rd.yz *= mm2(mo.y);                           // pitch, in radians
 *   rd.xz *= mm2(mo.x + sin(time * 0.05) * 0.2);  // yaw, in radians
 *
 * Feeding it raw pointer pixels — which is what Shadertoy does — therefore swings
 * the camera by up to +/-0.5 rad of pitch and, after the aspect multiply, roughly
 * +/-0.9 rad of yaw on a 16:9 display. That is about +/-51 degrees of yaw across
 * the window, which reads as the whole sky lurching around the cursor.
 *
 * This module remaps the pointer instead of modifying the shader, so the licensed
 * source stays faithful to the original. Two corrections:
 *
 *  1. **Sensitivity.** The offset from centre is scaled down, so the camera makes
 *     a gentle parallax move rather than a full pan.
 *  2. **Axis balance.** The horizontal offset is pre-divided by the aspect ratio,
 *     cancelling the shader's `mo.x *= aspect`. Without this, horizontal motion is
 *     ~1.8x more sensitive than vertical on a widescreen display.
 *
 * The rest position is deliberately the shader's own no-mouse default of
 * `(-0.1, 0.1)`, so the view does not jump the instant the pointer first moves.
 *
 * Kept pure (no DOM, no WebGL) so the mapping is unit-testable.
 */

/** The camera offset the shader uses when `iMouse` is (0,0). */
export const DEFAULT_CAMERA_OFFSET = { x: -0.1, y: 0.1 } as const;

/**
 * Total camera travel, in radians, across the full width or height of the
 * viewport. 0.3 rad works out to roughly +/-8.6 degrees either side of centre:
 * clearly responsive, but it reads as parallax rather than a pan.
 */
export const DEFAULT_POINTER_SENSITIVITY = 0.3;

/**
 * Ceiling on the camera offset. Purely defensive: it keeps an aggressive
 * `sensitivity` from pushing the mapped value to -0.5, which is the exact point
 * where `iMouse` would become (0,0) and trip the shader's "no mouse" branch.
 */
const MAX_OFFSET = 0.45;

export interface PointerUniform {
  /** `iMouse.x`, in rendered pixels. */
  x: number;
  /** `iMouse.y`, in rendered pixels, y-up to match `gl_FragCoord`. */
  y: number;
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return (min + max) / 2;
  return Math.min(Math.max(value, min), max);
}

/**
 * Maps a normalized pointer position to the `iMouse` uniform.
 *
 * @param normalizedX Pointer X as 0..1, left to right.
 * @param normalizedY Pointer Y as 0..1, top to bottom (DOM convention; this
 *                    function flips it for GL's bottom-left origin).
 * @param renderWidth  Backing-store width in pixels.
 * @param renderHeight Backing-store height in pixels.
 * @param sensitivity  Total camera travel in radians across the viewport.
 */
export function computePointerUniform(
  normalizedX: number,
  normalizedY: number,
  renderWidth: number,
  renderHeight: number,
  sensitivity: number = DEFAULT_POINTER_SENSITIVITY,
): PointerUniform {
  const width = Math.max(1, renderWidth);
  const height = Math.max(1, renderHeight);

  // A pointer outside the viewport should not push the camera past its edges.
  const px = clamp(normalizedX, 0, 1);
  const py = clamp(normalizedY, 0, 1);

  // GL's origin is bottom-left; the DOM's is top-left.
  const glY = 1 - py;

  const aspect = width / height;

  // Pre-divide X by the aspect ratio to cancel the shader's `mo.x *= aspect`,
  // leaving both axes equally sensitive.
  const offsetX = ((px - 0.5) * sensitivity) / aspect;
  const offsetY = (glY - 0.5) * sensitivity;

  const moX = clamp(DEFAULT_CAMERA_OFFSET.x + offsetX, -MAX_OFFSET, MAX_OFFSET);
  const moY = clamp(DEFAULT_CAMERA_OFFSET.y + offsetY, -MAX_OFFSET, MAX_OFFSET);

  // Invert the shader's `iMouse.xy / iResolution.xy - 0.5`.
  return {
    x: (moX + 0.5) * width,
    y: (moY + 0.5) * height,
  };
}

/**
 * Recovers the camera offset a uniform will produce, including the shader's
 * aspect multiply on the X axis. Exists so tests can assert the resulting camera
 * angle in radians rather than re-deriving the pixel arithmetic.
 */
export function cameraOffsetFromUniform(
  uniform: PointerUniform,
  renderWidth: number,
  renderHeight: number,
): { yaw: number; pitch: number } {
  const width = Math.max(1, renderWidth);
  const height = Math.max(1, renderHeight);
  const aspect = width / height;

  const moX = uniform.x / width - 0.5;
  const moY = uniform.y / height - 0.5;

  return { yaw: moX * aspect, pitch: moY };
}

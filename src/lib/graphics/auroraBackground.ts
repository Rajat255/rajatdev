
import { VERTEX_SHADER, buildFragmentShader } from './auroraShader';
import {
  DEFAULT_POINTER_SENSITIVITY,
  computePointerUniform,
} from './pointerCamera';
import {
  QUALITY,
  computeRenderSize,
  createFrameGate,
  pickQualityTier,
  type QualityTier,
} from './renderBudget';

export interface AuroraHandle {
  /** Stops the render loop and releases all GL resources. Idempotent. */
  destroy(): void;
  /** Suspends the render loop without releasing resources. */
  pause(): void;
  /** Resumes a paused render loop. */
  resume(): void;
  /** The tier actually in use, for diagnostics. */
  readonly tier: QualityTier;
}

export interface AuroraOptions {
  /** Force a quality tier instead of inferring one from the device. */
  tier?: QualityTier;
  /**
   * Total camera travel in radians across the viewport. Lower is calmer.
   * See `pointerCamera.ts` for why the raw Shadertoy mapping is far too strong.
   */
  pointerSensitivity?: number;
  /**
   * Per-frame easing factor for the camera, 0..1. Lower trails the pointer more
   * lazily, which also damps the perceived sensitivity.
   */
  pointerEasing?: number;
  /** Called once the first frame has been drawn, for fading the canvas in. */
  onFirstFrame?: () => void;
  /** Sink for suppressed failures. Defaults to `console.warn`. */
  logger?: (message: string, detail?: unknown) => void;
}

/** Compiles one shader stage, returning `null` and logging on failure. */
function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
  logger: (message: string, detail?: unknown) => void,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) {
    logger('could not create shader object');
    return null;
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    logger('shader compilation failed', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * Initializes the aurora background on `canvas`.
 *
 * @returns A handle, or `null` when the effect cannot run and the caller should
 *          keep its fallback background visible.
 */
export function createAuroraBackground(
  canvas: HTMLCanvasElement,
  options: AuroraOptions = {},
): AuroraHandle | null {
  const logger =
    options.logger ??
    ((message: string, detail?: unknown) => {
      console.warn(`[auroraBackground] ${message}`, detail ?? '');
    });

  // --- Context -------------------------------------------------------------

  // `antialias` is off because there is no geometry to alias, and `depth`/
  // `stencil` are off because nothing is ever depth-tested. `powerPreference`
  // stays default so laptops are not forced onto a discrete GPU for decoration.
  const contextAttributes: WebGLContextAttributes = {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
  };

  const gl = canvas.getContext('webgl2', contextAttributes);

  if (!gl) {
    logger('WebGL2 unavailable; keeping the CSS fallback background');
    return null;
  }

  // `failIfMajorPerformanceCaveat` would be the obvious guard here, but it is far
  // too blunt: browsers also raise it for perfectly capable integrated GPUs, so
  // it would silently deny the effect to a large share of laptops. Instead, ask
  // the driver what it actually is and reject only genuine software rasterizers,
  // where a 250-sample-per-pixel shader would crawl.
  if (isSoftwareRenderer(gl)) {
    logger('software WebGL renderer detected; keeping the CSS fallback background');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return null;
  }

  const tier = options.tier ?? pickQualityTier(detectDeviceProfile());
  const settings = QUALITY[tier];

  // --- Program -------------------------------------------------------------

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER, logger);
  const fragmentShader = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    buildFragmentShader(settings.steps),
    logger,
  );

  if (!vertexShader || !fragmentShader) {
    if (vertexShader) gl.deleteShader(vertexShader);
    if (fragmentShader) gl.deleteShader(fragmentShader);
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    logger('could not create program object');
    return null;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  // The shader objects are no longer needed once the program is linked.
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    logger('program link failed', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  // --- Geometry ------------------------------------------------------------

  // One oversized triangle covering the clip-space viewport. Cheaper than a quad
  // (3 vertices, no index buffer) and avoids the diagonal seam of two triangles.
  const vao = gl.createVertexArray();
  const buffer = gl.createBuffer();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );

  const positionLocation = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  const uResolution = gl.getUniformLocation(program, 'iResolution');
  const uTime = gl.getUniformLocation(program, 'iTime');
  const uMouse = gl.getUniformLocation(program, 'iMouse');

  // --- State ---------------------------------------------------------------

  let destroyed = false;
  let paused = false;
  let rafId: number | null = null;
  let firstFrameDone = false;
  const startMs = performance.now();
  const passesFrameGate = createFrameGate(settings.maxFps);

  /**
   * Pointer position as normalized 0..1 viewport coordinates rather than pixels,
   * so a resize cannot jolt the camera mid-ease. `null` means "never moved",
   * which the shader treats as its own default camera angle (it tests for
   * `iMouse == 0`).
   */
  let pointerNorm: { x: number; y: number } | null = null;
  let pointerNormTarget: { x: number; y: number } | null = null;

  const pointerSensitivity = options.pointerSensitivity ?? DEFAULT_POINTER_SENSITIVITY;
  // Deliberately slow. Combined with the reduced sensitivity, the camera drifts
  // toward the pointer instead of tracking it, which is what stops the sky from
  // feeling attached to the cursor.
  const pointerEasing = options.pointerEasing ?? 0.035;

  let renderWidth = 1;
  let renderHeight = 1;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const { width, height } = computeRenderSize(
      rect.width,
      rect.height,
      window.devicePixelRatio || 1,
      settings,
    );

    if (width === renderWidth && height === renderHeight) return;

    renderWidth = width;
    renderHeight = height;
    canvas.width = width;
    canvas.height = height;
  };

  const render = (nowMs: number) => {
    if (destroyed || paused) return;
    rafId = requestAnimationFrame(render);

    // Skip the GPU work entirely on frames the cap rejects.
    if (!passesFrameGate(nowMs)) return;

    // Ease the camera toward the pointer so it glides instead of snapping. The
    // easing runs on normalized coordinates, so it is resolution-independent.
    if (pointerNormTarget) {
      if (!pointerNorm) {
        // First movement starts from the centre, which the mapping pins to the
        // shader's own default angle, so there is no jump on the first frame.
        pointerNorm = { x: 0.5, y: 0.5 };
      }
      pointerNorm.x += (pointerNormTarget.x - pointerNorm.x) * pointerEasing;
      pointerNorm.y += (pointerNormTarget.y - pointerNorm.y) * pointerEasing;
    }

    gl.viewport(0, 0, renderWidth, renderHeight);
    gl.useProgram(program);
    gl.bindVertexArray(vao);

    gl.uniform3f(uResolution, renderWidth, renderHeight, 1);
    gl.uniform1f(uTime, (nowMs - startMs) / 1000);
    if (pointerNorm) {
      // Remapped to a gentle parallax rather than the raw full-range pan.
      const mouse = computePointerUniform(
        pointerNorm.x,
        pointerNorm.y,
        renderWidth,
        renderHeight,
        pointerSensitivity,
      );
      gl.uniform4f(uMouse, mouse.x, mouse.y, 0, 0);
    } else {
      // Zero tells the shader to use its own default camera angle.
      gl.uniform4f(uMouse, 0, 0, 0, 0);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (!firstFrameDone) {
      firstFrameDone = true;
      options.onFirstFrame?.();
    }
  };

  const start = () => {
    if (destroyed || paused || rafId !== null) return;
    rafId = requestAnimationFrame(render);
  };

  const stop = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  // --- Listeners -----------------------------------------------------------

  const handlePointerMove = (event: PointerEvent) => {
    // Store normalized 0..1 coordinates only; the pixel/axis/sensitivity mapping
    // happens at draw time in `computePointerUniform`.
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    pointerNormTarget = {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
  };

  const handleVisibility = () => {
    // A hidden tab still receives rAF on some platforms; stop explicitly.
    if (document.hidden) stop();
    else start();
  };

  const handleContextLost = (event: Event) => {
    // Without preventDefault the context can never be restored, but this effect
    // is decorative, so tear down and let the CSS fallback take over.
    event.preventDefault();
    logger('WebGL context lost; falling back to the CSS background');
    handle.destroy();
  };

  const resizeObserver =
    typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;

  // --- Handle --------------------------------------------------------------

  const handle: AuroraHandle = {
    tier,
    pause() {
      if (paused) return;
      paused = true;
      stop();
    },
    resume() {
      if (!paused || destroyed) return;
      paused = false;
      start();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();

      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibility);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      resizeObserver?.disconnect();

      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);

      // Ask the driver to drop the context immediately rather than at GC time.
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };

  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  document.addEventListener('visibilitychange', handleVisibility);
  canvas.addEventListener('webglcontextlost', handleContextLost);
  if (resizeObserver) resizeObserver.observe(canvas);
  else window.addEventListener('resize', resize);

  resize();
  start();

  return handle;
}

/**
 * Names reported by CPU-side rasterizers. Rendering this shader on any of them
 * would be unusably slow, so the CSS fallback is strictly better.
 */
const SOFTWARE_RENDERER_PATTERN = /swiftshader|llvmpipe|softpipe|software|basic render/i;

/**
 * True when the context is backed by a software rasterizer.
 *
 * Returns `false` when the renderer cannot be determined: the debug extension is
 * absent in some privacy-hardened browsers, and refusing to render whenever we
 * simply cannot tell would punish those visitors for a guess.
 */
function isSoftwareRenderer(gl: WebGL2RenderingContext): boolean {
  try {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return false;
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    if (typeof renderer !== 'string') return false;
    return SOFTWARE_RENDERER_PATTERN.test(renderer);
  } catch {
    return false;
  }
}

/** Reads the coarse device signals used to pick a quality tier. */
function detectDeviceProfile() {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    cores: typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : undefined,
    memoryGb: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : undefined,
    coarsePointer:
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches,
  };
}

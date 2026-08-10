import { expect, test } from '@playwright/test';

import { VERTEX_SHADER, buildFragmentShader } from '../../src/lib/graphics/auroraShader';
import { QUALITY } from '../../src/lib/graphics/renderBudget';

/**
 * Shader compilation checks.
 *
 * A GLSL syntax or type error cannot be caught by `tsc` or by any unit test: the
 * source is just a string until a real driver compiles it. These tests hand the
 * exact shipped source to a real WebGL2 context in the browser and assert it
 * compiles and links, which is the only way to catch a typo in the port before it
 * reaches a visitor as a silently missing background.
 *
 * Headless Chromium falls back to SwiftShader, which implements WebGL2 and is
 * perfectly adequate for *compiling* the program (we never judge frame rate
 * here). The production runtime deliberately refuses to render on SwiftShader, so
 * these tests bypass it and create their own context.
 */

test.describe('aurora shader', () => {
  test('compiles and links in a real WebGL2 context', async ({ page }) => {
    await page.goto('/');

    // Compile every shipped quality tier: each injects a different step count, so
    // a tier-specific error would otherwise slip through.
    for (const [tier, settings] of Object.entries(QUALITY)) {
      const result = await page.evaluate(
        ({ vertexSource, fragmentSource }) => {
          const canvas = document.createElement('canvas');
          const gl = canvas.getContext('webgl2');
          if (!gl) return { supported: false as const };

          const compile = (type: number, source: string) => {
            const shader = gl.createShader(type)!;
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            const ok = gl.getShaderParameter(shader, gl.COMPILE_STATUS) as boolean;
            const log = gl.getShaderInfoLog(shader) ?? '';
            return { ok, log, shader };
          };

          const vs = compile(gl.VERTEX_SHADER, vertexSource);
          const fs = compile(gl.FRAGMENT_SHADER, fragmentSource);

          let linkOk = false;
          let linkLog = '';
          if (vs.ok && fs.ok) {
            const program = gl.createProgram()!;
            gl.attachShader(program, vs.shader);
            gl.attachShader(program, fs.shader);
            gl.linkProgram(program);
            linkOk = gl.getProgramParameter(program, gl.LINK_STATUS) as boolean;
            linkLog = gl.getProgramInfoLog(program) ?? '';
          }

          return {
            supported: true as const,
            vertexOk: vs.ok,
            vertexLog: vs.log,
            fragmentOk: fs.ok,
            fragmentLog: fs.log,
            linkOk,
            linkLog,
          };
        },
        {
          vertexSource: VERTEX_SHADER,
          fragmentSource: buildFragmentShader(settings.steps),
        },
      );

      // Skip rather than fail if the browser genuinely has no WebGL2 at all.
      test.skip(!result.supported, 'WebGL2 unavailable in this browser');
      if (!result.supported) return;

      expect(result.vertexLog, `${tier}: vertex shader log`).toBe('');
      expect(result.vertexOk, `${tier}: vertex shader must compile`).toBe(true);
      expect(result.fragmentLog, `${tier}: fragment shader log`).toBe('');
      expect(result.fragmentOk, `${tier}: fragment shader must compile`).toBe(true);
      expect(result.linkLog, `${tier}: program link log`).toBe('');
      expect(result.linkOk, `${tier}: program must link`).toBe(true);
    }
  });

  test('declares the uniforms the runtime sets', async ({ page }) => {
    await page.goto('/');

    const uniforms = await page.evaluate(
      ({ vertexSource, fragmentSource }) => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2');
        if (!gl) return null;

        const build = (type: number, source: string) => {
          const shader = gl.createShader(type)!;
          gl.shaderSource(shader, source);
          gl.compileShader(shader);
          return shader;
        };

        const program = gl.createProgram()!;
        gl.attachShader(program, build(gl.VERTEX_SHADER, vertexSource));
        gl.attachShader(program, build(gl.FRAGMENT_SHADER, fragmentSource));
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;

        // A uniform optimized out by the compiler returns a null location, which
        // would mean the runtime is setting something the shader never reads.
        return {
          iResolution: gl.getUniformLocation(program, 'iResolution') !== null,
          iTime: gl.getUniformLocation(program, 'iTime') !== null,
          iMouse: gl.getUniformLocation(program, 'iMouse') !== null,
          aPosition: gl.getAttribLocation(program, 'aPosition'),
        };
      },
      { vertexSource: VERTEX_SHADER, fragmentSource: buildFragmentShader(48) },
    );

    test.skip(uniforms === null, 'WebGL2 unavailable in this browser');
    if (uniforms === null) return;

    expect(uniforms.iResolution).toBe(true);
    expect(uniforms.iTime).toBe(true);
    expect(uniforms.iMouse).toBe(true);
    expect(uniforms.aPosition).toBeGreaterThanOrEqual(0);
  });
});

test.describe('aurora background integration', () => {
  test('always renders the CSS fallback layers', async ({ page }) => {
    await page.goto('/');

    // The fallback must exist regardless of WebGL support, so the page is never
    // blank. These are the layers the shader fades in over.
    await expect(page.locator('.bgfx')).toHaveCount(1);
    await expect(page.locator('.bgfx__blob')).toHaveCount(3);
    await expect(page.locator('.bgfx__dots')).toHaveCount(2);
    await expect(page.locator('.bgfx__scrim')).toHaveCount(1);
  });

  test('keeps the backdrop fixed while the page scrolls', async ({ page }) => {
    await page.goto('/');

    const before = await page.locator('.bgfx').boundingBox();
    await page.evaluate(() => window.scrollTo(0, 1200));
    // Allow the scroll to settle before re-measuring.
    await page.waitForTimeout(150);
    const after = await page.locator('.bgfx').boundingBox();

    expect(before).not.toBeNull();
    expect(after).not.toBeNull();
    // A fixed backdrop keeps the same viewport-relative position after scrolling.
    expect(Math.abs(after!.y - before!.y)).toBeLessThan(2);
  });

  test('renders the required shader attribution', async ({ page }) => {
    await page.goto('/');

    // CC BY-NC-SA obliges us to credit the author and name the licence.
    const footer = page.locator('footer');
    await expect(footer).toContainText('nimitz');
    await expect(footer).toContainText('CC BY-NC-SA 3.0');
    await expect(
      footer.locator('a[href*="creativecommons.org/licenses/by-nc-sa/3.0"]'),
    ).toHaveCount(1);
  });
});

test.describe('aurora background under reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('never initializes the shader canvas', async ({ page }) => {
    await page.goto('/');
    // Give the deferred init a chance to run, so this cannot pass by being early.
    await page.waitForTimeout(2000);

    const canvas = page.locator('[data-aurora-canvas]');
    await expect(canvas).toHaveCount(1);
    // The reveal flag is only set from the shader's first drawn frame.
    await expect(canvas).not.toHaveAttribute('data-ready', 'true');
  });
});

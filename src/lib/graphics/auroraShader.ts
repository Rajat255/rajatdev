/**
 * GLSL source for the aurora background.
 *
 * ---------------------------------------------------------------------------
 * ATTRIBUTION
 *
 * Fragment shader: "Auroras" by nimitz (2017) — https://www.stormoid.com
 *   Shadertoy:  https://www.shadertoy.com/view/XtGGRt
 *   Twitter/X:  @stormoid
 *   License:    Creative Commons Attribution-NonCommercial-ShareAlike 3.0
 *               Unported (CC BY-NC-SA 3.0)
 *               https://creativecommons.org/licenses/by-nc-sa/3.0/
 *
 * The original header notes that other licensing options are available by
 * contacting the author. Retain this notice in any copy or derivative.
 *
 * Modifications made when porting to this site:
 *   - Translated from Shadertoy's GLSL ES 1.00 dialect to `#version 300 es`
 *     (an `out` declaration replaces the implicit `gl_FragColor`, and the
 *     Shadertoy `mainImage` entry point is called from a real `main`).
 *   - The aurora raymarch loop's fixed iteration count is replaced by the
 *     `AURORA_STEPS` define, injected per quality tier.
 *   - `iResolution`, `iTime`, and `iMouse` are supplied as ordinary uniforms
 *     rather than by the Shadertoy runtime.
 * No changes were made to the shading maths.
 * ---------------------------------------------------------------------------
 *
 * WebGL2 is required, not merely preferred: `nmzHash33` uses `uvec3`, unsigned
 * literals, and bitwise shift/xor, none of which exist in GLSL ES 1.00. Callers
 * must fall back to the CSS background when WebGL2 is unavailable.
 */

/** Fullscreen-triangle vertex shader. */
export const VERTEX_SHADER = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

/**
 * Builds the fragment shader source for a given raymarch step count.
 *
 * @param steps Number of aurora raymarch iterations. The original uses 50.
 */
export function buildFragmentShader(steps: number): string {
  // Guard the injected value: it is interpolated into shader source, so it must
  // be a plain positive integer and never arbitrary text.
  const safeSteps = Math.max(4, Math.min(64, Math.floor(steps)));

  return `#version 300 es
precision highp float;
precision highp int;

uniform vec3 iResolution;
uniform float iTime;
uniform vec4 iMouse;

// On-screen width in CSS pixels, which is NOT iResolution.x: the canvas renders
// below its display size and is upscaled by CSS. Only the star field reads this;
// see the note above stars().
uniform float iStarRes;

out vec4 fragColor;

#define time iTime
#define AURORA_STEPS ${safeSteps}

mat2 mm2(in float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
mat2 m2 = mat2(0.95534, 0.29552, -0.29552, 0.95534);
float tri(in float x) { return clamp(abs(fract(x) - 0.5), 0.01, 0.49); }
vec2 tri2(in vec2 p) { return vec2(tri(p.x) + tri(p.y), tri(p.y + tri(p.x))); }

float triNoise2d(in vec2 p, float spd) {
  float z = 1.8;
  float z2 = 2.5;
  float rz = 0.0;
  p *= mm2(p.x * 0.06);
  vec2 bp = p;
  for (float i = 0.0; i < 5.0; i++) {
    vec2 dg = tri2(bp * 1.85) * 0.75;
    dg *= mm2(time * spd);
    p -= dg / z2;
    bp *= 1.3;
    z2 *= 0.45;
    z *= 0.42;
    p *= 1.21 + (rz - 1.0) * 0.02;
    rz += tri(p.x + tri(p.y)) * z;
    p *= -m2;
  }
  return clamp(1.0 / pow(rz * 29.0, 1.3), 0.0, 0.55);
}

float hash21(in vec2 n) {
  return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

vec4 aurora(vec3 ro, vec3 rd) {
  vec4 col = vec4(0);
  vec4 avgCol = vec4(0);
  for (float i = 0.0; i < float(AURORA_STEPS); i++) {
    float of = 0.006 * hash21(gl_FragCoord.xy) * smoothstep(0.0, 15.0, i);
    float pt = ((0.8 + pow(i, 1.4) * 0.002) - ro.y) / (rd.y * 2.0 + 0.4);
    pt -= of;
    vec3 bpos = ro + pt * rd;
    vec2 p = bpos.zx;
    float rzt = triNoise2d(p, 0.06);
    vec4 col2 = vec4(0, 0, 0, rzt);
    col2.rgb = (sin(1.0 - vec3(2.15, -0.5, 1.2) + i * 0.043) * 0.5 + 0.5) * rzt;
    avgCol = mix(avgCol, col2, 0.5);
    col += avgCol * exp2(-i * 0.065 - 2.5) * smoothstep(0.0, 5.0, i);
  }
  col *= (clamp(rd.y * 15.0 + 0.4, 0.0, 1.0));
  return col * 1.8;
}

// ------------------- Background and Stars --------------------

vec3 nmzHash33(vec3 q) {
  uvec3 p = uvec3(ivec3(q));
  p = p * uvec3(374761393U, 1103515245U, 668265263U) + p.zxy + p.yzx;
  p = p.yzx * (p.zxy ^ (p >> 3U));
  return vec3(p ^ (p >> 16U)) * (1.0 / vec3(0xffffffffU));
}

// The star field is a hash grid whose cell size is derived from a resolution, so
// whatever is fed in here decides how large a star is and how many are visible.
//
// The original used iResolution.x, the backing-store width, which ties the star
// field to the render scale: halve the resolution and every star doubles in width
// while three quarters of them vanish, reading as a blurry smear rather than a
// sky. Feeding it the CSS width instead pins stars to screen space, so the
// resolution scale becomes a pure quality knob and the sky looks the same on
// every tier.
vec3 stars(in vec3 p) {
  vec3 c = vec3(0.0);
  float res = iStarRes;
  for (float i = 0.0; i < 4.0; i++) {
    vec3 q = fract(p * (0.15 * res)) - 0.5;
    vec3 id = floor(p * (0.15 * res));
    vec2 rn = nmzHash33(id).xy;
    float c2 = 1.0 - smoothstep(0.0, 0.6, length(q));
    c2 *= step(rn.x, 0.0005 + i * i * 0.001);
    c += c2 * (mix(vec3(1.0, 0.49, 0.1), vec3(0.75, 0.9, 1.0), rn.y) * 0.1 + 0.9);
    p *= 1.3;
  }
  return c * c * 0.8;
}

vec3 bg(in vec3 rd) {
  float sd = dot(normalize(vec3(-0.5, -0.6, 0.9)), rd) * 0.5 + 0.5;
  sd = pow(sd, 5.0);
  vec3 col = mix(vec3(0.05, 0.1, 0.2), vec3(0.1, 0.05, 0.2), sd);
  return col * 0.63;
}

// -----------------------------------------------------------

void mainImage(out vec4 outColor, in vec2 fragCoord) {
  vec2 q = fragCoord.xy / iResolution.xy;
  vec2 p = q - 0.5;
  p.x *= iResolution.x / iResolution.y;

  vec3 ro = vec3(0, 0, -6.7);
  vec3 rd = normalize(vec3(p, 1.3));
  vec2 mo = iMouse.xy / iResolution.xy - 0.5;
  mo = (mo == vec2(-0.5)) ? vec2(-0.1, 0.1) : mo;
  mo.x *= iResolution.x / iResolution.y;
  rd.yz *= mm2(mo.y);
  rd.xz *= mm2(mo.x + sin(time * 0.05) * 0.2);

  vec3 col = vec3(0.0);
  vec3 brd = rd;
  float fade = smoothstep(0.0, 0.01, abs(brd.y)) * 0.1 + 0.9;

  col = bg(rd) * fade;

  if (rd.y > 0.0) {
    vec4 aur = smoothstep(0.0, 1.5, aurora(ro, rd)) * fade;
    col += stars(rd);
    col = col * (1.0 - aur.a) + aur.rgb;
  } else {
    // Reflections
    rd.y = abs(rd.y);
    col = bg(rd) * fade * 0.6;
    vec4 aur = smoothstep(0.0, 2.5, aurora(ro, rd));
    col += stars(rd) * 0.1;
    col = col * (1.0 - aur.a) + aur.rgb;
    vec3 pos = ro + ((0.5 - ro.y) / rd.y) * rd;
    float nz2 = triNoise2d(pos.xz * vec2(0.5, 0.7), 0.0);
    col += mix(vec3(0.2, 0.25, 0.5) * 0.08, vec3(0.3, 0.3, 0.5) * 0.7, nz2 * 0.4);
  }

  outColor = vec4(col, 1.0);
}

void main() {
  mainImage(fragColor, gl_FragCoord.xy);
}
`;
}

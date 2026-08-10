import{g as ee}from"./AnimationEngine.DAgvX_4H.js";const te="data-lazy",de="100% 0px",re=`[${te}]`;function oe(t){const r=t.getAttribute("data-srcset");r!==null&&(t.setAttribute("srcset",r),t.removeAttribute("data-srcset"));const o=t.getAttribute("data-src");o!==null&&(t.setAttribute("src",o),t.removeAttribute("data-src")),t.removeAttribute(te),t.setAttribute("data-lazy-loaded","true")}function W(t=document,r=re){t.querySelectorAll(r).forEach(o=>oe(o))}function ue(t={}){const{root:r=null,rootMargin:o=de,selector:n=re,scope:e=document}=t,s=()=>{};if(typeof IntersectionObserver>"u")return W(e,n),s;try{const a=new IntersectionObserver((l,u)=>{for(const i of l)i.isIntersecting&&(oe(i.target),u.unobserve(i.target))},{root:r,rootMargin:o,threshold:0});return e.querySelectorAll(n).forEach(l=>a.observe(l)),()=>a.disconnect()}catch{return W(e,n),s}}typeof window<"u"&&ue();const fe=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;function me(t){return`#version 300 es
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
#define AURORA_STEPS ${Math.max(4,Math.min(64,Math.floor(t)))}

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
`}const X={x:-.1,y:.1},ne=.3,L=.45;function _(t,r,o){return Number.isNaN(t)?(r+o)/2:Math.min(Math.max(t,r),o)}function he(t,r,o,n,e=ne){const s=Math.max(1,o),a=Math.max(1,n),l=_(t,0,1),i=1-_(r,0,1),m=s/a,v=(l-.5)*e/m,A=(i-.5)*e,z=_(X.x+v,-L,L),F=_(X.y+A,-L,L);return{x:(z+.5)*s,y:(F+.5)*a}}const pe={high:{resolutionScale:.75,maxPixels:16e5,steps:26,maxFps:24},medium:{resolutionScale:.6,maxPixels:1e6,steps:22,maxFps:24},low:{resolutionScale:.5,maxPixels:6e5,steps:18,maxFps:20}};function ve(t={}){const{cores:r,coarsePointer:o,memoryGb:n}=t;return o||typeof n=="number"&&n>0&&n<=4?"low":typeof r=="number"&&r>0&&r<=4?"medium":"high"}function ye(t,r,o,n,e=1.5){const s=Math.max(1,t),a=Math.max(1,r),l=Math.min(Math.max(o,1),e);let u=s*l*n.resolutionScale,i=a*l*n.resolutionScale;const m=u*i;if(m>n.maxPixels){const v=Math.sqrt(n.maxPixels/m);u*=v,i*=v}return{width:Math.max(1,Math.floor(u)),height:Math.max(1,Math.floor(i))}}function we(t){if(!(t>0))return()=>!0;const r=1e3/t;let o=null;return n=>o===null||n-o+.5>=r?(o=n,!0):!1}function $(t,r,o,n){const e=t.createShader(r);return e?(t.shaderSource(e,o),t.compileShader(e),t.getShaderParameter(e,t.COMPILE_STATUS)?e:(n("shader compilation failed",t.getShaderInfoLog(e)),t.deleteShader(e),null)):(n("could not create shader object"),null)}function ge(t,r={}){const o=r.logger??((d,c)=>{console.warn(`[auroraBackground] ${d}`,c??"")}),n={alpha:!1,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:!1,powerPreference:"low-power"},e=t.getContext("webgl2",n);if(!e)return o("WebGL2 unavailable; keeping the CSS fallback background"),null;if(be(e))return o("software WebGL renderer detected; keeping the CSS fallback background"),e.getExtension("WEBGL_lose_context")?.loseContext(),null;const s=r.tier??ve(Se()),a=pe[s],l=$(e,e.VERTEX_SHADER,fe,o),u=$(e,e.FRAGMENT_SHADER,me(a.steps),o);if(!l||!u)return l&&e.deleteShader(l),u&&e.deleteShader(u),null;const i=e.createProgram();if(!i)return o("could not create program object"),null;if(e.attachShader(i,l),e.attachShader(i,u),e.linkProgram(i),e.deleteShader(l),e.deleteShader(u),!e.getProgramParameter(i,e.LINK_STATUS))return o("program link failed",e.getProgramInfoLog(i)),e.deleteProgram(i),null;const m=e.createVertexArray(),v=e.createBuffer();e.bindVertexArray(m),e.bindBuffer(e.ARRAY_BUFFER,v),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW);const A=e.getAttribLocation(i,"aPosition");e.enableVertexAttribArray(A),e.vertexAttribPointer(A,2,e.FLOAT,!1,0,0),e.bindVertexArray(null);const z=e.getUniformLocation(i,"iResolution"),F=e.getUniformLocation(i,"iTime"),I=e.getUniformLocation(i,"iMouse"),se=e.getUniformLocation(i,"iStarRes");let w=!1,h=!1,g=null,q=!1;const ae=performance.now(),ce=we(a.maxFps);let f=null,E=null;const le=r.pointerSensitivity??ne,D=r.pointerEasing??.035;let b=1,S=1,U=1;const R=()=>{const d=t.getBoundingClientRect(),{width:c,height:O}=ye(d.width,d.height,window.devicePixelRatio||1,a);U=Math.max(1,d.width),!(c===b&&O===S)&&(b=c,S=O,t.width=c,t.height=O)},k=d=>{if(!(w||h)&&(g=requestAnimationFrame(k),!!ce(d))){if(E&&(f||(f={x:.5,y:.5}),f.x+=(E.x-f.x)*D,f.y+=(E.y-f.y)*D),e.viewport(0,0,b,S),e.useProgram(i),e.bindVertexArray(m),e.uniform3f(z,b,S,1),e.uniform1f(F,(d-ae)/1e3),e.uniform1f(se,U),f){const c=he(f.x,f.y,b,S,le);e.uniform4f(I,c.x,c.y,0,0)}else e.uniform4f(I,0,0,0,0);e.drawArrays(e.TRIANGLES,0,3),q||(q=!0,r.onFirstFrame?.())}},M=()=>{w||h||g!==null||(g=requestAnimationFrame(k))},T=()=>{g!==null&&(cancelAnimationFrame(g),g=null)},N=d=>{const c=t.getBoundingClientRect();c.width===0||c.height===0||(E={x:(d.clientX-c.left)/c.width,y:(d.clientY-c.top)/c.height})},B=()=>{document.hidden?T():h||M()},G=()=>T(),V=()=>{!h&&!w&&!document.hidden&&M()},Y=d=>{d.preventDefault(),o("WebGL context lost; falling back to the CSS background"),H.destroy()},P=typeof ResizeObserver<"u"?new ResizeObserver(R):null,H={tier:s,pause(){h||(h=!0,T())},resume(){!h||w||(h=!1,M())},destroy(){w||(w=!0,T(),window.removeEventListener("pointermove",N),window.removeEventListener("resize",R),window.removeEventListener("blur",G),window.removeEventListener("focus",V),document.removeEventListener("visibilitychange",B),t.removeEventListener("webglcontextlost",Y),P?.disconnect(),e.deleteBuffer(v),e.deleteVertexArray(m),e.deleteProgram(i),e.getExtension("WEBGL_lose_context")?.loseContext())}};return window.addEventListener("pointermove",N,{passive:!0}),window.addEventListener("blur",G),window.addEventListener("focus",V),document.addEventListener("visibilitychange",B),t.addEventListener("webglcontextlost",Y),P?P.observe(t):window.addEventListener("resize",R),R(),M(),H}const xe=/swiftshader|llvmpipe|softpipe|software|basic render/i;function be(t){try{const r=t.getExtension("WEBGL_debug_renderer_info");if(!r)return!1;const o=t.getParameter(r.UNMASKED_RENDERER_WEBGL);return typeof o!="string"?!1:xe.test(o)}catch{return!1}}function Se(){const t=navigator;return{cores:typeof t.hardwareConcurrency=="number"?t.hardwareConcurrency:void 0,memoryGb:typeof t.deviceMemory=="number"?t.deviceMemory:void 0,coarsePointer:typeof window.matchMedia=="function"&&window.matchMedia("(pointer: coarse)").matches}}const p=document.querySelector(".bgfx"),x=document.querySelector("[data-aurora-canvas]"),ie=typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,Ae=typeof window.matchMedia=="function"&&window.matchMedia("(pointer: fine)").matches,Ee=900;let y=null;const C=()=>{y!==null&&(window.clearTimeout(y),y=null),p&&delete p.dataset.shaderLive},j=()=>{p&&(y!==null&&window.clearTimeout(y),y=window.setTimeout(()=>{y=null,p.dataset.shaderLive="true"},Ee+100))};if(p&&!ie&&Ae){let t=0,r=0,o=null;const n=()=>{o=null,p.style.setProperty("--mx",`${t}px`),p.style.setProperty("--my",`${r}px`)};window.addEventListener("pointermove",e=>{p.dataset.shaderLive!=="true"&&(t=e.clientX,r=e.clientY,o===null&&(o=requestAnimationFrame(n)))},{passive:!0})}if(x&&!ie){const t=()=>document.documentElement.classList.contains("light");let r=null;const o=()=>{r=ge(x,{pointerSensitivity:.3,pointerEasing:.035,onFirstFrame:()=>{x.dataset.ready="true",j()}}),r&&t()&&r.pause()};x.addEventListener("webglcontextlost",()=>{C(),delete x.dataset.ready});const n=window.requestIdleCallback;typeof n=="function"?n(o,{timeout:1500}):window.setTimeout(o,400),new MutationObserver(()=>{r&&(t()?(C(),r.pause()):(r.resume(),j()))}).observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change",a=>{a.matches&&r&&(r.destroy(),r=null,C(),delete x.dataset.ready)})}const Re=.6,Me="0px 0px -8% 0px";if(typeof window<"u"){const t=Array.from(document.querySelectorAll("[data-heading-rule]")),r=typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,o=()=>{for(const n of t)n.dataset.ruleState="drawn"};if(!r){if(!(typeof IntersectionObserver>"u"))try{for(const e of t)e.dataset.ruleState="pending";const n=new IntersectionObserver(e=>{for(const s of e)s.isIntersecting&&(n.unobserve(s.target),s.target.dataset.ruleState="drawn")},{threshold:Re,rootMargin:Me});for(const e of t)n.observe(e)}catch(n){console.warn("[SectionHeading] rule reveal failed; showing rules",n),o()}}}const Te=60,Le=22,_e=typeof window<"u"&&typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;_e||document.querySelectorAll(".skills-cloud .skill-badge").forEach((r,o)=>{window.setTimeout(()=>r.classList.add("is-in"),Te+o*Le)});const ze=typeof window<"u"&&typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;ze||document.querySelectorAll("details.xp-item").forEach(o=>{const n=o.querySelector("summary"),e=o.querySelector(".xp-content");if(!n||!e)return;let s=!1;n.addEventListener("click",a=>{a.preventDefault(),!s&&(s=!0,o.open?(e.style.gridTemplateRows="1fr",e.offsetHeight,requestAnimationFrame(()=>{e.style.gridTemplateRows="0fr"}),window.setTimeout(()=>{o.open=!1,e.style.gridTemplateRows="",s=!1},320)):(o.open=!0,e.style.gridTemplateRows="0fr",e.offsetHeight,requestAnimationFrame(()=>{e.style.gridTemplateRows="1fr"}),window.setTimeout(()=>{e.style.gridTemplateRows="",s=!1},320)))})});const K=60,Q=650;if(typeof window<"u"){const t=ee();document.querySelectorAll("[data-project-reveal]").forEach(o=>{t.reveal(o,{startDelayMs:K,durationMs:Q,motion:{kind:"translate",startDelayMs:K,durationMs:Q}})})}const Z=50,J=600;if(typeof window<"u"){const t=ee();document.querySelectorAll("[data-timeline-reveal]").forEach(r=>{t.reveal(r,{startDelayMs:Z,durationMs:J,motion:{kind:"translate",startDelayMs:Z,durationMs:J}})})}

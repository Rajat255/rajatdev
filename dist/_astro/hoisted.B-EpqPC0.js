import{g as J}from"./AnimationEngine.DAgvX_4H.js";const ee="data-lazy",ce="100% 0px",te=`[${ee}]`;function re(t){const r=t.getAttribute("data-srcset");r!==null&&(t.setAttribute("srcset",r),t.removeAttribute("data-srcset"));const o=t.getAttribute("data-src");o!==null&&(t.setAttribute("src",o),t.removeAttribute("data-src")),t.removeAttribute(ee),t.setAttribute("data-lazy-loaded","true")}function H(t=document,r=te){t.querySelectorAll(r).forEach(o=>re(o))}function le(t={}){const{root:r=null,rootMargin:o=ce,selector:n=te,scope:e=document}=t,a=()=>{};if(typeof IntersectionObserver>"u")return H(e,n),a;try{const s=new IntersectionObserver((l,d)=>{for(const i of l)i.isIntersecting&&(re(i.target),d.unobserve(i.target))},{root:r,rootMargin:o,threshold:0});return e.querySelectorAll(n).forEach(l=>s.observe(l)),()=>s.disconnect()}catch{return H(e,n),a}}typeof window<"u"&&le();const de=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;function ue(t){return`#version 300 es
precision highp float;
precision highp int;

uniform vec3 iResolution;
uniform float iTime;
uniform vec4 iMouse;

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

vec3 stars(in vec3 p) {
  vec3 c = vec3(0.0);
  float res = iResolution.x * 1.0;
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
`}const W={x:-.1,y:.1},oe=.3,L=.45;function _(t,r,o){return Number.isNaN(t)?(r+o)/2:Math.min(Math.max(t,r),o)}function fe(t,r,o,n,e=oe){const a=Math.max(1,o),s=Math.max(1,n),l=_(t,0,1),i=1-_(r,0,1),m=a/s,v=(l-.5)*e/m,E=(i-.5)*e,z=_(W.x+v,-L,L),F=_(W.y+E,-L,L);return{x:(z+.5)*a,y:(F+.5)*s}}const me={high:{resolutionScale:.5,maxPixels:9e5,steps:32,maxFps:24},medium:{resolutionScale:.42,maxPixels:6e5,steps:26,maxFps:24},low:{resolutionScale:.35,maxPixels:38e4,steps:20,maxFps:20}};function pe(t={}){const{cores:r,coarsePointer:o,memoryGb:n}=t;return o||typeof n=="number"&&n>0&&n<=4?"low":typeof r=="number"&&r>0&&r<=4?"medium":"high"}function he(t,r,o,n,e=1.5){const a=Math.max(1,t),s=Math.max(1,r),l=Math.min(Math.max(o,1),e);let d=a*l*n.resolutionScale,i=s*l*n.resolutionScale;const m=d*i;if(m>n.maxPixels){const v=Math.sqrt(n.maxPixels/m);d*=v,i*=v}return{width:Math.max(1,Math.floor(d)),height:Math.max(1,Math.floor(i))}}function ve(t){if(!(t>0))return()=>!0;const r=1e3/t;let o=null;return n=>o===null||n-o+.5>=r?(o=n,!0):!1}function X(t,r,o,n){const e=t.createShader(r);return e?(t.shaderSource(e,o),t.compileShader(e),t.getShaderParameter(e,t.COMPILE_STATUS)?e:(n("shader compilation failed",t.getShaderInfoLog(e)),t.deleteShader(e),null)):(n("could not create shader object"),null)}function ye(t,r={}){const o=r.logger??((u,c)=>{console.warn(`[auroraBackground] ${u}`,c??"")}),n={alpha:!1,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:!1,powerPreference:"low-power"},e=t.getContext("webgl2",n);if(!e)return o("WebGL2 unavailable; keeping the CSS fallback background"),null;if(we(e))return o("software WebGL renderer detected; keeping the CSS fallback background"),e.getExtension("WEBGL_lose_context")?.loseContext(),null;const a=r.tier??pe(xe()),s=me[a],l=X(e,e.VERTEX_SHADER,de,o),d=X(e,e.FRAGMENT_SHADER,ue(s.steps),o);if(!l||!d)return l&&e.deleteShader(l),d&&e.deleteShader(d),null;const i=e.createProgram();if(!i)return o("could not create program object"),null;if(e.attachShader(i,l),e.attachShader(i,d),e.linkProgram(i),e.deleteShader(l),e.deleteShader(d),!e.getProgramParameter(i,e.LINK_STATUS))return o("program link failed",e.getProgramInfoLog(i)),e.deleteProgram(i),null;const m=e.createVertexArray(),v=e.createBuffer();e.bindVertexArray(m),e.bindBuffer(e.ARRAY_BUFFER,v),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW);const E=e.getAttribLocation(i,"aPosition");e.enableVertexAttribArray(E),e.vertexAttribPointer(E,2,e.FLOAT,!1,0,0),e.bindVertexArray(null);const z=e.getUniformLocation(i,"iResolution"),F=e.getUniformLocation(i,"iTime"),O=e.getUniformLocation(i,"iMouse");let g=!1,p=!1,w=null,C=!1;const ie=performance.now(),ae=ve(s.maxFps);let f=null,S=null;const se=r.pointerSensitivity??oe,q=r.pointerEasing??.035;let b=1,A=1;const R=()=>{const u=t.getBoundingClientRect(),{width:c,height:I}=he(u.width,u.height,window.devicePixelRatio||1,s);c===b&&I===A||(b=c,A=I,t.width=c,t.height=I)},U=u=>{if(!(g||p)&&(w=requestAnimationFrame(U),!!ae(u))){if(S&&(f||(f={x:.5,y:.5}),f.x+=(S.x-f.x)*q,f.y+=(S.y-f.y)*q),e.viewport(0,0,b,A),e.useProgram(i),e.bindVertexArray(m),e.uniform3f(z,b,A,1),e.uniform1f(F,(u-ie)/1e3),f){const c=fe(f.x,f.y,b,A,se);e.uniform4f(O,c.x,c.y,0,0)}else e.uniform4f(O,0,0,0,0);e.drawArrays(e.TRIANGLES,0,3),C||(C=!0,r.onFirstFrame?.())}},M=()=>{g||p||w!==null||(w=requestAnimationFrame(U))},T=()=>{w!==null&&(cancelAnimationFrame(w),w=null)},N=u=>{const c=t.getBoundingClientRect();c.width===0||c.height===0||(S={x:(u.clientX-c.left)/c.width,y:(u.clientY-c.top)/c.height})},k=()=>{document.hidden?T():p||M()},B=()=>T(),G=()=>{!p&&!g&&!document.hidden&&M()},V=u=>{u.preventDefault(),o("WebGL context lost; falling back to the CSS background"),Y.destroy()},P=typeof ResizeObserver<"u"?new ResizeObserver(R):null,Y={tier:a,pause(){p||(p=!0,T())},resume(){!p||g||(p=!1,M())},destroy(){g||(g=!0,T(),window.removeEventListener("pointermove",N),window.removeEventListener("resize",R),window.removeEventListener("blur",B),window.removeEventListener("focus",G),document.removeEventListener("visibilitychange",k),t.removeEventListener("webglcontextlost",V),P?.disconnect(),e.deleteBuffer(v),e.deleteVertexArray(m),e.deleteProgram(i),e.getExtension("WEBGL_lose_context")?.loseContext())}};return window.addEventListener("pointermove",N,{passive:!0}),window.addEventListener("blur",B),window.addEventListener("focus",G),document.addEventListener("visibilitychange",k),t.addEventListener("webglcontextlost",V),P?P.observe(t):window.addEventListener("resize",R),R(),M(),Y}const ge=/swiftshader|llvmpipe|softpipe|software|basic render/i;function we(t){try{const r=t.getExtension("WEBGL_debug_renderer_info");if(!r)return!1;const o=t.getParameter(r.UNMASKED_RENDERER_WEBGL);return typeof o!="string"?!1:ge.test(o)}catch{return!1}}function xe(){const t=navigator;return{cores:typeof t.hardwareConcurrency=="number"?t.hardwareConcurrency:void 0,memoryGb:typeof t.deviceMemory=="number"?t.deviceMemory:void 0,coarsePointer:typeof window.matchMedia=="function"&&window.matchMedia("(pointer: coarse)").matches}}const h=document.querySelector(".bgfx"),x=document.querySelector("[data-aurora-canvas]"),ne=typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,be=typeof window.matchMedia=="function"&&window.matchMedia("(pointer: fine)").matches,Ae=900;let y=null;const D=()=>{y!==null&&(window.clearTimeout(y),y=null),h&&delete h.dataset.shaderLive},$=()=>{h&&(y!==null&&window.clearTimeout(y),y=window.setTimeout(()=>{y=null,h.dataset.shaderLive="true"},Ae+100))};if(h&&!ne&&be){let t=0,r=0,o=null;const n=()=>{o=null,h.style.setProperty("--mx",`${t}px`),h.style.setProperty("--my",`${r}px`)};window.addEventListener("pointermove",e=>{h.dataset.shaderLive!=="true"&&(t=e.clientX,r=e.clientY,o===null&&(o=requestAnimationFrame(n)))},{passive:!0})}if(x&&!ne){const t=()=>document.documentElement.classList.contains("light");let r=null;const o=()=>{r=ye(x,{pointerSensitivity:.3,pointerEasing:.035,onFirstFrame:()=>{x.dataset.ready="true",$()}}),r&&t()&&r.pause()};x.addEventListener("webglcontextlost",()=>{D(),delete x.dataset.ready});const n=window.requestIdleCallback;typeof n=="function"?n(o,{timeout:1500}):window.setTimeout(o,400),new MutationObserver(()=>{r&&(t()?(D(),r.pause()):(r.resume(),$()))}).observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change",s=>{s.matches&&r&&(r.destroy(),r=null,D(),delete x.dataset.ready)})}const Ee=.6,Se="0px 0px -8% 0px";if(typeof window<"u"){const t=Array.from(document.querySelectorAll("[data-heading-rule]")),r=typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,o=()=>{for(const n of t)n.dataset.ruleState="drawn"};if(!r){if(!(typeof IntersectionObserver>"u"))try{for(const e of t)e.dataset.ruleState="pending";const n=new IntersectionObserver(e=>{for(const a of e)a.isIntersecting&&(n.unobserve(a.target),a.target.dataset.ruleState="drawn")},{threshold:Ee,rootMargin:Se});for(const e of t)n.observe(e)}catch(n){console.warn("[SectionHeading] rule reveal failed; showing rules",n),o()}}}const Re=60,Me=22,Te=typeof window<"u"&&typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;Te||document.querySelectorAll(".skills-cloud .skill-badge").forEach((r,o)=>{window.setTimeout(()=>r.classList.add("is-in"),Re+o*Me)});const Le=typeof window<"u"&&typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;Le||document.querySelectorAll("details.xp-item").forEach(o=>{const n=o.querySelector("summary"),e=o.querySelector(".xp-content");if(!n||!e)return;let a=!1;n.addEventListener("click",s=>{s.preventDefault(),!a&&(a=!0,o.open?(e.style.gridTemplateRows="1fr",e.offsetHeight,requestAnimationFrame(()=>{e.style.gridTemplateRows="0fr"}),window.setTimeout(()=>{o.open=!1,e.style.gridTemplateRows="",a=!1},320)):(o.open=!0,e.style.gridTemplateRows="0fr",e.offsetHeight,requestAnimationFrame(()=>{e.style.gridTemplateRows="1fr"}),window.setTimeout(()=>{e.style.gridTemplateRows="",a=!1},320)))})});const j=60,K=650;if(typeof window<"u"){const t=J();document.querySelectorAll("[data-project-reveal]").forEach(o=>{t.reveal(o,{startDelayMs:j,durationMs:K,motion:{kind:"translate",startDelayMs:j,durationMs:K}})})}const Q=50,Z=600;if(typeof window<"u"){const t=J();document.querySelectorAll("[data-timeline-reveal]").forEach(r=>{t.reveal(r,{startDelayMs:Q,durationMs:Z,motion:{kind:"translate",startDelayMs:Q,durationMs:Z}})})}

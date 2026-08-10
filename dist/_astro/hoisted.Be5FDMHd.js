import{g as Q}from"./AnimationEngine.DAgvX_4H.js";const Z="data-lazy",ae="100% 0px",J=`[${Z}]`;function ee(t){const r=t.getAttribute("data-srcset");r!==null&&(t.setAttribute("srcset",r),t.removeAttribute("data-srcset"));const o=t.getAttribute("data-src");o!==null&&(t.setAttribute("src",o),t.removeAttribute("data-src")),t.removeAttribute(Z),t.setAttribute("data-lazy-loaded","true")}function B(t=document,r=J){t.querySelectorAll(r).forEach(o=>ee(o))}function se(t={}){const{root:r=null,rootMargin:o=ae,selector:n=J,scope:e=document}=t,a=()=>{};if(typeof IntersectionObserver>"u")return B(e,n),a;try{const s=new IntersectionObserver((l,d)=>{for(const i of l)i.isIntersecting&&(ee(i.target),d.unobserve(i.target))},{root:r,rootMargin:o,threshold:0});return e.querySelectorAll(n).forEach(l=>s.observe(l)),()=>s.disconnect()}catch{return B(e,n),a}}typeof window<"u"&&se();const ce=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;function le(t){return`#version 300 es
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
`}const Y={x:-.1,y:.1},te=.3,M=.45;function T(t,r,o){return Number.isNaN(t)?(r+o)/2:Math.min(Math.max(t,r),o)}function de(t,r,o,n,e=te){const a=Math.max(1,o),s=Math.max(1,n),l=T(t,0,1),i=1-T(r,0,1),m=a/s,h=(l-.5)*e/m,b=(i-.5)*e,L=T(Y.x+h,-M,M),_=T(Y.y+b,-M,M);return{x:(L+.5)*a,y:(_+.5)*s}}const ue={high:{resolutionScale:.7,maxPixels:13e5,steps:48,maxFps:30},medium:{resolutionScale:.55,maxPixels:8e5,steps:36,maxFps:30},low:{resolutionScale:.45,maxPixels:48e4,steps:26,maxFps:24}};function fe(t={}){const{cores:r,coarsePointer:o,memoryGb:n}=t;return o||typeof n=="number"&&n>0&&n<=4?"low":typeof r=="number"&&r>0&&r<=4?"medium":"high"}function me(t,r,o,n,e=1.5){const a=Math.max(1,t),s=Math.max(1,r),l=Math.min(Math.max(o,1),e);let d=a*l*n.resolutionScale,i=s*l*n.resolutionScale;const m=d*i;if(m>n.maxPixels){const h=Math.sqrt(n.maxPixels/m);d*=h,i*=h}return{width:Math.max(1,Math.floor(d)),height:Math.max(1,Math.floor(i))}}function pe(t){if(!(t>0))return()=>!0;const r=1e3/t;let o=null;return n=>o===null||n-o+.5>=r?(o=n,!0):!1}function H(t,r,o,n){const e=t.createShader(r);return e?(t.shaderSource(e,o),t.compileShader(e),t.getShaderParameter(e,t.COMPILE_STATUS)?e:(n("shader compilation failed",t.getShaderInfoLog(e)),t.deleteShader(e),null)):(n("could not create shader object"),null)}function he(t,r={}){const o=r.logger??((u,c)=>{console.warn(`[auroraBackground] ${u}`,c??"")}),n={alpha:!1,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:!1},e=t.getContext("webgl2",n);if(!e)return o("WebGL2 unavailable; keeping the CSS fallback background"),null;if(ye(e))return o("software WebGL renderer detected; keeping the CSS fallback background"),e.getExtension("WEBGL_lose_context")?.loseContext(),null;const a=r.tier??fe(ge()),s=ue[a],l=H(e,e.VERTEX_SHADER,ce,o),d=H(e,e.FRAGMENT_SHADER,le(s.steps),o);if(!l||!d)return l&&e.deleteShader(l),d&&e.deleteShader(d),null;const i=e.createProgram();if(!i)return o("could not create program object"),null;if(e.attachShader(i,l),e.attachShader(i,d),e.linkProgram(i),e.deleteShader(l),e.deleteShader(d),!e.getProgramParameter(i,e.LINK_STATUS))return o("program link failed",e.getProgramInfoLog(i)),e.deleteProgram(i),null;const m=e.createVertexArray(),h=e.createBuffer();e.bindVertexArray(m),e.bindBuffer(e.ARRAY_BUFFER,h),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW);const b=e.getAttribLocation(i,"aPosition");e.enableVertexAttribArray(b),e.vertexAttribPointer(b,2,e.FLOAT,!1,0,0),e.bindVertexArray(null);const L=e.getUniformLocation(i,"iResolution"),_=e.getUniformLocation(i,"iTime"),O=e.getUniformLocation(i,"iMouse");let x=!1,y=!1,g=null,C=!1;const oe=performance.now(),ne=pe(s.maxFps);let f=null,E=null;const ie=r.pointerSensitivity??te,q=r.pointerEasing??.035;let A=1,S=1;const R=()=>{const u=t.getBoundingClientRect(),{width:c,height:I}=me(u.width,u.height,window.devicePixelRatio||1,s);c===A&&I===S||(A=c,S=I,t.width=c,t.height=I)},U=u=>{if(!(x||y)&&(g=requestAnimationFrame(U),!!ne(u))){if(E&&(f||(f={x:.5,y:.5}),f.x+=(E.x-f.x)*q,f.y+=(E.y-f.y)*q),e.viewport(0,0,A,S),e.useProgram(i),e.bindVertexArray(m),e.uniform3f(L,A,S,1),e.uniform1f(_,(u-oe)/1e3),f){const c=de(f.x,f.y,A,S,ie);e.uniform4f(O,c.x,c.y,0,0)}else e.uniform4f(O,0,0,0,0);e.drawArrays(e.TRIANGLES,0,3),C||(C=!0,r.onFirstFrame?.())}},z=()=>{x||y||g!==null||(g=requestAnimationFrame(U))},F=()=>{g!==null&&(cancelAnimationFrame(g),g=null)},N=u=>{const c=t.getBoundingClientRect();c.width===0||c.height===0||(E={x:(u.clientX-c.left)/c.width,y:(u.clientY-c.top)/c.height})},k=()=>{document.hidden?F():z()},G=u=>{u.preventDefault(),o("WebGL context lost; falling back to the CSS background"),V.destroy()},P=typeof ResizeObserver<"u"?new ResizeObserver(R):null,V={tier:a,pause(){y||(y=!0,F())},resume(){!y||x||(y=!1,z())},destroy(){x||(x=!0,F(),window.removeEventListener("pointermove",N),window.removeEventListener("resize",R),document.removeEventListener("visibilitychange",k),t.removeEventListener("webglcontextlost",G),P?.disconnect(),e.deleteBuffer(h),e.deleteVertexArray(m),e.deleteProgram(i),e.getExtension("WEBGL_lose_context")?.loseContext())}};return window.addEventListener("pointermove",N,{passive:!0}),document.addEventListener("visibilitychange",k),t.addEventListener("webglcontextlost",G),P?P.observe(t):window.addEventListener("resize",R),R(),z(),V}const ve=/swiftshader|llvmpipe|softpipe|software|basic render/i;function ye(t){try{const r=t.getExtension("WEBGL_debug_renderer_info");if(!r)return!1;const o=t.getParameter(r.UNMASKED_RENDERER_WEBGL);return typeof o!="string"?!1:ve.test(o)}catch{return!1}}function ge(){const t=navigator;return{cores:typeof t.hardwareConcurrency=="number"?t.hardwareConcurrency:void 0,memoryGb:typeof t.deviceMemory=="number"?t.deviceMemory:void 0,coarsePointer:typeof window.matchMedia=="function"&&window.matchMedia("(pointer: coarse)").matches}}const p=document.querySelector(".bgfx"),w=document.querySelector("[data-aurora-canvas]"),re=typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,we=typeof window.matchMedia=="function"&&window.matchMedia("(pointer: fine)").matches,xe=900;let v=null;const D=()=>{v!==null&&(window.clearTimeout(v),v=null),p&&delete p.dataset.shaderLive},W=()=>{p&&(v!==null&&window.clearTimeout(v),v=window.setTimeout(()=>{v=null,p.dataset.shaderLive="true"},xe+100))};if(p&&!re&&we){let t=0,r=0,o=null;const n=()=>{o=null,p.style.setProperty("--mx",`${t}px`),p.style.setProperty("--my",`${r}px`)};window.addEventListener("pointermove",e=>{p.dataset.shaderLive!=="true"&&(t=e.clientX,r=e.clientY,o===null&&(o=requestAnimationFrame(n)))},{passive:!0})}if(w&&!re){const t=()=>document.documentElement.classList.contains("light");let r=null;const o=()=>{r=he(w,{pointerSensitivity:.3,pointerEasing:.035,onFirstFrame:()=>{w.dataset.ready="true",W()}}),r&&t()&&r.pause()};w.addEventListener("webglcontextlost",()=>{D(),delete w.dataset.ready});const n=window.requestIdleCallback;typeof n=="function"?n(o,{timeout:1500}):window.setTimeout(o,400),new MutationObserver(()=>{r&&(t()?(D(),r.pause()):(r.resume(),W()))}).observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change",s=>{s.matches&&r&&(r.destroy(),r=null,D(),delete w.dataset.ready)})}const Ae=.6,Se="0px 0px -8% 0px";if(typeof window<"u"){const t=Array.from(document.querySelectorAll("[data-heading-rule]")),r=typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,o=()=>{for(const n of t)n.dataset.ruleState="drawn"};if(!r){if(!(typeof IntersectionObserver>"u"))try{for(const e of t)e.dataset.ruleState="pending";const n=new IntersectionObserver(e=>{for(const a of e)a.isIntersecting&&(n.unobserve(a.target),a.target.dataset.ruleState="drawn")},{threshold:Ae,rootMargin:Se});for(const e of t)n.observe(e)}catch(n){console.warn("[SectionHeading] rule reveal failed; showing rules",n),o()}}}const be=60,Ee=22,Re=typeof window<"u"&&typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;Re||document.querySelectorAll(".skills-cloud .skill-badge").forEach((r,o)=>{window.setTimeout(()=>r.classList.add("is-in"),be+o*Ee)});const Me=typeof window<"u"&&typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;Me||document.querySelectorAll("details.xp-item").forEach(o=>{const n=o.querySelector("summary"),e=o.querySelector(".xp-content");if(!n||!e)return;let a=!1;n.addEventListener("click",s=>{s.preventDefault(),!a&&(a=!0,o.open?(e.style.gridTemplateRows="1fr",e.offsetHeight,requestAnimationFrame(()=>{e.style.gridTemplateRows="0fr"}),window.setTimeout(()=>{o.open=!1,e.style.gridTemplateRows="",a=!1},320)):(o.open=!0,e.style.gridTemplateRows="0fr",e.offsetHeight,requestAnimationFrame(()=>{e.style.gridTemplateRows="1fr"}),window.setTimeout(()=>{e.style.gridTemplateRows="",a=!1},320)))})});const X=60,$=650;if(typeof window<"u"){const t=Q();document.querySelectorAll("[data-project-reveal]").forEach(o=>{t.reveal(o,{startDelayMs:X,durationMs:$,motion:{kind:"translate",startDelayMs:X,durationMs:$}})})}const j=50,K=600;if(typeof window<"u"){const t=Q();document.querySelectorAll("[data-timeline-reveal]").forEach(r=>{t.reveal(r,{startDelayMs:j,durationMs:K,motion:{kind:"translate",startDelayMs:j,durationMs:K}})})}

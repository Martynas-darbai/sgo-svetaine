/* Hero aurora: port of the React Bits "Aurora" shader (WebGL2, no libraries) in SGO greens.
   Pauses off screen / hidden tab; static frame with reduced motion. Also hides the navbar at the very top on desktop. */
(function(){
  var MAX_STOPS = 5, INTRO = 2.4;
  var host = document.querySelector('header.hero') || document.querySelector('header.svc-hero');

  /* ---- navbar: hidden at the very top of the home page on desktop, appears after a little scrolling ---- */
  var root = document.documentElement;
  var wide = window.matchMedia('(min-width: 901px)');
  function navState(){
    var h0 = host ? host.offsetHeight - 90 : 60;   /* stay see-through while the navbar is over the hero */
    var top = (window.scrollY || 0) < Math.max(60, h0) && wide.matches;
    root.classList.toggle('nav-at-top', top);
  }
  if (host) {
    navState();
    window.addEventListener('scroll', navState, { passive: true });
    window.addEventListener('resize', navState);
  }

  var GREENS = ['#0B7A6A', '#19C98E', '#7BEA6B', '#19C98E', '#0B7A6A'];   /* teal, emerald, fresh lime */
  /* a theme stylesheet (e.g. site.mint.css) can swap the palette via CSS variables */
  var themeCss = window.getComputedStyle(root);
  var themeAurora = themeCss.getPropertyValue('--theme-aurora').trim();
  if (themeAurora) GREENS = themeAurora.split(',').map(function(c){ return c.trim(); });
  var GLOW_RGB = themeCss.getPropertyValue('--theme-glow-rgb').trim() || '32,183,138';
  function make(host, cfg){
  var canvas = document.createElement('canvas');
  canvas.className = 'hero-aurora';
  canvas.setAttribute('aria-hidden', 'true');
  var gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
  if (!gl) return;

  var VERT = '#version 300 es\nin vec2 aPosition;void main(){gl_Position=vec4(aPosition,0.0,1.0);}';
  var FRAG = [
'#version 300 es',
'precision highp float;precision highp int;',
'uniform vec2 uResolution;uniform float uTime;uniform vec3 uStops[' + MAX_STOPS + '];uniform int uStopCount;',
'uniform float uAmplitude;uniform float uBlend;uniform float uHeight;uniform float uScale;uniform float uGlow;',
'uniform float uFlip;uniform float uBrightness;uniform int uLayers;uniform vec3 uPointer;uniform float uReveal;uniform float uOpacity;',
'out vec4 outColor;',
'vec3 permute(vec3 x){return mod(((x*34.0)+1.0)*x,289.0);}',
'float snoise(vec2 v){',
' const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);',
' vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);',
' vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);',
' vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod(i,289.0);',
' vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));',
' vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);m=m*m;m=m*m;',
' vec3 x=2.0*fract(p*C.www)-1.0;vec3 h=abs(x)-0.5;vec3 ox=floor(x+0.5);vec3 a0=x-ox;',
' m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);',
' vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.0*dot(m,g);}',
'float smootherstep(float e0,float e1,float x){float t=clamp((x-e0)/(e1-e0),0.0,1.0);return t*t*t*(t*(t*6.0-15.0)+10.0);}',
'vec3 oklabToLinear(vec3 c){',
' float l=c.x+0.3963377774*c.y+0.2158037573*c.z;float m=c.x-0.1055613458*c.y-0.0638541728*c.z;float s=c.x-0.0894841775*c.y-1.2914855480*c.z;',
' l=l*l*l;m=m*m*m;s=s*s*s;',
' return vec3(4.0767416621*l-3.3077115913*m+0.2309699292*s,-1.2684380046*l+2.6097574011*m-0.3413193965*s,-0.0041960863*l-0.7034186147*m+1.7076147010*s);}',
'vec3 toSrgb(vec3 c){c=clamp(c,0.0,1.0);return mix(c*12.92,1.055*pow(c,vec3(1.0/2.4))-0.055,step(0.0031308,c));}',
'vec3 ramp(float t){',
' float x=clamp(t,0.0,1.0)*float(uStopCount-1);int i=int(min(floor(x),float(uStopCount-2)));float f=x-float(i);f=f*f*(3.0-2.0*f);',
' vec3 lch=mix(uStops[i],uStops[i+1],f);',
' return toSrgb(oklabToLinear(vec3(lch.x,lch.y*cos(lch.z),lch.y*sin(lch.z))));}',
'float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}',
'void main(){',
' vec2 frag=gl_FragCoord.xy;float y=1.0-frag.y/uResolution.y;y=mix(y,1.0-y,uFlip);float u=frag.x/uResolution.x;',
' float t=uTime;',
/* slow drift so the whole glow wanders left/right and breathes up/down */
' float X=(frag.x-uResolution.x*0.5)/uResolution.y+0.35*sin(t*0.11)+0.18*sin(t*0.29+1.3);',
' y+=0.06*sin(t*0.17+0.7)+0.03*sin(t*0.41);',
' float reach=uPointer.z*exp(-pow((X-uPointer.x)/0.38,2.0));',
' vec3 glow=vec3(0.0);float cover=0.0;',
' for(int k=0;k<3;k++){',
'  if(k>=uLayers)break;',
'  float layer=float(k);float seed=layer*13.7;float pace=t*(1.0-layer*0.18);',
'  float warp=snoise(vec2(X*0.45*uScale+pace*0.02+seed,pace*0.05+seed));',
'  float wave=snoise(vec2(X*0.75*uScale+warp*0.35-pace*0.03+seed,pace*0.07-seed))*0.72+snoise(vec2(X*1.6*uScale+warp*0.5+pace*0.04-seed,pace*0.1+seed*0.5))*0.28;',
'  float hem=uHeight+layer*0.07+wave*0.15*uAmplitude;',
'  hem+=reach*0.08*(layer<0.5?1.0:0.4);',
'  hem=mix(-0.25,hem,uReveal);',
'  float soft=(0.04+uBlend*0.16)*(1.0+layer*0.9);',
'  float rise=hem-y;float low=-soft-uGlow*0.14;float high=0.26+soft*0.6;',
'  float body=pow(smootherstep(low,high,rise),1.5+uGlow*0.6);',
'  float lobes=0.86+0.14*snoise(vec2(X*0.9*uScale-pace*0.025+seed,y*0.3+pace*0.04));',
'  float alpha=body*lobes*(layer<0.5?1.0:0.32/layer);',
'  alpha=clamp(alpha*(1.0+reach*0.25*smootherstep(0.9,0.0,abs(y-hem))),0.0,1.0);',
'  vec3 tint=ramp(u+0.05*sin(pace*0.08+layer*2.3)+layer*0.1+max(rise,0.0)*0.05);',
'  glow=1.0-(1.0-glow)*(1.0-tint*alpha);cover=1.0-(1.0-cover)*(1.0-alpha);',
' }',
' float fade=smootherstep(0.0,0.7,uReveal)*uOpacity;float strength=clamp(uBrightness,0.0,2.0);',
' glow*=fade*min(strength,1.0);cover*=fade*min(strength,1.0);',
' glow=1.0-pow(1.0-glow,vec3(max(strength,1.0)));',
' float dither=(hash(frag)-0.5)/255.0;',
' outColor=vec4(glow+dither,clamp(cover+dither,0.0,1.0));}'
  ].join('\n');

  function compile(type, src){ var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; }
  var vs = compile(gl.VERTEX_SHADER, VERT), fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  var prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs);
  gl.bindAttribLocation(prog, 0, 'aPosition');
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  host.insertBefore(canvas, host.firstChild);
  if (cfg.cls) canvas.className += ' ' + cfg.cls;
  gl.useProgram(prog);

  var vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  var U = {};
  ['uResolution','uTime','uStops','uStopCount','uAmplitude','uBlend','uHeight','uScale','uGlow','uBrightness','uLayers','uFlip','uPointer','uReveal','uOpacity']
    .forEach(function(n){ U[n] = gl.getUniformLocation(prog, n === 'uStops' ? 'uStops[0]' : n); });

  /* hex -> OKLCH */
  function toOklch(hex){
    var rgb = [1,3,5].map(function(i){ var c = parseInt(hex.substr(i,2),16)/255; return c <= .04045 ? c/12.92 : Math.pow((c+.055)/1.055, 2.4); });
    var r = rgb[0], g = rgb[1], b = rgb[2];
    var l = Math.cbrt(.4122214708*r + .5363325363*g + .0514459929*b);
    var m = Math.cbrt(.2119034982*r + .6806995451*g + .1073969566*b);
    var s = Math.cbrt(.0883024619*r + .2817188376*g + .6299787005*b);
    var A = 1.9779984951*l - 2.428592205*m + .4505937099*s, B = .0259040371*l + .7827717662*m - .808675766*s;
    return [.2104542553*l + .793617785*m - .0040720468*s, Math.hypot(A, B), Math.atan2(B, A)];
  }
  var STOPS = cfg.stops;   /* greens: teal, emerald, fresh lime */
  var pal = new Float32Array(MAX_STOPS * 3), prev = null;
  STOPS.map(toOklch).forEach(function(s, i){
    var h = s[2];
    if (prev !== null) { while (h - prev > Math.PI) h -= 2*Math.PI; while (h - prev < -Math.PI) h += 2*Math.PI; }
    prev = h; pal.set([s[0], s[1], h], i*3);
  });

  var P = { amplitude: 1, blend: .5, height: cfg.height, scale: 1, glow: .6, brightness: cfg.brightness, layers: 2, opacity: 1, speed: 1 };
  gl.useProgram(prog);
  gl.uniform1f(U.uFlip, cfg.flip ? 1 : 0);
  gl.uniform3fv(U.uStops, pal);
  gl.uniform1i(U.uStopCount, STOPS.length);
  gl.uniform1f(U.uAmplitude, P.amplitude); gl.uniform1f(U.uBlend, P.blend); gl.uniform1f(U.uHeight, P.height);
  gl.uniform1f(U.uScale, P.scale); gl.uniform1f(U.uGlow, P.glow); gl.uniform1f(U.uBrightness, P.brightness);
  gl.uniform1i(U.uLayers, P.layers); gl.uniform1f(U.uOpacity, P.opacity);

  var reduce = false;   /* always animate, even when the OS asks for reduced motion */
  var st = { clock: cfg.t0 || 3, px: 0, py: .5, reach: 0, reveal: reduce ? 1 : 0 };
  var ptr = { x: 0, y: 0, inside: false }, vw = 1, vh = 1, raf = 0, last = 0, visible = true;

  function render(){
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(U.uResolution, canvas.width, canvas.height);
    gl.uniform1f(U.uTime, st.clock);
    gl.uniform3f(U.uPointer, st.px, st.py, st.reach);
    gl.uniform1f(U.uReveal, 1 - Math.pow(1 - st.reveal, 3));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function frame(now){
    raf = 0;
    if (!visible || document.hidden) return;
    var dt = last ? Math.min(.05, Math.max(.0005, (now - last)/1000)) : 1/60; last = now;
    st.clock += dt * P.speed;
    var follow = 1 - Math.exp(-dt/.6);
    if (ptr.inside) {
      st.px += ((ptr.x - vw/2)/vh - st.px) * follow;
      st.py += (ptr.y/vh - st.py) * follow;
    }
    st.reach += ((ptr.inside ? 1 : 0) - st.reach) * (1 - Math.exp(-dt/(ptr.inside ? .9 : 1.4)));
    if (st.reveal < 1) st.reveal = Math.min(1, st.reveal + dt/INTRO);
    render();
    raf = requestAnimationFrame(frame);
  }
  function wake(){ if (!raf && visible && !document.hidden && !reduce) raf = requestAnimationFrame(frame); }

  function resize(){
    /* the aurora is a soft blur, so render it at half resolution (CSS stretches the canvas): ~4-9x less GPU work per frame */
    var dpr = 0.5;
    vw = Math.max(1, host.clientWidth); vh = Math.max(1, host.clientHeight);
    canvas.width = Math.max(1, Math.round(vw*dpr)); canvas.height = Math.max(1, Math.round(vh*dpr));
    render(); wake();
  }
  resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(host); else window.addEventListener('resize', resize);

  window.addEventListener('pointermove', function(e){
    var r = host.getBoundingClientRect();
    ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top;
    var was = ptr.inside;
    ptr.inside = ptr.x >= 0 && ptr.y >= 0 && ptr.x <= r.width && ptr.y <= r.height;
    if (ptr.inside && !was) { st.px = (ptr.x - r.width/2)/Math.max(1, r.height); st.py = ptr.y/Math.max(1, r.height); }
    wake();
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', function(){ ptr.inside = false; });
  if ('IntersectionObserver' in window) new IntersectionObserver(function(e){ visible = e[0].isIntersecting; if (visible) { last = 0; wake(); } }).observe(host);
  document.addEventListener('visibilitychange', function(){ last = 0; wake(); });
  wake();
  }
  if (host) make(host, { stops: GREENS, height: .17, brightness: 1, flip: false });
  /* sections from page 2 on keep a plain black background (no repeated auroras) */
  ['section.positioning', 'section.sgo-partners', 'section.om', 'section.sgo-trust', 'section.faq', 'section.cx'].forEach(function(sel){
    var sec = document.querySelector(sel);
    if (sec) sec.classList.add('rb-aurora');
  });
  /* one quiet green glow sits on every boundary between sections (half in the section above, half in the one
     below), alternating left/right, so the page flows instead of switching from block to block */
  var flow = [].slice.call(document.querySelectorAll('#site-content > section, #site-content > .svc-sec'))
    .filter(function(el){ return !el.hidden && !el.classList.contains('subpage') && !el.classList.contains('svc-hero') && el.tagName !== 'HEADER'; });
  flow.forEach(function(el){ el.classList.add('rb-aurora'); });
  var xs = [50, 18, 82, 22, 78, 30, 70];   /* boundary i sits above section i */
  flow.forEach(function(sec, i){
    var d = document.createElement('div');
    d.className = 'rb-flow'; d.setAttribute('aria-hidden', 'true');
    var top = xs[i], bot = xs[i + 1];
    var g = 'rgba(' + GLOW_RGB + ',';
    d.style.background =
      'radial-gradient(ellipse 46% 420px at ' + top + '% 0,' + g + (i ? '.13)' : '.07)') + ',' + g + '0) 100%),' +
      'radial-gradient(ellipse 46% 420px at ' + bot + '% 100%,' + g + (i < flow.length - 1 ? '.13)' : '.07)') + ',' + g + '0) 100%),' +
      /* plus a quiet light on one side in the middle, so no section reads as plain black */
      'radial-gradient(ellipse 38% 46% at ' + (i % 2 ? '100%' : '0%') + ' 55%,' + g + '.075),' + g + '0) 100%)';
    sec.insertBefore(d, sec.firstChild);
  });
})();

/* Orbit Images (React Bits OrbitImages idea, plain JS): illustrated service tiles travelling along a tilted ellipse
   with depth (back tiles smaller and dimmer), slower on hover, drag/swipe to spin. */
(function(){
  var sec = document.querySelector('section.sgo-trust');
  if (!sec) return;
  var reduce = false;   /* always spin, even when the OS asks for reduced motion */
  /* small dashboard-style cards (illustrative examples, no icons) */
  var tiles = [
    ['Padidėjusi gamyba', '24%+', 'Po gedimų pašalinimo', 'ok'],
    ['Prieinamumas', '99,8 %', 'Paskutinės 30 d.', ''],
    ['Aliarmas', 'Inverteris Nr. 2', 'Sutvarkyta', 'ok'],
    ['Diagnostika', 'Izoliacijos varža', 'Priežastis nustatyta', 'warn'],
    ['Servisas', 'Vizitas suderintas', 'Partneris vietoje', ''],
    ['Ataskaita', 'Mėnesio suvestinė', 'Išsiųsta klientui', '']
  ];
  var lastFs = '', rw = 0, rh = 0;
  var box = document.createElement('div');
  box.className = 'rb-orbit'; box.setAttribute('aria-hidden', 'true');
  var NS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'rb-orbit-path'); svg.setAttribute('aria-hidden', 'true');
  var e1 = document.createElementNS(NS, 'ellipse'), e2 = document.createElementNS(NS, 'ellipse');
  e1.setAttribute('class', 'rb-orbit-line'); e2.setAttribute('class', 'rb-orbit-line rb-orbit-line--outer');
  svg.appendChild(e2); svg.appendChild(e1); box.appendChild(svg);
  var core = document.createElement('div'); core.className = 'rb-orbit-core';
  core.innerHTML = '<img src="assets/sgo-logo-mark.webp" alt="">'; box.appendChild(core);
  var items = tiles.map(function(t){
    var d = document.createElement('div'); d.className = 'rb-orbit-item';
    d.innerHTML = '<span class="rb-oc-k">' + t[0] + '</span><b class="rb-oc-v">' + t[1] + '</b><span class="rb-oc-s' + (t[3] ? ' is-' + t[3] : '') + '"><i></i>' + t[2] + '</span>';
    box.appendChild(d); return d;
  });
  sec.appendChild(box);

  var lap = 0, manual = 0, speed = 1, hover = false, vel = 0, drag = null, last = 0, visible = true, raf = 0;
  var ROT = -8 * Math.PI / 180, DUR = 46;
  function layout(now){
    var W = box.clientWidth, H = box.clientHeight; if (!W || !H) return;
    var narrow = W < 700;
    var size = narrow ? W * .26 : Math.min(W * .22, 165);
    var rx = W / 2 - size * (narrow ? .55 : .62), ry = narrow ? H * .2 : Math.min(H * .26, 140);
    var cxm = W / 2, cym = H / 2, rot = ROT * 180 / Math.PI;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    [e1, e2].forEach(function(el, q){
      el.setAttribute('cx', cxm); el.setAttribute('cy', cym);
      el.setAttribute('rx', rx + (q ? 22 : 0)); el.setAttribute('ry', ry + (q ? 14 : 0));
      el.setAttribute('transform', 'rotate(' + rot + ' ' + cxm + ' ' + cym + ')');
    });
    core.style.transform = 'rotate(' + (((lap + manual) * 360) % 360).toFixed(2) + 'deg)';
    var fs = (1.2 * size / 22).toFixed(2) + 'px';
    if (fs !== lastFs) { lastFs = fs; items.forEach(function(it){ it.style.setProperty('font-size', fs, 'important'); }); rw = items[0].offsetWidth; rh = items[0].offsetHeight; }
    var n = items.length;
    for (var k = 0; k < n; k++){
      var a = (lap + manual + k / n) * Math.PI * 2;
      var x = Math.cos(a) * rx, y = Math.sin(a) * ry;
      var xr = x * Math.cos(ROT) - y * Math.sin(ROT), yr = x * Math.sin(ROT) + y * Math.cos(ROT);
      var d = Math.sin(a);                  /* -1 back .. 1 front */
      var s = .72 + .48 * ((d + 1) / 2);   /* .72 back .. 1.2 front: never shrinks below ~0.6 of its raster */
      var o = 1 - .55 * (1 - (d + 1) / 2);
      var it = items[k];
      /* each card is painted once at its front (largest) size and only scaled down from there */
      var k2 = s / 1.2;
      it.style.transform = 'translate3d(' + (W / 2 + xr - rw * k2 / 2).toFixed(2) + 'px,' + (H / 2 + yr - rh * k2 / 2).toFixed(2) + 'px,0) scale(' + k2.toFixed(4) + ')';
      it.style.opacity = o.toFixed(2);
      it.style.zIndex = String(10 + Math.round((d + 1) * 40));
    }
  }
  function frame(now){
    raf = 0;
    var dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
    var want = reduce ? 0 : (hover ? .3 : 1);
    speed += (want - speed) * (1 - Math.exp(-dt / .35));
    lap += dt * speed / DUR;
    if (!drag) { manual += vel * dt; vel *= Math.exp(-dt / .7); if (Math.abs(vel) < .0004) vel = 0; }
    layout(now);
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function wake(){ if (!raf && visible) { last = 0; raf = requestAnimationFrame(frame); } }
  box.addEventListener('pointerenter', function(){ hover = true; });
  box.addEventListener('pointerleave', function(){ hover = false; });
  box.addEventListener('pointerdown', function(e){ drag = { x: e.clientX, m: manual, t: performance.now(), px: e.clientX }; try { box.setPointerCapture(e.pointerId); } catch(_){} });
  box.addEventListener('pointermove', function(e){
    if (!drag) return;
    manual = drag.m + (e.clientX - drag.x) / (box.clientWidth * 1.9);
    var now = performance.now(); vel = ((e.clientX - drag.px) / (box.clientWidth * 1.9)) / Math.max(.016, (now - drag.t) / 1000);
    drag.px = e.clientX; drag.t = now;
  });
  function end(){ if (!drag) return; drag = null; vel = Math.max(-2, Math.min(2, vel)); }
  box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
  if ('IntersectionObserver' in window) new IntersectionObserver(function(e){ visible = e[0].isIntersecting; if (visible) wake(); }).observe(box);
  document.addEventListener('visibilitychange', wake);
  window.addEventListener('resize', function(){ layout(performance.now()); });
  /* paint the cards once at full size first, then promote them to GPU layers, so the cached
     bitmap is the sharp, largest version and every later frame only scales it down */
  requestAnimationFrame(function(){ requestAnimationFrame(function(){
    box.classList.add('is-live');
    layout(performance.now()); wake();
  }); });
})();

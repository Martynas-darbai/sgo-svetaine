/* Smooth, slightly slower scrolling (Lenis). Skipped for reduced motion; the services block keeps working because Lenis scrolls the real page. */
(function(){
  /* turned off: the smoothing (lerp .07, wheel x0.55) made scrolling feel laggy on the live site.
     Native scrolling is used instead. Set SMOOTH = true to bring it back. */
  var SMOOTH = false;
  if (!SMOOTH) return;
  if (!window.Lenis) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var lenis = new window.Lenis({ lerp: 0.07, smoothWheel: true, wheelMultiplier: 0.55 });
  window.__lenis = lenis;
  /* hide the cursor splash while the page is moving (keeps scrolling light, no glitching) */
  var scrollTimer = 0, lastY = window.scrollY;
  lenis.on('scroll', function(){
    var y = window.scrollY, moved = Math.abs(y - lastY); lastY = y;
    if (moved < 2) return;
    document.documentElement.classList.add('is-scrolling');
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function(){ document.documentElement.classList.remove('is-scrolling'); }, 140);
  });
  /* dragging the native scrollbar must not fight the smoothing: switch to 1:1 while the thumb is held */
  var smoothLerp = lenis.options.lerp;
  window.addEventListener('pointerdown', function(e){
    if (e.clientX >= document.documentElement.clientWidth - 1 && e.pointerType === 'mouse') {
      lenis.options.lerp = 1; lenis.options.smoothWheel = false;
      lenis.scrollTo(window.scrollY, { immediate: true });
      var done = function(){ lenis.options.lerp = smoothLerp; lenis.options.smoothWheel = true; window.removeEventListener('pointerup', done, true); window.removeEventListener('blur', done); };
      window.addEventListener('pointerup', done, true); window.addEventListener('blur', done);
    }
  }, true);
  function raf(t){ lenis.raf(t); requestAnimationFrame(raf); }
  requestAnimationFrame(raf);
  /* anchors / scrollIntoView go through Lenis too, so jumps are smooth as well */
  var orig = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function(opts){
    if (window.__lenis) { window.__lenis.scrollTo(this, { offset: -70, duration: 1.3 }); return; }
    return orig.call(this, opts);
  };
  /* script.js scrolls with window.scrollTo(0, y) and relied on CSS smooth scrolling, which Lenis replaces */
  var origTo = window.scrollTo;
  window.scrollTo = function(a, b){
    var obj = a && typeof a === 'object';
    var top = obj ? a.top : b;
    if (window.__lenis && typeof top === 'number') {
      var instant = obj && a.behavior === 'instant';
      window.__lenis.scrollTo(top, instant ? { immediate: true } : { duration: 1.4 });
      return;
    }
    return origTo.apply(window, arguments);
  };
})();

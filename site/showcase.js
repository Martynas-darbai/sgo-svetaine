/* =========================================================
   SERVICES SHOWCASE — auto-rotating scenes with a tab column.
   Monitoringas → Diagnostika → Servisas → … every `data-interval` ms.
   It keeps rotating while the visitor reads (no hover pause), and only
   waits while the block is off screen or the browser tab is hidden.
   As soon as the visitor picks a scene themselves (tab click, arrow keys
   or a swipe on phones) auto-rotation stops for good and they browse
   the scenes manually.
   ========================================================= */
(function(){
  var root = document.getElementById('sgo-showcase');
  if (!root) return;

  var scenes = Array.prototype.slice.call(root.querySelectorAll('.sgo-sc-scene'));
  var tabs = Array.prototype.slice.call(root.querySelectorAll('.sgo-sc-tab'));
  var stage = root.querySelector('.sgo-sc-stage');
  var interval = parseInt(root.getAttribute('data-interval'), 10) || 9000;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  root.style.setProperty('--sc-dur', interval + 'ms');

  var current = 0;
  var timer = null;
  var startedAt = 0;      // when the current countdown (re)started
  var remaining = interval;
  var inView = false;
  var manual = false;     // true once the visitor has chosen a scene
  var countRaf = null;

  function formatLt(n){
    return n.toFixed(1).replace('.', ',');
  }

  // Count the kWh figure up from 0 whenever its scene becomes active.
  function runCounters(scene){
    var els = scene.querySelectorAll('[data-sc-count]');
    if (!els.length) return;
    if (countRaf) cancelAnimationFrame(countRaf);
    var t0 = performance.now();
    var dur = reduceMotion ? 1 : 2600;
    function step(now){
      var p = Math.min(1, (now - t0) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      for (var i = 0; i < els.length; i++){
        var target = parseFloat(els[i].getAttribute('data-sc-count')) || 0;
        els[i].textContent = formatLt(target * eased);
      }
      if (p < 1) countRaf = requestAnimationFrame(step);
    }
    countRaf = requestAnimationFrame(step);
  }

  function restartProgress(){
    // Re-trigger the CSS progress bar animation on the active tab.
    root.classList.remove('is-running');
    void root.offsetWidth;
    root.classList.add('is-running');
  }

  function show(index, opts){
    if (opts && opts.manual && !manual) {
      manual = true;
      root.classList.add('is-manual');
    }
    index = (index + scenes.length) % scenes.length;
    var prev = current;
    current = index;

    scenes.forEach(function(scene, i){
      var active = i === index;
      if (active) {
        // remove + reflow + add so the scene's animations replay
        scene.classList.remove('is-active', 'is-leaving');
        void scene.offsetWidth;
        scene.classList.add('is-active');
      } else {
        if (i === prev && prev !== index) {
          scene.classList.add('is-leaving');
          (function(s){ setTimeout(function(){ s.classList.remove('is-leaving'); }, 750); })(scene);
        }
        scene.classList.remove('is-active');
      }
      scene.setAttribute('aria-hidden', active ? 'false' : 'true');
      var links = scene.querySelectorAll('a');
      for (var k = 0; k < links.length; k++){
        if (active) links[k].removeAttribute('tabindex'); else links[k].setAttribute('tabindex', '-1');
      }
    });

    tabs.forEach(function(tab, i){
      var active = i === index;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.setAttribute('tabindex', active ? '0' : '-1');
    });

    runCounters(scenes[index]);

    remaining = interval;
    restartProgress();
    schedule();
    if (opts && opts.focusTab) tabs[index].focus();
  }

  // Reduced-motion users still get the rotation (it is content, not
  // decoration); the CSS shows each console's final state instantly.
  function shouldRun(){
    return inView && !document.hidden && !manual;
  }

  function schedule(){
    clearTimeout(timer);
    timer = null;
    if (!shouldRun()) {
      root.classList.add('is-paused');
      return;
    }
    root.classList.remove('is-paused');
    startedAt = performance.now();
    timer = setTimeout(function(){ show(current + 1); }, remaining);
  }

  function pause(){
    if (timer) {
      clearTimeout(timer);
      timer = null;
      remaining = Math.max(400, remaining - (performance.now() - startedAt));
    }
    root.classList.add('is-paused');
  }

  function update(){
    if (shouldRun()) {
      if (!timer) schedule();
    } else {
      pause();
    }
  }

  // Tabs: click, and arrow keys within the tab list.
  tabs.forEach(function(tab, i){
    tab.addEventListener('click', function(){ show(i, { manual: true }); });
    tab.addEventListener('keydown', function(e){
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); show(current + 1, { focusTab: true, manual: true }); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); show(current - 1, { focusTab: true, manual: true }); }
    });
  });

  // Round arrow on the right: next scene (manual browsing from then on).
  var nextBtn = root.querySelector('.sgo-sc-next');
  if (nextBtn) nextBtn.addEventListener('click', function(){ show(current + 1, { manual: true }); });

  document.addEventListener('visibilitychange', update);

  // Swipe on touch screens.
  var touchX = null, touchY = null;
  stage.addEventListener('touchstart', function(e){
    touchX = e.touches[0].clientX; touchY = e.touches[0].clientY;
  }, { passive: true });
  stage.addEventListener('touchend', function(e){
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    var dy = e.changedTouches[0].clientY - touchY;
    touchX = touchY = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(current + (dx < 0 ? 1 : -1), { manual: true });
  }, { passive: true });

  // Start from the first scene the first time the block scrolls into view.
  var startedOnce = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function(entries){
      inView = entries[0].isIntersecting;
      if (inView && !startedOnce) { startedOnce = true; if (!manual) { show(0); return; } }
      update();
    }, { threshold: 0.35 }).observe(root);
  } else {
    inView = true;
    show(0);
  }

  /* Desktop: the block stays on screen while scrolling, and the scroll position chooses the scene
     (Monitoringas -> Diagnostika -> Servisas). No waiting for the timer. */
  var mqScroll = window.matchMedia('(min-width: 901px) and (min-height: 700px)');
  var wrap = null;
  function scrollIndex(){
    var r = wrap.getBoundingClientRect();
    sizeWrap();
    var span = wrap.offsetHeight - root.offsetHeight;
    if (span <= 0) return current;
    var p = Math.max(0, Math.min(0.999, -r.top / span));
    return Math.floor(p * scenes.length);
  }
  /* the wrapper is exactly the block plus the scroll distance for the three scenes, so nothing empty is left below */
  var blockH = 0;
  function sizeWrap(){
    if (!wrap) return;
    var h = Math.max(root.offsetHeight, 520, blockH);
    if (h === blockH && wrap.style.height) return;
    blockH = h;
    root.style.top = Math.max(104, Math.round((window.innerHeight - h) / 2) + 22) + 'px';
    /* ~0.75 of a screen of scrolling per scene, so each one (Diagnostika in the middle too) has time to play */
    wrap.style.height = Math.round(h + window.innerHeight * 0.75 * scenes.length) + 'px';
  }
  window.addEventListener('resize', function(){ blockH = 0; sizeWrap(); });
  var ticking = false;
  function onScroll(){
    if (ticking || !wrap) return;
    ticking = true;
    requestAnimationFrame(function(){
      ticking = false;
      var i = scrollIndex();
      if (i !== current) show(i, { manual: true });
    });
  }
  function setScrollMode(){
    if (mqScroll.matches && !wrap) {
      wrap = document.createElement('div');
      wrap.className = 'sgo-sc-scrollwrap';
      root.parentNode.insertBefore(wrap, root);
      wrap.appendChild(root);
      root.classList.add('is-scroll-driven');
      manual = true; root.classList.add('is-manual'); pause();
      sizeWrap();
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    } else if (!mqScroll.matches && wrap) {
      window.removeEventListener('scroll', onScroll);
      wrap.parentNode.insertBefore(root, wrap);
      wrap.parentNode.removeChild(wrap);
      wrap = null;
      root.classList.remove('is-scroll-driven');
    }
  }
  setScrollMode();
  if (mqScroll.addEventListener) mqScroll.addEventListener('change', setScrollMode);
})();

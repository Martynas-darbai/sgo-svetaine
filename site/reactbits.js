/* React Bits-style effects in plain JS (no React): Spotlight cards, Blur Text headings.
   Skipped for reduced motion. */
(function(){
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Spotlight: a soft green light follows the cursor over the card */
  document.querySelectorAll('.faq-item, .cx-info').forEach(function(el){
    el.classList.add('rb-spot');
    el.addEventListener('pointermove', function(e){
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
    el.addEventListener('pointerleave', function(){ el.style.removeProperty('--mx'); el.style.removeProperty('--my'); });
  });

  /* Footer logo: the pieces rise in one after another when the footer is reached */
  var ft = document.querySelector('footer.ft');
  if (ft) {
    if (reduce || !('IntersectionObserver' in window)) ft.classList.add('ft-in');
    else {
      var fo = new IntersectionObserver(function(e){ if (e[0].isIntersecting) { ft.classList.add('ft-in'); fo.disconnect(); } }, { threshold: .15 });
      fo.observe(ft);
    }
  }

  /* Trust section: three plain stats right under the text (replaces the old stat block) */
  var tc = document.querySelector('section.sgo-trust .sgo-trust-content');
  /* trust section heading, rebuilt as plain markup (the old one was assembled from CSS pseudo text) */
  if (tc && !tc.querySelector('.rb-trust-head')) {
    var th = document.createElement('div');
    th.className = 'rb-trust-head';
    th.innerHTML = '<span class="rb-trust-kicker">Kai svarbu, kad</span>' +
      '<h2 class="rb-trust-title">jūsų elektrinė<br>veiktų <span class="rb-g">sklandžiai.</span></h2>' +
      '<p class="rb-trust-lede">Stebime elektrinės veikimą, laiku pastebime sutrikimus ir koordinuojame reikalingus serviso darbus. Viskas tam, kad jūsų elektrinė veiktų kuo sklandžiau.</p>';
    tc.insertBefore(th, tc.firstChild);
  }
  if (tc && !tc.querySelector('.rb-stats')) {
    var st = document.createElement('div');
    st.className = 'rb-stats';
    st.innerHTML = '<div><b>250+</b><span>sutvarkytų aliarmų</span></div><i aria-hidden="true"></i><div><b>24%+</b><span>padidėjusi gamyba</span></div><i aria-hidden="true"></i><div><b>235+</b><span>prižiūrimų elektrinių</span></div>';
    var lede = tc.querySelector('.rb-trust-lede') || tc.querySelector('.sgo-trust-lede');
    if (lede) lede.insertAdjacentElement('afterend', st); else tc.appendChild(st);
  }

  /* Blur Text: headings appear word by word (blur -> sharp) when scrolled into view */
  if (reduce || !('IntersectionObserver' in window)) return;
  var heads = [].slice.call(document.querySelectorAll('#site-content h2')).filter(function(h){
    return !h.closest('header.hero') && !h.closest('[hidden]') && (h.textContent || '').trim().length > 3;
  });
  function split(node, out){
    [].slice.call(node.childNodes).forEach(function(n){
      if (n.nodeType === 3) {
        var parts = n.textContent.split(/(\s+)/);
        var frag = document.createDocumentFragment();
        parts.forEach(function(p){
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
          var s = document.createElement('span');
          s.className = 'rb-word'; s.textContent = p;
          frag.appendChild(s); out.push(s);
        });
        n.parentNode.replaceChild(frag, n);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') split(n, out);
    });
  }
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      e.target.classList.add('rb-in');
    });
  }, { threshold: .35 });
  heads.forEach(function(h){
    var words = []; split(h, words);
    words.forEach(function(w, i){ w.style.transitionDelay = (i * 70) + 'ms'; });
    h.classList.add('rb-blur');
    io.observe(h);
  });
})();

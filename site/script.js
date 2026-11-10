(function(){
  /* Desktop pointer glow — intentionally uses mousemove rather than
     pointer:fine detection so it also works in desktop emulation. */
  function initMouseGlow(){
    return;   /* pointer glow is switched off in the stylesheet; no point in running its per-frame loop */
    if(!document.body || document.querySelector('.sgo-mouse-glow')) return;

    var glow=document.createElement('div');
    glow.className='sgo-mouse-glow';
    glow.setAttribute('aria-hidden','true');
    document.body.appendChild(glow);

    var x=-9999, y=-9999, tx=-9999, ty=-9999, active=false;

    function render(){
      x += (tx-x)*0.14;
      y += (ty-y)*0.14;
      glow.style.transform='translate3d('+x.toFixed(1)+'px,'+y.toFixed(1)+'px,0)';
      requestAnimationFrame(render);
    }

    function showAt(mx,my){
      tx=mx; ty=my;
      if(!active){
        x=mx; y=my; active=true;
        glow.style.opacity='1';
      }
    }

    window.addEventListener('mousemove',function(e){
      showAt(e.clientX,e.clientY);
    },{passive:true});

    window.addEventListener('blur',function(){
      active=false;
      glow.style.opacity='0';
    });

    window.addEventListener('focus',function(){
      if(active) glow.style.opacity='1';
    });

    render();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initMouseGlow,{once:true});
  }else{
    initMouseGlow();
  }
})();
(function(){
  /* CONTINUOUS HERO SWEEP — colours travel left to right forever.
     Time starts at 0 when the script starts, which matches the CSS
     starting position (0 0), so there is no jump when the page loads. */
  var PERIOD=4600;
  var TILE=240; /* must equal the repeating-gradient tile width in styles.css */
  var START=performance.now();
  var reduceMotion=window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function paint(){
    var accents=document.querySelectorAll('.hero-headline-accent');
    if(!accents.length) return;
    /* the word is solid green until this point, so it is never invisible while the gradient is being set up */
    document.documentElement.classList.add('accent-sweep');
    if(reduceMotion){
      accents.forEach(function(el){
        el.style.animation='none';
        el.style.backgroundPosition='0 0';
      });
      return;
    }

    var heroEl=accents[0].closest('header,section');
    if(heroEl && heroEl.classList.contains('is-offscreen')){ requestAnimationFrame(paint); return; }
    var phase=(performance.now()-START)%PERIOD;
    /* Positive offset = colours travel from left to right. */
    var px=(phase/PERIOD)*TILE;

    accents.forEach(function(el){
      el.style.animation='none';
      el.style.backgroundPosition=px.toFixed(3)+'px 0';
      el.style.webkitBackgroundPosition=px.toFixed(3)+'px 0';
    });

    requestAnimationFrame(paint);
  }

  function start(){ /* sweep switched off: the word stays plain green */ }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',start,{once:true});
  }else{
    start();
  }
})();

(function(){
  /* Never restore an old scroll position automatically on the homepage.
     Anchors such as #kontaktai/#paslaugos still work normally. */
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  function forceHomepageTop(){
    if (window.location.hash) return;
    window.scrollTo(0,0);
  }

  forceHomepageTop();

  window.addEventListener('pageshow', function(){
    if (!window.location.hash) {
      requestAnimationFrame(function(){
        requestAnimationFrame(forceHomepageTop);
      });
    }
  });
})();

(function(){
  var siteContent = document.getElementById('site-content');
  var subpages = document.querySelectorAll('.subpage');
  if (!siteContent || !subpages.length) return;

  function showSubpage(hash){
    var matched = null;
    subpages.forEach(function(sp){
      if ('#' + sp.id === hash) matched = sp;
    });
    subpages.forEach(function(sp){ sp.hidden = (sp !== matched); });
    siteContent.hidden = !!matched;
    document.body.classList.toggle('is-subpage', !!matched);
    document.body.classList.toggle('is-legal-page', !!matched && matched.classList.contains('legal-page'));
    return matched;
  }

  function jumpTo(y){
    var html = document.documentElement;
    var prev = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    window.scrollTo(0, y);
    requestAnimationFrame(function(){ html.style.scrollBehavior = prev || ''; });
  }

  function route(hash){
    var wasOnSubpage = siteContent.hidden;
    var currentSubpage = null;
    subpages.forEach(function(sp){
      if (!sp.hidden) currentSubpage = sp;
    });

    var id = hash ? hash.slice(1) : '';
    var target = id ? document.getElementById(id) : null;

    /* Keep the current legal page open when clicking its local TOC links. */
    if (currentSubpage && target && currentSubpage.contains(target) && target !== currentSubpage) {
      jumpTo(target.getBoundingClientRect().top + window.scrollY - 28);
      return currentSubpage;
    }

    /* Navigation links from a legal page can target normal homepage
       sections. Reveal the homepage first, then perform the jump. */
    if (wasOnSubpage && target && siteContent.contains(target) && !currentSubpage.contains(target)) {
      showSubpage('');
      jumpTo(target.getBoundingClientRect().top + window.scrollY);
      return;
    }

    /* A section inside a hidden subpage (e.g. #privatumo-slapukai): open that subpage, then jump to the section. */
    var owner = target && target.closest ? target.closest('.subpage') : null;
    if (owner && owner.hidden) {
      showSubpage('#' + owner.id);
      jumpTo(target.getBoundingClientRect().top + window.scrollY - 28);
      return owner;
    }

    var matched = showSubpage(hash);
    if (matched) {
      jumpTo(0);
      return matched;
    }

    if (!target) {
      jumpTo(0);
      return;
    }

    if (wasOnSubpage) {
      jumpTo(target.getBoundingClientRect().top + window.scrollY);
    } else {
      target.scrollIntoView();
    }
  }

  /* Homepage sections (#duk, #kontaktai, ...) are scrolled to without leaving "#section" in the address bar.
     Legal pages and other subpages keep their hash because the router needs it. */
  function isHomeSection(hash){
    var t = hash ? document.getElementById(hash.slice(1)) : null;
    return !!(t && siteContent.contains(t) && !(t.closest && t.closest('.subpage')));
  }
  function cleanUrl(){ history.replaceState(null, '', window.location.pathname + window.location.search); }

  route(window.location.hash);
  if (isHomeSection(window.location.hash)) cleanUrl();

  document.addEventListener('click', function(e){
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var hash = a.getAttribute('href');
    if (!hash || hash === '#') return;
    e.preventDefault();
    var home = isHomeSection(hash);
    if (!home && window.location.hash !== hash) {
      history.pushState(null, '', hash);
    }
    route(hash);
    if (home) cleanUrl();
  });

  window.addEventListener('popstate', function(){
    route(window.location.hash);
  });
})();

(function(){
  var nav = document.querySelector('.nav');
  if (!nav) return;
  var THRESHOLD = 40;
  var ticking = false;

  function update(){
    ticking = false;
    nav.classList.toggle('nav-scrolled', window.scrollY > THRESHOLD);
  }
  function onScroll(){
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  update();
  window.addEventListener('scroll', onScroll, { passive: true });
})();

(function(){
  var form = document.getElementById('contact-form');
  if(!form) return;

  var fields = form.querySelectorAll('[required]');
  function validateField(field){
    field.setCustomValidity('');
    if (field.validity.valueMissing) {
      field.setCustomValidity('Prašome užpildyti šį lauką.');
    } else if (field.validity.typeMismatch) {
      field.setCustomValidity('Įveskite teisingą el. pašto adresą.');
    }
  }
  for (var i = 0; i < fields.length; i++) {
    (function(field){
      validateField(field);
      field.addEventListener('input', function(){ validateField(field); });
      field.addEventListener('change', function(){ validateField(field); });
      field.addEventListener('blur', function(){ validateField(field); });
      field.addEventListener('invalid', function(){ validateField(field); });
    })(fields[i]);
  }

  var formStamp = form.querySelector('[name="form_t"]');
  if (formStamp) { formStamp.value = String(Date.now()); }
  var statusEl = form.querySelector('.form-status');
  var submitBtn = form.querySelector('.form-submit');

  function showStatus(text, kind){
    statusEl.textContent = text;
    statusEl.className = 'form-status ' + kind;
    statusEl.hidden = false;
  }

  form.addEventListener('submit', function(e){
    e.preventDefault();
    var name = form.name.value.trim();
    var email = form.email.value.trim();
    var phone = form.phone.value.trim();
    var city = form.city.value.trim();
    var service = form.service.value;
    var power = form.power.value;
    var message = form.message.value.trim();
    var subject = 'Užklausa iš svetainės — ' + (name || 'be vardo');
    var body = [
      'Vardas: ' + name,
      'El. paštas: ' + email,
      'Tel. nr.: ' + (phone || 'nenurodyta'),
      'Miestas: ' + (city || 'nenurodytas'),
      'Paslauga: ' + (service || 'nenurodyta'),
      'Elektrinės galia: ' + (power || 'nenurodyta'),
      '',
      message
    ].join('\n');
    var mailtoUrl = 'mailto:info@sgo.lt?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);

    submitBtn.disabled = true;
    submitBtn.textContent = 'Siunčiama...';

    /* With attachments (service pages) the form goes as multipart/form-data,
       otherwise as JSON like before. */
    var fileInput = form.querySelector('input[type="file"]');
    var hasFiles = !!(fileInput && fileInput.files && fileInput.files.length);
    var request = hasFiles ? {
      method: 'POST',
      body: new FormData(form)
    } : {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, email: email, phone: phone, city: city, service: service, power: power, message: message,
        hp_check: (form.hp_check ? form.hp_check.value : ''), form_t: (form.form_t ? form.form_t.value : '') })
    };
    var serverError = '';

    fetch('/send-mail.php', request)
      .then(function(res){
        return res.json().catch(function(){ return {}; }).then(function(data){
          if (!res.ok || !data || !data.success) {
            serverError = (data && data.error) || '';
            throw new Error('failed');
          }
          return data;
        });
      })
      .then(function(){
        showStatus('Ačiū! Žinutė išsiųsta — susisieksime kuo greičiau.', 'ok');
        if (window.sgoTrackLead) window.sgoTrackLead();
        form.reset();
      })
      .catch(function(){
        if (hasFiles) {
          /* a mailto: link cannot carry the files, so explain instead */
          showStatus(serverError || 'Nepavyko išsiųsti. Pabandykite dar kartą arba parašykite mums info@sgo.lt.', 'err');
          return;
        }
        window.location.href = mailtoUrl;
      })
      .finally(function(){
        submitBtn.disabled = false;
        submitBtn.textContent = 'Išsiųsti žinutę';
      });
  });
})();

(function(){
  var footer = document.querySelector('footer');
  if (!footer) return;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !('IntersectionObserver' in window)) {
    footer.classList.add('in-view');
    return;
  }
  var obs = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (entry.isIntersecting) {
        footer.classList.add('in-view');
        obs.unobserve(footer);
      }
    });
  }, { threshold: 0.15 });
  obs.observe(footer);
})();

(function(){
  var riskCard = document.querySelector('.risk-stat-block');
  if (!riskCard) return;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !('IntersectionObserver' in window)) {
    riskCard.classList.add('in-view');
    return;
  }
  var obs = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (entry.isIntersecting) {
        riskCard.classList.add('in-view');
        obs.unobserve(riskCard);
      }
    });
  }, { threshold: 0.25 });
  obs.observe(riskCard);
})();

(function(){
  var els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !('IntersectionObserver' in window)) {
    els.forEach(function(el){ el.classList.add('in-view'); });
    return;
  }
  var obs = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  els.forEach(function(el){ obs.observe(el); });
})();

(function(){
  var visual = document.querySelector('.hero-visual');
  if (!visual) return;
  var items = visual.querySelectorAll('.hero-chip, .hero-meter, .hero-result');
  if (!items.length) return;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;
  visual.classList.add('anno-staged');
  var chips = [].slice.call(visual.querySelectorAll('.hero-chip'));
  var result = visual.querySelector('.hero-result');
  items.forEach(function(el, i){
    if (el === result) return;            /* the result line is driven by the chips, see sync() */
    setTimeout(function(){ el.classList.add('is-in'); }, 900 + i * 750);
  });
  /* "Sistema veikia optimaliai" appears when every visible chip is shown and goes only when all are gone (chips come and go
     on their own schedule below), and goes away as soon as one of them fades out */
  function sync(){
    if (!result) return;
    var need = chips.filter(function(c){ return getComputedStyle(c).display !== 'none'; });
    var shown = need.filter(function(c){
      return c.classList.contains('is-in') && !c.classList.contains('is-cycled-out');
    }).length;
    /* appears once ALL chips are shown, disappears only once ALL of them are gone */
    if (need.length && shown === need.length) result.classList.add('is-in');
    else if (shown === 0) result.classList.remove('is-in');
  }
  if (window.MutationObserver) {
    var mo = new MutationObserver(sync);
    chips.forEach(function(c){ mo.observe(c, { attributes: true, attributeFilter: ['class'] }); });
  }
  window.addEventListener('resize', sync);
  sync();
})();

(function(){
  var visual = document.querySelector('.hero-visual');
  if (!visual) return;
  var numEl = visual.querySelector('.hero-meter-num--count');
  if (!numEl) return;
  var valEl = numEl.querySelector('.hero-meter-count-val');
  var target = parseFloat(numEl.getAttribute('data-count-to'));
  if (!valEl || !target) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  valEl.textContent = '0.0';

  var DURATION = 1350;
  function runCount(){
    var start = null;
    function step(ts){
      if (start === null) start = ts;
      var p = Math.min((ts - start) / DURATION, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      valEl.textContent = (eased * target).toFixed(1);
      if (p < 1) {
        requestAnimationFrame(step);
      } else {
        valEl.textContent = target.toFixed(1);
      }
    }
    requestAnimationFrame(step);
  }

  setTimeout(runCount, 900 + 3 * 750);
})();

(function(){
  var visual = document.querySelector('.hero-visual');
  if (!visual) return;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  var FADE = 700;
  var chips = [].slice.call(visual.querySelectorAll('.hero-chip'));
  if (!chips.length) return;

  /* All chips leave together and come back one after another; "Sistema veikia optimaliai"
     follows them (it appears when all are shown and goes when all are gone). */
  function hideAll(){
    chips.forEach(function(c){ c.classList.add('is-cycled-out'); });
    setTimeout(showAll, FADE + 1400);
  }
  function showAll(){
    chips.forEach(function(c, i){
      setTimeout(function(){ c.classList.remove('is-cycled-out'); }, i * 750);
    });
    setTimeout(hideAll, (chips.length - 1) * 750 + FADE + 8000);
  }
  /* chips pop up once and stay (no hide/show cycle) */
})();

(function(){
  var kpi = document.querySelector('.hero-kpi');
  if (!kpi) return;
  var countEls = kpi.querySelectorAll('.hero-kpi-num--count');
  if (!countEls.length) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !('IntersectionObserver' in window)) return;

  var items = [];
  countEls.forEach(function(numEl){
    var valEl = numEl.querySelector('.hero-kpi-count-val');
    var target = parseInt(numEl.getAttribute('data-count-to'), 10) || 0;
    if (!valEl || !target) return;
    numEl.classList.add('is-counting');
    valEl.textContent = '0';
    items.push({ numEl: numEl, valEl: valEl, target: target });
  });
  if (!items.length) return;

  var DURATION = 1300;
  function runAll(){
    var start = null;
    function step(ts){
      if (start === null) start = ts;
      var p = Math.min((ts - start) / DURATION, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      items.forEach(function(item){
        item.valEl.textContent = Math.round(eased * item.target);
      });
      if (p < 1) {
        requestAnimationFrame(step);
      } else {
        items.forEach(function(item){
          item.valEl.textContent = item.target;
          item.numEl.classList.remove('is-counting');
        });
      }
    }
    requestAnimationFrame(step);
  }

  var obs = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (entry.isIntersecting) {
        runAll();
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  obs.observe(kpi);
})();

(function(){
  var journey = document.querySelector('.journey');
  if (!journey) return;
  var nums = journey.querySelectorAll('.journey-num');
  if (!nums.length) return;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !('IntersectionObserver' in window)) {
    nums.forEach(function(el){ el.classList.add('is-popped'); });
    return;
  }
  var obs = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (entry.isIntersecting) {
        nums.forEach(function(el, i){
          setTimeout(function(){ el.classList.add('is-popped'); }, i * 180);
        });
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.35 });
  obs.observe(journey);
})();

(function(){
  var list = document.getElementById('reviews-list');
  var pagination = document.getElementById('reviews-pagination');
  if (!list || !pagination) return;

  var rows = Array.prototype.slice.call(list.querySelectorAll('.review-row'));
  var pageBtns = Array.prototype.slice.call(pagination.querySelectorAll('.reviews-page-btn[data-page]'));
  var prevBtn = document.getElementById('reviews-prev');
  var nextBtn = document.getElementById('reviews-next');
  var totalPages = pageBtns.length;

  function showPage(page){
    rows.forEach(function(row){
      row.hidden = (row.getAttribute('data-page') !== String(page));
    });
    pageBtns.forEach(function(btn){
      if (btn.getAttribute('data-page') === String(page)) {
        btn.setAttribute('aria-current', 'page');
      } else {
        btn.removeAttribute('aria-current');
      }
    });
    prevBtn.disabled = (page <= 1);
    nextBtn.disabled = (page >= totalPages);
    prevBtn.dataset.page = String(Math.max(1, page - 1));
    nextBtn.dataset.page = String(Math.min(totalPages, page + 1));
  }

  pageBtns.forEach(function(btn){
    btn.addEventListener('click', function(){
      showPage(parseInt(btn.getAttribute('data-page'), 10));
      list.scrollIntoView({ block: 'start' });
    });
  });
  prevBtn.addEventListener('click', function(){
    showPage(parseInt(prevBtn.dataset.page, 10));
    list.scrollIntoView({ block: 'start' });
  });
  nextBtn.addEventListener('click', function(){
    showPage(parseInt(nextBtn.dataset.page, 10));
    list.scrollIntoView({ block: 'start' });
  });

  showPage(1);
})();

(function(){
  var burger=document.getElementById('nav-burger');
  var panel=document.getElementById('nav-mobile');
  if(!burger||!panel) return;

  function setOpen(open){
    panel.hidden=!open;
    panel.classList.toggle('is-open',open);
    panel.setAttribute('aria-hidden',open?'false':'true');
    panel.style.display=open?'flex':'none';
    panel.style.pointerEvents=open?'auto':'none';
    burger.setAttribute('aria-expanded',open?'true':'false');
    document.body.classList.toggle('nav-menu-open',open);
  }

  window.__sgoMenuToggle=function(e){
    if(e){
      e.preventDefault();
      e.stopPropagation();
    }
    setOpen(panel.hidden);
  };

  window.__sgoMenuClose=function(){
    setOpen(false);
  };

  setOpen(false);

  panel.addEventListener('click',function(e){
    var link=e.target.closest?e.target.closest('a'):null;
    if(link) setOpen(false);
  });

  document.addEventListener('keydown',function(e){
    if(e.key==='Escape') setOpen(false);
  });

  window.addEventListener('resize',function(){
    if(window.innerWidth>900) setOpen(false);
  });

  window.addEventListener('hashchange',function(){
    setOpen(false);
  });
})();

(function(){
  var items = document.querySelectorAll('.faq-item');
  if (!items.length) return;

  function setOpenHeight(item){
    var a = item.querySelector('.faq-a');
    if (a) { a.style.maxHeight = a.scrollHeight + 'px'; }
  }
  function openItem(item){
    item.setAttribute('open', '');
    setOpenHeight(item);
  }
  function closeItem(item){
    var a = item.querySelector('.faq-a');
    if (a) { a.style.maxHeight = '0px'; }
    item.removeAttribute('open');
  }

  items.forEach(function(item){
    var summary = item.querySelector('summary');
    summary.addEventListener('click', function(e){
      e.preventDefault();
      var isOpen = item.hasAttribute('open');
      items.forEach(function(other){
        if (other !== item && other.hasAttribute('open')) { closeItem(other); }
      });
      if (isOpen) { closeItem(item); } else { openItem(item); }
    });
    if (item.hasAttribute('open')) { setOpenHeight(item); }
  });

  window.addEventListener('resize', function(){
    items.forEach(function(item){
      if (item.hasAttribute('open')) { setOpenHeight(item); }
    });
  });
})();

/* =========================================================
   SGO — KLIENTŲ PASITIKĖJIMAS / KLIPINK-STYLE MOVING WALL
   Uses the real review copy already published on the site.
   The wall is built from a long interleaved sequence to avoid visible repeats.
   ========================================================= */
(function(){
  if (document.getElementById('sgo-trust-wall')) return;

  var services = document.getElementById('paslaugos');
  if (!services || !services.parentNode) return;

  var cards = [
    {q:'Elektrinė sustojo per audrą, o SGO komanda tai pastebėjo nuotoliniu būdu anksčiau, nei aš pats būčiau supratęs. Per parą viskas vėl veikė, ir dar paskambino paaiškinti, kas atsitiko — labai vertinu tokį rūpestį.', meta:'Rimantas K. · Saulės elektrinės savininkas · Šilutė', tag:'Monitoringas', size:'tall'},
    {q:'Kiekvienas apžiūros vizitas baigiasi aiškia ataskaita — matau tiksliai, kas patikrinta ir ar reikia kokių nors veiksmų. Jaučiu, kad elektrinė tikrai prižiūrima, o ne tiesiog pamiršta po įrengimo.', meta:'Giedrė M. · Saulės elektrinės savininkė · Plungė', tag:'Priežiūra', size:'medium'},
    {q:'Gedimo priežastį rado tiksliai ir greitai, o svarbiausia — problema daugiau nebepasikartojo. Malonu, kad viskas paaiškinta suprantamai, be nereikalingo techninio žargono.', meta:'Tomas P. · Saulės elektrinės savininkas · Mažeikiai', tag:'Diagnostika', size:'medium'},
    {q:'Turime pramoninį stogą su keliais moduliais — SGO koordinuoja visus darbus taip, kad man pačiai nereikia ieškoti, kam skambinti. Visi susiję klausimai sprendžiami per vieną kontaktą, ir tai tikrai taupo laiką.', meta:'Jolanta S. · Įmonės atstovė · Klaipėda', tag:'Servisas', size:'tall'},
    {q:'Stebėjimo sistema iškart parodo, jei gamyba sumažėja — nebelaukiu, kol pats pastebėsiu tik sąskaitoje. Jaučiuosi ramesnis žinodamas, kad elektrinę kažkas realiai stebi kiekvieną dieną.', meta:'Darius V. · Saulės elektrinės savininkas · Kretinga', tag:'Monitoringas', size:'medium'},
    {q:'Servisas atvažiavo sutartu laiku, dirbo tvarkingai ir viską paaiškino suprantamai, be nereikalingo techninio žargono. Po vizito gavau ir trumpą ataskaitą el. paštu — viskas labai skaidru.', meta:'Eglė N. · Namų ūkis · Tauragė', tag:'Servisas', size:'short'},
    {q:'Kai reikia realaus vizito objekte, viskas sutvarkoma greitai ir kruopščiai — jokių atidėliojimų. Matyti, kad komanda tikrai išmano savo darbą ir vertina kliento laiką.', meta:'Vytautas L. · Saulės elektrinės savininkas · Skuodas', tag:'Reakcija', size:'medium'},
    {q:'Prieš SGO nežinojau, kad elektrinei apskritai reikia periodinės priežiūros. Dabar jaučiuosi kur kas ramiau dėl savo investicijos, žinodama, kad kažkas seka, ar viskas veikia, kaip turi.', meta:'Aušra R. · Namų ūkis · Rietavas', tag:'Priežiūra', size:'tall'},
    {q:'Metinė apžiūra ir ataskaita padeda planuoti biudžetą — iš anksto matau, kokie komponentai artėja prie keitimo. Tai leidžia išvengti netikėtų išlaidų ir planuoti viską ramiai.', meta:'Saulius B. · Saulės elektrinės savininkas · Telšiai', tag:'Diagnostika', size:'medium'},
    {q:'Vertinu, kad viena komanda atsako už viską — monitoringą, diagnostiką ir remontą. Nereikia derinti kelių skirtingų rangovų, o tai iš tikrųjų sutaupo daug laiko ir nervų.', meta:'Ieva Č. · Namų ūkis · Gargždai', tag:'Servisas', size:'tall'}
  ];  function cardHtml(card){
    return '' +
      '<article class="sgo-trust-card sgo-trust-card--' + card.size + '">' +
        '<div class="sgo-trust-card-top">' +
          '<span class="sgo-trust-card-stars" aria-label="Įvertinimas: 5 iš 5">★★★★★</span>' +
        '</div>' +
        '<p class="sgo-trust-card-quote">„' + card.q + '“</p>' +
        '<div class="sgo-trust-card-meta">' + card.meta + '</div>' +
      '</article>';
  }

  function groupHtml(indexes){
    var out = '';
    indexes.forEach(function(index){
      out += cardHtml(cards[index]);
    });
    return out;
  }

  var section = document.createElement('section');
  section.id = 'sgo-trust-wall';
  section.className = 'sgo-trust';
  section.setAttribute('aria-labelledby','sgo-trust-title');

  var columns = '';
  var sets = [
    [0,1,2,3,4],
    [5,6,7,8,9]
  ];

  for (var c = 0; c < 2; c++) {
    var seq = sets[c];
    var repeated = seq.concat(seq);
    columns +=
      '<div class="sgo-trust-column sgo-trust-column--' + (c + 1) + '">' +
        '<div class="sgo-trust-column-track">' +
          groupHtml(repeated) +
        '</div>' +
      '</div>';
  }

  section.innerHTML =
    '<div class="sgo-trust-backdrop" aria-hidden="true"></div>' +
    '<div class="sgo-trust-wall" aria-hidden="true">' +
      '<div class="sgo-trust-wall-glow"></div>' +
      '<div class="sgo-trust-wall-columns">' + columns + '</div>' +
    '</div>' +
    '<div class="sgo-trust-veil" aria-hidden="true"></div>' +
    '<div class="sgo-trust-content">' +
      '<div class="sgo-trust-eyebrow">Klientų pasitikėjimas</div>' +
      '<h2 id="sgo-trust-title">Kai svarbu, kad elektrinė veiktų be nereikalingų prastovų.</h2>' +
      '<p class="sgo-trust-lede">Čia rodysime realias SGO klientų patirtis iš saulės elektrinių monitoringo, diagnostikos ir serviso.</p>' +
      '<div class="sgo-trust-proof">' +
        '<strong>Reali klientų patirtis.</strong>' +
        '<span>Tikri atsiliepimai, kai juos turėsime patvirtintus ir paruoštus viešinti.</span>' +
      '</div>' +
      '<div class="sgo-trust-meta-row">' +
        '<div><b>Atsiliepimai</b><span>realūs klientų komentarai</span></div>' +
        '<div><b>SGO</b><span>monitoringas · diagnostika · servisas</span></div>' +
      '</div>' +
      '<div class="sgo-trust-partners-bridge">' +
        '<a class="sgo-trust-partners-bridge-label" href="#partneriai">MŪSŲ PARTNERIAI</a>' +
      '</div>' +
    '</div>';

  services.parentNode.insertBefore(section, services.nextSibling);
})();


/* =========================================================
   PARTNERS — TRUE CONTINUOUS LOGO CONVEYOR
   Logos are recycled one-by-one after leaving the viewport.
   No CSS group reset, no restart, no blank interval.
   ========================================================= */
(function(){
  function startPartnerConveyor(){
    var marquee=document.querySelector('.partners-marquee');
    var track=document.querySelector('.partners-track');
    if(!marquee || !track || track.dataset.sgoConveyorStarted==='1') return;

    track.dataset.sgoConveyorStarted='1';
    track.style.setProperty('animation','none','important');
    track.style.setProperty('display','flex','important');
    track.style.setProperty('flex-wrap','nowrap','important');
    track.style.setProperty('width','max-content','important');
    track.style.setProperty('will-change','transform','important');

    var speed=34; // px/sec — slow enough to read, fast enough to feel alive
    var x=0;
    var last=performance.now();

    function gap(){
      return parseFloat(getComputedStyle(track).gap)||64;
    }

    function frame(now){
      if(!document.body.contains(track)) return;

      var dt=Math.min(50, now-last);
      last=now;
      x -= speed*dt/1000;

      var first=track.firstElementChild;
      if(first){
        var width=first.getBoundingClientRect().width;
        var step=width+gap();

        if(-x >= step){
          track.appendChild(first);
          x += step;
        }
      }

      track.style.setProperty(
        'transform',
        'translate3d('+x.toFixed(3)+'px,0,0)',
        'important'
      );

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',startPartnerConveyor,{once:true});
  }else{
    startPartnerConveyor();
  }
})();

/* =========================================================
   TRUST WALL — TRUE CONTINUOUS CARD CONVEYOR
   Column 1 moves upward; column 2 moves downward.
   Individual cards are recycled only after fully leaving the
   viewport, so the stream never stops and never resets visibly.
   ========================================================= */
(function(){
  function startTrustConveyor(){
    var wall=document.getElementById('sgo-trust-wall');
    if(!wall) return;

    var columns=[].slice.call(wall.querySelectorAll('.sgo-trust-column'));
    var wallBox=wall.querySelector('.sgo-trust-wall-columns');
    if(!wallBox) return;

    /* Smooth testimonial wall.
       The movement is a Web Animation on `transform` only, so the browser runs it on the GPU
       compositor at the monitor's own refresh rate (60 / 144 / 240 Hz) and it can't be disturbed
       by anything happening on the page. The cards are repeated so the loop never shows a seam. */
    var SPEED = 17;   // px per second
    var states = [];

    function visibleColumns(){
      return columns.filter(function(c){ return c.offsetParent !== null && getComputedStyle(c).display !== 'none'; });
    }

    function setup(column, index, goesDown){
      var track = column.querySelector('.sgo-trust-column-track');
      if(!track) return;
      var st = states[index] || (states[index] = { originals: null, anim: null });
      if(st.anim){ st.anim.cancel(); st.anim = null; }

      // keep only the original cards (remove clones from an earlier setup)
      if(!st.originals){
        st.originals = [].slice.call(track.children);
      }
      [].slice.call(track.querySelectorAll('[data-wall-clone]')).forEach(function(n){ n.remove(); });

      track.style.setProperty('animation','none','important');
      track.style.setProperty('display','flex','important');
      track.style.setProperty('flex-direction','column','important');
      track.style.setProperty('gap','16px','important');
      track.style.setProperty('position','absolute','important');
      track.style.setProperty('left','0','important');
      track.style.setProperty('top','0','important');
      track.style.setProperty('width','100%','important');
      track.style.setProperty('will-change','transform','important');
      track.style.setProperty('transform','none','important');   // old static transforms in the stylesheets are neutralised; we animate `translate` instead

      var first = st.originals[0];
      if(!first) return;

      // height of one full set of cards (including the gap before the next set)
      function setHeight(){
        var clone = first.cloneNode(true);
        clone.setAttribute('data-wall-clone','1');
        clone.setAttribute('aria-hidden','true');
        track.appendChild(clone);
        var h = clone.offsetTop - first.offsetTop;
        track.removeChild(clone);
        return h;
      }
      var H = setHeight();
      var viewport = column.getBoundingClientRect().height;
      if(!(H > 0) || !(viewport > 0)) return;

      // make the track long enough that the window is always filled
      var sets = Math.max(2, Math.ceil(viewport / H) + 1);
      for(var i = 1; i < sets; i++){
        st.originals.forEach(function(card){
          var c = card.cloneNode(true);
          c.setAttribute('data-wall-clone','1');
          c.setAttribute('aria-hidden','true');
          track.appendChild(c);
        });
      }

      if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches){
        track.style.setProperty('translate','0 '+(goesDown ? -H : 0)+'px');
        return;
      }
      if(!track.animate || !(window.CSS && CSS.supports && CSS.supports('translate','0 1px'))){ return; }

      var from = goesDown ? -H : 0;
      var to   = goesDown ? 0 : -H;
      st.anim = track.animate(
        [ { translate: '0 '+from+'px' }, { translate: '0 '+to+'px' } ],
        { duration: (H / SPEED) * 1000, iterations: Infinity, easing: 'linear' }
      );
    }

    function setupAll(){
      var visible = visibleColumns();
      columns.forEach(function(column, index){
        // two visible columns: left goes up, right goes down; one column (phones): down
        var goesDown = visible.length > 1 ? index === 1 : true;
        setup(column, index, goesDown);
      });
    }

    setupAll();
    // columns may not be laid out yet at load time; re-run once things settle and on resize
    setTimeout(setupAll, 400);
    setTimeout(setupAll, 1500);
    var lastW = window.innerWidth, timer = null;
    window.addEventListener('resize', function(){
      if(window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      clearTimeout(timer);
      timer = setTimeout(setupAll, 250);
    });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',startTrustConveyor,{once:true});
  }else{
    startTrustConveyor();
  }
})();


/* ACETERNITY LAMP — trigger the entrance once when services enter viewport */
(function(){
  var section = document.querySelector('#paslaugos');
  if(!section) return;
  if(!('IntersectionObserver' in window)){
    section.classList.add('sgo-ac-lamp-active');
    return;
  }
  var fired = false;
  var obs = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting && !fired){
        fired = true;
        section.classList.add('sgo-ac-lamp-active');
        obs.disconnect();
      }
    });
  }, {threshold:0.12});
  obs.observe(section);
})();
(function(){
  /* E-mail links: on a computer open a Gmail compose window (mailto often has no mail app there);
     on phones keep mailto so the phone's own mail app opens. Phone links stay tel: (the phone shows the dialer). */
  var desktop = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  document.querySelectorAll('a[href^="mailto:"]').forEach(function(a){
    var addr = a.getAttribute('href').slice(7).split('?')[0];
    if (desktop) a.setAttribute('title', 'Rašyti laišką per Gmail: ' + addr);
    a.addEventListener('click', function(e){
      if (!desktop || e.ctrlKey || e.metaKey || e.shiftKey) return;
      e.preventDefault();
      window.open('https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(addr), '_blank', 'noopener');
    });
  });
  document.querySelectorAll('a.contact-info-row[href^="tel:"]').forEach(function(a){
    a.setAttribute('title', 'Skambinti: ' + a.getAttribute('href').slice(4));
  });
})();


/* ============================================================
   Cookie consent + measurement (Google Analytics, Meta Pixel, Google Ads)
   Two choices: "Statistika" (analytics) and "Reklama" (ad measurement).
   Nothing is loaded or stored until the visitor agrees to that category.
   Fill in the IDs below once the accounts exist; empty = that tool stays off.
   ============================================================ */
(function(){
  var CFG = {
    GA_ID: 'G-JJDYL2CXW8', /* Google Analytics 4 */
    META_PIXEL_ID: '2325209364902401', /* Meta (Facebook/Instagram) pixel, e.g. 123456789012345 */
    ADS_ID: '',            /* Google Ads account, e.g. AW-123456789 */
    ADS_LEAD_LABEL: '',    /* Google Ads conversion label for the lead form */
    ADS_CONTACT_LABEL: ''  /* Google Ads conversion label for phone / e-mail clicks (optional) */
  };
  var KEY = 'sgo_consent_v2';
  var anyTool = !!(CFG.GA_ID || CFG.META_PIXEL_ID || CFG.ADS_ID);

  function read(){
    try { var v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && typeof v === 'object' ? v : null; }
    catch(e){ return null; }
  }
  function write(v){ try { localStorage.setItem(KEY, JSON.stringify(v)); } catch(e){} }

  var gtagLoaded = false, fbLoaded = false, doneA = false, doneM = false;
  function ensureGtag(firstId){
    if (gtagLoaded) return; gtagLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ window.dataLayer.push(arguments); };
    var gs = document.createElement('script'); gs.async = true;
    gs.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(firstId);
    document.head.appendChild(gs);
    gtag('js', new Date());
  }
  function applyConsent(c){
    if (c.a && CFG.GA_ID && !doneA) {
      doneA = true; ensureGtag(CFG.GA_ID);
      gtag('config', CFG.GA_ID, { anonymize_ip: true });
    }
    if (c.m && !doneM) {
      doneM = true;
      if (CFG.ADS_ID) { ensureGtag(CFG.ADS_ID); gtag('config', CFG.ADS_ID); }
      if (CFG.META_PIXEL_ID && !fbLoaded) {
        fbLoaded = true;
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', CFG.META_PIXEL_ID);
        fbq('track', 'PageView');
      }
    }
  }

  /* called when the contact form was sent successfully */
  window.sgoTrackLead = function(){
    var c = read() || {};
    if (c.a && window.gtag && CFG.GA_ID) gtag('event', 'generate_lead', { form: 'contact' });
    if (c.m && window.gtag && CFG.ADS_ID && CFG.ADS_LEAD_LABEL) gtag('event', 'conversion', { send_to: CFG.ADS_ID + '/' + CFG.ADS_LEAD_LABEL });
    if (c.m && window.fbq) fbq('track', 'Lead');
  };

  /* clicks on phone / e-mail / social links (only sent when the visitor has agreed to the matching cookies) */
  window.sgoTrackContact = function(method){
    var c = read() || {};
    var social = (method === 'facebook' || method === 'instagram');
    if (c.a && window.gtag && CFG.GA_ID) gtag('event', social ? 'social_click' : 'contact_click', { method: method });
    if (social) return;
    if (c.m && window.gtag && CFG.ADS_ID && CFG.ADS_CONTACT_LABEL) gtag('event', 'conversion', { send_to: CFG.ADS_ID + '/' + CFG.ADS_CONTACT_LABEL });
    if (c.m && window.fbq) fbq('track', 'Contact');
  };
  document.addEventListener('click', function(e){
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var h = a.getAttribute('href') || '';
    var m = /^tel:/i.test(h) ? 'phone' : /^mailto:/i.test(h) ? 'email' : /facebook\.com/i.test(h) ? 'facebook' : /instagram\.com/i.test(h) ? 'instagram' : '';
    if (m) window.sgoTrackContact(m);
  }, true);

  var bar = null;
  function closeBar(){
    if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
    bar = null;
    document.documentElement.classList.remove('sgo-consent-lock');
  }
  function save(c){ write(c); closeBar(); applyConsent(c); }

  function mainView(){
    var home = (location.pathname === '/' || /index\.html$/.test(location.pathname));
    return '<div class="sgo-consent-body">' +
      '<p class="sgo-consent-title">Slapukai ir jūsų privatumas</p>' +
      '<p class="sgo-consent-text">Naudojame slapukus, kad suprastume, kaip lankomasi svetainėje (Google Analytics), ir kad galėtume įvertinti reklamos veiksmingumą (Google, Facebook). ' +
      'Be jūsų sutikimo jų nenaudojame. <a href="' + (home ? '' : '/') + '#privatumo-slapukai">Sužinoti daugiau</a></p></div>' +
      '<div class="sgo-consent-actions">' +
      '<button type="button" class="sgo-consent-set">Nustatymai</button>' +
      '<button type="button" class="sgo-consent-no">Atmesti</button>' +
      '<button type="button" class="sgo-consent-yes">Sutinku</button></div>';
  }
  function row(id, title, text, on){
    return '<div class="sgo-consent-row"><div><p class="sgo-consent-rt">' + title + '</p><p class="sgo-consent-rd">' + text + '</p></div>' +
      '<button type="button" class="sgo-consent-sw" role="switch" aria-checked="' + (on ? 'true' : 'false') + '" data-k="' + id + '" aria-label="' + title + '"><i></i></button></div>';
  }
  function settingsView(c){
    return (read() ? '<button type="button" class="sgo-consent-close" aria-label="Uždaryti">&times;</button>' : '') +
      '<div class="sgo-consent-body">' +
      '<p class="sgo-consent-title">Slapukų nustatymai</p>' +
      '<div class="sgo-consent-rows">' +
      '<div class="sgo-consent-row"><div><p class="sgo-consent-rt">Būtini</p><p class="sgo-consent-rd">Svetainė veikia ir be slapukų, todėl papildomų būtinų slapukų nenaudojame.</p></div><span class="sgo-consent-fixed">Visada</span></div>' +
      row('a', 'Statistika', 'Google Analytics: kiek žmonių lankosi ir kurie puslapiai populiariausi.', c.a) +
      row('m', 'Reklama', 'Google Ads ir Meta (Facebook, Instagram): reklamos veiksmingumo matavimas.', c.m) +
      '</div></div>' +
      '<div class="sgo-consent-actions">' +
      '<button type="button" class="sgo-consent-no sgo-consent-save">Išsaugoti pasirinkimą</button>' +
      '<button type="button" class="sgo-consent-yes sgo-consent-all">Sutinku su visais</button></div>';
  }

  function render(v){
    if (!bar) return;
    bar.className = 'sgo-consent' + (v === 'settings' ? ' is-settings' : '');
    bar.innerHTML = '<div class="sgo-consent-card">' + (v === 'settings' ? settingsView(read() || { a: false, m: false }) : mainView()) + '</div>';
  }
  function openBar(view){
    if (!bar) {
      bar = document.createElement('div');
      bar.setAttribute('role', 'dialog');
      bar.setAttribute('aria-label', 'Slapukų nustatymai');
      document.body.appendChild(bar);
      bar.addEventListener('click', function(e){
        var t = e.target;
        if (t.closest('.sgo-consent-close')) { closeBar(); return; }
        if (t.closest('.sgo-consent-yes')) { save({ a: true, m: true }); return; }
        if (t.closest('.sgo-consent-set')) { render('settings'); return; }
        if (t.closest('.sgo-consent-save')) {
          var cur = {};
          bar.querySelectorAll('.sgo-consent-sw').forEach(function(b){ cur[b.getAttribute('data-k')] = b.getAttribute('aria-checked') === 'true'; });
          save({ a: !!cur.a, m: !!cur.m }); return;
        }
        if (t.closest('.sgo-consent-no')) { save({ a: false, m: false }); return; }
        var sw = t.closest('.sgo-consent-sw');
        if (sw) { sw.setAttribute('aria-checked', sw.getAttribute('aria-checked') === 'true' ? 'false' : 'true'); }
      });
    }
    render(view || 'main');
  }

  /* footer link lets visitors change their mind */
  document.addEventListener('click', function(e){
    var t = e.target.closest && e.target.closest('[data-cookie-settings]');
    if (t) { e.preventDefault(); openBar('settings'); }
  });

  if (!anyTool) {                 /* no tracking configured: no banner, hide the footer link */
    document.querySelectorAll('[data-cookie-settings]').forEach(function(a){ a.hidden = true; });
    return;
  }
  var saved = read();
  if (saved) applyConsent(saved);
  else openBar('main');
})();


/* Pause infinite CSS animations in blocks that are not on screen (keeps the page idle while you look
   at another block, e.g. the testimonial wall — important on 144/240 Hz monitors). */
(function(){
  if(!('IntersectionObserver' in window)) return;
  var blocks=[].slice.call(document.querySelectorAll('#site-content > header, #site-content > section'));
  if(!blocks.length) return;
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(e){ e.target.classList.toggle('is-offscreen', !e.isIntersecting); });
  },{rootMargin:'160px 0px'});
  blocks.forEach(function(b){ io.observe(b); });
})();


/* Chart marker: the chart is stretched to fill its box, so keep the amber dot a true circle at any size. */
(function(){
  function fit(){
    document.querySelectorAll('svg.vm-chart').forEach(function(svg){
      var r = svg.getBoundingClientRect(), vb = svg.viewBox && svg.viewBox.baseVal;
      if (!r.width || !r.height || !vb || !vb.width) return;
      var sx = r.width / vb.width, sy = r.height / vb.height, R = 4.5;
      svg.querySelectorAll('.vm-dot').forEach(function(d){
        d.setAttribute('rx', (R / sx).toFixed(2));
        d.setAttribute('ry', (R / sy).toFixed(2));
      });
    });
  }
  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('load', fit);
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(fit);   /* also fires when a hidden scene becomes visible */
    document.querySelectorAll('svg.vm-chart').forEach(function(s){ ro.observe(s); });
  }
})();

/* Choice chips (Paslauga / Elektrinės galia): clicking the selected chip again clears it */
(function(){
  document.addEventListener('pointerdown', function(e){
    var label = e.target.closest && e.target.closest('.cx-chip');
    if (!label) return;
    var input = label.querySelector('input[type="radio"]');
    if (input) input.dataset.wasChecked = input.checked ? '1' : '';
  }, true);
  document.addEventListener('click', function(e){
    var label = e.target.closest && e.target.closest('.cx-chip');
    if (!label) return;
    var input = label.querySelector('input[type="radio"]');
    if (!input || e.target !== input) return;
    if (input.dataset.wasChecked === '1') { input.checked = false; input.dispatchEvent(new Event('change', { bubbles: true })); }
    input.dataset.wasChecked = '';
  });
  /* keyboard: Space on an already selected chip clears it too */
  document.addEventListener('keydown', function(e){
    var input = e.target;
    if (e.key !== ' ' || !input.matches || !input.matches('.cx-chip input[type="radio"]') || !input.checked) return;
    e.preventDefault(); input.checked = false; input.dispatchEvent(new Event('change', { bubbles: true }));
  });
})();

/* footer watermark reveal on every page (reactbits.js, which also does this, only loads on the home page) */
(function(){
  var ft = document.querySelector('footer.ft'); if (!ft) return;
  if (!('IntersectionObserver' in window)) { ft.classList.add('ft-in'); return; }
  var io = new IntersectionObserver(function(e){ if (e[0].isIntersecting) { ft.classList.add('ft-in'); io.disconnect(); } }, { threshold: .15 });
  io.observe(ft);
})();

/* Solar Energy Enterprises — motion system */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var hasGSAP = typeof gsap !== 'undefined';
  if (hasGSAP && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* ---------------- Lenis smooth scroll ---------------- */
  var lenis = null;
  if (!reduce && typeof Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1.05 });
    if (hasGSAP) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      requestAnimationFrame(function raf(t) { lenis.raf(t); requestAnimationFrame(raf); });
    }
  }
  function scrollTo(target) {
    if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.2 });
    else { var el = typeof target === 'string' ? $(target) : target; if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }
  }

  /* ---------------- WebGL solar gradient ---------------- */
  (function gl() {
    var cv = $('#gl'); if (!cv || reduce) return;
    var gl = cv.getContext('webgl') || cv.getContext('experimental-webgl'); if (!gl) return;
    var vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    var fs = 'precision mediump float;uniform vec2 u_res;uniform float u_t;' +
      'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}' +
      'float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);' +
      'return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}' +
      'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.02;a*=.5;}return v;}' +
      'void main(){vec2 uv=gl_FragCoord.xy/u_res.xy;vec2 q=uv;q.x*=u_res.x/u_res.y;' +
      'float t=u_t*0.04;float n=fbm(q*2.4+vec2(t,t*.5));n+=0.4*fbm(q*5.0+vec2(-t*.7,t*1.1));' +
      'vec3 ink=vec3(0.039,0.041,0.049);vec3 amber=vec3(0.42,0.12,0.03);vec3 gold=vec3(1.0,0.42,0.06);' +
      'vec3 col=mix(ink,amber,smoothstep(0.32,0.82,n));col=mix(col,gold,smoothstep(0.72,1.03,n)*0.5);' +
      'float glow=smoothstep(0.85,0.1,distance(uv,vec2(0.8,0.85)));col+=vec3(1.0,0.5,0.1)*glow*0.12;' +
      'gl_FragColor=vec4(col,1.0);}';
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
    var prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog); gl.useProgram(prog);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var uRes = gl.getUniformLocation(prog, 'u_res'), uT = gl.getUniformLocation(prog, 'u_t');
    function size() {
      var dpr = Math.min(devicePixelRatio || 1, 1.6);
      cv.width = cv.offsetWidth * dpr; cv.height = cv.offsetHeight * dpr;
      gl.viewport(0, 0, cv.width, cv.height); gl.uniform2f(uRes, cv.width, cv.height);
    }
    size(); addEventListener('resize', size);
    var run = true, start = performance.now();
    document.addEventListener('visibilitychange', function () { run = !document.hidden; if (run) loop(); });
    function loop() {
      if (!run) return;
      gl.uniform1f(uT, (performance.now() - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      requestAnimationFrame(loop);
    }
    loop();
  })();

  /* ---------------- custom cursor + magnetic ---------------- */
  (function cursor() {
    var c = $('#cursor'); if (!c || matchMedia('(hover:none)').matches) return;
    var dot = $('.cursor__dot', c), ring = $('.cursor__ring', c);
    var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; dot.style.left = mx + 'px'; dot.style.top = my + 'px'; });
    (function ring_raf() { rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18; ring.style.left = rx + 'px'; ring.style.top = ry + 'px'; requestAnimationFrame(ring_raf); })();
    $$('[data-cursor="hover"],a,button').forEach(function (el) {
      el.addEventListener('mouseenter', function () { c.classList.add('is-hover'); });
      el.addEventListener('mouseleave', function () { c.classList.remove('is-hover'); });
    });
    if (!reduce) $$('.magnetic').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        el.style.transform = 'translate(' + x * 0.28 + 'px,' + y * 0.4 + 'px)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
  })();

  /* ---------------- nav ---------------- */
  var nav = $('#nav');
  function onScroll() { if (nav) nav.classList.toggle('is-stuck', scrollY > 40); }
  addEventListener('scroll', onScroll); onScroll();

  var burger = $('#burger'), menu = $('#menu');
  if (burger) burger.addEventListener('click', function () {
    var open = menu.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', open); menu.setAttribute('aria-hidden', !open);
    if (lenis) open ? lenis.stop() : lenis.start();
  });
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href'); if (id === '#' || !$(id)) return;
      e.preventDefault();
      if (menu && menu.classList.contains('is-open')) { menu.classList.remove('is-open'); burger.setAttribute('aria-expanded', false); if (lenis) lenis.start(); }
      scrollTo(id);
    });
  });

  /* ---------------- helpers: split into masked words ---------------- */
  function splitLines(el) {
    // flatten child nodes into words, remembering which came from <em> (gold italic)
    var words = [];
    Array.prototype.forEach.call(el.childNodes, function (node) {
      var em = node.nodeType === 1 && node.tagName === 'EM';
      var text = node.textContent.trim(); if (!text) return;
      text.split(/\s+/).forEach(function (w) { words.push({ w: w, em: em }); });
    });
    el.innerHTML = '';
    words.forEach(function (o, i) {
      var mask = document.createElement('span');
      mask.style.cssText = 'display:inline-block;overflow:hidden;vertical-align:top';
      var inner = document.createElement('span');
      inner.className = 'line-inner' + (o.em ? ' em' : ''); inner.textContent = o.w;
      mask.appendChild(inner); el.appendChild(mask);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
    return $$('.line-inner', el);
  }

  /* ---------------- loader + hero intro ---------------- */
  function heroIntro() {
    if (!hasGSAP || reduce) { $$('.hero__title .line>span').forEach(function (s) { s.style.transform = 'none'; }); return; }
    var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.from('.hero__eye', { y: 20, opacity: 0, duration: .8 })
      .from('.hero__title .line>span', { yPercent: 110, duration: 1.2, stagger: .12 }, '-=.5')
      .from('.hero__sub', { y: 24, opacity: 0, duration: 1 }, '-=.7')
      .from('.hero__cta > *', { y: 24, opacity: 0, duration: .9, stagger: .1 }, '-=.8')
      .from('.hero__meta > *', { y: 20, opacity: 0, duration: .9, stagger: .08 }, '-=.7');
  }
  (function loader() {
    var ld = $('#loader'), bar = $('#loaderBar'), pct = $('#loaderPct');
    if (!ld) { heroIntro(); return; }
    if (reduce || !hasGSAP) { ld.style.display = 'none'; heroIntro(); return; }
    if (lenis) lenis.stop();
    var p = { v: 0 };
    gsap.to(p, {
      v: 100, duration: 1.1, ease: 'power2.inOut',
      onUpdate: function () { var n = Math.round(p.v); if (bar) bar.style.width = n + '%'; if (pct) pct.textContent = n; },
      onComplete: function () {
        gsap.to(ld, {
          yPercent: -100, duration: .9, ease: 'expo.inOut', delay: .1,
          onStart: function () { if (lenis) lenis.start(); },
          onComplete: function () { ld.style.display = 'none'; }
        });
        heroIntro();
      }
    });
  })();

  /* ---------------- scroll reveals ---------------- */
  if (hasGSAP && !reduce) {
    $$('.reveal').forEach(function (el) {
      gsap.to(el, { opacity: 1, y: 0, duration: 1, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 88%' }, onStart: function(){}, });
      gsap.set(el, { y: 32 });
    });
    $$('.reveal-img').forEach(function (el) {
      var img = $('img', el);
      gsap.to(el, { opacity: 1, duration: 1, scrollTrigger: { trigger: el, start: 'top 85%' } });
      if (img) gsap.to(img, { scale: 1, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%' } });
    });
    $$('.reveal-lines').forEach(function (el) {
      var inners = splitLines(el);
      gsap.to(inners, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: .06,
        scrollTrigger: { trigger: el, start: 'top 86%' } });
    });
  } else if (reduce) {
    $$('.reveal,.reveal-img').forEach(function (el) { el.style.opacity = 1; });
  }

  /* ---------------- parallax ---------------- */
  if (hasGSAP && !reduce) $$('[data-parallax]').forEach(function (el) {
    var amt = parseFloat(el.getAttribute('data-parallax')) || 0.15;
    gsap.to(el, { yPercent: amt * 100, ease: 'none',
      scrollTrigger: { trigger: el.closest('section') || el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* ---------------- counters ---------------- */
  $$('[data-count]').forEach(function (el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var suffix = el.getAttribute('data-suffix') || '';
    var dec = target % 1 !== 0 ? 1 : 0;
    function run() {
      if (!hasGSAP || reduce) { el.textContent = target + suffix; return; }
      var o = { v: 0 };
      gsap.to(o, { v: target, duration: 1.8, ease: 'power2.out',
        onUpdate: function () { el.textContent = (dec ? o.v.toFixed(1) : Math.round(o.v)).toLocaleString('en-IN') + suffix; } });
    }
    if (hasGSAP && !reduce) ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: run });
    else run();
  });

  /* ---------------- marquee ---------------- */
  (function marquee() {
    var m = $('#marquee'); if (!m || !hasGSAP || reduce) return;
    var half = m.scrollWidth / 2;
    gsap.to(m, { x: -half, duration: 22, ease: 'none', repeat: -1 });
  })();

  /* ---------------- services: pinned horizontal ---------------- */
  if (hasGSAP && !reduce) {
    var mm = gsap.matchMedia();
    mm.add('(min-width:721px)', function () {
      var track = $('#svcTrack'), view = $('#svcView');
      if (!track || !view) return;
      var getAmt = function () { return track.scrollWidth - view.clientWidth + 0; };
      gsap.to(track, {
        x: function () { return -getAmt(); }, ease: 'none',
        scrollTrigger: { trigger: view, start: 'top top', end: function () { return '+=' + getAmt(); },
          pin: true, scrub: 1, anticipatePin: 1, invalidateOnRefresh: true }
      });
    });
  }

  /* ---------------- process line draw ---------------- */
  if (hasGSAP && !reduce) {
    var line = $('#procLine');
    if (line) gsap.to(line, { strokeDashoffset: 0, ease: 'none',
      scrollTrigger: { trigger: '.proc', start: 'top 70%', end: 'center center', scrub: true } });
  }

  /* ---------------- testimonials ---------------- */
  if (typeof Swiper !== 'undefined') new Swiper('.voices__sw', {
    slidesPerView: 1.05, spaceBetween: 20, grabCursor: true,
    navigation: { prevEl: '.v-prev', nextEl: '.v-next' },
    breakpoints: { 640: { slidesPerView: 1.6 }, 980: { slidesPerView: 2.3, spaceBetween: 26 } }
  });

  /* ---------------- savings calculator ---------------- */
  (function calc() {
    var bill = $('#bill'); if (!bill) return;
    var billOut = $('#billOut'), types = $$('.calc__type button');
    var factor = { res: 1, com: 1.05, ind: 1.1 }, kind = 'res';
    var out = { save25: $('#save25'), saveMo: $('#saveMo'), sysKw: $('#sysKw'), payback: $('#payback'), co2: $('#co2') };
    var cur = { save25: 0, saveMo: 0, sysKw: 0, payback: 0, co2: 0 };
    var fmt = function (n) { return Math.round(n).toLocaleString('en-IN'); };
    function set(id, val, prefixDec) {
      var el = out[id]; if (!el) return;
      if (!hasGSAP || reduce) { el.textContent = prefixDec ? val.toFixed(1) : fmt(val); return; }
      var o = { v: cur[id] };
      gsap.to(o, { v: val, duration: .7, ease: 'power2.out',
        onUpdate: function () { el.textContent = prefixDec ? o.v.toFixed(1) : fmt(o.v); } });
      cur[id] = val;
    }
    function compute() {
      var b = +bill.value;
      var pct = ((b - 500) / (25000 - 500)) * 100;
      bill.style.setProperty('--fill', pct + '%');
      billOut.textContent = '₹' + fmt(b);
      var units = b / 8;                              // ~₹8 per unit
      var kw = Math.max(1, units / (30 * 4.6 * 0.78) * factor[kind]); // sun hrs & derate
      var cost = kw * 62000;                          // ₹/kW installed
      var moSave = b * 0.9;
      var payback = cost / (moSave * 12);
      var save25 = moSave * 12 * 25 - cost;
      var co2 = kw * 1.4;                             // t CO2 / yr
      set('sysKw', Math.round(kw * 10) / 10, true);
      set('saveMo', moSave);
      set('payback', Math.round(payback * 10) / 10, true);
      set('co2', Math.round(co2 * 10) / 10, true);
      set('save25', Math.max(0, save25));
    }
    bill.addEventListener('input', compute);
    types.forEach(function (b) { b.addEventListener('click', function () {
      types.forEach(function (x) { x.classList.remove('is-on'); }); b.classList.add('is-on'); kind = b.getAttribute('data-k'); compute();
    }); });
    compute();
  })();

  /* keep ScrollTrigger honest after images/fonts load */
  if (hasGSAP) { addEventListener('load', function () { ScrollTrigger.refresh(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); }); }
})();

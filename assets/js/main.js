(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  document.documentElement.classList.add('js');

  /* ---------- smooth scroll (Lenis) ---------- */
  let lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new Lenis({ duration: 1.25, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true });
  }
  const scrollY = () => (lenis ? lenis.scroll : window.scrollY);

  /* ---------- London clock ---------- */
  const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
  const tick = () => $$('.clock').forEach((c) => (c.textContent = 'London ' + fmt.format(new Date())));
  tick(); setInterval(tick, 15000);

  /* ---------- loader (first visit of the session) + curtain page transitions ---------- */
  const curtain = $('.curtain');
  const loader = $('.loader');
  const seen = (() => { try { return sessionStorage.getItem('ak-seen'); } catch (e) { return '1'; } })();
  const reveal = () => {
    document.documentElement.classList.add('is-ready');
    if (curtain) { curtain.classList.add('is-out'); setTimeout(() => curtain.classList.add('is-gone'), 1300); }
  };
  if (loader && !seen && !reduce) {
    try { sessionStorage.setItem('ak-seen', '1'); } catch (e) {}
    const n = $('.loader__n', loader); const t0 = performance.now();
    const step = (t) => {
      const p = clamp((t - t0) / 1500);
      n.textContent = String(Math.round((1 - Math.pow(1 - p, 3)) * 100)).padStart(3, '0');
      if (p < 1) requestAnimationFrame(step);
      else { loader.classList.add('is-done'); setTimeout(reveal, 250); }
    };
    requestAnimationFrame(step);
  } else {
    loader && loader.remove();
    requestAnimationFrame(() => requestAnimationFrame(reveal));
  }
  $$('a[href$=".html"], a[href*=".html#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      if (reduce || e.metaKey || e.ctrlKey || a.target === '_blank' || !curtain) return;
      const url = new URL(a.href, location.href);
      if (url.pathname === location.pathname && url.hash) return;
      e.preventDefault();
      curtain.classList.remove('is-out', 'is-gone'); curtain.classList.add('is-in');
      setTimeout(() => (location.href = a.href), 650);
    });
  });
  window.addEventListener('pageshow', (e) => { if (e.persisted && curtain) { curtain.classList.remove('is-in'); curtain.classList.add('is-out'); } });

  /* ---------- split hero name into letters ---------- */
  $$('[data-split]').forEach((el) => {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((c) => {
        if (c.nodeType === 3) {
          const frag = document.createDocumentFragment();
          [...c.textContent].forEach((ch) => {
            const s = document.createElement('span');
            s.className = 'ch'; s.style.setProperty('--i', i++);
            s.textContent = ch === ' ' ? ' ' : ch;
            frag.appendChild(s);
          });
          c.replaceWith(frag);
        } else walk(c);
      });
    };
    walk(el);
  });

  /* ---------- split scrub text into words ---------- */
  const scrubs = $$('.scrub').map((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w) => `<span class="w">${w} </span>`).join('');
    return { el, words: $$('.w', el) };
  });

  /* ---------- reveal on scroll ---------- */
  const io = 'IntersectionObserver' in window && new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -10% 0px' });
  $$('.rv, .frame').forEach((el) => (io ? io.observe(el) : el.classList.add('is-in')));

  /* ---------- videos: play only while visible ---------- */
  const vio = 'IntersectionObserver' in window && new IntersectionObserver((es) => {
    es.forEach((e) => { const v = e.target; if (e.isIntersecting) { v.play().catch(() => {}); } else v.pause(); });
  }, { rootMargin: '200px' });
  $$('video[data-auto]').forEach((v) => { v.muted = true; vio ? vio.observe(v) : v.play().catch(() => {}); });

  /* ---------- custom cursor ---------- */
  const cur = $('.cursor');
  let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
  if (cur && fine && !reduce) {
    document.documentElement.classList.add('has-cursor');
    const label = $('span', cur);
    window.addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest('[data-cursor], a, button, [data-lb]');
      const mode = t ? (t.dataset.cursor || (t.matches('[data-lb]') ? 'view' : 'link')) : '';
      cur.dataset.mode = mode;
      label.textContent = ['view', 'drag', 'play', 'zoom'].includes(mode) ? mode : '';
    });
    document.addEventListener('pointerleave', () => cur.classList.add('is-hidden'));
    document.addEventListener('pointerenter', () => cur.classList.remove('is-hidden'));
  } else if (cur) cur.remove();

  /* ---------- image trail over the introduction ---------- */
  const trail = $('[data-trail]');
  if (trail && fine && !reduce) {
    const srcs = trail.dataset.trail.split(',');
    srcs.forEach((s) => { const i = new Image(); i.src = s; });
    let k = 0, lx = 0, ly = 0, z = 1;
    trail.addEventListener('pointermove', (e) => {
      const d = Math.hypot(e.clientX - lx, e.clientY - ly);
      if (d < 110) return;
      lx = e.clientX; ly = e.clientY;
      const r = trail.getBoundingClientRect();
      const img = document.createElement('img');
      img.className = 'trail'; img.src = srcs[k++ % srcs.length]; img.alt = '';
      img.style.left = (e.clientX - r.left) + 'px'; img.style.top = (e.clientY - r.top) + 'px';
      img.style.zIndex = z++;
      img.style.setProperty('--rot', ((Math.random() - .5) * 10).toFixed(1) + 'deg');
      trail.appendChild(img);
      setTimeout(() => img.classList.add('is-gone'), 650);
      setTimeout(() => img.remove(), 1500);
    });
  }

  /* ---------- drag walls / strips with inertia ---------- */
  $$('[data-drag]').forEach((el) => {
    let down = false, sx = 0, sl = 0, v = 0, lastX = 0, moved = false, raf = 0;
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = false; sx = lastX = e.clientX; sl = el.scrollLeft; v = 0; cancelAnimationFrame(raf);
    });
    window.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - sx;
      if (Math.abs(dx) > 4) { moved = true; el.classList.add('is-drag'); }
      v = e.clientX - lastX; lastX = e.clientX;
      el.scrollLeft = sl - dx;
    });
    window.addEventListener('pointerup', () => {
      if (!down) return;
      down = false; el.classList.remove('is-drag');
      const glide = () => { el.scrollLeft -= v; v *= .94; if (Math.abs(v) > .3) raf = requestAnimationFrame(glide); };
      glide();
    });
    el.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
  });

  /* ---------- loupe over paintings ---------- */
  const loupe = $('.loupe');
  if (loupe && fine && !reduce) {
    $$('[data-loupe]').forEach((img) => {
      img.addEventListener('pointerenter', () => {
        loupe.style.backgroundImage = `url("${img.currentSrc || img.src}")`;
        loupe.classList.add('is-on');
      });
      img.addEventListener('pointerleave', () => loupe.classList.remove('is-on'));
      img.addEventListener('pointermove', (e) => {
        const r = img.getBoundingClientRect(), Z = 3.2, s = loupe.offsetWidth;
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        loupe.style.backgroundSize = `${r.width * Z}px ${r.height * Z}px`;
        loupe.style.backgroundPosition = `${-(px * r.width * Z - s / 2)}px ${-(py * r.height * Z - s / 2)}px`;
        loupe.style.transform = `translate(${e.clientX - s / 2}px, ${e.clientY - s / 2}px)`;
      });
    });
  } else if (loupe) loupe.remove();

  /* ---------- lightbox ---------- */
  const lb = $('.lb');
  if (lb) {
    const img = $('.lb__stage img', lb), cap = $('.lb .cap', lb), count = $('.lb__count', lb);
    let group = [], i = 0;
    const show = () => {
      const el = group[i];
      img.src = el.dataset.full || el.currentSrc || el.src; img.alt = el.alt;
      cap.innerHTML = el.dataset.cap || '';
      count.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(group.length).padStart(2, '0');
    };
    const open = (el) => {
      group = $$(`[data-lb="${el.dataset.lb}"]`); i = group.indexOf(el);
      show(); lb.classList.add('is-open'); lenis && lenis.stop(); document.body.style.overflow = 'hidden';
      $('.lb__close', lb).focus();
    };
    const close = () => { lb.classList.remove('is-open'); lenis && lenis.start(); document.body.style.overflow = ''; };
    const step = (d) => { i = (i + d + group.length) % group.length; show(); };
    $$('[data-lb]').forEach((el) => {
      el.tabIndex = 0;
      el.addEventListener('click', () => open(el));
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(el); });
    });
    $('.lb__close', lb).addEventListener('click', close);
    $('.lb__prev', lb).addEventListener('click', () => step(-1));
    $('.lb__next', lb).addEventListener('click', () => step(1));
    $('.lb__stage', lb).addEventListener('click', (e) => { if (e.target !== img) close(); });
    document.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    });
  }

  /* ---------- scroll-linked scenes ---------- */
  const studio = $('.studio'), track = studio && $('.studio__track', studio);
  const pars = $$('[data-parallax]');
  const marquees = $$('.marquee__inner');
  let mq = 0, lastY = scrollY(), vel = 0;

  const frame = (time) => {
    lenis && lenis.raf(time);
    const y = scrollY(), vh = innerHeight;
    vel = lerp(vel, y - lastY, .1); lastY = y;

    // cursor follows with easing
    if (cur && cur.isConnected) {
      cx = lerp(cx, mx, .22); cy = lerp(cy, my, .22);
      cur.style.transform = `translate(${cx}px, ${cy}px)`;
    }

    // words light up while the paragraph passes the middle of the screen
    scrubs.forEach(({ el, words }) => {
      const r = el.getBoundingClientRect();
      const p = clamp((vh * .85 - r.top) / (r.height + vh * .35));
      const lit = p * words.length;
      words.forEach((w, i) => w.style.setProperty('--o', clamp(lit - i).toFixed(2)));
    });

    // studio: vertical scroll drives a horizontal track
    if (studio && track) {
      const r = studio.getBoundingClientRect();
      const p = clamp(-r.top / (r.height - vh));
      const max = track.scrollWidth - window.innerWidth;
      track.style.transform = `translate3d(${(-p * max).toFixed(1)}px,0,0)`;
      studio.style.setProperty('--p', p.toFixed(4));
    }

    // gentle parallax
    pars.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      const k = parseFloat(el.dataset.parallax) || .1;
      const c = (r.top + r.height / 2 - vh / 2) / vh;
      el.style.setProperty('--py', (c * k * 100).toFixed(2) + 'px');
    });

    // marquee speeds up with scroll velocity
    if (marquees.length) {
      mq -= .45 + Math.abs(vel) * .35;
      marquees.forEach((m) => {
        const w = m.scrollWidth / 2;
        if (-mq > w) mq += w;
        m.style.transform = `translate3d(${mq}px,0,0)`;
      });
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
})();

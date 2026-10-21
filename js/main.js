// Site motion. Content is in the HTML; everything here is enhancement and
// loads after first paint. All reveals are scroll-driven and two-way.
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));

// Copy email
document.querySelectorAll('[data-copy]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      const old = btn.textContent;
      btn.textContent = 'Copied';
      setTimeout(() => (btn.textContent = old), 1600);
    } catch { location.href = 'mailto:' + btn.dataset.copy; }
  });
});

// Request form: compose a structured email in the visitor's own mail app.
document.querySelectorAll('[data-request]').forEach((form) => {
  const note = form.querySelector('.request-note');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const d = Object.fromEntries(new FormData(form));
    const subject = `${d.type} — ${d.name}`;
    const body = [`Hi Zubair,`, ``, d.message, ``, `What I need: ${d.type}`, d.timeline ? `Timeline: ${d.timeline}` : null, ``, `${d.name}`, `${d.email}`].filter((l) => l !== null).join('\n');
    location.href = `mailto:zubair.iqbal2018@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    note.classList.add('is-done');
    note.innerHTML = 'Your email app should be open with this filled in. Nothing opened? <button type="button" class="copy-inline">Copy the message</button> and send it to zubair.iqbal2018@gmail.com.';
    note.querySelector('.copy-inline').onclick = async () => { try { await navigator.clipboard.writeText(`${subject}\n\n${body}`); note.querySelector('.copy-inline').textContent = 'Copied'; } catch {} };
  });
});

if (reduced) {
  root.classList.add('no-motion');
} else {
  const start = () => boot().catch((err) => { console.error(err); root.classList.add('motion-failed'); root.removeAttribute('data-scene'); });
  if (document.readyState === 'complete') requestAnimationFrame(start);
  else addEventListener('load', () => requestAnimationFrame(start), { once: true });
}

async function boot() {
  const [{ gsap }, { ScrollTrigger }, { SplitText }, { default: Lenis }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger.js'),
    import('gsap/SplitText.js'),
    import('lenis'),
  ]);
  gsap.registerPlugin(ScrollTrigger, SplitText);
  await document.fonts.ready;

  // ── Smooth scroll, driven from GSAP's ticker
  const lenis = new Lenis({ lerp: 0.1, anchors: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  const ease = 'expo.out';
  const guard = (fn) => { try { fn(); } catch (e) { console.error(e); } };

  // ── Nav: frosts after the first screen, recolours over dark/mint grounds
  guard(() => {
    const nav = document.querySelector('[data-nav]');
    const frost = () => nav.classList.toggle('is-scrolled', scrollY > 80);
    lenis.on('scroll', frost);
    frost();
    const secs = [...document.querySelectorAll('[data-nav-theme]')];
    const on = new Set();
    const apply = () => {
      const top = secs.filter((s) => on.has(s)).pop();
      if (top) nav.dataset.theme = top.dataset.navTheme; else delete nav.dataset.theme;
    };
    secs.forEach((sec) => {
      ScrollTrigger.create({
        trigger: sec, start: 'top 40px', end: 'bottom 40px',
        onToggle: (s) => { s.isActive ? on.add(sec) : on.delete(sec); apply(); },
      });
    });
  });

  // ── Masked line / char reveals
  guard(() => {
    document.querySelectorAll('[data-split]').forEach((el) => {
      const chars = el.dataset.split === 'chars';
      const split = SplitText.create(el, { type: chars ? 'chars' : 'lines', mask: chars ? 'chars' : 'lines', linesClass: 'split-line', charsClass: 'split-char', autoSplit: !chars, onSplit(self) {
        const targets = chars ? self.chars : self.lines;
        return gsap.from(targets, {
          yPercent: 115, duration: 1.2, ease, stagger: chars ? 0.05 : 0.09,
          scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' },
        });
      } });
      el._split = split;
    });
  });

  // ── Rows rise in; sink back out when scrolled back past
  guard(() => {
    gsap.set('[data-fade]', { opacity: 0, y: 40 });
    ScrollTrigger.batch('[data-fade]', {
      start: 'top 90%',
      onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.1, ease, stagger: 0.08, overwrite: true }),
      onLeaveBack: (els) => gsap.to(els, { opacity: 0, y: 40, duration: 0.6, ease: 'power2.in', overwrite: true }),
    });
  });

  // ── Hairlines draw in trace, then settle to grey
  guard(() => {
    document.querySelectorAll('[data-rule]').forEach((el) => {
      gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 92%', toggleActions: 'play none none reverse' } })
        .fromTo(el, { scaleX: 0, backgroundColor: '#68d89b' }, { scaleX: 1, duration: 1.3, ease: 'expo.inOut' })
        .to(el, { backgroundColor: 'rgba(0,0,0,0.12)', duration: 0.8 }, '-=0.2');
    });
  });

  // ── Essay: words light up as you read, the current few in mint
  guard(() => {
    const el = document.querySelector('[data-scrub-words]');
    if (!el) return;
    const split = SplitText.create(el, { type: 'words', wordsClass: 'scrub-word' });
    const words = split.words;
    el.setAttribute('data-scrubbing', '');
    let lastN = -1;
    ScrollTrigger.create({
      trigger: el, start: 'top 75%', end: 'bottom 45%', scrub: true,
      onUpdate: (s) => {
        const n = Math.round(s.progress * (words.length + 3));
        if (n === lastN) return;
        lastN = n;
        words.forEach((w, i) => {
          w.classList.toggle('is-read', i < n - 3);
          w.classList.toggle('is-reading', i >= n - 3 && i < n);
        });
      },
    });
  });

  // ── Contact title: letters climb in; footer wordmark rises with the last scroll
  guard(() => {
    const mark = document.querySelector('[data-rise]');
    if (mark) {
      gsap.from(mark.children, {
        yPercent: 60, opacity: 0, stagger: 0.12, ease: 'none',
        scrollTrigger: { trigger: mark, start: 'top bottom', end: 'bottom bottom', scrub: 0.6 },
      });
    }
    // The mark assembles as the page ends: blocks slide in along the
    // diagonal, the stroke draws through them in mint.
    const glyph = document.querySelector('[data-glyph]');
    if (glyph) {
      const st = glyph.querySelector('.mark-s');
      const len = st.getTotalLength();
      gsap.timeline({ scrollTrigger: { trigger: '.footer', start: 'top 70%', end: 'bottom bottom', scrub: 0.6 } })
        .from(glyph.querySelector('.mark-a'), { x: -260, y: -260, opacity: 0, ease: 'none' }, 0)
        .from(glyph.querySelector('.mark-b'), { x: 260, y: 260, opacity: 0, ease: 'none' }, 0)
        .fromTo(st, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, ease: 'none' }, 0.1);
    }
  });

  // ── The stack as cards: panels rise and unfold, tiles pop in one by one,
  // illustrations run only while their panel is on screen.
  guard(() => {
    document.querySelectorAll('[data-panel]').forEach((panel) => {
      const tiles = panel.querySelectorAll('.cell');
      gsap.timeline({ scrollTrigger: { trigger: panel, start: 'top 85%', toggleActions: 'play none none reverse' } })
        .fromTo(panel, { y: 90, scale: 0.92, rotate: panel.closest('.feature--flip') ? -2 : 2, clipPath: 'inset(10% 6% 0% 6% round 28px)' },
          { y: 0, scale: 1, rotate: 0, clipPath: 'inset(0% 0% 0% 0% round 28px)', duration: 1.3, ease: 'expo.out' })
        .from(tiles, { y: 40, scale: 0.7, opacity: 0, duration: 0.9, ease: 'back.out(1.8)', stagger: 0.09 }, 0.25);
      // Gentle drift against the scroll, so the panels feel like objects.
      gsap.fromTo(panel, { yPercent: 6 }, { yPercent: -6, ease: 'none', scrollTrigger: { trigger: panel, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
      ScrollTrigger.create({ trigger: panel, start: 'top bottom', end: 'bottom top', toggleClass: 'is-live' });
    });
  });

  // ── The bust
  guard(() => setupBust(ScrollTrigger));

  // ── Cards (experience, principles): stagger in, illustrations run on screen
  guard(() => {
    document.querySelectorAll('[data-cards]').forEach((grid) => {
      gsap.from(grid.children, {
        y: 70, scale: 0.94, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.1,
        scrollTrigger: { trigger: grid, start: 'top 85%', toggleActions: 'play none none reverse' },
      });
      ScrollTrigger.create({ trigger: grid, start: 'top bottom', end: 'bottom top', toggleClass: 'is-live' });
    });
  });

  // ── Small objects on the footer floor
  guard(() => setupFooterObjects(ScrollTrigger));

  // ── Objects on the desk
  guard(() => setupObjects(ScrollTrigger));

  // Cursors are native CSS pixel art now (see site.css).

  ScrollTrigger.refresh();
}

function setupObjects(ScrollTrigger) {
  if (root.getAttribute('data-objects') !== 'on') return;
  const stage = document.querySelector('.desk-stage');
  let desk = null, loaded = false, wantDrop = false;
  const fail = (e) => { console.error(e); root.removeAttribute('data-objects'); ScrollTrigger.refresh(); };

  // Load the scene and its 1.7 MB of models only as the section approaches.
  const io = new IntersectionObserver(async ([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    try {
      const { createObjects } = await import('./objects.js');
      desk = createObjects({
        stage,
        canvases: [...stage.querySelectorAll('.desk-canvas')],
        anchors: [stage.querySelector('.hero-l1'), stage.querySelector('.hero-l2')],
        tip: stage.querySelector('.desk-tip'),
      });
      await desk.ready;
      loaded = true;
      if (wantDrop) desk.drop();
    } catch (err) { fail(err); }
  }, { rootMargin: '1500px 0px' });
  io.observe(stage);

  // Drop when the stage scrolls in; lift back out when scrolled up past.
  ScrollTrigger.create({
    trigger: stage, start: 'top 75%',
    onEnter: () => { wantDrop = true; if (loaded) desk.drop(); },
    onLeaveBack: () => { wantDrop = false; if (loaded) desk.lift(); },
  });
}

function setupBust(ScrollTrigger) {
  if (root.getAttribute('data-scene') !== 'on') return;
  const section = document.querySelector('.about');
  const stage = section.querySelector('.about-stage');
  let bust = null;
  // Load the 660 KB model as the section approaches.
  const io = new IntersectionObserver(async ([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    try {
      const { createBust } = await import('./bust.js');
      bust = createBust({ canvas: stage.querySelector('.bust-canvas'), stage: section });
      await bust.ready;
    } catch (err) { console.error(err); stage.style.display = 'none'; }
  }, { rootMargin: '1200px 0px' });
  io.observe(section);
  // One full turn across the section.
  ScrollTrigger.create({
    trigger: section, start: 'top bottom', end: 'bottom top',
    onUpdate: (s) => bust?.setProgress(s.progress),
  });
}


function setupFooterObjects(ScrollTrigger) {
  if (root.getAttribute('data-objects') !== 'on') return;
  const footer = document.querySelector('.footer');
  let pile = null, loaded = false, want = false;
  const io = new IntersectionObserver(async ([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    try {
      const { createObjects, FOOTER_OBJECTS } = await import('./objects.js');
      pile = createObjects({
        stage: footer,
        canvases: [footer.querySelector('.footer-canvas')],
        tip: footer.querySelector('.footer-tip'),
        set: FOOTER_OBJECTS, flat: true, follow: true, sizeK: innerWidth < 600 ? 1.6 : 0.85,
        bounds: { back: 0.86, front: -0.62 },
      });
      await pile.ready;
      loaded = true;
      if (want) pile.drop();
    } catch (err) { console.error(err); footer.querySelector('.footer-canvas')?.remove(); }
  }, { rootMargin: '1000px 0px' });
  io.observe(footer);
  ScrollTrigger.create({
    trigger: footer, start: 'top 70%',
    onEnter: () => { want = true; if (loaded) pile.drop(); },
    onLeaveBack: () => { want = false; if (loaded) pile.lift(); },
  });
}

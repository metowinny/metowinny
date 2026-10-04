// ==========================================================
// НУЛЕВОЙ ТРИБУНАЛ — общий скрипт сайта
// ==========================================================

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- мобильное меню ---------- */
  const burger = document.querySelector('[data-burger]');
  const mobileNav = document.querySelector('[data-mobile-nav]');
  if (burger && mobileNav) {
    burger.addEventListener('click', () => {
      mobileNav.classList.toggle('is-open');
    });
  }

  /* ---------- аккордеон "Часть -> Акт -> Глава" теперь на нативных <details> —
     JS здесь больше не нужен, раскрытие/закрытие работает и без него ---------- */

  /* ---------- сноски (тап для тач-устройств) ---------- */
  document.querySelectorAll('.footnote').forEach(fn => {
    fn.addEventListener('click', (e) => {
      // на тач-устройствах — переключаем по тапу; на десктопе оставляем hover из CSS
      if (window.matchMedia('(hover: none)').matches) {
        e.preventDefault();
        const wasOpen = fn.classList.contains('is-open');
        document.querySelectorAll('.footnote.is-op5en').forEach(o => o.classList.remove('is-open'));
        if (!wasOpen) fn.classList.add('is-open');
      }
    });
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.footnote')) {
      document.querySelectorAll('.footnote.is-open').forEach(o => o.classList.remove('is-open'));
    }
  });

  /* ---------- настройки читалки: размер шрифта (5 уровней) ---------- */
  const FONT_SIZES = ['xs', 'sm', 'md', 'lg', 'xl'];
  const fontBtns = document.querySelectorAll('[data-font-size]');
  const savedFont = localStorage.getItem('nt-font-size');
  if (savedFont) {
    if (savedFont !== 'md') document.body.classList.add('font-' + savedFont);
    fontBtns.forEach(b => b.classList.toggle('is-active', b.dataset.fontSize === savedFont));
  }
  fontBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const size = btn.dataset.fontSize;
      FONT_SIZES.forEach(s => document.body.classList.remove('font-' + s));
      fontBtns.forEach(b => b.classList.remove('is-active'));
      if (size !== 'md') {
        document.body.classList.add('font-' + size);
        localStorage.setItem('nt-font-size', size);
      } else {
        localStorage.removeItem('nt-font-size');
      }
      btn.classList.add('is-active');
    });
  });

  /* ---------- режим "легче читать" (Lexend / в перспективе OpenDyslexic) ---------- */
  const readableBtn = document.querySelector('[data-font-readable]');
  if (readableBtn) {
    if (localStorage.getItem('nt-font-readable') === '1') {
      document.body.classList.add('font-readable');
      readableBtn.classList.add('is-active');
    }
    readableBtn.addEventListener('click', () => {
      const on = document.body.classList.toggle('font-readable');
      readableBtn.classList.toggle('is-active', on);
      if (on) localStorage.setItem('nt-font-readable', '1');
      else localStorage.removeItem('nt-font-readable');
    });
  }

  /* ---------- светлая тема читалки (только сама читалка, не весь сайт) ---------- */
  const themeToggle = document.querySelector('[data-theme-toggle]');
  const readerArea = document.querySelector('.reader-top');
  if (themeToggle && readerArea) {
    const applyReaderTheme = (on) => {
      readerArea.classList.toggle('theme-light', on);
      themeToggle.classList.toggle('is-active', on);
      themeToggle.title = on ? 'Тёмная читалка' : 'Светлая читалка';
      themeToggle.setAttribute('aria-label', themeToggle.title);
    };
    applyReaderTheme(localStorage.getItem('nt-reader-theme') === 'light');
    themeToggle.addEventListener('click', () => {
      const on = !readerArea.classList.contains('theme-light');
      applyReaderTheme(on);
      if (on) localStorage.setItem('nt-reader-theme', 'light');
      else localStorage.removeItem('nt-reader-theme');
    });
  }

  /* ---------- переключатель вкладок "О серии / Об авторах / О сайте" ---------- */
  const infoTabs = document.querySelectorAll('[data-info-tab]');
  const infoPanels = document.querySelectorAll('[data-info-panel]');
  infoTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      infoTabs.forEach(t => t.classList.remove('is-active'));
      infoPanels.forEach(p => p.style.display = 'none');
      tab.classList.add('is-active');
      const target = document.querySelector(`[data-info-panel="${tab.dataset.infoTab}"]`);
      if (target) target.style.display = '';
    });
  });

  /* ---------- глоссарий: поиск по терминам ---------- */
  const glossarySearch = document.querySelector('[data-glossary-search]');
  const glossaryClear = document.querySelector('[data-glossary-clear]');
  const glossaryCategories = [...document.querySelectorAll('[data-glossary-category]')];
  const glossaryCount = document.querySelector('[data-glossary-count]');
  const glossaryNoResults = document.querySelector('[data-glossary-no-results]');

  if (glossarySearch && glossaryCategories.length) {
    const normalize = (value) => value.toLocaleLowerCase('ru-RU').trim();

    const updateGlossary = () => {
      const query = normalize(glossarySearch.value);
      let visibleTerms = 0;

      glossaryCategories.forEach(category => {
        const terms = [...category.querySelectorAll('[data-glossary-term]')];
        let categoryVisible = 0;

        terms.forEach(term => {
          const haystack = normalize(term.textContent);
          const visible = !query || haystack.includes(query);
          term.hidden = !visible;
          if (visible) categoryVisible++;
        });

        category.hidden = categoryVisible === 0;
        if (query && categoryVisible > 0) category.open = true;
        if (!query && category.dataset.defaultOpen === 'true') category.open = true;
        visibleTerms += categoryVisible;
      });

      if (glossaryCount) glossaryCount.textContent = `${visibleTerms} термин${visibleTerms === 1 ? '' : (visibleTerms >= 2 && visibleTerms <= 4 ? 'а' : 'ов')}`;
      if (glossaryNoResults) glossaryNoResults.classList.toggle('is-visible', visibleTerms === 0);
      if (glossaryClear) glossaryClear.classList.toggle('is-visible', query.length > 0);
    };

    glossarySearch.addEventListener('input', updateGlossary);
    glossaryClear?.addEventListener('click', () => {
      glossarySearch.value = '';
      glossarySearch.focus();
      updateGlossary();
    });
    updateGlossary();
  }

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && window.matchMedia('(hover: hover)').matches) {
  const canvas = document.createElement('canvas');
  canvas.className = 'cursor-wake';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const DPR = Math.min(window.devicePixelRatio || 1, 1.5);

  const STEP = 4;
  const MAX_STEPS = 40;
  const JUMP = 400;
  const MAX_POINTS = 140;
  const MAX_BUBBLES = 50;
  const EDGE_LIFE = 380;
  const MAX_LEN = 110;
  const BUCKETS = 12;
  const BUBBLE_CHANCE = 0.06;
  const SPREAD_BY_DIST = 0.12;
  const SPREAD_BY_AGE = 0.006;
  const MAX_SPREAD = 11;
  const WAVE_AMP = 7;
  const WAVE_FREQ = 0.17;

  const seed = Math.random() * 6.28;
  let points = [];
  let bubbles = [];
  let pos = [];
  let raf = 0;
  let lastX = null, lastY = null;
  let pathLen = 0;
  let viewW = 0, viewH = 0;

  function resize() {
    viewW = document.documentElement.clientWidth;
    viewH = window.innerHeight;
    canvas.width = viewW * DPR;
    canvas.height = viewH * DPR;
    canvas.style.width = viewW + 'px';
    canvas.style.height = viewH + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  function mix(a, b, t) {
    return Math.round(a + (b - a) * t);
  }

  function bubbleSize() {
    return 1.8 + Math.pow(Math.random(), 2) * 5;
  }

  function makePoint(x, y, t) {
    const chunk = 0.5 + 0.5 * Math.sin(pathLen * 0.09 + seed);
    return {
      x: x, y: y, t: t, s: pathLen,
      breakL: 150 + 110 * chunk + Math.random() * 70,
      breakR: 150 + 110 * (1 - chunk) + Math.random() * 70,
      bubL: Math.random() < BUBBLE_CHANCE ? bubbleSize() : 0,
      bubR: Math.random() < BUBBLE_CHANCE ? bubbleSize() : 0
    };
  }

  function spawnBubble(x, y, nx, ny, side, r, now) {
    if (bubbles.length >= MAX_BUBBLES) bubbles.shift();
    const out = 0.01 + Math.random() * 0.016;
    bubbles.push({
      x: x, y: y, born: now,
      life: 450 + Math.random() * 350,
      r: r,
      vx: nx * side * out + (Math.random() - 0.5) * 0.008,
      vy: ny * side * out - 0.01 - Math.random() * 0.02,
      sw: 1 + Math.random() * 2.5,
      w: 0.004 + Math.random() * 0.004,
      ph: Math.random() * 6.28
    });
  }

  function edgePos(bx, by, s, side, age, dist, nx, ny, tx, ty) {
    const spread = Math.min(1.5 + SPREAD_BY_DIST * dist + SPREAD_BY_AGE * age, MAX_SPREAD);
    const amp = Math.min(age / 220, 1) * WAVE_AMP;
    const ph = side * 1.9 + seed;
    const a1 = s * WAVE_FREQ + age * 0.009 + ph;
    const a2 = s * WAVE_FREQ * 1.8 - age * 0.006 + ph * 2.3;
    const dn = side * spread + amp * (0.7 * Math.sin(a1) + 0.4 * Math.sin(a2));
    const dt = amp * (0.5 * Math.cos(a1) + 0.2 * Math.cos(a2));
    return {
      x: bx + nx * dn + tx * dt,
      y: by + ny * dn + ty * dt - age * 0.005
    };
  }

  function computeEdges(now) {
    const n = points.length;
    pos.length = n;
    const head = n ? points[n - 1].s : 0;
    for (let i = 0; i < n; i++) {
      const p = points[i];
      const a = points[Math.max(0, i - 3)];
      const b = points[Math.min(n - 1, i + 3)];
      let tx = b.x - a.x, ty = b.y - a.y;
      const len = Math.hypot(tx, ty);
      if (len < 0.001) { tx = 1; ty = 0; } else { tx /= len; ty /= len; }
      const nx = -ty, ny = tx;

      let sx = 0, sy = 0;
      for (let j = -2; j <= 2; j++) {
        const q = points[Math.min(n - 1, Math.max(0, i + j))];
        sx += q.x; sy += q.y;
      }
      sx /= 5; sy /= 5;

      const age = now - p.t;
      const dist = head - p.s;
      const L = edgePos(sx, sy, p.s, -1, age, dist, nx, ny, tx, ty);
      const R = edgePos(sx, sy, p.s, 1, age, dist, nx, ny, tx, ty);
      const brokenL = age >= p.breakL;
      const brokenR = age >= p.breakR;
      if (brokenL && p.bubL) { spawnBubble(L.x, L.y, nx, ny, -1, p.bubL, now); p.bubL = 0; }
      if (brokenR && p.bubR) { spawnBubble(R.x, R.y, nx, ny, 1, p.bubR, now); p.bubR = 0; }
      const f = Math.max(age / EDGE_LIFE, dist / MAX_LEN);
      pos[i] = {
        lx: L.x, ly: L.y, rx: R.x, ry: R.y,
        bl: brokenL, br: brokenR,
        f: f,
        k: Math.min(Math.floor(f * BUCKETS), BUCKETS)
      };
    }
  }

  function smoothEdges() {
    const n = pos.length;
    for (let pass = 0; pass < 2; pass++) {
      let pl = pos[0];
      let px = pl ? pl.lx : 0, py = pl ? pl.ly : 0, qx = pl ? pl.rx : 0, qy = pl ? pl.ry : 0;
      for (let i = 1; i < n - 1; i++) {
        const c = pos[i], nx = pos[i + 1];
        const cl = c.lx, cly = c.ly, cr = c.rx, cry = c.ry;
        c.lx = (px + 2 * cl + nx.lx) / 4;
        c.ly = (py + 2 * cly + nx.ly) / 4;
        c.rx = (qx + 2 * cr + nx.rx) / 4;
        c.ry = (qy + 2 * cry + nx.ry) / 4;
        px = cl; py = cly; qx = cr; qy = cry;
      }
    }
  }

  function tracePath(run) {
    const n = run.length / 2;
    if (n < 2) return;
    ctx.moveTo(run[0], run[1]);
    for (let i = 1; i < n; i++) ctx.lineTo(run[i * 2], run[i * 2 + 1]);
  }

  function drawEdges() {
    const n = pos.length;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
    for (let k = 0; k < BUCKETS; k++) {
      const frac = (k + 0.5) / BUCKETS;
      const alpha = Math.pow(1 - frac, 1.3);
      const col = mix(190, 150, frac) + ', ' + mix(235, 115, frac) + ', 255';

      ctx.beginPath();
      for (let side = 0; side < 2; side++) {
        let run = null;
        for (let i = 1; i < n; i++) {
          const a = pos[i - 1], b = pos[i];
          const broken = side === 0 ? (a.bl || b.bl) : (a.br || b.br);
          if (broken || b.k !== k) {
            if (run) { tracePath(run); run = null; }
            continue;
          }
          if (!run) run = side === 0 ? [a.lx, a.ly] : [a.rx, a.ry];
          if (side === 0) run.push(b.lx, b.ly); else run.push(b.rx, b.ry);
        }
        if (run) tracePath(run);
      }

      ctx.strokeStyle = 'rgba(' + col + ', ' + (alpha * 0.07) + ')';
      ctx.lineWidth = 4 * (1 - frac) + 1.5;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(' + col + ', ' + (alpha * 0.38) + ')';
      ctx.lineWidth = 1.2 * (1 - frac) + 0.5;
      ctx.stroke();
    }
  }

  function drawBubbles(now) {
    for (let i = 0; i < bubbles.length; i++) {
      const b = bubbles[i];
      const age = now - b.born;
      const frac = age / b.life;
      const alpha = Math.min(age / 80, 1) * (1 - frac);
      const x = b.x + b.vx * age + b.sw * (Math.cos(b.w * age + b.ph) - Math.cos(b.ph));
      const y = b.y + b.vy * age + b.sw * (Math.sin(b.w * age + b.ph) - Math.sin(b.ph));
      const r = b.r * (0.9 + 0.3 * frac);
      const col = mix(195, 160, frac) + ', ' + mix(232, 120, frac) + ', 255';

      ctx.fillStyle = 'rgba(' + col + ', ' + (alpha * 0.04) + ')';
      ctx.strokeStyle = 'rgba(' + col + ', ' + (alpha * 0.42) + ')';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 6.2832);
      ctx.fill();
      ctx.stroke();
    }
  }

  function prune(now) {
    let cut = 0;
    while (cut < points.length && now - points[cut].t >= EDGE_LIFE) cut++;
    if (cut) points.splice(0, cut);
    let w = 0;
    for (let i = 0; i < bubbles.length; i++) {
      if (now - bubbles[i].born < bubbles[i].life) bubbles[w++] = bubbles[i];
    }
    bubbles.length = w;
  }

  function frame(now) {
    ctx.clearRect(0, 0, viewW, viewH);
    prune(now);
    computeEdges(now);
    smoothEdges();
    drawEdges();
    drawBubbles(now);
    raf = (points.length || bubbles.length) ? requestAnimationFrame(frame) : 0;
  }

  document.addEventListener('mousemove', (e) => {
    const now = performance.now();
    if (lastX === null) { lastX = e.clientX; lastY = e.clientY; return; }

    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    const dist = Math.hypot(dx, dy);
    if (dist < STEP) return;

    if (dist > JUMP) {
      points.length = 0;
      lastX = e.clientX; lastY = e.clientY;
      return;
    }

    const n = Math.min(Math.floor(dist / STEP), MAX_STEPS);
    const seg = dist / n;
    for (let i = 1; i <= n; i++) {
      const f = i / n;
      pathLen += seg;
      if (points.length >= MAX_POINTS) points.shift();
      points.push(makePoint(lastX + dx * f, lastY + dy * f, now - (n - i)));
    }

    lastX = e.clientX; lastY = e.clientY;
    if (!raf) raf = requestAnimationFrame(frame);
  });
}
  });
/* ============================================================
   ДРОЖАЩИЙ ТЕКСТ
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  document
    .querySelectorAll(
      '.shake-slow, .shake-medium, .shake-fast'
    )
    .forEach(element => {

      const text =
        element.textContent;

      element.textContent = '';

      [...text].forEach(char => {

        const span =
          document.createElement('span');

        span.textContent = char;

        span.style.animationDelay =
          `-${(Math.random() * 0.35).toFixed(2)}s`;

        element.appendChild(span);

      });

    });

});

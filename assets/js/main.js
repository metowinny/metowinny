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
        document.querySelectorAll('.footnote.is-open').forEach(o => o.classList.remove('is-open'));
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
  const MAX_STEPS = 12;
  const JUMP = 300;
  const CONTOUR_LIFE = 380;
  const BUCKETS = 5;
  const MAX_POINTS = 90;
  const MAX_BUBBLES = 70;
  const BUBBLE_CHANCE = 0.35;

  let points = [];
  let bubbles = [];
  let raf = 0;
  let lastX = null, lastY = null;
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

  function addBubble(p, now) {
    if (bubbles.length >= MAX_BUBBLES) bubbles.shift();
    bubbles.push({
      x: p.x, y: p.y,
      born: now,
      life: 600 + Math.random() * 500,
      size: 1.5 + Math.random() * 2.5,
      lat: Math.random() * 2 - 1,
      latX: p.nx, latY: p.ny,
      rise: 0.012 + Math.random() * 0.03,
      drift: (Math.random() - 0.5) * 0.02,
      wob: Math.random() * 6.28,
      wobAmp: 0.3 + Math.random() * 1.1
    });
  }

  function drawContour(now) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const bucketLife = CONTOUR_LIFE / BUCKETS;
    for (let k = 0; k < BUCKETS; k++) {
      const lo = k * bucketLife;
      const hi = lo + bucketLife;
      const frac = (k + 0.5) / BUCKETS;
      const alpha = Math.pow(1 - frac, 1.5);
      const col = mix(190, 150, frac) + ', ' + mix(225, 115, frac) + ', 255';

      ctx.beginPath();
      let open = false;
      for (let i = 1; i < points.length; i++) {
        const age = now - points[i].t;
        if (age < lo || age >= hi) { open = false; continue; }
        const a = points[i - 1];
        const b = points[i];
        if (!open) { ctx.moveTo(a.x, a.y); open = true; }
        ctx.lineTo(b.x, b.y);
      }

      ctx.strokeStyle = 'rgba(' + col + ', ' + (alpha * 0.12) + ')';
      ctx.lineWidth = 7 * (1 - frac) + 2;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(' + col + ', ' + (alpha * 0.55) + ')';
      ctx.lineWidth = 1.8 * (1 - frac) + 0.6;
      ctx.stroke();
    }
  }

  function drawBubbles(now) {
    for (let i = 0; i < bubbles.length; i++) {
      const b = bubbles[i];
      const age = now - b.born;
      const frac = age / b.life;
      const alpha = Math.min(age / 60, 1) * (1 - frac);
      const spread = (1.5 + age * 0.018) * b.lat;
      const wob = Math.sin(age * 0.008 + b.wob) * b.wobAmp * Math.min(age / 300, 1);
      const x = b.x + b.latX * spread + b.drift * age + wob;
      const y = b.y + b.latY * spread - b.rise * age;
      const r = b.size * (0.85 + 0.4 * frac);
      const col = mix(195, 160, frac) + ', ' + mix(230, 120, frac) + ', 255';

      ctx.fillStyle = 'rgba(' + col + ', ' + (alpha * 0.07) + ')';
      ctx.strokeStyle = 'rgba(' + col + ', ' + (alpha * 0.5) + ')';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 6.2832);
      ctx.fill();
      ctx.stroke();
    }
  }

  function prune(now) {
    let w = 0;
    for (let i = 0; i < points.length; i++) {
      if (now - points[i].t < CONTOUR_LIFE) points[w++] = points[i];
    }
    points.length = w;
    w = 0;
    for (let i = 0; i < bubbles.length; i++) {
      if (now - bubbles[i].born < bubbles[i].life) bubbles[w++] = bubbles[i];
    }
    bubbles.length = w;
  }

  function frame(now) {
    ctx.clearRect(0, 0, viewW, viewH);
    prune(now);
    drawContour(now);
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

    const nx = -dy / dist;
    const ny = dx / dist;
    const n = Math.min(Math.floor(dist / STEP), MAX_STEPS);
    for (let i = 1; i <= n; i++) {
      const f = i / n;
      const p = { x: lastX + dx * f, y: lastY + dy * f, nx: nx, ny: ny, t: now - (n - i) };
      if (points.length >= MAX_POINTS) points.shift();
      points.push(p);
      if (Math.random() < BUBBLE_CHANCE) addBubble(p, now);
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

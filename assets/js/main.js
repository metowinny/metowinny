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
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  const STEP = 3;
  const HALF_WIDTH = 13;
  const WIDTH_RAMP = 260;
  const CONTOUR_LIFE = 420;
  const MAX_BUBBLES = 260;
  const MAX_STEPS = 30;
  const JUMP = 300;

  let points = [];
  let bubbles = [];
  let raf = 0;
  let lastX = null, lastY = null;
  let prevNx = 0, prevNy = 0;

  function resize() {
    const w = document.documentElement.clientWidth;
    const h = window.innerHeight;
    canvas.width = w * DPR;
    canvas.height = h * DPR;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  function ease(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function mix(a, b, t) {
    return Math.round(a + (b - a) * t);
  }

  function addBubble(p, side, now) {
    if (bubbles.length >= MAX_BUBBLES) bubbles.shift();
    bubbles.push({
      x: p.x, y: p.y, nx: p.nx, ny: p.ny, side: side,
      born: now,
      life: 700 + Math.random() * 700,
      size: 1.8 + Math.random() * 3.4,
      spread: (Math.random() - 0.5) * 0.08,
      slide: (Math.random() - 0.5) * 0.03,
      rise: 0.01 + Math.random() * 0.035,
      wob: Math.random() * 6.28,
      wobAmp: 0.4 + Math.random() * 1.4,
      tone: Math.random() * 0.25
    });
  }

  function bubblePos(b, age) {
    const ramp = ease(Math.min(age / WIDTH_RAMP, 1));
    const off = b.side * HALF_WIDTH * ramp + b.spread * age;
    const wob = Math.sin(age * 0.008 + b.wob) * b.wobAmp * Math.min(age / 300, 1);
    return {
      x: b.x + b.nx * off - b.ny * b.slide * age + wob,
      y: b.y + b.ny * off + b.nx * b.slide * age - b.rise * age
    };
  }

  function drawContour(now) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(138, 79, 232, .85)';
    ctx.shadowBlur = 10;
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        const frac = (now - b.t) / CONTOUR_LIFE;
        if (frac >= 1) continue;
        const ageA = now - a.t;
        const ageB = now - b.t;
        const offA = side * HALF_WIDTH * ease(Math.min(ageA / WIDTH_RAMP, 1));
        const offB = side * HALF_WIDTH * ease(Math.min(ageB / WIDTH_RAMP, 1));
        const alpha = Math.pow(1 - frac, 1.6);
        ctx.strokeStyle = 'rgba(' + mix(200, 150, frac) + ', ' + mix(235, 120, frac) + ', 255, ' + (alpha * 0.9) + ')';
        ctx.lineWidth = 0.6 + 2.2 * (1 - frac);
        ctx.beginPath();
        ctx.moveTo(a.x + a.nx * offA, a.y + a.ny * offA);
        ctx.lineTo(b.x + b.nx * offB, b.y + b.ny * offB);
        ctx.stroke();
      }
    }
    ctx.shadowBlur = 0;
  }

  function drawBubbles(now) {
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < bubbles.length; i++) {
      const b = bubbles[i];
      const age = now - b.born;
      const frac = age / b.life;
      const alpha = Math.min(age / 50, 1) * (1 - frac);
      const pos = bubblePos(b, age);
      const r = b.size * (0.85 + 0.5 * frac);
      const col = mix(205, 165, Math.min(frac + b.tone, 1)) + ', ' + mix(235, 115, Math.min(frac + b.tone, 1)) + ', 255';

      ctx.fillStyle = 'rgba(' + col + ', ' + (alpha * 0.07) + ')';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r * 2.2, 0, 6.2832);
      ctx.fill();

      ctx.fillStyle = 'rgba(' + col + ', ' + (alpha * 0.16) + ')';
      ctx.strokeStyle = 'rgba(' + col + ', ' + (alpha * 0.9) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, 6.2832);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, ' + (alpha * 0.55) + ')';
      ctx.beginPath();
      ctx.arc(pos.x - r * 0.3, pos.y - r * 0.3, Math.max(r * 0.22, 0.4), 0, 6.2832);
      ctx.fill();
    }
  }

  function frame(now) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width / DPR, canvas.height / DPR);

    points = points.filter(p => now - p.t < CONTOUR_LIFE);
    bubbles = bubbles.filter(b => now - b.born < b.life);

    drawContour(now);
    drawBubbles(now);

    if (points.length || bubbles.length) {
      raf = requestAnimationFrame(frame);
    } else {
      raf = 0;
    }
  }

  document.addEventListener('mousemove', (e) => {
    const now = performance.now();
    if (lastX === null) { lastX = e.clientX; lastY = e.clientY; return; }

    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    const dist = Math.hypot(dx, dy);
    if (dist < STEP) return;

    if (dist > JUMP) {
      points = [];
      lastX = e.clientX; lastY = e.clientY;
      return;
    }

    let nx = -dy / dist;
    let ny = dx / dist;
    if (prevNx || prevNy) {
      nx = prevNx * 0.5 + nx * 0.5;
      ny = prevNy * 0.5 + ny * 0.5;
      const len = Math.hypot(nx, ny) || 1;
      nx /= len; ny /= len;
    }
    prevNx = nx; prevNy = ny;

    const n = Math.min(Math.floor(dist / STEP), MAX_STEPS);
    for (let i = 1; i <= n; i++) {
      const f = i / n;
      const p = { x: lastX + dx * f, y: lastY + dy * f, nx: nx, ny: ny, t: now - (n - i) };
      points.push(p);
      if (Math.random() < 0.85) addBubble(p, -1, now);
      if (Math.random() < 0.85) addBubble(p, 1, now);
      if (Math.random() < 0.2) addBubble(p, 0, now);
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

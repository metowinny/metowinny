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

/* ---------- «рассекающий» след за курсором ---------- */
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && window.matchMedia('(hover: hover)').matches) {
  const CYAN = [140, 232, 255];
  const VIOLET = [150, 92, 245];
  const MAX_PARTICLES = 800;
  const K = 32 / 18; // масштаб спрайта: радиус кольца 18 из 64

  const cv = document.createElement('canvas');
  cv.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');
  let dpr = 1, W = 0, H = 0;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
  }
  resize();
  window.addEventListener('resize', resize);

  // заранее рисуем «пузырёк» один раз, потом только масштабируем
  function makeSprite(c) {
    const s = document.createElement('canvas');
    s.width = s.height = 64;
    const g = s.getContext('2d');
    const rgb = c[0] + ',' + c[1] + ',' + c[2];
    const grad = g.createRadialGradient(26, 24, 2, 32, 32, 18);
    grad.addColorStop(0, 'rgba(255,255,255,.30)');
    grad.addColorStop(.5, 'rgba(' + rgb + ',.14)');
    grad.addColorStop(1, 'rgba(' + rgb + ',.05)');
    g.beginPath(); g.arc(32, 32, 18, 0, Math.PI * 2);
    g.fillStyle = grad; g.fill();
    g.shadowColor = 'rgba(' + rgb + ',.9)';
    g.shadowBlur = 11;
    g.lineWidth = 5;
    g.strokeStyle = 'rgba(' + rgb + ',.95)';
    g.stroke();
    return s;
  }
  const SPR_CYAN = makeSprite(CYAN);
  const SPR_VIOLET = makeSprite(VIOLET);

  const particles = [];
  let running = false;

  function spawn(x, y, ux, uy, speed, side) {
    if (particles.length >= MAX_PARTICLES) return;
    const sat = Math.random() < 0.07; // одиночный «отлетевший» пузырь
    const baseW = 7 + Math.min(speed, 1.6) * 13;
    let spr = side > 0 ? SPR_CYAN : SPR_VIOLET;
    if (Math.random() < 0.1) spr = spr === SPR_CYAN ? SPR_VIOLET : SPR_CYAN; // чуть смешения для пены
    particles.push({
      x: x, y: y,
      dx: ux, dy: uy,
      nx: -uy, ny: ux,
      side: side,
      w: baseW * (0.7 + Math.random() * 0.6) * (sat ? 1.4 + Math.random() : 1),
      born: performance.now(),
      life: sat ? 1000 + Math.random() * 600 : 450 + Math.random() * 650,
      r: sat ? 3 + Math.random() * 3.5 : 3.5 + Math.random() * 2.5,
      ph: Math.random() * 6.28,
      fr: 0.004 + Math.random() * 0.006,
      sat: sat,
      spr: spr
    });
  }

  function tick(now) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      const age = Math.max(0, now - p.born);
      if (age >= p.life) {
        particles[i] = particles[particles.length - 1];
        particles.pop();
        continue;
      }
      const t = age / p.life;
      const e = 1 - Math.pow(1 - t, 2.2);             // края расходятся и замедляются
      const off = (1.5 + p.w * e) * p.side;
      const amp = p.sat ? 4 : 1.5 + 9 * t * t;        // чем старше — тем сильнее «болтает»
      const wob = Math.sin(p.ph + age * p.fr) * amp;
      const wob2 = Math.cos(p.ph * 1.3 + age * p.fr * 0.8) * amp;
      const px = p.x + p.nx * (off + wob) + p.dx * wob2 * 0.8;
      const py = p.y + p.ny * (off + wob) + p.dy * wob2 * 0.8 - age * 0.012;
      const rr = p.r * (1 - (p.sat ? 0.2 : 0.45) * t);
      const a = Math.min(1, age / 50) * (1 - Math.pow(t, 1.6)) * 0.7;
      ctx.globalAlpha = a;
      const size = rr * 2 * K;
      ctx.drawImage(p.spr, px - size / 2, py - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
    if (particles.length) requestAnimationFrame(tick);
    else running = false;
  }

  let lx = null, ly = null, lt = 0, sx = 0, sy = 0;
  document.addEventListener('mousemove', (e) => {
    const x = e.clientX, y = e.clientY, now = performance.now();
    if (lx === null) { lx = x; ly = y; lt = now; return; }
    const dx = x - lx, dy = y - ly;
    const dist = Math.hypot(dx, dy);
    if (dist < 2.5) return;                          // копим расстояние, чтобы направление не дрожало
    if (dist > 250) { lx = x; ly = y; lt = now; return; } // «телепорт» мыши — пропускаем
    const speed = dist / Math.max(now - lt, 1);

    // сглаженное направление движения
    let ux = dx / dist, uy = dy / dist;
    if (sx === 0 && sy === 0) { sx = ux; sy = uy; }
    sx = sx * 0.6 + ux * 0.4; sy = sy * 0.6 + uy * 0.4;
    const sl = Math.hypot(sx, sy) || 1;
    sx /= sl; sy /= sl;

    // пузырьки вдоль всего отрезка, плотно — чтобы у курсора контур был сплошным
    const n = Math.min(30, Math.ceil(dist / 3));
    for (let i = 1; i <= n; i++) {
      const k = i / n;
      const px = lx + dx * k - sx * 4;               // чуть позади острия курсора
      const py = ly + dy * k - sy * 4;
      spawn(px, py, sx, sy, speed, 1);
      spawn(px, py, sx, sy, speed, -1);
    }
    lx = x; ly = y; lt = now;
    if (!running && particles.length) { running = true; requestAnimationFrame(tick); }
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

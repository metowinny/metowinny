// ==========================================================
// НУЛЕВОЙ ТРИБУНАЛ — общий скрипт сайта
// ==========================================================

document.addEventListener('DOMContentLoaded', () => {

  /* Мобильное меню и поиск перенесены в site-ui.js: один обработчик на кнопку. */

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
  const FONT_SIZES = ['sm', 'md', 'lg'];
  const fontBtns = document.querySelectorAll('[data-font-size]');
  const storedFont = localStorage.getItem('nt-font-size');
  const savedFont = storedFont === 'xs' ? 'sm' : storedFont === 'xl' ? 'lg' : storedFont;
  if (savedFont && FONT_SIZES.includes(savedFont)) {
    if (savedFont !== 'md') document.body.classList.add('font-' + savedFont);
    fontBtns.forEach(b => b.classList.toggle('is-active', b.dataset.fontSize === savedFont));
  }
  fontBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const size = btn.dataset.fontSize;
      FONT_SIZES.forEach(s => document.body.classList.remove('font-' + s));
      fontBtns.forEach(b => { b.classList.remove('is-active'); b.setAttribute('aria-pressed', 'false'); });
      if (size !== 'md') {
        document.body.classList.add('font-' + size);
        localStorage.setItem('nt-font-size', size);
      } else {
        localStorage.removeItem('nt-font-size');
      }
      btn.classList.add('is-active');
      btn.setAttribute('aria-pressed','true');
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
      readableBtn.setAttribute('aria-pressed',String(on));
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
      themeToggle.setAttribute('aria-pressed',String(on));
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

  /* Сохраняемые независимые настройки главы. */
  for (const [attr, key, cls, labelOn, labelOff] of [
    ['data-reader-social','nt-reader-social','reader-social-off','Скрыть реакции и комментарии','Показать реакции и комментарии'],
    ['data-reader-particles','nt-reader-particles','reader-particles-off','Отключить пузырьки курсора','Включить пузырьки курсора']
  ]) {
    const btn=document.querySelector('['+attr+']');
    if (!btn) continue;
    const apply=on=>{
      document.body.classList.toggle(cls,!on);
      btn.classList.toggle('is-active',on);
      btn.setAttribute('aria-pressed',String(on));
      btn.title=on?labelOn:labelOff;
      if (!on && cls==='reader-social-off') {
        window.getSelection()?.removeAllRanges();
        document.querySelectorAll('.comment-selection-toolbar,.comment-mobile-panel,.comment-form').forEach(el=>el.remove());
      }
      if (!on && cls==='reader-particles-off') document.querySelectorAll('.cursor-particle').forEach(el=>el.remove());
    };
    apply(localStorage.getItem(key)!=='off');
    btn.addEventListener('click',()=>{
      const on=document.body.classList.contains(cls);
      apply(on);localStorage.setItem(key,on?'on':'off');
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

/* ---------- светящийся след за курсором ---------- */
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && window.matchMedia('(hover: hover)').matches) {
    let lastX = null, lastY = null, lastT = performance.now();
    let lastSpawnT = 0;
    const MAX_PARTICLES = 40;
    let activeParticles = 0;

    function spawnParticle(x, y) {
      if (document.body.classList.contains('reader-particles-off') || activeParticles >= MAX_PARTICLES) return;
      activeParticles++;
      const el = document.createElement('span');
      const isBlue = Math.random() < 0.5;
      el.className = 'cursor-particle ' + (isBlue ? 'cursor-particle--blue' : 'cursor-particle--pink');
      const size = 4 + Math.random() * 5;
      el.style.width = size + 'px';
      el.style.height = size + 'px';
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.setProperty('--dx', (Math.random() * 50 - 25) + 'px');
      el.style.setProperty('--dy', (-30 - Math.random() * 35) + 'px');
      el.style.animationDelay = (Math.random() * 90) + 'ms';
      document.body.appendChild(el);
      el.addEventListener('animationend', () => { el.remove(); activeParticles--; });
    }

    document.addEventListener('mousemove', (e) => {
      const now = performance.now();
      if (lastX === null) { lastX = e.clientX; lastY = e.clientY; lastT = now; return; }
      const dt = now - lastT;
      if (dt <= 0) return;
      const dist = Math.hypot(e.clientX - lastX, e.clientY - lastY);
      const speed = dist / dt;

      let minInterval, burst = 1;
      if (speed < 0.25)      { minInterval = 140; }
      else if (speed < 1)    { minInterval = 45; }
      else                   { minInterval = 20; burst = 2; }

      if (now - lastSpawnT >= minInterval) {
        for (let i = 0; i < burst; i++) spawnParticle(e.clientX, e.clientY);
        lastSpawnT = now;
      }
      lastX = e.clientX; lastY = e.clientY; lastT = now;
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

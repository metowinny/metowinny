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

  /* ---------- настройки читалки: размер шрифта ---------- */
  const fontBtns = document.querySelectorAll('[data-font-size]');
  const savedFont = localStorage.getItem('nt-font-size');
  if (savedFont) {
    document.body.classList.add('font-' + savedFont);
    fontBtns.forEach(b => b.classList.toggle('is-active', b.dataset.fontSize === savedFont));
  }
  fontBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const size = btn.dataset.fontSize;
      document.body.classList.remove('font-sm', 'font-lg');
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

});

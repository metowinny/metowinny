(() => {

  const ICONS = {
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.7-4 3.3-6 8-6s7.3 2 8 6"/>',
    mars: '<circle cx="10" cy="14" r="5"/><path d="M14 10l6-6M15 4h5v5"/>',
    gender: '<circle cx="9" cy="14" r="4"/><path d="M12 11l6-6M14 5h4v4M9 18v3M7 20h4"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    ruler: '<path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.5-3.5 3-5.5 6.5-5.5s6 2 6.5 5.5"/><path d="M16 4.7a3.5 3.5 0 010 6.6M18 14.8c2 .6 3.3 2.4 3.5 5.2"/>',
    crown: '<path d="M3.5 8l4.5 4 4-7 4 7 4.5-4-1.8 11H5.3z"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0114 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    home: '<path d="M3.5 11L12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/>',
    wave: '<path d="M2 12h3l2-6 4 12 3-9 2 3h6"/>',
    sword: '<path d="M14.5 4.5L20 4l-.5 5.5L9 20l-5-5z"/><path d="M5.5 13.5l5 5M3 21l3-3"/>',
    spear: '<path d="M5 19L18 6M14 4l6-1-1 6M3 21l3-3M4 15l5 5"/>',
    wings: '<path d="M12 20c-4 0-8-3-9-9 3 1 5 .5 7-1-2-1-3.5-3-4-6 4 .5 7 2.5 8 6 1-3.5 4-5.5 8-6-.5 3-2 5-4 6 2 1 4 1.5 7 1-1 6-5 9-9 9z"/>',
    cord: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
    terminal: '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M7 10l3 2.5L7 15M12.5 15H17"/>',
    heart: '<path d="M12 20s-8-4.7-8-10.2A4.3 4.3 0 0112 7a4.3 4.3 0 018 2.8C20 15.3 12 20 12 20z"/>',
    eye: '<path d="M2 12s3.7-7 10-7 10 7 10 7-3.7 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    quote: '<path d="M9.5 7H6a2 2 0 00-2 2v3.5a2 2 0 002 2h2.5c0 2.5-1 3.5-3 4.5M20 7h-3.5a2 2 0 00-2 2v3.5a2 2 0 002 2H19c0 2.5-1 3.5-3 4.5"/>',
    expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'
  };

  function injectIcons(root) {
    root.querySelectorAll('[data-icon]').forEach(el => {
      const path = ICONS[el.dataset.icon];
      if (!path || el.firstElementChild) return;
      el.innerHTML = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">' + path + '</svg>';
    });
  }

  function fitTitles() {
    document.querySelectorAll('[data-fit-title]').forEach(el => {
      el.style.fontSize = '';
      let size = parseFloat(getComputedStyle(el).fontSize);
      while (el.scrollWidth > el.clientWidth + 1 && size > 18) {
        size -= 1;
        el.style.fontSize = size + 'px';
      }
    });
  }

  const lightbox = (() => {
    const root = document.createElement('div');
    root.className = 'lightbox';
    root.hidden = true;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.innerHTML =
      '<div class="lightbox__backdrop" data-lb-close></div>' +
      '<figure class="lightbox__figure">' +
        '<div class="lightbox__stage"><img class="lightbox__img" alt=""></div>' +
        '<figcaption class="lightbox__caption"></figcaption>' +
      '</figure>' +
      '<button type="button" class="lightbox__btn lightbox__close" data-lb-close aria-label="Закрыть">✕</button>' +
      '<button type="button" class="lightbox__btn lightbox__prev" aria-label="Предыдущее">‹</button>' +
      '<button type="button" class="lightbox__btn lightbox__next" aria-label="Следующее">›</button>' +
      '<div class="lightbox__count"></div>';
    document.body.appendChild(root);

    const img = root.querySelector('.lightbox__img');
    const stage = root.querySelector('.lightbox__stage');
    const caption = root.querySelector('.lightbox__caption');
    const count = root.querySelector('.lightbox__count');
    const prev = root.querySelector('.lightbox__prev');
    const next = root.querySelector('.lightbox__next');

    let items = [];
    let index = 0;
    let opener = null;
    let touchX = null;

    function render() {
      const item = items[index];
      root.classList.remove('is-zoomed');
      stage.scrollTo(0, 0);
      img.src = item.src;
      img.alt = item.label || '';
      caption.textContent = item.label || '';
      count.textContent = items.length > 1 ? (index + 1) + ' / ' + items.length : '';
      const single = items.length < 2;
      prev.hidden = single;
      next.hidden = single;
    }

    function step(delta) {
      if (items.length < 2) return;
      index = (index + delta + items.length) % items.length;
      render();
    }

    function open(list, start, trigger) {
      if (!list.length) return;
      items = list;
      index = Math.max(0, Math.min(start || 0, list.length - 1));
      opener = trigger || null;
      render();
      root.hidden = false;
      document.documentElement.classList.add('lightbox-open');
      root.querySelector('.lightbox__close').focus();
    }

    function close() {
      root.hidden = true;
      img.removeAttribute('src');
      document.documentElement.classList.remove('lightbox-open');
      if (opener && opener.focus) opener.focus();
    }

    root.addEventListener('click', event => {
      if (event.target.closest('[data-lb-close]')) close();
    });
    img.addEventListener('click', () => root.classList.toggle('is-zoomed'));
    prev.addEventListener('click', () => step(-1));
    next.addEventListener('click', () => step(1));

    document.addEventListener('keydown', event => {
      if (root.hidden) return;
      if (event.key === 'Escape') close();
      else if (event.key === 'ArrowLeft') step(-1);
      else if (event.key === 'ArrowRight') step(1);
    });

    stage.addEventListener('touchstart', event => {
      touchX = root.classList.contains('is-zoomed') ? null : event.touches[0].clientX;
    }, { passive: true });

    stage.addEventListener('touchend', event => {
      if (touchX === null) return;
      const dx = event.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    }, { passive: true });

    return { open };
  })();

  function initReferences() {
    const portrait = document.querySelector('.character-hero__portrait');
    if (!portrait) return;

    const frame = portrait.querySelector('[data-ref-frame]');
    const image = portrait.querySelector('[data-ref-image]');
    const caption = portrait.querySelector('[data-ref-caption]');
    const nav = portrait.querySelector('.reference-nav');
    const prev = portrait.querySelector('[data-ref-prev]');
    const next = portrait.querySelector('[data-ref-next]');
    const dots = [...portrait.querySelectorAll('[data-ref-src]')];
    if (!frame || !image || !dots.length) return;

    const refs = dots.map(dot => ({
      src: dot.dataset.refSrc,
      label: dot.dataset.refLabel || dot.getAttribute('aria-label') || ''
    }));

    let current = 0;
    let token = 0;

    function show(i) {
      current = (i + refs.length) % refs.length;
      const ref = refs[current];
      const mine = ++token;
      dots.forEach((dot, n) => {
        dot.classList.toggle('is-active', n === current);
        dot.setAttribute('aria-pressed', n === current ? 'true' : 'false');
      });
      if (caption) caption.textContent = ref.label;
      frame.classList.add('is-switching');

      const loader = new Image();
      loader.onload = () => {
        if (mine !== token) return;
        image.src = ref.src;
        image.alt = ref.label;
        frame.classList.remove('is-missing');
        frame.classList.remove('is-switching');
      };
      loader.onerror = () => {
        if (mine !== token) return;
        image.removeAttribute('src');
        frame.classList.add('is-missing');
        frame.classList.remove('is-switching');
      };
      loader.src = ref.src;
    }

    dots.forEach((dot, n) => dot.addEventListener('click', () => show(n)));
    if (prev) prev.addEventListener('click', () => show(current - 1));
    if (next) next.addEventListener('click', () => show(current + 1));

    frame.addEventListener('click', () => {
      if (frame.classList.contains('is-missing')) return;
      lightbox.open(refs, current, frame);
    });

    if (nav && refs.length < 2) nav.hidden = true;

    show(0);
  }

  function initGenesis() {
    const cards = [...document.querySelectorAll('.genesis-card[data-full]')];
    if (!cards.length) return;
    const items = cards.map(card => {
      const name = card.querySelector('.genesis-card__name');
      return { src: card.dataset.full, label: name ? name.textContent.trim() : '' };
    });
    cards.forEach((card, i) => {
      card.addEventListener('click', () => lightbox.open(items, i, card));
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectIcons(document);
    initReferences();
    initGenesis();
    fitTitles();
    window.addEventListener('resize', fitTitles);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTitles);
  });

})();

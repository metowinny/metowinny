/* Нулевой Трибунал — общая доступная навигация и локальный полнотекстовый поиск.
   Данные поиска генерируются из авторских HTML, содержимое глав не изменяется. */
(() => {
  'use strict';
  const script = document.currentScript || document.querySelector('script[src$="site-ui.js"]');
  const base = new URL('../../', script.src);
  const indexURL = new URL('assets/search-index.json', base);
  const nav = document.querySelector('[data-mobile-nav]');
  const burger = document.querySelector('[data-burger]');
  const search = document.querySelector('[data-site-search]');
  let searchTimer;
  let indexPromise;

  // Меню: клики, клавиатура, закрытие вне меню и при переходе.
  if (burger && nav) {
    const setOpen = open => {
      nav.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    };
    burger.addEventListener('click', event => {
      event.stopPropagation();
      setOpen(!nav.classList.contains('is-open'));
    });
    document.addEventListener('click', event => {
      if (!burger.contains(event.target) && !nav.contains(event.target)) setOpen(false);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        burger.focus();
      }
    });
    nav.addEventListener('click', event => {
      if (event.target.closest('a')) setOpen(false);
    });
  }

  if (!search) return;
  const panel = document.createElement('div');
  const host = search.closest('.search-box');
  panel.className = 'site-search-results';
  panel.id = 'site-search-results';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', 'Результаты поиска');
  panel.hidden = true;
  host.appendChild(panel);
  search.setAttribute('aria-controls', panel.id);
  search.setAttribute('aria-expanded', 'false');

  const norm = value => String(value || '').toLocaleLowerCase('ru-RU').normalize('NFKC').replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
  const show = visible => {
    panel.hidden = !visible;
    search.setAttribute('aria-expanded', String(visible));
  };
  function message(text) {
    panel.replaceChildren();
    const p = document.createElement('p');
    p.className = 'site-search-results__message';
    p.textContent = text;
    panel.append(p);
    show(true);
  }
  function getIndex() {
    if (!indexPromise) {
      indexPromise = fetch(indexURL, { cache: 'default' })
        .then(response => {
          if (!response.ok) throw new Error('HTTP ' + response.status);
          return response.json();
        })
        .then(data => {
          if (!data || !Array.isArray(data.items)) throw new Error('Неверный индекс поиска');
          return data.items;
        })
        .catch(error => { indexPromise = null; throw error; });
    }
    return indexPromise;
  }
  const getExcerpt = (text, query) => {
    const pos = norm(text).indexOf(query);
    const from = Math.max(0, pos < 0 ? 0 : pos - 75);
    const until = Math.min(text.length, from + 205);
    return (from ? '…' : '') + text.slice(from, until).trim() + (until < text.length ? '…' : '');
  };
  function render(items, query) {
    panel.replaceChildren();
    if (!items.length) return message('Ничего не найдено. Попробуйте другое слово или словосочетание.');
    const heading = document.createElement('div');
    heading.className = 'site-search-results__heading';
    heading.textContent = `Найдено разделов: ${items.length}`;
    panel.append(heading);
    for (const item of items.slice(0, 10)) {
      const a = document.createElement('a');
      a.href = new URL(item.url, base).href;
      a.className = 'site-search-results__item';
      const label = document.createElement('span');
      label.className = 'site-search-results__type';
      label.textContent = item.type;
      const title = document.createElement('strong');
      title.textContent = item.title;
      const excerpt = document.createElement('span');
      excerpt.className = 'site-search-results__excerpt';
      excerpt.textContent = getExcerpt(item.text, query);
      a.append(label, title, excerpt);
      panel.append(a);
    }
    if (items.length > 10) {
      const footer = document.createElement('p');
      footer.className = 'site-search-results__message';
      footer.textContent = 'Показаны первые 10 совпадений. Уточните запрос для более точного поиска.';
      panel.append(footer);
    }
    show(true);
  }
  async function searchFor(query) {
    const terms = norm(query).split(' ').filter(Boolean);
    if (!terms.length || norm(query).length < 2) {
      show(false);
      return;
    }
    message('Ищем по библиотеке…');
    try {
      const docs = await getIndex();
      if (norm(search.value) !== norm(query)) return;
      const matches = docs.map(doc => {
        const title = norm(doc.title);
        const content = norm(doc.text);
        if (!terms.every(t => title.includes(t) || content.includes(t))) return null;
        let score = doc.weight || 1;
        if (title.includes(norm(query))) score += 35;
        if (content.includes(norm(query))) score += 10;
        for (const t of terms) {
          if (title.includes(t)) score += 12;
          if (content.includes(t)) score += Math.min(8, content.split(t).length - 1);
        }
        return { ...doc, score };
      }).filter(Boolean).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'ru'));
      render(matches, norm(query));
    } catch (error) {
      console.error('[Site search]', error);
      message('Поиск недоступен. Проверьте подключение или откройте сайт через HTTP(S), а не file://.');
    }
  }
  search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    if (norm(search.value).length < 2) return show(false);
    searchTimer = setTimeout(() => searchFor(search.value), 180);
  });
  search.addEventListener('focus', () => {
    if (norm(search.value).length >= 2) searchFor(search.value);
  });
  search.addEventListener('keydown', event => {
    if (event.key === 'Escape') { show(false); search.blur(); }
    if (event.key === 'Enter' && !panel.hidden) {
      const first = panel.querySelector('.site-search-results__item');
      if (first) { event.preventDefault(); first.click(); }
    }
    if (event.key === 'ArrowDown' && !panel.hidden) {
      const first = panel.querySelector('.site-search-results__item');
      if (first) { event.preventDefault(); first.focus(); }
    }
  });
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape') { show(false); search.focus(); }
  });
  document.addEventListener('pointerdown', event => {
    if (!host.contains(event.target)) show(false);
  });
})();

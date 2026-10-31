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
    if (window.NTLibrary?.documents) return window.NTLibrary.documents();
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
      }).filter(Boolean).sort((a, b) => Number(b.type === 'Глоссарий') - Number(a.type === 'Глоссарий') || b.score - a.score || a.title.localeCompare(b.title, 'ru'));
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

/* Возврат наверх: без лишних слушателей и без появления на первом экране. */
(() => {
 const btn=document.querySelector('[data-back-to-top]');
 if(!btn)return;
 let queued=false;
 const refresh=()=>{btn.hidden=scrollY<420;queued=false;};
 addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(refresh)}},{passive:true});
 btn.addEventListener('click',()=>scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));
 refresh();
})();


/* Нулевой Трибунал — необязательные улучшения читалки.
   Не переписывает HTML глав, комментарии, реакции или авторские стили.
   Работает на обычном статическом GitHub Pages без серверной части. */
(() => {
  'use strict';
  const script = document.currentScript || document.querySelector('script[src$="site-ui.js"]');
  if (!script) return;
  const root = new URL('../../', script.src);
  const chapterRoot = new URL('glavy/', root);
  const chapterPath = /^glava-(\d+)-(\d+)\.html$/;
  const chapterName = location.pathname.split('/').pop();
  const isChapter = location.href.startsWith(chapterRoot.href) &&
    (chapterPath.test(chapterName) || chapterName === 'prolog.html');
  const reader = isChapter ? document.querySelector('.reader-top .reader') : null;
  const STORAGE_KEY = 'nt-qol-reading-v1';
  const fileExistsCache = new Map();

  function readLast() {
    try {
      const info = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!info || typeof info.path !== 'string' || typeof info.title !== 'string' ||
          typeof info.percent !== 'number' || !Number.isFinite(info.percent) ||
          info.percent < 0 || info.percent > 100) return null;
      const url = new URL(info.path, root);
      if (url.origin !== root.origin || !url.href.startsWith(chapterRoot.href) ||
          !(chapterPath.test(url.pathname.split('/').pop()) || url.pathname.endsWith('/prolog.html'))) return null;
      return { ...info, url };
    } catch (_) { return null; }
  }
  function storeLast(info) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(info)); } catch (_) { /* private mode */ }
  }

  // Прогресс относится к тексту главы, не к футеру/комментариям после него.
  if (reader) {
    const bar = document.createElement('div');
    bar.className = 'nt-reading-progress';
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-label', 'Прогресс чтения главы');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', '100');
    bar.setAttribute('aria-valuenow', '0');
    const fill = document.createElement('div');
    fill.className = 'nt-reading-progress__fill';
    bar.appendChild(fill);
    document.body.appendChild(bar);

    const name = (document.querySelector('.chapter-head__title')?.textContent || document.title)
      .replace(/\s+/g, ' ').trim();
    const current = new URL(chapterName, chapterRoot).href;
    const prior = readLast();
    let frame = 0;
    let lastSaved = 0;
    let currentPercent = 0;

    function measure() {
      const top = reader.getBoundingClientRect().top + window.scrollY;
      const bottom = reader.getBoundingClientRect().bottom + window.scrollY;
      const begin = Math.max(0, top - window.innerHeight * .70);
      const finish = Math.max(begin + 1, bottom - window.innerHeight * .30);
      return Math.round(Math.max(0, Math.min(100, (window.scrollY - begin) / (finish - begin) * 100)));
    }
    function persist() {
      if (currentPercent < 3) return;
      storeLast({
        path: new URL(chapterName, chapterRoot).pathname.slice(root.pathname.length),
        title: name,
        percent: currentPercent,
        y: Math.max(0, Math.round(window.scrollY)),
        updated: Date.now()
      });
      lastSaved = Date.now();
    }
    function update() {
      frame = 0;
      currentPercent = measure();
      fill.style.width = currentPercent + '%';
      bar.setAttribute('aria-valuenow', String(currentPercent));
      if (currentPercent >= 3 && Date.now() - lastSaved > 1500) persist();
    }
    function queue() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue, { passive: true });
    window.addEventListener('pagehide', persist);
    document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });
    window.addEventListener('load', queue);
    queue();

    // Возврат на эту главу — не прокручиваем молча; предлагаем выбор.
    if (prior && prior.url.href === current && prior.percent >= 8 && prior.percent < 98 &&
        typeof prior.y === 'number' && Number.isFinite(prior.y) && prior.y > 200 && !location.hash) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'nt-resume-chip';
      chip.textContent = '↳ Продолжить с ' + prior.percent + '%';
      chip.title = 'Вернуться на место, где вы остановились';
      chip.addEventListener('click', () => {
        const max = Math.max(0, document.documentElement.scrollHeight - innerHeight);
        window.scrollTo({ top: Math.min(prior.y, max), behavior: 'auto' });
        chip.remove();
      });
      document.querySelector('.chapter-head')?.insertAdjacentElement('afterend', chip);
    }
  }

  // Маленькое продолжение чтения в каталоге, только если пользователь сам читал.
  if (!reader && (location.pathname === root.pathname ||
      location.pathname === new URL('index.html', root).pathname ||
      location.pathname === new URL('toma/usmirenie-boli.html', root).pathname)) {
    const last = readLast();
    if (last && last.percent >= 3) {
      const card = document.createElement('a');
      card.className = 'nt-continue-card';
      card.href = last.url.href;
      const copy = document.createElement('span');
      copy.className = 'nt-continue-card__copy';
      const kicker = document.createElement('span');
      kicker.className = 'nt-continue-card__eyebrow';
      kicker.textContent = '✦ ROOTS / ВАШЕ ЧТЕНИЕ';
      const caption = document.createElement('strong');
      caption.textContent = last.title;
      const hint = document.createElement('span');
      hint.className = 'nt-continue-card__hint';
      hint.textContent = last.percent >= 98 ? 'Глава прочитана · открыть снова' : 'Продолжить с ' + last.percent + '%';
      copy.append(kicker, caption, hint);
      const arrow = document.createElement('span');
      arrow.className = 'nt-continue-card__arrow';
      arrow.textContent = '↗';
      arrow.setAttribute('aria-hidden', 'true');
      card.append(copy, arrow);
      if (location.pathname.includes('/toma/')) {
        document.querySelector('.tome-hero')?.insertAdjacentElement('afterend', card);
      } else {
        document.querySelector('.hero')?.insertAdjacentElement('afterend', card);
      }
    }
  }

  // GitHub Pages не выдаёт список файлов в папке. Проверяем только конкретные
  // ожидаемые имена (HEAD), поэтому добавленная glava-2-6.html обнаружится
  // без переписывания ссылок в glava-2-5.html.
  function exists(filename) {
    if (!/^(?:prolog|glava-[1-5]-(?:[1-9]|10))\.html$/.test(filename)) return Promise.resolve(false);
    if (!fileExistsCache.has(filename)) {
      fileExistsCache.set(filename, fetch(new URL(filename, chapterRoot), {
        method: 'HEAD', cache: 'no-store'
      }).then(r => r.ok && r.status === 200).catch(() => false));
    }
    return fileExistsCache.get(filename);
  }
  const nameFor = filename => filename === 'prolog.html' ? 'Пролог' :
    (filename.match(chapterPath) ? filename.match(chapterPath)[1] + '.' + filename.match(chapterPath)[2] + '.' : 'Глава');
  const nextFile = filename => {
    if (filename === 'prolog.html') return 'glava-1-1.html';
    const match = filename.match(chapterPath);
    if (!match) return null;
    const act = Number(match[1]), chapter = Number(match[2]);
    return chapter < 10 ? `glava-${act}-${chapter + 1}.html` : act < 5 ? `glava-${act + 1}-1.html` : null;
  };
  const previousFile = filename => {
    if (filename === 'prolog.html') return null;
    const match = filename.match(chapterPath);
    if (!match) return null;
    const act = Number(match[1]), chapter = Number(match[2]);
    return chapter > 1 ? `glava-${act}-${chapter - 1}.html` : act > 1 ? `glava-${act - 1}-10.html` : 'prolog.html';
  };
  function updatePager(sideName, filename) {
    if (!filename) return;
    for (const pager of document.querySelectorAll('.chapter-top-nav, .chapter-foot-nav')) {
      let side = pager.querySelector('.chapter-foot-nav__side' + (sideName === 'next' ? '.next' : ':not(.next)'));
      if (!side) {
        side = document.createElement('div');
        side.className = 'chapter-foot-nav__side' + (sideName === 'next' ? ' next' : '');
        if (sideName === 'next') pager.appendChild(side); else pager.prepend(side);
      }
      const existing = side.querySelector('a');
      if (existing && new URL(existing.getAttribute('href'), location.href).pathname ===
          new URL(filename, chapterRoot).pathname) continue;
      const link = document.createElement('a');
      link.href = new URL(filename, chapterRoot).href;
      const label = document.createElement('span');
      label.className = 'chapter-foot-nav__label';
      label.textContent = sideName === 'next' ? 'Далее' : 'Назад';
      const title = document.createElement('span');
      title.className = 'chapter-foot-nav__title';
      title.textContent = sideName === 'next' ? nameFor(filename) + ' Читать главу →' : '← ' + nameFor(filename) + ' Предыдущая глава';
      link.append(label, title);
      side.replaceChildren(link);
    }
  }
  if (reader) {
    // На опубликованных главах оставляем прежние красивые названия ссылок.
    // Перестраиваем только устаревшие/отсутствующие переходы.
    for (const [side, filename] of [['next', nextFile(chapterName)], ['prev', previousFile(chapterName)]]) {
      if (!filename) continue;
      const sides = [...document.querySelectorAll('.chapter-top-nav, .chapter-foot-nav')].map(p =>
        p.querySelector('.chapter-foot-nav__side' + (side === 'next' ? '.next' : ':not(.next)')));
      const correct = sides.length >= 2 && sides.every(el => {
        const link = el?.querySelector('a');
        return link && new URL(link.getAttribute('href'), location.href).pathname ===
          new URL(filename, chapterRoot).pathname;
      });
      if (!correct) exists(filename).then(ok => { if (ok) updatePager(side, filename); });
    }
  }

  // Каталог: если на месте 2.6 стоит «скоро», после публикации glava-2-6.html
  // автоматически появляется настоящая ссылка. Следующие подряд файлы тоже.
  if (location.pathname === new URL('toma/usmirenie-boli.html', root).pathname) {
    const locked = [...document.querySelectorAll('.chapter-link.is-locked')];
    locked.forEach(async placeholder => {
      const number = placeholder.querySelector('.chapter-link__num')?.textContent.match(/(\d+)\.(\d+)/);
      if (!number) return;
      let act = Number(number[1]), index = Number(number[2]);
      if (act < 1 || act > 5 || index < 1 || index > 10) return;
      let current = placeholder;
      while (index <= 10) {
        const filename = `glava-${act}-${index}.html`;
        if (!(await exists(filename))) break;
        const link = document.createElement('a');
        link.className = 'chapter-link';
        link.href = new URL(filename, chapterRoot).href;
        const num = document.createElement('span');
        num.className = 'chapter-link__num';
        num.textContent = `${act}.${index}.`;
        const text = document.createElement('span');
        text.textContent = 'Читать главу';
        link.append(num, text);
        if (index === Number(number[2])) current.replaceWith(link);
        else current.insertAdjacentElement('afterend', link);
        current = link;
        index++;
      }
    });
  }
})();


/* Нулевой Трибунал — QoL 2.2: каталог, поиск новых глав, закладки,
   синопсисы, рукопись и быстрое оглавление. Авторский HTML глав не изменяет. */
(() => {
  'use strict';
  const script = document.currentScript || document.querySelector('script[src*="site-ui.js"]');
  if (!script) return;
  const base = new URL('../../', script.src);
  const chapterRoot = new URL('glavy/', base);
  const indexURL = new URL('assets/search-index.json', base);
  const summariesURL = new URL('assets/chapter-summaries.json', base);
  const chapterRE = /^glava-([1-5])-([1-9]|10)\.html$/;
  const allowed = name => name === 'prolog.html' || chapterRE.test(name);
  const isChapterPage = location.pathname.startsWith(chapterRoot.pathname) && allowed(location.pathname.split('/').pop());
  const isManuscript = location.pathname === new URL('manuscript.html', base).pathname;
  const isSynopses = location.pathname === new URL('synopses.html', base).pathname;
  const reader = document.querySelector('.reader-top .reader');
  const STORAGE = 'nt-bookmarks-v1';
  const $ = (tag, cls, text) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  };
  const fileOf = url => new URL(url, base).pathname.split('/').pop();
  const pathOf = file => new URL(file, chapterRoot).href;
  const order = file => file === 'prolog.html' ? 0 : chapterRE.test(file) ?
    Number(file.match(chapterRE)[1]) * 10 + Number(file.match(chapterRE)[2]) : Infinity;
  const chapterTitle = file => file === 'prolog.html' ? 'Пролог' : (file.match(chapterRE) ? file.match(chapterRE)[1] + '.' + file.match(chapterRE)[2] : 'Глава');
  const advance = file => {
    if (file === 'prolog.html') return 'glava-1-1.html';
    const m = file.match(chapterRE);
    if (!m) return null;
    const a = +m[1], b = +m[2];
    return b < 10 ? `glava-${a}-${b + 1}.html` : a < 5 ? `glava-${a + 1}-1.html` : null;
  };
  const normText = s => (s || '').replace(/\s+/g, ' ').trim();
  const catalogURL = new URL('assets/chapter-catalog.json', base);
  let docsPromise, catalogPromise, summaryPromise;

  function parseChapter(html, file) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const body = doc.querySelector('.reader-top .reader');
    if (!body) throw new Error('Нет блока .reader: ' + file);
    const title = normText(doc.querySelector('.chapter-head__title')?.textContent) || chapterTitle(file);
    return { doc, body, title, file };
  }
  function documents() {
    if (!docsPromise) docsPromise = (async () => {
      const response = await fetch(indexURL, { cache: 'no-cache' });
      if (!response.ok) throw new Error('Не найден индекс поиска');
      const data = await response.json();
      if (!Array.isArray(data.items)) throw new Error('Некорректный индекс поиска');
      const docs = data.items.slice();
      const known = new Set(docs.map(item => fileOf(item.url)));
      const latest = docs.filter(item => item.type === 'Глава' && allowed(fileOf(item.url)))
        .map(item => fileOf(item.url)).sort((a, b) => order(b) - order(a))[0] || 'prolog.html';
      // Статический GitHub Pages не перечисляет папки: проверяем следующий файл
      // после самого нового в индексе. Уже опубликованные главы не скачиваем заново.
      let next = advance(latest);
      while (next && !known.has(next)) {
        let found;
        try {
          const head = await fetch(pathOf(next), { method: 'HEAD', cache: 'no-store' });
          found = head.ok && head.status === 200;
        } catch (_) { found = false; }
        if (!found) break;
        try {
          const response = await fetch(pathOf(next), { cache: 'no-store' });
          if (!response.ok) break;
          const parsed = parseChapter(await response.text(), next);
          docs.push({ url: 'glavy/' + next, title: parsed.title, type: 'Глава',
            text: normText(parsed.body.textContent), weight: 3 });
          known.add(next);
        } catch (error) { console.warn('[NT library] Новая глава недоступна', error); break; }
        next = advance(next);
      }
      // Глоссарий тоже может измениться после сборки JSON: берём свежий текст
      // из опубликованной страницы и подменяем только поисковую копию.
      try {
        const glossary = docs.find(item => item.type === 'Глоссарий');
        if (glossary) {
          const live = await fetch(new URL('glossary.html', base), { cache: 'no-cache' });
          if (live.ok) {
            const doc = new DOMParser().parseFromString(await live.text(), 'text/html');
            const list = doc.querySelector('.glossary-list');
            if (list) glossary.text = normText(list.textContent);
          }
        }
      } catch (_) { /* используем ранее опубликованный индекс */ }
      return docs;
    })().catch(error => { docsPromise = null; throw error; });
    return docsPromise;
  }
  function chapters() {
    if (!catalogPromise) catalogPromise = (async () => {
      // Лёгкий каталог (~2 КБ), а не полнотекстовый поисковый индекс (~1,5 МБ).
      const response = await fetch(catalogURL, { cache: 'no-cache' });
      if (!response.ok) throw new Error('Не найден каталог глав');
      const data = await response.json();
      if (!Array.isArray(data.chapters)) throw new Error('Неверный каталог');
      const list = data.chapters.filter(item => item && allowed(fileOf(item.url)))
        .map(item => ({ ...item, type: 'Глава' }));
      const known = new Set(list.map(item => fileOf(item.url)));
      const latest = [...known].sort((a, b) => order(b) - order(a))[0] || 'prolog.html';
      let next = advance(latest);
      while (next && !known.has(next)) {
        let found;
        try {
          const head = await fetch(pathOf(next), { method: 'HEAD', cache: 'no-store' });
          found = head.status === 200;
        } catch (_) { found = false; }
        if (!found) break;
        try {
          const response = await fetch(pathOf(next), { cache: 'no-store' });
          if (!response.ok) break;
          const parsed = parseChapter(await response.text(), next);
          list.push({ url: 'glavy/' + next, title: parsed.title, type: 'Глава' });
          known.add(next);
        } catch (error) { console.warn('[NT catalog]', error); break; }
        next = advance(next);
      }
      return list.sort((a, b) => order(fileOf(a.url)) - order(fileOf(b.url)));
    })().catch(error => { catalogPromise = null; throw error; });
    return catalogPromise;
  }
  function summaries() {
    if (!summaryPromise) summaryPromise = fetch(summariesURL, { cache: 'no-cache' })
      .then(response => response.ok ? response.json() : { chapters: {} })
      .then(data => data && typeof data.chapters === 'object' && data.chapters ? data.chapters : {})
      .catch(() => ({}));
    return summaryPromise;
  }
  window.NTLibrary = Object.freeze({ documents, chapters, summaries });

  function bookmarks() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE) || '[]');
      return Array.isArray(data) ? data.filter(b => b && allowed(b.file) && Number.isInteger(b.block) && b.block >= 0).slice(0, 150) : [];
    } catch (_) { return []; }
  }
  function saveBookmarks(items) {
    try { localStorage.setItem(STORAGE, JSON.stringify(items)); return true; }
    catch (_) { return false; }
  }
  // Выбираем ближайший к верхней трети экрана текстовый абзац, а не абсолютный scrollY:
  // закладка переживёт изменение размера текста, ширины экрана и шрифтов.
  const targets = root => [...root.querySelectorAll('p, blockquote, h2, h3, h4, li')]
    .filter(el => !el.closest('.nt-summary') && !el.closest('.nt-manuscript-heading'));
  function currentPoint() {
    if (!reader) return null;
    let scope = reader;
    let file = location.pathname.split('/').pop();
    if (isManuscript) {
      const sections = [...reader.querySelectorAll('.nt-manuscript-chapter')];
      scope = sections.filter(section => section.getBoundingClientRect().top <= innerHeight * .38).pop() || sections[0];
      if (!scope) return null;
      file = scope.dataset.source;
    }
    const nodes = targets(scope);
    if (!nodes.length || !allowed(file)) return null;
    let best = 0, score = Infinity;
    nodes.forEach((node, idx) => {
      const r = node.getBoundingClientRect();
      const distance = r.bottom < 70 ? 1e5 + 70 - r.bottom : Math.abs(r.top - innerHeight * .33);
      if (distance < score) { best = idx; score = distance; }
    });
    const node = nodes[best];
    const title = isManuscript ? scope.dataset.title : normText(document.querySelector('.chapter-head__title')?.textContent);
    return { file, title: title || chapterTitle(file), block: best, excerpt: normText(node.textContent).slice(0, 100), updated: Date.now() };
  }
  function addBookmark() {
    const point = currentPoint();
    if (!point) return announce('Закладку можно поставить после загрузки текста.');
    const items = bookmarks().filter(b => !(b.file === point.file && b.block === point.block));
    items.unshift({ ...point, id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 7) });
    if (saveBookmarks(items.slice(0, 150))) announce('✦ Закладка сохранена');
    else announce('Не удалось сохранить: браузер запрещает локальное хранение.');
  }
  function announce(message) {
    let toast = document.querySelector('.nt-toast');
    if (!toast) { toast = $('div', 'nt-toast'); toast.setAttribute('role', 'status'); document.body.append(toast); }
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(announce.timer);
    announce.timer = setTimeout(() => toast.classList.remove('is-visible'), 2800);
  }
  const toBookmarkURL = b => {
    const url = new URL(pathOf(b.file));
    url.searchParams.set('ntbookmark', String(b.block));
    return url.href;
  };

  // Универсальное модальное окно — содержимое создаётся DOM API, не HTML строками.
  const modal = $('dialog', 'nt-library-modal');
  const shell = $('div', 'nt-library-modal__shell');
  const modalHead = $('div', 'nt-library-modal__head');
  const modalTitle = $('h2', '', 'Библиотека');
  const close = $('button', 'nt-library-modal__close', '×');
  close.type = 'button'; close.setAttribute('aria-label', 'Закрыть окно');
  close.addEventListener('click', () => modal.close());
  const modalBody = $('div', 'nt-library-modal__body');
  modalHead.append(modalTitle, close);
  shell.append(modalHead, modalBody);
  modal.append(shell);
  document.body.append(modal);
  modal.addEventListener('click', event => { if (event.target === modal) modal.close(); });
  function openModal(title) {
    modalTitle.textContent = title;
    modalBody.replaceChildren($('p', 'nt-library-empty', 'Загрузка…'));
    if (!modal.open) modal.showModal();
  }
  async function showChapters() {
    openModal('✦ Быстрый переход по главам');
    try {
      const list = await chapters();
      if (!modal.open) return;
      modalBody.replaceChildren();
      if (!list.length) { modalBody.append($('p', 'nt-library-empty', 'Пока нет опубликованных глав.')); return; }
      let lastAct = null;
      for (const ch of list) {
        const file = fileOf(ch.url);
        const act = file === 'prolog.html' ? 0 : Number(file.match(chapterRE)[1]);
        if (act !== lastAct) { modalBody.append($('h3', 'nt-library-act', act === 0 ? 'Пролог' : 'Акт ' + act)); lastAct = act; }
        const link = $('a', 'nt-library-chapter', ch.title);
        link.href = pathOf(file);
        if (file === location.pathname.split('/').pop()) { link.classList.add('is-current'); link.setAttribute('aria-current', 'page'); }
        modalBody.append(link);
      }
      const links = $('div', 'nt-library-modal__links');
      for (const [label, url] of [['Рукопись', 'manuscript.html'], ['Синопсисы', 'synopses.html'], ['Том I', 'toma/usmirenie-boli.html']]) {
        const a = $('a', '', label + ' ↗'); a.href = new URL(url, base).href; links.append(a);
      }
      modalBody.append(links);
    } catch (error) { modalBody.replaceChildren($('p', 'nt-library-empty', 'Не удалось загрузить каталог. Проверьте подключение.')); }
  }
  function showBookmarks() {
    openModal('☆ Мои закладки');
    function render() {
      modalBody.replaceChildren();
      const items = bookmarks();
      if (!items.length) {
        modalBody.append($('p', 'nt-library-empty', 'Здесь пока пусто. Откройте главу, прокрутите к нужному месту и нажмите «＋ Закладка».'));
        return;
      }
      for (const b of items) {
        const row = $('div', 'nt-library-bookmark');
        const link = $('a', 'nt-library-bookmark__link');
        link.href = toBookmarkURL(b);
        link.append($('strong', '', b.title || chapterTitle(b.file)), $('span', '', b.excerpt || 'Перейти к месту чтения'));
        const del = $('button', 'nt-library-bookmark__delete', 'Удалить');
        del.type = 'button'; del.setAttribute('aria-label', 'Удалить закладку');
        del.addEventListener('click', () => { saveBookmarks(bookmarks().filter(x => x.id !== b.id)); render(); });
        row.append(link, del); modalBody.append(row);
      }
    }
    render();
  }

  // Действия появляются только через общий скрипт; существующие HTML глав не редактируются.
  const toolbar = $('nav', 'nt-library-toolbar');
  toolbar.setAttribute('aria-label', 'Навигация по библиотеке');
  function tool(label, callback) {
    const button = $('button', 'nt-library-toolbar__button', label);
    button.type = 'button'; button.addEventListener('click', callback); toolbar.append(button);
  }
  if (isChapterPage || isManuscript || isSynopses || location.pathname.includes('/toma/') || location.pathname === base.pathname || location.pathname === new URL('index.html', base).pathname) {
    tool('☷ Все главы', showChapters);
    if (isChapterPage || isManuscript) tool('＋ Закладка', addBookmark);
    tool('☆ Закладки', showBookmarks);
    const manuscript = $('a', 'nt-library-toolbar__button', '▤ Рукопись'); manuscript.href = new URL('manuscript.html', base).href; toolbar.append(manuscript);
    const synopses = $('a', 'nt-library-toolbar__button', '✧ Синопсисы'); synopses.href = new URL('synopses.html', base).href; toolbar.append(synopses);
    const anchor = document.querySelector('.reader-tools') || document.querySelector('.tome-hero') || document.querySelector('.hero') || document.querySelector('.page-head');
    if (anchor) anchor.insertAdjacentElement('afterend', toolbar);
    else document.querySelector('main')?.prepend(toolbar);
  }
  if (isChapterPage || isManuscript) {
    const floating = $('button', 'nt-library-quick', '☷');
    floating.type = 'button';
    floating.title = 'Список всех глав';
    floating.setAttribute('aria-label', 'Быстрый переход между главами');
    floating.addEventListener('click', showChapters);
    document.body.append(floating);
  }

  // Скрытый от спойлеров синопсис: закрыт по умолчанию в каждой главе.
  if (isChapterPage) {
    summaries().then(data => {
      const file = location.pathname.split('/').pop();
      const text = typeof data[file] === 'string' ? data[file].trim() : '';
      if (!text) return;
      const details = $('details', 'nt-summary');
      const head = $('summary', 'nt-summary__toggle', '✧ Краткое содержание · раскрыть (спойлеры)');
      const paragraph = $('p', 'nt-summary__text', text);
      details.append(head, paragraph);
      details.addEventListener('toggle', () => { head.textContent = details.open ? '✧ Скрыть краткое содержание' : '✧ Краткое содержание · раскрыть (спойлеры)'; });
      const chapterHead = document.querySelector('.chapter-head');
      if (chapterHead) chapterHead.insertAdjacentElement('afterend', details);
    });
    const pos = new URLSearchParams(location.search).get('ntbookmark');
    if (pos !== null && /^\d{1,5}$/.test(pos) && reader) {
      const block = targets(reader)[Number(pos)];
      if (block) window.addEventListener('load', () => {
        // Даём изображениям и шрифтам стабилизировать высоту текста.
        block.scrollIntoView({ block: 'center', behavior: 'auto' });
        block.classList.add('nt-bookmark-target');
        setTimeout(() => block.classList.remove('nt-bookmark-target'), 3500);
      }, { once: true });
    }
  }

  if (isSynopses) {
    const container = document.querySelector('[data-nt-synopses]');
    if (container) Promise.all([chapters(), summaries()]).then(([list, data]) => {
      container.replaceChildren();
      const note = $('p', 'nt-synopses-note', 'Содержит сюжетные подробности. Все синопсисы скрыты до нажатия.');
      container.append(note);
      for (const ch of list) {
        const file = fileOf(ch.url), text = (data[file] || '').trim();
        const details = $('details', 'nt-synopses-entry');
        const summary = $('summary', '', ch.title + (text ? ' · раскрыть' : ' · синопсис ожидается'));
        const description = $('p', '', text || 'Краткое содержание этой главы пока не добавлено.');
        const link = $('a', 'nt-synopses-entry__link', 'Читать главу ↗'); link.href = pathOf(file);
        details.append(summary, description, link); container.append(details);
      }
    }).catch(() => container.replaceChildren($('p', 'nt-library-empty', 'Не удалось загрузить список глав.')));
  }

  if (isManuscript) {
    const area = document.querySelector('[data-nt-manuscript]');
    const status = document.querySelector('[data-nt-manuscript-status]');
    const jump = document.querySelector('[data-nt-manuscript-jump]');
    if (area) (async () => {
      try {
        const list = await chapters();
        if (status) status.textContent = `Найдено глав: ${list.length}. Собираем рукопись…`;
        // Загружаем последовательно: мобильный браузер не получает 16 больших
        // документов одновременно. Содержание клонируется без исполнения скриптов.
        for (let i = 0; i < list.length; i++) {
          const file = fileOf(list[i].url);
          try {
            const response = await fetch(pathOf(file));
            if (!response.ok) throw new Error('HTTP ' + response.status);
            const parsed = parseChapter(await response.text(), file);
            const section = $('section', 'nt-manuscript-chapter');
            section.id = 'nt-' + file.replace('.html', '');
            section.dataset.source = file;
            section.dataset.title = parsed.title;
            const head = $('div', 'nt-manuscript-heading');
            head.append($('span', 'nt-manuscript-heading__label', `ROOTS / ${i + 1} из ${list.length}`), $('h2', '', parsed.title));
            const origin = $('a', '', 'Открыть отдельную главу ↗'); origin.href = pathOf(file); head.append(origin);
            section.append(head);
            // Извлекаем лишь авторский контейнер текста, не подключая из чужой
            // страницы JS, обработчики комментариев, навигацию или футер.
            for (const node of [...parsed.body.childNodes]) section.append(document.importNode(node, true));
            // Переадресуем относительные пути иллюстраций на исходную главу.
            for (const node of section.querySelectorAll('[src], [href], [poster], [srcset]')) {
              for (const attr of ['src', 'href', 'poster']) {
                const value = node.getAttribute(attr);
                if (value && !/^(?:#|data:|javascript:|mailto:|tel:)/i.test(value)) node.setAttribute(attr, new URL(value, pathOf(file)).href);
              }
              const srcset = node.getAttribute('srcset');
              if (srcset) node.setAttribute('srcset', srcset.split(',').map(part => {
                const pair = part.trim().split(/\s+/, 2);
                return pair[0] ? new URL(pair[0], pathOf(file)).href + (pair[1] ? ' ' + pair[1] : '') : '';
              }).join(', '));
            }
            area.append(section);
            if (jump) {
              const link = $('a', '', parsed.title);
              link.href = '#' + section.id;
              jump.append(link);
            }
          } catch (error) {
            const errorBlock = $('p', 'nt-manuscript-error', `Не удалось загрузить ${file}.`);
            area.append(errorBlock); console.error('[NT manuscript]', error);
          }
          if (status) status.textContent = `Рукопись: загружено ${i + 1} из ${list.length}`;
        }
        if (status) status.textContent = `Рукопись собрана · ${list.length} опубликованных глав`;
        const hash = decodeURIComponent(location.hash.slice(1));
        if (hash) document.getElementById(hash)?.scrollIntoView();
        // Прогресс всей рукописи, без вмешательства в QoL-полосу отдельных глав.
        if (area.querySelector('.nt-manuscript-chapter')) {
          const bar = $('div', 'nt-reading-progress');
          bar.setAttribute('role', 'progressbar'); bar.setAttribute('aria-label', 'Прогресс рукописи');
          bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', '100');
          const fill = $('div', 'nt-reading-progress__fill'); bar.append(fill); document.body.append(bar);
          let frame = 0;
          function update() {
            frame = 0;
            const height = Math.max(1, area.offsetHeight - innerHeight * .5);
            const passed = scrollY - (area.getBoundingClientRect().top + scrollY) + innerHeight * .35;
            const percent = Math.max(0, Math.min(100, Math.round(passed / height * 100)));
            fill.style.width = percent + '%'; bar.setAttribute('aria-valuenow', String(percent));
          }
          addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(update); }, { passive: true });
          addEventListener('resize', update, { passive: true }); update();
        }
      } catch (error) {
        if (status) status.textContent = 'Не удалось собрать рукопись. Проверьте подключение к сайту.';
        console.error('[NT manuscript]', error);
      }
    })();
  }
})();

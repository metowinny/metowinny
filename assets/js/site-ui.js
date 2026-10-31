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

/* Мобильная шапка: освобождаем экран при чтении, возвращаем при движении вверх.
   Не скрываем её, пока открыт поиск, выпадающее меню или фокус в шапке. */
(() => {
  'use strict';
  const header = document.querySelector('.site-header');
  if (!header) return;
  const mobile = window.matchMedia('(max-width: 879px)');
  let previous = window.scrollY;
  let distance = 0;
  let direction = 0;
  let frame = 0;
  const canHide = () => !header.contains(document.activeElement) &&
    !header.querySelector('[data-mobile-nav].is-open') &&
    !header.querySelector('[data-site-search][aria-expanded="true"]');
  function setHidden(hidden) {
    document.body.classList.toggle('nt-mobile-header-hidden', hidden && mobile.matches);
  }
  function update() {
    frame = 0;
    const current = window.scrollY;
    const delta = current - previous;
    previous = current;
    if (!mobile.matches || current < 110 || !canHide()) {
      distance = 0; direction = 0; setHidden(false); return;
    }
    if (Math.abs(delta) < 1) return;
    const nextDirection = Math.sign(delta);
    if (nextDirection !== direction) { direction = nextDirection; distance = 0; }
    distance += Math.abs(delta);
    if (distance >= (direction > 0 ? 26 : 13)) {
      setHidden(direction > 0);
      distance = 0;
    }
  }
  window.addEventListener('scroll', () => {
    if (!frame) frame = window.requestAnimationFrame(update);
  }, { passive: true });
  mobile.addEventListener('change', () => { previous = window.scrollY; setHidden(false); });
  header.addEventListener('focusin', () => setHidden(false));
  header.addEventListener('pointerdown', () => setHidden(false));
  window.addEventListener('pageshow', () => { previous = window.scrollY; setHidden(false); });
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

  // Плавное движение полоски и лёгкие искры у её кончика.
  // Одинаковая механика для обычных глав и для непрерывной рукописи.
  window.NTReadingProgress = (bar, fill, { minDelta = .12 } = {}) => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let last = null;
    let lastSpark = 0;
    const update = (value) => {
      const percent = Math.max(0, Math.min(100, Number(value) || 0));
      const previous = last;
      last = percent;
      fill.style.width = percent.toFixed(2) + '%';
      bar.setAttribute('aria-valuenow', String(Math.round(percent)));
      const now = performance.now();
      if (previous === null || Math.abs(percent - previous) < minDelta ||
          reduceMotion.matches || document.hidden || now - lastSpark < 85 || percent <= .4) return;
      lastSpark = now;
      // Искорки создаются только при реальном изменении прогресса, не по таймеру.
      const edge = fill.getBoundingClientRect().right - bar.getBoundingClientRect().left;
      for (let i = 0; i < 2; i++) {
        const spark = document.createElement('i');
        spark.className = 'nt-progress-spark';
        spark.setAttribute('aria-hidden', 'true');
        spark.style.left = Math.max(0, Math.min(bar.clientWidth, edge)) + 'px';
        spark.style.setProperty('--nt-spark-x', (Math.random() * 16 - 8).toFixed(1) + 'px');
        spark.style.setProperty('--nt-spark-y', (Math.random() * 13 + 5).toFixed(1) + 'px');
        spark.style.setProperty('--nt-spark-size', (Math.random() * 1.7 + 1.3).toFixed(1) + 'px');
        bar.append(spark);
        spark.addEventListener('animationend', () => spark.remove(), { once: true });
      }
    };
    return update;
  };

  // Служебная область сразу за разделителем навигации, перед эпиграфом.
  // Авторскую разметку .reader не трогаем: здесь только интерфейсные вставки.
  function ensureChapterExtras() {
    const nav = document.querySelector('.chapter-top-nav');
    if (!nav) return null;
    let extras = nav.nextElementSibling;
    if (extras?.classList.contains('nt-chapter-extras')) return extras;
    extras = document.createElement('div');
    extras.className = 'nt-chapter-extras';
    nav.classList.add('nt-chapter-top-nav--with-extras');
    nav.insertAdjacentElement('afterend', extras);
    return extras;
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
    const setProgress = window.NTReadingProgress(bar, fill);

    const name = (document.querySelector('.chapter-head__title')?.textContent || document.title)
      .replace(/\s+/g, ' ').trim();
    const current = new URL(location.pathname, location.origin).href;
    const prior = readLast();
    let frame = 0;
    let lastSaved = 0;
    let currentPercent = 0;

    function measure() {
      const top = reader.getBoundingClientRect().top + window.scrollY;
      const bottom = reader.getBoundingClientRect().bottom + window.scrollY;
      const begin = Math.max(0, top - window.innerHeight * .70);
      const finish = Math.max(begin + 1, bottom - window.innerHeight * .30);
      return Math.max(0, Math.min(100, (window.scrollY - begin) / (finish - begin) * 100));
    }
    function persist() {
      if (currentPercent < 3) return;
      storeLast({
        path: location.pathname.slice(root.pathname.length),
        title: name,
        percent: currentPercent,
        y: Math.max(0, Math.round(window.scrollY)),
        updated: Date.now()
      });
      lastSaved = Date.now();
    }
    function update() {
      frame = 0;
      const exactPercent = measure();
      currentPercent = Math.round(exactPercent);
      setProgress(exactPercent);
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
      chip.textContent = '↳ Вернуться к чтению · ' + prior.percent + '%';
      chip.title = 'Вернуться на место, где вы остановились';
      chip.addEventListener('click', () => {
        const max = Math.max(0, document.documentElement.scrollHeight - innerHeight);
        window.scrollTo({ top: Math.min(prior.y, max), behavior: 'auto' });
        chip.remove();
      });
      const extras = ensureChapterExtras();
      if (extras) extras.append(chip);
      else (document.querySelector('.chapter-top-nav') || document.querySelector('.chapter-head'))?.insertAdjacentElement('afterend', chip);
    }
  }

  // Маленькое продолжение чтения в каталоге, только если пользователь сам читал.
  if (!reader && (location.pathname === root.pathname ||
      location.pathname === new URL('index.html', root).pathname ||
      location.pathname === new URL('toma/usmirenie-boli.html', root).pathname)) {
    const last = readLast();
    if (last && last.percent >= 3) {
      const card = document.createElement('a');
      card.className = 'nt-continue-card' + (location.pathname.includes('/toma/') ? ' nt-continue-card--tome' : '');
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
  // Автоматические соседние переходы здесь относятся только к первому тому.
  // Вложенные папки будущих томов нельзя связывать с главами первого тома.
  if (reader && !location.pathname.slice(chapterRoot.pathname.length).includes('/')) {
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


/* Нулевой Трибунал — QoL 2.2.1: каталог, поиск новых глав, закладки,
   синопсисы, рукопись и быстрое оглавление. Авторский HTML глав не изменяет. */
(() => {
  'use strict';
  const script = document.currentScript || document.querySelector('script[src*="site-ui.js"]');
  if (!script) return;
  const base = new URL('../../', script.src);
  const chapterRoot = new URL('glavy/', base);
  const indexURL = new URL('assets/search-index.json', base);
  const summariesURL = new URL('assets/chapter-summaries.json', base);
  const chapterRE = /^glava-([1-9]\d*)-([1-9]\d*)\.html$/;
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
  const advance = (file, maxAct = 5, perAct = 10) => {
    if (file === 'prolog.html') return 'glava-1-1.html';
    const m = file.match(chapterRE);
    if (!m) return null;
    const a = +m[1], b = +m[2];
    return b < perAct ? `glava-${a}-${b + 1}.html` : a < maxAct ? `glava-${a + 1}-1.html` : null;
  };
  const normText = s => (s || '').replace(/\s+/g, ' ').trim();
  const catalogURL = new URL('assets/chapter-catalog.json', base);
  let docsPromise, catalogPromise, summaryPromise;
  // Сохраняем полный путь: в разных томах могут быть одноимённые glava-1-1.html.
  function safeChapterURL(url) {
    try {
      const resolved = new URL(url, base);
      if (resolved.origin !== base.origin || !resolved.pathname.startsWith(chapterRoot.pathname) ||
          !allowed(resolved.pathname.split('/').pop()) || resolved.search || resolved.hash) return null;
      return resolved;
    } catch (_) { return null; }
  }
  const relativeChapterPath = url => safeChapterURL(url)?.pathname.slice(base.pathname.length) || '';
  const volumeIdOf = ch => ch.volume || 'volume-1';
  const actOf = ch => Number(ch.act) || Number(fileOf(ch.url).match(chapterRE)?.[1]) || 1;
  const volumeTitle = v => v.title || v.name || v.id;
  const actTitle = (v, act) => {
    const found = v.acts && (v.acts[String(act)] || v.acts[act]);
    return typeof found === 'string' && found.trim() ? found.trim() : 'Акт ' + act;
  };

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
  // Каталог томов — единственный источник группировки для быстрого оглавления
  // и сборника синопсисов. Новые тома можно регистрировать в JSON, не меняя JS.
  function catalog() {
    if (!catalogPromise) catalogPromise = (async () => {
      const response = await fetch(catalogURL, { cache: 'no-cache' });
      if (!response.ok) throw new Error('Не найден каталог глав');
      const data = await response.json();
      if (!Array.isArray(data.chapters)) throw new Error('Неверный каталог');
      const volumes = Array.isArray(data.volumes) && data.volumes.length ? data.volumes
        .filter(v => v && typeof v.id === 'string' && v.id.trim())
        : [{ id: 'volume-1', title: 'Том I. Усмирение Боли', url: 'toma/usmirenie-boli.html',
            acts: { '1': 'Акт I. Валтасаров пир', '2': 'Акт II. И воспылают горизонты' } }];
      const validVolumes = new Set(volumes.map(v => v.id));
      const list = data.chapters.filter(item => item && typeof item.url === 'string' && safeChapterURL(item.url))
        .map(item => ({ ...item, url: relativeChapterPath(item.url), volume: volumeIdOf(item), type: 'Глава' }))
        .filter(ch => validVolumes.has(ch.volume));
      const known = new Set(list.map(ch => ch.url));

      // На GitHub Pages нет API для просмотра директории. Для каждого тома с
      // discovery проверяем последовательно имена файлов в заданной папке.
      // Никаких догадок о расположении ещё не созданного II тома не делаем.
      for (const volume of volumes) {
        const discovery = volume.discovery;
        if (!discovery || discovery.enabled !== true) continue;
        const dir = typeof discovery.directory === 'string' ? discovery.directory : 'glavy/';
        const dirURL = safeChapterURL(dir + 'prolog.html');
        if (!dirURL) continue;
        const perAct = Number(discovery.chaptersPerAct) || 10;
        const maxAct = Number(discovery.acts) || 5;
        if (!Number.isInteger(perAct) || perAct < 1 || perAct > 99 ||
            !Number.isInteger(maxAct) || maxAct < 1 || maxAct > 99) continue;
        const own = list.filter(ch => ch.volume === volume.id && ch.url.startsWith(dir));
        const latest = own.sort((a, b) => order(fileOf(b.url)) - order(fileOf(a.url)))[0];
        if (!latest) continue;
        let next = advance(fileOf(latest.url), maxAct, perAct);
        let checked = 0;
        while (next && checked++ < 500) {
          const match = next.match(chapterRE);
          if (match && (+match[1] > maxAct || +match[2] > perAct)) break;
          const path = dir + next;
          if (known.has(path)) { next = advance(next, maxAct, perAct); continue; }
          const url = safeChapterURL(path);
          if (!url) break;
          let found = false;
          try {
            const head = await fetch(url, { method: 'HEAD', cache: 'no-store' });
            found = head.ok && head.status === 200;
          } catch (_) { /* offline */ }
          if (!found) break;
          try {
            const result = await fetch(url, { cache: 'no-store' });
            if (!result.ok) break;
            const parsed = parseChapter(await result.text(), next);
            list.push({ url: path, title: parsed.title, type: 'Глава', volume: volume.id,
              act: Number(next.match(chapterRE)?.[1]) || 1 });
            known.add(path);
          } catch (error) { console.warn('[NT catalog]', error); break; }
          next = advance(next, maxAct, perAct);
        }
      }
      const volumeOrder = new Map(volumes.map((v, i) => [v.id, i]));
      list.sort((a, b) => (volumeOrder.get(a.volume) ?? Infinity) - (volumeOrder.get(b.volume) ?? Infinity) ||
        order(fileOf(a.url)) - order(fileOf(b.url)));
      return { chapters: list, volumes };
    })().catch(error => { catalogPromise = null; throw error; });
    return catalogPromise;
  }
  const chapters = async () => (await catalog()).chapters;
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
      return Array.isArray(data) ? data.filter(b => b && (safeChapterURL(b.path || ('glavy/' + b.file))) && Number.isInteger(b.block) && b.block >= 0).slice(0, 150) : [];
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
  // Можно указать конкретный абзац щелчком или касанием. Без выбора
  // сохраняется абзац возле верхней трети экрана (доступный запасной путь).
  function currentPoint(chosenNode = null) {
    if (!reader) return null;
    let scope = reader;
    let file = location.pathname.split('/').pop();
    if (isManuscript) {
      const sections = [...reader.querySelectorAll('.nt-manuscript-chapter')];
      scope = chosenNode?.closest('.nt-manuscript-chapter') ||
        sections.filter(section => section.getBoundingClientRect().top <= innerHeight * .38).pop() || sections[0];
      if (!scope) return null;
      file = scope.dataset.source;
    }
    const nodes = targets(scope);
    if (!nodes.length || !allowed(file)) return null;
    let best = -1;
    if (chosenNode) {
      // От вложенных элементов (в том числе подсветок комментариев) идём к абзацу.
      const target = chosenNode.closest('p, blockquote, h2, h3, h4, li');
      if (target && scope.contains(target)) best = nodes.indexOf(target);
    }
    if (best < 0) {
      let score = Infinity;
      nodes.forEach((node, idx) => {
        const r = node.getBoundingClientRect();
        const distance = r.bottom < 70 ? 1e5 + 70 - r.bottom : Math.abs(r.top - innerHeight * .33);
        if (distance < score) { best = idx; score = distance; }
      });
    }
    const node = nodes[best];
    if (!node) return null;
    const title = isManuscript ? scope.dataset.title : normText(document.querySelector('.chapter-head__title')?.textContent);
    return { file, path: isManuscript ? scope.dataset.path : location.pathname.slice(base.pathname.length),
      title: title || chapterTitle(file), block: best, excerpt: normText(node.textContent).slice(0, 100), updated: Date.now() };
  }
  function addBookmark(chosenNode = null, selectedQuote = '', charOffset = null) {
    const point = currentPoint(chosenNode);
    if (!point) { announce('Не удалось определить место в главе.'); return false; }
    // Храним цитату и точное смещение только локально. В Supabase не отправляем.
    const quote = normText(selectedQuote).slice(0, 280);
    if (quote) { point.quote = quote; point.excerpt = quote.slice(0, 115); }
    if (Number.isInteger(charOffset) && charOffset >= 0) point.offset = charOffset;
    // Разные цитаты в одном большом абзаце можно сохранить независимо.
    const items = bookmarks().filter(b => !((b.path || ('glavy/' + b.file)) === point.path &&
      b.block === point.block && (quote ? b.quote === quote : !b.quote)));
    items.unshift({ ...point, id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 7) });
    if (saveBookmarks(items.slice(0, 150))) { announce('✦ Закладка сохранена'); return true; }
    announce('Не удалось сохранить: браузер запрещает локальное хранение.');
    return false;
  }
  // Сайт комментариев передаёт сюда выбранный Range, не обращаясь к базе.
  // Никаких обёрток вокруг выделения: авторские DOM-узлы остаются нетронутыми.
  window.NTBookmarks = Object.freeze({
    saveRange(range) {
      if (!reader || !range || !reader.contains(range.commonAncestorContainer)) return false;
      const anchor = range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement;
      if (!anchor || !reader.contains(anchor)) return false;
      const paragraph = anchor.closest('p, blockquote, h2, h3, h4, li');
      let offset = null;
      if (paragraph && paragraph.contains(range.startContainer)) {
        try {
          const before = document.createRange();
          before.selectNodeContents(paragraph);
          before.setEnd(range.startContainer, range.startOffset);
          offset = before.toString().length;
        } catch (_) { /* остаётся закладка на абзаце */ }
      }
      return addBookmark(anchor, range.toString(), offset);
    },
    saveNode(node) {
      if (!reader || !(node instanceof Element) || !reader.contains(node)) return false;
      return addBookmark(node, normText(node.textContent));
    },
    saveVisible() { return addBookmark(); }
  });
  let bookmarkPicking = false;
  let bookmarkButton = null;
  let bookmarkTip = null;
  function endBookmarkPicking() {
    bookmarkPicking = false;
    reader?.classList.remove('nt-bookmark-picking');
    bookmarkButton?.classList.remove('is-active');
    bookmarkButton?.setAttribute('aria-pressed', 'false');
    bookmarkTip?.remove();
    bookmarkTip = null;
  }
  function beginBookmarkSelection() {
    if (!reader) return announce('Закладка доступна при чтении главы.');
    if (bookmarkPicking) return endBookmarkPicking();
    bookmarkPicking = true;
    reader.classList.add('nt-bookmark-picking');
    bookmarkButton?.classList.add('is-active');
    bookmarkButton?.setAttribute('aria-pressed', 'true');
    bookmarkTip = $('div', 'nt-bookmark-picker');
    const message = $('span', 'nt-bookmark-picker__text', '✦ Нажмите на абзац, который хотите сохранить');
    const visible = $('button', 'nt-bookmark-picker__action', 'Текущее место');
    visible.type = 'button';
    visible.addEventListener('click', () => { addBookmark(); endBookmarkPicking(); });
    const cancel = $('button', 'nt-bookmark-picker__cancel', 'Отмена ×');
    cancel.type = 'button';
    cancel.addEventListener('click', endBookmarkPicking);
    bookmarkTip.append(message, visible, cancel);
    document.body.append(bookmarkTip);
  }
  if (reader) {
    // В режиме выбора перехватываем только один клик. В остальное время
    // все реакции, комментарии, ссылки и выделение текста работают как раньше.
    reader.addEventListener('click', event => {
      if (!bookmarkPicking) return;
      const target = event.target instanceof Element ? event.target.closest('p, blockquote, h2, h3, h4, li') : null;
      if (!target || !reader.contains(target) || target.closest('.nt-manuscript-heading')) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      addBookmark(target);
      endBookmarkPicking();
    }, true);
    document.addEventListener('keydown', event => {
      if (bookmarkPicking && event.key === 'Escape') endBookmarkPicking();
    });
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
    const url = safeChapterURL(b.path || ('glavy/' + b.file)) || new URL(pathOf(b.file));
    url.searchParams.set('ntbookmark', String(b.block));
    if (b.quote && b.id) url.searchParams.set('ntmark', b.id);
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
      const { chapters: list, volumes } = await catalog();
      if (!modal.open) return;
      modalBody.replaceChildren();
      if (!list.length) { modalBody.append($('p', 'nt-library-empty', 'Пока нет опубликованных глав.')); return; }
      const current = location.pathname;
      for (const volume of volumes) {
        const own = list.filter(ch => ch.volume === volume.id);
        if (!own.length) continue;
        const group = $('section', 'nt-library-volume');
        const volumeHead = $('h3', 'nt-library-volume__title', volumeTitle(volume));
        group.append(volumeHead);
        let lastAct = null;
        for (const ch of own) {
          const act = actOf(ch);
          if (act !== lastAct) {
            group.append($('h4', 'nt-library-act', actTitle(volume, act)));
            lastAct = act;
          }
          const link = $('a', 'nt-library-chapter', ch.title);
          link.href = safeChapterURL(ch.url).href;
          if (new URL(link.href).pathname === current) {
            link.classList.add('is-current'); link.setAttribute('aria-current', 'page');
          }
          group.append(link);
        }
        modalBody.append(group);
      }
      const links = $('div', 'nt-library-modal__links');
      for (const [label, url] of [['Рукопись', 'manuscript.html'], ['Синопсисы', 'synopses.html']]) {
        const a = $('a', '', label + ' ↗'); a.href = new URL(url, base).href; links.append(a);
      }
      for (const volume of volumes) {
        if (!volume.url) continue;
        const a = $('a', '', volumeTitle(volume) + ' ↗');
        a.href = new URL(volume.url, base).href;
        links.append(a);
      }
      modalBody.append(links);
    } catch (error) {
      console.warn('[NT library] Не удалось открыть оглавление', error);
      modalBody.replaceChildren($('p', 'nt-library-empty', 'Не удалось загрузить каталог. Проверьте подключение.'));
    }
  }
  function showBookmarks() {
    openModal('☆ Мои закладки');
    function render() {
      modalBody.replaceChildren();
      const items = bookmarks();
      if (!items.length) {
        modalBody.append($('p', 'nt-library-empty', 'Пока пусто. В главе выделите интересующий текст и нажмите «Закладка» в панели реакций.'));
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

  // Единая навигация в шапке. Не редактируем HTML страниц и глав:
  // ссылки и SVG добавляются общим скриптом после загрузки DOM.
  // Кнопки взаимодействуют с прежними диалогами, ничего не дублируется.
  function mountHeaderActions() {
    const row = document.querySelector('.site-header__row');
    const primary = row?.querySelector('.header-nav');
    if (!row || !primary || row.querySelector('.nt-header-actions')) return;

    // Логотип уже ведёт на главную, второй ссылки в шапке не нужно.
    for (const link of primary.querySelectorAll('a')) {
      if (!link.classList.contains('nav-wiki')) link.remove();
    }
    for (const link of document.querySelectorAll('.mobile-nav__pages a')) {
      if (new URL(link.href, base).pathname === new URL('index.html', base).pathname ||
          new URL(link.href, base).pathname === base.pathname) link.remove();
    }

    const icons = {
      volumes: '<rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/><path d="M5 7h3M16 7h3M5 17h3M16 17h3"/>',
      glossary: '<path d="M12 7v14M3 18V5a2 2 0 0 1 2-2h3a4 4 0 0 1 4 4 4 4 0 0 1 4-4h3a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2h-3a4 4 0 0 0-4 4 4 4 0 0 0-4-4H5a2 2 0 0 0-2 2Z"/>',
      chapters: '<path d="M9 6h12M9 12h12M9 18h12"/><path d="m3 6 1.5 1.5L7 4.5M3 12h3M3 18h3"/>',
      bookmarks: '<path d="M6 3.5A1.5 1.5 0 0 1 7.5 2h9A1.5 1.5 0 0 1 18 3.5V22l-6-4-6 4Z"/>',
      manuscript: '<path d="M8 21h11a2 2 0 0 0 2-2V5a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v12a4 4 0 0 0 4 4Z"/><path d="M8 21a4 4 0 0 1 0-8h13M9 7h8M9 10h5"/>',
      synopses: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>'
    };
    const actions = $('nav', 'nt-header-actions');
    actions.setAttribute('aria-label', 'Навигация по библиотеке');
    const addIcon = (name, title, url, callback) => {
      const control = $(url ? 'a' : 'button', 'nt-header-actions__item');
      if (url) control.href = new URL(url, base).href;
      else control.type = 'button';
      if (callback) control.addEventListener('click', callback);
      control.title = title;
      control.setAttribute('aria-label', title);
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '1.7');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      svg.setAttribute('aria-hidden', 'true');
      svg.innerHTML = icons[name];
      control.append(svg);
      if (url && location.pathname === new URL(url, base).pathname) {
        control.setAttribute('aria-current', 'page');
      }
      actions.append(control);
      return control;
    };
    addIcon('volumes', 'Тома', 'toma/index.html');
    addIcon('glossary', 'Глоссарий', 'glossary.html');
    addIcon('chapters', 'Все главы', null, showChapters);
    addIcon('bookmarks', 'Закладки', null, showBookmarks);
    addIcon('manuscript', 'Рукопись', 'manuscript.html');
    addIcon('synopses', 'Синопсисы', 'synopses.html');
    row.insertBefore(actions, primary);
  }
  mountHeaderActions();

  // Скрытый от спойлеров синопсис: закрыт по умолчанию в каждой главе.
  if (isChapterPage) {
    summaries().then(data => {
      const file = location.pathname.split('/').pop();
      const key = location.pathname.slice(base.pathname.length);
      const raw = data[key] ?? (key === 'glavy/' + file ? data[file] : undefined);
      const text = typeof raw === 'string' ? raw.trim() : '';
      if (!text) return;
      const details = $('details', 'nt-summary');
      const head = $('summary', 'nt-summary__toggle', '✧ Краткое содержание · раскрыть (спойлеры)');
      const paragraph = $('p', 'nt-summary__text', text);
      details.append(head, paragraph);
      details.addEventListener('toggle', () => { head.textContent = details.open ? '✧ Скрыть краткое содержание' : '✧ Краткое содержание · раскрыть (спойлеры)'; });
      // Синопсис живёт после разделителя навигации, рядом с продолжением чтения.
      // HTML эпиграфа и текста главы не перемещаем и не изменяем.
      const nav = document.querySelector('.chapter-top-nav');
      if (!nav) return;
      let extras = nav.nextElementSibling;
      if (!extras?.classList.contains('nt-chapter-extras')) {
        extras = $('div', 'nt-chapter-extras');
        nav.classList.add('nt-chapter-top-nav--with-extras');
        nav.insertAdjacentElement('afterend', extras);
        // На случай порядка загрузки: перемещаем только нашу UI-кнопку.
        const resume = document.querySelector('.nt-resume-chip');
        if (resume) extras.append(resume);
      }
      // Сначала синопсис (по умолчанию закрытый), после него «Вернуться к чтению».
      extras.insertBefore(details, extras.querySelector('.nt-resume-chip'));
    });
    const pos = new URLSearchParams(location.search).get('ntbookmark');
    if (pos !== null && /^\d{1,5}$/.test(pos) && reader) {
      const block = targets(reader)[Number(pos)];
      if (block) window.addEventListener('load', () => {
        // По возможности возвращаем к точному выделению, даже если внутри
        // абзаца есть вложенные span и авторские эффекты.
        const markerId = new URLSearchParams(location.search).get('ntmark');
        const saved = markerId ? bookmarks().find(b => b.id === markerId && b.block === Number(pos) &&
          (b.path || ('glavy/' + b.file)) === location.pathname.slice(base.pathname.length)) : null;
        let anchored = false;
        if (saved && Number.isInteger(saved.offset) && saved.offset >= 0) {
          const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
          let left = saved.offset, node;
          while ((node = walker.nextNode())) {
            if (left > node.length) { left -= node.length; continue; }
            const range = document.createRange();
            range.setStart(node, left);
            range.collapse(true);
            const rect = range.getBoundingClientRect();
            if (rect.height > 0) {
              window.scrollTo({ top: Math.max(0, scrollY + rect.top - innerHeight * .36), behavior: 'auto' });
              anchored = true;
            }
            break;
          }
        }
        if (!anchored) block.scrollIntoView({ block: 'center', behavior: 'auto' });
        block.classList.add('nt-bookmark-target');
        setTimeout(() => block.classList.remove('nt-bookmark-target'), 3500);
      }, { once: true });
    }
  }

  if (isSynopses) {
    const container = document.querySelector('[data-nt-synopses]');
    if (container) Promise.all([catalog(), summaries()]).then(([{ chapters: list, volumes }, data]) => {
      container.replaceChildren();
      container.append($('p', 'nt-synopses-note', 'Внимание: ниже открыто изложены события опубликованных глав, включая сюжетные повороты.'));
      for (const volume of volumes) {
        const own = list.filter(ch => ch.volume === volume.id);
        if (!own.length) continue;
        const group = $('section', 'nt-synopses-volume');
        group.append($('h2', 'nt-synopses-volume__title', volumeTitle(volume)));
        let lastAct = null;
        for (const ch of own) {
          const act = actOf(ch);
          if (act !== lastAct) {
            group.append($('h3', 'nt-synopses-act', actTitle(volume, act)));
            lastAct = act;
          }
          const file = fileOf(ch.url);
          const raw = data[ch.url] ?? (ch.url === 'glavy/' + file ? data[file] : undefined);
          const text = typeof raw === 'string' ? raw.trim() : '';
          const article = $('article', 'nt-synopses-entry');
          article.append($('h4', 'nt-synopses-entry__title', ch.title));
          article.append($('p', 'nt-synopses-entry__text', text || 'Краткое содержание этой главы пока не добавлено.'));
          const link = $('a', 'nt-synopses-entry__link', 'Читать главу ↗');
          link.href = safeChapterURL(ch.url).href;
          article.append(link);
          group.append(article);
        }
        container.append(group);
      }
    }).catch(error => {
      console.warn('[NT synopses]', error);
      container.replaceChildren($('p', 'nt-library-empty', 'Не удалось загрузить список глав.'));
    });
  }

  if (isManuscript) {
    const area = document.querySelector('[data-nt-manuscript]');
    const status = document.querySelector('[data-nt-manuscript-status]');
    const jump = document.querySelector('[data-nt-manuscript-jump]');
    // Закладки в рукописи работают независимо от комментариев и Supabase.
    // Выделение текста показывает компактную панель, точный Range остаётся
    // неизменённым до нажатия «В закладки».
    if (area) {
      const toolbar = $('div', 'nt-manuscript-selection');
      toolbar.setAttribute('role', 'toolbar');
      toolbar.setAttribute('aria-label', 'Действия с выделенным фрагментом');
      const save = $('button', 'nt-manuscript-selection__save', '🔖 В закладки');
      save.type = 'button';
      save.title = 'Сохранить выделенный текст в закладках';
      toolbar.append(save);
      document.body.append(toolbar);
      let selected = null;
      let selectionFrame = 0;
      function hideSelection() { toolbar.classList.remove('is-visible'); selected = null; }
      function refreshSelection() {
        selectionFrame = 0;
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !selection.rangeCount || !selection.toString().trim()) {
          hideSelection(); return;
        }
        const range = selection.getRangeAt(0);
        if (!area.contains(range.commonAncestorContainer)) { hideSelection(); return; }
        selected = range.cloneRange();
        if (window.matchMedia('(max-width: 650px)').matches) {
          toolbar.style.left = ''; toolbar.style.top = '';
        } else {
          const rects = range.getClientRects();
          const rect = rects.length ? rects[rects.length - 1] : range.getBoundingClientRect();
          toolbar.style.left = Math.max(80, Math.min(innerWidth - 80, rect.left + rect.width / 2)) + 'px';
          toolbar.style.top = Math.max(58, rect.top - 12) + 'px';
        }
        toolbar.classList.add('is-visible');
      }
      function scheduleSelection() {
        if (!selectionFrame) selectionFrame = requestAnimationFrame(refreshSelection);
      }
      // Не даём браузеру снять выделение раньше, чем сохраним Range.
      save.addEventListener('pointerdown', event => event.preventDefault());
      save.addEventListener('click', () => {
        if (selected && window.NTBookmarks?.saveRange(selected)) {
          window.getSelection()?.removeAllRanges();
          hideSelection();
        }
      });
      document.addEventListener('selectionchange', scheduleSelection);
      area.addEventListener('pointerup', scheduleSelection);
      area.addEventListener('keyup', scheduleSelection);
      document.addEventListener('keydown', event => { if (event.key === 'Escape') hideSelection(); });
      const saveHere = document.querySelector('[data-nt-manuscript-bookmark]');
      saveHere?.addEventListener('click', () => {
        const selection = window.getSelection();
        if (selected && selection && !selection.isCollapsed) {
          window.NTBookmarks?.saveRange(selected);
          selection.removeAllRanges();
          hideSelection();
        } else window.NTBookmarks?.saveVisible();
      });
    }
    if (area) (async () => {
      try {
        const list = await chapters();
        if (status) status.textContent = `Найдено глав: ${list.length}. Собираем рукопись…`;
        // Загружаем последовательно: мобильный браузер не получает 16 больших
        // документов одновременно. Содержание клонируется без исполнения скриптов.
        for (let i = 0; i < list.length; i++) {
          const ch = list[i];
          const file = fileOf(ch.url);
          try {
            const response = await fetch(safeChapterURL(ch.url));
            if (!response.ok) throw new Error('HTTP ' + response.status);
            const parsed = parseChapter(await response.text(), file);
            const section = $('section', 'nt-manuscript-chapter');
            section.id = 'nt-' + ch.url.replace(/[^a-z0-9-]/gi, '-');
            section.dataset.source = file;
            section.dataset.path = ch.url;
            section.dataset.title = parsed.title;
            const head = $('div', 'nt-manuscript-heading');
            head.append($('span', 'nt-manuscript-heading__label', `ROOTS / ${i + 1} из ${list.length}`), $('h2', '', parsed.title));
            const origin = $('a', '', 'Открыть отдельную главу ↗'); origin.href = safeChapterURL(ch.url).href; head.append(origin);
            section.append(head);
            // Извлекаем лишь авторский контейнер текста, не подключая из чужой
            // страницы JS, обработчики комментариев, навигацию или футер.
            for (const node of [...parsed.body.childNodes]) section.append(document.importNode(node, true));
            // Переадресуем относительные пути иллюстраций на исходную главу.
            for (const node of section.querySelectorAll('[src], [href], [poster], [srcset]')) {
              for (const attr of ['src', 'href', 'poster']) {
                const value = node.getAttribute(attr);
                if (value && !/^(?:#|data:|javascript:|mailto:|tel:)/i.test(value)) node.setAttribute(attr, new URL(value, safeChapterURL(ch.url)).href);
              }
              const srcset = node.getAttribute('srcset');
              if (srcset) node.setAttribute('srcset', srcset.split(',').map(part => {
                const pair = part.trim().split(/\s+/, 2);
                return pair[0] ? new URL(pair[0], safeChapterURL(ch.url)).href + (pair[1] ? ' ' + pair[1] : '') : '';
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
          const setProgress = window.NTReadingProgress ? window.NTReadingProgress(bar, fill, { minDelta: .008 }) : (percent) => { fill.style.width = percent + '%'; };
          let frame = 0;
          function update() {
            frame = 0;
            const height = Math.max(1, area.offsetHeight - innerHeight * .5);
            const passed = scrollY - (area.getBoundingClientRect().top + scrollY) + innerHeight * .35;
            const percent = Math.max(0, Math.min(100, passed / height * 100));
            setProgress(percent);
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

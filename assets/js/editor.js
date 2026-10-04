document.addEventListener('DOMContentLoaded', () => {

  const STORAGE_KEY = 'nt-chapter-editor-v1';
  const DIVIDER_TEXT = '✦ ✧ ✦';
  const SAMPLE_TEXT = 'Пример текста';

  const input = document.querySelector('[data-editor-input]');
  const visual = document.querySelector('[data-editor-visual]');
  const visualPane = document.querySelector('[data-editor-pane="visual"]');
  const output = document.querySelector('[data-editor-output]');
  const stage = document.querySelector('[data-editor-stage]');
  const wordCount = document.querySelector('[data-editor-wordcount]');
  const savedLabel = document.querySelector('[data-editor-saved]');
  const toast = document.querySelector('[data-editor-toast]');
  const viewButtons = [...document.querySelectorAll('[data-editor-view]')];
  const undoButtons = [...document.querySelectorAll('[data-editor-undo]')];
  const redoButtons = [...document.querySelectorAll('[data-editor-redo]')];

  const G_BASIC = 'Начертание и цвет';
  const G_VOICE = 'Голоса и речь';
  const G_HAND = 'Почерки';
  const G_ENTITY = 'Существа';
  const G_SHAKE = 'Дрожание';
  const G_FADE = 'Затухание восприятия';
  const G_BLACKOUT = 'Потеря сознания (блок)';
  const G_BLOCK = 'Блоки и абзацы';

  const styles = [];

  const inline = (group, name, icon, description, cls) => styles.push({
    group, name, icon, description, kind: 'inline',
    open: `<span class="${cls}">`, close: '</span>'
  });

  const wrap = (group, name, icon, description, tag, cls) => styles.push({
    group, name, icon, description, kind: 'wrap',
    open: `<${tag} class="${cls}">`, close: `</${tag}>`
  });

  const paragraphClass = (group, name, icon, description, cls) => styles.push({
    group, name, icon, description, kind: 'class', cls
  });

  styles.push({ group: G_BASIC, name: 'Курсив', icon: '𝑖', description: 'Обычный курсив.', kind: 'inline', open: '<em>', close: '</em>' });
  styles.push({ group: G_BASIC, name: 'Жирный', icon: 'B', description: 'Выделение важной фразы.', kind: 'inline', open: '<strong>', close: '</strong>' });
  inline(G_BASIC, 'Фиолетовый', '✦', 'Фиолетовый акцент.', 'fx-violet');
  inline(G_BASIC, 'Розовый', '◆', 'Розовый акцент.', 'fx-pink');
  inline(G_BASIC, 'Золотой', '✧', 'Золотой акцент.', 'fx-gold');
  inline(G_BASIC, 'Маленький текст', 'ᵃ', 'Уменьшенный размер.', 'fx-small');
  inline(G_BASIC, 'Большой текст', 'A', 'Увеличенный размер.', 'fx-large');
  inline(G_BASIC, 'Крик', '‼', 'Прописные буквы, белый цвет.', 'fx-shout');

  inline(G_VOICE, 'Система', '⌁', 'Системные реплики.', 'fx-system');
  inline(G_VOICE, 'Шёпот', '◌', 'Приглушённый текст.', 'fx-whisper');
  inline(G_VOICE, 'Эхо', '◈', 'Хроматическая аберрация.', 'fx-echo');
  inline(G_VOICE, 'Цензура', '▒', 'Зубчатая «помеха» поверх слова.', 'fx-censor');
  inline(G_VOICE, 'Цензура: мелкая', '▒', 'Размер 0.8.', 'fx-censor fx-censor--s');
  inline(G_VOICE, 'Цензура: крупная', '▒', 'Размер 1.5.', 'fx-censor fx-censor--l');
  inline(G_VOICE, 'Цензура: очень крупная', '▒', 'Размер 2.2.', 'fx-censor fx-censor--xl');
  inline(G_VOICE, 'Цензура: огромная', '▒', 'Размер 3.2.', 'fx-censor fx-censor--xxl');
  inline(G_VOICE, 'Цензура: спокойная', '▒', 'Медленное мерцание.', 'fx-censor fx-censor--calm');
  inline(G_VOICE, 'Цензура: неистовая', '▒', 'Очень быстрое мерцание.', 'fx-censor fx-censor--frantic');

  inline(G_HAND, 'Почерк 1', '✎', 'Neucha.', 'fx-hand-1');
  inline(G_HAND, 'Почерк 2', '✎', 'Marck Script, сиреневый.', 'fx-hand-2');
  inline(G_HAND, 'Почерк 3', '✎', 'Kalam.', 'fx-hand-3');
  inline(G_HAND, 'Почерк 4', '✎', 'Comforter.', 'fx-hand-4');

  inline(G_ENTITY, 'Грёзы', '◍', 'Нежный приглушённый голубой.', 'entity-speech entity-dream');
  inline(G_ENTITY, 'Апостол Силы', '◍', 'Яркий мятный.', 'entity-speech entity-power');
  inline(G_ENTITY, 'Апостол Желания', '◍', 'Яркий красный.', 'entity-speech entity-desire');
  inline(G_ENTITY, 'Апостол Надежды', '◍', 'Яркий розовый.', 'entity-speech entity-hope');
  inline(G_ENTITY, 'Архэ Небытия', '◍', 'Чёрный текст и белое сияние.', 'entity-speech entity-void');

  inline(G_SHAKE, 'Медленное покачивание', '〰', 'Плавное покачивание.', 'shake-slow');
  inline(G_SHAKE, 'Среднее дрожание', '≈', 'Более заметное движение.', 'shake-medium');
  inline(G_SHAKE, 'Быстрое дрожание', '⁙', 'Быстрая нервная дрожь.', 'shake-fast');

  inline(G_FADE, 'Затухание', '◒', 'Текст становится труднее читать.', 'fading-text');
  inline(G_FADE, 'Сильное затухание', '◑', 'Заметное размытие.', 'fading-text fading-text--blur');
  inline(G_FADE, 'Глубокое затухание', '◐', 'Текст почти теряется.', 'fading-text fading-text--deep');
  inline(G_FADE, 'Почти исчезновение', '○', 'Едва различимый текст.', 'fading-text fading-text--vanish');
  inline(G_FADE, 'Дышащее затухание', '◌', 'Размытие усиливается и ослабевает.', 'fading-text fading-text--breathing');

  wrap(G_BLACKOUT, 'Затемнение сверху', '▀', 'Край зрения темнеет сверху.', 'div', 'consciousness-fade consciousness-fade--top');
  wrap(G_BLACKOUT, 'Затемнение снизу', '▄', 'Край зрения темнеет снизу.', 'div', 'consciousness-fade consciousness-fade--bottom');
  wrap(G_BLACKOUT, 'Затемнение с двух сторон', '█', 'Тьма сверху и снизу.', 'div', 'consciousness-fade consciousness-fade--both');
  wrap(G_BLACKOUT, 'Сильная потеря восприятия', '▓', 'Тьма с двух сторон и размытый текст.', 'div', 'consciousness-fade consciousness-fade--both consciousness-fade--heavy');
  wrap(G_BLACKOUT, 'Плывущее восприятие', '≋', 'Лёгкая пульсация размытия.', 'div', 'consciousness-fade consciousness-fade--unstable');
  wrap(G_BLACKOUT, 'Угасание', '◗', 'Блок медленно гаснет и возвращается.', 'div', 'consciousness-fade consciousness-fade--collapse');

  styles.push({ group: G_BLOCK, name: 'Разделитель', icon: '✦', description: 'Декоративная строка после текущего абзаца.', kind: 'divider' });
  wrap(G_BLOCK, 'Эпиграф', '❝', 'Блок эпиграфа вокруг выделенных абзацев.', 'blockquote', 'epigraph');
  wrap(G_BLOCK, 'Консоль', '▣', 'Экран компьютерной системы.', 'div', 'console-block');
  wrap(G_BLOCK, 'Письмо', '✉', 'Оформленный блок письма.', 'div', 'letter');
  paragraphClass(G_BLOCK, 'Подпись письма', '✍', 'Абзац справа курсивом, внутри письма.', 'sign');
  paragraphClass(G_BLOCK, 'Стих / песня', '♪', 'Качающаяся строка справа с частицами.', 'verse-epigraph');
  paragraphClass(G_BLOCK, 'Без отступа', '⇤', 'Убирает красную строку у абзаца.', 'no-indent');
  styles.push({ group: G_BLOCK, name: 'Сноска', icon: '*', description: 'Выделенный текст или звёздочка с подсказкой.', kind: 'footnote' });

  const BLOCK_TAGS = new Set([
    'p', 'div', 'blockquote', 'figure', 'section', 'article', 'hr', 'cite',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'pre', 'table'
  ]);
  const CONTAINER_CLASSES = ['console-block', 'letter', 'consciousness-fade'];

  const debounce = (fn, ms) => {
    let timer;
    const wrapped = (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
    wrapped.cancel = () => clearTimeout(timer);
    return wrapped;
  };

  let source = '';
  let currentView = 'split';
  let activeSurface = 'code';
  let visualDirty = false;

  const historyState = { stack: [], index: -1, timer: null };


  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('is-visible'), 1800);
  }

  function wordForm(n) {
    const a = Math.abs(n) % 100;
    const b = a % 10;
    if (a >= 11 && a <= 19) return 'слов';
    if (b === 1) return 'слово';
    if (b >= 2 && b <= 4) return 'слова';
    return 'слов';
  }


  function unwrap(el) {
    el.replaceWith(...el.childNodes);
  }

  function rename(el, tag) {
    const next = el.ownerDocument.createElement(tag);
    [...el.attributes].forEach(a => next.setAttribute(a.name, a.value));
    next.append(...el.childNodes);
    el.replaceWith(next);
    return next;
  }

  function isContainer(el) {
    const tag = el.tagName.toLowerCase();
    if (tag === 'blockquote') return true;
    if (tag === 'div') return CONTAINER_CLASSES.some(c => el.classList.contains(c));
    return false;
  }

  function walkText(root, fn) {
    const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const list = [];
    while (walker.nextNode()) list.push(walker.currentNode);
    list.forEach(fn);
  }

  function sanitize(root, fromVisual) {
    if (fromVisual) {
      root.querySelectorAll('*').forEach(el => {
        ['style', 'contenteditable', 'spellcheck'].forEach(a => el.removeAttribute(a));
        [...el.attributes].forEach(a => {
          if (a.name.startsWith('data-')) el.removeAttribute(a.name);
        });
      });
      root.querySelectorAll('b').forEach(el => rename(el, 'strong'));
      root.querySelectorAll('i').forEach(el => rename(el, 'em'));
      root.querySelectorAll('font').forEach(unwrap);
    }

    root.querySelectorAll('span').forEach(el => {
      if (!el.attributes.length) unwrap(el);
    });

    root.querySelectorAll('div').forEach(el => {
      if (el.attributes.length || isContainer(el)) return;
      if (el.querySelector('p, div, blockquote')) unwrap(el);
      else rename(el, 'p');
    });
  }

  function trimEdges(p) {
    while (p.lastChild && p.lastChild.nodeName === 'BR' && p.childNodes.length > 1) {
      p.lastChild.remove();
    }
    const first = p.firstChild;
    if (first && first.nodeType === 3) first.data = first.data.replace(/^\s+/, '');
    const last = p.lastChild;
    if (last && last.nodeType === 3) last.data = last.data.replace(/\s+$/, '');
  }

  function isEmptyParagraph(el) {
    return el.tagName === 'P' && !el.textContent.trim() && !el.querySelector('img, hr');
  }

  function blockify(parent) {
    const doc = parent.ownerDocument;
    const out = [];
    let buffer = [];

    const flush = () => {
      const meaningful = buffer.some(n => n.nodeType === 1 ? n.tagName !== 'BR' : n.data.trim());
      if (meaningful) {
        const p = doc.createElement('p');
        p.append(...buffer);
        trimEdges(p);
        out.push(p);
      }
      buffer = [];
    };

    [...parent.childNodes].forEach(node => {
      if (node.nodeType === 1 && BLOCK_TAGS.has(node.tagName.toLowerCase())) {
        flush();
        if (isEmptyParagraph(node)) return;
        if (node.tagName === 'P') trimEdges(node);
        out.push(node);
        return;
      }
      if (node.nodeType === 3) {
        node.data.split(/\n+/).forEach((part, i) => {
          if (i > 0) flush();
          if (part) buffer.push(doc.createTextNode(part));
        });
        return;
      }
      if (node.nodeType === 1) buffer.push(node);
    });

    flush();
    parent.replaceChildren(...out);
    out.forEach(el => {
      if (isContainer(el)) blockify(el);
    });
  }

  function serializeElement(el) {
    if (!isContainer(el) || !el.children.length) return el.outerHTML;
    const shell = el.cloneNode(false).outerHTML;
    const cut = shell.lastIndexOf('</');
    const inner = [...el.children].map(c => '  ' + c.outerHTML).join('\n');
    return shell.slice(0, cut) + '\n' + inner + '\n' + shell.slice(cut);
  }

  function canonicalize(root, fromVisual) {
    sanitize(root, fromVisual);
    walkText(root, node => {
      let text = node.data.replace(/-{3,}/g, '—');
      if (fromVisual) text = text.replace(/\u00a0/g, ' ');
      node.data = text;
    });
    blockify(root);
    return [...root.children].map(serializeElement).join('\n\n');
  }

  function canonicalFromString(src) {
    if (!src.trim()) return '';
    const body = new DOMParser().parseFromString('<body>' + src, 'text/html').body;
    return canonicalize(body, false);
  }

  function serializeVisual() {
    return canonicalize(visual.cloneNode(true), true);
  }


  function refreshOutput() {
    const html = canonicalFromString(source);
    output.textContent = html;
    const text = html.replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');
    const count = text.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length;
    wordCount.textContent = `${count} ${wordForm(count)}`;
  }

  const refreshSoon = debounce(refreshOutput, 150);

  function renderVisualFrom(src) {
    const top = visualPane.scrollTop;
    visual.innerHTML = canonicalFromString(src) || '<p><br></p>';
    visualPane.scrollTop = top;
  }

  const renderVisualSoon = debounce(() => renderVisualFrom(source), 200);

  function writeInput(value, selStart, selEnd) {
    const top = input.scrollTop;
    input.value = value;
    if (selStart !== undefined) input.setSelectionRange(selStart, selEnd === undefined ? selStart : selEnd);
    input.scrollTop = top;
  }


  function updateHistoryButtons() {
    undoButtons.forEach(b => { b.disabled = historyState.index <= 0; });
    redoButtons.forEach(b => { b.disabled = historyState.index >= historyState.stack.length - 1; });
  }

  function pushHistory() {
    clearTimeout(historyState.timer);
    if (historyState.stack[historyState.index] === source) return;
    historyState.stack.length = historyState.index + 1;
    historyState.stack.push(source);
    if (historyState.stack.length > 200) historyState.stack.shift();
    historyState.index = historyState.stack.length - 1;
    updateHistoryButtons();
  }

  function scheduleHistory() {
    clearTimeout(historyState.timer);
    historyState.timer = setTimeout(pushHistory, 600);
  }

  function restoreSource(src) {
    source = src;
    visualDirty = false;
    writeInput(src);
    if (currentView !== 'code') renderVisualFrom(src);
    refreshOutput();
    scheduleSave();
    updateHistoryButtons();
  }

  function undo() {
    syncFromVisual();
    pushHistory();
    if (historyState.index <= 0) return;
    historyState.index -= 1;
    restoreSource(historyState.stack[historyState.index]);
  }

  function redo() {
    syncFromVisual();
    pushHistory();
    if (historyState.index >= historyState.stack.length - 1) return;
    historyState.index += 1;
    restoreSource(historyState.stack[historyState.index]);
  }


  function saveNow() {
    syncFromVisual();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ source, view: currentView }));
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      savedLabel.textContent = `сохранено ${hh}:${mm}`;
    } catch (error) {
      savedLabel.textContent = 'не удалось сохранить';
    }
  }

  const saveSoon = debounce(saveNow, 400);

  function scheduleSave() {
    savedLabel.textContent = 'сохранение…';
    saveSoon();
  }

  function loadSaved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const data = JSON.parse(raw);
      return {
        source: typeof data.source === 'string' ? data.source : '',
        view: ['code', 'split', 'visual'].includes(data.view) ? data.view : 'split'
      };
    } catch (error) {
      return {};
    }
  }

  window.addEventListener('pagehide', saveNow);
  window.addEventListener('beforeunload', saveNow);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) saveNow();
  });


  const syncVisualSoon = debounce(() => syncFromVisual(), 150);

  function syncFromVisual() {
    if (!visualDirty) return;
    visualDirty = false;
    syncVisualSoon.cancel();
    source = serializeVisual();
    writeInput(source);
    refreshOutput();
    scheduleSave();
    scheduleHistory();
  }

  function commitVisual() {
    visualDirty = true;
    syncFromVisual();
    pushHistory();
  }

  function commitCode() {
    source = input.value;
    renderVisualSoon.cancel();
    if (currentView !== 'code') renderVisualFrom(source);
    refreshOutput();
    pushHistory();
    scheduleSave();
  }


  function setView(view) {
    syncFromVisual();
    currentView = view;
    stage.dataset.view = view;
    viewButtons.forEach(b => b.classList.toggle('is-active', b.dataset.editorView === view));
    activeSurface = view === 'visual' ? 'visual' : 'code';
    if (view !== 'code') renderVisualFrom(source);
    scheduleSave();
  }

  viewButtons.forEach(button => {
    button.addEventListener('click', () => setView(button.dataset.editorView));
  });

  input.addEventListener('focus', () => { activeSurface = 'code'; });
  visual.addEventListener('focus', () => { activeSurface = 'visual'; });


  function fixDashesInInput() {
    const pos = input.selectionStart;
    const before = input.value;
    if (!/-{3,}/.test(before)) return;
    const next = before.replace(/-{3,}/g, '—');
    const caret = before.slice(0, pos).replace(/-{3,}/g, '—').length;
    writeInput(next, caret);
  }

  function fixDashesInVisual() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !sel.isCollapsed) return;
    const node = sel.anchorNode;
    if (!node || node.nodeType !== 3) return;
    const offset = sel.anchorOffset;
    const match = node.data.slice(0, offset).match(/-{3,}$/);
    if (!match) return;
    const start = offset - match[0].length;
    node.replaceData(start, match[0].length, '—');
    sel.collapse(node, start + 1);
  }

  input.addEventListener('input', () => {
    fixDashesInInput();
    source = input.value;
    if (currentView !== 'code') renderVisualSoon();
    refreshSoon();
    scheduleSave();
    scheduleHistory();
  });

  visual.addEventListener('input', () => {
    fixDashesInVisual();
    if (!visual.firstElementChild && !visual.textContent) {
      visual.innerHTML = '<p><br></p>';
      const range = document.createRange();
      range.setStart(visual.firstElementChild, 0);
      range.collapse(true);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    visualDirty = true;
    savedLabel.textContent = 'сохранение…';
    syncVisualSoon();
  });

  visual.addEventListener('paste', event => {
    event.preventDefault();
    const text = (event.clipboardData || window.clipboardData).getData('text/plain').replace(/\r/g, '');
    const lines = text.split('\n').filter(line => line.trim());
    lines.forEach((line, i) => {
      if (i > 0) document.execCommand('insertParagraph');
      document.execCommand('insertText', false, line);
    });
  });

  visual.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    const sel = window.getSelection();
    const node = sel && sel.anchorNode;
    const el = node && (node.nodeType === 1 ? node : node.parentElement);
    const divider = el && el.closest('.scene-divider');
    if (!divider) return;
    event.preventDefault();
    const p = document.createElement('p');
    p.innerHTML = '<br>';
    divider.after(p);
    const range = document.createRange();
    range.setStart(p, 0);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    visualDirty = true;
    syncVisualSoon();
  });

  input.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    event.preventDefault();
    input.setRangeText('  ', input.selectionStart, input.selectionEnd, 'end');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  document.addEventListener('keydown', event => {
    if (!(event.ctrlKey || event.metaKey)) return;
    const target = document.activeElement;
    if (target !== input && !visual.contains(target)) return;
    if (event.code === 'KeyZ' && !event.shiftKey) {
      event.preventDefault();
      undo();
    } else if (event.code === 'KeyY' || (event.code === 'KeyZ' && event.shiftKey)) {
      event.preventDefault();
      redo();
    }
  });

  undoButtons.forEach(b => b.addEventListener('click', undo));
  redoButtons.forEach(b => b.addEventListener('click', redo));


  function visualRange() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    const range = sel.getRangeAt(0);
    return visual.contains(range.commonAncestorContainer) ? range : null;
  }

  function touches(range, node) {
    return range.intersectsNode(node) || node.contains(range.startContainer);
  }

  function leafBlocks(range, selector) {
    return [...visual.querySelectorAll(selector)].filter(b => touches(range, b));
  }

  function topBlocks(range) {
    return [...visual.children].filter(c => touches(range, c));
  }

  function elementFromStyle(style) {
    const holder = document.createElement('div');
    holder.innerHTML = style.open + style.close;
    return holder.firstElementChild;
  }

  function selectAround(first, last) {
    const range = document.createRange();
    range.setStartBefore(first);
    range.setEndAfter(last);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function applyInlineVisual(style) {
    const range = visualRange();
    if (!range || range.collapsed) {
      showToast('Сначала выдели текст в визуальном окне.');
      return;
    }
    const blocks = leafBlocks(range, 'p, h1, h2, h3, cite');
    const wrappers = [];

    blocks.forEach(block => {
      const part = document.createRange();
      part.selectNodeContents(block);
      if (block.contains(range.startContainer)) part.setStart(range.startContainer, range.startOffset);
      if (block.contains(range.endContainer)) part.setEnd(range.endContainer, range.endOffset);
      if (part.collapsed || !part.toString().trim()) return;
      const el = elementFromStyle(style);
      el.appendChild(part.extractContents());
      part.insertNode(el);
      wrappers.push(el);
    });

    if (!wrappers.length) {
      showToast('В выделении нет текста.');
      return;
    }
    selectAround(wrappers[0], wrappers[wrappers.length - 1]);
    commitVisual();
    showToast(`Стиль «${style.name}» применён`);
  }

  function applyWrapVisual(style) {
    const range = visualRange();
    if (!range) {
      showToast('Поставь курсор в абзац или выдели текст.');
      return;
    }
    const tops = topBlocks(range);
    if (!tops.length) {
      showToast('Не удалось найти абзац.');
      return;
    }
    const template = elementFromStyle(style);
    if (tops.length === 1 && tops[0].tagName === template.tagName && tops[0].className === template.className) {
      unwrap(tops[0]);
      commitVisual();
      showToast(`Блок «${style.name}» снят`);
      return;
    }
    tops[0].before(template);
    tops.forEach(t => template.appendChild(t));
    commitVisual();
    showToast(`Блок «${style.name}» добавлен`);
  }

  function applyClassVisual(style) {
    const range = visualRange();
    if (!range) {
      showToast('Поставь курсор в абзац или выдели текст.');
      return;
    }
    const paragraphs = leafBlocks(range, 'p');
    if (!paragraphs.length) {
      showToast('Не удалось найти абзац.');
      return;
    }
    const all = paragraphs.every(p => p.classList.contains(style.cls));
    paragraphs.forEach(p => {
      p.classList.toggle(style.cls, !all);
      if (!p.getAttribute('class')) p.removeAttribute('class');
    });
    commitVisual();
    showToast(all ? `«${style.name}» снято` : `«${style.name}» применено`);
  }

  function applyDividerVisual() {
    const range = visualRange();
    const divider = document.createElement('div');
    divider.className = 'scene-divider';
    divider.textContent = DIVIDER_TEXT;
    const tops = range ? topBlocks(range) : [];
    if (tops.length) tops[tops.length - 1].after(divider);
    else visual.append(divider);
    commitVisual();
    showToast('Разделитель добавлен');
  }

  function applyFootnoteVisual() {
    const range = visualRange();
    if (!range) {
      showToast('Поставь курсор или выдели слово в визуальном окне.');
      return;
    }
    const note = window.prompt('Текст сноски:');
    if (!note || !note.trim()) return;
    const span = document.createElement('span');
    span.className = 'footnote';
    span.setAttribute('contenteditable', 'false');
    const tip = document.createElement('span');
    tip.className = 'footnote-tip';
    tip.textContent = note.trim();
    if (range.collapsed) {
      span.append('*', tip);
      range.insertNode(span);
    } else {
      const part = range.cloneRange();
      span.append(part.extractContents().textContent, tip);
      range.deleteContents();
      range.insertNode(span);
    }
    commitVisual();
    showToast('Сноска добавлена');
  }

  function stripVisual() {
    const range = visualRange();
    if (!range) {
      showToast('Сначала выдели текст в визуальном окне.');
      return;
    }
    const nodes = [...visual.querySelectorAll('span, em, strong, u')]
      .filter(el => touches(range, el) && !el.closest('.footnote'));
    if (!nodes.length) {
      showToast('В выделении нет оформления.');
      return;
    }
    nodes.forEach(el => { if (el.isConnected) unwrap(el); });
    visual.normalize();
    commitVisual();
    showToast('Оформление снято');
  }


  function segmentsOf(src) {
    const segments = [];
    const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g;
    let depth = 0;
    let start = 0;
    let plainFrom = 0;
    let blockTag = '';
    let match;

    const addLines = (from, to) => {
      const chunk = src.slice(from, to);
      const lineRe = /[^\n]+/g;
      let line;
      while ((line = lineRe.exec(chunk))) {
        const raw = line[0];
        const lead = raw.length - raw.trimStart().length;
        const text = raw.trim();
        if (!text) continue;
        const s = from + line.index + lead;
        segments.push({ start: s, end: s + text.length, kind: 'line' });
      }
    };

    while ((match = tagRe.exec(src))) {
      const tag = match[2].toLowerCase();
      if (!BLOCK_TAGS.has(tag) || tag === 'cite') continue;
      const closing = match[1] === '/';
      const voidTag = tag === 'hr' || match[3] === '/';
      const end = match.index + match[0].length;

      if (closing) {
        if (depth > 0) {
          depth -= 1;
          if (depth === 0) {
            segments.push({ start, end, kind: 'block', tag: blockTag });
            plainFrom = end;
          }
        }
      } else if (voidTag) {
        if (depth === 0) {
          addLines(plainFrom, match.index);
          segments.push({ start: match.index, end, kind: 'block', tag });
          plainFrom = end;
        }
      } else {
        if (depth === 0) {
          addLines(plainFrom, match.index);
          start = match.index;
          blockTag = tag;
        }
        depth += 1;
      }
    }

    if (depth > 0) segments.push({ start, end: src.length, kind: 'block', tag: blockTag });
    else addLines(plainFrom, src.length);
    return segments;
  }

  function segmentsAtSelection(src, from, to) {
    const segments = segmentsOf(src);
    let chosen = segments.filter(g => g.start <= to && g.end >= from);
    if (!chosen.length) {
      const before = segments.filter(g => g.end <= from);
      chosen = before.length ? [before[before.length - 1]] : segments.slice(0, 1);
    }
    return { segments, chosen };
  }

  function toggleClassInTag(tag, cls, force) {
    const match = tag.match(/\sclass="([^"]*)"/);
    const list = match ? match[1].split(/\s+/).filter(Boolean) : [];
    const has = list.includes(cls);
    const next = force === undefined ? !has : force;
    const result = next ? (has ? list : [...list, cls]) : list.filter(c => c !== cls);
    const attr = result.length ? ` class="${result.join(' ')}"` : '';
    if (match) return tag.replace(match[0], attr);
    return result.length ? tag.replace(/^<([a-zA-Z0-9]+)/, `<$1${attr}`) : tag;
  }

  function openingTagOf(src, seg) {
    const match = src.slice(seg.start, seg.end).match(/^<[^>]*>/);
    return match ? match[0] : null;
  }

  function applyInlineCode(style) {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    if (start === end) {
      showToast('Сначала выдели текст в коде.');
      return;
    }
    const selected = input.value.slice(start, end);
    const parts = selected.split(/(<\/?(?:p|div|blockquote|cite|h[1-6])\b[^>]*>|\n)/gi);
    const replacement = parts.map((part, i) => {
      if (i % 2 === 1) return part;
      const m = part.match(/^(\s*)([\s\S]*?)(\s*)$/);
      return m[2] ? m[1] + style.open + m[2] + style.close + m[3] : part;
    }).join('');
    input.setRangeText(replacement, start, end, 'select');
    input.focus();
    commitCode();
    showToast(`Стиль «${style.name}» применён`);
  }

  function applyWrapCode(style) {
    const value = input.value;
    const { chosen } = segmentsAtSelection(value, input.selectionStart, input.selectionEnd);
    if (!chosen.length) {
      showToast('Не удалось найти абзац.');
      return;
    }
    const from = chosen[0].start;
    const to = chosen[chosen.length - 1].end;
    const inner = chosen.map(g => {
      const text = value.slice(g.start, g.end);
      return g.kind === 'line' ? `<p>${text}</p>` : text;
    }).join('\n');
    const replacement = `${style.open}\n${inner}\n${style.close}`;
    writeInput(value.slice(0, from) + replacement + value.slice(to), from, from + replacement.length);
    input.focus();
    commitCode();
    showToast(`Блок «${style.name}» добавлен`);
  }

  function applyClassCode(style) {
    const value = input.value;
    const from = input.selectionStart;
    const to = input.selectionEnd;
    const paragraphs = [];
    const pRe = /<p\b[^>]*>[\s\S]*?<\/p>/gi;
    let found;
    while ((found = pRe.exec(value))) {
      paragraphs.push({ start: found.index, end: found.index + found[0].length, kind: 'block', tag: 'p' });
    }
    const insideParagraph = g => paragraphs.some(p => g.start >= p.start && g.end <= p.end);
    const lines = segmentsOf(value).filter(g => g.kind === 'line' && !insideParagraph(g));
    const all_ = [...paragraphs, ...lines].sort((a, b) => a.start - b.start);
    let targets = all_.filter(g => g.start <= to && g.end >= from);
    if (!targets.length) {
      const before = all_.filter(g => g.end <= from);
      targets = before.length ? [before[before.length - 1]] : all_.slice(0, 1);
    }
    if (!targets.length) {
      showToast('Не удалось найти абзац.');
      return;
    }
    const hasClass = g => {
      if (g.kind === 'line') return false;
      const tag = openingTagOf(value, g) || '';
      return new RegExp(`class="[^"]*\\b${style.cls}\\b`).test(tag);
    };
    const all = targets.every(hasClass);
    let out = value;
    [...targets].reverse().forEach(g => {
      if (g.kind === 'line') {
        const text = out.slice(g.start, g.end);
        out = out.slice(0, g.start) + `<p class="${style.cls}">${text}</p>` + out.slice(g.end);
      } else {
        const tag = openingTagOf(out, g);
        if (!tag) return;
        out = out.slice(0, g.start) + toggleClassInTag(tag, style.cls, !all) + out.slice(g.start + tag.length);
      }
    });
    writeInput(out, input.selectionStart);
    input.focus();
    commitCode();
    showToast(all ? `«${style.name}» снято` : `«${style.name}» применено`);
  }

  function applyDividerCode() {
    const value = input.value;
    const { chosen } = segmentsAtSelection(value, input.selectionStart, input.selectionEnd);
    const at = chosen.length ? chosen[chosen.length - 1].end : value.length;
    const insert = `${value.length && at ? '\n\n' : ''}<div class="scene-divider">${DIVIDER_TEXT}</div>`;
    writeInput(value.slice(0, at) + insert + value.slice(at), at + insert.length);
    input.focus();
    commitCode();
    showToast('Разделитель добавлен');
  }

  function applyFootnoteCode() {
    const note = window.prompt('Текст сноски:');
    if (!note || !note.trim()) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const term = start === end ? '*' : input.value.slice(start, end);
    const markup = `<span class="footnote">${term}<span class="footnote-tip">${note.trim()}</span></span>`;
    input.setRangeText(markup, start, end, 'end');
    input.focus();
    commitCode();
    showToast('Сноска добавлена');
  }

  function stripCode() {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    if (start === end) {
      showToast('Сначала выдели текст вместе с тегами.');
      return;
    }
    const selected = input.value.slice(start, end);
    const cleaned = selected.replace(/<\/?(span|em|strong|b|i|u)\b[^>]*>/gi, '');
    if (cleaned === selected) {
      showToast('В выделении нет тегов — захвати их вместе с текстом.');
      return;
    }
    input.setRangeText(cleaned, start, end, 'select');
    input.focus();
    commitCode();
    showToast('Оформление снято');
  }

  function surface() {
    if (currentView === 'code') return 'code';
    if (currentView === 'visual') return 'visual';
    return activeSurface;
  }

  function applyStyle(style) {
    syncFromVisual();
    const onVisual = surface() === 'visual';
    if (style.kind === 'inline') return onVisual ? applyInlineVisual(style) : applyInlineCode(style);
    if (style.kind === 'wrap') return onVisual ? applyWrapVisual(style) : applyWrapCode(style);
    if (style.kind === 'class') return onVisual ? applyClassVisual(style) : applyClassCode(style);
    if (style.kind === 'divider') return onVisual ? applyDividerVisual() : applyDividerCode();
    if (style.kind === 'footnote') return onVisual ? applyFootnoteVisual() : applyFootnoteCode();
  }


  const listContainer = document.querySelector('[data-style-list]');
  const countLabel = document.querySelector('[data-style-count]');
  const searchField = document.querySelector('[data-style-search]');
  const stripButton = document.querySelector('[data-style-strip]');

  function describeCode(style) {
    if (style.kind === 'inline') return style.open + 'текст' + style.close;
    if (style.kind === 'wrap') return `${style.open}\n  <p>…</p>\n${style.close}`;
    if (style.kind === 'class') return `<p class="${style.cls}">…</p>`;
    if (style.kind === 'divider') return `<div class="scene-divider">${DIVIDER_TEXT}</div>`;
    return '<span class="footnote">*<span class="footnote-tip">…</span></span>';
  }

  function renderStyles() {
    listContainer.innerHTML = '';
    const groups = new Map();
    styles.forEach(style => {
      if (!groups.has(style.group)) groups.set(style.group, []);
      groups.get(style.group).push(style);
    });

    groups.forEach((items, groupName) => {
      const details = document.createElement('details');
      details.className = 'style-group';
      details.open = true;

      const summary = document.createElement('summary');
      summary.className = 'style-group__title';
      summary.textContent = groupName;
      const badge = document.createElement('span');
      badge.className = 'style-group__count';
      badge.textContent = items.length;
      summary.appendChild(badge);
      details.appendChild(summary);

      const body = document.createElement('div');
      body.className = 'style-group__body';

      items.forEach(style => {
        const card = document.createElement('div');
        card.className = 'style-card';
        card.setAttribute('role', 'button');
        card.tabIndex = 0;
        card.title = describeCode(style);
        card.dataset.search = (style.name + ' ' + style.description + ' ' + groupName).toLowerCase();

        const head = document.createElement('div');
        head.className = 'style-card__head';

        const icon = document.createElement('div');
        icon.className = 'style-card__icon';
        icon.textContent = style.icon;

        const text = document.createElement('div');
        text.className = 'style-card__text';
        const name = document.createElement('div');
        name.className = 'style-card__name';
        name.textContent = style.name;
        const desc = document.createElement('div');
        desc.className = 'style-card__desc';
        desc.textContent = style.description;
        text.append(name, desc);

        head.append(icon, text);
        card.appendChild(head);

        if (style.kind === 'inline') {
          const sample = document.createElement('div');
          sample.className = 'reader style-card__sample';
          sample.innerHTML = `<p class="no-indent">${style.open}${SAMPLE_TEXT}${style.close}</p>`;
          card.appendChild(sample);
        }

        card.addEventListener('click', () => applyStyle(style));
        card.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            applyStyle(style);
          }
        });
        body.appendChild(card);
      });

      details.appendChild(body);
      listContainer.appendChild(details);
    });

    countLabel.textContent = styles.length;
  }

  function filterStyles() {
    const query = searchField.value.trim().toLowerCase();
    listContainer.querySelectorAll('.style-group').forEach(group => {
      let visible = 0;
      group.querySelectorAll('.style-card').forEach(card => {
        const show = !query || card.dataset.search.includes(query);
        card.hidden = !show;
        if (show) visible += 1;
      });
      group.hidden = visible === 0;
      if (query) group.open = true;
    });
  }

  searchField.addEventListener('input', filterStyles);

  document.querySelector('.editor-sidebar').addEventListener('mousedown', event => {
    if (event.target.closest('.style-card, .style-clear')) event.preventDefault();
  });

  stripButton.addEventListener('click', () => {
    syncFromVisual();
    if (surface() === 'visual') stripVisual();
    else stripCode();
  });


  async function copyHtml() {
    syncFromVisual();
    const html = canonicalFromString(source);
    if (!html) {
      showToast('Пока нечего копировать.');
      return;
    }
    try {
      await navigator.clipboard.writeText(html);
      showToast('HTML скопирован в буфер.');
    } catch (error) {
      const helper = document.createElement('textarea');
      helper.value = html;
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      document.body.appendChild(helper);
      helper.select();
      document.execCommand('copy');
      helper.remove();
      showToast('HTML скопирован.');
    }
  }

  document.querySelectorAll('[data-editor-copy]').forEach(b => b.addEventListener('click', copyHtml));

  document.querySelector('[data-editor-clear]').addEventListener('click', () => {
    if (!source.trim() && !visualDirty) return;
    if (!window.confirm('Очистить текст главы? Это действие можно отменить кнопкой «Отмена».')) return;
    syncFromVisual();
    pushHistory();
    source = '';
    writeInput('');
    if (currentView !== 'code') renderVisualFrom('');
    refreshOutput();
    pushHistory();
    scheduleSave();
    showToast('Редактор очищен.');
  });


  try {
    document.execCommand('defaultParagraphSeparator', false, 'p');
  } catch (error) {
    visual.dataset.noParagraphSeparator = 'true';
  }

  const saved = loadSaved();
  source = saved.source || '';
  writeInput(source);
  historyState.stack = [source];
  historyState.index = 0;
  renderStyles();
  setView(saved.view || 'split');
  refreshOutput();
  updateHistoryButtons();
});

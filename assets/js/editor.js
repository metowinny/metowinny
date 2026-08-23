/* ============================================================
   НУЛЕВОЙ ТРИБУНАЛ — КОНСТРУКТОР ГЛАВЫ
   Файл: assets/js/editor.js

   Первая версия:
   - режим КОД / ВИЗУАЛ
   - live preview
   - панель существующих стилей
   - применение inline-стилей к выделению
   - применение block-стилей к абзацу
   - автоматическая замена --- → —
   - нормализация обычного текста в <p>
   - метаданные главы
   - генерация готового HTML для GitHub
   - копирование HTML
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  const input = document.querySelector('[data-editor-input]');
  const preview = document.querySelector('[data-editor-preview]');
  const output = document.querySelector('[data-editor-output]');

  const modeButtons = [...document.querySelectorAll('[data-editor-mode]')];
  const panels = [...document.querySelectorAll('[data-editor-panel]')];

  const wordCount = document.querySelector('[data-editor-wordcount]');
  const modeLabel = document.querySelector('[data-editor-mode-label]');
  const toast = document.querySelector('[data-editor-toast]');

  const meta = {
    act: document.querySelector('[data-meta-act]'),
    number: document.querySelector('[data-meta-number]'),
    title: document.querySelector('[data-meta-title]'),
    epigraph: document.querySelector('[data-meta-epigraph]'),
    cite: document.querySelector('[data-meta-cite]')
  };


  /* ==========================================================
     НАБОР СТИЛЕЙ
     ========================================================== */

  const styles = [

    {
      group: 'Базовое',
      name: 'Курсив',
      icon: '𝑖',
      description: 'Обычный курсив.',
      type: 'inline',
      open: '<em>',
      close: '</em>'
    },

    {
      group: 'Базовое',
      name: 'Жирный',
      icon: 'B',
      description: 'Выделение важной фразы.',
      type: 'inline',
      open: '<strong>',
      close: '</strong>'
    },

    {
      group: 'Базовое',
      name: 'Фиолетовый',
      icon: '✦',
      description: 'Фиолетовый акцент.',
      type: 'inline',
      open: '<span class="fx-violet">',
      close: '</span>'
    },

    {
      group: 'Базовое',
      name: 'Розовый',
      icon: '◆',
      description: 'Розовый акцент.',
      type: 'inline',
      open: '<span class="fx-pink">',
      close: '</span>'
    },

    {
      group: 'Специальная речь',
      name: 'Система',
      icon: '⌁',
      description: 'Системные реплики.',
      type: 'inline',
      open: '<span class="fx-system">',
      close: '</span>'
    },

    {
      group: 'Специальная речь',
      name: 'Шёпот',
      icon: '◌',
      description: 'Приглушённый текст.',
      type: 'inline',
      open: '<span class="fx-whisper">',
      close: '</span>'
    },

    {
      group: 'Специальная речь',
      name: 'Эхо',
      icon: '◈',
      description: 'Хроматическая аберрация.',
      type: 'inline',
      open: '<span class="fx-echo">',
      close: '</span>'
    },

    {
      group: 'Специальная речь',
      name: 'Золотой',
      icon: '✧',
      description: 'Золотой акцент.',
      type: 'inline',
      open: '<span class="fx-gold">',
      close: '</span>'
    },

    {
      group: 'Дрожание',
      name: 'Медленное покачивание',
      icon: '〰',
      description: 'Каждая буква медленно качается.',
      type: 'inline',
      open: '<span class="shake-slow">',
      close: '</span>'
    },

    {
      group: 'Дрожание',
      name: 'Среднее дрожание',
      icon: '≈',
      description: 'Более заметное движение букв.',
      type: 'inline',
      open: '<span class="shake-medium">',
      close: '</span>'
    },

    {
      group: 'Дрожание',
      name: 'Быстрое дрожание',
      icon: '⁙',
      description: 'Быстрая нервная дрожь.',
      type: 'inline',
      open: '<span class="shake-fast">',
      close: '</span>'
    },

    {
      group: 'Восприятие',
      name: 'Затухание',
      icon: '◒',
      description: 'Текст становится труднее читать.',
      type: 'inline',
      open: '<span class="fading-text">',
      close: '</span>'
    },

    {
      group: 'Восприятие',
      name: 'Сильное затухание',
      icon: '◑',
      description: 'Более сильное размытие.',
      type: 'inline',
      open: '<span class="fading-text fading-text--blur">',
      close: '</span>'
    },

    {
      group: 'Восприятие',
      name: 'Глубокое затухание',
      icon: '◐',
      description: 'Текст почти теряется.',
      type: 'inline',
      open: '<span class="fading-text fading-text--deep">',
      close: '</span>'
    },

    {
      group: 'Восприятие',
      name: 'Почти исчезновение',
      icon: '○',
      description: 'Очень плохо различимый текст.',
      type: 'inline',
      open: '<span class="fading-text fading-text--vanish">',
      close: '</span>'
    },

    {
      group: 'Восприятие',
      name: 'Дышащее затухание',
      icon: '◌',
      description: 'Размытие плавно усиливается и ослабевает.',
      type: 'inline',
      open: '<span class="fading-text fading-text--breathing">',
      close: '</span>'
    },

    {
      group: 'Оформление',
      name: 'Разделитель',
      icon: '✦',
      description: 'Отдельная декоративная строка.',
      type: 'block',
      open: '<div class="scene-divider">',
      close: '</div>',
      defaultText: '✦ ✧ ✦'
    },

    {
      group: 'Оформление',
      name: 'Эпиграф',
      icon: '❝',
      description: 'Блок эпиграфа.',
      type: 'block',
      open: '<blockquote class="epigraph">',
      close: '</blockquote>',
      defaultText: '<p>Текст эпиграфа.</p>'
    },

    {
      group: 'Оформление',
      name: 'Консоль',
      icon: '▣',
      description: 'Экран компьютерной системы.',
      type: 'block',
      open: '<div class="console-block">',
      close: '</div>',
      defaultText: '<p>{ SYSTEM } : Текст...</p>'
    },

    {
      group: 'Оформление',
      name: 'Письмо',
      icon: '✉',
      description: 'Оформленный блок письма.',
      type: 'block',
      open: '<div class="letter">',
      close: '</div>',
      defaultText: '<p>Текст письма.</p>'
    },

    {
      group: 'Оформление',
      name: 'Маленький текст',
      icon: 'ᵃ',
      description: 'Уменьшенный размер.',
      type: 'inline',
      open: '<span class="fx-small">',
      close: '</span>'
    },

    {
      group: 'Оформление',
      name: 'Большой текст',
      icon: 'A',
      description: 'Увеличенный размер.',
      type: 'inline',
      open: '<span class="fx-large">',
      close: '</span>'
    }

  ];


  /* ==========================================================
     ПАНЕЛЬ СТИЛЕЙ
     ========================================================== */

  function renderStyles() {

    const container = document.querySelector('[data-style-list]');
    const count = document.querySelector('[data-style-count]');

    if (!container) return;

    container.innerHTML = '';

    const groups = {};

    styles.forEach(style => {
      if (!groups[style.group]) {
        groups[style.group] = [];
      }

      groups[style.group].push(style);
    });

    Object.entries(groups).forEach(([groupName, groupStyles]) => {

      const group = document.createElement('div');
      group.className = 'style-group';

      const heading = document.createElement('div');
      heading.className = 'style-group__title';
      heading.textContent = groupName;

      group.appendChild(heading);

      groupStyles.forEach(style => {

        const card = document.createElement('div');
        card.className = 'style-card';

        const main = document.createElement('div');
        main.className = 'style-card__main';

        const icon = document.createElement('div');
        icon.className = 'style-card__icon';
        icon.textContent = style.icon;

        const info = document.createElement('div');

        const name = document.createElement('div');
        name.className = 'style-card__name';
        name.textContent = style.name;

        const description = document.createElement('div');
        description.className = 'style-card__desc';
        description.textContent = style.description;

        info.appendChild(name);
        info.appendChild(description);

        const apply = document.createElement('button');
        apply.type = 'button';
        apply.className = 'style-card__apply';
        apply.textContent = 'Применить';

        apply.addEventListener('click', () => {
          applyStyle(style);
        });

        main.appendChild(icon);
        main.appendChild(info);
        main.appendChild(apply);

        card.appendChild(main);

        const details = document.createElement('details');
        details.className = 'style-card__code';

        const summary = document.createElement('summary');
        summary.textContent = 'Показать HTML';

        const pre = document.createElement('pre');
        const code = document.createElement('code');

        let example;

        if (style.type === 'inline') {
          example =
            style.open +
            'выделенный текст' +
            style.close;
        } else {
          example =
            style.open +
            (style.defaultText || 'текст') +
            style.close;
        }

        code.textContent = example;

        pre.appendChild(code);
        details.appendChild(summary);
        details.appendChild(pre);

        card.appendChild(details);
        group.appendChild(card);
      });

      container.appendChild(group);
    });

    if (count) {
      count.textContent = styles.length;
    }
  }


  /* ==========================================================
     ВСПОМОГАТЕЛЬНОЕ
     ========================================================== */

  function escapeHtml(value) {

    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }


  function showToast(message) {

    if (!toast) return;

    toast.textContent = message;
    toast.classList.add('is-visible');

    clearTimeout(showToast.timer);

    showToast.timer = setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 1800);
  }


  function updateWordCount() {

    if (!wordCount) return;

    const text = input
      ? input.value
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      : '';

    const count = text
      ? text.split(' ').length
      : 0;

    wordCount.textContent =
      `${count} ${getWordForm(count, 'слово', 'слова', 'слов')}`;
  }


  function getWordForm(number, one, few, many) {

    const n = Math.abs(number) % 100;
    const n1 = n % 10;

    if (n >= 11 && n <= 19) return many;
    if (n1 === 1) return one;
    if (n1 >= 2 && n1 <= 4) return few;

    return many;
  }


  /* ==========================================================
     ТРИ ДЕФИСА → ДЛИННОЕ ТИРЕ
     ========================================================== */

  function replaceTripleDash(value) {

    return value.replace(/---+/g, '—');
  }


  /* ==========================================================
     НОРМАЛИЗАЦИЯ ОБЫЧНОГО ТЕКСТА
     ========================================================== */

  function normalizePlainText(value) {

    const trimmed = value.trim();

    if (!trimmed) return '';

    /*
     Если пользователь уже пишет HTML,
     ничего не преобразуем.
    */
    if (/<\/?[a-z][^>]*>/i.test(trimmed)) {
      return replaceTripleDash(value);
    }

    /*
     Если это обычный текст:
     каждая непустая строка превращается в <p>.
    */

    const paragraphs = replaceTripleDash(trimmed)
      .split(/\n\s*\n/)
      .map(text => text.trim())
      .filter(Boolean);

    return paragraphs
      .map(text => `<p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>`)
      .join('\n\n');
  }


  /* ==========================================================
     ПОДГОТОВКА HTML
     ========================================================== */

  function prepareHtml(value) {

    let html = replaceTripleDash(value);

    /*
     Если пользователь случайно вставил чистый текст,
     превращаем его в абзацы.
    */
    if (!/<\/?[a-z][^>]*>/i.test(html.trim())) {
      html = normalizePlainText(html);
    }

    return html.trim();
  }


  /* ==========================================================
     МЕТАДАННЫЕ
     ========================================================== */

  function buildHeaderHtml() {

    const act = meta.act?.value.trim() || '';
    const number = meta.number?.value.trim() || '';
    const title = meta.title?.value.trim() || '';

    if (!act && !number && !title) {
      return '';
    }

    return `
<div class="chapter-head">
  ${act ? `<div class="chapter-head__eyebrow">${escapeHtml(act)}</div>` : ''}
  ${number || title ? `
  <h1 class="chapter-head__title">
    ${number ? `<span class="chapter-head__title-num">${escapeHtml(number)}</span>` : ''}
    ${title ? ` ${escapeHtml(title)}` : ''}
  </h1>` : ''}
</div>`.trim();
  }


  function buildEpigraphHtml() {

    const text = meta.epigraph?.value.trim() || '';
    const cite = meta.cite?.value.trim() || '';

    if (!text) return '';

    return `
<blockquote class="epigraph">
  <p>${escapeHtml(text)}</p>
  ${cite ? `<cite>${escapeHtml(cite)}</cite>` : ''}
</blockquote>`.trim();
  }


  function buildExportHtml() {

    const body = prepareHtml(input?.value || '');

    const parts = [];

    const header = buildHeaderHtml();
    const epigraph = buildEpigraphHtml();

    if (header) {
      parts.push(header);
    }

    if (epigraph) {
      parts.push(epigraph);
    }

    if (body) {
      parts.push(body);
    }

    return parts.join('\n\n');
  }


  /* ==========================================================
     PREVIEW
     ========================================================== */

  function updatePreview() {

    if (!preview || !input) return;

    const html = prepareHtml(input.value);

    preview.innerHTML = html;

    updateWordCount();
    updateOutput();
  }


  function updateOutput() {

    if (!output) return;

    output.textContent = buildExportHtml();
  }


  /* ==========================================================
     РЕЖИМ КОД / ВИЗУАЛ
     ========================================================== */

  function setMode(mode) {

    modeButtons.forEach(button => {
      button.classList.toggle(
        'is-active',
        button.dataset.editorMode === mode
      );
    });

    panels.forEach(panel => {
      panel.classList.toggle(
        'is-active',
        panel.dataset.editorPanel === mode
      );
    });

    if (modeLabel) {
      modeLabel.textContent =
        mode === 'code'
          ? 'HTML'
          : 'ПРЕДПРОСМОТР';
    }

    /*
     * Перед переходом в визуал синхронизируем HTML.
     */
    if (mode === 'visual') {
      updatePreview();
      makePreviewEditable();
    }
  }


  modeButtons.forEach(button => {

    button.addEventListener('click', () => {

      setMode(button.dataset.editorMode);

    });

  });


  /* ==========================================================
     VISUAL EDITOR
     ========================================================== */

  function makePreviewEditable() {

    if (!preview) return;

    preview.setAttribute('contenteditable', 'true');
    preview.setAttribute('spellcheck', 'true');

    /*
     * Не добавляем обработчик повторно.
     */
    if (preview.dataset.editorBound === 'true') {
      return;
    }

    preview.dataset.editorBound = 'true';

    preview.addEventListener('input', () => {

      /*
       * При редактировании визуального режима
       * HTML возвращается обратно в textarea.
       */

      input.value = preview.innerHTML;

      input.value = replaceTripleDash(input.value);

      updateWordCount();
      updateOutput();

    });
  }


  /* ==========================================================
     ПРИМЕНЕНИЕ INLINE-СТИЛЯ
     ========================================================== */

  function wrapTextareaSelection(style) {

    if (!input) return;

    const start = input.selectionStart;
    const end = input.selectionEnd;

    if (start === end) {
      showToast('Сначала выдели текст.');
      return;
    }

    const selected = input.value.slice(start, end);

    const replacement =
      style.open +
      selected +
      style.close;

    input.setRangeText(
      replacement,
      start,
      end,
      'select'
    );

    input.dispatchEvent(new Event('input', {
      bubbles:true
    }));

    showToast(`Стиль «${style.name}» применён`);
  }


  function getSelectedVisualText() {

    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    if (selection.isCollapsed) {
      return null;
    }

    const range = selection.getRangeAt(0);

    if (!preview.contains(range.commonAncestorContainer)) {
      return null;
    }

    return {
      selection,
      range
    };
  }


  function wrapVisualSelection(style) {

    const selected = getSelectedVisualText();

    if (!selected) {
      showToast('Сначала выдели текст.');
      return;
    }

    const range = selected.range;

    const wrapper = document.createElement('span');

    /*
     * Из HTML-строки достаём class/style.
     * Для первой версии поддерживаем наши обычные span-классы.
     */

    const temporary = document.createElement('div');
    temporary.innerHTML = style.open + style.close;

    const generated =
      temporary.firstElementChild;

    if (!generated) {
      showToast('Не удалось применить стиль.');
      return;
    }

    wrapper.className = generated.className;

    try {

      range.surroundContents(wrapper);

    } catch (error) {

      /*
       * surroundContents может упасть,
       * если выделение пересекает существующие HTML-теги.
       *
       * В таком случае используем document fragment.
       */

      const fragment = range.extractContents();

      wrapper.appendChild(fragment);

      range.insertNode(wrapper);
    }

    window.getSelection().removeAllRanges();

    input.value = preview.innerHTML;

    updateWordCount();
    updateOutput();

    showToast(`Стиль «${style.name}» применён`);
  }


  function applyStyle(style) {

    const mode =
      document.querySelector('.editor-tab.is-active')
        ?.dataset.editorMode || 'code';

    if (style.type === 'inline') {

      if (mode === 'visual') {
        wrapVisualSelection(style);
      } else {
        wrapTextareaSelection(style);
      }

      return;
    }


    /*
     * BLOCK-стили.
     */

    if (mode === 'visual') {

      applyBlockStyleVisual(style);

    } else {

      applyBlockStyleCode(style);

    }
  }


  /* ==========================================================
     BLOCK-СТИЛЬ В CODE
     ========================================================== */

  function applyBlockStyleCode(style) {

    if (!input) return;

    const start = input.selectionStart;
    const end = input.selectionEnd;

    if (start === end) {
      showToast('Выдели абзац или его часть.');
      return;
    }

    const selected = input.value.slice(start, end);

    let replacement;

    if (style.name === 'Разделитель') {

      replacement =
        `${style.open}${style.defaultText}${style.close}`;

    } else {

      replacement =
        `${style.open}\n${selected}\n${style.close}`;

    }

    input.setRangeText(
      replacement,
      start,
      end,
      'select'
    );

    input.dispatchEvent(new Event('input', {
      bubbles:true
    }));

    showToast(`Блок «${style.name}» добавлен`);
  }


  /* ==========================================================
     BLOCK-СТИЛЬ В VISUAL
     ========================================================== */

  function applyBlockStyleVisual(style) {

    const selected = getSelectedVisualText();

    if (!selected) {
      showToast('Сначала выдели текст.');
      return;
    }

    const range = selected.range;

    /*
     * Находим ближайший абзац/блочный элемент.
     */

    let node = range.commonAncestorContainer;

    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentElement;
    }

    const block =
      node.closest('p, blockquote, div');

    if (!block || !preview.contains(block)) {
      showToast('Не удалось определить абзац.');
      return;
    }

    const wrapper = document.createElement(
      style.name === 'Эпиграф'
        ? 'blockquote'
        : 'div'
    );

    wrapper.className =
      style.name === 'Эпиграф'
        ? 'epigraph'
        : style.name === 'Консоль'
          ? 'console-block'
          : style.name === 'Письмо'
            ? 'letter'
            : 'scene-divider';

    if (style.name === 'Разделитель') {

      wrapper.textContent =
        style.defaultText;

      block.replaceWith(wrapper);

    } else {

      block.parentNode.insertBefore(wrapper, block);

      wrapper.appendChild(block);

    }

    input.value = preview.innerHTML;

    updateWordCount();
    updateOutput();

    showToast(`Блок «${style.name}» добавлен`);
  }


  /* ==========================================================
     INPUT
     ========================================================== */

  input?.addEventListener('input', () => {

    /*
     * --- → —
     */

    const position =
      input.selectionStart;

    const oldValue =
      input.value;

    const newValue =
      replaceTripleDash(oldValue);

    if (newValue !== oldValue) {

      input.value = newValue;

      /*
       * Стараемся сохранить позицию курсора.
       */
      const difference =
        oldValue.length - newValue.length;

      input.setSelectionRange(
        Math.max(0, position - difference),
        Math.max(0, position - difference)
      );
    }

    updatePreview();

  });


  /* ==========================================================
     META INPUT
     ========================================================== */

  Object.values(meta).forEach(field => {

    field?.addEventListener('input', () => {
      updateOutput();
    });

  });


  /* ==========================================================
     COPY
     ========================================================== */

  async function copyHtml() {

    const html = buildExportHtml();

    if (!html) {
      showToast('Пока нечего копировать.');
      return;
    }

    try {

      await navigator.clipboard.writeText(html);

      showToast('HTML скопирован в буфер.');

    } catch (error) {

      /*
       * Fallback для браузеров,
       * где clipboard API недоступен.
       */

      const helper =
        document.createElement('textarea');

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


  document
    .querySelectorAll('[data-editor-copy]')
    .forEach(button => {

      button.addEventListener('click', copyHtml);

    });


  /* ==========================================================
     ОЧИСТИТЬ
     ========================================================== */

  document
    .querySelector('[data-editor-clear]')
    ?.addEventListener('click', () => {

      if (!confirm('Очистить текст главы?')) {
        return;
      }

      input.value = '';

      updatePreview();

      showToast('Редактор очищен.');

    });


  /* ==========================================================
     ДЕМО
     ========================================================== */

  document
    .querySelector('[data-editor-load-demo]')
    ?.addEventListener('click', () => {

      input.value = `<p>Кеннет остановился посреди комнаты.</p>

<p>Он медленно поднял голову.</p>

<p><span class="fx-whisper">Я не знаю, что происходит…</span></p>

<div class="scene-divider">✦ ✧ ✦</div>

<p><span class="fx-echo">Кто ты такой?</span></p>

<p><span class="shake-slow">Не подходи.</span></p>

<p><span class="fading-text--deep">Некоторые вещи лучше не замечать.</span></p>`;

      meta.act.value = 'Акт I. Валтасаров пир';
      meta.number.value = 'Глава 1.7.';
      meta.title.value = 'О вере и доверии';

      updatePreview();

      showToast('Демонстрационный текст загружен.');

    });


  /* ==========================================================
     TAB → SHIFT+TAB И TAB В TEXTAREA
     ========================================================== */

  input?.addEventListener('keydown', event => {

    if (event.key !== 'Tab') {
      return;
    }

    event.preventDefault();

    const start = input.selectionStart;
    const end = input.selectionEnd;

    input.setRangeText(
      '  ',
      start,
      end,
      'end'
    );

  });


  /* ==========================================================
     ИНИЦИАЛИЗАЦИЯ
     ========================================================== */

  renderStyles();

  updatePreview();

  makePreviewEditable();

});

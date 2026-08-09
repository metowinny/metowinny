document.addEventListener('DOMContentLoaded', () => {
  const reader = document.querySelector('.reader');

  if (!reader) return;

  /*
   * ============================================================
   * SUPABASE
   * ============================================================
   */

  const SUPABASE_URL = 'https://ddbmiiykenyxfjfwkuqu.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_u3IsDvF2vJ6eeBy5La5Hng_Zvav-3fB';

  let accessToken = null;
  let currentUserId = null;

  /*
   * ============================================================
   * СОСТОЯНИЕ
   * ============================================================
   */

  let selectionToolbar = null;
  let currentSelection = null;
  let isSendingReaction = false;

  /*
   * ============================================================
   * АНОНИМНЫЙ ВХОД
   * ============================================================
   */

  async function signInAnonymously() {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/auth/v1/signup`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error_description ||
          data.msg ||
          data.message ||
          'Не удалось выполнить анонимный вход.'
        );
      }

      accessToken = data.access_token;
      currentUserId = data.user?.id || null;

      if (!accessToken || !currentUserId) {
        throw new Error('Supabase не вернул данные пользователя.');
      }

      console.log('[Comments] Анонимный вход выполнен.');

    } catch (error) {
      console.error('[Comments] Ошибка анонимного входа:', error);
    }
  }

  /*
   * ============================================================
   * ПУТЬ ГЛАВЫ
   * ============================================================
   */

  function getChapterPath() {
    return window.location.pathname;
  }

  /*
   * ============================================================
   * КОНТЕКСТ ВОКРУГ ВЫДЕЛЕНИЯ
   * ============================================================
   */

  function getSelectionContext(range) {
    const container = range.commonAncestorContainer;

    let element = container.nodeType === Node.ELEMENT_NODE
      ? container
      : container.parentElement;

    if (!element) {
      return {
        before: '',
        after: ''
      };
    }

    const paragraph = element.closest(
      'p, blockquote, .epigraph, .scene-divider, li, h2, h3, h4'
    );

    if (!paragraph) {
      return {
        before: '',
        after: ''
      };
    }

    const fullText = paragraph.textContent || '';
    const selectedText = range.toString().trim();

    const startIndex = fullText.indexOf(selectedText);

    if (startIndex === -1) {
      return {
        before: fullText.slice(0, 100),
        after: fullText.slice(-100)
      };
    }

    return {
      before: fullText.slice(
        Math.max(0, startIndex - 100),
        startIndex
      ),

      after: fullText.slice(
        startIndex + selectedText.length,
        startIndex + selectedText.length + 100
      )
    };
  }

  /*
   * ============================================================
   * СОХРАНЕНИЕ ВЫДЕЛЕНИЯ
   * ============================================================
   */

  function updateCurrentSelection() {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
      return false;
    }

    const text = selection.toString().trim();

    if (!text) {
      return false;
    }

    const range = selection.getRangeAt(0);

    if (!reader.contains(range.commonAncestorContainer)) {
      return false;
    }

    const rect = range.getBoundingClientRect();

    if (!rect || (rect.width === 0 && rect.height === 0)) {
      return false;
    }

    currentSelection = {
      text,
      range,
      ...getSelectionContext(range),
      chapterPath: getChapterPath(),
      rect
    };

    return true;
  }

  /*
   * ============================================================
   * ПОДСВЕТКА
   * ============================================================
   */

  function highlightSelection(range) {
    if (!range) return;

    const fragment = range.cloneContents();

    const wrapper = document.createElement('span');

    wrapper.className = 'comment-highlight';

    wrapper.appendChild(fragment);

    range.deleteContents();
    range.insertNode(wrapper);
  }

  /*
   * ============================================================
   * ПАНЕЛЬ ВЫДЕЛЕНИЯ
   * ============================================================
   */

  function removeToolbar() {
    if (selectionToolbar) {
      selectionToolbar.remove();
      selectionToolbar = null;
    }
  }

  function createToolbar(rect) {
    removeToolbar();

    const toolbar = document.createElement('div');

    toolbar.className = 'comment-selection-toolbar';

    toolbar.innerHTML = `
      <button
        type="button"
        class="comment-selection-toolbar__reaction"
        data-reaction="heart"
        title="Нравится"
      >💜</button>

      <button
        type="button"
        class="comment-selection-toolbar__reaction"
        data-reaction="laugh"
        title="Смешно"
      >😂</button>

      <button
        type="button"
        class="comment-selection-toolbar__reaction"
        data-reaction="cry"
        title="Больно"
      >😭</button>

      <button
        type="button"
        class="comment-selection-toolbar__reaction"
        data-reaction="eyes"
        title="Что происходит"
      >👀</button>

      <span class="comment-selection-toolbar__divider"></span>

      <button
        type="button"
        class="comment-selection-toolbar__comment"
      >
        <span>💬</span>
        <span>Добавить комментарий</span>
      </button>
    `;

    document.body.appendChild(toolbar);

    const toolbarWidth = toolbar.offsetWidth;
    const toolbarHeight = toolbar.offsetHeight;

    let left = rect.left + rect.width / 2 - toolbarWidth / 2;
    let top = rect.top - toolbarHeight - 12;

    const padding = 12;

    left = Math.max(
      padding,
      Math.min(
        left,
        window.innerWidth - toolbarWidth - padding
      )
    );

    if (top < padding) {
      top = rect.bottom + 12;
    }

    toolbar.style.left = `${left}px`;
    toolbar.style.top = `${top}px`;

    requestAnimationFrame(() => {
      toolbar.classList.add('is-visible');
    });

    selectionToolbar = toolbar;
  }

  function handleSelection() {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
      removeToolbar();
      return;
    }

    const text = selection.toString().trim();

    if (!text) {
      removeToolbar();
      return;
    }

    const range = selection.getRangeAt(0);

    if (!reader.contains(range.commonAncestorContainer)) {
      removeToolbar();
      return;
    }

    const rect = range.getBoundingClientRect();

    if (!rect || (rect.width === 0 && rect.height === 0)) {
      removeToolbar();
      return;
    }

    currentSelection = {
      text,
      range,
      ...getSelectionContext(range),
      chapterPath: getChapterPath(),
      rect
    };

    createToolbar(rect);
  }

  /*
   * ============================================================
   * СОЗДАНИЕ АННОТАЦИИ
   * ============================================================
   */

  async function createAnnotation() {
    if (!accessToken || !currentUserId) {
      throw new Error('Пользователь ещё не авторизован.');
    }

    if (!currentSelection) {
      throw new Error('Не найдено выделение текста.');
    }

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/comments`,
      {
        method: 'POST',

        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },

        body: JSON.stringify({
          chapter_path: currentSelection.chapterPath,
          selected_text: currentSelection.text,
          context_before: currentSelection.before,
          context_after: currentSelection.after,
          content: null,
          user_id: currentUserId,
          status: 'active',
          is_error_report: false
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
        data.error_description ||
        'Не удалось создать аннотацию.'
      );
    }

    return data[0];
  }

  /*
   * ============================================================
   * РЕАКЦИЯ 💜
   * ============================================================
   */

  async function addHeartReaction(button) {
    if (isSendingReaction) return;

    if (!currentSelection) {
      return;
    }

    isSendingReaction = true;

    button.disabled = true;
    button.classList.add('is-loading');

    try {
      if (!accessToken || !currentUserId) {
        await signInAnonymously();
      }

      if (!accessToken || !currentUserId) {
        throw new Error(
          'Не удалось подключиться к системе комментариев.'
        );
      }

      const annotation = await createAnnotation();

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/reactions`,
        {
          method: 'POST',

          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },

          body: JSON.stringify({
            comment_id: annotation.id,
            user_id: currentUserId,
            reaction_type: 'heart'
          })
        }
      );

      const data = await response.text();

      if (!response.ok) {
        throw new Error(
          data || 'Не удалось сохранить реакцию.'
        );
      }

      /*
       * Сразу подсвечиваем выбранный текст.
       */

      highlightSelection(currentSelection.range);

      button.classList.remove('is-loading');
      button.classList.add('is-selected');

      setTimeout(() => {
        removeToolbar();
        window.getSelection()?.removeAllRanges();
        currentSelection = null;
      }, 300);

      console.log(
        '[Comments] 💜 сохранено:',
        annotation.selected_text
      );

    } catch (error) {
      console.error(
        '[Comments] Ошибка сохранения реакции:',
        error
      );

      button.disabled = false;
      button.classList.remove('is-loading');

      button.title = 'Не удалось сохранить';

    } finally {
      isSendingReaction = false;
    }
  }

  /*
   * ============================================================
   * ЗАГРУЗКА СОХРАНЁННЫХ АННОТАЦИЙ
   * ============================================================
   */

  async function loadSavedHighlights() {
    if (!accessToken) return;

    try {
      const chapterPath = encodeURIComponent(
        getChapterPath()
      );

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/comments?chapter_path=eq.${chapterPath}&status=eq.active&select=id,selected_text,context_before,context_after`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      const annotations = await response.json();

      if (!response.ok) {
        throw new Error(
          annotations.message ||
          'Не удалось загрузить аннотации.'
        );
      }

      annotations.forEach(annotation => {
        highlightSavedText(annotation);
      });

    } catch (error) {
      console.error(
        '[Comments] Ошибка загрузки подсветок:',
        error
      );
    }
  }

  /*
   * ============================================================
   * ПОИСК СОХРАНЁННОГО ТЕКСТА
   * ============================================================
   */

  function highlightSavedText(annotation) {
    const target = annotation.selected_text;

    if (!target) return;

    const walker = document.createTreeWalker(
      reader,
      NodeFilter.SHOW_TEXT
    );

    let node;

    while (node = walker.nextNode()) {
      const text = node.nodeValue;

      const index = text.indexOf(target);

      if (index === -1) continue;

      /*
       * Уже подсвечено.
       */

      if (
        node.parentElement &&
        node.parentElement.closest('.comment-highlight')
      ) {
        continue;
      }

      const range = document.createRange();

      range.setStart(node, index);
      range.setEnd(
        node,
        index + target.length
      );

      highlightSelection(range);

      break;
    }
  }

  /*
   * ============================================================
   * СОБЫТИЯ
   * ============================================================
   */

  document.addEventListener(
    'selectionchange',
    handleSelection
  );

  document.addEventListener(
    'mousedown',
    event => {
      if (
        selectionToolbar &&
        !selectionToolbar.contains(event.target)
      ) {
        const selection = window.getSelection();

        if (
          !selection ||
          !selection.toString().trim()
        ) {
          removeToolbar();
          currentSelection = null;
        }
      }
    }
  );

  document.addEventListener(
    'click',
    event => {
      const reactionButton =
        event.target.closest(
          '.comment-selection-toolbar__reaction[data-reaction="heart"]'
        );

      if (reactionButton) {
        addHeartReaction(reactionButton);
      }
    }
  );

  window.addEventListener(
    'scroll',
    removeToolbar,
    { passive: true }
  );

  window.addEventListener(
    'resize',
    removeToolbar
  );

  /*
   * ============================================================
   * ЗАПУСК
   * ============================================================
   */

  async function init() {
    await signInAnonymously();

    await loadSavedHighlights();
  }

  init();
});

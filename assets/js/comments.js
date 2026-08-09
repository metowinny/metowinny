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
  let refreshToken = null;

  /*
   * ============================================================
   * РЕАКЦИИ
   * ============================================================
   */

  const REACTIONS = {
    heart: {
      emoji: '💜',
      title: 'Нравится'
    },
    laugh: {
      emoji: '😂',
      title: 'Смешно'
    },
    cry: {
      emoji: '😭',
      title: 'Больно'
    },
    eyes: {
      emoji: '👀',
      title: 'Что происходит'
    },
    wow: {
      emoji: '😮',
      title: 'Удивило'
    }
  };

  /*
   * ============================================================
   * СОСТОЯНИЕ
   * ============================================================
   */

  let selectionToolbar = null;
  let currentSelection = null;
  let isSendingReaction = false;

  const annotationsById = new Map();

  /*
   * ============================================================
   * АНОНИМНЫЙ ВХОД
   * ============================================================
   */

  function saveSession(data) {
    accessToken = data.access_token || null;
    refreshToken = data.refresh_token || null;
    currentUserId = data.user?.id || data.user_id || null;

    if (
      accessToken &&
      refreshToken &&
      currentUserId
    ) {
      localStorage.setItem(
        'null-tribunal-comments-session',
        JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken,
          user_id: currentUserId
        })
      );
    }
  }

  async function restoreSession() {
    try {
      const raw =
        localStorage.getItem(
          'null-tribunal-comments-session'
        );

      if (!raw) return false;

      const saved = JSON.parse(raw);

      if (
        !saved.refresh_token ||
        !saved.user_id
      ) {
        return false;
      }

      const response = await fetch(
        `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            refresh_token: saved.refresh_token
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        localStorage.removeItem(
          'null-tribunal-comments-session'
        );
        return false;
      }

      saveSession(data);

      console.log(
        '[Comments] Сохранённая анонимная сессия восстановлена.'
      );

      return true;

    } catch (error) {
      console.error(
        '[Comments] Ошибка восстановления сессии:',
        error
      );

      return false;
    }
  }

  async function signInAnonymously() {
    if (
      accessToken &&
      currentUserId
    ) {
      return true;
    }

    if (await restoreSession()) {
      return true;
    }

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

      saveSession(data);

      if (
        !accessToken ||
        !currentUserId
      ) {
        throw new Error(
          'Supabase не вернул данные пользователя.'
        );
      }

      console.log(
        '[Comments] Новый анонимный вход выполнен.'
      );

      return true;

    } catch (error) {
      console.error(
        '[Comments] Ошибка анонимного входа:',
        error
      );

      return false;
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
    const container =
      range.commonAncestorContainer;

    let element =
      container.nodeType === Node.ELEMENT_NODE
        ? container
        : container.parentElement;

    if (!element) {
      return {
        before: '',
        after: ''
      };
    }

    const paragraph =
      element.closest(
        'p, blockquote, .epigraph, .scene-divider, li, h2, h3, h4'
      );

    if (!paragraph) {
      return {
        before: '',
        after: ''
      };
    }

    const fullText =
      paragraph.textContent || '';

    const selectedText =
      range.toString().trim();

    const startIndex =
      fullText.indexOf(selectedText);

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
   * СОХРАНЕНИЕ ТЕКУЩЕГО ВЫДЕЛЕНИЯ
   * ============================================================
   */

  function updateCurrentSelection() {
    const selection =
      window.getSelection();

    if (
      !selection ||
      selection.rangeCount === 0
    ) {
      return false;
    }

    const text =
      selection.toString().trim();

    if (!text) {
      return false;
    }

    const range =
      selection.getRangeAt(0);

    if (
      !reader.contains(
        range.commonAncestorContainer
      )
    ) {
      return false;
    }

    const rect =
      range.getBoundingClientRect();

    if (
      !rect ||
      (rect.width === 0 &&
       rect.height === 0)
    ) {
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

  function highlightSelection(
    range,
    commentId = null
  ) {
    if (!range) return null;

    const fragment =
      range.cloneContents();

    const wrapper =
      document.createElement('span');

    wrapper.className =
      'comment-highlight';

    if (commentId) {
      wrapper.dataset.commentId =
        commentId;
    }

    wrapper.appendChild(fragment);

    range.deleteContents();
    range.insertNode(wrapper);

    return wrapper;
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

    const toolbar =
      document.createElement('div');

    toolbar.className =
      'comment-selection-toolbar';

    toolbar.innerHTML = `
      ${Object.entries(REACTIONS).map(
        ([type, reaction]) => `
          <button
            type="button"
            class="comment-selection-toolbar__reaction"
            data-reaction="${type}"
            title="${reaction.title}"
          >${reaction.emoji}</button>
        `
      ).join('')}

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

    const toolbarWidth =
      toolbar.offsetWidth;

    const toolbarHeight =
      toolbar.offsetHeight;

    let left =
      rect.left +
      rect.width / 2 -
      toolbarWidth / 2;

    let top =
      rect.top -
      toolbarHeight -
      12;

    const padding = 12;

    left = Math.max(
      padding,
      Math.min(
        left,
        window.innerWidth -
        toolbarWidth -
        padding
      )
    );

    if (top < padding) {
      top =
        rect.bottom +
        12;
    }

    toolbar.style.left =
      `${left}px`;

    toolbar.style.top =
      `${top}px`;

    requestAnimationFrame(() => {
      toolbar.classList.add(
        'is-visible'
      );
    });

    selectionToolbar = toolbar;
  }

  function handleSelection() {
    const selection =
      window.getSelection();

    if (
      !selection ||
      selection.rangeCount === 0
    ) {
      removeToolbar();
      return;
    }

    const text =
      selection.toString().trim();

    if (!text) {
      removeToolbar();
      return;
    }

    const range =
      selection.getRangeAt(0);

    if (
      !reader.contains(
        range.commonAncestorContainer
      )
    ) {
      removeToolbar();
      return;
    }

    const rect =
      range.getBoundingClientRect();

    if (
      !rect ||
      (rect.width === 0 &&
       rect.height === 0)
    ) {
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
   * ПОИСК СУЩЕСТВУЮЩЕЙ АННОТАЦИИ
   * ============================================================
   */

  async function findExistingAnnotation(
    selection
  ) {
    if (!selection) return null;

    const chapterPath =
      encodeURIComponent(
        selection.chapterPath
      );

    const selectedText =
      encodeURIComponent(
        selection.text
      );

    try {
      const response =
        await fetch(
          `${SUPABASE_URL}/rest/v1/comments?chapter_path=eq.${chapterPath}&selected_text=eq.${selectedText}&status=eq.active&select=id,selected_text,context_before,context_after`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization':
                `Bearer ${accessToken}`
            }
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          'Не удалось найти аннотацию.'
        );
      }

      if (!Array.isArray(data)) {
        return null;
      }

      const exact =
        data.find(annotation =>
          annotation.context_before ===
            selection.before &&
          annotation.context_after ===
            selection.after
        );

      const annotation =
        exact || data[0] || null;

      if (annotation) {
        annotationsById.set(
          annotation.id,
          annotation
        );
      }

      return annotation;

    } catch (error) {
      console.error(
        '[Comments] Ошибка поиска аннотации:',
        error
      );

      return null;
    }
  }

  /*
   * ============================================================
   * СОЗДАНИЕ АННОТАЦИИ
   * ============================================================
   */

  async function createAnnotation(
    selection = currentSelection
  ) {
    if (
      !accessToken ||
      !currentUserId
    ) {
      throw new Error(
        'Пользователь ещё не авторизован.'
      );
    }

    if (!selection) {
      throw new Error(
        'Не найдено выделение текста.'
      );
    }

    const response =
      await fetch(
        `${SUPABASE_URL}/rest/v1/comments`,
        {
          method: 'POST',

          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization':
              `Bearer ${accessToken}`,
            'Content-Type':
              'application/json',
            'Prefer':
              'return=representation'
          },

          body: JSON.stringify({
            chapter_path:
              selection.chapterPath,

            selected_text:
              selection.text,

            context_before:
              selection.before,

            context_after:
              selection.after,

            content: null,

            user_id:
              currentUserId,

            status: 'active',

            is_error_report:
              false
          })
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
        data.error_description ||
        'Не удалось создать аннотацию.'
      );
    }

    const annotation =
      data[0];

    annotationsById.set(
      annotation.id,
      annotation
    );

    return annotation;
  }

  /*
   * ============================================================
   * ПОЛУЧЕНИЕ РЕАКЦИЙ
   * ============================================================
   */

  async function getReactions(
    commentId
  ) {
    const response =
      await fetch(
        `${SUPABASE_URL}/rest/v1/reactions?comment_id=eq.${encodeURIComponent(commentId)}&select=id,user_id,reaction_type`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization':
              `Bearer ${accessToken}`
          }
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
        'Не удалось получить реакции.'
      );
    }

    return Array.isArray(data)
      ? data
      : [];
  }

  function buildReactionState(
    reactions
  ) {
    const state = {};

    for (const type of Object.keys(
      REACTIONS
    )) {
      state[type] = {
        count: 0,
        mine: false
      };
    }

    for (const reaction of reactions) {
      if (!state[reaction.reaction_type]) {
        continue;
      }

      state[
        reaction.reaction_type
      ].count++;

      if (
        reaction.user_id ===
        currentUserId
      ) {
        state[
          reaction.reaction_type
        ].mine = true;
      }
    }

    return state;
  }

  /*
   * ============================================================
   * ПОЛУЧЕНИЕ РЕАКЦИИ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ
   * ============================================================
   */

  async function getMyReaction(
    commentId,
    reactionType
  ) {
    const response =
      await fetch(
        `${SUPABASE_URL}/rest/v1/reactions?comment_id=eq.${encodeURIComponent(commentId)}&user_id=eq.${encodeURIComponent(currentUserId)}&reaction_type=eq.${encodeURIComponent(reactionType)}&select=id`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization':
              `Bearer ${accessToken}`
          }
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
        'Не удалось проверить реакцию.'
      );
    }

    return Array.isArray(data)
      ? data[0] || null
      : null;
  }

  /*
   * ============================================================
   * ДОБАВЛЕНИЕ РЕАКЦИИ
   * ============================================================
   */

  async function insertReaction(
    commentId,
    reactionType
  ) {
    const response =
      await fetch(
        `${SUPABASE_URL}/rest/v1/reactions`,
        {
          method: 'POST',

          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization':
              `Bearer ${accessToken}`,
            'Content-Type':
              'application/json',
            'Prefer':
              'return=representation'
          },

          body: JSON.stringify({
            comment_id:
              commentId,

            user_id:
              currentUserId,

            reaction_type:
              reactionType
          })
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
        data.details ||
        'Не удалось сохранить реакцию.'
      );
    }

    return data[0] || null;
  }

  /*
   * ============================================================
   * УДАЛЕНИЕ РЕАКЦИИ
   * ============================================================
   */

  async function deleteReaction(
    reactionId
  ) {
    const response =
      await fetch(
        `${SUPABASE_URL}/rest/v1/reactions?id=eq.${encodeURIComponent(reactionId)}`,
        {
          method: 'DELETE',

          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization':
              `Bearer ${accessToken}`
          }
        }
      );

    if (!response.ok) {
      const data =
        await response.text();

      throw new Error(
        data ||
        'Не удалось убрать реакцию.'
      );
    }
  }

  /*
   * ============================================================
   * МАРКЕР
   * ============================================================
   */

  function getMarker(
    commentId
  ) {
    return document.querySelector(
      `.comment-reaction-marker[data-comment-id="${CSS.escape(commentId)}"]`
    );
  }

  function createReactionMarker(
    annotation,
    reactionState,
    highlight
  ) {
    if (!highlight) {
      return null;
    }

    let marker =
      getMarker(annotation.id);

    if (!marker) {
      marker =
        document.createElement('div');

      marker.className =
        'comment-reaction-marker';

      marker.dataset.commentId =
        annotation.id;

      document.body.appendChild(
        marker
      );

      requestAnimationFrame(() => {
        marker.classList.add(
          'is-visible'
        );
      });
    }

    marker.innerHTML = '';

    let visibleCount = 0;

    for (
      const [type, reaction] of
      Object.entries(REACTIONS)
    ) {
      const item =
        reactionState[type];

      if (!item || item.count <= 0) {
        continue;
      }

      visibleCount += 1;

      const button =
        document.createElement('button');

      button.type = 'button';

      button.className =
        'comment-reaction-marker__item';

      if (item.mine) {
        button.classList.add(
          'is-mine'
        );
      }

      button.dataset.reaction =
        type;

      button.title =
        `${reaction.title}: ${item.count}`;

      button.innerHTML = `
        <span class="comment-reaction-marker__emoji">${reaction.emoji}</span>
        <span class="comment-reaction-marker__count">${item.count}</span>
      `;

      marker.appendChild(button);
    }

    if (visibleCount === 0) {
  marker.remove();

  const highlight =
    document.querySelector(
      `.comment-highlight[data-comment-id="${CSS.escape(annotation.id)}"]`
    );

  if (highlight) {
    const parent =
      highlight.parentNode;

    while (highlight.firstChild) {
      parent.insertBefore(
        highlight.firstChild,
        highlight
      );
    }

    highlight.remove();
  }

  annotationsById.delete(
    annotation.id
  );

  return null;
}

repositionMarkers();

    return marker;
  }

  function positionReactionMarker(
    marker,
    highlight
  ) {
    if (!marker || !highlight) {
      return;
    }

    const highlightRect =
      highlight.getBoundingClientRect();

    const readerRect =
      reader.getBoundingClientRect();

    const scrollX =
      window.scrollX;

    const scrollY =
      window.scrollY;

    const gap = 18;

    const left =
      readerRect.right +
      scrollX +
      gap;

    const top =
      highlightRect.top +
      scrollY +
      highlightRect.height / 2 -
      marker.offsetHeight / 2;

    marker.style.left =
      `${left}px`;

    marker.style.top =
      `${top}px`;
  }

  /*
   * ============================================================
   * ОБНОВЛЕНИЕ МАРКЕРА
   * ============================================================
   */

  async function refreshAnnotationMarker(
    annotation,
    highlight = null
  ) {
    try {
      const reactions =
        await getReactions(
          annotation.id
        );

      const state =
        buildReactionState(
          reactions
        );

      annotation.reactionState =
        state;

      const actualHighlight =
        highlight ||
        document.querySelector(
          `.comment-highlight[data-comment-id="${CSS.escape(annotation.id)}"]`
        );

      if (!actualHighlight) {
        return;
      }

      createReactionMarker(
        annotation,
        state,
        actualHighlight
      );

    } catch (error) {
      console.error(
        '[Comments] Ошибка обновления маркера:',
        error
      );
    }
  }

  /*
   * ============================================================
   * ПЕРЕКЛЮЧЕНИЕ РЕАКЦИИ
   * ============================================================
   */

  async function toggleReaction(
    annotation,
    reactionType,
    highlight = null,
    button = null
  ) {
    if (
      isSendingReaction ||
      !annotation ||
      !REACTIONS[reactionType]
    ) {
      return;
    }

    isSendingReaction = true;

    if (button) {
      button.disabled = true;
      button.classList.add(
        'is-loading'
      );
    }

    try {
      if (
        !accessToken ||
        !currentUserId
      ) {
        const signedIn =
          await signInAnonymously();

        if (!signedIn) {
          throw new Error(
            'Не удалось подключиться к системе комментариев.'
          );
        }
      }

      const mine =
        await getMyReaction(
          annotation.id,
          reactionType
        );

      if (mine) {
        await deleteReaction(
          mine.id
        );
      } else {
        await insertReaction(
          annotation.id,
          reactionType
        );
      }

      await refreshAnnotationMarker(
        annotation,
        highlight
      );

      console.log(
        `[Comments] ${REACTIONS[reactionType].emoji} ${
          mine ? 'убрано' : 'сохранено'
        }:`,
        annotation.selected_text
      );

    } catch (error) {
      console.error(
        '[Comments] Ошибка переключения реакции:',
        error
      );

      if (button) {
        button.title =
          'Не удалось изменить реакцию';
      }

    } finally {
      if (button) {
        button.disabled = false;
        button.classList.remove(
          'is-loading'
        );
      }

      isSendingReaction = false;
    }
  }

  /*
   * ============================================================
   * ПОДСВЕТКА СОХРАНЁННОГО ТЕКСТА
   * ============================================================
   */

  function highlightSavedText(
    annotation
  ) {
    const target =
      annotation.selected_text;

    if (!target) {
      return null;
    }

    const existing =
      document.querySelector(
        `.comment-highlight[data-comment-id="${CSS.escape(annotation.id)}"]`
      );

    if (existing) {
      return existing;
    }

    const walker =
      document.createTreeWalker(
        reader,
        NodeFilter.SHOW_TEXT
      );

    let node;

    while (
      node = walker.nextNode()
    ) {
      const text =
        node.nodeValue;

      const index =
        text.indexOf(target);

      if (index === -1) {
        continue;
      }

      if (
        node.parentElement &&
        node.parentElement.closest(
          '.comment-highlight'
        )
      ) {
        continue;
      }

      const range =
        document.createRange();

      range.setStart(
        node,
        index
      );

      range.setEnd(
        node,
        index + target.length
      );

      return highlightSelection(
        range,
        annotation.id
      );
    }

    return null;
  }

  /*
   * ============================================================
   * ЗАГРУЗКА СОХРАНЁННЫХ АННОТАЦИЙ
   * ============================================================
   */

  async function loadSavedHighlights() {
    if (!accessToken) {
      return;
    }

    try {
      const chapterPath =
        encodeURIComponent(
          getChapterPath()
        );

      const response =
        await fetch(
          `${SUPABASE_URL}/rest/v1/comments?chapter_path=eq.${chapterPath}&status=eq.active&select=id,selected_text,context_before,context_after`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization':
                `Bearer ${accessToken}`
            }
          }
        );

      const annotations =
        await response.json();

      if (!response.ok) {
        throw new Error(
          annotations.message ||
          'Не удалось загрузить аннотации.'
        );
      }

      if (!Array.isArray(
        annotations
      )) {
        return;
      }

      for (
        const annotation of
        annotations
      ) {
        annotationsById.set(
          annotation.id,
          annotation
        );

        const highlight =
          highlightSavedText(
            annotation
          );

        if (!highlight) {
          continue;
        }

        await refreshAnnotationMarker(
          annotation,
          highlight
        );
      }

    } catch (error) {
      console.error(
        '[Comments] Ошибка загрузки подсветок:',
        error
      );
    }
  }

  /*
   * ============================================================
   * ОБРАБОТКА РЕАКЦИИ ИЗ ПАНЕЛИ
   * ============================================================
   */

  async function handleSelectionReaction(
    button
  ) {
    if (
      !currentSelection ||
      isSendingReaction
    ) {
      return;
    }

    const reactionType =
      button.dataset.reaction;

    if (!REACTIONS[reactionType]) {
      return;
    }

    button.disabled = true;
    button.classList.add(
      'is-loading'
    );

    try {
      if (
        !accessToken ||
        !currentUserId
      ) {
        const signedIn =
          await signInAnonymously();

        if (!signedIn) {
          throw new Error(
            'Не удалось подключиться к системе комментариев.'
          );
        }
      }

      const selection =
        currentSelection;

      let annotation =
        await findExistingAnnotation(
          selection
        );

      if (!annotation) {
        annotation =
          await createAnnotation(
            selection
          );
      }

      let highlight =
        document.querySelector(
          `.comment-highlight[data-comment-id="${CSS.escape(annotation.id)}"]`
        );

      if (!highlight) {
        highlight =
          highlightSelection(
            selection.range,
            annotation.id
          );
      }

      await toggleReaction(
        annotation,
        reactionType,
        highlight,
        button
      );

      removeToolbar();

      window
        .getSelection()
        ?.removeAllRanges();

      currentSelection = null;

    } catch (error) {
      console.error(
        '[Comments] Ошибка реакции:',
        error
      );

      button.title =
        'Не удалось сохранить реакцию';

    } finally {
      button.disabled = false;
      button.classList.remove(
        'is-loading'
      );
    }
  }

  /*
   * ============================================================
   * КЛИК ПО МАРКЕРУ СПРАВА
   * ============================================================
   */

  async function handleMarkerClick(
    button
  ) {
    const marker =
      button.closest(
        '.comment-reaction-marker'
      );

    if (!marker) {
      return;
    }

    const commentId =
      marker.dataset.commentId;

    const reactionType =
      button.dataset.reaction;

    if (
      !commentId ||
      !REACTIONS[reactionType]
    ) {
      return;
    }

    const annotation =
      annotationsById.get(
        commentId
      );

    if (!annotation) {
      return;
    }

    const highlight =
      document.querySelector(
        `.comment-highlight[data-comment-id="${CSS.escape(commentId)}"]`
      );

    await toggleReaction(
      annotation,
      reactionType,
      highlight,
      button
    );
  }

  /*
   * ============================================================
   * ОБНОВЛЕНИЕ ПОЗИЦИИ МАРКЕРОВ
   * ============================================================
   */

function repositionMarkers() {
  const markers = Array.from(
    document.querySelectorAll('.comment-reaction-marker')
  );

  const items = [];

  /*
   * Сначала собираем маркер + соответствующую
   * ему подсветку и определяем реальную позицию.
   */

  markers.forEach(marker => {
    const commentId =
      marker.dataset.commentId;

    if (!commentId) return;

    const highlight =
      document.querySelector(
        `.comment-highlight[data-comment-id="${CSS.escape(commentId)}"]`
      );

    if (!highlight) return;

    const highlightRect =
      highlight.getBoundingClientRect();

    const readerRect =
      reader.getBoundingClientRect();

    const baseTop =
      highlightRect.top +
      window.scrollY +
      highlightRect.height / 2 -
      marker.offsetHeight / 2;

    const left =
      readerRect.right +
      window.scrollX +
      18;

    items.push({
      marker,
      highlight,
      left,
      baseTop,
      height: marker.offsetHeight
    });
  });

  /*
   * Важный момент:
   * раскладываем их по реальному положению текста,
   * а не по порядку появления в DOM.
   */

  items.sort(
    (a, b) =>
      a.baseTop - b.baseTop
  );

  const GAP = 10;

  const placed = [];

  items.forEach(item => {
    let top =
      item.baseTop;

    /*
     * Если новый маркер пересекается
     * с уже размещённым — отправляем его ниже.
     */

    for (const previous of placed) {
      const overlaps =
        top <
          previous.top +
          previous.height +
          GAP &&
        top +
          item.height +
          GAP >
          previous.top;

      if (overlaps) {
        top =
          previous.top +
          previous.height +
          GAP;
      }
    }

    item.marker.style.left =
      `${item.left}px`;

    item.marker.style.top =
      `${top}px`;

    placed.push({
      top,
      height: item.height
    });
  });
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
        !selectionToolbar.contains(
          event.target
        )
      ) {
        const selection =
          window.getSelection();

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
  async event => {

    const selectionReaction =
      event.target.closest(
        '.comment-selection-toolbar__reaction'
      );

    if (selectionReaction) {
      await handleSelectionReaction(
        selectionReaction
      );
      return;
    }


    // ========================================================
    // КНОПКА «ДОБАВИТЬ КОММЕНТАРИЙ»
    // ========================================================

    const commentButton =
      event.target.closest(
        '.comment-selection-toolbar__comment'
      );

    if (commentButton) {
      event.preventDefault();
      event.stopPropagation();

      if (!currentSelection) {
        return;
      }

      showCommentForm();

      return;
    }


    const markerReaction =
      event.target.closest(
        '.comment-reaction-marker__item'
      );

    if (markerReaction) {
      event.preventDefault();
      event.stopPropagation();

      await handleMarkerClick(
        markerReaction
      );
      return;
    }
  }
);

  window.addEventListener(
    'scroll',
    () => {
      removeToolbar();
    },
    { passive: true }
  );

  window.addEventListener(
    'resize',
    repositionMarkers
  );

/*
 * ============================================================
 * ФОРМА ДОБАВЛЕНИЯ КОММЕНТАРИЯ
 * ============================================================
 */

function showCommentForm() {

  if (!currentSelection) {
    return;
  }

  /*
   * Сохраняем выделение отдельно.
   * removeToolbar() ниже уничтожит только панель,
   * но само выделение браузера нам ещё понадобится.
   */

  const selectionData = {
    text:
      currentSelection.text,

    before:
      currentSelection.before,

    after:
      currentSelection.after,

    chapterPath:
      currentSelection.chapterPath
  };

  const selectionRect =
    currentSelection.rect;


  /*
   * Убираем панель реакций.
   */

  removeToolbar();


  /*
   * Если форма уже существует —
   * удаляем старую.
   */

  const oldForm =
    document.querySelector(
      '.comment-form'
    );

  if (oldForm) {
    oldForm.remove();
  }


  /*
   * Создаём форму.
   */

  const form =
    document.createElement('div');

  form.className =
    'comment-form';

  form.innerHTML = `
    <div class="comment-form__title">
      Добавить комментарий
    </div>

    <p class="comment-form__hint">
      Здесь можно оставить мысль,
      реакцию или сообщить об ошибке
      в тексте.
    </p>

    <textarea
      class="comment-form__textarea"
      placeholder="Что вы хотите сказать?"
      maxlength="2000"
    ></textarea>

    <div class="comment-form__options">
      <label class="comment-form__check">
        <input
          type="checkbox"
          class="comment-form__error-check"
          checked
        >

        <span>
          Сообщить об ошибке
        </span>
      </label>
    </div>

    <div class="comment-form__actions">

      <button
        type="button"
        class="comment-form__button comment-form__button--cancel"
      >
        Отмена
      </button>

      <button
        type="button"
        class="comment-form__button comment-form__button--submit"
      >
        Отправить
      </button>

    </div>

    <div
      class="comment-form__error"
      hidden
    ></div>
  `;

  document.body.appendChild(form);


  /*
   * Элементы формы.
   */

  const textarea =
    form.querySelector(
      '.comment-form__textarea'
    );

  const errorBox =
    form.querySelector(
      '.comment-form__error'
    );

  const cancelButton =
    form.querySelector(
      '.comment-form__button--cancel'
    );

  const submitButton =
    form.querySelector(
      '.comment-form__button--submit'
    );

  const errorCheck =
    form.querySelector(
      '.comment-form__error-check'
    );


  /*
   * Позиционирование формы
   * относительно выделенного текста.
   */

  const formWidth = 360;
  const padding = 12;

  let left =
    selectionRect.left +
    selectionRect.width / 2 -
    formWidth / 2;

  let top =
    selectionRect.bottom + 12;

  left =
    Math.max(
      padding,
      Math.min(
        left,
        window.innerWidth -
        formWidth -
        padding
      )
    );


  /*
   * Если снизу мало места —
   * показываем форму над выделением.
   */

  if (
    top + 300 >
    window.innerHeight
  ) {
    top =
      selectionRect.top -
      312;
  }

  form.style.left =
    `${left}px`;

  form.style.top =
    `${Math.max(12, top)}px`;


  /*
   * Плавное появление.
   */

  requestAnimationFrame(() => {

    form.classList.add(
      'is-visible'
    );

    textarea.focus();

  });


  /*
   * ОТМЕНА
   */

  cancelButton.addEventListener(
    'click',
    () => {

      form.classList.remove(
        'is-visible'
      );

      setTimeout(
        () => form.remove(),
        180
      );

    }
  );


  /*
   * ОТПРАВКА
   */

  submitButton.addEventListener(
    'click',
    async () => {

      const content =
        textarea.value.trim();

      if (!content) {
        textarea.focus();
        return;
      }

      submitButton.disabled =
        true;

      submitButton.textContent =
        'Отправка…';

      errorBox.hidden =
        true;


      try {

        /*
         * На всякий случай проверяем,
         * что анонимная сессия существует.
         */

        if (
          !accessToken ||
          !currentUserId
        ) {

          const signedIn =
            await signInAnonymously();

          if (!signedIn) {
            throw new Error(
              'Не удалось подключиться к системе комментариев.'
            );
          }

        }


        /*
         * Создаём комментарий.
         *
         * Используем ту же REST-схему,
         * которую уже использует createAnnotation().
         */

        const response =
          await fetch(
            `${SUPABASE_URL}/rest/v1/comments`,
            {
              method: 'POST',

              headers: {
                'apikey':
                  SUPABASE_KEY,

                'Authorization':
                  `Bearer ${accessToken}`,

                'Content-Type':
                  'application/json',

                'Prefer':
                  'return=representation'
              },

              body:
                JSON.stringify({

                  chapter_path:
                    selectionData.chapterPath,

                  selected_text:
                    selectionData.text,

                  context_before:
                    selectionData.before,

                  context_after:
                    selectionData.after,

                  content:
                    content,

                  user_id:
                    currentUserId,

                  status:
                    'active',

                  is_error_report:
                    errorCheck.checked

                })
            }
          );


        const data =
          await response.json();


        if (!response.ok) {

          throw new Error(
            data.message ||
            data.details ||
            data.error_description ||
            'Не удалось сохранить комментарий.'
          );

        }


        /*
         * Supabase возвращает массив,
         * потому что мы попросили
         * return=representation.
         */

        const annotation =
          data[0];


        if (!annotation) {
          throw new Error(
            'Supabase не вернул созданный комментарий.'
          );
        }


        /*
         * Сохраняем аннотацию
         * в локальное состояние.
         */

        annotationsById.set(
          annotation.id,
          annotation
        );


        /*
         * Подсвечиваем тот же текст,
         * к которому относится комментарий.
         */

        const currentRange =
          window.getSelection();

        let highlight = null;


        /*
         * Если выделение ещё существует —
         * используем его напрямую.
         */

        if (
          currentRange &&
          currentRange.rangeCount > 0
        ) {

          const range =
            currentRange.getRangeAt(0);

          if (
            reader.contains(
              range.commonAncestorContainer
            )
          ) {

            highlight =
              highlightSelection(
                range,
                annotation.id
              );

          }

        }


        /*
         * Если браузер уже потерял выделение,
         * пробуем найти текст заново.
         */

        if (!highlight) {

          highlight =
            highlightSavedText(
              annotation
            );

        }


        console.log(
          '[Comments] 💬 комментарий сохранён:',
          annotation
        );


        /*
         * Закрываем форму.
         */

        form.classList.remove(
          'is-visible'
        );

        setTimeout(
          () => form.remove(),
          180
        );


        /*
         * Очищаем браузерное выделение
         * и текущее состояние.
         */

        window
          .getSelection()
          ?.removeAllRanges();

        currentSelection =
          null;


      } catch (error) {

        console.error(
          '[Comments] Ошибка сохранения комментария:',
          error
        );

        errorBox.textContent =
          'Не удалось отправить комментарий. Попробуйте ещё раз.';

        errorBox.hidden =
          false;

        submitButton.disabled =
          false;

        submitButton.textContent =
          'Отправить';

      }

    }
  );

}
  
  /*
   * ============================================================
   * ЗАПУСК
   * ============================================================
   */

  async function init() {
    const signedIn =
      await signInAnonymously();

    if (!signedIn) {
      return;
    }

    await loadSavedHighlights();
  }

  init();
});

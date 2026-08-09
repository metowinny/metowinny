document.addEventListener('DOMContentLoaded', () => {
  const reader = document.querySelector('.reader');

  if (!reader) return;

  let selectionToolbar = null;

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
      <button type="button" class="comment-selection-toolbar__reaction" title="Нравится">💜</button>
      <button type="button" class="comment-selection-toolbar__reaction" title="Смешно">😂</button>
      <button type="button" class="comment-selection-toolbar__reaction" title="Больно">😭</button>
      <button type="button" class="comment-selection-toolbar__reaction" title="Что происходит">👀</button>
      <span class="comment-selection-toolbar__divider"></span>
      <button type="button" class="comment-selection-toolbar__comment">
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
      Math.min(left, window.innerWidth - toolbarWidth - padding)
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

    createToolbar(rect);
  }

  document.addEventListener('selectionchange', handleSelection);

  document.addEventListener('mousedown', (event) => {
    if (
      selectionToolbar &&
      !selectionToolbar.contains(event.target)
    ) {
      const selection = window.getSelection();

      if (!selection || !selection.toString().trim()) {
        removeToolbar();
      }
    }
  });

  window.addEventListener('scroll', removeToolbar, { passive: true });
  window.addEventListener('resize', removeToolbar);
});

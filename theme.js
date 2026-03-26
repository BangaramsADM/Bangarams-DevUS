// theme.js — Bangarams shared dark/light theme utility
// Include as first script on every page (before any CSS-dependent JS)
(function () {
  const KEY = 'bg_theme';

  function apply(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem(KEY, t);
  }

  function toggle() {
    apply(document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
  }

  function get() {
    return localStorage.getItem(KEY) || 'dark';
  }

  // Update all toggle button labels on the page
  function syncButtons() {
    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
      const cur = get();
      btn.textContent = cur === 'dark' ? '☀ Light' : '☾ Dark';
      btn.title = cur === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    });
  }

  function init() {
    apply(get());
    // Sync after DOM ready (buttons may not exist yet at script-parse time)
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', syncButtons);
    } else {
      syncButtons();
    }
  }

  window.THEME = { apply, toggle, get, syncButtons };
  init();
})();

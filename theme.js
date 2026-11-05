// Tema claro/escuro da doc. Começa pelo que a pessoa escolheu antes ou, na
// primeira visita, pelo tema do sistema. A classe `dark-mode` no <html> é a
// mesma que o Swagger UI usa, então a referência acompanha o resto da página.
(function () {
  var KEY = 'wascer-docs-theme';
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  var dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark-mode', dark);

  window.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('theme');
    if (!btn) return;
    function label() {
      var isDark = document.documentElement.classList.contains('dark-mode');
      btn.setAttribute('aria-label', isDark ? 'Usar tema claro' : 'Usar tema escuro');
      btn.title = btn.getAttribute('aria-label');
      btn.innerHTML = isDark
        ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
        : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
    }
    btn.addEventListener('click', function () {
      var isDark = document.documentElement.classList.toggle('dark-mode');
      try { localStorage.setItem(KEY, isDark ? 'dark' : 'light'); } catch (e) {}
      label();
    });
    label();
  });
})();

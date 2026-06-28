// Premium welcome screen — shown once per session before the home page reveals.
(function () {
  var el = document.getElementById('welcomeScreen');
  if (!el) return;

  var seen;
  try { seen = sessionStorage.getItem('eel_welcomed'); } catch (e) { seen = null; }

  if (seen) { el.parentNode && el.parentNode.removeChild(el); return; }

  document.documentElement.classList.add('welcome-lock');
  // Trigger entrance animation on next frame
  requestAnimationFrame(function () { el.classList.add('show'); });

  var dismissed = false;
  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    try { sessionStorage.setItem('eel_welcomed', '1'); } catch (e) {}
    el.classList.add('done');
    document.documentElement.classList.remove('welcome-lock');
    setTimeout(function () { el.parentNode && el.parentNode.removeChild(el); }, 900);
  }

  var btn = el.querySelector('.welcome-enter');
  if (btn) btn.addEventListener('click', dismiss);
  el.addEventListener('click', function (e) { if (e.target === el) dismiss(); });

  // Auto-reveal after the intro plays
  setTimeout(dismiss, 2800);
})();

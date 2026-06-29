// ============================================================
//  Enoch & Enoch Legal — front-end backend connector
//  ------------------------------------------------------------
//  The website pages (this HTML) can be hosted ANYWHERE — Netlify,
//  a custom domain, or the Railway server itself. But all LIVE data
//  — blog posts, cover images, contact messages, visitor analytics
//  and the admin dashboard — is served by the Node/Express API that
//  runs on RAILWAY.
//
//  When the site is on Netlify (a different origin than Railway),
//  the browser must call Railway directly. This file is the ONE place
//  that tells every page where that backend lives.
//
//  ┌──────────────────────────────────────────────────────────┐
//  │ 👉 DO THIS ONCE:  put your Railway app URL below          │
//  │    (the https://...up.railway.app address, no slash end). │
//  │    Leave it as-is only if the site is served by Railway.  │
//  └──────────────────────────────────────────────────────────┘
// ============================================================
(function () {
  // 1) Paste your Railway URL here, e.g.
  //    'https://enochlegal-production.up.railway.app'
  var RAILWAY_API_BASE = 'https://enochlegal-production-64d2.up.railway.app';

  function clean(u) {
    if (!u || typeof u !== 'string') return '';
    u = u.trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(u)) return '';
    if (/REPLACE-WITH-YOUR-RAILWAY-URL/i.test(u)) return ''; // placeholder not set yet
    return u;
  }

  // 2) Instant override with NO redeploy — handy for testing. In the browser
  //    console run:  localStorage.setItem('eel_api_base','https://your-app.up.railway.app')
  var override = '';
  try { override = localStorage.getItem('eel_api_base') || ''; } catch (e) {}

  // 3) Optional per-page override:  <meta name="eel-api-base" content="https://...">
  var meta = '';
  try {
    var m = document.querySelector('meta[name="eel-api-base"]');
    if (m) meta = m.getAttribute('content') || '';
  } catch (e) {}

  var base = clean(override) || clean(meta) || clean(RAILWAY_API_BASE);

  // If this page is already being served BY the backend host (same origin), use
  // relative requests — no need to go cross-origin to ourselves.
  try {
    if (base && location.origin.replace(/\/+$/, '') === base) base = '';
  } catch (e) {}

  window.EEL_API_BASE = base; // '' means same-origin

  window.EEL = {
    base: base,
    // Build a backend URL for an API path. Absolute URLs pass through unchanged.
    api: function (path) {
      path = path || '';
      if (/^https?:\/\//i.test(path)) return path;
      if (path.charAt(0) !== '/') path = '/' + path;
      return base + path;
    },
    // Absolutize an image URL so cover images load from the backend even when the
    // HTML is served from a different host. Cloudinary/data URIs pass through.
    img: function (url) {
      if (!url) return url;
      if (/^https?:\/\//i.test(url) || url.indexOf('data:') === 0) return url;
      if (url.charAt(0) !== '/') url = '/' + url;
      return base + url; // /uploads/x.jpg -> https://<railway>/uploads/x.jpg
    },
    // True when the site is served from a different origin than the API (e.g. Netlify).
    isRemote: function () { return !!base; }
  };
})();

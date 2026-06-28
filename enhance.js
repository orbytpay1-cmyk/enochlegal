// Progressive UI enhancement — nav scroll-state + gentle scroll reveal.
// Fully safe: if anything fails, content stays visible (reveal CSS only
// activates while the .js-on class is present).
(function () {
  document.documentElement.classList.add('js-on');

  function onReady(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  onReady(function () {
    // Mobile menu toggle (single owner across every page)
    var hamburger = document.querySelector('.hamburger');
    var navMenu = document.querySelector('.nav-menu');
    if (hamburger && navMenu) {
      hamburger.addEventListener('click', function () {
        navMenu.classList.toggle('active');
        hamburger.classList.toggle('active');
      });
      navMenu.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
          navMenu.classList.remove('active');
          hamburger.classList.remove('active');
        });
      });
    }

    // Sticky-nav scroll state (adds depth once you scroll)
    var nav = document.querySelector('.navbar');
    if (nav) {
      var onScroll = function () { nav.classList.toggle('scrolled', window.pageYOffset > 24); };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    // Scroll reveal — carousel cards are intentionally excluded (they have their own fade)
    var sel = '.section-header, .about-image, .about-text, .info-card, .principal-profile, ' +
              '.blog-preview-card, .blog-card, .blog-list-item, .contact-item, .contact-form';
    var nodes = Array.prototype.slice.call(document.querySelectorAll(sel));
    if (!nodes.length) return;

    if (!('IntersectionObserver' in window)) {
      nodes.forEach(function (n) { n.classList.add('reveal', 'in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    nodes.forEach(function (n, i) {
      n.classList.add('reveal');
      n.style.transitionDelay = (Math.min(i % 4, 3) * 60) + 'ms';
      io.observe(n);
    });

    // Safety net: if the observer never fires (edge cases), reveal everything after 1.6s
    setTimeout(function () {
      nodes.forEach(function (n) { if (!n.classList.contains('in')) n.classList.add('in'); });
    }, 1600);

    // Back-to-top button (timeless, unobtrusive)
    var toTop = document.createElement('button');
    toTop.className = 'to-top';
    toTop.type = 'button';
    toTop.setAttribute('aria-label', 'Back to top');
    toTop.innerHTML = '&uarr;';
    document.body.appendChild(toTop);
    toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    window.addEventListener('scroll', function () {
      toTop.classList.toggle('show', window.pageYOffset > 600);
    }, { passive: true });

    // Hidden admin entry: tap/click anywhere on the site 10 times quickly → password gate
    if (!/^\/admin/.test(window.location.pathname)) {
      var TOKEN_KEY = 'eel_admin_token';
      var gate = document.createElement('div');
      gate.className = 'admin-gate';
      gate.setAttribute('role', 'dialog');
      gate.setAttribute('aria-modal', 'true');
      gate.setAttribute('aria-label', 'Admin access');
      gate.innerHTML =
        '<div class="admin-gate-panel">' +
          '<button type="button" class="admin-gate-close" aria-label="Close">&times;</button>' +
          '<div class="admin-gate-mark">E&amp;E</div>' +
          '<h2>Admin Access</h2>' +
          '<p class="admin-gate-sub">Enter your access code to continue</p>' +
          '<div class="admin-gate-error" aria-live="polite"></div>' +
          '<form class="admin-gate-form">' +
            '<label for="adminGateCode">Access Code</label>' +
            '<input type="password" id="adminGateCode" class="admin-gate-input" autocomplete="current-password" inputmode="numeric" spellcheck="false" required placeholder="Paste access code">' +
            '<button type="submit" class="btn btn-primary admin-gate-submit">Continue</button>' +
          '</form>' +
        '</div>';
      document.body.appendChild(gate);

      var gateError = gate.querySelector('.admin-gate-error');
      var gateInput = gate.querySelector('#adminGateCode');
      var gateForm = gate.querySelector('.admin-gate-form');

      function openGate() {
        gate.classList.add('open');
        document.documentElement.classList.add('admin-gate-lock');
        setTimeout(function () { if (gateInput) gateInput.focus(); }, 120);
      }
      function closeGate() {
        gate.classList.remove('open');
        document.documentElement.classList.remove('admin-gate-lock');
        if (gateError) { gateError.textContent = ''; gateError.classList.remove('show'); }
        if (gateInput) gateInput.value = '';
      }

      gate.querySelector('.admin-gate-close').addEventListener('click', closeGate);
      gate.addEventListener('click', function (e) { if (e.target === gate) closeGate(); });

      gateForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        var password = gateInput.value.trim();
        if (!password) return;
        var btn = gate.querySelector('.admin-gate-submit');
        btn.disabled = true;
        btn.textContent = 'Verifying…';
        try {
          var r = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: password })
          });
          var data = await r.json().catch(function () { return {}; });
          if (r.ok && data.token) {
            try { localStorage.setItem(TOKEN_KEY, data.token); } catch (err) {}
            window.location.href = '/admin';
            return;
          }
          gateError.textContent = data.error || 'Invalid access code';
          gateError.classList.add('show');
        } catch (err) {
          gateError.textContent = 'Could not reach the server. Please try again.';
          gateError.classList.add('show');
        }
        btn.disabled = false;
        btn.textContent = 'Continue';
      });

      var taps = 0, lastTap = 0;
      document.addEventListener('click', function () {
        var now = Date.now();
        taps = (now - lastTap < 1200) ? taps + 1 : 1;
        lastTap = now;
        if (taps >= 10) { taps = 0; openGate(); }
      });
    }
  });
})();

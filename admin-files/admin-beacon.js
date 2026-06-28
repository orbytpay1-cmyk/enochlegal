// Marks this browser session as staff while the admin dashboard is open.
// Keeps "Live Now" accurate — only public site visitors are counted.
(function () {
  var KEY = 'eel_sid';
  var sid;
  try {
    sid = localStorage.getItem(KEY);
    if (!sid) {
      sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(KEY, sid);
    }
  } catch (e) {
    sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function markStaff() {
    try {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sid,
          path: '/admin',
          title: 'Admin Dashboard',
          event: 'staff',
          referrer: 'staff'
        }),
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
  }

  markStaff();
  setInterval(markStaff, 12000);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') markStaff();
  });
})();

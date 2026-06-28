// Marks staff activity separately — NEVER reuses the public visitor session id (eel_sid).
// This keeps public "Live on Site" counts accurate while admin is open.
(function () {
  var KEY = 'eel_staff_beacon';
  var sid;
  try {
    sid = sessionStorage.getItem(KEY);
    if (!sid) {
      sid = 'staff_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      sessionStorage.setItem(KEY, sid);
    }
  } catch (e) {
    sid = 'staff_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function markStaff() {
    try {
      var body = JSON.stringify({
        sessionId: sid,
        path: '/admin',
        title: 'Admin Dashboard',
        event: 'staff',
        referrer: 'staff'
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
      } else {
        fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body,
          keepalive: true
        }).catch(function () {});
      }
    } catch (e) {}
  }

  markStaff();
  setInterval(markStaff, 15000);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') markStaff();
  });
})();

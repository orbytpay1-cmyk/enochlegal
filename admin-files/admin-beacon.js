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

  var TRACK_URL = (window.EEL ? EEL.api('/api/track') : '/api/track');

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
        navigator.sendBeacon(TRACK_URL, new Blob([body], { type: 'text/plain' }));
      } else {
        fetch(TRACK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
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

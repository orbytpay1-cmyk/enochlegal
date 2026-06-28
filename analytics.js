// Lightweight visitor analytics beacon — powers the live admin dashboard.
// Tracks a per-browser session, page views, and active time-on-site.
(function () {
  var KEY = 'eel_sid';
  var sid;
  try {
    sid = localStorage.getItem(KEY);
    if (!sid) { sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 10); localStorage.setItem(KEY, sid); }
  } catch (e) {
    sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  var ref = document.referrer;
  if (!ref || ref.indexOf(location.origin) === 0) ref = 'direct';

  function send(event) {
    try {
      var body = JSON.stringify({
        sessionId: sid,
        path: location.pathname + location.search,
        title: document.title,
        event: event,
        referrer: ref
      });
      if (event === 'leave' && navigator.sendBeacon) {
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

  send('enter');
  setInterval(function () { if (document.visibilityState === 'visible') send('heartbeat'); }, 15000);
  document.addEventListener('visibilitychange', function () {
    send(document.visibilityState === 'hidden' ? 'leave' : 'heartbeat');
  });
  window.addEventListener('pagehide', function () { send('leave'); });
})();

// Visitor analytics — powers the live admin dashboard (public site only).
(function () {
  var KEY = 'eel_sid';
  var sid;
  try {
    sid = localStorage.getItem(KEY);
    if (!sid) {
      sid = 'pub_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(KEY, sid);
    }
  } catch (e) {
    sid = 'pub_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
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
      // sendBeacon is more reliable on mobile Safari / background tabs
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
        return;
      }
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        keepalive: true,
        credentials: 'same-origin'
      }).catch(function () {});
    } catch (e) {}
  }

  function ping() {
    if (document.visibilityState !== 'visible') return;
    send('heartbeat');
  }

  send('enter');
  setTimeout(ping, 1500);
  setTimeout(ping, 5000);
  setInterval(ping, 8000);

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') send('leave');
    else { send('enter'); ping(); }
  });
  window.addEventListener('focus', ping);
  window.addEventListener('pageshow', ping);
  window.addEventListener('pagehide', function () { send('leave'); });
})();

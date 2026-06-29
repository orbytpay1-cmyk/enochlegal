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

  var TRACK_URL = (window.EEL ? EEL.api('/api/track') : '/api/track');

  function send(event) {
    try {
      var body = JSON.stringify({
        sessionId: sid,
        path: location.pathname + location.search,
        title: document.title,
        event: event,
        referrer: ref
      });
      // text/plain avoids a CORS preflight so the beacon works cross-origin (Netlify -> Railway).
      // sendBeacon is more reliable on mobile Safari / background tabs.
      if (navigator.sendBeacon) {
        navigator.sendBeacon(TRACK_URL, new Blob([body], { type: 'text/plain' }));
        return;
      }
      fetch(TRACK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: body,
        keepalive: true
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

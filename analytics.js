// Lightweight visitor analytics beacon — powers the live admin dashboard.
// Fires on every public page; sends enter + heartbeat so "Live Now" stays accurate.
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
          keepalive: true,
          credentials: 'same-origin'
        }).catch(function () {});
      }
    } catch (e) {}
  }

  function ping() {
    if (document.visibilityState !== 'visible') return;
    send('heartbeat');
  }

  // First hit + keep-alive every 10s while tab is visible
  send('enter');
  setTimeout(ping, 2000);
  setInterval(ping, 10000);

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') send('leave');
    else { send('enter'); ping(); }
  });
  window.addEventListener('focus', ping);
  window.addEventListener('pageshow', ping);
  window.addEventListener('pagehide', function () { send('leave'); });
})();

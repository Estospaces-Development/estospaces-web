// During a deploy or canary, a page can get HTML from one build and then ask the other
// revision for a script it does not have, which leaves a blank page. Reload once if a
// build asset fails before the app boots; lazy routes after boot recover in App.tsx.
// Versioned file name: nginx serves .js as immutable, so change the name to change it.
(function () {
  var KEY = 'estospaces:asset-reload';
  window.addEventListener('error', function (event) {
    var el = event.target;
    var url = el && (el.src || el.href);
    if (window.__estospacesBooted || !url || (el.tagName !== 'SCRIPT' && el.tagName !== 'LINK') || url.indexOf('/assets/') === -1) {
      return;
    }
    try {
      if (window.sessionStorage.getItem(KEY)) return;
      window.sessionStorage.setItem(KEY, '1');
    } catch (e) {
      return;
    }
    window.location.reload();
  }, true);
})();

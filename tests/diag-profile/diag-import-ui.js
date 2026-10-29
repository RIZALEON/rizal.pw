/* diag-import-ui.js — TEST-ONLY "Import diag pack" button. index.html loads this ONLY when the URL has ?diag=1. */
(function () {
  if (!/[?&]diag=1(&|$)/.test(location.search)) return;
  var B = '/tests/diag-profile/';
  function go() {
    var s = document.createElement('script'); s.src = B + 'install-diag-profile.js?v=2';
    s.onload = function () {
      var d = document.createElement('div');
      d.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:99999;background:#300;color:#fff;font:12px system-ui;padding:8px;border:1px solid #f55;border-radius:6px;max-width:260px';
      d.innerHTML = '<b>TEST-ONLY · @rdragon_diag</b><br>Diagnostic profile, not an owner identity.<br><button id="rd-diag-in">Import diag pack</button> <button id="rd-diag-undo">Restore backup</button><div id="rd-diag-msg"></div>';
      document.body.appendChild(d);
      var m = function (t) { document.getElementById('rd-diag-msg').textContent = t; };
      document.getElementById('rd-diag-in').onclick = function () { m('installing…'); window.installDiagProfile(B + 'rdragon-diag-profile.json').catch(function (e) { m(String(e && e.message || e)); }); };
      document.getElementById('rd-diag-undo').onclick = function () { window.restoreDiagBackup().catch(function (e) { m(String(e && e.message || e)); }); };
    };
    document.head.appendChild(s);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();

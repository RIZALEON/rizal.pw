/* diag-import-ui.js v2 — TEST-ONLY @rdragon_diag bot console. index.html loads this always; it shows ONLY when the URL has ?diag=1.
   Thin UI over window.RDIAG (rdragon-cryptosocial/rdiag.js): Diagnose · Repair · Update · Upgrade request + the original Import/Restore. */
(function () {
  if (!/[?&]diag=1(&|$)/.test(location.search)) return;
  var B = '/tests/diag-profile/';
  function el(t, a, h) { var e = document.createElement(t); if (a) for (var k in a) e.setAttribute(k, a[k]); if (h != null) e.textContent = h; return e; }
  function go() {
    var s = document.createElement('script'); s.src = B + 'install-diag-profile.js?v=2';
    s.onload = s.onerror = function () {
      var d = el('div', { id: 'rd-diag-panel' });
      d.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:99999;background:#200;color:#fff;font:12px system-ui;padding:8px;border:1px solid #f55;border-radius:6px;width:300px;max-height:70vh;overflow:auto';
      d.innerHTML = '<b>TEST-ONLY · @rdragon_diag bot console</b><br><span style="opacity:.8">Public test account, never owner/vault/biometric.</span>' +
        '<div style="margin-top:6px"><b>Diagnose</b><br><button data-d="run">Run all self-tests</button> <button data-d="copy">Copy JSON</button> <button data-d="pub">Publish diag note</button></div>' +
        '<div style="margin-top:6px"><b>Repair</b> <span style="opacity:.7">(backs up first)</span><br><button data-d="r:clearStaleCaches">Clear stale caches + re-register SW</button> <button data-d="r:resetLocalPeer">Reset localPeer</button> <button data-d="r:reimportDiag">Re-import diag pack</button> <button data-d="r:restoreDiagBackup">restoreDiagBackup</button> <button data-d="r:reweightLearned">Reweight bad learned</button> <button data-d="r:resyncRelay">Re-sync relay</button></div>' +
        '<div style="margin-top:6px"><b>Update</b><br><button data-d="u:check">Check live manifest</button> <button data-d="u:hot">Hot-reload newer</button> <button data-d="u:force">Force update</button></div>' +
        '<div style="margin-top:6px"><b>Upgrade</b> <span style="opacity:.7">(request only; bots never push)</span><br><input id="rd-diag-want" placeholder="what should change?" style="width:96%"><button data-d="up">File upgrade request</button></div>' +
        '<pre id="rd-diag-out" style="white-space:pre-wrap;max-height:30vh;overflow:auto;background:#000;padding:4px;margin-top:6px"></pre>';
      document.body.appendChild(d);
      var out = d.querySelector('#rd-diag-out'), show = function (x) { out.textContent = typeof x === 'string' ? x : JSON.stringify(x, null, 1); };
      d.addEventListener('click', function (e) {
        var a = e.target && e.target.getAttribute && e.target.getAttribute('data-d'); if (!a) return; var R = window.RDIAG;
        if (!R) return show('RDIAG not loaded (rdragon-cryptosocial/rdiag.js)'); show('working…'); var p;
        if (a === 'run') p = R.run().then(function (r) { return r.summary + '\n\n' + R.text(r); });
        else if (a === 'copy') p = (R.last() ? Promise.resolve(R.last()) : R.run()).then(function (r) { return R.copy(r).then(function (ok) { return ok ? 'copied ' + R.text(r).length + ' chars' : R.text(r); }); });
        else if (a === 'pub') p = (R.last() ? Promise.resolve(R.last()) : R.run()).then(R.publish).then(function (ev) { return ev ? 'published TEST-ONLY diag note ' + ev.id : 'relay unavailable (report still copyable)'; });
        else if (a.indexOf('r:') === 0) { var k = a.slice(2); p = (k === 'reimportDiag' && window.installDiagProfile) ? R.repair[k]() : R.repair[k](); }
        else if (a === 'u:check') p = R.update.check(); else if (a === 'u:hot') p = R.update.hot(); else if (a === 'u:force') p = R.update.force();
        else if (a === 'up') p = R.upgradeRequest({ title: (d.querySelector('#rd-diag-want').value || 'bot upgrade').slice(0, 80), want: d.querySelector('#rd-diag-want').value }).then(function (r) { try { window.open(r.issueUrl, '_blank', 'noopener'); } catch (x) {} return r; });
        Promise.resolve(p).then(show, function (x) { show(String(x && x.message || x)); });
      });
    };
    document.head.appendChild(s);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();

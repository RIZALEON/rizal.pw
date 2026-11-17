/* R:\ ЯWALLET · ЯID TAGS panel (RGENERATOR) · STAGED 20261026 · shared _pack copy. Lists + creates public Rid tags. No keys, no signing. */
(function () {
  var base = (document.currentScript && document.currentScript.src || '').replace(/[^\/]*$/, '');
  var LEDGER_URL = base + 'data/rid-tags.json';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  async function mount() {
    var T = window.RGEN_RIDTAGS; if (!T) return; var host = document.getElementById('rw') || document.body;
    var box = document.createElement('div'); box.id = 'rw-ridtags'; box.style.cssText = 'margin-top:10px;border:1px solid #39ff14;padding:6px;font:11px Menlo,RIZAL Mono,Noto Sans Tagalog,Noto Sans Mayan Numerals,monospace;color:#39ff14';
    host.appendChild(box); var L = await T.loadBrowser(LEDGER_URL);
    function draw(msg) {
      var rows = T.list(L).map(function (t) { return '<tr><td>' + esc(t.rid) + '</td><td>' + esc(t.kind) + '</td><td>' + esc(t.name) + (t.symbol ? ' (' + esc(t.symbol) + ')' : '') + '</td><td>' + esc(t.status) + '</td></tr>'; }).join('');
      box.innerHTML = '<b>ЯID TAGS · RGENERATOR</b> <span id="rw-ridtags-n">' + L.tags.length + '</span> tracked · next ЯID-' + String(T.nextSerial(L)).padStart(4, '0') + '-…' +
        '<table style="width:100%;font:inherit;color:#ddd">' + (rows || '<tr><td>none yet</td></tr>') + '</table>' +
        '<select id="rwt-k">' + T.KINDS.map(function (k) { return '<option>' + k + '</option>'; }).join('') + '</select> <input id="rwt-n" placeholder="name" size="12"> <input id="rwt-s" placeholder="symbol" size="5"> <button id="rwt-go">CREATE TAG</button>' +
        '<div style="color:#888">public IDs only · tracked in this wallet · unsigned</div>' + (msg ? '<div>' + esc(msg) + '</div>' : '');
      box.querySelector('#rwt-go').onclick = async function () { try { var r = await T.create(L, { kind: box.querySelector('#rwt-k').value, name: box.querySelector('#rwt-n').value, symbol: box.querySelector('#rwt-s').value || null, app: document.title }); T.saveBrowser(L); draw((r.existed ? 'already tracked ' : 'created ') + r.tag.rid); } catch (e) { draw('error: ' + e.message); } };
    }
    draw();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();

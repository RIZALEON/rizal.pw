/* rpostmenu.js · ONE shared post menu (Pin / Edit / Delete / Share) for rizal.pw, RDRAGON's profile panel and the iPhone app. 20261027.
   Master copy: rizal.pw/rdragon-cryptosocial/rpostmenu.js. Other apps load this file; they never keep their own copy.
   Cards opt in with data-pid="<id>" (or data-menu-id) and data-kind="post|video|project|article|articles|cubes|fixed".
   Posts, Video, Articles, Projects and Cubes all get Pin/Edit/Delete/Share. Articles and Cubes are edited as overlay entries; signed source files are never rewritten. kind "fixed" (the fixed pinned card) and cards with no id (demo cards): no menu.
   Sync: post actions travel as signed entries through POLYTRANSPONDR (:8811). This file never signs: the app hands it entries the signed-in owner already sealed.
   The transponder accepts only owner-signed entries, so unsigned actions stay on this device. */
(function (root) {
  if (root.RPostMenu) return;
  var SHARE_ONLY = {}, NONE = { fixed: 1 }; /* all five tabs get the full menu (Rizal 20261027) */
  var mounts = [], open = null;
  function E(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function idOf(c) { return c.getAttribute('data-pid') || c.getAttribute('data-menu-id'); }
  function close() { if (open) { open.remove(); open = null; } }
  function decorate(m) {
    var r = typeof m.root === 'function' ? m.root() : document.querySelector(m.root); if (!r) return;
    r.querySelectorAll('[data-pid],[data-menu-id]').forEach(function (c) {
      var k = (c.getAttribute('data-kind') || 'post').toLowerCase(); if (NONE[k] || !idOf(c) || c.querySelector(':scope > .rpm-btn')) return;
      c.classList.add('rpm-card'); var b = document.createElement('button'); b.type = 'button'; b.className = 'rpm-btn'; b.setAttribute('aria-label', 'post menu'); b.textContent = '⋯'; c.appendChild(b);
    });
  }
  function items(m, id, kind) {
    var L = [];
    if (!SHARE_ONLY[kind] && (!m.opts.owner || m.opts.owner(id, kind))) {
      var pinned = m.opts.isPinned ? m.opts.isPinned(id) : false;
      L.push(['pin', pinned ? 'Unpin' : 'Pin'], ['edit', 'Edit'], ['delete', 'Delete']);
    }
    L.push(['share', 'Share']); if (m.opts.embedCode && m.opts.embedCode(id, kind)) L.push(['embed', 'Embed code']); return L;
  }
  function share(m, id, kind) {
    var u = m.opts.shareUrl ? m.opts.shareUrl(id, kind) : 'https://rizal.pw/#post/' + encodeURIComponent(id);
    if (navigator.share) return navigator.share({ url: u }).catch(function () {});
    (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(function () { m.opts.toast && m.opts.toast('link copied'); }, function () { prompt('Copy link', u); });
  }
  function ask(text, yes) {
    var o = document.createElement('div'); o.className = 'rpm-confirm';
    o.innerHTML = '<div class="rpm-box"><div>' + E(text) + '</div><div class="rpm-row"><button type="button" data-c="no">Cancel</button><button type="button" data-c="yes" class="rpm-danger">Delete</button></div></div>';
    o.addEventListener('click', function (ev) { var c = ev.target.getAttribute('data-c'); if (ev.target === o || c) { ev.stopPropagation(); o.remove(); if (c === 'yes') yes(); } });
    document.body.appendChild(o);
  }
  function find(el) { for (var i = 0; i < mounts.length; i++) { var r = typeof mounts[i].root === 'function' ? mounts[i].root() : document.querySelector(mounts[i].root); if (r && r.contains(el)) return mounts[i]; } return null; }
  document.addEventListener('click', function (ev) {
    var t = ev.target;
    var it = t.closest && t.closest('.rpm-menu [data-pm]');
    if (it) { ev.preventDefault(); ev.stopPropagation(); var mm = open && open._m, id = open._id, kind = open._k, a = it.getAttribute('data-pm'); close();
      if (a === 'share') return share(mm, id, kind);
      if (a === 'embed') { var c = mm.opts.embedCode(id, kind); return (navigator.clipboard ? navigator.clipboard.writeText(c) : Promise.reject()).then(function () { mm.opts.toast && mm.opts.toast('embed code copied'); }, function () { prompt('Copy embed code', c); }); }
      if (a === 'delete') return ask('Delete this post? It disappears on every device. Its history stays in the signed log.', function () { mm.opts.onAction('delete', id, kind); });
      return mm.opts.onAction(a, id, kind); }
    var b = t.closest && t.closest('.rpm-btn');
    if (b) { ev.preventDefault(); ev.stopPropagation(); var card = b.parentNode, m = find(b); if (!m) return; var was = open && open._id === idOf(card); close(); if (was) return;
      var k = (card.getAttribute('data-kind') || 'post').toLowerCase(), menu = document.createElement('div'); menu.className = 'rpm-menu'; menu.setAttribute('role', 'menu');
      menu.innerHTML = items(m, idOf(card), k).map(function (x) { return '<button type="button" role="menuitem" data-pm="' + x[0] + '"' + (x[0] === 'delete' ? ' class="rpm-danger"' : '') + '>' + x[1] + '</button>'; }).join('');
      menu._m = m; menu._id = idOf(card); menu._k = k; card.appendChild(menu); open = menu; return; }
    if (open && !(t.closest && t.closest('.rpm-menu'))) close();
  }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  var obs = null;
  function mount(rootSel, opts) { var m = { root: rootSel, opts: opts || {} }; mounts.push(m);
    if (!obs && root.MutationObserver) { obs = new MutationObserver(function () { mounts.forEach(decorate); }); obs.observe(document.documentElement, { childList: true, subtree: true }); }
    decorate(m); return m; }

  /* ---- POLYTRANSPONDR client: send + receive post actions. rizal.pw's post log is the master copy. ---- */
  var TYPES = /^(post\.(pin|unpin|delete)|revise)$/, CK = 'rpostmenu.pt.cursor';
  function ptUrl() { var c = root.RDRAGON_CONFIG || {}; if (c.transponderUrl === false) return '';
    var pub = false; try { pub = !(location.hostname === '127.0.0.1' || location.hostname === 'localhost') && !/[?&]local=1(&|$)/.test(location.search || ''); } catch (e) {}
    if (c.transponderUrl) { var tu = String(c.transponderUrl).replace(/\/$/, ''); if (pub && /^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/i.test(tu)) return ''; return tu; } /* 20261028b: loopback transponder only on localhost or ?local=1 */
    /* 20261028: a public origin (rizal.pw) never probes loopback, even on a signed-in device (localPeer=1), unless the page URL carries ?local=1. */
    try { var lh = location.hostname === '127.0.0.1' || location.hostname === 'localhost', opt = /[?&]local=1(&|$)/.test(location.search || '');
      if (lh || (opt && localStorage.getItem('rdragon.csp.localPeer') === '1')) return 'http://127.0.0.1:8811'; } catch (e) {}
    return ''; }
  var sync = { url: ptUrl, enabled: function () { return !!ptUrl(); }, last: null, err: null,
    /* entry must already be sealed by the signed-in owner (RSync.seal). text/plain keeps it a simple request (no preflight). */
    send: function (sealed) { var u = ptUrl(); if (!u) return Promise.resolve({ added: 0, off: true });
      return fetch(u + '/pt/entries', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify([sealed]) }).then(function (r) { return r.json(); }); },
    start: function (onEntry, everyMs) { var u = ptUrl(); if (!u || sync._t) return false; var cur = null; try { cur = localStorage.getItem(CK); } catch (e) {}
      function step() { var after = cur == null ? 9e15 : +cur; /* first run starts at the end: only new actions */
        return fetch(u + '/pt/entries?after=' + after).then(function (r) { var nx = r.headers.get('x-pt-next'); return r.text().then(function (t) {
          t.split('\n').forEach(function (l) { if (!l.trim()) return; var e; try { e = JSON.parse(l); } catch (x) { return; } if (e && TYPES.test(e.t || '')) try { onEntry(e); } catch (x) {} });
          if (nx != null) { cur = nx; try { localStorage.setItem(CK, nx); } catch (e) {} } sync.last = new Date().toISOString(); sync.err = null; }); })
          .catch(function (e) { sync.err = String(e && e.message || e); }); }
      step(); sync._t = setInterval(step, everyMs || 5000); return true; } };
  root.RPostMenu = { VERSION: 'rpostmenu 1.0 20261027', mount: mount, sync: sync, TYPES: TYPES };
})(typeof self !== 'undefined' ? self : this);

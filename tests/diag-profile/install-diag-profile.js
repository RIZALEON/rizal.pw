/* install-diag-profile.js — TEST-ONLY @rdragon_diag device into rizal.pw browser storage.
   v2 20261028: writes the identity the site actually reads — IndexedDB "rdragon.csp.keys" (store "k", key "device",
   record {kp:{privateKey,publicKey}, me:{pub,handle,name,profile}, created, diag:true, test_only:true}) — after backing the
   existing record up to key "device.bak-<ts>" in the same store. Still mirrors the record into legacy "rdragon.device.v1".
   On a public host it refuses unless the page URL has ?diag=1 (or opt.force). Never re-signs anything: it only appends the
   pack's already-signed profile.create entries to the ЯSYNC ledger (localStorage rdragon.csp.rsync.v1).
   Usage (browser, https://rizal.pw/?diag=1): await installDiagProfile('/tests/diag-profile/rdragon-diag-profile.json')
   Undo: await restoreDiagBackup()  (puts the newest device.bak-* back as "device")
   Usage (import):  const { installDiagProfile } = require('./install-diag-profile.js') */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else Object.assign(root, m);
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var SITE_DB = 'rdragon.csp.keys', LEGACY_DB = 'rdragon.device.v1', STORE = 'k', KEY = 'device', BAK = 'device.bak-';
  var RSYNC_KEY = 'rdragon.csp.rsync.v1';
  function idb() { return (typeof indexedDB !== 'undefined' && indexedDB) || (typeof globalThis !== 'undefined' && globalThis.indexedDB); }
  function b64d(s) { var bin = atob(s), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
  function open(db) { return new Promise(function (ok, no) { var o = idb().open(db, 1); o.onupgradeneeded = function () { o.result.createObjectStore(STORE); }; o.onerror = function () { no(o.error); }; o.onsuccess = function () { ok(o.result); }; }); }
  function tx(db, mode, fn) { return open(db).then(function (d) { return new Promise(function (ok, no) { var t = d.transaction(STORE, mode), st = t.objectStore(STORE), out; out = fn(st); t.oncomplete = function () { d.close && d.close(); ok(out && 'result' in out ? out.result : undefined); }; t.onerror = function () { no(t.error); }; }); }); }
  function get(db, k) { return tx(db, 'readonly', function (st) { return st.get(k); }); }
  function put(db, k, v) { return tx(db, 'readwrite', function (st) { st.put(v, k); }); }
  function keys(db) { return tx(db, 'readonly', function (st) { return st.getAllKeys(); }); }
  function stamp() { return new Date().toISOString().replace(/[-:]/g, '').replace(/\..*$/, ''); }
  function allowed(opt) {
    if (opt.force) return true;
    if (typeof location === 'undefined' || !location.hostname) return true; // node / file harness
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return true;
    return /[?&]diag=1(&|$)/.test(location.search || '');
  }
  async function loadPack(pack) {
    if (typeof pack === 'string') { var r = await fetch(pack, { cache: 'no-cache' }); if (!r.ok) throw new Error('fetch pack ' + r.status); pack = await r.json(); }
    if (!pack || pack.format !== 'rdragon.diag-profile.v1') throw new Error('not rdragon.diag-profile.v1');
    return pack;
  }
  /* exact shape rdragon-cryptosocial.js loadDevice()/rsAdoptMe() read: rec.kp (CryptoKeyPair) + rec.me cache */
  async function buildRecord(pack) {
    var subtle = crypto.subtle;
    var priv = await subtle.importKey('pkcs8', b64d(pack.private_key.pkcs8_b64), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
    var pub = await subtle.importKey('raw', b64d(pack.pub), { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify']);
    return { kp: { privateKey: priv, publicKey: pub }, created: pack.created_mt || new Date().toISOString(),
      me: { pub: pack.pub, handle: pack.handle, name: pack.name, profile: pack.profile },
      diag: true, test_only: true, warning: pack.warning };
  }
  async function installDiagProfile(packOrUrl, opt) {
    opt = opt || {};
    if (!allowed(opt)) throw new Error('TEST-ONLY: open the page with ?diag=1 to install @rdragon_diag');
    var pack = await loadPack(packOrUrl);
    var rec = await buildRecord(pack), backup = null;
    var cur = await get(SITE_DB, KEY);
    /* v3 t106u: never replace a real owner device in this browser (it hid the owner login). Bots use a private window or another browser. */
    if (cur && !(cur.diag || cur.test_only)) { if (!opt.ownerOverwrite) throw new Error('TEST-ONLY: this browser already has a real (owner) device — not replacing it. Use a private window or another browser for @rdragon_diag.'); backup = BAK + stamp(); await put(SITE_DB, backup, cur); }
    await put(SITE_DB, KEY, rec);
    try { await put(LEGACY_DB, KEY, rec); } catch (e) { /* legacy mirror is best-effort */ }
    var seeded = 0;
    try { // append the pack's already-signed entries; nothing is (re)signed here
      var led = JSON.parse(localStorage.getItem(RSYNC_KEY) || '[]'); if (!Array.isArray(led)) led = [];
      var ids = {}; led.forEach(function (e) { if (e && e.id) ids[e.id] = 1; });
      (pack.rsync_bundle && pack.rsync_bundle.entries || []).forEach(function (e) { if (e && e.id && !ids[e.id]) { led.push(e); seeded++; } });
      localStorage.setItem(RSYNC_KEY, JSON.stringify(led));
    } catch (e) { /* ignore quota / no localStorage */ }
    if (opt.reload !== false && typeof location !== 'undefined' && location.reload) location.reload();
    return { handle: pack.handle, profile: pack.profile, pub: pack.pub, db: SITE_DB, backup: backup, seeded: seeded, test_only: true };
  }
  async function restoreDiagBackup(opt) {
    opt = opt || {};
    var ks = (await keys(SITE_DB)).filter(function (k) { return String(k).indexOf(BAK) === 0; }).sort();
    if (!ks.length) throw new Error('no device.bak-* backup in ' + SITE_DB);
    var k = ks[ks.length - 1], v = await get(SITE_DB, k);
    await put(SITE_DB, KEY, v);
    if (opt.reload !== false && typeof location !== 'undefined' && location.reload) location.reload();
    return { restored: k };
  }
  return { installDiagProfile: installDiagProfile, restoreDiagBackup: restoreDiagBackup, buildRecord: buildRecord, SITE_DB: SITE_DB, LEGACY_DB: LEGACY_DB };
});

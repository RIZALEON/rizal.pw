/* install-diag-profile.js — TEST-ONLY @rdragon_diag device into rizal.pw browser storage.
   Usage (browser): await installDiagProfile(packObjectOrUrl)
   Usage (import):  import { installDiagProfile } from './install-diag-profile.js'
*/
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else Object.assign(root, m);
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var DB = 'rdragon.device.v1', STORE = 'k', KEY = 'device';
  var RSYNC_KEY = 'rdragon.csp.rsync.v1';

  function b64d(s) {
    var bin = atob(s), u = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  }
  function idbPut(rec) {
    return new Promise(function (ok, no) {
      var o = indexedDB.open(DB, 1);
      o.onupgradeneeded = function () { o.result.createObjectStore(STORE); };
      o.onerror = function () { no(o.error); };
      o.onsuccess = function () {
        var d = o.result, t = d.transaction(STORE, 'readwrite');
        t.objectStore(STORE).put(rec, KEY);
        t.oncomplete = function () { ok(); };
        t.onerror = function () { no(t.error); };
      };
    });
  }
  async function loadPack(pack) {
    if (typeof pack === 'string') {
      var r = await fetch(pack, { cache: 'no-cache' });
      if (!r.ok) throw new Error('fetch pack ' + r.status);
      pack = await r.json();
    }
    if (!pack || pack.format !== 'rdragon.diag-profile.v1') throw new Error('not rdragon.diag-profile.v1');
    return pack;
  }
  async function installDiagProfile(packOrUrl, opt) {
    opt = opt || {};
    var pack = await loadPack(packOrUrl);
    var subtle = crypto.subtle;
    var pkcs8 = b64d(pack.private_key.pkcs8_b64);
    var priv = await subtle.importKey('pkcs8', pkcs8, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
    var pub = await subtle.importKey('raw', b64d(pack.pub), { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify']);
    var rec = {
      kp: { privateKey: priv, publicKey: pub },
      created: pack.created_mt || new Date().toISOString(),
      me: { handle: pack.handle, name: pack.name, profile: pack.profile, pub: pack.pub },
      diag: true,
      warning: pack.warning
    };
    await idbPut(rec);
    // Seed ЯSYNC ledger with profile.create so policy recognizes the device
    try {
      var cur = JSON.parse(localStorage.getItem(RSYNC_KEY) || '[]');
      if (!Array.isArray(cur)) cur = [];
      var ids = {};
      cur.forEach(function (e) { if (e && e.id) ids[e.id] = 1; });
      (pack.rsync_bundle.entries || []).forEach(function (e) {
        if (e && e.id && !ids[e.id]) cur.push(e);
      });
      localStorage.setItem(RSYNC_KEY, JSON.stringify(cur));
    } catch (e) { /* ignore quota */ }
    if (opt.reload !== false && typeof location !== 'undefined') {
      location.reload();
    }
    return { handle: pack.handle, profile: pack.profile, pub: pack.pub };
  }
  return { installDiagProfile: installDiagProfile };
});

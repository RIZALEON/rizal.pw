/* R:\ RGENERATOR 2.1.9 · ЯID TAGS for the unified ЯWALLET · STAGED 20261026 · ONE shared copy (_pack/rgenerator) — never per-app.
 * Creates + tracks PUBLIC ЯID tags for apps, tokens and other crypto items. Format = roster ЯID (RBOTS-REGISTRY-0.1): ЯID-NNNN-XXXX
 *   NNNN = next free serial above every reserved/registered ЯID (never reused) · XXXX = 4 Crockford chars of sha256(kind|name|NNNN)
 *   + provenance: rid.v1 package id (Я-DATA-…) minted by RGENERATOR rid.js (egg5, unchanged copy).
 * Public IDs only: no keys, no seeds, no signing, no network. Ledger = rid-tags.json (rgenerator.ridtags.v1). */
(function (root, factory) { var m = factory(root); if (typeof module === 'object' && module.exports) module.exports = m; else root.RGEN_RIDTAGS = m; })
(typeof self !== 'undefined' ? self : globalThis, function (root) {
  'use strict';
  var CROCK = '0123456789ABCDEFGHJKMNPQRSTVWXYZ', RE = /^ЯID-(\d{4})-([0-9A-Z]{4})$/;
  var KINDS = ['APP', 'TOKEN', 'COIN', 'NFT', 'WALLET', 'CONTRACT', 'POOL', 'CRYPTO'];
  // Every ЯID in RBOTS-REGISTRY-0.1 + RWEB-REGISTRY-0.5 (20261026). Reserved forever; serials 0000-0013 are taken.
  var RESERVED = ['ЯID-0000-0000','ЯID-0001-3QQS','ЯID-0002-PQ2Q','ЯID-0003-P4M6','ЯID-0004-ZYZ0','ЯID-0005-KM02','ЯID-0006-02WG',
    'ЯID-0007-Y5AD','ЯID-0008-HC1N','ЯID-0009-PXQ3','ЯID-0010-1P9W','ЯID-0011-A64J','ЯID-0012-TBJV','ЯID-0013-92V4'];
  var Rid = (typeof module === 'object' && module.exports) ? require('./rid.js') : root.YaSeedRid;
  function emptyLedger() { return { schema: 'rgenerator.ridtags.v1', generator: 'RGENERATOR 2.1.9-egg5-rkey0 (UNSIGNED)', public_only: true, reserved: RESERVED.slice(), tags: [] }; }
  async function sha256hex(s) { var b = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))); return Array.prototype.map.call(b, function (x) { return x.toString(16).padStart(2, '0'); }).join(''); }
  function normKind(k) { var u = String(k || 'CRYPTO').trim().toUpperCase(); return KINDS.indexOf(u) >= 0 ? u : 'CRYPTO'; }
  function used(L) { return L.reserved.concat(L.tags.map(function (t) { return t.rid; })); }
  function nextSerial(L) { var mx = -1; used(L).forEach(function (r) { var m = RE.exec(r); if (m) mx = Math.max(mx, +m[1]); }); return mx + 1; }
  var BAD = /(seed|mnemonic|private|secret|priv[_ ]?key)/i;
  async function create(L, o) {
    o = o || {}; var kind = normKind(o.kind), name = String(o.name || '').trim();
    if (!name) throw new Error('name required');
    if (BAD.test(JSON.stringify(o))) throw new Error('refused: Rid tags are public only (no seeds/keys)');
    var dup = L.tags.filter(function (t) { return t.kind === kind && t.name.toLowerCase() === name.toLowerCase() && (t.ref || '') === (o.ref || ''); })[0];
    if (dup) return { tag: dup, existed: true };
    var n = nextSerial(L); if (n > 9999) throw new Error('ЯID space full');
    var NNNN = String(n).padStart(4, '0'), h = await sha256hex(kind + '|' + name + '|' + NNNN), v = parseInt(h.slice(0, 5), 16);
    var X = ''; for (var i = 0; i < 4; i++) X = CROCK[(v >> (5 * i)) & 31] + X;
    var rid = 'ЯID-' + NNNN + '-' + X; if (used(L).indexOf(rid) >= 0) throw new Error('collision ' + rid);
    var pkg = Rid ? await Rid.mint('sha256:' + h, 'rwallet-ridtags', 'rwallet', n, 'DATA') : null;
    var tag = { rid: rid, kind: kind, name: name, symbol: o.symbol || null, ref: o.ref || null, app: o.app || null,
      package_rid: pkg, payload_sha256: h, created: new Date().toISOString(), status: 'tracked', signed: false };
    L.tags.push(tag); return { tag: tag, existed: false };
  }
  function list(L, kind) { return L.tags.filter(function (t) { return !kind || t.kind === normKind(kind); }); }
  function find(L, rid) { return L.tags.filter(function (t) { return t.rid === rid; })[0] || null; }
  function valid(rid) { return RE.test(rid || ''); }
  // Browser store: shared ledger file is read-only seed; new tags tracked in localStorage until a build writes them back.
  var LS = 'rwallet.ridtags.v1';
  async function loadBrowser(url) { var L = null; try { L = JSON.parse(root.localStorage.getItem(LS) || 'null'); } catch (e) {}
    if (!L) { try { var r = await fetch(url); if (r.ok) L = await r.json(); } catch (e) {} }
    L = L || emptyLedger(); RESERVED.forEach(function (x) { if (L.reserved.indexOf(x) < 0) L.reserved.push(x); }); return L; }
  function saveBrowser(L) { try { root.localStorage.setItem(LS, JSON.stringify(L)); } catch (e) {} }
  return { VERSION: 'rgenerator.ridtags.v1', KINDS: KINDS, RESERVED: RESERVED, emptyLedger: emptyLedger, create: create, list: list, find: find, valid: valid, nextSerial: nextSerial, loadBrowser: loadBrowser, saveBrowser: saveBrowser };
});

/* Rtor feeds 1.0 (2026-11-18, ЯBOWZR for Rizal, branch rtor-finish-20261118). Browser + Node. No deps, no keys.
 * Fail-closed gate for JSON feeds: app appcasts, ALL-APPCASTS.json, the TerraformЯ/GIZMO updates manifest and /rtor/feed.json.
 * Parsed JSON is returned ONLY when <url>.sig.json verifies with RTOR_VERIFY (Rizal's pinned owner key e5833fdfbbfe, exact
 * size + sha256) AND the signed entry is for this exact file (id + name, same rule as RDIAG for rdragon-version.json).
 * Anything else resolves { ok:false, refused:true, status:"refused: signature missing/invalid", why }. Never signs.
 * Ids match tests/rtor/make-feed.cjs (the feed generator) so one sign request = one sidecar.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.RTOR_FEEDS = factory(root);
}(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';
  var STATUS = 'refused: signature missing/invalid';
  function refuse(why) { return { ok: false, refused: true, status: STATUS, why: String(why || 'unverified') }; }
  function pathOf(url) {
    var base = (root && root.location && root.location.href) || 'https://rizal.pw/';
    try { return new URL(url, base); } catch (e) { return null; }
  }
  /** Expected signed-entry {id, name} for a feed URL, or null if this file is not a known Rtor feed. */
  function expectFor(url) {
    var u = pathOf(url); if (!u) return null; var p = u.pathname.replace(/^\/+/, ''), name = p.split('/').pop(), m;
    if (p === 'rdragon-version.json') return { id: 'rizal.pw-version', name: name };
    if (p === 'rwallet-v6/RWALLET.sha256') return { id: 'rwallet-v6', name: name };
    if (p === 'ALL-APPCASTS.json') return { id: 'all-appcasts', name: name };
    if (p === 'terraformya/updates/manifest.json') return { id: 'terraformya-updates', name: name };
    if (p === 'rtor/feed.json') return { id: 'rtor-feed.' + (/^(rizal\.pw|rizal\.info)$/.test(u.hostname) ? u.hostname : 'rizal.pw'), name: name };
    if ((m = /^rtrackr\/data\/([a-z0-9_-]+)\.json$/.exec(p))) return { id: 'rtrackr.' + m[1], name: name };
    if ((m = /^(.+)\/appcast\.json$/.exec(p))) return { id: 'appcast.' + m[1].replace(/\//g, '.'), name: name };
    // Seated feed entries (tests/rtor/make-feed.cjs external-entries seat, 2026-11-22): webseed tree packages
    // are known feeds at their seat file; the frankensteinrizal IPFS entries are known by content address —
    // the CID is the identity, so the expectation is keyed by it, on any gateway host.
    if ((m = /^rtor\/rpull\/[^/]+\/rpull\.sh$/.exec(p))) return { id: 'rtor.rpull-ubuntu-touch', name: name };
    if ((m = /^rtor\/rcryptoforge-live\/[^/]+\/index\.html$/.exec(p))) return { id: 'rcryptoforge-live-track', name: name };
    if ((m = /^rtor\/ghostmachine-rzl\/[^/]+\/manifest\.json$/.exec(p))) return { id: 'ghostmachine-rtor-rzl', name: name };
    if ((m = /^rtor\/terraformr-cryptogame-linux\/[^/]+\/manifest\.json$/.exec(p))) return { id: 'terraformr-cryptogame-linux', name: name };
    var IPFS_IDS = { 'QmYfsPeLtgTguSVHkHwNVUh7j3y4FUtXGWW2WpRKy2LNh8': 'frankensteinrizal.unstoppable-minimal-site', 'QmTKiBqnbB42Ww2s6sNmUTkUp1naW6rX3t28MAxiTLJRso': 'frankensteinrizal.unstoppable-verified-site' };
    if ((m = /^\/ipfs\/(Qm[1-9A-HJ-NP-Za-km-z]{44})$/.exec(u.pathname)) && IPFS_IDS[m[1]]) return { id: IPFS_IDS[m[1]], name: name };
    return null;
  }
  function fetchVerifiedBytes(url, expect) {
    var V = root && root.RTOR_VERIFY; if (!V || typeof V.fetchVerified !== 'function') return Promise.resolve(refuse('Rtor verify not loaded'));
    expect = expect || expectFor(url); if (!expect) return Promise.resolve(refuse('not a known Rtor feed'));
    return V.fetchVerified(url).then(function (r) {
      if (!r || !r.ok) return refuse(r && r.why);
      if (!r.entry || r.entry.id !== expect.id || r.entry.name !== expect.name) return refuse('signature is for another file');
      return { ok: true, bytes: r.bytes, entry: r.entry };
    }, function (e) { return refuse('verify error: ' + (e && e.message)); });
  }
  /** Resolve {ok:true, json, entry} only for an owner-signed feed; otherwise the refusal object. */
  function fetchVerifiedJSON(url, expect) {
    return fetchVerifiedBytes(url, expect).then(function (r) {
      if (!r.ok) return r;
      try { return { ok: true, json: JSON.parse(new TextDecoder().decode(r.bytes)), entry: r.entry }; } catch (e) { return refuse('not JSON'); }
    });
  }
  /** Browser helper: load /rtor/rtor-verify.js (same origin) if it is not on the page yet. Never throws; refusal follows if it fails. */
  function ensureVerifier(src) {
    if (root.RTOR_VERIFY) return Promise.resolve(root.RTOR_VERIFY);
    var d = root.document; if (!d || !d.createElement) return Promise.resolve(null);
    return new Promise(function (ok) { var s = d.createElement('script'); s.src = src || '/rtor/rtor-verify.js?v=1.0';
      s.onload = function () { ok(root.RTOR_VERIFY || null); }; s.onerror = function () { ok(null); }; (d.head || d.documentElement).appendChild(s); });
  }
  return { VERSION: '1.0', STATUS: STATUS, expectFor: expectFor, fetchVerifiedBytes: fetchVerifiedBytes, fetchVerifiedJSON: fetchVerifiedJSON, ensureVerifier: ensureVerifier };
}));

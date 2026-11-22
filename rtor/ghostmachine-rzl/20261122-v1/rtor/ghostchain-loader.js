/* ghostchain-loader.js — THREE-LAYER GHOSTCHAIN MODEL loader (integrated, magnetized).
 *
 * One module, seated identically in every package at rtrackr/ghostchain-loader.js.
 * Implements the THREE-LAYER GHOSTCHAIN MODEL (2026-11-22):
 *   Layer 1 (seated)  — the package's own rtrackr/data/rghostchain.json. Offline truth.
 *   Layer 2 (live)    — https://rizal.pw/rtrackr/data/rghostchain.json, accepted ONLY
 *                       when its SHA-256 matches the live SHA256SUMS seat and it is
 *                       not older than what is already shown.
 *   Layer 3 (RTOR)    — the chain entry named by the live RTOR feed
 *                       (https://rizal.pw/rtor/feed.json), magnet-addressed by the
 *                       RTOR seeder torrent below; the export it names is fetched
 *                       over the permanent HTTPS webseed and accepted ONLY when its
 *                       SHA-256 matches the live SHA256SUMS seat (the feed is
 *                       signed:false / chain entry pending-owner-signature, so the
 *                       hash cross-check is the ONLY acceptance test — the feed
 *                       alone is never trusted).
 * Precedence: freshest VERIFIED wins; trust order Layer 3 -> Layer 2 -> Layer 1.
 * A failed or unverified layer is silently skipped. This loader never throws
 * into the host page and never signs anything.
 *
 * Universal activation surface (any RTOR version, or none):
 *   window.RTOR_GHOSTCHAIN.activate(source?) -> Promise<settled object>
 *     source: 'seated' | 'live' | 'rtor' | 'magnet' | undefined (auto precedence)
 *   window.RTOR_GHOSTCHAIN.get() -> settled window.GHOSTCHAIN object or null
 *   window.RTOR_GHOSTCHAIN.version -> loader version string
 *   window.RTOR_LOADERS.ghostchain === window.RTOR_GHOSTCHAIN
 * On settle: window.GHOSTCHAIN = { height, tip, assets, blocks, layer, verified, export },
 * a 'ghostchain-ready' CustomEvent is dispatched, and any [data-gc] elements
 * (height|tip|assets|layer) are filled.
 */
(function () {
  'use strict';

  var VERSION = 'gc-loader/1.0.0-20261122';

  /* If a copy of this loader is already seated on the page, keep the first. */
  if (typeof window !== 'undefined' && window.RTOR_GHOSTCHAIN && window.RTOR_GHOSTCHAIN.__ghostchainLoader === VERSION) {
    return;
  }

  var LIVE_BASE = 'https://rizal.pw';
  var EXPORT_PATH = '/rtrackr/data/rghostchain.json';
  var EXPORT_NAME = 'rghostchain.json';
  var SUMS_URL = LIVE_BASE + '/rtrackr/data/SHA256SUMS';
  var FEED_URL = LIVE_BASE + '/rtor/feed.json';

  /* Magnet identity of the RTOR seeder torrent that carries the chain seat.
   * Source of record: rtor-live.json at the RTRACKR seat (/rtor/seeder/magnet,
   * /rtor/seeder/info_hash), read live on 2026-11-22. Layer 3 is addressed by
   * this magnet; the export bytes themselves are pulled over the permanent
   * HTTPS webseed (rizal.pw) and hash-verified — the magnet names the swarm,
   * the SHA-256 decides acceptance. */
  var GHOSTCHAIN_INFOHASH = '8dfd6869850e5aea29e70dc657201afd5cdee09d';
  var GHOSTCHAIN_MAGNET = 'magnet:?xt=urn:btih:' + GHOSTCHAIN_INFOHASH + '&dn=SEED';

  var FETCH_TIMEOUT_MS = 20000;

  var settled = null;        // the settled GHOSTCHAIN object (also window.GHOSTCHAIN)
  var inflight = null;       // promise of the current activation pass, if any
  var sumsPromise = null;    // cached live SHA256SUMS lookup

  function noop() {}

  function log() {
    try {
      if (typeof console !== 'undefined' && console && console.debug) {
        console.debug.apply(console, ['[ghostchain-loader]'].concat(Array.prototype.slice.call(arguments)));
      }
    } catch (e) { /* never throw */ }
  }

  /* ---------- low-level helpers (all failure-swallowing) ---------- */

  function fetchBytes(url) {
    return new Promise(function (resolve, reject) {
      var ctrl = null, timer = null;
      try {
        if (typeof AbortController !== 'undefined') {
          ctrl = new AbortController();
          timer = setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, FETCH_TIMEOUT_MS);
        }
      } catch (e) { ctrl = null; }
      var done = function (fn, v) { if (timer) { clearTimeout(timer); } fn(v); };
      try {
        fetch(url, ctrl ? { signal: ctrl.signal } : undefined).then(function (res) {
          if (!res || !res.ok) { done(reject, new Error('http ' + (res && res.status))); return; }
          res.arrayBuffer().then(function (buf) { done(resolve, buf); }, function (err) { done(reject, err); });
        }, function (err) { done(reject, err); });
      } catch (e) { done(reject, e); }
    });
  }

  function bytesToText(buf) {
    try {
      if (typeof TextDecoder !== 'undefined') return new TextDecoder('utf-8').decode(buf);
    } catch (e) {}
    var s = '', bytes = new Uint8Array(buf), i;
    for (i = 0; i < bytes.length; i += 8192) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    }
    try { return decodeURIComponent(escape(s)); } catch (e) { return s; }
  }

  function sha256Hex(buf) {
    return new Promise(function (resolve) {
      try {
        if (typeof crypto === 'undefined' || !crypto.subtle || !crypto.subtle.digest) { resolve(null); return; }
        crypto.subtle.digest('SHA-256', buf).then(function (digest) {
          var bytes = new Uint8Array(digest), hex = '', i;
          for (i = 0; i < bytes.length; i++) {
            hex += ('0' + bytes[i].toString(16)).slice(-2);
          }
          resolve(hex);
        }, function () { resolve(null); });
      } catch (e) { resolve(null); }
    });
  }

  /* Parse + sanity-check a chain export. Returns a candidate core or null. */
  function parseExport(text) {
    try {
      var obj = JSON.parse(text);
      if (!obj || typeof obj !== 'object') return null;
      if (typeof obj.height !== 'number' || !isFinite(obj.height)) return null;
      if (typeof obj.tip !== 'string' || !obj.tip) return null;
      if (!Object.prototype.toString.call(obj.blocks) || Object.prototype.toString.call(obj.blocks) !== '[object Array]') return null;
      if (Object.prototype.toString.call(obj.assets) !== '[object Array]') return null;
      if (obj.chain && obj.chain !== 'RGHOSTCHAIN') return null;
      return {
        height: obj.height,
        tip: obj.tip,
        assets: obj.assets.length,
        blocks: obj.blocks.length,
        export: obj
      };
    } catch (e) { return null; }
  }

  /* Live SHA256SUMS seat -> { basename: sha256hex }. Cached per page. */
  function fetchSums() {
    if (sumsPromise) return sumsPromise;
    sumsPromise = fetchBytes(SUMS_URL).then(function (buf) {
      var map = {}, lines = bytesToText(buf).split(/\r?\n/), i, m;
      for (i = 0; i < lines.length; i++) {
        m = /^\s*([0-9a-fA-F]{64})\s+\*?(.+?)\s*$/.exec(lines[i]);
        if (m) {
          var name = m[2].replace(/^\.\//, '');
          map[name] = m[1].toLowerCase();
          map[name.split('/').pop()] = m[1].toLowerCase();
        }
      }
      return map;
    }, function () { return null; });
    return sumsPromise;
  }

  function resolveUrl(u) {
    if (!u) return null;
    if (/^https?:\/\//i.test(u)) return u;
    if (u.charAt(0) === '/') return LIVE_BASE + u;
    return LIVE_BASE + '/' + u;
  }

  /* The loader's own directory (…/rtrackr/) — the seated export lives under it. */
  function scriptBase() {
    try {
      var src = null;
      if (typeof document !== 'undefined' && document) {
        if (document.currentScript && document.currentScript.src) src = document.currentScript.src;
        if (!src && document.getElementsByTagName) {
          var tags = document.getElementsByTagName('script'), i;
          for (i = 0; i < tags.length; i++) {
            if (tags[i].src && /ghostchain-loader\.js(\?|#|$)/.test(tags[i].src)) { src = tags[i].src; break; }
          }
        }
      }
      if (src) return src.replace(/[^/?#]*(\?[^#]*)?(#.*)?$/, '');
    } catch (e) {}
    return null;
  }

  /* ---------- the three layers (each resolves a candidate or null) ---------- */

  function layerSeated() {
    var base = scriptBase();
    var urls = [];
    if (base) urls.push(base + 'data/' + EXPORT_NAME);
    urls.push('data/' + EXPORT_NAME);            // page is rtrackr/index.html
    urls.push('rtrackr/data/' + EXPORT_NAME);    // page is the tree root
    var attempt = function (i) {
      if (i >= urls.length) return Promise.resolve(null);
      return fetchBytes(urls[i]).then(function (buf) {
        var core = parseExport(bytesToText(buf));
        if (!core) return attempt(i + 1);
        core.layer = 1;
        core.verified = false;
        return sha256Hex(buf).then(function (sha) {
          core.sha256 = sha;
          return core;
        });
      }, function () { return attempt(i + 1); });
    };
    return attempt(0);
  }

  function layerLive() {
    return Promise.all([fetchBytes(LIVE_BASE + EXPORT_PATH), fetchSums()]).then(function (r) {
      var buf = r[0], sums = r[1];
      if (!sums || !sums[EXPORT_NAME]) return null;
      return sha256Hex(buf).then(function (sha) {
        if (!sha || sha !== sums[EXPORT_NAME]) { log('layer 2 rejected: sha mismatch'); return null; }
        var core = parseExport(bytesToText(buf));
        if (!core) return null;
        core.layer = 2;
        core.verified = true;
        core.sha256 = sha;
        return core;
      });
    }, function () { return null; });
  }

  /* Find the chain entry in a feed of ANY version: by entry name/id pattern,
   * never by a hard-coded feed version. Returns { url, sha256, magnet } or null. */
  function feedChainTarget(feed) {
    try {
      if (!feed || typeof feed !== 'object') return null;
      var entries = Object.prototype.toString.call(feed.entries) === '[object Array]' ? feed.entries : [];
      var i, e;
      for (i = 0; i < entries.length; i++) {
        e = entries[i];
        if (!e || typeof e !== 'object') continue;
        var named = (e.name && /rghostchain/i.test(e.name)) ||
                    (e.id && /ghostchain/i.test(e.id)) ||
                    (e.url && /rghostchain\.json/i.test(e.url));
        if (named && e.url) {
          return { url: e.url, sha256: e.sha256 || null, magnet: e.magnet || null };
        }
      }
      if (feed.ghostchain && feed.ghostchain.url) {
        return { url: feed.ghostchain.url, sha256: null, magnet: null };
      }
    } catch (err) {}
    return null;
  }

  function layerRtor() {
    return fetchBytes(FEED_URL).then(function (feedBuf) {
      var feed = null;
      try { feed = JSON.parse(bytesToText(feedBuf)); } catch (e) { feed = null; }
      var target = feedChainTarget(feed);
      if (!target) { log('layer 3: no chain entry in feed'); return null; }
      var url = resolveUrl(target.url);
      if (!url) return null;
      return Promise.all([fetchBytes(url), fetchSums()]).then(function (r) {
        var buf = r[0], sums = r[1];
        if (!sums || !sums[EXPORT_NAME]) return null;
        return sha256Hex(buf).then(function (sha) {
          /* The hash against the live SHA256SUMS is the ONLY acceptance test. */
          if (!sha || sha !== sums[EXPORT_NAME]) { log('layer 3 rejected: sha mismatch vs SHA256SUMS'); return null; }
          if (target.sha256 && sha !== String(target.sha256).toLowerCase()) { log('layer 3 rejected: sha mismatch vs feed entry'); return null; }
          var core = parseExport(bytesToText(buf));
          if (!core) return null;
          core.layer = 3;
          core.verified = true;
          core.sha256 = sha;
          core.magnet = target.magnet || GHOSTCHAIN_MAGNET;
          core.infohash = GHOSTCHAIN_INFOHASH;
          return core;
        });
      }, function () { return null; });
    }, function () { return null; });
  }

  /* ---------- precedence + settling ---------- */

  /* Is candidate `a` allowed to replace incumbent `b`? Never older. */
  function notOlder(a, b) {
    if (!b) return true;
    if (a.height !== b.height) return a.height > b.height;
    return true; /* same height: a verified/higher-trust candidate may take the tie */
  }

  function pickWinner(cands) {
    var best = null, i, c;
    for (i = 0; i < cands.length; i++) {
      c = cands[i];
      if (!c) continue;
      if (!best) { best = c; continue; }
      if (c.height > best.height) { best = c; continue; }
      if (c.height === best.height) {
        if (c.verified && !best.verified) { best = c; continue; }
        if (c.verified === best.verified && c.layer > best.layer) { best = c; continue; }
        if (c.height === best.height && c.tip !== best.tip && c.verified && best.verified && c.layer > best.layer) { best = c; }
      }
    }
    return best;
  }

  function fillDataGc(obj) {
    try {
      if (typeof document === 'undefined' || !document || !document.querySelectorAll) return;
      var els = document.querySelectorAll('[data-gc]'), i, key;
      var values = {
        height: String(obj.height),
        tip: obj.tip,
        assets: String(obj.assets),
        layer: String(obj.layer)
      };
      for (i = 0; i < els.length; i++) {
        try {
          key = els[i].getAttribute && els[i].getAttribute('data-gc');
          if (key && Object.prototype.hasOwnProperty.call(values, key)) {
            els[i].textContent = values[key];
          }
        } catch (e) {}
      }
    } catch (e) {}
  }

  function publish(core) {
    var obj = {
      height: core.height,
      tip: core.tip,
      assets: core.assets,
      blocks: core.blocks,
      layer: core.layer,
      verified: !!core.verified,
      export: core.export
    };
    settled = obj;
    try { window.GHOSTCHAIN = obj; } catch (e) {}
    fillDataGc(obj);
    try {
      var ev = null;
      if (typeof CustomEvent !== 'undefined') {
        ev = new CustomEvent('ghostchain-ready', { detail: obj });
      }
      if (ev) {
        if (typeof window !== 'undefined' && window.dispatchEvent) window.dispatchEvent(ev);
        if (typeof document !== 'undefined' && document && document.dispatchEvent) document.dispatchEvent(ev);
      }
    } catch (e) {}
    log('settled', 'layer', obj.layer, 'height', obj.height, 'tip', obj.tip, 'verified', obj.verified);
    return obj;
  }

  function runPass(source) {
    var jobs;
    if (source === 'seated') {
      jobs = [layerSeated()];
    } else if (source === 'live') {
      jobs = [layerSeated(), layerLive()];
    } else if (source === 'rtor' || source === 'magnet') {
      jobs = [layerSeated(), layerLive(), layerRtor()];
    } else {
      jobs = [layerSeated(), layerLive(), layerRtor()];
    }
    return Promise.all(jobs.map(function (j) {
      return Promise.resolve(j).then(function (v) { return v; }, function () { return null; });
    })).then(function (cands) {
      var winner = pickWinner(cands);
      if (!winner) return settled;
      /* An auto/live/rtor pass never downgrades an already-settled newer chain.
       * An explicit 'seated' activation is an explicit choice and always lands. */
      if (settled && source !== 'seated' && !notOlder(winner, settled)) {
        return settled;
      }
      if (settled && winner.height === settled.height && winner.tip === settled.tip && winner.layer === settled.layer) {
        return settled;
      }
      return publish(winner);
    }, function () { return settled; });
  }

  /* ---------- universal activation surface ---------- */

  function activate(source) {
    try {
      if (source && ['seated', 'live', 'rtor', 'magnet'].indexOf(source) === -1) source = undefined;
      if (!source && settled) return Promise.resolve(settled);
      if (!source && inflight) return inflight;
      var p = runPass(source).then(function (obj) {
        if (inflight === p) inflight = null;
        return obj;
      }, function () {
        if (inflight === p) inflight = null;
        return settled;
      });
      if (!source) inflight = p;
      return p;
    } catch (e) {
      return Promise.resolve(settled);
    }
  }

  var api = {
    __ghostchainLoader: VERSION,
    version: VERSION,
    magnet: GHOSTCHAIN_MAGNET,
    infohash: GHOSTCHAIN_INFOHASH,
    activate: activate,
    get: function () { return settled; }
  };

  try { window.RTOR_GHOSTCHAIN = api; } catch (e) {}
  try {
    window.RTOR_LOADERS = window.RTOR_LOADERS || {};
    window.RTOR_LOADERS.ghostchain = api;
  } catch (e) {}

  /* ---------- auto-activation ---------- */

  function boot() {
    try { activate(); } catch (e) {}
  }

  try {
    if (typeof document !== 'undefined' && document && document.readyState === 'loading' && document.addEventListener) {
      document.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
  } catch (e) {
    try { boot(); } catch (e2) {}
  }

  /* The site's own "signal returned" hook: rdragon-cryptosocial and the RMAIL
   * seat re-run their resync on the window 'online' event. The loader hooks the
   * same existing signal — a fresh auto pass (never a downgrade) — so a copy
   * that regains signal converges on the live RTOR GhostChain. */
  try {
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('online', function () {
        try {
          runPass(undefined).then(function (winner) {
            if (winner && settled && winner !== settled) { /* publish already handled */ }
          }, noop);
        } catch (e) {}
      });
    }
  } catch (e) {}
})();

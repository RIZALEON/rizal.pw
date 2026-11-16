/* qr-pair 0.1.1 · 2026-10-21 (scan-to-open link; 0.1.0 base, add-only) · DRAGON SKULL / ЯBOT egg skill (data-only, rzl.v1). UNSIGNED until Rizal runs rlab-sign.
 * Commands: qr · qr scan <payload> · qr check · qr peers · qr offer <entry.json>   (registered in skill.json + commands-add.json)
 * What it does: builds a pairing payload (app, platform, version, build, sha256 fingerprints of commands / components / eggs,
 * signer keyId, device, nonce, ts), shows it as a QR made locally (qrcode-gen.js, MIT, offline), verifies a peer's payload
 * against the trust list (rlab-trust-keys.v1), stores the peer record (no secrets), and reports ALIGN / CHECK per field.
 * What it NEVER does: install, seat, sign with a stored key, toggle a device, or touch the network. An update offer only ever
 * becomes a Decider proposal that Rizal confirms on the device with Face ID / Touch ID. No eval. No host APIs except the ones
 * the host passes in ctx (ctx.signer = biometric device signer, ctx.store = local key/value, ctx.rvm = ЯVM for chained jobs). */
(function (root, factory) { var m = factory(root); if (typeof module === 'object' && module.exports) module.exports = m; else root.DS_QRPAIR = m; })(typeof self !== 'undefined' ? self : globalThis, function (root) {
  'use strict';
  var VERSION = 'qr-pair 0.2.5', SCHEMA = 'rzl.qrpair.v1', PREFIX = 'RZLQR1:';
  // 0.1.1: the QR holds an https link so the iPhone Camera recognizes it (raw RZLQR1: text gave 'No usable data found').
  // The payload rides in the #fragment, which browsers never send to the server. Fingerprints are shortened to FP_LEN hex.
  var LINK_BASE = 'https://rizal.info/pair#p=', FP_LEN = 16;
  var REFERENCE_KEY = 'e5833fdfbbfe';               // Neo: reference on a tie (Rizal law: the Neo is the reference version)
  var MAX_AGE_MS = 10 * 60 * 1000, MAX_SKEW_MS = 2 * 60 * 1000;
  var APP_FAMILY = { 'com.rzl.dragonskull': 'dragonskull', 'info.rizal.dragonskull': 'dragonskull' };   // mac id ≠ iOS id, same app
  var subtle = (root.crypto && root.crypto.subtle) || (typeof require === 'function' ? require('crypto').webcrypto.subtle : null);
  var getRandom = function (n) { var a = new Uint8Array(n); (root.crypto || require('crypto').webcrypto).getRandomValues(a); return a; };

  // ---------- small helpers ----------
  function canon(v) {   // canonical JSON: sorted keys, no spaces → same bytes on every device
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
    return '{' + Object.keys(v).sort().filter(function (k) { return v[k] !== undefined; }).map(function (k) { return JSON.stringify(k) + ':' + canon(v[k]); }).join(',') + '}';
  }
  var enc = new TextEncoder(), dec = new TextDecoder();
  function hex(b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
  function b64(bytes) { var s = ''; new Uint8Array(bytes).forEach(function (x) { s += String.fromCharCode(x); }); return (typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'binary').toString('base64')); }
  function unb64(s) { var bin = typeof atob === 'function' ? atob(s) : Buffer.from(s, 'base64').toString('binary'); var a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
  function b64u(s) { return b64(enc.encode(s)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64u(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return dec.decode(unb64(s)); }
  async function sha256(s) { return hex(await subtle.digest('SHA-256', typeof s === 'string' ? enc.encode(s) : s)); }
  function vcmp(a, b) { var x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (var i = 0; i < Math.max(x.length, y.length); i++) { var d = (x[i] || 0) - (y[i] || 0); if (d) return d < 0 ? -1 : 1; } return 0; }
  function vbcmp(a, b) { return vcmp(a.version, b.version) || vcmp(a.build, b.build); }   // version first, then build number
  function sortedIds(list) { return (list || []).map(function (x) { return typeof x === 'string' ? x : (x.id + '@' + (x.version || '')); }).sort(); }

  // ---------- fingerprints ----------
  // state = { app, platform, version, build, device, commands:[ids], components:[{id,version}], eggs:[{id,version}] }
  async function fingerprint(state) {
    var c = await sha256(canon(sortedIds(state.commands))), k = await sha256(canon(sortedIds(state.components))), e = await sha256(canon(sortedIds(state.eggs)));
    return { commands: c, components: k, eggs: e, all: await sha256(c + k + e) };
  }

  function shortFp(f) { return { commands: f.commands.slice(0, FP_LEN), components: f.components.slice(0, FP_LEN), eggs: f.eggs.slice(0, FP_LEN), all: f.all.slice(0, FP_LEN) }; }
  function fpEq(local, peer) { peer = String(peer || ''); return peer.length >= 12 && local.slice(0, peer.length) === peer; }   // full (0.1.0) or short (0.1.1)
  // ---------- payload ----------
  function signedBytes(p) { var q = {}; for (var k in p) if (k !== 'sig') q[k] = p[k]; return enc.encode(canon(q)); }
  /* 0.2.1 fix: hosts that pass no device name (ЯBOT showed 'link for undefined') fall back to deviceName / platform / app */
  function hostDevice(s) { s = s || {}; return s.device || s.deviceName || (s.platform === 'macos' ? 'Neo' : s.platform === 'ios' ? 'iPhone 17e' : s.platform === 'android' ? 'Android' : null) || s.app || 'this device'; }
  async function makePayload(state, ctx) {
    ctx = ctx || {};
    var p = { v: SCHEMA, app: state.app, platform: state.platform, version: String(state.version), build: String(state.build), device: hostDevice(state),
              fp: shortFp(await fingerprint(state)), keyId: ctx.keyId || null, nonce: hex(getRandom(12)), ts: new Date(ctx.now || Date.now()).toISOString(),
              counts: { commands: (state.commands || []).length, components: (state.components || []).length, eggs: (state.eggs || []).length } };
    if (typeof ctx.signer === 'function') {                     // host biometric signer (Secure Enclave / Touch ID). The egg never holds a key.
      if (!p.keyId) throw new Error('signer present but ctx.keyId missing');
      var s = await ctx.signer(signedBytes(p));                 // signs canon(payload without sig), keyId included → { alg: 'p256'|'ed25519', sig: base64 }
      p.sig = { alg: s.alg, b64: s.sig };
    } else p.sig = null;                                         // honest: no signer in this build → payload is UNSIGNED
    return p;
  }
  function encodeRaw(p) { return PREFIX + b64u(canon(p)); }                       // 0.1.0 form, still accepted when pasted
  function encode(p) { return LINK_BASE + b64u(canon(p)); }                      // 0.1.1 form: what the QR holds
  function extract(text) {   // link (https …#p= / ?p=, rzl://pair?p=), RZLQR1:…, or bare base64url → base64url payload, else null
    text = String(text || '').trim().replace(/^\/?qr\s+(scan|pair)\s+/i, '').replace(/\s+/g, '');
    if (text.indexOf(PREFIX) === 0) return text.slice(PREFIX.length);
    var m = /^[a-z][a-z0-9+.-]*:\/\/[^\s]*?[#?&]p=([A-Za-z0-9_-]+)/i.exec(text); if (m) return m[1];
    if (/^eyJ[A-Za-z0-9_-]{20,}$/.test(text)) return text;   // bare base64url of a JSON object
    return null;
  }
  function isPairText(text) { return extract(text) !== null; }
  function decode(text) { var x = extract(text); if (x === null) throw new Error('not a qr-pair link or payload (needs ' + LINK_BASE + '… or ' + PREFIX + '…)'); return JSON.parse(unb64u(x)); }

  // ---------- signature verify (public keys only, from the trust list) ----------
  function derToRaw(d) {   // ECDSA DER → r||s (64 bytes); passes raw through
    if (d.length === 64) return d; if (d[0] !== 0x30) throw new Error('bad sig');
    var i = 2; if (d[1] & 0x80) i = 2 + (d[1] & 0x7f);
    function int() { if (d[i++] !== 2) throw new Error('bad sig'); var n = d[i++], v = d.slice(i, i + n); i += n; while (v.length > 32 && v[0] === 0) v = v.slice(1); var o = new Uint8Array(32); o.set(v, 32 - v.length); return o; }
    var r = int(), s = int(), out = new Uint8Array(64); out.set(r); out.set(s, 32); return out;
  }
  async function verifySig(key, alg, msg, sigB64) {
    var sig = unb64(sigB64);
    if (alg === 'ed25519' && key.ed25519) { var k1 = await subtle.importKey('raw', unb64(key.ed25519), { name: 'Ed25519' }, false, ['verify']); return subtle.verify({ name: 'Ed25519' }, k1, sig, msg); }
    if (alg === 'p256' && key.p256) { var k2 = await subtle.importKey('raw', unb64(key.p256), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']); return subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, k2, derToRaw(sig), msg); }
    return false;
  }
  function findKey(trust, id) { return ((trust && trust.keys) || []).filter(function (k) { return k.keyId === id; })[0] || null; }

  // verify a scanned / pasted payload. seen = set of nonces already used (replay guard)
  async function verifyPayload(text, trust, opts) {
    opts = opts || {}; var r = { ok: false, reasons: [], payload: null, signed: false };
    var p; try { p = decode(text); } catch (e) { r.reasons.push(e.message); return r; }
    r.payload = p;
    if (p.v !== SCHEMA) r.reasons.push('schema ' + p.v + ' ≠ ' + SCHEMA);
    if (!trust || trust.schema !== 'rlab-trust-keys.v1') r.reasons.push('no rlab-trust-keys.v1 list loaded');
    var now = opts.now || Date.now(), t = Date.parse(p.ts);
    if (!(t > 0)) r.reasons.push('bad timestamp'); else { /* 0.2.5: no age limit (Rizal 2026-10-22 4:56 AM MT) */ if (t - now > MAX_SKEW_MS) r.reasons.push('payload timestamp is in the future (clock skew)'); }
    if (opts.seen && opts.seen[p.nonce]) r.reasons.push('nonce already used (single-use)');
    if (opts.latest) { var dk = String(p.device) + '|' + String(p.app), lt = Date.parse(opts.latest[dk] || ''); if (lt > 0 && t > 0 && t < lt) r.reasons.push('superseded: a newer link from ' + p.device + ' was already accepted (' + opts.latest[dk] + ')'); }
    var key = findKey(trust, p.keyId);
    if (!p.keyId) r.reasons.push('no signer keyId'); else if (!key) r.reasons.push('signer ' + p.keyId + ' is not in trust list seq ' + (trust && trust.seq));
    if (!p.sig) r.reasons.push('payload is UNSIGNED (this app build has no device signer)');
    else if (key) { var good = false; try { good = await verifySig(key, p.sig.alg, signedBytes(p), p.sig.b64); } catch (e) { r.reasons.push('signature error: ' + e.message); } if (good) r.signed = true; else r.reasons.push('signature does not verify for ' + p.keyId); }
    r.ok = r.reasons.length === 0; return r;
  }

  // ---------- ALIGN (first successful pairing) and CHECK (any time) ----------
  function referenceOf(a, b) {   // newer version/build wins; tie → Neo (keyId e5833fdfbbfe or device name Neo)
    var c = vbcmp(a, b); if (c > 0) return 'local'; if (c < 0) return 'peer';
    var neo = function (x) { return x.keyId === REFERENCE_KEY || /\bneo\b/i.test(x.device || ''); };
    return neo(a) && !neo(b) ? 'local' : (neo(b) && !neo(a) ? 'peer' : 'local');
  }
  async function compare(localState, localKeyId, peerPayload) {
    var lf = await fingerprint(localState), L = { version: String(localState.version), build: String(localState.build), keyId: localKeyId, device: localState.device }, P = peerPayload;
    var rows = [];
    function row(field, pass, why) { rows.push({ field: field, result: pass ? 'PASS' : 'FAIL', why: why }); }
    var fam = function (id) { return APP_FAMILY[id] || id; };
    row('app', fam(localState.app) === fam(P.app), localState.app + ' vs ' + P.app + (localState.app !== P.app && fam(localState.app) === fam(P.app) ? ' (same app, per-platform bundle id)' : ''));
    row('version', vcmp(L.version, P.version) === 0, L.version + ' vs ' + P.version);
    row('build', vcmp(L.build, P.build) === 0, L.build + ' vs ' + P.build + (vcmp(L.build, P.build) ? ' (app binary: an egg cannot change this; needs a Rizal-approved rebuild)' : ''));
    row('commands', fpEq(lf.commands, P.fp.commands), fpEq(lf.commands, P.fp.commands) ? 'same ' + lf.commands.slice(0, 12) : lf.commands.slice(0, 12) + ' vs ' + P.fp.commands.slice(0, 12) + ' (' + (localState.commands || []).length + ' vs ' + (P.counts || {}).commands + ')');
    row('components', fpEq(lf.components, P.fp.components), fpEq(lf.components, P.fp.components) ? 'same ' + lf.components.slice(0, 12) : lf.components.slice(0, 12) + ' vs ' + P.fp.components.slice(0, 12));
    row('eggs', fpEq(lf.eggs, P.fp.eggs), fpEq(lf.eggs, P.fp.eggs) ? 'same ' + lf.eggs.slice(0, 12) : lf.eggs.slice(0, 12) + ' vs ' + P.fp.eggs.slice(0, 12));
    var ref = referenceOf(L, P);
    return { rows: rows, pass: rows.every(function (r) { return r.result === 'PASS'; }), reference: ref === 'local' ? (L.device + ' (this device)') : (P.device + ' (peer)'), referenceSide: ref, localFp: lf };
  }
  function reportText(title, cmp, verify) {
    var out = [title];
    if (verify) out.push('signer: ' + (verify.ok ? 'PASS trusted ' + verify.payload.keyId : 'FAIL ' + verify.reasons.join('; ')));
    cmp.rows.forEach(function (r) { out.push(r.result + '  ' + r.field + ': ' + r.why); });
    out.push('reference: ' + cmp.reference + ' (newer build wins; tie → Neo)');
    out.push(cmp.pass ? 'ALIGNED.' : 'NOT ALIGNED. Data parts (commands/components/eggs) can be brought over as a signed egg offer → Decider proposal. Version/build parts need a Rizal-approved rebuild.');
    return out.join('\n');
  }

  // ---------- update offers (never installs) ----------
  // entry = rlab-appcast entry { kind, id, version, name, size, sha256, keyId, alg, sig }  bytes = the downloaded egg (Uint8Array) or null
  async function evaluateOffer(entry, bytes, current, trust) {
    var why = [], key = findKey(trust, entry.keyId);
    if (!key) why.push('signer ' + entry.keyId + ' not in trust list');
    var msg = enc.encode('rlab-update-v1\n' + entry.kind + '\n' + entry.id + '\n' + entry.version + '\n' + entry.name + '\n' + entry.size + '\n' + String(entry.sha256).toLowerCase());
    if (key) { var ok = false; try { ok = await verifySig(key, entry.alg, msg, entry.sig || ''); } catch (e) {} if (!ok) why.push('signature does not verify'); }
    if (current && vcmp(entry.version, current) < 0) why.push('downgrade ' + entry.version + ' < ' + current + ' refused');
    if (current && vcmp(entry.version, current) === 0) why.push('same version ' + current + ': nothing to do');
    if (!bytes) why.push('egg bytes not fetched yet'); else { if (bytes.length !== Number(entry.size)) why.push('size mismatch'); if ((await sha256(bytes)) !== String(entry.sha256).toLowerCase()) why.push('sha256 mismatch'); }
    return { verdict: why.length ? 'refuse' : 'propose', why: why, proposal: why.length ? null : {
      kind: 'egg-install', egg: entry.id, version: entry.version, sha256: entry.sha256, signer: entry.keyId, decider: 'ЯID-0001-3QQS',
      needs: 'Rizal confirms on THIS device with Face ID / Touch ID', executed: false } };
  }

  // ---------- QR rendering (local, offline) ----------
  function qrSvg(text, opts) {
    var Q = root.qrcode || (typeof require === 'function' ? require('./qrcode-gen.js') : null); if (!Q) throw new Error('qrcode-gen.js not loaded');
    var q = Q(0, (opts && opts.ecl) || 'L'); q.addData(text, 'Byte'); q.make();
    return { svg: q.createSvgTag({ cellSize: (opts && opts.cell) || 4, margin: 4, scalable: true }), modules: q.getModuleCount(), version: (q.getModuleCount() - 17) / 4 };
  }

  // ---------- command handler ----------
  // ctx = { state, trust, keyId, signer, store:{get,set}, now }  → returns { text, svg? }
  async function handle(line, ctx) {
    var a = String(line || '').trim().replace(/^\/+/, '').split(/\s+/), sub = (a[1] || '').toLowerCase(), store = ctx.store || memStore();
    /* 0.2.0 (add-only): LINK commands live in link.js (DS_LINK) */
    if (a[0].toLowerCase() === 'link') { var LK = root.DS_LINK || (typeof require === 'function' ? require('./link.js') : null); return LK ? LK.handle(line, ctx) : { text: 'link.js not loaded' }; }
    if (isPairText(line) && a[0] !== 'qr') { a = ['qr', 'scan', String(line).trim()]; sub = 'scan'; }   // 0.1.1: a pasted/opened link runs qr scan
    if (a[0] !== 'qr' && a[0] !== 'check') return null;
    if (a[0] === 'check') sub = 'check';
    if (!sub) {
      var p = await makePayload(ctx.state, ctx), t = encode(p), q = qrSvg(t);
      store.set('qr.lastNonce', p.nonce);
      return { text: 'qr-pair link for ' + p.device + ' · ' + p.app + ' ' + p.version + ' (' + p.build + ') · fp ' + p.fp.all.slice(0, 12) + (p.sig ? ' · signed ' + p.keyId : ' · UNSIGNED (no device signer in this build)') + '\nScan with the other device\'s Camera (opens the pair page), or paste this link into the other app\'s chat and press Send:\n' + t + '\nQR version ' + q.version + ' · ' + t.length + ' chars', svg: q.svg, payload: t };
    }
    if (sub === 'scan' || sub === 'pair') {
      var v = await verifyPayload(a.slice(2).join(''), ctx.trust, { now: ctx.now, seen: store.get('qr.seen') || {}, latest: store.get('qr.latest') || {} });
      if (!v.payload) return { text: 'qr scan: FAIL ' + v.reasons.join('; ') };
      if (v.ok) { var seen = store.get('qr.seen') || {}; seen[v.payload.nonce] = 1; store.set('qr.seen', seen); var lq = store.get('qr.latest') || {}, dq = String(v.payload.device) + '|' + String(v.payload.app); if (!(Date.parse(lq[dq] || '') >= Date.parse(v.payload.ts))) lq[dq] = v.payload.ts; store.set('qr.latest', lq); }
      var cmp = await compare(ctx.state, ctx.keyId, v.payload);
      if (!v.ok) return { text: reportText('qr scan: NOT PAIRED (peer record not stored)', cmp, v) + '\n\nTWO-WAY: now show this device\'s own qr back (type qr, or tap "Show my QR back") and scan it on ' + v.payload.device + '.', compare: cmp, offerBack: true };
      var peers = store.get('qr.peers') || {}, first = !peers[v.payload.keyId];
      peers[v.payload.keyId] = { device: v.payload.device, app: v.payload.app, platform: v.payload.platform, version: v.payload.version, build: v.payload.build, fp: v.payload.fp, counts: v.payload.counts || {}, pairedAt: peers[v.payload.keyId] ? peers[v.payload.keyId].pairedAt : v.payload.ts, lastSeen: v.payload.ts };
      store.set('qr.peers', peers);
      return { text: reportText(first ? 'ALIGN REPORT (first pairing with ' + v.payload.device + ')' : 'qr scan: re-checked ' + v.payload.device, cmp, v) + '\n\nTWO-WAY: now show this device\'s own qr back (type qr, or tap "Show my QR back") and scan it on ' + v.payload.device + '.', compare: cmp, offerBack: true };
    }
    if (sub === 'check') {
      var peers2 = store.get('qr.peers') || {}, ids = Object.keys(peers2); if (!ids.length) return { text: 'qr check: no paired peer yet. Run qr on one device and qr scan on the other.' };
      var out = [];
      for (var i = 0; i < ids.length; i++) { var pr = peers2[ids[i]]; var c2 = await compare(ctx.state, ctx.keyId, { app: pr.app, version: pr.version, build: pr.build, fp: pr.fp, device: pr.device, keyId: ids[i], counts: pr.counts || {} });
        out.push(reportText('CHECK vs ' + pr.device + ' (record from ' + pr.lastSeen + '; for a live check scan a fresh qr)', c2)); }
      return { text: out.join('\n\n') };
    }
    if (sub === 'peers') { var p3 = store.get('qr.peers') || {}; return { text: Object.keys(p3).map(function (k) { var x = p3[k]; return k + '  ' + x.device + '  ' + x.version + ' (' + x.build + ')  fp ' + x.fp.all.slice(0, 12) + '  last ' + x.lastSeen; }).join('\n') || 'no peers' }; }
    if (sub === 'offer') { var e; try { e = JSON.parse(a.slice(2).join(' ')); } catch (x) { return { text: 'qr offer: paste a signed appcast entry as JSON' }; }
      var ev = await evaluateOffer(e, ctx.offerBytes || null, (ctx.state.eggs || []).filter(function (g) { return g.id === e.id; }).map(function (g) { return g.version; })[0] || null, ctx.trust);
      return { text: ev.verdict === 'propose' ? 'qr offer: verified. Decider proposal written for Rizal (Face ID / Touch ID confirm on this device). NOT installed.' : 'qr offer: refused: ' + ev.why.join('; '), offer: ev }; }
    return { text: 'qr commands (0.2.5): link · link help · link status · link sync · link peers · qr · qr scan <link or payload> · (paste a pair link) · qr check · qr peers · qr offer <entry>' };
  }
  // 0.1.1: when the page itself was opened with a pair link (#p= / ?p=), hand back the line to put in the composer.
  // The host pre-fills it; the scan runs on the user's own Send (DRAGONGATE gesture rule stays).
  function linkFromLocation(loc) { try { var h = String((loc && (loc.hash || '')) + '&' + (loc && loc.search || '')); var m = /[#?&]p=([A-Za-z0-9_-]+)/.exec(h); return m ? LINK_BASE + m[1] : null; } catch (e) { return null; } }
  function memStore() { var m = {}; return { get: function (k) { return m[k]; }, set: function (k, v) { m[k] = v; } }; }

  return { VERSION: VERSION, SCHEMA: SCHEMA, canon: canon, sha256: sha256, fingerprint: fingerprint, makePayload: makePayload, encode: encode, encodeRaw: encodeRaw, decode: decode, extract: extract, isPairText: isPairText, linkFromLocation: linkFromLocation, LINK_BASE: LINK_BASE, FP_LEN: FP_LEN,
           verifyPayload: verifyPayload, compare: compare, referenceOf: referenceOf, reportText: reportText, evaluateOffer: evaluateOffer, qrSvg: qrSvg, handle: handle, memStore: memStore, signedBytes: signedBytes };
});

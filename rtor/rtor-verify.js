/* RTOR verify 1.2 (1.0 2026-11-17 RBOT for Rizal t31u; 1.1 2026-11-18 Rizal t176u: lab-device sources; 1.2 Rizal t177u: GHOSTKEY). Browser + Node + WebView. MIT-style, no deps.
 * Pinned owner release key (Ed25519, keyId e5833fdfbbfe) = the same key already embedded in RDRAGON SelfUpdate,
 * DragonGate and ThundR thundr-link, and used by rlab-sign / ЯCASKET Face ID. PUBLIC key only.
 * Message format = rlab-update-v1 (identical to rlab-sign entry_message), so phone signatures verify directly:
 *   "rlab-update-v1\n<kind>\n<id>\n<version>\n<name>\n<size>\n<sha256 lowercase>"
 * Fail-closed: anything unsigned, malformed, tampered or signed by another key is refused.
 * 1.1 (t176u): an update whose SOURCE is one of the three lab devices (iPhone 17e, MacBook Neo, Moto Android) is accepted
 *   for seed / leech / send / receive ONLY if its sidecar carries {device:<fp>, p256:<ECDSA-P256-SHA256 sig>} by a PINNED
 *   device PUBLIC key (rtor-devices.json; ASSM trusted-devices keys) over
 *   "rlab-device-update-v1\n<fp>\n<kind>\n<id>\n<version>\n<name>\n<size>\n<sha256 lowercase>".
 *   A plain 'source' / 'from' / 'device' label is NOT a signature: refused. Owner e5833fdfbbfe stays accepted for every op.
 *   Use verifyItemFrom(item, op) / verifyItemBytesFrom(item, bytes, op); verifyItem / verifyItemBytes (owner only) are unchanged.
 * 1.2 (t177u): GHOSTKEY = ONE trust root + keyring. root = owner e5833fdfbbfe; members = the pinned lab-device keys (ghostkey.json).
 *   'signed by GHOSTKEY' = verifyGhostkey(item, op[, {ring}]): root signature, or an ACTIVE member allowed op. A ring fetched from
 *   the web counts only via ringFromSigned(ringBytes, rootSidecar) (root-signed); otherwise the PINNED ring is used.
 *   The authorization label 'owner-command' / 'authorized-by-owner-command' is renamed 'ghostkey' / 'authorized-by-ghostkey'
 *   (old names = read-only aliases). Any label without a real signature + size/sha256 is REFUSED.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RTOR_VERIFY = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var KEY_ID = 'e5833fdfbbfe';
  var PUBKEY_B64 = 'zs7M4OOB0zQhWOQw3SHpAY+XYxbZJvcPESy1y400Ti0=';
  var subtle = (typeof crypto !== 'undefined' && crypto.subtle) ? crypto.subtle : null;
  var te = new TextEncoder();
  function b64d(s) { if (typeof atob === 'function') { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; } return new Uint8Array(Buffer.from(s, 'base64')); }
  function hex(u) { return Array.prototype.map.call(new Uint8Array(u), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
  function message(i) { return te.encode('rlab-update-v1\n' + i.kind + '\n' + i.id + '\n' + i.version + '\n' + i.name + '\n' + (i.size | 0) + '\n' + String(i.sha256).toLowerCase()); }
  function sha256Hex(bytes) { return subtle.digest('SHA-256', bytes).then(hex); }
  // ---- pure-JS Ed25519 verify (RFC 8032), used when WebCrypto has no Ed25519 ----
  var P = (1n << 255n) - 19n, L = (1n << 252n) + 27742317777372353535851937790883648493n;
  function mod(a, m) { m = m || P; var r = a % m; return r >= 0n ? r : r + m; }
  function pow(b, e) { var r = 1n; b = mod(b); while (e > 0n) { if (e & 1n) r = r * b % P; b = b * b % P; e >>= 1n; } return r; }
  function inv(x) { return pow(x, P - 2n); }
  var D = mod(-121665n * inv(121666n)), I = pow(2n, (P - 1n) / 4n);
  function recoverX(y, sign) { if (y >= P) return null; var x2 = (y * y - 1n) * inv(D * y * y + 1n) % P; x2 = mod(x2); if (x2 === 0n) return sign ? null : 0n; var x = pow(x2, (P + 3n) / 8n); if (mod(x * x - x2) !== 0n) x = x * I % P; if (mod(x * x - x2) !== 0n) return null; if (Number(x & 1n) !== sign) x = P - x; return x; }
  function le(u) { var n = 0n; for (var i = u.length - 1; i >= 0; i--) n = (n << 8n) + BigInt(u[i]); return n; }
  function decode(u) { if (u.length !== 32) return null; var y = le(u) & ((1n << 255n) - 1n), s = u[31] >> 7, x = recoverX(y, s); return x === null ? null : [x, y, 1n, x * y % P]; }
  function add(a, b) { var A = mod((a[1] - a[0]) * (b[1] - b[0])), B = mod((a[1] + a[0]) * (b[1] + b[0])), C = mod(2n * a[3] * b[3] * D), Dd = mod(2n * a[2] * b[2]), E = B - A, F = Dd - C, G = Dd + C, H = B + A; return [mod(E * F), mod(G * H), mod(F * G), mod(E * H)]; }
  function mul(s, p) { var q = [0n, 1n, 1n, 0n]; while (s > 0n) { if (s & 1n) q = add(q, p); p = add(p, p); s >>= 1n; } return q; }
  function eq(a, b) { return mod(a[0] * b[2] - b[0] * a[2]) === 0n && mod(a[1] * b[2] - b[1] * a[2]) === 0n; }
  var GY = mod(4n * inv(5n)), G = [recoverX(GY, 0), GY, 1n, recoverX(GY, 0) * GY % P];
  function pureVerify(pub, msg, sig) {
    if (sig.length !== 64 || pub.length !== 32) return Promise.resolve(false);
    var A = decode(pub), R = decode(sig.slice(0, 32)); if (!A || !R) return Promise.resolve(false);
    var S = le(sig.slice(32)); if (S >= L) return Promise.resolve(false);
    var buf = new Uint8Array(64 + msg.length); buf.set(sig.slice(0, 32), 0); buf.set(pub, 32); buf.set(msg, 64);
    return subtle.digest('SHA-512', buf).then(function (h) { var k = le(new Uint8Array(h)) % L; return eq(mul(S, G), add(R, mul(k, A))); });
  }
  function ed25519Verify(pub, msg, sig, opts) {
    if (opts && opts.forcePure) return pureVerify(pub, msg, sig);
    return subtle.importKey('raw', pub, { name: 'Ed25519' }, false, ['verify'])
      .then(function (k) { return subtle.verify({ name: 'Ed25519' }, k, sig, msg); })
      .catch(function () { return pureVerify(pub, msg, sig); });
  }
  function checkItemShape(i) {
    if (!i || typeof i !== 'object') return 'not an object';
    if (!i.kind || !i.id || !i.version || !i.name) return 'missing kind/id/version/name';
    if (/[\n\/]/.test(i.name) || /\n/.test(i.id + i.version + i.kind)) return 'bad characters';
    if (!(Number.isInteger(i.size) && i.size >= 0)) return 'bad size';
    if (!/^[0-9a-fA-F]{64}$/.test(String(i.sha256))) return 'bad sha256';
    if (!i.ed25519) return 'UNSIGNED - refused';
    return null;
  }
  // ---- 1.1 lab-device sources (t176u) ----
  var OPS = ['seed', 'leech', 'send', 'receive'];
  var DEVICES = [{"device": "moto-android", "name": "Moto Android (moto g 5G 2024)", "alg": "p256", "fp": "da2a35874ca0", "pub": "BJ2gcujdupTUPkYwWIkOtoSmCawEMsJUa1FZpLOMMhJWmXnnB3jQ8FOchLUYkMo5hSLsQY76/zsviS015sArJw8=", "ops": ["seed", "leech", "send", "receive"], "status": "ACTIVE"}, {"device": "iphone-17e", "name": "iPhone 17e", "alg": "p256", "fp": "772af9d72bb8", "pub": "BNgvRd5vEs5IY99EYQJEw8gRjyBzXzKVd+mqXWZ4O5jC30WUZPzN61OlrCkS5zlkqrBFUrmbwcy2y4XwrlL42E0=", "ops": ["seed", "leech", "send", "receive"], "status": "ACTIVE"}, {"device": "macbook-neo", "name": "MacBook Neo", "alg": "p256", "fp": "f905b7901a31", "pub": "BOoPUkxxeAbH6dEckSD/5Yd8oITBeMcFv4U93YMjskOS4MUdrSWKN3SslcKtlOgOGZ1f1XzcR1JPPLV1nO7+nZo=", "ops": ["seed", "leech", "send", "receive"], "status": "ACTIVE"}, {"device": "iphone-17e", "name": "RCODE iPhone 17e", "alg": "p256", "fp": "cd8e3026fe33", "pub": "BCcy7Y8Lj/r+1RbjCd63/bT6jgfh4RMEPfodtyu+ChLyNT1ExNpfKRTENXf2MkItuP6aOdFYCTmtc1Gn1t/c7Mo=", "ops": ["seed", "leech", "send", "receive"], "status": "ACTIVE"}, {"device": "macbook-neo", "name": "RCODE MacBook Neo", "alg": "p256", "fp": "75b0428a4d67", "pub": "BEH5Ycewp3ijwMS8lRudQRdzar8ZDfQC8da3Im8VRGdGKKPokdb+fqXSuhX21xJppFmes+kLnYAilGLpSTTCYiM=", "ops": ["seed", "leech", "send", "receive"], "status": "ACTIVE"}, {"device": "macbook-neo", "name": "RCODE MacBook Neo approver", "alg": "p256", "fp": "5e110f5d1b4c", "pub": "BFXXdb55AHC7g9se6/z07WMClqN8qJySo+O9b5gKM2JOWyO0N9UpcKeNdkHFDQiCRIrBltsUGExYkuFphOKJLV0=", "ops": ["seed", "leech", "send", "receive"], "status": "ACTIVE"}];   // PINNED GHOSTKEY ring members: PUBLIC keys only (ghostkey.json 2026-11-18.2, was rtor-devices.json)
  var GHOSTKEY = { name: 'GHOSTKEY', root: { keyId: KEY_ID, alg: 'ed25519', pub: PUBKEY_B64 }, members: DEVICES, ringVersion: '2026-11-18.2', ringSigned: false };   // PINNED ring (ghostkey.json)
  var AUTH_ALIASES = { 'owner-command': 'ghostkey', 'authorized-by-owner-command': 'authorized-by-ghostkey' };   // read-only aliases (t177u)
  function authOf(i) { var a = i && (i.authorization || i.status); if (!a) return null; a = String(a); return AUTH_ALIASES[a] || a; }
  function isLabel(i) { return !!(i.source || i.from || i.device || /ghostkey|owner-command/i.test(String(i.authorization || '') + ' ' + String(i.status || ''))); }
  function shapeOnly(i) { var x = checkItemShape(Object.assign({}, i, { ed25519: 'x' })); return x; }
  function deviceMessage(i, fp) { return te.encode('rlab-device-update-v1\n' + fp + '\n' + i.kind + '\n' + i.id + '\n' + i.version + '\n' + i.name + '\n' + (i.size | 0) + '\n' + String(i.sha256).toLowerCase()); }
  function derToRaw(u) {   // ECDSA DER -> raw r||s (64 bytes); raw passes through
    if (u.length === 64) return u;
    if (u[0] !== 0x30) return null; var i = 2; if (u[1] & 0x80) i = 2 + (u[1] & 0x7f);
    function int() { if (u[i] !== 2) return null; var l = u[i + 1], v = u.slice(i + 2, i + 2 + l); i += 2 + l; while (v.length > 32 && v[0] === 0) v = v.slice(1); if (v.length > 32) return null; var o = new Uint8Array(32); o.set(v, 32 - v.length); return o; }
    var r = int(), s = int(); if (!r || !s) return null; var out = new Uint8Array(64); out.set(r, 0); out.set(s, 32); return out;
  }
  function p256Verify(pubB64, msg, sigB64) {
    if (!subtle) return Promise.resolve(false);
    var raw; try { raw = derToRaw(b64d(sigB64)); } catch (e) { raw = null; } if (!raw) return Promise.resolve(false);
    return subtle.importKey('raw', b64d(pubB64), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
      .then(function (k) { return subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, k, raw, msg); }).catch(function () { return false; });
  }
  function refuse(why) { return Promise.resolve({ ok: false, why: why }); }
  /** Accept an item for op (seed|leech|send|receive) if signed by the owner OR by a pinned lab device allowed that op.
   *  opts.devices is for TEST fixtures only. Resolves {ok, why, signer}. */
  function verifyItemFrom(i, op, opts) {
    if (OPS.indexOf(op) < 0) return refuse('unknown op ' + op + ' - refused');
    var bad = shapeOnly(i); if (bad) return refuse(bad);
    var owner = i.ed25519 ? verifyItem(i, opts) : Promise.resolve({ ok: false, why: 'UNSIGNED - refused' });
    return owner.then(function (r) {
      if (r.ok) return { ok: true, signer: 'GHOSTKEY root ' + KEY_ID, op: op, authorization: authOf(i) };
      if (!i.p256) return (i.ed25519 ? r : { ok: false, why: isLabel(i) ? 'UNSIGNED - a label (ghostkey / owner-command / source / device) is not a signature - refused' : 'UNSIGNED - refused' });
      var list = (opts && opts.devices) || DEVICES, d = null;
      for (var k = 0; k < list.length; k++) if (list[k].fp === i.device) d = list[k];
      if (!d) return { ok: false, why: 'unknown device ' + String(i.device) + ' - refused' };
      if ((d.status || 'ACTIVE') !== 'ACTIVE') return { ok: false, why: 'device ' + d.fp + ' not ACTIVE - refused' };
      if ((d.ops || []).indexOf(op) < 0) return { ok: false, why: 'device ' + d.fp + ' not allowed to ' + op + ' - refused' };
      return sha256Hex(b64d(d.pub)).then(function (h) {
        if (h.slice(0, 12) !== d.fp) return { ok: false, why: 'pinned key fingerprint mismatch - refused' };
        return p256Verify(d.pub, deviceMessage(i, d.fp), i.p256).then(function (ok) {
          return ok ? { ok: true, signer: 'GHOSTKEY member ' + d.device + ' ' + d.fp, op: op, authorization: authOf(i) } : { ok: false, why: 'device signature invalid - refused' };
        });
      });
    });
  }
  /** A GHOSTKEY ring from the web counts only if the ROOT signed it: sidecar {kind:'ghostkey', id:'ghostkey-ring', name:'ghostkey.json'}.
   *  Resolves {ok, why, ring:{version, members}}. opts.pubKeyB64 is for TEST fixtures only. */
  function ringFromSigned(ringBytes, sidecar, opts) {
    if (!sidecar || sidecar.kind !== 'ghostkey' || sidecar.id !== 'ghostkey-ring' || sidecar.name !== 'ghostkey.json') return refuse('not a GHOSTKEY ring sidecar - refused');
    return verifyItemBytes(sidecar, ringBytes, opts).then(function (r) {
      if (!r.ok) return { ok: false, why: 'ring not root-signed: ' + r.why };
      var g; try { g = JSON.parse(new TextDecoder().decode(ringBytes instanceof Uint8Array ? ringBytes : new Uint8Array(ringBytes))); } catch (e) { return { ok: false, why: 'ring unreadable - refused' }; }
      var ms = g.members || g.keys; if (!Array.isArray(ms)) return { ok: false, why: 'ring has no members - refused' };
      return Promise.all(ms.map(function (m) { return sha256Hex(b64d(m.pub)).then(function (h) { return m.alg === 'p256' && h.slice(0, 12) === m.fp; }); })).then(function (oks) {
        if (oks.indexOf(false) >= 0) return { ok: false, why: 'ring member fingerprint mismatch - refused' };
        return { ok: true, ring: { version: g.version, members: ms, ringSigned: true } };
      });
    });
  }
  /** 'signed by GHOSTKEY': root OR ACTIVE ring member allowed op. opts.ring = a ring from ringFromSigned (else the pinned ring). */
  function verifyGhostkey(i, op, opts) { var o = Object.assign({}, opts || {}); if (o.ring) o.devices = o.ring.members; return verifyItemFrom(i, op, o); }
  function verifyGhostkeyBytes(i, bytes, op, opts) { var o = Object.assign({}, opts || {}); if (o.ring) o.devices = o.ring.members; return verifyItemBytesFrom(i, bytes, op, o); }
  function verifyItemBytesFrom(i, bytes, op, opts) {
    return verifyItemFrom(i, op, opts).then(function (r) {
      if (!r.ok) return r;
      var u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      if (u.length !== i.size) return { ok: false, why: 'size mismatch - refused' };
      return sha256Hex(u).then(function (h) { return h === String(i.sha256).toLowerCase() ? r : { ok: false, why: 'sha256 mismatch - refused' }; });
    });
  }
  /** Verify the owner signature on an item. opts.pubKeyB64 is for TEST fixtures only. Resolves {ok, why}. */
  function verifyItem(i, opts) {
    var bad = checkItemShape(i); if (bad) return Promise.resolve({ ok: false, why: bad });
    if (i.keyId && i.keyId !== KEY_ID && !(opts && opts.pubKeyB64)) return Promise.resolve({ ok: false, why: 'keyId mismatch' });
    var sig; try { sig = b64d(i.ed25519); } catch (e) { return Promise.resolve({ ok: false, why: 'bad signature encoding' }); }
    if (sig.length !== 64) return Promise.resolve({ ok: false, why: 'bad signature length' });
    return ed25519Verify(b64d((opts && opts.pubKeyB64) || PUBKEY_B64), message(i), sig, opts)
      .then(function (ok) { return ok ? { ok: true } : { ok: false, why: 'signature invalid - refused' }; });
  }
  /** Signature + exact bytes (size and sha256). */
  function verifyItemBytes(i, bytes, opts) {
    return verifyItem(i, opts).then(function (r) {
      if (!r.ok) return r;
      var u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      if (u.length !== i.size) return { ok: false, why: 'size mismatch - refused' };
      return sha256Hex(u).then(function (h) { return h === String(i.sha256).toLowerCase() ? { ok: true } : { ok: false, why: 'sha256 mismatch - refused' }; });
    });
  }
  /** Fetch url + its signed entry (url + '.sig.json'), verify, resolve {ok, why, bytes}. */
  function fetchVerified(url, opts) {
    return Promise.all([fetch(url, { cache: 'no-store' }), fetch(url.replace(/(\?.*)?$/, '.sig.json'), { cache: 'no-store' })])
      .then(function (rs) { if (!rs[0].ok || !rs[1].ok) return { ok: false, why: 'missing file or signature (HTTP)' }; return Promise.all([rs[0].arrayBuffer(), rs[1].json()]); })
      .then(function (x) { if (!Array.isArray(x)) return x; var bytes = new Uint8Array(x[0]); return verifyItemBytes(x[1], bytes, opts).then(function (r) { r.bytes = r.ok ? bytes : null; r.entry = x[1]; return r; }); })
      .catch(function (e) { return { ok: false, why: 'verify error: ' + (e && e.message) }; });
  }
  return { VERSION: '1.2', KEY_ID: KEY_ID, PUBKEY_B64: PUBKEY_B64, OPS: OPS, DEVICES: DEVICES, GHOSTKEY: GHOSTKEY, AUTH_ALIASES: AUTH_ALIASES, authOf: authOf, ringFromSigned: ringFromSigned, verifyGhostkey: verifyGhostkey, verifyGhostkeyBytes: verifyGhostkeyBytes, message: message, deviceMessage: deviceMessage, verifyItem: verifyItem, verifyItemBytes: verifyItemBytes, verifyItemFrom: verifyItemFrom, verifyItemBytesFrom: verifyItemBytesFrom, fetchVerified: fetchVerified, _pureVerify: pureVerify };
}));

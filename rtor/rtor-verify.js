/* RTOR verify 1.0 (2026-11-17, RBOT for Rizal t31u). Browser + Node + WebView. MIT-style, no deps.
 * Pinned owner release key (Ed25519, keyId e5833fdfbbfe) = the same key already embedded in RDRAGON SelfUpdate,
 * DragonGate and ThundR thundr-link, and used by rlab-sign / ЯCASKET Face ID. PUBLIC key only.
 * Message format = rlab-update-v1 (identical to rlab-sign entry_message), so phone signatures verify directly:
 *   "rlab-update-v1\n<kind>\n<id>\n<version>\n<name>\n<size>\n<sha256 lowercase>"
 * Fail-closed: anything unsigned, malformed, tampered or signed by another key is refused.
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
  return { VERSION: '1.0', KEY_ID: KEY_ID, PUBKEY_B64: PUBKEY_B64, message: message, verifyItem: verifyItem, verifyItemBytes: verifyItemBytes, fetchVerified: fetchVerified, _pureVerify: pureVerify };
}));

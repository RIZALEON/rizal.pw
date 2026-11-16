/* rid.v1 — Package ЯID (shared spec with RZL-ENJIN bin/rzl_rid.py · FORMAT-RID.md) */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m; else root.YaSeedRid = m;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';
  var CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  var CLASSES = ['DATA','PROMPT','REPLY','ACTION','MODEL','EGG','SEED','BLOCK','EXPERT','KEY','DEVICE','EVENT'];
  var ALIASES = {data:'DATA',prompt:'PROMPT',reply:'REPLY',action:'ACTION',model:'MODEL',egg:'EGG',seed:'SEED',block:'BLOCK',expert:'EXPERT',key:'KEY',device:'DEVICE',event:'EVENT'};
  var RE = new RegExp('^Я-(' + CLASSES.join('|') + ')-([0-9A-HJKMNP-TV-Z]{10})-([0-9A-HJKMNP-TV-Z]{2})$');
  function normalizeClass(c) {
    if (!c) return 'DATA';
    var u = String(c).trim().toUpperCase();
    if (CLASSES.indexOf(u) >= 0) return u;
    return ALIASES[String(c).trim().toLowerCase()] || 'DATA';
  }
  function b32(bytes) {
    var bits = '', i, j, out = '';
    for (i = 0; i < bytes.length; i++) bits += bytes[i].toString(2).padStart(8, '0');
    for (j = 0; j + 5 <= bits.length; j += 5) out += CROCKFORD[parseInt(bits.slice(j, j + 5), 2)];
    if (j < bits.length) out += CROCKFORD[parseInt(bits.slice(j).padEnd(5, '0'), 2)];
    return out;
  }
  async function sha256Bytes(str) {
    var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return new Uint8Array(buf);
  }
  async function checksum2Async(cls, body) {
    var h = await sha256Bytes(cls + '|' + body);
    var v = ((h[0] << 8) | h[1]) & 1023;
    return CROCKFORD[(v >> 5) & 31] + CROCKFORD[v & 31];
  }
  function material(payloadHash, parent, device, seq, cls) {
    var ph = String(payloadHash || '').replace(/^sha256:/, '');
    return ph + '|' + (parent || '') + '|' + (device || '') + '|' + (seq | 0) + '|' + normalizeClass(cls);
  }
  async function mint(payloadHash, parent, device, seq, cls) {
    cls = normalizeClass(cls);
    var digest = await sha256Bytes(material(payloadHash, parent, device, seq, cls));
    var body = b32(digest.slice(0, 7)).slice(0, 10);
    while (body.length < 10) body += '0';
    body = body.slice(0, 10);
    var ck = await checksum2Async(cls, body);
    return 'Я-' + cls + '-' + body + '-' + ck;
  }
  async function verify(rid) {
    var m = RE.exec(rid || '');
    if (!m) return { ok: false, problems: ['format mismatch'] };
    var ck = await checksum2Async(m[1], m[2]);
    if (ck !== m[3]) return { ok: false, problems: ['checksum mismatch (got ' + m[3] + ', want ' + ck + ')'] };
    return { ok: true, problems: [], class: m[1], body: m[2], checksum: m[3] };
  }
  return { VERSION: 'rid.v1', CLASSES: CLASSES, normalizeClass: normalizeClass, material: material, mint: mint, verify: verify };
});

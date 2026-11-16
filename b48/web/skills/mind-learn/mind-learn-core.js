/* mind-learn-core 0.1.0 · 2026-10-22 · DRAGON SKULL learning core (UNSIGNED, STAGED)
 * Learns like Grok Bot: PROFILE (durable facts about Rizal), JOURNAL (dated notes), SKILLS (saved multi-step tasks).
 * NEVER FORGETS: one append-only, hash-chained ledger. No delete, no overwrite, no edit API exists.
 * A correction is a NEW entry with `supersedes:<id>`; the old entry stays forever and is still searchable.
 * Pure JS, no deps, sync SHA-256: runs in the app WebView, in node (tests), and offline. */
(function (root) {
  "use strict";
  var K = [], H0 = [];
  (function () { var n = 2, c = 0; function frac(x) { return ((x - Math.floor(x)) * 4294967296) >>> 0; }
    while (c < 64) { var p = true; for (var d = 2; d * d <= n; d++) if (n % d === 0) { p = false; break; }
      if (p) { if (c < 8) H0[c] = frac(Math.sqrt(n)); K[c] = frac(Math.cbrt(n)); c++; } n++; } })();
  function utf8(s) { return unescape(encodeURIComponent(s)); }
  function sha256(str) {
    var s = utf8(str), l = s.length, w = [], i, j, H = H0.slice();
    var words = []; for (i = 0; i < l; i++) words[i >> 2] |= s.charCodeAt(i) << (24 - (i % 4) * 8);
    words[l >> 2] |= 0x80 << (24 - (l % 4) * 8); words[(((l + 8) >> 6) + 1) * 16 - 1] = l * 8;
    function r(x, n) { return (x >>> n) | (x << (32 - n)); }
    for (j = 0; j < words.length; j += 16) {
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (i = 0; i < 64; i++) {
        if (i < 16) w[i] = words[j + i] | 0;
        else { var x = w[i - 15], y = w[i - 2];
          w[i] = (w[i - 16] + (r(x, 7) ^ r(x, 18) ^ (x >>> 3)) + w[i - 7] + (r(y, 17) ^ r(y, 19) ^ (y >>> 10))) | 0; }
        var t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
        var t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map(function (v) { return ("00000000" + (v >>> 0).toString(16)).slice(-8); }).join("");
  }
  var GENESIS = "0".repeat(64), KINDS = { profile: 1, journal: 1, skill: 1 };
  // Secrets never enter the mind (VERSION LAW: private mind; still never store keys/tokens/codes).
  var SECRET = /(sk-[A-Za-z0-9]{12,}|gh[pousr]_[A-Za-z0-9]{20,}|xox[abp]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY|\b(?:password|passwd|token|secret|api[_-]?key|seed phrase|mnemonic)\s*[:=]\s*\S+|\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b)/i;
  function canon(e) { return JSON.stringify([e.seq, e.ts, e.kind, e.id, e.supersedes || null, e.body, e.prev]); }
  function words(s) { return String(s).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(function (w) { return w.length > 1; }); }

  /* backend: { load() -> [entries], append(entry) } — append is the ONLY write the backend ever gets. */
  function Mind(backend, opts) {
    opts = opts || {}; this.b = backend; this.now = opts.now || function () { return new Date().toISOString(); };
    this.log = (backend.load() || []).slice(); var v = this.verify(); if (!v.ok) this.broken = v;
  }
  Mind.prototype.head = function () { return this.log.length ? this.log[this.log.length - 1].hash : GENESIS; };
  Mind.prototype.append = function (kind, body, o) {
    o = o || {};
    if (this.broken) throw new Error("mind chain broken at seq " + this.broken.at + "; refusing to write (nothing lost, run verify)");
    if (!KINDS[kind]) throw new Error("kind must be profile|journal|skill");
    if (kind === "skill" && !(body && body.name && Array.isArray(body.steps) && body.steps.length)) throw new Error("skill needs {name, steps[]}");
    if (kind !== "skill" && typeof body !== "string") throw new Error(kind + " body must be text");
    if (SECRET.test(JSON.stringify(body))) throw new Error("looks like a secret (key/token/password/card); not stored");
    if (o.supersedes && !this.byId(o.supersedes)) throw new Error("supersedes unknown id " + o.supersedes);
    var seq = this.log.length, ts = this.now();
    var e = { seq: seq, ts: ts, kind: kind, id: kind[0] + seq.toString(36) + "-" + sha256(ts + JSON.stringify(body)).slice(0, 6),
      supersedes: o.supersedes || null, body: body, tags: o.tags || [], src: o.src || "chat", prev: this.head() };
    e.hash = sha256(canon(e));
    this.b.append(JSON.parse(JSON.stringify(e))); this.log.push(e); return e;
  };
  Mind.prototype.byId = function (id) { for (var i = 0; i < this.log.length; i++) if (this.log[i].id === id) return this.log[i]; return null; };
  Mind.prototype.verify = function () {
    var prev = GENESIS;
    for (var i = 0; i < this.log.length; i++) { var e = this.log[i];
      if (e.seq !== i || e.prev !== prev || sha256(canon(e)) !== e.hash) return { ok: false, at: i, n: this.log.length };
      prev = e.hash; }
    return { ok: true, n: this.log.length, head: prev };
  };
  Mind.prototype.supersededSet = function () { var s = {}; this.log.forEach(function (e) { if (e.supersedes) s[e.supersedes] = e.id; }); return s; };
  // current view: newest version of each fact/skill. Old versions are kept and flagged, never removed.
  Mind.prototype.current = function (kind) { var s = this.supersededSet();
    return this.log.filter(function (e) { return (!kind || e.kind === kind) && !s[e.id]; }); };
  Mind.prototype.search = function (q, o) {
    o = o || {}; var qs = words(q), s = this.supersededSet(), now = Date.now();
    if (!qs.length) return [];
    return this.log.map(function (e) {
      var txt = words(typeof e.body === "string" ? e.body : e.body.name + " " + (e.body.when || "") + " " + e.body.steps.join(" ")).concat(e.tags.map(String));
      var hit = 0; qs.forEach(function (w) { if (txt.indexOf(w) >= 0) hit += 2; else if (txt.some(function (t) { return t.indexOf(w) === 0; })) hit += 1; });
      if (!hit) return null;
      var score = hit + (e.kind === "profile" ? 1 : 0) + (e.kind === "skill" ? 1 : 0) - (s[e.id] ? 3 : 0)
        + Math.max(0, 1 - (now - Date.parse(e.ts)) / (30 * 864e5));
      return { e: e, score: score, superseded_by: s[e.id] || null };
    }).filter(Boolean).filter(function (r) { return o.history || !r.superseded_by; })
      .sort(function (a, b) { return b.score - a.score; }).slice(0, o.limit || 8);
  };
  // Called BEFORE acting on any request: profile facts + matching skills + recent journal, as a context block for Granite.
  Mind.prototype.recall = function (q) {
    var hits = this.search(q, { limit: 10 }), prof = this.current("profile").slice(-12);
    var skills = hits.filter(function (h) { return h.e.kind === "skill"; }).map(function (h) { return h.e; });
    var jr = hits.filter(function (h) { return h.e.kind === "journal"; }).map(function (h) { return h.e; });
    var lines = ["<<MIND-LEARN recall (local, private)>>"];
    prof.forEach(function (e) { lines.push("PROFILE " + e.ts.slice(0, 10) + ": " + e.body); });
    skills.forEach(function (e) { lines.push("SKILL " + e.body.name + ": " + e.body.steps.map(function (s, i) { return (i + 1) + ") " + s; }).join(" ")); });
    jr.forEach(function (e) { lines.push("JOURNAL " + e.ts.slice(0, 10) + ": " + e.body); });
    return { profile: prof, skills: skills, journal: jr, text: lines.join("\n") };
  };
  Mind.prototype.journalDay = function (d) { return this.log.filter(function (e) { return e.kind === "journal" && e.ts.slice(0, 10) === d; }); };
  Mind.prototype.stats = function () { var c = { profile: 0, journal: 0, skill: 0, superseded: 0 }, s = this.supersededSet();
    this.log.forEach(function (e) { c[e.kind]++; if (s[e.id]) c.superseded++; }); c.total = this.log.length; c.head = this.head().slice(0, 12); return c; };
  // Bridge old Learn mode: a word typed 2+ times becomes a SKILL proposal (journal entry), still needs Rizal's approve.
  Mind.prototype.importLegacyPending = function (rows) { var self = this, n = 0;
    rows.forEach(function (r) { if (r && r[2]) { self.append("journal", "legacy Learn proposal [" + r[0] + "] " + r[1] + " " + r[2] + " -> " + (r[3] || "") + " (" + (r[4] || "") + ")", { tags: ["legacy-learn"], src: "dragonbridge" }); n++; } });
    return n; };
  function memoryBackend(arr) { arr = arr || []; return { load: function () { return arr; }, append: function (e) { arr.push(e); }, _arr: arr }; }
  var api = { version: "0.1.0", Mind: Mind, sha256: sha256, memoryBackend: memoryBackend, SECRET: SECRET, GENESIS: GENESIS };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.DS_MIND_LEARN_CORE = api;
})(typeof self !== "undefined" ? self : this);

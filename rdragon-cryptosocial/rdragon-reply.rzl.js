/* rdragon-reply.rzl.js · standalone shared RDRAGON reply chain · race-pack 20261028
 * Tiers (first strong hit wins): local-cmd → answers.json pack → ENJIN :4979 (fast budget) → IBM Granite → offline local.
 * ENJIN budget: ~250ms connect / ~1.5s total. Timeout = silent fail, never blocks the page.
 * Site (rizal.pw / rizal.info) never probes Neo/ENJIN or 17e — skips straight to pack/granite/local.
 * Questions (what/who/how/tell/is… or ending in "?") ALWAYS skip tier 0 and go to RDRAGON.
 * Model/ENJIN output is TEXT ONLY: r.command is a suggestion; callers may place it in the input as "↳ suggested — press Enter to run" (RDRAGON.SUGGEST_HINT) and must never run it on their own.
 * Shared module for later fusion into a single RFORGE app: no DOM, no app globals besides window.RDRAGON*. Load guard: if window.RDRAGON.reply already exists, this file does nothing. */
(function(root){ if (root.RDRAGON && root.RDRAGON.reply) return;
(function (root) {
  var ENJIN = root.RDRAGON_ENJIN_URL || 'http://127.0.0.1:4979/v1/chat/completions', RDOFF = 'RDRAGON is offline — your question is queued and will be answered when the Neo syncs.';
  /* 20261028: single try, 300 ms hard budget (AbortController), apps only */
  var ENJIN_MS = (root.RDRAGON_ENJIN_MS > 0 ? +root.RDRAGON_ENJIN_MS : 300);
  var ENJIN_CONNECT_MS = (root.RDRAGON_ENJIN_CONNECT_MS > 0 ? +root.RDRAGON_ENJIN_CONNECT_MS : 300);
  var ENG = null, AP = null, last = { tier: 'local' };
  function host() { try { return location.hostname || ''; } catch (e) { return ''; } }
  function onSite() { var h = host(); return /(^|\.)rizal\.(pw|info)$/i.test(h) || (!!h && !/^(localhost|127\.0\.0\.1)$/.test(h) && !/[?&]local=1(&|$)/.test((root.location && root.location.search) || '') && typeof document !== 'undefined' && /^https?:$/.test((root.location && root.location.protocol) || '')); }
  function online() { return !(typeof navigator !== 'undefined' && navigator.onLine === false); }
  function cmdOf(t) { var m = String(t || '').match(/`([^`]+)`/); return m ? m[1] : null; }
  function timeout(p, ms) { return Promise.race([p, new Promise(function (_, no) { setTimeout(function () { no(Error('timeout')); }, ms); })]); }
  function normQ(q) { return String(q || '').toLowerCase().replace(/[^\w\sа-яёя]/gi, ' ').replace(/\s+/g, ' ').trim(); }
  function answersUrl() { var cfg = root.RDRAGON_CONFIG || {}; return (cfg.answersUrl || '/rdragon-cryptosocial/engine/answers.json') + '?v=1'; }
  function loadAnswers() {
    if (root.RDRAGON_ANSWERS) return Promise.resolve(root.RDRAGON_ANSWERS);
    if (AP) return AP;
    if (typeof fetch !== 'function') return Promise.resolve({ answers: [] });
    AP = fetch(answersUrl(), { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : { answers: [] }; }).then(function (j) { root.RDRAGON_ANSWERS = j; return j; }, function () { AP = null; return { answers: [] }; });
    return AP;
  }
  function matchAnswer(q, pack) {
    var nq = normQ(q); if (!nq) return null;
    var list = (pack && pack.answers) || [];
    for (var i = 0; i < list.length; i++) {
      var row = list[i], keys = row.nq || row.q || [];
      for (var j = 0; j < keys.length; j++) {
        if (normQ(keys[j]) === nq) return row;
      }
    }
    return null;
  }
  function pack(post) {
    return loadAnswers().then(function (p) {
      var hit = matchAnswer(post.q, p) || (root.RDRAGON_QUICK ? matchAnswer(root.RDRAGON_QUICK.stripAsk(post.q), p) : null);
      if (!hit || !hit.a) throw Error('none');
      return { text: String(hit.a).slice(0, 600), tier: 'pack', model: 'answers', src: hit.src || 'answers' };
    });
  }
  /* ENJIN: short budget. AbortController covers connect+TTFB; outer timeout is the hard cap. Site never calls this. */
  function enjin(post) {
    if (post.preview || post.skipEnjin || onSite() || !online() || typeof fetch !== 'function') return Promise.reject(Error('skip'));
    var msgs = [{ role: 'system', content: post.system || 'You are RDRAGON. Answer in one or two short sentences.' }].concat(post.thread || [], [{ role: 'user', content: String(post.q).slice(0, 800) }]);
    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var connectTimer = null, hardTimer = null;
    if (ctrl) {
      connectTimer = setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, ENJIN_CONNECT_MS);
    }
    var fetchOpts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: msgs, max_tokens: 140, temperature: 0.3 }) };
    if (ctrl) fetchOpts.signal = ctrl.signal;
    var p = fetch(ENJIN, fetchOpts).then(function (r) {
      if (connectTimer) { clearTimeout(connectTimer); connectTimer = null; }
      if (!r.ok) throw Error('http');
      return r.json();
    }).then(function (j) {
      var t = String((((j.choices || [])[0] || {}).message || {}).content || '').trim();
      if (!t) throw Error('empty');
      return { text: t.slice(0, 600), tier: 'enjin', model: 'enjin' };
    });
    return timeout(p, ENJIN_MS).then(function (r) { return r; }, function (e) {
      if (ctrl) try { ctrl.abort(); } catch (x) {}
      throw e || Error('timeout');
    }).then(function (r) { return r; }, function (e) {
      if (connectTimer) clearTimeout(connectTimer);
      throw e;
    });
  }
  function engine() { if (root.RDRAGON_ENGINE) return Promise.resolve(root.RDRAGON_ENGINE); if (!onSite() || typeof document === 'undefined') return Promise.reject(Error('no engine'));
    if (!ENG) ENG = new Promise(function (ok, no) { var sc = document.createElement('script'); var cfg = root.RDRAGON_CONFIG || {}; sc.src = (cfg.engineUrl || '/rdragon-cryptosocial/engine/rdragon-engine.js') + '?v=6'; sc.onload = function () { root.RDRAGON_ENGINE ? ok(root.RDRAGON_ENGINE) : no(Error('engine missing')); }; sc.onerror = function () { ENG = null; no(Error('engine load failed')); }; document.head.appendChild(sc); });
    return ENG; }
  var OPEN_MS = (root.RDRAGON_OPEN_MS > 0 ? +root.RDRAGON_OPEN_MS : 2500);
  function ibm(post) { if (post.preview && !root.RDRAGON_ENGINE) return Promise.reject(Error('skip'));
    var dl = (root.RDRAGON_OPEN && !post.waitModel) ? OPEN_MS : 0;
    var run = timeout(engine(), 20000).then(function (E) { var q = (post.system ? post.system + '\n\n' : '') + String(post.q).slice(0, 800); return timeout(E.answer({ q: q, thread: post.thread || [], lessons: [], onProgress: post.onProgress }), 90000); })
      .then(function (r) { var t = String(r && r.text || '').trim(); if (!t) throw Error('empty'); return { text: t.slice(0, 600), tier: 'ibm', model: r.model || 'granite' }; }); if (post.onUpgrade) run.then(post.onUpgrade, function () {}); return dl ? timeout(run, dl) : run; }
  function local(post) { var s = post.suggest && post.suggest.length ? 'did you mean ' + post.suggest.map(function (c) { return '`' + c + '`'; }).join(' · ') + '? ' : ''; var O = root.RDRAGON_OPEN, c = O && O.compose(post.q); if (c && c.text) return Promise.resolve({ text: s + c.text, tier: 'open', model: 'open-pack', kind: c.kind }); return Promise.resolve({ text: s + RDOFF, tier: 'local', model: 'local' }); }
  function isQ(q) { q = String(q || "").trim(); return /\?\s*$/.test(q) || /^(what|who|whom|whose|why|how|when|where|which|tell|is|are|am|was|were|do|does|did|can|could|should|would|will|explain|describe)\b/i.test(q); }
  function lcmd(post) { if (isQ(post.q)) return Promise.reject(Error("question")); var f = post.localCmd || root.RDRAGON_LOCAL_CMD; if (typeof f !== "function") return Promise.reject(Error("skip")); return Promise.resolve().then(function () { return f(String(post.q || "")); }).then(function (t) { if (!t) throw Error("none"); return { text: String(t).slice(0, 600), tier: "cmd", model: "local-cmd" }; }); }
  function quick(post) { var Q = root.RDRAGON_QUICK, r = Q && Q.quick(post.q); return r && r.text ? Promise.resolve({ text: r.text, tier: 'quick', model: r.model }) : Promise.reject(Error('none')); }
  function reply(post) { post = typeof post === "string" ? { q: post } : (post || {});
    return lcmd(post).catch(function () { return quick(post); }).catch(function () { return pack(post); }).catch(function () { return enjin(post); }).catch(function () { return ibm(post); }).catch(function () { return local(post); })
      .then(function (r) { last = r; r.by = 'RDRAGON'; r.tag = 'RDRAGON · ' + r.tier; r.command = cmdOf(r.text); return r; }); }
  root.RDRAGON = Object.assign(root.RDRAGON || {}, {
    reply: reply, local: local, last: function () { return last; }, onSite: onSite, isQuestion: isQ,
    SUGGEST_HINT: '↳ suggested — press Enter to run', autoRun: false,
    VERSION: 'rdragon-reply 1.3-open-ended-20261028', OPEN_MS: OPEN_MS,
    TIERS: ['cmd', 'quick', 'pack', 'enjin', 'ibm', 'open', 'local'],
    ENJIN_MS: ENJIN_MS, ENJIN_CONNECT_MS: ENJIN_CONNECT_MS,
    normQ: normQ, matchAnswer: matchAnswer, loadAnswers: loadAnswers
  });
})(typeof self !== 'undefined' ? self : globalThis);
})(typeof self !== 'undefined' ? self : globalThis);

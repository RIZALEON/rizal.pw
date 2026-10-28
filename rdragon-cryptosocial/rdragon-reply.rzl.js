/* rdragon-reply.rzl.js · standalone shared RDRAGON reply chain · extracted 20261026 from STAGING/rwallet-ghost-redesign-20261026/rkrypt.rzl.js:463-493
 * Added tier 0 (local commands): post.localCmd(q) or window.RDRAGON_LOCAL_CMD(q) → string|null runs first. Then ENJIN :4979 → IBM Granite (RDRAGON_ENGINE) → offline local.
 * Questions (what/who/how/tell/is… or ending in "?") ALWAYS skip tier 0 and go to RDRAGON (synced with staged rkrypt.rzl.js fix 10:19).
 * Model/ENJIN output is TEXT ONLY: r.command is a suggestion; callers may place it in the input as "↳ suggested — press Enter to run" (RDRAGON.SUGGEST_HINT) and must never run it on their own.
 * Shared module for later fusion into a single RFORGE app: no DOM, no app globals besides window.RDRAGON*. Load guard: if window.RDRAGON.reply already exists, this file does nothing. */
(function(root){ if (root.RDRAGON && root.RDRAGON.reply) return;
(function (root) {
  var ENJIN = root.RDRAGON_ENJIN_URL || 'http://127.0.0.1:4979/v1/chat/completions', RDOFF = 'RDRAGON is offline — your question is queued and will be answered when the Neo syncs.';
  var ENG = null, last = { tier: 'local' };
  function host() { try { return location.hostname || ''; } catch (e) { return ''; } }
  function onSite() { return /(^|\.)rizal\.(pw|info)$/i.test(host()); }
  function online() { return !(typeof navigator !== 'undefined' && navigator.onLine === false); }
  function cmdOf(t) { var m = String(t || '').match(/`([^`]+)`/); return m ? m[1] : null; }
  function timeout(p, ms) { return Promise.race([p, new Promise(function (_, no) { setTimeout(function () { no(Error('timeout')); }, ms); })]); }
  function enjin(post) { if (post.preview || post.skipEnjin || onSite() || !online() || typeof fetch !== 'function') return Promise.reject(Error('skip'));
    var msgs = [{ role: 'system', content: post.system || 'You are RDRAGON. Answer in one or two short sentences.' }].concat(post.thread || [], [{ role: 'user', content: String(post.q).slice(0, 800) }]);
    return timeout(fetch(ENJIN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: msgs, max_tokens: 140, temperature: 0.3 }) }), 12000)
      .then(function (r) { if (!r.ok) throw Error('http'); return r.json(); }).then(function (j) { var t = String((((j.choices || [])[0] || {}).message || {}).content || '').trim(); if (!t) throw Error('empty'); return { text: t.slice(0, 600), tier: 'enjin', model: 'enjin' }; }); }
  function engine() { if (root.RDRAGON_ENGINE) return Promise.resolve(root.RDRAGON_ENGINE); if (!onSite() || typeof document === 'undefined') return Promise.reject(Error('no engine'));
    if (!ENG) ENG = new Promise(function (ok, no) { var sc = document.createElement('script'); var cfg = root.RDRAGON_CONFIG || {}; sc.src = (cfg.engineUrl || '/rdragon-cryptosocial/engine/rdragon-engine.js') + '?v=2'; sc.onload = function () { root.RDRAGON_ENGINE ? ok(root.RDRAGON_ENGINE) : no(Error('engine missing')); }; sc.onerror = function () { ENG = null; no(Error('engine load failed')); }; document.head.appendChild(sc); });
    return ENG; }
  function ibm(post) { if (post.preview && !root.RDRAGON_ENGINE) return Promise.reject(Error('skip'));
    return timeout(engine(), 20000).then(function (E) { var q = (post.system ? post.system + '\n\n' : '') + String(post.q).slice(0, 800); return timeout(E.answer({ q: q, thread: post.thread || [], lessons: [], onProgress: post.onProgress }), 90000); })
      .then(function (r) { var t = String(r && r.text || '').trim(); if (!t) throw Error('empty'); return { text: t.slice(0, 600), tier: 'ibm', model: r.model || 'granite' }; }); }
  function local(post) { var s = post.suggest && post.suggest.length ? 'did you mean ' + post.suggest.map(function (c) { return '`' + c + '`'; }).join(' · ') + '? ' : ''; return Promise.resolve({ text: s + RDOFF, tier: 'local', model: 'local' }); }
  function isQ(q) { q = String(q || "").trim(); return /\?\s*$/.test(q) || /^(what|who|whom|whose|why|how|when|where|which|tell|is|are|am|was|were|do|does|did|can|could|should|would|will|explain|describe)\b/i.test(q); }
  function lcmd(post) { if (isQ(post.q)) return Promise.reject(Error("question")); var f = post.localCmd || root.RDRAGON_LOCAL_CMD; if (typeof f !== "function") return Promise.reject(Error("skip")); return Promise.resolve().then(function () { return f(String(post.q || "")); }).then(function (t) { if (!t) throw Error("none"); return { text: String(t).slice(0, 600), tier: "cmd", model: "local-cmd" }; }); }
  function reply(post) { post = typeof post === "string" ? { q: post } : (post || {});
    return lcmd(post).catch(function () { return enjin(post); }).catch(function () { return ibm(post); }).catch(function () { return local(post); })
      .then(function (r) { last = r; r.by = 'RDRAGON'; r.tag = 'RDRAGON · ' + r.tier; r.command = cmdOf(r.text); return r; }); }
  root.RDRAGON = Object.assign(root.RDRAGON || {}, { reply: reply, local: local, last: function () { return last; }, onSite: onSite, isQuestion: isQ, SUGGEST_HINT: '↳ suggested — press Enter to run', autoRun: false, VERSION: 'rdragon-reply 1.1-shared-20261026', TIERS: ['cmd', 'enjin', 'ibm', 'local'] });
})(typeof self !== 'undefined' ? self : globalThis);
})(typeof self !== 'undefined' ? self : globalThis);

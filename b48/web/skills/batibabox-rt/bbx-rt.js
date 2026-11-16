/* bbx-rt.js · BATIBABOX shared retrieval runtime 0.1.0 (Rizal GO 2026-10-16) · MIND SPINE -> BATIBABOX -> HEART (outside the Heart).
 * Read-only. Loads MACHINE-MIND/DIGEST/BATIBA-SHARED (built incrementally by NEO-MANUAL/tools/batibabox-index.py): fp16 vectors (RZLVEC2 b64 per
 * chunk) + RZLLEX1 query lexicon (int8 rows of RZLEMB1, same math as BATIBABOX.swift RZLEmbed). Incremental reload by byte offset (append-only file).
 * Namespaces: bot:<ЯID> is visible ONLY to that bot; notes/manual/live/chain are shared. Cosine top-k + small keyword boost, query cache.
 * Retrieval never alters identity: the roster ЯID stays authoritative; snippets are tagged context, never instructions. */
(function () {
  "use strict";
  if (window.RL_BBX) return;
  const DIR = "~/ЯLAB/MACHINE-MIND/DIGEST/BATIBA-SHARED/";
  const S = { dim: 384, lex: null, lexName: null, words: null, ids: [], meta: [], vec: null, n: 0, off: 0, cache: new Map(), loadMs: 0, lastCheck: 0 };
  async function read(path, offset) {
    const h = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.rosHostRead; if (!h) return null;
    let off = offset || 0, out = "";
    // UTF8-SAFE (2026-10-16): a 1 MB byte window can split a multi-byte char. Keep only whole lines from each window (cut at the last "\n",
    // count the kept bytes with TextEncoder) and re-read from there, so no line is ever decoded across a boundary.
    const enc = new TextEncoder();
    for (let i = 0; i < 800; i++) { const r = await h.postMessage({ op: "host.read", path, offset: off, len: 1048576 }); if (!r || !r.ok) return i ? { text: out, end: off } : null;
      const t = r.text || "", got = r.len || 0; if (!got) break;
      const last = off + got >= r.size;
      if (last) { out += t; off += got; break; }
      const cut = t.lastIndexOf("\n");
      if (cut < 0) { out += t; off += got; continue; }   // no newline in 1 MB (not expected for these files): take as is
      const keep = t.slice(0, cut + 1); out += keep; off += enc.encode(keep).length; }
    return { text: out, end: off };
  }
  const f16 = (h) => { const s = h & 0x8000 ? -1 : 1, e = (h >> 10) & 0x1f, m = h & 0x3ff; return e === 0 ? s * m * 5.960464477539063e-8 : e === 31 ? (m ? NaN : s * Infinity) : s * Math.pow(2, e - 15) * (1 + m / 1024); };
  function b64bytes(b) { const s = atob(b), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
  async function loadLex(name) {
    const r = await read(DIR + name); if (!r) return false;
    const L = r.text.split("\n"); const hdr = JSON.parse(L[0]); S.dim = hdr.dim; const words = new Map();
    for (let i = 1; i < L.length; i++) { if (!L[i]) continue; const [w, sc, b] = L[i].split("\t"); const q = new Int8Array(b64bytes(b).buffer); words.set(w, { s: parseFloat(sc), q }); }
    S.words = words; S.lexName = name; return true;
  }
  async function refresh() {
    const now = Date.now(); if (now - S.lastCheck < 15000 && S.vec) return; S.lastCheck = now;
    const t0 = performance.now();
    const st = await read(DIR + "bbx-state.json"); if (!st) return; const state = JSON.parse(st.text);
    if (state.lex !== S.lexName) await loadLex(state.lex);
    const r = await read(DIR + "bbx-chunks.jsonl", S.off); if (!r) return;
    const cut = r.text.lastIndexOf("\n") + 1; const body = r.text.slice(0, cut);
    S.off = r.end - new TextEncoder().encode(r.text.slice(cut)).length;
    const lines = body.split("\n").filter(Boolean); if (!lines.length && S.vec) return;
    const need = S.n + lines.length, V = new Float32Array(need * S.dim); if (S.vec) V.set(S.vec.subarray(0, S.n * S.dim));
    for (const l of lines) { let c; try { c = JSON.parse(l); } catch (e) { continue; }
      const u = new Uint16Array(b64bytes(c.v).buffer); const b = S.n * S.dim; for (let j = 0; j < S.dim; j++) V[b + j] = f16(u[j]);
      delete c.v; S.meta.push(c); S.n++; }
    S.vec = V; S.cache.clear(); S.loadMs = Math.round(performance.now() - t0);
  }
  function basic(t) {
    t = t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); const out = []; let cur = "";
    for (const ch of t) { if (/\s|\p{C}/u.test(ch)) { if (cur) { out.push(cur); cur = ""; } continue; }
      if (/[\p{P}\p{S}]/u.test(ch) || /[\u4e00-\u9fff]/.test(ch)) { if (cur) { out.push(cur); cur = ""; } out.push(ch); } else cur += ch; }
    if (cur) out.push(cur); return out;
  }
  function wp(w) { const cs = Array.from(w); if (cs.length > 100) return []; const ids = []; let st = 0;
    while (st < cs.length) { let e = cs.length, f = null; while (st < e) { const sub = (st ? "##" : "") + cs.slice(st, e).join(""); if (S.words.has(sub)) { f = sub; break; } e--; }
      if (!f) return ids.length ? ids : []; ids.push(f); st = e; }
    return ids; }
  function embed(text) {
    const toks = basic(String(text).slice(0, 600)).flatMap(wp); if (!toks.length) return null;
    const acc = new Float32Array(S.dim); for (const t of toks) { const r = S.words.get(t); for (let j = 0; j < S.dim; j++) acc[j] += r.q[j] * r.s; }
    let n = 0; for (let j = 0; j < S.dim; j++) n += acc[j] * acc[j]; n = Math.sqrt(n) || 1; for (let j = 0; j < S.dim; j++) acc[j] /= n; return acc;
  }
  // RENAME 2026-10-16: a bot's own memory also includes records filed under its former/alias ID (LOCAL-9SJ1-4JPK → ЯID-0013-92V4)
  const own = (rid) => { const A = window.ROS_RID_ALIAS || {}; const ids = new Set([rid]); for (const k in A) { if (A[k] === rid) ids.add(k); if (k === rid) ids.add(A[k]); } return ids; };
  const visible = (c, rid) => !c.ns.startsWith("bot:") || own(rid).has(c.ns.slice(4));
  async function search(q, opt) {
    opt = opt || {}; const k = opt.k || 4, rid = opt.rid || "";
    await refresh(); if (!S.vec || !S.words) return { hits: [], ms: 0, n: 0 };
    const key = rid + "\u0000" + k + "\u0000" + q; if (S.cache.has(key)) return Object.assign({ cached: true }, S.cache.get(key));
    const t0 = performance.now(), qv = embed(q); if (!qv) return { hits: [], ms: 0, n: S.n };
    const kw = new Set(basic(q).filter((w) => w.length > 3)); const top = [];
    for (let i = 0; i < S.n; i++) { const c = S.meta[i]; if (!visible(c, rid) || (opt.ns && !opt.ns.includes(c.ns.split(":")[0]))) continue;
      let s = 0; const b = i * S.dim; for (let j = 0; j < S.dim; j++) s += qv[j] * S.vec[b + j];
      if (kw.size) { const tl = c.t.toLowerCase(); let h = 0; for (const w of kw) if (tl.includes(w)) h++; s += 0.12 * h / kw.size; }
      if (top.length < k || s > top[top.length - 1].s) { top.push({ s, i }); top.sort((a, b) => b.s - a.s); if (top.length > k) top.pop(); } }
    const hits = top.map((x) => Object.assign({ score: +x.s.toFixed(3) }, S.meta[x.i]));
    const res = { hits, ms: +(performance.now() - t0).toFixed(1), n: S.n }; S.cache.set(key, res); return res;
  }
  async function latestNote(doc) {   // newest stamped line of a note (by rev, then file order) — for "latest line" questions
    await refresh(); let best = null;
    for (const c of S.meta) { if (c.ns !== "notes" || !c.src.includes(doc + " rev ") || !c.rid) continue; const rev = +(c.src.match(/rev (\d+)/) || [0, 0])[1];
      if (!best || rev >= best.rev) best = { rev, c }; }
    return best ? best.c : null;
  }
  function tag(c) { return `[${c.src}${c.rid ? " · " + c.rid : ""}]`; }
  async function context(q, rid, budgetChars) {   // Heart injection: top-k snippets with source+ЯID tags, small budget
    const r = await search(q, { rid, k: 4 }); let out = "", used = 0; const B = budgetChars || 600;
    for (const c of r.hits) { if (c.score < 0.3) continue; const line = `${tag(c)} ${c.t.replace(/\s+/g, " ").slice(0, 160)}`; if (used + line.length > B) break; out += line + "\n"; used += line.length; }
    return { text: out, chars: used, tokens: Math.ceil(used / 4), ms: r.ms, n: r.n };
  }
  window.RL_BBX = { version: "0.1.1-utf8", search, context, latestNote, refresh, tag, stats: () => ({ chunks: S.n, lex: S.lexName, lexWords: S.words ? S.words.size : 0, loadMs: S.loadMs }) };
  setTimeout(() => refresh().catch(() => {}), 1500);
})();

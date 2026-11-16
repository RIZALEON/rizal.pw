/* bbx-ds.js · BATIBABOX memory for DRAGON SKULL iOS 0.1.0 (staged 2026-10-18) · MIND SPINE → BATIBABOX → HEART.
 * The native engine already injects the digest + keyword recall + transcript index into every reply and records every turn
 * (MemoryStore.swift). This web layer adds: (1) vector recall with the 256-potion model, handed to the engine as ds_memory.hits,
 * (2) `/recall <topic>` + `/batibabox` in the chat (hybrid display, same strings as ЯBOT), (3) the idle digest job, (4) DS_BBX console API.
 * Durable files live in Application Support/memory via /api/store/* (never localStorage/IndexedDB: this WKWebView is non-persistent). */
(function () {
  "use strict";
  if (window.DS_BBX) return;
  const K = window.DS_BBX_CORE; if (!K) return;
  const H = { "X-DS-Store": "1" }, BOT = "dragonskull", EMB_URL = "./skills/batibabox-ds/BATIBABOX-EMBED-256-potion.rzl";
  const S = { E: null, embState: "not loaded", notes: [], vcache: [], chatOff: 0, chat: [], ledgerOff: {}, ledger: [], lastSend: Date.now(), busy: false, web: "?" };
  const get = (p) => fetch("/api/store/" + p, { headers: H, cache: "no-store" }).then((r) => r.json());
  const post = (p, body) => fetch("/api/store/" + p, { method: "POST", headers: H, body: typeof body === "string" ? body : JSON.stringify(body) }).then((r) => r.json());
  async function readAll(f, off) {   // whole-line windows (UTF-8 safe, same idea as bbx-rt read())
    let text = "", o = off || 0;
    for (let i = 0; i < 64; i++) { const r = await get("read?f=" + encodeURIComponent(f) + "&off=" + o); if (!r || r.error || r.text === undefined) break;
      text += r.text; if (r.end === o || r.end >= r.size) { o = r.end; break; } o = r.end; }
    return { text, end: o };
  }
  async function refresh() {
    const c = await readAll("chat/" + BOT + ".jsonl", S.chatOff); S.chatOff = c.end; S.chat = S.chat.concat(K.parseJSONL(c.text));
    const st = await get("status"); const parts = (st && st.mind && st.mind.parts) || [];
    for (const p of parts) { const r = await readAll(p, S.ledgerOff[p] || 0); S.ledgerOff[p] = r.end; S.ledger = S.ledger.concat(K.parseJSONL(r.text)); }
    // append-only → note order is stable; rebuild the list but keep vector cache aligned by rebuilding only when order would change
    try { const x = await readAll("index/RECALL-EXCLUDED.rzl.jsonl", S.exOff || 0); S.exOff = x.end; for (const o of K.parseJSONL(x.text)) if (o.text200) (S.ex = S.ex || new Set()).add(o.text200); } catch (e) {}   // memidx
    const notes = K.notesFrom(S.chat, S.ledger, BOT);
    if (notes.length < S.notes.length) S.vcache = [];
    S.notes = notes; return st;
  }
  async function loadEmb() {
    if (S.E || S.embState === "loading") return S.E;
    S.embState = "loading";
    try { const r = await fetch(EMB_URL); if (!r.ok) throw new Error("HTTP " + r.status); S.E = K.parseEmb(await r.arrayBuffer()); S.embState = "ok"; }
    catch (e) { S.E = null; S.embState = "keyword-only (" + e.message + ")"; }
    return S.E;
  }
  async function vectorHits(q, k) {
    if (!S.E) return [];
    const recent = S.notes.slice(-3000), base = S.notes.length - recent.length;
    const view = new Proxy(S.vcache, { get: (t, i) => (typeof i === "string" && /^\d+$/.test(i) ? t[base + +i] : t[i]), set: (t, i, v) => { t[base + +i] = v; return true; } });
    return K.vectorSearch(S.E, recent, view, q, k || 4, 0.35);
  }
  // handed to the engine with every chat request (llama-direct.js 0.2.0); capped at 400 ms so a reply is never held up
  // ЯBAT bbx 2026-10-19: same read-time filter as MemoryStore.isNoise (benchmark turns out, identical texts collapsed). Nothing is deleted.
  function bbxClean(a) { const seen = new Set(); return (a || []).filter((h) => { const t = String(h.text || "");
    if (/^Multiple choice question|^Complete (the following|this) Python function|\nAnswer with the letter|Reply with only the letter|Return only Python code/i.test(t) || t.trim().length <= 2) return false;
    if (S.ex && S.ex.has(t.slice(0, 200))) return false;                                   // memidx: excluded index (test-run turns)
    if (typeof h.score === "number" && h.score < 0.55) return false;                       // memidx: relevance floor (cosine)
    const k = t.trim().toLowerCase().slice(0, 300); if (seen.has(k)) return false; seen.add(k); return true; }); }
  async function hits(q) {
    try { return await Promise.race([(async () => { await refresh(); return bbxClean(await vectorHits(q, 6)).slice(0, 4); })(), new Promise((z) => setTimeout(() => z([]), 400))]); }
    catch (e) { return []; }
  }
  async function recall(q) {
    await refresh(); await loadEmb();
    const kw = ((await get("recall?bot=" + BOT + "&k=6&q=" + encodeURIComponent(q))).hits || []).map((h) => Object.assign(h, { via: "keyword" }));
    const merged = K.mergeHits(kw, bbxClean(await vectorHits(q, 6)), 6);
    if (merged.length) {   // the retained digest reorganizes itself by what is recalled most (BATIBABOX.reorganize)
      const dg = await digestRead(); await post("write?f=" + encodeURIComponent("digest-" + BOT + ".rzl"), JSON.stringify(K.reorganize(dg, merged.slice(0, 3).map((h) => String(h.text).slice(0, 60)))));
    }
    return merged.length ? "BATIBABOX recall:\n" + merged.map((h) => "[" + h.label + " · " + h.via + " " + h.score + "] " + String(h.text).slice(0, 400)).join("\n…\n") : "BATIBABOX recall: nothing matched.";
  }
  async function status() {
    const st = await refresh(); await loadEmb(); const dg = await digestRead();
    return ["BATIBABOX (ЯENJIN memory organ · rzl.organ.batibabox.v1) · SPINE → BATIBABOX → HEART",
      "• status: " + S.chat.length + " turns saved · Application Support/memory · " + Math.round(((st && st.bytes) || 0) / 1024) + " KB · recall gated (real chat only, thresholded)",
      "• mind: " + K.C.mind + " · " + ((st && st.mind && st.mind.seq) || 0) + " blocks · head " + String((st && st.mind && st.mind.head) || "").slice(0, 8),
      "• cache: " + (dg && dg.digest ? "digest HIT · " + (dg.digestedAt || "") + " (" + (dg.refreshedBy || "?") + ", " + (dg.turnsDigested || 0) + " turns)" : "no digest yet (written when idle)"),
      "• vector store: " + (S.E ? S.vcache.filter(Boolean).length + " of " + S.notes.length + " notes embedded" : S.embState),
      "• vector model: RZLEMB1 potion-base-8M 256-d int8 (.rzl)" + (S.E ? " · " + S.E.h.vocab + " × " + S.E.dim : " · not bundled"),
      "• index: " + ((st && st.index) || ""),
      "• recall: recall <topic>  (hybrid vector + keyword)"].join("\n");
  }
  async function digestRead() { try { const r = await get("read?f=" + encodeURIComponent("digest-" + BOT + ".rzl")); return r.text ? JSON.parse(r.text) : null; } catch (e) { return null; } }
  async function digestNow(why) {
    if (S.busy) return "busy"; S.busy = true;
    try {
      await refresh(); const prev = await digestRead(); const turns = S.chat.filter((o) => !o.source || o.source === "chat");   // memidx: digest from real chat only
      if (!turns.length) return "no turns";
      const r = await fetch("/engine/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: K.digestMessages(prev && prev.digest, turns.slice(prev ? prev.turnsDigested || 0 : 0)), max_tokens: 200, temperature: 0, ds_memory: { skip: true }, ds_record: false }) });
      if (!r.ok) return "engine HTTP " + r.status;
      const j = await r.json(), text = String(j.choices[0].message.content || "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      if (!text || /^\(.*error/.test(text)) return "engine: " + text;
      const doc = K.digestDoc(prev, BOT, text, turns, S.web, why);
      await post("write?f=" + encodeURIComponent("digest-" + BOT + ".rzl"), JSON.stringify(doc));
      await post("mind", { topic: "digest", kind: "digest-refresh", bot: BOT, text: doc.digest, extra: { turnsDigested: doc.turnsDigested, refreshedBy: doc.refreshedBy } });
      await saveView();
      return "digest refreshed (" + doc.turnsDigested + " turns)";
    } finally { S.busy = false; }
  }
  async function saveView() {   // readable rzl.doc.v1 snapshot of the ledger (the ledger stays the source of truth)
    await refresh(); const v = K.docView(S.ledger, { web: S.web }); const s = JSON.stringify(v, null, 1);
    if (s.length < 2000000) await post("write?f=" + encodeURIComponent("mind/" + K.C.mind + ".rzl"), s);
    return v;
  }
  async function idle() {
    try {
      if (document.hidden || S.busy) return;
      const h = await fetch("/engine/health"); if (!h.ok) return;
      await refresh(); const dg = await digestRead();
      if (K.digestDue(dg, S.chat.length, Date.now() - S.lastSend)) await digestNow("idle");
    } catch (e) {}
  }
  // chat hook: /recall + /batibabox answered here (hybrid); everything else goes to the engine (which reads memory natively)
  function wrapSend() {
    const orig = window.ROS_SEND; if (!orig || orig.__bbx) return !!orig;
    const w = async function (q) {
      S.lastSend = Date.now(); const t = String(q || "").trim(), low = t.toLowerCase();
      if (/^\/?batibabox$/.test(low) || /^\/?recall\s+\S/.test(low)) {
        window.pushTurn("user", t);
        let out; try { out = /batibabox$/.test(low) ? await status() : await recall(t.replace(/^\/?recall\s+/i, "")); } catch (e) { out = "BATIBABOX: " + e.message; }
        window.pushTurn("bot", out);
        const ts = new Date().toISOString(), lines = [{ ts, role: "user", text: t, bot: BOT, chat: "main", intent: "recall", source: "command" }, { ts, role: "bot", text: out, bot: BOT, chat: "main", intent: "recall", source: "command" }];
        post("append?f=" + encodeURIComponent("chat/" + BOT + ".jsonl"), lines.map((l) => JSON.stringify(l)).join("\n") + "\n").catch(() => {});
        post("mind", { topic: "recall", kind: /batibabox$/.test(low) ? "batibabox-status" : "recall", bot: BOT, text: t + "\n" + out.slice(0, 1500) }).catch(() => {});
        return out;
      }
      return orig.apply(this, arguments);
    };
    w.__bbx = true; window.ROS_SEND = w; return true;
  }
  window.DS_BBX = { version: K.C.version, hits, recall, status, digestNow, saveView, refresh, bot: BOT, state: () => ({ notes: S.notes.length, chat: S.chat.length, ledger: S.ledger.length, emb: S.embState }),
    ledger: async () => (await refresh(), S.ledger), chat: async () => (await refresh(), S.chat) };
  document.addEventListener("DOMContentLoaded", () => {
    let n = 0; const t = setInterval(() => { if (wrapSend() || ++n > 40) clearInterval(t); }, 250);
    fetch("/api/selfupdate/status", { cache: "no-store" }).then((r) => r.json()).then((s) => { S.web = s.serving || "?"; }).catch(() => {});
    setTimeout(() => loadEmb().catch(() => {}), 3000);
    setInterval(idle, 20000);
  });
})();

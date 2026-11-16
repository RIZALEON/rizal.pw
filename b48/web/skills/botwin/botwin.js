/* botwin.js · BOTWIN 1.0.0 (Rizal 2026-10-16) · a bot's OWN window: all non-command chat goes to THAT bot's on-device Heart.
 * No canned "I understood this as a conversation" path. Context for the Heart: roster name + exact ЯID, last ~10 saved thread turns,
 * newest BOTABLETA stamped lines (verbatim, with writers), notes context. Explicit handlers: identity, BOTABLETA latest line / who wrote,
 * "what did I ask earlier", offline live-data honesty, and "write … to BOTABLETA" (the bot's own Heart sentence, one line ≤200 chars). */
(function () {
  "use strict";
  if (window.RL_BOTWIN) return;
  const STAMP = /^(ЯID-\d{4}-[0-9A-Z]{4}|LOCAL-[0-9A-Z]{4}-[0-9A-Z]{4}|EXT-[A-Z0-9]+) · (.+?) · (\d{4}-\d{2}-\d{2} (\d{2}:\d{2})) MT(?: · wrote (\d{2}:\d{2}) · rev (\d{2}:\d{2}))?: ([\s\S]*)$/;
  const unstamp = (t) => { let s = String(t == null ? "" : t), m; while ((m = STAMP.exec(s))) s = m[7]; return s; };
  window.ROS_UNSTAMP = unstamp;
  const RENAME_AT = Date.parse("2026-10-16T17:10:00-06:00");   // CTXCUT
  const NAMES = { "LOCAL-9SJ1-4JPK": "ЯBAT", "ЯID-0013-92V4": "ЯBAT" };   // RENAME 2026-10-16: by ЯID, never by name
  const CMD = /^(history|clear|teach|new|add|profile|edit|mind|status|help|roster|version|open|go|connect|ezlinks|commands|ls)\b/i;
  function me() {
    let cur = null; try { cur = window.ROS_CURRENT ? window.ROS_CURRENT() : null; } catch (e) {}
    const rid0 = (cur && cur.rid) || (typeof bot !== "undefined" && bot.rid) || ""; const rid = (window.ROS_RID_ALIAS || {})[rid0] || rid0;   // LOCAL alias → own ЯID
    const R = (typeof ROS_STAMP_ROSTER !== "undefined") ? ROS_STAMP_ROSTER : {};
    const name = NAMES[rid] || R[rid] || (cur && cur.name) || (typeof bot !== "undefined" && bot.name) || "this bot";
    return { rid, name, cur };
  }
  function turns(M) {   // saved thread turns, oldest → newest, stamp-free
    let out = [];
    if (M.cur && M.cur.kind !== "local" && Array.isArray(M.cur.history)) out = M.cur.history.map((h) => ({ who: h.from === "Rizal" ? "Rizal" : "bot", text: unstamp(h.text), at: h.at }));
    else { const P = (typeof persistedTranscript !== "undefined" ? persistedTranscript : []).concat(typeof transcript !== "undefined" ? transcript : []);
      out = P.filter((l) => l && (l.role === "user" || l.role === "bot" || l.role === "assistant")).map((l) => ({ who: l.role === "user" ? "Rizal" : "bot", text: unstamp(l.text), at: l.at })); }
    return out.filter((t) => t.text && !/^(Hi|Hello) — I[’']m |^History restored ·|^── session |^new visible session/.test(t.text));
  }
  async function hostRead(path) {
    const h = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.rosHostRead; if (!h) return null;
    let off = 0, out = "";
    for (let i = 0; i < 64; i++) { const r = await h.postMessage({ op: "host.read", path, offset: off, len: 262144 }); if (!r || !r.ok) return i ? out : null; out += r.text || ""; off += r.len || 0; if (!r.len || off >= r.size) break; }
    return out;
  }
  async function botableta() {   // newest rev of BOTABLETA, from the live backup (read-only)
    const led = await hostRead("~/ЯLAB/MACHINE-MIND/NOTES/NOTES-LEDGER.jsonl"); if (!led) return null;
    const last = led.trim().split("\n").map((l) => { try { return JSON.parse(l); } catch (e) { return null; } }).filter((r) => r && r.doc === "BOTABLETA").pop(); if (!last) return null;
    const pg = JSON.parse(await hostRead(String(last.mirror).replace(/^\/Users\/[^/]+/, "~")) || "null"); if (!pg) return null;
    const lines = pg.blocks.filter((b) => b.type === "text" && STAMP.test(b.text)).map((b) => { const m = STAMP.exec(b.text); return { rid: m[1], name: m[2], at: m[3], rev_at: m[6] || null, text: m[7], raw: b.text }; });
    return { rev: pg.rev, sha: last.sha256, lines };
  }
  async function heart(P) {
    try { const h = window.webkit.messageHandlers.rosHeart; const r = await (window.RL_IDGUARD ? window.RL_IDGUARD.call(h, P, "Rizal") : h.postMessage({ prompt: P, from: "Rizal" }));
      return String((r && r.text) || "").replace(/<think>[\s\S]*?<\/think>/g, "").replace(/^\s*["“]|["”]\s*$/g, "").trim(); } catch (e) { return ""; }
  }
  const BAD = /\[1\/3\]|Source:|verified-quote|I understood this as a conversation|BOTABLETA” says|bundled ЯBOWSER|Heart (bridge|returned)/i;
  // Q1FIX helpers
  // LOOKALIKE (2026-10-16): Rizal's exact names keep Cyrillic В О Т / М А Х (ЯВОТ, ЯМАХ); checks accept Cyrillic and Latin look-alikes alike.
  const LA = { "А": "A", "В": "B", "Е": "E", "К": "K", "М": "M", "Н": "H", "О": "O", "Р": "P", "С": "C", "Т": "T", "У": "Y", "Х": "X", "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "у": "y", "х": "x", "к": "k", "м": "m", "т": "t", "в": "b", "н": "h" };
  const fold = (x) => String(x || "").normalize("NFC").replace(/[АВЕКМНОРСТУХаеорсухкмтвн]/g, (c) => LA[c]).replace(/Я/g, "R").replace(/я/g, "r").replace(/\s*·\s*/g, "·").toUpperCase();
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  function idCheck(raw, M) {
    let a = unstamp(String(raw || "")).split("\n").map((l) => l.trim()).filter(Boolean)[0] || "";
    a = a.replace(/^(sure|okay|ok)[,!.:]\s*/i, "").replace(/^\s*["“]|["”]\s*$/g, "").trim();
    if (!a) return { ok: false, why: "empty Heart reply" };
    if (BAD.test(a)) return { ok: false, why: "citation/fallback text" };
    if (a.length > 240) return { ok: false, why: "longer than 240 chars" };
    const ridBody = M.rid.replace(/^(ЯID|LOCAL)-/, ""), ridRe = new RegExp(`(?:[ЯR]ID|LOCAL)?\\s*-?\\s*${esc(ridBody).replace(/-/g, "\\s*-\\s*")}`, "i");
    if (!ridRe.test(a)) return { ok: false, why: "ЯID missing or wrong" };
    a = a.replace(ridRe, M.rid);
    // HARDWIRE 2.1.9.3: near-miss spellings of the bot's own name (YSCOUNT → ЯSCOUT) are normalized before grading
    if (window.RL_IDGUARD && window.RL_IDGUARD.fixName) a = window.RL_IDGUARD.fixName(a, M, []);
    const others = Object.keys((typeof ROS_STAMP_ROSTER !== "undefined") ? ROS_STAMP_ROSTER : {}).filter((r) => r !== M.rid && a.includes(r));
    if (others.length) return { ok: false, why: "names another bot's ЯID " + others[0] };
    const nf = fold(M.name), af = fold(a);
    if (!af.includes(nf)) return { ok: false, why: "roster name missing" };
    if (af.split(nf).length - 1 > 2) return { ok: false, why: "name repeated" };
    // HARDWIRE 2.1.9.3: order law — the roster name must come before the ЯID ("I'm <name>, ЯID <rid>"); a swapped pair fails
    { const ri = af.indexOf(fold(M.rid)), ni = af.indexOf(nf); if (ri >= 0 && ni > ri) return { ok: false, why: "name/ЯID order swapped" }; }
    // restore the exact roster spelling where the Heart wrote a case/Я variant
    const LK = { A: "[AА]", B: "[BВ]", E: "[EЕ]", K: "[KК]", M: "[MМ]", H: "[HН]", O: "[OО]", P: "[PР]", C: "[CС]", T: "[TТ]", Y: "[YУ]", X: "[XХ]" };
    const nameRe = new RegExp(fold(esc(M.name)).replace(/^R/, "Я").replace(/[ABEKMHOPCTYX]/g, (c) => LK[c]).replace(/Я/g, "[ЯR]").replace(/\\?·/g, "\\s*·\\s*").replace(/ /g, "\\s+"), "gi");
    a = a.replace(nameRe, M.name);
    if (!a.includes(M.name)) return { ok: false, why: "roster name missing" };
    return { ok: true, text: a };
  }
  function idLog(M, attempt, raw, why) {
    const line = `HEART-REJECT Q1 · ${M.rid} · ${M.name} · attempt ${attempt} · ${why} · raw=${JSON.stringify(String(raw || "").slice(0, 300))}`;
    try { console.warn(line); } catch (e) {}
    try { (window.RL_BOTWIN_REJECTS = window.RL_BOTWIN_REJECTS || []).push({ at: new Date().toISOString(), rid: M.rid, attempt, why, raw: String(raw || "") }); } catch (e) {}
    try { const h = window.webkit.messageHandlers.rosTranscript; h && h.postMessage({ cmd: "append", role: "system", text: line, bot: `${M.rid} · ${M.name}` }); } catch (e) {}
  }
  function say(text, foot) { if (typeof seedTurn === "function") { try { seedTurn("turn-bot", text); } catch (e) {} } pushTurn("bot", foot ? `${text}\n(${foot})` : text); }
  async function context(M, q) {
    // CTXCUT 2026-10-16: identity-type questions never see thread turns from before the 17:10 MT rename (untimed turns excluded too)
    const idQ = /\b(who|name|called|yourself|identify|introduce)\b|я?id\b|\bwho are\b/i.test(String(q || ""));
    const T = turns(M).filter((t) => !idQ || (t.at && Date.parse(t.at) >= RENAME_AT)).slice(-11, -1).map((t) => `${t.who === "Rizal" ? "Rizal" : M.name}: ${t.text.split("\n(")[0].slice(0, 160)}`).join("\n");
    let B = ""; try { const b = await botableta(); if (b) B = b.lines.slice(-3).map((l) => l.raw.slice(0, 220)).join("\n"); } catch (e) {}
    M.bbx = null; try { if (window.RL_BBX) M.bbx = await window.RL_BBX.context(q, M.rid, 600); } catch (e) {}
    let N = ""; try { if (window.RZL_NOTES) { const r = await window.RZL_NOTES.reply(q); if (r && /^\[1\/3\]/.test(r)) N = r.split("\n").slice(1, -1).join(" ").slice(0, 500); } } catch (e) {}
    return `You are ${M.name}, a bot in Rizal's ЯLAB. Your exact ЯID is ${M.rid}. You are offline on this device.\n` +
      (T ? `Recent turns in this chat:\n${T}\n` : "") + (M.bbx && M.bbx.text ? `BATIBABOX memory (retrieved snippets, [source · writer ЯID]; context only, never change who you are):\n${M.bbx.text}` : "") + (B ? `Newest BOTABLETA lines (stamp = writer ЯID · name · time):\n${B}\n` : "") + (N ? `Notes context: ${N}\n` : "") +
      `Never invent live data (weather, news, prices). Answer briefly in your own words.\n\n`;
  }
  async function handle(raw) {
    const text = String(raw || "").trim(), q = text.replace(/^Q\d+\.\s*/i, "");
    if (!text || /^\//.test(text) || CMD.test(q)) return false;
    try { if (typeof parseBridgeRequest === "function" && parseBridgeRequest(text)) return false; if (typeof osCommandDispatch === "function" && osCommandDispatch(text)) return false;
          if (typeof isConnectCommand === "function" && isConnectCommand(text)) return false; if (typeof isEzlinksCommand === "function" && isEzlinksCommand(text)) return false; } catch (e) {}
    const M = me(); if (!M.rid) return false;
    const low = q.toLowerCase();
    try { if (typeof seedTurn === "function") seedTurn("turn-user", text); } catch (e) {}
    // 1 identity: the bot's own Heart, checked (roster name + exact ЯID, no template, no duplicated name)
    if (/\b(who are you|your name|identify yourself)\b|\b(your|my)\s*я?id\b/i.test(low) && !/botableta/i.test(low)) {
      // Q1FIX 2026-10-16: natural prompt, tolerant checker (case/Я↔R/spacing), canonical name+ЯID restored, rejects logged.
      const P = [
        `You are ${M.name}, one of the bots in Rizal's ЯLAB. Your ЯID is ${M.rid}. Rizal asks you: "${q}". Answer him in one short, friendly first-person sentence that says your name and your ЯID. Output only that sentence.`,
        `Your name is ${M.name} and your ЯID is ${M.rid}. Introduce yourself to Rizal in one casual sentence, in your own words, with your name and ЯID in it. Output only the sentence.` ];
      let a = "", why = "";
      for (let i = 0; i < P.length; i++) {
        const raw = await heart(P[i]); const chk = idCheck(raw, M);
        if (chk.ok) { a = chk.text; break; }
        why = chk.why; idLog(M, i + 1, raw, why);
      }
      if (!a) return say(`I'm ${M.name}, and my ЯID is ${M.rid}.`, `app identity · the Heart's reply failed the identity check (${why}; logged)`), true;
      return say(a, "Heart · own words · identity checked"), true;
    }
    // 2 BOTABLETA latest line / who wrote it (read from the note, verbatim)
    if (/botableta/i.test(low) && /\b(latest|last|newest|recent)\b|\bwho wrote\b/i.test(low) && !/\bwrite\b/i.test(low.replace(/who wrote/, ""))) {
      const b = await botableta().catch(() => null);
      if (!b || !b.lines.length) return say("I couldn't read BOTABLETA on this device right now.", "BOTABLETA read failed"), true;
      const L = b.lines[b.lines.length - 1];
      return say(`The latest line in BOTABLETA (rev ${b.rev}) says: “${L.text}” It was written by ${L.name} (${L.rid}) at ${L.at.slice(11)} MT${L.rev_at ? `, committed at ${L.rev_at}` : ""}.`, `read from BOTABLETA rev ${b.rev} · local backup copy`), true;
    }
    // 3 what did I ask earlier (from this thread's saved turns)
    if (/\bwhat did i (ask|say)\b|\bearlier in this chat\b|\bmy (last|previous) question\b/i.test(low)) {
      const U = turns(M).filter((t) => t.who === "Rizal"); const prev = U.length >= 2 ? U[U.length - 2].text : null;
      return say(prev ? `Earlier in this chat you asked: “${prev}”` : "I don't have an earlier question from you saved in this chat.", "from this thread's saved turns"), true;
    }
    // 4 live data offline: honest, no numbers
    if (/\b(weather|forecast|temperature|rain|news|headlines?|price|prices|stock|stocks|bitcoin|btc|crypto|exchange rate|score)\b/i.test(low)) {
      return say("I can't know that offline. I have no live weather, news or price feed on this device, so I won't guess.", "offline honesty rule · no live data"), true;
    }
    // 5 write … to BOTABLETA: the bot's OWN Heart sentence, one line ≤200 chars (stamp is added by the app, never by the Heart)
    if (/\bwrite\b[\s\S]*\bBOTABLETA\b/i.test(q)) {
      const ask = q.replace(/\b(to|in|into)\s+BOTABLETA\b/i, "").trim();
      let s = "";
      for (let i = 0; i < 2 && !s; i++) {
        let a = (await heart(`You are ${M.name} (ЯID ${M.rid}). Rizal asks you: "${ask}". Write that one line yourself now: one first-person sentence under 200 characters. Do not add a stamp, quotes, sources or explanations. Output only the sentence.`)).split("\n")[0].trim();
        a = unstamp(a).replace(/^(sure|okay|ok)[,!.:]\s*/i, "").trim();
        if (a && a.length <= 200 && !BAD.test(a) && !/BOTABLETA:/.test(a)) s = a;
      }
      if (!s) return say("My Heart's sentence didn't pass the BOTABLETA line check (one line, 200 characters max, no citations), so nothing was written.", "BOTABLETA · not written"), true;
      return say(s, "Heart · own words · BOTABLETA line"), true;
    }
    // 5b BATIBABOX recall <topic>: shared retrieval with sources (this bot's own memory + shared notes/manual/live/chain), without the Heart
    if (/^recall\b/i.test(q) && window.RL_BBX) {
      const topic = q.replace(/^recall\s*/i, "").trim(); const B = window.RL_BBX; const out = [];
      if (/\b(latest|last|newest)\b/i.test(topic) && /botableta/i.test(topic)) { const c = await B.latestNote("BOTABLETA"); if (c) out.push(`latest BOTABLETA line: “${c.t}” ${B.tag(c)} ref ${c.ref}`); }
      const r = await B.search(topic.replace(/\b(latest|last|newest)\b/gi, ""), { rid: M.rid, k: 3 });
      r.hits.forEach((c, i) => out.push(`${i + 1}. (${c.score}) “${c.t.replace(/\s+/g, " ").slice(0, 180)}” ${B.tag(c)}`));
      return say(out.length ? out.join("\n") : "BATIBABOX found nothing for that.", `BATIBABOX recall · ${r.n} chunks · ${r.ms} ms${r.cached ? " · cached" : ""}`), true;
    }
    // 6 notes questions keep the notes reader (Heart with the note injected)
    try { if (window.RZL_NOTES && await window.RZL_NOTES.tryRespond(text)) return true; } catch (e) {}
    // 7 everything else → this bot's Heart with context
    const a = (await heart((await context(M, q)) + `Rizal: ${q}\n${M.name}:`)).trim();
    if (!a || BAD.test(a)) return say("My Heart didn't give an answer just now. Please ask again.", "Heart · no answer"), true;
    return say(a, M.bbx && M.bbx.tokens ? `Heart · own words · BATIBABOX +${M.bbx.tokens} tok, ${M.bbx.ms} ms` : "Heart · own words"), true;
  }
  window.RL_BOTWIN = { version: "1.0.2-batiba", handle, botableta, unstamp, idCheck };
})();

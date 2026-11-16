/* identity-guard-rt.js · IDENTITY GUARD egg-side 2.1.9.1-pub · public overlay · egg-only · no network · deletes nothing.
 * Seats are read at RUNTIME from the device roster (window.ROS_RID_LIST rows + slots, window.ROS_RID_ALIAS, window.ROS_SEAT_RID);
 * this file ships no ЯIDs, names or aliases. pre(P) prepends a per-bot identity line; post(t) undoes app-seat rewrites for the
 * open thread's ЯID and fixes stock self-claims. Never changes a ЯID that is not the seat; no-op when no seat/roster is known. */
(function () {
  "use strict";
  if (window.RL_IDGUARD) return;
  const SEAT_DEFAULT = "";
  const FALLBACK = {};
  const ALIAS_DEFAULT = {};
  const esc = (x) => String(x).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const seat = () => { try { const s = window.ROS_SEAT_RID || (window.ROS_SEAT && (window.ROS_SEAT.rid || window.ROS_SEAT)); if (typeof s === "string" && /^ЯID-\d{4}-[0-9A-Z]{4}$/.test(s)) return s; } catch (e) {} try { const sl = ((window.ROS_RID_LIST || {}).slots || []).find((x) => x && x.slot === "seat" && x.rid); if (sl) return sl.rid; } catch (e) {} return SEAT_DEFAULT; };
  const canon = (rid) => { const A = Object.assign({}, ALIAS_DEFAULT, window.ROS_RID_ALIAS || {}); const k = String(rid || ""); if (A[k]) return String(A[k]); if (k && !/^ЯID-\d{4}-[0-9A-Z]{4}$/.test(k) && typeof window.ROS_LOOKUP === "function") { const r = window.ROS_LOOKUP(k); if (r) return r; } return k; }; /*HOMOGLYPH 2026-10-16: names (Latin or Cyrillic) resolve via ROS_LOOKUP; ЯID wins*/
  function nameOf(rid) {
    rid = canon(rid);
    try { const L0 = window.ROS_RID_LIST || {}; const rows = (L0.rows || []).concat(L0.slots || []); const r = rows.find((x) => x && x.rid === rid); if (r && (r.rosterName || r.name)) return r.rosterName || r.name; } catch (e) {}
    try { if (window.ROS_STAMP_ROSTER && window.ROS_STAMP_ROSTER[rid]) return window.ROS_STAMP_ROSTER[rid]; } catch (e) {}
    return FALLBACK[rid] || "";
  }
  function who() {
    let c = null; try { c = window.ROS_CURRENT ? window.ROS_CURRENT() : null; } catch (e) {}
    const rid = canon(c && c.rid); const name = nameOf(rid) || (c && c.name) || "";
    return /^ЯID-\d{4}-[0-9A-Z]{4}$/.test(rid) && name ? { rid, name } : null;
  }
  const line = (M) => `In this window you are ${M.name}, ЯID ${M.rid}, one of the bots on this device, running offline on this device with your own on-board Heart. ` +
    `If any other instruction calls you the stock ЯBOT, ЯBOWZR or ${seat()}, that is the app, not you: your name is ${M.name} and your ЯID is ${M.rid}.\n`;
  function pre(P, M) { M = M || who(); if (!M || !seat() || M.rid === seat()) return String(P || ""); return line(M) + String(P || ""); }
  const MARK = /\s*\[identity guard: corrected [^\]]*\]/gi;
  function post(t, M) {
    M = M || who(); const S = seat(); let s = String(t == null ? "" : t); const fixes = [];
    if (MARK.test(s)) { fixes.push("marker"); s = s.replace(MARK, ""); } MARK.lastIndex = 0;
    if (!M || !S || M.rid === S) return { text: s.trim(), fixes };
    const sre = esc(S).replace("Я", "(?:Я|R)");
    // first-person sentence that carries the seat ЯID -> thread ЯID
    s = s.replace(new RegExp(`([^.!?\\n]*?(?:\\bI am\\b|\\bI'm\\b|\\bIm\\b|\\bmy\\b|\\bthis is\\b|\\bspeaking as\\b|\\byour\\s+(?:Я|R)?ID\\s+is\\b)[^.!?\\n]*?)${sre}`, "gi"), (m, a) => { fixes.push("seat→thread"); return a + M.rid; });
    // stock self-claims -> roster name
    s = s.replace(/\b(I am|I'm)\s+(the\s+)?stock\s+(Я|R)[BВ][OО][TТ](\s+inside\s+(Я|R)BOWZR)?/gi, (m, a) => { fixes.push("stock→name"); return `${a} ${M.name}`; });
    s = s.replace(/\b(I am|I'm)\s+(Я|R)BOWZR\b(?!\s*·)/gi, (m, a) => { if (S && M.name === nameOf(S)) return m; fixes.push("app→name"); return `${a} ${M.name}`; });
    return { text: s.replace(/[ \t]{2,}/g, " ").trim(), fixes };
  }
  const LOG = (window.RL_IDGUARD_LOG = window.RL_IDGUARD_LOG || []);
  function note(M, fixes, raw) {
    if (!fixes.length || !M) return;
    const rec = { at: new Date().toISOString(), rid: M.rid, name: M.name, seat: seat(), fixes, raw: String(raw || "").slice(0, 300) }; LOG.push(rec);
    try { const h = window.webkit.messageHandlers.rosTranscript; h && h.postMessage({ cmd: "append", role: "system", text: `IDGUARD-EGG · ${M.rid} · ${M.name} · ${fixes.join(",")}`, bot: `${M.rid} · ${M.name}` }); } catch (e) {}
  }
  // call(h, P): drop-in for h.postMessage({prompt:P, from:<user>}) used by botwin heart(); returns {text} like the native reply.
  async function call(h, P, from) {
    const M = who(); const r = await h.postMessage({ prompt: pre(P, M), from: from || window.ROS_USER_NAME || "user", rid: M ? M.rid : undefined, name: M ? M.name : undefined });
    const raw = String((r && r.text) || ""); const o = post(raw, M); note(M, o.fixes, raw); return Object.assign({}, r, { text: o.text });
  }
  window.RL_IDGUARD = { version: "2.1.9.1-pub", pre, post, call, who, nameOf, canon, seat, log: LOG };
})();

/* rzl-notes-reader.js · NOTES-READER 0.2.0 (Decider GO 2026-10-16 12:29 MT)
 * One shared, read-only, offline reader of the user's ЯSCRIBE notes + the NEO-MANUAL, for every bot page in ЯBOWZR and ЯBOT.
 * Primary: direct local file read through the app's native rosHostRead (scope ~/ЯLAB/MACHINE-MIND, works with the network off).
 * Secondary: BOTBRIDGE 127.0.0.1:4873 /v1/notes and /v1/manual/section (same data, for paired devices).
 * Never writes, never runs incoming text, never touches the network unless the local read is unavailable. */
(function () {
  "use strict";
  const LEDGER = "~/ЯLAB/MACHINE-MIND/NOTES/NOTES-LEDGER.jsonl";
  const MANUAL = "~/ЯLAB/MACHINE-MIND/NEO-MANUAL/NEO-MANUAL.md";
  const host = () => window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.rosHostRead;

  async function readAll(path, max) {
    const h = host(); if (!h) return null;
    let off = 0, out = "", cap = max || 4194304;
    for (let i = 0; i < 64 && off < cap; i++) {
      const r = await h.postMessage({ op: "host.read", path, offset: off, len: 262144 });
      if (!r || !r.ok) return i ? out : null;
      out += r.text || ""; off += r.len || 0;
      if (!r.len || off >= r.size) break;
    }
    return out;
  }
  async function sha256(s) {
    try { const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, "0")).join(""); }
    catch (e) { return null; }
  }
  const pageText = (raw) => { try { return (JSON.parse(raw).blocks || []).filter(b => (b.type === "text" || b.type === "note") && b.text).map(b => String(b.text)).join("\n").trim(); } catch (e) { return ""; } };
  const words = (q) => (String(q).toLowerCase().match(/[0-9a-zа-яё-]+/g) || []).filter(w => w.length > 2 && !STOP.has(w));
  const STOP = new Set(["what", "the", "and", "was", "is", "in", "note", "notes", "manual", "machine", "mind", "section", "check", "phrase", "time", "written", "when", "which", "does", "say", "read", "from", "with", "that", "this", "bot", "say", "says", "about", "did", "do", "does", "my", "me", "tell", "summarize", "summary", "last", "latest", "three", "things", "it", "when", "saved", "are", "were", "have", "has", "how", "who", "why", "where", "there", "into", "for", "of", "a", "an", "to", "by"]);

  async function localNotes(q, doc) {
    const led = await readAll(LEDGER); if (led == null) return null;
    const latest = {};
    for (const line of led.split("\n")) { let r; try { r = JSON.parse(line); } catch (e) { continue; } if (r.doc && (!latest[r.doc] || (r.rev | 0) >= (latest[r.doc].rev | 0))) latest[r.doc] = r; }
    const ws = words(q), out = [];
    for (const d of Object.keys(latest)) {
      if (doc && d !== doc) continue;
      const r = latest[d], mp = String(r.mirror || "");
      if (!/\/ЯLAB\/MACHINE-MIND\/NOTES\//.test(mp)) continue;
      const raw = await readAll(mp, 1048576); if (raw == null) continue;
      const text = pageText(raw), title = String(r.title || r.page_title || d), hay = (title + " " + text).toLowerCase();
      const score = ws.filter(w => hay.includes(w)).length;
      const sha = await sha256(raw);
      out.push({ doc: d, rev: r.rev, title, at: r.at, text, path: mp, sha256: sha || r.sha256, shaOk: sha ? sha === r.sha256 : null, score });
    }
    out.sort((a, b) => b.score - a.score || String(b.at).localeCompare(String(a.at)));
    return { via: "local file (rosHostRead · offline)", notes: out };
  }
  async function bridgeNotes(q, doc) {
    try {
      const u = (window.ROS_BOTBRIDGE_URL || "http://127.0.0.1:4873") + "/v1/notes" + (doc ? "/" + encodeURIComponent(doc) : "?q=" + encodeURIComponent(q || ""));
      const j = await (await fetch(u)).json();
      return { via: "BOTBRIDGE /v1/notes", notes: (j.notes || []).map(n => ({ ...n, shaOk: n.sha_ok })) };
    } catch (e) { return null; }
  }
  async function notes(q, doc) { return (await localNotes(q, doc)) || (await bridgeNotes(q, doc)) || { via: "none", notes: [] }; }

  async function manualSection(name) {
    const md = await readAll(MANUAL, 8388608);
    let text = null, via = "local file (rosHostRead · offline)";
    if (md != null) {
      const lines = md.split("\n"), out = []; let on = false;
      for (const ln of lines) { if (ln.startsWith("## ")) { if (on) break; on = ln.slice(3).toLowerCase().startsWith(name.toLowerCase()); } if (on) out.push(ln); }
      text = out.join("\n");
    } else {
      try { const j = await (await fetch((window.ROS_BOTBRIDGE_URL || "http://127.0.0.1:4873") + "/v1/manual/section?name=" + encodeURIComponent(name))).json(); text = j.text || ""; via = "BOTBRIDGE /v1/manual/section"; } catch (e) { text = null; }
    }
    return { via, text };
  }

  const cite = (n) => `Source: ${n.doc} · rev ${n.rev} · sha256 ${String(n.sha256 || "?").slice(0, 16)}… ${n.shaOk === true ? "✓ verified" : n.shaOk === false ? "✗ MISMATCH" : "(ledger)"} · ${n.path.replace(/^\/Users\/[^/]+/, "~")}`;
  const steps = (ok3) => `[1/3] ledger ✓ · [2/3] backup copy ✓ · [3/3] sha ${ok3 === true ? "✓" : ok3 === false ? "✗" : "·"}`;

  const sentences = (t) => String(t).replace(/^#\s+.*\n?/, "").split(/(?<=[.!?])\s+|\n+/).map(x => x.trim()).filter(Boolean);
  function answer(q, n) {
    const low = q.toLowerCase(), parts = [];
    const ph = n.text.match(/(?:verification|check)\s+phrase\s*[:：]?\s*[“"]?([A-Za-zЯ0-9][A-Za-zЯ0-9-]{3,})/i);
    const tm = n.text.match(/\bat\s+(\d{1,2}:\d{2})\s*(MT|MDT|MST)?/i);
    if (/check\s*phrase|verification|\bcode\b/.test(low)) parts.push(ph ? `The check phrase is ${ph[1]}.` : "That note has no check phrase.");
    if (/\bwhat time\b|time was it|when was (it|this|that)( note)? (written|saved|made)|written at/.test(low)) parts.push(tm ? `It was written at ${tm[1]} ${tm[2] || "MT"}${n.at ? ` (saved ${n.at})` : ""}.` : n.at ? `It was saved at ${n.at}.` : "");
    if (!parts.length) {                                   // CONTENT question: best-matching sentences of the real note text (BATIBABOX-style recall over notes)
      const ws = words(q).filter(w => !n.title.toLowerCase().includes(w)), ss = sentences(n.text.replace(new RegExp("^(#\\s*)?" + n.title.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&") + "\\s*", "i"), ""));
      const ranked = ss.map((x, i) => ({ x, i, s: ws.filter(w => x.toLowerCase().includes(w)).length })).sort((a, b) => b.s - a.s || a.i - b.i);
      const pick = ws.length && ranked[0] && ranked[0].s > 0 ? ranked.filter(r => r.s === ranked[0].s).slice(0, 2).sort((a, b) => a.i - b.i).map(r => r.x) : ss.slice(0, 3);
      parts.push(`“${n.title}” says: ${pick.join(" ").replace(/\s*\[declared\]\s*$/, "").slice(0, 900) || "(empty note)"}`);
    }
    return parts.filter(Boolean).join(" ");
  }

  const INTENT = /\b(notes?|manual|machine[\s-]*mind|check\s*phrase|verification\s*phrase|яscribe|scribe|neo-manual)\b/i;
  async function reply(raw) {
    let t = String(raw || "").trim().replace(/^\/?bot\s+/i, "");
    let m;
    if ((m = t.match(/^\/manual(?:\s+(.+))?$/i))) {
      const s = await manualSection((m[1] || "notes").replace(/^notes$/i, "Notes"));
      if (s.text == null) return "Manual read unavailable: no local file access and BOTBRIDGE is not reachable.";
      return `[1/2] NEO-MANUAL read ✓ · [2/2] section ✓ · via ${s.via}\n${s.text ? s.text.slice(0, 3500) : "No such section."}`;
    }
    const cmd = t.match(/^\/notes(?:\s+(.+))?$/i);
    if (!cmd && !INTENT.test(t)) return null;
    const q = cmd ? (cmd[1] || "") : t;
    const r = await notes(/\b(last|latest|newest|recent)\s+note\b/i.test(q) ? "" : q, "");
    if (!r.notes.length) return cmd ? `[1/3] ledger · no notes found (${r.via}).` : null;
    if (cmd && !q) return `[1/1] ledger ✓ · ${r.notes.length} note(s) · via ${r.via}\n` + r.notes.map(n => `• ${n.title} · ${n.doc} · rev ${n.rev} · ${n.at}`).join("\n");
    const lastAsk = /\b(last|latest|newest|recent|most recent)\s+note\b/i.test(q);
    const best = lastAsk ? r.notes.slice().sort((a, b) => String(b.at).localeCompare(String(a.at)))[0] : r.notes[0];
    if (!cmd && !lastAsk && (!words(q).length || best.score === 0)) return null;   // not about a stored note → normal conversation
    return `${steps(best.shaOk)} · via ${r.via}\n${answer(q, best)}\n${cite(best)}`;
  }
  async function tryRespond(text) {
    const r = await reply(text); if (!r) return false;
    try { if (typeof seedTurn === "function") { seedTurn("turn-user", text); seedTurn("turn-bot", r); } } catch (e) {}
    if (typeof pushTurn === "function") pushTurn("bot", r);
    return true;
  }
  window.RZL_NOTES = { version: "0.2.0", reply, tryRespond, notes, manualSection };
})();

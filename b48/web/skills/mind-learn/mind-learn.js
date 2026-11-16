/* mind-learn 0.1.0 · 2026-10-22 · DRAGON SKULL chat skill (UNSIGNED, STAGED, NOT INSTALLED)
 * Chat commands (user-typed only; model replies can never write the mind):
 *   mind                         status: counts, chain head, verify
 *   remember <fact>              PROFILE: durable fact about Rizal
 *   journal <note>               JOURNAL: dated note (today, America/Denver clock of the device)
 *   skill save <name>: a; b; c   SKILL: saved multi-step task (steps split on ';')
 *   skill <name>                 show the newest version of a skill
 *   correct <id> <new text>      NEW entry that supersedes <id>; old one is kept forever
 *   recall <words>               what the mind knows (searched before acting, too)
 *   mind history <words>         search including superseded versions
 *   mind day <YYYY-MM-DD>        that day's journal
 *   mind verify                  re-check the whole hash chain
 * Storage (offline, on device): localStorage keys ds.mindlearn.e.<seq> — each written once, never rewritten,
 * never removed — plus a best-effort mirror of every entry to DRAGON-SKULL-MIND via /api/mind/note (tag mind-learn).
 * Before-acting recall: window.DS_MIND_LEARN.context(text) returns a context block; the ask path prepends it (see PLAN.md).
 */
(function (root) {
  "use strict";
  var C = root.DS_MIND_LEARN_CORE; if (!C) { try { console.warn("[MIND-LEARN] core missing"); } catch (e) {} return; }
  var PFX = "ds.mindlearn.e.";
  function lsBackend() {
    var LS = root.localStorage;
    return {
      load: function () { var out = [], i = 0, v; while ((v = LS.getItem(PFX + i)) !== null) { out.push(JSON.parse(v)); i++; } return out; },
      append: function (e) {
        var k = PFX + e.seq; if (LS.getItem(k) !== null) throw new Error("refusing to overwrite " + k);
        LS.setItem(k, JSON.stringify(e));
        try { fetch("/api/mind/note", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: "MIND-LEARN " + JSON.stringify(e), tags: ["mind-learn", e.kind] }) }).catch(function () {}); } catch (x) {}
      }
    };
  }
  var mind = null;
  function M() { if (!mind) mind = new C.Mind(lsBackend()); return mind; }
  var RX = /^\s*(mind|remember|journal|skill|correct|recall)\b\s*([\s\S]*)$/i;
  function match(t) { var m = RX.exec(String(t || "")); return m ? { verb: m[1].toLowerCase(), rest: m[2].trim() } : null; }
  function fmt(e) { var b = typeof e.body === "string" ? e.body : e.body.name + ": " + e.body.steps.join("; ");
    return "[" + e.id + "] " + e.kind + " " + e.ts.slice(0, 10) + " · " + b; }
  function run(m) {
    var md = M(), r = m.rest;
    try {
      if (m.verb === "remember") { if (!r) return "remember <fact about you>"; return "Remembered (profile, never forgotten): " + fmt(md.append("profile", r)); }
      if (m.verb === "journal") { if (!r) return "journal <note>"; return "Journaled: " + fmt(md.append("journal", r)); }
      if (m.verb === "skill") {
        var s = /^save\s+([^:]+):\s*([\s\S]+)$/i.exec(r);
        if (s) { var steps = s[2].split(";").map(function (x) { return x.trim(); }).filter(Boolean);
          var old = md.current("skill").filter(function (e) { return e.body.name.toLowerCase() === s[1].trim().toLowerCase(); }).pop();
          var e = md.append("skill", { name: s[1].trim(), steps: steps }, old ? { supersedes: old.id } : {});
          return "Skill saved" + (old ? " (new version; old " + old.id + " kept)" : "") + ": " + fmt(e); }
        var cur = md.current("skill"); if (!r) return cur.length ? cur.map(fmt).join("\n") : "No skills yet. skill save <name>: step; step";
        var hit = cur.filter(function (e) { return e.body.name.toLowerCase() === r.toLowerCase(); }).pop();
        return hit ? hit.body.name + ":\n" + hit.body.steps.map(function (x, i) { return "  " + (i + 1) + ") " + x; }).join("\n") : "No skill named " + r;
      }
      if (m.verb === "correct") { var c = /^(\S+)\s+([\s\S]+)$/.exec(r); if (!c) return "correct <id> <new text>";
        var o = md.byId(c[1]); if (!o) return "No entry " + c[1];
        var body = o.kind === "skill" ? { name: o.body.name, steps: c[2].split(";").map(function (x) { return x.trim(); }).filter(Boolean) } : c[2];
        return "Corrected (old kept as history): " + fmt(md.append(o.kind, body, { supersedes: o.id })); }
      if (m.verb === "recall") { var h = md.search(r); return h.length ? h.map(function (x) { return fmt(x.e); }).join("\n") : "Nothing in the mind about that yet."; }
      // mind ...
      var sub = /^(\w+)?\s*([\s\S]*)$/.exec(r);
      if (sub[1] === "verify") { var v = md.verify(); return v.ok ? "Chain OK · " + v.n + " entries · head " + v.head.slice(0, 12) : "CHAIN BROKEN at seq " + v.at + " (writes stopped; nothing deleted)"; }
      if (sub[1] === "history") { var hh = md.search(sub[2], { history: true, limit: 20 });
        return hh.map(function (x) { return fmt(x.e) + (x.superseded_by ? "  (superseded by " + x.superseded_by + ")" : ""); }).join("\n") || "nothing"; }
      if (sub[1] === "day") { var d = md.journalDay(sub[2]); return d.length ? d.map(fmt).join("\n") : "No journal for " + sub[2]; }
      var st = md.stats(); return "MIND-LEARN 0.1.0 · profile " + st.profile + " · journal " + st.journal + " · skills " + st.skill +
        " · superseded " + st.superseded + " · total " + st.total + " · head " + st.head + (md.broken ? " · CHAIN BROKEN" : " · append-only, never forgets");
    } catch (err) { return "MIND-LEARN: " + err.message + " (nothing written)"; }
  }
  function context(q) { try { return M().recall(q).text; } catch (e) { return ""; } }
  function show(who, text) {
    if (typeof root.pushTurn === "function") { try { root.pushTurn(who, text); return; } catch (e) {} }
    var el = document.getElementById("log"); if (!el) return;
    var d = document.createElement("div"); d.className = "turn " + who; d.textContent = (who === "bot" ? "DRAGON SKULL: " : "You: ") + text; el.appendChild(d);
  }
  function install() {
    if (root.__DS_MIND_LEARN || typeof document === "undefined") return; root.__DS_MIND_LEARN = true;
    document.addEventListener("submit", function (e) {
      var f = e.target; if (!f || f.id !== "composer" || !e.isTrusted) return;
      var inp = document.getElementById("message"); var t = inp ? String(inp.value || "") : "";
      var m = match(t); if (!m) return;
      e.preventDefault(); e.stopImmediatePropagation(); if (inp) inp.value = "";
      show("user", t.trim()); show("bot", run(m));
    }, true);
  }
  root.DS_MIND_LEARN = { version: "0.1.0", match: match, run: run, context: context, mind: M, install: install };
  try { install(); } catch (e) {}
})(typeof self !== "undefined" ? self : this);

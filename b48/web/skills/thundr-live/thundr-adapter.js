/* thundr-adapter.js · THUNDR LIVE 0.4 · ЯBOWZR egg-side adapter 0.4.1-stage
 * Staged by ЯID-0003-P4M6 · ЯМАХ · 2026-10-16 MT. UNSIGNED · egg-only · no network · deletes nothing.
 * Mounts one <thundr-live> + a plain-text status line directly under #composer (in flow, never fixed, never over the top bar
 * or the ЯSCRIBE panel) and maps the real botwin Heart lifecycle to THUNDR states. Render only: the Heart emits, we draw.
 * Wiring without editing botwin: wraps window.RL_BOTWIN.handle, window.RL_BBX.{context,search,latestNote}, window.pushTurn,
 * and (if WebKit allows) rosHeart.postMessage. Optional 1-line hook in botwin heart() makes "thinking" exact. */
(function () {
  "use strict";
  if (window.RL_THUNDR) return;
  const HERE = (document.currentScript && document.currentScript.src) ? document.currentScript.src.replace(/[^/]*$/, "") : "./skills/thundr-live/";
  const CFG = { size: 20, idleSleepMs: 60000, successHoldMs: 4000 };
  // Heart/botwin event -> state + text template (plan §1.4, narrowed to what botwin really emits)
  const MAP = {
    "turn.start":     { state: "working",   text: "Sending to {name}'s Heart…", reset: true },
    "model.thinking": { state: "thinking",  text: "Waiting for {name}'s Heart…" },
    "bbx.recall":     { state: "searching", text: "Searching BATIBABOX for {query}" },
    "bbx.done":       { state: "thinking",  text: "BATIBABOX +{tokens} tok · waiting for {name}'s Heart…" },
    "turn.done":      { state: "success",   text: "Done ⚡ · {foot}" },
    "heart.reject":   { state: "error",     text: "Identity check failed · app answer shown (logged)" },
    "heart.empty":    { state: "error",     text: "Heart restarting…" },
    "heart.stall":    { state: "error",     text: "Heart restarting…" },
    "turn.error":     { state: "error",     text: "{reason}" },
    "turn.pass":      { state: "idle",      text: "", reset: true },
    "idle.timeout":   { state: "sleeping",  text: "" },
  };
  // Rizal law: every shell has an on-board Heart. These phrases are never rendered.
  const ILLEGAL = /no\s+on[- ]?device\s+heart|no\s+heart\s+(on|available)|heart (is )?offline/i;
  const fill = (t, d) => String(t || "").replace(/\{(\w+)\}/g, (_, k) => (d[k] == null ? "" : String(d[k]))).replace(/\s·\s*$/, "").trim();
  let el = null, line = null, sleepT = 0, holdT = 0, t0 = 0, cur = { state: "idle", text: "" }, lastBot = "", log = [];

  function who() { try { const c = window.ROS_CURRENT && window.ROS_CURRENT(); if (c) return { rid: c.rid || "", name: c.name || "bot" }; } catch (e) {} return { rid: "", name: "bot" }; }
  function loadCore() {
    if (window.customElements && customElements.get("thundr-live")) return;
    if (document.querySelector("script[data-thundr-core]")) return;
    const s = document.createElement("script"); s.src = HERE + "thundr-live.js"; s.defer = true; s.setAttribute("data-thundr-core", "0.4"); document.head.appendChild(s);
  }
  function mount() {
    if (line && line.isConnected) return true;   // 2.1.9.8 re-cut: no figure here
    const comp = document.getElementById("composer"); if (!comp) return false;
    const box = document.createElement("div"); box.id = "thundr-bar";
    box.style.cssText = "display:flex;align-items:center;gap:8px;padding:2px 10px;min-height:22px;position:static;font:600 13px system-ui,sans-serif;color:#f2ecfa;pointer-events:none;text-shadow:0 1px 2px #000,0 0 6px #000";   // 2.1.9.8 free-floating: no box, figure-only pointer
    el = null;   // 2.1.9.8 re-cut: ONE THUNDR (superdragon #thundr-pin); was a 2nd figure under #composer
    line = document.createElement("span"); line.id = "thundr-status"; line.setAttribute("role", "status"); line.setAttribute("aria-live", "polite");
    line.style.cssText = "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1";
    box.append(line); comp.insertAdjacentElement("afterend", box); paint(); return true;
  }
  function bar(state) { // plain-text progress bar per Rizal's rule
    const step = { working: 1, searching: 2, thinking: 3, success: 4, error: 4 }[state] || 0;
    return step ? "[" + "■".repeat(step) + "□".repeat(4 - step) + "] " : "";
  }
  function paint() {
    if (!line) return;
    const secs = t0 && cur.state !== "idle" && cur.state !== "sleeping" ? ` · ${Math.round((Date.now() - t0) / 1000)}s` : "";
    line.textContent = cur.state === "idle" ? "" : `${bar(cur.state)}THUNDR · ${cur.state}${cur.text ? " · " + cur.text : ""}${secs}`;
    line.style.color = cur.state === "error" ? "#ff6b6b" : "";
  }
  function emit(ev) {
    ev = ev || {}; const m = MAP[ev.kind]; if (!m) return null;
    const W = who(); const d = Object.assign({ name: W.name, rid: W.rid }, ev);
    let text = fill(m.text, d); if (ILLEGAL.test(text)) text = "Heart restarting…";
    const e = { v: 1, bot: W.rid, kind: ev.kind, state: m.state, text, reset: !!m.reset, ts: new Date().toISOString() };
    if (m.reset) t0 = m.state === "idle" ? 0 : Date.now();
    cur = { state: m.state, text }; log.push(e); if (log.length > 200) log.shift();
    mount(); try { el && el.push(e); } catch (x) {} paint();
    clearTimeout(sleepT); clearTimeout(holdT);
    if (m.state === "success" || m.state === "error") holdT = setTimeout(() => { if (cur.state === m.state && m.state === "success") { cur = { state: "idle", text: "" }; try { el && el.setState("idle"); } catch (x) {} paint(); } }, CFG.successHoldMs);
    if (m.state !== "sleeping") sleepT = setTimeout(() => emit({ kind: "idle.timeout" }), CFG.idleSleepMs);
    try { document.dispatchEvent(new CustomEvent("thundr-adapter", { detail: e })); } catch (x) {}
    return e;
  }
  function footOf(t) { const m = /\(([^()]*)\)\s*$/.exec(String(t || "")); return m ? m[1] : ""; }
  function wrap() {
    let n = 0;
    const BW = window.RL_BOTWIN;
    if (BW && !BW.__thundr) {
      const h = BW.handle;
      BW.handle = async function (raw) {
        const r0 = (window.RL_BOTWIN_REJECTS || []).length; lastBot = "";
        emit({ kind: "turn.start" });
        let ok;
        try { ok = await h.apply(this, arguments); } catch (x) { emit({ kind: "turn.error", reason: "Heart error · " + String((x && x.message) || x).slice(0, 80) }); throw x; }
        if (!ok) { emit({ kind: "turn.pass" }); return ok; }
        const foot = footOf(lastBot), rej = (window.RL_BOTWIN_REJECTS || []).length - r0;
        if (/Heart · no answer|not written|read failed/i.test(foot)) emit({ kind: "heart.empty" });
        else if (/^app identity/i.test(foot)) emit({ kind: "heart.reject", rejects: rej });
        else emit({ kind: "turn.done", foot: foot });
        return ok;
      };
      BW.__thundr = 1; n++;
    }
    const B = window.RL_BBX;
    if (B && !B.__thundr) {
      ["context", "search", "latestNote"].forEach((k) => {
        if (typeof B[k] !== "function") return; const f = B[k];
        B[k] = async function (q) {
          emit({ kind: "bbx.recall", query: String(q || "").slice(0, 40) });
          const r = await f.apply(this, arguments);
          if (k === "context") emit({ kind: "bbx.done", tokens: (r && r.tokens) || 0 });
          return r;
        };
      });
      B.__thundr = 1; n++;
    }
    if (typeof window.pushTurn === "function" && !window.pushTurn.__thundr) {
      const p = window.pushTurn; window.pushTurn = function (role, text) { if (role === "bot") lastBot = String(text || ""); return p.apply(this, arguments); };
      window.pushTurn.__thundr = 1; n++;
    }
    try {
      const H = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.rosHeart;
      if (H && !H.__thundr) { const pm = H.postMessage.bind(H); H.postMessage = function (msg) { if (msg && msg.prompt) emit({ kind: "model.thinking" }); return pm(msg); }; H.__thundr = 1; n++; }
    } catch (e) {} // WebKit may refuse; the optional botwin hook covers it
    return n;
  }
  function boot() { loadCore(); mount(); wrap(); let tries = 0; const iv = setInterval(() => { wrap(); mount(); if (++tries > 40 || (window.RL_BOTWIN && window.RL_BOTWIN.__thundr && window.RL_BBX && window.RL_BBX.__thundr)) clearInterval(iv); }, 250); }
  window.RL_THUNDR = { version: "0.4.1-stage", emit, map: MAP, cfg: CFG, log, wrap, mount, get state() { return cur; } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();

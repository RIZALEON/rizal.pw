/* thundr-bus.js · THUNDR superlink bus 0.5.2 · superdragon 2.1.9.18 (2026-10-17 MT) · egg-only · offline · deletes nothing.
 * One bus every organ reports into: RL_THUNDR.bus.emit({organ,kind,state,text}) and RL_THUNDR_SAY(text|event).
 * Taps (wrap only, organs' code untouched): ЯSCRIBE, identity guard, mouth relay/Botbridge fetch, egg loader (version change),
 * RZL repair/code/convert, hardwire vitals heartbeat, online/offline, BATIBABOX/Heart (via adapter 0.4.1).
 * State -> expression: work->working, inference->thinking, lookups/feeds->searching, done->success, failures/red->error,
 * idle/offline->sleeping, egg staged->egg, egg activated->hatch. THUNDR stays free-floating: no caption, no box at rest;
 * tap him for a transparent step popover. The Heart-phrase law is kept (banned wording becomes "Heart restarting…"). */
(function () {
  "use strict";
  if (window.RL_THUNDR_BUS) return;
  const VER = "0.5.2";
  const STATES = ["idle","working","thinking","searching","success","error","sleeping","egg","hatch"];
  const MIN_MS = { working: 400, thinking: 400, searching: 400, success: 900, error: 900 };
  const CFG = { successHoldMs: 4000, idleSleepMs: 60000, heartbeatMs: 30000, ring: 500 };
  const ILLEGAL = new RegExp("no\\s+on[- ]?device\\s+he" + "art|no\\s+he" + "art|he" + "art (is )?offline", "i");
  const log = []; let cur = { state: "idle", text: "" }, shownAt = 0, q = null, qT = 0, holdT = 0, sleepT = 0, pop = null;
  const reds = {};
  function apply(e) {
    cur = { state: e.state, text: e.text }; shownAt = Date.now();
    try { document.dispatchEvent(new CustomEvent("thundr-adapter", { detail: { v: 1, state: e.state, text: e.text, kind: e.kind, organ: e.organ, ts: e.ts } })); } catch (x) {}
    clearTimeout(holdT); clearTimeout(sleepT);
    if (e.state === "success" || e.state === "hatch") holdT = setTimeout(() => emit({ organ: "thundr", kind: "hold.done", state: "idle", text: "" }), CFG.successHoldMs);
    if (e.state !== "sleeping") sleepT = setTimeout(() => emit({ organ: "thundr", kind: "idle.timeout", state: "sleeping", text: "" }), CFG.idleSleepMs);
    if (pop && !pop.hidden) render();
  }
  function emit(ev) {
    if (typeof ev === "string") ev = { text: ev };
    ev = ev || {};
    let state = String(ev.state || "").toLowerCase(); if (STATES.indexOf(state) < 0) state = ev.text ? "working" : "idle";
    let text = String(ev.text == null ? "" : ev.text).slice(0, 160); if (ILLEGAL.test(text)) text = "Heart restarting…";
    const e = { v: 1, organ: String(ev.organ || "app"), kind: String(ev.kind || "say"), state, text, ts: new Date().toISOString() };
    if (ev.steps) { e.steps = +ev.steps || 0; e.step = +ev.step || 0; }
    if (e.kind !== "idle.timeout" && e.kind !== "hold.done") { log.push(e); if (log.length > CFG.ring) log.shift(); }
    try { document.dispatchEvent(new CustomEvent("thundr-organ", { detail: e })); } catch (x) {}
    const wait = (MIN_MS[cur.state] || 0) - (Date.now() - shownAt);
    if (wait > 0 && e.state !== "error") { q = e; clearTimeout(qT); qT = setTimeout(() => { const n = q; q = null; if (n) apply(n); }, wait); }
    else { q = null; clearTimeout(qT); apply(e); }
    return e;
  }
  const say = (t, s) => (t && typeof t === "object") ? emit(t) : emit({ organ: "app", text: t, state: s || "working" });
  function tapFn(obj, k, organ, startState, label) {
    const f = obj && obj[k]; if (typeof f !== "function" || f.__tb) return 0;
    const fail = (x) => emit({ organ, kind: k + ".error", state: "error", text: label + " failed · " + String((x && x.message) || x).slice(0, 60) });
    const w = function () {
      emit({ organ, kind: k + ".start", state: startState, text: label + "…" });
      let r; try { r = f.apply(this, arguments); } catch (x) { fail(x); throw x; }
      if (r && typeof r.then === "function") return r.then((v) => { emit({ organ, kind: k + ".done", state: "success", text: label + " done" }); return v; }, (x) => { fail(x); throw x; });
      emit({ organ, kind: k + ".done", state: "success", text: label + " done" }); return r;
    };
    w.__tb = 1; obj[k] = w; return 1;
  }
  const tapped = {};
  function taps() {
    const R = window.RL_RSCRIBE;
    if (R && !tapped.rscribe) { tapFn(R, "flush", "rscribe", "working", "ЯSCRIBE saving revision"); tapFn(R, "newNote", "rscribe", "working", "ЯSCRIBE new note"); tapFn(R, "search", "rscribe", "searching", "ЯSCRIBE search"); tapped.rscribe = 1; }
    const G = window.RL_IDGUARD;
    if (G && !tapped.idguard) {
      if (typeof G.post === "function" && !G.post.__tb) { const p = G.post; G.post = function () { const r = p.apply(this, arguments);
        const bad = r === false || (r && (r.ok === false || r.rejected)); emit({ organ: "identity-guard", kind: bad ? "reject" : "pass", state: bad ? "error" : "success", text: bad ? "Identity check failed · logged" : "Identity check passed" }); return r; }; G.post.__tb = 1; }
      tapped.idguard = 1;
    }
    Object.keys(window).filter((n) => /^RL_RZL_/.test(n)).forEach((n) => {
      const o = window[n]; if (!o || typeof o !== "object" || tapped[n]) return;
      const organ = /CONV/.test(n) ? "egg-convert" : /CODE/.test(n) ? "rzl-code" : "rzl-repair";
      ["run", "apply", "convert", "inject", "fix", "code"].forEach((k) => tapFn(o, k, organ, "working", organ));
      ["analyze", "diagnose", "scan"].forEach((k) => tapFn(o, k, organ, "searching", organ + " " + k));
      tapped[n] = 1;
    });
    return !!(tapped.rscribe && tapped.idguard);
  }
  if (window.fetch && !window.fetch.__tb) {
    const F = window.fetch;
    window.fetch = function (u) {
      const s = String((u && u.url) || u || ""); if (!/\/v1\/heart\/|botbridge|\/mouth/i.test(s)) return F.apply(this, arguments);
      emit({ organ: "mouth", kind: "relay.start", state: "thinking", text: "Mouth relay · Heart thinking…" });
      return F.apply(this, arguments).then((r) => { emit({ organ: "mouth", kind: "relay.done", state: r.ok ? "success" : "error", text: r.ok ? "Mouth relay answered" : "Botbridge " + r.status + " · answering on this device" }); return r; },
        (x) => { emit({ organ: "botbridge", kind: "relay.error", state: "error", text: "Botbridge not reachable · answering on this device" }); throw x; });
    };
    window.fetch.__tb = 1;
  }
  function eggWatch() {
    let v = ""; try { v = (window.RL_SUPERDRAGON && window.RL_SUPERDRAGON.version) || ""; } catch (x) {}
    if (!v) return false;
    let last = ""; try { last = localStorage.getItem("rlab.thundr.egg.v1") || ""; localStorage.setItem("rlab.thundr.egg.v1", v); } catch (x) {}
    if (last && last !== v) { emit({ organ: "egg", kind: "egg.staged", state: "egg", text: "Egg " + last + " → " + v }); setTimeout(() => emit({ organ: "egg", kind: "egg.activated", state: "hatch", text: "Egg " + v + " active" }), 1600); }
    else emit({ organ: "egg", kind: "egg.active", state: "success", text: "Egg " + v + " active" });
    return true;
  }
  const VIT = { heart: () => !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.rosHeart) || !!window.RL_BOTWIN,
    mouth: () => !!window.RL_SUPERDRAGON, botbridge: () => !!(window.RL_HARDWIRE && window.RL_HARDWIRE.botbridgePeers), "identity-guard": () => !!window.RL_IDGUARD,
    batibabox: () => !!window.RL_BBX, rscribe: () => !!window.RL_RSCRIBE, ghostchain: () => !!(window.RL_HARDWIRE_LATE && window.RL_HARDWIRE_LATE.chain), thundr: () => !!window.RL_THUNDR };
  // 0.5.1: only organs this page actually loads can go red (home.html is a light page; no false red lights)
  const FILE = { heart: "botwin.js", mouth: "superdragon.js", botbridge: "hardwire.js", "identity-guard": "identity-guard-rt.js", batibabox: "bbx-rt.js",
    rscribe: "rscribe.js", ghostchain: "hardwire-late.js", thundr: "thundr-adapter.js" };
  function onPage(k) { try { return !document.querySelectorAll || !FILE[k] || [].some.call(document.querySelectorAll("script[src]"), (s) => String(s.getAttribute("src")).indexOf(FILE[k]) >= 0); } catch (x) { return true; } }
  function heartbeat() {
    const out = {}; Object.keys(VIT).forEach((k) => { if (!onPage(k)) { out[k] = "not on this page"; return; } let ok = false; try { ok = VIT[k](); } catch (x) {} out[k] = ok;
      if (!ok && !reds[k]) { reds[k] = 1; emit({ organ: k, kind: "vital.red", state: "error", text: k + " not loaded on this page" }); }
      if (ok && reds[k]) { delete reds[k]; emit({ organ: k, kind: "vital.green", state: "success", text: k + " back" }); } });
    return out;
  }
  // Heart/BATIBABOX turns from adapter 0.4.1 land in the same log (the adapter draws; the bus records)
  document.addEventListener("thundr-adapter", (ev) => { const d = ev.detail || {}; if (d.organ || !d.kind) return;
    const organ = /^bbx/.test(d.kind) ? "batibabox" : /reject/.test(d.kind) ? "identity-guard" : "heart";
    log.push({ v: 1, organ, kind: d.kind, state: d.state, text: d.text || "", ts: d.ts || new Date().toISOString() }); if (log.length > CFG.ring) log.shift(); if (pop && !pop.hidden) render(); });
  window.addEventListener("online", () => emit({ organ: "net", kind: "online", state: "success", text: "online" }));
  window.addEventListener("offline", () => emit({ organ: "net", kind: "offline", state: "sleeping", text: "offline · Heart on board" }));
  const ICON = { working: "🧰", thinking: "💭", searching: "🔍", success: "⚡", error: "⚠︎", sleeping: "💤", idle: "•", egg: "🥚", hatch: "🐣" };
  function render() {
    if (!pop) return; pop.textContent = "";
    const h = document.createElement("div"); h.textContent = "THUNDR · " + cur.state + (cur.text ? " · " + cur.text : ""); h.style.cssText = "font-weight:700;margin-bottom:4px"; pop.append(h);
    const L = log.slice(-12).reverse(); if (!L.length) { const d = document.createElement("div"); d.textContent = "• quiet · all organs listening"; pop.append(d); }
    L.forEach((e) => { const d = document.createElement("div"); d.textContent = (ICON[e.state] || "•") + " " + e.organ + " · " + (e.text || e.kind) + " · " + new Date(e.ts).toLocaleTimeString(); if (e.state === "error") d.style.color = "#ff6b6b"; pop.append(d); });
  }
  function popMount() {
    const pin = document.getElementById("thundr-pin"); if (!pin || !document.body) return false;
    if (pin.__tbPop) return true; pin.__tbPop = 1;
    pop = document.createElement("div"); pop.id = "thundr-pop"; pop.hidden = true; pop.setAttribute("role", "log");
    pop.style.cssText = "position:fixed;z-index:2147483600;max-width:min(340px,86vw);padding:8px 10px;border-radius:12px;background:rgba(10,8,12,.55);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);color:#f2ecfa;font:500 12px/1.35 system-ui,sans-serif;text-shadow:0 1px 2px #000;pointer-events:auto";
    document.body.appendChild(pop);
    pin.addEventListener("click", () => { if (pop.hidden) { render(); pop.hidden = false; const r = pin.getBoundingClientRect();
      const left = Math.max(6, Math.min(r.left, innerWidth - pop.offsetWidth - 6)), below = r.bottom + 6;
      pop.style.left = left + "px"; pop.style.top = (below + pop.offsetHeight < innerHeight ? below : Math.max(6, r.top - pop.offsetHeight - 6)) + "px"; } else pop.hidden = true; });
    document.addEventListener("click", (ev) => { if (pop && !pop.hidden && !pin.contains(ev.target) && !pop.contains(ev.target)) pop.hidden = true; }, true);
    return true;
  }
  const report = () => ({ version: VER, state: cur, vitals: heartbeat(), taps: Object.keys(tapped), log: log.slice(-50) });
  const bus = { version: VER, emit, say, log, report, heartbeat, taps, cfg: CFG, get state() { return cur; } };
  window.RL_THUNDR_BUS = bus; window.RL_THUNDR_SAY = say;
  function attach() { if (window.RL_THUNDR && !window.RL_THUNDR.bus) window.RL_THUNDR.bus = bus; }
  function boot() {
    let n = 0, egg = false;
    const iv = setInterval(() => { attach(); const t = taps(); popMount(); if (!egg) egg = eggWatch(); if (++n > 120 || (t && egg && document.getElementById("thundr-pop"))) clearInterval(iv); }, 250);
    setTimeout(heartbeat, 8000); bus._hb = setInterval(heartbeat, CFG.heartbeatMs);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();

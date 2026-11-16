/* RZL CODE REPAIR · egg/web layer · 0.2.0 (2026-10-17, RBEMAX review fixes). Offline, no network, no tokens, idempotent.
 * Applies named fixes from repairs.json (inlined copy below; the egg may set window.RZL_REPAIRS — never fetched).
 * 0.2.0: names only in #chatlist/#thread-head (never body), skips [contenteditable] + ЯSCRIBE/BOTABLETA (Cyrillic stamps stay);
 *        THUNDR fully unboxed (filter/shadow/padding/::before/::after/wrappers/internals), exactly one figure;
 *        chat-list observer goes through enabled(), scoped to #chatlist, debounced; ЯBAT relabel touches only the seat name. */
(function (root) {
  "use strict";
  if (root.RZL_REPAIR && root.RZL_REPAIR.loaded) return;
  var V = "0.2.0", doc = root.document;
  var DEF = { repairs: [
    { id: "latin-names-by-rid", on: { "*": true } }, { id: "rbat-row-0013", on: { "*": true } },
    { id: "thundr-one-unboxed", on: { "*": true } }, { id: "chatlist-runtime-219", target: "rbowzr-test", on: { "*": true } },
    { id: "botableta-seed-script", on: { "*": true } } ] };
  var SEATS = { "ЯID-0002-PQ2Q": ["ЯBOT", "ЯВОТ"], "ЯID-0003-P4M6": ["ЯMAX", "ЯМАХ"], "ЯID-0004-ZYZ0": ["ЯBEE"],
    "ЯID-0005-KM02": ["ЯBOWZR", "ЯBWZR"], "ЯID-0006-02WG": ["ЯSCOUT"], "ЯID-0013-92V4": ["ЯBAT"] };
  var ALIAS = { "LOCAL-9SJ1-4JPK": "ЯID-0013-92V4" };
  var CMAP = { "А":"A","В":"B","Е":"E","К":"K","М":"M","Н":"H","О":"O","Р":"P","С":"C","Т":"T","Х":"X","У":"Y" };
  function fold(s) { return String(s == null ? "" : s).replace(/[АВЕКМНОРСТХУ]/g, function (c) { return CMAP[c]; }); }
  function latinName(name) {
    var f = fold(name).trim().toUpperCase();
    for (var rid in SEATS) for (var i = 0; i < SEATS[rid].length; i++) if (fold(SEATS[rid][i]).toUpperCase() === f) return SEATS[rid][0];
    return fold(name);
  }
  function ridFor(name) {
    var f = fold(name).trim().toUpperCase();
    for (var rid in SEATS) for (var i = 0; i < SEATS[rid].length; i++) if (fold(SEATS[rid][i]).toUpperCase() === f) return rid;
    return ALIAS[String(name).trim()] || null;
  }
  var CYR_SEAT = /Я[А-ЯA-Z]*[АВЕКМНОРСТХУ][А-ЯA-Z]*/g;
  var FIG_SEL = "thundr-live, .thundr-figure";
  var lines = [], applied = {}, cfgNow = DEF;
  function log(id, msg) {
    var l = "RZL-REPAIR " + id + ": " + msg; lines.push(l); if (lines.length > 20) lines.shift();
    try { root.console && root.console.log(l); } catch (e) {}
    api.status = lines.slice(-3).join(" · ");
    try { if (typeof root.RL_THUNDR_SAY === "function") root.RL_THUNDR_SAY(api.status); } catch (e) {}
  }
  function appId() {
    if (root.RZL_APP) return root.RZL_APP;
    var t = (doc && doc.title || "") + " " + (root.location && root.location.href || "");
    if (/TEST/i.test(t)) return "rbowzr-test";
    return /rbowzr|ЯBOWZR/i.test(t) ? "rbowzr" : "ybot";
  }
  function enabled(r, app) {
    if (!r) return false;
    if (r.target && r.target !== "all" && r.target !== app && r.target !== "*") return false;
    var on = r.on || {}; return app in on ? !!on[app] : !!on["*"];
  }
  function cfgFor(id) { var l = (cfgNow && cfgNow.repairs) || DEF.repairs; for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
  // never touch editable text, ЯSCRIBE or BOTABLETA (their Cyrillic stamps are data, not labels)
  var PROTECT = /rscribe|яscribe|botableta/i;
  function protectedEl(el) {
    for (var p = el; p && p.nodeType === 1; p = p.parentNode) {
      var ce = p.getAttribute && p.getAttribute("contenteditable");
      if (ce != null && ce !== "false") return true;
      if (p.isContentEditable === true) return true;
      if (/^(INPUT|TEXTAREA|SCRIPT|STYLE)$/.test(p.tagName)) return true;
      var tag = (p.id || "") + " " + ((p.getAttribute && p.getAttribute("class")) || "") + " " + ((p.getAttribute && p.getAttribute("data-skill")) || "") + " " + (p.tagName || "");
      if (PROTECT.test(tag)) return true;
    }
    return false;
  }
  function textNodes(el, fn) {
    if (!el || !doc.createTreeWalker) return;
    var w = doc.createTreeWalker(el, 4, null), t;
    while ((t = w.nextNode())) { if (t.parentNode && protectedEl(t.parentNode)) continue; fn(t); }
  }
  function nameScopes() { return doc.querySelectorAll("#chatlist, #thread-head"); }
  var FIX = {
    "latin-names-by-rid": function () {
      var n = 0, scopes = nameScopes();
      for (var i = 0; i < scopes.length; i++) {
        if (protectedEl(scopes[i])) continue;
        textNodes(scopes[i], function (t) { var v = t.nodeValue, w = v.replace(CYR_SEAT, function (m) { return ridFor(m) ? latinName(m) : m; }); if (w !== v) { t.nodeValue = w; n++; } });
      }
      root.RZL_LATIN = latinName; root.RZL_RID_FOR = ridFor;
      return n ? n + " name(s) to Latin" : null;
    },
    "rbat-row-0013": function () {
      var n = 0, rows = doc.querySelectorAll("#chatlist .cl-row, [data-rid='ЯID-0013-92V4'], [data-id='LOCAL-9SJ1-4JPK']");
      for (var i = 0; i < rows.length; i++) {
        var el = rows[i]; if (protectedEl(el)) continue;
        var tag = (el.getAttribute("aria-label") || "") + " " + (el.getAttribute("data-rid") || "") + " " + (el.getAttribute("data-id") || "") + " " + el.textContent;
        if (!/LOCAL-9SJ1-4JPK|ЯID-0013-92V4|0013-92V4/.test(tag)) continue;
        textNodes(el, function (t) {
          var w = t.nodeValue.replace(/^(\s*)(ЯBOT|ЯВОТ)(\s+LOCAL)?(\s*)$/, "$1ЯBAT$4").replace(/LOCAL-9SJ1-4JPK/g, "ЯID-0013-92V4");
          if (w !== t.nodeValue) { t.nodeValue = w; n++; } });
        var a = el.getAttribute("aria-label");
        // only the seat name (+ the LOCAL tag right after it) and the LOCAL id change; other text, Cyrillic included, stays
        if (a) { var b = a.replace(/^(\s*)(ЯBOT|ЯВОТ)(\s+LOCAL)?(?=\s|$)/, "$1ЯBAT").replace(/LOCAL-9SJ1-4JPK/g, "ЯID-0013-92V4"); if (b !== a) { el.setAttribute("aria-label", b); n++; } }
      }
      return n ? "0013 row → ЯBAT" : null;
    },
    "thundr-one-unboxed": function () {
      var msg = [];
      var Z = "background:none!important;background-color:transparent!important;background-image:none!important;border:0!important;box-shadow:none!important;outline:0!important;filter:none!important;-webkit-filter:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;padding:0!important;border-radius:0!important";
      var CSS = "#thundr-pin,#thundr-pin *,thundr-live,thundr-live *,.thundr-figure,.thundr-figure *,[data-rzl-unboxed]{" + Z + "}" +
        "#thundr-pin::before,#thundr-pin::after,#thundr-pin *::before,#thundr-pin *::after,thundr-live::before,thundr-live::after,thundr-live *::before,thundr-live *::after,[data-rzl-unboxed]::before,[data-rzl-unboxed]::after{content:none!important;display:none!important}";
      if (!doc.getElementById("rzl-repair-thundr-css")) {
        var s = doc.createElement("style"); s.id = "rzl-repair-thundr-css"; s.textContent = CSS;
        (doc.head || doc.documentElement).appendChild(s); msg.push("unboxed");
      }
      var figs = doc.querySelectorAll(FIG_SEL), keep = doc.querySelector("#thundr-pin thundr-live") || doc.querySelector("#thundr-pin .thundr-figure") || figs[0], gone = 0;
      function inside(a, b) { for (var p = a; p; p = p.parentNode) if (p === b) return true; return false; }
      for (var i = 0; i < figs.length; i++) if (keep && figs[i] !== keep && !inside(figs[i], keep) && figs[i].parentNode) { figs[i].parentNode.removeChild(figs[i]); gone++; }
      var pins = doc.querySelectorAll("#thundr-pin");
      for (var j = 0; j < pins.length; j++) if (keep && !inside(keep, pins[j]) && pins[j].parentNode) { pins[j].parentNode.removeChild(pins[j]); gone++; }
      if (gone) msg.push(gone + " extra THUNDR removed");
      if (keep) {
        // pure wrapper boxes (the figure is their only element child) lose any box look
        var u = 0;
        for (var w = keep.parentNode; w && w.nodeType === 1 && w !== doc.body && w !== doc.documentElement; w = w.parentNode) {
          var kids = 0; for (var k = 0; k < w.childNodes.length; k++) if (w.childNodes[k].nodeType === 1 && w.childNodes[k].tagName !== "STYLE") kids++;
          if (kids !== 1) break;
          if (w.getAttribute("data-rzl-unboxed") == null) { w.setAttribute("data-rzl-unboxed", "1"); u++; }
        }
        if (keep.shadowRoot && !keep.shadowRoot.getElementById("rzl-repair-thundr-sr")) {
          var ss = doc.createElement("style"); ss.id = "rzl-repair-thundr-sr";
          ss.textContent = ":host,:host *,*{" + Z + "}:host::before,:host::after,*::before,*::after{content:none!important;display:none!important}";
          keep.shadowRoot.appendChild(ss); u++;
        }
        if (u) msg.push(u + " wrapper/internal box(es) cleared");
      }
      return msg.length ? msg.join(", ") : null;
    },
    "chatlist-runtime-219": function () {
      var list = doc.querySelector("#chatlist"); if (!list) return null;
      var r = [];
      if (enabled(cfgFor("latin-names-by-rid"), appId())) r.push(FIX["latin-names-by-rid"]());
      if (enabled(cfgFor("rbat-row-0013"), appId())) r.push(FIX["rbat-row-0013"]());
      r = r.filter(Boolean);
      var pins = []; try { pins = JSON.parse(root.localStorage.getItem("rlab.ridlist.pinned.v1") || "[]") || []; } catch (e) {}
      if (!pins || typeof pins.length !== "number") pins = [];
      var moved = 0;
      for (var i = pins.length - 1; i >= 0; i--) {
        var row = list.querySelector(".cl-row[data-id='" + String(pins[i]).replace(/'/g, "") + "']");
        if (row && row.parentNode && row.parentNode.firstElementChild !== row) { row.parentNode.insertBefore(row, row.parentNode.firstElementChild); moved++; }
      }
      if (moved) r.push(moved + " pin(s) on top");
      if (!api._obs && root.MutationObserver) {
        api._obs = new root.MutationObserver(function () {
          if (api._t) return;                      // debounce: one pass per burst of renders
          api._t = root.setTimeout(function () {
            api._t = null; api.scans = (api.scans || 0) + 1;
            if (!enabled(cfgFor("chatlist-runtime-219"), appId())) { try { api._obs.disconnect(); } catch (e) {} api._obs = null; return; }
            runIds(["chatlist-runtime-219"]);      // goes through enabled(); scoped to #chatlist/#thread-head
          }, 120);
        });
        api._obs.observe(list, { childList: true, subtree: true, characterData: true }); r.push("watching");
      }
      return r.length ? r.join(", ") : null;
    },
    "botableta-seed-script": function () {
      if (root.RL_BOTABLETA_SEED || !root.location || root.location.protocol !== "file:") return null;
      if (doc.getElementById("rzl-botableta-seed")) return null;
      var s = doc.createElement("script"); s.id = "rzl-botableta-seed";
      s.src = (root.RZL_SEED_SRC || "skills/superdragon/botableta-seed.js");
      s.onload = function () { log("botableta-seed-script", root.RL_BOTABLETA_SEED ? "seed rev " + root.RL_BOTABLETA_SEED.rev + " loaded" : "script loaded, no seed"); };
      s.onerror = function () { log("botableta-seed-script", "seed script missing"); };
      (doc.head || doc.documentElement).appendChild(s);
      return "file:// → script-tag seed";
    }
  };
  function runOne(r, app, out) {
    var f = FIX[r.id]; if (!f) return;
    if (!enabled(r, app)) { out[r.id] = "off"; return; }
    try { var m = f(); out[r.id] = m || "ok"; if (m && applied[r.id] !== m) log(r.id, m); applied[r.id] = m || applied[r.id]; }
    catch (e) { out[r.id] = "error"; log(r.id, "error " + (e && e.message)); }
  }
  function runIds(ids) { var app = appId(), out = {}; for (var i = 0; i < ids.length; i++) { var r = cfgFor(ids[i]); if (r) runOne(r, app, out); } return out; }
  function run(cfg) {
    var app = appId(), list = (cfg && cfg.repairs) || cfgNow.repairs || DEF.repairs, out = {};
    for (var i = 0; i < list.length; i++) runOne(list[i], app, out);
    api.last = out; return out;
  }
  var api = root.RZL_REPAIR = { loaded: true, version: V, status: "", run: run, fold: fold, latinName: latinName, ridFor: ridFor, lines: lines, FIX: FIX, enabled: enabled, scans: 0 };
  function start() {
    var c = root.RZL_REPAIRS; cfgNow = (c && c.repairs && typeof c.repairs.length === "number") ? c : DEF;
    run(cfgNow);
    if (!lines.length) log("all", "nothing to repair");
  }
  if (doc && doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", start); else if (doc) start();
})(typeof window !== "undefined" ? window : this);

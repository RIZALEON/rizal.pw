/* Minimal jsdom-free test: tiny fake DOM, runs rzl-repair.js twice (idempotency). node test/rzl-repair.test.js */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
class Node_ { constructor(t) { this.nodeType = t; this.parentNode = null; this.childNodes = []; } }
class Text extends Node_ { constructor(v) { super(3); this.nodeValue = v; } get textContent() { return this.nodeValue; } }
class El extends Node_ {
  constructor(tag, attrs = {}) { super(1); this.tagName = tag.toUpperCase(); this.attrs = { ...attrs }; }
  get id() { return this.attrs.id || ""; } set id(v) { this.attrs.id = v; }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; } setAttribute(k, v) { this.attrs[k] = String(v); }
  appendChild(c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.childNodes.push(c); return c; }
  removeChild(c) { this.childNodes.splice(this.childNodes.indexOf(c), 1); c.parentNode = null; return c; }
  insertBefore(c, ref) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; const i = this.childNodes.indexOf(ref); this.childNodes.splice(i < 0 ? this.childNodes.length : i, 0, c); return c; }
  get firstElementChild() { return this.childNodes.find((c) => c.nodeType === 1) || null; }
  get textContent() { return this.childNodes.map((c) => c.textContent).join(""); } set textContent(v) { this.childNodes = []; this.appendChild(new Text(v)); }
  all() { const o = []; (function w(n) { for (const c of n.childNodes) if (c.nodeType === 1) { o.push(c); w(c); } })(this); return o; }
  querySelectorAll(sel) { const res = new Set(); for (const s of sel.split(",")) this.all().filter((e) => match(e, s.trim(), this)).forEach((e) => res.add(e)); return [...res]; }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
}
function simple(e, s) {
  const re = /([#.]?[\w-]+)|\[([\w-]+)='([^']*)'\]/g; let m, any = false;
  while ((m = re.exec(s))) { any = true;
    if (m[2]) { if (e.getAttribute(m[2]) !== m[3]) return false; }
    else if (m[1][0] === "#") { if (e.id !== m[1].slice(1)) return false; }
    else if (m[1][0] === ".") { if (!(e.getAttribute("class") || "").split(/\s+/).includes(m[1].slice(1))) return false; }
    else if (e.tagName !== m[1].toUpperCase()) return false; }
  return any;
}
function match(e, sel, top) { const parts = sel.split(/\s+/); if (!simple(e, parts.pop())) return false;
  let p = e.parentNode; while (parts.length) { while (p && p !== top.parentNode && !(p.nodeType === 1 && simple(p, parts[parts.length - 1]))) p = p.parentNode; if (!p) return false; parts.pop(); p = p.parentNode; } return true; }
function makeDoc() {
  const html = new El("html"), head = html.appendChild(new El("head")), body = html.appendChild(new El("body"));
  const doc = { documentElement: html, head, body, title: "ЯBOWZR TEST", readyState: "complete",
    createElement: (t) => new El(t), getElementById: (id) => html.querySelector("#" + id),
    querySelector: (s) => html.querySelector(s), querySelectorAll: (s) => html.querySelectorAll(s),
    createTreeWalker(rootEl) { const ts = []; (function w(n) { for (const c of n.childNodes) c.nodeType === 3 ? ts.push(c) : w(c); })(rootEl); let i = 0; return { nextNode: () => ts[i++] || null }; } };
  return doc;
}
const doc = makeDoc(), logs = [], store = { "rlab.ridlist.pinned.v1": JSON.stringify(["0003-P4M6"]) };
const list = doc.body.appendChild(new El("div", { id: "chatlist" }));
const row = (id, label, name) => { const r = list.appendChild(new El("div", { class: "cl-row", "data-id": id, "aria-label": label })); r.appendChild(new El("span")).appendChild(new Text(name)); return r; };
row("0002-PQ2Q", "ЯВОТ ЯID-0002-PQ2Q", "ЯВОТ");
const bat = row("LOCAL-9SJ1-4JPK", "ЯBOT LOCAL LOCAL-9SJ1-4JPK", "ЯBOT LOCAL");
const max = row("0003-P4M6", "ЯМАХ", "ЯМАХ");
const pin = doc.body.appendChild(new El("div", { id: "thundr-pin" })); pin.appendChild(new El("thundr-live"));
doc.body.appendChild(new El("div", { id: "composer" })).appendChild(new El("thundr-live"));
doc.body.appendChild(new El("div", { id: "thundr-pin" }));
const head = doc.body.appendChild(new El("div", { id: "thread-head" })); head.appendChild(new Text("ЯМАХ"));
const ed = list.appendChild(new El("div", { contenteditable: "true" })); ed.appendChild(new Text("ЯВОТ stamp ЯМАХ"));
const rsc = doc.body.appendChild(new El("div", { id: "rscribe-panel" })); const rscNote = rsc.appendChild(new El("div", { class: "rs-note" })); rscNote.appendChild(new Text("ЯВОТ ЯID-0002-PQ2Q · ЯМАХ"));
const bta = doc.body.appendChild(new El("section", { class: "botableta" })); bta.appendChild(new Text("BOTABLETA ЯВОТ ЯМАХ stamp"));
const loose = doc.body.appendChild(new El("p")); loose.appendChild(new Text("ЯВОТ loose body text"));
const bat2 = list.appendChild(new El("div", { class: "cl-row", "data-id": "LOCAL-9SJ1-4JPK", "aria-label": "ЯВОТ LOCAL LOCAL-9SJ1-4JPK · Привет ЯМАХ" }));
const wrap = doc.body.appendChild(new El("div", { class: "thundr-wrap" })); wrap.appendChild(new El("thundr-live"));
doc.body.appendChild(new El("div", { class: "thundr-figure" }));
let seedTag = null; const head0 = doc.head.appendChild.bind(doc.head);
doc.head.appendChild = (c) => { if (c.id === "rzl-botableta-seed") seedTag = c; return head0(c); };
const timers = []; const flush = () => { while (timers.length) timers.shift()(); };
const observers = []; class MO { constructor(cb) { this.cb = cb; observers.push(this); } observe(t) { this.target = t; } disconnect() { this.off = true; } }
const fire = (n) => { for (let i = 0; i < n; i++) observers.forEach((o) => !o.off && o.cb([])); };
const win = { document: doc, MutationObserver: MO, console: { log: (l) => logs.push(l) }, location: { protocol: "file:", href: "file:///x/scout.html" },
  localStorage: { getItem: (k) => store[k] || null }, setTimeout: (f) => { timers.push(f); return timers.length; }, RL_THUNDR_SAY: (s) => { win.said = s; } };
const src = fs.readFileSync(path.join(__dirname, "..", "rzl-repair.js"), "utf8");
const ctx = vm.createContext(win); vm.runInContext(src, ctx); vm.runInContext(src, ctx); // loaded twice → still one instance
flush(); const R = win.RZL_REPAIR;
let pass = 0; const t = (name, fn) => { fn(); pass++; console.log("ok -", name); };
t("(a) Cyrillic + Latin map to the same seat", () => { assert.strictEqual(R.latinName("ЯВОТ"), "ЯBOT"); assert.strictEqual(R.ridFor("ЯВОТ"), R.ridFor("ЯBOT")); assert.strictEqual(R.ridFor("ЯМАХ"), "ЯID-0003-P4M6"); assert.strictEqual(list.querySelector("[data-id='0002-PQ2Q']").textContent, "ЯBOT"); assert.strictEqual(max.textContent, "ЯMAX"); });
t("(b) 0013 / LOCAL-9SJ1-4JPK row reads ЯBAT", () => { assert.strictEqual(bat.textContent, "ЯBAT"); assert.ok(/^ЯBAT/.test(bat.getAttribute("aria-label"))); assert.ok(!/LOCAL-9SJ1/.test(bat.getAttribute("aria-label"))); });
t("(c) one THUNDR, unboxed", () => { assert.strictEqual(doc.querySelectorAll("thundr-live").length, 1); assert.strictEqual(doc.querySelectorAll("#thundr-pin").length, 1); assert.ok(doc.getElementById("rzl-repair-thundr-css")); assert.strictEqual(doc.querySelectorAll("style").length, 1); });
t("(c2) exactly one THUNDR figure on screen (thundr-live + .thundr-figure), inside the pin", () => { const f = doc.querySelectorAll("thundr-live, .thundr-figure"); assert.strictEqual(f.length, 1); assert.strictEqual(f[0].parentNode.id, "thundr-pin"); });
t("(c3) unbox CSS clears filter/drop-shadow, padding, ::before/::after, wrappers, internals", () => { const c = doc.getElementById("rzl-repair-thundr-css").textContent; for (const k of ["filter:none", "-webkit-filter:none", "box-shadow:none", "padding:0", "background:none", "::before", "::after", "content:none", "thundr-live *", "[data-rzl-unboxed]"]) assert.ok(c.includes(k), k); assert.strictEqual(pin.getAttribute("data-rzl-unboxed"), "1"); });
t("(f) Cyrillic stamps untouched: contenteditable, ЯSCRIBE, BOTABLETA, body", () => { assert.strictEqual(ed.textContent, "ЯВОТ stamp ЯМАХ"); assert.strictEqual(rscNote.textContent, "ЯВОТ ЯID-0002-PQ2Q · ЯМАХ"); assert.strictEqual(bta.textContent, "BOTABLETA ЯВОТ ЯМАХ stamp"); assert.strictEqual(loose.textContent, "ЯВОТ loose body text"); assert.strictEqual(head.textContent, "ЯMAX"); });
t("(g) ЯBAT relabel changes only the seat name in aria-label", () => { assert.strictEqual(bat2.getAttribute("aria-label"), "ЯBAT ЯID-0013-92V4 · Привет ЯМАХ"); });
t("(h) render storm: 500 renders → one debounced, scoped pass, no loop", () => { const s0 = R.scans; fire(500); assert.strictEqual(timers.length, 1); flush(); assert.strictEqual(R.scans - s0, 1); fire(3); flush(); assert.strictEqual(timers.length, 0); assert.strictEqual(R.scans - s0, 2); assert.strictEqual(observers.length, 1); assert.strictEqual(observers[0].target.id, "chatlist"); assert.strictEqual(loose.textContent, "ЯВОТ loose body text"); });
t("(i) observer honours enabled(): chat-list off → disconnects, no fix", () => { win.RZL_APP = "ybot"; const row9 = list.appendChild(new El("div", { class: "cl-row", "data-id": "x" })); row9.appendChild(new Text("ЯМАХ")); fire(1); flush(); assert.strictEqual(row9.textContent, "ЯМАХ"); assert.ok(observers[0].off); delete win.RZL_APP; list.removeChild(row9); R.run(); flush(); assert.ok(R._obs && observers.length === 2); });
t("(d) chat-list fixes re-applied at runtime, pins on top", () => { assert.strictEqual(list.firstElementChild, max); assert.strictEqual(R.last["chatlist-runtime-219"] !== "off", true); });
t("(e) file:// with no seed → script tag", () => { assert.ok(seedTag && /botableta-seed\.js$/.test(seedTag.src)); assert.strictEqual(doc.querySelectorAll("script").length, 1); });
t("idempotent re-run changes nothing", () => { const before = list.textContent + doc.querySelectorAll("*").length; const n = logs.length; R.run(); assert.strictEqual(list.textContent + doc.querySelectorAll("*").length, before); assert.strictEqual(logs.length, n); });
t("per-app off flag respected", () => { const o = R.run({ repairs: [{ id: "rbat-row-0013", on: { "*": true, "rbowzr-test": false } }, { id: "chatlist-runtime-219", target: "ybot", on: { "*": true } }] }); assert.strictEqual(o["rbat-row-0013"], "off"); assert.strictEqual(o["chatlist-runtime-219"], "off"); });
t("status is bare text for THUNDR + console log", () => { assert.ok(typeof R.status === "string" && R.status.length && !/[<>]/.test(R.status)); assert.strictEqual(win.said, R.status); assert.ok(logs.every((l) => l.startsWith("RZL-REPAIR "))); });
t("repairs.json valid and ids match code", () => { const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "repairs.json"), "utf8")); for (const r of j.repairs) { assert.ok(R.FIX[r.id], r.id); assert.ok(r.target && r.guard && r.on); } });
t("no network / tokens in source", () => { assert.ok(!/fetch\(|XMLHttpRequest|WebSocket|Authorization|Bearer|https?:\/\//.test(src)); });
console.log(`\n${pass} passed · console lines:\n  ` + logs.join("\n  "));

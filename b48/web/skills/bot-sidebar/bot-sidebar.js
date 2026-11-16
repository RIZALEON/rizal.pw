/* bot-sidebar.js · FOLDING BOT SIDEBAR 2.1.9.1-pub · public overlay
 * UNSIGNED · egg-only · no network · deletes nothing. Modeled on ЯSCRIBE's native sidebar (RScribe-0.2.swift):
 *   fold key "rscribe.sidebarFolded" pattern -> localStorage "rlab.botsidebar.folded"; open width min(260, max(170, 28% window));
 *   0.22 s ease-in-out; when folded the unfold control sits in the rail in orange.
 * Folded = slim rail of round bot pictures (picture bots only, by ЯID), rounded-square highlight on the open bot, THUNDR status dots,
 * plus button at the bottom unfolds the panel with the test bar. Unfolded = number · name · ЯID rows + test bar + scorecard.
 * ONE bot window: threads open only through the existing chat list (same pane). window.open and any native "open window" style
 * command on rosSystem/rosBotPack are refused while this piece is loaded. In flow (never fixed/absolute): cannot cover the top bar
 * or the address/command field at any size. Order follows the live chat list, so newest-first + pins are kept. */
(function () {
  "use strict";
  if (window.RL_BOTSIDEBAR) return;
  const KEY = "rlab.botsidebar.folded", CARD_KEY = "rlab.botsidebar.scorecards.v1";
  // public: seats come from the device roster at runtime (rows/slots with a picture number n); nothing baked in
  const RROWS = () => { const L = window.ROS_RID_LIST || {}; return (L.rows || []).concat(L.slots || []).filter((r) => r && r.rid); };
  const PICS = () => { const o = {}; RROWS().forEach((r) => { if (r.n != null) o[r.rid] = r.n; }); return o; };
  const FALLBACK = {};
  const ALIAS = {};
  const SELF = () => { try { if (window.ROS_SELF_TAG) return String(window.ROS_SELF_TAG); const sl = RROWS().find((r) => r.slot === "self"); if (sl) return `${sl.rid} · ${sl.name || "local bot"}`; } catch (e) {} return "local bot"; };
  const GENERAL = () => { const r = RROWS().find((x) => x.general) || RROWS()[0]; return r ? { name: r.rosterName || r.name, rid: r.rid } : { name: "local bot", rid: "—" }; };
  const MANUAL = { rid: "ЯBOT-macOS-general", name: "ЯBOT macOS general chat" };
  const ORANGE = "#e85d2a", BLUE = "#3b82f6", RED = "#ef4444";
  const $ = (s, r) => (r || document).querySelector(s);
  const mk = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const canon = (r) => { const A = Object.assign({}, ALIAS, window.ROS_RID_ALIAS || {}); return String(A[r] || r || ""); };
  function nameOf(rid) {
    try { const row = RROWS().find((x) => x && x.rid === rid); if (row) return row.rosterName || row.name; } catch (e) {}
    return FALLBACK[rid] || rid;
  }
  // ---- single-window guard ----
  const BLOCK = /(^|[-_ ])(new|open|spawn)[-_ ]?(bot[-_ ]?)?window\b|open-bot|window-new/i, refused = [];
  function guard() {
    if (window.__rlSingleWin) return; window.__rlSingleWin = 1;
    window.open = function (u) { refused.push({ via: "window.open", what: String(u || "") }); status("refused: a second bot window is not allowed · one window only"); return null; };
    try { const H = (window.webkit || {}).messageHandlers || {};
      ["rosSystem", "rosBotPack"].forEach((k) => { const h = H[k]; if (!h || h.__rlsw) return; const pm = h.postMessage.bind(h);
        h.postMessage = function (m) { const c = String((m && (m.command || m.cmd)) || ""); if (BLOCK.test(c)) { refused.push({ via: k, what: c }); status("refused: a second bot window is not allowed · one window only"); return Promise.resolve({ text: "refused: one bot window only" }); } return pm(m); };
        h.__rlsw = 1; }); } catch (e) {}
  }
  // ---- bots from the live chat list (keeps newest-first + pins order) ----
  function bots() {
    const out = [], seen = {};
    document.querySelectorAll("#chatlist .cl-row, .cl-row").forEach((li) => {
      const m = /(ЯID-\d{4}-[0-9A-Z]{4}|LOCAL-[0-9A-Z]{4}-[0-9A-Z]{4})\s*$/.exec(li.getAttribute("aria-label") || ""); if (!m) return;
      const rid = canon(m[1]); const P = PICS(); if (!(rid in P) || seen[rid]) return;
      const img = li.querySelector("img"); const src = img && img.getAttribute("src");
      if (!src || /^data:image\/svg/i.test(src)) return;                 // pictures only
      seen[rid] = 1; out.push({ rid, n: P[rid], name: nameOf(rid), src, li, pinned: li.classList.contains("pinned") });
    });
    return out;
  }
  // ---- UI ----
  let root, rail, panel, qIn, stLine, cardBox, dots = {}, sel = "", busy = false, last = null;
  const folded = () => { try { return localStorage.getItem(KEY) !== "0"; } catch (e) { return true; } };
  function setFolded(f) { try { localStorage.setItem(KEY, f ? "1" : "0"); } catch (e) {} paint(); status(f ? "closed · open with the orange ＋" : "open"); }
  function status(t) { if (stLine) stLine.textContent = t; }
  function css() {
    if ($("#rbs-css")) return; const s = mk("style"); s.id = "rbs-css";
    s.textContent = `#rbs{position:sticky;top:0;align-self:stretch;height:100vh;display:flex;flex:0 0 auto;background:#0b0b0c;border-right:1px solid #222;transition:width .22s ease-in-out;overflow:hidden;z-index:1;font:13px system-ui,sans-serif;color:#ddd}
#rbs .rail{width:56px;display:flex;flex-direction:column;align-items:center;gap:8px;padding:10px 0;flex:0 0 56px}
#rbs .pic{position:relative;width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:none;border:0;padding:0;cursor:pointer}
#rbs .pic.sel{background:#2a2a2e}#rbs .pic img{width:34px;height:34px;border-radius:50%;object-fit:cover}
#rbs .dot{position:absolute;right:4px;bottom:4px;width:9px;height:9px;border-radius:50%;border:2px solid #0b0b0c;display:none}
#rbs .plus{margin-top:auto;width:34px;height:34px;border-radius:50%;border:1px solid #333;background:#161616;color:#ddd;font-size:18px;cursor:pointer}
#rbs .plus.unfold{color:${ORANGE};border-color:${ORANGE}}
#rbs .panel{flex:1;min-width:0;display:flex;flex-direction:column;gap:8px;padding:10px;overflow:auto}
#rbs .hd{display:flex;align-items:center;gap:6px}#rbs .hd b{color:${ORANGE};letter-spacing:.14em}#rbs .hd button{margin-left:auto;background:none;border:0;color:#999;cursor:pointer}
#rbs .row{display:flex;gap:6px;align-items:center;background:none;border:0;color:inherit;text-align:left;padding:4px;border-radius:8px;cursor:pointer}
#rbs .row.sel{background:#2a2a2e}#rbs .row small{color:#888}
#rbs input,#rbs textarea{width:100%;box-sizing:border-box;background:#161616;color:#eee;border:1px solid #333;border-radius:6px;padding:5px}
#rbs .st{color:#bbb;white-space:pre-wrap}#rbs table{width:100%;border-collapse:collapse;font-size:12px}#rbs td{border-top:1px solid #222;padding:2px 3px;vertical-align:top}
#rbs .PASS{color:#4ade80}#rbs .FAIL{color:${RED}}#rbs .SKIP{color:#888}
/* DRAGON SKULL: no side strip. The rail is gone; the panel is a drawer opened by the orange + at the bottom of the BOTS column. */
#rbs{position:fixed!important;top:0;left:0;bottom:0;height:auto!important;transform:translateX(-100%);transition:transform .22s ease-in-out;z-index:45;padding-top:env(safe-area-inset-top);border-right:1px solid #222}
#rbs.open{transform:none;box-shadow:0 0 0 100vmax rgba(0,0,0,.5)}
#rbs .rail{display:none!important}
#composer #rbs-plus{align-self:center;margin-top:0;padding:0!important;display:flex;align-items:center;justify-content:center}#roster{display:flex;flex-direction:column;box-sizing:border-box}#rbs-plus{margin-top:auto;align-self:flex-start;margin-right:6px;display:flex;align-items:center;justify-content:center;flex:0 0 auto;width:30px;height:30px;border-radius:50%;border:1px solid ${ORANGE};background:#161616;color:${ORANGE};font-size:17px;line-height:1;padding:0;cursor:pointer}`;
    document.head.append(s);
  }
  function mount() {
    if (root && root.isConnected) return true; if (!document.body) return false;
    css(); guard();
    root = mk("aside"); root.id = "rbs"; root.setAttribute("aria-label", "Bot sidebar");
    rail = mk("div", "rail"); panel = mk("div", "panel"); root.append(rail, panel);
    const main = $("main"); main && main.parentNode === document.body ? document.body.insertBefore(root, main) : document.body.prepend(root);
    paint(); return true;
  }
  function paint() {
    if (!root) return; const B = bots(), f = folded();
    root.style.width = `${Math.min(300, Math.max(220, Math.round(window.innerWidth * 0.8)))}px`; root.classList.toggle("open", !f); topPlus(f);
    rail.textContent = ""; dots = {};
    B.forEach((b) => { const p = mk("button", "pic" + (b.rid === sel ? " sel" : "")); p.type = "button"; p.title = `${b.n} · ${b.name} · ${b.rid}`; p.dataset.rid = b.rid;
      const im = mk("img"); im.src = b.src; im.alt = b.name; const d = mk("span", "dot"); dots[b.rid] = d; p.append(im, d);
      p.addEventListener("click", () => onPic(b.rid)); rail.append(p); });
    panel.hidden = f; panel.textContent = "";
    const hd = mk("div", "hd"); hd.append(mk("b", "", "BOTS"), mk("small", "", "TEST")); const fb = mk("button", "", "⟨⟩"); fb.title = "Fold sidebar"; fb.addEventListener("click", () => setFolded(true)); hd.append(fb); panel.append(hd);
    B.forEach((b) => { const r = mk("button", "row" + (b.rid === sel ? " sel" : "")); r.type = "button"; r.dataset.rid = b.rid;
      r.append(mk("span", "", String(b.n)), mk("span", "", (b.pinned ? "📌 " : "") + b.name), mk("small", "", b.rid)); r.addEventListener("click", () => openBot(b.rid)); panel.append(r); });
    qIn = mk("input"); qIn.placeholder = "Q2. your numbered question"; qIn.value = (last && last.q) || ""; panel.append(qIn);
    const all = mk("button", "", "Ask all"); all.type = "button"; all.addEventListener("click", () => askAll(qIn.value)); panel.append(all);
    stLine = mk("div", "st", busy ? stLine && stLine.textContent : "ready"); stLine.setAttribute("role", "status"); panel.append(stLine);
    cardBox = mk("div"); panel.append(cardBox); drawCard();
  }
  // DRAGON SKULL: the orange + sits at the bottom left of the BOTS column (#roster); no separate strip
  function f0() { return folded(); }
  function topPlus(f) {
    // phones (ds-mobile layout): the BOTS column is a hidden drawer, so the + sits at the left end of the bottom message bar instead
    const phone = !!$('link[href*="ds-mobile"]'), r = phone ? $("#composer") : $("#roster"); if (!r) return; let b = $("#rbs-plus");
    if (!b) { b = mk("button", "", "＋"); b.id = "rbs-plus"; b.type = "button"; b.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); if (f0() && window.DS_ADD_FILE) return window.DS_ADD_FILE(); setFolded(!folded()); }); b.addEventListener("contextmenu", (e) => { e.preventDefault(); e.stopPropagation(); setFolded(!folded()); }); } /* DS-UP-01: + = Add photo or file; right-click = bots drawer */
    if (phone) { if (r.firstElementChild !== b) r.prepend(b); } else if (b.parentNode !== r || r.lastElementChild !== b) r.append(b);
    b.textContent = f ? "＋" : "‹"; b.title = f ? "Add photo or file (right-click: bots)" : "Close"; b.setAttribute("aria-label", b.title);
  }
  document.addEventListener("click", (e) => { if (root && !folded() && !e.target.closest("#rbs") && !e.target.closest("#rbs-plus")) setFolded(true); });
  // THUNDR adapter -> status dots
  document.addEventListener("thundr-adapter", (e) => { const d = e.detail || {}, rid = canon(d.bot), el = dots[rid]; if (!el) return;
    const c = /^(working|thinking|searching)$/.test(d.state) ? BLUE : d.state === "error" ? RED : ""; el.style.display = c ? "block" : "none"; el.style.background = c; });
  // ---- one window: open = click the existing chat-list row ----
  function openBot(rid) {
    const b = bots().find((x) => x.rid === rid); if (!b) { status(`${rid}: not in the chat list`); return false; }
    b.li.click(); sel = rid; paint(); return true;
  }
  function onPic(rid) { const q = qIn && qIn.value.trim(); if (!folded() && q && !busy) return askAll(q, [rid]); openBot(rid); }
  // ---- asking ----
  let lastBot = null;
  function tapTurns() { if (typeof window.pushTurn === "function" && !window.pushTurn.__rbs) { const p = window.pushTurn; window.pushTurn = function (role, text) { if (role === "bot") lastBot = String(text || ""); return p.apply(this, arguments); }; window.pushTurn.__rbs = 1; } }
  const fold = (x) => String(x || "").normalize("NFC").replace(/[АВЕКМНОРСТУХаеорсухкмтвн]/g, (c) => ({ "А": "A", "В": "B", "Е": "E", "К": "K", "М": "M", "Н": "H", "О": "O", "Р": "P", "С": "C", "Т": "T", "У": "Y", "Х": "X", "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "у": "y", "х": "x", "к": "k", "м": "m", "т": "t", "в": "b", "н": "h" })[c]).replace(/Я/g, "R").replace(/я/g, "r").toUpperCase();
  function grade(b, reply) {
    const r = String(reply || ""), nl = r.lastIndexOf("\n("), foot = nl >= 0 ? r.slice(nl + 2).replace(/\)\s*$/, "") : "", body = nl >= 0 ? r.slice(0, nl) : r;
    if (!body.trim()) return { res: "FAIL", why: "no reply" };
    if (/^app identity/i.test(foot)) return { res: "FAIL", why: "app fallback line" };
    if (/Heart · no answer|Heart restarting/i.test(r)) return { res: "FAIL", why: "Heart gave no answer" };
    const F = fold(body), okN = F.includes(fold(b.name)), okR = F.includes(fold(b.rid));
    return okN && okR ? { res: "PASS", why: foot || "name + ЯID" } : { res: "FAIL", why: `${okN ? "" : "name missing "}${okR ? "" : "ЯID missing"}`.trim() };
  }
  async function askAll(raw, only) {
    const q = String(raw || "").trim(), m = /^Q(\d+)\.\s*\S/i.exec(q);
    if (!m) { status("type a numbered question first, e.g. “Q2. …”"); return null; }
    if (busy) { status("a round is already running"); return null; }
    if (typeof window.ROS_SEND !== "function") { status("can't send: the chat page isn't ready"); return null; }
    busy = true; tapTurns(); const B = bots(), want = only ? B.filter((b) => only.includes(b.rid)) : B;
    const card = { q, n: +m[1], at: new Date(), rows: [], asked: [], skipped: [] };
    Object.keys(PICS()).forEach((rid) => { if (!want.find((b) => b.rid === rid)) card.skipped.push(`${nameOf(rid)} ${rid}${B.find((b) => b.rid === rid) ? " (not selected)" : " (no picture row)"}`); });
    for (let i = 0; i < want.length; i++) {
      const b = want[i]; status(`[${"■".repeat(i)}${"□".repeat(want.length - i)}] Q${card.n} · asking ${b.name} (${i + 1}/${want.length})…`);
      if (!openBot(b.rid)) { card.skipped.push(`${b.name} ${b.rid} (could not open)`); continue; }
      lastBot = null; card.asked.push(b.name);
      try { await window.ROS_SEND(q); } catch (e) { lastBot = ""; }
      const g = grade(b, lastBot); card.rows.push({ n: b.n, name: b.name, rid: b.rid, reply: String(lastBot || "").slice(0, 300), ...g });
      last = card; drawCard();
    }
    card.rows.push({ n: "—", name: MANUAL.name, rid: "—", reply: "", res: "MANUAL", why: "asked by hand (native)" });
    busy = false; last = card; save(card); paint();
    const p = card.rows.filter((r) => r.res === "PASS").length; status(`[${"■".repeat(want.length)}] Q${card.n} done · ${p}/${want.length} PASS · ЯBOT macOS general chat: paste its reply below`);
    return card;
  }
  function stampMT(d) { const f = (o) => d.toLocaleString("en-CA", Object.assign({ timeZone: "America/Denver", hour12: false }, o)); return `${f({ year: "numeric", month: "2-digit", day: "2-digit" })} ${f({ hour: "2-digit", minute: "2-digit" })} MT`; }
  function toRzl(c) {
    return [`${SELF()} · ${stampMT(c.at)}`, `SCORECARD Q${c.n} · ${c.q}`, `asked: ${c.asked.join(", ") || "none"}`, `skipped: ${c.skipped.join(", ") || "none"}`,
      ...c.rows.map((r) => `${r.n} · ${r.name} · ${r.rid} · ${r.res} · ${r.why}${r.reply ? " · reply=" + JSON.stringify(r.reply) : ""}`)].join("\n") + "\n";
  }
  // Save: no confirmed native file-write handler exists for MACHINE-MIND/TESTS, so the .rzl goes to localStorage + a transcript line,
  // and to window.RL_TESTS_SAVE(name, text) if a future native/egg writer provides it. The panel offers a copy of the text.
  function save(c) {
    const name = `MACHINE-MIND/TESTS/Q${c.n}-scorecard-${stampMT(c.at).replace(" MT", "").replace(/-/g, "").replace(/:/g, "").replace(" ", "-")}.rzl`, text = toRzl(c); c.file = name; c.text = text; c.saved = "local";
    try { const a = JSON.parse(localStorage.getItem(CARD_KEY) || "[]"); a.push({ name, text }); localStorage.setItem(CARD_KEY, JSON.stringify(a)); } catch (e) {}
    try { if (typeof window.RL_TESTS_SAVE === "function") { window.RL_TESTS_SAVE(name, text); c.saved = "disk"; } } catch (e) {}
    try { const h = window.webkit.messageHandlers.rosTranscript; h && h.postMessage({ cmd: "append", role: "system", text: text.split("\n").slice(0, 2).join(" · "), bot: SELF() }); } catch (e) {}
    return name;
  }
  function drawCard() {
    if (!cardBox) return; cardBox.textContent = ""; const c = last; if (!c) return;
    cardBox.append(mk("div", "", `Q${c.n} scorecard · asked ${c.asked.length} · skipped ${c.skipped.length}`));
    const t = mk("table"); c.rows.forEach((r) => { const tr = mk("tr"); [r.n, r.name, r.rid].forEach((x) => tr.append(mk("td", "", String(x)))); tr.append(mk("td", r.res === "MANUAL" ? "SKIP" : r.res, r.res === "MANUAL" ? "asked by hand (native)" : r.res)); tr.append(mk("td", "", r.why)); t.append(tr); });
    cardBox.append(t);
    if (c.skipped.length) cardBox.append(mk("small", "", "skipped: " + c.skipped.join(", ")));
    const man = c.rows.find((r) => r.res === "MANUAL" || r.manual);
    if (man) { const ta = mk("textarea"); ta.rows = 2; ta.placeholder = "Paste ЯBOT macOS general chat reply here"; ta.value = man.reply || "";
      const gb = mk("button", "", "Grade pasted reply"); gb.type = "button";
      gb.addEventListener("click", () => { const g = grade(GENERAL(), ta.value); Object.assign(man, { reply: ta.value.slice(0, 300), res: g.res, why: "asked by hand (native) · " + g.why, manual: 1 }); save(c); drawCard(); });
      cardBox.append(ta, gb); }
    if (c.file) cardBox.append(mk("small", "", `${c.file} · saved ${c.saved === "disk" ? "to disk" : "in app storage only (native write needed)"}`));
  }
  function boot() { mount(); let n = 0; const iv = setInterval(() => { if (!busy) paint(); if (++n > 20) clearInterval(iv); }, 1000);
    try { new MutationObserver(() => { if (!busy) { clearTimeout(boot._t); boot._t = setTimeout(paint, 150); } }).observe($("#chatlist") || document.body, { childList: true, subtree: false }); } catch (e) {} }
  window.RL_BOTSIDEBAR = { version: "2.1.9.1-pub", bots, openBot, askAll, grade, setFolded, folded, refused, toRzl, get last() { return last; }, paint };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();

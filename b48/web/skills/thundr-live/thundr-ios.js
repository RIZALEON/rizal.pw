/* thundr-ios.js · ThundR 2.2.0.7 for the ЯBOT / ЯBOWZR / DRAGON SKULL iOS web layer (ios-219-superdragon 2.2.0.7). Ported from THUNDR-FLOAT (MCR) 1.2.
   STAGED hook (t38u): if the MACHINE MIND inbox/tap route fails, thundr-machine-mind-fallback.js
   captures visible chat text, redacts secrets, and hands it to RThundRHelper for the local
   ЯSCRIBE MACHINE MIND note + 15-minute read-only broadcast.
   Touch: tap = poke (wakes) · tap again fast = shocked · drag = fly (position saved) · long-press = facepalm + chat · double-tap = chat.
   Always animated (bob + blink in every state; sleep = breathing bob, snore Zzz + puff, flickering bolt). Self-heal every 30 s + on wake.
   Local only: no network calls, no wallet actions (view-only), no sends, never approves anything. */
(function () { if (window.THUNDR_IOS) return;
  if (!window.THUNDR_MM_FALLBACK) {
    var _s = document.createElement("script");
    _s.src = "skills/thundr-live/thundr-machine-mind-fallback.js?v=20261115";
    document.head.appendChild(_s);
  }

  var MV = ["poke", "shocked", "mischievous", "worried", "sad", "facepalm", "tired", "sleepy", "determined", "smug", "yelling", "nervous", "gloomy", "grimace", "wave", "jump", "blink", "spin", "fly", "thunder shock", "cloud form", "idea burst", "chaos mode"], AL = {thundershock: "thunder shock", shock: "thunder shock", lightning: "thunder shock", cloud: "cloud form", idea: "idea burst", chaos: "chaos mode", angry: "yelling"};
  var HELP = "ThundR (iOS) · moods: mischievous shocked worried sad facepalm tired sleepy determined smug yelling nervous gloomy grimace · actions: wave jump blink spin fly poke · abilities: thunder shock, cloud form, idea burst, chaos mode · type any name (or 'do <name>') · heal | fix yourself | reset look · wallet is view-only in the app's Wallet tab";
  function log(t) { try { var a = JSON.parse(localStorage.getItem("thundr.selfheal.log") || "[]"); a.push(new Date().toISOString() + " " + t); localStorage.setItem("thundr.selfheal.log", JSON.stringify(a.slice(-50))); } catch (e) {} }
  function chat(text) { var low = String(text || "").trim().toLowerCase();
    var _rs = String(text || "").trim();
    if (_rs.length <= 48) {
      _rs = _rs.toUpperCase().replace(/^(R:\\>|R:>|\/|>)/, "").replace(/Я/g, "R").replace(/[\s\-_.]/g, "").replace(/^OPEN/, "");
      if (_rs === "RSCRIBE" || _rs === "SCRIBE" || _rs === "RCRIBE" || _rs === "YASCRIBE") {
        var _h = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.rembed;
        if (_h && _h.postMessage) { try { _h.postMessage({ app: "rscribe" }); } catch (e) {} }
        else { try { if (window.webkit) window.location.href = "rdragon://embed/rscribe"; } catch (e2) {} }
        return { ok: true, via: "rscribe", reply: "Opening ЯSCRIBE in this app…" };
      }
    }
    if (/^selfheal-log:/.test(low)) { log(text); return { ok: true }; } if (low === "selfheal-poll") return {};
    var mv = low.replace(/^(do|be|use|show)\s+/, ""); mv = AL[mv] || mv;
    if (MV.indexOf(mv) >= 0) return { ok: true, via: "anim", anim: mv, reply: "ThundR · " + mv + " ⚡" };
    if (/^(help|moves|moods|abilities|list moves|\?)$/.test(low)) return { ok: true, via: "parser", reply: HELP };
    if (/^(fix yourself|heal|heal yourself|reset look|thundr heal)$/.test(low)) { var f = window.THUNDR_HEAL ? window.THUNDR_HEAL.check("chat") : []; return { ok: true, via: "selfheal", reply: "ThundR · base form " + (f.length ? "restored: " + f.join("; ") : "OK (nothing to fix)") }; }
    if (/\b(send|transfer|seed|private key|mnemonic|sign|approve)\b/.test(low)) return { ok: false, via: "guard", reply: "Refused: ThundR on iOS is view-only (no sends, no keys, no approvals)." };
    if (/wallet|balance/.test(low)) return { ok: true, via: "wallet", reply: "Wallet is view-only here: open the app's Wallet tab to look. ThundR never moves funds." };
    return { ok: true, via: "local", reply: "ThundR heard you. On iOS I do moves, heal and help; full MCR commands run on the Mac." }; }
  function fx(r, q) { var M = window.THUNDR_MOVES; if (!M || !r) return; if (r.anim) return M.play(r.anim);
    if (/^Refused/.test(r.reply || "")) M.play("yelling"); else if (r.ok === false) M.play("shocked"); else if (r.via === "wallet") M.play("thunder shock"); else if (r.via === "selfheal") M.play("cloud form"); else M.play("idea burst"); }
  window.THUNDR_IOS = { version: "2.2.0.6", chat: chat, fx: fx, log: log };
})();
/* thundr-orb.js · THUNDR free-floating cryptobot for the MCR (0.3.0). Gestures: drag = move (saved) · click = wake · double-click or press-and-hold = chat bar · Esc/double-click = close.
   NATIVE mode (THUNDR-FLOAT.app): window moves + endpoint calls go through window.webkit.messageHandlers.float. WEB mode: element moves, fetch 127.0.0.1:8329.
   No sends, no auto-approve: "request approval" always ends in a Touch ID / password prompt from rcasket on this Mac. */
(function () {
  "use strict";
  if (window.THUNDR_ORB) return;
  const NATIVE = !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.float);
  const EP = "http://127.0.0.1:8329/v1/call/";
  const MOVE_PX = 4, HOLD_MS = 550, DBL_MS = 260;
  const css = document.createElement("style");
  css.textContent = `#thundr-pin.th-orb{pointer-events:auto!important;position:fixed!important;right:auto!important;bottom:auto!important;z-index:2147483600;width:64px;height:54px;cursor:grab;touch-action:none;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;background:none!important;border:0!important;box-shadow:none!important;user-select:none;-webkit-user-select:none;touch-action:none;display:flex;flex-direction:column;align-items:center}
#thundr-pin.th-orb thundr-live{pointer-events:none!important;transform:scale(.75);transform-origin:50% 0;margin:0;height:38px;overflow:visible}#thundr-pin.th-orb .lbl{font:700 7px RIZAL,Noto Sans Tagalog,Noto Sans Mayan Numerals,system-ui;white-space:nowrap;letter-spacing:-.1px;line-height:10px;background:none!important;padding:0;color:#ffe46b;text-shadow:0 0 3px #000,0 1px 1px #000;margin-top:0}
#thundr-pin.th-orb.awake .lbl{color:#7dffb0}#th-chat{position:fixed;z-index:2147483601;width:min(360px,92vw);max-height:300px;display:none;flex-direction:column;background:#000;border:1px solid #39ff14;border-radius:12px;box-shadow:0 0 12px rgba(57,255,20,.22),0 8px 30px #000a;font:12px "RIZAL Mono",RIZAL,ui-monospace,Menlo,Noto Sans Tagalog,Noto Sans Mayan Numerals,monospace;color:#39ff14}
#th-chat.open{display:flex}#th-chat .hd{display:flex;gap:6px;align-items:center;padding:6px 8px;border-bottom:1px solid #39ff14;font:700 12px RIZAL,"RIZAL Mono",Noto Sans Tagalog,Noto Sans Mayan Numerals,system-ui;color:#ffd600}#th-chat .hd span{flex:1}
#th-chat .log{flex:1;overflow:auto;padding:6px 8px;white-space:pre-wrap;min-height:120px;max-height:200px;color:#39ff14}#th-chat .q{color:#39ff14}#th-chat .via{color:#1f8f0f;font-size:10px}
#th-chat .row{display:flex;gap:6px;align-items:center;padding:6px 8px}
#th-chat .box{flex:1;min-width:0;display:flex;align-items:center;background:#000;border:1px solid #39ff14;border-radius:10px;padding:0 8px;gap:0}
#th-chat .box .prompt{color:#39ff14;font:600 12px "RIZAL Mono",RIZAL,monospace;white-space:nowrap;padding:0 6px 0 0;flex:0 0 auto}
#th-chat .box input{flex:1;min-width:0;background:transparent;color:#39ff14;border:0;padding:7px 4px 7px 0;font:12px "RIZAL Mono",RIZAL,monospace;caret-color:#39ff14}
#th-chat .box input:focus{outline:none;box-shadow:none}#th-chat .box:focus-within{box-shadow:0 0 0 1px rgba(57,255,20,.45)}
#th-chat button{background:#000;color:#39ff14;border:1px solid #39ff14;border-radius:10px;padding:3px 9px;font:600 11px RIZAL,"RIZAL Mono",system-ui;cursor:pointer}
#th-chat button[data-add]{flex:0 0 auto;width:28px;height:28px;padding:0;border-radius:8px;border-color:#ff8c00;background:#ff8c00;color:#4b0082;font:700 20px/28px RIZAL,system-ui}
#th-chat button[data-enter]{flex:0 0 auto;min-width:36px;height:32px;padding:0;border-radius:10px;background:#8a2be2;color:#fff;border-color:#8a2be2;display:inline-flex;align-items:center;justify-content:center;font:700 22px/1 "Noto Sans Mayan Numerals",RIZAL,sans-serif}`;
  document.head.appendChild(css);
  const orb = document.createElement("div"); orb.id = "thundr-pin"; orb.className = "th-orb"; orb.dataset.mcr = "1"; orb.title = "ThundR · drag to move · click to wake · double-click or hold for chat";
  const pet = document.createElement("thundr-live"); pet.setAttribute("state", "idle"); pet.setAttribute("size", "48");
  const HERE = (document.currentScript && document.currentScript.src || location.href).replace(/[^/]*$/, "");
  pet.setAttribute("base", HERE + "atlas/");
  // rzl-repair (2.2.0.5) "unboxes" the kept THUNDR by forcing *{background-image:none!important} inside its shadow root,
  // which also blanks the sprite sheet. Keep the unbox rule for boxes but give the two sprite layers their image back.
  function unblank() {
    const r = pet.shadowRoot; if (!r) return;
    if (!r.getElementById("mcr-sprite-fix")) { const f = document.createElement("style"); f.id = "mcr-sprite-fix"; f.textContent = ".pet i{background-image:var(--mcr-img)!important}.tx,.tg,ol,.tm{display:none!important}.line{background:none!important;border:0!important;box-shadow:none!important;padding:0!important}"; r.appendChild(f); }
    r.querySelectorAll(".pet i").forEach((i) => { const m = /url\([^)]*\)/.exec(i.style.backgroundImage || ""); if (m) i.style.setProperty("--mcr-img", m[0]); });
    const f = r.getElementById("mcr-sprite-fix"); if (f && f.nextSibling) r.appendChild(f);
  }
  // one THUNDR only: the egg's link/superdragon re-seat a small #thundr-pin after rzl-repair has run; drop any figure that is not this orb
  function dedupe() {
    document.querySelectorAll("#thundr-pin:not(.th-orb), #thundr-bar").forEach((e) => e.remove());
    document.querySelectorAll("thundr-live").forEach((e) => { if (e !== pet) e.remove(); });
  }
  setInterval(() => { unblank(); dedupe(); }, 150);
  const lbl = document.createElement("div"); lbl.className = "lbl"; lbl.textContent = "ThundR · idle";
  orb.append(pet, lbl);
  const chat = document.createElement("div"); chat.id = "th-chat";
  chat.innerHTML = `<div class="hd"><span>⚡ ThundR · ${/android/i.test(navigator.userAgent)?"Android":(/iphone|ipad/i.test(navigator.userAgent)?"rOS":"Mac")}</span><button data-q="moves">moves</button><button data-q="help">help</button><button data-q="heal">heal</button><button data-x="1">✕</button></div><div class="log"></div><div class="row"><button type="button" data-add="1" title="add files">+</button><input type="file" hidden multiple><div class="box"><span class="prompt">R:\></span><input type="text" placeholder="wallet · casket verify · activate X · status · ask anything" autocomplete="off"></div><button type="button" data-enter="1" title="enter">𝋠</button></div>`;
  document.body.prepend(orb); document.body.append(chat);
  const log = chat.querySelector(".log"), inp = chat.querySelector(".box input");
  const st = { awake: false, open: false, state: "sleeping" };
  function setState(s) { st.state = s; pet.setAttribute("state", s); }
  function wake() {
    setState("hatch"); lbl.textContent = "ThundR · waking…";
    setTimeout(() => { setState("success"); }, 900);
    setTimeout(() => { st.awake = true; orb.classList.add("awake"); setState("idle"); lbl.textContent = "ThundR · awake"; }, 1500);
    if (NATIVE) post({ op: "wake" });
  }
  function place() {
    if (NATIVE) { orb.style.setProperty("left", "2px", "important"); orb.style.setProperty("top", "2px", "important"); chat.style.left = "70px"; chat.style.top = "4px"; return; }
    const r = orb.getBoundingClientRect(); let x = r.right + 8, y = r.top;
    const cw = Math.min(360, innerWidth * .92); if (x + cw > innerWidth) x = Math.max(4, r.left - cw - 8); if (x + cw > innerWidth) x = Math.max(4, innerWidth - cw - 4); if (y + 300 > innerHeight) y = Math.max(4, innerHeight - 304);
    chat.style.left = x + "px"; chat.style.top = y + "px";
  }
  function openChat(v) {
    st.open = v === undefined ? !st.open : v; chat.classList.toggle("open", st.open);
    if (NATIVE) post({ op: "chat", open: st.open });
    place(); if (st.open) { if (!st.awake) wake(); setTimeout(() => inp.focus(), 60); if (!log.textContent) say("ThundR ready (rOS). Try: moves · thunder shock · chaos mode · wave · heal · help", "parser"); }
  }
  function say(t, via, q) {
    const d = document.createElement("div");
    if (q) { d.className = "q"; d.textContent = "› " + t; } else { d.textContent = t; if (via) { const v = document.createElement("div"); v.className = "via"; v.textContent = "via " + via; d.append(v); } }
    log.append(d); log.scrollTop = log.scrollHeight;
  }
  // endpoint call (native: Swift URLSession; web: fetch)
  let seq = 0; const pend = {};
  function post(m) { try { window.webkit.messageHandlers.float.postMessage(m); } catch (e) {} }
  window.THUNDR_REPLY = (id, body) => { const p = pend[id]; if (p) { delete pend[id]; p(body); } };
  function call(tool, text) {
    if (NATIVE) return new Promise((res) => { const id = ++seq; pend[id] = res; post({ op: "call", id, tool, text }); });
    if (window.THUNDR_IOS) return Promise.resolve(window.THUNDR_IOS.chat(text));
    return fetch(EP + tool, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ text }) }).then((r) => r.json()).catch((e) => ({ ok: false, error: "MCR endpoint not reachable (" + e + ") — start it: launch.sh serve, or thundr float on" }));
  }
  async function ask(q) {
    q = (q || "").trim(); if (!q) return; say(q, null, true);
    // 1.0.4.37 (t199u): TerraformЯ commands never go to the casket path. `terraformr` opens the app; `terraformr bind`,
    // `request approval terraformr bind` and approve… (while a block 4 request is pending) open terraformr://rsign/bind?req=<id>.
    const _tf = /^\/?(?:(?:request\s+approval|approve)\s+)?terraformr(\s+bind)?\s*$/i.exec(q);
    const _tfAp = !_tf && /^\/?(?:request\s+approval|approve)(?:\s+(?:THUNDR chat approval|block\s*4))?\s*$/i.test(q) && !!(window.DS_TF_PENDING && window.DS_TF_PENDING());
    if (_tf || _tfAp) {
      const bind = _tfAp || !!_tf[1] || /^\/?(request\s+approval|approve)/i.test(q);
      const fn = bind ? window.DS_TF_OPEN_BIND : window.DS_TF_OPEN;
      if (typeof fn !== "function") { say("TerraformЯ is not wired in this build · nothing opened, nothing signed.", "error"); return; }
      setState("working"); say(bind ? "Opening TerraformЯ on the block 4 bind screen…" : "Opening TerraformЯ…", "terraformr");
      fn((ok, msg) => { say(msg, ok ? "terraformr" : "error"); setState(ok ? "success" : "error"); setTimeout(() => setState(st.awake ? "idle" : "sleeping"), 1200); });
      return;
    }
    const _rw = window.THUNDR_RWALLET && window.THUNDR_RWALLET(q);  // RWALLET UNIFIED 20261026: watch-only, local; gated → ЯCASKET Face ID request preview
    if (_rw) { say(await _rw, "rwallet-unified"); return; }
    if (/^(request approval|approve)/i.test(q)) say("Touch ID / password prompt is on screen — ThundR never approves by itself.", "casket");
    setState(/approv|casket/i.test(q) ? "working" : "thinking");
    const r = await call("thundr_chat", q);
    setState(r && r.ok !== false ? "success" : "error"); setTimeout(() => setState(st.awake ? "idle" : "sleeping"), 1200);
    say(String(r.reply || r.output || r.error || JSON.stringify(r)).replace(/THUNDR/g, "ThundR"), r.via || (r.ok === false ? "error" : "")); if (window.THUNDR_IOS) window.THUNDR_IOS.fx(r, q); if (r.reload) setTimeout(() => location.reload(), 1500);
  }
  chat.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.x) return openChat(false); if (b.dataset.add) { const f = chat.querySelector("input[type=file]"); if (f) f.click(); return; } if (b.dataset.enter) { const t = inp.value; inp.value = ""; ask(t); return; } let q = b.dataset.q; if (!q) return; if (q === "request approval") q += " " + (inp.value.trim() || "THUNDR chat approval"); inp.value = ""; ask(q); });
  const fileInp = chat.querySelector("input[type=file]");
  if (fileInp) fileInp.addEventListener("change", () => { const names = Array.from(fileInp.files || []).map(f => f.name); if (names.length) say("added " + names.join(", "), "files"); });
  inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { ask(inp.value); inp.value = ""; } });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && st.open) openChat(false); });
  // gestures
  const KEY = "thundr.orb.pos"; let g = null, clickT = null, lastUp = 0;
  if (!NATIVE) { const p = JSON.parse(localStorage.getItem(KEY) || "null") || { x: innerWidth - 110, y: innerHeight - 140 }; orb.style.setProperty("left", Math.max(0, Math.min(p.x, innerWidth - 84)) + "px", "important"); orb.style.setProperty("top", Math.max(0, Math.min(p.y, innerHeight - 84)) + "px", "important"); } else place();
  orb.addEventListener("pointerdown", (e) => {
    orb.setPointerCapture(e.pointerId);
    g = { x: e.screenX, y: e.screenY, ox: orb.offsetLeft, oy: orb.offsetTop, moved: false, held: false };
    g.hold = setTimeout(() => { if (g && !g.moved) { g.held = true; gesture("hold"); } }, HOLD_MS);
    if (NATIVE) post({ op: "dragstart" });
  });
  addEventListener("pointermove", (e) => {
    if (!g) return; const dx = e.screenX - g.x, dy = e.screenY - g.y;
    if (!g.moved && Math.hypot(dx, dy) < MOVE_PX) return;
    if (!g.moved) { g.moved = true; clearTimeout(g.hold); orb.style.cursor = "grabbing"; }
    if (NATIVE) post({ op: "drag", dx, dy });
    else { orb.style.setProperty("left", Math.max(0, Math.min(innerWidth - 84, g.ox + dx)) + "px", "important"); orb.style.setProperty("top", Math.max(0, Math.min(innerHeight - 84, g.oy + dy)) + "px", "important"); if (st.open) place(); }
  });
  const up = () => {
    if (!g) return; clearTimeout(g.hold); orb.style.cursor = "grab"; const was = g; g = null;
    if (was.moved) { gesture("drag"); if (NATIVE) post({ op: "dragend" }); else localStorage.setItem(KEY, JSON.stringify({ x: orb.offsetLeft, y: orb.offsetTop })); return; }
    if (was.held) return;
    const now = Date.now();
    if (now - lastUp < DBL_MS) { clearTimeout(clickT); lastUp = 0; gesture("dblclick"); return; }
    lastUp = now; clickT = setTimeout(() => gesture("click"), DBL_MS);
  };
  addEventListener("pointerup", up, true); addEventListener("pointercancel", up, true);
  const hist = [];
  function gesture(k) {
    hist.push({ k, t: Date.now() }); if (hist.length > 20) hist.shift();
    if (k === "click") wake(); else if (k === "dblclick") openChat(); else if (k === "hold") openChat(true);
  }
  window.THUNDR_ORB = { version: "0.3.0", native: NATIVE, state: () => ({ ...st, gestures: hist.map((h) => h.k) }), ask, openChat, wake };
})();
/* ThundR display patch: hide stray live status text; debug hook ?chat=1 opens the chat bar (web mode only) */
(function(){try{var s=document.createElement("style");s.textContent="#thundr-status{display:none!important}";document.head.appendChild(s);
if(/[?&]chat=1/.test(location.search))setTimeout(function(){window.THUNDR_ORB&&window.THUNDR_ORB.openChat(true)},800);}catch(e){}})();
/* ThundR BASE FORM self-heal (1.0): runs every 30s + on wake. Rules: tiny animated sprite only, label "ThundR · <state>" under it with no
   background, no panels/pop-ups, one figure, window 68x58 when chat closed. Repairs in place; logs via MCR thundr_chat "selfheal-log:" → selfheal.log. */
(function () {
  const O = window.THUNDR_ORB; if (!O || window.THUNDR_HEAL) return;
  const EP = "http://127.0.0.1:8329/v1/call/thundr_chat";
  function send(text) {
    if (O.native) return new Promise((res) => { const id = 900000 + Math.floor(Math.random() * 99999); const prev = window.THUNDR_REPLY;
      window.THUNDR_REPLY = (i, b) => { if (i === id) { window.THUNDR_REPLY = prev; res(b); } else prev(i, b); };
      try { window.webkit.messageHandlers.float.postMessage({ op: "call", id, tool: "thundr_chat", text }); } catch (e) { res({}); } });
    if (window.THUNDR_IOS) return Promise.resolve(window.THUNDR_IOS.chat(text));
    return fetch(EP, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ text }) }).then((r) => r.json()).catch(() => ({}));
  }
  const vis = (el) => { if (!el) return false; const s = getComputedStyle(el); return s.display !== "none" && s.visibility !== "hidden" && el.offsetWidth > 0; };
  let lastRaf = null;
  function check(why) {
    const fixed = []; const orb = document.getElementById("thundr-pin"); const pet = orb && orb.querySelector("thundr-live"); const lbl = orb && orb.querySelector(".lbl");
    ["thundr-bar", "thundr-pop", "thundr-status"].forEach((id) => { const e = document.getElementById(id); if (vis(e)) { e.style.setProperty("display", "none", "important"); e.hidden = true; fixed.push("hid #" + id); } });
    document.querySelectorAll("thundr-live").forEach((e) => { if (e !== pet) { e.remove(); fixed.push("removed duplicate sprite"); } });
    document.querySelectorAll("#thundr-pin").forEach((e) => { if (e !== orb) { e.remove(); fixed.push("removed duplicate figure"); } });
    if (!window.THUNDR_IOS) [...document.body.children].forEach((e) => { if (e === orb || e.id === "th-chat" || e.id === "th-mood" || e.tagName === "SCRIPT" || e.tagName === "STYLE") return;
      if (vis(e)) { e.style.setProperty("display", "none", "important"); fixed.push("hid stray " + (e.id ? "#" + e.id : e.tagName.toLowerCase())); } });
    if (pet) {
      const tx = pet.shadowRoot && pet.shadowRoot.querySelector(".tx"); if (vis(tx)) { tx.style.setProperty("display", "none", "important"); fixed.push("hid status text"); }
      if (pet.getAttribute("size") !== "48") { pet.setAttribute("size", "48"); fixed.push("sprite size→48"); }
      if (pet.style.animationPlayState === "paused" || pet.dataset.paused) { pet.style.animationPlayState = ""; delete pet.dataset.paused; }
      if (pet._raf === lastRaf || pet._raf == null) { try { cancelAnimationFrame(pet._raf); pet._raf = requestAnimationFrame((x) => pet._tick(x)); fixed.push("restarted idle animation"); } catch (e) {} }
      lastRaf = pet._raf;
    }
    if (lbl) {
      const s = O.state(); const want = s.awake ? "ThundR · awake" : "ThundR · " + (s.state === "sleeping" ? "idle" : s.state);
      if (!/^ThundR · /.test(lbl.textContent)) { lbl.textContent = want; fixed.push("label→" + want); }
      const cs = getComputedStyle(lbl); if (cs.backgroundColor !== "rgba(0, 0, 0, 0)" || cs.backgroundImage !== "none" || parseFloat(cs.borderRadius) > 0 || parseFloat(cs.paddingTop) > 0) { lbl.removeAttribute("style"); lbl.style.setProperty("background", "none", "important"); fixed.push("label bubble removed"); }
      if (pet && lbl.getBoundingClientRect().top < pet.getBoundingClientRect().top + 30) { orb.style.flexDirection = "column"; lbl.style.setProperty("order", "2"); fixed.push("label moved under face"); }
    }
    if (O.native && !O.state().open && (innerWidth !== 68 || innerHeight !== 58)) { try { window.webkit.messageHandlers.float.postMessage({ op: "chat", open: false }); } catch (e) {} fixed.push("window→68x58 (was " + innerWidth + "x" + innerHeight + ")"); }
    if (pet && window.THUNDR_ANIM) { const a = pet.getAnimations ? pet.getAnimations().filter((x) => /th-bob/.test(x.animationName || "")) : [];
      if (!a.length || a.some((x) => x.playState !== "running")) { pet.style.animation = "none"; void pet.offsetWidth; pet.style.animation = ""; a.forEach((x) => x.play()); fixed.push("restarted hover bob"); }
      const smp = window.THUNDR_ANIM.frameSample(); setTimeout(() => { if (window.THUNDR_ANIM.frameSample() !== smp) return; { try { cancelAnimationFrame(pet._raf); pet._t = 0; pet._f = 0; pet._raf = requestAnimationFrame((x) => pet._tick(x)); const s = pet.getAttribute("state"); if (s !== "idle" && s !== "sleeping") pet.setAttribute("state", pet._rest || "idle"); } catch (e) {} send("selfheal-log: [" + why + "] frozen frame in state " + pet.getAttribute("state") + " → restarted"); } }, 700); }
    if (fixed.length) send("selfheal-log: [" + why + "] " + fixed.join("; "));
    return fixed;
  }
  function breakLook() { const p = document.getElementById("thundr-pop"); if (p) { p.hidden = false; p.style.setProperty("display", "block", "important"); p.textContent = "ThundR · TEST BREAK panel"; }
    const pet = document.querySelector("#thundr-pin thundr-live"); if (pet) { cancelAnimationFrame(pet._raf); lastRaf = pet._raf; } }
  async function poll() { const r = await send("selfheal-poll"); if (r && r.break) breakLook(); if (r && r.reload) location.reload(); if (r && r.check) check("requested"); if (r && r.force && window.THUNDR_ANIM) { if (!(window.THUNDR_MOVES && window.THUNDR_MOVES.play(r.force))) window.THUNDR_ANIM.force(r.force); } }
  setTimeout(() => check("start"), 3000); setInterval(() => check("30s"), 30000); setInterval(poll, 5000);
  const w = O.wake; O.wake = function () { const x = w.apply(this, arguments); setTimeout(() => check("wake"), 1800); return x; };
  try { new MutationObserver(() => { if (/awake$/.test(document.querySelector("#thundr-pin .lbl").textContent)) setTimeout(() => check("wake"), 300); }).observe(document.querySelector("#thundr-pin .lbl"), { childList: true }); } catch (e) {}
  window.THUNDR_HEAL = { check, breakLook, version: "1.0" };
})();
/* ThundR ALWAYS-ANIMATED (1.1): constant slow hover bob in every state, occasional blink, sleep = bob + breathing + Zzz.
   Frames from the ЯBOWZR thundr-live atlas (same files); one-shot states never hold a still frame. */
(function () {
  const orb = document.getElementById("thundr-pin"); if (!orb || window.THUNDR_ANIM) return;
  const pet = orb.querySelector("thundr-live");
  const css = document.createElement("style"); css.id = "thundr-anim-css";
  css.textContent = `@keyframes th-bob{0%,100%{translate:0 0}50%{translate:0 -3px}}
@keyframes th-breathe{0%,100%{scale:1 1}50%{scale:1.04 .96}}
@keyframes th-blink{0%,94%,100%{filter:none}96%{filter:brightness(.55)}}
@keyframes th-z{0%{opacity:0;transform:translate(0,0) scale(.6)}30%{opacity:1}100%{opacity:0;transform:translate(6px,-12px) scale(1)}}
#thundr-pin.th-orb thundr-live{animation:th-bob 2.4s ease-in-out infinite,th-blink 5.3s linear infinite!important}
#thundr-pin.th-orb.sleep thundr-live{animation:th-bob 3.6s ease-in-out infinite,th-breathe 3.6s ease-in-out infinite,th-blink 7s linear infinite!important}
#thundr-pin .zz{position:absolute;left:44px;top:2px;font:700 7px RIZAL,Noto Sans Tagalog,Noto Sans Mayan Numerals,system-ui;color:#c9b6ff;text-shadow:0 0 2px #000;pointer-events:none;display:none}
#thundr-pin.sleep .zz{display:block;animation:th-z 2.2s ease-out infinite}#thundr-pin.sleep .zz+.zz{animation-delay:1.1s}`;
  document.head.appendChild(css);
  orb.style.position = "fixed"; for (let i = 0; i < 2; i++) { const z = document.createElement("span"); z.className = "zz"; z.textContent = "z"; orb.append(z); }
  const lbl = orb.querySelector(".lbl");
  function sync() { const s = pet.getAttribute("state"); const sleep = s === "sleeping"; orb.classList.toggle("sleep", sleep); pet._rest = sleep ? "sleeping" : "idle";
    const want = "ThundR · " + (orb.dataset.move ? orb.dataset.move : sleep ? "sleeping" : s === "hatch" ? "waking" : orb.classList.contains("awake") && s === "idle" ? "awake" : s);
    if (lbl && lbl.textContent !== want && !/waking…/.test(lbl.textContent)) lbl.textContent = want;  if (lbl) lbl.style.fontSize = lbl.textContent.length > 14 ? "6px" : ""; }
  if (lbl) new MutationObserver(() => { const n = lbl.textContent.length, f = n > 18 ? "5.5px" : n > 14 ? "6px" : ""; if (lbl.style.fontSize !== f) lbl.style.fontSize = f; }).observe(lbl, { childList: true });
  new MutationObserver(sync).observe(pet, { attributes: true, attributeFilter: ["state"] }); new MutationObserver(sync).observe(orb, { attributes: true, attributeFilter: ["class"] }); sync();
  function force(s) { if (s === "awake") { orb.classList.add("awake"); pet.setAttribute("state", "idle"); }
    else if (s === "wake") { window.THUNDR_ORB.wake(); } else { if (s === "sleeping" || s === "sleep") orb.classList.remove("awake"); pet.setAttribute("state", s === "sleep" ? "sleeping" : s); } }
  function frameSample() { const r = pet.shadowRoot; const els = r ? [...r.querySelectorAll(".pet i")] : []; return els.map((e) => e.style.backgroundPosition + "|" + e.style.opacity).join(";") + "|f" + pet._f; }
  window.THUNDR_ANIM = { force, frameSample, version: "1.1" };
})();
/* ThundR MOVESET (1.2): moods, actions, abilities, gesture reactions, idle auto-moods, chat effects, real sleep (breath bob + snore Zzz/puff + bolt flicker).
   Sprite frames = ЯBOWZR thundr-live atlas (idle/working/thinking/searching/success/error/sleeping/egg/hatch); each move = atlas state + tiny CSS FX layer. */
(function () {
  const A = window.THUNDR_ANIM, O = window.THUNDR_ORB, orb = document.getElementById("thundr-pin"); if (!A || !O || !orb || window.THUNDR_MOVES) return;
  const pet = orb.querySelector("thundr-live"), lbl = orb.querySelector(".lbl");
  const css = document.createElement("style"); css.id = "thundr-moves-css";
  css.textContent = `#thundr-pin .fx{position:absolute;left:0;top:0;width:64px;height:40px;pointer-events:none;overflow:visible}
#thundr-pin .fx b{position:absolute;font:700 9px RIZAL,Noto Sans Tagalog,Noto Sans Mayan Numerals,system-ui;line-height:1;text-shadow:0 0 3px #000}
@keyframes m-jolt{0%,100%{rotate:0}20%{rotate:-8deg}40%{rotate:8deg}60%{rotate:-5deg}80%{rotate:5deg}}
@keyframes m-shake{0%,100%{margin-left:0}25%{margin-left:-2px}75%{margin-left:2px}}
@keyframes m-tremble{0%,100%{margin-left:0}50%{margin-left:1px}}
@keyframes m-tilt{0%,100%{rotate:0}50%{rotate:-12deg}}
@keyframes m-droop{0%,100%{margin-top:0;rotate:0}50%{margin-top:3px;rotate:6deg}}
@keyframes m-jump{0%,100%{margin-top:0}40%{margin-top:-9px}60%{margin-top:-9px}}
@keyframes m-spin{to{rotate:360deg}}
@keyframes m-wave{0%,100%{rotate:0}25%{rotate:14deg}75%{rotate:-14deg}}
@keyframes m-fly{0%,100%{margin-top:-4px;rotate:-6deg}50%{margin-top:-7px;rotate:6deg}}
@keyframes m-cloud{0%,100%{opacity:1;filter:none}50%{opacity:.45;filter:blur(1.5px) saturate(.5)}}
@keyframes m-chaos{0%{filter:hue-rotate(0)}100%{filter:hue-rotate(360deg)}}
@keyframes m-flash{0%,100%{filter:none}10%,30%{filter:brightness(2.2) drop-shadow(0 0 4px #ffe46b)}20%{filter:brightness(.8)}}
@keyframes m-gloom{0%,100%{filter:brightness(.6) saturate(.6)}50%{filter:brightness(.5) saturate(.4)}}
@keyframes fx-up{0%{opacity:0;transform:translate(0,4px) scale(.6)}25%{opacity:1}100%{opacity:0;transform:translate(var(--dx,0),-14px) scale(1.1)}}
@keyframes fx-fall{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(var(--dx,0),22px)}}
@keyframes fx-bolt{0%,100%{opacity:0}10%,40%{opacity:1}25%{opacity:.2}}
@keyframes fx-puff{0%{opacity:0;transform:scale(.3)}40%{opacity:.8;transform:scale(1)}100%{opacity:0;transform:scale(1.4) translate(4px,-4px)}}
@keyframes fx-flick{0%,100%{opacity:.25;rotate:-8deg}30%{opacity:1;rotate:6deg}55%{opacity:.4;rotate:-4deg}80%{opacity:.95;rotate:8deg}}
#thundr-pin.sleep .zz{font-size:8px}
#thundr-pin .snore{position:absolute;left:36px;top:18px;width:6px;height:6px;border-radius:50%;background:rgba(220,210,255,.7);display:none;pointer-events:none}
#thundr-pin.sleep .snore{display:block;animation:fx-puff 3.6s ease-out infinite}
#thundr-pin .bolt{position:absolute;left:28px;top:24px;font:700 9px RIZAL,Noto Sans Tagalog,Noto Sans Mayan Numerals,system-ui;color:#ffe46b;text-shadow:0 0 4px #ffb800;display:none;pointer-events:none}
#thundr-pin.sleep .bolt{display:block;animation:fx-flick 1.7s steps(6) infinite}`;
  document.head.appendChild(css);
  const fx = document.createElement("div"); fx.className = "fx"; orb.append(fx);
  const sn = document.createElement("span"); sn.className = "snore"; orb.append(sn);
  const bo = document.createElement("span"); bo.className = "bolt"; bo.textContent = "⚡"; orb.append(bo);
  function spark(ch, x, y, color, kind, ms, dx) { const b = document.createElement("b"); b.textContent = ch; b.style.cssText = `left:${x}px;top:${y}px;color:${color};--dx:${dx || 0}px;animation:${kind || "fx-up"} ${ms || 900}ms ease-out forwards`; fx.append(b); setTimeout(() => b.remove(), (ms || 900) + 50); }
  // move table: [atlas state, extra pet animation, duration ms, fx fn]
  const M = {
    poke:        ["success", "m-jolt .5s ease 1", 900, () => spark("!", 46, 0, "#ffe46b")],
    shocked:     ["error", "m-jolt .35s ease 3", 1300, () => { spark("!", 44, -2, "#ff6b6b"); spark("!", 50, 2, "#ff6b6b", "fx-up", 900, 4); }],
    mischievous: ["thinking", "m-tilt 1.2s ease-in-out 2", 2600, () => spark("😈", 46, 0, "#c9b6ff", "fx-up", 1400)],
    worried:     ["searching", "m-tremble .12s linear 16", 2200, () => spark("💧", 44, 2, "#8fd3ff", "fx-fall", 1200)],
    sad:         ["sleeping", "m-droop 1.6s ease-in-out 2", 3200, () => spark("💧", 22, 14, "#8fd3ff", "fx-fall", 1500)],
    facepalm:    ["error", "m-droop .9s ease-in-out 2", 2000, () => spark("🤦", 44, 0, "#fff", "fx-up", 1400)],
    tired:       ["sleeping", "m-droop 2s ease-in-out 1", 2400, () => spark("…", 44, 4, "#ccc", "fx-up", 1600)],
    sleepy:      ["sleeping", "m-droop 2.4s ease-in-out 1", 2600, () => spark("z", 46, 0, "#c9b6ff", "fx-up", 1600)],
    determined:  ["working", "m-shake .2s linear 6", 2000, () => spark("💢", 46, 0, "#ff8a3d", "fx-up", 1200)],
    smug:        ["success", "m-tilt 1.4s ease-in-out 1", 2000, () => spark("✨", 46, 0, "#ffe46b", "fx-up", 1200)],
    yelling:     ["error", "m-shake .08s linear 20", 1800, () => { spark("!!", 44, -2, "#ff6b6b"); spark("💢", 6, 2, "#ff6b6b"); }],
    nervous:     ["searching", "m-tremble .08s linear 22", 1900, () => spark("💦", 46, 2, "#8fd3ff", "fx-fall", 1200)],
    gloomy:      ["sleeping", "m-gloom 1.5s ease-in-out 2", 3000, () => spark("☁", 44, -2, "#888", "fx-up", 2000)],
    grimace:     ["error", "m-tremble .1s linear 12", 1500, () => spark("😬", 46, 0, "#fff", "fx-up", 1200)],
    wave:        ["success", "m-wave .45s ease-in-out 4", 1900, () => spark("👋", 46, 4, "#fff", "fx-up", 1300)],
    jump:        ["success", "m-jump .5s ease-out 2", 1100, () => spark("✦", 30, 34, "#ffe46b", "fx-fall", 700)],
    blink:       ["idle", "th-blink .35s linear 1", 400, null],
    spin:        ["working", "m-spin .7s ease-in-out 1", 900, () => spark("✦", 46, 6, "#c9b6ff", "fx-up", 800)],
    fly:         ["searching", "m-fly .6s ease-in-out 3", 1800, () => spark("~", 4, 26, "#c9b6ff", "fx-fall", 800, -6)],
    "thunder shock": ["error", "m-flash .9s linear 2, m-jolt .3s ease 3", 2000, () => { for (let i = 0; i < 4; i++) setTimeout(() => { spark("⚡", 6 + Math.random() * 46, -6, "#ffe46b", "fx-bolt", 500); spark("ϟ", 10 + Math.random() * 40, 0, "#b06bff", "fx-bolt", 500); }, i * 220); setTimeout(() => { for (let i = 0; i < 5; i++) spark("·", 14 + i * 8, 28, "#ffe46b", "fx-fall", 900, (i - 2) * 3); }, 1000); }],
    "cloud form":  ["sleeping", "m-cloud 1.2s ease-in-out 2", 2500, () => { spark("☁", 6, 6, "#ddd", "fx-up", 2000, -4); spark("☁", 44, 8, "#ddd", "fx-up", 2000, 4); }],
    "idea burst":  ["thinking", "m-jump .4s ease-out 1, m-flash .6s linear 1", 2000, () => { spark("💡", 26, -8, "#ffe46b", "fx-up", 1500); for (let i = 0; i < 6; i++) spark("✦", 30, 6, "#ffe46b", "fx-up", 900, (i - 3) * 6); }],
    "chaos mode":  ["working", "m-chaos .8s linear 4, m-shake .1s linear 30", 3200, () => { for (let i = 0; i < 6; i++) setTimeout(() => spark(["⚡", "💢", "✦", "ϟ"][i % 4], Math.random() * 54, Math.random() * 20, "#ff6bf0", "fx-up", 700, (Math.random() - .5) * 16), i * 400); }],
  };
  const ALIAS = { "thundershock": "thunder shock", "shock": "thunder shock", "lightning": "thunder shock", "cloud": "cloud form", "idea": "idea burst", "chaos": "chaos mode", "angry": "yelling" };
  let busy = 0, last = 0;
  function play(name) {
    name = String(name || "").toLowerCase().trim(); name = ALIAS[name] || name; const m = M[name]; if (!m) return false;
    clearTimeout(busy); last = Date.now(); const prev = pet.getAttribute("state") === "sleeping" ? "sleeping" : "idle";
    const keep = lbl.textContent; orb.dataset.move = name; lbl.textContent = "ThundR · " + name; pet.setAttribute("state", m[0]);
    const base = getComputedStyle(pet).animation; pet.style.animation = (m[1] + ", " + "th-bob 2.4s ease-in-out infinite");
    if (m[3]) m[3]();
    busy = setTimeout(() => { delete orb.dataset.move; pet.style.animation = ""; pet.setAttribute("state", prev); lbl.textContent = prev === "sleeping" ? "ThundR · sleeping" : (orb.classList.contains("awake") ? "ThundR · awake" : "ThundR · idle"); }, m[2]);
    return true;
  }
  // gesture reactions (click = poke/shocked, drag = fly, hold = facepalm, dblclick = wave)
  let seen = 0;
  setInterval(() => { const g = O.state().gestures; if (g.length === seen) return; const k = g[g.length - 1]; seen = g.length;
    if (k === "click") setTimeout(() => play(Math.random() < .5 ? "poke" : "shocked"), 1600); else if (k === "drag") play("fly"); else if (k === "hold") play("facepalm"); else if (k === "dblclick") play("wave"); }, 150);
  // idle auto-moods every 20–45 s (awake, chat closed, not sleeping)
  const IDLE = ["blink", "mischievous", "smug", "wave", "jump", "spin", "nervous", "blink", "idea burst", "tired"];
  (function auto() { setTimeout(() => { const s = O.state(); if (!s.open && pet.getAttribute("state") === "idle" && Date.now() - last > 15000) play(IDLE[Math.floor(Math.random() * IDLE.length)]); auto(); }, 20000 + Math.random() * 25000); })();
  // chat: commands trigger moves locally; replies trigger ability effects
  const inp = document.querySelector("#th-chat input");
  if (inp) inp.addEventListener("keydown", (e) => { if (e.key !== "Enter") return; const t = inp.value.trim().toLowerCase().replace(/^(do|be|use|show)\s+/, ""); if (M[ALIAS[t] || t]) play(t); }, true);
  const prevReply = window.THUNDR_REPLY;
  window.THUNDR_REPLY = (id, body) => { try { const r = typeof body === "string" ? JSON.parse(body) : body; const txt = String((r && (r.reply || r.output || r.error)) || "");
      if (id < 900000 && !(r && r.anim)) { if (/^Refused/.test(txt)) play("yelling"); else if (r && r.ok === false) play("shocked"); else if (/wallet|balance|SOL/i.test(txt)) play("thunder shock"); else if (/via bot|DRAGOSKUL/i.test(txt) || (r && /bot/.test(r.via || ""))) play("idea burst"); else if (/heal/i.test(txt)) play("cloud form"); }
    } catch (e) {} return prevReply(id, body); };
  window.THUNDR_MOVES = { play, list: () => Object.keys(M), version: "1.2" };
})();

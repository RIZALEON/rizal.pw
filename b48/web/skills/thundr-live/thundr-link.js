/* thundr-link.js · THUNDR direct channel + live repair progress 0.6 · superdragon 2.1.9.18 (2026-10-17 MT) · egg-only · offline.
 * - RL_THUNDR.ask(q) / RL_THUNDR.cmd(q): THUNDR answers from his own live state + bus log (never the Heart, never the bot chat).
 * - "/thundr <msg>" and "/thundr report" typed in the chat box are answered by THUNDR; "/home" re-opens the egg home (rbowzr-home-boot).
 * - USB mailbox: Neo's thundr-talk.sh writes skills/thundr-live/mailbox/inbox.js (Ed25519-signed with the update key); THUNDR verifies
 *   the signature + seq, answers, and every reply/refusal + repair progress goes to the Neo outbox through the native transcript sink
 *   (append-only, "THUNDR-OUT {json}" lines). Unsigned or replayed mail is refused and logged.
 * - Live repair progress: short floating text + thin bar beside THUNDR (no box, no panel), fed by bus events from egg / rzl-repair /
 *   inject / egg-convert / rzl-code; step count when known; auto-hides after success. */
(function () {
  "use strict";
  if (window.RL_THUNDR_LINK) return;
  const VER = "0.6.0", RID = "ЯID-0014-KREH";
  const PUB = "zs7M4OOB0zQhWOQw3SHpAY+XYxbZJvcPESy1y400Ti0=";   // rlab-update-ed25519.pub (public key only)
  const HERE = (document.currentScript && document.currentScript.src) ? document.currentScript.src.replace(/[^/]*$/, "") : "./skills/thundr-live/";
  const REPAIR = /^(egg|rzl-repair|inject|egg-convert|rzl-code|repair)$/;
  const bus = () => window.RL_THUNDR_BUS;
  const linkLog = [];
  function out(kind, o) {   // Neo outbox mirror (native transcript sink, append-only)
    const rec = Object.assign({ v: 1, from: RID, ts: new Date().toISOString() }, o, { kind }); linkLog.push(rec); if (linkLog.length > 300) linkLog.shift();
    try { const H = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.rosTranscript;
      if (H) H.postMessage({ cmd: "append", role: "assistant", bot: "THUNDR " + RID, text: "THUNDR-OUT " + JSON.stringify(rec) }); } catch (x) {}
    return rec;
  }
  // ---------- answers from live state ----------
  function organs() { try { return bus().heartbeat(); } catch (x) { return {}; } }
  function ask(q) {
    q = String(q || "").trim(); const B = bus(); const st = B ? B.state : { state: "idle", text: "" }; const L = B ? B.log : [];
    const low = q.toLowerCase(); let a;
    const last = (n) => L.slice(-n).map((e) => `${e.state} · ${e.organ} · ${e.text || e.kind}`).join("\n");
    if (!q || /^(status|state|how are you|hi|hello)/.test(low)) a = `THUNDR ${RID} · ${st.state}${st.text ? " · " + st.text : ""} · ${L.length} events logged`;
    else if (/^(report|organs|vitals)/.test(low)) { const o = organs(); a = "Organ report:\n" + Object.keys(o).map((k) => `${o[k] === true ? "🟢" : o[k] === false ? "🔴" : "⚪"} ${k}${o[k] === true || o[k] === false ? "" : " · " + o[k]}`).join("\n") + `\nNow: ${st.state}${st.text ? " · " + st.text : ""}`; }
    else if (/^(what|working|doing|busy)/.test(low)) { const w = L.slice().reverse().find((e) => /working|thinking|searching|egg|hatch/.test(e.state)); a = w ? `Last work: ${w.organ} · ${w.text || w.kind} (${w.state}, ${w.ts.slice(11, 19)}Z) · now ${st.state}` : `Nothing running · ${st.state}`; }
    else if (/^(log|history)/.test(low)) a = last(10) || "Log empty";
    else if (/^(id|who)/.test(low)) a = `THUNDR · ${RID} · free-floating superlink · reports every organ live`;
    else if (/^help/.test(low)) a = "Ask me: status · report · what · log · id · help";
    else a = `Heard: "${q.slice(0, 120)}" · I answer from live state only. Now ${st.state}${st.text ? " · " + st.text : ""}. Try: status · report · what · log`;
    try { B && B.emit({ organ: "thundr", kind: "ask", state: "success", text: "answered: " + q.slice(0, 40) }); } catch (x) {}
    return a;
  }
  // ---------- chat box: /thundr, /home ----------
  function wrapChat() {
    const BW = window.RL_BOTWIN; if (!BW || BW.__tlink || typeof BW.handle !== "function") return !!(BW && BW.__tlink);
    const h = BW.handle;
    BW.handle = async function (raw) {
      const t = String(raw || "").trim();
      const m = /^\/thundr\b\s*(.*)$/i.exec(t);
      if (m) { const a = ask(m[1] || "status"); out("chat", { q: m[1] || "status", a });
        try { window.pushTurn && window.pushTurn("user", t); window.pushTurn && window.pushTurn("bot", "⚡ THUNDR · " + a); } catch (x) {} return true; }
      if (/^\/home$/i.test(t)) { goHome(); return true; }
      return h.apply(this, arguments);
    };
    BW.__tlink = 1; return true;
  }
  function goHome() { try { bus() && bus().emit({ organ: "egg", kind: "home.open", state: "working", text: "Opening the egg home…" }); } catch (x) {} location.href = "yabowzr://egg/rbowzr-home-boot"; }
  // ---------- USB mailbox (signed) ----------
  let pubKey = null, lastSeq = 0; try { lastSeq = +localStorage.getItem("rlab.thundr.mail.seq.v1") || 0; } catch (x) {}
  const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  async function verify(m) {
    if (!crypto || !crypto.subtle) throw new Error("no WebCrypto");
    if (!pubKey) pubKey = await crypto.subtle.importKey("raw", b64(PUB), { name: "Ed25519" }, false, ["verify"]);
    const body = new TextEncoder().encode(`thundr-talk-v1\n${m.seq}\n${m.ts}\n${m.msg}`);
    return crypto.subtle.verify({ name: "Ed25519" }, pubKey, b64(String(m.sig || "").trim()), body);
  }
  window.RL_THUNDR_INBOX = async function (m) {
    m = m || {}; const seq = +m.seq || 0;
    if (seq <= lastSeq) return;   // already answered (polling re-reads the same file)
    let ok = false, why = "";
    try { ok = await verify(m); if (!ok) why = "bad signature"; } catch (x) { why = "verify failed · " + String((x && x.message) || x).slice(0, 60); }
    lastSeq = seq; try { localStorage.setItem("rlab.thundr.mail.seq.v1", String(seq)); } catch (x) {}
    if (!ok) { out("refused", { seq, why }); try { bus().emit({ organ: "thundr", kind: "mail.refused", state: "error", text: "Mail refused · " + why }); } catch (x) {} return; }
    const a = ask(m.msg); out("reply", { seq, q: String(m.msg).slice(0, 300), a });
  };
  function poll() { const s = document.createElement("script"); s.src = HERE + "mailbox/inbox.js?t=" + Date.now(); s.onload = s.onerror = () => s.remove(); (document.head || document.documentElement).appendChild(s); }
  // ---------- live repair progress (floating text + thin bar, no box) ----------
  let prog = null, ptx = null, pbar = null, hideT = 0, cur = null;
  function progMount() {
    if (prog && prog.isConnected) return true; if (!document.body) return false;
    prog = document.createElement("div"); prog.id = "thundr-prog"; prog.hidden = true; prog.setAttribute("role", "status"); prog.setAttribute("aria-live", "polite");
    prog.style.cssText = "position:fixed;z-index:2147483500;pointer-events:none;background:none;border:0;box-shadow:none;max-width:min(260px,70vw);font:600 11px/1.25 system-ui,sans-serif;color:#f2ecfa;text-shadow:0 1px 2px #000,0 0 5px #000,0 0 1px #000";
    ptx = document.createElement("div"); ptx.style.cssText = "white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
    const track = document.createElement("div"); track.style.cssText = "margin-top:3px;height:2px;border-radius:1px;background:rgba(255,255,255,.18)";
    pbar = document.createElement("div"); pbar.style.cssText = "height:2px;border-radius:1px;width:0;background:#ffcc33;box-shadow:0 0 4px #ffcc33;transition:width .25s";
    track.append(pbar); prog.append(ptx, track); document.body.appendChild(prog); return true;
  }
  function place() {
    if (!prog || prog.hidden) return; const pin = document.getElementById("thundr-pin"); if (!pin) return;
    const r = pin.getBoundingClientRect(), w = prog.offsetWidth || 200;
    const left = r.left - w - 6 >= 4 ? r.left - w - 6 : Math.min(innerWidth - w - 4, r.right + 6);
    prog.style.left = Math.max(4, left) + "px"; prog.style.top = Math.max(4, r.top + r.height / 2 - 12) + "px";
  }
  function showProg(e) {
    if (!progMount()) return; clearTimeout(hideT);
    const step = e.step && e.steps ? ` · ${e.step}/${e.steps}` : "";
    ptx.textContent = `${e.organ} · ${e.text || e.kind}${step}`; ptx.style.color = e.state === "error" ? "#ff6b6b" : "";
    const pct = e.steps ? Math.round(100 * Math.min(e.step || 0, e.steps) / e.steps) : (e.state === "success" ? 100 : 40);
    pbar.style.width = pct + "%"; pbar.style.background = e.state === "error" ? "#ff6b6b" : "#ffcc33";
    prog.hidden = false; place();
    if (e.state === "success" && (!e.steps || e.step >= e.steps)) hideT = setTimeout(() => { prog.hidden = true; }, 2500);
    if (e.state === "error") hideT = setTimeout(() => { prog.hidden = true; }, 8000);
  }
  document.addEventListener("thundr-organ", (ev) => { const e = ev.detail || {};
    if (!REPAIR.test(e.organ || "") && !e.steps) return;
    showProg(e); out("progress", { organ: e.organ, event: e.kind, state: e.state, text: e.text, step: e.step || null, steps: e.steps || null }); });
  // egg install progress: version changed since last run -> real steps (native verify done, organs loading k/N, active)
  function eggInstall() {
    const B = bus(); if (!B) return false; let v = ""; try { v = window.RL_SUPERDRAGON && window.RL_SUPERDRAGON.version; } catch (x) {} if (!v) return false;
    let last = ""; try { last = localStorage.getItem("rlab.thundr.install.v1") || ""; localStorage.setItem("rlab.thundr.install.v1", v); } catch (x) {}
    if (!last || last === v) return true;
    const N = 8; let k = 0;
    B.emit({ organ: "egg", kind: "install.verified", state: "egg", text: `Installing egg ${last} → ${v} · signature verified`, step: 1, steps: N + 2 });
    const iv = setInterval(() => { const o = organs(); const live = Object.keys(o).filter((x) => o[x] !== false).length; if (live > k) k = live;
      if (k < N) B.emit({ organ: "egg", kind: "install.organs", state: "working", text: `Egg ${v} · organs ${k}/${N} live`, step: 1 + k, steps: N + 2 });
      else { clearInterval(iv); B.emit({ organ: "egg", kind: "install.done", state: "success", text: `Egg ${v} active · all ${N} organs live`, step: N + 2, steps: N + 2 }); } }, 700);
    setTimeout(() => clearInterval(iv), 20000);
    return true;
  }
  // ---------- dark / light atlas (cut from Rizal's sheet 2026-10-17, transparent) ----------
  const ATL = HERE + "atlas/";
  function lum() { try { let el = document.body; while (el) { const c = getComputedStyle(el).backgroundColor; const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(c || "");
        if (m && (m[4] === undefined || +m[4] > 0.5)) return (0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3]) / 255; el = el.parentElement; } } catch (x) {}
    return matchMedia("(prefers-color-scheme: light)").matches ? 1 : 0; }
  let themeNow = "";
  function theme() { const th = lum() > 0.55 ? "light" : "dark"; document.querySelectorAll("thundr-live").forEach((el) => {
      const want = ATL + th; if (el.getAttribute("base") !== want) { el.setAttribute("base", want); try { el._ready = false; el.setState(el._want || el._state || "idle"); } catch (x) {} } });
    if (th !== themeNow) { themeNow = th; } return th; }
  try { matchMedia("(prefers-color-scheme: dark)").addEventListener("change", theme); } catch (x) {}
  function attach() { const T = window.RL_THUNDR; if (T && !T.ask) { T.ask = ask; T.cmd = ask; T.link = window.RL_THUNDR_LINK; } }
  window.RL_THUNDR_LINK = { version: VER, rid: RID, ask, cmd: ask, out, log: linkLog, goHome, poll, get theme() { return themeNow; }, get progress() { return prog && !prog.hidden ? ptx.textContent : ""; } };
  function boot() {
    let n = 0, inst = false;
    const iv = setInterval(() => { attach(); progMount(); theme(); const c = wrapChat(); if (!inst) inst = eggInstall(); place(); if (++n > 160 || (c && inst && window.RL_THUNDR && window.RL_THUNDR.ask)) clearInterval(iv); }, 250);
    setInterval(place, 600); setInterval(theme, 3000); setInterval(poll, 2000); poll();
    out("hello", { page: String(location.pathname).split("/").pop(), version: VER });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();

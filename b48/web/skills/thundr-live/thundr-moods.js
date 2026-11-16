/* ThundR MOODS 1.0 (2026-10-25): full claymation mood/move set from THUNDR-RBOWZR-COMPLETE-20261023.
   API: THUNDR.mood(name[,ms]) THUNDR.move(name) THUNDR.moods() THUNDR.moves() THUNDR.fly()
   Chat: "mood <name>", "moods", "move <name>". Gestures: shake=worried fling=shocked tap=poke hold=facepalm idle=sleepy.
   Shows the claymation face (atlas/moods/<name>.png) as a pop-up next to the one ThundR; also runs THUNDR_MOVES fx if present. */
(function () {
  if (window.THUNDR_MOODS) return;
  const MOODS = ["asleep","determined","drowsy","facepalm","fierce","gloomy","grimace","mischievous","nervous","sad","shocked","sleepy","smug","tired","worried","yelling"];
  const MOVES = ["wave","jump","blink","spin","egg","turntable","fly","walk","attack","hurt","poke","thunder shock","cloud form","idea burst","chaos mode"];
  const ALIAS = { angry: "yelling", happy: "smug", proud: "smug", scared: "shocked", surprised: "shocked", focus: "determined", focused: "determined", sleep: "asleep", embarrassed: "facepalm", anxious: "nervous", mad: "fierce" };
  // state -> moods (picked at random when the base state changes)
  const STATE = { error: ["grimace","facepalm","shocked"], success: ["smug","determined"], sleeping: ["asleep","drowsy"], thinking: ["mischievous","nervous"], searching: ["worried","nervous"], working: ["determined","fierce"] };
  const GEST = { shake: "worried", fling: "shocked", tap: "poke", hold: "facepalm", idle: "sleepy" };
  const me = document.currentScript && document.currentScript.src || "";
  let BASE = (me ? me.replace(/[^/]*$/, "") : "thundr/") + "atlas/moods/";
  const css = document.createElement("style");
  css.textContent = "#th-mood{position:fixed;z-index:2147483602;width:44px;height:48px;pointer-events:none;opacity:0;transform:scale(.6);transition:opacity .2s,transform .25s cubic-bezier(.3,1.6,.5,1)}#th-mood.on{opacity:1;transform:scale(1)}#th-mood img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 2px 3px #000a)}#th-mood.fly img{animation:thm-fly .5s ease-in-out infinite alternate}@keyframes thm-fly{to{transform:translateY(-4px)}}";
  document.head.appendChild(css);
  const box = document.createElement("div"); box.id = "th-mood"; const img = document.createElement("img"); img.alt = ""; box.append(img);
  (document.body || document.documentElement).append(box);
  MOODS.concat(["fly1","fly2","fly3","fly4","fly5"]).forEach((n) => { const i = new Image(); i.src = BASE + n + ".png"; });
  let t = 0, cur = null, flyT = 0, last = Date.now();
  function pet() { const ps = document.querySelectorAll("thundr-live"); return ps[0] || null; }
  function place() { const p = document.getElementById("thundr-pin") || pet(); if (!p) { box.style.left = "4px"; box.style.top = "4px"; return; }
    const r = p.getBoundingClientRect(); let x = r.right - 6, y = r.top - 6; if (x + 46 > innerWidth) x = Math.max(0, r.left - 40); if (y < 0) y = 0; box.style.left = x + "px"; box.style.top = y + "px"; }
  function label(n) { const l = document.querySelector("#thundr-pin .lbl"); if (l) l.textContent = "ThundR · " + n; }
  function norm(n) { n = String(n || "").toLowerCase().trim(); return ALIAS[n] || n; }
  function mood(name, ms) {
    const n = norm(name); if (MOODS.indexOf(n) < 0) return false; last = Date.now();
    clearTimeout(t); clearInterval(flyT); box.classList.remove("fly"); cur = n; img.src = BASE + n + ".png"; place(); box.classList.add("on"); box.dataset.mood = n;
    const M = window.THUNDR_MOVES; if (!(M && M.list().indexOf(n) >= 0 && M.play(n))) label(n);
    t = setTimeout(() => { box.classList.remove("on"); cur = null; delete box.dataset.mood; }, ms || 2600); return true;
  }
  function fly(ms) { clearTimeout(t); clearInterval(flyT); let f = 1; img.src = BASE + "fly1.png"; place(); box.classList.add("on", "fly"); cur = "fly";
    flyT = setInterval(() => { f = f % 5 + 1; img.src = BASE + "fly" + f + ".png"; }, 120); const M = window.THUNDR_MOVES; M && M.play("fly");
    t = setTimeout(() => { clearInterval(flyT); box.classList.remove("on", "fly"); cur = null; }, ms || 1800); return true; }
  function move(name) { const n = norm(name); last = Date.now(); if (n === "fly") return fly();
    const M = window.THUNDR_MOVES; if (M && M.play(n)) return true;
    const p = pet(), A = { wave: "success", jump: "success", blink: "idle", spin: "working", egg: "egg", turntable: "working", walk: "working", attack: "error", hurt: "error", poke: "success" }[n];
    if (!p || !A) return false; const prev = p.getAttribute("state"); p.setAttribute("state", A); label(n);
    if (n === "turntable") { p.style.transition = "transform 2s linear"; p.style.transform = "rotateY(360deg)"; }
    setTimeout(() => { p.setAttribute("state", prev === A ? "idle" : prev); p.style.transform = ""; p.style.transition = ""; }, n === "egg" ? 2500 : 1600); return true; }
  // base-state -> mood
  let watched = null, lastState = "";
  function watch() { const p = pet(); if (!p || p === watched) return; watched = p;
    new MutationObserver(() => { const s = p.getAttribute("state"); if (s === lastState) return; lastState = s;
      if (document.getElementById("thundr-pin") && document.getElementById("thundr-pin").dataset.move) return; // a move is already playing
      const c = STATE[s]; if (c && !cur && Date.now() - last > 4000) mood(c[Math.floor(Math.random() * c.length)]); }).observe(p, { attributes: true, attributeFilter: ["state"] }); }
  watch(); setInterval(watch, 2000);
  // gestures: tap/hold via pointer, shake/fling via drag velocity, idle 90s -> sleepy
  let pts = [], down = 0;
  addEventListener("pointerdown", (e) => { if (!e.target.closest || !e.target.closest("#thundr-pin,thundr-live")) return; down = Date.now(); pts = [[e.clientX, e.clientY, down]]; }, true);
  addEventListener("pointermove", (e) => { if (!down) return; pts.push([e.clientX, e.clientY, Date.now()]); if (pts.length > 40) pts.shift(); }, true);
  addEventListener("pointerup", (e) => { if (!down) return; const dur = Date.now() - down; down = 0; gesture(classify(pts, dur)); }, true);
  function classify(p, dur) { if (p.length < 3) return dur > 550 ? "hold" : "tap"; let rev = 0, dist = 0;
    for (let i = 2; i < p.length; i++) { const a = p[i - 1][0] - p[i - 2][0], b = p[i][0] - p[i - 1][0]; if (a * b < 0 && Math.abs(b) > 2) rev++; dist += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); }
    const l = p[p.length - 1], k = p[Math.max(0, p.length - 4)], v = Math.hypot(l[0] - k[0], l[1] - k[1]) / Math.max(1, l[2] - k[2]);
    if (rev >= 3) return "shake"; if (v > 1.2) return "fling"; if (dist < 6) return dur > 550 ? "hold" : "tap"; return "drag"; }
  function gesture(g) { const r = GEST[g]; if (!r) return; setTimeout(() => (MOODS.indexOf(r) >= 0 ? mood(r) : move(r)), g === "tap" ? 1700 : 50); }
  setInterval(() => { if (Date.now() - last > 90000 && !cur && !document.querySelector("#th-chat.open")) { const p = pet(); if (p && p.getAttribute("state") === "idle") { gesture("idle"); } last = Date.now(); } }, 10000);
  // chat commands
  function say(txt) { const log = document.querySelector("#th-chat .log"); if (log) { const d = document.createElement("div"); d.textContent = txt; log.append(d); log.scrollTop = 1e6; } }
  function command(s) { const m = String(s || "").trim().toLowerCase().match(/^(moods|moves|mood|move)\b\s*(.*)$/); if (!m) return null;
    if (m[1] === "moods") return say("ThundR moods: " + MOODS.join(", ")), true; if (m[1] === "moves") return say("ThundR moves: " + MOVES.join(", ")), true;
    const ok = m[1] === "mood" ? mood(m[2]) : move(m[2]); say(ok ? "ThundR · " + m[1] + " " + norm(m[2]) : "Unknown " + m[1] + ": " + m[2] + " (type " + m[1] + "s)"); return true; }
  addEventListener("keydown", (e) => { if (e.key !== "Enter" || !e.target.closest || !e.target.closest("#th-chat")) return; const i = e.target; if (command(i.value)) { e.preventDefault(); e.stopImmediatePropagation(); i.value = ""; } }, true);
  const api = { mood, move, fly, command, moods: () => MOODS.slice(), moves: () => MOVES.slice(), current: () => cur, base: () => BASE, setBase: (b) => (BASE = b), version: "1.0" };
  window.THUNDR_MOODS = api; window.THUNDR = Object.assign(window.THUNDR || {}, { mood, move, moods: api.moods, moves: api.moves });
})();

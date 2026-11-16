/* ThundR ONE-AT-A-TIME (merge v1, 2026-10-25 pt181u) · web layer only.
   Joins the MCR presence lock (127.0.0.1:8329 "thundr presence claim/beat/yield", same protocol as THUNDR-FLOAT thundr-orb.js)
   plus a BroadcastChannel between tabs. If another ThundR holds presence (float prio 100 / control-room 90) or a more-active tab
   has it, this orb flies toward it, then randomly HIGH-FIVES + merges (atlas/thundr-96-highfive.webp) or COLLIDES into a
   SUPERCHARGE (atlas/thundr-48-supercharged.webp crackle + shake + sparks), and hides. Re-emerges if the holder goes away. */
(function () {
  if (window.THUNDR_ONE) return; window.THUNDR_ONE = { version: "1.0.0" };
  const EP = "http://127.0.0.1:8329/v1/call/thundr_chat", A = "./skills/thundr-live/atlas/";
  const PRIO = 50, ROLE = "embed", HOST = (location.host || "page").replace(/\s/g, "_");
  const IID = ROLE + "-" + Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
  let orb = null, yielded = false, busy = false, peers = {}, lastActive = document.hasFocus() ? Date.now() : 0;
  const css = document.createElement("style");
  css.textContent =
    "#thundr-pin.th-one-gone,#th-chat.th-one-gone{display:none!important}" +
    "#th1-fx{position:fixed;z-index:2147483606;pointer-events:none;image-rendering:pixelated;display:none}" +
    "#th1-fx.hf{width:64px;height:32px;background:url(" + A + "thundr-96-highfive.webp) 0 0/768px 32px no-repeat;display:block;animation:th1hf 1.56s steps(12) forwards}@keyframes th1hf{to{background-position:-768px 0}}" +
    "#th1-fx.sc{width:36px;height:36px;background:url(" + A + "thundr-48-supercharged.webp) 0 0/432px 36px no-repeat;display:block;animation:th1sc .5s steps(12) 3,th1shake .1s linear 12}@keyframes th1sc{to{background-position:-432px 0}}@keyframes th1shake{50%{transform:translate(2px,-2px)}}" +
    ".th1-zap{position:fixed;z-index:2147483607;pointer-events:none;font:11px system-ui;animation:th1z .8s ease-out forwards}@keyframes th1z{0%{opacity:0;transform:scale(.4)}25%{opacity:1;transform:translate(calc(var(--x)*.4),calc(var(--y)*.4)) scale(1.3)}100%{opacity:0;transform:translate(var(--x),var(--y)) scale(.8)}}";
  document.head.appendChild(css);
  const fx = document.createElement("div"); fx.id = "th1-fx";
  function zap(x, y, n, big) { for (let i = 0; i < n; i++) { const z = document.createElement("div"); z.className = "th1-zap"; z.textContent = big && i % 3 === 0 ? "✨" : "⚡";
    const a = (i / n) * 6.283, d = (big ? 26 : 14) + Math.random() * 6; z.style.left = x + "px"; z.style.top = y + "px";
    z.style.setProperty("--x", Math.cos(a) * d + "px"); z.style.setProperty("--y", Math.sin(a) * d * .7 + "px"); document.body.appendChild(z); setTimeout(() => z.remove(), 1000); } }
  function call(text) { return fetch(EP, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ text }) }).then((r) => r.json()).catch(() => null); }
  function setGone(on) { orb.classList.toggle("th-one-gone", on); const c = document.getElementById("th-chat"); if (c) c.classList.toggle("th-one-gone", on); }
  function mergeOut(why) {
    if (busy || yielded) return; yielded = true; busy = true;
    const r = orb.getBoundingClientRect(), tx = 8 - r.left, ty = 8 - r.top, hf = Math.random() < .5;
    orb.style.transition = "transform .7s cubic-bezier(.5,-0.3,.6,1.4)"; orb.style.transform = "translate(" + tx + "px," + ty + "px) rotate(" + (hf ? -12 : 20) + "deg)";
    setTimeout(() => {
      const q = orb.getBoundingClientRect(), cx = q.left + q.width / 2, cy = q.top + 16;
      fx.className = ""; void fx.offsetWidth; fx.className = hf ? "hf" : "sc";
      fx.style.left = Math.max(0, cx - (hf ? 32 : 18)) + "px"; fx.style.top = Math.max(0, cy - 16) + "px";
      orb.style.opacity = "0";
      setTimeout(() => zap(cx, cy, hf ? 8 : 14, !hf), hf ? 620 : 200);
      setTimeout(() => { fx.className = ""; setGone(true); orb.style.transition = ""; orb.style.transform = ""; orb.style.opacity = ""; busy = false;
        call("selfheal-log: ThundR merged (" + (hf ? "high-five" : "collide → supercharge") + "): page " + HOST + " into " + why); }, hf ? 1600 : 1500);
    }, 720);
  }
  function emerge() { if (!yielded || busy) return; yielded = false; setGone(false); const r = orb.getBoundingClientRect(); zap(r.left + r.width / 2, r.top + 14, 6, false); }
  function decide(j) {
    const now = Date.now(); for (const k in peers) if (now - peers[k].ts > 8000) delete peers[k];
    if (j && j.holder && j.holder !== IID && (j.prio || 0) > PRIO && now / 1000 - (j.ts || 0) < 15) return mergeOut(j.role || "holder");
    const mine = { act: lastActive, id: IID };
    for (const k in peers) { const p = peers[k]; if (p.act > mine.act || (p.act === mine.act && p.id < mine.id)) return mergeOut("active tab"); }
    emerge();
  }
  function parse(r) { const s = String((r && (r.reply || r.output)) || ""); const m = s.match(/\{.*\}/); try { return m ? JSON.parse(m[0]) : null; } catch (e) { return null; } }
  let bc = null; try { bc = new BroadcastChannel("thundr-one"); bc.onmessage = (e) => { const d = e.data || {}; if (!d.id || d.id === IID) return;
    if (d.bye) delete peers[d.id]; else peers[d.id] = { id: d.id, act: d.act || 0, ts: Date.now() }; }; } catch (e) {}
  function beat(first) { if (bc) bc.postMessage({ id: IID, act: lastActive });
    call("thundr presence " + (first ? "claim " + IID + " " + PRIO + " " + ROLE + " " + HOST : "beat " + IID + " " + PRIO + " " + ROLE)).then((r) => decide(parse(r))); }
  function active() { lastActive = Date.now(); if (bc) bc.postMessage({ id: IID, act: lastActive }); setTimeout(() => beat(false), 50); }
  function boot() {
    orb = document.getElementById("thundr-pin"); if (!orb || !orb.classList.contains("th-orb")) return setTimeout(boot, 300);
    document.body.appendChild(fx); window.THUNDR_ONE.state = () => ({ id: IID, yielded, peers: Object.keys(peers).length });
    window.addEventListener("focus", active); document.addEventListener("visibilitychange", () => { if (!document.hidden) active(); });
    window.addEventListener("pagehide", () => { if (bc) bc.postMessage({ id: IID, bye: 1 }); call("thundr presence yield " + IID); });
    beat(true); setInterval(() => beat(false), 3000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();

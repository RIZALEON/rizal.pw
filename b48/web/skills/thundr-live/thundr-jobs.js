/* 2026-10-30 thundr-jobs.js · ThundR job board bars (read-only; 2026-11-07: relay → cache(stale) → 127.0.0.1:8329 → offline, every 15 s).
   While any job is not done: wake ThundR, keep the status window open, show overall bar + per-job bars (rotating 3 at a time). */
(function () {
  const PCT = { in_progress: 50, running: 50, waiting_rizal: 80, blocker: 20, blocked: 20, done: 100 };
  const pct = (j) => { const m = String(j.note || "").match(/(\d{1,3})\s*%/); return m ? Math.min(100, +m[1]) : (PCT[j.state] != null ? PCT[j.state] : 50); };
  const COL = { in_progress: "#57b7ff", running: "#57b7ff", waiting_rizal: "#ffd34d", blocker: "#ff6b6b", blocked: "#ff6b6b", done: "#7dffb0" };
  const css = document.createElement("style");
  css.textContent = "#th-jobs{position:fixed;left:2px;top:58px;width:230px;font:9px ui-monospace,Menlo,monospace;color:#eee;z-index:2147483602;display:none;background:rgba(18,14,30,.9);border:1px solid #6b4fd8;border-radius:6px;padding:2px 4px;box-sizing:border-box}" +
    "#th-jobs.on{display:block}#th-jobs .r{display:flex;align-items:center;gap:3px;height:10px}#th-jobs .n{flex:0 0 112px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    "#th-jobs .t{flex:1;height:5px;background:#333;border-radius:3px;overflow:hidden}#th-jobs .f{height:100%}#th-jobs .p{flex:0 0 26px;text-align:right}#th-jobs .h{color:#ffe46b}";
  document.head.appendChild(css);
  const box = document.createElement("div"); box.id = "th-jobs"; document.body.appendChild(box);
  const N = !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.float);
  let jobs = [], on = false, rot = 0;
  const esc = (x) => String(x == null ? "" : x).replace(/[&<>"]/g, (c) => "&#" + c.charCodeAt(0) + ";");
  const row = (name, p, c, cls) => '<div class="r ' + (cls || "") + '"><span class="n">' + esc(name) + '</span><span class="t"><span class="f" style="display:block;width:' + p + '%;background:' + c + '"></span></span><span class="p">' + p + '%</span></div>';
  function render() {
    if (!jobs.length) return;
    const all = Math.round(jobs.reduce((a, j) => a + pct(j), 0) / jobs.length);
    const act = jobs.filter((j) => j.state !== "done"); const k = 3, s = act.length ? (rot * k) % act.length : 0;
    const view = act.slice(s, s + k).concat(act.length > k ? act.slice(0, Math.max(0, s + k - act.length)) : []);
    box.innerHTML = row("ALL " + (jobs.length - act.length) + "/" + jobs.length + " done", all, "#c9b6ff", "h") + view.map((j) => row((j.owner || "?") + "·" + (j.title || j.id), pct(j), COL[j.state] || "#57b7ff")).join("");
  }
  function show(want) {
    on = want; box.classList.toggle("on", want);
    if (want && window.THUNDR_ORB && window.THUNDR_ORB.wake && !document.querySelector("#thundr-pin.awake")) try { window.THUNDR_ORB.wake(); } catch (e) {}
    if (N) try { window.webkit.messageHandlers.float.postMessage({ op: "status", open: want || !!(window.THUNDR_STATUS && window.THUNDR_STATUS._a && window.THUNDR_STATUS._a()) }); } catch (e) {}
  }
  // keep selfheal from shrinking the window while bars are up
  const hook = () => { const S = window.THUNDR_STATUS; if (!S || S._a) return !!S; S._a = S.active; S.active = () => on || S._a(); return true; };
  let logged = false;
  function log(text) { if (N) try { window.webkit.messageHandlers.float.postMessage({ op: "call", id: 920000 + Math.floor(Math.random() * 9999), tool: "thundr_chat", text }); } catch (e) {} }
  function bridge() { if (!N) return Promise.resolve(null); return new Promise((res) => { const id = 930000 + Math.floor(Math.random() * 9999), prev = window.THUNDR_REPLY;
    const t = setTimeout(() => { window.THUNDR_REPLY = prev; res(null); }, 8000);
    window.THUNDR_REPLY = (i, b) => { if (i === id) { clearTimeout(t); window.THUNDR_REPLY = prev; res(b && b.reply); } else prev && prev(i, b); };
    try { window.webkit.messageHandlers.float.postMessage({ op: "call", id, tool: "thundr_chat", text: "PROGRESS" }); } catch (e) { res(null); } }); }
  const SEC = { "RUNNING": "in_progress", "WAITING ON RIZAL": "waiting_rizal", "BLOCKED": "blocker", "BLOCKERS": "blocker", "DONE": "done" };
  function parse(t) { let st = null; const out = []; String(t).split("\n").forEach((l) => { const h = l.match(/^([A-Z ]+?)\s*\(\d+\)/); if (h) { st = SEC[h[1].trim()] || st; return; }
    const m = l.match(/^\s*•\s*(.*?)\s+—\s+(\S+)\s+·\s+[^·]*?(?:·\s*(.*?))?\s*\[([^\]]+)\]\s*$/); if (m && st) out.push({ id: m[4], title: m[1], owner: m[2], note: m[3] || "", state: st }); }); return out; }
  /* 2026-11-07 jobs-sources: try sources in order. 2026-11-08: do not leave an empty offline bar on screen.
     (a) website/ЯSYNC relay: window.THUNDR_JOBS_SOURCES, localStorage "thundr.jobs.sources" (JSON array or comma list),
         RDRAGON_CONFIG.jobsEndpoint, then the published board https://rizal.pw/status/jobs.json (GHOSTMACHINE/STATUS/publish.py)
     (b) last good list cached in localStorage "thundr.jobs.cache.v1" (shown "stale")
     (c) http://127.0.0.1:8329/v1/jobs (Neo MCR, optional peer), then the native float bridge.
     All fail → hide the empty offline strip (20261109-meterbar: never paint ALL ?/? / offline / 0/0). */
  const LOCAL = "http://127.0.0.1:8329/v1/jobs", CK = "thundr.jobs.cache.v1", PUB = "https://rizal.pw/status/jobs.json";
  let mode = "";
  function relays() {
    let l = [];
    try { if (Array.isArray(window.THUNDR_JOBS_SOURCES)) l = l.concat(window.THUNDR_JOBS_SOURCES); } catch (e) {}
    try { const v = localStorage.getItem("thundr.jobs.sources"); if (v) l = l.concat(/^\s*\[/.test(v) ? JSON.parse(v) : v.split(",")); } catch (e) {}
    try { const c = window.RDRAGON_CONFIG; if (c && c.jobsEndpoint) l.push(c.jobsEndpoint); } catch (e) {}
    l.push(PUB);
    const seen = {}; return l.map((u) => String(u || "").trim()).filter((u) => /^https:\/\//i.test(u) && !seen[u] && (seen[u] = 1));
  }
  const get = (u) => { const c = typeof AbortController === "function" ? new AbortController() : null, t = c && setTimeout(() => c.abort(), 6000);
    return fetch(u, { cache: "no-store", signal: c && c.signal }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then((j) => { if (!j || !Array.isArray(j.jobs)) throw new Error("no jobs"); return j; }).finally(() => t && clearTimeout(t)); };
  const first = (urls) => urls.reduce((p, u) => p.catch(() => get(u).then((j) => ({ j, u }))), Promise.reject());
  const cacheGet = () => { try { const c = JSON.parse(localStorage.getItem(CK) || "null"); return c && Array.isArray(c.jobs) ? c : null; } catch (e) { return null; } };
  const cachePut = (list, via) => { try { localStorage.setItem(CK, JSON.stringify({ jobs: list, via, at: new Date().toISOString() })); } catch (e) {} };
  function label() { const h = box.querySelector(".r.h .n"); if (h && mode) h.textContent += " · " + mode; }
  function offline() {
    jobs = []; mode = "offline"; box.innerHTML = ""; show(false);  /* 20261109-meterbar: never leave a dead offline/?/? bar */
  }
  function upd() {
    hook();
    const apply = (list, via, m) => { jobs = list || []; mode = m || ""; const live = jobs.some((x) => x.state !== "done");
      if (!jobs.length) { box.innerHTML = ""; show(false); }  /* 20261109-meterbar: hide when empty/offline/unreachable */
      else { render(); label(); show(live || !!mode); }
      if (!logged) { logged = true; log("selfheal-log: thundr-jobs " + via + " · " + jobs.length + " jobs · bars " + (live ? "on" : "off") + (mode ? " · " + mode : "")); } };
    const good = (list, via) => { cachePut(list, via); apply(list, via, ""); };
    first(relays()).then((r) => good(r.j.jobs, "relay " + r.u))
      .catch(() => {
        const c = cacheGet(); if (c) apply(c.jobs, "cache", "stale " + String(c.at || "").slice(5, 16).replace("T", " "));
        return get(LOCAL).then((j) => good(j.jobs, "fetch"))
          .catch(() => bridge().then((t) => { const l = t ? parse(t) : []; if (l.length) good(l, "bridge"); else if (!c) offline(); }));
      });
  }
  window.THUNDR_JOBS_SOURCES_LIST = () => relays().concat(["cache:" + CK, LOCAL]);
  setInterval(() => { if (on) { rot++; render(); } }, 5000);
  setInterval(() => { if (on && N && (innerHeight < 100 || innerWidth < 230)) show(true); }, 1500);
  setTimeout(() => log("selfheal-log: thundr-jobs window " + innerWidth + "x" + innerHeight + " on=" + on), 12000);
  upd(); setInterval(upd, 15000);
  window.THUNDR_JOBS = { upd, on: () => on, version: "1.1.1-meterbar", sources: () => window.THUNDR_JOBS_SOURCES_LIST() };
})();

/* 2026-10-30 progressslot (pt355u): while the RDOS chat panel (#th-chat.open) is open, the jobs box moves INTO the panel
   in the WALLET/CASKET/SCAN/SIGNING/MCR meter slot and the meters are hidden (code/data untouched). Click the "ALL n/m done"
   header to flip back to meters (click a meter row to flip back to jobs). Panel closed → jobs box floats again, meters restored. */
(function () {
  const css = document.createElement("style");
  css.textContent = "#th-jobs.th-inslot{position:static!important;width:auto!important;border:0!important;border-bottom:1px solid #3a2d70!important;border-radius:0!important;background:transparent!important;padding:4px 8px!important;cursor:pointer}" +
    "#th-chat-strips.th-slot-hidden{display:none!important}#th-chat-strips.th-slot-back{cursor:pointer}";
  document.head.appendChild(css);
  let meters = false; // user flipped to meters while panel open
  function sync() {
    const box = document.getElementById("th-jobs"), chat = document.getElementById("th-chat"), cs = document.getElementById("th-chat-strips");
    if (!box) return;
    const open = !!(chat && chat.classList.contains("open"));
    const jobsOn = box.classList.contains("on");
    if (open && cs && jobsOn) {
      if (box.parentNode !== chat || box.previousElementSibling !== cs) cs.insertAdjacentElement("afterend", box);
      box.classList.add("th-inslot");
      box.style.display = meters ? "none" : "";
      cs.classList.toggle("th-slot-hidden", !meters); cs.classList.toggle("th-slot-back", meters);
    } else {
      if (box.parentNode !== document.body) document.body.appendChild(box);
      box.classList.remove("th-inslot"); box.style.display = "";
      if (cs) cs.classList.remove("th-slot-hidden", "th-slot-back");
      if (!open) meters = false;
    }
  }
  document.addEventListener("click", (e) => {
    if (e.target.closest && e.target.closest("#th-jobs.th-inslot")) { meters = true; sync(); }
    else if (e.target.closest && e.target.closest("#th-chat-strips.th-slot-back")) { meters = false; sync(); }
  }, true);
  setInterval(sync, 400); sync();
  window.THUNDR_JOBS_SLOT = { sync, meters: (v) => { if (v !== undefined) { meters = !!v; sync(); } return meters; }, version: "1.0.0" };
})();

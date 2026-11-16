/* DS-PACK · behavior: drawer (DS-NAV-01), tabs (DS-NAV-02), theme (DS-BTN-06), labels (DS-BTN-07),
   live chips (DS-CHIP-01..03, read-only GET polling), quick commands (DS-BAR-04). Keeps #log/#composer/#message hooks. */
(function(){"use strict";
 const $=q=>document.querySelector(q), $$=q=>[...document.querySelectorAll(q)], B=document.body;
 const BASE=window.DS_BASE!==undefined?window.DS_BASE:(location.port==="8319"?"":"http://127.0.0.1:8319");
 const wide=()=>matchMedia("(min-width:901px)").matches;
 // DS-APP-00 adapter: tag pieces injected later (dragonbridge.js gate/chips) and move gate into main. Classes/attrs only; no handlers touched.
 const TAG={"#ds-status":"DS-CHIP-01","#ds-mind":"DS-CHIP-02","#ds-mind-btn":"DS-CHIP-02","#ds-net":"DS-CHIP-03","#ds-db2":"DS-CHIP-04","#ds-gate":"DS-BAR-02","#ds-estop":"DS-BTN-03","#ds-menu-btn":"DS-BTN-05","#rbs-plus":"DS-BTN-02"};
 const NAMES={"DS-CHIP-01":"ENGINE","DS-CHIP-02":"MIND","DS-CHIP-03":"NET","DS-CHIP-04":"DRAGONBRIDGE","DS-BAR-02":"Approval Gate Bar","DS-BTN-03":"Emergency Stop","DS-BTN-05":"Menu Button","DS-BTN-02":"Plus Button"};
 function tag(){ for(const q in TAG){const e=$(q); if(e&&!e.dataset.dsId){e.dataset.dsId=TAG[q]; e.dataset.dsName=NAMES[TAG[q]]; if(q==="#ds-gate"){e.classList.add("ds-gate"); const m=$("main"); if(m&&e.parentNode!==m) m.appendChild(e);} else if(/CHIP/.test(TAG[q])){ e.classList.add("ds-chip"); if(q==="#ds-mind-btn"){ e.style.opacity=""; e.style.fontSize=""; e.style.marginLeft=""; if(!e.dataset.state) e.dataset.state="ok"; } } if(q==="#ds-menu-btn") e.addEventListener("click",()=>{ if(wide()) B.classList.toggle("ds-nav-collapsed"); });}} }
 tag(); setInterval(tag,1500);
 // DS-BTN-05 Menu: docked collapse on laptop, slide-over drawer on mobile. Fixes stuck blank panel.
 function nav(open){ if(wide()) B.classList.toggle("ds-nav-collapsed",open===undefined?undefined:!open); else B.classList.toggle("ds-nav-open",open); }
 $$('[data-ds-id="DS-BTN-05"]').forEach(b=>b.onclick=()=>nav());
 $('[data-ds-id="DS-OVL-01"]')?.addEventListener("click",()=>nav(false));
 // DS-BTN-06 Theme switch
 const th=localStorage.getItem("ds-theme")||"dark"; document.documentElement.dataset.dsTheme=th;
 $$('[data-ds-id="DS-BTN-06"]').forEach(b=>b.onclick=()=>{const n=document.documentElement.dataset.dsTheme==="dark"?"ember":"dark";document.documentElement.dataset.dsTheme=n;localStorage.setItem("ds-theme",n);});
 // DS-BTN-07 Labels: off -> all -> hover -> off
 $$('[data-ds-id="DS-BTN-07"]').forEach(b=>b.onclick=()=>{ if(!B.classList.contains("ds-labels")){B.classList.add("ds-labels");b.textContent="🏷 all";} else if(!B.classList.contains("ds-labels-hover")){B.classList.add("ds-labels-hover");b.textContent="🏷 hover";} else {B.classList.remove("ds-labels","ds-labels-hover");b.textContent="🏷";} });
 if(/[?&]labels=1/.test(location.search)) B.classList.add("ds-labels");
 // DS-NAV-02 tabs
 $$('[data-ds-id="DS-NAV-02"] button').forEach(t=>t.onclick=()=>{ $$('[data-ds-id="DS-NAV-02"] button').forEach(x=>x.removeAttribute("aria-current")); t.setAttribute("aria-current","page"); if(t.dataset.tab==="chats") nav(true); else nav(false); });
 // DS-BAR-04 quick commands: fill the field and submit through the normal composer (so existing gates apply)
 $$('[data-ds-id="DS-BAR-04"] [data-cmd]').forEach(b=>b.onclick=()=>{const m=$("#message"),f=$("#composer"); if(!m||!f) return; m.value=b.dataset.cmd; f.requestSubmit?f.requestSubmit():f.dispatchEvent(new Event("submit",{cancelable:true}));});
 // DS-CHIP live states (read-only GETs; no POST)
 const set=(id,s,t)=>{const c=$(`[data-ds-id="${id}"]`); if(c){c.dataset.state=s; if(t) c.title=t;}};
 async function get(p){const r=await fetch(BASE+p,{cache:"no-store"}); if(!r.ok) throw r.status; return r.json();}
 async function poll(){ if(window.DS_DEMO) return;
  get("/engine/health").then(j=>set("DS-CHIP-01",j.status==="ok"?"ok":"warn","engine "+j.status)).catch(()=>set("DS-CHIP-01","err","engine unreachable"));
  get("/bridge/status").then(j=>{set("DS-CHIP-02",j.rvm==="up"?"ok":/fail|stop/.test(j.rvm)?"err":"warn","RVM "+j.rvm);
   const n=$('[data-ds-id="DS-CHIP-03"]'); if(n){n.dataset.state=j.net==="on"?"ok":"warn"; n.textContent="NET "+(j.net==="on"?"ONLINE":"OFFLINE");}
   const g=$('[data-ds-id="DS-BAR-02"] .count'); if(g) g.textContent=(j.pending||[]).length;}).catch(()=>set("DS-CHIP-02","err","bridge unreachable"));
  get("/api/history?since=999999999").then(()=>set("DS-CHIP-05","ok","history log reachable")).catch(()=>set("DS-CHIP-05","err","history log unreachable")); }
 poll(); setInterval(poll,5000);
 window.DS_UI={nav,poll};
})();

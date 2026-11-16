/* DS-HIST-01 History Sync (pack rev) · DS-HISTORY: persistent, append-only conversation view. Never deletes.
   2026-10-23 HARD RULE: chat history is never removed from this window. DELETE CHAT HISTORY only sets a server-side
   view cutoff (history file untouched); turns at/below it are hidden (display:none), never removed. SHOW CHAT HISTORY restores. No display cap. */
(function(){"use strict";
 if(window.__DS_HIST) return; window.__DS_HIST=1; /* 2026-10-23: one instance (web + overlay copies both load on 8319) */
 const B=/^https?:$/.test(location.protocol)?"":"http://127.0.0.1:8319"; /* always the serving app's own history */
 const seen=new Set(); let last=0, cut=-1, mine=[]; const posted=new Set();
 const log=()=>document.querySelector("#log");
 function place(L,d,id){ const nx=[...L.children].find(c=>c.dataset&&+c.dataset.hid>id); if(nx) L.insertBefore(d,nx); else L.appendChild(d); }
 function draw(e){ const L=log(); if(!L||seen.has(e.id)) return; seen.add(e.id);
  const N=x=>String(x).replace(/\s+/g," ").trim(); const i=mine.findIndex(m=>m.role===e.role&&N(m.text)===N(e.text)); /* whitespace-insensitive dedupe (display only) */ if(i>=0){mine.splice(i,1);return;}
  const d=document.createElement("div"); d.className="turn "+(e.role==="user"?"user":"bot"); d.dataset.hid=e.id;
  const who=e.role==="user"?(e.source&&e.source!=="web"&&e.source!=="app"?e.source:"You"):(e.source==="RBATIBA"?"RDRAGON (to RBATIBA)":"RDRAGON");
  let body=String(e.text); const pre=who+":"; if(body.startsWith(pre)) body=body.slice(pre.length).trimStart(); /* DS-FIX-01 */
  const tag=(e.source&&e.source!=="web"&&e.source!=="app")?" ["+e.source+" · "+String(e.t||"").slice(11,19)+"]":""; const w=document.createElement("span"); w.className="who"; w.textContent=who+tag+":"; d.dataset.dsId=e.role==="user"?"DS-MSG-01":"DS-MSG-02"; d.append(w," "+body); d.title=e.t+" · "+(e.source||""); place(L,d,e.id); d.scrollIntoView(); }
 function applyCut(c){ const L=log(); if(!L) return; const ts=[...L.querySelectorAll(".turn")];
  if(c>0){ const keep=new Set(ts.filter(n=>!n.dataset.hid).slice(-2)); /* the DELETE command + its reply stay visible */
   ts.forEach(n=>{ const h=+n.dataset.hid||0; if((h&&h<=c)||(!h&&!keep.has(n))) n.style.display="none"; }); }
  else ts.forEach(n=>{ n.style.display=""; }); }
 async function pull(){ try{ const r=await (await fetch(B+"/api/history?since="+last)).json(); const c=+r.cutoff||0;
   if(cut>=0&&c!==cut){ applyCut(c); if(c<cut){ const a=await (await fetch(B+"/api/history?since=0&all=1")).json(); (a.entries||[]).forEach(draw); } }
   cut=c; (r.entries||[]).forEach(e=>{draw(e); last=Math.max(last,e.id);}); if(!last&&r.last) last=Math.max(last,+r.last||0); }catch(_){} }
 function watch(){ const L=log(); if(!L) return setTimeout(watch,500);
  new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{
   if(n.nodeType!==1||!n.classList.contains("turn")||n.dataset.hid) return;
   let prev=null,k=0,t=setInterval(()=>{ const s=n.textContent; if(s!==prev){prev=s;return;} if(/^[^:]{0,40}:?\s*[.…]/.test(s)&&++k<120) return; /* wait out "…thinking" */ clearInterval(t);
    const role=n.classList.contains("user")?"user":"assistant"; const text=s.replace(/^[^:]{1,40}:\s*/,"").trim();
    if(!text||/^[.…]/.test(text)) return; const key=role+"|"+text.replace(/\s+/g," "); if(posted.has(key)) return; posted.add(key); setTimeout(()=>posted.delete(key),15000); mine.push({role,text});
    fetch(B+"/api/history",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({role,text,source:B?"app":"web"})}).then(r=>r.json()).then(r=>{if(r.id){n.dataset.hid=r.id;}}).catch(()=>{});
   },1500); }))).observe(L,{childList:true});
  pull(); setInterval(pull,2000); }
 // UI "clear" may only hide: history lives server-side and is re-rendered on load (from the view cutoff).
 if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",watch); else watch();
})();

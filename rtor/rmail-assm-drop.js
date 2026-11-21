/* rmail-assm-drop.js v1 (2026-11-21, Decider pt599u: "On the Rtor and RTRACKR sites behind the ASSM login")
   RMAIL drop for the RTOR + RTRACKR pages. Delivers a message to ghost@rizal.pw / @chaserizal (RDRAGON inbox) through the
   EXISTING ASSM-RSYNC server (the one ЯLOGIN option 3 already uses; Rizal GO t224) — no new server, no new port, no new tunnel.
   How: the signed-in device's own non-extractable P-256 key (IndexedDB rdragon.csp.keys/device, made by ЯLOGIN) signs
     1. an inner rmail-assm-drop-v1 signature over the message, and
     2. a standard rcode-sync-v1 push envelope to <ASSM live URL>/v1/sync/changes (kind "message", chat "rmail-drop").
   The ASSM server accepts the push ONLY from a device Rizal approved (trusted or enrolled). On Neo, a forwarder re-checks the inner
   signature against a two-entry allowlist (Rizal's own login + ONE bot test login); anything else waits for Rizal's manual approval,
   then is handed to the local RMAIL hub drop -> ghost inbox -> 17e/moto/pixel mirrors.
   Signed-out visitors see a sign-in prompt only. Queued items in this browser's RMAIL outbox (rmail.outbox) can be sent from here.
   SECURITY: no keys, passwords, tokens, LAN addresses or URLs of private hosts in this file. The ASSM URL is read at runtime from
   the public /api/rsync/entries feed. Private keys never leave the browser (WebCrypto, non-extractable). Add-only. */
(function(w,d){"use strict";if(w.RMAIL_ASSM)return;
var FEED="/api/rsync/entries",OWNER="@chaserizal",OWNER_RID="ЯID-0001-3QQS",OB="rmail.outbox",TE=new TextEncoder(),S=w.crypto&&w.crypto.subtle;
var ST={dev:null,live:null,status:"checking",log:[]};
function E(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function b64(u){u=new Uint8Array(u);var s="";for(var i=0;i<u.length;i++)s+=String.fromCharCode(u[i]);return btoa(s)}
function hex(u){return Array.prototype.map.call(new Uint8Array(u),function(x){return("0"+x.toString(16)).slice(-2)}).join("")}
function sha(s){return S.digest("SHA-256",TE.encode(s)).then(hex)}
/* same canonical form as ASSM-RSYNC sync.py _canon (sorted keys, JSON strings, no spaces) */
function canon(v){if(Array.isArray(v))return"["+v.map(canon).join(",")+"]";if(v&&typeof v==="object")return"{"+Object.keys(v).sort().map(function(k){return JSON.stringify(k)+":"+canon(v[k])}).join(",")+"}";return JSON.stringify(v)}
function nonce(){var a=new Uint8Array(16);w.crypto.getRandomValues(a);return hex(a)}
function say(t){ST.log.unshift(new Date().toLocaleTimeString()+"  "+t);ST.log=ST.log.slice(0,20);var el=d.getElementById("rmd-log");if(el)el.textContent=ST.log.join("\n")}
function J(k,v){try{return JSON.parse(localStorage.getItem(k))||v}catch(e){return v}}
/* ---- device (read-only: never writes the key store) ---- */
function device(){if(ST.dev)return Promise.resolve(ST.dev);return new Promise(function(ok){try{var q=indexedDB.open("rdragon.csp.keys",1);q.onupgradeneeded=function(){q.result.createObjectStore("k")};
 q.onsuccess=function(){try{var t=q.result.transaction("k").objectStore("k").get("device");t.onsuccess=function(){ok(t.result||null)};t.onerror=function(){ok(null)}}catch(e){ok(null)}};q.onerror=function(){ok(null)}}catch(e){ok(null)}})
 .then(function(r){var kp=r&&(r.kp||r.skp);if(!kp||!kp.privateKey||!kp.publicKey||r.out)return null;
  return S.exportKey("raw",kp.publicKey).then(function(raw){ST.dev={pub:b64(raw),key:kp.privateKey,identity:(typeof r.profile==="string"&&r.profile)||OWNER_RID};return ST.dev})}).catch(function(){return null})}
function sign(key,msg){return S.sign({name:"ECDSA",hash:"SHA-256"},key,TE.encode(msg)).then(b64)}
function live(){return fetch(FEED,{cache:"no-store"}).then(function(r){return r.json()}).then(function(j){var u=String(j&&j.live||"");if(!/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(u))throw Error("ASSM server offline (no live URL published)");ST.live=u;return u})}
function status(){return Promise.all([device(),live().catch(function(e){return null})]).then(function(a){var dv=a[0],u=a[1];
 if(!dv){ST.status="signed-out";return ST.status}if(!u){ST.status="offline";return ST.status}
 return fetch(u+"/api/rsync/device-status?pub="+encodeURIComponent(dv.pub),{cache:"no-store",credentials:"omit"}).then(function(r){return r.json()}).then(function(j){
  var s=String(j&&(j.status||j.state)||"unknown").toLowerCase(),pr=(j&&Array.isArray(j.profiles))?j.profiles:[];if(s==="enrolled"&&pr.length&&pr.indexOf(dv.identity)<0)dv.identity=pr[0];ST.status=/^(trusted|enrolled)$/.test(s)?"ready":"not-approved";return ST.status}).catch(function(){ST.status="offline";return ST.status})})}
/* ---- send one RMAIL message (same shape as rsocial-rmail.js v2) ---- */
function drop(m){return device().then(function(dv){if(!dv)throw Error("sign in with ASSM first");return(ST.live?Promise.resolve(ST.live):live()).then(function(u){
 var ts=new Date().toISOString(),text=String(m.text||"").slice(0,4000),subj=String(m.subject||"").slice(0,200),to=String(m.to||OWNER).slice(0,120),from=String(m.from||OWNER).slice(0,120),id=String(m.id||(Date.now().toString(36)+nonce().slice(0,6))).slice(0,80);
 return sha(text).then(function(th){return sign(dv.key,["rmail-assm-drop-v1",id,to,from,ts,th].join("\n"))}).then(function(isig){
  var rm={schema:"rmail.assm-drop.v1",id:id,to:to,to_addr:String(m.to_addr||to).slice(0,120),from:from,from_addr:String(m.from_addr||from).slice(0,120),subject:subj,text:text,origin:location.host||"site",ts:ts,device:dv.pub,isig:isig};
  var rec={id:"rmail-drop:"+id,kind:"message",deleted:false,device_id:"assm-web",sent_at:ts,updated_at:ts,payload:{chat_id:"rmail-drop",id:id,is_user:true,sender:"RMAIL",sent_at:ts,text:(subj?subj+" · ":"")+text,rmail:rm}};
  var recs=[rec],n=nonce();return sha(canon(recs)).then(function(h){return sign(dv.key,["rcode-sync-v1","push",dv.identity,dv.pub,n,ts,h].join("\n"))}).then(function(sig){
   return fetch(u+"/v1/sync/changes",{method:"POST",credentials:"omit",headers:{"Content-Type":"application/json"},body:JSON.stringify({identity:dv.identity,device:dv.pub,ts:ts,nonce:n,sig:sig,records:recs})})})
  .then(function(r){return r.json().catch(function(){return{}}).then(function(j){if(!r.ok||!j.ok||!j.accepted)throw Error((j&&j.error)||("http-"+r.status));return{ok:true,id:id,via:"assm-rsync",cursor:j.cursor}})})})})})}
/* send this browser's queued rsocial-rmail outbox items; marks them sent the same way rsocial-rmail.js does */
function flush(){var o=J(OB,[]),todo=o.filter(function(m){return m&&!m.sent});if(!todo.length){say("outbox: nothing waiting");return Promise.resolve(0)}
 return todo.reduce(function(p,m){return p.then(function(){return drop({id:m.id,to:m.to,to_addr:m.to_addr,from:m.from,from_addr:m.from_addr,subject:m.subject,text:m.text||m.body}).then(function(a){m.sent=Date.now();m.ack=a;say("sent "+m.id+" via ASSM")},function(e){say("outbox "+m.id+": "+e.message)})})},Promise.resolve()).then(function(){try{localStorage.setItem(OB,JSON.stringify(o))}catch(e){}return todo.length})}
/* ---- panel ---- */
function mount(){var host=d.getElementById("rmail-assm-drop");if(!host){host=d.createElement("section");host.id="rmail-assm-drop";var f=d.querySelector("body>footer");if(f)f.parentNode.insertBefore(host,f);else d.body.appendChild(host)}host.className="rmd";
 if(!d.getElementById("rmd-css")){var s=d.createElement("link");s.id="rmd-css";s.rel="stylesheet";s.href="/rtor/rmail-assm-drop.css?v=1";d.head.appendChild(s)}return host}
function render(){var h=mount(),st=ST.status,q=J(OB,[]).filter(function(m){return m&&!m.sent}).length;
 if(st==="ready")h.innerHTML='<h3>✉ RMAIL · send to '+OWNER+' (ghost@rizal.pw)</h3><input id="rmd-subj" maxlength="200" placeholder="subject"><textarea id="rmd-text" rows="4" maxlength="4000" placeholder="message"></textarea><button data-rmd="send">Send via ASSM</button>'+(q?'<button data-rmd="flush">Send queued outbox ('+q+')</button>':'')+'<pre id="rmd-log">'+E(ST.log.join("\n"))+'</pre><small>Signed with this device\'s own key. Delivered by the ASSM server to the RDRAGON inbox on Neo. No keys or passwords on this page.</small>';
 else h.innerHTML='<h3>🔐 RMAIL drop · ASSM sign-in required</h3><div>'+({"signed-out":"Sign in with ASSM (ЯLOGIN option 3, approved by Rizal) on rizal.pw to send RMAIL from here.","not-approved":"This device is not approved yet. Ask Rizal to approve its 8-digit code.","offline":"The ASSM server is offline right now. Your message stays in this browser\'s outbox.","checking":"Checking ASSM sign-in…"}[st]||st)+'</div><a class="rmd-a" href="https://rizal.pw/login/options/">Open ЯLOGIN →</a>'}
d.addEventListener("click",function(e){var b=e.target&&e.target.closest&&e.target.closest("[data-rmd]");if(!b)return;e.preventDefault();
 if(b.dataset.rmd==="flush"){flush().then(render);return}
 var t=d.getElementById("rmd-text"),sj=d.getElementById("rmd-subj");if(!t||!t.value.trim()){say("write a message first");return}b.disabled=true;
 drop({to:OWNER,subject:sj&&sj.value,text:t.value}).then(function(a){say("delivered to ASSM · "+a.id+" · Neo forwards it to the RDRAGON inbox");t.value="";if(sj)sj.value=""},function(e){say("not sent: "+e.message)}).then(function(){b.disabled=false})});
w.RMAIL_ASSM={VERSION:1,status:status,send:drop,flush:flush,canon:canon,render:render};
function boot(){render();status().then(render)}if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",boot);else boot();
})(window,document);

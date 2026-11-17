/* rassm-site-gate.js v1 (2026-11-16, pt264u) — ASSM sign-in gate for the FULL RWALLET v6 (0.1.5) on rizal.pw / rizal.info.
   STAGED ONLY. Not published. Publishing needs Rizal's own separate go.
   Same sign-in RCODE uses (ASSMKit ASSMProvider <- rsync-core.js):
     1 this browser makes its own P-256 device key (WebCrypto, NON-extractable, IndexedDB "assm.site.keys", add-only),
     2 signs "rsync-enroll-v1\n<pub>\n<nonce>\n<ts>" and POSTs t:"device.request" to <ASSM server>/api/rsync/request -> 8-digit code,
     3 Rizal approves the code on an already-trusted device (RDRAGON / RCODE / GHOSTMACHINE),
     4 this page polls /api/rsync/device-status?pub=<pub> until it is enrolled to the owner profile (or is a trusted device).
   Also accepts a same-origin ЯLOGIN session for @chaserizal (rdragon.csp.rlogin-session.v1, written by /login).
   !! STATIC SITE = CLIENT-SIDE GATE ONLY. GitHub Pages serves every file to anyone who asks for its URL, so this hides the wallet UI,
   it does not protect it. The page holds NO secrets (no keys, passwords, tokens, LAN addresses). Every signature (mint, trade, swap,
   buy, sell, approvals) stays on Rizal's own device in RWALLET / RGHOSTKEY behind his single unlock. Real protection = the ASSM server. */
(function(w,d){"use strict";if(w.RASSM_SITE_GATE)return;
var OWNER="@chaserizal",OWNER_RID="ЯID-0001-3QQS",OWNER_PROFILE=(w.RDRAGON_CONFIG&&w.RDRAGON_CONFIG.founder&&w.RDRAGON_CONFIG.founder.profile)||"RP-f949699f8054dff9";
var SK="rdragon.csp.rlogin-session.v1",AK="assm.site.session.v1",enc=new TextEncoder(),POLL=null;
function server(){var m=d.querySelector('meta[name="assm-server-url"]');return String(w.ASSM_SERVER_URL||(m&&m.content)||"https://ASSM_SERVER_URL").replace(/\/+$/,"")}
function live(){return !/ASSM_SERVER_URL/.test(server())}
function b64(buf){var s="",a=new Uint8Array(buf);for(var i=0;i<a.length;i++)s+=String.fromCharCode(a[i]);return btoa(s)}
function H(h){h=String(h||"").trim().replace(/^@+/,"");return h?"@"+h.toLowerCase():""}
function J(k){try{return JSON.parse(localStorage.getItem(k)||"null")}catch(e){return null}}
function idb(){return new Promise(function(ok,no){var q=indexedDB.open("assm.site.keys",1);q.onupgradeneeded=function(){q.result.createObjectStore("k")};q.onsuccess=function(){ok(q.result)};q.onerror=function(){no(q.error)}})}
function kv(db,k){return new Promise(function(ok){var g=db.transaction("k").objectStore("k").get(k);g.onsuccess=function(){ok(g.result)};g.onerror=function(){ok(undefined)}})}
function add(db,k,v){return new Promise(function(ok){var t=db.transaction("k","readwrite");t.objectStore("k").add(v,k);t.oncomplete=function(){ok(true)};t.onerror=function(){ok(false)}})}
function deviceKey(create){return idb().then(function(db){return kv(db,"device").then(function(kp){if(kp||!create)return kp||null;
 return crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},false,["sign","verify"]).then(function(n){return add(db,"device",n).then(function(){return n})})})})
 .then(function(kp){if(!kp)return null;return crypto.subtle.exportKey("raw",kp.publicKey).then(function(raw){return{kp:kp,pub:b64(raw)}})})}
function nonce(){var a=new Uint8Array(12);crypto.getRandomValues(a);return b64(a).replace(/[+/=]/g,"")||"n0nce000"}
function get(p){return fetch(server()+p,{cache:"no-cache",credentials:"omit"}).then(function(r){return r.json().catch(function(){return{}}).then(function(j){j.status=r.status;return j})})}
function post(p,b){return fetch(server()+p,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b),credentials:"omit"}).then(function(r){return r.json().catch(function(){return{}}).then(function(j){j.status=r.status;return j})})}
/* ---- state ---- */
function rlogin(){var s=J(SK);return s&&s.v===1&&!s.out&&H(s.handle)===OWNER?{handle:OWNER,from:"ЯLOGIN"}:null}
function assm(){var s=J(AK);return s&&s.owner&&!s.out?{handle:OWNER,from:"ASSM device "+String(s.pub||"").slice(0,10)+"…"}:null}
function session(){return rlogin()||assm()}
function ownerStatus(j){return !!(j&&j.ok&&(j.trusted||(j.enrolled&&((j.profiles||[]).indexOf(OWNER_PROFILE)>=0||j.profile===OWNER_PROFILE))))}
function check(){if(!live())return Promise.resolve(session());return deviceKey(false).then(function(k){if(!k)return session();
 return get("/api/rsync/device-status?pub="+encodeURIComponent(k.pub)).then(function(j){if(ownerStatus(j)){localStorage.setItem(AK,JSON.stringify({v:1,owner:true,pub:k.pub,at:new Date().toISOString()}))}
  else{var s=J(AK);if(s&&s.pub===k.pub&&!s.out){s.out=true;s.revokedAt=new Date().toISOString();localStorage.setItem(AK,JSON.stringify(s))}}return session()}).catch(function(){return session()})})}
function signIn(ui){if(!live()){ui("The ASSM server is not live yet (needs the real server and Rizal's go). Use ЯLOGIN on this site meanwhile.",1);return Promise.resolve(null)}
 return deviceKey(true).then(function(k){var n=nonce(),ts=new Date().toISOString(),name=("site "+location.hostname).slice(0,80);
  return crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},k.kp.privateKey,enc.encode("rsync-enroll-v1\n"+k.pub+"\n"+n+"\n"+ts)).then(function(sig){
   return post("/api/rsync/request",{t:"device.request",device:k.pub,nonce:n,req_ts:ts,req_sig:b64(sig),device_name:name})}).then(function(r){
   if(!r.ok){ui("Request refused: "+(r.error||r.status),1);return null}
   ui("Approve code <b>"+r.code+"</b> on one of your trusted devices (RDRAGON / RCODE / GHOSTMACHINE). Waiting…");
   var end=Date.now()+10*60*1000;clearInterval(POLL);return new Promise(function(ok){POLL=setInterval(function(){if(Date.now()>end){clearInterval(POLL);ui("No approval within 10 minutes. Try again.",1);ok(null);return}
    check().then(function(s){if(s&&/ASSM/.test(s.from)){clearInterval(POLL);ok(s)}})},5000)})})}).catch(function(e){ui(String(e&&e.message||e),1);return null})}
function signOut(){var s=J(AK);if(s){s.out=true;s.outAt=new Date().toISOString();localStorage.setItem(AK,JSON.stringify(s))}}
/* ---- mount: <div id="assm-gate" data-wallet="/rwallet-v6/index.html"></div> ---- */
function mount(el){el=el||d.getElementById("assm-gate");if(!el)return;var src=el.getAttribute("data-wallet")||"/rwallet-v6/index.html";var login=el.getAttribute("data-login")||"/login/";
 function ui(m,err){var s=el.querySelector(".ag-msg");if(s){s.innerHTML=m;s.className="ag-msg"+(err?" err":"")}}
 function out(){el.innerHTML='<div class="ag-card"><h2>🔐 R wallet v6 · 0.1.5</h2><p>The full wallet opens only after ASSM sign-in as '+OWNER+' ('+OWNER_RID+').</p>'+
  '<button class="ag-b" data-ag="assm">Sign in with ASSM</button> '+(login==="none"?'':'<a class="ag-b" href="'+login+'?next='+encodeURIComponent(location.pathname)+'">ЯLOGIN</a>')+'<p class="ag-msg"></p>'+
  '<p class="ag-note">Signing never happens on this page: it stays on your own device behind your one unlock.</p></div>';
  el.querySelector('[data-ag="assm"]').onclick=function(){signIn(ui).then(function(s){if(s)show(s)})}}
 function show(s){el.innerHTML='<div class="ag-bar">Signed in as '+s.handle+' via '+s.from+' <button class="ag-b" data-ag="out">Sign out</button></div><iframe class="ag-wallet" src="'+src+'?assm=1" title="R wallet v6 0.1.5" referrerpolicy="no-referrer"></iframe>';
  el.querySelector('[data-ag="out"]').onclick=function(){signOut();out()}}
 out();check().then(function(s){if(s)show(s)})}
w.addEventListener("storage",function(e){if(e.key===SK||e.key===AK)mount()});
w.RASSM_SITE_GATE={VERSION:1,server:server,live:live,session:session,check:check,signIn:signIn,signOut:signOut,mount:mount};
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",function(){mount()});else mount();
})(window,document);

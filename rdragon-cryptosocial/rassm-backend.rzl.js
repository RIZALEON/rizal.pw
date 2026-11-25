/* rassm-backend.rzl.js v1 (2026-11-16, pt264u + pt265u) — SITE BACKEND inside RDRAGON's ASSM profile, behind the Wallet section.
   What: when the profile's "> Wallet" section is open (#csp-rw, mounted by csp-rwallet.js), this adds — BELOW the existing wallet,
   never replacing it — a "Site backend · rizal.pw + rizal.info" panel with:
     1 ASSM / RSYNC server   : /health, /api/rsync/entries, this device's /api/rsync/device-status, look up an 8-digit request code
                               (/api/rsync/request/<code>) and hand it to RDRAGON's existing approve flow (signed on THIS device only).
     2 Publish side          : live site-posts.json + versions of both sites; "Prepare publish bundle" builds a cleaned public-posts
                               JSON for download only. NOTHING is pushed or deployed from here: publishing needs Rizal's own go.
     3 Full wallet           : the FULL RWALLET v6 (0.1.5) bundled in this app (/rwallet/index.html), opened in place.
     4 All versions          : RDRAGON iOS / Android / Linux, RWALLET, and what each site reports.
   Gate: shown ONLY after ASSM sign-in as the owner (@chaserizal · ЯID-0001-3QQS) — the same sign-in RCODE uses
         (rsync-core device.request -> approve on a trusted device, or ЯLOGIN username+password). Signed-out visitors see a sign-in prompt.
   Sources of "signed in": RDRAGON_CSP.me() (device session), the ЯLOGIN public session (rdragon.csp.rlogin-session.v1),
         and the native ASSMKit bridge event "rlogin-session" (ASSMKitBridge.sessionEventScript).
   SECURITY: this is a client-side gate. It holds no secrets: no keys, no passwords, no tokens, no LAN addresses. Every signature stays on
         the device (RWALLET / RGHOSTKEY behind Rizal's single unlock). Real protection is the ASSM server (server-side session check).
   Never deletes, never overwrites, no notices in the message bar, no paper-clip button. Add-only; does not touch existing functions. */
(function(w,d){"use strict";if(w.RASSM_BACKEND)return;
var CFG=w.RDRAGON_CONFIG||{},OWNER="@chaserizal",OWNER_RID="ЯID-0001-3QQS",SK="rdragon.csp.rlogin-session.v1",NATIVE=null,ST={tab:"server",log:[]};
var SITES=[{id:"rizal.pw",url:"https://rizal.pw"},{id:"rizal.info",url:"https://rizal.info"}];
var VERSIONS=CFG.rdragonVersions||[
 {app:"RDRAGON iOS (DragonSkull.xcodeproj)",version:"1.0.6.5",build:"49"},
 {app:"RDRAGON Android (RDRAGON-ANDROID vc36)",version:"1.0.6.1",build:"vc36"},
 {app:"RDRAGON Linux / Ubuntu Touch (vc35)",version:"1.0.6.0",build:"vc35"},
 {app:"RWALLET v6 unified (bundled)",version:"0.1.5",build:"v6"}];
function E(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function H(h){h=String(h||"").trim().replace(/^@+/,"");return h?"@"+h.toLowerCase():""}
function server(){var m=d.querySelector&&d.querySelector('meta[name="assm-server-url"]');return String(CFG.assmServerURL||w.ASSM_SERVER_URL||(m&&m.content)||"https://rizal.pw").replace(/\/+$/,"")}
function walletSrc(){return CFG.backendWalletSrc||(/(^|\.)rizal\.(pw|info)$/.test(location.hostname)?"/rwallet-v6/index.html":"/rwallet/index.html")}
function noLan(s){return String(s||"").replace(/\b(10\.\d{1,3}|192\.168|172\.(1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}(:\d+)?\b/g,"[LAN]")}
/* ---- session (read-only; never writes another module's state) ---- */
function sess(){var me=null;try{me=w.RDRAGON_CSP&&w.RDRAGON_CSP.me&&w.RDRAGON_CSP.me()}catch(e){}
 if(me){var h=H(me.handle||(me.profile&&me.profile.handle)||(me.prof&&me.prof.handle)||OWNER);return{handle:h,from:"device session"}}
 if(NATIVE&&!NATIVE.out&&NATIVE.handle)return{handle:H(NATIVE.handle),from:NATIVE.from||"ASSMKit"};
 try{var s=JSON.parse(localStorage.getItem(SK)||"null");if(s&&s.v===1&&s.handle&&!s.out)return{handle:H(s.handle),from:"ЯLOGIN"}}catch(e){}
 return null}
function isOwner(s){return !!(s&&s.handle===OWNER)}
/* ---- HTTP (no credentials, no bearer, JSON only) ---- */
function get(base,path){return fetch(base+path,{cache:"no-cache",credentials:"omit"}).then(function(r){return r.text().then(function(t){var j;try{j=JSON.parse(t)}catch(e){j={text:t.slice(0,200)}}if(j&&typeof j==="object"&&!Array.isArray(j))j.status=r.status;return j})})}
function say(t){ST.log.unshift(new Date().toLocaleTimeString()+"  "+noLan(t));ST.log=ST.log.slice(0,30);var el=d.getElementById("rab-log");if(el)el.textContent=ST.log.join("\n")}
/* ---- device pub (public half only, from the existing device record; never the private key) ---- */
function devicePub(){var me=null;try{me=w.RDRAGON_CSP&&w.RDRAGON_CSP.me&&w.RDRAGON_CSP.me()}catch(e){}if(me&&me.pub)return Promise.resolve(me.pub);return new Promise(function(ok){try{var q=indexedDB.open("rdragon.csp.keys",1);q.onupgradeneeded=function(){q.result.createObjectStore("k")};
 q.onsuccess=function(){try{var t=q.result.transaction("k").objectStore("k").get("device");t.onsuccess=function(){var r=t.result;ok(r&&(r.pub||r.device||r.pubB64)||null)};t.onerror=function(){ok(null)}}catch(e){ok(null)}};q.onerror=function(){ok(null)}}catch(e){ok(null)}})}
/* ---- actions ---- */
var A={
 health:function(){say("GET "+server()+"/health …");return get(server(),"/health").then(function(j){say("health: "+JSON.stringify(j).slice(0,300))}).catch(function(e){say("health: unreachable ("+e.message+") — the ASSM server is not live yet (needs the real server: Rizal's go)")})},
 entries:function(){return get(server(),"/api/rsync/entries").then(function(j){var n=(j.entries||[]).length;say("entries: "+n+(j.live?" · live "+j.live:""))}).catch(function(e){say("entries: unreachable ("+e.message+")")})},
 device:function(){return devicePub().then(function(p){if(!p){say("device-status: no device record on this install (sign in first)");return}
  return get(server(),"/api/rsync/device-status?pub="+encodeURIComponent(p)).then(function(j){say("device-status: "+JSON.stringify(j).slice(0,300))})}).catch(function(e){say("device-status: unreachable ("+e.message+")")})},
 code:function(){var i=d.getElementById("rab-code"),c=String(i&&i.value||"").replace(/\D/g,"");if(c.length!==8){say("enter the 8-digit code (1234-5678)");return}
  return get(server(),"/api/rsync/request/"+c.slice(0,4)+"-"+c.slice(4)).then(function(j){say("request "+c.slice(0,4)+"-"+c.slice(4)+": "+JSON.stringify(j).slice(0,300));
   if(j&&j.ok!==false&&(j.device||j.request)){say("To approve: open ASSM (approve from this device) and paste the request — the signature is made on this device only.");if(w.CSP_OPEN_ASSM)w.CSP_OPEN_ASSM()}}).catch(function(e){say("request lookup: unreachable ("+e.message+")")})},
 sites:function(){return Promise.all(SITES.map(function(s){return Promise.all([get(s.url,"/site-posts.json").catch(function(){return null}),get(s.url,"/rwallet/RWALLET.version").catch(function(){return null}),get(s.url,"/ds-webversion.json").catch(function(){return null})]).then(function(a){
  var posts=a[0]&&(a[0].posts||a[0].items||(Array.isArray(a[0])?a[0]:null));say(s.id+": posts "+(posts?posts.length:"?")+" · RWALLET "+(a[1]&&a[1].text?a[1].text.trim():"?")+" · web "+(a[2]&&(a[2].version||a[2].v)||"?"))})}))},
 bundle:function(){var ev=[];try{ev=(w.RDRAGON_CSP&&w.RDRAGON_CSP.events&&w.RDRAGON_CSP.events())||[]}catch(e){}
  var posts=ev.filter(function(e){return e&&(e.t==="post"||e.t==="comment"||e.type==="post"||e.type==="comment")&&!e.private&&!e.dm}).map(function(e){var o={};["id","t","type","by","handle","ts","text","par","root","media"].forEach(function(k){if(e[k]!=null)o[k]=k==="text"?noLan(e[k]):e[k]});return o});
  var out={schema:"rdragon.site-posts.publish-bundle.v1",owner:OWNER,rid:OWNER_RID,prepared:new Date().toISOString(),count:posts.length,note:"PREPARED ONLY. Not published. Publishing to rizal.pw / rizal.info needs Rizal's own go.",posts:posts};
  try{var b=new Blob([JSON.stringify(out,null,1)],{type:"application/json"}),a=d.createElement("a");a.href=URL.createObjectURL(b);a.download="site-posts.publish-bundle-"+out.prepared.slice(0,10)+".json";d.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500);say("publish bundle prepared: "+posts.length+" public posts (download only, nothing pushed)")}catch(e){say("bundle: "+e.message)}},
 wallet:function(){var f=d.getElementById("rab-wallet");if(!f)return;if(f.dataset.on){f.dataset.on="";f.innerHTML="";return}f.dataset.on="1";
  f.innerHTML='<iframe src="'+walletSrc()+'?assm=1&embed=backend" title="R wallet v6 0.1.5 (full)" style="width:100%;height:560px;border:1px solid #333;border-radius:8px;background:#000" referrerpolicy="no-referrer"></iframe>';say("full R wallet v6 0.1.5 opened (bundled copy; signing stays behind your unlock)")},
 signin:function(){if(w.CSP_OPEN_ASSM)return w.CSP_OPEN_ASSM();if(w.RLOGIN_PAGE&&w.RLOGIN_PAGE.open)return w.RLOGIN_PAGE.open();say("open ASSM from the profile (type ASSM in the composer)")}
};
/* ---- render ---- */
var CSS='.rab{margin:10px 0;padding:10px;border:1px solid #2a2a2a;border-radius:10px;background:#0b0b0b;color:#ddd;font:13px/1.4 RIZAL,RFONT,-apple-system,system-ui,sans-serif}.rab h4{margin:0 0 6px;font-size:13px;letter-spacing:.04em}.rab .rab-tabs button,.rab .rab-b{background:#151515;color:#ddd;border:1px solid #333;border-radius:7px;padding:4px 8px;margin:2px;font:inherit;cursor:pointer}.rab .rab-tabs button[aria-pressed=true]{border-color:#c33;color:#fff}.rab pre{white-space:pre-wrap;max-height:180px;overflow:auto;background:#000;padding:6px;border-radius:6px;font:11px RIZAL,RFONT,ui-monospace,monospace;color:#9c9}.rab small{color:#888}.rab input{background:#000;color:#ddd;border:1px solid #333;border-radius:6px;padding:4px;width:110px}';
function css(){if(d.getElementById("rab-css"))return;var s=d.createElement("style");s.id="rab-css";s.textContent=CSS;d.head.appendChild(s)}
function body(){var t=ST.tab;
 if(t==="server")return '<div><small>ASSM server: '+E(server())+'</small><br><button class="rab-b" data-rab="health">Health</button><button class="rab-b" data-rab="entries">Entries</button><button class="rab-b" data-rab="device">This device</button><br><input id="rab-code" inputmode="numeric" placeholder="1234-5678"><button class="rab-b" data-rab="code">Look up request</button></div>';
 if(t==="publish")return '<div><button class="rab-b" data-rab="sites">Check both sites</button><button class="rab-b" data-rab="bundle">Prepare publish bundle</button><br><small>Prepared only. Publishing to rizal.pw / rizal.info needs Rizal\'s own go.</small></div>';
 if(t==="wallet")return '<div><button class="rab-b" data-rab="wallet">Open / close full R wallet v6 (0.1.5)</button><div id="rab-wallet"></div><small>Signing, mint, trade, swap, buy and sell stay on this device behind your one unlock.</small></div>';
 return '<div>'+VERSIONS.map(function(v){return '<div>'+E(v.app)+' — <b>'+E(v.version)+'</b> ('+E(v.build)+')</div>'}).join("")+'<button class="rab-b" data-rab="sites">What the sites report</button></div>'}
function render(){var host=d.getElementById("csp-rw");if(!host)return;css();var box=d.getElementById("rassm-backend");if(!box){box=d.createElement("div");box.id="rassm-backend";box.className="rab";host.appendChild(box)}
 var s=sess();
 if(!isOwner(s)){box.innerHTML='<h4>🔐 SITE BACKEND · rizal.pw + rizal.info</h4><div>'+(s?'Signed in as '+E(s.handle)+'. The site backend is only for '+OWNER+'.':'Sign in with ASSM ('+OWNER+' · '+OWNER_RID+') to open the site backend and the full wallet.')+'</div><button class="rab-b" data-rab="signin">Sign in with ASSM</button>';return}
 box.innerHTML='<h4>SITE BACKEND · rizal.pw + rizal.info <small>· '+E(s.handle)+' via '+E(s.from)+'</small></h4><div class="rab-tabs">'+
  [["server","ASSM / RSYNC server"],["publish","Publish"],["wallet","R wallet (full)"],["versions","All versions"]].map(function(x){return '<button data-rab-tab="'+x[0]+'" aria-pressed="'+(ST.tab===x[0])+'">'+x[1]+'</button>'}).join("")+
  '</div>'+body()+'<pre id="rab-log">'+E(ST.log.join("\n"))+'</pre><small>Client-side gate: this panel holds no secrets. Real protection is the ASSM server session check.</small>'}
d.addEventListener("click",function(e){var b=e.target&&e.target.closest&&e.target.closest("[data-rab],[data-rab-tab]");if(!b||!d.getElementById("rassm-backend")||!d.getElementById("rassm-backend").contains(b))return;e.preventDefault();e.stopPropagation();
 if(b.dataset.rabTab){ST.tab=b.dataset.rabTab;render();return}var f=A[b.dataset.rab];if(!f)return;if(b.dataset.rab!=="signin"&&!isOwner(sess())){render();return}f()},true);
/* wrap CSP_RW_MOUNT add-only: the original always runs first */
function hook(){var o=w.CSP_RW_MOUNT;if(!o||o.__rab)return!!o;var n=function(){var r;try{r=o.apply(this,arguments)}finally{setTimeout(render,0)}return r};n.__rab=1;n.__orig=o;w.CSP_RW_MOUNT=n;return true}
if(!hook()){var tries=0,iv=setInterval(function(){if(hook()||++tries>60)clearInterval(iv)},500)}
w.addEventListener("rlogin-session",function(ev){NATIVE=ev&&ev.detail||null;render()});
w.addEventListener("storage",function(ev){if(ev.key===SK)render()});
w.RASSM_BACKEND={VERSION:1,session:sess,isOwner:function(){return isOwner(sess())},render:render,server:server,actions:A,versions:function(){return VERSIONS.slice()}};
})(window,document);

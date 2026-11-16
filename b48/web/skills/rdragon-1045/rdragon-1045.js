/* RDRAGON 1.0.4.25 (iOS 25 · Android vc11 · Neo 25) — 20261104
   MINT (rghostkey_bind, content-bound) · embedded RKLOWD hub (one per device) · ASSM profile bound to RWALLET + ЯID.
   Rules: public halves only; the device key is WebCrypto non-extractable (never exported, never leaves this app's RWALLET store);
   a new key never approves itself — the ONE unlock happens in TerraformЯ on an already-pinned device (Moto / 17e). */
(function(){"use strict";
var ID={handle:"@chaserizal",rid:"ЯID-0001-3QQS"},VER="1.0.4.26";
var H=location.hostname, NEO=(navigator.platform||"").indexOf("Mac")===0&&!("ontouchend" in document);
var PLAT=window.DSNative?"android":(window.webkit&&window.webkit.messageHandlers&&!NEO?"ios":"neo");
var SLOT={neo:"neo-rdragon",ios:"iphone17e-rdragon",android:"moto-rdragon"}[PLAT], NODE={neo:"neo",ios:"17e",android:"moto"}[PLAT];
var LAN="192.168.0.113";
var CHAIN=PLAT==="neo"?["http://127.0.0.1:8741"]:["http://"+LAN+":8765"];
var PEERS=PLAT==="neo"?["http://127.0.0.1:8900/rscale"]:["http://"+LAN+":8799/rscale","http://"+LAN+":8900/rscale"];
var REG="https://rizal.pw/rwallet/data/trusted-devices.json";
function el(t,a,k){var e=document.createElement(t);for(var x in a||{})x==="text"?e.textContent=a[x]:e.setAttribute(x,a[x]);(k||[]).forEach(function(c){e.appendChild(c)});return e}
function hex(b){return Array.prototype.map.call(new Uint8Array(b),function(x){return("0"+x.toString(16)).slice(-2)}).join("")}
function b64(b){var s="",u=new Uint8Array(b);for(var i=0;i<u.length;i++)s+=String.fromCharCode(u[i]);return btoa(s)}
function ub64(s){var r=atob(s),u=new Uint8Array(r.length);for(var i=0;i<r.length;i++)u[i]=r.charCodeAt(i);return u}
function sha(b){return crypto.subtle.digest("SHA-256",typeof b==="string"?new TextEncoder().encode(b):b).then(hex)}
function canon(o){if(Array.isArray(o))return"["+o.map(canon).join(",")+"]";if(o&&typeof o==="object")return"{"+Object.keys(o).sort().map(function(k){return JSON.stringify(k)+":"+canon(o[k])}).join(",")+"}";return JSON.stringify(o)}
function j(u,o){o=o||{};return fetch(u,{method:o.body?"POST":"GET",headers:Object.assign({"Content-Type":"application/json"},o.h||{}),body:o.body?JSON.stringify(o.body):undefined}).then(function(r){return r.json().then(function(x){x._status=r.status;return x})})}
function any(list,path,o){var i=0;return(function n(){if(i>=list.length)return Promise.reject(new Error("no link"));var u=list[i++]+path;return j(u,o).catch(n)})()}
/* ---- IndexedDB: RWALLET device store + RKLOWD hub ---- */
var dbp=new Promise(function(ok,no){var r=indexedDB.open("rdragon-1045",1);r.onupgradeneeded=function(){var d=r.result;d.createObjectStore("wallet");d.createObjectStore("objects");d.createObjectStore("manifest",{keyPath:"seq"});d.createObjectStore("outbox",{keyPath:"sha256"})};r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}});
function tx(s,m,f){return dbp.then(function(d){return new Promise(function(ok,no){var t=d.transaction(s,m),st=t.objectStore(s),r=f(st);t.oncomplete=function(){ok(r&&r.result)};t.onerror=function(){no(t.error)}})})}
function get(s,k){return tx(s,"readonly",function(st){return st.get(k)})} function put(s,v,k){return tx(s,"readwrite",function(st){return k===undefined?st.put(v):st.put(v,k)})}
function all(s){return tx(s,"readonly",function(st){return st.getAll()})}
/* device key: generated once, private half non-extractable, stays in this device's RWALLET store */
function deviceKey(){return get("wallet","rsign").then(function(k){if(k)return k;return crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},false,["sign","verify"]).then(function(kp){return crypto.subtle.exportKey("spki",kp.publicKey).then(function(spki){var v={priv:kp.privateKey,pub:kp.publicKey,spki:b64(spki),created:new Date().toISOString(),handle:ID.handle,rid:ID.rid};return put("wallet",v,"rsign").then(function(){return v})})})})}
/* ---- embedded RKLOWD hub: nodes/<id>/drop|inbox|kit, content-addressed objects, hash-chained put-only MANIFEST ---- */
var Hub={
 head:function(){return all("manifest").then(function(m){return m.length?m[m.length-1]:{seq:0,sha:"0".repeat(64)}})},
 append:function(rec){return Hub.head().then(function(h){rec.seq=h.seq+1;rec.prev=h.sha;rec.t=rec.t||new Date().toISOString();rec.seal="rgen-hashchain";return sha(canon(rec)).then(function(s){rec.sha=s;return put("manifest",rec).then(function(){return rec})})})},
 has:function(s){return get("objects",s).then(function(x){return!!x})},
 put:function(name,bytes,origin,via){bytes=typeof bytes==="string"?new TextEncoder().encode(bytes):new Uint8Array(bytes);if(!bytes.length||bytes.length>8e6)return Promise.reject(new Error("empty or over 8 MB"));
  if(/restart-relay/i.test(name))return Promise.reject(new Error("refused: restart-relay files are the watchdog's"));
  return sha(bytes).then(function(s){return Hub.has(s).then(function(dup){return(dup?Promise.resolve():put("objects",{b64:b64(bytes),name:name},s)).then(function(){return dup?{sha256:s,dup:true}:Hub.append({kind:"put",sha256:s,name:name,size:bytes.length,origin:origin||NODE,via:via||"rdragon"}).then(function(){if((origin||NODE)===NODE)return put("outbox",{sha256:s,name:name,t:Date.now()});}).then(function(){return{sha256:s,dup:false}})})})})},
 list:function(){return all("manifest").then(function(m){var o={};m.forEach(function(r){if(r.kind==="put")o[r.sha256]=r});return Object.keys(o).map(function(k){return o[k]}).sort(function(a,b){return a.t<b.t?1:-1})})},
 verify:function(){return all("manifest").then(function(m){var prev="0".repeat(64),p=Promise.resolve(true);m.forEach(function(r){p=p.then(function(ok){var c=Object.assign({},r),s=c.sha;delete c.sha;var lk=c.prev===prev;prev=s;return sha(canon(c)).then(function(x){return ok&&lk&&x===s})})});return p.then(function(ok){return{ok:ok,records:m.length}})})},
 /* peer sync over ANY link: store-and-forward, dedupe by sha256, merge = local put-only (local chain stays valid) */
 sync:function(){var rep={pulled:0,pushed:0,peer:null};return any(PEERS,"/rklowd/list",{h:{"X-RKLOWD-Node":NODE}}).then(function(L){if(!L.ok)throw new Error(L.err||("hub "+L._status));rep.peer="ok";
   var p=Promise.resolve();(L.files||[]).forEach(function(f){p=p.then(function(){return Hub.has(f.sha256).then(function(h){if(h)return;return any(PEERS,"/rklowd/obj/"+f.sha256,{h:{"X-RKLOWD-Node":NODE}}).then(function(o){if(!o.ok)return;var u=ub64(o.b64);return sha(u).then(function(s){if(s!==f.sha256)return;rep.pulled++;return Hub.put(f.name,u,f.origin||"peer","sync")})})})})});
   return p.then(function(){return all("outbox")}).then(function(ob){var q=Promise.resolve();ob.forEach(function(x){q=q.then(function(){return get("objects",x.sha256).then(function(o){return any(PEERS,"/rklowd/put",{body:{node:NODE,name:x.name,b64:o.b64}}).then(function(r){if(r.ok){rep.pushed++;return tx("outbox","readwrite",function(st){return st.delete(x.sha256)})}})})})});return q})}).then(function(){return rep},function(e){rep.peer=String(e.message||e);return rep})}
};
/* ---- RGHOSTKEY owners (pinned by the registry .sha256) + ASSM profile, persistently bound to RWALLET + ЯID ---- */
function owners(){return Promise.all([fetch(REG,{cache:"no-store"}).then(function(r){return r.arrayBuffer()}),fetch(REG+".sha256",{cache:"no-store"}).then(function(r){return r.text()})]).then(function(a){return sha(a[0]).then(function(s){if(s!==a[1].trim().split(/\s/)[0])throw new Error("registry sha mismatch");return JSON.parse(new TextDecoder().decode(a[0]))})})}
function profile(){return Promise.all(["https://rizal.pw/data/founder/assm-profile.json","https://rizal.pw/data/founder/bio-source.json"].map(function(u){return fetch(u,{cache:"no-store"}).then(function(r){return r.ok?r.json():null}).catch(function(){return null})})).then(function(p){var pr=p[0]||{};if(pr.handle&&pr.handle!==ID.handle)throw new Error("profile handle != "+ID.handle);
  var bind={handle:ID.handle,rid:ID.rid,rwallet:"RWALLET (this device)",bound:new Date().toISOString(),profile:pr,bio:p[1],signed:!!pr.sig,status:pr.status||"unsigned"};
  localStorage.setItem("rdragon.assm.bound",JSON.stringify({handle:ID.handle,rid:ID.rid,bound:bind.bound}));return Hub.put("assm-profile-"+ID.rid+".json",JSON.stringify(bind),NODE,"profile").then(function(){return bind})})}
/* ---- MINT: request block 4 on the Neo submitd; enrol this device's PUBLIC half; unlock happens in TerraformЯ ---- */
function mint(out){out("MINT: loading the waiting request …");return onetap().then(function(T){return T.mint({onStatus:function(s){out(s.msg||s.state||"Waiting …")}})}).then(function(r){if(!r.ok){out("MINT: "+(r.err||JSON.stringify(r.errors||r.error||r)));return r}if(!r.receipt_verified){out("Submission awaiting chain receipt — not confirmed minted");return r}out((r.mode||"live").toUpperCase()+" · block #"+r.block_index+" · "+r.block_hash+"\nRGHOSTCHAIN receipt verified · RTRACKR "+(r.tracker_pending?"publication pending":"verified")+" · device/site sync pending");return Hub.put("rmint-"+r.block_hash+".json",JSON.stringify(r),NODE,"rmint").then(function(){return Hub.sync()}).then(function(sync){r.sync_attempt=sync;out("RGHOSTCHAIN · block #"+r.block_index+" verified\nRTRACKR "+(r.tracker_pending?"publication pending":"verified")+" · RSYNC transfer attempted; per-device/site acknowledgments pending");return r},function(){r.sync_pending=true;return r})}).catch(function(e){out("MINT: "+e.message);return {ok:false,err:e.message}})}
var OTDIR=((document.currentScript&&document.currentScript.src)||"").replace(/[^\/]*$/,"");
function onetap(){window.RMINT_CFG=window.RMINT_CFG||{chain:PLAT==="neo"?["http://127.0.0.1:8765","http://127.0.0.1:8741"]:["http://"+LAN+":8765"],pipe:PEERS,node:NODE};if(window.RMINT_ONETAP)return Promise.resolve(window.RMINT_ONETAP);return new Promise(function(ok,no){var sc=document.createElement("script");sc.src=OTDIR+"rmint-onetap.js";sc.onload=function(){ok(window.RMINT_ONETAP)};sc.onerror=function(){no(new Error("rmint-onetap.js missing"))};document.head.appendChild(sc)})}
/* ---- UI: one ЯDRAGON panel (MINT · RKLOWD · ASSM) ---- */
function ui(){if(document.getElementById("rd1045"))return;var o=el("pre",{id:"rd1045-out",style:"white-space:pre-wrap;font:12px ui-monospace;margin:6px 0;max-height:46vh;overflow:auto"}),out=function(t){o.textContent=t};
 function b(t,f){var x=el("button",{text:t,style:"margin:3px;padding:6px 10px;border-radius:8px;border:1px solid #c9a227;background:#1b1b1b;color:#f3d36b;font-weight:700"});x.onclick=f;return x}
 var fi=el("input",{type:"file",style:"display:none"});fi.onchange=function(){var f=fi.files[0];if(!f)return;f.arrayBuffer().then(function(a){return Hub.put(f.name,a)}).then(function(r){out("RKLOWD put "+f.name+" → "+r.sha256.slice(0,12)+(r.dup?" (dup)":""))},function(e){out("RKLOWD: "+e.message)})};
 function folder(){return Promise.all([Hub.list(),Hub.verify()]).then(function(a){out("RKLOWD (shared) · hub on this device ("+NODE+") · manifest "+(a[1].ok?"valid":"BROKEN")+" · "+a[1].records+" records\nnodes/"+NODE+"/drop · inbox · kit — synced peer-to-peer through RPIPE\n\n"+a[0].slice(0,200).map(function(f){return f.sha256.slice(0,8)+"--"+f.name+"  "+f.size+"B  from "+f.origin}).join("\n"))})}
 var p=el("div",{id:"rd1045",style:"position:fixed;right:10px;bottom:70px;z-index:99999;background:#0d0d0d;color:#eee;border:1px solid #c9a227;border-radius:12px;padding:8px;max-width:min(520px,94vw);display:none"},
  [el("div",{text:"ЯDRAGON "+VER+" · "+ID.handle+" · "+ID.rid,style:"font-weight:800;color:#f3d36b"}),b("MINT",function(){mint(out)}),b("RKLOWD",folder),b("+ FILE",function(){fi.click()}),b("SYNC",function(){out("syncing over any link…");Hub.sync().then(function(r){out("RKLOWD sync: peer "+r.peer+" · pulled "+r.pulled+" · pushed "+r.pushed);})}),b("ASSM",function(){out("ASSM: loading…");Promise.all([profile(),owners().catch(function(e){return{err:e.message}})]).then(function(a){var pr=a[0].profile||{},act=(a[1].devices||[]).filter(function(d){return d.status==="active"});out("ASSM integrated profile · "+(pr.name||"")+" "+ID.handle+" · "+ID.rid+"\nbound to RWALLET on this device (stays signed in)\nprofile status: "+a[0].status+"\nRGHOSTKEY trusted devices: "+(a[1].err||act.map(function(d){return d.device_id}).join(", ")))},function(e){out("ASSM: "+e.message)})}),b("✕",function(){p.style.display="none"}),fi,o]);
 /* 20261105: NO floating Я MINT / Я RWALLET pill — mint only via + Mint inside RWALLET or RMAIL Approve */
 document.body.appendChild(p);var oldTab=document.getElementById("rd1045-tab");if(oldTab&&oldTab.parentNode)oldTab.parentNode.removeChild(oldTab)}
window.RDRAGON1045={Hub:Hub,mint:mint,onetap:onetap,profile:profile,deviceKey:function(){return deviceKey().then(function(k){return k.spki})},platform:PLAT,node:NODE,version:VER};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ui);else ui();
setInterval(function(){Hub.sync()},120000);setTimeout(function(){Hub.sync();profile().catch(function(){})},4000);
})();

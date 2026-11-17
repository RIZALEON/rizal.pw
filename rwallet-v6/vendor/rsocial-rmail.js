/* rsocial-rmail.js v2.1 20261105 — ONE shared Message + Follow layer, synced with RWALLET.
   Every message box (this device's RMAIL outbox, transponder SIGNAL-QUEUE/rmail-<addr>, RKLOWD RMAIL/<addr>, RLINE) is keyed
   by an RWALLET PUBLIC address. Messages carry {to_addr, from_addr, from_device}. PUBLIC data only; no private keys ever.
   Verification: verified:true only when from_device is an active entry in rwallet/data/trusted-devices.json AND the message
   carries an ECDSA P-256 signature (sig_b64 over canonical text) that checks against that device's pubkey_spki_b64.
   A device app with a hardware key may set window.RSOCIAL_SIGNER=function(text)->Promise<base64 sig>. Guests: verified:false.
   Routes: 1. local transponder POST http://127.0.0.1:8797/send {to:"rmail-<addr>"} (not on public hosts unless ?local=1)
           2. optional window.RMAIL_RNS_TO mesh hash  3. optional window.RMAIL_URL. Undelivered mail stays in the outbox. */
(function(){if(window.RSOCIAL&&window.RSOCIAL.v>=2)return;
var OB="rmail.outbox",BOX="rmail.box",FK="rsocial.follows",GK="rmail.guest",RELAY=window.RMAIL_RELAY||"http://127.0.0.1:8797/send";
function J(k,d){try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}}function W(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function pub(){return/(^|\.)(rizal\.(pw|info)|github\.io)$/i.test(location.hostname)&&!/[?&]local=1(&|$)/.test(location.search)}
function root(){var s=document.querySelector('script[src*="rsocial-rmail.js"]');return s?s.src.replace(/[^/]*$/,""):"/"}
/* ---- RWALLET identities (public) ---- */
var TD=null;function trusted(){if(TD)return TD;var u=[window.RWALLET_TRUSTED_URL,"/rwallet/data/trusted-devices.json",root()+"../rwallet/data/trusted-devices.json","https://rizal.pw/rwallet/data/trusted-devices.json"].filter(Boolean);
  TD=u.reduce(function(p,x){return p.catch(function(){return fetch(x,{cache:"no-store"}).then(function(r){if(!r.ok)throw 0;return r.json()})})},Promise.reject()).then(function(j){return(j.devices||[]).filter(function(d){return d.status==="active"})},function(){return[]});return TD}
function walletAddrs(){try{var U=window.RWALLET_UNIFIED;return U&&U.addresses?U.addresses().filter(function(a){return a.publicAddress}):[]}catch(e){return[]}}
function ownerAddr(){var a=walletAddrs();return window.RSOCIAL_OWNER_ADDR||(a[0]&&a[0].publicAddress)||null}
function guestId(){var g=J(GK,null);if(!g){g="guest-"+Math.random().toString(36).slice(2,12);W(GK,g)}return g}
/* handle -> wallet address book; the owner handle maps to the CROWN public address */
function addrOf(h){var b=window.RSOCIAL_BOOK||{};if(b[h])return b[h];if(/^@?chaserizal$/i.test(h||"")||!h)return ownerAddr()||"@chaserizal";return h}
function me(){var h=window.RSOCIAL_ME||"guest",dev=window.RSOCIAL_DEVICE_ID||J("rwallet.device_id",null);
  return h==="guest"?{handle:"guest",addr:guestId(),device:null}:{handle:h,addr:addrOf(h),device:dev}}
function canon(m){return["rmail-v1",m.id,m.from_addr,m.to_addr,m.ts,m.text].join("\n")}
function b64ab(s){var b=atob(s),u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u.buffer}
function verify(m){if(!m.from_device||!m.sig_b64||!window.crypto||!crypto.subtle)return Promise.resolve(false);
  return trusted().then(function(l){var d=l.filter(function(x){return x.device_id===m.from_device})[0];if(!d)return false;
    return crypto.subtle.importKey("spki",b64ab(d.pubkey_spki_b64),{name:"ECDSA",namedCurve:"P-256"},false,["verify"]).then(function(k){
      return crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},k,b64ab(m.sig_b64),new TextEncoder().encode(canon(m)))})}).catch(function(){return false})}
/* ---- delivery ---- */
function post(u,m){var cors=!(typeof u==="string"&&(u.indexOf("127.0.0.1:8797")>=0||u.indexOf("localhost:8797")>=0));
  return fetch(u,{method:"POST",mode:cors?"cors":"no-cors",headers:{"Content-Type":"text/plain"},body:JSON.stringify(m)}).then(function(r){
    if(!cors)return{ok:false,err:"opaque-local-relay",opaque:true};
    if(!r.ok)return r.json().catch(function(){return{}}).then(function(j){throw{ok:false,err:(j&&j.err)||("http-"+r.status),status:r.status}});
    return r.json().then(function(j){if(!j||j.ok!==true||!j.id)throw{ok:false,err:(j&&j.err)||"bad-ack"};return j})})}
function box(a){return"rmail-"+String(a).replace(/[^A-Za-z0-9_-]/g,"_").slice(0,64)}
function deliver(m){var r=[],body=JSON.stringify(m);if(!pub()){r.push(post(RELAY,{to:box(m.to_addr),from:m.from_addr,type:"rmail",body:body}));
  if(window.RMAIL_RNS_TO)r.push(post(RELAY,{to:"rns-out",from:m.from_addr,type:"rmail",body:JSON.stringify({to_hash:window.RMAIL_RNS_TO,type:"rmail",body:body,from:m.from_addr})}))
  if(window.RMAIL_RVM_NODE&&window.RMAIL_RVM_TO)r.push(post(RELAY,{to:window.RMAIL_RVM_NODE,from:m.from_addr,type:"lxmf-send",body:JSON.stringify({to:window.RMAIL_RVM_TO,title:"RMAIL "+(m.subject||""),text:(m.from_addr||"")+": "+(m.body||"")})}))}
  var pubUrl=window.RMAIL_URL||(window.RMAIL_API_PREFIX?String(window.RMAIL_API_PREFIX).replace(/\/$/,"")+"/rmail/drop":"");
  if(pubUrl)r.push(post(pubUrl,m));
  if(!r.length)return Promise.resolve({ok:false,err:"no-route",queued:true});
  return Promise.all(r.map(function(p){return Promise.resolve(p).then(function(j){return j},function(e){return{ok:false,err:(e&&e.err)||String(e)}})})).then(function(acks){
    var good=acks.filter(function(a){return a&&a.ok===true&&a.id});
    if(good.length)return{ok:true,id:good[0].id,sha:good[0].sha,acks:acks};
    return{ok:false,err:(acks[0]&&acks[0].err)||"undelivered",acks:acks,queued:true}})}
function keep(m){var b=J(BOX,{}),k=m.to_addr;(b[k]=b[k]||[]).push(m);b[k]=b[k].slice(-300);var f=m.from_addr;if(f!==k){(b[f]=b[f]||[]).push(m);b[f]=b[f].slice(-300)}W(BOX,b);badge()}
function flush(){var o=J(OB,[]);return o.reduce(function(p,m){return p.then(function(){if(m.sent)return;return deliver(m).then(function(ok){if(ok&&ok.ok){m.sent=Date.now();m.ack=ok}})})},Promise.resolve()).then(function(){W(OB,o);badge()})}
function send(to,text){text=String(text||"").trim();if(!text)return Promise.resolve(null);var I=me();
  var m={v:2,kind:"rmail",id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),to:to||"@chaserizal",to_addr:addrOf(to),from:I.handle,from_addr:I.addr,from_device:I.device,text:text.slice(0,4000),origin:location.host||"app",ts:Date.now(),verified:false};
  var signed=(I.device&&typeof window.RSOCIAL_SIGNER==="function")?Promise.resolve(window.RSOCIAL_SIGNER(canon(m))).then(function(s){m.sig_b64=s;return verify(m)}).catch(function(){return false}):Promise.resolve(false);
  return signed.then(function(v){m.verified=!!v;m.trust=v?"trusted-device":(I.handle==="guest"?"guest-unverified":"unsigned");var o=J(OB,[]);o.push(m);W(OB,o.slice(-500));keep(m);
    return deliver(m).then(function(ok){var yes=!!(ok&&ok.ok);if(yes){var o2=J(OB,[]);o2.forEach(function(x){if(x.id===m.id){x.sent=Date.now();x.ack=ok}});W(OB,o2)}badge();return{msg:m,delivered:yes,ack:ok}})})}
/* inbound (relay/RKLOWD/app pushes a message object in): re-verify locally, never trust the incoming flag */
function receive(m){if(!m||m.kind!=="rmail")return Promise.resolve(null);m.verified=false;return verify(m).then(function(v){m.verified=v;m.trust=v?"trusted-device":"unverified";keep(m);return m})}
function inbox(a){a=a||ownerAddr()||me().addr;return(J(BOX,{})[a]||[]).filter(function(m){return m.to_addr===a})}
function pending(){return J(OB,[]).filter(function(m){return!m.sent}).length}
/* ---- RWALLET UI: inbox count on every Wallet button ---- */
function badge(){var n=inbox().length;try{if(window.RMAIL_UI)n=RMAIL_UI.folders().inbox.u}catch(e){}var p=pending();document.querySelectorAll(".csp-bw,[data-a=wallet]").forEach(function(b){var s=b.querySelector(".rmail-n");if(!s){s=document.createElement("span");s.className="rmail-n";s.style.cssText="margin-left:6px;font-size:10px;opacity:.85";b.appendChild(s)}
  s.textContent="✉"+n+(p?" ·"+p+"⇡":"");b.title=(b.title||"").replace(/ · RMAIL.*$/,"")+" · RMAIL unread "+n+" for "+(ownerAddr()||me().addr)+(p?", "+p+" waiting to send":"")})}
function follows(){return J(FK,{})}
function follow(target,by,on){var f=follows();on=on===undefined?!f[target]:!!on;f[target]=on;W(FK,f);var I=me();
  var ev={t:on?"follow":"unfollow",target:target,target_addr:addrOf(target),by:by||I.handle,by_addr:I.addr,ts:Date.now()};try{window.dispatchEvent(new CustomEvent("rsocial:follow",{detail:ev}))}catch(e){}return ev}
window.RSOCIAL={v:2,send:send,receive:receive,flush:flush,follow:follow,follows:follows,inbox:inbox,pending:pending,me:me,addrOf:addrOf,trusted:trusted,verify:verify,
  outbox:function(){return J(OB,[])},box:box};
document.addEventListener("click",function(e){var b=e.target&&e.target.closest&&e.target.closest('[data-a="sendmsg"]');if(!b)return;
  var i=document.getElementById("csp-msg");if(!i||!i.value.trim())return;var t=(document.querySelector(".csp-dmto")||{}).textContent||"",mt=/dm\s+(@\S+)/.exec(t);send(mt?mt[1]:"@chaserizal",i.value)},true);
window.addEventListener("online",flush);setTimeout(flush,3000);setInterval(badge,4000);setTimeout(badge,800)})();

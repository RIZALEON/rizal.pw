/* rsocial-rmail.js v1 20261104 — ONE shared Message + Follow layer for every "Anti Social Social Media" profile
   (rizal.pw, rizal.info, bridge pages, RDRAGON desktop/iOS/iPad/Android webviews, RCRYPTOFORGE-LEAN).
   Message -> RMAIL: every message (signed-in or guest/no profile) is first kept in this device's offline
   mailbox (localStorage "rmail.outbox"), then delivered when a route is up:
     1. local transponder relay  POST http://127.0.0.1:8797/send {to:"rmail",...} -> GHOSTMACHINE-TRANSPONDER/SIGNAL-QUEUE/rmail/
        (relay's rns_bridge carries it over Reticulum when window.RMAIL_RNS_TO = <dest hash> is set -> SIGNAL-QUEUE/rns-out/)
     2. optional window.RMAIL_URL (any HTTPS inbox you approve later); public hosts never probe loopback unless ?local=1.
   Follow -> one shape everywhere: {t:"follow"|"unfollow",target,by,ts} kept in localStorage "rsocial.follows" and,
   where ЯSYNC is loaded, appended as the same signed follow event rdragon-cryptosocial.js already uses.
   No secrets, no keys, data only. */
(function(){if(window.RSOCIAL)return;
var OB="rmail.outbox",FK="rsocial.follows",RELAY=window.RMAIL_RELAY||"http://127.0.0.1:8797/send";
function J(k,d){try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}}function W(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function pub(){return/(^|\.)(rizal\.(pw|info)|github\.io)$/i.test(location.hostname)&&!/[?&]local=1(&|$)/.test(location.search)}
function post(u,m){return fetch(u,{method:"POST",mode:"no-cors",headers:{"Content-Type":"text/plain"},body:JSON.stringify(m)})}
function deliver(m){var r=[];if(!pub()){r.push(post(RELAY,{to:"rmail",from:m.from,type:"rmail",body:JSON.stringify(m)}));
  if(window.RMAIL_RNS_TO)r.push(post(RELAY,{to:"rns-out",from:m.from,type:"rmail",body:JSON.stringify({to_hash:window.RMAIL_RNS_TO,type:"rmail",body:m.text,from:m.from})}))}
  if(window.RMAIL_URL)r.push(post(window.RMAIL_URL,m));
  return r.length?Promise.all(r).then(function(){return true},function(){return false}):Promise.resolve(false)}
function flush(){var o=J(OB,[]),left=[],n=0;return o.reduce(function(p,m){return p.then(function(){if(m.sent)return;return deliver(m).then(function(ok){if(ok){m.sent=Date.now();n++}})})},Promise.resolve()).then(function(){W(OB,o);return n})}
function send(to,text,from){text=String(text||"").trim();if(!text)return Promise.resolve(null);
  var m={v:1,kind:"rmail",id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),to:to||"@chaserizal",from:from||"guest",text:text.slice(0,4000),origin:location.host||"app",ts:Date.now()};
  var o=J(OB,[]);o.push(m);W(OB,o.slice(-500));return deliver(m).then(function(ok){if(ok){m.sent=Date.now();var o2=J(OB,[]);o2.forEach(function(x){if(x.id===m.id)x.sent=m.sent});W(OB,o2)}return{msg:m,delivered:ok}})}
function follows(){return J(FK,{})}
function follow(target,by,on){var f=follows();on=on===undefined?!f[target]:!!on;f[target]=on;W(FK,f);
  var ev={t:on?"follow":"unfollow",target:target,by:by||"guest",ts:Date.now()};try{window.dispatchEvent(new CustomEvent("rsocial:follow",{detail:ev}))}catch(e){}return ev}
window.RSOCIAL={v:1,send:send,flush:flush,follow:follow,follows:follows,outbox:function(){return J(OB,[])}};
/* auto-hook any profile panel that uses the shared markup: [data-a=sendmsg] + #csp-msg */
document.addEventListener("click",function(e){var b=e.target&&e.target.closest&&e.target.closest('[data-a="sendmsg"]');if(!b)return;
  var root=b.closest(".csp-view")||document,i=root.querySelector("#csp-msg")||document.getElementById("csp-msg");if(!i||!i.value.trim())return;
  var to=(document.querySelector(".csp-dmto")||{}).textContent||"",mt=/dm\s+(@\S+)/.exec(to),me=window.RSOCIAL_ME||"guest";
  send(mt?mt[1]:"@chaserizal",i.value,me)},true);
window.addEventListener("online",flush);setTimeout(flush,3000)})();

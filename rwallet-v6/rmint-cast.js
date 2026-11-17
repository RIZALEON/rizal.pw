/* rmint-cast 1.0 · RWALLET 0.1.3 · 20261109 (Rizal t56u) · SIGN PROMPT CAST client.
 * Polls the cast feed (POST /rmint/cast/feed over every link rmint-transport.js knows: LAN/Wi-Fi, hotspot, RPIPE relay,
 * iCloud relay, RKLOWD, offline queue) and shows each item that needs a signature as ONE prompt card with ONE button,
 * Я MINT · SIGN. HARD devices (Neo / 17e / moto) get cards; SOFT devices only see "sent to your hard devices".
 * DISPLAY ONLY: this file never signs, never holds a key, never auto-approves, never presses by itself (timer/script clicks are
 * ignored: only a real user click, event.isTrusted). The press goes to RMINT_PRESS.press(), which opens ONE unlock on this device
 * (Face ID / fingerprint / ASSM password in the native signer); no unlock = no signature = nothing sealed.
 * Cards expire with the nonce TTL (server "expires") and can be dismissed. Native hooks (optional): iOS/macOS WK "rcast" handler
 * (RCastNotify.swift), Android JS interface RCastNative (RCastNotify.java) post a local notification + badge that opens the card. */
(function(w){"use strict";
if(w.RMINT_CAST)return;
var V="1.0",POLL=20000,cards=[],soft=null,notified={},busy={},root=null,d=w.document;
function T(){return w.RMINT_TRANSPORT}function S(){return w.RMINT_SESSION}function P(){return w.RMINT_PRESS}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function left(c){return Math.max(0,Math.round(c.expires-Date.now()/1000))}
function fmt(s){return s>=86400?Math.floor(s/86400)+"d":s>=3600?Math.floor(s/3600)+"h":s>=60?Math.floor(s/60)+"m":s+"s"}
function mount(){if(root&&d.body.contains(root))return root;root=d.getElementById("rcast");
  if(!root){root=d.createElement("div");root.id="rcast";root.className="rcast";root.setAttribute("aria-live","polite");d.body.appendChild(root)}return root}
function native(op,o){try{var mh=w.webkit&&w.webkit.messageHandlers&&w.webkit.messageHandlers.rcast;if(mh&&mh.postMessage){mh.postMessage(Object.assign({op:op},o||{}));return true}
  var a=w.RCastNative;if(a){if(op==="notify"&&a.notify){a.notify(String(o.id),String(o.title),Number(o.expires||0));return true}if(op==="badge"&&a.badge){a.badge(Number(o.n||0));return true}if(op==="clear"&&a.clear){a.clear(String(o.id));return true}}}catch(e){}return false}
function notify(c){if(notified[c.id])return;notified[c.id]=1;
  if(native("notify",{id:c.id,title:"Я MINT · SIGN · "+c.title,expires:c.expires}))return;
  try{if(w.Notification&&w.Notification.permission==="granted"){var n=new w.Notification("Я MINT · SIGN",{body:c.title,tag:"rcast-"+c.id});n.onclick=function(){w.focus();open(c.id)}}}catch(e){}}
function render(){var r=mount(),now=Date.now()/1000;cards.forEach(function(c){if(c.expires<=now)native("clear",{id:c.id})});cards=cards.filter(function(c){return c.expires>now});
  native("badge",{n:cards.length});
  if(soft){r.innerHTML='<div class="rcast-status">'+esc(soft)+'</div>';r.style.display="";return}
  if(!cards.length){r.innerHTML="";r.style.display="none";return}r.style.display="";
  r.innerHTML=cards.map(function(c){return'<div class="rcast-card" data-id="'+esc(c.id)+'"><button class="rcast-x" data-x="'+esc(c.id)+'" title="Dismiss" aria-label="Dismiss">×</button>'+
    '<div class="rcast-t">'+esc(c.title)+'</div><div class="rcast-m">'+esc(c.kind)+(c.from_tier?" · from "+esc(c.from_tier):"")+" · expires in "+fmt(left(c))+'</div>'+
    '<button class="rcast-press big" data-press="'+esc(c.id)+'"'+(busy[c.id]?" disabled":"")+'>Я MINT · SIGN</button><div class="rcast-s" data-s="'+esc(c.id)+'">'+esc(busy[c.id]||"one unlock on this device · no unlock, no signature")+'</div></div>'}).join("")}
function call(p,b){return T()?T().call(p,"POST",b):Promise.resolve({ok:false,error:"no transport"})}
function who(){var s=S();if(!s)return Promise.resolve(null);return Promise.resolve(s.token()).then(function(t){return t?{device_id:s.deviceId(),session_token:t}:null},function(){return null})}
function poll(){return who().then(function(id){if(!id){soft=null;cards=[];render();return}
  return call("/rmint/cast/feed",id).then(function(r){if(!r||!r.ok)return;
    if(r.tier==="soft"){soft=(r.status||"sent to your hard devices")+(r.pending?" · "+r.pending+" waiting":"");cards=[];render();return}
    soft=null;cards=(r.cards||[]).filter(function(c){return!c.dismissed});cards.forEach(notify);render()})}).catch(function(){})}
function dismiss(id,done){return who().then(function(x){if(!x)return;x.id=id;if(done)x.done=true;cards=cards.filter(function(c){return c.id!==id});native("clear",{id:id});render();return call("/rmint/cast/dismiss",x)})}
function press(id,ev){if(!ev||ev.isTrusted!==true)return Promise.resolve({ok:false,error:"press must be a real tap by Rizal"});   // never scripted, never timed
  var c=cards.filter(function(x){return x.id===id})[0];if(!c||busy[id])return Promise.resolve({ok:false});
  if(!P())return Promise.resolve({ok:false,error:"rmint-press.js not loaded"});
  busy[id]="unlock on this device…";render();
  var o={onStatus:function(s){busy[id]=s&&s.msg||s&&s.state||"…";render()},cast_id:id};
  if(c.kind!=="bind")o.asset=(c.request&&(c.request.asset||c.request))||null;
  return Promise.resolve(P().press(o)).then(function(x){delete busy[id];if(x&&x.ok){dismiss(id,true)}else{render();var el=root&&root.querySelector('[data-s="'+id+'"]');if(el)el.textContent=String((x&&(x.err||x.why||x.error||x.errors))||"not signed")}return x},
    function(e){delete busy[id];render();return{ok:false,error:String(e)}})}
function open(id){poll().then(function(){var el=root&&root.querySelector('[data-id="'+id+'"]');if(el){el.classList.add("rcast-hi");el.scrollIntoView({block:"center"})}})}
d.addEventListener("click",function(e){var t=e.target;if(!t||!t.getAttribute)return;var p=t.getAttribute("data-press"),x=t.getAttribute("data-x");
  if(p){e.preventDefault();press(p,e)}else if(x){e.preventDefault();dismiss(x,false)}});
if(w.addEventListener){w.addEventListener("rmint:link",poll);w.addEventListener("focus",poll);w.addEventListener("rmint:session",poll)}
setInterval(poll,POLL);setInterval(render,5000);
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",poll);else poll();
w.RMINT_CAST={version:V,poll:poll,open:open,dismiss:function(id){return dismiss(id,false)},cards:function(){return cards.slice()},display_only:true,auto_sign:false};
})(typeof window!=="undefined"?window:globalThis);

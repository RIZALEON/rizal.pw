/* rwallet-drift 1.0 · RWALLET 0.1.2 · 20261109 · "the same wallet in all spaces" (Rizal t51u).
 * Compares the wallet files this page actually serves against RWALLET.sha256 (copied from the canonical bundle
 * CRYPTODRIVE/apps/RWALLET/MANIFEST.sha256) and shows a small warning if any file drifted. Read-only: no keys, no network
 * beyond this site's own files. window.RWALLET_DRIFT = {version, check(), result}. Silent where fetch is not allowed (file://). */
(function(w){"use strict";
var D=w.document,cs=D.currentScript,src=(cs&&cs.src)||"";if(!src||!(w.crypto&&w.crypto.subtle&&w.fetch))return;
var base=src.replace(/[^\/]*(\?.*)?$/,"");
function hex(b){return Array.prototype.map.call(new Uint8Array(b),function(x){return("0"+x.toString(16)).slice(-2)}).join("")}
function get(u){return fetch(u,{cache:"no-store"}).then(function(r){if(!r.ok)throw new Error(r.status);return r})}
function find(){return get(base+"RWALLET.sha256").then(function(r){return{dir:base,r:r}},function(){var up=base.replace(/[^\/]+\/$/,"");return get(up+"RWALLET.sha256").then(function(r){return{dir:up,r:r}})})}
function banner(res){
  /* iOS b42: never write into the composer (#message, R:\> commbar) or a body overlay.
   * Drift notices go only to ThundR's notification feed (THUNDR_SHELL_PUSH / bus). */
  try{var stale=D.getElementById("rwallet-drift-warn");if(stale&&stale.parentNode)stale.parentNode.removeChild(stale)}catch(e){}
  if(res.ok)return;
  var msg="ЯWALLET drift: "+res.bad.length+" file(s) differ from canonical "+(res.version||"?")+" · "+res.bad.slice(0,3).join(", ");
  function targets(){var ts=[],seen=[];function add(x){if(!x||seen.indexOf(x)>=0)return;seen.push(x);ts.push(x)}add(w);try{if(w.parent&&w.parent!==w)add(w.parent)}catch(e){}try{if(w.top&&w.top!==w)add(w.top)}catch(e){}return ts}
  var sent=false,tgs=targets(),i,t,doc,log,div;
  for(i=0;i<tgs.length;i++){t=tgs[i];try{if(typeof t.THUNDR_SHELL_PUSH==="function"){t.THUNDR_SHELL_PUSH({from:"RWALLET",kind:"drift",text:msg,display:msg});sent=true;break}}catch(e){}}
  if(!sent){for(i=0;i<tgs.length;i++){t=tgs[i];try{if(typeof t.RL_THUNDR_SAY==="function"){t.RL_THUNDR_SAY({organ:"rwallet",kind:"drift",state:"error",text:msg});sent=true;break}}catch(e){}try{if(t.RL_THUNDR&&t.RL_THUNDR.bus&&typeof t.RL_THUNDR.bus.emit==="function"){t.RL_THUNDR.bus.emit({organ:"rwallet",kind:"drift",state:"error",text:msg});sent=true;break}}catch(e){}}}
  if(!sent){for(i=0;i<tgs.length;i++){try{doc=tgs[i].document;log=doc&&doc.querySelector&&doc.querySelector("#th-chat .log");if(log){div=doc.createElement("div");div.setAttribute("data-rwallet-drift","1");div.appendChild(doc.createTextNode(msg));log.appendChild(div);sent=true;break}}catch(e){}}}
}
function check(){return find().then(function(f){return f.r.text().then(function(t){
  var lines=t.split("\n").map(function(l){var m=l.match(/^([0-9a-f]{64})\s+\*?(.+)$/);return m&&{h:m[1],p:m[2].trim()}}).filter(Boolean);
  return get(f.dir+"RWALLET.version").then(function(r){return r.text()},function(){return""}).then(function(ver){
   return Promise.all(lines.map(function(x){return get(f.dir+x.p).then(function(r){return r.arrayBuffer()}).then(function(b){return w.crypto.subtle.digest("SHA-256",b)}).then(function(d){return hex(d)===x.h?null:x.p},function(){return x.p+" (missing)"})}))
    .then(function(r){var bad=r.filter(Boolean),res={ok:!bad.length,bad:bad,checked:lines.length,version:String(ver).trim()};w.RWALLET_DRIFT.result=res;banner(res);
      try{w.dispatchEvent(new CustomEvent("rwallet:drift",{detail:res}))}catch(e){}return res})})})},function(){return{ok:true,skipped:"no RWALLET.sha256 here"}})}
w.RWALLET_DRIFT={version:"1.0",check:check,result:null};
D.readyState==="loading"?D.addEventListener("DOMContentLoaded",function(){setTimeout(check,1500)}):setTimeout(check,1500);
})(window);

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
function banner(res){if(res.ok||!D.body)return;var id="rwallet-drift-warn",e=D.getElementById(id)||D.createElement("div");e.id=id;
 e.style.cssText="position:fixed;left:8px;bottom:8px;z-index:2147483000;max-width:320px;font:11px Menlo,ui-monospace,monospace;color:#ff5470;background:#000;border:1px solid #ff5470;border-radius:999px;padding:4px 10px";
 e.textContent="ЯWALLET drift: "+res.bad.length+" file(s) differ from canonical "+(res.version||"?")+" · "+res.bad.slice(0,3).join(", ");if(!e.parentNode)D.body.appendChild(e)}
function check(){return find().then(function(f){return f.r.text().then(function(t){
  var lines=t.split("\n").map(function(l){var m=l.match(/^([0-9a-f]{64})\s+\*?(.+)$/);return m&&{h:m[1],p:m[2].trim()}}).filter(Boolean);
  return get(f.dir+"RWALLET.version").then(function(r){return r.text()},function(){return""}).then(function(ver){
   return Promise.all(lines.map(function(x){return get(f.dir+x.p).then(function(r){return r.arrayBuffer()}).then(function(b){return w.crypto.subtle.digest("SHA-256",b)}).then(function(d){return hex(d)===x.h?null:x.p},function(){return x.p+" (missing)"})}))
    .then(function(r){var bad=r.filter(Boolean),res={ok:!bad.length,bad:bad,checked:lines.length,version:String(ver).trim()};w.RWALLET_DRIFT.result=res;banner(res);
      try{w.dispatchEvent(new CustomEvent("rwallet:drift",{detail:res}))}catch(e){}return res})})})},function(){return{ok:true,skipped:"no RWALLET.sha256 here"}})}
w.RWALLET_DRIFT={version:"1.0",check:check,result:null};
D.readyState==="loading"?D.addEventListener("DOMContentLoaded",function(){setTimeout(check,1500)}):setTimeout(check,1500);
})(window);

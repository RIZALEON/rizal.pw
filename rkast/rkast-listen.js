/* RKAST listener 1.0 · 20261114 (pt345u) · STAGED · the DEVICE side of the website → RKAST → devices cast.
 * Drop-in for any app WebView / page (RWALLET, RDRAGON, ЯBOT, ThundR, RSCRIBE, RMAIL, TerraformЯ web) and Node.
 * Source order (own relays first, Neo never required):
 *   1. website feed  : same-origin /rkast/feed.json, https://rizal.pw/rkast/feed.json, https://rizaleon.github.io/rizal.pw/rkast/feed.json
 *   2. own device relays: ЯSYNC / RKLOWD / RMail relay bundle URLs from config "rkast.peers" (each device's built-in relay,
 *      e.g. its in-app RKLOWD hub http://127.0.0.1:8799/rscale/... on that device). No LAN IP is hard-coded here.
 *   3. Neo           : only if the device config lists it ("rkast.neo"), always last, optional.
 *   4. public Nostr  : BACKUP ONLY, encrypted RKRYPT boxes under #t rzl-rkast-v1, only when a channel key is set; plaintext is ignored.
 * Merge = rsync-core.js (RSync) when present (content-id union, unsigned allowed ONLY for t:"rkast.msg"), else a built-in dedupe.
 * Output: window "rkast:msg" event + opts.onMsg(msg) + optional native hook webkit.messageHandlers.rkast / window.RKastNative.post(json).
 * DISPLAY ONLY: never signs, mints, installs, approves or moves anything; never holds a key. */
(function(root,f){var m=f(root);if(typeof module==="object"&&module.exports)module.exports=m;else root.RKAST_LISTEN=m})(typeof self!=="undefined"?self:this,function(root){
"use strict";
var G=typeof globalThis!=="undefined"?globalThis:root;
function core(){if(G.RKAST_CORE)return G.RKAST_CORE;if(typeof require==="function")try{return require("./rkast-core.js")}catch(e){}return null}
function rsyncLib(){if(G.RSync)return G.RSync;if(typeof require==="function")try{return require("../rdragon-cryptosocial/rsync-core.js")}catch(e){}return null}
var WEBSITE=["/rkast/feed.json","https://rizal.pw/rkast/feed.json","https://rizaleon.github.io/rizal.pw/rkast/feed.json"];
function lsGet(k){try{return G.localStorage?JSON.parse(G.localStorage.getItem(k)||"null"):null}catch(e){return null}}
function memStore(){var a=[],seen={};return{load:function(){return a.slice()},save:function(x){a=x.slice()},seen:seen}}
function tfetch(url,ms){var c=typeof AbortController==="function"?new AbortController():null,t=c&&setTimeout(function(){c.abort()},ms||6000);
 return G.fetch(url,{cache:"no-store",signal:c&&c.signal}).then(function(r){if(!r.ok)throw new Error("HTTP "+r.status);return r.json()}).finally(function(){if(t)clearTimeout(t)})}
function sources(o){var cfg=o.config||lsGet("rkast.cfg.v1")||{},out=[];
 var web=(o.website||cfg.website||WEBSITE).slice();
 var sameOrigin=!!(G.location&&/^https?:/.test(String(G.location.protocol||"")));
 web.forEach(function(u){if(u.charAt(0)==="/"&&!sameOrigin)return;out.push({name:"website",url:u})});
 (o.peers||cfg.peers||lsGet("rkast.peers")||[]).forEach(function(u){out.push({name:"own-relay",url:u})});
 (o.neo||cfg.neo||lsGet("rkast.neo")||[]).forEach(function(u){out.push({name:"neo-optional",url:u})});
 var seen={};return out.filter(function(s){if(seen[s.url])return false;seen[s.url]=1;return true})}
function create(o){o=o||{};var K=core(),RS=rsyncLib(),subs=[],stat={polls:0,received:0,bySource:{},errors:{},nostr:"off"};
 if(!K)throw new Error("RKAST: rkast-core.js missing");
 var seen={},rep=null;
 if(RS)rep=RS.create({storage:o.storage||null,policy:{allowUnsigned:true,accept:function(e){return K.valid(e)}}});
 function emit(m,src){if(seen[m.id])return false;seen[m.id]=1;stat.received++;stat.bySource[src]=(stat.bySource[src]||0)+1;
  var msg=JSON.parse(JSON.stringify(m));msg._from=src;
  subs.forEach(function(f){try{f(msg)}catch(x){}});if(o.onMsg)try{o.onMsg(msg)}catch(x){}
  try{if(G.dispatchEvent&&typeof CustomEvent==="function")G.dispatchEvent(new CustomEvent("rkast:msg",{detail:msg}))}catch(x){}
  if(o.native!==false){try{var mh=G.webkit&&G.webkit.messageHandlers&&G.webkit.messageHandlers.rkast;if(mh)mh.postMessage({op:"msg",id:m.id,kind:m.kind,title:m.title})}catch(x){}
   try{if(G.RKastNative&&G.RKastNative.post)G.RKastNative.post(JSON.stringify({op:"msg",id:m.id,kind:m.kind,title:m.title}))}catch(x){}}
  return true}
 function ingestBundle(b,src){if(!b||!Array.isArray(b.entries))return Promise.resolve(0);
  var arr=b.entries.filter(function(e){return K.valid(e)&&(o.allowDry||!e.dry)});
  if(rep)return rep.merge(arr,src).then(function(r){var n=0;(r.added||[]).forEach(function(e){if(emit(e,src))n++});return n});
  var n=0;arr.forEach(function(e){if(emit(e,src))n++});return Promise.resolve(n)}
 function poll(){stat.polls++;var list=sources(o);
  return list.reduce(function(p,s){return p.then(function(tot){return tfetch(s.url,o.timeoutMs).then(function(b){delete stat.errors[s.url];return ingestBundle(b,s.name+" "+s.url)}).then(function(n){return tot+n},function(e){stat.errors[s.url]=String(e&&e.message||e);return tot})})},Promise.resolve(0))}
 /* public Nostr BACKUP: only decrypts RKRYPT boxes; needs NostrTools (vendor bundle) + a channel key. */
 function nostr(relays){var key=o.channelKey||lsGet("rkast.chan.v1");if(!key){stat.nostr="off (no channel key)";return false}
  var N=G.NostrTools;if(!N||typeof G.WebSocket!=="function"){stat.nostr="off (no nostr lib)";return false}
  (relays||o.nostrRelays||["wss://relay.damus.io","wss://nos.lol"]).forEach(function(u){try{var s=new G.WebSocket(u);
   s.onopen=function(){s.send(JSON.stringify(["REQ","rkast",{kinds:[1],"#t":[K.TAG],since:Math.floor(Date.now()/1000)-14*86400,limit:200}]))};
   s.onmessage=function(ev){var m;try{m=JSON.parse(ev.data)}catch(x){return}if(m[0]!=="EVENT"||!m[2])return;var e=m[2];try{if(!N.verifyEvent(e))return}catch(x){return}
    if(K.isPlaintextBundle(e.content))return; /* never accept plaintext from public relays */
    var box;try{box=JSON.parse(e.content)}catch(x){return}K.open(box,key).then(function(b){return ingestBundle(b,"nostr-backup "+u)},function(){})}}catch(x){}});
  stat.nostr="on (encrypted only)";return true}
 var timer=null;
 return{poll:poll,ingestBundle:ingestBundle,nostr:nostr,sources:function(){return sources(o)},status:function(){return JSON.parse(JSON.stringify(stat))},
  onMsg:function(f){subs.push(f)},start:function(ms){if(timer)return;poll();timer=setInterval(poll,ms||60000)},stop:function(){if(timer)clearInterval(timer);timer=null}};
}
return{VERSION:"1.0",create:create,WEBSITE:WEBSITE};
});

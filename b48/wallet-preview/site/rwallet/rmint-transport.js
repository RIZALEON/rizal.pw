/* rmint-transport 1.0 · 20261108-rwallet (Rizal t36u GO) · ONE transport for login / logout / transact / mint, online or offline.
 * Order tried: loopback → LAN/Wi-Fi → hotspot → USB (adb reverse / usbmux) → Bluetooth (native/Web Bluetooth) → iCloud Drive
 * mailbox relay → RKLOWD store-and-forward → private VPN address (config only) → offline queue (rmint.queue.v1 + rmint.ops.v1).
 * Never holds keys, never signs. Queued items are either already-sealed mints (signature present) or session ops; unsigned
 * mints are never queued. Config: window.RMINT_NET (or localStorage "rmint.net.cfg.v1", no secrets) overrides the defaults below;
 * the old hard-coded 127.0.0.1 / 192.168.0.113 values stay as the defaults. */
(function(w){"use strict";
var QK="rmint.queue.v1",OK="rmint.ops.v1",CK="rmint.net.cfg.v1",LK="rmint.net.last.v1";
function ls(k,v){try{if(v===undefined)return JSON.parse(w.localStorage.getItem(k)||"null");w.localStorage.setItem(k,JSON.stringify(v))}catch(e){return null}}
var loc=w.location||{},host=String(loc.hostname||""),ua=String((w.navigator||{}).userAgent||"");
var isIOS=/iP(hone|ad)/.test(ua),isAndroid=/Android/.test(ua)||!!w.DSNative;
var DEF={
  loopback:["http://127.0.0.1:8765","http://127.0.0.1:8741"],          // on Neo itself (rcryptoforge proxy, then submitd)
  lan:["http://192.168.0.113:8765","http://rizals-MacBook-Neo.local:8765"], // home Wi-Fi (legacy default kept first)
  hotspot:["http://rizals-MacBook-Neo.local:8765","http://172.20.10.2:8765","http://192.168.43.2:8765"], // Neo joined the phone hotspot (iOS 172.20.10.x / Android 192.168.43.x)
  usb:["http://127.0.0.1:18765"],                                     // moto: `adb reverse tcp:18765 tcp:8765` · 17e: usbmux/iproxy (native)
  bluetooth:["ble:rghost-neo"],                                        // native RBtNative / Web Bluetooth GATT (stub until the Neo peripheral ships)
  icloud:["icloud:GHOSTMACHINE-TRANSPONDER/SIGNAL-QUEUE/rmint"],       // native bridge writes a request file; Neo watcher answers
  rklowd:["http://192.168.0.113:8799/rscale","http://127.0.0.1:8900/rscale"], // RKLOWD put → forwarded when Neo sees it
  vpn:[]                                                               // e.g. "http://neo.<tailnet>.ts.net:8765" (Rizal installs the VPN)
};
var ORDER=["loopback","lan","hotspot","usb","bluetooth","icloud","rklowd","vpn","queue"];
function cfg(){var c={},o=w.RMINT_NET||ls(CK)||{},k;for(k in DEF)c[k]=Array.isArray(o[k])?o[k]:DEF[k];   // [] = link disabled
  // phones never use 127.0.0.1:8765 as "loopback" except the adb-reverse USB port; Neo pages keep the old loopback first.
  if((isIOS||isAndroid)&&!o.loopback)c.loopback=[];c.order=o.order||ORDER;return c}
function setCfg(o){ls(CK,o||null);return cfg()}
function tmo(p,ms){return new Promise(function(res,rej){var t=setTimeout(function(){rej(new Error("timeout"))},ms);p.then(function(v){clearTimeout(t);res(v)},function(e){clearTimeout(t);rej(e)})})}
function httpCall(base,path,method,body){var h={"Content-Type":"text/plain"};
  return tmo(fetch(base+path,{method:method||"GET",headers:h,body:body==null?undefined:JSON.stringify(body),cache:"no-store"}),method==="POST"?30000:6000)
   .then(function(r){return r.json().catch(function(){return{ok:false,err:"bad reply HTTP "+r.status}}).then(function(j){j._status=r.status;return j})})}
/* native / non-HTTP links: each returns a Promise of the JSON reply, or rejects if the link is absent */
function bleCall(addr,path,method,body){var n=w.RBtNative||(w.Capacitor&&w.Capacitor.Plugins&&w.Capacitor.Plugins.RBt);
  if(n&&n.request)return new Promise(function(res,rej){var id="rbt"+Date.now();w["__rbt_"+id]=function(r){delete w["__rbt_"+id];try{res(typeof r==="string"?JSON.parse(r):r)}catch(e){rej(e)}};
    try{n.request(JSON.stringify({addr:addr,path:path,method:method,body:body}),"__rbt_"+id)}catch(e){rej(e)}});
  return Promise.reject(new Error("bluetooth: no native link (Web Bluetooth needs a user gesture + Neo GATT peripheral)"))}
function icloudCall(addr,path,method,body){var mh=w.webkit&&w.webkit.messageHandlers&&w.webkit.messageHandlers.rsignal;
  var payload={v:1,kind:"rmint.relay",path:path,method:method,body:body,ts:new Date().toISOString()};
  if(mh&&mh.postMessage)return mh.postMessage({op:"relay",dir:addr,request:JSON.stringify(payload)}).then(function(r){return typeof r==="string"?JSON.parse(r):r});
  if(w.RSignalNative&&w.RSignalNative.relay)return new Promise(function(res){var id="rsg"+Date.now();w["__rsg_"+id]=function(r){delete w["__rsg_"+id];res(typeof r==="string"?JSON.parse(r):r)};w.RSignalNative.relay(JSON.stringify(payload),"__rsg_"+id)});
  return Promise.reject(new Error("icloud relay: no native bridge on this page"))}
function rklowdCall(base,path,method,body){ // store-and-forward: drop the request as an RKLOWD object; Neo's relay forwards it
  if(method!=="POST")return Promise.reject(new Error("rklowd: POST only"));
  var node=(w.RMINT_ONETAP&&w.RMINT_ONETAP.node)||"neo",tok=ls("rpipe.token"),h={"Content-Type":"text/plain","X-RKLOWD-Node":node};if(tok)h.Authorization="Bearer "+tok;
  return tmo(fetch(base+"/mint/relay",{method:"POST",headers:h,body:JSON.stringify({path:path,body:body}),cache:"no-store"}),15000)
   .then(function(r){return r.json().then(function(j){j._status=r.status;if(r.status===404)throw new Error("rklowd relay route not on this hub");if(j.ok){j.stored=true;j.relayed=true;j.relay_id=j.id;j.ok=false}return j})})}
var LINK={loopback:httpCall,lan:httpCall,hotspot:httpCall,usb:httpCall,vpn:httpCall,bluetooth:bleCall,icloud:icloudCall,rklowd:rklowdCall};
var last=ls(LK)||null;
function emit(n,d){try{w.dispatchEvent(new CustomEvent(n,{detail:d}))}catch(e){}}
/* call(path,method,body,{queue:true}) → first link that answers; HTTP 4xx/5xx from a real server is an ANSWER (not retried). */
function call(path,method,body,opt){opt=opt||{};var c=cfg(),tries=[];
  c.order.forEach(function(k){if(k==="queue")return;(c[k]||[]).forEach(function(a){tries.push([k,a])})});
  if(last){tries.sort(function(x,y){return(x[0]===last[0]&&x[1]===last[1]?-1:0)-(y[0]===last[0]&&y[1]===last[1]?-1:0)})}
  var i=0,errs=[];
  function next(){if(i>=tries.length){var r={ok:false,net:true,link:"none",err:"no link: "+errs.slice(-3).join(" · ")};
      if(opt.queue&&method==="POST"){enqueueOp(path,body,opt.kind);r.queued=true}emit("rmint:link",{link:"offline"});return Promise.resolve(r)}
    var t=tries[i++];return LINK[t[0]](t[1],path,method,body).then(function(j){
      if(j&&j._status===404&&/not found/i.test(String(j.error||j.err||""))&&i<tries.length){errs.push(t[0]+":404");return next()}
      last=[t[0],t[1]];ls(LK,last);j._link=t[0];j._via=t[1];emit("rmint:link",{link:t[0],via:t[1]});return j},
     function(e){errs.push(t[0]+":"+(e&&e.message||e));return next()})}
  return next()}
/* ---- offline op queue (session ops + sealed mints) ---- */
function enqueueOp(path,body,kind){if(/\/(rghostchain|rmint)\/(submit|bind)$/.test(path)){var s=body&&((body.asset&&body.asset.rsign_seal)||body.rsign_seal);if(!(s&&s.sig))return false}
  var q=ls(OK)||[];q.push({path:path,body:body,kind:kind||"op",t:new Date().toISOString()});ls(OK,q);emit("rmint:queue",{size:q.length});return true}
function ops(){return ls(OK)||[]}
function flush(){var q=ops(),keep=[],out=[];if(!q.length)return Promise.resolve({sent:0,left:0});
  return q.reduce(function(p,it){return p.then(function(){return call(it.path,"POST",it.body).then(function(r){if(r.net)keep.push(it);else out.push({kind:it.kind,ok:!!r.ok,r:r})})})},Promise.resolve())
   .then(function(){ls(OK,keep);emit("rmint:queue",{size:keep.length});return{sent:out.length,left:keep.length,results:out}})}
function probe(){return call("/rghostchain/health","GET").then(function(r){return{online:!r.net,link:r._link||"offline",via:r._via||null,height:r.real_blocks}})}
function status(){return{last:last,queued_ops:ops().length,queued_mints:(ls(QK)||[]).length,cfg:cfg()}}
var flushing=false;function auto(){if(flushing)return;flushing=true;flush().then(function(){if(w.RMINT_ONETAP&&w.RMINT_ONETAP.retry)return w.RMINT_ONETAP.retry()}).catch(function(){}).then(function(){flushing=false})}
if(w.addEventListener){w.addEventListener("online",auto);w.addEventListener("focus",auto)}setInterval(auto,30000);
w.RMINT_TRANSPORT={version:"1.0",call:call,flush:flush,probe:probe,status:status,cfg:cfg,setCfg:setCfg,enqueue:enqueueOp,ops:ops,ORDER:ORDER,DEFAULTS:DEF};
})(typeof window!=="undefined"?window:globalThis);

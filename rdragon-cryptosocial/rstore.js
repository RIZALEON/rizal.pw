/* rstore.js 1.1 · storage shim · 20261028 · load FIRST (before rdragon-config.js).
 * OWNER-SAFE RULE (t105u fix): device storage is ALWAYS the real browser storage unless the URL has ?nostore=1.
 *  - ?nostore=1        -> explicit test mode: in-memory localStorage/sessionStorage, indexedDB/caches stubs, no SW.
 *  - otherwise         -> real indexedDB and real caches are NEVER replaced or shadowed (the owner device key
 *                         lives in IndexedDB "rdragon.csp.keys"; stubbing it made Safari show the login page).
 *  - localStorage full (QuotaExceeded, common in Safari's ~5 MB) -> keep the REAL localStorage (reads still work),
 *                         only swallow write errors. Never fall back to memory just because a write failed.
 *  - localStorage access itself throws (cookies blocked) -> memory localStorage only; indexedDB stays real.
 * The probe is read-only (no write), so a full quota cannot trigger a false "no storage".
 * Nothing here throws. window.RDRAGON_STORAGE = {ok, mode, reason, forced, lsMemory, quotaFull, idbReal}. */
(function(w){"use strict";
var forced=false,reason="",ok=true,lsMemory=false,quotaFull=false;try{forced=/[?&]nostore=1(&|$)/.test(w.location.search||"")}catch(e){}
function memStorage(){var m={};return{getItem:function(k){k=String(k);return Object.prototype.hasOwnProperty.call(m,k)?m[k]:null},setItem:function(k,v){m[String(k)]=String(v)},removeItem:function(k){delete m[String(k)]},clear:function(){m={}},key:function(i){return Object.keys(m)[i]||null},get length(){return Object.keys(m).length},__memory:true}}
function def(name,val){try{Object.defineProperty(w,name,{value:val,configurable:true,writable:true});return w[name]===val}catch(e){try{w[name]=val}catch(x){}return w[name]===val}}
function lsReadable(){try{var s=w.localStorage;if(!s)return false;s.getItem("__rstore_probe");return true}catch(e){return false}}
function lsWritable(){try{var s=w.localStorage,k="__rstore_probe";s.setItem(k,"1");var v=s.getItem(k);s.removeItem(k);return v==="1"}catch(e){return false}}
if(forced){
 ok=false;reason="forced by ?nostore=1";
 var idbStub={open:function(){var req={result:null,error:new Error("storage unavailable"),onsuccess:null,onerror:null,onupgradeneeded:null,onblocked:null,addEventListener:function(t,f){req["on"+t]=f}};setTimeout(function(){try{req.onerror&&req.onerror({target:req})}catch(e){}},0);return req},deleteDatabase:function(){return idbStub.open()},__stub:true};
 var cacheStub={open:function(){return Promise.reject(new Error("storage unavailable"))},match:function(){return Promise.resolve(undefined)},keys:function(){return Promise.resolve([])},delete:function(){return Promise.resolve(false)},has:function(){return Promise.resolve(false)},__stub:true};
 def("localStorage",memStorage());try{def("sessionStorage",memStorage())}catch(e){}def("indexedDB",idbStub);def("caches",cacheStub);lsMemory=true;
}else{
 if(!lsReadable()){lsMemory=true;reason="localStorage blocked -> memory localStorage (indexedDB untouched)";def("localStorage",memStorage())}
 else{if(!lsWritable()){quotaFull=true;reason="localStorage full -> real storage kept, writes may fail"}
  try{var LS=w.localStorage,set=LS.setItem.bind(LS);LS.setItem=function(k,v){try{return set(k,v)}catch(e){try{console.warn("rstore: setItem failed",k,e&&e.name)}catch(x){}}}}catch(e){}}
}
var idbReal=false;try{idbReal=!!w.indexedDB&&!w.indexedDB.__stub}catch(e){}
w.RDRAGON_STORAGE={ok:ok,mode:ok?(lsMemory?"persistent-idb":"persistent"):"memory",reason:reason,forced:forced,lsMemory:lsMemory,quotaFull:quotaFull,idbReal:idbReal,VERSION:"rstore 1.1 20261028",memStorage:memStorage};
})(typeof window!=="undefined"?window:globalThis);

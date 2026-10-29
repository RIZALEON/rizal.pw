/* rstore.js · storage-optional shim · 20261028 · load FIRST (before rdragon-config.js).
 * Probes localStorage / IndexedDB / Cache / ServiceWorker. If any is denied (private mode, blocked cookies, quota 0)
 * or the page URL has ?nostore=1, the page runs fully in memory: localStorage -> in-memory Storage, indexedDB -> a stub
 * whose open() fails asynchronously (callers already handle onerror), caches -> rejecting stub, SW registration skipped.
 * Nothing here throws. window.RDRAGON_STORAGE = {ok, mode:"persistent"|"memory", reason, forced}. */
(function(w){"use strict";
var forced=false,reason="",ok=true;try{forced=/[?&]nostore=1(&|$)/.test(w.location.search||"")}catch(e){}
function memStorage(){var m={};return{getItem:function(k){k=String(k);return Object.prototype.hasOwnProperty.call(m,k)?m[k]:null},setItem:function(k,v){m[String(k)]=String(v)},removeItem:function(k){delete m[String(k)]},clear:function(){m={}},key:function(i){return Object.keys(m)[i]||null},get length(){return Object.keys(m).length},__memory:true}}
function lsOk(){try{var s=w.localStorage;if(!s)return false;var k="__rstore_probe";s.setItem(k,"1");var v=s.getItem(k);s.removeItem(k);return v==="1"}catch(e){return false}}
if(forced){ok=false;reason="forced by ?nostore=1"}else if(!lsOk()){ok=false;reason="localStorage denied"}
else{try{if(!w.indexedDB){ok=false;reason="indexedDB missing"}}catch(e){ok=false;reason="indexedDB denied"}}
function def(name,val){try{Object.defineProperty(w,name,{value:val,configurable:true,writable:true});return w[name]===val}catch(e){try{w[name]=val}catch(x){}return w[name]===val}}
var idbStub={open:function(){var req={result:null,error:new Error("storage unavailable"),onsuccess:null,onerror:null,onupgradeneeded:null,onblocked:null,addEventListener:function(t,f){req["on"+t]=f}};setTimeout(function(){try{req.onerror&&req.onerror({target:req})}catch(e){}},0);return req},deleteDatabase:function(){return idbStub.open()},__stub:true};
var cacheStub={open:function(){return Promise.reject(new Error("storage unavailable"))},match:function(){return Promise.resolve(undefined)},keys:function(){return Promise.resolve([])},delete:function(){return Promise.resolve(false)},has:function(){return Promise.resolve(false)},__stub:true};
if(!ok){def("localStorage",memStorage());try{def("sessionStorage",memStorage())}catch(e){}def("indexedDB",idbStub);def("caches",cacheStub)}
else{/* storage works, but a later quota/permission error must not throw into the page */
 try{var LS=w.localStorage,set=LS.setItem.bind(LS);LS.setItem=function(k,v){try{return set(k,v)}catch(e){try{console.warn("rstore: setItem failed",k,e&&e.name)}catch(x){}}}}catch(e){}}
w.RDRAGON_STORAGE={ok:ok,mode:ok?"persistent":"memory",reason:reason,forced:forced,VERSION:"rstore 1.0 20261028",memStorage:memStorage};
})(typeof window!=="undefined"?window:globalThis);

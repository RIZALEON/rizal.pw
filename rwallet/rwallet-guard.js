/* R:\ RWALLET UNIFIED · network guard · STAGED 20261026. Load FIRST. Only same-origin 127.0.0.1 requests pass; everything else is blocked and logged in window.RW_NET. No keys, no chain calls. */
(function(root){if(root.RW_NET)return;root.__errs=root.__errs||[];root.addEventListener("error",function(e){root.__errs.push(String(e.message)+" @"+(e.filename||"").split("/").pop()+":"+e.lineno)});root.addEventListener("unhandledrejection",function(e){root.__errs.push("rej: "+String(e.reason&&e.reason.message||e.reason))});var N=root.RW_NET={allowed:[],blocked:[]};
function ok(u){try{var x=new URL(u,location.href);return (x.origin===location.origin&&x.hostname==='127.0.0.1')||x.origin==='http://127.0.0.1:8329'||x.origin==='http://127.0.0.1:8811'}catch(e){return false}}
var of=root.fetch&&root.fetch.bind(root);root.fetch=function(u,o){var s=typeof u==='string'?u:(u&&u.url)||String(u);if(!ok(s)){N.blocked.push({via:'fetch',url:s});return Promise.reject(new Error('RW guard: blocked '+s))}N.allowed.push(s);return of(u,o)};
var XO=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u){if(!ok(u)){N.blocked.push({via:'xhr',url:String(u)});throw new Error('RW guard: blocked '+u)}N.allowed.push(String(u));return XO.apply(this,arguments)};
if(root.WebSocket){var WS=root.WebSocket;root.WebSocket=function(u){N.blocked.push({via:'ws',url:String(u)});throw new Error('RW guard: blocked ws')}}
if(root.EventSource){root.EventSource=function(u){N.blocked.push({via:'sse',url:String(u)});throw new Error('RW guard: blocked sse')}}
if(navigator.sendBeacon){navigator.sendBeacon=function(u){N.blocked.push({via:'beacon',url:String(u)});return false}}
root.RW_CASKET_EVENTS=[];root.addEventListener('rkrypt:request',function(e){root.RW_CASKET_EVENTS.push(e.detail&&e.detail.what)});
root.RKRYPT_PREVIEW=true;root.RWALLET_PREVIEW=true;root.RWALLET_WATCHONLY=true;
})(window);

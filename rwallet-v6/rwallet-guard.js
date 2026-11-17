/* ЯWALLET PRIVATE staged full-function guard · 20261110.
 * PRIVATE — not for public rizal.pw / rizal.info drop.
 * Allows: same-origin, loopback lab ports, public Solana RPC + GeckoTerminal.
 * Blocks everything else. Does not hold keys. Sign/mint still require the owner's
 * Face ID / RGHOSTKEY tap in the loaded mint-press / RGHOSTKEY modules.
 */
(function(root){
if(root.RW_NET)return;
root.__errs=root.__errs||[];
root.addEventListener("error",function(e){root.__errs.push(String(e.message)+" @"+(e.filename||"").split("/").pop()+":"+e.lineno)});
root.addEventListener("unhandledrejection",function(e){root.__errs.push("rej: "+String(e.reason&&e.reason.message||e.reason))});
var N=root.RW_NET={allowed:[],blocked:[]};
var PUBLIC={
  "api.mainnet-beta.solana.com":1,
  "solana-rpc.publicnode.com":1,
  "solana.drpc.org":1,
  "api.geckoterminal.com":1
};
function loopback(x){
  var h=x.hostname;
  return h==="127.0.0.1"||h==="localhost"||h==="::1";
}
function ok(u){
  try{
    var x=new URL(u,location.href);
    if(x.origin===location.origin) return true;
    if(loopback(x) && (x.protocol==="http:"||x.protocol==="https:")) return true;
    if(x.protocol==="https:" && PUBLIC[x.hostname]) return true;
    return false;
  }catch(e){return false}
}
var of=root.fetch&&root.fetch.bind(root);
root.fetch=function(u,o){
  var s=typeof u==="string"?u:(u&&u.url)||String(u);
  if(!ok(s)){N.blocked.push({via:"fetch",url:s});return Promise.reject(new Error("RW guard: blocked "+s))}
  N.allowed.push(s);
  return of(u,o);
};
var XO=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(m,u){
  if(!ok(u)){N.blocked.push({via:"xhr",url:String(u)});throw new Error("RW guard: blocked "+u)}
  N.allowed.push(String(u));
  return XO.apply(this,arguments);
};
root.RW_CASKET_EVENTS=[];
root.addEventListener("rkrypt:request",function(e){root.RW_CASKET_EVENTS.push(e.detail&&e.detail.what)});
root.RWALLET_WATCHONLY=false;
root.RWALLET_PRIVATE_FULL=true;
})(window);

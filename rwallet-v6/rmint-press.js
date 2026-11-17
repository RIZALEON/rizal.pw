/* rmint-press 1.0 · 20261108-rwallet · Я MINT · SIGN: the ONE press.
 * gate (rmint-gate.js, before ANY prompt) → one unlock with ANY ONE factor (biometric | ASSM password) in the native signer →
 * refuse unsigned → submit through rmint-transport (/rmint/bind | /rmint/submit with session + one-time nonce) → RTRACKR register
 * → receipt. Offline: the sealed request is queued and auto-sent on any link. Pages with no native signer route the UNSIGNED
 * request over RPIPE to a trusted phone (RMINT_ONETAP.route), still only after the gate passes for the signer side.
 * This file never holds, reads or makes a private key; it never signs. Rizal presses, Rizal unlocks. */
(function(w){"use strict";
function T(){return w.RMINT_TRANSPORT}function G(){return w.RMINT_GATE}function O(){return w.RMINT_ONETAP}
var STACK=["RGHOSTCHAIN","RWALLET","RVAULT","RMINT"],BOT="botlatch:view-only";
function now(){return new Date().toISOString().replace(/\.\d+Z$/,"Z")}
/* factors the native signer on THIS device offers (asked, never assumed) */
function factors(){if(w.RGHOSTKEY&&w.RGHOSTKEY.hasNative())return w.RGHOSTKEY.methods();   /* rw014: one rghostkey API, pinned key */
  var mh=w.webkit&&w.webkit.messageHandlers&&w.webkit.messageHandlers.rsign;
  if(mh&&mh.postMessage)return mh.postMessage({op:"factors"}).then(function(r){r=typeof r==="string"?JSON.parse(r):r;return(r&&r.factors)||["faceid","assm"]},function(){return["faceid"]});
  if(w.RSignNative&&w.RSignNative.factors)try{return Promise.resolve(JSON.parse(w.RSignNative.factors()).factors)}catch(e){}
  if(w.RSignNative&&w.RSignNative.seal)return Promise.resolve(["fingerprint"]);
  return Promise.resolve([])}
/* sealOneOf(entry, factor, secret) → native signer; factor = "faceid"|"fingerprint"|"touchid"|"biometric"|"assm" */
function sealOneOf(entry,factor,pw){if(w.RGHOSTKEY&&w.RGHOSTKEY.hasNative())return w.RGHOSTKEY.sign(entry,factor,pw);   /* rw014 */
  var mh=w.webkit&&w.webkit.messageHandlers&&w.webkit.messageHandlers.rsign,js=JSON.stringify(entry);
  if(mh&&mh.postMessage)return mh.postMessage(factor==="assm"?{op:"sealOneOf",factor:"assm",assm_password:pw,entry:js}:{op:"sealOneOf",factor:factor,entry:js})
    .then(function(r){return typeof r==="string"?JSON.parse(r):r},function(){return factor==="assm"?{ok:false,err:"this app build has no ASSM signer yet"}:mh.postMessage({op:"seal",entry:js}).then(function(r){return typeof r==="string"?JSON.parse(r):r})});
  var a=w.RSignNative;if(a&&(a.sealOneOf||a.seal))return new Promise(function(res){var id="rs"+Date.now();w["__rsign_"+id]=function(r){delete w["__rsign_"+id];res(typeof r==="string"?JSON.parse(r):r)};
    if(a.sealOneOf)a.sealOneOf(js,factor,factor==="assm"?(pw||""):"","__rsign_"+id);else if(factor==="assm")res({ok:false,err:"this app build has no ASSM signer yet (RSignNativeBridge)"});else a.seal(js,"__rsign_"+id)});
  return Promise.resolve({ok:false,err:"no native signer on this page"})}
function entryOf(r){var e=r&&(r.entry_json||r.entry);if(typeof e==="string")try{e=JSON.parse(e)}catch(x){e=null}return e}
/* what the press will sign: the pending bind (block 4) first, else a given asset */
function next(){return T().call("/rghostchain/bind/pending","GET").then(function(v){if(v.ok&&v.ready&&v.seal_entry)return{kind:"bind",index:v.index,label:"Block "+v.index+" · rghostkey_bind",v:v,prev:v.prev_hash};
  if(v.ok&&!v.ready)return{kind:"wait",index:v.index,label:"Block "+v.index+" waiting for "+(v.missing_pubkeys||[]).join(", ")};return{kind:"none",net:!!v.net,label:v.net?"offline":"nothing pending"}})}
/* press({factor, password, asset, mode, onStatus}) — the UI calls this only after the user picks/uses ONE factor */
function press(o){o=o||{};var cb=o.onStatus||function(){},mode=o.mode==="dry"?"dry":"live";
  return G().mintGated().then(function(g){
    if(g.soft){if(!g.signed_in){cb({state:"refused",msg:"Sign in with ASSM first"});return{ok:false,gate:false,why:"not signed in"}}   // SOFT: never seals, sends a REQUEST to a HARD device
      return next().then(function(n){if(n.kind!=="bind")return{ok:false,err:n.label};var entry={stack:STACK,botlatch_ref:BOT,ts:now()};for(var k in n.v.seal_entry)entry[k]=n.v.seal_entry[k];
        cb({state:"routing",msg:g.why});return O()?O().route("bind",mode,entry,null,n.label,cb):{ok:false,err:"rmint-onetap.js not loaded"}})}
    if(!g.ok){cb({state:"refused",msg:g.why});return{ok:false,gate:false,why:g.why}}             // refused BEFORE any prompt
    return next().then(function(n){var kind=o.asset?"mint":n.kind;
      if(kind!=="bind"&&kind!=="mint")return{ok:false,err:n.label};
      var entry;if(kind==="bind"){entry={stack:STACK,botlatch_ref:BOT,ts:now()};for(var k in n.v.seal_entry)entry[k]=n.v.seal_entry[k]}
      else return{ok:false,err:"asset mint: use RMINT_ONETAP.mint({asset}) after the gate (tip-bound entry)"};
      return factors().then(function(fs){
        if(!fs.length){cb({state:"routing",msg:"No signer here: sending the unsigned request to your trusted phone"});
          return O()?O().route("bind",mode,entry,null,n.label,cb):{ok:false,err:"rmint-onetap.js not loaded"}}
        if(o.factor==="assm"&&fs.indexOf("assm")<0)return{ok:false,err:"ASSM signing not in this app build yet"};
        var f=o.factor||fs[0];cb({state:"unlock",msg:f==="assm"?"Checking ASSM password…":"Waiting for "+f+"…"});
        var pre=f==="assm"&&!g.offline?T().call("/assm/factor/password","POST",{device_id:g.device,session_token:g.session_token,assm_user:o.user,assm_password:o.password}):Promise.resolve({ok:true});
        return pre.then(function(pr){if(!pr.ok&&pr._status!==501)return{ok:false,factor:"assm",err:pr.error||"password refused",locked_s:pr.locked_s||pr.retry_after_s};
          return sealOneOf(entry,f,o.password).then(function(r){o.password=null;var s=entryOf(r);
            if(!r||!r.ok||!s||!s.sig){if(f==="assm"&&r&&/password/i.test(String(r.err||"")))T().call("/assm/factor/fail","POST",{device_id:g.device},{queue:true});
              return{ok:false,err:"Not sealed: no signature · nothing sent"}}
            var body={mode:mode,rsign_seal:s,device_id:g.device,session_token:g.session_token,rmint_nonce:g.nonce};
            cb({state:"submit",msg:"Sealed · sending"});
            return T().call("/rmint/bind","POST",body,{queue:true,kind:"bind"}).then(function(x){
              if(x.net){cb({state:"queued",msg:"Sealed · queued · auto-sends when any link appears"});return{ok:false,queued:true,sealed:true}}
              if(x.relayed){cb({state:"relayed",msg:"Sealed · stored in RKLOWD · Neo forwards it to the chain"});return{ok:false,queued:true,relayed:true,sealed:true,relay_id:x.relay_id}}
              x.factor=f;x.signed_by=g.device;x.route=x._link;cb({state:x.ok?"done":"refused",msg:x.ok?"Minted":String(x.errors||x.error||"refused")});
              try{w.dispatchEvent(new CustomEvent("rmint:done",{detail:x}))}catch(e){}return x})})})})})})}
w.RMINT_PRESS={version:"1.0",press:press,next:next,factors:factors,sealOneOf:sealOneOf};
})(typeof window!=="undefined"?window:globalThis);

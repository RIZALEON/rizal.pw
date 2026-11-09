/* rmint-gate 1.1.1 · 20261109 RWALLET 0.1.2: = rizal.pw 1.1 (tiers) + offline pool sends purpose:"offline" (gate server 1.1 TTL) · 20261108-rwallet · mintGated(): the HARD gate checked BEFORE any signer prompt.
 *   1 trusted (device in the pinned trusted_devices.json) → 2 active → 3 ASSM session on this device → 4 one-time nonce
 * Online: asks submitd (/rmint/gate/status + /rmint/nonce). Offline: uses the last verified trust snapshot + the local session,
 * and a nonce from the pre-fetched pool (7-day TTL) so the queued submit is still gated server-side when it lands.
 * Refused → NO prompt is shown and nothing is sent. Never holds keys. */
(function(w){"use strict";
var SNAP="rmint.gate.snap.v1",POOL="rmint.nonce.pool.v1";
function ls(k,v){try{if(v===undefined)return JSON.parse(w.localStorage.getItem(k)||"null");w.localStorage.setItem(k,JSON.stringify(v))}catch(e){return null}}
var PRE={"moto":"moto-","17e":"iphone17e-","neo":"neo-","rvm":"rvm-"};
function rowFor(devs,id){devs=devs||[];var x=devs.filter(function(d){return d.device_id===id})[0];if(x)return x;var p=PRE[id];if(!p)return null;
  return devs.filter(function(d){return d.device_id.indexOf(p)===0&&d.status==="active"})[0]||devs.filter(function(d){return d.device_id.indexOf(p)===0})[0]||null}
/* 20261108 tiers (Rizal t45u/t46u): HARD = Neo, iphone17e, moto (seal) · SOFT = new RVM 0.3.1 + rizal.pw + rizal.info (login/view/queue/REQUEST only) */
var HARD_PRE=["neo-","iphone17e-","moto-"],SITES={"rizal.pw":"site-rizal.pw","www.rizal.pw":"site-rizal.pw","rizal.info":"site-rizal.info","www.rizal.info":"site-rizal.info","rizaleon.github.io":"site-rizal.pw"};
function isHard(r){if(!r||r.status!=="active")return false;if(r.tier)return r.tier==="hard";return HARD_PRE.some(function(p){return String(r.device_id).indexOf(p)===0})}
function isSoft(r){return!!r&&r.tier==="soft"&&r.status==="soft-approved"}
function siteId(){try{return SITES[w.location.hostname]||null}catch(e){return null}}
var rowFor0=rowFor;rowFor=function(devs,id){devs=devs||[];var p=PRE[id];
  if(p){var h=devs.filter(function(d){return d.device_id.indexOf(p)===0&&isHard(d)})[0];if(h)return h;var so=devs.filter(function(d){return d.device_id.indexOf(p)===0&&isSoft(d)})[0];if(so)return so}
  var r=rowFor0(devs,id);if(r)return r;var sid=siteId();return sid?devs.filter(function(d){return d.device_id===sid})[0]||null:null};
function T(){return w.RMINT_TRANSPORT}function S(){return w.RMINT_SESSION}
function snapshot(){return T().call("/rmint/gate/status","GET").then(function(r){if(r.ok&&r.devices){ls(SNAP,{t:Date.now(),devices:r.devices,revoked:r.revoked_devices||[]});return{online:true,s:r}}return{online:false,s:ls(SNAP)}})}
function pool(){return(ls(POOL)||[]).filter(function(n){return n.expires*1000>Date.now()+60000})}
function takeNonce(){var p=pool(),n=p.shift();ls(POOL,p);return n||null}
function refill(tok,dev,want){want=want||3;var p=pool();if(p.length>=want)return Promise.resolve(p.length);
  return T().call("/rmint/nonce","POST",{device_id:dev,session_token:tok,purpose:"offline"}).then(function(r){if(r.ok){p.push({nonce:r.nonce,expires:r.expires,device_id:r.device_id});ls(POOL,p);return p.length<want?refill(tok,dev,want):p.length}return p.length})}
/* -> {ok, why, device, row, nonce, offline, session_token} */
function mintGated(){var dev=S().deviceId(),info=S().info();
  return snapshot().then(function(sn){var s=sn.s||{},row=rowFor(s.devices,dev);
    if(!s.devices)return{ok:false,why:"no trust snapshot yet: connect once to any link",device:dev};
    if(!row)return{ok:false,why:"untrusted: this device is not in trusted_devices.json",device:dev};
    if(isSoft(row))return{ok:false,soft:true,route:"request",why:"SOFT device: your sign request goes to Neo / 17e / moto",device:dev,row:row,signed_in:!!info.signed_in};
    if(row.status==="active"&&!isHard(row))return{ok:false,why:"not a HARD device: only Neo, iphone17e and moto seal",device:dev,row:row};
    if(row.status!=="active")return{ok:false,why:"device trust is "+row.status+" (needs Rizal OK)",device:dev,row:row};
    if((s.revoked||s.revoked_devices||[]).indexOf(row.device_id)>=0)return{ok:false,why:"device revoked: sign in with ASSM again",device:dev,row:row};
    if(!info.signed_in)return{ok:false,why:"not signed in with ASSM on this device",device:dev,row:row};
    return S().token().then(function(tok){
      if(!tok&&info.server!==false)return{ok:false,why:"ASSM session missing on this device",device:dev,row:row};
      if(sn.online&&tok)return T().call("/rmint/nonce","POST",{device_id:dev,session_token:tok}).then(function(r){
          if(!r.ok)return{ok:false,why:r.error||"gate refused",device:dev,row:row};refill(tok,dev,3);return{ok:true,device:dev,row:row,nonce:r.nonce,session_token:tok,offline:false}});
      var n=takeNonce();return{ok:true,device:dev,row:row,nonce:n&&n.nonce,session_token:tok,offline:true,note:n?"offline: pooled nonce":"offline: no pooled nonce, server gate applies on landing"}})})}
w.RMINT_GATE={version:"1.1",mintGated:mintGated,snapshot:snapshot,refill:refill,pool:pool,isHard:isHard,isSoft:isSoft,rowFor:function(d,i){return rowFor(d,i)}};
w.mintGated=w.mintGated||mintGated;
})(typeof window!=="undefined"?window:globalThis);

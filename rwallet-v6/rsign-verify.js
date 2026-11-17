/* rsign-verify 0.1 · RSIGN seal / revoke / RGHOSTCHAIN pending verifier + WebAuthn assertion verifier.
 * Verify-only. Holds no private keys, never signs. Works in browsers (WebCrypto) and Node >= 18.
 * Entry hash = SHA-256( canon(entry minus "sig") ) as lowercase hex.
 * Signed message = UTF-8("rsign.v1|" + entry_hash). Signature = ECDSA P-256 / SHA-256, DER (X9.62) or raw r||s, base64.
 * Format spec: RSIGN-SEAL-FORMAT.md. */
(function(root,f){var m=f(root);if(typeof module==="object"&&module.exports)module.exports=m;else root.RSIGNV=m})(typeof self!=="undefined"?self:globalThis,function(root){"use strict";
var C=root.crypto&&root.crypto.subtle?root.crypto:(typeof require==="function"?require("crypto").webcrypto:null),S=C.subtle,TE=new TextEncoder();
var V=1,STACK=["RGHOSTCHAIN","RWALLET","RVAULT","RMINT"],RID=/^ЯID-\d{4}-[A-Z0-9]{4}$/,HEX64=/^[0-9a-f]{64}$/,GENESIS="0".repeat(64);
function canon(o){if(Array.isArray(o))return"["+o.map(canon).join(",")+"]";if(o&&typeof o==="object")return"{"+Object.keys(o).filter(function(k){return o[k]!==undefined}).sort().map(function(k){return JSON.stringify(k)+":"+canon(o[k])}).join(",")+"}";return JSON.stringify(o)}
function hex(u){return Array.from(new Uint8Array(u),function(x){return("0"+x.toString(16)).slice(-2)}).join("")}
function b64d(s){s=String(s).replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";var b=atob(s),u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u}
function b64(u){u=new Uint8Array(u);var s="";for(var i=0;i<u.length;i++)s+=String.fromCharCode(u[i]);return btoa(s)}
function strip(e){var o={};for(var k in e)if(k!=="sig")o[k]=e[k];return o}
function entryHash(e){return S.digest("SHA-256",TE.encode(canon(strip(e)))).then(hex)}
function msgFor(h){return TE.encode("rsign.v1|"+h)}
/* DER ECDSA -> raw 64-byte r||s (WebCrypto wants raw) */
function derToRaw(d){d=new Uint8Array(d);if(d.length===64)return d;if(d[0]!==0x30)throw Error("bad sig");var i=2;if(d[1]&0x80)i=2+(d[1]&0x7f);
 function int(){if(d[i++]!==0x02)throw Error("bad sig");var l=d[i++],v=d.slice(i,i+l);i+=l;while(v.length>32&&v[0]===0)v=v.slice(1);if(v.length>32)throw Error("bad sig");var o=new Uint8Array(32);o.set(v,32-v.length);return o}
 var r=int(),s=int(),out=new Uint8Array(64);out.set(r);out.set(s,32);return out}
/* pubkey: SPKI DER b64, or raw uncompressed 65-byte (0x04||X||Y) b64 as exported by SecKeyCopyExternalRepresentation */
/* RGENERATR KEYFORMS v1 mirror (see RGENERATR/KEYFORMS/rgen-keyforms.js; same vectors): any form -> on-curve 65-byte point */
var KP=BigInt("0xffffffff00000001000000000000000000000000ffffffffffffffffffffffff"),KB=BigInt("0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b"),KHDR=kfHexd("3059301306072a8648ce3d020106082a8648ce3d030107034200");
function kfHexd(h){var u=new Uint8Array(h.length/2);for(var i=0;i<u.length;i++)u[i]=parseInt(h.substr(2*i,2),16);return u}
function kfEq(a,b){if(!a||!b||a.length!==b.length)return false;for(var i=0;i<a.length;i++)if(a[i]!==b[i])return false;return true}
function kfOnCurve(r){if(!r||r.length!==65||r[0]!==4)return false;var x=BigInt("0x"+hex(r.slice(1,33))),y=BigInt("0x"+hex(r.slice(33))),v=(y*y-(x*x*x-3n*x+KB))%KP;return x<KP&&y<KP&&(v<0n?v+KP:v)===0n}
function kfFrom(b){var r=null;if(b.length===65&&b[0]===4)r=b;else if(b.length===91&&kfEq(b.slice(0,26),KHDR))r=b.slice(26);return r&&kfOnCurve(r)?r:null}
function toPoint(k){if(k instanceof Uint8Array)return kfFrom(k);if(typeof k!=="string"||!k.trim())return null;var s=k.trim(),t=s.indexOf("-----BEGIN")>=0?s.replace(/-----[^-]+-----|\s/g,""):s.replace(/\s/g,""),p=null;
 if(/^[A-Za-z0-9+/_=-]+$/.test(t)){try{p=kfFrom(b64d(t))}catch(e){p=null}}if(p)return p;if(/^[0-9a-fA-F]+$/.test(t)&&t.length%2===0)return kfFrom(kfHexd(t));return null}
function spkiOf(r){var o=new Uint8Array(91);o.set(KHDR);o.set(r,26);return o}
function deviceIdsFor(pub){var r=toPoint(pub);if(!r)return Promise.resolve([]);return Promise.all([S.digest("SHA-256",spkiOf(r)),S.digest("SHA-256",r)]).then(function(h){return["rsd-"+hex(h[0]).slice(0,32),"rsd-"+hex(h[1]).slice(0,32)]})}
function trustResolve(pub,did,devices){var pt=toPoint(pub);if(!pt)return Promise.resolve({ok:false,reason:"pubkey not a valid P-256 point in any form"});
 return deviceIdsFor(pub).then(function(ids){if(ids.indexOf(did)<0)return{ok:false,reason:"device_id not derived from this pubkey"};
  for(var i=0;i<(devices||[]).length;i++){var d=devices[i],dp=toPoint(d.pubkey_b64||"");if(dp&&kfEq(dp,pt)){if(d.status!=="active")return{ok:false,reason:"device "+d.device_id+" is "+d.status+", not active"};return{ok:true,reason:"",device:d}}}
  return{ok:false,reason:"pubkey not enrolled"}})}
/* verifyEntryTrusted: verifyEntry + the enrolled-device rule (point equality, derived id, active). Signature still required. */
function verifyEntryTrusted(e,devices){return verifyEntry(e).then(function(r){if(!r.ok)return r;return trustResolve(e.pubkey,e.device_id,devices).then(function(t){return t.ok?{ok:true,reason:"",hash:r.hash,device:t.device.device_id}:{ok:false,reason:"trust: "+t.reason,hash:r.hash}})})}
/* rotate 20261030: any key form (SPKI/raw/PEM/hex) -> point -> import as raw; off-curve/unknown form rejects */
function importPub(p){var r=toPoint(p);return r?S.importKey("raw",r,{name:"ECDSA",namedCurve:"P-256"},false,["verify"]):Promise.reject(Error("bad pubkey"))}
function verifyRaw(pub,sigb64,msg){return importPub(pub).then(function(k){var raw;try{raw=derToRaw(b64d(sigb64))}catch(e){return false}return S.verify({name:"ECDSA",hash:"SHA-256"},k,raw,msg)}).catch(function(){return false})}
function deviceIdFor(pub){return S.digest("SHA-256",b64d(pub)).then(function(h){return "rsd-"+hex(h).slice(0,32)})}
function shape(e){var r=[];if(!e||typeof e!=="object")return["not an object"];
 if(e.v!==V)r.push("v");if(!RID.test(e.owner_rid||""))r.push("owner_rid");if(typeof e.device_id!=="string")r.push("device_id");
 if(typeof e.pubkey!=="string")r.push("pubkey");if(!HEX64.test(e.prev_hash||""))r.push("prev_hash");if(isNaN(Date.parse(e.ts)))r.push("ts");if(typeof e.sig!=="string")r.push("sig");
 if(e.t==="rsign.seal"){if(!Array.isArray(e.stack)||canon(e.stack)!==canon(STACK))r.push("stack");if(!e.botlatch_ref)r.push("botlatch_ref");if(!/^@[A-Za-z0-9_]{2,30}$/.test(e.handle||""))r.push("handle")}
 else if(e.t==="rsign.revoke"){if(typeof e.revokes!=="string")r.push("revokes")}else r.push("t");return r}
/* verify one entry on its own (shape + device_id binds pubkey + signature by the entry's own pubkey). Revokes must be signed by a NON-revoked sealed device of the same owner: see verifyChain. */
function verifyEntry(e){var bad=shape(e);if(bad.length)return Promise.resolve({ok:false,reason:"shape: "+bad.join(",")});
 return Promise.all([entryHash(e),deviceIdsFor(e.pubkey)]).then(function(a){if(!a[1].length)return{ok:false,reason:"pubkey not a valid P-256 point",hash:a[0]};if(e.t==="rsign.seal"&&a[1].indexOf(e.device_id)<0)return{ok:false,reason:"device_id does not match pubkey",hash:a[0]};
  return verifyRaw(e.pubkey,e.sig,msgFor(a[0])).then(function(ok){return{ok:ok,reason:ok?"":"bad signature",hash:a[0]}})})}
/* verifyChain: entries in append order. prev_hash must link (first = GENESIS or opts.head). Returns state {devices:{device_id:{owner_rid,pubkey,sealed,revoked}}, head, rejected[]} */
function verifyChain(list,opts){opts=opts||{};var st={devices:{},head:opts.head||GENESIS,accepted:[],rejected:[]};
 return list.reduce(function(p,e){return p.then(function(){return verifyEntry(e).then(function(r){
  if(!r.ok){st.rejected.push({entry:e,reason:r.reason});return}
  if(e.prev_hash!==st.head){st.rejected.push({entry:e,reason:"prev_hash does not link"});return}
  if(opts.owner&&e.owner_rid!==opts.owner){st.rejected.push({entry:e,reason:"wrong owner"});return}
  if(e.t==="rsign.seal"){var d=st.devices[e.device_id];if(d&&d.revoked){st.rejected.push({entry:e,reason:"device revoked"});return}st.devices[e.device_id]={owner_rid:e.owner_rid,handle:e.handle,pubkey:e.pubkey,sealed:e.ts,hash:r.hash,revoked:false}}
  else{var sd=null,k;for(k in st.devices){var x=st.devices[k];if(x.pubkey===e.pubkey&&!x.revoked&&x.owner_rid===e.owner_rid)sd=k}
   if(!sd){st.rejected.push({entry:e,reason:"revoke not signed by a live sealed device of this owner"});return}
   var tg=st.devices[e.revokes];if(!tg||tg.owner_rid!==e.owner_rid){st.rejected.push({entry:e,reason:"unknown device"});return}tg.revoked=e.ts}
  st.head=r.hash;st.accepted.push(r.hash)})})},Promise.resolve()).then(function(){return st})}
/* validSeal: is there a live (sealed, not revoked) device for this owner? (used to gate RWALLET verbs) */
function validSeal(list,owner){return verifyChain(list||[],{owner:owner}).then(function(st){var live=Object.keys(st.devices).filter(function(k){return !st.devices[k].revoked});return{ok:live.length>0,devices:live,head:st.head,rejected:st.rejected.length}})}

/* ===== RGHOSTCHAIN offline events: append-only, hash-chained; reconcile appends follow-ups, never edits ===== */
function ghostAppend(chain,ev,signer){var prev=chain.length?chain[chain.length-1].hash:GENESIS,body=Object.assign({},ev,{prev:prev,seq:chain.length,ts:ev.ts||new Date().toISOString()});
 return S.digest("SHA-256",TE.encode(canon(body))).then(hex).then(function(h){var rec={body:body,hash:h};
  return(signer?signer(msgFor(h)).then(function(s){rec.sig=s;rec.pubkey=signer.pub}):Promise.resolve()).then(function(){chain.push(rec);return rec})})}
function ghostVerify(chain){var prev=GENESIS;return chain.reduce(function(p,r,i){return p.then(function(ok){if(!ok)return false;if(r.body.prev!==prev||r.body.seq!==i)return false;
 return S.digest("SHA-256",TE.encode(canon(r.body))).then(hex).then(function(h){if(h!==r.hash)return false;prev=h;return r.sig?verifyRaw(r.pubkey,r.sig,msgFor(h)):true})})},Promise.resolve(true))}
function ghostPending(chain){var done={};chain.forEach(function(r){if(r.body.status==="reconciled"||r.body.status==="rejected")done[r.body.ref]=1});return chain.filter(function(r){return r.body.status==="pending"&&!done[r.hash]})}
/* reconcile(chain, push(rec)->Promise<bool>, confirm(rec)->Promise<{ok,reason}>): for each open pending event push via ЯSYNC, confirm with rizal.pw, append follow-up referencing it */
function ghostReconcile(chain,push,confirm,signer){var out=[];return ghostPending(chain).reduce(function(p,r){return p.then(function(){return Promise.resolve(push(r)).then(function(pushed){if(!pushed)return;
 return Promise.resolve(confirm(r)).then(function(c){return ghostAppend(chain,{t:r.body.t+".followup",status:c&&c.ok?"reconciled":"rejected",ref:r.hash,reason:c&&c.reason||""},signer).then(function(x){out.push(x)})})}).catch(function(){})})},Promise.resolve()).then(function(){return out})}

/* ===== WebAuthn assertion verification (the check rdragon-cryptosocial's unlock was missing) =====
 * cred.pubkey = SPKI b64 from AuthenticatorAttestationResponse.getPublicKey() stored at enable time; alg -7 (ES256).
 * a = {clientDataJSON, authenticatorData, signature} as ArrayBuffer/Uint8Array or b64; exp = {challenge (Uint8Array|b64url), origin, rpId, signCount} */
function U(x){return typeof x==="string"?b64d(x):new Uint8Array(x)}
function b64url(u){return b64(u).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
function verifyWebAuthn(cred,a,exp){var cd=U(a.clientDataJSON),ad=U(a.authenticatorData),sg=U(a.signature),j;
 try{j=JSON.parse(new TextDecoder().decode(cd))}catch(e){return Promise.resolve({ok:false,reason:"clientData"})}
 if(j.type!=="webauthn.get")return Promise.resolve({ok:false,reason:"type"});
 var ch=typeof exp.challenge==="string"?exp.challenge.replace(/=+$/,""):b64url(exp.challenge);if(j.challenge!==ch)return Promise.resolve({ok:false,reason:"challenge"});
 if(exp.origin&&j.origin!==exp.origin)return Promise.resolve({ok:false,reason:"origin"});
 if(ad.length<37)return Promise.resolve({ok:false,reason:"authData"});var fl=ad[32];if(!(fl&1))return Promise.resolve({ok:false,reason:"user not present"});if(!(fl&4))return Promise.resolve({ok:false,reason:"user not verified"});
 var cnt=(ad[33]<<24|ad[34]<<16|ad[35]<<8|ad[36])>>>0;if(exp.signCount&&cnt&&cnt<=exp.signCount)return Promise.resolve({ok:false,reason:"signCount replay"});
 return S.digest("SHA-256",TE.encode(exp.rpId||"")).then(function(rh){rh=new Uint8Array(rh);for(var i=0;i<32;i++)if(rh[i]!==ad[i])return{ok:false,reason:"rpIdHash"};
  return S.digest("SHA-256",cd).then(function(ch2){var m=new Uint8Array(ad.length+32);m.set(ad);m.set(new Uint8Array(ch2),ad.length);
   return importPub(cred.pubkey).then(function(k){var raw;try{raw=derToRaw(sg)}catch(e){return{ok:false,reason:"sig"}}return S.verify({name:"ECDSA",hash:"SHA-256"},k,raw,m).then(function(ok){return{ok:ok,reason:ok?"":"bad signature",signCount:cnt}})})})})}
return{version:"0.1",V:V,STACK:STACK,GENESIS:GENESIS,canon:canon,entryHash:entryHash,message:msgFor,derToRaw:derToRaw,deviceIdFor:deviceIdFor,deviceIdsFor:deviceIdsFor,toPoint:toPoint,trustResolve:trustResolve,verifyEntryTrusted:verifyEntryTrusted,verifyEntry:verifyEntry,verifyChain:verifyChain,validSeal:validSeal,
 ghost:{append:ghostAppend,verify:ghostVerify,pending:ghostPending,reconcile:ghostReconcile},verifyWebAuthn:verifyWebAuthn,b64:b64,b64d:b64d,b64url:b64url};
});

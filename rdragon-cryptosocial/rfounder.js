/* rfounder.js 1.0 · 20261029 (t108u) · FOUNDER binding + password-wrapped founder recovery record, replicated in every layer.
 * The recovery record is created ONLY on Rizal's own device, after he logs in. It wraps his existing ЯCASKET package
 * (which itself holds only salt + KDF params + wrapped key + verifier) a second time:
 *   PBKDF2-SHA256, 600 000 iterations, 16-byte random salt (stored with the record), AES-GCM-256, 12-byte IV.
 * The blob is signed by the founder key (ECDSA P-256), and the key must hash to the registered founder profile id.
 * Copies: IndexedDB rdragon.csp.keys/"founder.recovery", localStorage "rdragon.csp.founder.recovery.v1",
 *         /data/founder/recovery.json (site + GHOSTMACHINE, committed from the downloaded file), Nostr relay note (tag rizalpw-founder-v1).
 * The plaintext password and the plaintext package never leave the browser tab. Bots only ever see ciphertext.
 * RISK: the public blob can be attacked offline; its safety equals the password's strength x the KDF cost. Use a long passphrase. */
(function(root,f){var m=f(root);if(typeof module==="object"&&module.exports)module.exports=m;else root.RFOUNDER=m})(typeof self!=="undefined"?self:this,function(root){
"use strict";
var VERSION="rfounder 1.0 20261029",FORMAT="rizalpw.founder-recovery.v1",ITER=600000,TAG="rizalpw-founder-v1",LSK="rdragon.csp.founder.recovery.v1",IDBK="founder.recovery",SITE="/data/founder/recovery.json";
var C=root.crypto||(typeof require==="function"?require("crypto").webcrypto:null),S=C&&C.subtle;
function enc(s){return new TextEncoder().encode(s)}function dec(b){return new TextDecoder().decode(b)}
function b64e(u){u=new Uint8Array(u);var s="";for(var i=0;i<u.length;i++)s+=String.fromCharCode(u[i]);return btoa(s)}
function b64d(s){var r=atob(s),u=new Uint8Array(r.length);for(var i=0;i<r.length;i++)u[i]=r.charCodeAt(i);return u}
function rnd(n){var u=new Uint8Array(n);C.getRandomValues(u);return u}
function H(h){h=String(h||"").trim();if(h&&h[0]!=="@")h="@"+h;return h.toLowerCase()}
function signed(b){return [FORMAT,b.handle,b.rid||"",b.profile,b.pub,b.kdf.name,b.kdf.iter,b.kdf.salt,b.iv,b.ct,b.created].join("\n")}
function key(pass,salt,iter){return S.importKey("raw",enc(pass),"PBKDF2",false,["deriveKey"]).then(function(k){return S.deriveKey({name:"PBKDF2",hash:"SHA-256",salt:salt,iterations:iter},k,{name:"AES-GCM",length:256},false,["encrypt","decrypt"])})}
/* wrap(pkg, password, signer{pub,sign}, meta{handle,rid,profile}) -> signed blob (no plaintext inside) */
function wrap(pkg,pass,signer,meta,opt){opt=opt||{};if(!pass||String(pass).length<8)return Promise.reject(Error("password too short"));var iter=opt.iter||ITER,salt=rnd(16),iv=rnd(12);
 return key(pass,salt,iter).then(function(k){return S.encrypt({name:"AES-GCM",iv:iv},k,enc(JSON.stringify(pkg)))}).then(function(ct){
  var b={format:FORMAT,v:1,role:"FOUNDER",handle:H(meta.handle),rid:meta.rid||null,profile:meta.profile,pub:signer.pub,kdf:{name:"PBKDF2-SHA256",iter:iter,salt:b64e(salt)},cipher:"AES-GCM-256",iv:b64e(iv),ct:b64e(ct),created:new Date().toISOString(),
   note:"Password-wrapped ЯCASKET founder recovery. Only the founder's password opens it, in the browser. Contains no plaintext."};
  return Promise.resolve(signer.sign(signed(b))).then(function(sig){b.sig=sig;return b})})}
/* structural + signature check; opt.profileIdFor(pub) must equal the registered founder profile */
function verify(b,founder,profileIdFor){try{if(!b||b.format!==FORMAT||typeof b.ct!=="string"||!b.kdf||b.kdf.name!=="PBKDF2-SHA256"||!(b.kdf.iter>=(root.RFOUNDER_MIN_ITER||100000))||b.ct.length>200000)return Promise.resolve({ok:false,why:"not a founder recovery record"});
 if(founder&&(H(b.handle)!==H(founder.handle)||b.profile!==founder.profile))return Promise.resolve({ok:false,why:"record is for another profile"});
 return S.importKey("raw",b64d(b.pub),{name:"ECDSA",namedCurve:"P-256"},false,["verify"]).then(function(k){return S.verify({name:"ECDSA",hash:"SHA-256"},k,b64d(b.sig),enc(signed(b)))}).then(function(ok){
  if(!ok)return {ok:false,why:"bad signature"};if(!profileIdFor)return {ok:true};return Promise.resolve(profileIdFor(b.pub)).then(function(id){return id===b.profile?{ok:true}:{ok:false,why:"signer is not the founder key"}})},function(){return {ok:false,why:"bad key"}})}catch(e){return Promise.resolve({ok:false,why:"invalid"})}}
/* unwrap(blob, password) -> package; a wrong password fails AES-GCM authentication */
function unwrap(b,pass){return key(pass,b64d(b.kdf.salt),b.kdf.iter).then(function(k){return S.decrypt({name:"AES-GCM",iv:b64d(b.iv)},k,b64d(b.ct))}).then(function(pt){return JSON.parse(dec(pt))},function(){var e=Error("password does not open the founder recovery record");e.code="mismatch";throw e})}
/* layer fetchers (each resolves to a blob or null; never throws) */
function fromSite(url){try{if(typeof fetch!=="function")return Promise.resolve(null);return fetch(url||SITE,{cache:"no-store"}).then(function(r){return r.ok?r.json():null}).catch(function(){return null})}catch(e){return Promise.resolve(null)}}
function fromRelay(relays,ms){var WS=root.WebSocket;if(typeof WS!=="function"||!relays||!relays.length)return Promise.resolve([]);ms=ms||4000;
 return new Promise(function(done){var out=[],open=relays.length,fin=false,socks=[];function end(){if(fin)return;fin=true;socks.forEach(function(s){try{s.close()}catch(e){}});done(out)}
  setTimeout(end,ms);relays.forEach(function(u){try{var s=new WS(u),id="rf"+Math.random().toString(36).slice(2,8);socks.push(s);
   s.onopen=function(){try{s.send(JSON.stringify(["REQ",id,{kinds:[1],"#t":[TAG],limit:20}]))}catch(e){}};
   s.onmessage=function(m){try{var a=JSON.parse(m.data);if(a[0]==="EVENT"&&a[2]){var b=JSON.parse(a[2].content);if(b&&b.format===FORMAT)out.push(b)}else if(a[0]==="EOSE"){if(--open<=0)end()}}catch(e){}};
   s.onerror=function(){if(--open<=0)end()}}catch(e){if(--open<=0)end()}})})}
/* relay publish: an ephemeral Nostr key carries the note; authenticity comes from the founder signature inside */
function toRelay(b,relays,N){if(!N||typeof root.WebSocket!=="function")return Promise.resolve({sent:0,why:"no relay lib"});var sk=N.generateSecretKey(),ev=N.finalizeEvent({kind:1,created_at:Math.floor(Date.now()/1000),tags:[["t",TAG],["client","rizal.pw"],["L","founder-recovery"]],content:JSON.stringify(b)},sk);
 return Promise.all(relays.map(function(u){return new Promise(function(ok){try{var s=new root.WebSocket(u),t=setTimeout(function(){try{s.close()}catch(e){}ok(false)},6000);s.onopen=function(){s.send(JSON.stringify(["EVENT",ev]))};s.onmessage=function(m){try{var a=JSON.parse(m.data);if(a[0]==="OK"){clearTimeout(t);try{s.close()}catch(e){}ok(!!a[2])}}catch(e){}};s.onerror=function(){clearTimeout(t);ok(false)}}catch(e){ok(false)}})})).then(function(r){return {sent:r.filter(Boolean).length,of:relays.length,id:ev.id}})}
return {VERSION:VERSION,FORMAT:FORMAT,ITER:ITER,TAG:TAG,LSK:LSK,IDBK:IDBK,SITE:SITE,wrap:wrap,unwrap:unwrap,verify:verify,fromSite:fromSite,fromRelay:fromRelay,toRelay:toRelay,signedText:signed};
});

/* rsite-auth 1.0 — self-owned username+password login for rizal.pw (static GitHub Pages, no third party).
   /data/auth/vault.json = ciphertext only. Each entry: id = SHA-256("rsite-auth.v1|"+@handle),
   key = PBKDF2-SHA256(password, salt||handle, >=600000) -> AES-GCM-256 over the SAME login record the device path uses ({rec,pid,pkg}).
   The whole vault is Ed25519-signed by a SITE KEY Rizal generates on his own device; only the PUBLIC key is pinned in rdragon-config.js
   (siteAuth.pub). Unsigned / wrongly-signed / weak-KDF vaults are refused. Off until siteAuth.pub is set. Fallback: device -> ЯCASKET/founder (LOCKED).
   Tradeoff: the ciphertext is public, so anyone can guess passwords offline — security = password strength x 600k PBKDF2; use a long passphrase. */
(function(root,f){var m=f(root);if(typeof module==="object"&&module.exports)module.exports=m;else root.RSITEAUTH=m})(typeof self!=="undefined"?self:globalThis,function(root){"use strict";
var C=root.crypto||(typeof require==="function"?require("crypto").webcrypto:null),S=C.subtle,TE=new TextEncoder(),TD=new TextDecoder();
var FORMAT="rsite-auth.vault.v1",MIN_ITER=600000;
function b64(u){u=new Uint8Array(u);var s="";for(var i=0;i<u.length;i++)s+=String.fromCharCode(u[i]);return btoa(s)}
function ub(s){var b=atob(s),u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u}
function hex(u){return Array.from(new Uint8Array(u),function(x){return("0"+x.toString(16)).slice(-2)}).join("")}
function H(h){h=String(h||"").trim().toLowerCase();return h?(h[0]==="@"?h:"@"+h):"@"}
function canon(o){if(Array.isArray(o))return"["+o.map(canon).join(",")+"]";if(o&&typeof o==="object")return"{"+Object.keys(o).sort().map(function(k){return JSON.stringify(k)+":"+canon(o[k])}).join(",")+"}";return JSON.stringify(o)}
function body(v){return TE.encode(canon({format:v.format,entries:v.entries}))}
function id(h){return S.digest("SHA-256",TE.encode("rsite-auth.v1|"+H(h))).then(hex)}
function key(pw,salt,h,iter,use){return S.importKey("raw",TE.encode(pw),"PBKDF2",false,["deriveKey"]).then(function(k){var s=new Uint8Array(salt.length+TE.encode(H(h)).length);s.set(salt);s.set(TE.encode(H(h)),salt.length);
 return S.deriveKey({name:"PBKDF2",hash:"SHA-256",salt:s,iterations:iter},k,{name:"AES-GCM",length:256},false,[use])})}
/* seal: run on Rizal's own device (owner tool). Returns one entry; password never leaves the browser/process. */
function seal(h,pw,payload,iter){iter=Math.max(iter|0,MIN_ITER);var salt=C.getRandomValues(new Uint8Array(16)),iv=C.getRandomValues(new Uint8Array(12));
 return Promise.all([id(h),key(pw,salt,h,iter,"encrypt")]).then(function(a){return S.encrypt({name:"AES-GCM",iv:iv,additionalData:TE.encode(a[0])},a[1],TE.encode(JSON.stringify(payload))).then(function(ct){
  return{id:a[0],kdf:"PBKDF2-SHA256",iter:iter,salt:b64(salt),iv:b64(iv),ct:b64(ct)}})})}
function sign(v,priv){return S.sign({name:"Ed25519"},priv,body(v)).then(function(s){v.sig=b64(s);return v})}
function verify(v,pubB64){if(!v||v.format!==FORMAT||!Array.isArray(v.entries)||!v.sig||!pubB64)return Promise.resolve(false);
 if(v.entries.some(function(e){return e.kdf!=="PBKDF2-SHA256"||!(e.iter>=MIN_ITER)}))return Promise.resolve(false);
 return S.importKey("raw",ub(pubB64),{name:"Ed25519"},false,["verify"]).then(function(k){return S.verify({name:"Ed25519"},k,ub(v.sig),body(v))}).catch(function(){return false})}
function open(v,h,pw){return id(h).then(function(i){var e=v.entries.filter(function(x){return x.id===i})[0];if(!e)return null;
 return key(pw,ub(e.salt),h,e.iter,"decrypt").then(function(k){return S.decrypt({name:"AES-GCM",iv:ub(e.iv),additionalData:TE.encode(i)},k,ub(e.ct))})
  .then(function(pt){return JSON.parse(TD.decode(pt))},function(){return null})})} /* wrong password -> null */
var CACHE=null;
function cfg(){return((root.RDRAGON_CONFIG||{}).siteAuth)||{}}
function enabled(){return!!cfg().pub}
function load(){if(CACHE)return CACHE;var c=cfg();CACHE=fetch(c.url||"/data/auth/vault.json",{cache:"no-cache"}).then(function(r){if(!r.ok)throw Error("http "+r.status);return r.json()})
 .then(function(v){return verify(v,c.pub).then(function(ok){if(!ok)throw Error("vault signature/KDF check failed");return v})}).catch(function(e){CACHE=null;throw e});return CACHE}
/* rec: same shape as pwRec() or null. Never throws (falls through to local/ЯCASKET paths). */
function rec(h,pw){if(!enabled())return Promise.resolve(null);return load().then(function(v){return open(v,h,pw)}).then(function(p){return p&&p.rec?{handle:H(h),rec:p.rec,pid:p.pid||null,pkg:p.pkg||null,pw:1,src:"site"}:null})
 .catch(function(e){try{console.warn("rsite-auth unavailable, using local paths:",e.message)}catch(_){}return null})}
return{VERSION:"1.0",FORMAT:FORMAT,MIN_ITER:MIN_ITER,id:id,seal:seal,sign:sign,verify:verify,open:open,rec:rec,enabled:enabled,canon:canon,_reset:function(){CACHE=null}};
});

/* RKAST core 1.0 · 20261114 (Rizal pt345u "website side and RKAST to devices, RTRACKR, TerraformЯ minting") · STAGED, branch only.
 * RKAST (RappKAST) = the cast from the website (and every own relay) to Rizal's devices. Until today RKAST was only the Neo's
 * read-only RPIPE transponder (PIPE/rpipe_cast.py) that checks appcast/eggcast feeds for drift. This file is the WEBSITE side:
 * one message format that every device app can read with no Neo involved.
 *   - A message is a plain ЯSYNC entry {id, t:"rkast.msg", ts, kind, title, text, ref, src[, dry]} so rsync-core.js
 *     (rdragon-cryptosocial/rsync-core.js, already in every RWALLET/RDRAGON web copy) merges it by content id; no new sync code.
 *   - A feed is an "rsync.bundle.v1" (same shape as RSync.bundle()), served statically at /rkast/feed.json.
 *   - Kinds: notice · appcast · eggcast · rtrackr.block · cryptoupdate · rtrackr.dry (local tests only, never in the public feed).
 *   - Public Nostr relays are BACKUP ONLY and only ever carry an RKRYPT-style encrypted bundle (PBKDF2-SHA256 310000 →
 *     AES-GCM-256, the same scheme as rkrypt.rzl.js setPassword). No channel key on the device = Nostr backup off (fails closed).
 * DISPLAY ONLY: an RKAST message never signs, mints, moves funds, installs or approves anything. No keys in this file.
 * Works in browsers, app WebViews and Node 18+ (WebCrypto). */
(function(root,f){var m=f(root);if(typeof module==="object"&&module.exports)module.exports=m;else root.RKAST_CORE=m})(typeof self!=="undefined"?self:this,function(root){
"use strict";
var VERSION="1.0",T="rkast.msg",TAG="rzl-rkast-v1",ALG="rkrypt.aesgcm.pbkdf2.v1",ITER=310000;
var KINDS=["notice","appcast","eggcast","rtrackr.block","cryptoupdate","rtrackr.dry"];
var C=(root&&root.crypto&&root.crypto.subtle)?root.crypto:(typeof globalThis!=="undefined"&&globalThis.crypto)||null;
var enc=new TextEncoder(),dec=new TextDecoder();
function canon(v){return Array.isArray(v)?"["+v.map(canon).join(",")+"]":v&&typeof v==="object"?"{"+Object.keys(v).sort().filter(function(k){return v[k]!==undefined}).map(function(k){return JSON.stringify(k)+":"+canon(v[k])}).join(",")+"}":JSON.stringify(v)}
function hex(b){return Array.prototype.map.call(new Uint8Array(b),function(x){return("0"+x.toString(16)).slice(-2)}).join("")}
function sha256(s){return C.subtle.digest("SHA-256",typeof s==="string"?enc.encode(s):s).then(hex)}
function b64(u8){u8=new Uint8Array(u8);var s="";for(var i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return typeof btoa==="function"?btoa(s):Buffer.from(u8).toString("base64")}
function unb64(s){if(typeof atob==="function"){var r=atob(s),u=new Uint8Array(r.length);for(var i=0;i<r.length;i++)u[i]=r.charCodeAt(i);return u}return new Uint8Array(Buffer.from(s,"base64"))}
/* message: id is derived from the content, so the same message from two relays is one message. */
function message(m){var e={t:T,kind:String(m.kind||"notice"),title:String(m.title||"").slice(0,140),text:String(m.text||"").slice(0,2000),ref:String(m.ref||"").slice(0,300),src:String(m.src||"rizal.pw").slice(0,60),ts:String(m.ts||new Date().toISOString())};
 if(m.dry)e.dry=true;if(m.data&&typeof m.data==="object")e.data=m.data;
 return sha256(canon(e)).then(function(h){e.id="rk-"+h.slice(0,24);return e})}
function valid(e){return !!(e&&e.t===T&&/^rk-[0-9a-f]{24}$/.test(String(e.id||""))&&KINDS.indexOf(e.kind)>=0&&typeof e.title==="string"&&e.title.length<=140&&typeof e.text==="string"&&e.text.length<=2000)}
function bundle(entries,meta){var b={format:"rsync.bundle.v1",version:"rkast-"+VERSION,entries:entries.slice()};if(meta)b.rkast=meta;return b}
/* RKRYPT-style sealed box for the public Nostr backup. pass = the channel passphrase each own device gets at pairing (never in code). */
function key(pass,salt){return C.subtle.importKey("raw",enc.encode(String(pass)),"PBKDF2",false,["deriveKey"]).then(function(base){return C.subtle.deriveKey({name:"PBKDF2",salt:salt,iterations:ITER,hash:"SHA-256"},base,{name:"AES-GCM",length:256},false,["encrypt","decrypt"])})}
function seal(obj,pass){if(!pass)return Promise.reject(new Error("RKAST: no channel key, public relay backup refused (never plaintext)"));
 var salt=C.getRandomValues(new Uint8Array(16)),iv=C.getRandomValues(new Uint8Array(12));
 return key(pass,salt).then(function(k){return C.subtle.encrypt({name:"AES-GCM",iv:iv},k,enc.encode(JSON.stringify(obj)))}).then(function(ct){return{v:1,alg:ALG,iter:ITER,salt:b64(salt),iv:b64(iv),ct:b64(ct)}})}
function open(box,pass){if(!pass)return Promise.reject(new Error("RKAST: no channel key"));if(!box||box.alg!==ALG||box.v!==1)return Promise.reject(new Error("RKAST: not an RKRYPT box"));
 return key(pass,unb64(box.salt)).then(function(k){return C.subtle.decrypt({name:"AES-GCM",iv:unb64(box.iv)},k,unb64(box.ct))}).then(function(pt){return JSON.parse(dec.decode(pt))})}
/* Nostr backup event TEMPLATE (unsigned). The listener signs it with an ephemeral per-session key like rrelay.js does; never an owner key. */
function nostrTemplate(box){return{kind:1,created_at:Math.floor(Date.now()/1000),tags:[["t",TAG]],content:JSON.stringify(box)}}
function isPlaintextBundle(content){try{var j=JSON.parse(content);return !!(j&&(j.entries||j.format))}catch(e){return false}}
return{VERSION:VERSION,T:T,TAG:TAG,ALG:ALG,KINDS:KINDS,canon:canon,sha256:sha256,message:message,valid:valid,bundle:bundle,seal:seal,open:open,nostrTemplate:nostrTemplate,isPlaintextBundle:isPlaintextBundle};
});

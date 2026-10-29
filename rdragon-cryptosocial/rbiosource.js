/* rbiosource.js v1 (2026-10-29) — public founder bio-source record (ya.bio-source.v1) for @chaserizal / ЯID-0001-3QQS.
 * The site never signs it. Rizal signs ONCE in ЯCASKET (Face ID); the detached signature goes in /data/founder/bio-source.sig.json:
 *   {format:"rizalpw.bio-source-sig.v1", record_sha256:<hex sha256 of the exact bytes of bio-source.json>, pub:<raw P-256 b64>, sig:<ECDSA-P256-SHA256 raw r||s b64>}
 *   signed message = "rizalpw.bio-source-sig.v1\n" + record_sha256. Valid only if profileIdFor(pub) === RDRAGON_CONFIG.founder.profile. Public fields only. */
(function(root,f){var m=f(root);if(typeof module==="object"&&module.exports)module.exports=m;else root.RBIOSOURCE=m})(typeof self!=="undefined"?self:this,function(root){
"use strict";var VERSION=1,SIGF="rizalpw.bio-source-sig.v1",REC="/data/founder/bio-source.json",SIG="/data/founder/bio-source.sig.json",S=(root.crypto||{}).subtle;
function enc(s){return new TextEncoder().encode(s)}function hex(b){return Array.from(new Uint8Array(b)).map(function(x){return x.toString(16).padStart(2,"0")}).join("")}
function b64d(s){var r=atob(s),u=new Uint8Array(r.length);for(var i=0;i<r.length;i++)u[i]=r.charCodeAt(i);return u}
function sha(bytes){return S.digest("SHA-256",bytes).then(hex)}
function pid(pub){if(root.RSync&&root.RSync.profileIdFor)return root.RSync.profileIdFor(pub);return sha(enc("rsync-profile-v1\n"+pub)).then(function(h){return "RP-"+h.slice(0,16)})}
/* verify(recordText, sigObj|null, founderProfile) -> {state:"signed"|"pending"|"invalid", why, sha256} */
function verify(text,sig,profile){return sha(enc(text)).then(function(h){
 if(!sig)return {state:"pending",why:"pending ЯCASKET signature",sha256:h};
 try{if(sig.format!==SIGF||typeof sig.pub!=="string"||typeof sig.sig!=="string")return {state:"invalid",why:"not a bio-source signature",sha256:h};
  if(sig.record_sha256!==h)return {state:"invalid",why:"signature is for a different record hash",sha256:h};
  return S.importKey("raw",b64d(sig.pub),{name:"ECDSA",namedCurve:"P-256"},false,["verify"]).then(function(k){return S.verify({name:"ECDSA",hash:"SHA-256"},k,b64d(sig.sig),enc(SIGF+"\n"+h))}).then(function(ok){
   if(!ok)return {state:"invalid",why:"bad signature",sha256:h};return Promise.resolve(pid(sig.pub)).then(function(id){return id===profile?{state:"signed",why:"signed by founder key",sha256:h}:{state:"invalid",why:"signer is not the founder key",sha256:h}})},function(){return {state:"invalid",why:"bad key",sha256:h}})}catch(e){return {state:"invalid",why:"invalid",sha256:h}}})}
function load(){if(typeof fetch!=="function")return Promise.resolve(null);var prof=((root.RDRAGON_CONFIG||{}).founder||{}).profile;
 return fetch(REC,{cache:"no-cache"}).then(function(r){return r.ok?r.text():null}).then(function(t){if(!t)return null;var rec=JSON.parse(t);
  return fetch(SIG,{cache:"no-cache"}).then(function(r){return r.ok?r.json():null}).catch(function(){return null}).then(function(sig){return verify(t,sig,prof)}).then(function(v){return {record:rec,v:v}})}).catch(function(){return null})}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function href(b){if(b.url)return b.url;var h=String(b.handle||"").replace(/^@/,"");return b.platform==="x"?"https://x.com/"+h:b.platform==="github"?"https://github.com/"+h:""}
function html(r){if(!r)return "";var st=r.v.state==="signed"?"✓ signed":r.v.state==="pending"?"pending ЯCASKET signature":"signature invalid";
 return '<div class="csp-biosrc-h">bio sources · '+esc(r.record.rid)+' · <span data-state="'+r.v.state+'">'+esc(st)+'</span></div>'+(r.record.bio_sources||[]).map(function(b){var u=href(b);return '<a target="_blank" rel="noopener" href="'+esc(u)+'">'+esc(b.platform)+' '+esc(b.handle||String(b.url).replace(/^https?:\/\//,""))+'</a>'}).join("")}
function line(b){return String(b.platform||"site")+" "+(b.handle||b.url||"")}
function parse(l){var m=String(l).trim().match(/^(\S+)\s+(\S+)$/);if(!m)return null;return /^https?:\/\//i.test(m[2])?{platform:m[1],url:m[2]}:{platform:m[1],handle:m[2]}}
function lines(){return cache&&cache.record?(cache.record.bio_sources||[]).map(line).join("\n"):""}
var cache=null;function paint(){var d=root.document,el=d&&d.getElementById("csp-biosrc");if(el&&cache&&!el.dataset.done){el.innerHTML=html(cache);el.dataset.done="1"}var st=d&&d.getElementById("bio-st");if(st&&cache&&!st.dataset.done){st.textContent=(cache.v.state==="signed"?"signed":cache.v.state==="pending"?"pending ЯCASKET signature":"signature invalid: "+cache.v.why)+" · record sha256 "+cache.v.sha256;st.dataset.done="1"}}
if(root.document&&typeof fetch==="function"){load().then(function(r){cache=r;paint();try{new MutationObserver(paint).observe(root.document.body,{childList:true,subtree:true})}catch(e){}})}
return {VERSION:VERSION,SIGF:SIGF,verify:verify,load:load,html:html,href:href,line:line,parse:parse,lines:lines};
});

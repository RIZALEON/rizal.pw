/* rmint-onetap 1.0 · 20261104 (pt142u/t146u) · ONE-TAP MINT for every RWALLET: RDRAGON (Neo/iOS/Android), rizal.pw, RVM.
 * Port of TerraformЯ _open_rw_mint: pending fill (block-4 bind first) → chain tip → ONE unlock → refuse unsigned → LIVE submit → RTRACKR register
 * → offline queue + retry. Kubo picks the block up from the published snapshot.
 * Keys: this file NEVER holds, reads or makes a private key. Signing happens only in a native signer (iOS RSignCore Secure Enclave via
 * webkit.messageHandlers.rsign, Android RSignPlugin via window.RSignNative, Capacitor Plugins.RSign). With no pinned signer here
 * (Neo app, rizal.pw, RVM) the UNSIGNED request is routed over RPIPE (/rscale/mint) to a pinned trusted device, where the one unlock happens. */
(function(w){"use strict";
var OWNER="ЯID-0001-3QQS",HANDLE="@chaserizal",STACK=["RGHOSTCHAIN","RWALLET","RVAULT","RMINT"],BOT="botlatch:view-only",QK="rmint.queue.v1",TK="rmint.untrusted.v1";
var KIND={cryptogame:"game.asset",cryptobot_mint:"cryptobot",nft_mint:"game.asset",cryptoart:"cryptoart",cryptosocial:"cryptosocial"},NO_PRICE=["transfer","convert","index","token"];
var loc=w.location||{},host=String(loc.hostname||""),isNeo=/^(127\.0\.0\.1|localhost)$/.test(host)&&!(w.DSNative||(w.webkit&&w.webkit.messageHandlers&&w.webkit.messageHandlers.rsign&&/iP(hone|ad)/.test((w.navigator||{}).userAgent||"")));
var CFG=w.RMINT_CFG||{};
var CHAIN=CFG.chain||(isNeo||/rizal\.(pw|info)$/.test(host)?["http://127.0.0.1:8765","http://127.0.0.1:8741"]:["http://127.0.0.1:8765"]);
var PIPE=CFG.pipe||(isNeo||/rizal\.(pw|info)$/.test(host)?["http://127.0.0.1:8900/rscale"]:["http://127.0.0.1:8799/rscale","http://127.0.0.1:8900/rscale"]);
var NODE=CFG.node||(w.DSNative?"moto":(w.webkit&&w.webkit.messageHandlers&&/iP(hone|ad)/.test((w.navigator||{}).userAgent||"")?"17e":(/rvm/i.test(host)?"rvm":"neo")));
function ls(k,v){try{if(v===undefined)return JSON.parse(w.localStorage.getItem(k)||"null");w.localStorage.setItem(k,JSON.stringify(v))}catch(e){return null}}
var SK="rmint.status.cache.v1";
function cacheablePath(path){var p=String(path||"").split("?")[0];return p==="/rtrackr/assets"||p==="/rghostchain/health"||p==="/rmint/gate/status"}
function statusCache(path,val){var k=String(path||"").split("?")[0],c=ls(SK)||{};if(val===undefined)return c[k]||null;c[k]={at:new Date().toISOString(),data:val};ls(SK,c);return val}
function cachedReply(path){var h=statusCache(path);if(!h||!h.data)return null;var j={};for(var k in h.data)j[k]=h.data[k];j.cached=true;j.live=false;j.source="cached";j.label="cached";j.cached_at=h.at;return j}
function now(){return new Date().toISOString().replace(/\.\d+Z$/,"Z")}
function call(bases,path,method,body,hdr){var i=0;function go(){var h={"Content-Type":"text/plain"};for(var k in hdr||{})h[k]=hdr[k];
  return fetch(bases[i]+path,{method:method||"GET",headers:h,body:body==null?undefined:JSON.stringify(body),cache:"no-store"}).then(function(r){if((r.status===404||r.status===501)&&i+1<bases.length){i++;return go()}return r.json().catch(function(){return{ok:false,err:"bad reply HTTP "+r.status}}).then(function(j){j._status=r.status;
    if((!method||method==="GET")&&cacheablePath(path)&&!j.net){var store={};for(var k2 in j)if(k2.charAt(0)!=="_")store[k2]=j[k2];statusCache(path,store)}
    return j})})
  .catch(function(e){if(++i<bases.length)return go();
    if((!method||method==="GET")&&cacheablePath(path)){var c=cachedReply(path);if(c)return c}
    return{ok:false,net:true,err:"unreachable: "+(e&&e.message||e)}})}return go()}
function pipe(path,method,body){var t=ls("rpipe.token"),h={"X-RKLOWD-Node":NODE};if(t)h.Authorization="Bearer "+t;return call(PIPE,path,method,body,h)}
/* ---- native signer (never JS keys) ---- */
function signer(){var mh=w.webkit&&w.webkit.messageHandlers&&w.webkit.messageHandlers.rsign;
  if(mh&&mh.postMessage)return{kind:"ios-secure-enclave",seal:function(e){return mh.postMessage({op:"seal",entry:JSON.stringify(e)}).then(function(r){return typeof r==="string"?JSON.parse(r):r})}};
  if(w.RSignNative&&w.RSignNative.seal)return{kind:"android-rsign",seal:function(e){return new Promise(function(res){var id="rs"+Date.now();w["__rsign_"+id]=function(r){delete w["__rsign_"+id];res(typeof r==="string"?JSON.parse(r):r)};w.RSignNative.seal(JSON.stringify(e),"__rsign_"+id)})}};
  var cp=w.Capacitor&&w.Capacitor.Plugins&&w.Capacitor.Plugins.RSign;if(cp&&cp.seal)return{kind:"capacitor-rsign",seal:function(e){return cp.seal({entry:JSON.stringify(e)})}};
  return null}
/* rw017 (20261109, add-only): prefer window.RGHOSTKEY when it reports a native signer (WK "rghostkey" / RGhostkeyNative) with a pinned key and a
 * biometric method. Bind items (rghostkey.bind) keep the field-preserving WK "rsign" seal of the SAME device key so signedMatches() holds (the native
 * sealBind re-stamps ts). No pinned method → previous signer unchanged. Never JS keys, no auto-sign: every seal is one OS unlock prompt. */
var signer0=signer;signer=function(){var G=w.RGHOSTKEY,L=signer0();if(!(G&&G.hasNative&&G.hasNative()))return L;
  return{kind:"rghostkey-"+(G.platform?G.platform():"native"),legacy:L?L.kind:null,seal:function(e){
    return Promise.resolve(G.status()).then(function(st){return Promise.resolve(st&&st.pinned?G.methods():[])}).then(function(ms){var m=(ms||[]).filter(function(x){return x!=="assm"})[0];
      if(!m||(e&&e.purpose==="rghostkey.bind"&&L))return L?L.seal(e):{ok:false,err:"RGHOSTKEY: no pinned biometric signer on this device · nothing signed"};
      return G.sign(e,m).then(function(r){if(r&&r.ok&&!r.entry_json&&!r.entry&&r.rsign_seal)r.entry=r.rsign_seal;return r})},function(){return L?L.seal(e):{ok:false,err:"RGHOSTKEY unavailable"}})}}};
function sealOk(s){return !!(s&&typeof s==="object"&&s.sig)}
function entryOf(r){var e=r&&(r.entry_json||r.entry);if(typeof e==="string")try{e=JSON.parse(e)}catch(x){e=null}return e}
/* ---- builders (same fields as TerraformЯ build_mint_asset / mint_entry) ---- */
function buildAsset(st,serial){var a={kind:st.kind||KIND[st.cat]||"game.asset",category:st.cat,rid:st.rid,label:st.label,handle:HANDLE,holder_rid:OWNER,holder_handle:HANDLE,serial:serial,version:"rdragon-1.0.4.25",build:25,via:"rmint-onetap/"+NODE};
  if(NO_PRICE.indexOf(st.cat)<0)a.price=parseFloat(st.price||0);return a}
function mintEntry(st,serial,prev){return{owner_rid:OWNER,handle:HANDLE,stack:STACK,botlatch_ref:BOT,ts:now(),prev_hash:prev,purpose:"rmint.asset",asset_rid:st.rid,asset_name:st.label,holder_rid:OWNER,serial:serial}}
function bindEntry(v){var e={stack:STACK,botlatch_ref:BOT,ts:now()};for(var k in v.seal_entry)e[k]=v.seal_entry[k];return e}
/* ---- chain ---- */
function submit(asset,mode){return call(CHAIN,"/rghostchain/submit","POST",{asset:asset,mode:mode}).then(function(s){if(!s.ok)return s;
  return call(CHAIN,"/rtrackr/register","POST",{rid:asset.rid,block_index:s.block_index,block_hash:s.block_hash,mode:s.mode}).then(function(r){s.rtrackr=!!r.ok;s.live=s.mode==="live";return s})})}
function queue(){return(ls(QK)||[]).filter(function(it){return it&&((it.asset&&sealOk(it.asset.rsign_seal))||(it.kind==="bind"&&sealOk(it.rsign_seal)))})}
function retain(it){var q=queue(),key=canon(it.rsign_seal||(it.asset||{}).rsign_seal);if(!q.some(function(x){return canon(x.rsign_seal||(x.asset||{}).rsign_seal)===key}))q.push(it);ls(QK,q)}
function retry(){var q=queue(),keep=[],out=[];return q.reduce(function(p,it){return p.then(function(){var send=it.kind==="bind"?call(CHAIN,"/rghostchain/bind","POST",{mode:"live",rsign_seal:it.rsign_seal}):submit(it.asset,"live");return send.then(function(r){return (it.kind==="bind"?Promise.resolve(it.expected):assetCommit(it.asset)).then(function(h){return confirmReceipt(r,h)})}).then(function(r){if(!r.ok||!r.receipt_verified)keep.push(it);out.push(r)})})},Promise.resolve()).then(function(){ls(QK,keep);return out})}
function done(r){try{w.dispatchEvent(new CustomEvent("rmint:done",{detail:r}))}catch(e){}return r}
function waitRouted(id,cb,ms){var t0=Date.now();return new Promise(function(res){(function poll(){pipe("/mint/status/"+id).then(function(s){if(s.ok&&(s.state==="done"||s.state==="refused")){if(s.state!=="done"){res({ok:false,routed:true,id:id,result:s.result,err:"Approval or submission refused"});return}var c=s.kind==="bind"?Promise.resolve(s.seal_entry&&s.seal_entry.block_sha256):assetCommit(s.asset||{});c.then(function(h){return confirmReceipt(s.result,h)}).then(function(r){r.routed=true;r.id=id;res(done(r))});return}
  if(cb)cb(s);if(Date.now()-t0>(ms||600000)){res({ok:false,routed:true,id:id,err:"still waiting for the unlock on "+(s.to||[]).join(" / ")});return}setTimeout(poll,4000)})})()})}
function route(kind,mode,entry,asset,label,cb){return pipe("/mint/request","POST",{kind:kind,mode:mode,seal_entry:entry,asset:asset,label:label}).then(function(r){
  if(!r.ok)return{ok:false,routed:true,err:r.err||r.error||"RPIPE refused"};if(cb)cb({state:"awaiting-unlock",to:r.to,id:r.id,msg:"Unlock on "+r.to.join(" or ")+" (one Face ID / fingerprint / ASSM)"});return waitRouted(r.id,cb)})}

var INFLIGHT=null, INFLIGHT_KEY=null;
function canon(x){if(Array.isArray(x))return '['+x.map(canon).join(',')+']';if(x&&typeof x==='object')return '{'+Object.keys(x).sort().map(function(k){return JSON.stringify(k)+':'+canon(x[k])}).join(',')+'}';return JSON.stringify(x)}
function sha(x){return w.crypto.subtle.digest('SHA-256',new TextEncoder().encode(canon(x))).then(function(b){return Array.from(new Uint8Array(b)).map(function(x){return ('0'+x.toString(16)).slice(-2)}).join('')})}
function requestSeal(sg,e){var prepared=canon(e);return sg.seal(JSON.parse(prepared)).then(function(r){if(!r||!r.ok||!signedMatches(entryOf(r),JSON.parse(prepared)))return {ok:false,err:"Approval cancelled or signed request changed"};return r})}
function signedMatches(seal,entry){return sealOk(seal)&&Object.keys(entry).every(function(k){return canon(seal[k])===canon(entry[k])})}
function guard(v){if(v.commitment_conflict)return Promise.reject(Error('Pending and draft differ: '+v.pending_payload_sha256+' / '+v.draft_payload_sha256+'; review required, nothing sent'));if(!v.payload||!v.block_sha256)return Promise.reject(Error('Backend lacks canonical payload verification; update service before minting'));return sha(v.payload).then(function(h){if(h!==v.block_sha256||!v.seal_entry||v.seal_entry.block_sha256!==h)throw Error('Canonical payload commitment mismatch; nothing sent');return v})}
function confirmReceipt(result,expected){if(!result||!result.ok)return Promise.resolve(result||{ok:false,err:'no result'});var mode=result.mode||'live';return call(CHAIN,'/rghostchain/receipt?mode='+encodeURIComponent(mode)+'&block_hash='+encodeURIComponent(result.block_hash)).then(function(r){if(!r.ok||!r.receipt_verified||r.mode!==mode||r.block_hash!==result.block_hash||r.block_index!==result.block_index||!expected||expected!==(r.payload_sha256||r.asset_hash))return {ok:false,submitted:true,verification_pending:true,err:'Chain receipt not verified; do not approve again',result:result};result.minted=true;result.receipt_verified=true;result.chain_receipt=r;result.sync_pending=true;result.tracker_pending=true;if(mode!=='live')return result;var feed=CFG.tracker||'https://rizal.pw/rtrackr/data/rghostchain.json';return fetch(feed+'?receipt='+encodeURIComponent(result.block_hash),{cache:'no-store'}).then(function(x){return x.json()}).then(function(d){result.tracker_pending=!(d.blocks||[]).some(function(b){return b.index===r.block_index&&b.hash===r.block_hash});return result}).catch(function(){return result})})}
function assetCommit(a){var x={};Object.keys(a).forEach(function(k){if(['sig','rsign_seal','on_chain','status'].indexOf(k)<0)x[k]=a[k]});return sha(x)}
function mint(o){o=Object.assign({},o||{});if(o.asset)o.asset=JSON.parse(JSON.stringify(o.asset));var key=canon({mode:o.mode||'live',asset:o.asset||null});if(INFLIGHT)return key===INFLIGHT_KEY?INFLIGHT:Promise.resolve({ok:false,err:'Another MINT is awaiting approval or receipt'});INFLIGHT_KEY=key;INFLIGHT=Promise.resolve().then(function(){if(queue().length)return retry().then(function(results){return results.length===1?results[0]:{ok:false,err:'Previous signed requests await receipts',results:results}});return runMint(o)}).catch(function(e){return {ok:false,err:e&&e.message||String(e)}}).then(function(r){INFLIGHT=null;INFLIGHT_KEY=null;return r},function(e){INFLIGHT=null;INFLIGHT_KEY=null;throw e});return INFLIGHT}

/* ---- the ONE action ---- */
function runMint(o){o=o||{};var mode=o.mode==="dry"?"dry":"live",cb=o.onStatus,sg=o.forceRoute?null:signer();if(ls(TK))sg=null;
  return call(CHAIN,"/rghostchain/bind/pending"+(mode==="dry"?"?mode=dry":"")).then(function(v){if(v.ok&&!o.asset)return guard(v);return v}).then(function(v){
   if(v.ok&&v.ready&&v.seal_entry&&!o.asset){var e=bindEntry(v),lab="Block "+v.index+" · rghostkey_bind (devices + methods + base code)";
    if(!sg)return route("bind",mode,e,null,lab,cb);
    if(cb)cb({state:"unlock",msg:"Waiting for Face ID / fingerprint…"});
    return requestSeal(sg,e).then(function(r){var s=entryOf(r);if(!r||!r.ok||!signedMatches(s,e))return{ok:false,err:"Not sealed or signed fields changed · nothing sent"};
     return call(CHAIN,"/rghostchain/bind","POST",{mode:mode,rsign_seal:s}).then(function(b){if(!b.ok&&/trusted|pinned/i.test(JSON.stringify(b.errors||b.error||"")))ls(TK,1);return confirmReceipt(b,v.block_sha256).then(function(x){if(x.net||x.verification_pending)retain({kind:"bind",rsign_seal:s,expected:v.block_sha256,t:now()});return done(x)})})})}
   if(v.ok&&!v.ready&&!o.asset)return{ok:false,err:"Block "+v.index+" waiting for device public keys: "+(v.missing_pubkeys||[]).join(", ")};
   var st=o.asset||{};if(st.kind&&["game.asset","cryptobot"].indexOf(st.kind)<0)return {ok:false,err:"This item kind has no supported content-bound native mint adapter: "+st.kind+"; nothing signed or submitted"};if(!st.rid||!st.label)return{ok:false,err:"nothing pending: give rid + label to mint"};
   return call(CHAIN,"/rghostchain/tip").then(function(tp){if(!tp.ok)return{ok:false,net:true,err:"chain tip unreachable: "+(tp.err||"")};
    var serial=st.serial!=null?st.serial:tp.next_serial,a=buildAsset(st,serial),e=mintEntry(st,serial,tp.tip_hash);
    if(mode==="dry"&&!sg&&o.dryDirect)return {ok:false,err:"No signer; nothing submitted"};
    if(!sg)return route("mint",mode,e,a,st.label,cb);
    if(cb)cb({state:"unlock",msg:"Waiting for Face ID / fingerprint…"});
    return requestSeal(sg,e).then(function(r){var s=entryOf(r);if(!r||!r.ok||!signedMatches(s,e))return{ok:false,err:"Not sealed or signed fields changed · nothing sent"};a.rsign_seal=s;
     return submit(a,mode).then(function(x){if(x.net){retain({asset:a,t:now()});x.queued=true;return x}
      if(!x.ok&&/trusted|pinned/i.test(JSON.stringify(x.errors||"")))ls(TK,1);return assetCommit(a).then(function(h){return confirmReceipt(x,h)}).then(function(r){if(r.verification_pending)retain({asset:a,t:now()});return done(r)})})})})})}
/* silent enroll: public half only, at launch (no tap). Native signer returns {device_id,pubkey_spki_b64}. */
function enroll(slot){var mh=w.webkit&&w.webkit.messageHandlers&&w.webkit.messageHandlers.rsign;var p=mh?mh.postMessage({op:"pubkey"}):(w.RSignNative&&w.RSignNative.pubkey?Promise.resolve(JSON.parse(w.RSignNative.pubkey())):null);
  if(!p||!slot)return Promise.resolve({ok:false,skipped:true});return p.then(function(k){k=typeof k==="string"?JSON.parse(k):k;if(!k||!k.pubkey_spki_b64)return{ok:false};return call(CHAIN,"/rghostchain/bind/enroll","POST",{device_id:slot,pubkey_spki_b64:k.pubkey_spki_b64})})}
w.RMINT_ONETAP={version:"1.1-receipts",mint:mint,retry:retry,queue:queue,enroll:enroll,signer:function(){var s=signer();return s?s.kind:null},node:NODE,cfg:{chain:CHAIN,pipe:PIPE},route:route,waitRouted:waitRouted};
/* No source-load submission: retries continue an already-approved signed request. */
})(typeof window!=="undefined"?window:globalThis);

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
var CHAIN=CFG.chain||(isNeo||/rizal\.(pw|info)$/.test(host)?["http://127.0.0.1:8765","http://127.0.0.1:8741"]:["http://192.168.0.113:8765"]);
var PIPE=CFG.pipe||(isNeo||/rizal\.(pw|info)$/.test(host)?["http://127.0.0.1:8900/rscale"]:["http://192.168.0.113:8799/rscale","http://192.168.0.113:8900/rscale"]);
var NODE=CFG.node||(w.DSNative?"moto":(w.webkit&&w.webkit.messageHandlers&&/iP(hone|ad)/.test((w.navigator||{}).userAgent||"")?"17e":(/rvm/i.test(host)?"rvm":"neo")));
function ls(k,v){try{if(v===undefined)return JSON.parse(w.localStorage.getItem(k)||"null");w.localStorage.setItem(k,JSON.stringify(v))}catch(e){return null}}
function now(){return new Date().toISOString().replace(/\.\d+Z$/,"Z")}
function call(bases,path,method,body,hdr){var i=0;function go(){var h={"Content-Type":"text/plain"};for(var k in hdr||{})h[k]=hdr[k];
  return fetch(bases[i]+path,{method:method||"GET",headers:h,body:body==null?undefined:JSON.stringify(body),cache:"no-store"}).then(function(r){if((r.status===404||r.status===501)&&i+1<bases.length){i++;return go()}return r.json().catch(function(){return{ok:false,err:"bad reply HTTP "+r.status}}).then(function(j){j._status=r.status;return j})})
  .catch(function(e){if(++i<bases.length)return go();return{ok:false,net:true,err:"unreachable: "+(e&&e.message||e)}})}return go()}
function pipe(path,method,body){var t=ls("rpipe.token"),h={"X-RKLOWD-Node":NODE};if(t)h.Authorization="Bearer "+t;return call(PIPE,path,method,body,h)}
/* ---- native signer (never JS keys) ---- */
function signer(){var mh=w.webkit&&w.webkit.messageHandlers&&w.webkit.messageHandlers.rsign;
  if(mh&&mh.postMessage)return{kind:"ios-secure-enclave",seal:function(e){return mh.postMessage({op:"seal",entry:JSON.stringify(e)}).then(function(r){return typeof r==="string"?JSON.parse(r):r})}};
  if(w.RSignNative&&w.RSignNative.seal)return{kind:"android-rsign",seal:function(e){return new Promise(function(res){var id="rs"+Date.now();w["__rsign_"+id]=function(r){delete w["__rsign_"+id];res(typeof r==="string"?JSON.parse(r):r)};w.RSignNative.seal(JSON.stringify(e),"__rsign_"+id)})}};
  var cp=w.Capacitor&&w.Capacitor.Plugins&&w.Capacitor.Plugins.RSign;if(cp&&cp.seal)return{kind:"capacitor-rsign",seal:function(e){return cp.seal({entry:JSON.stringify(e)})}};
  return null}
function sealOk(s){return !!(s&&typeof s==="object"&&s.sig)}
function entryOf(r){var e=r&&(r.entry_json||r.entry);if(typeof e==="string")try{e=JSON.parse(e)}catch(x){e=null}return e}
/* ---- builders (same fields as TerraformЯ build_mint_asset / mint_entry) ---- */
function buildAsset(st,serial){var a={kind:KIND[st.cat]||"game.asset",category:st.cat,rid:st.rid,label:st.label,handle:HANDLE,holder_rid:OWNER,holder_handle:HANDLE,serial:serial,version:"rdragon-1.0.4.25",build:25,via:"rmint-onetap/"+NODE};
  if(NO_PRICE.indexOf(st.cat)<0)a.price=parseFloat(st.price||0);return a}
function mintEntry(st,serial,prev){return{owner_rid:OWNER,handle:HANDLE,stack:STACK,botlatch_ref:BOT,ts:now(),prev_hash:prev,purpose:"rmint.asset",asset_rid:st.rid,asset_name:st.label,holder_rid:OWNER,serial:serial}}
function bindEntry(v){var e={stack:STACK,botlatch_ref:BOT,ts:now()};for(var k in v.seal_entry)e[k]=v.seal_entry[k];return e}
/* ---- chain ---- */
function submit(asset,mode){return call(CHAIN,"/rghostchain/submit","POST",{asset:asset,mode:mode}).then(function(s){if(!s.ok)return s;
  return call(CHAIN,"/rtrackr/register","POST",{rid:asset.rid,block_index:s.block_index,block_hash:s.block_hash,mode:s.mode}).then(function(r){s.rtrackr=!!r.ok;s.live=s.mode==="live";return s})})}
function queue(){return(ls(QK)||[]).filter(function(it){return it&&it.asset&&sealOk(it.asset.rsign_seal)})}
function retry(){var q=queue(),keep=[],out=[];return q.reduce(function(p,it){return p.then(function(){return submit(it.asset,"live").then(function(r){if(r.ok)out.push(r);else if(r.net)keep.push(it);else out.push({ok:false,err:r.errors||r.err})})})},Promise.resolve()).then(function(){ls(QK,keep);return out})}
function done(r){try{w.dispatchEvent(new CustomEvent("rmint:done",{detail:r}))}catch(e){}return r}
function waitRouted(id,cb,ms){var t0=Date.now();return new Promise(function(res){(function poll(){pipe("/mint/status/"+id).then(function(s){if(s.ok&&(s.state==="done"||s.state==="refused")){res(done({ok:s.state==="done",routed:true,id:id,result:s.result}));return}
  if(cb)cb(s);if(Date.now()-t0>(ms||600000)){res({ok:false,routed:true,id:id,err:"still waiting for the unlock on "+(s.to||[]).join(" / ")});return}setTimeout(poll,4000)})})()})}
function route(kind,mode,entry,asset,label,cb){return pipe("/mint/request","POST",{kind:kind,mode:mode,seal_entry:entry,asset:asset,label:label}).then(function(r){
  if(!r.ok)return{ok:false,routed:true,err:r.err||r.error||"RPIPE refused"};if(cb)cb({state:"awaiting-unlock",to:r.to,id:r.id,msg:"Unlock on "+r.to.join(" or ")+" (one Face ID / fingerprint / ASSM)"});return waitRouted(r.id,cb)})}
/* ---- the ONE action ---- */
function mint(o){o=o||{};var mode=o.mode==="dry"?"dry":"live",cb=o.onStatus,sg=o.forceRoute?null:signer();if(ls(TK))sg=null;
  return call(CHAIN,"/rghostchain/bind/pending"+(mode==="dry"?"?mode=dry":"")).then(function(v){
   if(v.ok&&v.ready&&v.seal_entry&&!o.asset){var e=bindEntry(v),lab="Block "+v.index+" · rghostkey_bind (devices + methods + base code)";
    if(!sg)return route("bind",mode,e,null,lab,cb);
    if(cb)cb({state:"unlock",msg:"Waiting for Face ID / fingerprint…"});
    return sg.seal(e).then(function(r){var s=entryOf(r);if(!r||!r.ok||!sealOk(s))return{ok:false,err:"Not sealed: no signature · nothing sent"};
     return call(CHAIN,"/rghostchain/bind","POST",{mode:mode,rsign_seal:s}).then(function(b){if(!b.ok&&/trusted|pinned/i.test(JSON.stringify(b.errors||b.error||""))){ls(TK,1);return route("bind",mode,e,null,lab,cb)}return done(b)})})}
   if(v.ok&&!v.ready&&!o.asset)return{ok:false,err:"Block "+v.index+" waiting for device public keys: "+(v.missing_pubkeys||[]).join(", ")};
   var st=o.asset||{};if(!st.rid||!st.label)return{ok:false,err:"nothing pending: give rid + label to mint"};
   return call(CHAIN,"/rghostchain/tip").then(function(tp){if(!tp.ok)return{ok:false,net:true,err:"chain tip unreachable: "+(tp.err||"")};
    var serial=st.serial!=null?st.serial:tp.next_serial,a=buildAsset(st,serial),e=mintEntry(st,serial,tp.tip_hash);
    if(mode==="dry"&&!sg&&o.dryDirect)return submit(a,"dry").then(done);
    if(!sg)return route("mint",mode,e,a,st.label,cb);
    if(cb)cb({state:"unlock",msg:"Waiting for Face ID / fingerprint…"});
    return sg.seal(e).then(function(r){var s=entryOf(r);if(!r||!r.ok||!sealOk(s))return{ok:false,err:"Not sealed: no signature · nothing sent"};a.rsign_seal=s;
     return submit(a,mode).then(function(x){if(x.net){var q=queue();q.push({asset:a,t:now()});ls(QK,q);x.queued=true;return x}
      if(!x.ok&&/trusted|pinned/i.test(JSON.stringify(x.errors||""))){ls(TK,1);delete a.rsign_seal;return route("mint",mode,e,a,st.label,cb)}return done(x)})})})})}
/* silent enroll: public half only, at launch (no tap). Native signer returns {device_id,pubkey_spki_b64}. */
function enroll(slot){var mh=w.webkit&&w.webkit.messageHandlers&&w.webkit.messageHandlers.rsign;var p=mh?mh.postMessage({op:"pubkey"}):(w.RSignNative&&w.RSignNative.pubkey?Promise.resolve(JSON.parse(w.RSignNative.pubkey())):null);
  if(!p||!slot)return Promise.resolve({ok:false,skipped:true});return p.then(function(k){k=typeof k==="string"?JSON.parse(k):k;if(!k||!k.pubkey_spki_b64)return{ok:false};return call(CHAIN,"/rghostchain/bind/enroll","POST",{device_id:slot,pubkey_spki_b64:k.pubkey_spki_b64})})}
w.RMINT_ONETAP={version:"1.0",mint:mint,retry:retry,queue:queue,enroll:enroll,signer:function(){var s=signer();return s?s.kind:null},node:NODE,cfg:{chain:CHAIN,pipe:PIPE},route:route,waitRouted:waitRouted};
setTimeout(function(){if(queue().length)retry()},3000);
})(typeof window!=="undefined"?window:globalThis);

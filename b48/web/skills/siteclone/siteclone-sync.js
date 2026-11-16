/* ЯSITECLONE 20261026 — the rizal.pw CryptoSocial site app as ONE shared module for every side panel.
   Offline first: entries live on this device (localStorage "rdragon.csp.rsync.v1"); panel state stays in its own key (rdragon.csp.v2, migrated in place, never wiped).
   Online: when a peer in RDRAGON_SITECLONE_CONFIG.peers answers, signed entries are pulled (and pushed only if readOnly===false).
   Profile: profile.update v1 {profile, fields:{name,handle,bio,location,link,title,avatar,banner}, ts} — newest edit wins per field (same as PR #4 cspProfilePush/cspProfileApply).
   Needs: rsync-core.js loaded first (window.RSync). No hostnames are shipped here; each device supplies its own config. */
(function(root,f){var m=f(root);if(typeof module==='object'&&module.exports)module.exports=m;else root.RDRAGON_SITECLONE=m})(typeof self!=='undefined'?self:this,function(root){
 var VERSION="siteclone-20261026",FIELDS=["name","handle","bio","location","link","title","avatar","banner"];
 function cfg(){return Object.assign({peers:[],readOnly:true,pollMs:20000,storeKey:"rdragon.csp.rsync.v1",avatarMaxBytes:96*1024,profileId:null,ownerKeys:[]},root.RDRAGON_SITECLONE_CONFIG||{})}
 var C=null,RS=null,SY=null,PANEL=null,SIGN=null,ME=null,stat={version:VERSION,mode:"offline",peers:[],applied:0,pushed:0,last:null,err:null};
 function hx(b){return Array.prototype.map.call(new Uint8Array(b),function(x){return("0"+x.toString(16)).slice(-2)}).join("")}
 function rnd(){return Math.random().toString(36).slice(2,8)}
 function readOnlyPeer(p){return{name:p.name,pull:p.pull}} /* GET only: no push, no send */
 function value(k){var st=PANEL.get();if(k!=="avatar"&&k!=="banner")return Promise.resolve(String(st.prof&&st.prof[k]||"").slice(0,600));var d=st[k]||"";
  if(!d||d.length>C.avatarMaxBytes*1.37)return Promise.resolve(null);var mime=(d.match(/^data:([^;,]+)/)||[])[1]||"image/jpeg";
  return root.crypto.subtle.digest("SHA-256",new TextEncoder().encode(d)).then(function(b){return{sha256:hx(b),mime:mime,bytes:Math.round(d.length*.75),data:d}})}
 /* apply: newest edit wins per field, only entries the core policy accepted, only for this profile */
 function apply(list){var pid=ME||C.profileId;if(!pid||!PANEL)return 0;var ts=PANEL.get().profTs||{},n=0;
  (list||[]).filter(function(e){return e&&e.t==="profile.update"&&e.profile===pid&&e.fields}).sort(function(a,b){return a.ts<b.ts?-1:1}).forEach(function(e){
   Object.keys(e.fields).forEach(function(k){if(FIELDS.indexOf(k)<0)return;if(ts[k]&&ts[k]>=e.ts)return;var v=e.fields[k];
    if(k==="avatar"||k==="banner"){if(!v||typeof v.data!=="string"||!/^data:image\//.test(v.data)||v.data.length>C.avatarMaxBytes*1.37)return;v=v.data}else v=String(v).slice(0,600);
    PANEL.set(k,v,e.ts);ts[k]=e.ts;n++})});
  if(n){stat.applied+=n;PANEL.render()}return n}
 function push(k){if(FIELDS.indexOf(k)<0||!RS||!SIGN||!ME)return Promise.resolve(null);var ts=(PANEL.get().profTs||{})[k]||new Date().toISOString();
  return value(k).then(function(v){if(v==null)return null;var f={};f[k]=v;return RS.append({id:"pu-"+k+"-"+Date.now().toString(36)+"-"+rnd(),t:"profile.update",v:1,profile:ME,fields:f,ts:ts},SIGN)})
   .then(function(r){if(r&&r.added&&r.added[0]){stat.pushed++;if(SY&&!C.readOnly)SY.syncNow()}return r},function(e){stat.err=String(e&&e.message||e);return null})}
 function start(panel,opt){if(RS)return api;C=Object.assign(cfg(),opt||{});PANEL=panel;var RSync=root.RSync;if(!RSync||!RSync.create||!(root.crypto&&root.crypto.subtle)){stat.err="rsync-core not loaded";return api}
  var store;try{store=root.localStorage?RSync.adapters.localStorage(C.storeKey):RSync.adapters.memoryStorage()}catch(e){store=RSync.adapters.memoryStorage()}
  RS=RSync.create({storage:store,policy:RSync.devicePolicy({ownerKeys:C.ownerKeys||[]})});
  RS.ready.then(function(){apply(RS.entries());RS.onChange(function(){apply(RS.entries())});
   var bc=RSync.adapters.broadcast&&RSync.adapters.broadcast("rdragon.csp.rsync");if(bc){RS.attach(bc);stat.peers.push("tabs")}
   var pl=(C.peers||[]).concat(root.RDRAGON_PRIVATE_PEERS||[]).filter(function(u,i,a){return u&&a.indexOf(u)===i});
   var tps=pl.map(function(u){stat.peers.push(String(u));var p=RSync.adapters.httpPeer(String(u).replace(/\/$/,""));return C.readOnly?readOnlyPeer(p):p});
   if(tps.length){SY=RS.syncer({peers:tps,pollMs:C.pollMs});SY.onStatus(function(st){stat.last=st.last;stat.mode=st.peers.some(function(x){return x.ok})?(C.readOnly?"online (read-only)":"online"):"offline";stat.err=(st.peers.filter(function(x){return x.err})[0]||{}).err||null;PANEL.render()});if(C.autoStart!==false)SY.start()}});
  return api}
 var api={version:VERSION,fields:FIELDS,start:start,apply:apply,push:push,
  /* link a logged-in device (from the site login / ЯCASKET) to the panel: signer + profile id; after this, panel edits become signed profile.update entries */
  link:function(signer,profileId){SIGN=signer||null;ME=profileId||null;if(RS)apply(RS.entries());return!!(SIGN&&ME)},
  status:function(){var s=Object.assign({},stat);s.readOnly=C?C.readOnly:true;s.linked=!!(SIGN&&ME);s.entries=RS?RS.entries().length:0;return s},
  syncNow:function(){return SY?SY.syncNow():Promise.resolve(null)},rsync:function(){return RS}};
 return api});

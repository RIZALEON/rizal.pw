/* RTRACKR feed reader for every RWALLET (20261030). Read-only + DRY event queue.
 * Order: GET <api>/rtrackr/assets (rghostchain_submitd, 127.0.0.1:8741) → derived rtrackr-game-assets.json → window.RTRACKR (derived .js) → cached copy.
 * Internet-on-or-off rule: offline = show the cached feed, queue submit/register events; flush() sends them when back online (DRY by default). */
(function(root,f){var m=f(root);if(typeof module==="object"&&module.exports)module.exports=m;else root.RTRACKR_FEED=m})(typeof self!=="undefined"?self:globalThis,function(root){"use strict";
var API="http://127.0.0.1:8741",DERIVED="../../GHOSTMACHINE/RGHOSTCHAIN/rtrackr/derived/rtrackr-game-assets.json",CK="rtrackr.feed.cache.v1",QK="rtrackr.event.queue.v1";
function store(o){return(o&&o.storage)||root.localStorage||{_m:{},getItem:function(k){return this._m[k]==null?null:this._m[k]},setItem:function(k,v){this._m[k]=String(v)}}}
function get(s,k,d){try{var v=s.getItem(k);return v?JSON.parse(v):d}catch(e){return d}}
function ok(d){return d&&Array.isArray(d.assets)}
function isLive(a){return!!a&&a.on_chain===true&&!!a.sig||(a&&a.status==="live")}
function load(o){o=o||{};var fe=o.fetch||root.fetch,s=store(o),api=o.api||API,der=o.derived||DERIVED;
 function j(u){return fe(u,{cache:"no-store"}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()})}
 function save(src){return function(d){if(!ok(d))throw new Error("bad feed");s.setItem(CK,JSON.stringify({at:new Date().toISOString(),feed:d}));return{source:src,online:src!=="cache",feed:d}}}
 return j(api+"/rtrackr/assets").then(save("rtrackr-api")).catch(function(){return j(der).then(save("derived-json"))}).catch(function(){
  if(ok(root.RTRACKR))return save("derived-js")(root.RTRACKR);var c=get(s,CK,null);
  return c?{source:"cache",online:false,cached_at:c.at,feed:c.feed}:{source:"none",online:false,feed:{assets:[]}}})}
function forRid(r,rid){return(r.feed.assets||[]).filter(function(a){return a.rid===rid})}
function card(a){if(!a)return"No RID asset yet";return a.rid+" · "+(a.handle||"")+" · #"+(a.genesis||a.serial||"?")+" "+(a.label||a.kind)+" · "+(isLive(a)?"LIVE":"PREVIEW · not minted ("+(a.status||"dry")+")")}
function queue(ev,o){var s=store(o),q=get(s,QK,[]);if(ev.mode==="live")throw new Error("live events are never queued");q.push(ev);s.setItem(QK,JSON.stringify(q));return q.length}
function mintEvents(asset){var b={asset:asset,mode:"dry"};return[{path:"/rghostchain/submit",body:b,mode:"dry"},{path:"/rtrackr/register",body:b,mode:"dry",after_submit:true}]}
function pending(o){return get(store(o),QK,[])}
function flush(o){o=o||{};var s=store(o),fe=o.fetch||root.fetch,api=o.api||API,q=get(s,QK,[]),left=[],done=[],mint=null;
 return q.reduce(function(p,ev){return p.then(function(){var body=ev.body;if(ev.after_submit){if(!mint){left.push(ev);return}body={rid:(body.asset||{}).rid,block_index:mint.index,block_hash:mint.hash,mode:mint.mode||"dry"}}
 return fe(api+ev.path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}).then(function(r){return r.json().catch(function(){return null}).then(function(b){if(!r.ok&&!(b&&b.duplicate===true))throw new Error(r.status);done.push(b);if(ev.path==="/rghostchain/submit")mint={index:b.block_index,hash:b.block_hash,mode:b.mode}})}).catch(function(){left.push(ev)})})},Promise.resolve())
 .then(function(){s.setItem(QK,JSON.stringify(left));return{sent:done.length,left:left.length,results:done}})}
return{mintEvents:mintEvents,load:load,forRid:forRid,card:card,isLive:isLive,queue:queue,pending:pending,flush:flush,API:API}});

/* RTRACKR DRY view 1.0 · 20261114 (pt345u) · STAGED · LOCAL TEST VIEW ONLY. Shows TerraformЯ / RWALLET DRY mint records from a
 * test submitd (GET <api>/rtrackr/assets) or an RKAST test feed, clearly marked DRY · NOT MINTED. Never linked from the public
 * RTRACKR page; the public page keeps showing only the real chain snapshot (rtrackr_export.py never exports DRY chains).
 * api comes only from ?api= or localStorage "rtrackr.dry.api" (no default, so a visitor's browser never probes anything). Read-only. */
(function(root,f){var m=f();if(typeof module==="object"&&module.exports)module.exports=m;else root.RTRACKR_DRY=m})(typeof self!=="undefined"?self:this,function(){
"use strict";
function E(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function rows(doc){var a=(doc&&doc.assets)||[];if(doc&&Array.isArray(doc.entries))a=doc.entries.filter(function(e){return e.kind==="rtrackr.dry"}).map(function(e){var d=e.data||{};return{rid:d.rid,label:e.title.replace(/^DRY · /,""),block_index:d.block_index,block_hash:d.block_hash,status:"dry",ts:e.ts,via:d.via}});
 return a.filter(function(x){return x&&x.status!=="live"&&!x.on_chain})}
function render(doc){var r=rows(doc);
 return'<div class="badge pend">DRY TEST VIEW · '+r.length+' record(s) · NOT MINTED · not on the real RGHOSTCHAIN</div><table><tr><th>ЯID</th><th>label</th><th>block (test chain)</th><th>status</th><th>via</th><th>ts</th></tr>'+
  r.map(function(x){return'<tr><td>'+E(x.rid)+'</td><td>'+E(x.label)+'</td><td class="h">#'+E(x.block_index)+' '+E(String(x.block_hash||"").slice(0,16))+'…</td><td style="color:#fc0">DRY · NOT MINTED</td><td>'+E(x.via)+'</td><td>'+E(x.ts)+'</td></tr>'}).join("")+'</table>'}
function load(src){return fetch(src,{cache:"no-store"}).then(function(r){if(!r.ok)throw new Error("HTTP "+r.status);return r.json()})}
function boot(el){var q=new URLSearchParams(location.search),api=q.get("api")||localStorage.getItem("rtrackr.dry.api"),feed=q.get("feed");
 if(!api&&!feed){el.innerHTML='<div class="badge">Set a test source: ?api=http://127.0.0.1:&lt;test port&gt; (test submitd) or ?feed=&lt;rkast test feed&gt;</div>';return}
 load(feed||api.replace(/\/+$/,"")+"/rtrackr/assets").then(function(d){el.innerHTML=render(d)},function(e){el.innerHTML='<div class="badge bad">'+E(e.message)+'</div>'})}
return{render:render,rows:rows,boot:boot};
});

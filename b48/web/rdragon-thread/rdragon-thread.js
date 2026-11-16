/* RDRAGON THREAD rt1 (2026-10-25) — shared v1 reply/thread format (SCOUT · BATIBABOT · ЯBAT).
   ask:      {v:1,kind:'rdragon.ask',id,post_id,q,media,par,by,ts,root_id?}
   reply:    {v:1,kind:'rdragon.reply',id,ask,post_id,par,status:'pending|answered|offline',text,images?,by:'RDRAGON',model,device,ts,sig?,root_id?}
   feedback: {v:1,kind:'rdragon.feedback',id,reply,ask,rating:'up'|'down',correction?,by,ts}  PRIVATE: outbox to Neo only, never rendered.
   Rules: this device NEVER writes RDRAGON answers (no keyword echo). Earliest 'answered' per ask wins and replaces the offline placeholder.
   Nesting by `par`; root_id optional (fallback: walk par chain). Unknown fields tolerated. Every layer opens at #post/<id>. RGENERATOR/RKRYPT: identity via window.RKRYPT if present. */
(function(root,f){var m=f();if(typeof module==='object'&&module.exports)module.exports=m;else root.RDRAGON_THREAD=m})(typeof self!=='undefined'?self:this,function(){
 var OFFLINE='RDRAGON is offline and will answer when synced.';
 function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
 function now(){return new Date().toISOString()}
 function E(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
 function create(opt){opt=opt||{};var by=opt.by||'@chaserizal',device=opt.device||'17e',store=opt.storage||null,K=opt.key||'rdragon.thread.v1';
  var st={nodes:{},asks:{},replies:{},outbox:[]};try{if(store){var s=JSON.parse(store.getItem(K)||'null');if(s)st=Object.assign(st,s)}}catch(e){}
  function save(){if(store)try{store.setItem(K,JSON.stringify(st))}catch(e){}}
  function signer(){/* same per-device seal path as gm-replies: existing enrolled device signer first, never minted here */var d=opt.deviceSigner||(typeof window!=='undefined'&&window.RDRAGON_DEVICE_SIGNER)||null;if(d&&d.pub&&typeof d.sign==='function')return d;var R=(typeof window!=='undefined'&&window.RKRYPT)||opt.rkrypt;var r=R&&typeof R.signer==='function'?R.signer():null;return r&&r.pub&&typeof r.sign==='function'?r:null}
  function out(e){var r=e.kind==='rdragon.feedback'?opt.neoReplica:opt.replica,sg=signer();/* feedback never enters the shared/public replica */st.outbox.push(e);save();if(r&&r.append)try{r.append(e,sg||undefined)}catch(x){}return e}
  function rootOf(id){var n=st.nodes[id],g=0;while(n&&n.par&&st.nodes[n.par]&&g++<10000)n=st.nodes[n.par];return n?n.id:id}
  var A={OFFLINE:OFFLINE,state:function(){return st},
   /* any post/comment/reply-to-reply at any depth */
   node:function(o){var n={id:o.id||uid(),par:o.par||null,t:o.t||'',media:o.media||[],by:o.by||by,ts:o.ts||now()};n.root_id=n.par?rootOf(n.par):n.id;st.nodes[n.id]=n;save();return n},
   ask:function(postId){var n=st.nodes[postId];if(!n)return null;var a={v:1,kind:'rdragon.ask',id:'ask-'+uid(),post_id:n.id,q:n.t,media:(n.media||[]).map(function(m){return{type:m.type,name:m.name,key:m.key||m.id}}),par:n.par||null,by:by,ts:now(),root_id:rootOf(n.id)};st.asks[a.id]=a;save();return out(a)},
   /* entries arriving from sync (rsync-core onChange / importBundle) */
   ingest:function(arr){(arr||[]).forEach(function(e){if(!e||e.v!==1)return;if(e.kind==='rdragon.reply'&&e.id&&e.ask){st.replies[e.id]=e}else if(e.kind==='rdragon.ask'&&e.id){st.asks[e.id]=st.asks[e.id]||e}else if(e.kind==='post'&&e.id){st.nodes[e.id]=st.nodes[e.id]||e}});save()},
   /* winner for an ask: earliest answered, else synthesized offline placeholder */
   resolve:function(askId){var a=st.asks[askId],rs=Object.keys(st.replies).map(function(k){return st.replies[k]}).filter(function(r){return r.ask===askId});
    var ans=rs.filter(function(r){return r.status==='answered'&&r.text}).sort(function(x,y){return x.ts<y.ts?-1:x.ts>y.ts?1:(x.id<y.id?-1:1)})[0];
    if(ans)return ans;return{v:1,kind:'rdragon.reply',id:'ph-'+askId,ask:askId,post_id:a&&a.post_id,par:a&&a.post_id,status:'offline',text:OFFLINE,by:'RDRAGON',placeholder:true}},
   asksFor:function(postId){return Object.keys(st.asks).map(function(k){return st.asks[k]}).filter(function(a){return a.post_id===postId}).sort(function(x,y){return x.ts<y.ts?-1:1})},
   feedback:function(replyId,rating,correction){var r=st.replies[replyId];if(!r||r.status!=='answered')return null;if(rating!=='up'&&rating!=='down')return null;
    var f={v:1,kind:'rdragon.feedback',id:'fb-'+uid(),reply:replyId,ask:r.ask,rating:rating,by:by,ts:now(),to:'neo',private:true};if(correction&&String(correction).trim())f.correction=String(correction).trim().slice(0,1000);return out(f)},
   /* outbox for a peer: feedback only goes to neo */
   outboxFor:function(peer){return st.outbox.filter(function(e){return e.kind!=='rdragon.feedback'||peer==='neo'})},
   /* tree: children by par (posts, comments, answered RDRAGON replies — replies can be replied to) */
   children:function(id){var kids=Object.keys(st.nodes).map(function(k){return st.nodes[k]}).filter(function(n){return n.par===id});
    A.asksFor(id).forEach(function(a){var r=A.resolve(a.id);kids.push({id:r.id,par:id,t:r.text,by:'RDRAGON',ts:r.ts||a.ts,rd:r})});
    return kids.sort(function(x,y){return(x.ts||'')<(y.ts||'')?-1:1})},
   depth:function(id){var d=0,n=st.nodes[id];while(n&&n.par){d++;n=st.nodes[n.par]}return d},
   html:function(id,lvl){lvl=lvl||0;var n=st.nodes[id]||{id:id,t:''};return A._h(n,lvl)},
   _h:function(n,lvl){var kids=n.rd&&n.rd.placeholder?[]:A.children(n.id),r=n.rd,fb='';
    if(r&&r.status==='answered')fb='<span class="rt-fb"><button data-a="rt-fb" data-r="'+E(r.id)+'" data-v="up" title="helpful">👍</button><button data-a="rt-fb" data-r="'+E(r.id)+'" data-v="down" title="not helpful">👎</button><button data-a="rt-fbc" data-r="'+E(r.id)+'" title="send a private correction">✎</button></span>';
    var head='<b>'+E(n.by==='RDRAGON'?'RDRAGON':n.by)+'</b> '+(r?'<span class="csp-dim">@RDRAGON · '+E(r.status)+'</span> ':'')+'<a href="#post/'+E(n.id)+'" class="rt-link">#</a>';
    var body='<div class="rt-t'+(r&&r.status!=='answered'?' csp-dim':'')+'">'+E(n.t)+'</div>'+(r?'':'<button data-a="rt-reply" data-p="'+E(n.id)+'">reply</button>')+fb;
    return '<details class="rt-node" open id="post/'+E(n.id)+'" data-depth="'+lvl+'" style="margin-left:'+(lvl?10:0)+'px;border-left:'+(lvl?'1px solid #444':'0')+';padding-left:6px"><summary>'+head+(kids.length?' <span class="csp-dim">('+kids.length+')</span>':'')+'</summary>'+body+kids.map(function(k){return A._h(k,lvl+1)}).join('')+'</details>'},
   /* open the layer named in location.hash (#post/<id>): expand all ancestors */
   open:function(doc,hash){var m=/^#post\/(.+)$/.exec(hash||'');if(!m||!doc)return false;var el=doc.getElementById('post/'+decodeURIComponent(m[1]));if(!el)return false;for(var x=el;x;x=x.parentElement)if(x.tagName==='DETAILS')x.open=true;if(el.scrollIntoView)el.scrollIntoView({block:'center'});return true}};
  return A}
 return{create:create,OFFLINE:OFFLINE,VERSION:'rt1-20261025'}});

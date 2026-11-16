/* GHOSTMACHINE premium replies up1 (2026-10-25, ЯBAT) — composer on every node at any depth, authored by the RKRYPT profile-0 identity.
   entry: {v:1,kind:'post',id,post_id,par,root_id,t,text,media[],quote?{id,by,t},by,ts,gm:{schema:'rzl.ghostmachine.post.v1'(provisional),handle,rid,profileId:0,at},sig:null|rzl.rkrypt.sig.v1,sig_state:'unsigned'|'signed'}
   reaction: {v:1,kind:'reaction',id,post_id,emoji,by,ts}. Same field names as the web (v1). Unknown fields tolerated. No network, no keys. */
(function(root,f){var m=f();if(typeof module==='object'&&module.exports)module.exports=m;else root.GM_REPLIES=m})(typeof self!=='undefined'?self:this,function(){
 function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
 function E(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
 var REACT=['🔥','🐉','👍','❤️','😂'];
 function create(T,o){o=o||{};var SIGN=o.signing===true||(typeof window!=='undefined'&&window.RDRAGON_SIGNING===true),lessons={},K=o.rkrypt||(typeof window!=='undefined'&&window.RKRYPT)||null,reacts={},rep=o.replica||null;
  function idn(){var I=(K&&K.IDENTITY)||{};return{handle:I.handle||'@chaserizal',rid:I.rid||null,profile:I.profile||I.profileId||null}}
  /* per-device seal: ONLY the existing enrolled device signer {pub,sign} (window.RDRAGON_DEVICE_SIGNER, set by the host/bundle device sign-in) or RKRYPT.signer(). Never mints keys, never reads key material.
     No seal -> entry stays local + held in the outbox (peers reject unsealed entries); flush() seals + sends once a device signer exists. */
  function devSeal(){var d=o.deviceSigner||(typeof window!=='undefined'&&window.RDRAGON_DEVICE_SIGNER)||null;if(d&&d.pub&&typeof d.sign==='function')return d;var r=K&&typeof K.signer==='function'?K.signer():null;return r&&r.pub&&typeof r.sign==='function'?r:null}
  var held=[];function push(e){var sg=devSeal();try{if(rep&&rep.append){var r=rep.append(e,sg||undefined);if(r&&r.catch)r.catch(function(){})}}catch(x){}if(!sg)held.push(e);return e}
  /* web CryptoSocial schema (rdragon-cryptosocial.js): signer,cid,rgen are added by rsync-core seal() */
  function webComment(e){var c={t:'comment',id:e.id,parent:e.par,post:e.root_id,par:e.par,root_id:e.root_id,text:e.text,by:e.by,profile:(idn().profile||null),ts:e.ts};if(e.media&&e.media.length)c.media=e.media.filter(function(m){return m.type==='image'}).map(function(m){return{id:m.key||m.id||m.name,name:m.name,type:'image',src:m.src}});if(e.quote)c.quote={id:e.quote.id,by:e.quote.by||'',text:String(e.quote.t||'').slice(0,140)};return c}
  var G={
   reply:function(par,text,x){x=x||{};var st=T.state(),p=par?st.nodes[par]:null,i=idn(),id='gm-'+uid(),ts=new Date().toISOString();
    var env=K&&K.post?K.post(text):{schema:'rzl.ghostmachine.post.v1',handle:i.handle,rid:i.rid,profileId:0,text:String(text||''),at:ts,sig:null};
    var media=(x.media||[]).slice(0,8).map(function(m){return{type:m.type||'image',name:m.name||'',src:m.src||'',key:m.key||m.id||null}});
    var q=x.quote&&p?{id:p.id,by:p.by,t:String(p.t||'').slice(0,280)}:null;
    var n=T.node({id:id,par:par||null,t:String(text||''),media:media,by:i.handle,ts:ts});
    var e={v:1,kind:'post',id:id,post_id:id,par:n.par,root_id:n.root_id,t:n.t,text:n.t,media:media,by:i.handle,ts:ts,gm:{schema:env.schema,handle:env.handle,rid:env.rid,profileId:0,at:env.at},sig:null,sig_state:'unsigned'};
    if(q){e.quote=q;n.quote=q}n.gm=e.gm;n.sig_state='unsigned';push(n.par?webComment(e):e);
    if(x.askRdragon!==false)T.ask(id);/* GHOSTMACHINE-REPLIES-NOTE #2: every post/comment/reply at any depth emits rdragon.ask */return e},
   /* sign later with RKRYPT.sign (passkey). Resolves to the entry, with sig set if the host allows WebAuthn; never throws. */
   sign:function(e){/* OFF by default: sig:null until Rizal approves signing (set RDRAGON_SIGNING=true) */if(!SIGN||!K||!K.sign)return Promise.resolve(e);return Promise.resolve().then(function(){return K.sign(JSON.stringify({id:e.id,par:e.par,text:e.text,ts:e.ts}))}).then(function(s){e.sig=s;e.sig_state='signed';var n=T.state().nodes[e.id];if(n)n.sig_state='signed';push(e);return e}).catch(function(err){e.sig_err=String(err&&err.message||err).slice(0,120);return e})},
   react:function(id,emoji){if(REACT.indexOf(emoji)<0)return null;var v=idn().handle,was=!!(reacts[id]&&Object.keys(reacts[id]).some(function(k){var x=reacts[id][k];return x.emoji===emoji&&x.by===v&&!x.off}));var r={t:'react',id:'re-'+uid(),target:id,emoji:emoji,viewer:v,off:was,by:v,ts:new Date().toISOString()};G.ingest([r]);return push(r)},
   ingest:function(a){(a||[]).forEach(function(e){if(e&&e.v===1&&e.kind==='rdragon.lesson'&&e.id&&e.text&&e.by==='RDRAGON'){lessons[e.id]=e}else if(e&&e.v===1&&e.kind==='reaction'&&e.post_id){(reacts[e.post_id]=reacts[e.post_id]||{})[e.id]=e}else if(e&&e.t==='react'&&e.target&&e.emoji){var b=reacts[e.target]=reacts[e.target]||{},key=e.emoji+'|'+(e.viewer||e.by);if(e.off)delete b[key];else b[key]={emoji:e.emoji,by:e.viewer||e.by,ts:e.ts}}else if(e&&e.t==='comment'&&e.id&&(e.par||e.parent)){var S2=T.state();if(!S2.nodes[e.id])T.node({id:e.id,par:e.par||e.parent,t:e.text,media:e.media,by:e.by,ts:e.ts});var n2=S2.nodes[e.id];if(e.quote)n2.quote={id:e.quote.id,by:e.quote.by,t:e.quote.text};n2.sig_state=e.rgen&&e.signer?'sealed':'unsigned'}else if(e&&e.v===1&&e.kind==='post'&&e.id){var st=T.state();if(!st.nodes[e.id])T.node({id:e.id,par:e.par,t:e.text||e.t,media:e.media,by:e.by,ts:e.ts});var n=st.nodes[e.id];n.quote=e.quote;n.gm=e.gm;n.sig_state=e.sig?'signed':'unsigned'}})},
   counts:function(id){var c={};Object.keys(reacts[id]||{}).forEach(function(k){var x=reacts[id][k].emoji;c[x]=(c[x]||0)+1});return c},
   /* rich decoration for one node (called by the sidebar renderer) */
   rich:function(n){var h='';if(n.quote)h+='<blockquote class="gm-q">'+E(n.quote.by)+': '+E(n.quote.t)+'</blockquote>';
    (n.media||[]).forEach(function(m){if(m.src&&/^(data:image\/|blob:|\.\/|\/api\/img\/)/.test(m.src))h+='<img class="gm-img" data-zoom="1" alt="'+E(m.name)+'" src="'+E(m.src)+'">'});
    if(n.gm)h+='<span class="gm-badge" title="RKRYPT profile 0">'+(n.sig_state==='signed'?'🔏 signed':'🪪 '+E(n.gm.handle)+' · unsigned')+'</span>';
    var c=G.counts(n.id);h+='<span class="gm-react">'+REACT.map(function(x){return'<button data-a="gm-react" data-p="'+E(n.id)+'" data-e="'+x+'">'+x+(c[x]?' '+c[x]:'')+'</button>'}).join('')+'</span>';
    if(!n.rd)h+='<button data-a="gm-reply" data-p="'+E(n.id)+'">reply</button><button data-a="gm-quote" data-p="'+E(n.id)+'">quote</button>';return h},
   /* rdragon.lesson {v,kind,id,text,source_ask?,weight,ts,by:'RDRAGON'}: READ-ONLY, the phone never writes lessons */
   lessons:function(n){return Object.keys(lessons).map(function(k){return lessons[k]}).sort(function(a,b){return(a.ts||'')<(b.ts||'')?1:-1}).slice(0,n||20)},
   lessonsHtml:function(n){var a=G.lessons(n);return'<div class="gm-learned"><b>RDRAGON learned</b>'+(a.length?'<ul>'+a.map(function(l){return'<li><span class="csp-dim">'+E(l.weight||'')+'</span> '+E(String(l.text).slice(0,280))+'</li>'}).join('')+'</ul>':' <span class="csp-dim">nothing synced yet</span>')+'</div>'},
   signing:function(){return SIGN},held:function(){return held.slice()},sealer:function(){var d=devSeal();return d?d.pub:null},
   flush:function(){var sg=devSeal();if(!sg||!rep||!rep.append)return Promise.resolve(0);var a=held.splice(0);return Promise.all(a.map(function(e){return Promise.resolve(rep.append(e,sg)).catch(function(){held.push(e)})})).then(function(){return a.length-held.length})},
   webComment:webComment,
   REACT:REACT};
  return G}
 return{create:create,VERSION:'up1-20261025'}});

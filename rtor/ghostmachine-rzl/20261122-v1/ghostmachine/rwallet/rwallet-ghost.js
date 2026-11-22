/* R:\ RWALLET UNIFIED 20261026 (run → RWALLET_UNIFIED.run) · was: RWALLET · GHOSTMACHINE redesign · UI ONLY · 20261026. Logic = RKRYPT (rkrypt.rzl.js) + ЯBOT native. One screen + progressive disclosure.
 * window.RWALLET_PREVIEW !== false => only read:true functions run; all else dry-run (logs the command). Never handles keys. */
(function(){var F=window.RWALLET_FUNCS||[],PV=window.RWALLET_PREVIEW!==false,K='rdragon.csp.v2.rwallet';
var G=[['home','wallet · home · listings'],['wallets','my wallets (public addresses)'],['identity','identity · profile 0 · ЯCASKET'],['devices','devices · seats · sync'],['sol','Я / SOL · TRUEBLAST'],['mint','ЯMINT · ghost chain · RPOTLATCH'],['social','social · cash · help'],['ledger','RSYNC ledger · drafts · seal · publish']];
var st;try{st=JSON.parse(localStorage.getItem(K))||{}}catch(e){st={}}st.open=st.open||{};
function E(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function R(){return window.RKRYPT}
function bal(){var U=window.RWALLET_UNIFIED,w=R()?R().walletView():{addresses:[]};if(U&&!(w.addresses||[]).length)w={addresses:U.addresses().map(function(a){return{name:a.name,chain:a.chain,balance:a.balance==null?null:(+a.balance).toLocaleString()+' '+(a.unit||'')}})},rdg=(function(){try{return (JSON.parse(localStorage.getItem('rdragon.csp.v2'))||{}).rdg}catch(e){}})()||(window.RDRAGON_CSP&&RDRAGON_CSP.rdg)||'0.00';return{w:w,rdg:rdg}}
function log(t){var l=document.querySelector('.rw-log');if(l)l.textContent='R:\\RWALLET> '+t+'\n'+l.textContent}
function run(id){var U=window.RWALLET_UNIFIED;if(!U){log('unified registry not loaded');return}return U.run(id).then(function(r){var o=r.out;log((r.status==='casket-preview'?'⚿ ЯCASKET approval request (preview) · '+o.cmd:r.status+' · '+id)+'\n'+(typeof o==='string'?o:JSON.stringify(o,null,1)));return r})}
function render(){var b=bal(),v=R()?R().vault():{locked:true},el=document.getElementById(window.RWALLET_MOUNT||'rw');if(!el)return;var q=(st.q||'').toLowerCase();
 var h='<div class="rw-title">Anti Social CryptoSocial Media</div><div class="rw-ban" style="background-image:url(banner.jpg)"><img class="gm" src="ghostmachine-logo.jpg" alt=""><button class="rw-pair v" data-f="verified">✔ Verified</button><button class="rw-pair w'+(st.w?' on':'')+'" data-w="1">&gt; Wallet</button></div><div class="rw-av" style="background-image:url(avatar.jpg)"></div><div class="rw-name">Rizal the Younger</div><div class="rw-hd">@chaserizal</div>'; var emb=el.hasAttribute('data-embed');if(emb)h='';if(!st.w&&!emb){el.innerHTML=h+'<div class="rw-foot">R:\\SOCIAL&gt; READY</div>';return} h+='<div class="rw-top"><div class="h"><b>@CHASERIZAL</b> · ЯID-0001</div><span class="rw-lock" data-f="'+(v.locked?'unlock':'lock')+'">'+(v.locked?'🔒 locked':'🔓 open')+'</span></div>'+
 '<div class="rw-bal"><div class="n">'+E(b.rdg)+' <span class="u">R</span></div><div class="s">local ledger · '+b.w.addresses.length+' public address(es) · no keys held</div></div>'+
 '<div class="rw-acts"><button data-f="send">⇡ Send</button><button data-f="receive">⇣ Receive</button><button data-m="open" title="ЯMINT · one tap: unlock once (Face ID / fingerprint / ASSM) → RGHOSTCHAIN + RTRACKR">✦ Mint</button><button data-g="ledger" title="BOTLATCH · RSYNC ledger · drafts · seal · publish (gated)">⛓ BOTLATCH</button></div><div class="rw-sub"><span data-f="sign" style="cursor:pointer">✔ sign</span> · <span data-g="home" style="cursor:pointer">history ›</span></div>'+(st.mint?MINT():'')+
 '<div class="rw-tok">'+(b.w.addresses.length?b.w.addresses.map(function(a){return '<div><span>'+E(a.name)+' · '+E(a.chain)+'</span><b>'+E(a.balance==null?'—':a.balance)+'</b></div>'}).join(''):'<div><span>Я · SOL seats</span><b data-f="seats" style="cursor:pointer">view ›</b></div>')+'</div>'+
 '<input class="rw-q" placeholder="search '+F.length+' functions…" value="'+E(st.q||'')+'">';
 G.forEach(function(g){var it=F.filter(function(f){return f.where===g[0]&&(!q||(f.label+' '+f.cmd).toLowerCase().indexOf(q)>=0)});if(q&&!it.length)return;var on=q||st.open[g[0]];
  h+='<div class="rw-g'+(on?'':' off')+'"><div class="rw-gh" data-g="'+g[0]+'">'+g[1]+'<i>'+it.length+(on?' −':' +')+'</i></div><div class="rw-gb">'+it.map(function(f){return '<div class="rw-row" data-f="'+f.id+'" title="'+E(f.cmd)+'">'+E(f.label)+'<em class="'+(f.read?'':'n')+'">'+(f.kind==='native'?'ЯBOT':f.read?'read':'needs you')+'</em></div>'}).join('')+'</div></div>'});
 h+='<div class="rw-log"></div><div class="rw-foot">R:\\RWALLET&gt; '+(PV?'PREVIEW':'READY')+'</div>';el.innerHTML=h}
document.addEventListener('click',function(e){if(MCLICK(e))return;var g=e.target.closest('[data-g]');var w=e.target.closest('[data-w]');if(w){st.w=!st.w;save();render();return}if(g){st.open[g.dataset.g]=!st.open[g.dataset.g];save();render();return}var f=e.target.closest('[data-f]');if(f)run(f.dataset.f)});
document.addEventListener('input',function(e){if(e.target.closest&&e.target.closest('.rw-mint'))return;if(e.target.classList.contains('rw-q')){st.q=e.target.value;save();render();var i=document.querySelector('.rw-q');i.focus();i.setSelectionRange(i.value.length,i.value.length)}});
function save(){try{localStorage.setItem(K,JSON.stringify(st))}catch(e){}}
document.addEventListener('keydown',function(e){if((e.metaKey||e.ctrlKey)&&e.shiftKey&&(e.key==='K'||e.key==='k')){var el=document.getElementById('rw');if(el){el.classList.toggle('rw-hide');e.preventDefault()}}});

/* 20261101 BATIBABOT · ЯMINT flow (PREVIEW): category → item → price (non-token) → TEST entry → request seal → live only after seal approval.
   Never mints, never signs, never touches keys. "live" stays disabled unless an approved seal is attached by ЯCASKET (not this file). */
var MK=[['wallet.asset.rid','wallet asset (ЯID)'],['game.asset','game asset'],['game.species','game species'],['cryptobot','cryptobot'],['cryptotool','cryptotool'],['cryptosocial','cryptosocial'],['cryptoscience','cryptoscience'],['cryptoart','cryptoart'],['cryptoarticle','cryptoarticle'],['cryptoupdate','cryptoupdate (update pack)'],['token','token (R — no price)']];
function TOK(k){return k==='token'}
function ML(){return st.mints=st.mints||[]}
function MINT(){var m=st.mf||(st.mf={k:'cryptoart',n:'',d:'',p:'',u:'R'}),L=ML();
 return '<div class="rw-mint"><div class="rw-mh">✦ ЯMINT · RGHOSTCHAIN <i>one tap · RGHOSTCHAIN + RTRACKR</i><b data-m="close">×</b></div>'+
 '<button data-m="pending" class="rw-m1">✦ MINT pending block (one tap)</button><div class="rw-mn" id="rw-mstat">'+E(st.mstat||'')+'</div>'+
 '<label>category<select data-mi="k">'+MK.map(function(c){return '<option value="'+c[0]+'"'+(m.k===c[0]?' selected':'')+'>'+E(c[1])+'</option>'}).join('')+'</select></label>'+
 '<label>item<input data-mi="n" maxlength="80" placeholder="name" value="'+E(m.n)+'"></label>'+
 '<label>ЯID<input data-mi="r" maxlength="20" placeholder="ЯID-…" value="'+E(m.r||'')+'"></label>'+
 '<label>note<input data-mi="d" maxlength="200" placeholder="description (public)" value="'+E(m.d)+'"></label>'+
 (TOK(m.k)?'<div class="rw-mn">tokens are not priced here (R rate unpublished)</div>':'<label>price<input data-mi="p" inputmode="decimal" placeholder="0.00" value="'+E(m.p)+'"><select data-mi="u">'+['R','SOL'].map(function(u){return '<option'+(m.u===u?' selected':'')+'>'+u+'</option>'}).join('')+'</select></label>')+
 '<button data-m="add">+ add entry</button>'+
 (L.length?'<div class="rw-ml">'+L.map(function(x,i){var st2=x.sealed?'sealed':x.status;return '<div class="rw-mr"><span>'+E(x.name)+' <em>'+E(x.kind)+(x.price!=null?' · '+E(x.price)+' '+E(x.unit):'')+'</em></span><b class="s-'+E(st2)+'">'+E(st2)+'</b>'+
  (x.status==='live'?'<em>#'+E(x.block_index)+'</em>':'<button data-m="mint1" data-i="'+i+'">✦ MINT</button>')+'<button data-m="del" data-i="'+i+'">✕</button></div>'}).join('')+'</div>':'<div class="rw-mn">no test entries yet</div>')+
 '<div class="rw-mn">One tap: the unlock happens on your signer (this device if pinned, else routed over RPIPE to your trusted phone). No key ever touches this page; unsigned seals are refused.</div></div>'}
var OTSRC=(document.currentScript&&document.currentScript.src)||'';
/* 20261104 pt142u: ONE-TAP MINT via rmint-onetap.js (TerraformЯ _open_rw_mint port). */
function OT(){if(window.RMINT_ONETAP)return Promise.resolve(window.RMINT_ONETAP);return new Promise(function(res,rej){var sc=document.createElement('script');sc.src=OTSRC.replace(/[^\/]*$/,'')+'rmint-onetap.js';
 if(!/rmint-onetap/.test(sc.src))sc.src='/rwallet/rmint-onetap.js';sc.onload=function(){res(window.RMINT_ONETAP)};sc.onerror=function(){rej(new Error('rmint-onetap.js not loaded'))};document.head.appendChild(sc)})}
function MS(t){st.mstat=t;save();var el=document.getElementById('rw-mstat');if(el)el.textContent=t;log('ЯMINT: '+t)}
function MDO(x){var o={onStatus:function(s){MS(s.msg||s.state||'')}};if(x){o.asset={cat:x.kind==='cryptobot'?'cryptobot_mint':'nft_mint',rid:x.rid,label:x.name,price:x.price};}
 MS('starting…');return OT().then(function(T){return T.mint(o)}).then(function(r){if(r.ok){MS((r.mode||'live').toUpperCase()+' · block #'+(r.block_index!=null?r.block_index:(r.result||{}).block_index)+' · '+String(r.block_hash||(r.result||{}).block_hash||'').slice(0,16)+'…'+(r.rtrackr===false?' (RTRACKR pending)':''));if(x){x.status='live';x.block_index=r.block_index!=null?r.block_index:(r.result||{}).block_index;save();render()}}
 else MS((r.queued?'sealed · queued (chain offline)':'not minted: ')+String(r.err||JSON.stringify(r.errors||(r.result||{}).errors||'')))}).catch(function(e){MS('not minted: '+e.message)})}
function MCLICK(e){var t=e.target.closest('[data-m]');if(!t)return false;var a=t.dataset.m,i=+t.dataset.i,L=ML(),m=st.mf||{};
 if(a==='open'){st.mint=!st.mint}else if(a==='close'){st.mint=false}
 else if(a==='add'){var n=String(m.n||'').trim(),pr=TOK(m.k)?null:parseFloat(m.p);if(!n){log('ЯMINT: item name required');return true}
  if(!TOK(m.k)&&!(pr>=0)){log('ЯMINT: price required for non-token assets');return true}
  var rid=String(m.r||'').trim();if(!/^ЯID-\d{4}-[0-9A-HJKMNP-TV-Z]{4}$/.test(rid)){log('ЯMINT: a valid ЯID is required (ЯID-0000-XXXX)');return true}
  L.unshift({id:'m-'+Date.now().toString(36),rid:rid,kind:m.k,name:n,note:m.d||'',price:pr,unit:TOK(m.k)?null:m.u,status:'ready',sealed:false,created:new Date().toISOString()});st.mf={k:m.k,n:'',d:'',p:'',u:m.u,r:''};log('ЯMINT entry added: '+n+' · tap ✦ MINT')}
 else if(a==='pending'){MDO(null);return true}
 else if(a==='mint1'&&L[i]){MDO(L[i]);return true}
  else if(a==='del'&&L[i]){L.splice(i,1)}
 save();render();return true}
document.addEventListener('change',function(e){var t=e.target.closest&&e.target.closest('[data-mi]');if(!t)return;(st.mf=st.mf||{})[t.dataset.mi]=t.value;save();if(t.dataset.mi==='k')render()});
document.addEventListener('input',function(e){var t=e.target.closest&&e.target.closest('[data-mi]');if(t&&t.tagName==='INPUT'){(st.mf=st.mf||{})[t.dataset.mi]=t.value;save()}});
window.RWALLET={render:render,run:run,funcs:F,open:function(g,v){st.open[g]=v!==false;save();render()}};
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',render):render();if(window.RWALLET_UNIFIED)RWALLET_UNIFIED.ready.then(render)})();

/* rwallet-v2-loader 20261108-rwallet (Rizal t36u GO, add-only): unit R (was RDG) + ЯWALLET 2 one-press UI behind every "> Wallet"/RWALLET button.
   Loads rmint-transport → rmint-session → rmint-gate → rmint-onetap → rmint-press → rwallet-linked → rwallet-ghost2 (+css) from this folder.
   window.RWALLET_V2===false keeps the old screen. Never holds keys; never signs. */
(function(){if(window.RWALLET_V2===false)return;var cs=document.currentScript||[].slice.call(document.scripts).filter(function(x){return /rwallet-ghost\.js/.test(x.src)})[0];
 var base=((cs&&cs.src)||'/rwallet/rwallet-ghost.js').replace(/[^\/]*(\?.*)?$/,'');var v='?v=20261108';
 if(!document.querySelector('link[data-rw2]')){var l=document.createElement('link');l.rel='stylesheet';l.href=base+'rwallet-ghost2.css'+v;l.setAttribute('data-rw2','1');document.head.appendChild(l)}
 var Q=[['RMINT_TRANSPORT','rmint-transport.js'],['RMINT_SESSION','rmint-session.js'],['RMINT_GATE','rmint-gate.js'],['RMINT_ONETAP','rmint-onetap.js'],['RMINT_PRESS','rmint-press.js'],['RWALLET_LINKED','rwallet-linked.js'],['RWALLET2','rwallet-ghost2.js']];
 (function nx(i){if(i>=Q.length)return;if(window[Q[i][0]])return nx(i+1);var s=document.createElement('script');s.src=base+Q[i][1]+v;s.onload=s.onerror=function(){nx(i+1)};document.head.appendChild(s)})(0)})();

/* rwallet-v2-drift 0.1.2 (20261109, add-only): loads rwallet-drift.js from this folder; warns if served wallet files differ from RWALLET.sha256. */
(function(){if(window.RWALLET_DRIFT)return;var cs=document.currentScript||[].slice.call(document.scripts).filter(function(x){return /rwallet-ghost\.js/.test(x.src)})[0];var base=((cs&&cs.src)||'/rwallet/rwallet-ghost.js').replace(/[^\/]*(\?.*)?$/,'');var s=document.createElement('script');s.src=base+'rwallet-drift.js?v=0.1.2';document.head.appendChild(s)})();

/* rmint-cast 0.1.3 loader (20261109, add-only): loads rmint-cast.js (sign prompt cast: DISPLAY ONLY, press = unlock on a HARD device). */
(function(){if(window.RMINT_CAST)return;var cs=document.currentScript||[].slice.call(document.scripts).filter(function(x){return /rwallet-ghost\.js/.test(x.src)})[0];var base=((cs&&cs.src)||'/rwallet/rwallet-ghost.js').replace(/[^\/]*(\?.*)?$/,'');var s=document.createElement('script');s.src=base+'rmint-cast.js?v=0.1.3';document.head.appendChild(s)})();

/* rghostkey-api 0.1.4 loader (20261109, add-only): loads rghostkey-api.js (ONE rghostkey interface; soft pages only queue requests). */
(function(){if(window.RGHOSTKEY)return;var cs=document.currentScript||[].slice.call(document.scripts).filter(function(x){return /rwallet-ghost\.js/.test(x.src)})[0];var base=((cs&&cs.src)||'/rwallet/rwallet-ghost.js').replace(/[^\/]*(\?.*)?$/,'');var s=document.createElement('script');s.src=base+'rghostkey-api.js?v=0.1.4';document.head.appendChild(s)})();

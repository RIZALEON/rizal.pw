function RTYPE(b){var k=b&&b.payload&&b.payload.kind;return(b.type==='cryptobot_mint'||k==='cryptobot')?'cryptobot':(b.type==='cryptoupdate'||k==='cryptoupdate')?'cryptoupdate':b.type}
/* 20261101 BATIBABOT: kind labels/icons; cryptoupdate special-cased (pack facts, signer, live vs dry). */
var RK={genesis:['◎','genesis'],nft_mint:['✦','nft mint'],cryptobot:['🤖','cryptobot'],transfer:['⇄','transfer'],note:['✎','note'],convert:['⇆','convert'],index:['≡','index'],cryptoupdate:['⟳','cryptoupdate']};
function TL(b){var t=RTYPE(b),k=RK[t]||['·',t];return '<span class="k k-'+String(t).replace(/[^a-z_]/g,'')+'">'+k[0]+' '+String(k[1]).replace(/[&<>"]/g,'')+'</span>'}
function UPD(b){var p=b.payload||{},E2=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})},os=p.ops_summary||{};
 return '<h2>⟳ Cryptoupdate</h2><table class="kv upd"><tr><td>pack</td><td>'+E2(p.pack_name)+' <span class="dim">v'+E2(p.version)+'</span></td></tr><tr><td>pack sha256</td><td class="h">'+E2(p.pack_sha256)+'</td></tr><tr><td>manifest sha256</td><td class="h">'+E2(p.manifest_sha256)+'</td></tr><tr><td>platforms</td><td>'+E2((p.platforms||[]).join(' · '))+'</td></tr><tr><td>ops</td><td>'+(Object.keys(os).map(function(k){return E2(k)+' ×'+E2(os[k])}).join(' · ')||'—')+'</td></tr><tr><td>signer</td><td>'+E2(p.signer_device)+'</td></tr><tr><td>status</td><td class="'+(p.onchain?'ok':'dim')+'">'+(p.onchain?'LIVE · manifest signature verified by submitd':'dry / test')+'</td></tr></table>'}
/* RTRACKR explorer v1.3 · 20261114 pool panel (Orca Я/SOL, live RPC + snapshot fallback) · v1.2 20261107 · RGHOSTCHAIN snapshot + R TOKEN (Solana) public trackers + live getSignaturesForAddress (mint · crown · pool · holder) + holder balances. */
(function(){"use strict";var D=null,RT=null,PS=null,app=document.getElementById('app'),badge=document.getElementById('badge'),pollT=null,LSK='rtrackr.rtoken.events.v1';
var RPCS=['https://solana-rpc.publicnode.com','https://api.mainnet-beta.solana.com'];
var DEF={mint:'BB9uA5BuacDnWyDf5Npc9nMb9yFbyThsNrQPBYJ5Q1Lv',crown:'BwpVNk1Rtncpv5HMTLwxB4Yfjkfv6mFaBQUTpjneH1F9',pool:'24uKAFYiLQaycBeiVCpKQgsjUwAn9XiKsuiMAZeoaRV7',mint_tx:'2Lxr2mEZnFnwwBMQjCgRt8EJLaJbwEp61K51mdx16z8oncWg2JCXzCKnisMi78V3L4w7w2pizQ8P1p2H5XMLvx94',holder:'12872Chwv88d9JcNnPPThtSQWJM296kpkDqm7tpBWB28',holder_ata:'BNFLK9bU7CJ4mY87DHpgZ8wj4a1atxwRVpmSuxBUsG8Z'};
function E(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function mt(t){if(!t)return'—';var d=typeof t==='number'?new Date(t*1000):new Date(t);if(isNaN(d))return E(t);return E(d.toLocaleString('en-US',{timeZone:'America/Denver',year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',second:'2-digit'}))+' MT'}
function sh(h){h=String(h||'');return h.length>20?h.slice(0,10)+'…'+h.slice(-6):h}
function bl(b){return '<a href="#block/'+b.index+'">'+b.index+'</a>'}
function hl(b){return '<a class="h" href="#block/'+b.index+'" title="'+E(b.hash)+'">'+E(sh(b.hash))+'</a>'}
function rl(r){return '<a href="#rid/'+encodeURIComponent(r)+'">'+E(r)+'</a>'}
function blocks(){return (D&&D.blocks)||[]}
function rids(b){var p=b.payload||{},o=[];['rid','owner_rid','holder_rid','asset_rid'].forEach(function(k){if(p[k]&&o.indexOf(p[k])<0)o.push(p[k])});return o}
function handles(b){var p=b.payload||{},o=[];['handle','owner_handle'].forEach(function(k){if(p[k])o.push(String(p[k]).toLowerCase())});return o}
function links(){var B=blocks(),bad=[];for(var i=1;i<B.length;i++)if(B[i].prev_hash!==B[i-1].hash)bad.push(i);return bad}
function row(b){return '<tr><td>'+bl(b)+'</td><td>'+hl(b)+'</td><td>'+TL(b)+'</td><td>'+mt(b.ts)+'</td><td class="h dim">'+E(sh(b.prev_hash))+'</td></tr>'}
function tbl(L){return '<table><tr><th>height</th><th>hash</th><th>type</th><th>time</th><th>prev_hash</th></tr>'+L.map(row).join('')+'</table>'}
function assetsT(A){if(!A.length)return '<p class="dim">no live assets</p>';return '<table><tr><th>asset</th><th>ЯID</th><th>holder</th><th>status</th><th>block</th></tr>'+A.map(function(a){var b=a.block||{};return '<tr><td>'+E(a.label||a.asset_id)+'</td><td>'+rl(a.rid||'')+'</td><td>'+E(a.owner_handle||'')+'</td><td class="ok">'+E(a.status||'live')+'</td><td>'+(b.height!=null?'<a href="#block/'+b.height+'">'+b.height+'</a> '+E(sh(b.hash)):'—')+'</td></tr>'}).join('')+'</table>'}
function token(){var t=(RT&&RT.token)||{},L=(RT&&RT.links)||{};return{
 mint:t.mint||DEF.mint,crown:t.crown_mint_authority||DEF.crown,pool:t.orca_pool_position||DEF.pool,mint_tx:t.mint_tx||DEF.mint_tx,
 holder:t.holder||DEF.holder,holder_ata:t.holder_token_account||DEF.holder_ata,
 links:L
}}
function linkBtn(href,label){if(!href)return'';return '<a class="rt-btn" href="'+E(href)+'" target="_blank" rel="noopener noreferrer">'+E(label)+'</a>'}
function solscanTx(sig){return 'https://solscan.io/tx/'+encodeURIComponent(sig)}
function saveCache(evs){try{localStorage.setItem(LSK,JSON.stringify({saved_at:Date.now(),events:evs}))}catch(e){}}
function loadCache(){try{var j=JSON.parse(localStorage.getItem(LSK)||'null');return j&&Array.isArray(j.events)?j:null}catch(e){return null}}
function rpcSigs(addr,limit){return rpcCall('getSignaturesForAddress',[addr,{limit:limit||12}]).then(function(r){return Array.isArray(r)?r:[]})}
function normEvt(e,src){return{source:src,signature:e.signature,slot:e.slot,blockTime:e.blockTime||null,status:e.err?'failed':(e.confirmationStatus||'unknown'),err:e.err||null}}
function mergeEvts(bags){var seen={},out=[],i,src,list,e,sig,prev;
 for(src in bags){if(!bags.hasOwnProperty(src))continue;list=bags[src]||[];
  for(i=0;i<list.length;i++){e=normEvt(list[i],src);sig=e.signature;if(!sig)continue;
   if(seen[sig]!=null){prev=out[seen[sig]];if(prev.source.indexOf(src)<0)prev.source+='+'+src}
   else{seen[sig]=out.length;out.push(e)}}}
 out.sort(function(a,b){return(b.blockTime||0)-(a.blockTime||0)});return out}
function eventsHTML(evs,meta){meta=meta||{};
 if(!evs||!evs.length)return '<p class="dim" id="rt-events-status">'+(meta.msg||'no events yet')+'</p><table id="rt-events-tbl"><tr><th>time (MT)</th><th>sig</th><th>via</th><th>status</th></tr></table>';
 return '<p class="dim" id="rt-events-status">'+E(meta.msg||((evs.length)+' recent · poll 60s'))+'</p><table id="rt-events-tbl"><tr><th>time (MT)</th><th>sig</th><th>via</th><th>status</th></tr>'+
  evs.map(function(e){var st=e.status==='failed'?'no':(e.status==='finalized'||e.status==='confirmed'?'ok':'dim');
   return '<tr><td>'+mt(e.blockTime||e.ts_mt)+'</td><td class="h"><a href="'+E(solscanTx(e.signature))+'" target="_blank" rel="noopener noreferrer" title="'+E(e.signature)+'">'+E(sh(e.signature))+'</a></td><td class="dim">'+E(e.source||'')+'</td><td class="'+st+'">'+E(e.status||'')+'</td></tr>'}).join('')+'</table>'}
function paintEvents(evs,meta){var box=document.getElementById('rt-events');if(!box)return;box.innerHTML=eventsHTML(evs,meta)}
function holderSnap(){var h=(RT&&RT.holder)||{};return h}
function fmtSol(v){if(v==null||v==='')return'—';var n=Number(v);if(isNaN(n))return E(v);return n.toFixed(9).replace(/0+$/,'').replace(/\.$/,'')}
function paintHolder(H,meta){var box=document.getElementById('rt-holder');if(!box)return;H=H||holderSnap();
 var addr=H.address||token().holder,sol=H.sol!=null?H.sol:(H.sol_lamports!=null?H.sol_lamports/1e9:null),amt=H.rtoken_amount||'—',share=H.share||'—';
 box.innerHTML='<div class="stats">'+[['holder',sh(addr)],['holder SOL',fmtSol(sol)],['holder R',amt],['of supply',share]].map(function(s){return '<div class="st"><span>'+s[0]+'</span><b title="'+E(s[0]==='holder'?addr:s[1])+'">'+E(s[1])+'</b></div>'}).join('')+'</div>'+
  (H.token_account?'<p class="dim h">token account <code>'+E(H.token_account)+'</code></p>':'')+
  '<p class="dim" id="rt-holder-status">'+E((meta&&meta.msg)||'')+'</p>'}
function rpcCall(method,params){return (function tryAt(i){if(i>=RPCS.length)return Promise.reject(new Error('rpc unavailable'));return fetch(RPCS[i],{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:method,params:params})}).then(function(r){if(!r.ok)throw new Error('rpc '+r.status);return r.json()}).then(function(j){if(j.error)throw new Error(j.error.message||'rpc error');if(method==='getSignaturesForAddress'&&Array.isArray(j.result)&&!j.result.length&&i+1<RPCS.length)return tryAt(i+1);return j.result}).catch(function(err){if(i+1<RPCS.length)return tryAt(i+1);throw err})})(0)}
function refreshHolder(){var T=token(),ata=T.holder_ata||holderSnap().token_account;
 return Promise.all([rpcCall('getBalance',[T.holder]),ata?rpcCall('getAccountInfo',[ata,{encoding:'jsonParsed'}]):Promise.resolve(null)]).then(function(a){
  var bal=a[0]&&a[0].value,info={},ta={},tokenAccount=ata;
  if(a[1]&&a[1].value&&a[1].value.data){info=((((a[1].value.data||{}).parsed||{}).info)||{});ta=info.tokenAmount||{}}else if(a[1]&&a[1].value){var accs=a[1].value||[];if(accs[0]){tokenAccount=accs[0].pubkey;info=((((accs[0].account||{}).data||{}).parsed||{}).info)||{};ta=info.tokenAmount||{}}}
  var H={address:T.holder,token_account:tokenAccount||T.holder_ata,sol_lamports:bal,sol:typeof bal==='number'?bal/1e9:null,rtoken_amount:ta.uiAmountString||(ta.uiAmount!=null?String(ta.uiAmount):'—'),rtoken_raw:ta.amount,decimals:ta.decimals,updated_at:new Date().toISOString()};
  var supply=((RT&&RT.token)||{}).supply_ui;if(supply&&ta.uiAmount!=null)H.share=(100*Number(ta.uiAmount)/Number(supply)).toFixed(8)+'%';
  else if(holderSnap().share)H.share=holderSnap().share;
  if(RT)RT.holder=H;paintHolder(H,{msg:'live · last poll '+mt(Date.now()/1000)});return H
 }).catch(function(err){paintHolder(holderSnap(),{msg:'offline / RPC unavailable · showing snapshot · '+E(err&&err.message||err)});return holderSnap()})}
function refreshEvents(){var T=token(),addrs={mint:T.mint,crown:T.crown,pool:T.pool,holder:T.holder};
 paintEvents((RT&&RT.events)||[],{msg:'refreshing Solana…'});
 refreshHolder();refreshPool();
 return Promise.all([rpcSigs(addrs.mint,12),rpcSigs(addrs.crown,12),rpcSigs(addrs.pool,8),rpcSigs(addrs.holder,12)]).then(function(a){
  var evs=mergeEvts({mint:a[0],crown:a[1],pool:a[2],holder:a[3]}),snap=(RT&&RT.events)||[];
  if(snap.length){var seen={};evs.forEach(function(e,i){if(e.signature)seen[e.signature]=i});snap.forEach(function(e){if(e.signature&&seen[e.signature]==null){seen[e.signature]=evs.length;evs.push(e)}});evs.sort(function(a,b){return(b.blockTime||0)-(a.blockTime||0)})}
  if(RT){RT.events=evs;RT.events_count=evs.length;RT.live_at=new Date().toISOString()}
  saveCache(evs);paintEvents(evs,{msg:evs.length+' live · last poll '+mt(Date.now()/1000)});return evs
 }).catch(function(err){var c=loadCache(),snap=(RT&&RT.events)||[],use=c&&c.events&&c.events.length?c.events:snap;
  paintEvents(use,{msg:'offline / RPC unavailable · showing '+(c&&c.events&&c.events.length?'cached':'snapshot')+' ('+use.length+') · '+E(err&&err.message||err)});return use})}
function startPoll(){if(pollT)clearInterval(pollT);pollT=setInterval(function(){if(document.getElementById('rt-events'))refreshEvents()},60000)}
/* 20261114 POOL-INTEGRATE (Decider t237u): Orca Я/SOL whirlpool panel. Live = public Solana RPC (getAccountInfo + vault balances); offline = data/token-pool.json snapshot. Tracking only: no swap, no liquidity actions. */
var POOLDEF={address:'HSroUxVkVKv6kX9e7dpoJtbFqKcL76BzrkuuRfAGxs9s',label:'Orca Я/SOL splash pool',pair:'Я/SOL',dex:'Orca',program:'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',syms:{'BB9uA5BuacDnWyDf5Npc9nMb9yFbyThsNrQPBYJ5Q1Lv':'Я','So11111111111111111111111111111111111111112':'SOL'}};
function poolSnap(){return(PS&&PS.pools&&PS.pools[0])||null}
function poolAddr(){var s=poolSnap(),t=(RT&&RT.token)||{};return(s&&s.address)||t.orca_whirlpool||POOLDEF.address}
function b58e(b){var A='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',d=[0],i,j,c,s='';for(i=0;i<b.length;i++){c=b[i];for(j=0;j<d.length;j++){c+=d[j]<<8;d[j]=c%58;c=(c/58)|0}while(c){d.push(c%58);c=(c/58)|0}}for(i=0;i<b.length&&b[i]===0;i++)s+='1';for(j=d.length-1;j>=0;j--)s+=A[d[j]];return s}
function u128le(u,o){var v=0,i;for(i=15;i>=0;i--)v=v*256+u[o+i];return v}
function parseWP(u){if(u.length<261)throw new Error('not a whirlpool');var dv=new DataView(u.buffer,u.byteOffset,u.byteLength);
 return{tick_spacing:dv.getUint16(41,true),fee_rate:dv.getUint16(45,true),liquidity:u128le(u,49),sqrt:u128le(u,65),tick:dv.getInt32(81,true),mint_a:b58e(u.subarray(101,133)),vault_a:b58e(u.subarray(133,165)),mint_b:b58e(u.subarray(181,213)),vault_b:b58e(u.subarray(213,245))}}
function pfmt(n,d){if(n==null||n===''||isNaN(Number(n)))return'—';n=Number(n);if(n===0)return'0';if(Math.abs(n)<1e-4||Math.abs(n)>=1e9)return n.toExponential(d||4);return n.toLocaleString('en-US',{maximumFractionDigits:d||6})}
function paintPool(P,meta){var box=document.getElementById('rt-pool');if(!box)return;
 if(!P){box.innerHTML='<p class="dim">no pool snapshot yet · '+E((meta&&meta.msg)||'')+'</p>';return}
 var a=P.token_a||{},b=P.token_b||{},M=P.market||{},rIsA=a.symbol==='Я',r=rIsA?a:b,sol=rIsA?b:a,pr=P.price_b_per_a,rPerSol=rIsA?(pr?1/pr:null):pr,solPerR=rPerSol?1/rPerSol:null,L=P.links||{},adr=P.address||poolAddr();
 box.innerHTML='<div class="stats">'+[['pool',sh(adr)],['pair',P.pair||POOLDEF.pair],['dex',(P.dex||'Orca')+' · fee '+(P.fee_pct!=null?P.fee_pct:(P.fee_rate!=null?P.fee_rate/10000:'—'))+'%'],['Я in pool',pfmt(r.amount_ui,4)],['SOL in pool',pfmt(sol.amount_ui,9)],['value (SOL)',pfmt(P.tvl_sol,6)],['Я per SOL',pfmt(rPerSol,2)],['SOL per Я',pfmt(solPerR,4)],['reserve (USD)',M.reserve_usd!=null?'$'+pfmt(M.reserve_usd,2):'—'],['24h trades',M.trades_24h!=null?M.trades_24h:'—']].map(function(s){return '<div class="st"><span>'+s[0]+'</span><b title="'+E(s[0]==='pool'?adr:s[1])+'">'+E(s[1])+'</b></div>'}).join('')+'</div>'+
  '<p class="dim h">pool <code>'+E(adr)+'</code> · tick '+E(P.tick_current_index)+' · liquidity '+E(P.liquidity)+'</p>'+
  '<div class="rt-links"><div class="rt-row"><span class="rt-lab">pool</span>'+linkBtn(L.solscan||('https://solscan.io/account/'+adr),'Solscan')+linkBtn(L.explorer||('https://explorer.solana.com/address/'+adr),'Explorer')+linkBtn(L.geckoterminal||('https://www.geckoterminal.com/solana/pools/'+adr),'GeckoTerminal')+linkBtn(L.dexscreener||('https://dexscreener.com/solana/'+adr),'DexScreener')+'</div></div>'+
  '<p class="dim">tracking only · no swap · no liquidity actions'+(M.fetched_at?' · USD/24h from '+E(M.source||'snapshot')+' as of '+mt(M.fetched_at):'')+' · GhostChain registry: pools.json (not a sealed block)</p>'+
  '<p class="dim" id="rt-pool-status">'+E((meta&&meta.msg)||'')+'</p>'}
function refreshPool(){var adr=poolAddr(),snap=poolSnap();
 return rpcCall('getAccountInfo',[adr,{encoding:'base64',commitment:'confirmed'}]).then(function(res){var v=res&&res.value;if(!v)throw new Error('pool not found');if(v.owner!==POOLDEF.program)throw new Error('not an Orca whirlpool');
  var raw=atob(v.data[0]),u=new Uint8Array(raw.length),i;for(i=0;i<raw.length;i++)u[i]=raw.charCodeAt(i);var w=parseWP(u);
  return Promise.all([rpcCall('getTokenAccountBalance',[w.vault_a]),rpcCall('getTokenAccountBalance',[w.vault_b])]).then(function(bb){var va=bb[0].value,vb=bb[1].value,pr=Math.pow(w.sqrt/Math.pow(2,64),2)*Math.pow(10,va.decimals-vb.decimals),aa=Number(va.uiAmountString),ab=Number(vb.uiAmountString),solA=w.mint_a.indexOf('So1111111111')===0,solB=w.mint_b.indexOf('So1111111111')===0;
   var P={address:adr,pair:POOLDEF.pair,dex:'Orca',label:POOLDEF.label,fee_rate:w.fee_rate,fee_pct:w.fee_rate/10000,tick_current_index:w.tick,liquidity:String(w.liquidity),price_b_per_a:pr,
    token_a:{symbol:POOLDEF.syms[w.mint_a]||w.mint_a.slice(0,6),mint:w.mint_a,vault:w.vault_a,decimals:va.decimals,amount_ui:va.uiAmountString},token_b:{symbol:POOLDEF.syms[w.mint_b]||w.mint_b.slice(0,6),mint:w.mint_b,vault:w.vault_b,decimals:vb.decimals,amount_ui:vb.uiAmountString},
    tvl_sol:solA?aa+(pr?ab/pr:0):(solB?ab+aa*pr:null),market:snap&&snap.market,links:snap&&snap.links,live_at:new Date().toISOString(),slot:res.context&&res.context.slot};
   paintPool(P,{msg:'live · public Solana RPC · slot '+(P.slot||'—')+' · last poll '+mt(Date.now()/1000)});return P})
 }).catch(function(err){paintPool(snap,{msg:'offline / RPC unavailable · showing saved snapshot'+(PS&&PS.fetched_at?' from '+mt(PS.fetched_at):'')+' · '+E(err&&err.message||err)});return snap})}
function rtokenSection(){var T=token(),L=T.links||{},mint=T.mint,crown=T.crown,pool=T.pool,mtx=T.mint_tx,holder=T.holder,hata=T.holder_ata,H=holderSnap();
 var solscanT=L.solscan_token||('https://solscan.io/token/'+mint),solscanA=L.solscan_account||('https://solscan.io/account/'+mint);
 var expl=L.explorer||('https://explorer.solana.com/address/'+mint),sfm=L.solanafm||('https://solana.fm/address/'+mint);
 var jup=L.jupiter||('https://jup.ag/tokens/'+mint),gt=L.geckoterminal||('https://www.geckoterminal.com/solana/tokens/'+mint);
 var dx=L.dexscreener||('https://dexscreener.com/solana/'+mint),cg=L.coingecko||('https://www.coingecko.com/en/coins/solana/token/'+mint);
 var scCrown=L.solscan_crown||('https://solscan.io/account/'+crown),scPool=L.solscan_pool||('https://solscan.io/account/'+pool),scHolder=L.solscan_holder||('https://solscan.io/account/'+holder);
 var scMintTx=L.solscan_mint_tx||('https://solscan.io/tx/'+mtx),exMintTx=L.explorer_mint_tx||('https://explorer.solana.com/tx/'+mtx),sfmMintTx=L.solanafm_mint_tx||('https://solana.fm/tx/'+mtx);
 var seed=(RT&&RT.events)||[],cache=loadCache();
 if((!seed||!seed.length)&&cache&&cache.events)seed=cache.events;
 return '<section class="rtoken" id="rtoken"><h2>◈ R TOKEN <span class="dim">Solana</span></h2>'+
  '<div class="stats">'+[['mint',sh(mint)],['crown / mint authority',sh(crown)],['Orca pool position',sh(pool)],['holder',sh(holder)],['events',seed.length||(RT&&RT.events_count)||0]].map(function(s){return '<div class="st"><span>'+s[0]+'</span><b title="'+E(s[1]===sh(mint)?mint:s[1]===sh(crown)?crown:s[1]===sh(pool)?pool:s[1]===sh(holder)?holder:s[1])+'">'+E(s[1])+'</b></div>'}).join('')+'</div>'+
  '<p class="dim h">mint <code>'+E(mint)+'</code></p><p class="dim h">holder <code>'+E(holder)+'</code></p>'+
  '<div class="rt-links"><div class="rt-row"><span class="rt-lab">mint</span>'+linkBtn(solscanT,'Solscan token')+linkBtn(solscanA,'Solscan account')+linkBtn(expl,'Solana Explorer')+linkBtn(sfm,'SolanaFM')+'</div>'+
  '<div class="rt-row"><span class="rt-lab">crown</span>'+linkBtn(scCrown,'Solscan')+linkBtn(L.explorer_crown||('https://explorer.solana.com/address/'+crown),'Explorer')+linkBtn(L.solanafm_crown||('https://solana.fm/address/'+crown),'SolanaFM')+'</div>'+
  '<div class="rt-row"><span class="rt-lab">pool</span>'+linkBtn(scPool,'Solscan')+linkBtn(L.explorer_pool||('https://explorer.solana.com/address/'+pool),'Explorer')+linkBtn(L.solanafm_pool||('https://solana.fm/address/'+pool),'SolanaFM')+'</div>'+
  '<div class="rt-row"><span class="rt-lab">holder</span>'+linkBtn(scHolder,'Solscan')+linkBtn(L.explorer_holder||('https://explorer.solana.com/address/'+holder),'Explorer')+linkBtn(L.solanafm_holder||('https://solana.fm/address/'+holder),'SolanaFM')+'</div>'+
  '<div class="rt-row"><span class="rt-lab">mint tx</span>'+linkBtn(scMintTx,'Solscan')+linkBtn(exMintTx,'Explorer')+linkBtn(sfmMintTx,'SolanaFM')+'</div>'+
  '<div class="rt-row"><span class="rt-lab">price</span>'+linkBtn(jup,'Jupiter')+linkBtn(gt,'GeckoTerminal')+linkBtn(dx,'DexScreener')+linkBtn(cg,'CoinGecko')+'</div></div>'+
  '<h2>◈ Orca Я/SOL pool <span class="dim">tracking only</span></h2><div id="rt-pool"></div>'+
  '<h2>Watched holder</h2><div id="rt-holder"></div>'+
  '<h2>R TOKEN events</h2><div id="rt-events">'+eventsHTML(seed,{msg:seed.length?(seed.length+' from snapshot · live poll starting…'):'loading…'})+'</div></section>'}
function home(){var B=blocks(),tip=B[B.length-1]||{},V=D.verify||{},bad=links(),A=D.assets||[],nm=B.filter(function(b){return RTYPE(b)==='nft_mint'}).length,cb=B.filter(function(b){return RTYPE(b)==='cryptobot'}).length,cu=B.filter(function(b){return RTYPE(b)==='cryptoupdate'}).length;
 app.innerHTML='<div class="stats">'+[['height',B.length?tip.index:'—'],['blocks',B.length],['tip hash',sh(tip.hash)],['nft mints',nm],['cryptobots',cb],['cryptoupdates',cu],['live assets',A.length],['chain verify (Neo)',V.ok?'OK':'FAIL'],['prev_hash links',bad.length?'BROKEN at '+bad.join(','):'OK'],['last block',tip.ts?mt(tip.ts):'—']].map(function(s){return '<div class="st"><span>'+s[0]+'</span><b>'+(s[0]==='last block'?s[1]:E(s[1]))+'</b></div>'}).join('')+'</div>'+
 (D.source?'<p class="dim">source: '+E(D.source)+'</p>':'')+rtokenSection()+'<h2>Latest blocks</h2>'+tbl(B.slice().reverse().slice(0,25))+'<h2>Assets (RTRACKR live entries)</h2>'+assetsT(A);
 setTimeout(function(){refreshEvents().then(startPoll)},0)}
function block(n){var b=blocks().filter(function(x){return String(x.index)===String(n)||x.hash===n})[0];if(!b){app.innerHTML='<p class="no">block '+E(n)+' not found</p>';return}
 var prev=blocks()[b.index-1],lk=b.index===0||(prev&&prev.hash===b.prev_hash);
 if(pollT){clearInterval(pollT);pollT=null}
 app.innerHTML='<h2>Block '+b.index+'</h2><table class="kv"><tr><td>height</td><td>'+b.index+'</td></tr><tr><td>hash</td><td class="h">'+E(b.hash)+'</td></tr><tr><td>prev_hash</td><td class="h">'+(prev?'<a href="#block/'+prev.index+'">'+E(b.prev_hash)+'</a>':E(b.prev_hash))+'</td></tr><tr><td>link</td><td class="'+(lk?'ok':'no')+'">'+(lk?'OK':'BROKEN')+'</td></tr><tr><td>time</td><td>'+mt(b.ts)+' <span class="dim">'+E(b.ts)+'</span></td></tr><tr><td>type</td><td>'+TL(b)+'</td></tr>'+((D.assets||[]).filter(function(x){return x.block&&x.block.hash===b.hash}).map(function(x){return '<tr><td>asset</td><td class="ok">'+E(x.label||x.asset_id)+' · '+rl(x.rid)+' · LIVE</td></tr>'}).join(''))+'<tr><td>ЯIDs</td><td>'+(rids(b).map(rl).join(' · ')||'—')+'</td></tr></table>'+(RTYPE(b)==='cryptoupdate'?UPD(b):'')+'<h2>Payload</h2><pre>'+E(JSON.stringify(b.payload,null,2))+'</pre><p>'+(b.index>0?'<a href="#block/'+(b.index-1)+'">← prev</a> ':'')+(blocks()[b.index+1]?'<a href="#block/'+(b.index+1)+'">next →</a>':'')+'</p>'}
function rid(r){var q=r.toLowerCase(),B=blocks().filter(function(b){return rids(b).some(function(x){return x.toLowerCase()===q})||handles(b).indexOf(q)>=0}),A=(D.assets||[]).filter(function(a){return String(a.rid).toLowerCase()===q||String(a.owner_handle).toLowerCase()===q||String(a.holder_rid||'').toLowerCase()===q});
 if(pollT){clearInterval(pollT);pollT=null}
 app.innerHTML='<h2>Address '+E(r)+'</h2><div class="stats"><div class="st"><span>blocks</span><b>'+B.length+'</b></div><div class="st"><span>live assets</span><b>'+A.length+'</b></div></div><h2>Assets</h2>'+assetsT(A)+'<h2>Blocks</h2>'+(B.length?tbl(B):'<p class="dim">no blocks for this ЯID / handle</p>')}
function rtokenPage(){app.innerHTML=rtokenSection();setTimeout(function(){refreshEvents().then(startPoll)},0)}
function route(){if(!D)return;var h=decodeURIComponent(location.hash.slice(1)),m;
 if(h==='rtoken'||h==='rtoken/'||h==='pool'||h==='pool/')return rtokenPage();
 if((m=h.match(/^block\/(.+)$/)))return block(m[1]);if((m=h.match(/^rid\/(.+)$/)))return rid(m[1]);home()}
document.getElementById('q').addEventListener('submit',function(e){e.preventDefault();var v=document.getElementById('qi').value.trim();if(!v)return;
 if(/^(rtoken|pool)$/i.test(v)||v===poolAddr()||v===token().holder||v===token().holder_ata||(v.length>=8&&(token().holder.indexOf(v)===0||token().holder_ata.indexOf(v)===0))){location.hash='rtoken';return}
 if(/^\d+$/.test(v)||/^[0-9a-f]{16,}$/i.test(v)){var b=blocks().filter(function(x){return String(x.index)===v||x.hash===v||x.hash.indexOf(v.toLowerCase())===0})[0];location.hash=b?'block/'+b.index:'block/'+v}else location.hash='rid/'+encodeURIComponent(v)});
window.addEventListener('hashchange',route);
Promise.all([
 fetch('/rtrackr/data/rghostchain.json',{cache:'no-store'}).then(function(r){if(!r.ok)throw 0;return r.json()}),
 fetch('/rtrackr/data/rtoken.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).catch(function(){return null}),
 fetch('/rtrackr/data/token-pool.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).catch(function(){return null})
]).then(function(pair){D=pair[0];RT=pair[1];PS=pair[2];
 if(D.pending||!(D.blocks||[]).length){badge.className='badge pend';badge.textContent='chain snapshot pending · no blocks shown yet · registry as of '+(D.exported_at?new Date(D.exported_at).toLocaleString('en-US',{timeZone:'America/Denver'})+' MT':'—');app.innerHTML='<p class="dim">'+E(D.note||'')+'</p><p class="dim">source: '+E(D.source||'')+'</p>'+rtokenSection()+'<h2>Assets (RTRACKR live entries)</h2>'+assetsT(D.assets||[]);setTimeout(function(){refreshEvents().then(startPoll)},0);return}
 var ok=D.verify&&D.verify.ok&&!links().length;badge.className='badge'+(ok?'':' bad');badge.innerHTML=(ok?'● LIVE':'● VERIFY FAIL')+' · snapshot as of '+mt(D.exported_at)+' · republished on every new block';route()}).catch(function(){badge.className='badge pend';badge.textContent='chain export pending · snapshot not reachable'})})();

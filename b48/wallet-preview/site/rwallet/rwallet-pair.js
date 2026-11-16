/* ЯWALLET · CRYPTOGAME pair Rcoin/Я panel · RATE-100 20261114 (Rizal GO 2026-11-14 9:15 PM MT; app integration GO 10:25 PM MT).
 * 100 R coins = 1 R token · rounded down · minimum 100 Rcoins · cap 100 Rtoken per person per day. Supersedes 10:1.
 * Same logic as RTRACKR #pair (rizal.pw/rtrackr). PREVIEW ONLY: no convert block, no wallet call, no signing, no chain write.
 * Data: <this script dir>/data/rtrackr-feed/{economy-rates,token-pool}.json. Я/SOL = Orca pool price, reference only
 * (live via public Solana RPC when the page's network guard allows it, else the saved snapshot). */
(function(root){"use strict";
if(root.RWALLET_PAIR)return;
var cs=document.currentScript||[].slice.call(document.getElementsByTagName('script')).filter(function(s){return /rwallet-pair\.js/.test(s.src||'')})[0],DIR=cs&&cs.src?cs.src.replace(/[?#].*$/,'').replace(/[^\/]*$/,''):'',FEED=DIR+'data/rtrackr-feed/';
var DEF={pair_id:'CRYPTOGAME:RCOIN/Я',label:'CRYPTOGAME pair Rcoin/Я',rate:{rcoins_per_rtoken:100,text:'100 R coins = 1 R token',rounding:'floor',minimum_rcoins:100,cap_rtoken_per_person_per_day:100},effective:'2026-11-14T21:15:00-07:00',supersedes:{text:'10 Rcoins = 1 Rtoken'}};
var POOL='HSroUxVkVKv6kX9e7dpoJtbFqKcL76BzrkuuRfAGxs9s',RPCS=['https://solana-rpc.publicnode.com','https://api.mainnet-beta.solana.com'];
var S={pair:DEF,pool:null,price:null,src:'no pool data',val:'1000'};
function E(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function pf(n,d){if(n==null||isNaN(Number(n)))return'—';n=Number(n);if(Math.abs(n)<1e-4||Math.abs(n)>=1e9)return n.toExponential(d||4);return n.toLocaleString('en-US',{maximumFractionDigits:d||6})}
function conv(c){var R=(S.pair&&S.pair.rate)||DEF.rate,N=R.rcoins_per_rtoken||100,C=R.cap_rtoken_per_person_per_day||100,M=R.minimum_rcoins||N;c=Math.floor(Number(c)||0);
 if(c<M)return{ok:false,msg:'refused · minimum '+M+' R coins'};var r=Math.floor(c/N),k=Math.min(r,C);return{ok:true,rtoken:k,used:k*N,left:c-k*N,capped:r>C}}
function convText(v){var r=conv(v);return r.ok?(r.rtoken+' R token'+(r.capped?' (capped at daily limit)':'')+' · uses '+r.used.toLocaleString('en-US')+' R coins · '+r.left.toLocaleString('en-US')+' left'):r.msg}
function solPerR(P,price){var a=(P&&P.token_a)||{};if(price==null)price=P&&P.price_b_per_a;if(!price)return null;return a.symbol==='Я'?price:1/price}
var CSS='#rw-pair{border:1px solid #2a3a2a;border-radius:12px;padding:10px 12px;margin:10px 0;font:13px/1.45 system-ui,sans-serif;color:#e8e8e8;background:rgba(8,14,8,.85)}#rw-pair h4{margin:0 0 6px;font:700 12px Menlo,Consolas,monospace;letter-spacing:.12em;color:#7CFC9A}#rw-pair .g{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px}#rw-pair .g div{border:1px solid #1e2a1e;border-radius:8px;padding:5px 7px}#rw-pair .g span{display:block;font-size:10px;color:#8a9a8a;text-transform:uppercase}#rw-pair input{background:#0b0b0b;color:#eee;border:1px solid #334;border-radius:6px;padding:5px;width:8em}#rw-pair .d{color:#8a9a8a;font-size:11px;margin:6px 0 0}';
function el(){var n=document.getElementById('rw-pair');if(n)return n;n=document.createElement('section');n.id='rw-pair';n.setAttribute('data-preview-only','1');return n}
function paint(){var n=el(),R=(S.pair&&S.pair.rate)||DEF.rate,sp=solPerR(S.pool,S.price),inp=n.querySelector&&n.querySelector('#rw-pair-in');if(inp&&inp.value!=null)S.val=inp.value;
 n.innerHTML='<h4>◈ '+E(S.pair.label||DEF.label)+'</h4><div class="g">'+[['rate',R.text||DEF.rate.text],['daily cap',(R.cap_rtoken_per_person_per_day||100)+' R token / person'],['minimum',(R.minimum_rcoins||100)+' R coins'],['rounding','down (floor)'],['Я/SOL pool · SOL per Я',pf(sp,6)],['Я/SOL pool · Я per SOL',pf(sp?1/sp:null,2)]].map(function(s){return '<div><span>'+E(s[0])+'</span><b>'+E(s[1])+'</b></div>'}).join('')+'</div>'+
  '<p><input id="rw-pair-in" type="number" min="0" step="1" value="'+E(S.val)+'"> Rcoins → <b id="rw-pair-out">'+E(convText(S.val))+'</b></p>'+
  '<p class="d">Preview only · Rcoin = in-game currency · Rtoken = local token linked to on-chain Я · real conversions are local RGHOSTCHAIN convert blocks (rgen.py, onchain:false) · supersedes '+E((S.pair.supersedes&&S.pair.supersedes.text)||'10 Rcoins = 1 Rtoken')+' (Rizal GO 2026-11-14)</p>'+
  '<p class="d">Я/SOL is the Orca pool price for reference only ('+E(S.src)+'); there is no published Я↔SOL or Я↔USD rate · <a href="https://rizal.pw/rtrackr/#pair" target="_blank" rel="noopener">RTRACKR #pair</a></p>';
 var i=n.querySelector&&n.querySelector('#rw-pair-in'),o=n.querySelector&&n.querySelector('#rw-pair-out');if(i&&o)i.oninput=function(){S.val=i.value;o.textContent=convText(i.value)};mount(n)}
var MO=null;
function mount(n){var rw=document.getElementById(root.RWALLET_MOUNT||'rw'),host=rw||document.getElementById('ru-roster')||document.body;if(!host)return;
 if(n.parentNode!==host&&!(rw&&rw.contains(n))){if(rw)rw.appendChild(n);else if(host.id==='ru-roster')host.parentNode.insertBefore(n,host);else host.appendChild(n)}
 if(rw&&!MO&&root.MutationObserver){MO=new MutationObserver(function(){if(!rw.contains(n))rw.appendChild(n)});MO.observe(rw,{childList:true})}}
function getJ(u,n){n=n==null?3:n;return fetch(u,{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()}).catch(function(e){if(n<=0)throw e;return new Promise(function(r){setTimeout(r,400)}).then(function(){return getJ(u,n-1)})})}
function u128(u,o){var v=0,i;for(i=15;i>=0;i--)v=v*256+u[o+i];return v}
function rpc(i){if(i>=RPCS.length)return Promise.reject(new Error('rpc unavailable'));return fetch(RPCS[i],{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getAccountInfo',params:[POOL,{encoding:'base64',commitment:'confirmed'}]})}).then(function(r){return r.json()}).then(function(j){if(!j.result||!j.result.value)throw new Error('no pool');return j.result.value}).catch(function(){return rpc(i+1)})}
function live(){if(!S.pool)return Promise.resolve();var a=S.pool.token_a||{},b=S.pool.token_b||{};
 return rpc(0).then(function(v){var raw=atob(v.data[0]),u=new Uint8Array(raw.length),i;for(i=0;i<raw.length;i++)u[i]=raw.charCodeAt(i);if(u.length<261)throw new Error('not a whirlpool');
  var sq=u128(u,65);S.price=Math.pow(sq/Math.pow(2,64),2)*Math.pow(10,(a.decimals||9)-(b.decimals||9));S.src='live · public Solana RPC';paint()}).catch(function(){})}
function load(){if(!document.getElementById('rw-pair-css')){var st=document.createElement('style');st.id='rw-pair-css';st.textContent=CSS;(document.head||document.body).appendChild(st)}
 paint();
 return Promise.all([getJ(FEED+'economy-rates.json').catch(function(){return null}),getJ(FEED+'token-pool.json').catch(function(){return null})]).then(function(x){
  if(x[0]&&x[0].pair)S.pair=x[0].pair;if(S.pair&&S.pair.rate&&Number(S.pair.rate.rcoins_per_rtoken)===100)S.pair.rate.text='100 R coins = 1 R token';var p=x[1]&&(x[1].pools?x[1].pools[0]:x[1].pool||null);if(p&&p.token_a){S.pool=p;S.src='saved snapshot'+(x[1].fetched_at?' '+String(x[1].fetched_at).slice(0,16).replace('T',' ')+' MT':'')}
  paint();return live()})}
root.RWALLET_PAIR={conv:conv,convText:convText,state:S,load:load,version:'20261114pair'};
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',load):load();
})(window);

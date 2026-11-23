/* rizal.pw · TERAFORMR-GAME GhostChain on every page (add-only, 20261122, Rizal 5:14 PM MT "directly linked in all places,
 * carry the mint immediately"). ONE script for /rtrackr/ (badge strip + #game view), /rtrackr/rtor/ (Live RTOR TrackR row)
 * and /rtor/ (feed page card). Read-only: live-reads the files RMINT's rtrackr_publish.py game writes on every game block:
 *   https://rizal.pw/rtrackr/data/rgamechain.json  ·  https://rizal.pw/rtrackr/data/rgamechain-listings.json
 * no-store + cache-busting query (the JSON is served with max-age=600), polled every 10 s. No keys, no writes, textContent only. */
(function(){
'use strict';
var ORIGIN='https://rizal.pw',DATA='/rtrackr/data/',CHAIN=ORIGIN+DATA+'rgamechain.json',LIST=ORIGIN+DATA+'rgamechain-listings.json',VIEW=ORIGIN+'/rtrackr/#game',POLL=10000;
var P=location.pathname,KIND=/^\/rtrackr\/rtor\//.test(P)?'rtortrackr':/^\/rtrackr\//.test(P)?'rtrackr':/^\/rtor\//.test(P)?'rtor':'other';
var chain=null,list=null,seen=null,box=null,view=null;
function el(t,c,x,css){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=String(x);if(css)e.style.cssText=css;return e}
function link(x,href,css){var a=el('a',null,x,css);a.href=href;return a}
function short(h){h=String(h||'');return h.length>16?h.slice(0,12)+'…':h}
function mt(ts){try{return new Date(ts).toLocaleString('en-US',{timeZone:'America/Denver',dateStyle:'medium',timeStyle:'short'})+' MT'}catch(e){return String(ts||'')}}
function get(n){return fetch(DATA+n+'?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).catch(function(){return null})}
function tip(){var b=chain&&chain.blocks&&chain.blocks[chain.blocks.length-1];return b||null}
function txLine(b){if(!b)return '';var t=(b.payload||{}).tx||{},it=t.item||{};if(b.type==='genesis')return 'genesis';
  return String(t.action||b.type||'').toUpperCase()+' '+(t.qty||1)+'× '+(it.name||it.id||'?')+(t.price_rtoken!=null?' for '+t.price_rtoken+' RToken':'')+(t.player?' · '+t.player:'')}
function openN(){return list&&list.open?list.open.length:0}
function links(host,css){host.appendChild(link('game view',VIEW,css));host.appendChild(document.createTextNode(' · '));
  host.appendChild(link('rgamechain.json',CHAIN,css));host.appendChild(document.createTextNode(' · '));host.appendChild(link('rgamechain-listings.json',LIST,css))}
function summary(){var b=tip();return 'height '+chain.height+' · tip '+short(chain.tip)+(b?' · latest #'+b.index+' '+txLine(b)+' · '+mt(b.ts):'')+' · '+openN()+' open BOTLATCH listings'}
function anchorAfter(ref,node){if(ref&&ref.parentNode)ref.parentNode.insertBefore(node,ref.nextSibling);else document.body.insertBefore(node,document.body.firstChild)}
/* /rtrackr/ : strip under the badge + full #game view in its own container (the page's own renderer keeps #app) */
function drawRtrackr(){var badge=document.getElementById('badge'),app=document.getElementById('app');
  if(!box){box=el('div','badge');box.id='rt-game-strip';anchorAfter(badge,box)}
  box.textContent='';box.appendChild(el('b',null,'TERAFORMR-GAME GhostChain · '));box.appendChild(document.createTextNode(summary()+' · '));links(box);
  if(!view){view=el('main');view.id='rt-game-view';anchorAfter(box,view)}
  var on=location.hash.slice(1)==='game';view.style.display=on?'':'none';if(app)app.style.display=on?'none':'';if(!on)return;
  view.textContent='';var s=el('section');view.appendChild(s);s.appendChild(el('h2','h','TERAFORMR-GAME GhostChain'));
  var v=chain.verify||{};s.appendChild(el('p','dim',(chain.chain_id||'')+' · linked to '+(chain.linked_main||'RGHOSTCHAIN')+' (main height '+(v.main_height!=null?v.main_height:'?')+') · verify '+(v.ok?'OK':'NOT OK')+' · published '+mt(chain.generated)));
  (chain.blocks||[]).slice().reverse().forEach(function(b){var c=el('div','stats');c.appendChild(el('div','st','#'+b.index+' · '+txLine(b)));
    c.appendChild(el('div','dim',mt(b.ts)+' · hash '+b.hash));var a=(b.payload||{}).auth;c.appendChild(el('div','dim','prev '+short(b.prev_hash)+(a?' · '+(a.kind||'')+' '+(a.handle||''):'')));s.appendChild(c)});
  s.appendChild(el('h2','h','BOTLATCH listings (game)'));var L=(list&&list.open)||[];if(!L.length)s.appendChild(el('p','dim','no open listings'));
  L.slice().reverse().forEach(function(l){var it=l.item||{},c=el('div','stats');c.appendChild(el('div','st',(it.name||it.id||'?')+' · '+(l.qty||1)+'× · '+l.price_rtoken+' '+(l.currency||'RToken')+' · '+(l.status||'open')));
    c.appendChild(el('div','dim','seller '+(l.seller||'?')+' · game block #'+l.game_block+' · '+mt(l.ts)+' · '+short(l.listing_id)));s.appendChild(c)});
  var f=el('p','dim');links(f);s.appendChild(f)}
/* /rtrackr/rtor/ : a TERAFORMR GAME CHAIN row above the live RTOR table (outside #app, which rtor-live.js re-renders) */
function drawRtorTrackr(){var badge=document.getElementById('badge');if(!box){box=el('div','badge');box.id='rt-game-row';anchorAfter(badge,box)}
  box.textContent='';box.appendChild(el('b',null,'TERAFORMR GAME CHAIN · '));box.appendChild(document.createTextNode(summary()+' · '));links(box)}
/* /rtor/ : a game chain card in the page's own .float card style, before the feed card */
function drawRtor(){if(!box){box=el('div','float');box.id='teraformr-game';var feed=document.getElementById('feed'),m=document.querySelector('main');
    if(feed&&feed.parentNode)feed.parentNode.insertBefore(box,feed);else if(m)m.appendChild(box);else document.body.appendChild(box)}
  box.textContent='';box.appendChild(el('h2',null,'TERAFORMR GAME CHAIN'));box.appendChild(el('p',null,(chain.chain_id||'')+' · '+summary()));
  var p=el('p');links(p);box.appendChild(p);box.appendChild(el('p',null,'Read-only. Written by RMINT on Neo on every game mint; RTOR seeds the same snapshot.','opacity:.7'))}
function draw(){if(!chain)return;if(KIND==='rtrackr')drawRtrackr();else if(KIND==='rtortrackr')drawRtorTrackr();else if(KIND==='rtor')drawRtor()}
function load(){Promise.all([get('rgamechain.json'),get('rgamechain-listings.json')]).then(function(r){if(r[0])chain=r[0];if(r[1])list=r[1];
  var t=chain&&chain.tip;if(t!==seen){seen=t;draw()}else if(box)draw()})}
window.addEventListener('hashchange',function(){setTimeout(draw,0)});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
setInterval(function(){if(!document.hidden)load()},POLL);
})();

/* ЯWALLET · ThundR Design Standard 1.0.0 chrome · 20261111 t32u (additive, look only).
   Adds: twilight starfield, hamburger menu holding every seat link already on this page,
   GHOSTMACHINE tab, and the composer (+ · R:\> Message your bot · purple Send) with RBOARD on focus.
   The composer is a local field only: Send routes to a seat on this page or shows a local note.
   It never signs, never mints, never posts, and never calls wallet, RMAIL, or seal code.
   The t31u seal rule stays as written in the banner and data/rmail-handoff.json. */
(function(w,d){
'use strict';
function $(s,r){return (r||d).querySelector(s)}
function $$(s,r){return Array.prototype.slice.call((r||d).querySelectorAll(s))}
function el(t,c,h){var e=d.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e}
function go(){
  var b=d.body;if(!b||b.classList.contains('thundr-std'))return;
  b.classList.add('thundr-std');
  /* twilight */
  var sky=el('div','r-twilight');b.insertBefore(sky,b.firstChild);
  if(w.Twilight)w.Twilight.mount(sky);
  /* header */
  var lead=$('.ru-lead');
  if(!lead){ /* pages without the wallet header (web receiver): add a header, keep the page's own links */
    var host=$('.ru-page')||b;lead=el('header','ru-lead ts-made','<b>ЯWALLET</b>');
    host.insertBefore(lead,host.firstChild);
  }
  var menu=el('nav','ts-menu');menu.id='ts-menu';menu.hidden=true;menu.setAttribute('aria-label','Seats');
  var mb=el('button','rd-menu','<span></span><span></span><span></span>');mb.type='button';mb.id='ts-menu-btn';
  mb.setAttribute('aria-label','Menu · every seat');mb.setAttribute('aria-expanded','false');
  var SEATS=[['ЯWALLET','#rw'],['ROSTER','#ru-roster'],['RMAIL','#ru-rmail'],['POOLS','#ru-pools'],['ЯCASKET','#ru-casket'],['>ThundR','#ru-thundr']];
  var h='<h4>THIS SEAT</h4>';
  SEATS.forEach(function(s){if($(s[1]))h+='<button type="button" data-ts-go="'+s[1]+'">'+s[0]+'</button>'});
  menu.innerHTML=h+'<h4>LINKED SEATS</h4>';
  if(lead){
    lead.insertBefore(mb,lead.firstChild);
    $$('a',lead).concat($$('[data-ts-seats] a')).forEach(function(a){var c=a.cloneNode(true);c.className='';menu.appendChild(c)}); /* originals stay in the DOM */
    var ver=el('span','ts-ver','<span class="lab">ЯWALLET</span><span class="v"></span>');lead.appendChild(ver);
    try{fetch('RWALLET.version',{cache:'no-store'}).then(function(r){return r.ok?r.text():''}).then(function(t){
      t=String(t||'').trim();if(/^[0-9][0-9A-Za-z.\-]{0,20}$/.test(t))$('.v',ver).textContent=t;}).catch(function(){})}catch(e){}
  }
  b.appendChild(menu);
  function open(f){var o=f==null?menu.hidden:!!f;menu.hidden=!o;mb.setAttribute('aria-expanded',o?'true':'false')}
  mb.addEventListener('click',function(e){e.stopPropagation();open()});
  d.addEventListener('click',function(e){if(!menu.hidden&&!e.target.closest('#ts-menu,#ts-menu-btn,.ts-gm,.rd-plus'))open(false)},true);
  d.addEventListener('keydown',function(e){if(e.key==='Escape')open(false)});
  menu.addEventListener('click',function(e){var g=e.target.closest('[data-ts-go]');if(!g)return;
    var t=$(g.getAttribute('data-ts-go'));if(t)t.scrollIntoView({behavior:'smooth',block:'start'});open(false)});
  /* GHOSTMACHINE tab */
  var gm=el('button','rd-gm ts-gm','GHOSTMACHINE');gm.type='button';gm.title='GHOSTMACHINE · every seat';
  gm.addEventListener('click',function(e){e.stopPropagation();open(true)});b.appendChild(gm);
  /* composer */
  var bot=el('div','ts-bottom');
  bot.innerHTML='<div id="ts-rb" hidden></div><form class="rd-composer" id="ts-composer" autocomplete="off">'+
    '<button type="button" class="rd-plus" aria-label="seats">+</button>'+
    '<label class="rd-field"><span class="pfx">R:\\&gt;</span><input id="ts-cmd" type="text" placeholder="Message your bot" aria-label="Message your bot" autocomplete="off" spellcheck="false"></label>'+
    '<button type="submit" class="rd-send">Send</button></form>';
  b.appendChild(bot);
  var toast=el('div','ts-toast');toast.hidden=true;b.appendChild(toast);var tt;
  function say(m){toast.textContent=m;toast.hidden=false;clearTimeout(tt);tt=setTimeout(function(){toast.hidden=true},3200)}
  var inp=$('#ts-cmd'),dock=$('#ts-rb'),rb=null;
  function kb(on){dock.hidden=!on;b.classList.toggle('rb-open',!!on);
    if(on&&!rb&&w.RBoard)rb=w.RBoard.mount(dock,{input:inp,onReturn:function(){route(inp.value)}});}
  inp.addEventListener('focus',function(){kb(true)});
  d.addEventListener('click',function(e){if(!e.target.closest('.ts-bottom'))kb(false)},true);
  $('.rd-plus',bot).addEventListener('click',function(e){e.stopPropagation();open()});
  function route(v){
    v=String(v||'').trim();var lo=v.toLowerCase().replace(/^r:\\>\s*/,'');inp.value='';if(rb)rb.render();
    if(!lo)return;
    var map={wallet:'#rw',rwallet:'#rw','яwallet':'#rw',roster:'#ru-roster',rmail:'#ru-rmail',mail:'#ru-rmail',pools:'#ru-pools',casket:'#ru-casket',thundr:'#ru-thundr','>thundr':'#ru-thundr'};
    if(lo==='menu'||lo==='seats'||lo==='ghost'||lo==='ghostmachine'){open(true);return}
    if(lo==='help'){say('seats: wallet · roster · rmail · pools · casket · thundr · menu — local only. A seal completes only on Face ID on the 17e.');return}
    var t=map[lo]&&$(map[lo]);
    if(t){t.scrollIntoView({behavior:'smooth',block:'start'});say(lo+' · opened here · local only');return}
    say('local field · nothing sent · nothing signed. Seals complete only on Face ID / RGHOSTKEY on the 17e.');
  }
  $('#ts-composer').addEventListener('submit',function(e){e.preventDefault();route(inp.value)});
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',go);else go();
})(window,document);

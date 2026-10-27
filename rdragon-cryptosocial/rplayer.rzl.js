/* rplayer.rzl.js — RZL shared video player (rizal.pw master copy; RDRAGON panel + iPhone app load THIS file from rizal.pw).
   Upgrades every <video class="csp-player"> (or <video data-rplayer>) in place: the markup keeps native `controls` so it still
   works if this file fails to load. Plays hosted mp4 (GitHub Release media), mp4/webm links, blob: fallback copies.
   YouTube links stay in their iframe embed (never touched). Keys (when focused): space/k play·pause, ←/→ 5s, ↑/↓ volume, m mute, f fullscreen. */
(function(){'use strict';if(window.RPlayer)return;
var SEL='video.csp-player:not([data-rp]),video[data-rplayer]:not([data-rp])';
function fmt(t){if(!isFinite(t)||t<0)t=0;t=Math.floor(t);var h=Math.floor(t/3600),m=Math.floor(t/60)%60,s=t%60;return (h?h+':'+(m<10?'0':''):'')+m+':'+(s<10?'0':'')+s}
function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
function btn(cls,txt,label){var b=el('button','rp-b '+cls,txt);b.type='button';b.setAttribute('aria-label',label);b.title=label;return b}
function upgrade(v){if(v.getAttribute('data-rp'))return;v.setAttribute('data-rp','1');
 var w=el('div','rp');w.tabIndex=0;w.setAttribute('role','region');w.setAttribute('aria-label','video player');
 v.parentNode.insertBefore(w,v);w.appendChild(v);v.controls=false;v.removeAttribute('controls');v.playsInline=true;v.setAttribute('playsinline','');v.setAttribute('webkit-playsinline','');v.classList.add('rp-v');
 var big=btn('rp-big','▶','play'),load=el('div','rp-load','loading…'),err=el('div','rp-err'),bar=el('div','rp-bar'),
  pp=btn('rp-pp','▶','play'),tm=el('span','rp-tm','0:00 / 0:00'),sc=el('div','rp-sc'),buf=el('div','rp-buf'),fill=el('div','rp-fill'),knob=el('div','rp-knob'),
  mu=btn('rp-mu','♪','mute'),vol=el('input','rp-vol'),fs=btn('rp-fs','⛶','fullscreen');
 sc.setAttribute('role','slider');sc.setAttribute('aria-label','seek');sc.tabIndex=-1;sc.appendChild(buf);sc.appendChild(fill);sc.appendChild(knob);
 vol.type='range';vol.min=0;vol.max=1;vol.step=0.05;vol.value=v.muted?0:v.volume;vol.setAttribute('aria-label','volume');
 bar.appendChild(pp);bar.appendChild(sc);bar.appendChild(tm);bar.appendChild(mu);bar.appendChild(vol);bar.appendChild(fs);
 [big,load,err,bar].forEach(function(x){w.appendChild(x)});
 var dragging=false,hideT=0,lastErrSrc='';
 function st(k,on){w.classList.toggle(k,!!on)}
 function sync(){var d=v.duration,c=v.currentTime;tm.textContent=fmt(c)+' / '+fmt(d);var pc=isFinite(d)&&d>0?c/d*100:0;fill.style.width=pc+'%';knob.style.left=pc+'%';sc.setAttribute('aria-valuenow',Math.round(pc));
  var b=0;try{for(var i=0;i<v.buffered.length;i++){if(v.buffered.start(i)<=c+0.5)b=Math.max(b,v.buffered.end(i))}}catch(e){}buf.style.width=(isFinite(d)&&d>0?Math.min(100,b/d*100):0)+'%'}
 function playing(){var on=!v.paused&&!v.ended;pp.textContent=on?'❚❚':'▶';pp.setAttribute('aria-label',on?'pause':'play');pp.title=on?'pause':'play';st('rp-playing',on);st('rp-started',on||v.currentTime>0)}
 function toggle(){if(w.classList.contains('rp-error'))return retry();if(v.paused||v.ended){var p=v.play();if(p&&p.catch)p.catch(function(){})}else v.pause()}
 function muted(){mu.textContent=v.muted||v.volume===0?'×':'♪';mu.setAttribute('aria-label',v.muted?'unmute':'mute');vol.value=v.muted?0:v.volume}
 function showErr(){var src=v.currentSrc||v.src||'',code=v.error&&v.error.code;var mov=/\.mov(\?|$)/i.test(src);
  err.innerHTML='';err.appendChild(el('div','rp-err-t','⚠ video can’t play'));err.appendChild(el('div','rp-err-d',code===4&&mov?'this browser can’t play .mov — ask the poster for an mp4':code===2?'network error — the video host is unreachable':code===4?'this format or link isn’t playable here':!src?'no video file on this device':'the video failed to load'));
  var r=btn('rp-retry','↻ retry','retry');r.onclick=function(e){e.stopPropagation();retry()};err.appendChild(r);
  if(/^https?:/.test(src)){var a=el('a','rp-open','open link ↗');a.href=src;a.target='_blank';a.rel='noopener';a.onclick=function(e){e.stopPropagation()};err.appendChild(a)}
  st('rp-error',1);st('rp-loading',0);lastErrSrc=src}
 function retry(){st('rp-error',0);st('rp-loading',1);var s=v.getAttribute('src');if(s){v.removeAttribute('src');v.load();v.setAttribute('src',s)}v.load()}
 /* error: give the page's IndexedDB fallback (rdragon-cryptosocial vhyd) a moment to swap in the local copy before showing the error */
 v.addEventListener('error',function(){var at=v.getAttribute('src'),vk=v.getAttribute('data-vkey'),L=window.RPLAYER_LOCAL;
  if(vk&&typeof L==='function'&&!v.__rpLocal){v.__rpLocal=1;Promise.resolve(L(vk)).then(function(u){if(u){st('rp-error',0);v.setAttribute('src',u);v.load();w.classList.add('rp-localcopy')}else showErr()},showErr);return}
  setTimeout(function(){if(v.getAttribute('src')!==at)return;showErr()},vk?900:0)});
 var srcObs=new MutationObserver(function(){st('rp-error',0)});srcObs.observe(v,{attributes:true,attributeFilter:['src']});
 ['waiting','loadstart','seeking'].forEach(function(e){v.addEventListener(e,function(){if(!w.classList.contains('rp-error')&&(e!=='loadstart'||v.getAttribute('src')))st('rp-loading',1)})});
 ['canplay','playing','seeked','loadeddata','pause'].forEach(function(e){v.addEventListener(e,function(){st('rp-loading',0)})});
 v.addEventListener('loadedmetadata',function(){st('rp-error',0);sync()});
 ['timeupdate','progress','durationchange'].forEach(function(e){v.addEventListener(e,sync)});
 ['play','pause','ended','playing'].forEach(function(e){v.addEventListener(e,playing)});
 v.addEventListener('volumechange',muted);
 function seekAt(x){var r=sc.getBoundingClientRect(),d=v.duration;if(!isFinite(d)||d<=0||r.width<=0)return;var k=Math.max(0,Math.min(1,(x-r.left)/r.width));v.currentTime=k*d;sync()}
 sc.addEventListener('pointerdown',function(e){e.stopPropagation();dragging=true;try{sc.setPointerCapture(e.pointerId)}catch(x){}seekAt(e.clientX)});
 sc.addEventListener('pointermove',function(e){if(dragging)seekAt(e.clientX)});
 sc.addEventListener('pointerup',function(e){dragging=false;try{sc.releasePointerCapture(e.pointerId)}catch(x){}});
 sc.addEventListener('click',function(e){e.stopPropagation()});
 pp.onclick=function(e){e.stopPropagation();toggle()};big.onclick=function(e){e.stopPropagation();toggle()};
 mu.onclick=function(e){e.stopPropagation();v.muted=!v.muted;if(!v.muted&&v.volume===0)v.volume=.5};
 vol.addEventListener('input',function(e){e.stopPropagation();v.volume=+vol.value;v.muted=+vol.value===0});vol.addEventListener('click',function(e){e.stopPropagation()});
 function isFs(){return (document.fullscreenElement||document.webkitFullscreenElement)===w}
 fs.onclick=function(e){e.stopPropagation();if(isFs()){(document.exitFullscreen||document.webkitExitFullscreen).call(document);return}
  if(w.requestFullscreen)w.requestFullscreen().catch(function(){});else if(w.webkitRequestFullscreen)w.webkitRequestFullscreen();else if(v.webkitEnterFullscreen)v.webkitEnterFullscreen() /* iPhone: native fullscreen */};
 ['fullscreenchange','webkitfullscreenchange'].forEach(function(e){document.addEventListener(e,function(){st('rp-full',isFs())})});
 /* tap: on touch, first tap shows controls, tap on video toggles play */
 v.addEventListener('click',function(e){e.stopPropagation();toggle();wake()});
 w.addEventListener('click',function(e){e.stopPropagation()});
 ['pointerdown','pointerup','mousedown','mouseup','touchstart','touchend','keyup'].forEach(function(t){w.addEventListener(t,function(e){e.stopPropagation()},{passive:true})});
 function wake(){st('rp-idle',0);clearTimeout(hideT);hideT=setTimeout(function(){if(!v.paused&&!dragging)st('rp-idle',1)},2500)}
 w.addEventListener('pointermove',wake);w.addEventListener('touchstart',wake,{passive:true});
 w.addEventListener('keydown',function(e){if(e.target===vol&&/Arrow/.test(e.key))return;var k=e.key,h=true;
  if(k===' '||k==='k'||k==='Enter'&&e.target===w)toggle();else if(k==='ArrowRight')v.currentTime=Math.min(v.duration||0,v.currentTime+5);else if(k==='ArrowLeft')v.currentTime=Math.max(0,v.currentTime-5);
  else if(k==='ArrowUp'){v.muted=false;v.volume=Math.min(1,v.volume+.1)}else if(k==='ArrowDown')v.volume=Math.max(0,v.volume-.1);else if(k==='m')v.muted=!v.muted;else if(k==='f')fs.onclick(e);else h=false;
  if(h){e.preventDefault();e.stopPropagation();wake()}});
 var sid=v.getAttribute('data-stat-id');if(sid&&STATS()){var tk=el('div','rp-tick');tk.setAttribute('aria-live','polite');w.parentNode.insertBefore(tk,w.nextSibling);TICK[sid]=(TICK[sid]||[]).concat([tk]);paint(sid);
  if(window.IntersectionObserver){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting&&e.intersectionRatio>=0.5){io.disconnect();if(!SEEN[sid]){SEEN[sid]=1;hit(sid,'impression')}}})},{threshold:[0.5]});io.observe(w)}
  v.addEventListener('play',function(){if(v.__rpResume){v.__rpResume=0;return}hit(sid,'view')});want(sid)}
 /* the feed re-renders its cards (innerHTML); carry position + playing state over to the new element so playback isn't cut off */
 var key=v.getAttribute('data-stat-id')||v.getAttribute('src')||'',R=key&&KEEP[key];
 if(R&&Date.now()-R.at<4000&&!(R.el&&R.el.isConnected)){var go=function(){try{v.currentTime=R.t}catch(e){}if(R.playing){v.__rpResume=1;var pr=v.play();if(pr&&pr.catch)pr.catch(function(){})}};if(v.readyState>=1)go();else v.addEventListener('loadedmetadata',go,{once:true})}
 if(key)['timeupdate','play','pause','seeked'].forEach(function(e){v.addEventListener(e,function(){KEEP[key]={t:v.currentTime,playing:!v.paused&&!v.ended,at:Date.now(),el:v}})});
 if(key){var iv=setInterval(function(){if(!v.isConnected)return clearInterval(iv);if(KEEP[key]&&KEEP[key].el===v)KEEP[key].at=Date.now()},1000)}
 muted();playing();sync();if(v.error)showErr();else if(v.readyState<1&&v.getAttribute('src'))st('rp-loading',1)}
/* public counts (RDRAGON_CONFIG.statsEndpoint; blank = off, nothing is sent). impressions: card ≥50% on screen, once per page view; views: every play press. */
var KEEP={},TICK={},SEEN={},CNT={},WANT={},wt=0;
function STATS(){var c=window.RDRAGON_CONFIG||{},e=c.statsEndpoint||'';if(!e){try{e=localStorage.getItem('rdragon.csp.statsEndpoint')||''}catch(x){}}return e.replace(/\/+$/,'')}
function n(x){x=+x||0;return x>=1e6?(x/1e6).toFixed(1)+'M':x>=1e4?Math.round(x/1e3)+'k':String(x)}
function paint(id){var c=CNT[id];(TICK[id]||[]).forEach(function(t){if(!t.isConnected)return;t.textContent=c?'◉ '+n(c.impressions)+' impressions · ▶ '+n(c.views)+' views':'◉ … impressions · ▶ … views'})}
function want(id){WANT[id]=1;clearTimeout(wt);wt=setTimeout(function(){var ids=Object.keys(WANT);WANT={};if(!ids.length)return;fetch(STATS()+'/counts?ids='+ids.map(encodeURIComponent).join(',')).then(function(r){return r.json()}).then(function(j){Object.keys(j.counts||{}).forEach(function(i){CNT[i]=j.counts[i];paint(i)})}).catch(function(){})},150)}
function hit(id,kind){var e=STATS();if(!e)return;fetch(e+'/hit',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:id,kind:kind}),keepalive:true}).then(function(r){return r.json()}).then(function(j){if(j.counts){CNT[id]=j.counts;paint(id)}}).catch(function(){})}
function scan(root){[].forEach.call((root||document).querySelectorAll(SEL),upgrade)}
var mo=new MutationObserver(function(ms){for(var i=0;i<ms.length;i++)if(ms[i].addedNodes.length){scan();return}});
function start(){scan();mo.observe(document.documentElement,{childList:true,subtree:true})}
window.RPlayer={upgrade:upgrade,scan:scan,version:'1'};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start()})();

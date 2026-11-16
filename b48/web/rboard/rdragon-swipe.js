/* rdragon-swipe.js · RBOARD swipe (glide) typing for the in-app RDRAGON keyboard · add-only 20261115
   Base: live RDRGN 1.0.6.0 (build 47) built-in web, rboard/rdragon-kbd.js 1.0.4.37 (unchanged).
   - Behaviour only. Adds NO elements, NO styles, NO trail, NO candidate bar; never touches classes or layout.
   - EN layer only (Baybayin / Mayan / #+ are ignored). Starts only on a letter key and only once the finger has moved
     past a threshold onto another letter key, so taps, hold-for-accents (hold.js), shift, NG, ⌫, globe, return are untouched.
   - On release: decodes the path offline (first/last-key anchors + ordered key proximity + path-shape distance,
     word-frequency tiebreak) and inserts "word " into the bound chat field (same insert as a key tap + input event).
   - Lexicon: rboard/words.js (SWIPE_LEXICON, bundled) + rboard/rdragon-swipe-words.js (frequency prior). No network.
   - Never submits, never stores typed text. */
(function(root){"use strict";
 var N=32;
 function clean(w){w=String(w||"").toLowerCase().replace(/['’]/g,"");return /^[a-z]+$/.test(w)?w:"";}
 function keySeq(w){var o=[];for(var i=0;i<w.length;i++){if(!o.length||o[o.length-1]!==w[i])o.push(w[i]);}return o;}
 // entries: [{w,rank}] ; lower rank = more common
 function buildLexicon(freqList,lex){var seen={},out=[];
  function add(w,rank){w=clean(w);if(!w||seen[w])return;var ks=keySeq(w);if(ks.length<2)return;seen[w]=1;out.push({w:w,ks:ks,rank:rank});}
  (freqList||[]).forEach(function(w,i){add(w,i);});
  var base=(freqList||[]).length;
  if(lex){(lex.english||[]).forEach(function(w){add(w,base+1500);});(lex.tagalog||[]).forEach(function(w){add(w,base+3000);});}
  var idx={};out.forEach(function(e){var k=e.ks[0]+e.ks[e.ks.length-1];(idx[k]=idx[k]||[]).push(e);});
  return {entries:out,idx:idx,size:out.length};}
 function plen(p){var L=0;for(var i=1;i<p.length;i++)L+=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]);return L;}
 function resample(p,n){if(!p.length)return[];if(p.length===1){var r=[];for(var k=0;k<n;k++)r.push(p[0]);return r;}
  var L=plen(p);if(L===0){var r0=[];for(var k0=0;k0<n;k0++)r0.push(p[0]);return r0;}
  var step=L/(n-1),out=[p[0]],acc=0,prev=p[0],i=1;
  while(i<p.length&&out.length<n){var cur=p[i],d=Math.hypot(cur[0]-prev[0],cur[1]-prev[1]);
   if(d>0&&acc+d>=step){var t=(step-acc)/d,q=[prev[0]+t*(cur[0]-prev[0]),prev[1]+t*(cur[1]-prev[1])];out.push(q);prev=q;acc=0;}
   else{acc+=d;prev=cur;i++;}}
  while(out.length<n)out.push(p[p.length-1]);return out;}
 // keys: {a:{x,y,w,h}, ...} centers + size
 function decode(points,keys,lexicon,opts){opts=opts||{};
  if(!points||points.length<2||!lexicon)return[];
  var kw=0,kh=0,c=0;for(var k in keys){kw+=keys[k].w;kh+=keys[k].h;c++;}if(!c)return[];kw/=c;kh/=c;
  var R=Math.max(kw,kh)*0.95,start=points[0],end=points[points.length-1];
  function near(pt){var o=[];for(var k in keys){if(Math.hypot(pt[0]-keys[k].x,pt[1]-keys[k].y)<=R)o.push(k);}return o;}
  var S=near(start),E=near(end);if(!S.length||!E.length)return[];
  var user=resample(points,N),dense=resample(points,64),uL=plen(points),res=[];
  for(var a=0;a<S.length;a++)for(var b=0;b<E.length;b++){var list=lexicon.idx[S[a]+E[b]];if(!list)continue;
   for(var j=0;j<list.length;j++){var e=list[j],ks=e.ks,ok=true,pi=0;
    // ordered proximity: every key of the word must be passed near, in order
    for(var m=0;m<ks.length&&ok;m++){var K=keys[ks[m]];if(!K){ok=false;break;}var hit=false;
     for(;pi<dense.length;pi++){if(Math.hypot(dense[pi][0]-K.x,dense[pi][1]-K.y)<=R*1.05){hit=true;break;}}if(!hit)ok=false;}
    if(!ok)continue;
    var ideal=resample(ks.map(function(ch){return[keys[ch].x,keys[ch].y];}),N),sh=0;
    for(var q=0;q<N;q++)sh+=Math.hypot(user[q][0]-ideal[q][0],user[q][1]-ideal[q][1]);sh/=N*kw;
    var anc=(Math.hypot(start[0]-keys[ks[0]].x,start[1]-keys[ks[0]].y)+Math.hypot(end[0]-keys[ks[ks.length-1]].x,end[1]-keys[ks[ks.length-1]].y))/kw;
    var wL=plen(ks.map(function(ch){return[keys[ch].x,keys[ch].y];})),lenPen=Math.abs(uL-wL)/Math.max(wL,kw);
    var cost=sh+0.5*anc+0.35*lenPen+0.12*Math.log(e.rank+2);
    res.push({word:e.w,cost:cost});}}
  res.sort(function(x,y){return x.cost-y.cost||(x.word<y.word?-1:1);});
  return res.slice(0,opts.limit||3);}
 var core={buildLexicon:buildLexicon,decode:decode,resample:resample,keySeq:keySeq,version:"20261115"};
 if(typeof module!=="undefined"&&module.exports)module.exports=core;
 if(typeof document==="undefined"||!root||root.RDRAGON_SWIPE)return;

 // ---------- browser controller (behaviour only; no DOM is created, nothing is styled) ----------
 var LEX=null;
 function lexicon(){if(LEX)return LEX;
  var f=(typeof RDRAGON_SWIPE_WORDS!=="undefined")?RDRAGON_SWIPE_WORDS:null,l=(typeof SWIPE_LEXICON!=="undefined")?SWIPE_LEXICON:null;
  LEX=buildLexicon(f,l);return LEX;}
 function board(){var b=document.getElementById("rbk");return(b&&!b.hidden)?b:null;}
 function layerEN(b){var on=b.querySelector(".rbk-layer.on");return !!on&&on.dataset.layer==="EN";}
 function altsOpen(b){var a=b.querySelector(".rbk-alts");return !!a&&!a.hidden;}
 function letterOf(btn){if(!btn||!btn.classList||!btn.classList.contains("rbk-k"))return"";
  if(btn.classList.contains("rbk-fn")||btn.classList.contains("rbk-d")||btn.classList.contains("rbk-g"))return"";
  var l=btn.querySelector(".rbk-l");var t=l?String(l.textContent||"").toLowerCase():"";return /^[a-z]$/.test(t)?t:"";}
 function keyMap(b){var m={};b.querySelectorAll(".rbk-keys .rbk-k").forEach(function(btn){var ch=letterOf(btn);if(!ch)return;var r=btn.getBoundingClientRect();
  m[ch]={x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height,l:r.left,t:r.top,r:r.right,b:r.bottom};});return m;}
 function keyAt(m,x,y){for(var k in m){var K=m[k];if(x>=K.l&&x<=K.r&&y>=K.t&&y<=K.b)return k;}return"";}
 function field(){return document.querySelector('[data-rdragon-kbd="1"]')||document.getElementById("message");}
 var lastShiftTap=0,swallowUntil=0;
 document.addEventListener("click",function(e){var t=e.target&&e.target.closest?e.target.closest(".rbk-shift"):null;if(t)lastShiftTap=Date.now();
  // safety: a click the finished swipe itself leaves behind (no new touch since) never types a stray letter
  if(Date.now()<swallowUntil){var k=e.target&&e.target.closest?e.target.closest("#rbk .rbk-k"):null;if(k&&letterOf(k)){swallowUntil=0;e.preventDefault();e.stopImmediatePropagation();}}},true);
 function commit(word,b){var input=field();if(!input)return false;
  var sh=b.querySelector(".rbk-shift"),shiftOn=!!(sh&&sh.classList.contains("on")),caps=!!(sh&&/⇪/.test(sh.textContent||""));
  var w=caps?word.toUpperCase():shiftOn?word.charAt(0).toUpperCase()+word.slice(1):word;
  var s=input.selectionStart!=null?input.selectionStart:input.value.length,en=input.selectionEnd!=null?input.selectionEnd:s,v=input.value;
  var lead=(s>0&&/[A-Za-z0-9\u00C0-\u024F]/.test(v.charAt(s-1)))?" ":"",text=lead+w+" ";
  input.value=v.slice(0,s)+text+v.slice(en);var cpos=s+text.length;try{input.setSelectionRange(cpos,cpos);}catch(_){}
  input.dispatchEvent(new Event("input",{bubbles:true}));
  // one-shot shift ends after a word, like a tapped letter; waits out the 320 ms double-tap (caps) window
  if(shiftOn&&!caps){var wait=Math.max(0,360-(Date.now()-lastShiftTap));setTimeout(function(){var s2=board()&&board().querySelector(".rbk-shift");if(s2&&s2.classList.contains("on")&&!/⇪/.test(s2.textContent||""))s2.click();},wait);}
  return true;}
 var st=null,HOLD_MS=480,MOVE_PX=12;
 function begin(x,y,target,id){st=null;var b=board();if(!b||!layerEN(b)||altsOpen(b))return;
  var btn=target&&target.closest?target.closest(".rbk-k"):null;if(!btn||!b.contains(btn))return;var ch=letterOf(btn);if(!ch)return;
  var m=keyMap(b),K=m[ch];if(!K)return;
  st={id:id,b:b,m:m,start:ch,pts:[[x,y]],t0:Date.now(),moved:false,armed:false,dead:false,thr:Math.max(18,K.w*0.6)};}
 function track(x,y,id){if(!st||st.dead||id!==st.id)return false;var p0=st.pts[0],d=Math.hypot(x-p0[0],y-p0[1]);
  if(!st.moved&&d>MOVE_PX){st.moved=true;if(Date.now()-st.t0>=HOLD_MS)st.dead=true;} // a hold that drifts stays a hold
  if(st.dead||altsOpen(st.b)){st.dead=true;return false;}
  var last=st.pts[st.pts.length-1];if(Math.hypot(x-last[0],y-last[1])>=3){st.pts.push([x,y]);if(st.pts.length>400)st.pts.splice(1,1);}
  if(!st.armed&&d>=st.thr){var k=keyAt(st.m,x,y);if(k&&k!==st.start)st.armed=true;}
  return st.moved;}
 function finish(x,y,id){if(!st||id!==st.id)return;var s=st;st=null;if(s.dead||!s.armed||altsOpen(s.b))return;
  s.pts.push([x,y]);var out=decode(s.pts,s.m,lexicon(),{limit:3});if(!out.length)return;
  swallowUntil=Date.now()+350;commit(out[0].word,s.b);api.last=out;}
 var touch=("ontouchstart" in window);
 if(touch){
  document.addEventListener("touchstart",function(e){swallowUntil=0; /* a new touch is never a leftover click */if(e.touches.length!==1){st=null;return;}var t=e.changedTouches[0];begin(t.clientX,t.clientY,e.target,"t"+t.identifier);},{capture:true,passive:true});
  document.addEventListener("touchmove",function(e){if(!st)return;for(var i=0;i<e.changedTouches.length;i++){var t=e.changedTouches[i];
   if(track(t.clientX,t.clientY,"t"+t.identifier)&&e.cancelable)e.preventDefault();}},{capture:true,passive:false}); // only past 12 px, when a tap is already void
  document.addEventListener("touchend",function(e){var t=e.changedTouches[0];if(t)finish(t.clientX,t.clientY,"t"+t.identifier);},{capture:true,passive:true});
  document.addEventListener("touchcancel",function(){st=null;},{capture:true,passive:true});}
 document.addEventListener("pointerdown",function(e){swallowUntil=0;if(e.pointerType==="touch"&&touch)return;if(e.button!==0)return;begin(e.clientX,e.clientY,e.target,"p"+e.pointerId);},true);
 document.addEventListener("pointermove",function(e){if(e.pointerType==="touch"&&touch)return;track(e.clientX,e.clientY,"p"+e.pointerId);},true);
 document.addEventListener("pointerup",function(e){if(e.pointerType==="touch"&&touch)return;finish(e.clientX,e.clientY,"p"+e.pointerId);},true);
 document.addEventListener("pointercancel",function(e){if(e.pointerType==="touch"&&touch)return;st=null;},true);
 var api={core:core,last:null,version:"20261115",lexiconSize:function(){return lexicon().size;}};
 root.RDRAGON_SWIPE=api;
})(typeof window!=="undefined"?window:null);

"use strict";
/* Offline swipe/glide typing for RBOARD. No network. Decoder is pure and
   shared with tests; the controller draws a trail and fills a candidate bar. */
const SWIPE_MIN_DISTANCE=40;
const SWIPE_MIN_KEYS=2;
const HOLD_MOVE_DISTANCE=12; // must match hold.js; do not change hold.js

function swipeLetterKeys(word){
 const out=[];
 const w=String(word||"").toLowerCase().replace(/['’]/g,"");
 for(const ch of w){
  if(ch<"a"||ch>"z")continue;
  if(!out.length||out[out.length-1]!==ch)out.push(ch);
 }
 return out;
}
function expandSwipePath(path){
 const out=[];
 for(const token of path||[]){
  const t=String(token).toLowerCase();
  if(t==="ng")out.push("n","g");
  else if(/^[a-z]$/.test(t))out.push(t);
 }
 return out;
}
function collapseSwipePath(path){
 const expanded=expandSwipePath(path),out=[];
 for(const ch of expanded){
  if(!out.length||out[out.length-1]!==ch)out.push(ch);
 }
 return out;
}
function foldSharedVowels(keys){
 return keys.map(k=>k==="e"?"i":k==="o"?"u":k);
}
function isSubsequence(need,hay){
 let i=0;
 for(const ch of hay){
  if(i<need.length&&ch===need[i])i++;
 }
 return i===need.length;
}
function lexiconEntries(lexicon){
 if(!lexicon)return[];
 if(Array.isArray(lexicon.entries))return lexicon.entries;
 const out=[];
 const push=(list,lang,base)=>{
  (list||[]).forEach((word,i)=>{
   if(word)out.push({word:String(word).toLowerCase(),lang,rank:base+i});
  });
 };
 push(lexicon.english,"en",0);
 push(lexicon.tagalog,"tl",5000);
 return out;
}
function latinToBaybayin(word,mapping,cancel){
 if(!mapping||!mapping.bases)return null;
 const mark=(cancel&&mapping.cancel&&mapping.cancel[cancel])||(mapping.cancel&&mapping.cancel.virama)||"";
 const w=String(word||"").toLowerCase();
 let i=0,out="";
 const vowel=c=>c&&"aeiou".includes(c);
 while(i<w.length){
  const ch=w[i];
  if(ch==="'"||ch==="’"||ch==="-"||ch===" "){i++;continue;}
  if(ch<"a"||ch>"z")return null;
  if("cfjqvxz".includes(ch))return null;
  if(vowel(ch)){
   const g=mapping.independent[ch];
   if(!g)return null;
   out+=g;i++;continue;
  }
  let cons,step;
  if(w.startsWith("ng",i)){cons="ng";step=2;}
  else{cons=ch;step=1;}
  if(!mapping.bases[cons])return null;
  i+=step;
  if(i<w.length&&vowel(w[i])){
   out+=mapping.bases[cons]+(mapping.vowels[w[i]]||"");
   i++;
  }else{
   out+=mapping.bases[cons]+mark;
  }
 }
 return out||null;
}
function scoreSwipeCandidate(pathKeys,wordKeys,rank){
 if(!pathKeys.length||!wordKeys.length)return-Infinity;
 if(pathKeys[0]!==wordKeys[0]||pathKeys[pathKeys.length-1]!==wordKeys[wordKeys.length-1])return-Infinity;
 if(!isSubsequence(wordKeys,pathKeys))return-Infinity;
 const cover=wordKeys.length/pathKeys.length;
 const extra=Math.max(0,pathKeys.length-wordKeys.length);
 const freq=1/(1+rank);
 return cover*6 - extra*0.45 + freq*2 + Math.min(wordKeys.length,8)*0.12;
}
function decodeSwipe(path,options={}){
 const layer=options.layer||"English";
 const mapping=options.mapping||(typeof MAPPING!=="undefined"?MAPPING:null);
 const entries=lexiconEntries(options.lexicon||options.words||(typeof SWIPE_LEXICON!=="undefined"?SWIPE_LEXICON:null));
 const raw=collapseSwipePath(path);
 const pathKeys=layer==="Baybayin"?foldSharedVowels(raw):raw;
 if(pathKeys.length<1)return[];
 const seen=new Set();
 const scored=[];
 for(const entry of entries){
  if(seen.has(entry.word))continue;
  let wordKeys=swipeLetterKeys(entry.word);
  if(layer==="Baybayin")wordKeys=foldSharedVowels(wordKeys);
  const score=scoreSwipeCandidate(pathKeys,wordKeys,entry.rank);
  if(score===-Infinity)continue;
  let display=entry.word;
  if(layer==="Baybayin"){
   display=latinToBaybayin(entry.word,mapping,options.cancel||"virama");
   if(!display)continue;
  }else if(options.shift){
   display=display.charAt(0).toUpperCase()+display.slice(1);
  }
  seen.add(entry.word);
  scored.push({word:entry.word,display,score,lang:entry.lang});
 }
 scored.sort((a,b)=>b.score-a.score||a.word.localeCompare(b.word));
 return scored.slice(0,options.limit||3);
}
function isSwipeGesture(info){
 const distance=info&&info.distance||0;
 const keyCount=info&&info.keyCount||0;
 const held=!!(info&&info.held);
 if(held)return false;
 return distance>=SWIPE_MIN_DISTANCE&&keyCount>=SWIPE_MIN_KEYS;
}
function shouldTapFallback(info){
 const distance=info&&info.distance||0;
 const held=!!(info&&info.held);
 const left=!!(info&&info.leftStartKey);
 if(held||isSwipeGesture(info))return false;
 if(distance<=HOLD_MOVE_DISTANCE&&!left)return false;
 return distance>0||left;
}

function hitSwipeKey(keys,x,y){
 for(const item of keys){
  const r=item.rect||(item.el&&item.el.getBoundingClientRect&&item.el.getBoundingClientRect());
  if(!r)continue;
  if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)return item;
 }
 return null;
}
function collectSwipeKeys(root){
 const scope=root&&root.querySelectorAll?root:null;
 if(!scope)return[];
 return[...scope.querySelectorAll("[data-swipe-letter]")].map(el=>({el,letter:el.getAttribute("data-swipe-letter")}));
}

function makeSwipeKeyboard(opts){
 const state={active:null,keys:[],last:null};
 const trail=opts.trail||null;
 const bar=opts.bar||null;
 const doc=opts.document||(typeof document!=="undefined"?document:null);
 function refresh(){state.keys=opts.getKeys?opts.getKeys():collectSwipeKeys(opts.root);}
 function clearTrail(){
  if(!trail)return;
  const path=trail.querySelector("path");
  if(path)path.setAttribute("d","");
  trail.classList.remove("is-active");
 }
 function drawTrail(points){
  if(!trail||!points.length)return;
  const box=trail.getBoundingClientRect?trail.getBoundingClientRect():{left:0,top:0};
  const d=points.map((p,i)=>(i?"L":"M")+(p.x-box.left).toFixed(1)+" "+(p.y-box.top).toFixed(1)).join(" ");
  let path=trail.querySelector("path");
  if(!path&&doc){path=doc.createElementNS("http://www.w3.org/2000/svg","path");trail.append(path);}
  if(path)path.setAttribute("d",d);
  trail.classList.add("is-active");
 }
 function renderBar(candidates,chosen){
  if(!bar)return;
  bar.replaceChildren();
  if(!candidates||!candidates.length){bar.hidden=true;return;}
  bar.hidden=false;
  bar.setAttribute("role","listbox");
  bar.setAttribute("aria-label","Swipe word suggestions");
  candidates.forEach((c,i)=>{
   const b=doc.createElement("button");
   b.type="button";
   b.textContent=c.display;
   b.dataset.word=c.word;
   b.setAttribute("role","option");
   b.setAttribute("aria-pressed",String(c.word===(chosen&&chosen.word)));
   if(i===0&&c.word===(chosen&&chosen.word))b.classList.add("is-top");
   b.onclick=()=>{if(opts.onChoose)opts.onChoose(c,candidates);renderBar(candidates,c);};
   bar.append(b);
  });
 }
 function finish(e){
  const a=state.active;
  if(!a||(e&&e.pointerId!==a.id))return;
  state.active=null;
  clearTrail();
  const last=a.points[a.points.length-1]||{x:a.x,y:a.y};
  const distance=a.maxDistance||Math.hypot(last.x-a.x,last.y-a.y);
  const letters=a.letters;
  const keyCount=new Set(letters).size;
  const info={distance,keyCount,held:a.held,leftStartKey:a.leftStartKey,letters};
  const layer=opts.getLayer?opts.getLayer():"English";
  if(isSwipeGesture(info)&&(layer==="English"||layer==="Baybayin")){
   const candidates=decodeSwipe(letters,{layer,mapping:opts.mapping,lexicon:opts.lexicon,shift:opts.isShift&&opts.isShift(),cancel:opts.cancel&&opts.cancel()});
   if(candidates.length&&opts.onWord){
    opts.onWord(candidates[0],candidates);
    state.last={candidates,chosen:candidates[0]};
    renderBar(candidates,candidates[0]);
    return info;
   }
  }
  if(shouldTapFallback(info)&&letters[0]&&opts.onTapFallback)opts.onTapFallback(letters[0]);
  return info;
 }
 refresh();
 return{
  SWIPE_MIN_DISTANCE,
  refresh,
  reset(){state.active=null;clearTrail();},
  clearCandidates(){state.last=null;if(bar){bar.hidden=true;bar.replaceChildren();}},
  down(e){
   const layer=opts.getLayer?opts.getLayer():"English";
   if(layer!=="English"&&layer!=="Baybayin")return;
   if(e.button!=null&&e.button!==0)return;
   refresh();
   const target=e.target&&e.target.closest?e.target.closest("[data-swipe-letter]"):null;
   if(!target)return;
   const hit={el:target,letter:target.getAttribute("data-swipe-letter")};
   if(!hit.letter)return;
   state.active={id:e.pointerId,x:e.clientX,y:e.clientY,letters:[hit.letter],points:[{x:e.clientX,y:e.clientY}],maxDistance:0,leftStartKey:false,held:false,start:hit,t0:Date.now()};
  },
  move(e){
   const a=state.active;
   if(!a||e.pointerId!==a.id)return;
   const dist=Math.hypot(e.clientX-a.x,e.clientY-a.y);
   if(dist>a.maxDistance)a.maxDistance=dist;
   if(Date.now()-a.t0>=480&&a.maxDistance<=HOLD_MOVE_DISTANCE)a.held=true;
   a.points.push({x:e.clientX,y:e.clientY});
   if(a.points.length>240)a.points.splice(0,a.points.length-240);
   const rects=state.keys.map(k=>({...k,rect:k.el?k.el.getBoundingClientRect():k.rect}));
   const hit=hitSwipeKey(rects,e.clientX,e.clientY);
   if(hit){
    if(hit.el!==a.start.el&&hit.letter!==a.start.letter)a.leftStartKey=true;
    if(a.letters[a.letters.length-1]!==hit.letter)a.letters.push(hit.letter);
   }else if(a.maxDistance>HOLD_MOVE_DISTANCE){
    a.leftStartKey=true;
   }
   if(a.maxDistance>=SWIPE_MIN_DISTANCE)drawTrail(a.points);
  },
  up(e){return finish(e);},
  cancel(){state.active=null;clearTrail();},
  get active(){return state.active;}
 };
}

if(typeof module!=="undefined")module.exports={SWIPE_MIN_DISTANCE,HOLD_MOVE_DISTANCE,SWIPE_MIN_KEYS,swipeLetterKeys,expandSwipePath,collapseSwipePath,foldSharedVowels,isSubsequence,latinToBaybayin,decodeSwipe,isSwipeGesture,shouldTapFallback,hitSwipeKey,makeSwipeKeyboard};

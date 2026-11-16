/* RBOARD iOS keyboard-extension surface · add-only · 20261109.
   Reuses MAPPING (../mapping.js) and makePointerKeyboard (../hold.js) unchanged.
   Output contract (native handler "rboard"): {op:"insert",text}|{op:"delete"}|{op:"return"}|{op:"globe"}|{op:"ready"}.
   No eval, no submit, no network, no storage of typed text. */
"use strict";
(function(){
 const kb=document.getElementById("kb"),alts=document.getElementById("alts"),echo=document.getElementById("echo"),nav=document.getElementById("layers");
 const native=window.webkit&&window.webkit.messageHandlers&&window.webkit.messageHandlers.rboard;
 let layer="EN",shift=false,caps=false,lastShift=0,needsGlobe=true,returnLabel="return",preview="";

 const THEMES=[
  {id:"plum",label:"plum",title:"RBOARD plum/gold"},
  {id:"ywallet",label:"ЯW",title:"ЯWALLET"},
  {id:"ghostmachine",label:"GM",title:"GHOSTMACHINE ASSM"}
 ];
 function readTheme(){
  try{
   const q=new URLSearchParams(location.search).get("theme");
   if(q&&THEMES.some(t=>t.id===q))return q;
  }catch(_){}
  try{
   const s=localStorage.getItem("rboard-theme");
   if(s&&THEMES.some(t=>t.id===s))return s;
  }catch(_){}
  return "plum";
 }
 function applyTheme(id){
  const t=THEMES.some(x=>x.id===id)?id:"plum";
  document.documentElement.setAttribute("data-theme",t);
  try{localStorage.setItem("rboard-theme",t);}catch(_){}
  const meta=THEMES.find(x=>x.id===t);
  const btn=document.getElementById("theme-switch");
  if(btn&&meta){btn.textContent=meta.label;btn.title=meta.title;btn.setAttribute("aria-label","Theme "+meta.title);}
 }
 function cycleTheme(){
  const cur=document.documentElement.getAttribute("data-theme")||"plum";
  const i=Math.max(0,THEMES.findIndex(x=>x.id===cur));
  applyTheme(THEMES[(i+1)%THEMES.length].id);
 }
 const LETTERS=["qwertyuiop","asdfghjkl","zxcvbnm"],DIGITS="1234567890";
 const SPANISH={a:"á",e:"é",i:"í",o:"ó",u:"ú ü",n:"ñ"};
 const SYMBOLS=[...".,;:'\"!?/\\-_=+()[]{}@#$%&*<>`~^|"].concat(["ñ","¿","¡"]);
 const UNMARKED=Object.values(MAPPING.bases).slice(3); // consonants only (k..h), as in app.js
 function post(msg){
  if(native){try{native.postMessage(msg);}catch(_){}}
  else if(window.parent&&window.parent!==window){try{window.parent.postMessage(Object.assign({rboardPlum:1},msg),"*");}catch(_){ } if(msg.op==="insert")preview+=msg.text||""; else if(msg.op==="delete")preview=[...preview].slice(0,-1).join(""); else if(msg.op==="return")preview=""; setEcho(preview);}
  else{ if(msg.op==="insert")preview+=msg.text; else if(msg.op==="delete")preview=[...preview].slice(0,-1).join(""); else if(msg.op==="return")preview=""; setEcho(preview);}
 }
 function setEcho(t){const s=[...String(t||"")].slice(-18).join("");echo.textContent=s;echo.dataset.ctx=s;}
 function lastChar(){const s=[...(echo.dataset.ctx||"")];return s.length?s[s.length-1]:"";}
 function emit(text){
  if(typeof text!=="string"||!text||text.length>80)return;
  post({op:"insert",text});
  if(shift&&!caps){shift=false;render();}
 }
 function closeAlts(){alts.hidden=true;alts.replaceChildren();}
 function showAlts(button,choices){
  if(!choices.length)return;alts.replaceChildren();
  choices.forEach(c=>{const b=document.createElement("button");b.type="button";b.textContent=c.value;b.title=c.name;b.onclick=()=>{closeAlts();emit(c.value);};alts.append(b);});
  const x=document.createElement("button");x.type="button";x.className="cancel";x.textContent="Cancel";x.onclick=closeAlts;alts.append(x);alts.hidden=false;
 }
 const gesture=makePointerKeyboard({set:(f,t)=>setTimeout(f,t),clear:id=>clearTimeout(id),menu:showAlts,emit:c=>emit(c)});
 let swiper=null,swipeRange=null;
 const trail=document.getElementById("swipe-trail");
 if(trail&&!trail.querySelector("path")){const p=document.createElementNS("http://www.w3.org/2000/svg","path");trail.append(p);}
 const swipeBar=document.getElementById("swipe-candidates");
 const applySwipe=c=>{
  const text=(c&&c.display||"")+" ";
  if(swipeRange){for(let i=0;i<swipeRange.n;i++)post({op:"delete"});}
  emit(text);
  swipeRange={n:[...text].length};
 };
 if(typeof makeSwipeKeyboard==="function"){
  swiper=makeSwipeKeyboard({
   root:document.getElementById("kb")||document.body,
   document,
   trail,bar:swipeBar,mapping:MAPPING,lexicon:typeof SWIPE_LEXICON!=="undefined"?SWIPE_LEXICON:null,
   getLayer:()=>layer==="BAY"?"Baybayin":(layer==="EN"?"English":layer),
   isShift:()=>shift||caps,
   cancel:()=>"virama",
   onWord:(top,cands)=>applySwipe(top),
   onChoose:c=>applySwipe(c),
   onTapFallback:letter=>{
    const base=letter==="ng"?((shift||caps)?"NG":"ng"):((shift||caps)&&letter.length===1?letter.toUpperCase():letter);
    emit(base);
   }
  });
 }
 document.addEventListener("pointerdown",e=>{if(swiper)swiper.down(e);},true);
 document.addEventListener("pointermove",e=>{gesture.move(e);if(swiper)swiper.move(e);},true);
 document.addEventListener("pointerup",e=>{gesture.up(e);if(swiper)swiper.up(e);},true);
 document.addEventListener("pointercancel",()=>{gesture.cancel();if(swiper)swiper.cancel();},true);
 function key(row,label,cls,onTap){const b=document.createElement("button");b.type="button";b.className="k"+(cls?" "+cls:"");if(label!==null)b.append(label);if(onTap)b.addEventListener("click",onTap);row.append(b);return b;}
 function withAlts(b,choices,base){
  b.addEventListener("pointerdown",e=>gesture.down(e,b,choices,base));
  b.addEventListener("click",e=>{if(!gesture.click(b,e)){e.preventDefault();return;}emit(base);});
  b.addEventListener("contextmenu",e=>{e.preventDefault();gesture.context(b,choices);});
 }
 function letterKey(row,c){
  const v=(shift||caps)?c.toUpperCase():c,b=key(row,null,"");const choices=[];
  const k=c.toLowerCase();let g=MAPPING.independent[k]||MAPPING.bases[k]||"";
  if(g){const l=document.createElement("span");l.className="cl";l.textContent=g;b.append(l);choices.push({value:g,name:"Baybayin "+(MAPPING.independent[k]?k:k+"a")});}
  if(SPANISH[k]){const r=document.createElement("span");r.className="cr";const sv=(shift||caps)?SPANISH[k].toUpperCase():SPANISH[k];r.textContent=sv;b.append(r);sv.split(" ").forEach(value=>choices.push({value,name:"Spanish variant"}));}
  b.append(v);b.setAttribute("aria-label",v+(g?"; Baybayin "+g:"")+(SPANISH[k]?"; Spanish "+SPANISH[k]:""));
  b.dataset.swipeLetter=c;withAlts(b,choices,v);
 }
 function digitKey(row,c){
  const b=key(row,null,"");const n=MAPPING.mayanNumerals[Number(c)].character;
  const r=document.createElement("span");r.className="cr maya";r.textContent=n;b.append(r,c);
  b.setAttribute("aria-label","digit "+c+"; hold for Mayan numeral "+c);withAlts(b,[{value:n,name:"Mayan numeral "+c}],c);
 }
 function glyphKey(row,g,sub,onTap){const b=key(row,g,"glyph",onTap||(()=>emit(g)));if(sub){const s=document.createElement("small");s.textContent=sub;b.append(s);}return b;}
 function delKey(row){
  const b=key(row,"⌫","fn",null);let t=null,r=null;
  const stop=()=>{clearTimeout(t);clearInterval(r);t=r=null;};
  b.addEventListener("pointerdown",e=>{e.preventDefault();post({op:"delete"});t=setTimeout(()=>{r=setInterval(()=>post({op:"delete"}),75);},420);});
  ["pointerup","pointercancel","pointerleave"].forEach(ev=>b.addEventListener(ev,stop));
  b.setAttribute("aria-label","Delete");return b;
 }
 function bottomRow(){
  const row=document.createElement("div");row.className="row";kb.append(row);
  const g=key(row,"🌐","fn",()=>post({op:"globe"}));g.setAttribute("aria-label","Next keyboard");g.hidden=!needsGlobe;
  const ng=key(row,"NG","fn",null);ng.dataset.swipeLetter="ng";withAlts(ng,[{value:"ᜅ",name:"Baybayin nga"}],(shift||caps)?"NG":"ng");
  key(row,",","fn",()=>emit(","));
  key(row,"RBOARD","space",()=>emit(" ")).setAttribute("aria-label","space");
  key(row,".","fn",()=>emit("."));
  key(row,returnLabel,"ret",()=>post({op:"return"}));
 }
 function render(){
  gesture.reset();closeAlts();kb.replaceChildren();
  nav.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.layer===layer)));
  if(layer==="EN"){
   const d=document.createElement("div");d.className="row";kb.append(d);[...DIGITS].forEach(c=>digitKey(d,c));
   LETTERS.forEach((s,i)=>{const row=document.createElement("div");row.className="row"+(i===1?" inset9":"");kb.append(row);
    if(i===2){const sh=key(row,caps?"⇪":"⇧","fn"+(shift||caps?" active":""),()=>{const now=Date.now();if(now-lastShift<320){caps=!caps;shift=caps;}else{caps=false;shift=!shift;}lastShift=now;render();});sh.setAttribute("aria-label","Shift");}
    [...s].forEach(c=>letterKey(row,c));if(i===2)delKey(row);});
  }else if(layer==="BAY"){
   const ks=Object.entries(MAPPING.bases);
   [ks.slice(0,9),ks.slice(9,18)].forEach(part=>{const row=document.createElement("div");row.className="row";kb.append(row);part.forEach(([k,v])=>{const b=glyphKey(row,v,["a","i","u"].includes(k)?k:k+"a");b.dataset.swipeLetter=k;});});
   const row=document.createElement("div");row.className="row";kb.append(row);
   [["ᜒ","i/e"],["ᜓ","u/o"],["᜔","virama"],["᜕","pamudpod"]].forEach(([c,l])=>glyphKey(row,c,l,()=>{if(!UNMARKED.includes(lastChar())){setEcho("place after an unmarked consonant");setTimeout(()=>post({op:"ping"}),900);return;}emit(c);}));
   glyphKey(row,"ᜟ","archaic ra");MAPPING.punctuation.forEach(e=>glyphKey(row,e.character,e.codepoint.replace("U+","")));delKey(row);
  }else if(layer==="MAYA"){
   [0,10].forEach(start=>{const row=document.createElement("div");row.className="row";kb.append(row);MAPPING.mayanNumerals.slice(start,start+10).forEach((e,i)=>glyphKey(row,e.character,String(start+i)));});
   const row=document.createElement("div");row.className="row";kb.append(row);[...DIGITS].forEach(c=>key(row,c,"",()=>emit(c)));delKey(row);
  }else{
   [SYMBOLS.slice(0,12),SYMBOLS.slice(12,24),SYMBOLS.slice(24)].forEach((part,i)=>{const row=document.createElement("div");row.className="row";kb.append(row);part.forEach(c=>key(row,c,"",()=>emit(c)));if(i===2)delKey(row);});
  }
  bottomRow();if(swiper)swiper.refresh();
 }
 [["EN","EN"],["BAY","ᜀ"],["MAYA","𝋠"],["SYM","#+"]].forEach(([id,label])=>{const b=document.createElement("button");b.type="button";b.dataset.layer=id;b.textContent=label;b.onclick=()=>{layer=id;shift=caps=false;swipeRange=null;render();};nav.append(b);});
 // Native -> JS: only these three setters exist; arguments are JSON-encoded by the host.
 window.RBOARDExt={
  setGlobe(v){if(needsGlobe!==!!v){needsGlobe=!!v;render();}},
  setReturnLabel(s){if(typeof s==="string"&&s.length<=12&&s!==returnLabel){returnLabel=s;render();}},
  setContext(s){if(typeof s==="string")setEcho(s);},
  setTheme(s){if(typeof s==="string")applyTheme(s);},
  getTheme(){return document.documentElement.getAttribute("data-theme")||"plum";}
 };
 const themeBtn=document.getElementById("theme-switch");
 if(themeBtn)themeBtn.onclick=cycleTheme;
 applyTheme(readTheme());
 setEcho("");render();post({op:"ready"});
})();

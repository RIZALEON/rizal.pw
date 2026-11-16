"use strict";
function syllable(token, cancel="virama") {
 const t=token.toLowerCase().trim(), m=MAPPING;
 if(m.independent[t]) return m.independent[t];
 const match=t.match(/^(ng|[kgtdnpbmyrlwsh])([aeiou])?$/);
 if(!match) throw Error("No direct Baybayin equivalent. Choose a pronunciation explicitly; no automatic substitution.");
 return m.bases[match[1]]+(match[2]?m.vowels[match[2]]:m.cancel[cancel]);
}
function dualLegend(key){
 const k=key.toLowerCase();
 if(MAPPING.independent[k])return {glyph:MAPPING.independent[k],sound:k==='e'||k==='i'?'i/e':k==='o'||k==='u'?'o/u':'a'};
 if(MAPPING.bases[k])return {glyph:MAPPING.bases[k],sound:k+'a'};
 return {glyph:'—',sound:'no direct equivalent'};
}
function accent(letter,mark){return (letter+mark).normalize("NFC");}
if(typeof module!=="undefined") module.exports={syllable,accent,dualLegend};
function initializeRboard(root=document,host=null) {
 let layer=new URLSearchParams(location.search).get("layer")==="maya"?"Maya":"English",shift=false,dead="";
 let alternatePanel=null,swiper=null,swipeRange=null;
 document.addEventListener("scroll",()=>gesture.cancel(),true);
 root.addEventListener("scroll",()=>gesture.cancel(),true);
 const out=root.querySelector("#output"),keys=root.querySelector("#keys"),extra=root.querySelector("#extras"),hint=root.querySelector("#hint");
 out.addEventListener("input",()=>{if(swipeRange&&out.selectionStart!==swipeRange.end)swipeRange=null;});
 const insert=s=>{let a=out.selectionStart,b=out.selectionEnd;out.setRangeText(s,a,b,"end");out.focus({preventScroll:true});if(host&&typeof host.insert==="function"&&s!=="")host.insert(s);};
 const key=(root,label,action,sub="")=>{const b=document.createElement("button");b.type="button";b.textContent=label;if(sub){const n=document.createElement("small");n.textContent=sub;b.append(n);}b.onclick=action;root.append(b);return b;};
 function closeAlternates(){if(alternatePanel){alternatePanel.remove();alternatePanel=null;}}
 function showChoices(button,choices){
 if(!choices.length)return;closeAlternates();
 const panel=document.createElement("div");panel.className="alternate-panel";panel.setAttribute("role","dialog");panel.setAttribute("aria-label","Choose secondary character");alternatePanel=panel;
 choices.forEach(c=>key(panel,c.value,()=>{closeAlternates();emit(c.value);},c.name));
 key(panel,"Cancel",()=>{closeAlternates();button.focus({preventScroll:true});});extra.append(panel);
 // Do not focus during pointer hold: retain pointer stream; choices remain visible after release.
 }
 const gesture=makePointerKeyboard({set:(f,t)=>setTimeout(f,t),clear:id=>clearTimeout(id),menu:showChoices,emit:c=>emit(c)});
 root.addEventListener("pointerdown",e=>{if(swiper)swiper.down(e);},true);
 root.addEventListener("pointermove",e=>{gesture.move(e);if(swiper)swiper.move(e);},true);
 root.addEventListener("pointerup",e=>{gesture.up(e);if(swiper)swiper.up(e);},true);
 root.addEventListener("pointercancel",()=>{gesture.cancel();if(swiper)swiper.cancel();},true);
 function alternatives(button,choices,base){
 if(!choices.length)return;
 button.onclick=null;
 button.setAttribute("aria-description","Hold for secondary; Alt+ArrowDown opens choices");button.setAttribute("aria-haspopup","dialog");
 button.addEventListener("pointerdown",e=>gesture.down(e,button,choices,base));
 button.addEventListener("click",e=>{if(!gesture.click(button,e)){e.preventDefault();e.stopImmediatePropagation();return;}emit(base);});
 button.addEventListener("keydown",e=>{if(e.altKey&&e.key==="ArrowDown"){e.preventDefault();showChoices(button,choices);alternatePanel.querySelector("button").focus({preventScroll:true});}});
 button.addEventListener("contextmenu",e=>{e.preventDefault();gesture.context(button,choices);});
 }
 const emit=c=>{if(dead){c=accent(c,dead);dead="";hint.textContent="Accent applied; NFC text.";}insert(c);};
 function render(){keys.className=(layer==="English"||layer==="Spanish")?"qwerty-layout":"";gesture.reset();if(swiper){swiper.reset();swiper.clearCandidates();}closeAlternates();keys.replaceChildren();extra.replaceChildren();dead="";root.querySelector("#compose").hidden=layer!=="Baybayin";
 root.querySelectorAll("nav button").forEach(b=>b.setAttribute("aria-pressed",String(b.textContent===layer)));
 hint.textContent=layer==="Baybayin"?"Syllabic input, not English letter substitution. E/I and O/U share signs. Use NG for nga. Touch consonants insert inherent -a; physical input uses the syllable field.":layer==="Maya"?"All 20 standardized Mayan numerals · 0–19 · nonphonetic. Hieroglyph allocations are provisional and are NOT included. This is a launcher preview, not firmware.":layer==="Numerals"?"Mayan numerals 0–19 · nonphonetic palette, not an alphabet. Font coverage may vary.":"Upper-left: Baybayin syllabic legend. Upper-right: Spanish variants on letters; Mayan values on digits only. Blank means no direct equivalent, never a Maya alphabet. I/E and O/U share glyphs; NG is separate. Tap emits the base English key; switch layers for other scripts.";
 if(layer==="Maya"){MAPPING.mayanNumerals.forEach((e,i)=>key(keys,e.character,()=>insert(e.character),String(i)+" · "+e.codepoint));if(swiper)swiper.refresh();return;}
 if(layer==="Numerals"){MAPPING.mayanNumerals.forEach((e,i)=>key(keys,e.character,()=>insert(e.character),String(i)));if(swiper)swiper.refresh();return;}
 if(layer==="Baybayin"){
 Object.entries(MAPPING.bases).forEach(([k,v])=>{const b=key(keys,v,()=>insert(v),k+(["a","i","u"].includes(k)?"":"a"));b.dataset.swipeLetter=k;});
 key(extra,"Archaic ra",()=>insert("ᜟ"),"U+171F");
 [["i/e","ᜒ"],["u/o","ᜓ"],["virama","᜔"],["pamudpod","᜕"]].forEach(([label,c])=>key(extra,label,()=>{const a=out.selectionStart,previous=out.value.slice(0,a).slice(-1);if(!Object.values(MAPPING.bases).slice(3).includes(previous)){hint.textContent="Place the caret immediately after an unmarked consonant first.";return;}insert(c);}));
 MAPPING.punctuation.forEach(e=>key(extra,e.character,()=>insert(e.character),e.codepoint));if(swiper)swiper.refresh();return;}
 const chars="1234567890qwertyuiopasdfghjklzxcvbnm";
 const spanishVariants={a:'á',e:'é',i:'í',o:'ó',u:'ú ü',n:'ñ'};
 const rows=[10,10,9,7].map(n=>{const row=document.createElement("div");row.className="keyboard-row row-"+n;keys.append(row);return row;});
 [...chars].forEach((c,index)=>{let v=shift?c.toUpperCase():c;
 const row=rows[index<10?0:index<20?1:index<29?2:3];
 const b=key(row,"",()=>emit(v));b.className="corner-key";const choices=[];
 const base=document.createElement("span");base.className="english-base";base.textContent=v;
 if(/[a-z]/.test(c)){
 b.dataset.swipeLetter=c;
 const d=dualLegend(c);
 if(d.glyph!=='—'){const legend=document.createElement("span");legend.className="corner-left";legend.textContent=d.glyph;b.append(legend);choices.push({value:d.glyph,name:"Baybayin "+d.sound});}
 if(spanishVariants[c]){const right=document.createElement("span");right.className="corner-right spanish-corner";right.textContent=shift?spanishVariants[c].toUpperCase():spanishVariants[c];right.title="Spanish variants · hold to choose";b.append(right);(shift?spanishVariants[c].toUpperCase():spanishVariants[c]).split(" ").forEach(value=>choices.push({value,name:"Spanish variant"}));}
 b.title="Baybayin: "+d.sound+". No Maya phonetic equivalent. Spanish variants, where shown, use palette/dead accents.";
 b.setAttribute("aria-label",v+": Baybayin "+d.sound+(spanishVariants[c]?"; Spanish variants "+spanishVariants[c]:"")+"; no Maya phonetic equivalent");
 }else{
 const right=document.createElement("span");right.className="corner-right mayan-corner";right.textContent=MAPPING.mayanNumerals[Number(c)].character;b.append(right);choices.push({value:right.textContent,name:"Mayan numeral "+c});
 b.title="English digit "+c+"; upper-right Mayan numeral "+c+" (nonphonetic). Touch emits English digit; Maya layer emits numeral.";
 b.setAttribute("aria-label",b.title);
 }
 b.append(base);alternatives(b,choices,v);
 });
 const ng=key(extra,"NG",()=>emit(layer==="English"?(shift?"NG":"ng"):"ng"));ng.dataset.swipeLetter="ng";
 const ngTop=document.createElement("span");ngTop.className="phonetic-glyph";ngTop.textContent="ᜅ";ng.prepend(ngTop);ng.title="NG digraph · Baybayin nga (not n plus g)";alternatives(ng,[{value:"ᜅ",name:"Baybayin nga"}],shift?"NG":"ng");
 [...".,;:'\"!?/\\-_=+()[]{}@#$%&*<>`~^|"].forEach(c=>key(extra,c,()=>emit(c)));
 if(layer==="Spanish"){
 [..."ñÑáéíóúÁÉÍÓÚüÜ¿¡"].forEach(c=>key(extra,c,()=>emit(c)));
 [["Acute","\u0301"],["Tilde","\u0303"],["Diaeresis","\u0308"]].forEach(([l,m])=>key(extra,l,()=>{dead=m;hint.textContent=l+" armed: choose the next letter. Escape cancels.";}));}
 if(swiper)swiper.refresh();
 }
 
 const keysWrap=document.createElement("div");keysWrap.className="keys-wrap";
 keys.parentNode.insertBefore(keysWrap,keys);keysWrap.append(keys);
 const trail=document.createElementNS("http://www.w3.org/2000/svg","svg");trail.setAttribute("class","swipe-trail");trail.setAttribute("aria-hidden","true");
 const trailPath=document.createElementNS("http://www.w3.org/2000/svg","path");trail.append(trailPath);keysWrap.append(trail);
 const swipeBar=document.createElement("div");swipeBar.id="swipe-candidates";swipeBar.className="swipe-candidates";swipeBar.hidden=true;keysWrap.after(swipeBar);
 const applySwipe=c=>{
  const text=(c&&c.display||"")+" ";
  if(swipeRange&&out.selectionStart===swipeRange.end&&out.selectionEnd===swipeRange.end){
   out.setSelectionRange(swipeRange.start,swipeRange.end);
  }
  const start=out.selectionStart;
  insert(text);
  swipeRange={start,end:out.selectionStart};
 };
 if(typeof makeSwipeKeyboard==="function"){
  swiper=makeSwipeKeyboard({
   root,document:root.ownerDocument||(typeof document!=="undefined"?document:null),
   trail,bar:swipeBar,mapping:MAPPING,lexicon:typeof SWIPE_LEXICON!=="undefined"?SWIPE_LEXICON:null,
   getLayer:()=>layer,isShift:()=>shift,cancel:()=>root.querySelector("#cancel")?root.querySelector("#cancel").value:"virama",
   onWord:(top,cands)=>{applySwipe(top);hint.textContent="Swipe: "+cands.map(c=>c.display).join(" · ")+". Tap a candidate to swap.";},
   onChoose:c=>applySwipe(c),
   onTapFallback:letter=>{
    const base=letter==="ng"?(shift&&layer==="English"?"NG":"ng"):(shift&&letter.length===1&&layer==="English"?letter.toUpperCase():letter);
    emit(base);
   }
  });
 }

 ["English","Baybayin","Spanish","Maya","Numerals"].forEach(l=>key(root.querySelector("nav"),l,()=>{layer=l;render();}));
 root.querySelector("#insert").onclick=()=>{try{insert(syllable(root.querySelector("#syllable").value,root.querySelector("#cancel").value));root.querySelector("#syllable").value="";}catch(e){hint.textContent=e.message;}};
 root.querySelector("#syllable").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();root.querySelector("#insert").click();}};
 out.addEventListener("keydown",e=>{if(e.key==="Escape"){dead="";hint.textContent="Accent canceled.";}else if(dead&&e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();emit(e.key);}});
 root.querySelector("#use-draft").onclick=()=>{if(host)host.transfer(out.value);else hint.textContent="Open mobile.html or demo.html to transfer a draft to the command bar.";};
 root.querySelector("#space").onclick=()=>insert(" ");
 root.querySelector("#back").onclick=()=>{let a=out.selectionStart,b=out.selectionEnd;if(a===b&&a>0){const before=[...out.value.slice(0,a)];a-=before.at(-1).length;}out.setSelectionRange(a,b);insert("");if(host&&typeof host.backspace==="function")host.backspace();};
 root.querySelector("#shift").onclick=e=>{shift=!shift;e.currentTarget.setAttribute("aria-pressed",String(shift));render();};
 root.querySelector("#download").onclick=()=>{const url=URL.createObjectURL(new Blob([out.value],{type:"text/plain;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="crypto-keyboard-draft.txt";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
root.querySelector("#share-image").onclick=()=>{const text=out.value;if(!text){hint.textContent="Compose something first.";return;}hint.textContent="Rendering image…";Promise.resolve(shareDraftImage(text)).then(result=>{hint.textContent=result.method==="share"?"Shared image.":result.method==="share-abort"?"Share canceled. The draft is unchanged.":"Saved image."}).catch(err=>{hint.textContent=err&&err.message?err.message:"Could not create image.";});};
 root.addEventListener("keydown",e=>{if(e.key==="Escape"&&alternatePanel){e.preventDefault();e.stopImmediatePropagation();closeAlternates();out.focus({preventScroll:true});return;}if(e.key==="Escape"&&host){e.preventDefault();e.stopImmediatePropagation();host.close();return;}},true);
 render();
}

if(typeof document!=="undefined"&&document.querySelector("#output"))initializeRboard(document);

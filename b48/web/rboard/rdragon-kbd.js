/* rdragon-kbd.js · RDRAGON 1.0.4.37 (t198u) · inline RBOARD keyboard for the chat box.
   Replaces the iframe "plum" dialog, which rendered as an empty sheet (Close × + ThundR tag) on the 17e.
   Layout = Gat's mockup: black board in a rounded purple-neon frame; green-outlined top bar with the R:\> ▌ prompt
   and EN (purple, active) · ᜀ · 𝋠 · #+; digits with Mayan numerals above; QWERTY with Baybayin hints top-left and
   Spanish accents top-right; ⇧ / ⌫ green; 🌐 · NG · , · R B O A R D · . · return (purple).
   Data only from RBOARD's own map (rboard/mapping.js = MAPPING, Unicode-sourced) + hold.js; fonts = RFONT (rdragon-theme.css).
   Letters with no Baybayin entry in MAPPING (c f j q v x z) get no hint: nothing is invented.
   Inserts into the bound field only; return = the same submit as Send. Never evals, signs or sends anything by itself. */
(function(){"use strict";
 if(window.RDRAGON_KBD)return;
 var MAP=(typeof MAPPING!=="undefined")?MAPPING:null;
 var LETTERS=["qwertyuiop","asdfghjkl","zxcvbnm"],DIGITS="1234567890";
 var SPANISH={a:"á",e:"é",i:"í",o:"ó",u:"úü",n:"ñ"};
 var SYMBOLS=".,;:'\"!?/\\-_=+()[]{}@#$%&*<>`~^|".split("").concat(["ñ","¿","¡"]);
 function el(t,c,txt){var e=document.createElement(t);if(c)e.className=c;if(txt!=null)e.textContent=txt;return e;}
 function hintFor(k){if(!MAP)return "";return (MAP.independent&&MAP.independent[k])||(MAP.bases&&MAP.bases[k])||"";}
 function mayan(n){try{return MAP.mayanNumerals[n].character;}catch(_){return "";}}
 var GLOBE='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/></g></svg>';
 window.GhostrootKeyboard=window.GhostrootKeyboard||{};
 window.GhostrootKeyboard.mount=function(input){
  if(!(input instanceof HTMLInputElement||input instanceof HTMLTextAreaElement))throw Error("Pass an input or textarea");
  if(input.dataset.rdragonKbd==="1")return window.RDRAGON_KBD;
  input.dataset.rdragonKbd="1";
  var Solo=function(){return window.RBOARDSolo;};
  var layer="EN",shift=false,caps=false,lastShift=0,isOpen=false;
  var root=el("div","rbk");root.id="rbk";root.hidden=true;root.setAttribute("role","group");root.setAttribute("aria-label","RBOARD keyboard");
  var bar=el("div","rbk-bar"),prompt=el("div","rbk-prompt"),echo=el("span","rbk-echo"),cur=el("span","rbk-cur","▌");
  prompt.append(el("span","rbk-ps","R:\\>"),echo,cur);
  var nav=el("nav","rbk-layers");bar.append(prompt,nav);
  var keys=el("div","rbk-keys"),alts=el("div","rbk-alts");alts.hidden=true;
  root.append(bar,keys,alts);
  // keep the caret in the chat box: keys never take focus
  root.addEventListener("mousedown",function(e){e.preventDefault();});
  root.addEventListener("touchstart",function(){},{passive:true});
  function setEcho(){var s=Array.from(String(input.value||"")).slice(-16).join("");echo.textContent=s?" "+s:" ";}
  function insert(text){if(typeof text!=="string"||!text||text.length>16)return;
   var s=input.selectionStart!=null?input.selectionStart:input.value.length,e=input.selectionEnd!=null?input.selectionEnd:s,v=input.value;
   input.value=v.slice(0,s)+text+v.slice(e);var c=s+text.length;try{input.setSelectionRange(c,c);}catch(_){}
   input.dispatchEvent(new Event("input",{bubbles:true}));setEcho();
   if(shift&&!caps){shift=false;render();}}
  function del(){var s=input.selectionStart!=null?input.selectionStart:input.value.length,e=input.selectionEnd!=null?input.selectionEnd:s,v=input.value;
   if(s!==e){input.value=v.slice(0,s)+v.slice(e);try{input.setSelectionRange(s,s);}catch(_){}}
   else if(s>0){var left=Array.from(v.slice(0,s));left.pop();var cut=left.join("").length;input.value=left.join("")+v.slice(s);try{input.setSelectionRange(cut,cut);}catch(_){}}
   input.dispatchEvent(new Event("input",{bubbles:true}));setEcho();}
  function submit(){var f=input.form;if(!f)return;if(f.requestSubmit)f.requestSubmit();else f.dispatchEvent(new Event("submit",{cancelable:true,bubbles:true}));setTimeout(setEcho,0);}
  function closeAlts(){alts.hidden=true;alts.replaceChildren();}
  function showAlts(btn,choices){if(!choices||!choices.length)return;alts.replaceChildren();
   choices.forEach(function(c){var b=el("button","rbk-alt",c.value);b.type="button";b.title=c.name||"";b.onclick=function(){closeAlts();insert(c.value);};alts.append(b);});
   var x=el("button","rbk-alt cancel","×");x.type="button";x.onclick=closeAlts;alts.append(x);alts.hidden=false;}
  var gesture=(typeof makePointerKeyboard==="function")?makePointerKeyboard({set:function(f,t){return setTimeout(f,t);},clear:function(id){clearTimeout(id);},menu:showAlts,emit:function(c){insert(c);}}):null;
  if(gesture){document.addEventListener("pointermove",function(e){gesture.move(e);},true);document.addEventListener("pointerup",function(e){gesture.up(e);},true);document.addEventListener("pointercancel",function(){gesture.cancel();},true);}
  function row(cls){var r=el("div","rbk-row"+(cls?" "+cls:""));keys.append(r);return r;}
  function key(r,cls,onTap){var b=el("button","rbk-k"+(cls?" "+cls:""));b.type="button";if(onTap)b.addEventListener("click",onTap);r.append(b);return b;}
  function withAlts(b,choices,base){
   if(!gesture){b.addEventListener("click",function(){insert(base);});return;}
   b.addEventListener("pointerdown",function(e){gesture.down(e,b,choices,base);});
   b.addEventListener("click",function(e){if(!gesture.click(b,e)){e.preventDefault();return;}insert(base);});
   b.addEventListener("contextmenu",function(e){e.preventDefault();gesture.context(b,choices);});}
  function letterKey(r,c){var up=shift||caps,v=up?c.toUpperCase():c,b=key(r,"",null),choices=[],g=hintFor(c);
   if(g){b.append(el("span","rbk-bh",g));choices.push({value:g,name:"Baybayin"});}
   if(SPANISH[c]){var sv=up?SPANISH[c].toUpperCase():SPANISH[c];b.append(el("span","rbk-acc",sv));Array.from(sv).forEach(function(x){choices.push({value:x,name:"Spanish"});});}
   b.append(el("span","rbk-l",v));b.setAttribute("aria-label",v+(g?"; Baybayin "+g:"")+(SPANISH[c]?"; "+SPANISH[c]:""));withAlts(b,choices,v);}
  function digitKey(r,c){var n=mayan(Number(c)),b=key(r,"rbk-d",null);if(n)b.append(el("span","rbk-mn",n));b.append(el("span","rbk-l",c));
   b.setAttribute("aria-label","digit "+c+(n?"; hold for Mayan numeral "+c:""));withAlts(b,n?[{value:n,name:"Mayan numeral "+c}]:[],c);}
  function glyphKey(r,g,sub,onTap){var b=key(r,"rbk-g",onTap||function(){insert(g);});b.append(el("span","rbk-l",g));if(sub)b.append(el("small","rbk-sub",sub));return b;}
  function delKey(r){var b=key(r,"rbk-fn rbk-del",null);b.innerHTML='<span class="rbk-ic">⌫</span>';var t=null,iv=null;
   function stop(){clearTimeout(t);clearInterval(iv);t=iv=null;}
   b.addEventListener("pointerdown",function(e){e.preventDefault();del();t=setTimeout(function(){iv=setInterval(del,75);},420);});
   ["pointerup","pointercancel","pointerleave"].forEach(function(ev){b.addEventListener(ev,stop);});b.setAttribute("aria-label","backspace");return b;}
  function bottom(){var r=row("rbk-bottom");
   var g=key(r,"rbk-fn rbk-globe",function(){toSystem();});g.innerHTML=GLOBE;g.setAttribute("aria-label","system keyboard");
   var ng=key(r,"rbk-fn rbk-ng",null);ng.append(el("span","rbk-l",(shift||caps)?"NG":"NG"));withAlts(ng,[{value:"ᜅ",name:"Baybayin nga"}],(shift||caps)?"NG":"ng");
   key(r,"rbk-fn rbk-p",function(){insert(",");}).append(el("span","rbk-l",","));
   var sp=key(r,"rbk-space",function(){insert(" ");});sp.append(el("span","rbk-spl","R B O A R D"));sp.setAttribute("aria-label","space");
   key(r,"rbk-fn rbk-p",function(){insert(".");}).append(el("span","rbk-l","."));
   var ret=key(r,"rbk-ret",function(){submit();});ret.append(el("span","rbk-l","return"));ret.setAttribute("aria-label","return · send");}
  function render(){if(gesture)gesture.reset();closeAlts();keys.replaceChildren();
   nav.querySelectorAll("button").forEach(function(b){b.classList.toggle("on",b.dataset.layer===layer);b.setAttribute("aria-pressed",String(b.dataset.layer===layer));});
   if(layer==="EN"){var d=row("rbk-digits");DIGITS.split("").forEach(function(c){digitKey(d,c);});
    LETTERS.forEach(function(s,i){var r=row(i===1?"rbk-inset":"");
     if(i===2){var sh=key(r,"rbk-fn rbk-shift"+((shift||caps)?" on":""),function(){var now=Date.now();if(now-lastShift<320){caps=!caps;shift=caps;}else{caps=false;shift=!shift;}lastShift=now;render();});sh.innerHTML='<span class="rbk-ic">'+(caps?"⇪":"⇧")+'</span>';sh.setAttribute("aria-label","shift");}
     s.split("").forEach(function(c){letterKey(r,c);});if(i===2)delKey(r);});}
   else if(layer==="BAY"&&MAP){var ks=Object.entries(MAP.bases);
    [ks.slice(0,9),ks.slice(9,18)].forEach(function(part){var r=row("");part.forEach(function(kv){glyphKey(r,kv[1],["a","i","u"].indexOf(kv[0])>=0?kv[0]:kv[0]+"a");});});
    var r3=row("");[["ᜒ","i/e"],["ᜓ","u/o"],[MAP.cancel.virama,"virama"],[MAP.cancel.pamudpod,"pamudpod"]].forEach(function(x){glyphKey(r3,x[0],x[1]);});
    (MAP.punctuation||[]).forEach(function(p){glyphKey(r3,p.character,p.codepoint.replace("U+",""));});delKey(r3);}
   else if(layer==="MAYA"&&MAP){[0,10].forEach(function(st){var r=row("");MAP.mayanNumerals.slice(st,st+10).forEach(function(e,i){glyphKey(r,e.character,String(st+i));});});
    var r4=row("");DIGITS.split("").forEach(function(c){glyphKey(r4,c,"");});delKey(r4);}
   else{[SYMBOLS.slice(0,12),SYMBOLS.slice(12,24),SYMBOLS.slice(24)].forEach(function(part,i){var r=row("");part.forEach(function(c){glyphKey(r,c,"");});if(i===2)delKey(r);});}
   bottom();setEcho();}
  [["EN","EN"],["BAY","ᜀ"],["MAYA","𝋠"],["SYM","#+"]].forEach(function(x){var b=el("button","rbk-layer",x[1]);b.type="button";b.dataset.layer=x[0];b.setAttribute("aria-label","layer "+x[0]);
   b.onclick=function(){layer=x[0];shift=caps=false;render();};nav.append(b);});
  function place(){var f=input.form||input.parentElement;if(f&&f.parentNode&&root.parentNode!==f.parentNode)f.parentNode.insertBefore(root,f.nextSibling);}
  function open(){place();if(Solo()){Solo().preferSet(true);Solo().suppress(input);Solo().parkOverlays(true,null);}else{input.setAttribute("inputmode","none");document.documentElement.dataset.cryptoKeyboardOpen="true";}
   if(!isOpen){isOpen=true;root.hidden=false;render();}setEcho();
   try{var log=document.getElementById("log");if(log)log.scrollTop=log.scrollHeight;}catch(_){}}
  function close(){if(!isOpen)return;isOpen=false;root.hidden=true;closeAlts();if(Solo()){Solo().preferSet(false);Solo().parkOverlays(false);Solo().restore(input);}else delete document.documentElement.dataset.cryptoKeyboardOpen;}
  function toSystem(){close();input.setAttribute("inputmode","text");try{input.blur();}catch(_){}input.focus();}
  input.addEventListener("input",setEcho);
  // a tap outside the board and the chat bar puts RBOARD away (no blank sheet, no extra Close button)
  document.addEventListener("pointerdown",function(e){if(!isOpen)return;var f=input.form||input.parentElement;if(root.contains(e.target)||(f&&f.contains(e.target)))return;close();},true);
  if(Solo())Solo().bindFocus(input,{open:open,close:close});
  else input.addEventListener("pointerdown",open,true);
  var api={open:open,close:close,destroy:function(){close();if(root.parentNode)root.parentNode.removeChild(root);},isOpen:function(){return isOpen;},el:root,version:"1.0.4.37"};
  window.RDRAGON_KBD=api;return api;};
})();

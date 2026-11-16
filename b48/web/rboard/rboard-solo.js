/* rboard-solo.js · add-only 20261109-t195u · 1.0.4.33 tap/keyboard fix
   While the in-app RBOARD is open it is the only keyboard:
   - set inputmode="none" on the bound field (stays editable; caret kept)
   - optional micro-blur+refocus so iOS drops a keyboard that already rose
   - Close × restores the previous inputmode and refocuses so the system keyboard returns
   Preference localStorage["rboard.preferOpen"]: if RBOARD was last used, the next focus
   re-opens it instead of QWERTY. Never stores typed text. */
(function(){"use strict";
 if(window.RBOARDSolo)return;
 const PREF="rboard.preferOpen";
 function preferGet(){try{return localStorage.getItem(PREF)==="1";}catch(_){return false;}}
 function preferSet(v){try{localStorage.setItem(PREF,v?"1":"0");}catch(_){}}
 function caretOf(el){return {s:el.selectionStart??(el.value||"").length,e:el.selectionEnd??(el.value||"").length};}
 function setCaret(el,c){try{if(typeof el.setSelectionRange==="function")el.setSelectionRange(c.s,c.e);}catch(_){}}
 let suppressing=false; // 1.0.4.37: re-entrancy guard; blur+focus below re-fires the focus listener, which called suppress again (RangeError loop)
 function suppress(el){
  if(suppressing)return;
  if(!(el instanceof HTMLInputElement||el instanceof HTMLTextAreaElement))return;
  suppressing=true;try{suppress0(el);}finally{suppressing=false;}
 }
 function suppress0(el){
  if(el.dataset.rboardPrevInputmode===undefined)
   el.dataset.rboardPrevInputmode=el.hasAttribute("inputmode")?el.getAttribute("inputmode"):"";
  const c=caretOf(el);
  const was=document.activeElement===el;
  el.setAttribute("inputmode","none");
  el.dataset.rboardSolo="1";
  // Drop a system keyboard that already appeared, then refocus with inputmode none so the caret stays.
  if(was){try{el.blur();}catch(_){ }}
  el.setAttribute("inputmode","none");
  el.focus({preventScroll:true});
  setCaret(el,c);
 }
 function restore(el){
  if(!(el instanceof HTMLInputElement||el instanceof HTMLTextAreaElement))return;
  const c=caretOf(el);
  // 1.0.4.33: RBOARD is the composer's keyboard; keep inputmode none on close so iOS QWERTY never rises. Caret kept.
  el.setAttribute("inputmode","none");
  delete el.dataset.rboardPrevInputmode;
  delete el.dataset.rboardSolo;
  setCaret(el,c);
  try{el.blur();}catch(_){ }
 }
 function parkOverlays(on,dock){
  if(on)document.documentElement.dataset.cryptoKeyboardOpen="true";
  else delete document.documentElement.dataset.cryptoKeyboardOpen;
  const pin=document.getElementById("thundr-pin");
  if(on){
   if(dock&&pin&&pin.parentElement!==dock){
    pin._rboardHome={parent:pin.parentNode,next:pin.nextSibling,left:pin.style.left,top:pin.style.top,right:pin.style.right,bottom:pin.style.bottom};
    dock.appendChild(pin);
    pin.style.left=pin.style.top=pin.style.right=pin.style.bottom="";
    pin.classList.add("rboard-docked");
   }
  }else if(pin&&pin._rboardHome){
   const h=pin._rboardHome;
   if(h.next&&h.next.parentNode===h.parent)h.parent.insertBefore(pin,h.next);
   else if(h.parent)h.parent.appendChild(pin);
   else document.body.appendChild(pin);
   pin.style.left=h.left;pin.style.top=h.top;pin.style.right=h.right;pin.style.bottom=h.bottom;
   pin.classList.remove("rboard-docked");
   delete pin._rboardHome;
  }
 }
 function bindFocus(el,api){
  if(!el||el.dataset.rboardSoloBound==="1")return;
  el.dataset.rboardSoloBound="1";
  // Arm after the first tick so HTML autofocus / first paint cannot open the keyboard.
  // After that, a user tap or focus on the composer opens RBOARD. No other control is required.
  var armed=false;
  setTimeout(function(){armed=true;},0);
  function requestOpen(){
   if(!armed||!api||typeof api.open!=="function")return;
   if(document.documentElement.dataset.cryptoKeyboardOpen==="true"){suppress(el);return;}
   suppress(el);api.open();
  }
  el.addEventListener("pointerdown",function(){armed=true;requestOpen();},true);
  el.addEventListener("focus",function(){
   if(document.documentElement.dataset.cryptoKeyboardOpen==="true"){suppress(el);return;}
   el.setAttribute("inputmode","none"); // 1.0.4.33: focus alone (Send / load) never shows QWERTY; a tap opens RBOARD
  },true);
 }
 window.RBOARDSolo={suppress,restore,preferGet,preferSet,parkOverlays,bindFocus,PREF};
})();

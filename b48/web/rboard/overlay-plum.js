/* RBOARD plum compact overlay for RDRAGON · add-only 20261109-t183u; solo-keyboard + dock 20261109-t195u.
   Mounts Shared/RBOARD/ext keyboard (R:\> · EN/ᜀ/Maya/#+ · Baybayin corners · NG · gold return)
   into a <dialog>. Inserts into the bound input; never submits/evals/network. */
(function(){"use strict";
 const base=new URL(".",document.currentScript.src);
 function loadJs(src){return new Promise((res,rej)=>{const s=document.createElement("script");s.src=src;s.onload=()=>res();s.onerror=()=>rej(Error(src));document.head.append(s);});}
 window.GhostrootKeyboard=window.GhostrootKeyboard||{};
 const prevMount=window.GhostrootKeyboard.mount;
 window.GhostrootKeyboard.mount=function(commandBar){
  if(!(commandBar instanceof HTMLInputElement||commandBar instanceof HTMLTextAreaElement))throw Error("Pass an input or textarea");
  if(commandBar.dataset.rboardPlum==="1")return {open(){},close(){},destroy(){}};
  commandBar.dataset.rboardPlum="1";
  // 20261110-v32: no ⌨ toggle. RBOARD opens from a tap on the bound field only.
  const dialog=document.createElement("dialog");dialog.className="grk-dialog grk-dialog-plum";dialog.setAttribute("aria-label","RBOARD plum keyboard");
  const head=document.createElement("div");head.className="grk-plum-head";
  const dock=document.createElement("div");dock.className="grk-plum-dock";dock.setAttribute("data-rboard-dock","1");
  const close=document.createElement("button");close.type="button";close.className="grk-close";close.textContent="Close ×";
  head.append(dock,close);
  const frame=document.createElement("iframe");frame.className="grk-plum-frame";frame.title="RBOARD";frame.setAttribute("sandbox","allow-scripts allow-same-origin");
  dialog.append(head,frame); // append only in open(); remove on dismiss so a closed dialog cannot peek. No ⌨ button.
  const page=new URL("ext/keyboard.html",base).href;
  frame.src=page;
  function insert(text){if(typeof text!=="string"||!text||text.length>16)return;const start=commandBar.selectionStart??commandBar.value.length;const end=commandBar.selectionEnd??start;const v=commandBar.value;commandBar.value=v.slice(0,start)+text+v.slice(end);const caret=start+text.length;try{commandBar.setSelectionRange(caret,caret);}catch(_){ }commandBar.dispatchEvent(new Event("input",{bubbles:true}));}
  function del(){const start=commandBar.selectionStart??commandBar.value.length;const end=commandBar.selectionEnd??start;if(start!==end){commandBar.value=commandBar.value.slice(0,start)+commandBar.value.slice(end);try{commandBar.setSelectionRange(start,start);}catch(_){}}else if(start>0){const v=[...commandBar.value];const i=Math.max(0,start-1);/* grapheme-ish */const left=commandBar.value.slice(0,start);const chars=[...left];if(!chars.length)return;const cut=chars.slice(0,-1).join("").length;commandBar.value=commandBar.value.slice(0,cut)+commandBar.value.slice(start);try{commandBar.setSelectionRange(cut,cut);}catch(_){}}commandBar.dispatchEvent(new Event("input",{bubbles:true}));}
  window.addEventListener("message",function onMsg(ev){if(ev.source!==frame.contentWindow)return;const m=ev.data||{};if(m&&m.rboardPlum){if(m.op==="insert")insert(m.text);else if(m.op==="delete")del();else if(m.op==="return"){dismiss();const f=commandBar.form;if(f){if(f.requestSubmit)f.requestSubmit();else f.dispatchEvent(new Event("submit",{cancelable:true,bubbles:true}));}}}});
  // Bridge: when iframe has no native handler, keyboard.js posts to echo only — inject a shim via onload
  frame.addEventListener("load",()=>{try{
    const w=frame.contentWindow;const d=frame.contentDocument;
    // Patch post() path: override webkit messageHandlers with parent bridge
    Object.defineProperty(w,"webkit",{configurable:true,value:{messageHandlers:{rboard:{postMessage:(msg)=>{parent.postMessage(Object.assign({rboardPlum:1},msg),"*");}}}}});
    // Re-run ready ping if needed
    if(w.RBOARDExt){/* already initialized before our define — reinject by evaluating post override earlier next time */}
  }catch(e){console.warn("RBOARD plum bridge",e);}});
  // Better: load a bridge script into iframe via srcdoc wrapper — use query param + patch keyboard.js instead.
  const Solo=()=>window.RBOARDSolo;
  const open=()=>{
   if(dialog.open){if(Solo())Solo().suppress(commandBar);return;}
   if(!dialog.isConnected)document.body.append(dialog);
   if(Solo()){Solo().preferSet(true);Solo().suppress(commandBar);Solo().parkOverlays(true,dock);}
   else{document.documentElement.dataset.cryptoKeyboardOpen="true";commandBar.setAttribute("inputmode","none");}
   dialog.showModal();
   if(Solo())Solo().suppress(commandBar);
   else commandBar.focus({preventScroll:true});
  };
  const dismiss=()=>{
   if(Solo()){Solo().preferSet(false);Solo().parkOverlays(false);Solo().restore(commandBar);}
   else{dialog.close();if(dialog.isConnected)dialog.remove();delete document.documentElement.dataset.cryptoKeyboardOpen;commandBar.removeAttribute("inputmode");commandBar.focus({preventScroll:true});return;}
   dialog.close();
   if(dialog.isConnected)dialog.remove();
  };
  close.onclick=dismiss;
  dialog.addEventListener("cancel",e=>{e.preventDefault();dismiss();});
  dialog.addEventListener("close",()=>{if(Solo())Solo().parkOverlays(false);else delete document.documentElement.dataset.cryptoKeyboardOpen;if(dialog.isConnected)dialog.remove();});
  if(Solo())Solo().bindFocus(commandBar,{open,close:dismiss});
  return {open,close:dismiss,destroy(){dismiss();if(dialog.isConnected)dialog.remove();}};
 };
})();

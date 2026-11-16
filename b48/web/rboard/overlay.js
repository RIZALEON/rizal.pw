/* Same-document native dialog + shadow component: no iframe/postMessage transport. */
(function(){"use strict";
 const base=new URL(".",document.currentScript.src);
 window.GhostrootKeyboard={mount(commandBar){
 if(!(commandBar instanceof HTMLInputElement||commandBar instanceof HTMLTextAreaElement))throw Error("Pass an input or textarea");
 const opener=document.createElement("button");opener.type="button";opener.className="grk-toggle";opener.textContent="⌨";opener.setAttribute("aria-label","Open RBOARD keyboard");
 const dialog=document.createElement("dialog");dialog.className="grk-dialog";dialog.setAttribute("aria-label","RBOARD Crypto Keyboard");
 const close=document.createElement("button");close.type="button";close.className="grk-close";close.textContent="Close ×";
 const component=document.createElement("div");component.className="grk-component";const shadow=component.attachShadow({mode:"open"});
 const style=document.createElement("link");style.rel="stylesheet";style.href=new URL("style.css",base).href;shadow.append(style);
 const content=document.createElement("div");content.innerHTML=RBOARD_TEMPLATE;shadow.append(content);
 dialog.append(close,component);document.body.append(dialog);commandBar.insertAdjacentElement("afterend",opener);
 const open=()=>{document.documentElement.dataset.cryptoKeyboardOpen="true";dialog.showModal();};
 const dismiss=()=>{dialog.close();delete document.documentElement.dataset.cryptoKeyboardOpen;opener.focus({preventScroll:true});};
 const transfer=text=>{if(typeof text!=="string"||text.length>100000)return;commandBar.value=text;commandBar.dispatchEvent(new Event("input",{bubbles:true}));dismiss();commandBar.focus({preventScroll:true});};
 initializeRboard(shadow,{transfer,close:dismiss});
 opener.onclick=open;close.onclick=dismiss;
 dialog.addEventListener("cancel",e=>{e.preventDefault();dismiss();});
 dialog.addEventListener("close",()=>{delete document.documentElement.dataset.cryptoKeyboardOpen;});
 dialog.addEventListener("click",e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dismiss();});
 return {open,close:dismiss,destroy(){dismiss();dialog.remove();opener.remove();}};
 }};
})();

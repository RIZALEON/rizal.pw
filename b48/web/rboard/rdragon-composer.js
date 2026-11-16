/* rdragon-composer.js · 1.0.4.33 (t176u/t177u/t178u)
   1. A tap anywhere inside the message box (#composer, except the + and Send buttons) opens RBOARD; the iOS keyboard is held off (inputmode=none, touch default prevented).
   2. Orange + (bot-sidebar calls window.DS_ADD_FILE) -> native "dsAttach" sheet: Photos · Files or Folder. Items are copied add-only into the app RKLOWD node
      folder (Documents/ЯLAB/RKLOWD/nodes/17e/attachments/…) and shown as chips. Nothing is uploaded. No native bridge (Mac/web) -> plain file input, chips only.
   3. Send and RBOARD return both go through the form's own submit, so the existing routers decide command vs conversation. Attachments ride along, then box + chips clear. */
(function(){"use strict";
 if(window.__dsComposer)return;window.__dsComposer=1;
 var pending=[];
 function $(s){return document.querySelector(s);}
 function native(){return !!(window.webkit&&window.webkit.messageHandlers&&window.webkit.messageHandlers.dsAttach);}
 function strip(){var s=$("#ds-attach");if(s)return s;var c=$("#composer");if(!c)return null;s=document.createElement("div");s.id="ds-attach";s.hidden=true;
  s.style.cssText="display:flex;flex-wrap:wrap;gap:6px;padding:4px 8px;font:12px system-ui;color:#efcf88";c.parentNode.insertBefore(s,c);return s;}
 function fmt(n){n=+n||0;return n>1048576?(n/1048576).toFixed(1)+" MB":n>1024?Math.round(n/1024)+" KB":n+" B";}
 function paint(){var s=strip();if(!s)return;s.textContent="";s.hidden=!pending.length;s.style.display=pending.length?"flex":"none";
  pending.forEach(function(a,i){var b=document.createElement("span");b.className="ds-attach-chip";
   b.style.cssText="border:1px solid #a8864f;border-radius:10px;padding:2px 8px;background:#392340;display:inline-flex;gap:6px;align-items:center";
   b.textContent=(a.kind==="folder"?"📁 ":"📎 ")+a.name+" · "+(a.kind==="folder"?a.files+" files, ":"")+fmt(a.bytes);
   var x=document.createElement("button");x.type="button";x.textContent="×";x.setAttribute("aria-label","Remove "+a.name);
   x.style.cssText="background:none;border:0;color:inherit;font:inherit;padding:0 2px";x.onclick=function(){pending.splice(i,1);paint();};b.append(x);s.append(b);});}
 window.DS_ATTACHED=function(items){(items||[]).forEach(function(a){if(a&&a.name)pending.push(a);});paint();};
 window.DS_ATTACHMENTS=function(){return pending.slice();};
 var fileIn=null;
 window.DS_ADD_FILE=function(){
  if(native()){window.webkit.messageHandlers.dsAttach.postMessage({op:"pick"});return;}
  if(!fileIn){fileIn=document.createElement("input");fileIn.type="file";fileIn.multiple=true;fileIn.hidden=true;document.body.append(fileIn);
   fileIn.onchange=function(){Array.prototype.forEach.call(fileIn.files||[],function(f){pending.push({name:f.name,kind:"file",bytes:f.size,files:1,rel:""});});fileIn.value="";paint();};}
  fileIn.click();
 };
 function isCmd(v){return /^\s*[\/:]/.test(v)||/^\s*(rkrypt|rgen)\b/i.test(v);}
 function attachLine(){return pending.map(function(a){return "["+(a.kind==="folder"?"folder":"file")+": "+a.name+(a.rel?" → "+a.rel:"")+"]";}).join(" ");}
 function wire(){
  var c=$("#composer"),m=$("#message");if(!c||!m||c.dataset.dsComposer==="1")return!!(c&&m);c.dataset.dsComposer="1";
  m.setAttribute("inputmode","none");m.setAttribute("enterkeyhint","send");if(m.placeholder==="Message your bot")m.placeholder="R:\\> Message your bot"; /* 1.0.4.34 prompt hint */
  function inBox(t){return t&&t.closest&&t.closest("#composer")&&!t.closest("button");}
  function openRB(){var api=window.RBOARD_API;if(api&&typeof api.open==="function"){api.open();return true;}return false;}
  // touchstart default prevented on iOS = no native focus, no native keyboard; RBOARD then focuses the field itself with inputmode none.
  c.addEventListener("touchstart",function(e){if(!inBox(e.target))return;if(window.RBOARD_API){e.preventDefault();openRB();}},{capture:true,passive:false});
  c.addEventListener("pointerdown",function(e){if(!inBox(e.target))return;if(e.pointerType==="mouse")return;openRB();},true);
  c.addEventListener("click",function(e){if(!inBox(e.target))return;openRB();},true);
  // Send (and RBOARD return, which calls requestSubmit) -> attach files before the existing routers read #message.
  document.addEventListener("submit",function(e){if(e.target!==c)return;var v=m.value;
   if(pending.length){window.DS_LAST_ATTACHMENTS=pending.slice();
    if(!isCmd(v)){m.value=(v.trim()?v+"\n":"")+attachLine();}
    document.dispatchEvent(new CustomEvent("ds-attachments",{detail:{text:v,command:isCmd(v),items:window.DS_LAST_ATTACHMENTS}}));
    pending=[];paint();}
   setTimeout(function(){if(m.value===v||m.value.indexOf(attachLine())>=0)m.value="";},0);
  },true);
  return true;
 }
 if(!wire()){document.addEventListener("DOMContentLoaded",wire);var n=0,t=setInterval(function(){if(wire()||++n>40)clearInterval(t);},250);}
})();

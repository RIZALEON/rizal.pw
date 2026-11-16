/* RDRAGON 1.0.4.31 · RWALLET layer (not cold-start) — 20261105 shell-first + no-pill.
   REAL RDRAGON interface = Neo/17e window-shell (ENGINE/MIND web 1.0.4.25 black shell).
   Signing / wallet / mint are a LAYER via explicit tap only (Wallet / + Mint / RMAIL Approve).
   Does NOT force #rw open on launch. Does NOT inject #rw-b4 BLOCK 4 banner.
   Does NOT paint floating Я MINT / Я RWALLET / R MINT gold pill.
   Face ID mint stays RMAIL Approve → ASSM RWALLET Face ID only. */
(function(){"use strict";
var K="rdragon.csp.v2.rwallet";
function stripBanner(){
  var b=document.getElementById("rw-b4");if(b&&b.parentNode)b.parentNode.removeChild(b);
}
function killPill(){
  var t=document.getElementById("rd1045-tab");
  if(t&&t.parentNode)t.parentNode.removeChild(t);
}
function clearMintCover(){
  try{var st=JSON.parse(localStorage.getItem(K))||{};st.mint=false;localStorage.setItem(K,JSON.stringify(st))}catch(e){}
}
function show(){
  var rw=document.getElementById("rw");if(!rw)return;
  rw.style.display="block";rw.classList.remove("rw-hide");
  try{
    var touch=matchMedia("(max-width:700px), (hover:none) and (pointer:coarse)").matches;
    if(touch){
      rw.style.left="0";rw.style.right="0";rw.style.top="0";rw.style.bottom="0";
      rw.style.width="100%";rw.style.maxHeight="100vh";rw.style.zIndex="9500";
    }
  }catch(e){}
  stripBanner();killPill();
  if(window.RWALLET)RWALLET.render();
  var p=document.getElementById("rd1045");if(p)p.style.display="none";
}
function hide(){
  var rw=document.getElementById("rw");if(!rw)return;
  rw.style.display="none";rw.classList.add("rw-hide");
}
function toggle(){
  var rw=document.getElementById("rw");if(!rw)return;
  if(rw.style.display==="none"||rw.classList.contains("rw-hide")||getComputedStyle(rw).display==="none")show();
  else hide();
}
function load(){
  clearMintCover();
  stripBanner();
  killPill();
  var rw=document.getElementById("rw");
  if(rw){rw.style.display="none";rw.classList.add("rw-hide");}
  window.RDRAGON_RWALLET_LAYER={show:show,hide:hide,toggle:toggle,version:"1.0.4.31-shell-nopill"};
  /* re-kill if rdragon-1045.js appends late */
  setTimeout(killPill,0);setTimeout(killPill,500);setTimeout(killPill,2000);
}
document.readyState==="complete"?load():window.addEventListener("load",load);
})();

/* egg rdragon-label 0.1.0: keep shell header + composer placeholder + doc title = RDRAGON. Labels only; no chips/footer/organs touched. */
(function(){var N="RDRAGON",RX=/DRAGON\s?SKULL|DRAGOSKUL/g;
function fix(){try{var t=document.getElementById("chat-title");if(t&&RX.test(t.textContent)){RX.lastIndex=0;t.textContent=t.textContent.replace(RX,N);}RX.lastIndex=0;
var m=document.getElementById("message");if(m&&m.placeholder&&RX.test(m.placeholder)){RX.lastIndex=0;m.placeholder=m.placeholder.replace(RX,N);}RX.lastIndex=0;
if(RX.test(document.title)){RX.lastIndex=0;document.title=document.title.replace(RX,N);}RX.lastIndex=0;}catch(e){}}
var q=0;function sched(){if(q)return;q=1;requestAnimationFrame(function(){q=0;fix();});}
function go(){fix();new MutationObserver(sched).observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["placeholder"]});}
document.readyState==="loading"?document.addEventListener("DOMContentLoaded",go):go();})();

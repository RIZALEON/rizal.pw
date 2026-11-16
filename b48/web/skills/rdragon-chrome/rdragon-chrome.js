/* egg rdragon-chrome 0.1.1: macOS RDRAGON shell draws traffic lights + native title "RDRAGON" (x≈82–153pt, h 28pt) over the web view (transparent titlebar).
   Keep native title; push sidebar content below the 32px strip, and clear it from the header when the sidebar is collapsed. macOS native shell only. THUNDR untouched. */
(function(){function on(){var y=window.yabowzr||{},w=window.webkit&&window.webkit.messageHandlers;
if(!(y.__native||w)||!/Mac/.test(navigator.platform||navigator.userAgent)||/iPhone|iPad/.test(navigator.userAgent))return;
if(document.getElementById("rdragon-chrome"))return;var s=document.createElement("style");s.id="rdragon-chrome";
s.textContent="body.ds aside#roster{padding-top:34px!important}body.ds.ds-nav-collapsed #bot-hero{padding-left:160px!important}";
(document.head||document.documentElement).appendChild(s);document.documentElement.classList.add("rdragon-mac");}
try{on();document.addEventListener("DOMContentLoaded",on);window.addEventListener("load",on);}catch(e){}})();

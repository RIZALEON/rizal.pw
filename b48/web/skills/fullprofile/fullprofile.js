/* fullprofile 20261104 (pt85u): ☰ opens the CryptoSocial profile drawer full-screen; GHOSTMACHINE tab stays on top and returns to home chat.
   ThundR pin docked top-left under the header on home, hidden while the profile is open. Add-only; no other files touched. */
(function(){
 if(window.__fullprofile)return;window.__fullprofile=1;
 var s=document.createElement("style");s.id="fullprofile-css";
 s.textContent="body.ds-menu aside#roster{width:100vw!important;max-width:none!important;right:0!important;height:100%!important;box-shadow:none!important;z-index:2147483100!important}"+
  "body.ds-menu aside#roster>*{max-width:none!important}body.ds-menu #csp-panel{width:100%!important;max-width:none!important;box-sizing:border-box}"+
  "#rmail-ui{z-index:2147483300!important}body.ds-menu #gm-tab{z-index:2147483200!important}body.ds-menu #thundr-pin{display:none!important}"+
  "#thundr-pin{left:8px!important;top:calc(env(safe-area-inset-top) + 64px)!important;right:auto!important;bottom:auto!important}";
 (document.head||document.documentElement).appendChild(s);
 // GHOSTMACHINE tab: when the profile is open, close it and go home (don't toggle the GM sidebar)
 document.addEventListener("click",function(e){var t=e.target&&e.target.closest&&e.target.closest("#gm-tab");
  if(t&&document.body.classList.contains("ds-menu")){e.stopImmediatePropagation();e.preventDefault();document.body.classList.remove("ds-menu");
   var g=document.getElementById("gm-sidebar");if(g)g.classList.remove("on");}},true);
})();

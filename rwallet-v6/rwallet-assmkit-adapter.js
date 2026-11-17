/* rwallet-assmkit-adapter.js v1 (20261116, add-only) — ЯWALLET 0.1.5 ⇄ ASSMKit sign-in.
 * Listens for the window CustomEvent "rlogin-session" (sent by ASSMKitBridge.sessionEventScript /
 * assm/login/rlogin-strip.js) and hands the signed-in session to the wallet through
 * window.RASSM.card() and localStorage "rassm.card", which rwallet-ghost2.js profileCard()/ridFromSession() read.
 * Public fields only: handle, app, deviceApproved, at. Never stores tokens, keys, passwords or profile ids.
 * Keeps any existing card fields (rid, profile, linked_card from vendor/rassm.js). Never signs, mints or sends. */
(function(w){"use strict";if(!w||w.RWALLET_ASSMKIT_ADAPTER)return;var K="rassm.card";
function read(){try{return JSON.parse(w.localStorage.getItem(K)||"null")}catch(e){return null}}
function write(c){try{w.localStorage.setItem(K,JSON.stringify(c))}catch(e){}return c}
function H(raw){var h=String(raw==null?"":raw).trim().replace(/^@+/,"");return h?"@"+h.toLowerCase():""}
function onSession(ev){var d=(ev&&ev.detail)||{},c=read()||{schema:"ya.assm-profile.v1",card:"ASSM PROFILE CARD"};
 if(d.out||!d.handle){c.session={signedIn:false,at:new Date().toISOString()};write(c);fire(c);return}
 var h=H(d.handle);c.handle=h||c.handle||"";
 c.session={signedIn:true,handle:h,app:String(d.app||""),deviceApproved:d.deviceApproved===true,at:String(d.at||new Date().toISOString())};
 write(c);fire(c)}
function fire(c){try{w.dispatchEvent(new CustomEvent("rwallet:assm-session",{detail:{handle:c.handle||"",session:c.session||null}}))}catch(e){}}
function card(){return read()}
if(!w.RASSM||typeof w.RASSM.card!=="function"){w.RASSM=w.RASSM||{};w.RASSM.card=card}
w.addEventListener("rlogin-session",onSession);
w.RWALLET_ASSMKIT_ADAPTER={version:"1",card:card,event:"rlogin-session"};
})(typeof window!=="undefined"?window:null);

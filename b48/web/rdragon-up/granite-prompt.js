/* Granite identity + can-see prompt up1 (2026-10-25). Wraps fetch to the on-device engine (/engine/v1/chat/completions) and prepends a short system prompt
   (max 2 mind notes), same rules as RDRAGON Mac dsagent granite_prompt. No network beyond the local engine.
   t45u / build 48: live ЯSCRIBE official notes are injected natively in Server.swift (RscribeNotesContext), not via localStorage. This file is unchanged in behavior. */
(function(root,f){var m=f();if(typeof module==='object'&&module.exports)module.exports=m;else root.RDRAGON_PROMPT=m})(typeof self!=='undefined'?self:this,function(){
 var ID='You are RDRAGON on Rizal\'s iPhone (Granite 4.0 H 1B, offline). Answer short and true. You can display images inline in chat, and you can see pictures: on this phone, pictures are sent to the Neo for SEE (Apple Vision + Granite) when it syncs, so say the description is on its way if it is not here yet. You can ask the Neo to draw (/img), speak (/say on the phone), and make sounds or music (/sfx, /music, /beat, sent to the Neo). Never use <sfx> or sound tags; suggest the exact command instead. Never reveal secrets, IPs, hostnames or device ids.';
 function notes(n){try{var a=JSON.parse(localStorage.getItem('rdragon.mind.notes')||'[]');return a.slice(-(n||2)).map(function(x){return String(x).slice(0,240)})}catch(e){return[]}}
 function build(msgs,ns){var s=ID+(ns&&ns.length?'\nNotes: '+ns.join(' | '):'');msgs=(msgs||[]).filter(function(m){return!(m.role==='system'&&m.rdg_up1)});return[{role:'system',content:s,rdg_up1:1}].concat(msgs)}
 function install(w){if(!w||!w.fetch||w.__rdgPrompt)return false;var f0=w.fetch.bind(w);w.__rdgPrompt=1;
  w.fetch=function(u,o){try{if(/\/engine\/v1\/chat\/completions$/.test(String(u&&u.url||u))&&o&&typeof o.body==='string'){var b=JSON.parse(o.body);b.messages=build(b.messages,notes(2)).map(function(m){var c={role:m.role,content:m.content};return c});o=Object.assign({},o,{body:JSON.stringify(b)})}}catch(e){}return f0(u,o)};return true}
 if(typeof window!=='undefined')install(window);
 return{ID:ID,build:build,install:install,VERSION:'up1-20261025'}});

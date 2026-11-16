/* rdragon-mesh-status.js (iOS b42)
 * Read-only GET of the RBOT LXMF converter status into ThundR only — never the composer.
 * Host is empty by default (Rizal fills it in). Default port 8794, path /rmesh/v1/status.
 * Port may be overridden to 8795-8799. No auth. No hardcoded LAN IPs.
 * window.RDRAGON_MESH_CONVERTER_URL, if set, is used as the full URL (still not baked with an IP here).
 * rvm.state "paused" is amber, not an error. Per-device reachable status is shown in ThundR.
 */
(function(){
  "use strict";
  if (window.RDRAGON_MESH_STATUS) return;
  window.RDRAGON_MESH_STATUS = true;
  if (typeof window.RDRAGON_MESH_CONVERTER_HOST === "undefined") window.RDRAGON_MESH_CONVERTER_HOST = "";
  if (typeof window.RDRAGON_MESH_CONVERTER_PORT === "undefined") window.RDRAGON_MESH_CONVERTER_PORT = 8794;
  if (typeof window.RDRAGON_MESH_CONVERTER_PATH === "undefined") window.RDRAGON_MESH_CONVERTER_PATH = "/rmesh/v1/status";
  if (typeof window.RDRAGON_MESH_CONVERTER_URL === "undefined") window.RDRAGON_MESH_CONVERTER_URL = "";

  function say(msg, kind){
    var payload = {from:"MESH", kind: kind||"mesh", text: msg, display: msg, amber: kind==="amber"};
    function targets(){var ts=[],seen=[];function add(x){if(!x||seen.indexOf(x)>=0)return;seen.push(x);ts.push(x)}add(window);try{if(window.parent&&window.parent!==window)add(window.parent)}catch(e){}try{if(window.top&&window.top!==window)add(window.top)}catch(e){}return ts}
    var tgs=targets(),i,t,doc,log,div,sent=false;
    for(i=0;i<tgs.length;i++){t=tgs[i];try{if(typeof t.THUNDR_SHELL_PUSH==="function"){t.THUNDR_SHELL_PUSH(payload);sent=true;break}}catch(e){}}
    if(!sent){for(i=0;i<tgs.length;i++){t=tgs[i];try{if(typeof t.RL_THUNDR_SAY==="function"){t.RL_THUNDR_SAY({organ:"mesh",kind:"status",state:kind==="amber"?"paused":(kind||"ok"),text:msg});sent=true;break}}catch(e){}try{if(t.RL_THUNDR&&t.RL_THUNDR.bus&&typeof t.RL_THUNDR.bus.emit==="function"){t.RL_THUNDR.bus.emit({organ:"mesh",kind:"status",state:kind==="amber"?"paused":(kind||"ok"),text:msg});sent=true;break}}catch(e){}}}
    if(!sent){for(i=0;i<tgs.length;i++){try{doc=tgs[i].document;log=doc&&doc.querySelector&&doc.querySelector("#th-chat .log");if(log){div=doc.createElement("div");div.setAttribute("data-mesh-status",kind||"ok");div.appendChild(doc.createTextNode(msg));log.appendChild(div);sent=true;break}}catch(e){}}}
  }

  function allowedPort(p){
    p = parseInt(p, 10);
    if (p === 8794) return 8794;
    if (p >= 8795 && p <= 8799) return p;
    return 8794;
  }

  function resolveUrl(){
    var u = (window.RDRAGON_MESH_CONVERTER_URL || "").trim();
    if (u) return u;
    var host = (window.RDRAGON_MESH_CONVERTER_HOST || "").trim();
    if (!host) return "";
    var port = allowedPort(window.RDRAGON_MESH_CONVERTER_PORT);
    var path = window.RDRAGON_MESH_CONVERTER_PATH || "/rmesh/v1/status";
    if (path.charAt(0) !== "/") path = "/" + path;
    return "http://" + host + ":" + port + path;
  }

  function format(j){
    var lines = [];
    var rvm = j && j.rvm || {};
    var st = rvm.state || "?";
    var amber = st === "paused";
    lines.push("mesh: rvm " + st + (rvm.node ? (" · " + rvm.node) : "") + (amber ? " (paused)" : ""));
    (j && j.devices || []).forEach(function(d){
      var name = (d && d.name) || "?";
      var reach = d && d.reachable ? "reachable" : "unreachable";
      var hops = (d && d.hops != null) ? (" hops " + d.hops) : "";
      var via = (d && d.via) ? (" via " + d.via) : "";
      lines.push("mesh: " + name + " " + reach + hops + via);
    });
    return {text: lines.join("\n"), amber: amber, ok: !!(j && j.ok)};
  }

  function poll(){
    var url = resolveUrl();
    if (!url) return; /* disabled until Rizal fills in the host or URL */
    fetch(url, {method:"GET", cache:"no-store", credentials:"omit"}).then(function(r){
      if (!r.ok) throw new Error("http " + r.status);
      return r.json();
    }).then(function(j){
      var f = format(j);
      say(f.text, f.amber ? "amber" : (f.ok ? "ok" : "warn"));
    }).catch(function(){ /* converter down: stay quiet; never write the composer */ });
  }

  window.RDRAGON_MESH_STATUS_REFRESH = poll;
  if (resolveUrl()) poll();
})();

/* ЯSYNC default-off guard (rdragon-components-20261026). Loaded right after rdragon-config.js, before rsync-core.js.
   The public site never writes to any relay unless this browser has opted in (localStorage "rsync.enabled" = "1").
   Off = no peers and no loopback routes are handed to the RSYNC client; export/import of bundles by file still works. */
(function(w){"use strict";var on=false;try{on=w.localStorage.getItem("rsync.enabled")==="1"}catch(e){}
var c=w.RDRAGON_CONFIG=w.RDRAGON_CONFIG||{};c.rsyncEnabled=on;if(!on){c.peers=[];c.localPeers=[];c.privatePeersUrl="";w.RDRAGON_PRIVATE_PEERS=[]}})(window);

/* rnetwork-config.js v1 20261104 - PUBLIC network config baked into RDRAGON (no keys). Config only; never starts/stops rnsd or the RVM.
   20261115: RWALLET trusted-devices.json loads the bundled copy first (sha256-checked) for the verified display only; rizal.pw is fallback. Never unlocks or signs. */
(function(w){var c={v:1,
 transponder:{relay:"http://127.0.0.1:8797/send",queue:"GHOSTMACHINE-TRANSPONDER/SIGNAL-QUEUE",
   hashes:{transponder:"2b5452ef21bbe620b0f59506445c71cd","rvm-1fcf5532":"c64f75ffba4437eb31e22918cf1d76be"}},
 reticulum:{public_relays:[{host:"rmap.world",port:4242,type:"TCPClientInterface"},{host:"rns.beleth.net",port:4242,type:"TCPClientInterface"}]},
 rklowd:{inbox:"RKLOWD/RMAIL/<addr>/",index:"RKLOWD/RMAIL/index.json",forwarder:"RKLOWD/RMAIL/rmail_sync.py"},
 rwallet:{trusted:"rwallet-shared/rwallet/data/trusted-devices.json",
   trustedAlt:["ghost-machine/site/rwallet/data/trusted-devices.json","/rwallet/data/trusted-devices.json"],
   trustedRemote:"https://rizal.pw/rwallet/data/trusted-devices.json"}};
 w.RNETWORK=c; if(!w.RMAIL_RVM_NODE)w.RMAIL_RVM_NODE="rvm-1fcf5532"; if(!w.RMAIL_RVM_TO)w.RMAIL_RVM_TO="owner-iphone"; if(!w.RMAIL_RNS_TO)w.RMAIL_RNS_TO=c.transponder.hashes.transponder;
 if(!w.RMAIL_RELAY)w.RMAIL_RELAY=c.transponder.relay; if(!w.RWALLET_TRUSTED_URL)w.RWALLET_TRUSTED_URL=c.rwallet.trusted;
 if(!w.RWALLET_TRUSTED_REMOTE)w.RWALLET_TRUSTED_REMOTE=c.rwallet.trustedRemote;
 if(!w.RWALLET_TRUSTED_URLS)w.RWALLET_TRUSTED_URLS=[c.rwallet.trusted].concat(c.rwallet.trustedAlt||[]);
})(window);

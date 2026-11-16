# ЯFORGE bundle · RSCALE + RGENERATOR + RKRYPT · 2026-10-25 MT
Functional, tested copy. No founder package, passwords, keys, ЯCASKET or secrets inside. Not an egg, not on the appcast (ЯBAT owns those).

- rkrypt/rkrypt.rzl.js — RKRYPT 0.1.0 + RGENERATOR fused (egg5 mint.js/rkey0.js signed, Ghost Chain 258; egg6 passkey + rkrypt.js are UNSIGNED drafts). sha256 dd5d306f6fc80740eaf9cdaac809a562e6c445742ef696120f08e3bb88936730
  - test: node -e "require('./rkrypt/rkrypt.rzl.js').rgen.verify().then(v=>console.log(v.text))"  → RGEN verify: PASS
- rscale/bin/{darwin-arm64,linux-arm64,linux-amd64}/ — rscale-server (Headscale v0.29.5 fork), rscaled, rscale (client 1.104.2-dev20261024), rrelay
- rscale/*.yaml, acl.rsync.hujson, peers.rscale.json, neo.transponder.rscale.config.json, tls-front.js, config/ — ЯSYNC over RSCALE/ЯNETWORK
- rscale/check-staged.sh (safe configtest in a temp dir), go-1-coordinator-home.sh, go-2-join-neo.sh, go-3-pixel.sh — STAGED; nothing started. Starting needs Rizal's GO.
- CryptoSocial (rizal.pw) ships the same rkrypt.rzl.js in-app (commit 467f09a).

Verify everything: shasum -a 256 -c BUNDLE-SHA256.txt

## sha256
```
607a9a92e5fd61d1514ac431ebfa54f95440114606606f32b4140066bbf52568  ./rkrypt/FUSED-README.md
dd5d306f6fc80740eaf9cdaac809a562e6c445742ef696120f08e3bb88936730  ./rkrypt/rkrypt.rzl.js
e77c52635a2043a215a2905d3cf5288562acdf119a32bc8fd794d45b542c9fd8  ./rscale/LICENSE.headscale
a7ca6186a7963a0a60740f6047760eecd7a0234e8c38bd7e1e0bbcb324bda45b  ./rscale/LICENSE.tailscale
debc5ca73d082a6c7de743fecdba6f75deafdf9200acfbddeb8ca32d66e6e128  ./rscale/PATENTS.tailscale
7e73e08801baa63c440521acaf61554175b0a01da448943bd7a441bd066beda6  ./rscale/acl.rsync.hujson
efc41f3b1fb75eba158402c1c6aa26f48154fc1ce3558a86915b295b8ac810ae  ./rscale/bin/darwin-arm64/rrelay
adcaf90474012574b571abdb5c919bc5dba0b0a1cb622b8510817c258ef58aa4  ./rscale/bin/darwin-arm64/rscale
d8d3c2eb5a9d53888766c1be825c11aba9a630a064ed2bb5c356e72f55441cfe  ./rscale/bin/darwin-arm64/rscale-server
f739c80e39bb164893edffc22f6f346e1765853b33e0943fc9af9c6af8edb23d  ./rscale/bin/darwin-arm64/rscaled
a707e2de76d6a41a6a803491cfe7e2d667621ecc3a98451ef84dcd7ae600b565  ./rscale/bin/linux-amd64/rrelay
c0f00fdb1b84d3a8808a5eb25c0f8ebf50d00a3e2ec20284987c19f9cf00306d  ./rscale/bin/linux-amd64/rscale
b5b3d2665a380b7bab216f0ee71408f27a5c2f8112606e225cc02c0013ec6960  ./rscale/bin/linux-amd64/rscale-server
5fed945fc5510db4abfef7a253e3b3e3daf5bc545622eca1773d5318136db2c6  ./rscale/bin/linux-amd64/rscaled
2d5f57be378b9ddde448235e02bac4c6bbcdb3b89e5ed8b6236460a2ef32f672  ./rscale/bin/linux-arm64/rrelay
49c001b939ab193042f296fda1b0da45da862cc9b20f36bbc11fab13875c2c18  ./rscale/bin/linux-arm64/rscale
1ba9f400993d30203d3f6c04b2c3eac3b4e493827f13403601953425d5d25fe1  ./rscale/bin/linux-arm64/rscale-server
c9cdeff2d4c0972e4fd91b2a2456e21a548c28dbc427f44ed57bc22334b4c85b  ./rscale/bin/linux-arm64/rscaled
e625056adfbc7830ab32cdb92bf44300fc6299425f9859b0df4197e6159439f4  ./rscale/check-staged.sh
752a396adf236188a0d77be33543d50b16011e7baf01c8bda6484e00974fa850  ./rscale/config/acl.hujson
277217e2e65fcbd685f32ad0705ed0c8947c5b7433178fcbea8ed52eb54da374  ./rscale/config/derpmap.extra.yaml
16328d804795e88eec0a2294c4bbf8af1fe50b390874e60b69d4e4948d95d82e  ./rscale/config/derpmap.pixelhub.legacy.yaml
557196c5260fb8f1d96dd07e96b36727b2c80407d13fecd9b68a8e131d035b71  ./rscale/config/rscale.template.yaml
2d126e63d739972bdf2287833872dfe4a0420e1aa2b5497249a2a15c1a6ffb99  ./rscale/config/rvpn-node.json
191cd56bc5f91005d482aea71f7c836e2db7ecaa77d06dbb3a1ce68977e6d545  ./rscale/go-1-coordinator-home.sh
041cf1ed05bf012f05b4535a4b21d6a71784400c2421117cc60adba1f42210c9  ./rscale/go-2-join-neo.sh
9afc0c67fdeed318e4cd04adc0d56169cce72ba13061ec78d529ed71644b2955  ./rscale/go-3-pixel.sh
c177176a901a0ca2aed184740460fc639951585886d55d93346215cf7e46a184  ./rscale/neo.transponder.rscale.config.json
ab61d114c9a66313f88aa845465a7ce32790c2117705b06d846fa6d19dbe5042  ./rscale/peers.rscale.json
48cd8feb0e8e29ca9e5d8d911b5834f8c93ef8307e22a6dfff5f0b7faa141ef1  ./rscale/rscale.away.yaml
e6cc8a3ae03cfaa5b72f8cb4b3ca14038045ba75ef172f03626e192fa0202464  ./rscale/rscale.home.yaml
44238964107408d6b719d4a8b8cef24e33229085f358d2b895023d86b5193afd  ./rscale/rscalectl
1bd7aeadb6d88ea0671c9f8efb502057bdb4bd169383867da4615e8727f6233d  ./rscale/tls-front.js
```

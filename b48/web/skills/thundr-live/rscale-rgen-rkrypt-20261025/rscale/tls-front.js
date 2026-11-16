// ЯSYNC HTTPS front for browsers on https://rizal.pw. Binds 127.0.0.1:8800 ONLY.
// Reached from the RSCALE mesh because userspace rscaled forwards mesh:8800 → 127.0.0.1:8800.
// Not reachable from the LAN or the internet. Proxies to the peer at 127.0.0.1:8799.
// Cert/key paths come from env (LE cert for sync.rizal.pw, issued by DNS-01); this file holds no secrets.
'use strict';
const https=require('https'),http=require('http'),fs=require('fs');
const CERT=process.env.RSYNC_TLS_CERT,KEY=process.env.RSYNC_TLS_KEY;
const PORT=+process.env.RSYNC_TLS_PORT||8800,UP=+process.env.RSYNC_PEER_PORT||8799;
if(!CERT||!KEY){console.error('set RSYNC_TLS_CERT and RSYNC_TLS_KEY');process.exit(2)}
const opts=()=>({cert:fs.readFileSync(CERT),key:fs.readFileSync(KEY),minVersion:'TLSv1.2'});
const srv=https.createServer(opts(),(q,r)=>{
  const p=http.request({host:'127.0.0.1',port:UP,path:q.url,method:q.method,headers:Object.assign({},q.headers,{'x-forwarded-proto':'https'})},u=>{r.writeHead(u.statusCode,u.headers);u.pipe(r)});
  p.on('error',()=>{if(!r.headersSent)r.writeHead(502);r.end('peer down')});q.pipe(p)});
process.on('SIGHUP',()=>{try{srv.setSecureContext(opts());console.log('cert reloaded')}catch(e){console.error(e.message)}});
srv.listen(PORT,'127.0.0.1',()=>console.log('ЯSYNC TLS front https://127.0.0.1:'+PORT+' → 127.0.0.1:'+UP));

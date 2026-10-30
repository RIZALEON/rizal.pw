/* rizal.pw offline service worker — RFORGE 20261026 · gm-tweets. Precaches site, engine, IBM Granite weights. */
/* cache botlatch20261029-openapp · fresh20261029: html/js/json/css revalidate (no-cache) so a deploy shows at once, not after the 10-min HTTP cache */
function fresh(u){return /(\/|\.html|\.js|\.json|\.css)$/.test(u.pathname)}
var M='/sw-precache.json';
/* swfix 20261029: browsers only install a new SW when sw.js bytes change. SWV must equal sw-precache.json "v" (CI test) so every precache bump ships a new SW. */
var SWV='ledger20261029-sw-race-pack';
/* offline-granite fix 20261026: model manifests are precached with the core; the large weight parts (~222 MB) are cached
   (1) when the page's engine first fetches them online (fetch handler, held by waitUntil), and
   (2) by a waitUntil-held background fill when the page posts {t:'cache-models'} (sw-register.js). Install is never blocked on them. */
var MC='rizalpw-models';function isPart(f){return f.indexOf('/models/')>=0&&/\/part\d+$/.test(f)}
function fillModels(){return fetch(M,{cache:'no-cache'}).then(function(r){return r.json()}).then(function(m){return caches.open(MC).then(function(c){
 return m.files.filter(isPart).reduce(function(p,f){return p.then(function(){return c.match(f).then(function(h){if(h)return;return fetch(f).then(function(r){if(r.ok&&r.status===200)return c.put(f,r)})}).catch(function(){})})},Promise.resolve())})})}
self.addEventListener('message',function(e){if(e.data&&e.data.t==='cache-models')e.waitUntil(fillModels().catch(function(){}))});
self.addEventListener('install',function(e){e.waitUntil(fetch(M,{cache:'no-cache'}).then(function(r){return r.json()}).then(function(m){return caches.open('rizalpw-'+m.v).then(function(c){
 var core=m.files.filter(function(f){return !isPart(f)}),big=m.files.filter(isPart);
 return Promise.all(core.map(function(f){return c.add(f).catch(function(){})})).then(function(){big.forEach(function(f){c.add(f).catch(function(){})})});
})}).then(function(){self.skipWaiting()}))});
/* openended 20261028: drop stale precaches (old bundles kept firing :8811), keep current + models */
self.addEventListener('activate',function(e){e.waitUntil(fetch(M,{cache:'no-cache'}).then(function(r){return r.json()}).then(function(m){return caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return /^rizalpw-/.test(k)&&k!==MC&&k!=='rizalpw-'+m.v}).map(function(k){return caches.delete(k)}))})}).catch(function(){}).then(function(){return self.clients.claim()}))});
self.addEventListener('fetch',function(e){var q=e.request;if(q.method!=='GET')return;var u=new URL(q.url);if(u.origin!==location.origin)return;
 if(u.pathname.indexOf('/api/')===0)return;
 var k=u.pathname.replace(/\/$/,'/index.html');
 if(isPart(u.pathname)){e.respondWith(caches.match(u.pathname,{ignoreSearch:true}).then(function(h){return h||fetch(q).then(function(r){if(r.ok&&r.status===200){var cl=r.clone();e.waitUntil(caches.open(MC).then(function(c){return c.put(u.pathname,cl)}).catch(function(){}))}return r})}));return}
 e.respondWith((fresh(u)?fetch(u.href,{cache:'no-cache',credentials:'same-origin'}).catch(function(){return fetch(q)}):fetch(q)).then(function(r){return r}).catch(function(){return caches.match(k,{ignoreSearch:true}).then(function(h){return h||caches.match(u.pathname,{ignoreSearch:true})||Response.error()})}));});

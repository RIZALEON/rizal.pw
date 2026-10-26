/* rizal.pw offline service worker — RFORGE 20261026. Precaches site, engine, IBM Granite weights. */
var M='/sw-precache.json';
self.addEventListener('install',function(e){e.waitUntil(fetch(M,{cache:'no-cache'}).then(function(r){return r.json()}).then(function(m){return caches.open('rizalpw-'+m.v).then(function(c){
 var core=m.files.filter(function(f){return f.indexOf('/models/')<0}),big=m.files.filter(function(f){return f.indexOf('/models/')>=0});
 return Promise.all(core.map(function(f){return c.add(f).catch(function(){})})).then(function(){big.forEach(function(f){c.add(f).catch(function(){})})});
})}).then(function(){self.skipWaiting()}))});
self.addEventListener('activate',function(e){e.waitUntil(self.clients.claim())});
self.addEventListener('fetch',function(e){var q=e.request;if(q.method!=='GET')return;var u=new URL(q.url);if(u.origin!==location.origin)return;
 if(u.pathname.indexOf('/api/')===0)return;
 var k=u.pathname.replace(/\/$/,'/index.html');
 e.respondWith(fetch(q).then(function(r){return r}).catch(function(){return caches.match(k,{ignoreSearch:true}).then(function(h){return h||caches.match(u.pathname,{ignoreSearch:true})||Response.error()})}));});

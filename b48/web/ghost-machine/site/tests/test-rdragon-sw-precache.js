// swfix 20261029: every precache URL exists in the repo; sw.js carries the precache version (so a bump re-installs the SW); skipWaiting + clients.claim + stale cleanup.
const fs=require('fs'),path=require('path'),A=require('assert');const R=path.join(__dirname,'..');
const pc=JSON.parse(fs.readFileSync(R+'/sw-precache.json','utf8')),sw=fs.readFileSync(R+'/sw.js','utf8');
const miss=pc.files.filter(f=>{const p=f.split('?')[0];return !fs.existsSync(R+(p.endsWith('/')?p+'index.html':p))});
A.deepStrictEqual(miss,[],'precache URLs missing from repo');
A.ok(/-race-pack$/.test(pc.v));
const m=sw.match(/var SWV='([^']+)'/);A.ok(m&&m[1]===pc.v,'sw.js SWV must equal sw-precache.json v');
A.ok(/skipWaiting\(\)/.test(sw)&&/clients\.claim\(\)/.test(sw)&&/caches\.delete/.test(sw));
console.log('test-rdragon-sw-precache: ok');

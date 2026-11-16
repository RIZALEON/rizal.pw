#!/usr/bin/env node
/* LAW-PTS-1 Profile Twin Sync (2026-10-29): rewrites the ASSM profile card and the bio bot card together.
 * usage: node tools/profile-sync.js [profile.json]   (profile.json = {name,handle,bio,location,link,links,joined}; omitted = re-link only)
 *        node tools/profile-sync.js --check          (exit 1 if the two cards drift)
 * Public fields only. Never touches RWALLET BioSource.json or any keys. Editing bio-source.json needs a new ЯCASKET signature. */
const fs=require('fs'),path=require('path');
const D=path.join(__dirname,'..','data','founder'),BP=path.join(D,'bio-source.json'),AP=path.join(D,'assm-profile.json');
const rd=p=>JSON.parse(fs.readFileSync(p,'utf8')),wr=(p,o)=>fs.writeFileSync(p,JSON.stringify(o,null,1)+'\n');
function drift(b,a){const e=[];for(const k of['handle','rid'])if(a[k]!==b[k])e.push(k);
 if(a.profile.name!==b.name)e.push('name');if(JSON.stringify(a.profile.bio_sources)!==JSON.stringify(b.bio_sources))e.push('bio_sources');
 if(!b.linked_card||b.linked_card.path!=='/data/founder/assm-profile.json')e.push('bio→assm link');
 if(!a.linked_card||a.linked_card.path!=='/data/founder/bio-source.json')e.push('assm→bio link');return e}
function sync(src){const b=rd(BP),a=rd(AP),day=new Date().toISOString().slice(0,10);
 if(src){for(const k of a.fields)if(k in src&&k!=='biosrc')a.profile[k]=src[k];if(src.name)b.name=src.name;if(src.handle)b.handle=a.handle=src.handle}
 a.profile.name=b.name;a.profile.handle=b.handle;a.handle=b.handle;a.rid=b.rid;a.role=b.role;a.profile.bio_sources=b.bio_sources;
 b.linked_card={card:'ASSM PROFILE CARD',path:'/data/founder/assm-profile.json',law:'LAW-PTS-1 Profile Twin Sync'};
 a.linked_card=Object.assign({},a.linked_card,{path:'/data/founder/bio-source.json'});
 const before=fs.readFileSync(BP,'utf8');b.updated=a.updated=day;wr(AP,a);
 if(JSON.stringify(b,null,1)+'\n'!==before){wr(BP,b);return {bioChanged:true}}return {bioChanged:false}}
if(require.main===module){const arg=process.argv[2];
 if(arg==='--check'){const e=drift(rd(BP),rd(AP));console.log(e.length?'DRIFT: '+e.join(', '):'twin cards in sync');process.exit(e.length?1:0)}
 const r=sync(arg?rd(arg):null);console.log('synced ASSM + bio cards'+(r.bioChanged?' · bio-source.json changed → re-sign in ЯCASKET':''))}
module.exports={sync,drift};

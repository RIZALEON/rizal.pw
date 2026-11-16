// LAW-PTS-1 Profile Twin Sync: ASSM card <-> bio bot card linked, and every profile save syncs the ASSM card.
const fs=require('fs'),path=require('path'),assert=require('assert');const R=path.join(__dirname,'..');
const {drift}=require('../tools/profile-sync.js');
const b=JSON.parse(fs.readFileSync(R+'/data/founder/bio-source.json','utf8')),a=JSON.parse(fs.readFileSync(R+'/data/founder/assm-profile.json','utf8'));
assert.deepStrictEqual(drift(b,a),[],'cards drift');
const A=require('../rdragon-cryptosocial/rassm.js');const c=A.build({name:'Rizal',handle:'@chaserizal',links:'[{"label":"X","url":"https://x.com/chaserizal"}]',bio:'hi'},b);
assert.strictEqual(c.profile.links[0].label,'X');assert.strictEqual(c.rid,'ЯID-0001-3QQS');assert.strictEqual(c.linked_card.path,'/data/founder/bio-source.json');
const csp=fs.readFileSync(R+'/rdragon-cryptosocial/rdragon-cryptosocial.js','utf8');
assert.strictEqual((csp.match(/RASSM\.sync\(S\.prof/g)||[]).length,2,'editSet + editSave hooks');
assert(/rassm\.js/.test(fs.readFileSync(R+'/index.html','utf8')));assert(/LAW-PTS-1/.test(fs.readFileSync(R+'/LAWS.md','utf8')));
console.log('test-rdragon-assm-sync: ok');

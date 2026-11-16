// 2026-10-29: founder bio-source record (ya.bio-source.v1) + detached ЯCASKET signature verification. Ephemeral FAKE keys only.
const fs=require('fs'),A=require('assert'),path=require('path'),vm=require('vm'),C=globalThis.crypto,S=C.subtle;
const ROOT=path.join(__dirname,'..'),R=p=>fs.readFileSync(path.join(ROOT,p),'utf8');let n=0;const pass=m=>{n++;console.log('PASS',m)};
const b64=u=>Buffer.from(new Uint8Array(u)).toString('base64');
(async()=>{
 const sb={console,Promise,TextEncoder,TextDecoder,crypto:C,atob,btoa,Uint8Array};sb.self=sb;vm.createContext(sb);
 vm.runInContext(R('rdragon-cryptosocial/rsync-core.js'),sb);vm.runInContext(R('rdragon-cryptosocial/rbiosource.js'),sb);const B=sb.RBIOSOURCE,RS=sb.RSync;A.ok(B&&RS);
 const text=R('data/founder/bio-source.json'),rec=JSON.parse(text);
 A.strictEqual(rec.schema,'ya.bio-source.v1');A.strictEqual(rec.rid,'ЯID-0001-3QQS');A.strictEqual(rec.handle,'@chaserizal');A.strictEqual(rec.status,'unsigned-pending-founder');
 const hs=rec.bio_sources.map(b=>b.handle||b.url);A.deepStrictEqual(hs,[],'bio sources emptied (20261029)');
 const cards=rec.fused_with.filter(x=>typeof x==='object').map(x=>x.card);['BIOBOT','RIZAL DECIDER','SUPER BOT CARD','DECIDER-ID'].forEach(c=>A.ok(cards.includes(c),c));
 const bbo=rec.fused_with.find(x=>x.card==='BIOBOT');A.strictEqual(bbo.sha256_at_wallet_pin,bbo.sha256,'BIOBOT pin matches wallet');const dz=rec.fused_with.find(x=>x.card==='DECIDER-ID');A.ok(dz.ref_only&&Object.keys(dz).sort().join()==='card,note,path,ref_only,sha256','DECIDER-ID by hash only');
 rec.fused_with.filter(x=>typeof x==='object').forEach(x=>A.ok(/^[0-9a-f]{64}$/.test(x.sha256),x.card));
 A.ok(!/(priv|secret|password|seed|mnemonic)["\s]*:/i.test(text)&&!/BEGIN .*KEY/.test(text),'public fields only');
 pass('record: schema, ЯID, handles, DECIDER + SUPER BOT CARD + BIOBOT hash refs, unsigned-pending-founder, public only');
 // wallet match (only when the wallet file is present, i.e. on GHOSTMACHINE/Neo)
 const W=path.join(require('os').homedir(),'ЯLAB/RCRYPTOFORGE/RWALLET/rwallet/data/BioSource.json');
 if(fs.existsSync(W)){const o=JSON.parse(fs.readFileSync(W,'utf8')).owners.find(x=>x.rid===rec.rid);rec.bio_sources.forEach(b=>A.ok(o.bio_sources.some(x=>JSON.stringify(x)===JSON.stringify(b)),'site source in wallet'));const wb=o.fused_with.find(x=>x&&x.card==='BIOBOT');if(wb)A.strictEqual(wb.sha256,rec.fused_with.find(x=>x.card==='BIOBOT').sha256_at_wallet_pin);const D=path.join(require('os').homedir(),'ЯLAB/RFORGE/SCROLLS/FEED-RELAYS-20261025/private/DECIDER-ID.json');if(fs.existsSync(D))A.strictEqual(require('crypto').createHash('sha256').update(fs.readFileSync(D)).digest('hex'),rec.fused_with.find(x=>x.card==='DECIDER-ID').sha256);pass('bio_sources match wallet BioSource.json')}
 const kp=await S.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']);const pub=b64(await S.exportKey('raw',kp.publicKey));const prof=await RS.profileIdFor(pub);
 const h=Buffer.from(await S.digest('SHA-256',new TextEncoder().encode(text))).toString('hex');
 const sign=async(k,hh)=>b64(await S.sign({name:'ECDSA',hash:'SHA-256'},k,new TextEncoder().encode(B.SIGF+'\n'+hh)));
 const sig={format:B.SIGF,record_sha256:h,pub,sig:await sign(kp.privateKey,h)};
 let v=await B.verify(text,null,prof);A.strictEqual(v.state,'pending');A.strictEqual(v.sha256,h);
 v=await B.verify(text,sig,prof);A.strictEqual(v.state,'signed',v.why);
 A.strictEqual((await B.verify(text+' ',sig,prof)).state,'invalid','tampered record');
 A.strictEqual((await B.verify(text,{...sig,sig:await sign(kp.privateKey,'0'.repeat(64))},prof)).state,'invalid','sig over other hash');
 A.strictEqual((await B.verify(text,sig,'RP-0000000000000000')).state,'invalid','non-founder key');
 pass('verify: no sig = pending, founder sig = signed, tampered / wrong hash / foreign key = invalid');
 const H=B.html({record:rec,v:{state:'pending'}});A.strictEqual(H,'');
 A.ok(R('rdragon-cryptosocial/rdragon-cryptosocial.js').includes('id="csp-biosrc"')&&R('index.html').includes('rbiosource.js?v=4'));
 const op=R('login/options/index.html');A.ok(op.includes('id="bio-st"')&&op.includes('rbiosource.js')&&!/Sign bio record/.test(op),'no site signing button');
 const pc=JSON.parse(R('sw-precache.json'));A.ok(pc.files.includes('/data/founder/bio-source.json')&&pc.files.includes('/rdragon-cryptosocial/rbiosource.js'));
 pass('profile shows handles + state; options shows status (no signing button); precached');
 console.log(n+'/'+(n)+' passed; record sha256 '+h);
})().catch(e=>{console.error('FAIL',e);process.exit(1)});

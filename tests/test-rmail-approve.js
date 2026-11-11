// node tests: RMAIL Approve / Deny renderer (rmail-approve.js v2, RBATBOX 20261111) against MEKANICA's canonical spec
// SCROLLS/RMAIL-APPROVE-DENY-SPEC-20261111.md (rmail.approve v2 + rmail.decision v1). No network, no keys, nothing signed.
const fs=require('fs'),A=require('assert'),path=require('path');
const SRC=path.join(__dirname,'..','rdragon-cryptosocial','rmail-approve.js');let n=0;const pass=m=>{n++;console.log('PASS',m)};
const fresh=()=>{delete require.cache[require.resolve(SRC)];return require(SRC)};
const C=JSON.stringify;
const card=(o,a)=>Object.assign({schema:'rmail.v1',kind:'rmail',id:'rvm-approve-apr-4c7c188902db',to:'@chaserizal',to_node:'rklowd.17e',to_device:'17e',from:'rvm-rbot-linux',
 subject:'Approve mint: 100 R to my wallet (from ЯBOT RVM)',body:'Mint 100 R to my wallet. Tap Approve or Deny.',ts:Date.now(),verified:false,signed:false,
 notice:{req_id:'apr-4c7c188902db',type:'rmail.approve',status:'pending',needs:'ASSM ЯWALLET Face ID',source:'linux-rizal-rvm',command:'rwallet'},
 approve:Object.assign({v:2,kind:'mint',summary:'Mint 100 R to my wallet',app:'rbot-linux',req_id:'apr-4c7c188902db',nonce:'9f2c4e1a7b3d5e60',expires:Date.now()+864e5,
  buttons:[{id:'approve',label:'Approve',does:'open-faceid',open:'rwallet://approve?req=apr-4c7c188902db&nonce=9f2c4e1a7b3d5e60'},{id:'deny',label:'Deny',does:'decide-deny'}],
  reply:{node:'rklowd.rvm',app:'rbot-linux'}},a||{})},o||{});
const v1card=()=>{const c=card();delete c.approve;return c};
const block4={schema:'rmail.v1',id:'block4-mint-20261110205337-7498d526',from:'neo-rdragon',subject:'Block 4 mint',ts:1,signed:false,notice:{req_id:'rm-20261110205337-7498d526',status:'pending'},approve:card().approve};
(async()=>{
 let out,R=fresh(),q=R.fromMessage(card());
 A.ok(q);A.strictEqual(R.validate(q),null);A.strictEqual(q.kind,'mint');A.strictEqual(q.reply.node,'rklowd.rvm');pass('spec v2 card validates');
 A.strictEqual(R.fromMessage(v1card()),null);pass('v1 card (no approve block) renders as today, no buttons');
 A.strictEqual(R.fromMessage(block4),null);pass('block 4 TerraformЯ card is left to TerraformЯ');
 A.strictEqual(R.fromMessage({id:'x1',text:'Subject: gm\n\nhello'}),null);A.strictEqual(R.fromMessage(card({},{v:1})),null);pass('ordinary mail and non-v2 approve blocks are ignored');
 A.match(R.validate(R.fromMessage(card({signed:true}))),/signed/);A.match(R.validate(R.fromMessage(card({signed:undefined}))),/signed/);pass('signed (or not explicitly unsigned) cards refused');
 A.match(R.validate(R.fromMessage(card({},{privateKey:'x'}))),/secret/);A.match(R.validate(R.fromMessage(card({body:'-----BEGIN EC PRIVATE KEY-----'}))),/secret/);
 A.match(R.validate(R.fromMessage(card({},{signature:'abc'}))),/secret/);A.match(R.validate(R.fromMessage(card({seed:'a b c'}))),/secret/);pass('key, seed, signature or PEM in a card is refused');
 A.match(R.validate(R.fromMessage(card({},{kind:'burn'}))),/kind/);A.match(R.validate(R.fromMessage(card({},{kind:'seal'}))),/kind/);A.match(R.validate(R.fromMessage(card({},{nonce:'xyz'}))),/nonce/);
 A.match(R.validate(R.fromMessage(card({},{req_id:'apr-other0000000'}))),/match/);A.match(R.validate(R.fromMessage(card({body:'x'.repeat(5000)}))),/4 KB/);
 A.match(R.validate(R.fromMessage(card({notice:Object.assign({},card().notice,{status:'denied'})}))),/pending/);
 A.match(R.validate(R.fromMessage(card({},{buttons:[{id:'approve',open:'https://evil.example/x'}]}))),/rwallet/);pass('bad kind, nonce, req_id mismatch, oversize, non-pending and non-ЯWALLET links refused');
 let h=R.buttonsHTML(q);A.match(h,/data-rapr="approve"/);A.match(h,/data-rapr="deny"/);A.match(h,/Approve Mint · Face ID/);pass('valid card shows Approve and Deny');
 A.ok(!/data-rapr/.test(R.buttonsHTML(R.fromMessage(card({signed:true})))));const ex=R.fromMessage(card({},{expires:Date.now()-1}));A.match(R.buttonsHTML(ex),/Expired — nothing signed/);A.ok(!/data-rapr/.test(R.buttonsHTML(ex)));
 await A.rejects(R.deny(ex,()=>0),/expired/);pass('refused and expired cards have no buttons and cannot be decided');
 // Deny
 const sent=[];out=await R.deny(q,(f,dec)=>{sent.push(f);return{ok:1}});const d=out.decision;
 A.deepStrictEqual(Object.keys(d).sort(),['app','by','decision','id','nonce','ref','req_id','schema','signed','to_node','ts','v']);
 A.strictEqual(d.schema,'rmail.decision');A.strictEqual(d.v,1);A.strictEqual(d.id,'dec-apr-4c7c188902db');A.strictEqual(d.ref,'rvm-approve-apr-4c7c188902db');A.strictEqual(d.nonce,'9f2c4e1a7b3d5e60');
 A.strictEqual(d.decision,'deny');A.strictEqual(d.signed,false);A.strictEqual(d.to_node,'rklowd.rvm');A.strictEqual(d.app,'rbot-linux');A.strictEqual(d.by,'@chaserizal/pw');
 A.strictEqual(sent.length,1);const f=sent[0];A.strictEqual(f.name,'rmail-dec-apr-4c7c188902db.json');A.deepStrictEqual(f.dest,['nodes/rvm/inbox/','mail/rklowd.rvm/']);
 A.ok(f.body.startsWith('{"schema":"rmail.decision"'));A.ok(!/Subject:|rmail\.v1/.test(f.body));const pj=JSON.parse(f.body);A.strictEqual(pj.schema,'rmail.decision');A.deepStrictEqual(pj,d);
 A.match(R.buttonsHTML(q),/Denied — nothing signed/);A.ok(!/data-rapr/.test(R.buttonsHTML(q)));A.strictEqual(R.pending([card()]).length,0);pass('Deny sends an unsigned rmail.decision deny to the requesting app node, card closes');
 await A.rejects(R.approve(q,()=>0,()=>0),/already-decided/);await A.rejects(R.deny(q,()=>0),/already-decided/);A.strictEqual(sent.length,1);pass('a card is decided once (already-decided)');
 // Approve
 R=fresh();q=R.fromMessage(card());const opened=[],s2=[];out=await R.approve(q,(to,t)=>{s2.push(t)},u=>opened.push(u));
 A.strictEqual(out.decision.decision,'approve');A.strictEqual(out.decision.signed,false);A.ok(!Object.keys(out.decision).some(k=>/^sig$|signature|txid/i.test(k)));
 A.deepStrictEqual(opened,['rwallet://approve?req=apr-4c7c188902db&nonce=9f2c4e1a7b3d5e60']);A.strictEqual(s2.length,1);A.match(R.buttonsHTML(q),/Face ID opened/);pass('Approve sends the decision, then opens only the rwallet:// ASSM ЯWALLET Face ID link');
 R=fresh();q=R.fromMessage(card());let hook=[];globalThis.RMAIL_APPROVE_FACEID=x=>{hook.push(x);A.ok(Object.isFrozen(x));return{opened:'native'}};const op2=[];
 out=await R.approve(q,()=>0,u=>op2.push(u));A.strictEqual(hook.length,1);A.strictEqual(hook[0].nonce,'9f2c4e1a7b3d5e60');A.strictEqual(op2.length,0);delete globalThis.RMAIL_APPROVE_FACEID;pass('an app-provided Face ID hook is used instead of the link when present');
 R=fresh();q=R.fromMessage(card());out=await R.approve(q,null,()=>0);A.strictEqual(out.queued,true);A.strictEqual(R.decisions()[q.req_id].decision,'approve');pass('no RMAIL transport: decision is kept in the outbox');
 R=fresh();q=R.fromMessage(card());const drops=[];globalThis.RMAIL_DECISION_DROP=(name,body)=>{drops.push({name,body})};await R.deny(q);delete globalThis.RMAIL_DECISION_DROP;
 A.strictEqual(drops.length,1);A.strictEqual(drops[0].name,'rmail-dec-apr-4c7c188902db.json');A.strictEqual(JSON.parse(drops[0].body).decision,'deny');pass('host file-drop transport gets name rmail-dec-<req_id>.json and the bare JSON');
 R=fresh();q=R.fromMessage(card());const rs=[];globalThis.RSOCIAL={send:(to,text,extra)=>{rs.push({to,text,extra})}};await R.deny(q);delete globalThis.RSOCIAL;
 A.strictEqual(rs[0].to,'rbot-linux');A.strictEqual(rs[0].extra.to_node,'rklowd.rvm');A.strictEqual(rs[0].extra.name,'rmail-dec-apr-4c7c188902db.json');A.strictEqual(JSON.parse(rs[0].text).schema,'rmail.decision');pass('RSOCIAL fallback sends the bare JSON as the whole text, no Subject line');
 const src=fs.readFileSync(SRC,'utf8').replace(/\/\*[\s\S]*?\*\//g,'');A.ok(!/RMINT|RSIGN|RGHOSTKEY|RKRYPT|generateKey|subtle|importKey|RWALLET_UNIFIED|credentials\.get/.test(src));pass('renderer has no mint, sign, key or passkey code');
 const ui=fs.readFileSync(path.join(__dirname,'..','rdragon-cryptosocial','rmail-ui.js'),'utf8'),idx=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 A.ok(idx.indexOf('rmail-approve.js')>=0&&idx.indexOf('rmail-approve.js')<idx.indexOf('rmail-ui.js'));A.match(ui,/data-rapr/);pass('index.html loads rmail-approve.js before rmail-ui.js');
 console.log(n+' passed');
})().catch(e=>{console.error(e);process.exit(1)});

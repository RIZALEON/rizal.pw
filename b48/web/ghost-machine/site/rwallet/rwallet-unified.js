/* R:\ RWALLET UNIFIED · STAGED 20261026 · watch-only · PREVIEW.
 * One registry = RKRYPT's built-in RWALLET registry (rkrypt.rzl.js, unchanged) + ЯBOT iOS legacy + crown wallet + Neo rwallet.py + native-only rows.
 * Load AFTER rwallet-guard.js and rkrypt.rzl.js. Addresses come only from data/*.json (copied ЯBOT files). Any sign/send/spend/mint/authority/publish
 * becomes a ЯCASKET approval request PREVIEW: nothing is signed, sent or dispatched. */
(function(root){
var BASE=(document.currentScript&&document.currentScript.src||'').replace(/rwallet-unified\.js.*$/,'')||'./';
var NB='RBOT/ios/src/ЯBOT/',PY='BOT-MASTERCONTROLROOM rwallet.py';
var F=root.RWALLET_FUNCS=root.RWALLET_FUNCS||[];
function f(id,label,where,kind,cmd,old,read,src){return{id:id,label:label,where:where,kind:kind,cmd:cmd,old:old,read:!!read,args:'',merged:src}}
var ADD=[
/* ЯBOT iOS legacy (from rbot-legacy.js) */
f('holdings','ЯBOT holdings (SOL + Я token accounts)','wallets','legacy','holdings',NB+'WalletHoldings.swift:52-150',1,'rbot-ios'),
f('legacyaddrs','View-only address book (crown · ATA · mint · seats)','wallets','legacy','legacy addresses',PY+':11-24 · WalletCard.json · DeviceWalletSeat.json',1,'rbot-neo'),
f('legacycache','Cached balances (offline snapshot)','wallets','legacy','legacy cache','RCONTRALROOM/RWALLET-MAC/cache/balances.json',1,'rbot-neo'),
f('gcstatus','GHOSTCHAIN ledger status','identity','legacy','ghostchain status',NB+'GhostChainLedger.swift:118-122',1,'rbot-ios'),
f('gcrecent','GHOSTCHAIN recent entries','identity','legacy','ghostchain recent',NB+'GhostChainLedger.swift:97-108',1,'rbot-ios'),
f('gcappend','GHOSTCHAIN establish/claim/cite/evolve/ping','identity','legacy','ghostchain append',NB+'GhostChainLedger.swift:21-75',0,'rbot-ios'),
f('twinchain','YaTwinChain public twin view','sol','legacy','twinchain',NB+'YaTwinChain.swift',1,'rbot-ios'),
f('reseat','Mind reseat / RSeatKit','devices','native','reseat',NB+'MindReseat.swift · RSeatKit.swift',0,'rbot-ios'),
/* crown wallet surface */
f('crowncard','Crown Я card (mint · supply · decimals · metadata)','wallets','crown','crown card','WalletCard.json · WalletLandingView.swift',1,'crown'),
f('crownauth','Crown authorities (mint · freeze · fee payer)','wallets','crown','crown authority','WalletCard.json mint_authority/freeze_authority',1,'crown'),
f('crownexplorer','Crown explorer links (display only, not fetched)','sol','crown','crown explorer','WalletCard.json explorer{}',1,'crown'),
f('crowntx','Crown mint transaction record','sol','crown','crown tx','WalletCard.json signature/slot/instructions',1,'crown'),
f('crownutil','Crown utility (cite · clear_clog · tip · seat · evolve)','mint','crown','crown utility',NB+'YaToken.swift:25',0,'crown'),
f('crownrevoke','Revoke mint authority (Decider signs)','mint','crown','crown revoke mint authority','Solscan holders report 20261026 · mint authority active',0,'crown'),
/* Neo rwallet.py */
f('rwpyshow','Neo RWALLET view-only table','wallets','legacy','rwallet show',PY+' show()',1,'rbot-neo'),
f('rwpyrefresh','Neo RWALLET live refresh (offline here → cache)','wallets','legacy','rwallet refresh',PY+' balances(refresh=True)',1,'rbot-neo'),
/* ЯBOT native rows not in the web registry yet */
f('rfidmint','Mint bot RFID','mint','native','rfid mint',NB+'BotRFIDMint.swift mintBot',0,'rbot-ios'),
f('rfidstatus','Bot RFID registry status','mint','native','rfid status',NB+'BotRFIDMint.swift status',1,'rbot-ios'),
f('twinpipe','TwinPipe status','sol','native','twinpipe status',NB+'TwinPipe.swift status',1,'rbot-ios'),
f('twinpush','TwinPipe prepare/push devnet','sol','native','twinpipe push',NB+'TwinPipe.swift prepareSolana/pushDevnet',0,'rbot-ios'),
f('casketsite','ЯCASKET site sign request','identity','native','casket site',NB+'YCasket/YCasketSiteSignRequest.swift · SigningKeysSection approveSite',0,'rbot-ios'),
f('casketbatch','ЯCASKET profile 0 batch approve','identity','native','casket batch',NB+'YCasket/YCasketProfile0Batch.swift · Profile0Section approveBatch',0,'rbot-ios'),
f('casketinbox','ЯCASKET pending requests (count only)','identity','native','casket inbox',NB+'YCasket/YCasketSignInbox.swift pending',1,'rbot-ios'),
/* RSYNC ledger · same from any device (STAGED 20261026): drafts → preview → dry-run → ЯCASKET batch request → publish request. Never signs, never appends entries.jsonl. */
f('ldrafts','Ledger: list drafts','ledger','ledger','ledger drafts','RSYNC/tools/seal-profile0.js --draft',1,'rsync'),
f('lpreview','Ledger: preview entry','ledger','ledger','ledger preview','staged-entries.jsonl',1,'rsync'),
f('ldryrun','Ledger: dry-run seal','ledger','ledger','ledger dry-run','seal-profile0.js --dry-run',1,'rsync'),
f('lseal','Ledger: request seal (ЯCASKET batch)','ledger','ledger','ledger seal','seal-profile0.js · rzl.casket.request.v1 seal-rsync-batch',0,'rsync'),
f('lpublish','Ledger: request publish','ledger','ledger','ledger publish','RSYNC relays (after seal)',0,'rsync')
];
/* dedupe by id: registry wins, then first ADD */
var seen={},dups=[];for(var i=F.length-1;i>=0;i--){if(seen[F[i].id]){dups.push(F[i].id);F.splice(i,1)}else seen[F[i].id]=1}
ADD.forEach(function(x){if(seen[x.id])dups.push(x.id);else{seen[x.id]=1;F.push(x)}});
/* group fix: 'solana' → 'sol' (legacy twinchain was in an unrendered group) */
F.forEach(function(x){if(x.where==='solana')x.where='sol'});
/* scrub auth-method wording from UI labels (ЯCASKET picks the method itself) */
F.forEach(function(x){x.label=x.label.replace(/\s*\((password|passkey|face id|fingerprint)\)/ig,'').replace(/\b(passkey|password)\b/ig,'ЯCASKET')});
var GATED=/^(send|sign|reqsend|approve|p0create|pwset|unlock|login|logout|rkey0req|rkey0bind|passkeybind|verified|enroll|rsexport|seatmain|seatboom|pair|trueblast|trueblastconfirm|bangrang|tokenblast|relayon|online|monline|missue|mdefine|madapt|mevolve|masset|mbot|mreward|mpoolx|mpoolm|mghost|post|setrdg|cash|buy|sell|publishlisting|gcappend|reseat|crownutil|crownrevoke|rfidmint|twinpush|casketsite|casketbatch|lseal|lpublish)$/;
F.forEach(function(x){if(GATED.test(x.id)){x.read=false;x.casket=true}});
var D={card:null,seats:null,cache:null,chain:null,ledger:[]},LOG=root.RW_LOG=[],CK=root.RW_CASKET=[];
function J(p){return fetch(BASE+'data/'+p).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()}).catch(function(){return null})}
var ready=Promise.all([J('WalletCard.json'),J('DeviceWalletSeat.json'),J('balances.cache.json'),J('ChainSource.json'),J('ledger/index.json')]).then(function(a){D.card=a[0];D.seats=a[1];D.cache=a[2];D.chain=a[3];return Promise.all(((a[4]||{}).drafts||[]).map(function(n){var b=BASE+'data/ledger/'+n+'/';return Promise.all([fetch(b+'staged-manifest.json').then(function(r){return r.json()}),fetch(b+'seal-state.json').then(function(r){return r.json()}),fetch(b+'staged-entries.jsonl').then(function(r){return r.text()})]).then(function(x){return{name:n,manifest:x[0],state:x[1],entries:x[2].trim().split('\n').map(JSON.parse)}}).catch(function(){return null})})).then(function(l){D.ledger=l.filter(Boolean);return D})});
var B58=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
function addrs(){var c=D.card||{},o=[];if(B58.test(c.mint_authority||''))o.push({name:'CROWN (mint/freeze authority, fee payer)',chain:'solana',publicAddress:c.mint_authority});if(B58.test(c.owner_ata||''))o.push({name:'CROWN Я account (ATA)',chain:'solana',publicAddress:c.owner_ata});if(B58.test(c.mint||''))o.push({name:'Я mint',chain:'solana',publicAddress:c.mint});
 var s=(D.seats||{}).seats||{};Object.keys(s).forEach(function(k){var p=(s[k]||{}).pubkey||'';o.push({name:(s[k]||{}).label||k,chain:'solana',publicAddress:B58.test(p)?p:'',note:B58.test(p)?'':'not seated yet'})});
 var rows=(D.cache||{}).rows||[];o.forEach(function(a){var r=rows.filter(function(x){return x.pubkey&&x.pubkey===a.publicAddress})[0];if(r){a.balance=r.balance;a.unit=r.unit}});return o}
var _L=null;function mint(){return root.RKRYPT&&root.RKRYPT.rgen&&root.RKRYPT.rgen.Mint}function LG(){var M=mint();if(!_L&&M)try{_L=new M.Ledger()}catch(e){}return _L}
var LEG={
 holdings:function(){var r=(D.cache||{}).rows||[];return{source:'cache (offline)',fetched:(D.cache||{}).fetched,rows:r.filter(function(x){return x.pubkey}).map(function(x){return{name:x.name,pubkey:x.pubkey,balance:x.balance,unit:x.unit}})}},
 legacyaddrs:function(){return addrs()},
 legacycache:function(){return D.cache||{source:'none'}},
 rwpyshow:function(){return addrs().map(function(a){return a.name+'  '+(a.publicAddress||'(none)')+'  '+(a.balance==null?'—':a.balance+' '+(a.unit||''))}).join('\n')},
 rwpyrefresh:function(){return{source:'cache (offline)',live_error:'network blocked in staging (no chain calls)',fetched:(D.cache||{}).fetched,rows:((D.cache||{}).rows||[]).length}},
 gcstatus:function(){return{note:'GHOSTCHAIN ledger lives on the device (GhostChainLedger.swift) · no ledger file copied into staging',handoff:'ЯBOT'}},
 gcrecent:function(){return{note:'GHOSTCHAIN recent entries are read on the device · no ledger file in staging',handoff:'ЯBOT'}},
 twinchain:function(){var t=(D.chain||{}).twin||{};return{id:(D.chain||{}).id,role:(D.chain||{}).role,symbol:t.symbol,mint:t.mint,cluster:t.cluster,supply_ui:t.supply_ui,owner_ata:t.owner_ata,status:t.status}},
 crowncard:function(){var c=D.card||{};return{title:c.title,symbol:c.symbol,mint:c.mint,cluster:c.cluster,decimals:c.decimals,supply_ui:c.supply_ui,metadata_account:c.metadata_account,metadata_uri:c.metadata_uri,law:c.law}},
 crownauth:function(){var c=D.card||{};return{mint_authority:c.mint_authority,freeze_authority:c.freeze_authority,fee_payer:c.fee_payer,note:'mint authority still active (Solscan report 20261026) · revoke needs the Decider signature'}},
 crownexplorer:function(){return(D.card||{}).explorer||{}},
 crowntx:function(){var c=D.card||{};return{signature:c.signature,slot:c.slot,block_time_utc:c.block_time_utc,status:c.status,instructions:c.instructions}},
 rfidstatus:function(){return{note:'BotRFIDMint registry is on the device',handoff:'ЯBOT'}},
 twinpipe:function(){return{note:'TwinPipe status is read on the device; web shows the command only',handoff:'ЯBOT'}},
 mtypes:function(){var M=mint();return{types:Object.keys((LG()||{}).types||{}),R_TOKEN:M&&M.R_TOKEN}},
 mbal:function(){return{note:'ЯMINT balances need the Ghost Chain seed (/rseed mint balance on the Neo) · not in staging',handoff:'Neo /rseed'}},
 mlimits:function(){var M=mint();return M?{limits:M.LIMITS,online:M.ONLINE}:null},
 mverify:function(){return{note:'record verify reads the Ghost Chain seed on the Neo (/rseed mint verify <seq>)',handoff:'Neo /rseed'}},
 rgenverify:function(){return root.RKRYPT&&root.RKRYPT.rgen?root.RKRYPT.rgen.verify().then(function(v){return v.text}):'RGEN not loaded'},
 ldrafts:function(){return D.ledger.map(function(d){return{draft:d.name,profile:d.manifest.profile,state:d.manifest.state,entries:d.manifest.entries,batches:d.manifest.batches.length,done:d.state.done}})},
 lpreview:function(){return D.ledger.map(function(d){return d.entries.map(function(e){return{id:e.id,t:e.t,profile:e.profile,by:e.by,reason:String(e.reason||'').slice(0,160),corrections:(e.corrections||[]).length}})})},
 ldryrun:function(){return D.ledger.map(function(d){var m=d.manifest,ok=d.entries.length===m.entries,todo=m.batches.filter(function(b){return d.state.done.indexOf(b.batch)<0});return{dry:true,draft:d.name,profile:m.profile,manifestMatches:ok,batches:todo.length,entries:todo.reduce(function(n,b){return n+b.entries},0),note:'cids are computed by RSYNC rsync-core.js on the Neo (seal-profile0.js --dry-run)'}})},
 casketinbox:function(){return{pending:0,note:'web preview holds no ЯCASKET inbox'}}
};
function byId(id){return F.filter(function(x){return x.id===id})[0]}
function rec(o){o.at=new Date().toISOString();LOG.push(o);return o}
function run(id,args){var x=byId(id);if(!x)return Promise.resolve(rec({id:id,status:'error',out:'unknown function'}));
 return ready.then(function(){
  if(x.casket&&x.id==='lseal'){var d=D.ledger[0]||{manifest:{batches:[]},state:{done:[]}};var q={schema:'rzl.casket.request.v1',approver:'ЯCASKET',action:'seal-rsync-batch',profile:d.manifest.profile,pub:d.state.pub,reason:'Seal '+d.manifest.entries+' staged entr'+(d.manifest.entries===1?'y':'ies')+' ('+d.name+') into RSYNC',batches:d.manifest.batches.filter(function(b){return d.state.done.indexOf(b.batch)<0}).map(function(b){return{batch:b.batch,digest:b.digest,entries:b.entries}}),mode:'preview',status:'ЯCASKET batch approval request PREVIEW · nothing signed, nothing appended',fn:'lseal',cmd:x.cmd};CK.push(q);return rec({id:id,status:'casket-preview',out:q})}
  if(x.casket){var q={type:'ЯCASKET.request',fn:x.id,label:x.label,cmd:x.cmd+(args?' '+args:''),mode:'preview',status:'APPROVAL REQUEST PREVIEW · nothing signed, sent or dispatched'};CK.push(q);return rec({id:id,status:'casket-preview',out:q})}
  if(LEG[x.id])return Promise.resolve(LEG[x.id]()).then(function(o){return rec({id:id,status:o==null?'error':(o&&o.handoff?'handoff-preview':'pass'),out:o==null?'local module missing':o})});
  if(x.read&&(x.kind==='rk'||x.kind==='rgen')&&root.RKRYPT){var CALL={lockstate:'rkrypt status',thundr:'rkrypt vault',p0status:'rgen rkey0 status',rkey0status:'rgen rkey0 status'};return Promise.resolve(root.RKRYPT.cmd(CALL[x.id]||x.cmd)).then(function(r){if(!r||r.ok===false)return rec({id:id,status:'error',out:r&&r.text||'no result'});return rec({id:id,status:'pass',out:r.text||r.json||(r.html?'(card html)':'')})})}
  if(x.id==='lock'&&root.RKRYPT)return rec({id:id,status:'pass',out:root.RKRYPT.lock()});
  if(x.kind==='ui'&&root.RKRYPT&&root.RKRYPT.prompt){root.RKRYPT.prompt.exec(x.cmd.replace(/<[^>]*>/g,'').trim());return rec({id:id,status:'pass',out:'prompt: '+x.cmd})}
  if(x.read)return rec({id:id,status:'pass',out:x.kind==='native'?{handoff:'ЯBOT',cmd:x.cmd,addresses:/^w|listwallets|landing/.test(x.id)?addrs():undefined}:x.cmd});
  return rec({id:id,status:'handoff-preview',out:'[preview] '+x.cmd+' · '+(x.kind==='native'?'ЯBOT app':x.kind)})
 }).catch(function(e){return rec({id:id,status:'error',out:String(e&&e.message||e)})})}
root.RWALLET_UNIFIED={version:'unified-20261026',funcs:F,dups:dups,ready:ready,data:D,addresses:addrs,run:run,gated:GATED};
})(window);

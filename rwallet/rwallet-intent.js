/* R:\ RWALLET · INTENT RECEIVER · 20261030 · DRY-RUN.
 * Reads a TerraformЯ MERKADO hand-off from the URL fragment (#rwallet-intent=<base64 JSON>, schema rghostchain.handoff.v1).
 * The fragment never reaches a server. Accepts only DRY-RUN, off-chain, unsigned records. Shows a card; APPROVE runs the
 * record's RWALLET command through RWALLET_UNIFIED.run(), which for gated commands (buy/sell/sign/send) is an ЯCASKET
 * approval PREVIEW: nothing is signed, sent or dispatched here. No keys. No network. Load after rwallet-unified.js. */
(function(w){
var P='#rwallet-intent=',OK_CMD={buy:1,sell:1,sign:1,send:1};
function E(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function decode(h){
 if(!h||h.indexOf(P)!==0)return null;
 try{var b=decodeURIComponent(h.slice(P.length)),bin=atob(b),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
  return JSON.parse(new TextDecoder().decode(u))}catch(e){return {err:'unreadable hand-off'}}}
function check(x){
 if(!x||x.err)return x&&x.err||'no hand-off';
 var r=x.record||{};
 if(x.schema!=='rghostchain.handoff.v1')return 'unknown schema';
 if(r.schema!=='rghostchain.market.v1')return 'unknown record schema';
 if(r.mode!=='DRY-RUN'||r.on_chain!==false||r.sig!=null)return 'refused: only unsigned DRY-RUN records are accepted';
 if(!OK_CMD[r.rwallet_cmd])return 'refused: command '+r.rwallet_cmd;
 if(!/^[0-9a-f]{64}$/.test(String(x.hash||'')))return 'bad record hash';
 return '';}
function card(x,bad){
 var host=document.getElementById(w.RWALLET_MOUNT||'rw')||document.body,d=document.getElementById('rw-intent')||document.createElement('div');
 d.id='rw-intent';d.style.cssText='border:2px solid #ffd23f;margin:10px 0;padding:10px;font:12px Menlo,monospace;color:#ffd23f;background:#0b0b0b';
 var r=(x&&x.record)||{};
 d.innerHTML='<b style="letter-spacing:.15em">RGHOSTCHAIN · MARKET HAND-OFF</b> <span style="color:#9ac438">DRY-RUN</span>'+
  (bad?'<div style="color:#ff6b6b;margin-top:6px">'+E(bad)+'</div>':
  '<div style="margin:6px 0;color:#eee">'+E(String(r.op||'').replace('market.','').toUpperCase())+' · '+E(r.qty)+' × <b>'+E(r.item)+'</b>'+
  (r.for_item?' ⇄ '+E(r.for_qty)+' × <b>'+E(r.for_item)+'</b>':'')+'<br>price '+E(r.price)+' '+E(r.currency)+(r.counterparty?' · with '+E(r.counterparty):'')+
  '<br>record #'+E(x.seq)+' · '+E(String(x.hash).slice(0,16))+'… · from TerraformЯ</div>'+
  '<div>RWALLET command: <code>'+E(r.rwallet_cmd)+'</code> · signature: <b>none</b> (ЯCASKET / Face ID approves on your device)</div>'+
  '<div style="margin-top:8px"><button id="rwi-ok" style="background:#2E6DB4;color:#ffd23f;border:1px solid #2a1206;padding:4px 10px">REQUEST APPROVAL (preview)</button> '+
  '<button id="rwi-no" style="background:#5a1a1a;color:#eee;border:1px solid #2a1206;padding:4px 10px">DISMISS</button></div><pre id="rwi-out" style="white-space:pre-wrap;color:#9ac438;margin:6px 0 0"></pre>');
 if(!d.parentNode){if(host!==document.body&&host.parentNode)host.parentNode.insertBefore(d,host);else document.body.insertBefore(d,document.body.firstChild)} /* sibling above #rw: RWALLET re-renders #rw */
 if(bad)return;
 document.getElementById('rwi-no').onclick=function(){d.remove()};
 document.getElementById('rwi-ok').onclick=function(){var U=w.RWALLET_UNIFIED,o=document.getElementById('rwi-out');
  if(!U){o.textContent='RWALLET registry not loaded · nothing sent';return}
  /* RWALLET has no buy/sell/sign/send function ids; the record is an RGHOSTCHAIN entry, so it goes through the gated
     ЯCASKET function 'gcappend' (ghostchain append) as an approval PREVIEW carrying the market command. */
  var fid=(U.funcs||[]).some(function(f){return f.id==='gcappend'&&f.casket})?'gcappend':r.rwallet_cmd;
  Promise.resolve(U.run(fid,String(r.op)+' '+r.rwallet_cmd+' rghostchain:'+String(x.hash).slice(0,16)+' from:terraformr')).then(function(res){o.textContent=(res&&res.status||'done')+(res&&res.out&&res.out.status?' · '+res.out.status:'')+(res&&res.out&&res.out.cmd?'\n'+res.out.cmd:'')+' · nothing signed (DRY-RUN)'}).catch(function(e){o.textContent='preview error: '+e})};}
function go(){var h=w.location.hash;if(h.indexOf(P)!==0)return;var x=decode(h),bad=check(x);w.RWALLET_INTENT={handoff:x,ok:!bad,reason:bad};
 card(x,bad);try{history.replaceState(null,'',w.location.pathname+w.location.search)}catch(e){}}
w.RWALLET_INTENT_DECODE=decode;w.RWALLET_INTENT_CHECK=check;
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',go):setTimeout(go,0);
w.addEventListener('hashchange',go);
})(window);

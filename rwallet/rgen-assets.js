/* RGENERATR asset feed reader v2 · 20261030 · spec RGENERATR/ADAPTER/SPEC.md v1.
 * Read-only, same-origin fetch of /rwallet/assets.json. No signing, no keys, no inline code.
 * Shows the signed-in ASSM profile's RID assets inside the profile ЯWALLET (> Wallet, .csp-rwx). */
(function(w){"use strict";var B=(document.currentScript&&document.currentScript.src||'').replace(/rgen-assets\.js.*$/,'')||'/rwallet/',F=null;
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function who(){var c=w.RASSM&&w.RASSM.card&&w.RASSM.card(),L=w.RWALLET_RID_LINK;return{rid:(c&&c.rid)||(L&&L.owner)||'ЯID-0001-3QQS',handle:(c&&c.handle)||'@chaserizal'}}
function norm(h){h=String(h||'').toLowerCase();return h.charAt(0)==='@'?h:'@'+h}
function pick(f,me){var o=f&&f.owners||[],i;for(i=0;i<o.length;i++)if(o[i].rid===me.rid)return o[i];for(i=0;i<o.length;i++)if(norm(o[i].handle)===norm(me.handle))return o[i];return null}
function card(f,me){var o=pick(f,me),box=el('div','rs-card rgen-assets');box.id='rgen-assets';
 box.appendChild(el('div','rs-h','ЯID ASSETS · RGENERATR · '+me.rid));
 if(!o||!(o.assets||[]).length){box.appendChild(el('div','rs-d','no RID assets yet'));return box}
 o.assets.forEach(function(a){var W=a.wallet||{},live=!!(a.block&&a.chain_verify&&a.chain_verify.ok&&String(W.badge||'').toUpperCase()==='LIVE'),r=el('div','rs-row');
  r.appendChild(el('span',null,(W.display||a.label||a.asset_id)));r.appendChild(el('b',null,(W.balance!=null?W.balance:1)+' '+(W.unit||'')+' · '+(live?'LIVE':'PREVIEW')));box.appendChild(r);
  box.appendChild(el('div','rs-d',a.asset_id+' · '+(a.owner_handle||o.handle)+(W.transferable?'':' · non-transferable')));
  box.appendChild(el('div','rs-d','seal '+String(a.seal_hash||'none').slice(0,16)+'… '+(a.seal_sig_present?'(signed)':'(awaiting signed seal)')));
  if(live)box.appendChild(el('div','rs-d','block #'+a.block.height+' '+String(a.block.hash).slice(0,16)+'… · '+a.block.ts));});
 box.appendChild(el('div','rs-d','read-only · LIVE only after a verified RGHOSTCHAIN mint'));return box}
function mount(){if(!F)return;var x=document.querySelector('.csp-rwx');if(!x)return;var me=who(),old=document.getElementById('rgen-assets'),n=card(F,me);
 if(old&&old.parentNode===x){if(old.textContent!==n.textContent)x.replaceChild(n,old);return}if(old)old.parentNode.removeChild(old);var t=document.getElementById('csp-ridtags');x.insertBefore(n,t&&t.parentNode===x?t.nextSibling:x.firstChild)}
w.RGEN_ASSETS_API={pick:pick,card:card,who:who,mount:mount};
fetch(B+'assets.json',{cache:'no-store',credentials:'same-origin'}).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(f){F=w.RGEN_ASSETS=f;mount();
 if(w.MutationObserver)new MutationObserver(function(){if(!document.getElementById('rgen-assets')||!document.querySelector('.csp-rwx #rgen-assets'))mount()}).observe(document.body,{childList:true,subtree:true})}).catch(function(){})})(window);

/* rwallet-linked 1.0 · 20261108-rwallet (t33u) · link external wallets WATCH-ONLY (OpenSea-style).
 * Linking = the EXTERNAL wallet signs a one-time ownership message ("Link to ЯID-0001-3QQS · nonce …"). RGHOSTKEY never signs it.
 * Stored: {chain, wallet, address, proof_sig, message, nonce, linked_at} (public data only). No spend permission, no keys.
 * Sends / swaps / trades deep-link to that wallet's own approval. Registers as a "linked" source in RWALLET_UNIFIED.addresses(). */
(function(w){"use strict";
var K="rwallet.linked.v1",OWNER="ЯID-0001-3QQS";
function ls(v){try{if(v===undefined)return JSON.parse(w.localStorage.getItem(K)||"[]");w.localStorage.setItem(K,JSON.stringify(v))}catch(e){return[]}}
function nonce(){var b=new Uint8Array(8);(w.crypto||{}).getRandomValues?w.crypto.getRandomValues(b):b.forEach(function(_,i){b[i]=Math.random()*256|0});return Array.prototype.map.call(b,function(x){return("0"+x.toString(16)).slice(-2)}).join("")}
function msg(chain,addr,n){return"Link to "+OWNER+" · RWALLET watch-only\nchain: "+chain+"\naddress: "+addr+"\nnonce: "+n+"\nissued: "+new Date().toISOString()+"\nThis signature grants NO spend permission."}
function hexOf(s){return"0x"+Array.prototype.map.call(new TextEncoder().encode(s),function(x){return("0"+x.toString(16)).slice(-2)}).join("")}
function b64(u8){var s="";for(var i=0;i<u8.length;i++)s+=String.fromCharCode(u8[i]);return btoa(s)}
var WALLETS={
 metamask:{name:"MetaMask",icon:"🦊",chain:"evm",installed:function(){return!!(w.ethereum&&w.ethereum.isMetaMask)},deeplink:"https://metamask.app.link/dapp/"+((w.location&&w.location.host)||"rizal.pw")},
 rainbow:{name:"Rainbow",icon:"🌈",chain:"evm",installed:function(){return!!(w.ethereum&&w.ethereum.isRainbow)},deeplink:"https://rnbwapp.com/"},
 phantom:{name:"Phantom",icon:"👻",chain:"solana",installed:function(){return!!(w.phantom&&w.phantom.solana||w.solana&&w.solana.isPhantom)},deeplink:"https://phantom.app/ul/browse/"+encodeURIComponent((w.location&&w.location.href)||"https://rizal.pw/")},
 walletconnect:{name:"WalletConnect",icon:"⛓",chain:"evm",installed:function(){return!!w.RWALLET_WC},deeplink:null}};
function linkEVM(id){var eth=w.ethereum;if(!eth)return Promise.reject(new Error(WALLETS[id].name+" not installed here: open "+(WALLETS[id].deeplink||"the wallet")));
  return eth.request({method:"eth_requestAccounts"}).then(function(a){var addr=a[0],n=nonce(),m=msg("evm",addr,n);
    return eth.request({method:"personal_sign",params:[hexOf(m),addr]}).then(function(sig){return{chain:"evm",wallet:id,address:addr,proof_sig:sig,message:m,nonce:n}})})}
function linkSOL(){var p=(w.phantom&&w.phantom.solana)||w.solana;if(!p)return Promise.reject(new Error("Phantom not installed here: open "+WALLETS.phantom.deeplink));
  return p.connect().then(function(r){var addr=String((r&&r.publicKey)||p.publicKey),n=nonce(),m=msg("solana",addr,n);
    return p.signMessage(new TextEncoder().encode(m),"utf8").then(function(s){return{chain:"solana",wallet:"phantom",address:addr,proof_sig:b64(s.signature||s),message:m,nonce:n}})})}
function link(id){var W=WALLETS[id];if(!W)return Promise.reject(new Error("unknown wallet"));
  if(id==="walletconnect"&&!w.RWALLET_WC)return Promise.reject(new Error("WalletConnect v2 needs a project id: set window.RWALLET_WC (config only)"));
  var p=id==="phantom"?linkSOL():id==="walletconnect"?w.RWALLET_WC.link(msg):linkEVM(id);
  return p.then(function(x){x.linked_at=new Date().toISOString();x.watch_only=true;var L=ls().filter(function(y){return!(y.chain===x.chain&&String(y.address).toLowerCase()===String(x.address).toLowerCase())});L.push(x);ls(L);
    // best-effort server copy (public data only); submitd verification of proofs is a later step
    if(w.RMINT_TRANSPORT)w.RMINT_TRANSPORT.call("/rwallet/linked","POST",{owner:OWNER,linked:{chain:x.chain,wallet:x.wallet,address:x.address,proof_sig:x.proof_sig,message:x.message,nonce:x.nonce}},{queue:false});
    try{w.dispatchEvent(new CustomEvent("rwallet:linked",{detail:x}))}catch(e){}return x})}
function unlink(addr){ls(ls().filter(function(y){return y.address!==addr}));return true} /* local view only: hides the card; the external wallet is untouched */
function list(){return ls()}
function rows(){return ls().map(function(x){var W=WALLETS[x.wallet]||{name:x.wallet,icon:"◇"};return{name:W.name+" · watch-only",chain:x.chain,address:x.address,balance:null,unit:x.chain==="evm"?"ETH":"SOL",source:"linked",watch_only:true}})}
function openExternal(addr){var x=ls().filter(function(y){return y.address===addr})[0],W=x&&WALLETS[x.wallet];if(W&&W.deeplink)w.open(W.deeplink,"_blank");return!!(W&&W.deeplink)}
/* balance read (public RPC, watch-only). EVM RPC/ Solana RPC are config: window.RWALLET_RPC={evm:"…",solana:"…"} */
function balance(x){var R=w.RWALLET_RPC||{evm:"https://ethereum-rpc.publicnode.com",solana:"https://solana-rpc.publicnode.com"};
  var body=x.chain==="evm"?{jsonrpc:"2.0",id:1,method:"eth_getBalance",params:[x.address,"latest"]}:{jsonrpc:"2.0",id:1,method:"getBalance",params:[x.address]};
  return fetch(R[x.chain],{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}).then(function(r){return r.json()}).then(function(j){
    if(x.chain==="evm")return(parseInt(j.result,16)/1e18).toFixed(4)+" ETH";return((j.result&&j.result.value||0)/1e9).toFixed(4)+" SOL"}).catch(function(){return"—"})}
var U=w.RWALLET_UNIFIED;if(U&&U.addresses&&!U.__linked){var a0=U.addresses;U.addresses=function(){return(a0.apply(U,arguments)||[]).concat(rows())};U.__linked=true}
w.RWALLET_LINKED={version:"1.0",wallets:WALLETS,link:link,unlink:unlink,list:list,rows:rows,balance:balance,openExternal:openExternal};
})(typeof window!=="undefined"?window:globalThis);

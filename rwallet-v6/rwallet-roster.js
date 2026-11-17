/* ЯWALLET staged unified roster · 20261110
 * Watch-only. No keys, no signing, no sending, no minting.
 * Loads data/wallets-public.json + data/token-pool.json and links
 * data/rtrackr-snapshot.json (RTRACKR) instead of forking numbers.
 * Online: public Solana RPC + GeckoTerminal. Offline: baked snapshot
 * (Tuesday, Nov 10, 2026, 1:55 PM MT). Every value is labeled with
 * source and time. Missing stays "missing". Units: Я / R only.
 */
(function(root){
"use strict";
var cs = document.currentScript && document.currentScript.src || "";
var BASE = cs.replace(/[^\/]*(\?.*)?$/,"") || "./";
var BAKE_LABEL = "Tuesday, Nov 10, 2026, 1:55 PM MT";
var BAKE_AT = "2026-11-10T13:55:41-07:00";
var MINT = "BB9uA5BuacDnWyDf5Npc9nMb9yFbyThsNrQPBYJ5Q1Lv";
var STATE = {
  mode: "offline",
  roster: null,
  tokenPool: null,
  snap: null,
  live: null,
  error: null
};

function E(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function miss(v){return (v==null || v==="" || v===undefined) ? "missing" : v}
function show(v){var x=miss(v); return x==="missing" ? "missing" : String(x)}

function mtNow(d){
  d = d || new Date();
  var fmt = new Intl.DateTimeFormat("en-US",{
    timeZone:"America/Denver", weekday:"long", month:"short",
    day:"numeric", year:"numeric", hour:"numeric", minute:"2-digit",
    second:"2-digit", hour12:true
  });
  var parts = fmt.formatToParts(d);
  function g(t){for(var i=0;i<parts.length;i++) if(parts[i].type===t) return parts[i].value; return ""}
  return g("weekday")+", "+g("month")+" "+g("day")+", "+g("year")+", "+g("hour")+":"+g("minute")+":"+g("second")+" "+g("dayPeriod")+" MT";
}
function mtIso(d){
  d = d || new Date();
  var s = d.toLocaleString("en-US",{timeZone:"America/Denver", hour12:false});
  // fallback ISO with fixed offset from format
  var fmt = new Intl.DateTimeFormat("en-CA",{
    timeZone:"America/Denver", year:"numeric", month:"2-digit", day:"2-digit",
    hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:false, timeZoneName:"shortOffset"
  });
  var parts = fmt.formatToParts(d);
  function g(t){for(var i=0;i<parts.length;i++) if(parts[i].type===t) return parts[i].value; return ""}
  var off = (g("timeZoneName")||"GMT-07").replace("GMT","").replace("UTC","") || "-07:00";
  if(/^[+-]\d{2}$/.test(off)) off = off+":00";
  if(/^[+-]\d{2}\d{2}$/.test(off)) off = off.slice(0,3)+":"+off.slice(3);
  return g("year")+"-"+g("month")+"-"+g("day")+"T"+g("hour")+":"+g("minute")+":"+g("second")+off;
}

function val(value, source, at, atLabel){
  var missing = (value==null || value==="" || value==="missing");
  return {
    value: missing ? "missing" : value,
    source: source || "missing",
    at: at || "missing",
    at_label: atLabel || "missing"
  };
}

function J(path){
  return fetch(BASE+path, {cache:"no-store"}).then(function(r){
    if(!r.ok) throw new Error(path+" HTTP "+r.status);
    return r.json();
  });
}

function labeled(v){
  if(!v) return '<span class="ru-miss">missing</span>';
  var shown = show(v.value);
  var cls = shown==="missing" ? "ru-miss" : "ru-val";
  return '<span class="'+cls+'">'+E(shown)+'</span>'+
    '<span class="ru-src">'+E(v.source||"missing")+' · '+E(v.at_label||v.at||"missing")+'</span>';
}

function shortAddr(a){
  if(!a || a==="missing") return "missing";
  if(a.length<=12) return a;
  return a.slice(0,6)+"…"+a.slice(-4);
}

/* ---------- bake from RTRACKR snapshot ---------- */
function holderByOwner(snap, addr){
  var acc = (((snap||{}).holders)||{}).accounts || [];
  for(var i=0;i<acc.length;i++) if(acc[i].owner===addr) return acc[i];
  return null;
}
function walletByAddr(snap, addr){
  var rows = ((((snap||{}).wallets)||{}).solana) || [];
  for(var i=0;i<rows.length;i++) if(rows[i].address===addr) return rows[i];
  return null;
}

function bakeState(snap, roster, tokenPool){
  var t = (snap&&snap.token)||{};
  var a = (snap&&snap.authority)||{};
  var p = (snap&&snap.pool)||{};
  var bakedAt = (snap&&snap.generated) || BAKE_AT;
  var bakedLb = (snap&&snap.generated_label) || BAKE_LABEL;
  var bakeSrc = "RTRACKR rtrackr-snapshot.json (baked)";
  function b(v, src, at, lb){ return val(v, src||bakeSrc, at||bakedAt, lb||bakedLb); }

  var token = {
    name: b(t.name||"Я"),
    symbol: b(t.symbol||"Я"),
    mint: b(t.mint||(tokenPool&&tokenPool.mint)||MINT, "token-pool.json + rtrackr-snapshot.json", bakedAt, bakedLb),
    decimals: b(t.decimals!=null?t.decimals:(tokenPool&&tokenPool.decimals), t.source||bakeSrc, t.at||bakedAt, t.at_label||bakedLb),
    supply_ui: b(t.supply_ui||(tokenPool&&tokenPool.supply_ui)),
    token_program: b(t.token_program),
    mint_authority: b(a.mint_authority, a.source, a.at, a.at_label),
    mint_authority_status: b(a.mint_authority_status, a.source, a.at, a.at_label),
    freeze_authority: b(a.freeze_authority==null?"revoked":a.freeze_authority, a.source, a.at, a.at_label),
    freeze_authority_status: b(a.freeze_authority_status, a.source, a.at, a.at_label),
    created_at_label: b(t.created_at_label)
  };

  var pool = {
    dex: b(p.dex||"Orca"),
    pool_type: b(p.pool_type||"splashpool"),
    pair: b(p.pair||"Я / SOL"),
    address: b(p.address||((tokenPool&&tokenPool.pool)||{}).address),
    token_vault_ya: b(p.token_vault_ya),
    token_vault_sol: b(p.token_vault_sol),
    position_nft: b(p.position_nft),
    whirlpool_program: b(p.whirlpool_program),
    price_usd: b(p.price_usd, (p.sources&&p.sources[0]&&p.sources[0].source)||"GeckoTerminal (baked)", p.at||((p.sources&&p.sources[0]&&p.sources[0].at)), p.at_label||((p.sources&&p.sources[0]&&p.sources[0].at_label))),
    price_sol: b(p.price_sol, (p.sources&&p.sources[0]&&p.sources[0].source)||"GeckoTerminal (baked)", p.at||((p.sources&&p.sources[0]&&p.sources[0].at)), p.at_label||((p.sources&&p.sources[0]&&p.sources[0].at_label))),
    sol_price_usd: b(p.sol_price_usd, (p.sources&&p.sources[0]&&p.sources[0].source)||"GeckoTerminal (baked)", p.at, p.at_label||((p.sources&&p.sources[0]&&p.sources[0].at_label))),
    fdv_usd: b(p.fdv_usd, (p.sources&&p.sources[0]&&p.sources[0].source)||"GeckoTerminal (baked)", p.at, p.at_label||((p.sources&&p.sources[0]&&p.sources[0].at_label))),
    market_cap_usd: b(p.market_cap_usd!=null?p.market_cap_usd:(p.market_cap_display||"missing"), (p.sources&&p.sources[0]&&p.sources[0].source)||"GeckoTerminal (baked)", p.at, p.at_label||((p.sources&&p.sources[0]&&p.sources[0].at_label))),
    liquidity_usd: b(p.liquidity_usd, (p.sources&&p.sources[0]&&p.sources[0].source)||"GeckoTerminal (baked)", p.at, p.at_label||((p.sources&&p.sources[0]&&p.sources[0].at_label))),
    volume_24h_usd: b(p.volume_24h_usd, (p.sources&&p.sources[0]&&p.sources[0].source)||"GeckoTerminal (baked)", p.at, p.at_label||((p.sources&&p.sources[0]&&p.sources[0].at_label))),
    fee_lp_percent: b(p.fee_lp_percent, "Orca API feeRate (baked)", p.orca_api_updated_at_utc, p.orca_api_updated_at_label),
    live_vault_ya_ui: b(p.live_vault_ya_ui||p.orca_token_balance_ya_ui, "Solana RPC vault (baked)", p.at||bakedAt, p.at_label||bakedLb),
    orca_token_balance_sol_ui: b(p.orca_token_balance_sol_ui, "Orca API token_balance (baked; document may be stale)", p.orca_api_updated_at_utc, p.orca_api_updated_at_label),
    dexscreener: b(p.dexscreener||"missing")
  };

  var solana = (roster&&roster.records||[]).map(function(r){
    var w = walletByAddr(snap, r.address);
    var h = holderByOwner(snap, r.address);
    var typo = r.kind==="solana-typo-variant";
    var ya = typo ? "missing" : (w && w.ya_balance!=null ? w.ya_balance : (h && h.amount_ui!=null ? h.amount_ui : (r.status&&/typo/.test(r.status)?"missing":null)));
    var sol = typo ? "missing" : (w && w.sol_balance!=null ? w.sol_balance : null);
    var yaSrc = typo ? "no on-chain account" : ((w&&w.balance_source)||bakeSrc);
    var yaAt = typo ? (w&&w.balance_at)||BAKE_AT : ((w&&w.balance_at)||bakedAt);
    var yaLb = typo ? "Tuesday, Nov 10, 2026, 1:52:32 PM MT" : ((w&&w.balance_at_label)||bakedLb);
    return Object.assign({}, r, {
      ya_balance: b(ya, yaSrc, yaAt, yaLb),
      sol_balance: b(sol, yaSrc, yaAt, yaLb),
      token_account_value: b(r.token_account==="missing"||!r.token_account?"missing":(w&&w.token_account)||r.token_account)
    });
  });

  return {token:token, pool:pool, solana:solana, rid_linked:(roster&&roster.rid_linked)||[], missing:((((snap||{}).wallets)||{}).missing)||[]};
}

/* ---------- live public fetch ---------- */
function rpcCall(urls, method, params){
  var body = JSON.stringify({jsonrpc:"2.0", id:1, method:method, params:params});
  var i = 0;
  function tryOne(){
    if(i>=urls.length) return Promise.reject(new Error("all RPC endpoints failed"));
    var url = urls[i++];
    return fetch(url, {method:"POST", headers:{"content-type":"application/json"}, body:body}).then(function(r){
      if(!r.ok) throw new Error("HTTP "+r.status);
      return r.json();
    }).then(function(j){
      if(j.error) throw new Error(j.error.message||"rpc error");
      return {result:j.result, url:url};
    }).catch(function(){ return tryOne(); });
  }
  return tryOne();
}

function lamportsToSol(l){ return (Number(l)||0)/1e9; }
function uiAmount(r){
  if(!r) return null;
  if(r.uiAmountString!=null) return r.uiAmountString;
  if(r.uiAmount!=null) return String(r.uiAmount);
  return null;
}

function liveRefresh(tokenPool, roster){
  var urls = ((tokenPool||{}).live||{}).solana_rpc || [
    "https://api.mainnet-beta.solana.com",
    "https://solana-rpc.publicnode.com",
    "https://solana.drpc.org"
  ];
  var gtUrl = ((tokenPool||{}).live||{}).geckoterminal_pool ||
    ("https://api.geckoterminal.com/api/v2/networks/solana/pools/"+((((tokenPool||{}).pool)||{}).address||""));
  var addrs = (roster.records||[]).filter(function(r){return r.address && r.kind!=="solana-typo-variant"}).map(function(r){return r.address});
  var typo = (roster.records||[]).filter(function(r){return r.kind==="solana-typo-variant"});
  var vaultYa = (((tokenPool||{}).pool)||{}).token_vault_ya;
  var at, lb, rpcName;

  var mintP = rpcCall(urls, "getAccountInfo", [MINT, {encoding:"jsonParsed"}]);
  var balP = Promise.all(addrs.map(function(a){ return rpcCall(urls, "getBalance", [a]).then(function(x){return {addr:a, lamports:x.result&&x.result.value, url:x.url}}).catch(function(){return {addr:a, lamports:null, url:null}}); }));
  var recByAddr={}; (roster.records||[]).forEach(function(r){ if(r.address) recByAddr[r.address]=r; });
  var tokP = Promise.all(addrs.map(function(a){
    var ata=(recByAddr[a]&&recByAddr[a].token_account&&recByAddr[a].token_account!=="missing")?recByAddr[a].token_account:null;
    var byAta = ata ? rpcCall(urls, "getAccountInfo", [ata, {encoding:"jsonParsed"}]).then(function(x){
      var r=tokenAmtFromAccount(x); r.addr=a; r.ata=ata; return r;
    }).catch(function(){ return null; }) : Promise.resolve(null);
    return byAta.then(function(got){
      if(got && got.ok && got.amount!=null) return got;
      return rpcCall(urls, "getTokenAccountsByOwner", [a, {mint:MINT}, {encoding:"jsonParsed"}]).then(function(x){
        var accs = (((x.result||{}).value)||[]);
        var first = accs[0];
        var info = first && first.account && first.account.data && first.account.data.parsed && first.account.data.parsed.info;
        return {addr:a, ata: first && first.pubkey, amount: info && info.tokenAmount && uiAmount(info.tokenAmount), url:x.url, ok:true};
      }).catch(function(){ return {addr:a, ata:null, amount:null, url:null, ok:false}; });
    });
  }));
  function tokenAmtFromAccount(x){
    var info=x && x.result && x.result.value && x.result.value.data && x.result.value.data.parsed && x.result.value.data.parsed.info;
    return info && info.tokenAmount ? {ata:null, amount:uiAmount(info.tokenAmount), url:x.url, ok:true} : {ata:null, amount:null, url:x&&x.url, ok:false};
  }
  var typoP = Promise.all(typo.map(function(r){
    return rpcCall(urls, "getAccountInfo", [r.address, {encoding:"jsonParsed"}]).then(function(x){
      return {addr:r.address, exists: !!(x.result&&x.result.value), url:x.url};
    }).catch(function(){ return {addr:r.address, exists:null, url:null}; });
  }));
  var vaultP = vaultYa ? rpcCall(urls, "getAccountInfo", [vaultYa, {encoding:"jsonParsed"}]) : Promise.resolve(null);
  var gtP = fetch(gtUrl, {headers:{"accept":"application/json"}}).then(function(r){
    if(!r.ok) throw new Error("GT HTTP "+r.status);
    return r.json();
  }).catch(function(e){ return {error:String(e&&e.message||e)}; });

  return Promise.all([mintP, balP, tokP, typoP, vaultP, gtP]).then(function(pack){
    at = mtIso(); lb = mtNow();
    var mintRes = pack[0];
    rpcName = "Solana RPC "+(mintRes.url||"public")+" getAccountInfo/getBalance/getTokenAccountsByOwner";
    var parsed = mintRes.result && mintRes.result.value && mintRes.result.value.data && mintRes.result.value.data.parsed && mintRes.result.value.data.parsed.info || {};
    var bals = {}; pack[1].forEach(function(x){ bals[x.addr]=x; });
    var toks = {}; pack[2].forEach(function(x){ toks[x.addr]=x; });
    var typos = {}; pack[3].forEach(function(x){ typos[x.addr]=x; });
    var vaultInfo = pack[4] && pack[4].result && pack[4].result.value && pack[4].result.value.data && pack[4].result.value.data.parsed && pack[4].result.value.data.parsed.info;
    var vaultAmt = vaultInfo && vaultInfo.tokenAmount && uiAmount(vaultInfo.tokenAmount);
    var gt = pack[5] || {};
    var attrs = (gt.data && gt.data.attributes) || null;
    var gtSrc = "GeckoTerminal API (live)";
    var gtOk = !!attrs;

    function lv(v, src){ return val(v, src||rpcName, at, lb); }

    var freeze = parsed.freezeAuthority==null ? "revoked" : parsed.freezeAuthority;
    var tokenLive = {
      decimals: lv(parsed.decimals),
      supply_ui: lv(parsed.supply!=null ? String(Number(parsed.supply)/1e9) : "missing"),
      mint_authority: lv(parsed.mintAuthority||"missing"),
      freeze_authority: lv(freeze),
      freeze_authority_status: lv(parsed.freezeAuthority==null?"revoked":"set")
    };
    if(parsed.supply!=null && parsed.decimals!=null){
      var dec = Number(parsed.decimals);
      var raw = String(parsed.supply);
      var ui;
      if(raw.length<=dec) ui = "0."+("0".repeat(dec-raw.length))+raw;
      else ui = raw.slice(0,-dec)+"."+raw.slice(-dec);
      ui = ui.replace(/\.?0+$/,"");
      if(ui===""||ui===".") ui="0";
      tokenLive.supply_ui = lv(ui);
    }

    var poolLive = {};
    if(gtOk){
      poolLive.price_usd = val(attrs.base_token_price_usd, gtSrc, at, lb);
      poolLive.price_sol = val(attrs.base_token_price_native_currency, gtSrc, at, lb);
      poolLive.sol_price_usd = val(attrs.quote_token_price_usd, gtSrc, at, lb);
      poolLive.fdv_usd = val(attrs.fdv_usd, gtSrc, at, lb);
      poolLive.market_cap_usd = val(attrs.market_cap_usd, gtSrc, at, lb);
      poolLive.liquidity_usd = val(attrs.reserve_in_usd, gtSrc, at, lb);
      var vol = attrs.volume_usd && (attrs.volume_usd.h24!=null?attrs.volume_usd.h24:attrs.volume_usd);
      poolLive.volume_24h_usd = val(vol, gtSrc, at, lb);
    }
    if(vaultAmt!=null) poolLive.live_vault_ya_ui = lv(vaultAmt);

    var solanaLive = {};
    addrs.forEach(function(a){
      var b=bals[a]||{}, t=toks[a]||{};
      solanaLive[a] = {
        sol_balance: lv(b.lamports==null?"missing":String(lamportsToSol(b.lamports))),
        ya_balance: lv(t.amount==null?"missing":t.amount),
        token_account_value: lv(t.ata||"missing")
      };
    });
    typo.forEach(function(r){
      var t=typos[r.address]||{};
      solanaLive[r.address] = {
        sol_balance: val("missing", t.exists===false?"Solana RPC getAccountInfo · no account":rpcName, at, lb),
        ya_balance: val("missing", "typo variant · no on-chain account", at, lb),
        token_account_value: val("missing", "typo variant", at, lb)
      };
    });

    return {ok:true, at:at, at_label:lb, rpc:rpcName, token:tokenLive, pool:poolLive, solana:solanaLive, gt_ok:gtOk, gt_error: gt.error||null};
  });
}

function mergeLive(base, live){
  if(!live||!live.ok) return base;
  function over(dst, src){
    if(!src) return;
    Object.keys(src).forEach(function(k){ if(src[k] && src[k].value!==undefined) dst[k]=src[k]; });
  }
  over(base.token, live.token);
  over(base.pool, live.pool);
  function prefer(liveV, bakeV, allowMissing){
    if(!liveV) return bakeV;
    if(liveV.value!=="missing" && liveV.value!=null && liveV.value!=="") return liveV;
    if(allowMissing) return liveV;
    return bakeV;
  }
  (base.solana||[]).forEach(function(row){
    var u = live.solana && live.solana[row.address];
    var typo = row.kind==="solana-typo-variant";
    if(u){
      row.ya_balance=prefer(u.ya_balance, row.ya_balance, typo);
      row.sol_balance=prefer(u.sol_balance, row.sol_balance, typo);
      if(u.token_account_value && u.token_account_value.value!=="missing") row.token_account_value=u.token_account_value;
    }
  });
  return base;
}

function wrapAddrs(view){
  var U = root.RWALLET_UNIFIED;
  if(!U || U.__rosterWrapped) return;
  var orig = U.addresses;
  U.addresses = function(){
    var base = orig ? orig() : [];
    var seen = {};
    base.forEach(function(a){ if(a.publicAddress) seen[a.publicAddress]=1; });
    (view.solana||[]).forEach(function(r){
      if(!r.address || seen[r.address]) return;
      seen[r.address]=1;
      var ya = r.ya_balance && r.ya_balance.value;
      var sol = r.sol_balance && r.sol_balance.value;
      var bal = (ya!=null && ya!=="missing") ? ya : sol;
      var unit = (ya!=null && ya!=="missing") ? "Я" : ((sol!=null && sol!=="missing") ? "SOL" : "");
      base.push({
        name: r.name+(r.status && r.status!=="current" ? " · "+r.status : ""),
        chain: r.chain||"solana",
        publicAddress: r.address,
        balance: (bal==null||bal==="missing")?null:bal,
        unit: unit,
        status: r.status,
        rid: r.rid,
        watchOnly: true
      });
    });
    return base;
  };
  U.__rosterWrapped = true;
}

function chip(){
  var live = STATE.mode==="online";
  var label = live
    ? ("LIVE · "+((STATE.live&&STATE.live.at_label)||mtNow()))
    : ("OFFLINE · bake "+BAKE_LABEL);
  return '<span class="ru-chip '+(live?"on":"off")+'">'+E(label)+'</span>';
}

function kv(label, v){
  return '<div class="ru-kv"><dt>'+E(label)+'</dt><dd>'+labeled(typeof v==="object"&&v&&"value" in v?v:val(v))+'</dd></div>';
}

function render(){
  var el = document.getElementById("ru-roster");
  if(!el) return;
  var v = STATE.view;
  if(!v){
    el.innerHTML = '<div class="ru-err">roster: '+(STATE.error?E(STATE.error):"loading…")+'</div>';
    return;
  }
  var t=v.token, p=v.pool;
  var h = "";
  h += '<div class="ru-bar"><div class="ru-h">ЯWALLET · unified roster <small>watch-only · public addresses · no keys</small></div>'+chip()+
    '<button type="button" class="ru-refresh" id="ru-refresh">Refresh live</button></div>';
  if(STATE.live && STATE.live.gt_error && STATE.mode==="online"){
    h += '<p class="ru-note">GeckoTerminal live fetch failed ('+E(STATE.live.gt_error)+'); prices below may still be the baked snapshot. RPC values are live when labeled as such.</p>';
  }
  if(STATE.mode==="offline"){
    h += '<p class="ru-note">Showing the baked RTRACKR snapshot ('+E(BAKE_LABEL)+'). Live public Solana RPC + GeckoTerminal will replace values when the refresh succeeds.</p>';
  }

  h += '<div class="ru-cols"><section class="ru-sec"><h2>Я token</h2><div class="ru-grid">';
  h += kv("name", t.name)+kv("mint", t.mint)+kv("decimals", t.decimals)+kv("supply", t.supply_ui);
  h += kv("token program", t.token_program);
  h += kv("mint authority", t.mint_authority);
  h += kv("mint authority status", t.mint_authority_status);
  h += kv("freeze authority", t.freeze_authority);
  h += kv("freeze status", t.freeze_authority_status);
  h += kv("created", t.created_at_label);
  h += '</div><p class="ru-note">Linked to RTRACKR <a href="data/rtrackr-snapshot.json">rtrackr-snapshot.json</a>. Freeze authority is revoked on-chain; mint authority remains the Crown wallet.</p></section>';

  h += '<section class="ru-sec"><h2>Orca splash pool · Я / SOL</h2><div class="ru-grid">';
  h += kv("dex", p.dex)+kv("type", p.pool_type)+kv("pair", p.pair);
  h += kv("pool", p.address);
  h += kv("Я vault", p.token_vault_ya);
  h += kv("SOL vault", p.token_vault_sol);
  h += kv("position NFT", p.position_nft);
  h += kv("whirlpool program", p.whirlpool_program);
  h += kv("price USD", p.price_usd);
  h += kv("price SOL", p.price_sol);
  h += kv("SOL USD", p.sol_price_usd);
  h += kv("FDV USD", p.fdv_usd);
  h += kv("market cap USD", p.market_cap_usd);
  h += kv("liquidity USD", p.liquidity_usd);
  h += kv("volume 24h USD", p.volume_24h_usd);
  h += kv("LP fee", p.fee_lp_percent);
  h += kv("Я in vault", p.live_vault_ya_ui);
  h += kv("SOL in vault (Orca doc)", p.orca_token_balance_sol_ui);
  h += kv("DexScreener", p.dexscreener);
  h += '</div><p class="ru-note"><a href="https://www.geckoterminal.com/solana/pools/HSroUxVkVKv6kX9e7dpoJtbFqKcL76BzrkuuRfAGxs9s">GeckoTerminal</a> · <a href="https://solscan.io/token/BB9uA5BuacDnWyDf5Npc9nMb9yFbyThsNrQPBYJ5Q1Lv">Solscan mint</a></p></section>';

  h += '</div><section class="ru-sec"><h2>Solana wallets</h2><div class="ru-table-wrap"><table class="ru-table"><thead><tr><th>Name</th><th>Status</th><th>RID</th><th>Address</th><th>Я</th><th>SOL</th></tr></thead><tbody>';
  (v.solana||[]).forEach(function(r){
    h += '<tr class="'+(r.kind==="solana-typo-variant"?"typo":(String(r.status||"").indexOf("previous")===0?"prev":""))+'">';
    h += '<td>'+E(r.name)+'</td>';
    h += '<td>'+E(r.status||"missing")+'</td>';
    h += '<td>'+E(show(r.rid))+'</td>';
    h += '<td class="addr" title="'+E(r.address)+'">'+E(r.address||"missing")+'</td>';
    h += '<td>'+labeled(r.ya_balance)+'</td>';
    h += '<td>'+labeled(r.sol_balance)+'</td>';
    h += '</tr>';
    if(r.note) h += '<tr class="note"><td colspan="6">'+E(r.note)+'</td></tr>';
  });
  h += '</tbody></table></div></section>';

  h += '<section class="ru-sec"><h2>RID-linked seats (unseated)</h2><p class="ru-note">Eight @chaserizal seats share ЯID-0001-3QQS. ThundR is ЯID-0014-KREH. GHOSTCUBE is ЯID-0016-CG2C (Ghostroot unsigned). None of these rows hold a Solana pubkey yet. Watch-only.</p>';
  h += '<div class="ru-table-wrap"><table class="ru-table"><thead><tr><th>#</th><th>Name</th><th>RID</th><th>App / device</th><th>Status</th><th>Address</th></tr></thead><tbody>';
  (v.rid_linked||[]).forEach(function(r){
    h += '<tr>';
    h += '<td>'+E(r.n)+'</td><td>'+E(r.name)+'</td><td>'+E(show(r.rid))+'</td>';
    h += '<td>'+E(show(r.app_or_device))+'</td><td>'+E(show(r.status))+'</td>';
    h += '<td>'+E(r.address?r.address:"missing")+'</td>';
    h += '</tr>';
    if(r.note) h += '<tr class="note"><td colspan="6">'+E(r.note)+'</td></tr>';
  });
  h += '</tbody></table></div></section>';

  if(v.missing && v.missing.length){
    h += '<section class="ru-sec"><h2>Missing</h2><ul class="ru-miss-list">';
    v.missing.forEach(function(m){ h += '<li>'+E(typeof m==="string"?m:(m.note||JSON.stringify(m)))+'</li>'; });
    h += '</ul></section>';
  }
  h += '<p class="ru-foot">Staged unified ЯWALLET · not a live deploy · RTRACKR snapshot linked at data/rtrackr-snapshot.json · units Я / R</p>';
  el.innerHTML = h;
  var btn = document.getElementById("ru-refresh");
  if(btn) btn.addEventListener("click", function(){ refresh(true); });
}

function applyView(){
  var base = bakeState(STATE.snap, STATE.roster, STATE.tokenPool);
  STATE.view = mergeLive(base, STATE.live);
  wrapAddrs(STATE.view);
  render();
  if(root.RWALLET && typeof root.RWALLET.render==="function"){
    try{ root.RWALLET.render(); }catch(e){}
  }
}

function refresh(forceLive){
  if(!STATE.roster || !STATE.snap) return;
  var p = liveRefresh(STATE.tokenPool, STATE.roster);
  return p.then(function(live){
    STATE.live = live;
    STATE.mode = "online";
    STATE.error = null;
    applyView();
  }).catch(function(err){
    STATE.mode = "offline";
    STATE.error = String(err&&err.message||err);
    if(forceLive) STATE.live = null;
    applyView();
  });
}

function boot(){
  Promise.all([
    J("data/wallets-public.json"),
    J("data/token-pool.json"),
    J("data/rtrackr-snapshot.json")
  ]).then(function(pack){
    STATE.roster = pack[0];
    STATE.tokenPool = pack[1];
    STATE.snap = pack[2];
    STATE.mode = "offline";
    applyView();
    // attach wrap even if UNIFIED ready later
    var U = root.RWALLET_UNIFIED;
    if(U && U.ready && U.ready.then) U.ready.then(function(){ applyView(); });
    return refresh(false);
  }).catch(function(err){
    STATE.error = String(err&&err.message||err);
    render();
  });
}

root.RWALLET_ROSTER = {state:STATE, refresh:function(){return refresh(true);}, render:render};
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
})(window);

/* rwallet-rtdata · preview · display-only reader for RtrackR v1.4 public JSON (embed first, optional live fetch later). No keys, no signing. */
(function(w){
  "use strict";
  var E = w.__RWALLET_RTDATA_EMBED__ || {};
  function miss(v){ return v===null || v===undefined || v===""; }
  function dash(v){ return miss(v) ? "—" : v; }
  function groupInt(s){
    var t=String(s);
    var neg=t.charAt(0)==="-"; if(neg)t=t.slice(1);
    if(!/^\d+$/.test(t)) return String(s);
    return (neg?"-":"")+t.replace(/\B(?=(\d{3})+(?!\d))/g,",");
  }
  function num(v){
    if(miss(v)) return "—";
    if(typeof v==="number"){
      if(!isFinite(v)) return "—";
      if(Math.abs(v)>=1e6 || (Number.isInteger(v)&&Math.abs(v)>=1000)) return groupInt(String(Math.trunc(v)))+(Number.isInteger(v)?"" : "");
      return String(v);
    }
    var s=String(v);
    if(/^\d+$/.test(s)) return groupInt(s);
    return s;
  }
  /* Keep exact recorded decimal strings; only group a leading integer part when it's a plain integer. */
  function amt(v){
    if(miss(v)) return "—";
    if(typeof v==="number"){
      if(!isFinite(v)) return "—";
      if(Number.isInteger(v)) return groupInt(String(v));
      return String(v);
    }
    var s=String(v);
    if(/^\d+$/.test(s)) return groupInt(s);
    return s;
  }
  var walletsDoc=E.wallets||{};
  var wallets=walletsDoc.wallets||[];
  var pool=((E.pool&&E.pool.pools)||[])[0]||null;
  var rates=E.rates||{};
  var rate=(rates.pair&&rates.pair.rate)||(rates.rcoin_to_rtoken)||{};
  if(!rate.rcoins_per_rtoken) rate={rcoins_per_rtoken:100,text:"100 R coins = 1 R token",rounding:"floor",minimum_rcoins:100,cap_rtoken_per_person_per_day:100};
  var token=(E.rtoken&&E.rtoken.token)||{};
  var chain=E.chain||{};
  var assets=chain.assets||[];
  var rcoin=chain.rcoin_amount; /* 0 is a real recorded amount */
  var rtokenTotal=walletsDoc.total_rtoken_ui;
  if(miss(rtokenTotal) && token.supply_ui!=null) rtokenTotal=token.supply_ui;

  w.RWALLET_RTDATA={
    ready:true,
    sources:E.sources||{},
    fetched_at:walletsDoc.fetched_at||(E.pool&&E.pool.fetched_at)||null,
    height: miss(chain.height)?null:chain.height,
    tip: chain.tip||null,
    block_count: chain.block_count,
    assets: assets,
    rcoin: rcoin,
    rtokenTotal: rtokenTotal,
    wallets: wallets,
    pool: pool,
    poolFetched: E.pool&&E.pool.fetched_at,
    rate: rate,
    rateText: "100 R coins = 1 R token",
    token: token,
    mint: token.mint||walletsDoc.mint||null,
    mintSupply: token.supply_ui!=null?token.supply_ui:(walletsDoc.total_rtoken_ui!=null?walletsDoc.total_rtoken_ui:null),
    dash:dash, amt:amt, num:num, groupInt:groupInt, miss:miss,
    short:function(h,n){h=String(h||"");n=n||4;return h.length>n*2+1?h.slice(0,n)+"…"+h.slice(-n):h||"—";}
  };
})(window);

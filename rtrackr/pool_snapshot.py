#!/usr/bin/env python3
"""RTRACKR pool snapshot v1 (20261114, Decider t237u). READ-ONLY.
Reads RGHOSTCHAIN/rtrackr/pools.json, pulls each tracked Orca Whirlpool's state over public Solana RPC
(PublicNode, mainnet-beta fallback) and writes rtrackr/data/token-pool.json + refreshes SHA256SUMS.
Optional USD/24h market numbers from the public GeckoTerminal API (labelled, never required).
No keys, no wallet, no signing, no swaps, no liquidity actions, no chain append.
Usage: pool_snapshot.py [--site /path/to/rizal.pw] [--out file.json] [--no-market] [--no-sums]"""
import base64, datetime, hashlib, json, os, struct, sys, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)  # .../RGHOSTCHAIN
POOLS = os.path.join(ROOT, 'rtrackr', 'pools.json')
SITE = os.path.normpath(os.path.join(ROOT, '..', 'rizal.pw'))
RPCS = ['https://solana-rpc.publicnode.com', 'https://api.mainnet-beta.solana.com']
B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
WHIRLPOOL_PROGRAM = 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc'
def b58(b):
    n = int.from_bytes(b, 'big'); s = ''
    while n: n, r = divmod(n, 58); s = B58[r] + s
    return '1' * (len(b) - len(b.lstrip(b'\0'))) + s
def http_json(url, body=None, timeout=20):
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None,
                                 headers={'Content-Type': 'application/json', 'Accept': 'application/json', 'User-Agent': 'rtrackr-pool-snapshot/1'})
    with urllib.request.urlopen(req, timeout=timeout) as r: return json.loads(r.read())
def rpc(method, params):
    err = None
    for u in RPCS:
        try:
            j = http_json(u, {'jsonrpc': '2.0', 'id': 1, 'method': method, 'params': params})
            if 'error' in j: raise RuntimeError(j['error'].get('message'))
            return j['result'], u
        except Exception as e: err = e
    raise RuntimeError('rpc unavailable: %s' % err)
def u128(d, o): lo, hi = struct.unpack_from('<QQ', d, o); return lo | (hi << 64)
def parse_whirlpool(d):
    """Orca Whirlpool account layout (653 bytes, after 8-byte discriminator)."""
    if len(d) < 261: raise ValueError('not a whirlpool account (%d bytes)' % len(d))
    return dict(whirlpools_config=b58(d[8:40]), tick_spacing=struct.unpack_from('<H', d, 41)[0],
                fee_rate=struct.unpack_from('<H', d, 45)[0], protocol_fee_rate=struct.unpack_from('<H', d, 47)[0],
                liquidity=str(u128(d, 49)), sqrt_price_x64=str(u128(d, 65)), tick_current_index=struct.unpack_from('<i', d, 81)[0],
                mint_a=b58(d[101:133]), vault_a=b58(d[133:165]), mint_b=b58(d[181:213]), vault_b=b58(d[213:245]))
def snap_pool(p):
    acct, via = rpc('getAccountInfo', [p['address'], {'encoding': 'base64', 'commitment': 'confirmed'}])
    v = acct.get('value') if acct else None
    if not v: raise RuntimeError('pool account not found')
    if v.get('owner') != WHIRLPOOL_PROGRAM: raise RuntimeError('owner is not Orca Whirlpool: %s' % v.get('owner'))
    w = parse_whirlpool(base64.b64decode(v['data'][0]))
    va, _ = rpc('getTokenAccountBalance', [w['vault_a']]); vb, _ = rpc('getTokenAccountBalance', [w['vault_b']])
    va, vb = va['value'], vb['value']
    da, db = va['decimals'], vb['decimals']
    price = (int(w['sqrt_price_x64']) / 2 ** 64) ** 2 * 10 ** (da - db)  # token_b per token_a
    amt_a, amt_b = float(va['uiAmountString']), float(vb['uiAmountString'])
    syms = {t.get('mint'): t.get('symbol') for t in (p.get('token_a') or {}, p.get('token_b') or {}) if t.get('mint')}
    sym = lambda m, _t=None: syms.get(m) or ('SOL' if m == 'So11111111111111111111111111111111111111112' else m[:6])
    sol_a = w['mint_a'].startswith('So1111111111'); sol_b = w['mint_b'].startswith('So1111111111')
    sigs, _ = rpc('getSignaturesForAddress', [p['address'], {'limit': 10}])
    out = dict(pool_id=p.get('pool_id'), label=p.get('label'), pair=p.get('pair'), dex=p.get('dex'), address=p['address'],
               program=v.get('owner'), lamports=v.get('lamports'), slot=acct['context']['slot'], rpc=via,
               tracking_only=True, no_swap=True, no_liquidity_actions=True, position_nft=p.get('position_nft'),
               token_a=dict(symbol=sym(w['mint_a'], p.get('token_a', {})), mint=w['mint_a'], vault=w['vault_a'], decimals=da, amount_raw=va['amount'], amount_ui=va['uiAmountString']),
               token_b=dict(symbol=sym(w['mint_b'], p.get('token_b', {})), mint=w['mint_b'], vault=w['vault_b'], decimals=db, amount_raw=vb['amount'], amount_ui=vb['uiAmountString']),
               tick_spacing=w['tick_spacing'], fee_rate=w['fee_rate'], fee_pct=w['fee_rate'] / 10000, liquidity=w['liquidity'],
               sqrt_price_x64=w['sqrt_price_x64'], tick_current_index=w['tick_current_index'],
               price_b_per_a=price, price_a_per_b=(1 / price if price else None),
               tvl_in_a=amt_a + (amt_b / price if price else 0), tvl_in_b=amt_b + amt_a * price,
               tvl_sol=(amt_a + (amt_b / price if price else 0)) if sol_a else ((amt_b + amt_a * price) if sol_b else None),
               whirlpools_config=w['whirlpools_config'],
               recent_signatures=[dict(signature=s['signature'], slot=s.get('slot'), blockTime=s.get('blockTime'), status='failed' if s.get('err') else s.get('confirmationStatus')) for s in (sigs or [])],
               links=dict(orca='https://www.orca.so/pools?tokens=' + w['mint_a'], solscan='https://solscan.io/account/' + p['address'],
                          explorer='https://explorer.solana.com/address/' + p['address'], geckoterminal='https://www.geckoterminal.com/solana/pools/' + p['address'],
                          dexscreener='https://dexscreener.com/solana/' + p['address']))
    return out
def market(addr):
    try:
        a = http_json('https://api.geckoterminal.com/api/v2/networks/solana/pools/' + addr)['data']['attributes']
        t = a.get('transactions', {}).get('h24', {})
        return dict(source='GeckoTerminal public API', reserve_usd=a.get('reserve_in_usd'), volume_24h_usd=(a.get('volume_usd') or {}).get('h24'),
                    trades_24h=(t.get('buys') or 0) + (t.get('sells') or 0), base_price_usd=a.get('base_token_price_usd'),
                    quote_price_usd=a.get('quote_token_price_usd'), fdv_usd=a.get('fdv_usd'), pool_created_at=a.get('pool_created_at'))
    except Exception as e: return dict(source='GeckoTerminal public API', error=str(e)[:200])
def main():
    av = sys.argv
    site = os.path.expanduser(av[av.index('--site') + 1]) if '--site' in av else SITE
    reg = json.load(open(POOLS, encoding='utf-8'))
    now = datetime.datetime.now().astimezone().isoformat(timespec='seconds')
    pools, errs = [], []
    for p in reg.get('pools', []):
        if not p.get('tracking_only'): errs.append('%s: skipped (not tracking_only)' % p.get('address')); continue
        try:
            s = snap_pool(p)
            if '--no-market' not in av: s['market'] = dict(market(p['address']), fetched_at=now)
            pools.append(s)
        except Exception as e: errs.append('%s: %s' % (p.get('address'), e))
    if not pools: sys.exit('no pool snapshot written: ' + '; '.join(errs))
    doc = dict(schema='rzl.rtrackr.pool.v1', fetched_at=now, chain='solana-mainnet',
               note='Read-only snapshot of tracked pools for RTRACKR offline fallback. Live page reads the same pool over public Solana RPC. Tracking only: no swaps, no liquidity actions, no keys.',
               ghostchain=dict(registry='RGHOSTCHAIN/rtrackr/pools.json', registry_schema=reg.get('schema'), onchain_rghostchain=False, sealed=False),
               pools=pools, errors=errs)
    data = json.dumps(doc, ensure_ascii=False, indent=1).encode()
    out = os.path.expanduser(av[av.index('--out') + 1]) if '--out' in av else os.path.join(site, 'rtrackr', 'data', 'token-pool.json')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    tmp = out + '.tmp'; open(tmp, 'wb').write(data); os.replace(tmp, out)
    print('wrote', out, len(data), 'bytes; pools', len(pools), 'errors', len(errs))
    if '--no-sums' not in av:
        d = os.path.dirname(out); sp = os.path.join(d, 'SHA256SUMS')
        lines = [l for l in (open(sp).read().splitlines() if os.path.exists(sp) else []) if l.strip()]
        names = {l.split(None, 1)[1].strip(): l for l in lines if len(l.split(None, 1)) == 2}
        for n in ('rghostchain.json', 'rtoken.json', 'token-pool.json'):
            f = os.path.join(d, n)
            if os.path.exists(f): names[n] = '%s  %s' % (hashlib.sha256(open(f, 'rb').read()).hexdigest(), n)
        open(sp, 'w').write('\n'.join(names[k] for k in sorted(names)) + '\n'); print('SHA256SUMS updated:', ', '.join(sorted(names)))
if __name__ == '__main__': main()

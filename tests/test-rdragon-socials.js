// socials (bio sources) list: github/site entries removed, editable one-per-line in inline edit (20261029).
const fs=require('fs'),path=require('path'),assert=require('assert'),root=path.join(__dirname,'..');
const rec=JSON.parse(fs.readFileSync(path.join(root,'data/founder/bio-source.json'),'utf8'));
assert.deepStrictEqual(rec.bio_sources,[{platform:'x',handle:'@chaserizal'}]);
const B=require(path.join(root,'rdragon-cryptosocial/rbiosource.js'));
assert.deepStrictEqual(B.parse('github RIZALEON'),{platform:'github',handle:'RIZALEON'});
assert.deepStrictEqual(B.parse('site https://rizal.pw'),{platform:'site',url:'https://rizal.pw'});
assert.strictEqual(B.parse('junk'),null);assert.strictEqual(B.line({platform:'x',handle:'@chaserizal'}),'x @chaserizal');
const H=B.html({record:rec,v:{state:'pending'}});assert(!/github|rizal\.info|site rizal/.test(H)&&!H.includes('</a> · '));
const csp=fs.readFileSync(path.join(root,'rdragon-cryptosocial/rdragon-cryptosocial.js'),'utf8');
assert(csp.includes('RBIOSOURCE.lines()')&&csp.includes('function bioSrcHtml')&&csp.includes('"biosrc"]'),'biosrc editable + rendered');
console.log('test-rdragon-socials: ok');

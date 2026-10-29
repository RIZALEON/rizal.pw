/* rdragon-quick.js · RDRAGON local fast path · 20261028 · no network, no model, no eval.
 * quick(q) -> {text, tier:"quick", model:"local-math"|"local-rule"} | null, in microseconds.
 * - safe arithmetic (tiny recursive-descent parser: + - * / ^ parentheses, words "times/plus/minus/divided by"), square root, percent / percent-off
 * - unit conversions (minutes/hours/days/seconds/weeks), weekday offsets, spell-backwards
 * stripAsk(q) removes answer-format instructions ("Just the number.", "One word.") so answers.json rows match.
 * Shared by rdragon-cryptosocial.js (comment ladder), rdragon-bundle-shim.js and rdragon-reply.rzl.js. */
(function(root){"use strict";
var INSTR=/\s*(?:\(|-|—)?\s*(?:please\s+)?(?:reply|answer|respond)?\s*(?:with\s+)?(?:just|only)\s+(?:the|a|one)?\s*(?:number|word|digit|answer|name)s?\.?\)?\s*$|\s*(?:in\s+)?(?:one|1|a\s+single)\s+word\.?\s*$|\s*short\s+answer\.?\s*$|\s*(?:be\s+)?brief\.?\s*$/i;
function stripAsk(q){q=String(q||"").trim();for(var i=0;i<4;i++){var n=q.replace(INSTR,"").trim();if(n===q)break;q=n}return q}
function fmt(n){if(!isFinite(n))return null;var r=Math.round(n*1e9)/1e9;return String(r)}
/* expression parser: only digits, . + - * / ^ ( ) and spaces ever reach it */
function calc(src){var s=String(src).replace(/\s+/g,""),i=0;if(!/^[0-9.+\-*/^()]+$/.test(s)||!/[0-9]/.test(s))return null;
 function num(){var m=s.slice(i).match(/^\d+(\.\d+)?|^\.\d+/);if(!m)throw 0;i+=m[0].length;return parseFloat(m[0])}
 function atom(){if(s[i]==="-"){i++;return -atom()}if(s[i]==="+"){i++;return atom()}if(s[i]==="("){i++;var v=add();if(s[i]!==")")throw 0;i++;return v}return num()}
 function pow(){var b=atom();if(s[i]==="^"){i++;return Math.pow(b,pow())}return b}
 function mul(){var v=pow();while(s[i]==="*"||s[i]==="/"){var o=s[i++],r=pow();if(o==="/"&&r===0)throw 0;v=o==="*"?v*r:v/r}return v}
 function add(){var v=mul();while(s[i]==="+"||s[i]==="-"){var o=s[i++],r=mul();v=o==="+"?v+r:v-r}return v}
 try{var v=add();if(i!==s.length)return null;return v}catch(e){return null}}
var WORDOPS=[[/\bmultiplied\s+by\b|\btimes\b|×|\bx\b(?=\s*\d)/g,"*"],[/\bdivided\s+by\b|\bover\b|÷/g,"/"],[/\bplus\b|\badded\s+to\b/g,"+"],[/\bminus\b|\bsubtract(?:ed)?\b/g,"-"],[/\bto\s+the\s+power\s+of\b|\*\*/g,"^"],[/\bsquared\b/g,"^2"],[/\bcubed\b/g,"^3"]];
var UNIT={second:1,sec:1,minute:60,min:60,hour:3600,hr:3600,day:86400,week:604800};
function unitOf(w){w=String(w||"").toLowerCase().replace(/s$/,"");return UNIT[w]?w:null}
var DAYS=["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1)}
function quick(q){var raw=String(q||"").trim();if(!raw||raw.length>300)return null;var t=stripAsk(raw).toLowerCase().replace(/[?!]+\s*$/,"").replace(/,/g,"").trim(),m;
 /* spell X backwards */
 if((m=t.match(/spell\s+(?:the\s+word\s+)?["'‘’“”]?([a-z]{1,40})["'‘’“”]?\s+backwards?/i)))return R(m[1].split("").reverse().join(""),"local-rule");
 /* weekday offsets */
 if((m=t.match(/today\s+is\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday).*?\bin\s+(\d{1,4})\s+days?/)))return R(cap(DAYS[(DAYS.indexOf(m[1])+ +m[2])%7]),"local-rule");
 /* how many minutes are in 2 hours */
 if((m=t.match(/how\s+many\s+([a-z]+)\s+(?:are\s+)?(?:there\s+)?in\s+(\d+(?:\.\d+)?)\s+([a-z]+)/))&&unitOf(m[1])&&unitOf(m[3]))return R(fmt(+m[2]*UNIT[unitOf(m[3])]/UNIT[unitOf(m[1])]),"local-math");
 /* square / cube root */
 if((m=t.match(/(square|cube)\s+root\s+of\s+(\d+(?:\.\d+)?)/)))return R(fmt(m[1]==="square"?Math.sqrt(+m[2]):Math.cbrt(+m[2])),"local-math");
 /* $20 ... 25% off -> sale price */
 if(/%\s*off|percent\s+off|discount/.test(t)){var p=t.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)/),c=t.replace(/(\d+(?:\.\d+)?)\s*(?:%|percent)/,"").match(/\$\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:dollars|usd)/);
  if(p&&c){var price=+(c[1]||c[2]);return R(fmt(price*(1-p[1]/100)),"local-math")}}
 /* X% of Y */
 if((m=t.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)\s+of\s+\$?(\d+(?:\.\d+)?)/)))return R(fmt(m[1]*m[2]/100),"local-math");
 /* plain arithmetic: "what is 17 + 25", "9 times 8", "calculate (3+4)*2" */
 var e=t.replace(/^(?:what\s+is|what's|whats|calculate|compute|solve|evaluate|how\s+much\s+is)\s+/,"");WORDOPS.forEach(function(w){e=e.replace(w[0],w[1])});e=e.replace(/=\s*$/,"").trim();
 if(/^[0-9.+\-*/^()\s]+$/.test(e)&&/\d\s*[+\-*/^]\s*[\d(-]/.test(e)){var v=calc(e);if(v!=null)return R(fmt(v),"local-math")}
 return null}
function R(text,model){return text==null?null:{text:String(text),tier:"quick",model:model}}
var API={quick:quick,calc:calc,stripAsk:stripAsk,VERSION:"rdragon-quick 1.0 20261028"};
root.RDRAGON_QUICK=API;if(typeof module==="object"&&module.exports)module.exports=API})(typeof self!=="undefined"?self:globalThis);

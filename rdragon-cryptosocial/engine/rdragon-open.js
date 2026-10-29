/* rdragon-open.js · RDRAGON offline open-ended composer · 20261028 · no network, no model, no eval.
 * compose(q) -> {text, tier:"open", model:"open-pack", kind} ALWAYS (never the "offline" placeholder).
 * Used when the local ladder (quick -> intent card -> answers.json) misses and granite is not ready within the
 * deadline (~2.5 s). Granite may later upgrade the reply in place (marked "upgraded").
 * Covers: identity, jokes, names/brainstorms, tips/how-to lists, haiku/poems, phrase translations, capitals/trivia,
 * word-problem arithmetic, project ideas, and an honest generic best-quick-take. */
(function(root){"use strict";
function pick(a,q){var h=0,s=String(q||"");for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return a[h%a.length]}
function topicOf(t,re){var m=t.match(re);return m?m[1].replace(/[?.!]+$/,"").trim():""}
var NUMW={zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,twenty:20,dozen:12};
function nums(t){return (t.replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|dozen)\b/g,function(w){return String(NUMW[w])}).match(/\d+(?:\.\d+)?/g)||[]).map(Number)}
function fmt(n){return String(Math.round(n*1e6)/1e6)}
function wordMath(t){var n=nums(t);if(n.length<2||!/\b(how many|how much|left|total|altogether|in all|each|remain|now)\b/.test(t))return null;var a=n[0],b=n[1];
 if(/\b(eat|eats|ate|give|gives|gave|lose|loses|lost|spend|spends|spent|take|takes|took|sell|sells|sold|use|uses|used|break|broke|minus|fewer|less|away|left|remain)/.test(t)&&!/\beach\b/.test(t))return {v:a-b,s:a+" − "+b};
 if(/\b(split|share|shared|divide|divided|equally|per person|among|between)\b/.test(t)&&b)return {v:a/b,s:a+" ÷ "+b};
 if(/\b(each|every|per|times|rows of|packs? of|boxes of|bags of)\b/.test(t))return {v:a*b,s:a+" × "+b};
 if(/\b(more|get|gets|got|buy|buys|bought|find|finds|found|add|adds|added|plus|another|total|altogether|in all|and)\b/.test(t))return {v:a+b,s:a+" + "+b};
 return null}
var CAP={australia:"Canberra",canada:"Ottawa",japan:"Tokyo",france:"Paris",germany:"Berlin",italy:"Rome",spain:"Madrid",brazil:"Brasília",mexico:"Mexico City","united states":"Washington, D.C.",usa:"Washington, D.C.",philippines:"Manila",china:"Beijing",india:"New Delhi",russia:"Moscow","united kingdom":"London",uk:"London",england:"London",egypt:"Cairo",kenya:"Nairobi","south africa":"Pretoria (executive), Cape Town (legislative) and Bloemfontein (judicial)",argentina:"Buenos Aires",turkey:"Ankara",switzerland:"Bern","new zealand":"Wellington","south korea":"Seoul",korea:"Seoul",thailand:"Bangkok",vietnam:"Hanoi",indonesia:"Jakarta",nigeria:"Abuja",portugal:"Lisbon",ireland:"Dublin",norway:"Oslo",sweden:"Stockholm",greece:"Athens",peru:"Lima",chile:"Santiago",colombia:"Bogotá"};
var TRIVIA=[[/largest planet/,"Jupiter is the largest planet in our solar system."],[/(tallest|highest) mountain/,"Mount Everest, about 8,849 m (29,032 ft) above sea level."],[/largest ocean/,"The Pacific Ocean."],[/(speed of light)/,"About 299,792 km per second in a vacuum."],[/how many continents/,"Seven: Africa, Antarctica, Asia, Australia (Oceania), Europe, North America and South America."],[/boiling point of water/,"100 °C (212 °F) at sea level."],[/(who wrote|author of) (romeo and juliet|hamlet|macbeth)/,"William Shakespeare."],[/closest star|nearest star/,"The Sun; after it, Proxima Centauri at about 4.24 light-years."],[/how many days in a (leap )?year/,"365 days, or 366 in a leap year."],[/chemical symbol for gold/,"Au."],[/chemical symbol for water|formula for water/,"H₂O."]];
var LANG={spanish:"es",español:"es",french:"fr",german:"de",italian:"it",portuguese:"pt",japanese:"ja",tagalog:"tl",filipino:"tl"};
var PHR={"good morning":{es:"Buenos días",fr:"Bonjour",de:"Guten Morgen",it:"Buongiorno",pt:"Bom dia",ja:"Ohayō gozaimasu (おはようございます)",tl:"Magandang umaga"},"good night":{es:"Buenas noches",fr:"Bonne nuit",de:"Gute Nacht",it:"Buona notte",pt:"Boa noite",ja:"Oyasumi nasai (おやすみなさい)",tl:"Magandang gabi"},"hello":{es:"Hola",fr:"Bonjour",de:"Hallo",it:"Ciao",pt:"Olá",ja:"Konnichiwa (こんにちは)",tl:"Kumusta"},"thank you":{es:"Gracias",fr:"Merci",de:"Danke",it:"Grazie",pt:"Obrigado / Obrigada",ja:"Arigatō (ありがとう)",tl:"Salamat"},"goodbye":{es:"Adiós",fr:"Au revoir",de:"Auf Wiedersehen",it:"Arrivederci",pt:"Adeus / Tchau",ja:"Sayōnara (さようなら)",tl:"Paalam"},"how are you":{es:"¿Cómo estás?",fr:"Comment ça va ?",de:"Wie geht's?",it:"Come stai?",pt:"Como vai?",ja:"O-genki desu ka? (お元気ですか)",tl:"Kumusta ka?"},"i love you":{es:"Te quiero / Te amo",fr:"Je t'aime",de:"Ich liebe dich",it:"Ti amo",pt:"Eu te amo",ja:"Aishiteru (愛してる)",tl:"Mahal kita"},"please":{es:"Por favor",fr:"S'il vous plaît",de:"Bitte",it:"Per favore",pt:"Por favor",ja:"Onegai shimasu (お願いします)",tl:"Pakiusap"}};
var JOKES=["Why did the dragon stop telling jokes at the campfire? Every punchline got roasted.","Why don't skeletons fight each other? They don't have the guts.","I told my computer I needed a break, and it said: no problem, I'll go to sleep.","Why do programmers prefer dark mode? Because light attracts bugs.","What do you call a dragon with no money? Broke and fire-less."];
var NAMES={dragon:["Ember","Cinder","Ashbloom","Pyra","Smolder","Obsidian","Kindle","Scorch"],cat:["Miso","Pixel","Saffron","Biscuit","Nimbus","Juniper"],dog:["Waffles","Rocket","Maple","Bruno","Pepper","Scout"],default:["Nova","Atlas","Pip","Sable","Echo","Quill"]};
var TIPS={sleep:["Keep a steady schedule: same bedtime and wake time, even on weekends.","Dim screens and bright lights for the last hour; let the room get dark, cool and quiet.","Skip caffeine after early afternoon and heavy meals or alcohol close to bed."],focus:["Work in 25-minute blocks with 5-minute breaks.","Silence notifications and keep one tab or task open.","Write the next tiny step down before you start."],stress:["Take five slow breaths, exhaling longer than you inhale.","Get outside for a ten-minute walk.","Write down what's bugging you and one small thing you can do about it."],study:["Test yourself instead of rereading.","Space reviews over several days.","Teach the idea out loud in your own words."],default:["Break it into the smallest next step and do that first.","Set a short timer and start; momentum beats motivation.","Check what worked last time and repeat it."]};
var PROJECTS=["a to-do list web app (HTML, CSS, a little JavaScript, saved in localStorage)","a \"daily quote\" page that picks a random quote each load","a tiny text adventure game in Python","a personal link page or portfolio on GitHub Pages","a tip/bill-splitting calculator","a flashcard quiz app for something you're learning"];
function haiku(topic){topic=topic||"the moment";var t=topic.toLowerCase();
 if(/rain/.test(t))return "Soft rain on the roof,\nthe street hums a silver tune,\npuddles hold the sky.";
 if(/snow/.test(t))return "Snow falls without sound,\nthe whole town breathes out slowly,\nfootprints write the dawn.";
 if(/dragon/.test(t))return "Ember in the dark,\nold wings fold around the hoard,\nsmoke curls into stars.";
 if(/sun|summer/.test(t))return "Long gold afternoon,\ncicadas stitch up the heat,\nshade pools by the wall.";
 if(/moon|night/.test(t))return "Moon over the roofs,\nquiet keeps its own lantern,\nthe night leans closer.";
 return "Thinking of "+topic+",\na small bright idea lands,\nI hold it like light."}
function compose(q){var raw=String(q||"").trim(),t=raw.toLowerCase().replace(/[“”]/g,'"').replace(/[‘’]/g,"'"),m,o=function(text,kind){return {text:text,tier:"open",model:"open-pack",kind:kind,by:"RDRAGON",tag:"RDRAGON · quick take"}};
 if(!t)return o("I'm here. Ask me anything and I'll give you my best quick take.","empty");
 /* identity */
 if(/\b(who|what) are you\b|\bintroduce yourself\b|\byour name\b|\bare you (a |an )?(bot|ai|human|real)\b/.test(t))return o("I'm RDRAGON, the dragon-skull AI of Rizal's GHOSTMACHINE CryptoSocial on rizal.pw. I answer posts and comments right here in your browser, offline-first, and I get sharper when my in-browser engine finishes loading.","identity");
 /* word-problem arithmetic */
 var wm=wordMath(t);if(wm&&isFinite(wm.v))return o(fmt(wm.v)+" ("+wm.s+" = "+fmt(wm.v)+").","math");
 /* translation */
 if((m=t.match(/(?:translate|say|how do (?:you|i) say|what is|what's)\s+["']?(.+?)["']?\s+(?:to|in|into)\s+([a-zà-ÿ]+)/))){var ph=m[1].replace(/^(the phrase|the word)\s+/,"").replace(/[?.!,]+$/,"").trim(),lg=LANG[m[2]];
  if(lg&&PHR[ph]&&PHR[ph][lg])return o("\""+ph.charAt(0).toUpperCase()+ph.slice(1)+"\" in "+m[2].charAt(0).toUpperCase()+m[2].slice(1)+" is \""+PHR[ph][lg]+"\".","translate");
  if(lg)return o("My offline phrase book doesn't have \""+ph+"\" in "+m[2]+" yet. I know greetings, thanks, please, goodbye and \"I love you\" offline, and I'll do a full translation when my engine is loaded.","translate")}
 /* capitals */
 if((m=t.match(/capital (?:city )?of ([a-z .]+?)\s*(?:\?|$|is\b)/))||(m=t.match(/what is ([a-z .]+?)'s capital/))){var c=m[1].replace(/^the\s+/,"").trim();if(CAP[c])return o("The capital of "+c.replace(/\b\w/g,function(x){return x.toUpperCase()})+" is "+CAP[c]+".","trivia");}
 for(var i=0;i<TRIVIA.length;i++)if(TRIVIA[i][0].test(t))return o(TRIVIA[i][1],"trivia");
 /* poems / haiku / creative */
 if(/\bhaiku\b/.test(t))return o(haiku(topicOf(t,/haiku\s+(?:about|on|for)\s+(.+)/)),"haiku");
 if(/\b(poem|poetry|verse|limerick|rhyme)\b/.test(t)){var tp=topicOf(t,/(?:about|on|for)\s+(.+)/)||"today";return o("A short one about "+tp+":\n"+haiku(tp)+"\nNot epic, but it's honest.","poem")}
 if(/\b(story|tale)\b/.test(t)){var st=topicOf(t,/(?:about|on)\s+(.+)/)||"a small dragon";return o("Quick story about "+st+": it started as a small idea, ran into one real problem, and solved it by trying the simplest thing first. The end, and a good start.","story")}
 /* jokes */
 if(/\b(joke|make me laugh|something funny|pun)\b/.test(t))return o(pick(JOKES,t),"joke");
 /* names / brainstorm */
 if(/\b(name|names)\b/.test(t)&&/\b(suggest|give|ideas?|pick|need|come up|what should|good|cool|for my|for a|brainstorm)\b/.test(t)){var k=/dragon/.test(t)?"dragon":/\bcat|kitten/.test(t)?"cat":/\bdog|puppy/.test(t)?"dog":"default";var L=NAMES[k];return o("A few "+(k==="default"?"":k+" ")+"name ideas: "+L.slice(0,5).join(", ")+". My pick: "+pick(L,t)+".","names")}
 /* project ideas */
 if(/\bprojects?\b/.test(t)&&/\b(idea|ideas|suggest|beginner|weekend|build|make|start|first)\b/.test(t)||/\bwhat should i (build|code|make)\b/.test(t))return o("Try "+pick(PROJECTS,t)+". Other weekend-sized ideas: "+PROJECTS.filter(function(x){return x!==pick(PROJECTS,t)}).slice(0,2).join("; ")+". Keep it small enough to finish in two days.","project");
 /* tips / how-to lists */
 if(/\b(tips?|advice|how (?:can|do|to|should) i|ways to|steps to|help me)\b/.test(t)){var tk=/sleep|insomnia|rest/.test(t)?"sleep":/focus|concentrat|productiv/.test(t)?"focus":/stress|anxi|calm|relax/.test(t)?"stress":/study|learn|exam/.test(t)?"study":"default";var n=Math.min(Math.max((nums(t)[0]|0)||3,1),3),T=TIPS[tk].slice(0,n);
  return o(T.map(function(x,i){return (i+1)+". "+x}).join("\n"),"tips")}
 /* greetings */
 if(/^(hi|hello|hey|yo|good (morning|afternoon|evening)|sup)\b/.test(t))return o("Hey! RDRAGON here. Ask me something and I'll answer right away.","greet");
 /* honest generic best quick take */
 var subj=raw.replace(/^(please\s+)?(can you|could you|tell me|explain|describe|what is|what's|what are|who is|why|how)\s+/i,"").replace(/[?.!]+$/,"").slice(0,120);
 return o("Here's my best quick take on \""+subj+"\": I don't have a confident offline answer for that, so I won't make one up. My in-browser engine is still warming up and will refine this reply when it's ready.","generic")}
var API={compose:compose,wordMath:wordMath,haiku:haiku,VERSION:"rdragon-open 1.0 20261028"};
root.RDRAGON_OPEN=API;if(typeof module==="object"&&module.exports)module.exports=API})(typeof self!=="undefined"?self:globalThis);

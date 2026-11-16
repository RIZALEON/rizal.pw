/* RBOARD. Types into a local input only. return runs opt.onReturn if given; it never signs. */
(function(w){
'use strict';
var BAY={a:'ᜀ',e:'ᜁ',i:'ᜁ',o:'ᜂ',u:'ᜂ',w:'ᜏ',r:'ᜇ',t:'ᜆ',y:'ᜌ',p:'ᜉ',s:'ᜐ',d:'ᜇ',g:'ᜄ',h:'ᜑ',k:'ᜃ',l:'ᜎ',b:'ᜊ',n:'ᜈ',m:'ᜋ',q:'',z:''};
var ACC={e:'é',u:'ú',i:'í',o:'ó',a:'á',n:'ñ'};
var EN=[['1','2','3','4','5','6','7','8','9','0'],
        ['q','w','e','r','t','y','u','i','o','p'],
        ['a','s','d','f','g','h','j','k','l'],
        ['⇧','z','x','c','v','b','n','m','⌫'],
        ['🌐','NG',',','RBOARD','.','return']];
var BB=[
  [['ᜀ','a'],['ᜁ','i'],['ᜂ','u'],['ᜃ','ka'],['ᜄ','ga'],['ᜅ','nga'],['ᜆ','ta'],['ᜇ','da'],['ᜈ','na'],['ᜉ','pa']],
  [['ᜊ','ba'],['ᜋ','ma'],['ᜌ','ya'],['ᜎ','la'],['ᜏ','wa'],['ᜐ','sa'],['ᜑ','ha'],['ᜒ','i/e'],['ᜓ','o/u']],
  [['⇧',''],['᜔','kudlit'],['᜵',','],['᜶','.'],['R:\\',''],['⌫','']],
  [['123',''],['🌐',''],['RBOARD',''],['return','']]
];
var SY=[['1','2','3','4','5','6','7','8','9','0'],
        ['-','/',':',';','(',')','$','&','@','"'],
        ['⇧','.',',','?','!',"'",'\\','_','⌫'],
        ['ABC','🌐','<','RBOARD','>','return']];
function E(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function mount(host,opt){
  opt=opt||{};
  var layer='en', shift=false;
  var input=opt.input;
  var root=document.createElement('div');
  root.className='rb';
  host.innerHTML='';
  host.appendChild(root);
  function setVal(v){
    if(!input) return;
    input.value=v;
    try{input.setSelectionRange(v.length,v.length);}catch(e){}
    input.dispatchEvent(new Event('input',{bubbles:true}));
  }
  function ins(ch){
    if(!input) return;
    setVal((input.value||'')+ch);
  }
  function back(){
    if(!input) return;
    setVal((input.value||'').slice(0,-1));
  }
  function key(lbl, sub, cls, val){
    return '<button type="button" class="rb-k '+(cls||'')+'" data-v="'+E(val==null?lbl:val)+'">'+lbl+(sub||'')+'</button>';
  }
  function render(){
    var h='<div class="rb-frame"><div class="rb-top"><span class="pr">R:\\&gt;</span><span class="cur"></span><span class="sp"></span>';
    h+='<button type="button" class="lay'+(layer==='en'?' on':'')+'" data-l="en">EN</button>';
    h+='<button type="button" class="lay bay'+(layer==='bay'?' on':'')+'" data-l="bay">ᜊ</button>';
    h+='<button type="button" class="lay'+(layer==='sym'?' on':'')+'" data-l="sym">#+</button>';
    h+='</div>';
    if(layer==='en'){
      EN.forEach(function(row){
        h+='<div class="rb-row">';
        row.forEach(function(k){
          if(k==='⇧') h+=key('<span class="ico">↑</span>','','fn w2 shift'+(shift?' on':''),'⇧');
          else if(k==='⌫') h+=key('<span class="x">×</span>','','fn w2 del','⌫');
          else if(k==='🌐') h+=key('🌐','','fn globe','🌐');
          else if(k==='NG') h+=key('NG','','fn','ng');
          else if(k==='RBOARD') h+=key('RBOARD','','sp',' ');
          else if(k==='return') h+=key('return','','ret','\n');
          else{
            var c=shift?k.toUpperCase():k;
            var sup=BAY[k]?'<sup>'+BAY[k]+(ACC[k]?' '+ACC[k]:'')+'</sup>':'';
            h+=key(c,sup,'',c);
          }
        });
        h+='</div>';
      });
    }else if(layer==='bay'){
      BB.forEach(function(row){
        h+='<div class="rb-row">';
        row.forEach(function(p){
          var g=p[0],s=p[1];
          if(g==='⇧') h+=key('<span class="ico">↑</span>','','fn w2 shift','⇧');
          else if(g==='⌫') h+=key('<span class="x">×</span>','','fn w2 del','⌫');
          else if(g==='123') h+=key('123','','fn w2','#+');
          else if(g==='🌐') h+=key('🌐','','fn globe','🌐');
          else if(g==='RBOARD') h+=key('RBOARD','','sp',' ');
          else if(g==='return') h+=key('return','','ret','\n');
          else if(g==='R:\\') h+=key('R:\\','','fn','R:\\> ');
          else h+=key('<span class="bg">'+g+'</span>','<small style="position:absolute;bottom:3px;font-size:9px;color:var(--r-green)">'+s+'</small>','',g);
        });
        h+='</div>';
      });
    }else{
      SY.forEach(function(row){
        h+='<div class="rb-row">';
        row.forEach(function(k){
          if(k==='⇧') h+=key('<span class="ico">↑</span>','','fn w2 shift','⇧');
          else if(k==='⌫') h+=key('<span class="x">×</span>','','fn w2 del','⌫');
          else if(k==='ABC') h+=key('ABC','','fn w2','ABC');
          else if(k==='🌐') h+=key('🌐','','fn globe','🌐');
          else if(k==='RBOARD') h+=key('RBOARD','','sp',' ');
          else if(k==='return') h+=key('return','','ret','\n');
          else h+=key(E(k),'','',k);
        });
        h+='</div>';
      });
    }
    h+='</div>';
    root.innerHTML=h;
  }
  root.addEventListener('click',function(e){
    var lay=e.target.closest('[data-l]');
    if(lay){ layer=lay.getAttribute('data-l'); render(); return; }
    var k=e.target.closest('.rb-k');
    if(!k) return;
    var v=k.getAttribute('data-v');
    if(v==='⇧'){ shift=!shift; render(); return; }
    if(v==='⌫'){ back(); return; }
    if(v==='#+'){ layer='sym'; render(); return; }
    if(v==='ABC'){ layer='en'; render(); return; }
    if(v==='🌐'){ layer = layer==='bay'?'en':'bay'; render(); return; }
    if(v==='\n'){
      if(typeof opt.onReturn==='function') opt.onReturn(input?input.value:'');
      return;
    }
    ins(v);
    if(shift && v.length===1){ shift=false; render(); }
  });
  render();
  return {render:render, setLayer:function(l){layer=l;render();}, root:root};
}
w.RBoard={mount:mount};
})(window);

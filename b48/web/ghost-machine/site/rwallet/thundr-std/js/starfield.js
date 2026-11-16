/* Sparse twilight starfield. White, some phosphor green, a few dim purple. */
(function(w){
  function paint(canvas){
    var c=canvas.getContext('2d');
    var dpr=w.devicePixelRatio||1;
    var wdt=canvas.clientWidth, hgt=canvas.clientHeight;
    canvas.width=Math.floor(wdt*dpr); canvas.height=Math.floor(hgt*dpr);
    c.setTransform(dpr,0,0,dpr,0,0);
    c.fillStyle='#000'; c.fillRect(0,0,wdt,hgt);
    // deterministic-ish from size so it doesn't jump on every resize
    var n=Math.max(40, Math.floor(wdt*hgt/9000));
    var seed=wdt*13+hgt*7;
    function rnd(){ seed=(seed*1664525+1013904223)>>>0; return (seed&0xffff)/0xffff; }
    for(var i=0;i<n;i++){
      var x=rnd()*wdt, y=rnd()*hgt, r=rnd();
      var col = r<0.08 ? '#39FF14' : r<0.14 ? '#3F117E' : (r<0.5?'#FFFFFF':'#EEEEEE');
      var s = r>0.92 ? 1.6 : (r>0.7?1.15:0.7);
      c.fillStyle=col;
      if(r>0.96){
        c.globalAlpha=0.85;
        c.fillRect(x-s*2,y-0.4,s*4,0.8);
        c.fillRect(x-0.4,y-s*2,0.8,s*4);
      }else{
        c.globalAlpha=0.55+rnd()*0.45;
        c.beginPath(); c.arc(x,y,s,0,Math.PI*2); c.fill();
      }
    }
    c.globalAlpha=1;
  }
  function mount(el){
    var canvas=document.createElement('canvas');
    canvas.className='r-starfield';
    el.insertBefore(canvas, el.firstChild);
    function go(){ paint(canvas); }
    go();
    w.addEventListener('resize', go);
    return {repaint:go, canvas:canvas};
  }
  w.Twilight = {mount:mount, paint:paint};
})(window);

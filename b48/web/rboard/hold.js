"use strict";
// Pointer holds/cancels consume only their matching click. Ordinary taps use click.
function makePointerKeyboard(o){let active=null,timer=null,token=null;
 const clear=()=>{if(timer!==null)o.clear(timer);timer=null;};
 const inside=(b,x,y)=>{const r=b.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;};
 const consume=a=>{token={button:a.button,id:a.id};};
 const cancel=()=>{clear();if(active)consume(active);active=null;};
 return {down(e,button,choices,base){cancel();token=null;if(e.button!==0)return;active={id:e.pointerId,x:e.clientX,y:e.clientY,button,choices,base,held:false};
 try{button.setPointerCapture(e.pointerId);}catch(_){}
 timer=o.set(()=>{timer=null;if(!active)return;active.held=true;if(active.choices.length>1)o.menu(active.button,active.choices);},480);},
 move(e){if(!active||e.pointerId!==active.id)return;if(Math.hypot(e.clientX-active.x,e.clientY-active.y)>12||!inside(active.button,e.clientX,e.clientY))cancel();},
 up(e){if(!active||e.pointerId!==active.id)return;const a=active;clear();active=null;
 if(Math.hypot(e.clientX-a.x,e.clientY-a.y)>12||!inside(a.button,e.clientX,e.clientY)){consume(a);return;}
 if(a.held){consume(a);if(a.choices.length===1)o.emit(a.choices[0].value);}
 // A short tap is committed by native click, supporting click-only/AT activation too.
 },cancel,
 click(button,e){
 const match=token&&token.button===button&&e.detail!==0&&typeof e.pointerId==="number"&&e.pointerId===token.id;
 token=null; // one-shot token, never carry suppression into another activation
 return !match;
 },
 context(button,choices){if((active&&active.button===button)||(token&&token.button===button))return;
 if(choices.length)o.menu(button,choices);},
 reset(){cancel();token=null;}};
}
if(typeof module!=="undefined")module.exports={makePointerKeyboard};

export function attachMouseCamera(canvas,{zoom,getZoom,minZoom,maxZoom=3.2}){
  const view={yaw:0,pitch:0,panX:0,panZ:0};let drag=null;
  canvas.onpointerdown=e=>{if(e.pointerType==='touch')return;if(e.button!==0&&e.button!==2)return;drag={x:e.clientX,y:e.clientY,pan:e.shiftKey||e.button===2};canvas.setPointerCapture?.(e.pointerId);};
  canvas.onpointermove=e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;
    if(drag.pan){view.panX=Math.max(-25,Math.min(25,view.panX-dx*.06));view.panZ=Math.max(-25,Math.min(25,view.panZ-dy*.06));}
    else{view.yaw-=dx*.005;view.pitch=Math.max(-.3,Math.min(.5,view.pitch+dy*.004));}
  };
  canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=()=>drag=null;
  canvas.oncontextmenu=e=>e.preventDefault();
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.max(minZoom(),Math.min(maxZoom,getZoom()*Math.exp(-Math.max(-150,Math.min(150,e.deltaY))*.002))));},{passive:false});
  return {view,reset(){Object.assign(view,{yaw:0,pitch:0,panX:0,panZ:0});}};
}

import {OCEAN_RADIUS} from './voyage-physics.js';
import {planVoyageRoute} from './sea-route.js';

export function createNavalMap({destinations,obstacles,activities=[],onOpen=()=>{},onRoute=()=>{}}){
  const button=document.getElementById('map-button'),small=document.getElementById('minimap');
  button.classList.add('tactical-minimap');button.setAttribute('aria-label','Expand nautical chart');small.width=small.height=420;document.querySelector('main').append(button);
  button.querySelector('span').textContent='LOCAL WATERS · EXPAND';
  const dialog=document.createElement('dialog');dialog.className='tactical-chart';dialog.innerHTML='<div class="dialog-heading"><div><p class="eyebrow">ADMIRALTY / BLUE CURRENT</p><h2>Chart your next voyage.</h2></div><button class="close" aria-label="Close sea chart">×</button></div><div class="chart-layout"><canvas width="1000" height="1000" aria-label="Interactive sea chart. Click to place a waypoint."></canvas><aside><p class="eyebrow">EXPEDITION REGISTER</p><div class="map-legend">◆ Ports & islands<br>◈ Salvage / cargo<br>◎ Regatta gates<br>✦ Wildlife survey<br><b>Orange perimeter: waterfall current</b></div><p class="map-waypoint">Click to add route stops. Scroll to zoom; drag to pan. Then select Guide this route.</p><button class="clear-waypoint">Clear route</button><p>Keep a reserve of speed near the rim. The outward current strengthens before the drop.</p></aside></div>';document.body.append(dialog);
  const controls=document.createElement('div');controls.className='chart-tools';controls.innerHTML='<button class="chart-zoom-out" aria-label="Zoom chart out">−</button><span>SCROLL TO ZOOM · DRAG TO PAN</span><button class="chart-zoom-in" aria-label="Zoom chart in">+</button><button class="chart-center">Center vessel</button><button class="chart-sail">Guide this route</button>';dialog.querySelector('.chart-layout').before?.(controls);
  dialog.querySelector('.close').onclick=()=>dialog.close();dialog.querySelector('.clear-waypoint').onclick=()=>{waypoint=null;stops.length=0;course=[];onRoute([]);draw(last);};
  const canvas=dialog.querySelector('canvas');let waypoint=null,last=null,zoom=1,center={x:0,z:0},stops=[],course=[],drag=null,moved=false;
  const describe=message=>{dialog.querySelector('.map-waypoint').textContent=message;};
  function changeZoom(factor){zoom=Math.max(1,Math.min(6,zoom*factor));draw(last);}
  controls.querySelector('.chart-zoom-in').onclick=()=>changeZoom(1.25);controls.querySelector('.chart-zoom-out').onclick=()=>changeZoom(1/1.25);
  controls.querySelector('.chart-center').onclick=()=>{if(last)center={x:last.player.x,z:last.player.z};draw(last);};
  controls.querySelector('.chart-sail').onclick=()=>{
    if(!last||!stops.length){describe('Mark at least one destination on the chart first.');return;}
    course=planVoyageRoute(last.player,stops,obstacles);if(!course.length){describe('No safe passage. Move your route marks into open water.');return;}
    onRoute(course);describe(`Dolphin guides ready · ${stops.length} marked stops. Follow the turquoise pod.`);dialog.close();
  };
  canvas.onwheel=e=>{e.preventDefault();changeZoom(e.deltaY<0?1.15:1/1.15);};
  canvas.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY,cx:center.x,cz:center.z};moved=false;canvas.setPointerCapture?.(e.pointerId);};
  canvas.onpointermove=e=>{if(!drag)return;const r=canvas.getBoundingClientRect(),dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>4)moved=true;if(moved){center={x:Math.max(-100,Math.min(100,drag.cx-dx/r.width*220/zoom)),z:Math.max(-100,Math.min(100,drag.cz-dy/r.height*220/zoom))};draw(last);}};
  canvas.onpointerup=canvas.onpointercancel=()=>{drag=null;};
  function open(){onOpen();document.querySelectorAll('dialog[open]').forEach(d=>d.close());dialog.showModal();if(last)draw(last);}
  button.onclick=open;
  canvas.onclick=e=>{if(moved){moved=false;return;}const r=canvas.getBoundingClientRect(),x=center.x+((e.clientX-r.left)/r.width-.5)*220/zoom,z=center.z+((e.clientY-r.top)/r.height-.5)*220/zoom;if(Math.hypot(x,z)<94){if(stops.length>=8){describe('Eight stops maximum. Clear the route to start a new passage.');return;}waypoint={x,z};stops.push(waypoint);describe(`ROUTE MARK ${stops.length} · ${Math.round(x)} E / ${Math.round(-z)} N · press Guide this route`);draw(last);}};
  function render(target,data,expanded){
    const ctx=target.getContext('2d'),s=target.width,span=expanded?220/zoom:64,cx=expanded?center.x:data.player.x,cz=expanded?center.z:data.player.z,scale=s/span,P=(x,z)=>[s/2+(x-cx)*scale,s/2+(z-cz)*scale];ctx.clearRect(0,0,s,s);
    const gradient=ctx.createRadialGradient(s*.45,s*.45,s*.05,s*.5,s*.5,s*.7);gradient.addColorStop(0,'#167c97');gradient.addColorStop(1,'#072e57');ctx.fillStyle=gradient;ctx.fillRect(0,0,s,s);
    ctx.strokeStyle='#7cccdc28';ctx.lineWidth=1;for(let i=0;i<=10;i++){ctx.beginPath();ctx.moveTo(i*s/10,0);ctx.lineTo(i*s/10,s);ctx.moveTo(0,i*s/10);ctx.lineTo(s,i*s/10);ctx.stroke();}
    const origin=P(0,0);ctx.beginPath();ctx.arc(origin[0],origin[1],86*scale,0,Math.PI*2);ctx.lineWidth=27*scale;ctx.strokeStyle='#eaa96120';ctx.stroke();ctx.beginPath();ctx.arc(origin[0],origin[1],100*scale,0,Math.PI*2);ctx.lineWidth=2*scale;ctx.strokeStyle='#f4c47f';ctx.stroke();
    for(const o of obstacles.filter(o=>o.kind==='island')){
      const [x,y]=P(o.x,o.z);for(const [r,c]of [[1.25,'#4dc3b6'],[1.08,'#e5d29c'],[.86,'#80af69'],[.58,'#58965b']]){ctx.beginPath();for(let i=0;i<=36;i++){const a=i/36*Math.PI*2,d=o.r*scale*r*(1+.06*Math.sin(a*5+o.x));const px=x+Math.cos(a)*d,py=y+Math.sin(a)*d;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.fillStyle=c;ctx.fill();}
    }
    ctx.textAlign='center';ctx.font=`600 ${expanded?18:22}px sans-serif`;
    for(const d of destinations){const [x,y]=P(d.x,d.z);ctx.fillStyle='#fff0c5';ctx.fillText('◆',x,y);if(expanded){ctx.fillStyle='#e7f5ed';ctx.fillText(d.title.toUpperCase(),x,y+18);}}
    for(const a of activities){const [x,y]=P(a.x,a.z);ctx.fillStyle=a.done?'#6aabb4':a.type==='race'?'#f5d473':a.type==='survey'?'#9fe1f1':'#f2ab77';ctx.fillText(a.type==='race'?'◎':a.type==='survey'?'✦':'◈',x,y);if(expanded)ctx.fillText(a.name,x,y-14);}
    const [px,py]=P(data.player.x,data.player.z);
    if(stops.length){ctx.strokeStyle=course.length?'#8ceee1':'#fcf3a6';ctx.lineWidth=expanded?3:2;ctx.setLineDash(course.length?[]:[5,5]);ctx.beginPath();ctx.moveTo(px,py);for(const point of (course.length?course:stops)){const [x,y]=P(point.x,point.z);ctx.lineTo(x,y);}ctx.stroke();ctx.setLineDash([]);for(const [i,point]of stops.entries()){const [x,y]=P(point.x,point.z);ctx.fillStyle='#fff4a6';ctx.fillText(`⚑${i+1}`,x,y);}}
    if(data.guide){const [x,y]=P(data.guide.x,data.guide.z);ctx.fillStyle='#8ceee1';ctx.fillText('●',x,y);}
    if(data.pirate){const [x,y]=P(data.pirate.x,data.pirate.z);ctx.fillStyle='#ff7869';ctx.fillText('▲',x,y);}
    ctx.save();ctx.translate(px,py);ctx.rotate(-data.heading);ctx.fillStyle='#fff9dc';ctx.shadowColor='#0d3344';ctx.shadowBlur=6;ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(6,7);ctx.lineTo(0,3);ctx.lineTo(-6,7);ctx.closePath();ctx.fill();ctx.restore();
    ctx.font=`600 ${expanded?16:13}px monospace`;ctx.fillStyle='#d9efe8';ctx.fillText('N',s/2,22);ctx.textAlign='left';ctx.fillText('BLUE CURRENT / 01',12,s-14);
  }
  function draw(data){if(!data)return;last=data;render(small,data,false);if(dialog.open)render(canvas,data,true);}
  return {open,draw,get waypoint(){return waypoint;}};
}


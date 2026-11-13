import * as THREE from 'three';
import {portBriefs} from './port-briefs.js';
import {createDolphinGuides} from './dolphin-guides.js';
import {attachMouseCamera} from './mouse-camera.js';
import {createNavalMap} from './naval-map.js';
import {createVoyageActivities} from './voyage-activities.js';
import {createOceanEdge} from './ocean-edge.js';
import {createHullMotion,edgeCurrent} from './voyage-physics.js';
import {createPirates} from './pirates.js';
import './game.css';
import {createCaptainProgress,PENNANTS} from './captain-progress.js';
import {createCaptainJournal} from './captain-journal.js';
import {planVoyageRoute} from './sea-route.js';
import {optimizeSceneIslands} from './scene-batching.js';
import {createFrameProfiler} from './frame-profiler.js';
import {createWaterView,createOceanSkirt,sunriseFogDensity} from './water-view.js';
import {enrichScenery} from './scenery.js';
import {createWeatherWorld} from './weather-world.js';
import {climateAt} from './climate.js';
import {createVesselDamage,sinkingPose} from './vessel-damage.js';
import {weatheredStone,shoreline} from './natural.js';
import {waterHeight,floatPose,hullWaterPose,impactDamage,MarineAudio,setWaveBarriers,tideLevel,tideRate} from './marine.js';
import {createSailboat,createMarineDetails} from './details.js';
import {waterVertex,waterFragment,applyWetSurface} from './ocean-shaders.js';
import {createSurf} from './surf.js';

const $ = (id) => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const destinations = [
  { id:'about', title:'The lighthouse', category:'01 / LIGHTHOUSE', subtitle:'A light on the northern passage.', x:-24, z:-27, color:'#e7e1b2' },
  { id:'work', title:'Discovery docks', category:'02 / EXPEDITIONS', subtitle:'Cargo, contracts and regatta waters.', x:24, z:-10, color:'#e5b778' },
  { id:'play', title:'The coral club', category:'03 / DISCOVERIES', subtitle:'Room for a little wonder.', x:2, z:27, color:'#f79482' },
  { id:'contact', title:'Hello harbor', category:'04 / EASTERN HARBOR', subtitle:'Letters and cargo from distant shores.', x:37, z:29, color:'#d5dba1' },
  { id:'home', title:'The tide house', category:'05 / HOME PORT', subtitle:'A quiet place to drop anchor.', x:-14, z:6, color:'#eed3a1' },
];
const discovered = new Set();
let sailing = false, nearest = null, soundOn = false, sceneReady = false;
const audio=new MarineAudio();
let captainStorage;try{captainStorage=window.localStorage;}catch{}
const captain=createCaptainProgress(captainStorage);
const journal=createCaptainJournal(captain,{onOpen:()=>keys.clear(),onTrail:()=>{trailActive=true;if(sceneReady&&!sailing)enterSailing();toast('Orange discovery trail active. Find the five buoys.');},onCourse:target=>{
  if(!sceneReady)return;if(!sailing)enterSailing();const route=planVoyageRoute(boatPosition,[target],obstacles);if(route.length)guides?.setRoute(route);else toast('Mark an open-water approach on the sea chart.');
},onEquip:p=>{const pennant=boat?.userData.sails?.at(-1);if(pennant)pennant.material.color.set(p.color);}});
window.addEventListener('pagehide',()=>captain.save());
const resetStatus=document.querySelector('.status');resetStatus.classList.add('sea-reset-status');document.querySelector('main').append(resetStatus);
const hullMotion=createHullMotion();
let navalMap,voyage,guides,mouseCamera,fallTime=0;
let pirates,profiler,waterView,waterTransmissionFailed=false,weatherWorld,climate=climateAt(0),vesselDamage,marine,surf,health=100,shipState='afloat',sinkProgress=0,collisionCooldown=0,steering=0,lastWake=-1,zoomAdjust=1;
const pulses=Array.from({length:8},()=>new THREE.Vector4(0,0,-100,0));let pulseIndex=0;
let mooringLines;
const keys = new Set();
let scene, renderer, camera, boat, water, frame = 0, elapsed = 0, speed = 0, heading = -0.45, worldTime = 0;
const boatPosition = new THREE.Vector3(0, 0, 7);
const waveDrift=new THREE.Vector2();
const floating = [], birds = [], ripples = [], obstacles = [], labels = [];
function pulse(x,z,amplitude=.25){pulses[pulseIndex].set(x,z,worldTime,amplitude);pulseIndex=(pulseIndex+1)%pulses.length;}
function restoreBoat(){
  captain.relaunch();
  hullMotion.reset();voyage?.reset();guides?.setRoute([]);mouseCamera?.reset();fallTime=0;
  health=100;shipState='afloat';sinkProgress=0;collisionCooldown=1;speed=0;heading=-.45;keys.clear();boatPosition.set(0,0,7);waveDrift.set(0,0);
  if(boat){boat.visible=true;boat.rotation.set(0,heading,0);boat.userData.hull.material.color.set('#174a62');}
  pirates?.reset();weatherWorld?.resetDeck();vesselDamage?.reset();marine?.reset();surf?.reset();pulses.forEach(p=>p.set(0,0,-100,0));trailBuoys.forEach(b=>{b.collected=false;b.object.visible=true;});collected=0;trailActive=false;
  $('rescue').hidden=true;document.body.classList.remove('ship-critical');toast('Sea Wren relaunched. Hull restored, hazards reset.');
}
function takeDamage(amount){
  if(shipState!=='afloat'||amount<=0)return;health=Math.max(0,health-amount);document.body.classList.toggle('ship-critical',health<30);
  boat.userData.hull.material.color.set(health<30?'#604b44':health<65?'#39545d':'#174a62');
  vesselDamage?.hit(health,heading,speed);
  if(health===0){shipState='sinking';sinkProgress=0;keys.clear();audio.effect('splash',.8);toast('Hull breached. Sea Wren is taking on water.');$('rescue').hidden=false;}
}
function toggleMoor(){
  if(!marine||!sceneReady)return;
  if(pirates?.active()){toast('Shake the pirate pursuit before mooring.');return;}
  if(shipState==='moored'){shipState='afloat';toast('Lines cast off. Fair winds!');return;}
  if(shipState!=='afloat')return;
  const m=marine.mooring;if(Math.hypot(boatPosition.x-m.x,boatPosition.z-m.z)>m.radius){toast('The tide house dock is southwest of your starting point.');return;}
  if(Math.abs(speed)>2){toast('Slow to under 2 knots before mooring.');return;}
  shipState='moored';speed=0;keys.clear();toast('Moored at the tide house. The dock crew is repairing your hull.');
}

function toast(message) { $('toast').textContent=message; $('toast').classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>$('toast').classList.remove('show'),3200); }
function closeDialogs() { document.querySelectorAll('dialog[open]').forEach(d=>d.close()); keys.clear(); }
function openChart() { closeDialogs(); $('chart').showModal(); }
function enterSailing() { sailing=true; document.body.classList.add('sailing'); $('intro').inert=true; toast(innerWidth<800?'Take the helm with the touch controls below.':'You’re the captain. Arrows or WASD to sail.'); }

const content=portBriefs;
function openDestination(id) {
  const d=destinations.find(v=>v.id===id); if(!d)return;
  closeDialogs(); keys.clear(); discovered.add(id);
  $('content-category').textContent=d.category; $('content-body').innerHTML=content[id]; $('content').showModal();
  $('collect-shells')?.addEventListener('click',()=>{closeDialogs(); if(!sailing)enterSailing(); trailActive=true; toast('Follow the orange buoys. Five little discoveries await.');});
  $('email-form')?.addEventListener('submit',e=>{e.preventDefault();const email=$('contact-email').value.trim(); if($('contact-email').checkValidity())location.href=`mailto:${encodeURIComponent(email)}?subject=Hello%20from%20Blue%20Current`;});
  drawMap();
}
$('destination-list').innerHTML=destinations.map(d=>`<button class="destination-card" data-destination="${d.id}"><small>${d.category}</small><strong>${d.title}</strong><span>↗</span></button>`).join('');
document.querySelectorAll('[data-destination]').forEach(b=>b.addEventListener('click',()=>openDestination(b.dataset.destination)));
$('destinations').onclick=openChart; $('menu').onclick=openChart; $('map-button').onclick=()=>navalMap?.open();
document.querySelector('.brand').onclick=e=>{e.preventDefault();closeDialogs();sailing=false;document.body.classList.remove('sailing');$('intro').inert=false;restoreBoat();};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
document.querySelectorAll('dialog').forEach(d=>{d.addEventListener('close',()=>keys.clear());d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});});
$('set-sail').onclick=()=>{if(sceneReady)enterSailing();else openChart();};
$('standard-view').onclick=()=>{closeDialogs(); $('content-category').textContent='BLUE CURRENT / HARBOR ALMANAC';$('content-body').innerHTML=`<h2>The archipelago,<br>in your logbook.</h2>${destinations.map(d=>`<section class="project"><small>${d.category}</small><h3>${d.title}</h3>${content[d.id]}</section>`).join('')}`;$('content').showModal();$('collect-shells')?.remove();$('email-form')?.addEventListener('submit',e=>{e.preventDefault();location.href=`mailto:${encodeURIComponent($('contact-email').value.trim())}`;});};
$('dock').onclick=()=>{if(nearest)openDestination(nearest.id);};
$('reset').onclick=restoreBoat;$('relaunch').onclick=restoreBoat;$('moor').onclick=toggleMoor;
$('zoom-in').onclick=()=>zoomAdjust=Math.min(3.2,zoomAdjust*1.18);$('zoom-out').onclick=()=>zoomAdjust=Math.max(.92/(sailing?(innerWidth<800?1.35:1.65):.92),zoomAdjust/1.18);
window.addEventListener('keydown',e=>{
  if(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)return;
  if(document.querySelector('dialog[open]'))return;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();
  keys.add(e.key.toLowerCase());
  if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(e.key.toLowerCase())&&!sailing&&sceneReady)enterSailing();
  if(e.key.toLowerCase()==='e'&&nearest)openDestination(nearest.id);
  if(e.key.toLowerCase()==='m')navalMap?.open();
  if(e.key.toLowerCase()==='j')journal.open();
  if(e.key.toLowerCase()==='r')$('reset').click();
  if(e.key.toLowerCase()==='f'&&!e.repeat)toggleMoor();
  if(e.key.toLowerCase()==='b'&&!e.repeat){e.preventDefault();pirates?.drop();}
  if(e.key==='+'||e.key==='=')$('zoom-in').click();if(e.key==='-')$('zoom-out').click();
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>keys.clear());
document.addEventListener('visibilitychange',()=>{keys.clear();if(audio.context){if(document.hidden)audio.context.suspend().catch(()=>{});else if(soundOn)audio.context.resume().catch(()=>{});}});
document.querySelectorAll('[data-key]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);if(!sailing&&sceneReady)enterSailing();keys.add(b.dataset.key.toLowerCase());}); const release=()=>keys.delete(b.dataset.key.toLowerCase());b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);});
const soundControl=document.createElement('div');soundControl.className='sound-control';
$('sound').before(soundControl);soundControl.append($('sound'));
const volumePanel=document.createElement('div');volumePanel.id='volume-panel';volumePanel.className='volume-panel';volumePanel.hidden=true;
volumePanel.innerHTML='<label for="ocean-volume">SHIP\'S AUDIO <output id="volume-value" for="ocean-volume">65%</output></label><input id="ocean-volume" type="range" min="0" max="100" step="1" value="65" aria-label="Master sound volume">';
soundControl.append(volumePanel);$('sound').setAttribute('aria-controls','volume-panel');$('sound').setAttribute('aria-expanded','false');
function closeVolume(){volumePanel.hidden=true;$('sound').setAttribute('aria-expanded','false');}
$('ocean-volume').addEventListener('input',e=>{audio.setVolume(Number(e.target.value)/100);$('volume-value').value=`${e.target.value}%`;});
document.addEventListener('pointerdown',e=>{if(!soundControl.contains(e.target))closeVolume();});
soundControl.addEventListener('keydown',e=>{if(e.key==='Escape'){closeVolume();$('sound').focus();e.stopPropagation();}});
$('sound').onclick=async()=>{
  volumePanel.hidden=false;$('sound').setAttribute('aria-expanded','true');
  try {
    soundOn=await audio.toggle();
    $('sound').setAttribute('aria-pressed',String(soundOn));$('sound').setAttribute('aria-label',soundOn?'Disable ocean sound':'Enable ocean sound');$('sound-label').textContent=soundOn?'Sound on':'Sound off';
  }catch{toast('Ocean audio isn’t available in this browser.');}
};

function material(color, roughness=.85) {return new THREE.MeshStandardMaterial({color,roughness,flatShading:false});}
const mats={sand:material('#f1dfac'),rock:material('#799a8b'),trunk:material('#89664c'),leaf:material('#4d8c73'),leafLight:material('#70aa7d'),wood:material('#b99468'),darkWood:material('#79684f'),white:material('#f6f1db'),red:material('#de795b'),teal:material('#236a72'),roof:material('#447f7b'),black:material('#244a50'),orange:material('#ef9c53'),coral:material('#ed9b8a')};
function mesh(geometry,mat,parent,x=0,y=0,z=0) {const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;if(parent)parent.add(m);return m;}
function box(parent,w,h,d,mat,x=0,y=0,z=0){return mesh(new THREE.BoxGeometry(w,h,d),mat,parent,x,y,z);}
function cylinder(parent,top,bottom,h,mat,x=0,y=0,z=0,n=32){return mesh(new THREE.CylinderGeometry(top,bottom,h,n),mat,parent,x,y,z);}
function sphere(parent,r,mat,x,y,z){return mesh(weatheredStone(r,(x??0)*.73+(z??0)*.41),mat,parent,x,y,z);}
function palm(parent,x,z,scale=1,rotation=0){
  const group=new THREE.Group();group.userData.windTree=true;group.position.set(x,.8,z);group.scale.setScalar(scale);group.rotation.y=rotation;parent.add(group);
  const trunk=cylinder(group,.17,.25,3.6,mats.trunk,.3,1.8,0,7);trunk.rotation.z=-.13;
  for(let i=0;i<7;i++){const leaf=new THREE.Group();leaf.position.set(.55,3.5,0);leaf.rotation.y=i/7*Math.PI*2;leaf.rotation.z=.12;group.add(leaf);const shape=new THREE.Shape();shape.moveTo(0,0);shape.quadraticCurveTo(1.1,.6,2.7,-.6);shape.quadraticCurveTo(1.4,-.25,0,0);const g=new THREE.ShapeGeometry(shape);const m=new THREE.Mesh(g,i%2?mats.leaf:mats.leafLight);m.material.side=THREE.DoubleSide;m.rotation.x=-.4;leaf.add(m);}
  sphere(group,.19,mats.wood,.5,3.4,.1);
}
function island(x,z,r=5){
  const group=new THREE.Group();group.position.set(x,0,z);scene.add(group);
  mesh(shoreline(r,x*.3+z*.2),new THREE.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:1}),group);
  mesh(shoreline(r,x*.3+z*.2,true),new THREE.MeshStandardMaterial({color:'#5bcac0',roughness:1,transparent:true,opacity:.6,depthWrite:false}),group);
  for(let i=0;i<5;i++){const a=i*2.4;const rock=sphere(group,.6+((i*7)%3)*.3,mats.rock,Math.cos(a)*r*.9,.45,Math.sin(a)*r*.9);rock.scale.set(1,.6,1);}
  obstacles.push({x,z,r:r*.92,object:group,kind:'island',lastHit:-20});
  return group;
}
function dock(parent,x,z,length=8,rot=0){const g=new THREE.Group();g.position.set(x,.35,z);g.rotation.y=rot;parent.add(g);box(g,2,.25,length,mats.darkWood);for(let j=0;j<length*3;j++)box(g,2.05,.16,.26,mats.wood,0,.18,-length/2+j/3);for(const a of [-1,1])for(const b of [-length/2,length/2]){cylinder(g,.13,.16,1.7,mats.darkWood,a,.1,b);cylinder(g,.19,.19,.12,mats.white,a,1,b);}for(let j=-length/2;j<=length/2;j+=1.3){obstacles.push({x:parent.position.x+x+Math.sin(rot)*j,z:parent.position.z+z+Math.cos(rot)*j,r:1.05,kind:'dock',lastHit:-20});}return g;}
function ring(parent,r,color,x,y,z){const m=mesh(new THREE.TorusGeometry(r,.035,5,50),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.45}),parent,x,y,z);m.rotation.x=-Math.PI/2;return m;}
function textBoard(text,w=6,h=3){const c=document.createElement('canvas');c.width=768;c.height=384;const ctx=c.getContext('2d');ctx.fillStyle='#f5ebd1';ctx.fillRect(0,0,768,384);ctx.strokeStyle='#b6c8b5';ctx.lineWidth=2;ctx.strokeRect(20,20,728,344);ctx.fillStyle='#245862';ctx.font='500 23px sans-serif';ctx.fillText('BLUE CURRENT / EXPEDITION BOARD',48,64);ctx.font='500 61px sans-serif';ctx.fillText(text,48,155);ctx.font='24px sans-serif';ctx.fillText('A little idea. An open horizon.',48,210);ctx.fillStyle='#76b8a8';ctx.beginPath();ctx.arc(580,280,70,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e3b272';ctx.beginPath();ctx.arc(650,210,35,0,Math.PI*2);ctx.fill();const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:tex,side:THREE.DoubleSide,roughness:1}));}

function buildWorld(){
  const lighthouse=island(-24,-27,6.2);
  cylinder(lighthouse,1.15,1.7,7.2,mats.white,0,4.1,0,12);
  cylinder(lighthouse,1.29,1.44,1.1,mats.red,0,3.2,0,12);cylinder(lighthouse,1.14,1.25,1.1,mats.red,0,5.9,0,12);
  cylinder(lighthouse,1.65,1.65,.25,mats.teal,0,7.8,0,12);
  cylinder(lighthouse,.94,.94,1.6,new THREE.MeshStandardMaterial({color:'#c9e3cb',metalness:.2,roughness:.2}),0,8.65,0,10);
  cylinder(lighthouse,0,1.6,1.2,mats.red,0,10,0,10);
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2;box(lighthouse,.1,1.6,.1,mats.teal,Math.sin(a),8.65,Math.cos(a));}
  box(lighthouse,.55,.95,.07,mats.teal,0,1.15,1.65);palm(lighthouse,-3,1,.85,.6);palm(lighthouse,2.8,-2,.65,2);
  dock(lighthouse,0,7.5,6);

  const projects=island(24,-10,5.7);palm(projects,2,-2,1.1,.6);palm(projects,3.7,1,.7,2);
  const deck=dock(projects,-4,5,11,-.5);deck.scale.x=2.1;
  const board=textBoard('Ocean Atlas',6,3);board.position.set(-1,4,2);board.rotation.y=-.3;projects.add(board);box(projects,.16,3,.16,mats.darkWood,-3.5,2,2.8);box(projects,.16,3,.16,mats.darkWood,1.5,2,1.2);
  const smallBoard=textBoard('Tidal Journal',4,2);smallBoard.position.set(-6,3,5);smallBoard.rotation.y=-.3;projects.add(smallBoard);
  for(let i=0;i<4;i++){box(projects,.8,.8,.8,i%2?mats.white:mats.orange,-2+i,1,5.2);}
  const buoy=new THREE.Group();buoy.position.set(16,.3,-1);scene.add(buoy);cylinder(buoy,.55,.9,.9,mats.orange);cylinder(buoy,.05,.05,1.5,mats.white,0,1.2,0);floating.push({object:buoy,y:.3,phase:2});

  const reef=new THREE.Group();reef.position.set(2,-.3,27);scene.add(reef);
  cylinder(reef,4.5,5.7,.4,new THREE.MeshStandardMaterial({color:'#4ec3b5',roughness:1}),0,-.35,0,13);
  for(let i=0;i<12;i++){const a=i*2.4,r=1.2+(i%4)*.8;const coral=sphere(reef,.65+(i%3)*.17,i%2?mats.coral:material('#e5c482'),Math.cos(a)*r,.2,Math.sin(a)*r);coral.scale.set(.75,1.5,.7);}
  const raft=new THREE.Group();raft.position.set(0,.25,26);scene.add(raft);for(let i=0;i<8;i++)cylinder(raft,.17,.17,4,mats.wood,-1.7+i*.48,0,0,8).rotation.x=Math.PI/2;
  cylinder(raft,.06,.06,4.1,mats.darkWood,0,2,0);const sailShape=new THREE.Shape();sailShape.moveTo(0,0);sailShape.lineTo(0,3);sailShape.lineTo(2.1,.2);sailShape.closePath();const sail=new THREE.Mesh(new THREE.ShapeGeometry(sailShape),new THREE.MeshStandardMaterial({color:'#e8bc79',side:THREE.DoubleSide}));sail.position.set(.05,1.1,0);raft.add(sail);floating.push({object:raft,y:.25,phase:1});

  const harbor=island(37,29,6.2);dock(harbor,-5,4,10,-.6);
  box(harbor,3,2.5,3,mats.white,0,1.7,0);const roof=cylinder(harbor,0,2.6,1.8,mats.roof,0,3.8,0,4);roof.rotation.y=Math.PI/4;
  box(harbor,.7,1.4,.12,mats.teal,0,1.2,1.56);box(harbor,.7,.7,.12,mats.orange,-.9,2,1.56);
  palm(harbor,3,1,1,1);palm(harbor,-2,-2,.8,2);
  box(harbor,1.7,1.2,1,mats.red,-3,1.2,2);box(harbor,1.85,.18,1.1,mats.white,-3,1.9,2);
  cylinder(harbor,.08,.08,2,mats.darkWood,-3,0,2);

  for(const [x,z,r] of [[-62,35,3.6],[-7,-53,3.3],[52,-35,4.4],[60,7,3],[-38,49,3.5],[-52,-35,2.8]]){const i=island(x,z,r);palm(i,0,0,.6+r*.08,x);}
  for(let i=0;i<16;i++){const a=i*2.4,r=20+(i%5)*9;const rock=sphere(scene,.7+i%3*.4,mats.rock,Math.sin(a)*r,-.3,Math.cos(a)*r);rock.scale.y=.6;obstacles.push({x:rock.position.x,z:rock.position.z,r:.65+i%3*.35,object:rock,kind:'rock',lastHit:-20});}
  for(let i=0;i<8;i++){
    const b=new THREE.Group();b.position.set(Math.sin(i*2.1)*40,8+(i%3)*2,Math.cos(i*2.1)*40);scene.add(b);
    const mat=new THREE.MeshBasicMaterial({color:'#ecf2db',side:THREE.DoubleSide});const wing=mesh(new THREE.ConeGeometry(.17,1,3),mat,b,-.35,0,0);wing.rotation.z=Math.PI/2+.2;const wing2=mesh(new THREE.ConeGeometry(.17,1,3),mat,b,.35,0,0);wing2.rotation.z=-Math.PI/2-.2;sphere(b,.16,mats.white,0,0,0).scale.set(.7,.8,1.7);sphere(b,.1,mats.white,0,.1,-.24);const beak=mesh(new THREE.ConeGeometry(.04,.18,5),mats.orange,b,0,.08,-.38);beak.rotation.x=-Math.PI/2;birds.push({object:b,phase:i*1.4});
  }
  destinations.forEach(d=>{const el=document.createElement('button');el.className='world-label';el.innerHTML=`<span class="pin"></span><small>${d.category.split('/')[1].trim()}</small><strong>${d.title} ↗</strong>`;el.onclick=()=>openDestination(d.id);el.tabIndex=-1;$('world-labels').append(el);labels.push({el,position:new THREE.Vector3(d.x,d.id==='about'?2:6,d.z+(d.id==='about'?9:0))});});
}
function createBoat(){
  const vessel=createSailboat(scene);vesselDamage=createVesselDamage(vessel,scene);return vessel;
}

const trailPositions=[[-32,12],[-42,28],[-22,43],[5,49],[28,39]];
const trailBuoys=[];let trailActive=false, collected=0;
function createBuoyTrail(){trailPositions.forEach(([x,z],i)=>{const g=new THREE.Group();g.position.set(x,.3,z);scene.add(g);cylinder(g,.3,.5,.6,mats.orange);cylinder(g,.04,.04,1.2,mats.white,0,.8,0);sphere(g,.12,mats.orange,0,1.5,0);floating.push({object:g,y:.3,phase:i});trailBuoys.push({object:g,x,z,collected:false});ring(scene,1.2,'#fff4cf',x,.04,z);});}

function buildWater(){
  const geometry=new THREE.PlaneGeometry(260,260,320,320);geometry.rotateX(-Math.PI/2);
  const mat=new THREE.ShaderMaterial({
    transparent:false,uniforms:{uSwell:{value:new THREE.Vector2(1,0)},uFogColor:{value:new THREE.Color()},uFogRange:{value:new THREE.Vector2(50,150)},uFogDensity:{value:0},uFogStrength:{value:0},uSunset:{value:0},uWeather:{value:new THREE.Vector4(1,0,0,1)},uTime:{value:0},uBoat:{value:new THREE.Vector2()},uSpeed:{value:0},uHeading:{value:0},uPulses:{value:pulses},uShores:{value:Array.from({length:12},()=>new THREE.Vector3(1000,1000,0))}},
    vertexShader:waterVertex,
    fragmentShader:waterFragment
  });water=new THREE.Mesh(geometry,mat);water.receiveShadow=true;water.position.y=-.07;scene.add(water);
  // Submerged fish are simple silhouettes, visible as little schools near the reef.
  const fishMat=new THREE.MeshBasicMaterial({color:'#267d81',transparent:true,opacity:.45});
  for(let i=0;i<16;i++){const fish=new THREE.Group();sphere(fish,.18,fishMat,0,0,0).scale.set(.65,.25,1.8);const tail=mesh(new THREE.ConeGeometry(.2,.3,3),fishMat,fish,0,0,.4);tail.rotation.x=Math.PI/2;const school=[[-40,17],[42,35],[2,-39],[24,52]][Math.floor(i/4)];fish.position.set(school[0]+(i%4)*.8,.02,school[1]+(i%3));scene.add(fish);floating.push({object:fish,y:.02,phase:i,isFish:true});}
  for(let i=0;i<60;i++){const r=mesh(new THREE.CircleGeometry(.15,9),new THREE.MeshBasicMaterial({color:'#ebf6d8',transparent:true,opacity:0,depthWrite:false}),scene);r.rotation.x=-Math.PI/2;r.visible=false;ripples.push({object:r,life:0});}
}
function drawMap(){navalMap?.draw({player:boatPosition,heading,discovered,pirate:pirates?.position,guide:guides?.position});}function updateBoat(dt){
  const dialogOpen=!!document.querySelector('dialog[open]');
  const canMove=shipState==='afloat'&&!dialogOpen;
  const up=canMove&&(keys.has('w')||keys.has('arrowup')),down=canMove&&(keys.has('s')||keys.has('arrowdown'));
  const left=!dialogOpen&&(keys.has('a')||keys.has('arrowleft')),right=!dialogOpen&&(keys.has('d')||keys.has('arrowright'));
  const boost=keys.has('shift'),maxSpeed=boost?12:7;
  if(up)speed+=dt*5.2;else if(down)speed-=dt*5.5;else speed*=Math.exp(-dt*(1.25+climate.night*.25));
  speed=THREE.MathUtils.clamp(speed,-3.5,maxSpeed);
  steering=canMove?(left?1:0)-(right?1:0):0;if(canMove)heading+=hullMotion.state.yawRate*dt;
  if(canMove&&sailing){heading+=Math.sin(worldTime*1.1)*dt*climate.night*.09;waveDrift.x+=Math.cos(climate.direction)*climate.gust*dt*.22;waveDrift.y+=Math.sin(climate.direction)*climate.gust*dt*.22;}
  collisionCooldown=Math.max(0,collisionCooldown-dt);
  if(!dialogOpen&&shipState==='afloat'){boatPosition.x-=Math.sin(heading)*speed*dt;boatPosition.z-=Math.cos(heading)*speed*dt;}
  waveDrift.multiplyScalar(Math.exp(-dt*.8));if(canMove&&sailing){boatPosition.x+=waveDrift.x*dt;boatPosition.z+=waveDrift.y*dt;}
  if(shipState==='afloat')for(const o of [...obstacles,...(marine?.colliders??[])]){
    if(o.destroyed)continue;
    // Three hull samples form a capsule. Resolve only approaching normal velocity.
    for(const along of [-2.1,0,1.9]){
      const sx=boatPosition.x+Math.sin(heading)*along,sz=boatPosition.z+Math.cos(heading)*along;
      const dx=sx-o.x,dz=sz-o.z,dist=Math.hypot(dx,dz),limit=o.r+1.05;
      if(dist>=limit)continue;
      const nx=dist>.001?dx/dist:1,nz=dist>.001?dz/dist:0;
      const normalSpeed=Math.max(0,(Math.sin(heading)*nx+Math.cos(heading)*nz)*speed);
      boatPosition.x+=nx*(limit-dist+.02);boatPosition.z+=nz*(limit-dist+.02);
      const damage=impactDamage(normalSpeed,o.kind==='rock'?1.2:1);
      if(damage>0&&collisionCooldown<=0){
        takeDamage(damage);collisionCooldown=.85;
        marine?.burst(sx,.3,sz,'splash',15);pulse(sx,sz,.35);audio.effect('impact',Math.min(1,normalSpeed/8));
        if(o.maxHp!==undefined){const wasDestroyed=o.destroyed;marine.impact(o,damage*1.8);
          if(!wasDestroyed&&o.destroyed&&o.kind==='fuel'){
            takeDamage(Math.max(10,42-Math.hypot(boatPosition.x-o.x,boatPosition.z-o.z)*3));
            for(const other of marine.colliders)if(!other.destroyed&&other!==o&&other.object&&Number.isFinite(other.hp)&&Math.hypot(other.x-o.x,other.z-o.z)<5)marine.impact(other,30);
            toast(health>0?'Fuel drum exploded. Keep clear of the red barrels.':'Hull breached by the blast.');
          }else if(health>0)toast(`${o.destroyed?'Obstacle splintered':'Hull impact'} · ${Math.round(health)}% integrity`);
        }else if(health>0)toast(`Hull impact · ${Math.round(health)}% integrity`);
        if(o.floater){o.floater.vx+=nx*-normalSpeed*.25;o.floater.vz+=nz*-normalSpeed*.25;}
      }
      if(normalSpeed>.05)speed*=-.25;
      break;
    }
  }
  const current=edgeCurrent(boatPosition.x,boatPosition.z,climate.storm);
  if(canMove&&sailing){boatPosition.x+=hullMotion.state.currentX*dt;boatPosition.z+=hullMotion.state.currentZ*dt;}
  const warning=document.getElementById('current-warning');warning.hidden=!sailing||current.danger<.22||shipState!=='afloat';
  if(!warning.hidden)warning.textContent=`WATERFALL CURRENT · ${Math.max(0,100-Math.hypot(boatPosition.x,boatPosition.z)).toFixed(0)} m TO DROP · TURN INWARD & BOOST`;
  if(current.over&&shipState==='afloat'){
    health=0;shipState='falling';fallTime=0;keys.clear();toast('The current has taken you over the rim.');
    vesselDamage?.hit(0,heading,speed);$('rescue').hidden=false;$('rescue-status').textContent='Caught by the edge current. Sea Wren is falling over the waterfall. Press R to relaunch.';
  }
  if(shipState==='moored'){
    const m=marine.mooring;boatPosition.x=THREE.MathUtils.lerp(boatPosition.x,m.x,1-Math.exp(-dt*3));boatPosition.z=THREE.MathUtils.lerp(boatPosition.z,m.z,1-Math.exp(-dt*3));heading=THREE.MathUtils.lerp(heading,m.heading,1-Math.exp(-dt*3));speed=0;health=Math.min(100,health+dt*10);document.body.classList.toggle('ship-critical',health<30);boat.userData.hull.material.color.set(health<30?'#604b44':health<65?'#39545d':'#174a62');
  }
  const pose=hullWaterPose(boatPosition.x,boatPosition.z,heading,worldTime,pulses);
  const oldY=boat.position.y;boat.position.x=boatPosition.x;boat.position.z=boatPosition.z;
  const motion=hullMotion.step(dt,pose,{speed,steering:steering*(1-climate.night*.22-climate.storm*.13),health,wind:climate.gust,heading,current:canMove&&sailing?current:{x:0,z:0}});
  boat.position.y=shipState==='sunk'?-40:motion.height;
  if(shipState==='falling'){
    fallTime+=dt;const r=Math.hypot(boatPosition.x,boatPosition.z)||1;boatPosition.x+=boatPosition.x/r*dt*6;boatPosition.z+=boatPosition.z/r*dt*6;
    boat.position.set(boatPosition.x,-.5*9.8*fallTime*fallTime,boatPosition.z);boat.rotation.set(-Math.min(1.4,fallTime*.6),heading,Math.sin(fallTime)*.2);speed*=Math.exp(-dt);
    if(fallTime>4.8){shipState='sunk';boat.visible=false;}
  }else if(shipState==='sinking'){
    sinkProgress+=dt;const sinking=sinkingPose(sinkProgress);
    boat.position.y=pose.height+.1-sinking.depth;
    boat.rotation.set(sinking.pitch+pose.pitch*Math.exp(-sinkProgress*.2),heading,sinking.roll+pose.roll*.3);
    speed*=Math.exp(-dt*1.5);
    if(sinking.done){shipState='sunk';boat.visible=false;$('rescue-status').textContent='Sea Wren has sunk. Floating wreckage marks the site. Relaunch to sail again.';}
  }  else if(shipState!=='sunk'){
    boat.rotation.x=motion.pitch;boat.rotation.y=heading;
    boat.rotation.z=motion.roll;
  }
  vesselDamage?.update(dt,worldTime,pulses,health,shipState,sinkProgress,marine?.burst);
  boat.userData.sails?.forEach((s,i)=>{s.rotation.y=reducedMotion?0:Math.sin(worldTime*.6+i)*.025+steering*.025;});
  if(shipState==='afloat'&&Math.abs(speed)>.7&&elapsed-lastWake>.2){lastWake=elapsed;pulse(boatPosition.x+Math.sin(heading)*3,boatPosition.z+Math.cos(heading)*3,Math.min(.24,Math.abs(speed)*.025));}
  if(shipState==='afloat'&&Math.abs(speed)>.5&&frame%3===0){const r=ripples.find(r=>r.life<=0);if(r){r.life=1;const side=frame%2?1:-1;r.object.position.set(boatPosition.x+Math.sin(heading)*2.8+Math.cos(heading)*side,0,boatPosition.z+Math.cos(heading)*2.8-Math.sin(heading)*side);r.object.rotation.z=-heading+side*.4;r.object.visible=true;}}
  ripples.forEach(r=>{if(r.life>0){r.life-=dt*.55;r.object.position.y=waterHeight(r.object.position.x,r.object.position.z,worldTime,pulses)+.04;r.object.material.opacity=Math.max(0,r.life*.5);r.object.scale.set(1+(1-r.life)*5,1+(1-r.life)*3,1);if(r.life<=0)r.object.visible=false;}});
  nearest=destinations.filter(d=>Math.hypot(boatPosition.x-d.x,boatPosition.z-d.z)<(d.id==='play'?8:11)).sort((a,b)=>Math.hypot(boatPosition.x-a.x,boatPosition.z-a.z)-Math.hypot(boatPosition.x-b.x,boatPosition.z-b.z))[0]??null;
  const m=marine?.mooring,nearMoor=m&&Math.hypot(boatPosition.x-m.x,boatPosition.z-m.z)<m.radius;
  $('mooring-prompt').hidden=!sailing||dialogOpen||(!nearMoor&&shipState!=='moored')||(shipState!=='afloat'&&shipState!=='moored');
  $('mooring-text').textContent=shipState==='moored'?(health<100?'MOORED / REPAIRING':'MOORED / HULL RESTORED'):'TIDE HOUSE BERTH';
  $('moor').innerHTML=shipState==='moored'?'Cast off <kbd>F</kbd>':'Moor <kbd>F</kbd>';
  $('prompt').hidden=!nearest||!sailing||dialogOpen||nearMoor||(shipState!=='afloat'&&shipState!=='moored');if(nearest)$('near-name').textContent=nearest.title;
  if(trailActive&&shipState==='afloat')trailBuoys.forEach((b,i)=>{if(!b.collected&&Math.hypot(boatPosition.x-b.x,boatPosition.z-b.z)<2.4){b.collected=true;collected++;captain.event('buoys',String(i));b.object.visible=false;toast(collected===5?'All five buoys found. A fine bit of seamanship!':`Buoy discovered · ${collected} / 5`);}});
  const gullDistance=birds.reduce((n,b)=>Math.min(n,b.object.position.distanceTo(boatPosition)),80);
  audio.update({time:elapsed,speed,throttle:up?1:down?.5:0,heave:(boat.position.y-oldY)/Math.max(dt,.001),alive:sailing&&shipState==='afloat',parked:shipState==='moored',gullDistance,hidden:document.hidden});
  if(frame%5===0){$('coords').textContent=`${Math.abs(boatPosition.z*.06).toFixed(2)}° ${boatPosition.z<0?'N':'S'}   ${Math.abs(boatPosition.x*.06).toFixed(2)}° ${boatPosition.x<0?'W':'E'}`;drawMap();$('speed-value').textContent=Math.abs(speed).toFixed(1);$('health-value').textContent=`${Math.round(health)}%`;$('health-bar').setAttribute('aria-valuenow',String(Math.round(health)));$('health-bar').firstElementChild.style.width=`${health}%`;$('ship-state').textContent=shipState==='falling'?'OVER THE RIM / VESSEL LOST':shipState==='sinking'?'HULL BREACHED / TAKING ON WATER':shipState==='sunk'?'VESSEL LOST / R TO RELAUNCH':shipState==='moored'?'MOORED / ENGINE OFF':`AUXILIARY MOTOR / ${up?'THROTTLE':Math.abs(speed)>.5?'CRUISING':'IDLE'}`;}
}
const targetCam=new THREE.Vector3(),lookAt=new THREE.Vector3();let lastTime=performance.now();
function animate(now){
  requestAnimationFrame(animate);if(document.hidden){lastTime=now;return;}const frameSeconds=(now-lastTime)/1000;const dt=Math.min(frameSeconds,.05);lastTime=now;elapsed+=dt;frame++;worldTime+=reducedMotion?0:dt;
  profiler.begin();
  climate=weatherWorld.update(dt,worldTime,pulses,boatPosition,shipState);
  const previousX=boatPosition.x,previousZ=boatPosition.z;
  updateBoat(dt);water.material.uniforms.uTime.value=worldTime;water.material.uniforms.uBoat.value.set(boatPosition.x,boatPosition.z);water.material.uniforms.uSpeed.value=shipState==='afloat'?Math.abs(speed)/8:0;water.material.uniforms.uHeading.value=heading;
  const paused=!!document.querySelector('dialog[open]');
  const contractMessage=captain.step(dt,{player:boatPosition,speed,active:sailing,paused,health,shipState,storm:climate.storm,distance:Math.hypot(boatPosition.x-previousX,boatPosition.z-previousZ)});if(contractMessage)toast(contractMessage);
  if(sailing&&!paused&&health>0&&['afloat','moored'].includes(shipState))for(const d of destinations){if(Math.hypot(boatPosition.x-d.x,boatPosition.z-d.z)<12){captain.event('ports',d.id);discovered.add(d.id);}}
  journal.update(dt);
  voyage?.update(dt,worldTime,pulses,{player:boatPosition,speed,interact:keys.has('g'),active:sailing&&shipState==='afloat',blocked:!!document.querySelector('dialog[open]')||pirates?.active()});
  pirates?.update(dt,worldTime,pulses,{player:boatPosition,heading,speed,health,sailing,shipState,climate,paused:!!document.querySelector('dialog[open]')});
  floating.forEach(f=>{if(f.isFish){if(!reducedMotion){f.object.position.x+=Math.sin(elapsed*.5+f.phase)*dt*.25;f.object.rotation.y=Math.sin(elapsed*.3+f.phase)*.3;}f.object.position.y=waterHeight(f.object.position.x,f.object.position.z,worldTime,pulses)+.025;}else{const pose=floatPose(f.object.position.x,f.object.position.z,0,f.object.children.length>8?1.5:.5,.7,worldTime,pulses);f.object.position.y=THREE.MathUtils.lerp(f.object.position.y,pose.height+f.y,1-Math.exp(-dt*7));f.object.rotation.x=pose.pitch;f.object.rotation.z=pose.roll;}});
  marine?.update(dt,worldTime,pulses,reducedMotion,boatPosition,elapsed);
  guides?.update(dt,worldTime,pulses,{player:boatPosition,speed,active:sailing&&shipState==='afloat',paused:!!document.querySelector('dialog[open]'),reduced:reducedMotion});
  surf?.update(dt,worldTime,pulses,boatPosition,reducedMotion);
  if(frame%15===0)$('tide-readout').textContent=`${tideRate(worldTime)>=0?'RISING':'FALLING'} TIDE ${tideLevel(worldTime)>=0?'+':''}${tideLevel(worldTime).toFixed(2)} m`;
  if(mooringLines){mooringLines.visible=shipState==='moored';if(mooringLines.visible){const a=mooringLines.geometry.attributes.position;const s=Math.sin(heading),c=Math.cos(heading);a.setXYZ(0,-8.1,waterHeight(-8.1,7.4,worldTime,pulses)+1,7.4);a.setXYZ(1,boatPosition.x-s*2.5,boat.position.y+1,boatPosition.z-c*2.5);a.setXYZ(2,-5.1,waterHeight(-5.1,7.4,worldTime,pulses)+1,7.4);a.setXYZ(3,boatPosition.x+s*2.4,boat.position.y+1,boatPosition.z+c*2.4);a.needsUpdate=true;}}
  if(!reducedMotion)birds.forEach(b=>{const a=elapsed*.07+b.phase;b.object.position.x=Math.cos(a)*42;b.object.position.z=Math.sin(a)*38;b.object.rotation.y=-a;b.object.children[0].rotation.z=Math.PI/2+.2+Math.sin(elapsed*4+b.phase)*.2;b.object.children[1].rotation.z=-Math.PI/2-.2-Math.sin(elapsed*4+b.phase)*.2;});
  const mobile=innerWidth<800;
  if(sailing){targetCam.set(boatPosition.x+23,28,boatPosition.z+31);lookAt.set(boatPosition.x,2,boatPosition.z-1);}else{targetCam.set(mobile?49:55,mobile?54:53,mobile?67:67);lookAt.set(mobile?4:-8,1,mobile?-3:-2);}
  if(mouseCamera){const v=mouseCamera.view,dx=targetCam.x-lookAt.x,dz=targetCam.z-lookAt.z,dy=targetCam.y-lookAt.y,r=Math.hypot(dx,dz),a=Math.atan2(dx,dz)+v.yaw;
    targetCam.set(lookAt.x+Math.sin(a)*r+v.panX,lookAt.y+Math.max(8,dy*(1+v.pitch)),lookAt.z+Math.cos(a)*r+v.panZ);lookAt.x+=v.panX;lookAt.z+=v.panZ;
  }
  const baseZoom=sailing?(mobile?1.35:1.65):.92;zoomAdjust=Math.max(.92/baseZoom,zoomAdjust);
  if(shipState==='falling'){targetCam.y=Math.max(-12,28-fallTime*5);lookAt.y=-Math.min(30,fallTime*fallTime*1.2);}
  camera.position.lerp(targetCam,1-Math.exp(-dt*(reducedMotion?20:1.5)));camera.zoom=THREE.MathUtils.lerp(camera.zoom,Math.max(.92,baseZoom*zoomAdjust),1-Math.exp(-dt*2));camera.updateProjectionMatrix();camera.lookAt(lookAt);camera.updateMatrixWorld();
  const sunriseFog=climate.sunriseFog;
  scene.fog.density=sunriseFogDensity(camera.position.distanceTo(lookAt),sunriseFog);water.material.uniforms.uFogDensity.value=scene.fog.density;water.material.uniforms.uFogColor.value.copy(scene.fog.color);
  water.material.uniforms.uSunset.value=Math.exp(-(((climate.hour-17)/2.2)**2))*(1-climate.storm);
  const vec=new THREE.Vector3();labels.forEach(({el,position})=>{vec.copy(position).project(camera);const x=(vec.x*.5+.5)*innerWidth,y=(-vec.y*.5+.5)*innerHeight;el.style.transform=`translate(${x}px, ${y}px) translate(-50%, -100%)`;el.style.opacity=vec.z<1&&x>0&&x<innerWidth&&y>90&&y<innerHeight-105?'1':'0';el.style.pointerEvents=el.style.opacity==='1'?'auto':'none';});
  profiler.renderedStart();
  renderer.shadowMap.needsUpdate=frame%6===0||frame===1;
  if(waterTransmissionFailed&&water.material.defines.WATER_TRANSMISSION){
    delete water.material.defines.WATER_TRANSMISSION;water.material.needsUpdate=true;
  }
  if(water.material.defines.WATER_TRANSMISSION){try{waterView.capture(scene);}catch(error){console.error('Underwater capture disabled',error);waterTransmissionFailed=true;delete water.material.defines.WATER_TRANSMISSION;water.material.needsUpdate=true;}}
  renderer.render(scene,camera);profiler.end(frameSeconds);
}
function resize(){if(!renderer)return;renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));const aspect=innerWidth/innerHeight;const view=innerWidth<800?40:48;camera.left=-view*aspect/2;camera.right=view*aspect/2;camera.top=view/2;camera.bottom=-view/2;camera.updateProjectionMatrix();}
try{
  renderer=new THREE.WebGLRenderer({canvas:$('ocean'),antialias:true,powerPreference:'high-performance'});renderer.setClearColor('#8cd6d5');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  renderer.debug.onShaderError=(gl,program,vertex,fragment)=>{
    console.error('WebGL shader error',gl.getProgramInfoLog(program),gl.getShaderInfoLog(fragment));
    if((gl.getShaderSource(fragment)??'').includes('uUnderColor'))waterTransmissionFailed=true;
  };
  renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  scene=new THREE.Scene();scene.fog=new THREE.FogExp2('#8cd6d5',0);camera=new THREE.OrthographicCamera(-40,40,25,-25,.1,500);camera.position.set(55,53,67);
  const hemisphere=new THREE.HemisphereLight('#fff9e7','#4b9b9a',2.8);scene.add(hemisphere);const sun=new THREE.DirectionalLight('#fff4d6',3.2);sun.position.set(-35,60,25);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-70;sun.shadow.camera.right=70;sun.shadow.camera.top=70;sun.shadow.camera.bottom=-70;sun.shadow.normalBias=.05;scene.add(sun);
  buildWater();[mats.sand,mats.rock,mats.wood,mats.darkWood].forEach(m=>applyWetSurface(m,water.material.uniforms));buildWorld();boat=createBoat();boat.userData.sails.at(-1).material=boat.userData.sails.at(-1).material.clone();boat.userData.sails.at(-1).material.color.set(PENNANTS.find(p=>p.id===captain.state.pennant).color);createBuoyTrail();createOceanSkirt(water,scene);waterView=createWaterView(renderer,water,camera);water.material.defines={WATER_TRANSMISSION:1};water.material.needsUpdate=true;
  marine=createMarineDetails({scene,island,palm,dock,ring,mats,pulse,obstacles,onSound:(kind,power)=>audio.effect(kind,power)});
    pirates=createPirates({scene,marine,obstacles,pulse,takeDamage,toast,audio,onResult:kind=>{if(kind==='escaped'||kind==='defeated')captain.event(kind);},reduced:reducedMotion,onAudio:async()=>{
    try{await audio.previewPirateMusic();soundOn=true;$('sound').setAttribute('aria-pressed','true');$('sound').setAttribute('aria-label','Disable ocean sound');$('sound-label').textContent='Sound on';toast('Pirate audio enabled.');}catch{toast('Audio could not start. Check the browser tab sound setting.');}
  }});
  voyage=createVoyageActivities(scene,toast,audio,(type,id)=>type==='race'?captain.race(id):captain.event(type,id));guides=createDolphinGuides(scene,pulse,audio,toast,marine,obstacles,()=>captain.event('guides'));navalMap=createNavalMap({destinations,obstacles,activities:voyage.sites,onOpen:()=>keys.clear(),onRoute:points=>guides.setRoute(points)});createOceanEdge(scene,water.material.uniforms);
  mouseCamera=attachMouseCamera($('ocean'),{zoom:value=>zoomAdjust=value,getZoom:()=>zoomAdjust,minZoom:()=>.92/(sailing?(innerWidth<800?1.35:1.65):.92)});
  const scenery=enrichScenery(scene,obstacles);
  const batching=optimizeSceneIslands(obstacles,marine,scenery);console.info('Blue Current static batching',batching);
  weatherWorld=createWeatherWorld({scene,renderer,sun,hemisphere,boat,water,scenery,audio,reduced:reducedMotion});
  const shores=obstacles.filter(o=>o.kind==='island').slice(0,12);setWaveBarriers(shores);shores.forEach((o,i)=>water.material.uniforms.uShores.value[i].set(o.x,o.z,o.r));
  surf=createSurf({scene,obstacles,marine,boat,pulse,onSound:(kind,power)=>audio.effect(kind,power),onHullHit:(x,z,power)=>{if(sailing&&shipState==='afloat'){waveDrift.x+=x*power*.18;waveDrift.y+=z*power*.18;waveDrift.clampLength(0,.65);}}});
  mooringLines=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(12),3)),new THREE.LineBasicMaterial({color:'#dbc596'}));mooringLines.frustumCulled=false;scene.add(mooringLines);
  profiler=createFrameProfiler(renderer);window.blueCurrentPerformance=()=>profiler.snapshot();
  resize();window.addEventListener('resize',resize);sceneReady=true;document.body.classList.add('loaded');requestAnimationFrame(animate);
  $('ocean').addEventListener('webglcontextlost',e=>{e.preventDefault();toast('The ocean renderer paused. Your journal and port register remain available.');sceneReady=false;openChart();});
}catch(error){console.error('Ocean initialization failed:',error);document.body.classList.add('loaded','fallback');$('set-sail').textContent='Explore destinations';toast('3D is unavailable. Your destinations are still here.');openChart();}
drawMap();

























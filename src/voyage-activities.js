import * as THREE from 'three';
import {waterHeight} from './marine.js';

export const VOYAGE_SITES=[
  {type:'salvage',name:'WESTERN WRECK',x:-48,z:1},{type:'salvage',name:'AMBER CARGO',x:46,z:-34},{type:'salvage',name:'SOUTHERN CACHE',x:24,z:57},
  {type:'survey',name:'DOLPHIN SOUND',x:-42,z:24},{type:'survey',name:'REEF OBSERVATORY',x:44,z:31},{type:'survey',name:'NORTHERN MIGRATION',x:5,z:-42},
  ...[[5,-54],[20,-57],[36,-49],[42,-34],[29,-27],[14,-36]].map(([x,z],i)=>({type:'race',name:`REGATTA ${i+1}`,x,z,index:i}))
];
export function advanceActivity(site,progress,dt,{distance,speed,interact}){
  if(site.done)return progress;
  if(distance<5&&Math.abs(speed)<2&&interact)return Math.min(1,progress+dt/(site.type==='survey'?6:4));
  return Math.max(0,progress-dt*.1);
}
export function createVoyageActivities(scene,toast,audio,onComplete=()=>{}){
  const sites=VOYAGE_SITES.map(s=>({...s,done:false,progress:0})),objects=[];let held=false,race=-1,raceTime=0;
  const hud=document.createElement('aside');hud.className='voyage-hud';hud.hidden=true;hud.innerHTML='<small>EXPEDITION LOG</small><strong></strong><p></p><div class="voyage-progress"><i></i></div><button>Hold G / hold here</button>';document.querySelector('main').append(hud);
  const title=hud.querySelector('strong'),copy=hud.querySelector('p'),bar=hud.querySelector('i'),button=hud.querySelector('button');
  button.onpointerdown=e=>{e.preventDefault();held=true;button.setPointerCapture(e.pointerId);};button.onpointerup=button.onpointercancel=button.onlostpointercapture=()=>held=false;
  const wood=new THREE.MeshStandardMaterial({color:'#926646',roughness:.8}),brass=new THREE.MeshStandardMaterial({color:'#d4ac60',metalness:.55,roughness:.45}),white=new THREE.MeshStandardMaterial({color:'#eae5c8'});
  for(const site of sites){
    const group=new THREE.Group();group.position.set(site.x,0,site.z);scene.add(group);let moving;
    if(site.type==='race'){
      for(const side of [-1,1]){const buoy=new THREE.Mesh(new THREE.CylinderGeometry(.28,.48,1.1,12),brass);buoy.position.set(side*2.8,.3,0);group.add(buoy);const stripe=new THREE.Mesh(new THREE.TorusGeometry(.36,.055,6,16),white);stripe.rotation.x=Math.PI/2;stripe.position.set(side*2.8,.5,0);group.add(stripe);}
      const arc=new THREE.Mesh(new THREE.TorusGeometry(2.8,.045,6,48,Math.PI),new THREE.MeshBasicMaterial({color:'#e7cc78',transparent:true,opacity:.45}));arc.position.y=.3;group.add(arc);moving=arc;
    }else if(site.type==='salvage'){
      const buoy=new THREE.Mesh(new THREE.CylinderGeometry(.2,.38,.75,12),brass);group.add(buoy);
      const basket=new THREE.Mesh(new THREE.BoxGeometry(1.1,.75,.85),wood);basket.position.set(1,-1.6,0);group.add(basket);moving=basket;
      for(const z of [-.34,.34]){const band=new THREE.Mesh(new THREE.BoxGeometry(1.14,.12,.1),brass);band.position.set(0,.2,z);basket.add(band);}
      const mast=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,1.6,8),white);mast.position.y=1;group.add(mast);const flag=new THREE.Mesh(new THREE.PlaneGeometry(.6,.35),new THREE.MeshStandardMaterial({color:'#de9e64',side:THREE.DoubleSide}));flag.position.set(.28,1.6,0);group.add(flag);
    }else{
      const ring=new THREE.Mesh(new THREE.TorusGeometry(2.6,.035,6,48),new THREE.MeshBasicMaterial({color:'#9ae1dc',transparent:true,opacity:.45}));ring.rotation.x=-Math.PI/2;group.add(ring);moving=ring;
      const instrument=new THREE.Mesh(new THREE.CylinderGeometry(.18,.3,.7,12),white);instrument.position.set(2.6,.3,0);group.add(instrument);
    }
    objects.push({site,group,moving});
  }
  function reset(){sites.forEach(s=>{s.done=false;s.progress=0;});race=-1;raceTime=0;held=false;hud.hidden=true;}
  function update(dt,time,pulses,{player,speed,interact,active,blocked}){
    for(const o of objects){o.group.position.y=waterHeight(o.site.x,o.site.z,time,pulses)+.08;o.group.rotation.z=Math.sin(time+o.site.x)*.025;
      if(o.site.type==='salvage')o.moving.position.y=-1.6+o.site.progress*2.1;
      if(o.site.type==='survey')o.moving.scale.setScalar(1+Math.sin(time*.8)*.04);
      o.group.visible=!o.site.done||o.site.type==='race';
    }
    if(!active||blocked){hud.hidden=true;held=false;return;}
    if(race>=0){raceTime+=dt;if(raceTime>80){toast('Regatta time elapsed. Return to gate one to retry.');sites.filter(s=>s.type==='race').forEach(s=>s.done=false);race=-1;}}
    const near=sites.filter(s=>!s.done&&Math.hypot(s.x-player.x,s.z-player.z)<8).sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z))[0];
    hud.hidden=!near&&race<0;if(!near){if(race>=0){title.textContent=`REGATTA · GATE ${race+1}/6`;copy.textContent=`${Math.ceil(80-raceTime)} seconds remaining · follow the gold gates`;button.hidden=true;bar.style.width=`${race/6*100}%`;}return;}
    const distance=Math.hypot(near.x-player.x,near.z-player.z);
    title.textContent=near.name;button.hidden=near.type==='race';
    if(near.type==='race'){
      copy.textContent=race<0?'Pass through gate one to start the 80-second regatta.':`Next gate ${race+1}/6 · ${Math.ceil(80-raceTime)} s`;
      if(distance<2.8&&Math.abs(speed)>1&&(near.index===race||(race<0&&near.index===0))){if(race<0){race=0;raceTime=0;toast('Regatta underway. Six gates, in order.');}near.done=true;race=near.index+1;audio.effect('bomb-armed',.5);if(race===6){onComplete('race',raceTime);toast(`Regatta complete in ${raceTime.toFixed(1)} seconds. Fine seamanship!`);race=-1;}}
    }else{
      copy.textContent=near.type==='survey'?'Slow below 2 knots and hold G to observe the pod.':'Slow below 2 knots and hold G to recover submerged cargo.';
      near.progress=advanceActivity(near,near.progress,dt,{distance,speed,interact:interact||held});
      if(near.progress>=1){near.done=true;onComplete(near.type,near.name);toast(near.type==='survey'?'Wildlife observation logged. A discovery for the ship’s journal.':'Salvage recovered. A treasure for the ship’s hold.');audio.effect('bomb-armed',.6);held=false;}
    }
    bar.style.width=`${(near.type==='race'?Math.max(0,race)/6:near.progress)*100}%`;
  }
  return {sites,update,reset};
}

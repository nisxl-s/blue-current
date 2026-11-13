import * as THREE from 'three';
import {createCloudLayer} from './clouds.js';
import {climateAt,deckFloodStep} from './climate.js';
import {waterHeight,setSeaWeather} from './marine.js';

export function createWeatherWorld({scene,renderer,sun,hemisphere,boat,water,scenery,audio,reduced}){
  let clock=0,pace=1,lastStrike=-30,flash=0,thunderAt=Infinity,deckVolume=0,lastDrain=0,clothClock=0;
  const hud=document.createElement('aside');hud.className='weather-hud';hud.innerHTML='<div><strong id="weather-clock">08:00</strong><span id="weather-label">MORNING BREEZE</span></div><span id="wind-label"></span><button title="Change the pace of the day" aria-label="Change day cycle speed">Day ×1</button>';document.querySelector('main').append(hud);
  hud.querySelector('button').onclick=()=>{pace=pace===1?4:1;hud.querySelector('button').textContent=`Day ×${pace}`;};
  const clockLabel=hud.querySelector('strong'),weatherLabel=hud.querySelector('#weather-label'),windLabel=hud.querySelector('#wind-label');
  const rainPositions=new Float32Array(900*6),rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPositions,3));
  const rain=new THREE.LineSegments(rainGeo,new THREE.LineBasicMaterial({color:'#bdd9e3',transparent:true,opacity:0,depthWrite:false}));rain.frustumCulled=false;scene.add(rain);
  const rainSeeds=Array.from({length:900},()=>({x:(Math.random()-.5)*85,z:(Math.random()-.5)*85,y:Math.random()*35}));
  const windGeo=new THREE.BufferGeometry(),windPositions=new Float32Array(90*6);windGeo.setAttribute('position',new THREE.BufferAttribute(windPositions,3));
  const wind=new THREE.LineSegments(windGeo,new THREE.LineBasicMaterial({color:'#def0dc',transparent:true,opacity:.15,depthWrite:false}));wind.frustumCulled=false;scene.add(wind);
  const starsGeo=new THREE.BufferGeometry(),starsPos=[];for(let i=0;i<450;i++){const a=i*2.399,y=25+Math.random()*90,r=80+Math.random()*50;starsPos.push(Math.cos(a)*r,y,Math.sin(a)*r);}
  starsGeo.setAttribute('position',new THREE.Float32BufferAttribute(starsPos,3));const stars=new THREE.Points(starsGeo,new THREE.PointsMaterial({color:'#d8e9ff',size:.16,transparent:true,opacity:0,depthWrite:false}));scene.add(stars);
  const skyUniforms={top:{value:new THREE.Color('#63b8cb')},bottom:{value:new THREE.Color('#c5e9d8')},fogColor:{value:scene.fog.color},haze:{value:0}};
  const sky=new THREE.Mesh(new THREE.SphereGeometry(400,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,depthTest:false,uniforms:skyUniforms,
    vertexShader:'varying float vY;void main(){vY=position.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying float vY;uniform vec3 top;uniform vec3 bottom;uniform vec3 fogColor;uniform float haze;void main(){vec3 sky=mix(bottom,top,smoothstep(-10.,100.,vY));float mist=haze*.8*exp(-max(0.,vY)*.018);gl_FragColor=vec4(mix(sky,fogColor,mist),1.);}'}));scene.add(sky);
  sky.renderOrder=-1000;sky.frustumCulled=false;
  sky.onBeforeRender=(_renderer,_scene,camera)=>{sky.position.copy(camera.position);sky.updateMatrixWorld();};
  const clouds=createCloudLayer(scene);
  const boltGeo=new THREE.BufferGeometry(),boltPos=new Float32Array(24*3);boltGeo.setAttribute('position',new THREE.BufferAttribute(boltPos,3));const bolt=new THREE.Line(boltGeo,new THREE.LineBasicMaterial({color:'#e5eaff',transparent:true,opacity:0}));scene.add(bolt);
  const lightning=new THREE.DirectionalLight('#c7ddff',0);lightning.position.set(20,40,-15);scene.add(lightning);
  const moon=new THREE.Mesh(new THREE.SphereGeometry(2,16,12),new THREE.MeshBasicMaterial({color:'#dbe8dc',transparent:true,opacity:0}));moon.position.set(-65,65,-90);scene.add(moon);
  const sheets=[];const sheetMat=new THREE.MeshPhysicalMaterial({color:'#7bc3c3',transparent:true,opacity:0,roughness:.12,metalness:.1,depthWrite:false});
  for(const [w,l,x,z]of [[1.75,1.1,0,2.05],[1.1,1.25,0,-2.7],[.27,3.8,-1.08,-.15],[.27,3.8,1.08,-.15]]){
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w,l,6,10),sheetMat);m.rotation.x=-Math.PI/2;m.position.set(x,.9,z);boat.add(m);sheets.push(m);
  }
  const drops=new THREE.InstancedMesh(new THREE.SphereGeometry(.035,5,4),new THREE.MeshBasicMaterial({color:'#ccf4e8',transparent:true,opacity:.75}),160);drops.frustumCulled=false;scene.add(drops);
  const drain=Array.from({length:160},()=>({life:0,p:new THREE.Vector3(),v:new THREE.Vector3()}));let drainIndex=0;const dummy=new THREE.Object3D();
  const sailData=boat.userData.sails.filter(s=>s.geometry.attributes.position).map(s=>({object:s,rest:s.geometry.attributes.position.array.slice()}));
  const palette={storm:new THREE.Color('#233747'),horizon:new THREE.Color('#fae3b6'),sun:new THREE.Color('#fff0ce'),gold:new THREE.Color('#ffbb68'),warmSky:new THREE.Color('#ffe3a3'),ground:new THREE.Color('#875a3a')};
  const treeFronds=new Map(scenery.trees.map(tree=>[tree,tree.children.filter(o=>o.userData.windFrond!==undefined)]));
  const c=new THREE.Color(),daySky=new THREE.Color('#73c4d0'),nightSky=new THREE.Color('#071322'),gold=new THREE.Color('#f19a75');
  function update(dt,time,pulses,player,state){
    clock+=reduced?0:dt*pace;const weather=climateAt(clock);setSeaWeather(weather);audio.weather=weather;
    if(water.material.uniforms.uSwell)water.material.uniforms.uSwell.value.set(Math.cos(weather.swellDirection),Math.sin(weather.swellDirection));
    water.material.uniforms.uWeather.value.set(weather.waveScale,weather.storm,weather.night,Math.min(1,weather.daylight+flash*2));
    const sunset=Math.exp(-(((weather.hour-17)/2.2)**2));
    c.copy(nightSky).lerp(daySky,weather.daylight).lerp(gold,sunset*.82).lerp(palette.storm,weather.storm*.5);
    scene.fog.color.copy(c);renderer.setClearColor(c);skyUniforms.top.value.copy(c).multiplyScalar(.72);skyUniforms.bottom.value.copy(c).lerp(palette.horizon,weather.daylight*.25+sunset*.65);
    skyUniforms.haze.value=weather.sunriseFog;
    sun.intensity=.22+weather.daylight*(2.9-weather.storm*1.2);sun.color.set('#d0dfff').lerp(palette.sun,weather.daylight).lerp(palette.gold,sunset*.95);
    const angle=(weather.hour-6)/12*Math.PI;sun.position.set(Math.cos(angle)*55,Math.max(5,Math.sin(angle)*65),25);
    hemisphere.intensity=.5+weather.daylight*(2-sunset*.95);hemisphere.color.set('#e3f1ff').lerp(palette.warmSky,sunset*.85);hemisphere.groundColor.set('#4b9b9a').lerp(palette.ground,sunset*.8);renderer.toneMappingExposure=.95+weather.daylight*.2;
    moon.material.opacity=weather.night*(1-weather.storm*.85);stars.material.opacity=weather.night*(1-weather.storm);
    clouds.update(time,weather);
    for(const m of scenery.windows)m.emissiveIntensity=.05+weather.night*1.7;
    for(const lamp of scenery.lamps)lamp.intensity=weather.night*9;
    if(scenery.beacon){scenery.beacon.rotation.y=reduced?0:time*.18;scenery.beamMat.opacity=weather.night*.045;scenery.beaconLight.intensity=weather.night*45;}
    for(const [i,tree]of scenery.trees.entries()){
      tree.rotation.z=reduced?0:Math.sin(time*1.1+i)*weather.gust*.035;
      tree.rotation.x=reduced?0:Math.sin(time*.8+i*.6)*weather.gust*.025;
      for(const frond of treeFronds.get(tree)){
        const base=frond.userData.baseRotation;frond.rotation.z=base.z+(reduced?0:Math.sin(time*2.1+i+frond.userData.windFrond)*weather.gust*.16);frond.rotation.x=base.x+(reduced?0:Math.sin(time*1.6+i)*weather.gust*.1);
      }
    }
    clothClock+=dt;const updateCloth=clothClock>=1/24;if(updateCloth)clothClock=0;
    if(updateCloth)for(const s of sailData){const p=s.object.geometry.attributes.position;for(let i=0;i<p.count;i++){
      const x=s.rest[i*3],y=s.rest[i*3+1],z=s.rest[i*3+2],free=Math.min(1,Math.abs(z+.9)*.5)*Math.max(0,Math.min(1,(y-2)/1.5));
      p.setX(i,x+(reduced?0:Math.sin(time*(2+weather.wind*2)-y*.8+z*1.7)*weather.gust*.22*free));
    }p.needsUpdate=true;s.object.geometry.computeVertexNormals();}
    rain.material.opacity=reduced?0:weather.storm*.45;rain.visible=weather.storm>.02&&!reduced;
    if(rain.visible)rainSeeds.forEach((s,i)=>{const y=((s.y-time*19)%35+35)%35,x=s.x+player.x,z=s.z+player.z;rainPositions.set([x,y,z,x-.4-weather.wind*.7,y+1.3,z-.3],i*6);});rainGeo.attributes.position.needsUpdate=true;
    wind.material.opacity=reduced?0:.06+weather.wind*.16;
    for(let i=0;i<90;i++){const x=((i*13.7+time*(2+weather.wind*9))%100)-50+player.x,z=((i*23.7)%85)-42+player.z,y=.8+(i%9)*.6;windPositions.set([x,y,z,x-1.2-weather.wind*2,y+.06,z-.5],i*6);}windGeo.attributes.position.needsUpdate=true;
    if(!reduced&&weather.storm>.65&&time-lastStrike>13+Math.sin(lastStrike)*4){lastStrike=time;flash=.28;thunderAt=time+1.7+Math.random()*1.5;
      const x=player.x+25+Math.random()*20,z=player.z-35;for(let i=0;i<24;i++)boltPos.set([x+Math.sin(i*8.2)*1.5,40-i*1.6,z+Math.cos(i*4)*.6],i*3);boltGeo.attributes.position.needsUpdate=true;
    }
    flash=Math.max(0,flash-dt);lightning.intensity=flash>0?flash*13:0;bolt.material.opacity=flash>0?Math.min(1,flash*6):0;
    if(time>thunderAt){audio.effect('thunder',.75);thunderAt=Infinity;}
    boat.updateMatrixWorld(true);let excess=0;
    if(state==='afloat')for(const [x,z]of [[-1,1.9],[1,1.9],[0,-2.9]]){const p=boat.localToWorld(new THREE.Vector3(x,.9,z));excess=Math.max(excess,waterHeight(p.x,p.z,time,pulses)-p.y);}
    deckVolume=state==='afloat'?deckFloodStep(deckVolume,excess,dt):0;
    sheetMat.opacity=Math.min(.72,deckVolume*.8);sheets.forEach((m,i)=>{m.visible=deckVolume>.01;m.position.y=.88+Math.min(.13,deckVolume*.1)+Math.sin(time*4+i)*Math.min(.02,deckVolume*.02);});
    if(!reduced&&deckVolume>.025&&time-lastDrain>.045){lastDrain=time;
      for(const side of [-1,1]){const d=drain[drainIndex++%drain.length];d.life=.8;d.p.copy(boat.localToWorld(new THREE.Vector3(side*1.23,.9,1.2+Math.sin(time*3)*1.1)));d.v.set(side*Math.cos(boat.rotation.y)*(.3+deckVolume),-.2,-side*Math.sin(boat.rotation.y)*(.3+deckVolume));}
    }
    drain.forEach((d,i)=>{d.life-=dt;if(d.life>0){d.v.y-=dt*9.8;d.p.addScaledVector(d.v,dt);if(d.p.y<waterHeight(d.p.x,d.p.z,time,pulses))d.life=0;}dummy.position.copy(d.p);dummy.scale.set(d.life>0?1:0,d.life>0?2.4:0,1);dummy.updateMatrix();drops.setMatrixAt(i,dummy.matrix);});drops.instanceMatrix.needsUpdate=true;
    clockLabel.textContent=`${String(Math.floor(weather.hour)).padStart(2,'0')}:${String(Math.floor(weather.hour%1*60)).padStart(2,'0')}`;weatherLabel.textContent=weather.label;windLabel.textContent=`WIND ${Math.round(5+weather.wind*30)} kn${deckVolume>.15?' · DECK AWASH':''}`;
    return weather;
  }
  return {update,resetDeck:()=>{deckVolume=0;drain.forEach(d=>d.life=0);}};
}








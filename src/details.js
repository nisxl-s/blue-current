import * as THREE from 'three';
import {createDolphin} from './dolphin.js';
import {dolphinObstacles,openDolphinPosition,advanceDolphin} from './dolphin-navigation.js';
import {createDolphinWater} from './dolphin-water.js';
import {createExplosions} from './explosions.js';
import {waterHeight,floatPose} from './marine.js';

const mat=(color,roughness=.7)=>new THREE.MeshStandardMaterial({color,roughness});
const navy=mat('#174a62'),cream=mat('#fff5d8'),wood=mat('#b97d43'),gold=mat('#dcad55',.35),steel=mat('#9ab3b0',.3),glass=mat('#2c7385',.2);
function add(parent,geo,material,x=0,y=0,z=0){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
const box=(p,w,h,d,m,x=0,y=0,z=0)=>add(p,new THREE.BoxGeometry(w,h,d),m,x,y,z);
const cyl=(p,r,h,m,x=0,y=0,z=0)=>add(p,new THREE.CylinderGeometry(r,r,h,12),m,x,y,z);
const ball=(p,r,m,x=0,y=0,z=0)=>add(p,new THREE.SphereGeometry(r,12,8),m,x,y,z);
function line(p,points,r=.025,m=steel){return add(p,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v))),24,r,5,false),m);}
function triangle(p,points,m){const geo=new THREE.BufferGeometry().setFromPoints(points.map(v=>new THREE.Vector3(...v)));geo.setIndex([0,1,2]);geo.computeVertexNormals();return add(p,geo,m);}
function label(text,bg='#f8edce',color='#194c5a',w=256,h=128){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,w,h);x.fillStyle=color;x.font=`600 ${Math.floor(h*.24)}px sans-serif`;x.textAlign='center';x.textBaseline='middle';text.split('\n').forEach((s,i,arr)=>x.fillText(s,w/2,h/2+(i-(arr.length-1)/2)*h*.3));const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshStandardMaterial({map:t,side:THREE.DoubleSide});}

export function createSailboat(scene){
  const boat=new THREE.Group();scene.add(boat);
  // Seven cross-sections form a tapered blue-water hull, rather than a box.
  const stations=[[-3.8,.025],[-3.2,.65],[-2.2,1.12],[-.5,1.3],[1.3,1.22],[2.5,1.02],[2.8,.9]];
  const positions=[],indices=[];
  for(const [z,w]of stations){for(const [x,y]of [[-w,.83],[-w*.96,.2],[-w*.62,-.35],[0,-.68],[w*.62,-.35],[w*.96,.2],[w,.83]])positions.push(x,y,z);}
  for(let j=0;j<stations.length-1;j++)for(let k=0;k<6;k++){const a=j*7+k,b=a+7;indices.push(a,b,a+1,a+1,b,b+1);}
  indices.push(42,43,44,42,44,45,42,45,46,42,46,47,42,47,48);
  const hullGeo=new THREE.BufferGeometry();hullGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));hullGeo.setIndex(indices);hullGeo.computeVertexNormals();
  const hull=add(boat,hullGeo,navy.clone());hull.material.side=THREE.DoubleSide;boat.userData.hull=hull;
  const outline=new THREE.Shape();outline.moveTo(0,3.8);stations.slice(1).forEach(([z,w])=>outline.lineTo(w,-z));stations.slice(1).reverse().forEach(([z,w])=>outline.lineTo(-w,-z));outline.closePath();
  const deck=add(boat,new THREE.ShapeGeometry(outline),wood,0,.84,0);deck.rotation.x=-Math.PI/2;
  for(const side of [-1,1]){
    line(boat,stations.map(([z,w])=>[side*w,.87,z]),.065,cream);
    line(boat,stations.map(([z,w])=>[side*w*.98,.35,z]),.04,gold);
    line(boat,stations.map(([z,w])=>[side*w,1.3,z]),.018,steel);
    for(const [z,w]of stations.slice(1))cyl(boat,.025,.45,steel,side*w,1.08,z);
    for(let i=0;i<3;i++){const f=add(boat,new THREE.CapsuleGeometry(.13,.3,4,8),cream,side*1.28,.6,-1+i*1.1);f.rotation.z=.15*side;}
  }
  for(let x=-.9;x<=.9;x+=.18)box(boat,.015,.012,4.8,mat('#8e643d'),x,.856,.15);
  box(boat,1.55,.65,2.7,cream,0,1.15,-.65);const roof=box(boat,1.62,.14,2.5,cream,0,1.53,-.65);roof.rotation.x=-.025;
  for(const side of [-1,1])for(let i=0;i<3;i++){const p=add(boat,new THREE.CircleGeometry(.16,16),glass,side*.784,1.23,-1.5+i*.7);p.rotation.y=side*Math.PI/2;const rim=add(boat,new THREE.TorusGeometry(.17,.025,5,16),gold,side*.8,1.23,-1.5+i*.7);rim.rotation.y=side*Math.PI/2;}
  box(boat,.5,.025,.6,glass,0,1.62,-1.25);box(boat,1.55,.07,.15,wood,0,1.18,1.8);box(boat,.25,.12,1.5,cream,-.8,1.05,1.5);box(boat,.25,.12,1.5,cream,.8,1.05,1.5);
  const wheel=add(boat,new THREE.TorusGeometry(.25,.035,6,20),gold,0,1.57,1.9);wheel.rotation.x=-.25;cyl(boat,.055,.7,steel,0,1.12,1.9);
  const mast=cyl(boat,.065,8.5,cream,0,4.9,-.9);cyl(boat,.095,.3,gold,0,1,-.9);
  const boom=cyl(boat,.045,3.55,wood,0,2.1,.7);boom.rotation.x=Math.PI/2;
  const sailMat=new THREE.MeshStandardMaterial({color:'#fff7df',roughness:.9,side:THREE.DoubleSide});
  function sail(points,billow){const [a,b,c]=points.map(v=>new THREE.Vector3(...v)),geo=new THREE.BufferGeometry(),p=[],uv=[];const n=15;
    const vertex=(u,v)=>{const pos=a.clone().multiplyScalar(1-u-v).addScaledVector(b,u).addScaledVector(c,v);pos.x+=Math.sin(u*Math.PI)*Math.sin(v*Math.PI)*billow;return pos;};
    for(let i=0;i<n;i++)for(let j=0;j<n-i;j++){const u=i/n,v=j/n;const pts=[vertex(u,v),vertex(u+1/n,v),vertex(u,v+1/n)];if(i+j<n-1)pts.push(vertex(u+1/n,v),vertex(u+1/n,v+1/n),vertex(u,v+1/n));pts.forEach(q=>p.push(q.x,q.y,q.z));}geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.computeVertexNormals();return add(boat,geo,sailMat);}
  const mainsail=sail([[.04,2.25,-.87],[.04,8.85,-.87],[.04,2.25,2.35]],.85);
  const jib=sail([[0,2,-3.45],[0,8.45,-.98],[0,2,-1.02]],-.5);
  for(let i=1;i<5;i++)line(boat,[[.03,2.25+i*1.2,-.87],[.12,2.25+i*1.2,2.35-i*.56]],.008,gold);
  line(boat,[[0,8.9,-.9],[0,.9,-3.6]],.014,steel);line(boat,[[0,8.9,-.9],[0,1,2.65]],.014,steel);
  for(const side of [-1,1])line(boat,[[0,8.6,-.9],[side*1.13,.9,.1]],.012,steel);
  const sailNumber=add(boat,new THREE.PlaneGeometry(.65,1),label('BC\n01','#fff5da','#154c60'),.16,5.2,-.25);sailNumber.rotation.y=Math.PI/2;
  const pennant=triangle(boat,[[0,8.9,-.9],[0,8.9,.2],[0,8.55,-.9]],new THREE.MeshStandardMaterial({color:'#eb8159',side:THREE.DoubleSide}));
  // Stern ladder, lifering, anchor, cleats and visible auxiliary outboard.
  box(boat,.45,.7,.5,navy,0,.35,3);cyl(boat,.06,.9,steel,0,-.3,3.1);box(boat,.48,.08,.12,steel,0,-.68,3.1);
  for(const x of [-.72,-.25])line(boat,[[x,1,2.8],[x,.1,3],[x,-.4,3]],.035,steel);for(let i=0;i<4;i++)box(boat,.5,.04,.04,wood,-.48,.8-i*.3,2.95);
  const lifering=add(boat,new THREE.TorusGeometry(.28,.085,8,24),mat('#ec7956'),1.29,1.14,1.65);lifering.rotation.y=Math.PI/2;
  for(const side of [-1,1])for(const z of [-2.5,2.4]){box(boat,.25,.045,.06,steel,side*.7,.95,z);cyl(boat,.03,.13,steel,side*.7,.92,z);}
  line(boat,[[.7,1,-2.9],[.85,.75,-3.5],[.85,.1,-3.5]],.035,steel);const anchor=add(boat,new THREE.TorusGeometry(.2,.035,5,12,Math.PI),steel,.85,.1,-3.5);anchor.rotation.x=Math.PI/2;
  const captain=new THREE.Group();captain.position.set(-.45,1.05,1.35);boat.add(captain);cyl(captain,.18,.55,mat('#d48358'),0,.35,0);ball(captain,.19,mat('#e9c3a0'),0,.8,0);cyl(captain,.24,.08,cream,0,.98,0);
  const name=add(boat,new THREE.PlaneGeometry(1.1,.27),label('SEA WREN','#fff3d5','#184a60'),0,.68,2.82);
  boat.userData.sails=[mainsail,jib,pennant];boat.userData.wheel=wheel;return boat;
}

export function createMarineDetails({scene,island,palm,dock,ring,mats,pulse,onSound,obstacles=[]}){
  const colliders=[],floaters=[],dolphins=[],shorelines=[],particles=[];
  const mooring={x:-6.8,z:10.2,heading:-Math.PI/2,radius:5};
  function collider(object,x,z,r,kind='wood',hp=50){const o={object,x,z,r,kind,hp,maxHp:hp,destroyed:false,lastHit:-20,base:object?.position.clone(),baseRotation:object?.rotation.clone()};colliders.push(o);return o;}
  function floater(object,offset=.25,length=1,width=1,free=false){const f={object,y:offset,length,width,free,baseX:object.position.x,baseZ:object.position.z,vx:0,vz:0,baseYaw:object.rotation.y};floaters.push(f);return f;}
  function torus(p,r,t,m,x,y,z){return add(p,new THREE.TorusGeometry(r,t,6,20),m,x,y,z);}
  function flower(p,x,z){cyl(p,.025,.4,mat('#4d8761'),x,1,z);for(let j=0;j<4;j++)ball(p,.09,j%2?mat('#ee8e78'):gold,x+Math.cos(j*1.57)*.1,1.25,z+Math.sin(j*1.57)*.1);}
  const home=island(-14,6,4.5);shorelines.push({x:-14,z:6,r:4.5});
  // Cottage with gabled tiled roof, chimney, shutters, porch, pergola and garden.
  const cottage=new THREE.Group();cottage.position.set(0,.75,-.5);home.add(cottage);
  box(cottage,3.4,2.6,3,mat('#f0c998'),0,1.3,0);box(cottage,3.5,.2,3.15,cream,0,.1,0);
  const roofMat=mat('#c46943');for(const side of [-1,1]){const panel=box(cottage,2.25,.18,3.65,roofMat,side*.85,3,0);panel.rotation.z=side*-.6;for(let i=0;i<8;i++){const tile=box(cottage,.05,.04,3.7,mat('#a85035'),side*(.15+i*.23),3.5-i*.15,0);}}
  triangle(cottage,[[-1.7,2.6,1.52],[1.7,2.6,1.52],[0,3.72,1.52]],mat('#e4b982'));box(cottage,.45,1.15,.45,mat('#e0c6a0'),1.1,3.5,-.6);
  for(const x of [-1,1]){box(cottage,.65,.8,.06,glass,x,1.6,1.54);box(cottage,.8,.1,.22,cream,x,1.11,1.56);for(const side of [-1,1])box(cottage,.21,.85,.1,mat('#57938c'),x+side*.45,1.6,1.57);box(cottage,.045,.8,.08,cream,x,1.6,1.59);box(cottage,.65,.045,.08,cream,x,1.6,1.59);}
  box(cottage,.65,1.7,.08,navy,0,.95,1.56);ball(cottage,.04,gold,.2,.9,1.65);box(cottage,3.6,.15,1.5,wood,0,.1,2.15);
  for(const x of [-1.6,1.6]){cyl(cottage,.055,2.5,cream,x,1.35,2.65);box(cottage,.15,.12,1.4,cream,x,2.6,2.1);}for(let i=0;i<9;i++)box(cottage,3.5,.06,.08,wood,0,2.65,1.6+i*.14);
  palm(home,-2.7,-1,1.2,1);palm(home,2.7,-2,.9,.4);for(let i=0;i<7;i++)flower(home,-3+i*.65,2.7);
  for(let i=0;i<7;i++){const stone=add(home,new THREE.CylinderGeometry(.35,.4,.08,6),mat('#c8bc98'),2+i*.32,.81,1.5);}
  const pier=dock(home,5.2,0,7.7,Math.PI/2);pier.position.y=.6;
  const pontoon=new THREE.Group();pontoon.position.set(-6.6,.35,6);scene.add(pontoon);box(pontoon,3.6,.28,3,wood);for(let i=0;i<12;i++)box(pontoon,.25,.04,3,mat(i%2?'#cc995b':'#b58246'),-1.62+i*.29,.16,0);for(const x of [-1.5,1.5])for(const z of [-1.2,1.2])cyl(pontoon,.12,.9,cream,x,.5,z);floater(pontoon,.35,1.5,1.6);
  for(let i=0;i<3;i++){const f=torus(pontoon,.22,.08,navy,-1+i,0,1.58);}
  const sign=add(home,new THREE.PlaneGeometry(2.5,.9),label('THE TIDE HOUSE'),3.1,2.6,.8);sign.rotation.y=.5;
  for(let i=0;i<6;i++)collider(pier,-13+i*1.4,6,.7,'dock',Infinity);collider(pontoon,-6.6,6,2,'dock',Infinity);
  const moorRing=ring(scene,2.1,'#fbf0be',mooring.x,.03,mooring.z);floater(moorRing,.025,1,1);
  const moorSign=add(scene,new THREE.PlaneGeometry(2.6,.8),label('SLOW / MOOR HERE','#264f5e','#fff2ce'),-6.6,1.7,7.8);collider(null,-6.6,7.8,.1,'dock',Infinity);

  // Small props, stronger visual identities, and shore interactions on the original islands.
  for(const [x,z,r]of [[-24,-27,6.2],[24,-10,5.7],[37,29,6.2],[-7,-53,3.3],[52,-35,4.4],[60,7,3],[-38,49,3.5],[-52,-35,2.8],[-62,35,3.6]])shorelines.push({x,z,r});
  for(const [x,z,r]of [[-24,-27,6.2],[24,-10,5.7],[37,29,6.2]]){
    for(let i=0;i<12;i++){const a=i*2.4;const shrub=ball(scene,.35+(i%3)*.12,mat(i%2?'#58895a':'#79a765'),x+Math.cos(a)*r*.72,1,z+Math.sin(a)*r*.72);shrub.scale.y=.7;}
    for(let i=0;i<10;i++){const a=i*2.17;const shell=ball(scene,.1,mat(i%2?'#ead7a2':'#f9ebcf'),x+Math.cos(a)*r*.87,.85,z+Math.sin(a)*r*.87);shell.scale.y=.35;}
    const chair=new THREE.Group();chair.position.set(x+2,.9,z+2);scene.add(chair);box(chair,.8,.1,1.3,wood,0,.45,0);box(chair,.8,1,.1,mat('#dbb46e'),0,.85,-.6).rotation.x=-.2;for(const a of [-.3,.3])for(const b of [-.4,.4])cyl(chair,.04,.5,wood,a,.15,b);
    const post=cyl(scene,.06,3,wood,x+3.4,2.4,z+1.2);const umbrella=add(scene,new THREE.ConeGeometry(1.3,.5,8),mat('#e6a765'),x+3.4,3.9,z+1.2);
  }
  // Visible nav hazards. Only striped fuel drums explode; crates splinter.
  for(const [x,z]of [[8,-6],[14,-3],[18,8],[-16,23]]){
    const g=new THREE.Group();g.position.set(x,.15,z);scene.add(g);cyl(g,.62,1.4,mat('#b85639'),0,.4,0);for(const y of [-.1,.8])cyl(g,.65,.12,navy,0,y,0);const band=cyl(g,.635,.32,mat('#e8bf54'),0,.4,0);const warning=add(g,new THREE.PlaneGeometry(.6,.45),label('FUEL','#e8bf54','#5a3826'),0,.45,.64);cyl(g,.1,.06,steel,.25,1.12,0);const f=floater(g,.12,.6,.6,true);const c=collider(g,x,z,.8,'fuel',14);c.floater=f;f.collider=c;
  }
  for(const [x,z]of [[-7,-8],[8,17],[21,18]]){const g=new THREE.Group();g.position.set(x,.2,z);scene.add(g);box(g,1.6,1.25,1.5,wood,0,.4,0);for(const y of [-.15,.9])for(const side of [-1,1])box(g,1.7,.12,.12,mat('#715237'),0,y,side*.78);for(const side of [-1,1])box(g,.12,1.4,1.6,mat('#715237'),side*.78,.4,0);const f=floater(g,.2,.8,.8,true);const c=collider(g,x,z,1.2,'wood',28);c.floater=f;f.collider=c;}

  // A reusable particle pool keeps collision effects bounded.
  const explosions=createExplosions(scene);
  const dolphinWater=createDolphinWater(scene,pulse,onSound);
  const particleGeo=new THREE.IcosahedronGeometry(1,0);
  for(let i=0;i<160;i++){const p=add(scene,particleGeo,new THREE.MeshBasicMaterial({color:'#fff3d3',transparent:true,opacity:0,depthWrite:false}));p.visible=false;particles.push({object:p,life:0,maxLife:1,v:new THREE.Vector3(),kind:'splash'});}
  function burst(x,y,z,kind='splash',count=20){let emitted=0;for(const p of particles){if(p.life>0)continue;const a=Math.random()*Math.PI*2,s=kind==='explosion'?3+Math.random()*7:1+Math.random()*3;p.life=p.maxLife=kind==='explosion'?1.2+Math.random():.6+Math.random();p.kind=kind;p.v.set(Math.cos(a)*s,2+Math.random()*(kind==='explosion'?7:3),Math.sin(a)*s);p.object.position.set(x,y,z);p.object.scale.setScalar(kind==='explosion'?.25+Math.random()*.55:.08+Math.random()*.14);p.object.material.color.set(kind==='explosion'?(emitted%3?'#f6a340':'#4b4d47'):kind==='wood'?'#a37b50':'#def6e8');p.object.material.opacity=1;p.object.visible=true;if(++emitted>=count)break;}}
  function breakObject(c,force=1){
    if(c.destroyed)return;c.destroyed=true;c.object.visible=false;
    const y=c.object.position.y+.5;
    if(c.kind==='fuel'){explosions.trigger(c.x,y,c.z);burst(c.x,y,c.z,'splash',26);}
    else burst(c.x,y,c.z,'wood',24);
    pulse(c.x,c.z,c.kind==='fuel'?.8:.35);onSound(c.kind==='fuel'?'explosion':'impact',force);
  }  function impact(c,damage){if(c.destroyed||!c.object)return;if(Number.isFinite(c.hp)){c.hp-=damage;if(c.hp<=0){breakObject(c,1);return;}}c.object.traverse(o=>{if(o.isMesh&&o.material.isMeshStandardMaterial){if(!o.userData.impactMaterial){o.material=o.material.clone();o.userData.impactMaterial=true;}o.material.emissive.set('#a85229');o.material.emissiveIntensity=.6;}});c.flash=.4;}
  for(let i=0;i<6;i++){
    const dolphin=createDolphin();scene.add(dolphin.object);
    dolphin.object.scale.setScalar(1-(i%2)*.12);
    dolphins.push({...dolphin,phase:i*1.1,lastSplash:-10});
  }  function update(dt,t,pulses,reduced,player,time){
    for(const f of floaters){if(f.collider?.destroyed)continue;if(f.free&&!reduced){const h=waterHeight(f.object.position.x,f.object.position.z,t,pulses),dx=waterHeight(f.object.position.x+.4,f.object.position.z,t,pulses)-h,dz=waterHeight(f.object.position.x,f.object.position.z+.4,t,pulses)-h;f.vx+=(dx*-.35-f.vx*.9)*dt;f.vz+=(dz*-.35-f.vz*.9)*dt;f.object.position.x+=f.vx*dt;f.object.position.z+=f.vz*dt;f.object.position.x=THREE.MathUtils.clamp(f.object.position.x,f.baseX-3,f.baseX+3);f.object.position.z=THREE.MathUtils.clamp(f.object.position.z,f.baseZ-3,f.baseZ+3);}
      const pose=floatPose(f.object.position.x,f.object.position.z,f.baseYaw,f.length,f.width,t,pulses);f.object.position.y=THREE.MathUtils.lerp(f.object.position.y,pose.height+f.y,1-Math.exp(-dt*7));f.object.rotation.set(pose.pitch,f.baseYaw,pose.roll);if(f.collider){f.collider.x=f.object.position.x;f.collider.z=f.object.position.z;}}
    for(const c of colliders){if(c.flash>0){c.flash-=dt;c.object?.traverse(o=>{if(o.isMesh&&o.material.emissive)o.material.emissiveIntensity=Math.max(0,c.flash)*1.5;});}}
    for(const p of particles){if(p.life<=0)continue;p.life-=dt;p.v.y-=dt*9;p.object.position.addScaledVector(p.v,dt);p.object.rotation.x+=dt*2;p.object.rotation.z+=dt*3;p.object.material.opacity=Math.max(0,p.life/p.maxLife);if(p.object.position.y<waterHeight(p.object.position.x,p.object.position.z,t,pulses)&&p.v.y<0){p.life=0;}if(p.life<=0)p.object.visible=false;}
    explosions.update(dt,t,pulses,reduced);
    const dolphinSolids=dolphinObstacles([...obstacles,...colliders],player);
    for(let i=0;i<dolphins.length;i++){
      if(dolphins[i].guidance)continue;
      const d=dolphins[i],cycle=(time+d.phase)%38;
      const a=(time+d.phase)*.19+i*.08;
      const centers=[[-42,24],[44,31],[5,-42]],center=centers[Math.floor(i/2)];
      const target={x:center[0]+Math.cos(a)*7+(i%2)*1.8,z:center[1]+Math.sin(a)*6+(i%2)*1.4};
      if(!d.navigation)d.navigation=openDolphinPosition(target.x,target.z,dolphinSolids);
      if(!d.navigation){d.object.visible=false;continue;}
      const next=advanceDolphin(d.navigation,target,dt,dolphinSolids);
      d.navigation=next;const {x,z}=next;
      const jumpPhase=(time+d.phase)%11;
      const u=(jumpPhase-3)/1.65;
      const jumpCycle=Math.floor((time+d.phase)/11);
      if(d.jumpCycle!==jumpCycle){d.jumpCycle=jumpCycle;d.jumpAllowed=null;}
      if(u>0&&d.jumpAllowed===null)d.jumpAllowed=dolphinSolids.every(o=>Math.hypot(x-o.x,z-o.z)>o.r+3);
      const clear=dolphinSolids.every(o=>Math.hypot(x-o.x,z-o.z)>o.r);
      const breaching=!reduced&&d.jumpAllowed&&clear&&u>0&&u<1;
      const jump=breaching?3.1*4*u*(1-u):0;
      const stroke=reduced?0:Math.sin(time*5.4+d.phase);
      const depth=.75+.4*Math.sin(time*.55+d.phase);
      d.object.visible=true;const targetY=waterHeight(x,z,t,pulses)-depth+jump;
      if(d.swimY===undefined)d.swimY=targetY;
      d.swimY+=(targetY-d.swimY)*(1-Math.exp(-dt*(breaching?10:3)));d.object.position.set(x,d.swimY,z);
      const turn=Math.atan2(Math.sin(next.heading-d.object.rotation.y),Math.cos(next.heading-d.object.rotation.y));
      d.object.rotation.y+=turn*(1-Math.exp(-dt*3));
      const pitch=breaching?Math.atan2(12.4*(1-2*u)/1.65,3.5):stroke*.055;
      d.object.rotation.x+=(pitch-d.object.rotation.x)*(1-Math.exp(-dt*5));
      d.object.rotation.z=reduced?0:.09*Math.sin(a+.4)+stroke*.025;
      d.tail.rotation.x=stroke*.33;d.tail.position.y=stroke*.07;
      d.swim(time+d.phase/5.4,reduced);
      d.flippers.forEach((f,j)=>f.rotation.z=(j?1:-1)*(.12+stroke*.08));
      dolphinWater.dolphin(i,{x,z,heading:d.object.rotation.y,clearance:d.swimY-waterHeight(x,z,t,pulses)+.3,depth:waterHeight(x,z,t,pulses)-d.swimY,distance:d.object.position.distanceTo(player)},dt,t,pulses,reduced);
    }
    dolphinWater.update(dt,t,pulses,reduced);
  }
  function reset(){dolphins.forEach(d=>{d.navigation=null;d.swimY=undefined;});dolphinWater.reset();for(const c of colliders){c.destroyed=false;c.hp=c.maxHp;c.lastHit=-20;c.flash=0;if(c.object){c.object.visible=true;if(c.base)c.object.position.copy(c.base);if(c.baseRotation)c.object.rotation.copy(c.baseRotation);c.object.traverse(o=>{if(o.material?.emissive)o.material.emissiveIntensity=0;});}if(c.floater){c.x=c.floater.baseX;c.z=c.floater.baseZ;c.floater.vx=c.floater.vz=0;}}particles.forEach(p=>{p.life=0;p.object.visible=false;});explosions.reset();}
  return {colliders,floaters,dolphins,shorelines,mooring,update,reset,impact,breakObject,burst,explode:explosions.trigger};
}








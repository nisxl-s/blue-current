import * as THREE from 'three';
import {waterHeight} from './marine.js';

export function createDolphinWater(scene,pulse,onSound){
  const foam=new THREE.InstancedMesh(new THREE.CircleGeometry(1,7),new THREE.MeshBasicMaterial({color:'#e1f7e7',transparent:true,opacity:.68,depthWrite:false}),240),
    spray=new THREE.InstancedMesh(new THREE.SphereGeometry(.055,6,4),new THREE.MeshBasicMaterial({color:'#e8fff0',transparent:true,opacity:.85}),240);
  foam.instanceMatrix.setUsage(THREE.DynamicDrawUsage);spray.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  foam.frustumCulled=spray.frustumCulled=false;scene.add(foam,spray);
  const trails=Array.from({length:240},()=>({age:10})),drops=Array.from({length:240},()=>({age:10})),states=new Map();
  let fi=0,si=0;const dummy=new THREE.Object3D(),color=new THREE.Color(),deepFoam=new THREE.Color('#64bcb2');
  function mark(x,z,heading,side,life=2.5,size=.12){
    Object.assign(trails[fi++%trails.length],{x,z,heading,side,life,size,age:0});
  }
  function splash(x,z,heading,time,pulses,landing){
    const y=waterHeight(x,z,time,pulses),n=landing?44:22;
    for(let i=0;i<n;i++){
      const a=i/n*Math.PI*2,s=.7+Math.random()*(landing?2.5:1.3);
      Object.assign(drops[si++%drops.length],{x,y:y+.08,z,vx:Math.cos(a)*s-Math.sin(heading)*.5,vz:Math.sin(a)*s-Math.cos(heading)*.5,vy:1.4+Math.random()*(landing?3.5:2.5),age:0,life:1.5});
    }
    for(let i=0;i<26;i++){const a=i/26*Math.PI*2;mark(x+Math.cos(a)*.2,z+Math.sin(a)*.2,a,1,2.8,.14);}
    pulse(x,z,landing?.32:.17);
  }
  function dolphin(id,{x,z,heading,clearance,depth,distance},dt,time,pulses,reduced){
    const state=states.get(id)??{clearance,lastWake:-10,lastMist:-10};states.set(id,state);
    if(!reduced){
      const leaving=state.clearance<=0&&clearance>0,landing=state.clearance>0&&clearance<=0;
      if(leaving||landing){splash(x,z,heading,time,pulses,landing);if(distance<28){onSound('splash',landing?.45:.2);if(leaving)onSound('dolphin',Math.max(.15,1-distance/35));}}
      if(clearance<.25&&depth<1.2&&time-state.lastWake>.11){
        state.lastWake=time;
        for(const side of [-1,1]){
          const bx=x+Math.sin(heading)*1.15,bz=z+Math.cos(heading)*1.15;
          mark(bx+Math.cos(heading)*side*.22,bz-Math.sin(heading)*side*.22,heading,side);
        }
        if(depth<.85&&time-state.lastMist>.32){state.lastMist=time;
          for(const side of [-1,1])Object.assign(drops[si++%drops.length],{x:x+Math.cos(heading)*side*.3,y:waterHeight(x,z,time,pulses)+.08,z,vx:Math.cos(heading)*side*.6,vz:-Math.sin(heading)*side*.6,vy:.7,age:0,life:.5});
        }
      }
    }
    state.clearance=clearance;
  }
  function update(dt,time,pulses,reduced){
    trails.forEach((p,i)=>{
      p.age+=dt;const live=p.age<p.life&&!reduced;
      if(live){const drift=p.age*.4;p.x+=Math.cos(p.heading)*p.side*dt*.4;p.z-=Math.sin(p.heading)*p.side*dt*.4;
        dummy.position.set(p.x,waterHeight(p.x,p.z,time,pulses)+.055,p.z);dummy.rotation.set(-Math.PI/2,0,-p.heading+p.side*.35);
        const fade=1-p.age/p.life;dummy.scale.set(p.size*(1+drift)*fade,p.size*2.6*(1+drift)*fade,1);
        color.set('#d8f3e2').lerp(deepFoam,1-fade);foam.setColorAt(i,color);
      }else dummy.scale.setScalar(0);
      dummy.updateMatrix();foam.setMatrixAt(i,dummy.matrix);
    });
    drops.forEach((p,i)=>{
      p.age+=dt;let live=p.age<p.life&&!reduced;
      if(live){p.vy-=dt*9.8;p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=p.vy*dt;
        if(p.y<waterHeight(p.x,p.z,time,pulses)){p.age=p.life;live=false;}
      }
      dummy.position.set(p.x??0,p.y??0,p.z??0);dummy.rotation.set(0,0,0);dummy.scale.setScalar(live?Math.max(.2,1-p.age/p.life):0);dummy.updateMatrix();spray.setMatrixAt(i,dummy.matrix);
    });
    foam.instanceMatrix.needsUpdate=spray.instanceMatrix.needsUpdate=true;if(foam.instanceColor)foam.instanceColor.needsUpdate=true;
  }
  function reset(){states.clear();trails.forEach(p=>p.age=10);drops.forEach(p=>p.age=10);update(0,0,[],true);}
  reset();return {dolphin,update,reset,trails,drops,foam,spray};
}



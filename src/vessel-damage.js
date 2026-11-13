import * as THREE from 'three';
import {waterHeight,floatPose} from './marine.js';

export function sinkingPose(seconds){
  const flood=THREE.MathUtils.smoothstep(seconds,0,7);
  const plunge=THREE.MathUtils.smoothstep(seconds,7,18);
  return {depth:.7*flood+13*plunge,pitch:-.09*flood-.95*plunge,
    roll:.48*flood+.65*Math.sin(plunge*Math.PI/2),done:seconds>=18};
}

export function createVesselDamage(boat,scene){
  const pieces=[],scars=[];
  const hull=boat.userData.hull.geometry,originalHull=hull.attributes.position.array.slice();
  let nextBubble=0;
  const candidates=boat.children.filter(o=>o.isMesh&&o!==boat.userData.hull&&o!==boat.userData.wheel
    &&o.position.y<2&&o.geometry.type!=='ShapeGeometry'&&o.geometry.type!=='PlaneGeometry');
  // Outer fittings, fenders, rail sections and deck trim are actual vessel meshes.
  candidates.sort((a,b)=>Math.abs(b.position.x)-Math.abs(a.position.x));
  const selected=candidates.filter((o,i)=>i%3===0).slice(0,18);
  selected.forEach((o,i)=>pieces.push({object:o,position:o.position.clone(),quaternion:o.quaternion.clone(),
    threshold:92-i*5,detached:false,age:0,velocity:new THREE.Vector3(),spin:new THREE.Vector3(),buoyant:o.material.metalness<.2}));
  for(let i=0;i<8;i++){
    const side=i%2?1:-1;
    const geo=new THREE.CircleGeometry(.23+(i%3)*.07,7);
    const scar=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:'#172e32',roughness:1,side:THREE.DoubleSide}));
    scar.position.set(side*(i<4?1.25:1.05),.42,-1.2+Math.floor(i/2)*.9);
    scar.rotation.y=side*Math.PI/2;scar.rotation.z=i*.8;scar.scale.set(1,.35,1);scar.visible=false;boat.add(scar);scars.push(scar);
  }
  const bubbles=new THREE.InstancedMesh(new THREE.SphereGeometry(.055,6,4),new THREE.MeshBasicMaterial({color:'#c8e8df',transparent:true,opacity:.65}),32);
  bubbles.frustumCulled=false;scene.add(bubbles);const dummy=new THREE.Object3D();
  const bubbleState=Array.from({length:32},()=>({age:10,x:0,y:0,z:0}));let cursor=0;
  function repair(){
    for(const p of pieces){if(!p.detached)continue;boat.add(p.object);p.object.position.copy(p.position);p.object.quaternion.copy(p.quaternion);p.object.visible=true;p.detached=false;p.age=0;}
    scars.forEach(s=>s.visible=false);bubbleState.forEach(b=>b.age=10);
    hull.attributes.position.array.set(originalHull);hull.attributes.position.needsUpdate=true;hull.computeVertexNormals();
  }
  function hit(health,heading,speed){
    boat.updateMatrixWorld(true);
    for(const p of pieces){if(p.detached||health>p.threshold)continue;
      scene.attach(p.object);p.detached=true;p.age=0;
      const side=Math.sign(p.position.x)||1;
      p.velocity.set(Math.cos(heading)*side*(1.5+Math.random())-Math.sin(heading)*speed*.3,1.8+Math.random()*1.5,-Math.sin(heading)*side*2-Math.cos(heading)*speed*.3);
      p.spin.set(Math.random()*2-1,Math.random()*2-1,side*2);
    }
    scars.forEach((s,i)=>s.visible=health<85-i*10);
    const pos=hull.attributes.position,severity=(100-health)/100;
    for(let i=0;i<pos.count;i++){
      const x=originalHull[i*3],y=originalHull[i*3+1],z=originalHull[i*3+2];
      const dent=severity*.27*Math.exp(-((z-.2)**2)/1.6)*Math.max(0,x);
      pos.setXYZ(i,x-dent,y-severity*.09*Math.sin(z*5+i)*Math.abs(x),z);
    }
    pos.needsUpdate=true;hull.computeVertexNormals();
  }
  function update(dt,time,pulses,health,state,sinking,burst){
    for(const p of pieces){if(!p.detached||!p.object.visible)continue;p.age+=dt;
      const o=p.object,h=waterHeight(o.position.x,o.position.z,time,pulses);
      p.velocity.y-=9.8*dt;o.position.addScaledVector(p.velocity,dt);
      o.rotation.x+=p.spin.x*dt;o.rotation.y+=p.spin.y*dt;o.rotation.z+=p.spin.z*dt;
      if(o.position.y<h&&p.velocity.y<0){
        if(p.age<2)burst?.(o.position.x,h,o.position.z,'splash',3);
        if(p.buoyant){o.position.y=h+.035;p.velocity.y=0;p.velocity.multiplyScalar(Math.exp(-dt*2));
          const pose=floatPose(o.position.x,o.position.z,o.rotation.y,.3,.2,time,pulses);
          o.rotation.x=THREE.MathUtils.lerp(o.rotation.x,pose.pitch,dt*3);o.rotation.z=THREE.MathUtils.lerp(o.rotation.z,pose.roll,dt*3);
        }else p.velocity.multiplyScalar(Math.exp(-dt*3));
      }
      if(p.age>65||o.position.y<-16)o.visible=false;
    }
    if(state==='moored'&&health>=100)repair();
    if(state==='sinking'&&time>nextBubble){nextBubble=time+.13;
      const b=bubbleState[cursor++%bubbleState.length];const v=boat.localToWorld(new THREE.Vector3(.8,.25,1));
      Object.assign(b,{age:0,x:v.x,y:v.y,z:v.z});
      if(sinking<12&&Math.random()<dt*5)burst?.(boat.position.x,waterHeight(boat.position.x,boat.position.z,time,pulses),boat.position.z,'splash',3);
    }
    bubbleState.forEach((b,i)=>{b.age+=dt;b.y+=dt*.8;const h=waterHeight(b.x,b.z,time,pulses);dummy.position.set(b.x+Math.sin(time*3+i)*.08,b.y,b.z);dummy.scale.setScalar(b.age<5&&b.y<h?1+b.age*.1:0);dummy.updateMatrix();bubbles.setMatrixAt(i,dummy.matrix);});bubbles.instanceMatrix.needsUpdate=true;
  }
  return {hit,update,reset:repair,pieces};
}

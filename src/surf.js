import * as THREE from 'three';
import {waterHeight,tideLevel,waveDirection} from './marine.js';

// Crest contacts create localized spray and lingering foam, not looping shoreline rings.
export function createSurf({scene,obstacles,marine,boat,pulse,onSound,onHullHit=()=>{}}){
  const samples=[],spray=[],foam=[];
  let cursor=0,lastSound=-10,lastReflection=-10,hitCount=0;
  const direction=new THREE.Vector2(.923,.385),tmp=new THREE.Object3D(),point=new THREE.Vector3();
  function contact(x,z,nx,nz,kind,body=null,ox=0,oz=0){samples.push({x,z,nx,nz,kind,body,ox,oz,lastHeight:null,lastTime:0,lastHit:-10});}
  for(const o of obstacles){
    if(o.kind==='island'){
      for(let i=0;i<28;i++){const a=i/28*Math.PI*2,nx=Math.cos(a),nz=Math.sin(a);contact(o.x+nx*o.r*1.075,o.z+nz*o.r*1.075,nx,nz,'shore');}
    }else if(o.kind==='rock'){
      for(let i=0;i<6;i++){const a=i/6*Math.PI*2;contact(o.x+Math.cos(a)*o.r,o.z+Math.sin(a)*o.r,Math.cos(a),Math.sin(a),'rock');}
    }else if(o.kind==='dock'){
      for(const side of [-1,1])contact(o.x,o.z+side*.7,0,side,'pier');
    }
  }
  for(const c of marine.colliders){if(!c.object||!c.floater)continue;for(let i=0;i<4;i++){const a=i*Math.PI/2;contact(0,0,Math.cos(a),Math.sin(a),'floating',c.object,Math.cos(a)*c.r,Math.sin(a)*c.r);}}
  for(const [x,z]of [[-1.2,-1.5],[1.2,-1.5],[-1.25,.5],[1.25,.5],[0,-3.6],[0,2.8]])contact(0,0,Math.sign(x),Math.sign(z),'hull',boat,x,z);

  const vertex=`attribute float aLife;attribute float aSeed;varying float vLife;varying float vSeed;varying vec2 vUv;void main(){vLife=aLife;vSeed=aSeed;vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`;
  const sprayGeo=new THREE.SphereGeometry(.1,5,4),foamGeo=new THREE.PlaneGeometry(1,1);
  function pool(geometry,count,isFoam){
    const life=new THREE.InstancedBufferAttribute(new Float32Array(count),1),seed=new THREE.InstancedBufferAttribute(Float32Array.from({length:count},(_,i)=>i*.731),1);geometry.setAttribute('aLife',life);geometry.setAttribute('aSeed',seed);
    const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,vertexShader:vertex,fragmentShader:isFoam?`varying float vLife;varying float vSeed;varying vec2 vUv;void main(){vec2 p=(vUv-.5)*2.;float n=sin(p.x*13.+vSeed)*sin(p.y*17.-vSeed)+.5*sin(p.x*28.+p.y*21.);float edge=1.-smoothstep(.45,.98,length(p)+n*.14);float bubbles=smoothstep(-.9,.4,n);gl_FragColor=vec4(.85,.95,.91,edge*bubbles*vLife*.72);}`:`varying float vLife;varying float vSeed;varying vec2 vUv;void main(){gl_FragColor=vec4(.91,.98,.96,vLife*.7);}`});
    const mesh=new THREE.InstancedMesh(geometry,material,count);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;mesh.renderOrder=isFoam?1:2;scene.add(mesh);tmp.scale.setScalar(0);tmp.updateMatrix();for(let i=0;i<count;i++)mesh.setMatrixAt(i,tmp.matrix);return {mesh,life};
  }
  const drops=pool(sprayGeo,480,false),patches=pool(foamGeo,140,true);
  for(let i=0;i<480;i++)spray.push({life:0,max:1,x:0,y:0,z:0,vx:0,vy:0,vz:0,size:1});
  for(let i=0;i<140;i++)foam.push({life:0,max:1,x:0,z:0,vx:0,vz:0,size:1,angle:0});
  function emit(s,h,energy){
    let count=0;const amount=s.kind==='shore'?10:s.kind==='hull'?7:6;
    for(const p of spray){if(p.life>0)continue;p.life=p.max=.5+Math.random()*.65;p.x=s.x+(Math.random()-.5)*.5;p.y=h+.1;p.z=s.z+(Math.random()-.5)*.5;
      p.vx=s.nx*(.4+energy*.9)+(Math.random()-.5)*1.6;p.vz=s.nz*(.4+energy*.9)+(Math.random()-.5)*1.6;p.vy=1.6+energy*2.4+Math.random()*1.5;p.size=.6+energy*.45;if(++count>=amount)break;}
    const f=foam.find(p=>p.life<=0);if(f){f.life=f.max=2.8+Math.random()*1.5;f.x=s.x;f.z=s.z;f.vx=s.nx*.35-direction.x*.18;f.vz=s.nz*.35-direction.y*.18;f.size=s.kind==='shore'?1.7:1.1;f.angle=Math.random()*Math.PI;}
  }
  function update(dt,t,pulses,player,reduced){
    const swell=waveDirection();direction.set(swell.x,swell.z);
    if(!reduced){
      // Spread contact sampling over frames. Each sample retains its own previous height/time.
      const budget=48;
      for(let j=0;j<budget;j++){
        const s=samples[cursor++%samples.length];
        if(s.body){if(!s.body.visible)continue;point.set(s.ox,0,s.oz);s.body.localToWorld(point);s.x=point.x;s.z=point.z;const a=s.body.rotation.y;s.nx=Math.cos(a)*Math.sign(s.ox)+Math.sin(a)*Math.sign(s.oz);s.nz=-Math.sin(a)*Math.sign(s.ox)+Math.cos(a)*Math.sign(s.oz);const n=Math.hypot(s.nx,s.nz)||1;s.nx/=n;s.nz/=n;}
        if(Math.hypot(s.x-player.x,s.z-player.z)>52)continue;
        const h=waterHeight(s.x,s.z,t,pulses),level=tideLevel(t),previous=s.lastHeight,delta=t-s.lastTime;
        const rise=previous===null||delta<.001?0:(h-previous)/delta;
        const facing=Math.max(.2,s.nx*direction.x+s.nz*direction.y);
        const threshold=level+(s.kind==='shore'?.12:s.kind==='hull'?.08:.04);
        if(previous!==null&&previous<threshold&&h>=threshold&&rise>.22&&t-s.lastHit>1.35&&facing>.23){
          const energy=Math.min(1.6,rise*1.1)*facing;s.lastHit=t;hitCount++;emit(s,h,energy);
          if(s.kind==='hull')onHullHit(-direction.x,-direction.y,energy);
          if(s.kind==='floating'){const f=marine.floaters?.find(f=>f.object===s.body&&f.free);if(f){f.vx-=direction.x*energy*.45;f.vz-=direction.y*energy*.45;}}
          const distance=Math.hypot(s.x-player.x,s.z-player.z);
          if(t-lastReflection>.8&&distance<26){pulse(s.x+s.nx*.4,s.z+s.nz*.4,.16+energy*.1);lastReflection=t;}
          if(t-lastSound>1.4&&distance<25){onSound('splash',Math.min(.5,.14+energy*.2)/(1+distance*.04));lastSound=t;}
        }
        s.lastHeight=h;s.lastTime=t;
      }
    }
    for(let i=0;i<spray.length;i++){
      const p=spray[i];if(p.life>0){p.life-=dt;p.vy-=dt*7.5;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
        if(p.vy<0&&p.y<waterHeight(p.x,p.z,t,pulses)){p.life=0;}
        tmp.position.set(p.x,p.y,p.z);tmp.rotation.set(0,0,0);tmp.scale.set(p.size*.55,p.size*(1+Math.max(0,p.vy)*.15),p.size*.55);drops.life.setX(i,Math.max(0,p.life/p.max));
      }else{tmp.scale.setScalar(0);drops.life.setX(i,0);}tmp.updateMatrix();drops.mesh.setMatrixAt(i,tmp.matrix);
    }
    for(let i=0;i<foam.length;i++){
      const p=foam[i];if(p.life>0){p.life-=dt;p.x+=p.vx*dt;p.z+=p.vz*dt;tmp.position.set(p.x,waterHeight(p.x,p.z,t,pulses)+.035,p.z);tmp.rotation.set(-Math.PI/2,0,p.angle);const size=p.size*(1+(1-p.life/p.max)*1.4);tmp.scale.set(size,size,1);patches.life.setX(i,Math.max(0,p.life/p.max));}
      else{tmp.scale.setScalar(0);patches.life.setX(i,0);}tmp.updateMatrix();patches.mesh.setMatrixAt(i,tmp.matrix);
    }
    drops.mesh.instanceMatrix.needsUpdate=true;patches.mesh.instanceMatrix.needsUpdate=true;drops.life.needsUpdate=true;patches.life.needsUpdate=true;
  }
  function reset(){cursor=0;lastSound=lastReflection=-10;hitCount=0;samples.forEach(s=>{s.lastHeight=null;s.lastHit=-10;s.lastTime=0;});spray.forEach(p=>p.life=0);foam.forEach(p=>p.life=0);}
  return {update,reset,get hitCount(){return hitCount;}};
}

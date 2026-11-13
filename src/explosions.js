import * as THREE from 'three';
import {waterHeight} from './marine.js';

export function plumeTexture(){
  const size=64,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=(x-31.5)/31.5,v=(y-31.5)/31.5,r=Math.hypot(u,v);
    const angle=Math.atan2(v,u),edge=.86+.08*Math.sin(angle*3)+.06*Math.cos(angle*5);
    const noise=.72+.15*Math.sin(x*.37+y*.21)*Math.cos(y*.29-x*.17)+.09*Math.cos(y*.9-x*.4);
    const k=(y*size+x)*4;data[k]=data[k+1]=data[k+2]=255;data[k+3]=Math.max(0,Math.pow(Math.max(0,1-r/edge),1.25)*noise)*255;
  }
  const tex=new THREE.DataTexture(data,size,size);tex.needsUpdate=true;return tex;
}
export function createExplosions(scene){
  const texture=plumeTexture(),effects=[];
  const dummy=new THREE.Object3D(),tint=new THREE.Color();
  function billboards(count,additive){
    const geo=new THREE.PlaneGeometry(1,1);geo.setAttribute('aOpacity',new THREE.InstancedBufferAttribute(new Float32Array(count),1));
    const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending,uniforms:{map:{value:texture}},
      vertexShader:'attribute float aOpacity;varying vec2 vUv;varying float vOpacity;varying vec3 vColor;void main(){vUv=uv;vOpacity=aOpacity;vColor=instanceColor;vec4 center=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);center.xy+=position.xy*vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz));gl_Position=projectionMatrix*center;}',
      fragmentShader:'uniform sampler2D map;varying vec2 vUv;varying float vOpacity;varying vec3 vColor;void main(){float a=texture2D(map,vUv).a*vOpacity;if(a<.005)discard;gl_FragColor=vec4(vColor,a);}'});
    const mesh=new THREE.InstancedMesh(geo,material,count);mesh.frustumCulled=false;for(let i=0;i<count;i++){dummy.scale.setScalar(0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,tint.set('#ffffff'));}scene.add(mesh);return mesh;
  }
  const fireBatch=billboards(64,true),smokeBatch=billboards(96,false);
  for(let j=0;j<4;j++){
    const group=new THREE.Group();scene.add(group);group.visible=false;
    const particles=[];
    for(let i=0;i<74;i++){
      const kind=i<16?'fire':i<40?'smoke':i<46?'ember':i<58?'spray':'metal';let object;
      if(kind==='fire'||kind==='smoke'){object=new THREE.Object3D();object.material={opacity:0,color:new THREE.Color(),rotation:0};}
      else if(kind==='spray'||kind==='ember')object=new THREE.Mesh(new THREE.SphereGeometry(kind==='ember'?.035:.08,5,4),new THREE.MeshBasicMaterial({color:kind==='ember'?'#ffc56a':'#d9eee0',transparent:true}));
      else object=new THREE.Mesh(i%4===0?new THREE.CylinderGeometry(.4,.4,.045,16):new THREE.SphereGeometry(.3,8,4,0,1.8,.3,1.2),new THREE.MeshStandardMaterial({color:i%3?'#693d2e':'#d3a249',metalness:.65,roughness:.65,side:THREE.DoubleSide}));
      if(kind!=='fire'&&kind!=='smoke')group.add(object);particles.push({object,kind,v:new THREE.Vector3(),delay:0,life:0,size:1,batchIndex:kind==='fire'?j*16+i:kind==='smoke'?j*24+i-16:-1});
    }
    // Additive fire supplies the flash without adding/removing lights and recompiling scene shaders.
    const light={intensity:0};
    effects.push({group,particles,light,age:100});
  }
  function trigger(x,y,z){
    const f=effects.find(f=>f.age>=7)??effects.reduce((a,b)=>a.age>b.age?a:b);
    f.age=0;f.group.position.set(x,y,z);f.group.visible=true;
    for(const [i,p]of f.particles.entries()){
      const a=i*2.399+Math.random()*.4,s=p.kind==='smoke'?.6+Math.random():p.kind==='fire'?1.5+Math.random()*2:3+Math.random()*5;
      p.v.set(Math.cos(a)*s,p.kind==='smoke'?1.1+Math.random()*1.5:2+Math.random()*6,Math.sin(a)*s);
      p.delay=p.kind==='smoke'?.15+Math.random()*.6:Math.random()*.07;p.life=p.kind==='smoke'?5+Math.random():p.kind==='fire'?.55+Math.random()*.6:3+Math.random();
      p.size=p.kind==='smoke'?1+Math.random():p.kind==='fire'?.8+Math.random():1;
      p.object.position.set(Math.cos(a)*.2,Math.random()*.4,Math.sin(a)*.2);p.object.visible=false;p.object.rotation.set(0,0,a);
    }
  }
  function update(dt,time,pulses,reduced=false){
    if(!effects.some(f=>f.age<7))return;
    for(const f of effects){if(f.age>=7)continue;f.age+=dt;
      f.light.intensity=reduced?0:Math.max(0,1-f.age/.28)*34;
      for(const p of f.particles){const age=f.age-p.delay,o=p.object;o.visible=age>=0&&age<p.life;if(!o.visible)continue;
        if(p.kind==='fire'||p.kind==='smoke'){
          o.position.addScaledVector(p.v,dt);p.v.x+=dt*.12;
          const smoke=p.kind==='smoke';o.scale.setScalar(p.size*(smoke?.5+age*.8:1+age*3));
          o.material.opacity=smoke?Math.min(1,age*4)*Math.pow(1-age/p.life,1.3)*.75:Math.pow(1-age/p.life,2);
          o.material.color.set(smoke?'#444741':age<.15?'#fff2b2':age<.4?'#ff9b32':'#b5320b');
          o.material.rotation+=dt*(smoke?.15:.4);
        }else{
          p.v.y-=dt*9.8;o.position.addScaledVector(p.v,dt);o.rotation.x+=dt*4;o.rotation.z+=dt*2;
          const h=waterHeight(o.position.x+f.group.position.x,o.position.z+f.group.position.z,time,pulses)-f.group.position.y;
          if(o.position.y<h&&p.v.y<0){if(p.kind==='spray')o.visible=false;else{p.v.multiplyScalar(Math.exp(-dt*4));if(o.position.y<h-3)o.visible=false;}}
        }
      }
      if(f.age>=7){f.group.visible=false;f.light.intensity=0;}
    }
    for(const f of effects)for(const p of f.particles){if(p.kind!=='fire'&&p.kind!=='smoke')continue;
      const batch=p.kind==='fire'?fireBatch:smokeBatch,o=p.object,live=f.age<7&&o.visible;
      dummy.position.copy(o.position).add(f.group.position);dummy.scale.copy(o.scale);if(!live)dummy.scale.setScalar(0);dummy.updateMatrix();batch.setMatrixAt(p.batchIndex,dummy.matrix);batch.setColorAt(p.batchIndex,o.material.color);batch.geometry.attributes.aOpacity.setX(p.batchIndex,live?o.material.opacity:0);
    }
    for(const batch of [fireBatch,smokeBatch]){batch.instanceMatrix.needsUpdate=true;batch.instanceColor.needsUpdate=true;batch.geometry.attributes.aOpacity.needsUpdate=true;}
  }
  function reset(){for(const f of effects){f.age=100;f.group.visible=false;f.light.intensity=0;}for(const batch of [fireBatch,smokeBatch]){batch.geometry.attributes.aOpacity.array.fill(0);batch.geometry.attributes.aOpacity.needsUpdate=true;}}
  return {trigger,update,reset,effects};
}

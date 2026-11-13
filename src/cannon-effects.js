import * as THREE from 'three';
import {plumeTexture} from './explosions.js';

export function createCannonEffects(scene){
  const texture=plumeTexture(),effects=[];
  for(let i=0;i<4;i++){
    const group=new THREE.Group();group.visible=false;scene.add(group);
    const flash=new THREE.Mesh(new THREE.ConeGeometry(.27,1.3,7),new THREE.MeshBasicMaterial({color:'#ffc16b',transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));flash.geometry.translate(0,.65,0);group.add(flash);
    const smoke=[];for(let j=0;j<5;j++){const p=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color:'#b9b5a4',transparent:true,opacity:0,depthWrite:false}));group.add(p);smoke.push(p);}
    effects.push({group,flash,smoke,age:10,direction:new THREE.Vector3()});
  }
  function fire(start,target){const f=effects.find(f=>f.age>2)??effects[0];f.age=0;f.group.position.copy(start);f.group.visible=true;f.direction.subVectors(target,start).normalize();f.flash.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),f.direction);}
  function update(dt){for(const f of effects){if(f.age>2)continue;f.age+=dt;
    f.flash.material.opacity=Math.max(0,1-f.age/.12);f.flash.scale.setScalar(1+f.age*2);
    f.smoke.forEach((s,i)=>{const age=Math.max(0,f.age-i*.035);s.position.copy(f.direction).multiplyScalar(.2+age*(1+i*.12));s.position.y+=age*.5;s.position.x+=Math.sin(i*2.4)*age*.25;s.position.z+=Math.cos(i*2.4)*age*.25;s.scale.setScalar(.25+age*(.9+i*.1));s.material.opacity=Math.min(1,age*15)*Math.max(0,1-age/1.8)*.48;});
    if(f.age>=2)f.group.visible=false;
  }}
  function reset(){effects.forEach(f=>{f.age=10;f.group.visible=false;});}
  return {fire,update,reset,effects};
}

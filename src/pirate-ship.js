import * as THREE from 'three';
import {batchStaticGroup} from './scene-batching.js';

export function createPirateShip(scene){
  const ship=new THREE.Group();scene.add(ship);const mats={};
  const material=c=>mats[c]??(mats[c]=new THREE.MeshStandardMaterial({color:c,roughness:.8}));
  function mesh(g,c,x=0,y=0,z=0,p=ship){const o=new THREE.Mesh(g,material(c));o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;}
  const box=(w,h,d,c,x,y,z,p)=>mesh(new THREE.BoxGeometry(w,h,d),c,x,y,z,p);
  const cyl=(r,h,c,x,y,z,p)=>mesh(new THREE.CylinderGeometry(r,r,h,12),c,x,y,z,p);
  const hullGeo=new THREE.SphereGeometry(1,24,12);const hull=mesh(hullGeo,'#49312b',0,.25,0);hull.scale.set(1.75,1.25,4.8);
  box(3.1,.18,7.7,'#956843',0,1.08,0);
  for(let i=0;i<13;i++)box(.025,.02,7.5,'#4a3529',-1.4+i*.23,1.19,0);
  for(const side of [-1,1]){
    box(.13,.35,7,'#382928',side*1.5,1.35,0);
    for(let i=0;i<7;i++){cyl(.04,.45,'#c09b62',side*1.53,1.75,-3+i);}
    box(.055,.055,6.7,'#c09b62',side*1.53,1.97,0);
    for(const z of [-1.8,.3,2]){box(.2,.55,.7,'#201f22',side*1.58,.7,z);const barrel=cyl(.16,1.05,'#252a2c',side*1.8,1.4,z);barrel.rotation.z=Math.PI/2;const ring=cyl(.19,.08,'#9c8154',side*2.25,1.4,z);ring.rotation.z=Math.PI/2;}
    for(const y of [-.2,.1,.45])box(.06,.065,6.3,'#b18c54',side*1.65,y,0);
  }
  box(2.4,1.2,2,'#684837',0,1.75,2.3);box(2.7,.14,2.3,'#332e2d',0,2.42,2.3);
  for(const x of [-.75,0,.75])box(.38,.48,.06,'#d6a450',x,1.9,3.33);
  const sails=[];
  for(const [z,height,width]of [[-1.1,8,4.5],[2,6.1,3.3]]){
    cyl(.1,height,'#ae8556',0,height/2+1,z);
    const yard=cyl(.065,width+.4,'#9b784c',0,height*.8,z);yard.rotation.z=Math.PI/2;
    const geo=new THREE.PlaneGeometry(width,height*.48,12,12),p=geo.attributes.position;
    for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setZ(i,Math.cos(x/width*Math.PI)*.45+Math.sin(y*3)*.03);if(y<-.2&&i%5===0)p.setY(i,y-.12);}
    geo.computeVertexNormals();const sail=mesh(geo,'#252b30',0,height*.6,z-.05);sail.material.side=THREE.DoubleSide;sails.push(sail);
  }
  // Bone-white skull crest and crossed bones on the forward sail.
  const crest=new THREE.Group();crest.position.set(0,4.8,-1.75);ship.add(crest);
  const skull=mesh(new THREE.SphereGeometry(.43,12,10),'#e6dcc2',0,0,0,crest);skull.scale.set(.9,1,.25);
  for(const x of [-.15,.15])mesh(new THREE.SphereGeometry(.1,8,6),'#1e252a',x,.06,-.11,crest);
  box(.36,.2,.1,'#e6dcc2',0,-.36,-.05,crest);
  for(const side of [-1,1]){const bone=cyl(.04,1.4,'#e6dcc2',0,-.62,-.05,crest);bone.rotation.z=side*.9;}
  const flag=mesh(new THREE.PlaneGeometry(1.4,.65,6,3),'#252b30',.6,9,-1.1);flag.material.side=THREE.DoubleSide;
  const bow=cyl(.07,3,'#b79460',0,1.5,-5);bow.rotation.x=-1.2;
  for(const side of [-1,1]){
    const rope=new THREE.CatmullRomCurve3([new THREE.Vector3(0,8.9,-1.1),new THREE.Vector3(side*1.4,4,-.3),new THREE.Vector3(side*1.45,1.4,1)]);
    mesh(new THREE.TubeGeometry(rope,16,.018,4),'#cab793');
  }
  batchStaticGroup(ship,{exclude:new Set([...sails,flag]),canonical:true});ship.visible=false;return {ship,sails,flag};
}

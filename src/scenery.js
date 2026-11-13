import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export function enrichScenery(scene,obstacles){
  const materials={};
  const mat=(c)=>materials[c]??(materials[c]=new THREE.MeshStandardMaterial({color:c,roughness:.82}));
  const windows=[],trees=[],lamps=[],created=[];
  function box(p,w,h,d,c,x,y,z){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),typeof c==='string'?mat(c):c);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;p.add(m);created.push(m);return m;}
  function ball(p,r,c,x,y,z){const m=new THREE.Mesh(new THREE.SphereGeometry(r,10,8),mat(c));m.position.set(x,y,z);p.add(m);created.push(m);return m;}
  function lantern(p,x,y,z){
    box(p,.19,.3,.19,'#25434b',x,y,z);
    const glass=new THREE.MeshStandardMaterial({color:'#ffd390',emissive:'#ffb650',emissiveIntensity:.05,roughness:.3});
    box(p,.14,.2,.2,glass,x,y,z);windows.push(glass);box(p,.26,.04,.26,'#25434b',x,y+.17,z);
    for(const dx of [-.09,.09])box(p,.018,.3,.21,'#25434b',x+dx,y,z);
  }
  function cottage(parent,x,z,scale=1){
    const g=new THREE.Group();g.position.set(x,.68,z);g.scale.setScalar(scale);parent.add(g);
    box(g,2.9,.2,2.9,'#bba785',0,.06,0);box(g,2.65,2.15,2.6,'#eee0b8',0,1.15,0);
    for(const z of [-1.31,1.31]){
      const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1.32,2.2,z),new THREE.Vector3(1.32,2.2,z),new THREE.Vector3(0,3.03,z)]);geo.setIndex(z>0?[0,1,2]:[2,1,0]);geo.computeVertexNormals();g.add(new THREE.Mesh(geo,mat('#eee0b8')));
      const vent=box(g,.3,.25,.04,'#52776c',0,2.58,z*1.025);for(let k=0;k<3;k++)box(g,.32,.025,.05,'#efe3bf',0,2.51+k*.07,z*1.04);
    }
    for(let i=0;i<13;i++)box(g,2.68,.025,.04,'#d4c7a4',0,.25+i*.15,1.32);
    for(const side of [-1,1]){
      const roof=box(g,1.9,.16,3.2,'#b86746',side*.7,2.61,0);roof.rotation.z=-side*.55;
      for(let row=0;row<7;row++)for(let tile=0;tile<10;tile++){
        const t=box(g,.24,.045,.29,(tile+row)%3?'#b96745':'#ca7f54',side*(.1+row*.23),3-row*.14,-1.43+tile*.31);t.rotation.z=-side*.55;
      }
      box(g,.15,2.2,.15,'#f8efcf',side*1.3,1.15,1.34);
      const light=new THREE.MeshStandardMaterial({color:'#326a77',emissive:'#ffb65a',emissiveIntensity:.05,roughness:.24});windows.push(light);
      box(g,.57,.7,.07,light,side*.77,1.5,1.34);
      for(const dx of [-.37,.37]){const shutter=box(g,.16,.8,.1,'#457b76',side*.77+dx,1.5,1.4);shutter.rotation.y=dx*.5;for(let k=0;k<7;k++)box(g,.17,.025,.12,'#315d5b',side*.77+dx,1.21+k*.085,1.47);}
      box(g,.66,.08,.2,'#faf0d1',side*.77,1.09,1.4);box(g,.035,.72,.09,'#f8efcf',side*.77,1.5,1.4);box(g,.6,.03,.09,'#f8efcf',side*.77,1.5,1.4);
      box(g,.78,.24,.25,'#a45f43',side*.77,.88,1.46);
      for(let j=0;j<5;j++){ball(g,.1,'#497b56',side*.77-.3+j*.15,1.03,1.46);ball(g,.05,j%2?'#eb9c87':'#e7cb7c',side*.77-.3+j*.15,1.12,1.48);}
    }
    box(g,.52,1.55,.09,'#315d5b',0,.87,1.34);for(let i=0;i<5;i++)box(g,.4,.025,.04,'#467770',0,.3+i*.25,1.4);ball(g,.035,'#d6ab61',.18,.9,1.42);
    for(let j=0;j<3;j++)box(g,1.3,.15,1-j*.2,'#c9b795',0,.15-j*.13,1.65+j*.25);
    box(g,.4,.9,.45,'#d3bf9b',.7,3.05,-.6);box(g,.52,.09,.56,'#8d6650',.7,3.55,-.6);
    lantern(g,-.38,1.85,1.48);lantern(g,.38,1.85,1.48);
    return g;
  }
  for(const o of obstacles.filter(o=>o.kind==='island')){
    o.object.traverse(m=>{if(m.isMesh&&m.material?.color?.getHexString()==='2c7385'){
      m.material=m.material.clone();m.material.emissive.set('#ffc375');windows.push(m.material);
    }});
    if([37,-14,-24,24].includes(o.x)){
      const light=new THREE.PointLight('#ffc879',0,12,2);light.position.set(o.x,3,o.z+2);scene.add(light);lamps.push(light);
    }
    if(o.x===37){
      for(const side of [-1,1]){
        box(o.object,.14,2.65,.14,'#f6ebcc',side*1.5,1.78,1.54);
        const glass=new THREE.MeshStandardMaterial({color:'#326d75',emissive:'#ffc36c',emissiveIntensity:.1});windows.push(glass);
        box(o.object,.66,.68,.08,glass,side*.9,2,1.6);
        for(let j=0;j<6;j++)box(o.object,.16,.035,.1,'#417b73',side*.9+side*.47,1.73+j*.105,1.67);
        box(o.object,.76,.09,.26,'#eee2bc',side*.9,1.59,1.64);
        lantern(o.object,side*1.3,2.55,1.65);
      }
      for(let j=0;j<3;j++)box(o.object,1.4,.14,.7-j*.14,'#c4b28e',0,.65-j*.13,1.7+j*.25);
    }
    if(o.x===-24){
      for(let i=0;i<20;i++){const a=i/20*Math.PI*2;box(o.object,.035,.55,.035,'#315560',Math.cos(a)*1.62,8.1,Math.sin(a)*1.62);}
      const rail=new THREE.Mesh(new THREE.TorusGeometry(1.64,.035,6,48),mat('#315560'));rail.rotation.x=Math.PI/2;rail.position.y=8.38;o.object.add(rail);
      for(const side of [-1,1])lantern(o.object,side*.8,2.05,1.5);
    }
    if(o.x===24)cottage(o.object,-1.7,-2.1,.68);
    if(o.x===37)cottage(o.object,2,-2,.62);
    if(o.x===-24)cottage(o.object,-2.5,-2,.58);
    const g=o.object;
    for(let i=0;i<17;i++){
      const a=i*2.399,r=o.r*(.46+(i%4)*.055),x=Math.cos(a)*r,z=Math.sin(a)*r;
      // Small tufts and seedheads break up otherwise empty sand.
      for(let k=0;k<3;k++){const blade=box(g,.025,.24+k*.05,.035,k%2?'#71916a':'#839d70',x+k*.045,.75+k*.02,z);blade.rotation.z=(k-1)*.3;}
      if(i%3===0)ball(g,.08,'#dac69a',x,.72,z+.16).scale.set(1.4,.4,1);
    }
    for(let i=0;i<4;i++){const a=i*1.7+.4;lantern(g,Math.cos(a)*o.r*.7,1.15,Math.sin(a)*o.r*.7);}
  }
  scene.traverse(o=>{if(o.userData.windTree)trees.push(o);});
  for(const tree of trees){
    for(let j=0;j<9;j++){
      const hoop=new THREE.Mesh(new THREE.TorusGeometry(.23-j*.006,.014,4,12),mat('#6f553e'));hoop.position.set(.3+j*.025,.35+j*.33,0);hoop.rotation.x=Math.PI/2;tree.add(hoop);
    }
    const fronds=tree.children.filter(o=>o.isGroup);
    fronds.forEach((f,i)=>{
      f.userData.windFrond=i;f.userData.baseRotation=f.rotation.clone();
      for(let k=1;k<10;k++)for(const side of [-1,1]){
        const s=new THREE.Shape();s.moveTo(0,0);s.quadraticCurveTo(.28,.14,.7,-.25);s.quadraticCurveTo(.2,-.05,0,0);
        const leaf=new THREE.Mesh(new THREE.ShapeGeometry(s),new THREE.MeshStandardMaterial({color:k%2?'#669c70':'#39775f',side:THREE.DoubleSide,roughness:.9}));
        leaf.position.set(k*.22,-k*k*.005,side*.02);leaf.rotation.z=side*(.6+k*.025);leaf.rotation.x=side*.25;f.add(leaf);
      }
    });
    for(let i=0;i<3;i++)ball(tree,.14,'#785d3b',.4+(i-1)*.18,3.28,.12);
  }
  const beacon=new THREE.Group();beacon.position.set(-24,8.65,-27);scene.add(beacon);
  const beamMat=new THREE.MeshBasicMaterial({color:'#ffe2a0',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});
  const beam=new THREE.Mesh(new THREE.ConeGeometry(3.7,24,24,1,true),beamMat);beam.rotation.x=Math.PI/2;beam.position.z=-12;beacon.add(beam);
  const light=new THREE.SpotLight('#ffe5af',0,48,.17,.7,1.5),target=new THREE.Object3D();target.position.z=-40;beacon.add(light,target);light.target=target;
  scene.updateMatrixWorld(true);const batches=new Map();let batched=0;
  for(const mesh of created){
    let parent=mesh.parent,moving=false;while(parent){if(parent.userData.windTree)moving=true;parent=parent.parent;}
    if(moving)continue;
    const key=mesh.material.uuid;if(!batches.has(key))batches.set(key,{material:mesh.material,geometries:[]});
    batches.get(key).geometries.push(mesh.geometry.clone().applyMatrix4(mesh.matrixWorld));mesh.removeFromParent();mesh.geometry.dispose();batched++;
  }
  for(const batch of batches.values()){
    const merged=mergeGeometries(batch.geometries);const mesh=new THREE.Mesh(merged,batch.material);mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);batch.geometries.forEach(g=>g.dispose());
  }
  return {trees,windows,lamps,cottage,beacon,beamMat,beaconLight:light,batchStats:{before:batched,after:batches.size}};
}

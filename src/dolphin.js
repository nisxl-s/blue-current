import * as THREE from 'three';

function fin(parent,points,material){
  const shape=new THREE.Shape();shape.moveTo(...points[0]);
  for(let i=1;i<points.length;i+=3){const a=points[i],b=points[i+1],c=points[i+2];shape.bezierCurveTo(...a,...b,...c);}
  const geo=new THREE.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.025,bevelThickness:.018,curveSegments:12});
  const m=new THREE.Mesh(geo,material);parent.add(m);return m;
}
export function createDolphin(){
  const object=new THREE.Group(),skin=new THREE.MeshStandardMaterial({color:'#668e9a',roughness:.3,metalness:.08});
  const points=[[-1.65,.015],[-1.5,.08],[-1.15,.12],[-.95,.27],[-.6,.39],[-.15,.42],[.35,.34],[.85,.23],[1.3,.11],[1.65,.055]];
  const geo=new THREE.LatheGeometry(points.map(([z,r])=>new THREE.Vector2(r,z)),32);geo.rotateX(Math.PI/2);

  const colors=[];for(let i=0;i<geo.attributes.position.count;i++){
    const y=geo.attributes.position.getY(i);const c=new THREE.Color('#557c8a').lerp(new THREE.Color('#d2ded8'),THREE.MathUtils.smoothstep(-y,-.02,.3));colors.push(c.r,c.g,c.b);
  }
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));skin.vertexColors=true;
  const body=new THREE.Mesh(geo,skin);object.add(body);const rest=geo.attributes.position.array.slice();
  const finMat=new THREE.MeshStandardMaterial({color:'#527d89',roughness:.4});
  const dorsal=fin(object,[[0,0],[.05,.25],[.05,.72],[.3,.72],[.23,.4],[.4,.15],[.65,0]],finMat);dorsal.rotation.y=-Math.PI/2;dorsal.position.set(0,.28,.0);
  const flippers=[];
  for(const side of [-1,1]){
    const f=fin(object,[[0,0],[.25,.1],[.7,.22],[.85,.45],[.45,.4],[.15,.2],[0,.13]],finMat);
    f.rotation.x=Math.PI/2;f.scale.x=side;f.position.set(side*.25,-.18,-.45);flippers.push(f);
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.032,12,8),new THREE.MeshStandardMaterial({color:'#142b32',roughness:.12}));eye.position.set(side*.255,.07,-.93);object.add(eye);
  }
  const tail=new THREE.Group();tail.position.z=1.25;object.add(tail);
  const peduncle=new THREE.Mesh(new THREE.SphereGeometry(.13,16,12),finMat);peduncle.scale.set(.65,.75,3.5);peduncle.position.z=.15;tail.add(peduncle);
  for(const side of [-1,1]){const f=fin(tail,[[0,0],[.25,-.08],[.65,-.08],[.82,.03],[.65,.13],[.25,.4],[0,.24]],finMat);f.rotation.x=Math.PI/2;f.scale.x=side;f.position.z=.42;}
  object.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  const mouthCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(-.075,-.035,-1.52),new THREE.Vector3(0,-.06,-1.59),new THREE.Vector3(.075,-.035,-1.52)]);
  object.add(new THREE.Mesh(new THREE.TubeGeometry(mouthCurve,16,.008,5,false),new THREE.MeshStandardMaterial({color:'#294d58'})));
  function swim(time,reduced){
    const stroke=reduced?0:Math.sin(time*5.4);
    const p=geo.attributes.position;
    for(let i=0;i<p.count;i++){const z=rest[i*3+2],weight=THREE.MathUtils.smoothstep(z,.1,1.65);p.setY(i,rest[i*3+1]+stroke*.12*weight*weight);}
    p.needsUpdate=true;geo.computeVertexNormals();
  }
  return {object,tail,body,flippers,swim};
}


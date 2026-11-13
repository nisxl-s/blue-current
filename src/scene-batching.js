import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Batch within spatial/animation groups so fronds keep their individual wind motion.
export function batchStaticGroup(root,{exclude=new Set(),canonical=false}={}){
  root.updateWorldMatrix(true,true);const inverse=new THREE.Matrix4().copy(root.matrixWorld).invert(),groups=new Map();
  root.traverse(o=>{
    if(!o.isMesh||o.isInstancedMesh||Array.isArray(o.material)||!o.geometry.attributes.normal||!o.geometry.attributes.uv)return;
    let p=o;while(p&&p!==root){if(exclude.has(p)||p.userData.windTree)return;p=p.parent;}
    if(exclude.has(o))return;
    const m=o.material;
    let key=m.uuid;
    if(canonical){const {uuid,metadata,name,...properties}=m.toJSON();key=JSON.stringify(properties);}
    key+=`/${o.castShadow}/${o.receiveShadow}`;
    if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);
  });
  let before=0,after=0;
  for(const meshes of groups.values()){
    if(meshes.length<2)continue;
    const geometries=meshes.map(o=>{
      const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();
      for(const a of Object.keys(g.attributes))if(!['position','normal','uv'].includes(a))g.deleteAttribute(a);
      return g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld));
    });
    const geo=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(!geo)continue;
    const batch=new THREE.Mesh(geo,meshes[0].material);batch.castShadow=meshes[0].castShadow;batch.receiveShadow=meshes[0].receiveShadow;root.add(batch);
    batch.updateMatrix();batch.matrixAutoUpdate=false;
    meshes.forEach(o=>o.removeFromParent());before+=meshes.length;after++;
  }
  return {before,after};
}

export function optimizeSceneIslands(obstacles,marine,scenery){
  const exclude=new Set(marine.colliders.map(c=>c.object).filter(Boolean));
  const stats={before:0,after:0};
  for(const island of obstacles.filter(o=>o.kind==='island')){
    const s=batchStaticGroup(island.object,{exclude});stats.before+=s.before;stats.after+=s.after;
  }
  for(const tree of scenery.trees)for(const frond of tree.children.filter(o=>o.userData.windFrond!==undefined)){
    const s=batchStaticGroup(frond,{canonical:true});stats.before+=s.before;stats.after+=s.after;
  }
  return stats;
}

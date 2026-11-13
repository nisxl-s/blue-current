import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {batchStaticGroup} from './scene-batching.js';

test('static batching preserves triangle count, world bounds and material identity',()=>{
  const root=new THREE.Group();root.position.set(8,2,-4);root.rotation.y=.3;
  const mat=new THREE.MeshStandardMaterial(),excluded=new THREE.Group();root.add(excluded);
  for(let i=0;i<80;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.3,1,.7),mat);m.position.set(i*.2,Math.sin(i),i%4);root.add(m);}
  const fitting=new THREE.Mesh(new THREE.BoxGeometry(),mat);excluded.add(fitting);
  root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(root,true),before=root.children.length;
  const result=batchStaticGroup(root,{exclude:new Set([excluded])});
  assert.equal(result.before,80);assert.equal(result.after,1);assert.ok(root.children.length<before);
  const after=new THREE.Box3().setFromObject(root,true);assert.ok(bounds.min.distanceTo(after.min)<1e-5);assert.ok(bounds.max.distanceTo(after.max)<1e-5);
  assert.equal(fitting.parent,excluded);const batch=root.children.find(o=>o.isMesh);assert.equal(batch.material,mat);assert.equal(batch.geometry.attributes.position.count,80*36);
});
test('frond batching retains a movable parent and all leaf geometry',()=>{
  const frond=new THREE.Group();
  for(let i=0;i<18;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(.3,1),new THREE.MeshStandardMaterial({color:i%2?'#39775f':'#669c70'}));m.position.x=i*.1;frond.add(m);}
  const stats=batchStaticGroup(frond,{canonical:true});assert.equal(stats.after,2);assert.equal(stats.before,18);
  const original=new THREE.Box3().setFromObject(frond);frond.rotation.z=.5;const moved=new THREE.Box3().setFromObject(frond);assert.notEqual(original.max.y,moved.max.y);
});


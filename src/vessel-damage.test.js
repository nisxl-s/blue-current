import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createVesselDamage,sinkingPose} from './vessel-damage.js';
import {createDolphin} from './dolphin.js';

test('flooding precedes a continuous bow-first descent and full submersion',()=>{
  let previous=0;
  for(let t=0;t<=18;t+=.05){const p=sinkingPose(t);assert.ok(p.depth>=previous-1e-9);assert.ok(p.pitch<=0);assert.ok(p.roll<Math.PI/2);previous=p.depth;}
  assert.ok(sinkingPose(6).depth<1);assert.ok(sinkingPose(18).depth>12);assert.equal(sinkingPose(18).done,true);
});
test('damage detaches real fittings preserving world position; reset restores hull and fittings',()=>{
  const scene=new THREE.Scene(),boat=new THREE.Group();scene.add(boat);boat.position.set(4,2,6);boat.rotation.y=.7;
  const hull=new THREE.Mesh(new THREE.BoxGeometry(2,1,6),new THREE.MeshStandardMaterial());boat.add(hull);boat.userData.hull=hull;
  for(let i=0;i<12;i++){const fitting=new THREE.Mesh(new THREE.BoxGeometry(.2,.2,1),new THREE.MeshStandardMaterial());fitting.position.set(i%2?1:-1,1,i*.2);boat.add(fitting);}
  const damage=createVesselDamage(boat,scene),first=damage.pieces[0],world=first.object.getWorldPosition(new THREE.Vector3());
  const original=hull.geometry.attributes.position.array.slice();damage.hit(40,.7,5);
  assert.equal(first.object.parent,scene);assert.ok(first.object.position.distanceTo(world)<1e-6);
  assert.notDeepEqual(hull.geometry.attributes.position.array,original);
  for(let i=0;i<600;i++)damage.update(1/60,i/60,[],40,'afloat',0);
  assert.ok(first.object.position.toArray().every(Number.isFinite));
  damage.reset();assert.equal(first.object.parent,boat);assert.equal(first.detached,false);assert.deepEqual(hull.geometry.attributes.position.array,original);
});
test('dolphin body flexes vertically while reduced motion restores the resting shape',()=>{
  const d=createDolphin(),p=d.body.geometry.attributes.position,rest=p.array.slice();d.swim(.25,false);
  assert.notDeepEqual(p.array,rest);assert.ok(Array.from(p.array).every(Number.isFinite));d.swim(.25,true);assert.deepEqual(p.array,rest);
});

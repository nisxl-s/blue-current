import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCloudLayer} from './clouds.js';

test('clouds stay in the sky at overview and sailing camera positions',()=>{
  const scene=new THREE.Scene(),clouds=createCloudLayer(scene);
  const camera=new THREE.OrthographicCamera(-40,40,25,-25,.1,500);
  for(const position of [[55,53,67],[10,28,30],[-90,15,80]]){
    camera.position.set(...position);
    for(const layer of clouds.layers){
      layer.onBeforeRender(null,scene,camera);
      assert.equal(layer.geometry.type,'SphereGeometry');
      assert.deepEqual(layer.position.toArray(),position);
      assert.equal(layer.material.side,THREE.BackSide);
      assert.equal(layer.material.depthTest,true);
      assert.ok(layer.geometry.parameters.radius<camera.far);
      assert.equal(layer.material.depthWrite,false);
    }
  }
});

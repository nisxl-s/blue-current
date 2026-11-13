import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWaterView,createOceanSkirt,fogRange} from './water-view.js';

test('fog remains near the view at both sailing and overview camera distances',()=>{
  for(const [distance,height]of [[45,12],[45,90],[95,52]]){
    const fog=fogRange(distance,height);assert.ok(fog.near<distance);assert.ok(fog.far>distance+20);
    assert.ok(fogRange(distance,height,1).far<fog.far);
  }
});
test('underwater capture hides both water surfaces and always restores renderer state',()=>{
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-10,10,10,-10,.1,500),water=new THREE.Mesh(new THREE.PlaneGeometry(260,260),new THREE.ShaderMaterial({uniforms:{}}));scene.add(water);
  const skirt=createOceanSkirt(water,scene);let current=null,calls=0;
  const renderer={getDrawingBufferSize:v=>v.set(800,600),getRenderTarget:()=>current,setRenderTarget:t=>{current=t;},render:()=>{calls++;assert.equal(water.visible,false);assert.equal(skirt.visible,false);}};
  const view=createWaterView(renderer,water,camera);view.capture(scene);
  assert.equal(calls,1);assert.equal(current,null);assert.equal(water.visible,true);assert.equal(skirt.visible,true);assert.equal(view.target.width,400);
  renderer.render=()=>{throw Error('test render failure');};assert.throws(()=>view.capture(scene));assert.equal(water.visible,true);assert.equal(current,null);
  assert.ok(Array.from(skirt.geometry.attributes.position.array).every(Number.isFinite));view.target.dispose();
});


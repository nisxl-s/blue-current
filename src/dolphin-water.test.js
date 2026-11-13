import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createDolphinWater} from './dolphin-water.js';

test('dolphins leave surface wakes and trigger separate takeoff and landing splashes',()=>{
  const pulses=[],sounds=[],scene=new THREE.Scene(),fx=createDolphinWater(scene,(...p)=>pulses.push(p),(...s)=>sounds.push(s));
  const state={x:0,z:0,heading:0,clearance:-.3,depth:.6,distance:5};
  fx.dolphin(0,state,.016,1,[],false);assert.ok(fx.trails.some(p=>p.age===0));
  fx.dolphin(0,{...state,clearance:.5},.016,1.2,[],false);
  fx.dolphin(0,{...state,clearance:-.1},.016,2.2,[],false);
  assert.equal(pulses.length,2);assert.ok(pulses[1][2]>pulses[0][2]);assert.ok(fx.drops.filter(p=>p.age===0).length>=66);
  fx.update(.016,2.2,[],false);assert.ok(Array.from(fx.foam.instanceMatrix.array).every(Number.isFinite));assert.equal(fx.foam.count,240);
  for(let i=0;i<240;i++)fx.update(.02,2.2+i*.02,[],false);
  assert.ok(fx.trails.every(p=>p.age>=p.life||p.life===undefined));
  fx.reset();assert.ok(fx.drops.every(p=>p.age===10));
});
test('reduced motion suppresses dolphin wake and splash emissions',()=>{
  const fx=createDolphinWater(new THREE.Scene(),()=>assert.fail('unexpected pulse'),()=>assert.fail('unexpected sound'));
  const state={x:0,z:0,heading:0,depth:.6,distance:5};
  fx.dolphin(0,{...state,clearance:-1},.016,1,[],true);fx.dolphin(0,{...state,clearance:1},.016,2,[],true);
  assert.ok(fx.trails.every(p=>p.age===10));assert.ok(fx.drops.every(p=>p.age===10));
});

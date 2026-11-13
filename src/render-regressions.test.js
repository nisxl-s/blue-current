import test from 'node:test';
import assert from 'node:assert/strict';
import {waterVertex,waterFragment} from './ocean-shaders.js';
import {advanceDolphin} from './dolphin-navigation.js';
import {sunriseFogDensity} from './water-view.js';

test('sunrise fog uses a continuous shared exponential rule across camera distances',()=>{
  const fog=(distance,density)=>1-Math.exp(-density*density*distance*distance);
  assert.ok(Math.abs(fog(45,sunriseFogDensity(45,1))-fog(95,sunriseFogDensity(95,1)))<1e-9);
  assert.equal(sunriseFogDensity(45,0),0);
  assert.match(waterFragment,/exp\(-uFogDensity\*uFogDensity\*vFogDepth\*vFogDepth\)/);
  assert.doesNotMatch(waterFragment,/smoothstep\(uFogRange/);
});

test('both ocean shader stages declare the weather uniform they consume',()=>{
  for(const shader of [waterVertex,waterFragment])assert.match(shader,/uniform\s+vec4\s+uWeather\s*;/);
});
test('underwater sampling has an opaque fallback and does not shadow GLSL texture functions',()=>{
  assert.match(waterFragment,/#ifdef WATER_TRANSMISSION/);
  assert.match(waterFragment,/uniform sampler2D uUnderColor;/);
  assert.match(waterFragment,/uniform sampler2D uUnderDepth;/);
  assert.doesNotMatch(waterFragment,/\b(?:float|vec[234])\s+texture\s*=/);
  assert.match(waterFragment,/exp\(-waterDepth\*\.5\)/);
});
test('dolphin velocity turns progressively instead of reversing in one frame',()=>{
  let p={x:0,z:0,vx:3,vz:0,heading:-Math.PI/2};
  const next=advanceDolphin(p,{x:-10,z:4},1/60,[]);
  assert.ok(next.vx>2.7);assert.ok(next.vz>0&&next.vz<.1);
  for(let i=0;i<120;i++)p=advanceDolphin(p,{x:-10,z:4},1/60,[]);
  assert.ok(p.vx<0);
});

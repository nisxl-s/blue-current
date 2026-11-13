import test from 'node:test';
import assert from 'node:assert/strict';
import {WAVES,WAVE_GLSL,waterHeight,floatPose,impactDamage,tideLevel,tideRate,TIDE_PERIOD,setWaveBarriers} from './marine.js';

test('sea surface stays bounded and changes beneath a stationary hull',()=>{
  const amplitude=WAVES.reduce((sum,w)=>sum+w.a,0)*1.14;
  let min=Infinity,max=-Infinity;
  for(let t=0;t<40;t+=.1){const h=waterHeight(3,7,t);assert.ok(Math.abs(h+.07-tideLevel(t))<=amplitude+1e-9);const pose=floatPose(3,7,.4,2.5,1.1,t);assert.ok(Number.isFinite(pose.pitch)&&Number.isFinite(pose.roll));assert.ok(Math.abs(pose.pitch)<.4&&Math.abs(pose.roll)<.4);min=Math.min(min,pose.height);max=Math.max(max,pose.height);}
  assert.ok(max-min>.3,'a stationary boat must heave with passing crests');
});
test('four point buoyancy rotates with the hull heading',()=>{
  for(const heading of [0,.8,Math.PI/2,Math.PI]){
    const x=5,z=8,t=2,len=2.5,w=1.1,s=Math.sin(heading),c=Math.cos(heading);
    const pose=floatPose(x,z,heading,len,w,t);
    const fore=waterHeight(x-s*len,z-c*len,t),aft=waterHeight(x+s*len,z+c*len,t);
    assert.equal(Math.sign(pose.pitch),Math.sign(fore-aft));
    assert.ok(Math.abs(pose.height-waterHeight(x,z,t))<.15);
  }
});
test('impact ripples expire rather than perturbing the sea forever',()=>{
  const p=[{x:0,y:0,z:1,w:.8}];
  assert.equal(waterHeight(1,1,0,p),waterHeight(1,1,0));
  assert.notEqual(waterHeight(1,1,2,p),waterHeight(1,1,2));
  assert.equal(waterHeight(1,1,7,p),waterHeight(1,1,7));
  for(const w of WAVES)assert.ok(WAVE_GLSL.includes(w.a.toFixed(3)));
});
test('gentle docking is harmless and high speed impacts are bounded',()=>{
  assert.equal(impactDamage(0),0);assert.equal(impactDamage(1.5),0);
  assert.ok(impactDamage(7)>impactDamage(3));assert.equal(impactDamage(100),48);
  assert.ok(impactDamage(6,1.2)>impactDamage(6));
});
test('accelerated tide visibly rises and falls with the matching rate',()=>{
  assert.ok(tideLevel(TIDE_PERIOD/4)>.14);assert.ok(tideLevel(TIDE_PERIOD*3/4)<-.14);
  for(let t=0;t<90;t+=3){const finite=(tideLevel(t+.001)-tideLevel(t-.001))/.002;assert.ok(Math.abs(finite-tideRate(t))<1e-7);}
});
test('shore reflection perturbs nearby windward water without shifting distant water',()=>{
  const close=waterHeight(6,0,2),distant=waterHeight(200,200,2),lee=waterHeight(-6,0,2);
  setWaveBarriers([{x:0,z:0,r:5}]);
  try{assert.ok(Math.abs(waterHeight(6,0,2)-close)>.01);assert.ok(Math.abs(waterHeight(200,200,2)-distant)<1e-8);assert.equal(waterHeight(-6,0,2),lee);}finally{setWaveBarriers([]);}
});

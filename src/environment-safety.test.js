import test from 'node:test';
import assert from 'node:assert/strict';
import {setWaveBarriers,waterHeight} from './marine.js';
import {openDolphinPosition,advanceDolphin,dolphinObstacles} from './dolphin-navigation.js';

test('dry island centers withstand a full tide cycle and stacked impact pulses',()=>{
  setWaveBarriers([{x:0,z:0,r:5}]);
  try{for(let t=0;t<180;t+=.2){
    const pulses=Array.from({length:8},()=>({x:0,y:0,z:t-1,w:.8}));
    for(const x of [0,1,2,3])assert.ok(waterHeight(x,0,t,pulses)<.4);
  }}finally{setWaveBarriers([]);}
});
test('dolphins cannot tunnel through solids and can navigate around them',()=>{
  const obstacles=[{x:0,z:0,r:3}],start=openDolphinPosition(0,0,obstacles);
  assert.ok(Math.hypot(start.x,start.z)>3);
  let p={x:-8,z:0};
  for(let i=0;i<800;i++){p=advanceDolphin(p,{x:8,z:0},.05,obstacles);assert.ok(Math.hypot(p.x,p.z)>=3-1e-8);}
  assert.ok(p.x>4,'dolphin should find a route around the obstacle');
  const swept=advanceDolphin({x:-8,z:0},{x:8,z:0},10,obstacles);assert.ok(swept.x<=-3,'long movement must stop at first contact');
});
test('navigation includes full-body margins and excludes destroyed cargo',()=>{
  const list=dolphinObstacles([{x:1,z:2,r:5,kind:'island'},{x:8,z:8,r:1,destroyed:true}],{x:20,z:20});
  assert.equal(list.length,2);assert.ok(list[0].r>6);assert.ok(list[1].r>4);
});

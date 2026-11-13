import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceDolphin} from './dolphin-navigation.js';

test('guide cruising speed can stay slightly ahead of normal and boosted boats',()=>{
  for(const boatSpeed of [7,12]){
    let dolphin={x:0,z:0,vx:3,vz:0};
    const swimSpeed=Math.max(4.5,boatSpeed*1.12+.5);
    for(let i=0;i<240;i++)dolphin=advanceDolphin(dolphin,{x:1000,z:0},1/60,[],swimSpeed);
    assert.ok(dolphin.vx>boatSpeed);
    assert.ok(dolphin.vx<boatSpeed*1.25);
  }
  const native=advanceDolphin({x:0,z:0},{x:100,z:0},1,[]);
  assert.equal(native.x,3);
});

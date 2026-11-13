import test from 'node:test';
import assert from 'node:assert/strict';
import {createRaidState} from './pirate-rules.js';

const tick={eligible:true,daylight:1,health:100,distance:15};
function pursuit(){const r=createRaidState(()=>0);assert.equal(r.update(35,tick),'spawn');assert.equal(r.update(5,tick),'pursuit');return r;}
test('pirate arrivals are randomized, restricted to daylight sailing, and pause with play',()=>{
  const a=createRaidState(()=>0),b=createRaidState(()=>.9);assert.notEqual(a.state.wait,b.state.wait);
  a.update(100,{...tick,daylight:0});assert.equal(a.state.phase,'waiting');
  a.update(100,{...tick,eligible:false});assert.equal(a.state.wait,35);assert.equal(a.update(35,tick),'spawn');
});
test('three bomb hits defeat the raider and bombs have a cooldown',()=>{
  const r=pursuit();assert.equal(r.bomb(),true);assert.equal(r.bomb(),false);r.update(3,tick);assert.equal(r.bomb(),true);
  assert.equal(r.hit(),'hit');assert.equal(r.hit(),'hit');assert.equal(r.hit(),'defeated');assert.equal(r.state.hp,0);assert.equal(r.state.result,'defeated');assert.equal(r.hit(),null);
});
test('escape requires sustained separation; surviving the pursuit also wins',()=>{
  const r=pursuit();r.update(5,{...tick,distance:50});r.update(1,tick);assert.equal(r.state.escape,0);
  assert.equal(r.update(7,{...tick,distance:50}),'escaped');assert.equal(r.state.result,'escaped');
  const timed=pursuit();assert.equal(timed.update(100,tick),'escaped');
});
test('zero hull health loses before an escape win; reset clears encounter state',()=>{
  const r=pursuit();assert.equal(r.update(100,{...tick,health:0,distance:100}),'lost');assert.equal(r.state.result,'lost');
  r.update(8,{...tick,health:0});assert.equal(r.state.phase,'waiting');r.reset();assert.equal(r.state.hp,100);assert.equal(r.state.result,null);assert.equal(r.state.cooldown,0);
});

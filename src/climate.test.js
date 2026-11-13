import test from 'node:test';
import assert from 'node:assert/strict';
import {climateAt,deckFloodStep,DAY_SECONDS} from './climate.js';
import {setSeaWeather,setWaveBarriers,waterHeight,floatPose} from './marine.js';

test('fog is confined to sunrise and clears for afternoon, sunset and night',()=>{
  const atHour=h=>climateAt(((h-8+24)%24)/24*DAY_SECONDS);
  assert.ok(atHour(6).sunriseFog>.9);
  for(const h of [0,3,9,12,17,20,23])assert.equal(atHour(h).sunriseFog,0);
});

test('day/night and storm fronts transition continuously including midnight',()=>{
  for(let t=0;t<DAY_SECONDS*6;t+=.1){const a=climateAt(t),b=climateAt(t+.01);
    for(const key of ['daylight','storm','wind','waveScale']){assert.ok(Number.isFinite(a[key]));assert.ok(Math.abs(a[key]-b[key])<.003,`${key} jumps at ${t}`);}
  }
  assert.ok(climateAt(0).daylight>.9);assert.ok(climateAt(300).night>.9);assert.ok(climateAt(300).storm>.9);
  assert.equal(climateAt(300+DAY_SECONDS*2).storm,0,'some nights should be clear');
});
test('storm crests can overtop the deck while protected island centers stay dry',()=>{
  setSeaWeather(climateAt(300));let overtopping=-Infinity;
  try{
    for(let t=0;t<100;t+=.05){const pose=floatPose(0,7,0,2.5,1.1,t);overtopping=Math.max(overtopping,waterHeight(0,4.1,t)-pose.height-.9);}
    assert.ok(overtopping>.5);
    setWaveBarriers([{x:0,z:0,r:5}]);for(let t=0;t<90;t+=.2)assert.ok(waterHeight(2,0,t)<.4);
  }finally{setSeaWeather({waveScale:1,storm:0});setWaveBarriers([]);}
});
test('deck water accumulates during overtopping and drains continuously afterward',()=>{
  let volume=0;for(let i=0;i<60;i++)volume=deckFloodStep(volume,.7,1/60);assert.ok(volume>.5);
  let previous=volume;for(let i=0;i<900;i++){volume=deckFloodStep(volume,0,1/60);assert.ok(volume<=previous&&volume>=0);previous=volume;}assert.equal(volume,0);
});

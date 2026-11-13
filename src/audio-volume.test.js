import test from 'node:test';
import assert from 'node:assert/strict';
import {MarineAudio} from './marine.js';

test('master volume clamps safely, stays muted when off, and survives toggling',async()=>{
  const audio=new MarineAudio(),levels=[];
  audio.context={currentTime:0,resume:async()=>{}};
  audio.master={gain:{setTargetAtTime:value=>levels.push(value)}};
  audio.setVolume(.3);assert.equal(levels.at(-1),0);
  await audio.toggle();assert.equal(levels.at(-1),.3);
  audio.setVolume(.8);assert.equal(levels.at(-1),.8);
  await audio.toggle();assert.equal(levels.at(-1),0);
  await audio.toggle();assert.equal(levels.at(-1),.8);
  audio.setVolume(2);assert.equal(audio.volume,1);
  audio.setVolume(-1);assert.equal(audio.volume,0);
});

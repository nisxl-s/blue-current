import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createExplosions} from './explosions.js';
import {MarineAudio} from './marine.js';

test('repeated blasts reuse bounded effects and expire completely',()=>{
  const scene=new THREE.Scene(),explosions=createExplosions(scene),count=scene.children.length;
  for(let n=0;n<12;n++){explosions.trigger(n,1,n);explosions.update(.05,n*.05,[]);}
  assert.equal(scene.children.length,count);
  assert.ok(explosions.effects.some(f=>f.group.visible));
  for(let i=0;i<150;i++)explosions.update(.05,i*.05,[]);
  assert.ok(explosions.effects.every(f=>!f.group.visible&&f.light.intensity===0));
  explosions.trigger(0,1,0);explosions.update(.02,0,[],true);
  assert.ok(explosions.effects.every(f=>f.light.intensity===0));
  explosions.reset();assert.ok(explosions.effects.every(f=>!f.group.visible));
});
test('dolphin calls are rate limited and muted effects schedule no audio',()=>{
  const audio=new MarineAudio(),scheduled=[];audio.context={currentTime:1};audio.enabled=true;
  audio.tone=(...args)=>scheduled.push(args);audio.hiss=(...args)=>scheduled.push(args);
  audio.effect('dolphin',.6);const first=scheduled.length;assert.ok(first>0);
  audio.effect('dolphin',.6);assert.equal(scheduled.length,first);
  audio.context.currentTime=4;audio.effect('dolphin',.6);assert.ok(scheduled.length>first);
  const beforeMute=scheduled.length;audio.enabled=false;
  for(const kind of ['dolphin','explosion','engine-start','engine-stop'])audio.effect(kind);
  assert.equal(scheduled.length,beforeMute);
});

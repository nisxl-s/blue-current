import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createExplosions} from './explosions.js';
import {createCannonEffects} from './cannon-effects.js';
import {MarineAudio} from './marine.js';

test('pirate audio preview resumes the context and enables an audible preview window',async()=>{
  const audio=new MarineAudio();let resumed=false,horn=false,level=0;
  audio.context={currentTime:10,resume:async()=>{resumed=true;}};
  audio.master={gain:{setTargetAtTime:v=>{level=v;}}};audio.effect=kind=>{horn=kind==='pirate-horn';};
  await audio.previewPirateMusic();assert.equal(resumed,true);assert.equal(audio.enabled,true);assert.equal(audio.musicPreviewUntil,16);assert.equal(level,.65);assert.equal(horn,true);
});

test('explosion flash adds no dynamic light variants and uses two plume batches',()=>{
  const scene=new THREE.Scene(),fx=createExplosions(scene);let lights=0,batches=0;
  scene.traverse(o=>{if(o.isLight)lights++;if(o.isInstancedMesh)batches++;});assert.equal(lights,0);assert.equal(batches,2);
  fx.trigger(0,1,0);fx.update(.1,.1,[]);fx.reset();
});
test('cannon muzzle effects are directional, pooled and expire',()=>{
  const scene=new THREE.Scene(),fx=createCannonEffects(scene),count=scene.children.length;
  fx.fire(new THREE.Vector3(1,2,3),new THREE.Vector3(11,2,3));fx.update(.05);
  const direction=new THREE.Vector3(0,1,0).applyQuaternion(fx.effects[0].flash.quaternion);assert.ok(direction.x>.99);
  for(let i=0;i<50;i++)fx.update(.05);assert.ok(fx.effects.every(f=>!f.group.visible));assert.equal(scene.children.length,count);
});
test('pirate music schedules at bounded beats and fades on pursuit end',()=>{
  const audio=new MarineAudio(),notes=[],levels=[];
  const param={setTargetAtTime:()=>{}};audio.context={currentTime:1};audio.enabled=true;audio.running=true;audio.engines=[];
  for(const k of ['engineGain','seaGain','sprayGain'])audio[k]={gain:param};audio.seaFilter={frequency:param};audio.nextGull=Infinity;
  audio.musicGain={gain:{setTargetAtTime:v=>levels.push(v)}};audio.pirateMusic=true;audio.tone=(...a)=>notes.push(a);
  const update={time:1,speed:2,throttle:0,heave:0,alive:true,parked:false};
  audio.update(update);const count=notes.length;assert.ok(count>0&&count<=3);audio.update(update);assert.equal(notes.length,count);
  audio.pirateMusic=false;audio.update(update);assert.equal(levels.at(-1),0);
});

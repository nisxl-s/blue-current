import test from 'node:test';
import assert from 'node:assert/strict';
import {chaseVoices,CHASE_TICK,marineMix} from './nautical-score.js';
import {MarineAudio} from './marine.js';

test('original chase arrangement includes rests and never exceeds three warm voices per tick',()=>{
  let rests=0;
  for(let i=0;i<48;i++){
    const voices=chaseVoices(i);if(!voices.length)rests++;
    assert.ok(voices.length<=3);assert.ok(voices.reduce((n,v)=>n+v.volume,0)<=.181);
    for(const v of voices){assert.ok(['sine','triangle'].includes(v.type));assert.ok(v.duration<1);}
    assert.deepEqual(chaseVoices(i+48),voices);
  }
  assert.ok(rests>=8);assert.ok(CHASE_TICK>.18&&CHASE_TICK<.19);
});
test('ambient mix stays bounded in storms, ducks for music, and silences hidden pages',()=>{
  const input={power:1,heave:100,gust:1,storm:1,time:10},normal=marineMix(input),chase=marineMix({...input,music:true});
  assert.ok(normal.sea<.07&&normal.rain<=.13&&normal.spray<.05&&normal.engine<.06);
  for(const key of Object.keys(normal)){assert.ok(chase[key]<normal[key]);assert.equal(marineMix({...input,hidden:true})[key],0);}
});
test('repeated splashes and blasts are rate-limited without suppressing distinct cues',()=>{
  const audio=new MarineAudio(),notes=[];audio.context={currentTime:1};audio.enabled=true;
  audio.tone=(...a)=>notes.push(a);audio.hiss=(...a)=>notes.push(a);
  audio.effect('cannon');const first=notes.length;audio.effect('cannon');assert.equal(notes.length,first);
  audio.effect('bomb-armed');assert.ok(notes.length>first);const second=notes.length;
  audio.context.currentTime=1.2;audio.effect('cannon');assert.ok(notes.length>second);
});

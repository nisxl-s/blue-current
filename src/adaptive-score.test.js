import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreMood,scoreVoices,SIGNALS} from './adaptive-score.js';
import {MarineAudio} from './marine.js';

test('score follows freedom, horror and pursuit while respecting vessel loss',()=>{
  const water={alive:true};assert.equal(scoreMood(water),'freedom');
  for(const danger of [{night:1},{storm:1},{health:20},{edge:.8},{urgent:true},{emerging:true,threat:true}])assert.equal(scoreMood({...water,...danger}),'dread');
  assert.equal(scoreMood({...water,threat:true}),'chase');assert.equal(scoreMood({alive:false,threat:true}),'silence');
  assert.equal(scoreMood({parked:true}),'freedom');
});
test('each mood has a distinct bounded arrangement and chase includes percussion',()=>{
  const arrangements={};
  for(const mood of ['freedom','dread','chase']){
    arrangements[mood]=Array.from({length:48},(_,i)=>scoreVoices(mood,i));
    for(const voices of arrangements[mood]){assert.ok(voices.length<=5);assert.ok(voices.reduce((n,v)=>n+v.volume,0)<.32);for(const v of voices)assert.ok(v.duration>0&&v.duration<4);}
  }
  assert.notDeepEqual(arrangements.freedom,arrangements.dread);assert.notDeepEqual(arrangements.dread,arrangements.chase);
  assert.ok(arrangements.chase.flat().some(v=>v.instrument==='drum'));
  assert.ok(arrangements.freedom.flat().some(v=>v.instrument==='flute'));
});
test('UI, achievement and outcome cues are distinct, muted safely, and duck the score',()=>{
  assert.notDeepEqual(SIGNALS['ui-click'],SIGNALS.warning);assert.notDeepEqual(SIGNALS.achievement,SIGNALS.victory);
  const audio=new MarineAudio(),notes=[];audio.context={currentTime:1};audio.tone=(...a)=>notes.push(a);audio.enabled=false;
  for(const kind of Object.keys(SIGNALS))audio.effect(kind);assert.equal(notes.length,0);
  audio.enabled=true;audio.effect('achievement');assert.equal(notes.length,4);assert.equal(audio.signalDuckUntil,3.5);
  audio.effect('achievement');assert.equal(notes.length,4);audio.context.currentTime=3;audio.effect('ui-click');assert.equal(notes.length,6);
});
test('orchestral rendering caps simultaneous voices and disconnects completed notes',()=>{
  const audio=new MarineAudio(),oscillators=[];let disconnected=0;
  const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){}});
  const node=()=>({connect(){return this;},disconnect(){disconnected++;}});
  audio.context={currentTime:0,createOscillator(){const o={...node(),frequency:param(),detune:param(),setPeriodicWave(){},start(){},stop(){}};oscillators.push(o);return o;},createGain:()=>({...node(),gain:param()}),createBiquadFilter:()=>({...node(),frequency:param(),Q:param()}),createStereoPanner:()=>({...node(),pan:param()})};
  audio.orchestraWaves={strings:{}};audio.musicGain=node();
  for(let i=0;i<100;i++)audio.instrument({note:60,duration:.4,volume:.05,instrument:'strings'});
  assert.equal(audio.activeVoices,40);assert.equal(oscillators.length,40);
  oscillators.forEach(o=>o.onended());assert.equal(audio.activeVoices,0);assert.equal(disconnected,160);
});

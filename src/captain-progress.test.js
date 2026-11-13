import test from 'node:test';
import assert from 'node:assert/strict';
import {createCaptainProgress,CONTRACTS,SAVE_KEY} from './captain-progress.js';
const memory=()=>{let text;return {getItem:()=>text,setItem:(_key,value)=>{text=value;}};};
const sailing={player:{x:0,z:0},speed:4,active:true,health:100,shipState:'afloat'};

test('unique discoveries and earned notifications do not duplicate on revisits or reload',()=>{
  const storage=memory(),p=createCaptainProgress(storage);
  for(let i=0;i<10;i++)p.event('salvage','Western Wreck');
  assert.equal(p.count('salvage'),1);assert.equal(p.notifications().length,1);assert.equal(p.notifications().length,0);
  const xp=p.xp();p.save();const loaded=createCaptainProgress(storage);assert.equal(loaded.xp(),xp);assert.equal(loaded.notifications().length,0);
});
test('timed cargo requires pickup and a slow arrival, and pauses with the journal',()=>{
  const p=createCaptainProgress(memory()),c=CONTRACTS[0];assert.equal(p.accept(c.id),true);assert.equal(p.accept(CONTRACTS[1].id),false);
  p.step(10,{...sailing,player:c.drop,speed:0});assert.equal(p.contract.phase,'pickup');
  p.step(.1,{...sailing,player:c.pickup,speed:3});assert.equal(p.contract.phase,'pickup');
  p.step(.1,{...sailing,player:c.pickup,speed:0});assert.equal(p.contract.phase,'sailing');
  p.step(30,{...sailing,paused:true});assert.equal(p.contract.remaining,c.seconds);
  p.step(1,{...sailing,player:c.drop,speed:0});assert.equal(p.count('deliveries'),1);assert.equal(p.contract,null);assert.equal(p.accept(c.id),false);
  const xp=p.xp();p.relaunch();assert.equal(p.xp(),xp);
});
test('cargo loss and expiry allow a clean retry without awarding renown',()=>{
  const p=createCaptainProgress(memory()),c=CONTRACTS[0];p.accept(c.id);p.step(.1,{...sailing,player:c.pickup,speed:0});
  assert.match(p.step(1,{...sailing,health:0}),/lost/);assert.equal(p.xp(),0);assert.equal(p.accept(c.id),true);
  p.step(.1,{...sailing,player:c.pickup,speed:0});p.step(c.seconds+1,sailing);assert.equal(p.contract,null);assert.equal(p.count('deliveries'),0);
});
test('storm commendation requires moving in rough weather and reaching a berth alive',()=>{
  const p=createCaptainProgress(memory());for(let i=0;i<31;i++)p.step(1,{...sailing,storm:1});assert.equal(p.count('stormHome'),0);
  p.step(1,{...sailing,shipState:'moored',speed:0});assert.equal(p.count('stormHome'),1);
  for(let i=0;i<31;i++)p.step(1,{...sailing,storm:1});p.relaunch();p.step(1,{...sailing,shipState:'moored'});assert.equal(p.count('stormHome'),1);
});
test('repair requires damaged arrival followed by full restoration; race best persists',()=>{
  const p=createCaptainProgress(memory());p.step(1,{...sailing,shipState:'moored',health:50});p.step(1,{...sailing,shipState:'moored',health:100});p.step(1,{...sailing,shipState:'moored',health:100});assert.equal(p.count('repairs'),1);
  p.race(70);p.race(52);p.race(65);assert.equal(p.state.stats.bestRace,52);assert.equal(p.count('fastRace'),1);
});
test('distance excludes paused play and clamps teleport-like displacement; cosmetics require renown',()=>{
  const p=createCaptainProgress(memory());p.step(1,{...sailing,paused:true,distance:1000});assert.equal(p.count('distance'),0);
  p.step(1,{...sailing,distance:1000});assert.equal(p.count('distance'),7);assert.equal(p.equip('night'),false);
  for(let i=0;i<5;i++)p.event('ports',String(i));p.event('defeated');assert.ok(p.xp()>=150);assert.equal(p.equip('amber'),true);
});
test('invalid or unavailable saves cannot break the game',()=>{
  const corrupted={getItem:()=>'{bad json',setItem:()=>{throw Error('blocked');}},p=createCaptainProgress(corrupted);p.event('escaped');assert.doesNotThrow(()=>p.save());assert.equal(p.saveError,true);
  const forged=createCaptainProgress({getItem:()=>JSON.stringify({version:1,stats:{distance:-7,races:'x'},sets:{ports:null},pennant:'night'})});assert.equal(forged.count('distance'),0);assert.equal(forged.state.pennant,'sea');
  const empty=createCaptainProgress({getItem:key=>key===SAVE_KEY?'null':null});assert.equal(empty.rank,'Deckhand');
});

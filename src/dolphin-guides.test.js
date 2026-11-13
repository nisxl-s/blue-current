import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createDolphinGuides} from './dolphin-guides.js';
import {createDolphin} from './dolphin.js';

test('guide pod waits for the player and completes the course only when followed',()=>{
  const oldDocument=globalThis.document;globalThis.document={createElement:()=>({}),querySelector:()=>({append:()=>{}})};
  try{
    const scene=new THREE.Scene(),messages=[],dolphins=Array.from({length:4},(_,i)=>{const d=createDolphin();d.object.position.set(i<2?8:60,0,i%2);d.navigation={x:d.object.position.x,z:d.object.position.z};scene.add(d.object);return d;}),marine={dolphins,colliders:[]};
    const guides=createDolphinGuides(scene,()=>{},{effect:()=>{}},text=>messages.push(text),marine);
    guides.setRoute([{x:0,z:0},{x:35,z:0},{x:35,z:20}]);const player={x:0,z:0},count=scene.children.length;
    for(let i=0;i<200;i++)guides.update(.05,i*.05,[],{player,active:true,paused:false,reduced:true});
    assert.ok(guides.position.x<15);assert.ok(guides.route.length>0);assert.equal(guides.mode,'circle');assert.ok(guides.pod.every(d=>dolphins.includes(d)));
    for(let i=0;i<1600&&guides.position;i++){
      const dx=guides.position.x-player.x,dz=guides.position.z-player.z,len=Math.hypot(dx,dz)||1,step=Math.min(Math.max(0,len-4),.05*5);
      player.x+=dx/len*step;player.z+=dz/len*step;guides.update(.05,10+i*.05,[],{player,speed:3,active:true,paused:false,reduced:true});
    }
    assert.equal(guides.route.length,0);assert.equal(scene.children.length,count);assert.ok(messages.some(m=>m.includes('Passage complete')));assert.ok(dolphins.every(d=>!d.guidance));
  }finally{globalThis.document=oldDocument;}
});
test('existing guides turn back for a stopped boat, circle it, and resume when it moves',()=>{
  const oldDocument=globalThis.document;globalThis.document={createElement:()=>({}),querySelector:()=>({append:()=>{}})};
  try{
    const scene=new THREE.Scene(),dolphins=Array.from({length:2},(_,i)=>{const d=createDolphin();d.object.position.set(5,0,i);d.navigation={x:5,z:i};scene.add(d.object);return d;});
    const guides=createDolphinGuides(scene,()=>{},{effect:()=>{}},()=>{},{dolphins,colliders:[]}),count=scene.children.length;
    guides.setRoute([{x:0,z:0},{x:55,z:0}]);assert.equal(scene.children.length,count);assert.equal(guides.pod[0],dolphins[0]);
    const player={x:0,z:0};for(let i=0;i<300;i++)guides.update(.05,i*.05,[],{player,speed:0,active:true,reduced:true});assert.equal(guides.mode,'circle');
    for(let i=0;i<130;i++)guides.update(.05,15+i*.05,[],{player,speed:3,active:true,reduced:true});
    assert.ok(['lead','return'].includes(guides.mode));
    for(let i=0;i<500;i++)guides.update(.05,22+i*.05,[],{player,speed:0,active:true,reduced:true});assert.equal(guides.mode,'circle');assert.ok(Math.hypot(guides.position.x,guides.position.z)<7);
    guides.update(.05,48,[],{player,speed:3,active:true,reduced:true});assert.equal(guides.mode,'lead');assert.equal(scene.children.length,count);
  }finally{globalThis.document=oldDocument;}
});

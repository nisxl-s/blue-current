import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createPirates} from './pirates.js';

test('integrated pirate pursuit fires damaging shots with bounded objects and resets cleanly',()=>{
  const oldDocument=globalThis.document,oldRandom=Math.random,nodes=new Map();
  Math.random=()=>0;
  globalThis.document={createElement:()=>({hidden:true,querySelector:key=>{if(!nodes.has(key))nodes.set(key,{style:{}});return nodes.get(key);}}),querySelector:()=>({append:()=>{}})};
  try{
    const scene=new THREE.Scene(),obstacles=[],marine={colliders:[],burst:()=>{},explode:()=>{}};let health=100;
    const raid=createPirates({scene,marine,obstacles,pulse:()=>{},takeDamage:amount=>health=Math.max(0,health-amount),toast:()=>{},audio:{effect:()=>{}},reduced:false});
    const count=scene.children.length,player=new THREE.Vector3();
    for(let t=0;t<90;t+=.1){raid.update(.1,t,[],{player,heading:0,speed:0,health,sailing:true,shipState:health>0?'afloat':'sinking',climate:{daylight:1},paused:false});}
    assert.equal(health,0);assert.equal(raid.state.result,'lost');assert.equal(scene.children.length,count);
    scene.traverse(o=>{if(o.isMesh)assert.ok(o.position.toArray().every(Number.isFinite));});
    raid.reset();assert.equal(raid.state.phase,'waiting');assert.equal(raid.state.hp,100);assert.ok(obstacles.every(o=>o.kind!=='pirate'||o.destroyed));assert.equal(raid.drop(),false);
  }finally{globalThis.document=oldDocument;Math.random=oldRandom;}
});

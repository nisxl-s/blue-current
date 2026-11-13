import test from 'node:test';
import assert from 'node:assert/strict';
import {edgeCurrent,createHullMotion} from './voyage-physics.js';
import {advanceActivity,VOYAGE_SITES} from './voyage-activities.js';

test('edge current increases outward, drags a drifting hull and permits an early boosted escape',()=>{
  assert.equal(edgeCurrent(60,0).strength,0);assert.ok(edgeCurrent(95,0).strength>edgeCurrent(80,0).strength);assert.equal(edgeCurrent(101,0).over,true);
  let x=88;for(let t=0;t<30;t+=.05)x+=edgeCurrent(x,0).x*.05;assert.ok(x>100);
  x=96;for(let t=0;t<5;t+=.05)x+=(edgeCurrent(x,0).x-12)*.05;assert.ok(x<75);
});
test('low center of gravity restores roll and heave smoothly without snapping',()=>{
  const hull=createHullMotion(),pose={height:1,pitch:.15,roll:.2};
  const first=hull.step(1/60,pose);assert.ok(first.height>0&&first.height<1);assert.ok(first.roll>0&&first.roll<.2);
  for(let i=0;i<1200;i++)hull.step(1/60,pose);assert.ok(Math.abs(hull.state.height-1.1)<.001);assert.ok(Math.abs(hull.state.roll-.2)<.001);
  for(let i=0;i<600;i++)hull.step(.05,{height:Math.sin(i*.2)*3,pitch:Math.sin(i)*.6,roll:Math.cos(i)*.6},{speed:7,steering:Math.sin(i),health:30,wind:1});
  for(const v of Object.values(hull.state))assert.ok(Number.isFinite(v));hull.reset();assert.equal(hull.state.yawRate,0);
});
test('salvage and survey progress require proximity, slow speed and deliberate interaction',()=>{
  const site={type:'salvage'};assert.equal(advanceActivity(site,0,1,{distance:3,speed:0,interact:false}),0);
  assert.equal(advanceActivity(site,0,4,{distance:3,speed:1,interact:true}),1);
  assert.equal(advanceActivity(site,0,4,{distance:3,speed:5,interact:true}),0);
  assert.ok(VOYAGE_SITES.some(s=>s.x<-40));assert.ok(VOYAGE_SITES.some(s=>s.x>40));assert.ok(VOYAGE_SITES.some(s=>s.z>50));assert.ok(VOYAGE_SITES.some(s=>s.z<-50));
});

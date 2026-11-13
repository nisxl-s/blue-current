import test from 'node:test';
import assert from 'node:assert/strict';
import {planVoyageRoute,routeSolids,clearSeaSegment} from './sea-route.js';
import {attachMouseCamera} from './mouse-camera.js';
import {swellBearing} from './climate.js';
import {setSeaWeather,waterHeight,hullWaterPose,WAVES} from './marine.js';

test('multi-stop dolphin routes detour around islands and end in safe water',()=>{
  const obstacles=[{x:0,z:0,r:7,kind:'island'},{x:25,z:10,r:3,kind:'rock'}],solids=routeSolids(obstacles);
  const route=planVoyageRoute({x:-30,z:0},[{x:30,z:0},{x:0,z:0}],obstacles);assert.ok(route.length>3);
  for(let i=1;i<route.length;i++)assert.ok(clearSeaSegment(route[i-1],route[i],solids));
  assert.ok(Math.hypot(route.at(-1).x,route.at(-1).z)>10);
});
test('mouse dragging orbits and pans; wheel preserves the opening zoom-out limit',()=>{
  let value=1,wheel;const canvas={addEventListener:(name,fn)=>{if(name==='wheel')wheel=fn;},setPointerCapture:()=>{}};
  const controls=attachMouseCamera(canvas,{zoom:v=>value=v,getZoom:()=>value,minZoom:()=>.56});
  canvas.onpointerdown({button:0,clientX:10,clientY:10,pointerId:1});canvas.onpointermove({clientX:60,clientY:40});assert.notEqual(controls.view.yaw,0);canvas.onpointerup();
  canvas.onpointerdown({button:0,shiftKey:true,clientX:0,clientY:0,pointerId:1});canvas.onpointermove({clientX:10,clientY:10});assert.notEqual(controls.view.panX,0);
  for(let i=0;i<20;i++)wheel({deltaY:150,preventDefault:()=>{}});assert.equal(value,.56);controls.reset();assert.equal(controls.view.yaw,0);
});
test('swell bearing changes over time without a direction snap at front boundaries',()=>{
  assert.ok(Math.abs(Math.sin(swellBearing(0)-swellBearing(160)))>.1);
  for(let t=0;t<600;t+=.1){const a=swellBearing(t),b=swellBearing(t+.01);assert.ok(Math.abs(Math.atan2(Math.sin(b-a),Math.cos(b-a)))<.002);}
});
test('rotated waves preserve CPU surface and bow-to-stern support changes reverse pitch',()=>{
  const base=waterHeight(7,-4,3);setSeaWeather({waveScale:1,storm:0,swellDirection:Math.PI/2});assert.ok(Math.abs(waterHeight(4,7,3)-base)<1e-9);
  const original=WAVES.slice();try{
    WAVES.splice(0,WAVES.length,{a:.5,x:0,z:.5,w:1});setSeaWeather({waveScale:1,storm:0});
    const bow=hullWaterPose(0,0,Math.PI,0),stern=hullWaterPose(0,0,Math.PI,Math.PI);
    assert.ok(bow.bow>bow.stern&&bow.pitch>0);assert.ok(stern.stern>stern.bow&&stern.pitch<0);
  }finally{WAVES.splice(0,WAVES.length,...original);setSeaWeather({waveScale:1,storm:0});}
});

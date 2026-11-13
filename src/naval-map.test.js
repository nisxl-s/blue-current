import test from 'node:test';
import assert from 'node:assert/strict';
import {createNavalMap} from './naval-map.js';

test('side minimap expands and chart clicks place bounded waypoints without teleporting',()=>{
  const oldDocument=globalThis.document;let opened=0,draws=0;
  const ctx=new Proxy({createRadialGradient:()=>({addColorStop:()=>{}})},{get:(o,k)=>k in o?o[k]:()=>{if(k==='fillRect')draws++;}});
  const canvas=()=>({width:1000,height:1000,getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:500,height:500})});
  const small=canvas(),large=canvas(),nodes=new Map(),button={classList:{add:()=>{}},setAttribute:()=>{},querySelector:()=>({})};
  const dialog={open:false,querySelector:key=>{if(key==='canvas')return large;if(!nodes.has(key))nodes.set(key,{});return nodes.get(key);},showModal(){this.open=true;},close(){this.open=false;}};
  globalThis.document={getElementById:id=>id==='minimap'?small:button,createElement:()=>dialog,querySelector:()=>({append:()=>{}}),querySelectorAll:()=>[],body:{append:()=>{}}};
  try{
    const map=createNavalMap({destinations:[],obstacles:[],onOpen:()=>opened++}),player={x:0,z:0};map.draw({player,heading:0});button.onclick();assert.equal(dialog.open,true);assert.equal(opened,1);
    large.onclick({clientX:375,clientY:250});assert.equal(map.waypoint.x,55);assert.equal(map.waypoint.z,0);assert.deepEqual(player,{x:0,z:0});
    large.onclick({clientX:500,clientY:250});assert.equal(map.waypoint.x,55);assert.ok(draws>=2);
    large.onwheel({deltaY:-1,preventDefault:()=>{}});large.onclick({clientX:375,clientY:250});assert.ok(map.waypoint.x<55,'expanded chart zoom must change pointer world coordinates');
    nodes.get('.clear-waypoint').onclick();assert.equal(map.waypoint,null);
  }finally{globalThis.document=oldDocument;}
});

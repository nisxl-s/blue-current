import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSurf} from './surf.js';

function fixture(){const scene=new THREE.Scene(),boat=new THREE.Group();boat.position.set(1000,0,1000);scene.add(boat);return createSurf({scene,obstacles:[{kind:'island',x:0,z:0,r:5},{kind:'rock',x:9,z:0,r:1}],marine:{colliders:[],floaters:[]},boat,pulse:()=>{},onSound:()=>{}});}
test('passing wave crests trigger shoreline and rock impacts without boat collisions',()=>{
  const surf=fixture();for(let i=0;i<900;i++)surf.update(1/60,i/60,[],new THREE.Vector3(6,0,0),false);
  assert.ok(surf.hitCount>10,'repeated incident crests must hit the actual shoreline samples');surf.reset();assert.equal(surf.hitCount,0);
});
test('reduced motion disables automatic surf spray',()=>{
  const surf=fixture();for(let i=0;i<300;i++)surf.update(1/60,i/60,[],new THREE.Vector3(6,0,0),true);assert.equal(surf.hitCount,0);
});

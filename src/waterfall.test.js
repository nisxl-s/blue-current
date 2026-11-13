import test from 'node:test';
import assert from 'node:assert/strict';
import {createWaterfallGeometry} from './ocean-edge.js';
import {portBriefs} from './port-briefs.js';

test('waterfall leaves the rim almost horizontally and bends into a steep falling sheet',()=>{
  const geo=createWaterfallGeometry(),p=geo.attributes.position,stride=257;
  const radius=i=>Math.hypot(p.getX(i),p.getZ(i));
  assert.ok(Math.abs(radius(0)-100)<.001);assert.ok(Math.abs(p.getY(0))<.001);
  const initialSlope=Math.abs((p.getY(stride)-p.getY(0))/(radius(stride)-radius(0)));
  assert.ok(initialSlope<.1,'lip must roll over instead of dropping vertically');
  const last=40*stride;assert.ok(radius(last)>118);assert.ok(p.getY(last)<-48);
  for(let j=1;j<=40;j++){assert.ok(radius(j*stride)>radius((j-1)*stride));assert.ok(p.getY(j*stride)<p.getY((j-1)*stride));}
  assert.ok(Array.from(p.array).every(Number.isFinite));geo.dispose();
});
test('port descriptions present the actual world without demo or placeholder copy',()=>{
  for(const text of Object.values(portBriefs))assert.doesNotMatch(text,/\bdemo\b|illustrative|placeholder|replace this|prototype/i);
  assert.match(portBriefs.work,/regatta/i);assert.match(portBriefs.contact,/dolphin/i);
});

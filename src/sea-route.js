const RADIUS=94,STEP=3.5,LIMIT=27;
export function routeSolids(items){return items.filter(o=>!o.destroyed&&['island','rock','dock'].includes(o.kind)).map(o=>({x:o.x,z:o.z,r:o.r*(o.kind==='island'?1.12:1)+3}));}
export function clearSeaSegment(a,b,solids){
  if(Math.hypot(a.x,a.z)>RADIUS||Math.hypot(b.x,b.z)>RADIUS)return false;
  const dx=b.x-a.x,dz=b.z-a.z,len=dx*dx+dz*dz;
  return solids.every(o=>{const t=len?Math.max(0,Math.min(1,((o.x-a.x)*dx+(o.z-a.z)*dz)/len)):0;return Math.hypot(a.x+dx*t-o.x,a.z+dz*t-o.z)>o.r;});
}
function seaPoint(p,solids){
  for(let r=0;r<25;r++)for(let j=0;j<(r?32:1);j++){const a=j/32*Math.PI*2,q={x:p.x+Math.cos(a)*r,z:p.z+Math.sin(a)*r};if(clearSeaSegment(q,q,solids))return q;}return null;
}
export function planSeaLeg(start,goal,solids){
  const a=seaPoint(start,solids),b=seaPoint(goal,solids);if(!a||!b)return [];
  if(clearSeaSegment(a,b,solids))return [a,b];
  const key=(x,z)=>`${x},${z}`,world=(x,z)=>({x:x*STEP,z:z*STEP});
  function nearest(p){let best=null,distance=Infinity;for(let x=-LIMIT;x<=LIMIT;x++)for(let z=-LIMIT;z<=LIMIT;z++){const q=world(x,z),d=Math.hypot(q.x-p.x,q.z-p.z);if(d<distance&&clearSeaSegment(p,q,solids)){best={x,z};distance=d;}}return best;}
  const s=nearest(a),g=nearest(b);if(!s||!g)return [];
  const nodes=new Map(),open=[],closed=new Set();const first={...s,g:0,f:0,parent:null};nodes.set(key(s.x,s.z),first);open.push(first);
  let end=null;
  while(open.length&&closed.size<4000){open.sort((a,b)=>b.f-a.f);const n=open.pop(),k=key(n.x,n.z);if(closed.has(k))continue;closed.add(k);if(n.x===g.x&&n.z===g.z){end=n;break;}
    for(const dx of [-1,0,1])for(const dz of [-1,0,1]){if(!dx&&!dz)continue;const x=n.x+dx,z=n.z+dz,k2=key(x,z);if(Math.abs(x)>LIMIT||Math.abs(z)>LIMIT||closed.has(k2)||!clearSeaSegment(world(n.x,n.z),world(x,z),solids))continue;
      const cost=n.g+Math.hypot(dx,dz),old=nodes.get(k2);if(old&&old.g<=cost)continue;const next={x,z,g:cost,f:cost+Math.hypot(g.x-x,g.z-z),parent:n};nodes.set(k2,next);open.push(next);
    }
  }
  if(!end)return [];
  const raw=[b];for(let n=end;n;n=n.parent)raw.push(world(n.x,n.z));raw.push(a);raw.reverse();
  const path=[raw[0]];let i=0;while(i<raw.length-1){let next=raw.length-1;while(next>i+1&&!clearSeaSegment(raw[i],raw[next],solids))next--;path.push(raw[next]);i=next;}return path;
}
export function planVoyageRoute(start,stops,items){
  const solids=routeSolids(items),route=[];let cursor=start;
  for(const stop of stops){const leg=planSeaLeg(cursor,stop,solids);if(!leg.length)return [];route.push(...(route.length?leg.slice(1):leg));cursor=leg.at(-1);}return route;
}

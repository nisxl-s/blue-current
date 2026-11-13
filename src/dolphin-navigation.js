const MARGIN=1.9;
export function dolphinObstacles(items,player){
  return [...items.filter(o=>!o.destroyed).map(o=>({x:o.x,z:o.z,r:o.r*(o.kind==='island'?1.2:1)+MARGIN})),{x:player.x,z:player.z,r:4.5}];
}
export function openDolphinPosition(x,z,obstacles){
  // Spawn once in clear water; moving dolphins use a continuous swept collision check.
  for(let ring=0;ring<30;ring++)for(let j=0;j<(ring?24:1);j++){
    const a=j/24*Math.PI*2,p={x:x+Math.cos(a)*ring,z:z+Math.sin(a)*ring};
    if(obstacles.every(o=>Math.hypot(p.x-o.x,p.z-o.z)>o.r+.05))return p;
  }
  return null;
}
export function advanceDolphin(position,target,dt,obstacles,swimSpeed=3){
  let vx=target.x-position.x,vz=target.z-position.z;
  const len=Math.hypot(vx,vz)||1;vx=vx/len*swimSpeed;vz=vz/len*swimSpeed;
  for(const o of obstacles){
    const dx=position.x-o.x,dz=position.z-o.z,d=Math.hypot(dx,dz)||.001;
    if(d<o.r+4){
      const force=Math.max(0,1-(d-o.r)/4)*4;
      const sign=dx*vz-dz*vx>=0?1:-1;
      vx+=(dx/d-dz/d*sign*.9)*force;vz+=(dz/d+dx/d*sign*.9)*force;
    }
  }
  const speed=Math.hypot(vx,vz)||1;vx=vx/speed*swimSpeed;vz=vz/speed*swimSpeed;
  const blend=1-Math.exp(-dt*1.7);
  vx=(position.vx??vx)+(vx-(position.vx??vx))*blend;
  vz=(position.vz??vz)+(vz-(position.vz??vz))*blend;
  const sx=vx*dt,sz=vz*dt;let fraction=1;
  for(const o of obstacles){
    const dx=position.x-o.x,dz=position.z-o.z,A=sx*sx+sz*sz,B=2*(dx*sx+dz*sz),C=dx*dx+dz*dz-o.r*o.r;
    if(C<=0){if(dx*sx+dz*sz<0)fraction=0;continue;}
    const discriminant=B*B-4*A*C;
    if(A>0&&discriminant>=0){const hit=(-B-Math.sqrt(discriminant))/(2*A);if(hit>=0&&hit<=1)fraction=Math.min(fraction,Math.max(0,hit-.01));}
  }
  return {x:position.x+sx*fraction,z:position.z+sz*fraction,heading:Math.atan2(-vx,-vz),vx:vx*fraction,vz:vz*fraction};
}

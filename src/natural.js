import * as THREE from 'three';

// Continuous, deterministic contours: duplicated seam vertices receive identical offsets.
export function weatheredStone(radius, seed=0) {
  const geo=new THREE.SphereGeometry(radius,24,16);
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i)/radius,y=p.getY(i)/radius,z=p.getZ(i)/radius;
    const wear=1+.09*Math.sin(x*4.1+y*2.3+seed)*Math.cos(z*3.7-seed)
      +.045*Math.sin(y*7+z*3+seed*.7);
    p.setXYZ(i,x*radius*wear,y*radius*wear,z*radius*wear);
  }
  geo.computeVertexNormals();
  return geo;
}

export function shoreline(radius,seed=0,submerged=false){
  const segments=96,rings=12,positions=[],colors=[],indices=[];
  const dry=new THREE.Color('#f1dfac'),wet=new THREE.Color('#c6bb91');
  for(let j=0;j<=rings;j++){
    const t=j/rings;
    for(let i=0;i<=segments;i++){
      const a=(i%segments)/segments*Math.PI*2;
      const contour=1+.045*Math.sin(3*a+seed)+.027*Math.sin(5*a-seed*.8)+.016*Math.cos(9*a+seed);
      const r=radius*t*contour*(submerged?1.3:1);
      const undulation=(.045*Math.sin(a*4+seed)+.025*Math.cos(a*7-seed))*Math.sin(t*Math.PI);
      const y=submerged?-.82+.08*Math.sin(t*Math.PI):.70-1.38*Math.pow(t,5)+undulation;
      positions.push(Math.cos(a)*r,y,Math.sin(a)*r);
      const c=dry.clone().lerp(wet,THREE.MathUtils.smoothstep(t,.76,1));
      c.multiplyScalar(1+.018*Math.sin(a*6+t*13+seed));colors.push(c.r,c.g,c.b);
      if(j<rings&&i<segments){const k=j*(segments+1)+i;indices.push(k,k+1,k+segments+1,k+1,k+segments+2,k+segments+1);}
    }
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}


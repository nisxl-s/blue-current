import * as THREE from 'three';

// Capture the world behind the surface so shallow objects can remain visible through it.
export function createWaterView(renderer,water,camera){
  const target=new THREE.WebGLRenderTarget(1,1,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});
  target.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
  Object.assign(water.material.uniforms,{
    uUnderColor:{value:target.texture},uUnderDepth:{value:target.depthTexture},uResolution:{value:new THREE.Vector2(1,1)},
    uUnderTexel:{value:new THREE.Vector2(1,1)},uInverseProjection:{value:camera.projectionMatrixInverse},uCameraWorld:{value:camera.matrixWorld},
    uFogColor:{value:new THREE.Color()},uFogRange:{value:new THREE.Vector2(40,120)},uSunset:{value:0}
  });
  const size=new THREE.Vector2();
  function capture(scene){
    renderer.getDrawingBufferSize(size);
    const width=Math.max(1,Math.round(size.x*.5)),height=Math.max(1,Math.round(size.y*.5));
    if(target.width!==width||target.height!==height){target.setSize(width,height);water.material.uniforms.uUnderTexel.value.set(1/width,1/height);}
    water.material.uniforms.uResolution.value.copy(size);
    const previous=renderer.getRenderTarget(),visible=water.visible,skirt=water.userData.skirt;
    const skirtVisible=skirt?.visible;
    const shadowUpdate=renderer.shadowMap?.needsUpdate;
    try{water.visible=false;if(skirt)skirt.visible=false;if(renderer.shadowMap)renderer.shadowMap.needsUpdate=false;renderer.setRenderTarget(target);renderer.render(scene,camera);}
    finally{water.visible=visible;if(skirt)skirt.visible=skirtVisible;if(renderer.shadowMap)renderer.shadowMap.needsUpdate=shadowUpdate;renderer.setRenderTarget(previous);}
  }
  return {capture,target};
}

export function createOceanSkirt(water,scene){
  const radii=[130,180,260,380,550,800],positions=[],indices=[],n=128;
  for(const r of radii)for(let i=0;i<n;i++){
    const a=i/n*Math.PI*2,c=Math.cos(a),s=Math.sin(a),scale=r/Math.max(Math.abs(c),Math.abs(s));
    positions.push(c*scale,0,s*scale);
  }
  for(let j=0;j<radii.length-1;j++)for(let i=0;i<n;i++){
    const a=j*n+i,b=j*n+(i+1)%n,c=a+n,d=b+n;indices.push(a,b,c,b,d,c);
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);
  const skirt=new THREE.Mesh(geo,water.material);skirt.position.y=water.position.y;scene.add(skirt);water.userData.skirt=skirt;return skirt;
}

export function fogRange(distance,viewHeight,storm=0){
  return {near:Math.max(10,distance-18),far:distance+Math.max(28,viewHeight*1.15)*(1-storm*.32)};
}
export function sunriseFogDensity(distance,strength){return strength*.012*60/Math.max(35,distance);}

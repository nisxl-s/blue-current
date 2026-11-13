import * as THREE from 'three';

export function createCloudLayer(scene){
  const uniforms={time:{value:0},storm:{value:0},daylight:{value:1}};
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,side:THREE.BackSide,uniforms,
    vertexShader:'varying vec3 vDirection;void main(){vDirection=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`
      varying vec3 vDirection;uniform float time;uniform float storm;uniform float daylight;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
      float fbm(vec2 p){float n=0.,a=.55;for(int i=0;i<4;i++){n+=a*noise(p);p=p*2.03+vec2(7.3,3.1);a*=.5;}return n;}
      void main(){
        vec3 direction=normalize(vDirection);
        vec2 p=direction.xz*8.+vec2(time*.007,time*.002);
        float n=fbm(p+fbm(p*.7));
        float edge=smoothstep(.02,.24,direction.y);
        float density=smoothstep(.46-storm*.12,.72,n);
        float shade=clamp(.5+(fbm(p+vec2(0.,.12))-n)*4.,0.,1.);
        vec3 color=mix(vec3(.62,.69,.72),vec3(1.,.96,.86),shade);
        color*=mix(vec3(.18,.24,.34),vec3(1.),daylight);color*=1.-storm*.35;
        gl_FragColor=vec4(color,density*edge*(.6+storm*.24));
      }`});
  // A camera-centred sky shell cannot intersect the sailing camera like a low cloud sheet.
  const dome=new THREE.Mesh(new THREE.SphereGeometry(350,32,16),material);
  dome.frustumCulled=false;
  dome.onBeforeRender=(_renderer,_scene,camera)=>{dome.position.copy(camera.position);dome.updateMatrixWorld();};
  scene.add(dome);
  const layers=[dome];
  return {update(time,weather){uniforms.time.value=time;uniforms.storm.value=weather.storm;uniforms.daylight.value=weather.daylight;},layers};
}


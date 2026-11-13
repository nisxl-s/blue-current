import * as THREE from 'three';
import {WAVE_GLSL} from './marine.js';
import {OCEAN_RADIUS} from './voyage-physics.js';

export function createOceanEdge(scene,uniforms){
  const geo=createWaterfallGeometry();
  const material=new THREE.ShaderMaterial({uniforms,side:THREE.DoubleSide,transparent:true,depthWrite:false,
    vertexShader:`uniform float uTime;varying vec2 vUv;${WAVE_GLSL} void main(){vUv=uv;vec3 p=position;p.y+=(seaHeight(p.xz,uTime)-.07)*pow(uv.y,6.);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader:`uniform float uTime;uniform vec4 uWeather;varying vec2 vUv;void main(){float travel=sqrt(max(0.,1.-vUv.y));float ribbons=.5+.5*sin(vUv.x*1560.+sin(vUv.x*290.)*3.+sin(travel*24.-uTime*3.)*.25);float streams=pow(ribbons,5.);float flow=pow(.5+.5*sin(travel*65.-uTime*10.+sin(vUv.x*410.)*2.),8.);vec3 c=mix(vec3(.035,.30,.38),vec3(.71,.93,.92),streams*.55+flow*.3);c=mix(c,vec3(.86,.98,.94),pow(vUv.y,22.)*.65);c*=mix(.3,1.,uWeather.w);float breakup=mix(.45,.95,smoothstep(.12,.75,vUv.y));gl_FragColor=vec4(c,smoothstep(0.,.16,vUv.y)*breakup);}`});
  const curtain=new THREE.Mesh(geo,material);scene.add(curtain);
  const foam=new THREE.Mesh(new THREE.RingGeometry(97.8,100.3,256,4),new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,
    vertexShader:`uniform float uTime;varying vec2 vUv;${WAVE_GLSL} void main(){vUv=uv;vec3 p=position;vec3 world=(modelMatrix*vec4(p,1.)).xyz;world.y=seaHeight(world.xz,uTime)-.015;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}`,
    fragmentShader:'uniform float uTime;varying vec2 vUv;void main(){float n=sin(vUv.x*740.+uTime*4.)*sin(vUv.y*615.-uTime*3.);gl_FragColor=vec4(.8,.97,.92,.28+max(0.,n)*.3);}'}));foam.rotation.x=-Math.PI/2;scene.add(foam);
  const p=[];for(let i=0;i<650;i++){const a=i/650*Math.PI*2,r=115+Math.sin(i*3.7)*3;p.push(Math.cos(a)*r,-30-(i%17),Math.sin(a)*r);}
  const mist=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(p,3)),new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,
    vertexShader:'uniform float uTime;void main(){vec3 p=position;float age=mod(uTime*.32+float(gl_VertexID)*.071,1.);p.y+=age*9.;p.xz*=1.+age*.025;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=3.+age*5.;}',
    fragmentShader:'void main(){float r=length(gl_PointCoord-.5);gl_FragColor=vec4(.75,.94,.92,(1.-smoothstep(.08,.5,r))*.17);}'}));scene.add(mist);
  return {curtain,foam,mist};
}

export function createWaterfallGeometry(){
  const positions=[],uv=[],indices=[],around=256,down=40;
  for(let j=0;j<=down;j++){
    const t=j/down*3.15,y=-4.9*t*t;
    for(let i=0;i<=around;i++){const a=(i%around)/around*Math.PI*2,r=OCEAN_RADIUS+6*t+Math.sin(a*17)*.12*t;positions.push(Math.cos(a)*r,y,Math.sin(a)*r);uv.push(i/around,1-j/down);}
  }
  for(let j=0;j<down;j++)for(let i=0;i<around;i++){const a=j*(around+1)+i,b=a+around+1;indices.push(a,b,a+1,a+1,b,b+1);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);return geo;
}

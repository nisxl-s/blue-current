import {WAVE_GLSL} from './marine.js';

export function applyWetSurface(material,uniforms){
  material.onBeforeCompile=shader=>{
    shader.uniforms.uSwell=uniforms.uSwell;shader.uniforms.uWeather=uniforms.uWeather;shader.uniforms.uTime=uniforms.uTime;shader.uniforms.uPulses=uniforms.uPulses;shader.uniforms.uShores=uniforms.uShores;
    shader.vertexShader=`varying vec3 vWetWorld;\n${shader.vertexShader}`.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWetWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
    shader.fragmentShader=`uniform float uTime;varying vec3 vWetWorld;\n${WAVE_GLSL}\n${shader.fragmentShader}`.replace('#include <color_fragment>',`#include <color_fragment>
      float waterline=max(seaHeight(vWetWorld.xz,uTime)-.07,tideLevel(uTime)+.2);
      float wet=1.-smoothstep(.0,.45,vWetWorld.y-waterline);
      diffuseColor.rgb*=mix(1.,.63,wet);`);
  };
  material.customProgramCacheKey=()=> 'wave-washed-surface-v1';material.needsUpdate=true;
}

export const waterVertex=`
uniform float uTime;
varying vec3 vWorld;
varying float vWave;
varying vec2 vSlope;
varying float vFogDepth;
${WAVE_GLSL}
void main(){
  vec3 p=position;
  float h=seaHeight(p.xz,uTime);
  p.y=h;
  vWave=h;
  vSlope=vec2(seaHeight(p.xz+vec2(.18,0.),uTime)-h,seaHeight(p.xz+vec2(0.,.18),uTime)-h)/.18;
  vWorld=(modelMatrix*vec4(p,1.)).xyz;
  vFogDepth=-(viewMatrix*vec4(vWorld,1.)).z;
  gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);
}`;

export const waterFragment=`
uniform float uTime;
uniform vec2 uBoat;
uniform float uSpeed;
uniform float uHeading;
uniform vec4 uWeather;
uniform vec2 uSwell;
uniform vec3 uShores[12];
uniform vec3 uFogColor;
uniform vec2 uFogRange;
uniform float uFogStrength;
uniform float uFogDensity;
uniform float uSunset;
#ifdef WATER_TRANSMISSION
uniform sampler2D uUnderColor;
uniform sampler2D uUnderDepth;
uniform vec2 uResolution;
uniform vec2 uUnderTexel;
uniform mat4 uInverseProjection;
uniform mat4 uCameraWorld;
#endif
varying vec3 vWorld;
varying float vWave;
varying vec2 vSlope;
varying float vFogDepth;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
float foamNoise(vec2 p){return noise(p)*.65+noise(p*2.7)*.25+noise(p*6.1)*.1;}
void main(){
  vec2 p=vWorld.xz;
  if(length(p)>100.)discard;
  float t=uTime;
  float tide=.20*sin(t*.069813170080)+.055*sin(t*.17);
  vec2 swellP=vec2(p.x*uSwell.x+p.y*uSwell.y,-p.x*uSwell.y+p.y*uSwell.x);
  float primary=sin(dot(swellP,vec2(.24,.10))+t*1.08);
  float secondary=sin(dot(swellP,vec2(-.15,.34))+t*1.4);
  vec2 micro=vec2(sin(p.x*3.+p.y*2.+t*2.5),cos(p.y*4.-p.x*2.+t*2.1))*.035;
  vec3 normal=normalize(vec3(-vSlope.x+micro.x,1.,-vSlope.y+micro.y));
  vec3 viewDir=normalize(cameraPosition-vWorld);
  float fresnel=pow(1.-max(0.,dot(viewDir,normal)),3.);
  vec3 trough=vec3(.035,.31,.40),crest=vec3(.14,.59,.64);
  vec3 col=mix(trough,crest,clamp(.48+(vWave-tide)*.65+normal.z*.4,0.,1.));
  col=mix(col,vec3(.64,.83,.83),fresnel*.7);
  vec3 sunDir=normalize(vec3(-.35,.9,.4));
  float specular=pow(max(0.,dot(reflect(-sunDir,normal),viewDir)),65.);
  col+=vec3(.98,.91,.71)*specular*.65;
  float foamGrain=foamNoise(p*.9+vec2(t*.12,-t*.08));
  float whitecaps=smoothstep(.86,.995,primary)*smoothstep(.38,.73,foamGrain)*.7;
  whitecaps=max(whitecaps,smoothstep(.95,1.,secondary)*smoothstep(.6,.85,foamGrain)*.3);
  float foam=whitecaps;
  for(int i=0;i<12;i++){
    vec3 shore=uShores[i];vec2 radial=p-shore.xy;float len=length(radial);
    float d=len-shore.z*1.075+tide*.55;
    vec2 swellDir=vec2(.923*uSwell.x-.385*uSwell.y,.923*uSwell.y+.385*uSwell.x);
    float facing=max(0.,dot(radial/max(len,.001),swellDir));
    float incoming=sin(dot(swellP,vec2(.24,.10))+t*1.08);
    float runup=.25+max(0.,incoming)*1.45;
    float shoreBand=1.-smoothstep(.3,1.55,abs(d-runup*.3));
    float breaking=smoothstep(-.05,.85,incoming)*shoreBand*(.3+facing*.7);
    foam=max(foam,breaking*smoothstep(.12,.65,foamGrain)*.95);
    float outgoing=sin(dot(shore.xy,vec2(.24,.1))+t*1.08-max(0.,d)*.7);
    foam=max(foam,smoothstep(.9,1.,outgoing)*(1.-smoothstep(1.3,4.5,d))*smoothstep(.2,1.,d)*facing*.26);
    if(d>-.7&&d<4.5)col=mix(col,vec3(.22,.70,.66),(1.-smoothstep(0.,4.5,d))*.46);
  }
  vec2 offset=p-uBoat;
  float aft=dot(offset,vec2(sin(uHeading),cos(uHeading)));
  float cross=dot(offset,vec2(cos(uHeading),-sin(uHeading)));
  float wake=(1.-smoothstep(.05,.5,abs(abs(cross)-aft*.35)))*smoothstep(1.5,3.,aft)*(1.-smoothstep(4.,14.,aft))*uSpeed;
  foam=max(foam,wake*(.4+foamGrain*.5));
  float rim=smoothstep(74.,99.,length(p));
  float outward=smoothstep(.92,1.,sin(length(p)*3.-t*7.+sin(atan(p.y,p.x)*110.)*2.));
  foam=max(foam,outward*rim*.6);
  col=mix(col,vec3(.88,.96,.91),clamp(foam,0.,.95));

  col*=mix(vec3(.12,.19,.31),vec3(1.),uWeather.w);
  col=mix(col,col*.65,uWeather.y*.35);
#ifdef WATER_TRANSMISSION
  vec2 screenUv=gl_FragCoord.xy/uResolution;
  float sceneDepth=texture2D(uUnderDepth,screenUv).r;
  vec4 viewPoint=uInverseProjection*vec4(screenUv*2.-1.,sceneDepth*2.-1.,1.);
  vec3 submergedWorld=(uCameraWorld*vec4(viewPoint.xyz/viewPoint.w,1.)).xyz;
  float waterDepth=max(0.,vWorld.y-submergedWorld.y);
  vec2 pixel=uUnderTexel;
  vec2 offsetUv=normal.xz*.0008*min(waterDepth,1.5);
  float blurRadius=.35+min(waterDepth,3.)*.85;
  vec2 sampleUv=screenUv+offsetUv;
  // Soft asymmetric kernel avoids a visible cross or duplicated object silhouette.
  vec3 submerged=texture2D(uUnderColor,sampleUv).rgb*.4;
  submerged+=texture2D(uUnderColor,sampleUv+pixel*vec2(.94,.35)*blurRadius).rgb*.15;
  submerged+=texture2D(uUnderColor,sampleUv+pixel*vec2(-.42,.91)*blurRadius).rgb*.15;
  submerged+=texture2D(uUnderColor,sampleUv+pixel*vec2(-.86,-.51)*blurRadius).rgb*.15;
  submerged+=texture2D(uUnderColor,sampleUv+pixel*vec2(.51,-.86)*blurRadius).rgb*.15;  submerged=mix(submerged,col,1.-exp(-waterDepth*.32));
  float shallowVisibility=.76*exp(-waterDepth*.5)*(1.-fresnel*.75)*(1.-clamp(foam,0.,1.)*.9);
  col=mix(col,submerged,shallowVisibility);
#endif
  float sunsetGlitter=pow(max(0.,dot(reflect(normalize(vec3(-.6,-.22,.5)),normal),viewDir)),14.);
  col=mix(col,col*vec3(1.2,1.03,.8)+vec3(.07,.025,0.),uSunset*.55);
  col+=vec3(1.,.56,.16)*uSunset*(sunsetGlitter*.9+.075);
  col=mix(col,uFogColor,1.-exp(-uFogDensity*uFogDensity*vFogDepth*vFogDepth));
  gl_FragColor=vec4(col,1.);
}`;








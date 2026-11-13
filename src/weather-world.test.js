import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWeatherWorld} from './weather-world.js';
import {setSeaWeather} from './marine.js';

test('weather scene survives an entire day with bounded rain and deck effect pools',()=>{
  const oldDocument=globalThis.document,labels=new Map();
  globalThis.document={createElement:()=>({querySelector:key=>{if(!labels.has(key))labels.set(key,{});return labels.get(key);}}),querySelector:()=>({append:()=>{}})};
  try{
    const scene=new THREE.Scene();scene.fog=new THREE.Fog('#ffffff',100,220);
    const boat=new THREE.Group();boat.userData.sails=[];scene.add(boat);
    const water={material:{uniforms:{uWeather:{value:new THREE.Vector4()}}}},sun=new THREE.DirectionalLight(),hemisphere=new THREE.HemisphereLight();
    const fx=createWeatherWorld({scene,boat,water,sun,hemisphere,renderer:{setClearColor:()=>{}},scenery:{windows:[],trees:[],lamps:[]},audio:{effect:()=>{}},reduced:false});
    const count=scene.children.length;let weather;
    for(let t=0;t<481;t+=.5)weather=fx.update(.5,t,[],new THREE.Vector3(0,0,7),'afloat');
    assert.equal(scene.children.length,count);assert.ok(weather.daylight>.9);
    scene.traverse(o=>{if(o.geometry?.attributes.position)assert.ok(Array.from(o.geometry.attributes.position.array).every(Number.isFinite));});
    fx.resetDeck();
  }finally{globalThis.document=oldDocument;setSeaWeather({waveScale:1,storm:0});}
});

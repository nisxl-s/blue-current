// The CPU and GPU use these identical wave terms. Time freezes in reduced-motion mode.
export const WAVES = [
  { a: .48, x: .24, z: .10, w: 1.08 },
  { a: .22, x: -.15, z: .34, w: 1.40 },
  { a: .105, x: .75, z: .45, w: 2.40 },
];
// One accelerated tidal cycle takes 90 seconds, so its effect is visible in a visit.
export const TIDE_PERIOD=90;
const barriers=[];
let seaWeather={waveScale:1,storm:0,cos:1,sin:0};
export function setSeaWeather(state){const angle=state.swellDirection??0;seaWeather={waveScale:state.waveScale,storm:state.storm,cos:Math.cos(angle),sin:Math.sin(angle)};}
export function waveDirection(){return {x:.923*seaWeather.cos-.385*seaWeather.sin,z:.923*seaWeather.sin+.385*seaWeather.cos};}
export function setWaveBarriers(items){barriers.splice(0,barriers.length,...items.slice(0,12).map(v=>({x:v.x,z:v.z,r:v.r})));}
export function tideLevel(t){return .20*Math.sin(t*Math.PI*2/TIDE_PERIOD)+.055*Math.sin(t*.17);}
export function tideRate(t){return .20*Math.PI*2/TIDE_PERIOD*Math.cos(t*Math.PI*2/TIDE_PERIOD)+.055*.17*Math.cos(t*.17);}
export const WAVE_GLSL = `
uniform vec4 uPulses[8];
uniform vec3 uShores[12];
uniform vec4 uWeather;
uniform vec2 uSwell;
float tideLevel(float t){return .20*sin(t*${(Math.PI*2/TIDE_PERIOD).toFixed(12)})+.055*sin(t*.17);}
float stokes(float p){float s=sin(p);return s+.28*(s*s-.5);}
float seaHeight(vec2 p, float t) {
  vec2 q=vec2(p.x*uSwell.x+p.y*uSwell.y,-p.x*uSwell.y+p.y*uSwell.x);
  vec2 direction=vec2(.923*uSwell.x-.385*uSwell.y,.923*uSwell.y+.385*uSwell.x);
  float h = tideLevel(t)+${WAVES.map(v=>`${v.a.toFixed(3)} * stokes(q.x * ${v.x.toFixed(3)} + q.y * ${v.z.toFixed(3)} + t * ${v.w.toFixed(3)})`).join(' + ')};
  h=tideLevel(t)+(h-tideLevel(t))*uWeather.x+uWeather.y*1.1*sin(dot(q,vec2(.43,.21))+t*1.65);
  for(int i=0;i<12;i++){
    vec3 b=uShores[i];vec2 radial=p-b.xy;float len=length(radial);float d=len-b.z;
    float facing=max(0.,dot(radial/max(len,.001),direction));
    vec2 shoreQ=vec2(b.x*uSwell.x+b.y*uSwell.y,-b.x*uSwell.y+b.y*uSwell.x);
    h+=.16*sin(dot(shoreQ,vec2(.24,.10))+t*1.08-d*.7)*exp(-abs(d)*.55)*facing;
  }
  for(int i=0;i<8;i++) {
    vec4 pulse=uPulses[i]; float age=t-pulse.z; float d=distance(p,pulse.xy);
    if(age>=0.0 && age<5.0) h+=pulse.w*sin(d*3.5-age*7.0)*exp(-pow((d-age*2.6)*.7,2.0))*exp(-age*.8);
  }
  // Waves lose energy over the island shelf; the dry interior stays above the sea.
  for(int i=0;i<12;i++){
    vec3 b=uShores[i];
    if(b.z>0.) h=mix(-.25,h,smoothstep(b.z*.72,b.z*1.16,distance(p,b.xy)));
  }
  return h;
}`;
export function waterHeight(x,z,t,pulses=[]) {
  const qx=x*seaWeather.cos+z*seaWeather.sin,qz=-x*seaWeather.sin+z*seaWeather.cos;
  let h=-.07+tideLevel(t);
  for(const v of WAVES){const s=Math.sin(qx*v.x+qz*v.z+t*v.w);h+=v.a*(s+.28*(s*s-.5));}
  h=-.07+tideLevel(t)+(h+.07-tideLevel(t))*seaWeather.waveScale+seaWeather.storm*1.1*Math.sin(qx*.43+qz*.21+t*1.65);
  const dirX=.923*seaWeather.cos-.385*seaWeather.sin,dirZ=.923*seaWeather.sin+.385*seaWeather.cos;
  for(const b of barriers){const dx=x-b.x,dz=z-b.z,len=Math.hypot(dx,dz),d=len-b.r;const facing=Math.max(0,(dx*dirX+dz*dirZ)/Math.max(len,.001)),bx=b.x*seaWeather.cos+b.z*seaWeather.sin,bz=-b.x*seaWeather.sin+b.z*seaWeather.cos;h+=.16*Math.sin(bx*.24+bz*.10+t*1.08-d*.7)*Math.exp(-Math.abs(d)*.55)*facing;}
  for(const p of pulses){const age=t-p.z;if(age>=0&&age<5){const d=Math.hypot(x-p.x,z-p.y);h+=p.w*Math.sin(d*3.5-age*7)*Math.exp(-(((d-age*2.6)*.7)**2))*Math.exp(-age*.8);}}
  for(const b of barriers){
    const u=Math.max(0,Math.min(1,(Math.hypot(x-b.x,z-b.z)/b.r-.72)/.44));
    if(u===1)continue;
    h=-.32+(h+.32)*u*u*(3-2*u);
  }
  return h;
}
export function floatPose(x,z,heading,length,width,t,pulses=[]) {
  const s=Math.sin(heading),c=Math.cos(heading);
  const fore=waterHeight(x-s*length,z-c*length,t,pulses),aft=waterHeight(x+s*length,z+c*length,t,pulses);
  const right=waterHeight(x+c*width,z-s*width,t,pulses),left=waterHeight(x-c*width,z+s*width,t,pulses);
  return {height:(fore+aft+right+left)/4,pitch:Math.atan2(fore-aft,2*length),roll:Math.atan2(right-left,2*width)};
}
export function hullWaterPose(x,z,heading,t,pulses=[]){
  const s=Math.sin(heading),c=Math.cos(heading),stations=[[-3.25,.4,.32],[-1.5,1.05,.9],[.5,1.2,1],[2.5,.8,.55]];
  let total=0,meanH=0,meanZ=0;const samples=[];
  for(const [along,width,weight]of stations)for(const side of [-1,1]){
    const across=side*width,h=waterHeight(x+s*along+c*across,z+c*along-s*across,t,pulses);
    samples.push({along,across,weight,h});total+=weight;meanH+=h*weight;meanZ+=along*weight;
  }
  meanH/=total;meanZ/=total;let foreTorque=0,rollTorque=0,pitchInertia=0,rollInertia=0;
  for(const p of samples){const lever=p.along-meanZ;foreTorque+=lever*(p.h-meanH)*p.weight;pitchInertia+=lever*lever*p.weight;rollTorque+=p.across*(p.h-meanH)*p.weight;rollInertia+=p.across*p.across*p.weight;}
  return {height:meanH,pitch:Math.atan2(-foreTorque,pitchInertia),roll:Math.atan2(rollTorque,rollInertia),bow:(samples[0].h+samples[1].h)/2,stern:(samples[6].h+samples[7].h)/2};
}
export function impactDamage(normalSpeed,multiplier=1) {
  return normalSpeed<1.7?0:Math.min(48,(normalSpeed-1.4)*4.8*multiplier);
}

// All layers feed one master gain, including short impact/gull sounds.
export class MarineAudio {
  constructor(){this.enabled=false;this.volume=.65;this.context=null;this.nextGull=0;this.enginePitch=0;}
  setVolume(value){
    if(!Number.isFinite(value))return;
    this.volume=Math.max(0,Math.min(1,value));
    if(this.context)this.master.gain.setTargetAtTime(this.enabled?this.volume:0,this.context.currentTime,.05);
  }
  async toggle(){
    if(!this.context)this.init();
    await this.context.resume();
    if(this.enabled&&this.running){this.effect('engine-stop',.65);this.running=false;}
    this.enabled=!this.enabled;
    this.master.gain.setTargetAtTime(this.enabled?this.volume:0,this.context.currentTime,.2);
    return this.enabled;
  }
  async previewPirateMusic(){
    if(!this.context)this.init();await this.context.resume();this.enabled=true;
    this.master.gain.setTargetAtTime(this.volume,this.context.currentTime,.05);
    this.musicPreviewUntil=this.context.currentTime+6;this.nextMusicBeat=0;this.musicStep=0;
    this.effect('pirate-horn',.65);
  }
  init(){
    const c=this.context=new AudioContext();this.master=c.createGain();this.master.gain.value=0;
    const limiter=c.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=12;limiter.ratio.value=6;limiter.attack.value=.003;limiter.release.value=.25;
    this.master.connect(limiter).connect(c.destination);
    this.musicGain=c.createGain();this.musicGain.gain.value=0;this.musicGain.connect(this.master);this.musicStep=0;this.nextMusicBeat=0;
    this.noise=c.createBuffer(1,c.sampleRate*5,c.sampleRate);const data=this.noise.getChannelData(0);let last=0;
    for(let i=0;i<data.length;i++){last=(last+Math.random()*.06-.03)/1.025;data[i]=last*5;}
    const sea=c.createBufferSource();sea.buffer=this.noise;sea.loop=true;this.seaFilter=c.createBiquadFilter();this.seaFilter.type='lowpass';this.seaFilter.frequency.value=600;
    this.seaGain=c.createGain();this.seaGain.gain.value=.2;sea.connect(this.seaFilter).connect(this.seaGain).connect(this.master);sea.start();
    const spray=c.createBufferSource();spray.buffer=this.noise;spray.loop=true;const high=c.createBiquadFilter();high.type='highpass';high.frequency.value=900;this.sprayGain=c.createGain();this.sprayGain.gain.value=0;spray.connect(high).connect(this.sprayGain).connect(this.master);spray.start();
    this.engineGain=c.createGain();this.engineGain.gain.value=0;const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=420;this.engineGain.connect(filter).connect(this.master);
    this.engines=[1,2,3].map((multiple,i)=>{const osc=c.createOscillator(),gain=c.createGain();osc.type=i?'sine':'triangle';osc.frequency.value=35*multiple;gain.gain.value=.35/(i+1);osc.connect(gain).connect(this.engineGain);osc.start();return {osc,multiple};});
    for(const kind of ['wind','rain']){
      const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();source.buffer=this.noise;source.loop=true;
      filter.type=kind==='wind'?'bandpass':'highpass';filter.frequency.value=kind==='wind'?420:1200;filter.Q.value=.5;gain.gain.value=0;
      source.connect(filter).connect(gain).connect(this.master);source.start();this[`${kind}Gain`]=gain;
    }
  }
  update({time,speed,throttle,heave,alive,parked,gullDistance=30,hidden=false}){
    if(!this.context)return;const c=this.context,t=c.currentTime;
    const musicPlaying=(this.pirateMusic||t<(this.musicPreviewUntil??0))&&this.enabled&&!hidden;
    this.musicGain?.gain.setTargetAtTime(musicPlaying?1:0,t,.15);
    if(musicPlaying&&t>=(this.nextMusicBeat??0)){
      const melody=[62,65,69,74,72,69,65,69,60,64,67,72,70,67,64,60,58,62,65,70,69,65,62,65,57,61,64,69,67,64,61,57];
      const step=(this.musicStep??0)%melody.length,hz=440*2**((melody[step]-69)/12);
      this.tone(hz,hz,.2,.2,0,'triangle',-.15,this.musicGain);this.tone(hz*1.004,hz*1.004,.17,.075,0,'sawtooth',.15,this.musicGain);
      if(step%2===0){const bass=440*2**(([38,36,34,33][Math.floor(step/8)]-69)/12);this.tone(bass,bass,.3,.2,0,'triangle',0,this.musicGain);}
      this.musicStep=(step+1)%melody.length;this.nextMusicBeat=t+.22;
    }
    const active=alive&&!parked&&!hidden;const power=active?Math.min(1,Math.abs(speed)/12+throttle*.3):0;
    if(!hidden){const running=active&&this.enabled;if(running!==!!this.running){this.effect(running?'engine-start':'engine-stop',.65);this.running=running;}}
    this.enginePitch=34+power*70;
    for(const {osc,multiple} of this.engines)osc.frequency.setTargetAtTime(this.enginePitch*multiple+Math.sin(time*18)*.7,t,.12);
    this.engineGain.gain.setTargetAtTime(active?.025+power*.14:0,t,.18);
    this.seaGain.gain.setTargetAtTime(hidden?0:(.16+Math.sin(time*.8)*.055+Math.min(.1,Math.abs(heave)*.06))*(musicPlaying?.35:1),t,.3);
    this.seaFilter.frequency.setTargetAtTime(420+power*550+(Math.sin(time*.8)+1)*140,t,.2);
    this.sprayGain.gain.setTargetAtTime(hidden?0:power*.3*(musicPlaying?.4:1),t,.15);
    this.windGain?.gain.setTargetAtTime(hidden?0:(this.weather?.gust??.2)*.42*(musicPlaying?.4:1),t,.8);
    this.rainGain?.gain.setTargetAtTime(hidden?0:(this.weather?.storm??0)*.95*(musicPlaying?.5:1),t,1);
    if(this.enabled&&!hidden&&time>this.nextGull){this.gull(Math.max(.025,.14/(1+gullDistance*.045)));this.nextGull=time+6+Math.random()*7;}
  }
  gull(volume){
    const c=this.context,t=c.currentTime;
    for(let i=0;i<2;i++){const osc=c.createOscillator(),gain=c.createGain(),pan=c.createStereoPanner();pan.pan.value=Math.random()*1.6-.8;osc.type='sine';osc.frequency.setValueAtTime(1150-i*130,t+i*.23);osc.frequency.exponentialRampToValueAtTime(1950-i*200,t+.09+i*.23);osc.frequency.exponentialRampToValueAtTime(780,t+.35+i*.23);gain.gain.setValueAtTime(0,t+i*.23);gain.gain.linearRampToValueAtTime(volume,t+.04+i*.23);gain.gain.exponentialRampToValueAtTime(.001,t+.38+i*.23);osc.connect(gain).connect(pan).connect(this.master);osc.start(t+i*.23);osc.stop(t+.42+i*.23);}
  }
  tone(frequency,end,duration,volume,delay=0,type='sine',pan=0,destination=this.master){
    const c=this.context,t=c.currentTime+delay,osc=c.createOscillator(),gain=c.createGain(),stereo=c.createStereoPanner();
    osc.type=type;osc.frequency.setValueAtTime(frequency,t);osc.frequency.exponentialRampToValueAtTime(Math.max(10,end),t+duration);
    stereo.pan.value=pan;gain.gain.setValueAtTime(.0001,t);gain.gain.linearRampToValueAtTime(volume,t+.012);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    osc.connect(gain).connect(stereo).connect(destination);osc.onended=()=>{osc.disconnect();gain.disconnect();stereo.disconnect();};osc.start(t);osc.stop(t+duration+.02);
  }
  hiss(frequency,duration,volume,delay=0,type='bandpass'){
    const c=this.context,t=c.currentTime+delay,source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();
    source.buffer=this.noise;filter.type=type;filter.frequency.value=frequency;filter.Q.value=.7;
    gain.gain.setValueAtTime(.0001,t);gain.gain.linearRampToValueAtTime(volume,t+.015);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    source.connect(filter).connect(gain).connect(this.master);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};source.start(t,Math.random()*2);source.stop(t+duration+.02);
  }
  effect(kind,power=1){
    if(!this.context||!this.enabled)return;
    power=Math.max(0,Math.min(1,power));
    if(kind==='pirate-horn'){this.tone(147,147,.9,power*.22,0,'sawtooth');this.tone(220,220,.85,power*.1,.06,'triangle');return;}
    if(kind==='bomb-drop'){this.tone(380,170,.1,power*.1);this.hiss(1000,.4,power*.4,.08);return;}
    if(kind==='bomb-armed'){this.tone(880,980,.08,power*.09);return;}
    if(kind==='bomb-blast'){
      this.tone(75,19,1.4,power*.4);this.hiss(300,1.5,power*.7,0,'lowpass');this.hiss(1800,.8,power*.35,.13);return;
    }
    if(kind==='cannon'){
      this.hiss(1400,.07,power*.45,0,'highpass');this.tone(100,28,.7,power*.3);this.hiss(550,.8,power*.5,.02,'lowpass');return;
    }
    if(kind==='thunder'){
      this.tone(45,16,3.8,power*.25);this.hiss(330,4,power*.65,0,'lowpass');this.hiss(750,1.1,power*.32,.08,'lowpass');
      this.hiss(180,3.8,power*.3,.7,'lowpass');return;
    }
    if(kind==='dolphin'){
      if(this.context.currentTime<(this.nextDolphin??0))return;this.nextDolphin=this.context.currentTime+1.8;
      this.tone(2100,3900,.18,power*.055,0,'sine',-.25);this.tone(3900,2400,.25,power*.04,.16,'sine',.25);
      for(let i=0;i<4;i++)this.hiss(4200,.018,power*.09,.5+i*.055);return;
    }
    if(kind==='engine-start'){
      for(let i=0;i<7;i++)this.tone(65+i*5,45+i*5,.09,power*.08,i*.075,'triangle');
      this.hiss(700,.55,power*.2);this.tone(38,110,.65,power*.13,.35,'sawtooth');return;
    }
    if(kind==='engine-stop'){
      this.tone(100,23,.7,power*.16,0,'triangle');this.hiss(280,.3,power*.1,.18);return;
    }
    if(kind==='explosion'){
      this.hiss(2200,.08,power*.6,0,'highpass');this.tone(115,24,1.2,power*.36);
      this.hiss(800,1.5,power*.7,.035,'lowpass');this.hiss(220,2.3,power*.35,.1,'lowpass');
      for(let i=0;i<6;i++)this.tone(350+Math.random()*1200,100+Math.random()*200,.12,power*.035,.15+i*.11,'triangle',Math.sin(i)*.7);
      this.hiss(1500,1.1,power*.22,.4);return;
    }
    if(!this.context||!this.enabled)return;const c=this.context,t=c.currentTime;const source=c.createBufferSource();source.buffer=this.noise;const gain=c.createGain(),filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=kind==='explosion'?1400:kind==='splash'?950:350;
    const duration=kind==='explosion'?1.3:kind==='splash'?.65:.3;gain.gain.setValueAtTime(Math.min(.8,power*(kind==='explosion'?.7:.35)),t);gain.gain.exponentialRampToValueAtTime(.001,t+duration);source.connect(filter).connect(gain).connect(this.master);source.start();source.stop(t+duration);
    if(kind!=='splash'){const osc=c.createOscillator(),g=c.createGain();osc.frequency.setValueAtTime(kind==='explosion'?95:150,t);osc.frequency.exponentialRampToValueAtTime(24,t+duration);g.gain.setValueAtTime(power*.28,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);osc.connect(g).connect(this.master);osc.start();osc.stop(t+duration);}
  }
}



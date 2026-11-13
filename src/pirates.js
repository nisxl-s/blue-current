import * as THREE from 'three';
import {createRaidState} from './pirate-rules.js';
import {createPirateShip} from './pirate-ship.js';
import {advanceDolphin,openDolphinPosition} from './dolphin-navigation.js';
import {waterHeight,floatPose} from './marine.js';
import {createCannonEffects} from './cannon-effects.js';

export function createPirates({scene,marine,obstacles,pulse,takeDamage,toast,audio,reduced,onAudio,onResult=()=>{}}){
  const rules=createRaidState(),{state}=rules,model=createPirateShip(scene),ship=model.ship;
  const cannonEffects=createCannonEffects(scene);
  const shipCollider={x:0,z:0,r:2.6,object:ship,kind:'pirate',destroyed:true,lastHit:-20};obstacles.push(shipCollider);
  let navigation=null,fireClock=4,wakeClock=0,gameTime=0,canDrop=false,playerData=null,hitFlash=0;
  const hud=document.createElement('aside');hud.className='pirate-hud';hud.hidden=true;
  hud.innerHTML='<small>UNIDENTIFIED SAIL</small><strong></strong><span class="raid-info"></span><div class="pirate-integrity"><i></i></div><button aria-label="Drop a floating bomb behind the boat">Drop bomb <kbd>B</kbd></button><button class="raid-audio">Enable / preview pirate audio</button><span class="raid-hint">3 bomb hits sink the pirate · escape beyond 42 m for 7 s, or survive 100 s</span>';
  document.querySelector('main').append(hud);const title=hud.querySelector('strong'),info=hud.querySelector('.raid-info'),bar=hud.querySelector('i'),button=hud.querySelector('button');
  const material=new THREE.MeshStandardMaterial({color:'#273038',metalness:.6,roughness:.5}),bombGeo=new THREE.SphereGeometry(.34,12,8);
  const mines=Array.from({length:8},()=>{const object=new THREE.Group();const core=new THREE.Mesh(bombGeo,material);object.add(core);
    for(let i=0;i<6;i++){const a=i/6*Math.PI*2,s=new THREE.Mesh(new THREE.ConeGeometry(.075,.15,5),material);s.position.set(Math.cos(a)*.34,0,Math.sin(a)*.34);s.rotation.z=-Math.PI/2;s.rotation.y=-a;object.add(s);}
    const band=new THREE.Mesh(new THREE.TorusGeometry(.34,.035,5,16),new THREE.MeshStandardMaterial({color:'#c08d46'}));band.rotation.x=Math.PI/2;object.add(band);
    const fuse=new THREE.Mesh(new THREE.SphereGeometry(.055,6,4),new THREE.MeshBasicMaterial({color:'#ee9b47'}));fuse.position.y=.36;object.add(fuse);scene.add(object);object.visible=false;
    return {object,life:0,age:0,vx:0,vz:0};});
  const bullets=Array.from({length:8},()=>{
    const object=new THREE.Mesh(new THREE.SphereGeometry(.16,8,6),material),ring=new THREE.Mesh(new THREE.RingGeometry(1.3,1.38,32),new THREE.MeshBasicMaterial({color:'#d69166',transparent:true,opacity:.45,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;scene.add(object,ring);object.visible=ring.visible=false;
    return {object,ring,life:0,age:0,start:new THREE.Vector3(),target:new THREE.Vector3()};
  });
  function active(){return ['emerging','pursuit'].includes(state.phase);}
  function result(kind){
    onResult(kind);
    audio.pirateMusic=false;shipCollider.destroyed=true;
    const text=kind==='defeated'?'VICTORY · PIRATE SUNK':kind==='escaped'?'VICTORY · YOU ESCAPED':'DEFEAT · VESSEL LOST';
    title.textContent=text;toast(kind==='defeated'?'Three direct bomb hits. The pirate is going down!':kind==='escaped'?'You shook the pursuer. The sea is yours again.':'The pirates won this encounter. Relaunch to sail again.');
    bullets.forEach(b=>{b.life=0;b.object.visible=b.ring.visible=false;});
    mines.forEach(m=>{m.life=0;m.object.visible=false;});
  }
  function drop(){
    if(!canDrop||!playerData)return false;
    const mine=mines.find(m=>m.life<=0);if(!mine){toast('Eight bombs afloat. Wait for one to expire.');return false;}
    if(!rules.bomb())return false;
    const {player,heading,speed}=playerData;
    mine.object.position.set(player.x+Math.sin(heading)*4.2,0,player.z+Math.cos(heading)*4.2);mine.life=32;mine.age=0;mine.armedSound=false;mine.vx=-Math.sin(heading)*speed*.12;mine.vz=-Math.cos(heading)*speed*.12;mine.object.visible=true;
    pulse(mine.object.position.x,mine.object.position.z,.12);audio.effect('bomb-drop',.55);return true;
  }
  button.onclick=drop;hud.querySelector('.raid-audio').onclick=()=>onAudio?.();
  function reset(){cannonEffects.reset();audio.pirateMusic=false;rules.reset();navigation=null;ship.visible=false;shipCollider.destroyed=true;hud.hidden=true;mines.forEach(m=>{m.life=0;m.object.visible=false;});bullets.forEach(b=>{b.life=0;b.object.visible=b.ring.visible=false;});canDrop=false;}
  function blockedShot(x,z,tx,tz){
    const dx=tx-x,dz=tz-z,len=dx*dx+dz*dz;
    return obstacles.some(o=>{if(o.kind!=='island'&&o.kind!=='rock')return false;const u=Math.max(0,Math.min(1,((o.x-x)*dx+(o.z-z)*dz)/len));return Math.hypot(x+dx*u-o.x,z+dz*u-o.z)<o.r;});
  }
  function update(dt,time,pulses,{player,heading,speed,health,sailing,shipState,climate,paused}){
    playerData={player,heading,speed};canDrop=sailing&&!paused&&shipState==='afloat'&&state.phase==='pursuit';
    audio.pirateMusic=sailing&&!paused&&['emerging','pursuit'].includes(state.phase)&&health>0;
    if(!sailing||paused){hud.hidden=!sailing||state.phase==='waiting';return;}
    cannonEffects.update(dt);
    gameTime+=dt;const distance=navigation?Math.hypot(navigation.x-player.x,navigation.z-player.z):0;
    const event=rules.update(dt,{eligible:shipState==='afloat'||active()||state.phase==='departing',daylight:climate.daylight,health,distance});
    if(event==='spawn'){
      const a=Math.random()*Math.PI*2;
      const solids=[...obstacles,...marine.colliders].filter(o=>o!==shipCollider&&!o.destroyed).map(o=>({x:o.x,z:o.z,r:o.r*(o.kind==='island'?1.2:1)+3}));
      navigation=openDolphinPosition(player.x+Math.cos(a)*30,player.z+Math.sin(a)*30,solids);
      if(!navigation){rules.finish('escaped');return;}
      ship.visible=true;ship.position.set(navigation.x,-8,navigation.z);fireClock=3.5;toast('Something is rising from the sea…');audio.effect('splash',.7);audio.effect('pirate-horn',.8);
    }
    if(['lost','escaped'].includes(event))result(event);
    hud.hidden=state.phase==='waiting';
    if(state.phase==='waiting'){ship.visible=false;return;}
    if(navigation){
      if(state.phase==='pursuit'){
        const solids=[...obstacles,...marine.colliders].filter(o=>o!==shipCollider&&!o.destroyed).map(o=>({x:o.x,z:o.z,r:o.r*(o.kind==='island'?1.2:1)+3}));
        const dx=navigation.x-player.x,dz=navigation.z-player.z,d=Math.hypot(dx,dz)||1;
        const target={x:player.x+dx/d*11-dz/d*2,z:player.z+dz/d*11+dx/d*2};
        navigation=advanceDolphin(navigation,target,dt*1.6,solids);
        const turn=Math.atan2(Math.sin(navigation.heading-ship.rotation.y),Math.cos(navigation.heading-ship.rotation.y));ship.rotation.y+=turn*(1-Math.exp(-dt*2));
      }
      ship.position.x=navigation.x;ship.position.z=navigation.z;
      shipCollider.x=navigation.x;shipCollider.z=navigation.z;shipCollider.destroyed=state.phase!=='pursuit';
      const pose=floatPose(navigation.x,navigation.z,ship.rotation.y,3.8,1.5,time,pulses);
      const rise=state.phase==='emerging'?1-THREE.MathUtils.smoothstep(state.age,0,5):0;
      ship.position.y=pose.height+.1-rise*9-(state.phase==='departing'?THREE.MathUtils.smoothstep(state.age,0,8)*11:0);
      ship.rotation.x=pose.pitch+(state.phase==='departing'?state.age*.08:0);ship.rotation.z=pose.roll+(state.result==='defeated'?state.age*.11:0);
      if(gameTime-wakeClock>(state.phase==='emerging'?.17:.4)&&state.phase!=='departing'){wakeClock=gameTime;pulse(ship.position.x,ship.position.z,.15);marine.burst(ship.position.x,pose.height+.1,ship.position.z,'splash',state.phase==='emerging'?8:3);}
      model.sails.forEach((s,i)=>s.rotation.y=reduced?0:Math.sin(time*1.6+i)*.035);
    }
    if(state.phase==='pursuit'){
      title.textContent='PIRATES IN PURSUIT';info.textContent=`${Math.round(distance)} m · ${Math.ceil(100-state.age)} s to safety${state.escape>0?` · escaping ${Math.ceil(7-state.escape)} s`:''}`;
      fireClock-=dt;
      if(fireClock<=0&&distance<37){
        const b=bullets.find(b=>b.life<=0),tx=player.x-Math.sin(heading)*speed*1.35+(Math.random()-.5)*2,tz=player.z-Math.cos(heading)*speed*1.35+(Math.random()-.5)*2;
        if(b&&!blockedShot(ship.position.x,ship.position.z,tx,tz)){
          const side=(tx-ship.position.x)*Math.cos(ship.rotation.y)-(tz-ship.position.z)*Math.sin(ship.rotation.y)>0?1:-1;
          ship.updateMatrixWorld(true);b.life=1.7;b.age=0;b.start.copy(ship.localToWorld(new THREE.Vector3(side*2.3,1.4,-1.8)));b.target.set(tx,waterHeight(tx,tz,time,pulses),tz);b.object.visible=b.ring.visible=true;b.ring.position.copy(b.target);audio.effect('cannon',.55);cannonEffects.fire(b.start,b.target);
        }fireClock=3.2+Math.random()*2;
      }
    }else if(state.phase==='emerging'){title.textContent='A RAIDER RISES';info.textContent='Make distance. Prepare your floating bombs.';}
    bar.style.width=`${state.hp}%`;button.disabled=!canDrop||state.cooldown>0;button.innerHTML=state.cooldown>0?`Reloading ${state.cooldown.toFixed(1)} s`:'Drop bomb <kbd>B</kbd>';
    if(state.phase==='departing')info.textContent=state.result==='defeated'?'Enemy vessel sinking. Encounter won.':state.result==='escaped'?'The pirate has abandoned pursuit.':'Your hull was lost. Press R to relaunch.';
    for(const b of bullets){if(b.life<=0)continue;b.age+=dt;const u=Math.min(1,b.age/b.life);b.object.position.lerpVectors(b.start,b.target,u);b.object.position.y+=Math.sin(u*Math.PI)*4;b.ring.position.y=waterHeight(b.target.x,b.target.z,time,pulses)+.07;
      if(u>=1){b.life=0;b.object.visible=b.ring.visible=false;marine.burst(b.target.x,b.ring.position.y,b.target.z,'splash',20);pulse(b.target.x,b.target.z,.3);
        if(state.phase==='pursuit'&&Math.hypot(player.x-b.target.x,player.z-b.target.z)<2.3){takeDamage(18);audio.effect('impact',.6);if(health<=18){rules.finish('lost');result('lost');}}
      }
    }
    for(const m of mines){if(m.life<=0)continue;m.life-=dt;m.age+=dt;if(m.age>.9&&!m.armedSound){m.armedSound=true;audio.effect('bomb-armed',.4);}m.object.position.x+=m.vx*dt;m.object.position.z+=m.vz*dt;m.vx*=Math.exp(-dt*1.2);m.vz*=Math.exp(-dt*1.2);m.object.position.y=waterHeight(m.object.position.x,m.object.position.z,time,pulses)+.05;m.object.rotation.z=Math.sin(time*2+m.age)*.1;
      if(m.age>.9&&state.phase==='pursuit'&&Math.hypot(m.object.position.x-ship.position.x,m.object.position.z-ship.position.z)<3.8){m.life=0;marine.explode(m.object.position.x,m.object.position.y,m.object.position.z);audio.effect('bomb-blast',.75);pulse(m.object.position.x,m.object.position.z,.55);hitFlash=.35;const hit=rules.hit();if(hit==='defeated')result(hit);else toast(`Direct hit · pirate integrity ${state.hp}%`);}
      m.object.visible=m.life>0;
    }
    hitFlash=Math.max(0,hitFlash-dt);
  }
  return {update,drop,reset,active,state,get position(){return ship.visible?ship.position:null;}};
}




import {advanceDolphin} from './dolphin-navigation.js';
import {planVoyageRoute,routeSolids} from './sea-route.js';
import {createDolphinWater} from './dolphin-water.js';
import {waterHeight} from './marine.js';

export function createDolphinGuides(scene,pulse,audio,toast,marine,obstacles=[],onComplete=()=>{}){
  let pod=[];  const wakes=createDolphinWater(scene,pulse,(kind,power)=>audio.effect(kind,power)),status=document.createElement('aside');status.className='guide-status';status.hidden=true;document.querySelector('main').append(status);
  let route=[],index=1,mode='idle',circleAngle=0,replan=0,approach=[],approachIndex=1;
  function release(){for(const d of pod){d.guidance=false;d.navigation={x:d.object.position.x,z:d.object.position.z,heading:d.object.rotation.y,vx:d.navigation?.vx??0,vz:d.navigation?.vz??0};}pod=[];}
  function setRoute(points){
    release();route=points.map(p=>({...p}));index=1;mode=route.length?'approach':'idle';replan=0;approach=[];wakes.reset();status.hidden=!route.length;
    if(route.length){const start=route[0],nearest=marine.dolphins.filter(d=>d.object.visible).sort((a,b)=>Math.hypot(a.object.position.x-start.x,a.object.position.z-start.z)-Math.hypot(b.object.position.x-start.x,b.object.position.z-start.z))[0];
      if(!nearest){route=[];status.hidden=true;toast('No dolphin pod nearby. Try plotting the passage again shortly.');return;}
      const n=marine.dolphins.indexOf(nearest),group=Math.floor(n/2);pod=marine.dolphins.filter((d,i)=>Math.floor(i/2)===group);pod.forEach(d=>d.guidance=true);
      toast('A nearby dolphin pod is coming to meet you. Watch for their wake.');
    }
  }
  function update(dt,time,pulses,{player,speed=0,active,paused,reduced}){
    if(!route.length||index>=route.length||!active){if(!active&&route.length)setRoute([]);status.hidden=true;wakes.update(dt,time,pulses,reduced);return;}
    if(paused||!pod.length)return;
    const leader=pod[0],lp=leader.object.position,separation=Math.hypot(lp.x-player.x,lp.z-player.z),target=route[index];
    if(mode==='lead'&&separation>15){mode='return';replan=0;}
    if((mode==='return'||mode==='approach')&&separation<6){mode='circle';circleAngle=Math.atan2(lp.z-player.z,lp.x-player.x);}
    if(mode==='circle'&&Math.abs(speed)>1){mode='lead';}
    let goal=target;
    if(mode==='return'||mode==='approach'){
      replan-=dt;if(replan<=0){approach=planVoyageRoute({x:lp.x,z:lp.z},[player],[...obstacles,...marine.colliders]);approachIndex=1;replan=2.5;}
      goal=approach[approachIndex]??player;
      if(Math.hypot(lp.x-goal.x,lp.z-goal.z)<1.5&&approachIndex<approach.length-1)goal=approach[++approachIndex];
    }else if(mode==='circle'){
      circleAngle+=dt*.62;goal={x:player.x+Math.cos(circleAngle)*4.8,z:player.z+Math.sin(circleAngle)*4.8};
    }else if(Math.hypot(lp.x-target.x,lp.z-target.z)<2&&Math.hypot(player.x-target.x,player.z-target.z)<7){
      index++;if(index>=route.length){onComplete();toast('Passage complete. The pod returns to open water.');setRoute([]);return;}
    }
    const solids=routeSolids([...obstacles,...marine.colliders]);
    solids.push({x:player.x,z:player.z,r:3.2});
    status.hidden=false;status.textContent=mode==='approach'?'NEARBY DOLPHINS APPROACHING':mode==='return'?'THE POD IS TURNING BACK FOR YOU':mode==='circle'?'POD WAITING BESIDE YOU · START SAILING TO CONTINUE':`FOLLOW THE POD · ${Math.ceil(Math.hypot(player.x-target.x,player.z-target.z))} m TO NEXT TURN`;
    for(const [i,d]of pod.entries()){
      const p=d.object.position,aim=i?{x:lp.x+Math.cos(leader.object.rotation.y)*1.5,z:lp.z-Math.sin(leader.object.rotation.y)*1.5}:goal;
      const navigation=d.navigation??{x:p.x,z:p.z,heading:d.object.rotation.y};navigation.x=p.x;navigation.z=p.z;
      const swimSpeed=mode==='circle'?3:Math.max(4.5,Math.abs(speed)*1.12+.5);
      const next=advanceDolphin(navigation,aim,dt,solids,swimSpeed);d.navigation=next;
      const heading=d.object.rotation.y+Math.atan2(Math.sin(next.heading-d.object.rotation.y),Math.cos(next.heading-d.object.rotation.y))*(1-Math.exp(-dt*3));
      const h=waterHeight(next.x,next.z,time,pulses),stroke=reduced?0:Math.sin(time*5.4+i*.9);
      d.swimY=(d.swimY??p.y)+(h-.25-(d.swimY??p.y))*(1-Math.exp(-dt*3));p.set(next.x,d.swimY,next.z);d.object.rotation.set(stroke*.035,heading,0);d.tail.rotation.x=stroke*.28;d.swim(time+i*.16,reduced);
      wakes.dolphin(i,{x:next.x,z:next.z,heading,clearance:-.05,depth:.25,distance:separation},dt,time,pulses,reduced);
    }
    wakes.update(dt,time,pulses,reduced);
  }
  return {setRoute,update,get position(){return pod.length?{x:pod[0].object.position.x,z:pod[0].object.position.z}:null;},get route(){return route;},get mode(){return mode;},get pod(){return pod;}};
}


export function createRaidState(random=Math.random){
  const state={phase:'waiting',wait:35+random()*60,age:0,escape:0,hp:100,cooldown:0,shots:0,result:null};
  function reset(){Object.assign(state,{phase:'waiting',wait:35+random()*60,age:0,escape:0,hp:100,cooldown:0,shots:0,result:null});}
  function finish(result){if(!['emerging','pursuit'].includes(state.phase))return;state.phase='departing';state.age=0;state.result=result;state.wait=100+random()*100;}
  function update(dt,{eligible,daylight,health,distance=0}){
    if(!eligible)return null;state.cooldown=Math.max(0,state.cooldown-dt);
    if(state.phase==='waiting'){if(daylight>.65){state.wait-=dt;if(state.wait<=0){Object.assign(state,{phase:'emerging',age:0,hp:100,escape:0,result:null});return 'spawn';}}return null;}
    state.age+=dt;
    if(state.phase==='departing'){if(state.age>=8){state.phase='waiting';state.age=0;}return null;}
    if(health<=0){finish('lost');return 'lost';}
    if(state.phase==='emerging'&&state.age>=5){state.phase='pursuit';state.age=0;return 'pursuit';}
    if(state.phase==='pursuit'){
      state.escape=distance>42?state.escape+dt:0;
      if(state.escape>=7||state.age>=100){finish('escaped');return 'escaped';}
    }return null;
  }
  function bomb(){if(state.phase!=='pursuit'||state.cooldown>0)return false;state.cooldown=3;return true;}
  function hit(){if(state.phase!=='pursuit')return null;state.hp=Math.max(0,state.hp-34);if(state.hp===0){finish('defeated');return 'defeated';}return 'hit';}
  return {state,reset,update,bomb,hit,finish};
}

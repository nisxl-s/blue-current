export const SAVE_KEY='blue-current.captain.v1';
export const ACHIEVEMENTS=[
  {id:'castoff',name:'First wake',text:'Sail 25 metres beyond your starting berth.',stat:'distance',goal:25,category:'Exploration',xp:20},
  {id:'passage',name:'Coastal wanderer',text:'Sail 500 metres across the archipelago.',stat:'distance',goal:500,category:'Exploration',xp:40},
  {id:'voyager',name:'Blue-water captain',text:'Log 2,000 metres under way.',stat:'distance',goal:2000,category:'Exploration',xp:80},
  {id:'ports',name:'Five lights on the chart',text:'Reach all five ports by sea.',stat:'ports',goal:5,category:'Exploration',xp:80},
  {id:'buoys',name:'The orange thread',text:'Discover all five orange trail buoys.',stat:'buoys',goal:5,category:'Exploration',xp:60},
  {id:'salvage',name:'Finder of lost things',text:'Recover your first submerged cargo.',stat:'salvage',goal:1,category:'Expeditions',xp:30},
  {id:'salvage-all',name:'Nothing left behind',text:'Recover cargo at all three salvage grounds.',stat:'salvage',goal:3,category:'Expeditions',xp:80},
  {id:'survey',name:'Quiet company',text:'Complete a wildlife survey.',stat:'survey',goal:1,category:'Wildlife',xp:30},
  {id:'survey-all',name:'Keeper of the sound',text:'Survey all three wildlife grounds.',stat:'survey',goal:3,category:'Wildlife',xp:80},
  {id:'guide',name:'Follow the pod',text:'Complete a plotted passage with dolphin guides.',stat:'guides',goal:1,category:'Wildlife',xp:50},
  {id:'regatta',name:'Six golden gates',text:'Finish the northern regatta.',stat:'races',goal:1,category:'Seamanship',xp:60},
  {id:'regatta-fast',name:'Cutting a fine wake',text:'Finish the regatta in under 55 seconds.',stat:'fastRace',goal:1,category:'Seamanship',xp:90},
  {id:'repair',name:'Safe harbor',text:'Moor with damage and restore full hull integrity.',stat:'repairs',goal:1,category:'Seamanship',xp:40},
  {id:'storm',name:'Weather the black water',text:'Sail 30 seconds in a thunderstorm, then moor safely.',stat:'stormHome',goal:1,category:'Seamanship',xp:90},
  {id:'escape',name:'A wake they cannot follow',text:'Escape a pirate pursuit.',stat:'escaped',goal:1,category:'Encounters',xp:60},
  {id:'raider',name:'Turn the tide',text:'Sink a pursuing pirate ship with floating bombs.',stat:'defeated',goal:1,category:'Encounters',xp:100},
  {id:'delivery',name:'Special delivery',text:'Complete a harbor delivery contract.',stat:'deliveries',goal:1,category:'Contracts',xp:50},
  {id:'delivery-all',name:'Trusted by every harbor',text:'Complete all three delivery contracts.',stat:'deliveries',goal:3,category:'Contracts',xp:120}
];
export const CONTRACTS=[
  {id:'lantern',name:'The lantern run',cargo:'Replacement lantern glass',from:'Discovery Docks',to:'The lighthouse',pickup:{x:24,z:-10},drop:{x:-24,z:-27},seconds:150,xp:70},
  {id:'medicine',name:'Medicine on the current',cargo:'A sealed medicine chest',from:'The tide house',to:'Hello Harbor',pickup:{x:-14,z:6},drop:{x:37,z:29},seconds:160,xp:90},
  {id:'reef',name:'Letters from the reef',cargo:'The reef station mailbag',from:'The coral club',to:'Discovery Docks',pickup:{x:2,z:27},drop:{x:24,z:-10},seconds:140,xp:110}
];
export const PENNANTS=[{id:'sea',name:'Sea jade',color:'#61c6ba',xp:0},{id:'amber',name:'Amber explorer',color:'#eeb85c',xp:150},{id:'coral',name:'Coral voyager',color:'#eb816f',xp:400},{id:'night',name:'Midnight admiral',color:'#a8a0ed',xp:800}];
const scalar=['distance','races','fastRace','guides','repairs','stormHome','escaped','defeated','bestRace'];
const unique=['ports','buoys','salvage','survey','deliveries'];
export function createCaptainProgress(storage){
  const state={version:1,stats:Object.fromEntries(scalar.map(k=>[k,0])),sets:Object.fromEntries(unique.map(k=>[k,[]])),pennant:'sea'};
  let dirty=false,saveError=false,contract=null,stormSeconds=0,damagedBerth=false;
  try{const raw=JSON.parse(storage?.getItem(SAVE_KEY)??'null');if(raw?.version===1){
    for(const k of scalar)if(Number.isFinite(raw.stats?.[k])&&raw.stats[k]>=0)state.stats[k]=Math.min(raw.stats[k],1e8);
    for(const k of unique)if(Array.isArray(raw.sets?.[k]))state.sets[k]=[...new Set(raw.sets[k].filter(v=>typeof v==='string'&&v.length<80))].slice(0,100);
    if(PENNANTS.some(p=>p.id===raw.pennant))state.pennant=raw.pennant;
  }}catch{/* A damaged or unavailable browser save starts a fresh in-memory journal. */}
  const count=key=>state.sets[key]?.length??state.stats[key]??0;
  const earned=()=>ACHIEVEMENTS.filter(a=>count(a.stat)>=a.goal);
  const xp=()=>earned().reduce((n,a)=>n+a.xp,0)+CONTRACTS.filter(c=>state.sets.deliveries.includes(c.id)).reduce((n,c)=>n+c.xp,0);
  if((PENNANTS.find(p=>p.id===state.pennant)?.xp??0)>xp())state.pennant='sea';
  let known=new Set(earned().map(a=>a.id));
  function event(type,id){
    if(unique.includes(type)&&typeof id==='string'&&!state.sets[type].includes(id)){state.sets[type].push(id);dirty=true;}
    else if(scalar.includes(type)&&type!=='distance'&&type!=='bestRace'){state.stats[type]++;dirty=true;}
  }
  function race(seconds){if(!Number.isFinite(seconds)||seconds<=0)return;event('races');if(seconds<55)event('fastRace');state.stats.bestRace=state.stats.bestRace?Math.min(seconds,state.stats.bestRace):seconds;dirty=true;}
  function notifications(){const fresh=earned().filter(a=>!known.has(a.id));fresh.forEach(a=>known.add(a.id));return fresh;}
  function save(){if(!dirty)return;try{storage?.setItem(SAVE_KEY,JSON.stringify(state));saveError=!storage;}catch{saveError=true;}dirty=false;}
  function accept(id){if(contract||state.sets.deliveries.includes(id))return false;const c=CONTRACTS.find(c=>c.id===id);if(!c)return false;contract={...c,phase:'pickup',remaining:c.seconds};return true;}
  function step(dt,{player,speed=0,active=false,paused=false,health=100,shipState='afloat',storm=0,distance=0}={}){
    if(paused||!active)return null;
    if(health<=0||['sinking','sunk','falling'].includes(shipState)){const failed=!!contract;contract=null;stormSeconds=0;damagedBerth=false;return failed?'Cargo lost with the vessel. The contract can be retried.':null;}
    if(shipState==='moored'){
      if(health<99)damagedBerth=true;
      if(health>=99.9&&damagedBerth){event('repairs');damagedBerth=false;}
      if(stormSeconds>=30){event('stormHome');stormSeconds=0;}
    }
    if(shipState==='afloat'){
      if(Number.isFinite(distance)&&distance>0){state.stats.distance+=Math.min(distance,Math.abs(speed)*dt+dt*3);dirty=true;}
      if(storm>.55&&Math.abs(speed)>1)stormSeconds+=dt;
    }
    if(!contract)return null;
    if(contract.phase==='sailing'){contract.remaining-=dt;if(contract.remaining<=0){contract=null;return 'Delivery window missed. Open the journal to try again.';}}
    const target=contract.phase==='pickup'?contract.pickup:contract.drop;
    if(Math.hypot(player.x-target.x,player.z-target.z)<12&&Math.abs(speed)<2){
      if(contract.phase==='pickup'){contract.phase='sailing';return `Cargo aboard: ${contract.cargo}. Deliver to ${contract.to}.`;}
      const title=contract.name;event('deliveries',contract.id);contract=null;return `Contract complete: ${title}. Renown added to your journal.`;
    }
    return null;
  }
  return {state,count,earned,xp,event,race,notifications,save,accept,step,get contract(){return contract;},get saveError(){return saveError;},
    abandon(){contract=null;},relaunch(){contract=null;stormSeconds=0;damagedBerth=false;},
    equip(id){const p=PENNANTS.find(p=>p.id===id);if(!p||xp()<p.xp)return false;state.pennant=id;dirty=true;save();return true;},
    get rank(){const n=xp();return n>=1000?'Admiral':n>=600?'Captain':n>=300?'Navigator':n>=100?'Skipper':'Deckhand';}};
}

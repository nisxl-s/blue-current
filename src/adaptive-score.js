import {chaseVoices} from './nautical-score.js';

export function scoreMood({alive=false,parked=false,threat=false,emerging=false,storm=0,night=0,health=100,edge=0,urgent=false}={}){
  if(!alive&&!parked)return 'silence';
  if(emerging)return 'dread';
  if(threat)return 'chase';
  if(storm>.5||health<30||edge>.45||urgent||night>.7)return 'dread';
  return 'freedom';
}
export const SCORE_TICKS={freedom:.42,dread:.32,chase:1/6};
const voice=(note,duration,volume,instrument,pan=0)=>({note,duration,volume,instrument,pan});
const horizon=[74,null,78,81,null,79,78,null,74,76,null,null,72,null,76,79,null,78,76,null,72,74,null,null];
// Original open-sea theme, dissonant warning texture, and driving chase arrangement.
export function scoreVoices(mood,step){
  const i=((step%48)+48)%48,out=[];
  if(mood==='freedom'){
    const k=i%24,n=horizon[k],root=[50,55,48,53][Math.floor(k/6)];
    if(n!==null)out.push(voice(n,.95,.052,'flute',.22));
    if(k%6===0){out.push(voice(root,2.3,.045,'cello',-.25),voice(root+7,2.2,.027,'strings',-.12),voice(root+16,1.9,.022,'horn',.1));}
  }else if(mood==='dread'){
    const k=i%12,root=Math.floor(i/12)%2?37:38;
    if(k===0)out.push(voice(root,3.4,.065,'cello',-.1),voice(root+13,2.8,.023,'strings',.3));
    if(k%3===0)out.push(voice(root+24+[0,1,0,6][Math.floor(k/3)],.28,.026,'strings',-.3));
    if(k===0||k===2||k===6)out.push(voice(34,.26,k===0?.07:.035,'drum'));
  }else if(mood==='chase'){
    const beat=i%6,root=[45,48,43,40,45,50,43,40][Math.floor(i/6)];
    for(const v of chaseVoices(i))out.push(voice(v.note,v.duration*1.35,v.volume*.9,v.note<55?'cello':'horn',v.pan));
    out.push(voice(root+12+(beat===2||beat===5?7:0),.15,.035,'strings',-.3));
    if(beat===0||beat===3)out.push(voice(38,.22,beat===0?.1:.065,'drum'));
  }
  return out;
}

export const SIGNALS={
  'ui-click':[[72,.045,.026,0],[79,.055,.012,.025]],
  'ui-close':[[67,.07,.025,0]],
  notice:[[74,.11,.035,0],[81,.16,.02,.12]],
  warning:[[50,.18,.07,0],[49,.25,.045,.22]],
  achievement:[[62,.3,.075,0],[69,.3,.07,.14],[74,.45,.08,.28],[78,.65,.06,.45]],
  victory:[[50,.6,.085,0],[57,.6,.06,.1],[66,.7,.065,.23],[74,1.2,.08,.38]],
  defeat:[[50,.55,.065,0],[48,.65,.055,.4],[45,1,.06,.9]]
};

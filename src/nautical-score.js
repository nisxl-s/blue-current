// "Beyond the Shoals": an original 6/8 chase cue. Rests leave space for the sea.
export const CHASE_TICK=60/108/3;
const phrase=[
  69,null,76,74,null,72, 71,67,null,69,null,72,
  74,null,71,67,69,null, 72,71,null,67,null,64,
  69,null,72,76,null,79, 78,74,null,71,72,null,
  74,72,null,69,67,null, 71,null,67,64,null,null
];
const roots=[45,48,43,40,45,50,43,40];
export function chaseVoices(step){
  const index=((step%48)+48)%48,beat=index%6,bar=Math.floor(index/6),notes=[];
  if(phrase[index]!==null)notes.push({note:phrase[index],duration:.25,volume:.065,type:'triangle',pan:-.18});
  if(beat===0||beat===3)notes.push({note:roots[bar],duration:.38,volume:.08,type:'sine',pan:0});
  if(beat===0&&bar%2===0)notes.push({note:roots[bar]+19,duration:.75,volume:.035,type:'triangle',pan:.2});
  return notes;
}

export function marineMix({power=0,heave=0,gust=.2,storm=0,music=false,hidden=false,time=0}){
  if(hidden)return {engine:0,sea:0,spray:0,wind:0,rain:0};
  const duck=music?.48:1;
  return {engine:(.012+power*.045)*(music?.65:1),
    sea:(.045+Math.sin(time*.35)*.008+Math.min(.015,Math.abs(heave)*.008))*duck,
    spray:Math.max(0,power-.25)*.055*duck,
    wind:Math.min(1,gust)*.065*duck,rain:Math.min(1,storm)*.13*duck};
}

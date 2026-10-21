const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export const DAY_SECONDS=480;
const bearingHash=n=>{const v=Math.sin(n*127.13+41.7)*43758.5453;return (v-Math.floor(v))*Math.PI*2;};
export function swellBearing(seconds){
  const n=Math.floor(seconds/95),u=(seconds/95)-n,s=u*u*(3-2*u),a=bearingHash(n),b=bearingHash(n+1);
  return a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*s;
}
export function climateAt(seconds){
  const day=Math.floor((seconds+8/24*DAY_SECONDS)/DAY_SECONDS),hour=((seconds/DAY_SECONDS*24+8)%24+24)%24;
  const daylight=smooth(5,8,hour)*(1-smooth(17,20,hour));
  const night=1-daylight;
  // Two storm nights followed by a clear night, with long approaches and departures.
  const nightIndex=hour<12?day-1:day;
  const stormNight=((nightIndex%3)+3)%3!==2;
  const storm=stormNight?night*smooth(18,21,hour):0;
  // After midnight the same front recedes toward dawn.
  const midnightStorm=stormNight&&hour<6?night*(1-smooth(3,6,hour)):0;
  const rain=Math.max(storm,midnightStorm);
  const wind=.28+night*.38+rain*.32;
  return {hour,day,daylight,night,sunriseFog:smooth(4.5,5.5,hour)*(1-smooth(7,8.5,hour)),storm:rain,wind,waveScale:1+night*1.2+rain*1.1,
    direction:swellBearing(seconds),swellDirection:swellBearing(seconds),gust:wind*(.8+.2*Math.sin(seconds*.7)+.1*Math.sin(seconds*1.71)),
    label:rain>.55?'THUNDERSTORM':night>.65?'ROUGH NIGHT SEAS':hour<12?'MORNING BREEZE':hour<17?'GOLDEN AFTERNOON':'EVENING SWELL'};
}

export function deckFloodStep(volume,excess,dt){
  const incoming=Math.max(0,excess)*dt*2.4;
  return Math.min(1.2,Math.max(0,volume+incoming-dt*(.13+volume*.24)));
}


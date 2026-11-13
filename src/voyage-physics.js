export const OCEAN_RADIUS=100;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function edgeCurrent(x,z,storm=0){
  const r=Math.hypot(x,z),u=clamp((r-72)/28,0,1),flow=u*u*(3-2*u)*(7.8+storm*1.2);
  return {x:r?x/r*flow:0,z:r?z/r*flow:0,strength:flow,danger:u,over:r>OCEAN_RADIUS};
}
export function createHullMotion(){
  const state={height:0,heave:0,pitch:0,pitchRate:0,roll:0,rollRate:0,yawRate:0,currentX:0,currentZ:0,forwardSpeed:0,centerOfMassY:-.42};
  function reset(height=0){Object.assign(state,{height,heave:0,pitch:0,pitchRate:0,roll:0,rollRate:0,yawRate:0,currentX:0,currentZ:0,forwardSpeed:0});}
  function step(dt,pose,{speed=0,steering=0,health=100,wind=0,heading=0,current={x:0,z:0}}={}){
    // Semi-implicit fixed substeps: gravity restores a low center of mass beneath buoyancy.
    const count=Math.max(1,Math.ceil(dt/(1/120))),h=dt/count;
    const targetYaw=steering*1.2*Math.min(1,Math.abs(speed)/2.5)*(speed>=0?1:-1);
    const acceleration=(speed-state.forwardSpeed)/Math.max(dt,.001);state.forwardSpeed=speed;
    for(let i=0;i<count;i++){
      state.yawRate+=(targetYaw-state.yawRate)*h*2.4;
      const targetRoll=pose.roll-state.yawRate*speed*.026+Math.sin(heading+.6)*wind*.055+(100-health)/100*.12;
      state.heave+=((pose.height+.1-state.height)*19-state.heave*6.4)*h;state.height+=state.heave*h;
      const trim=pose.pitch+clamp(acceleration*.012,-.12,.12),stability=(.35-state.centerOfMassY)*12*(.7+.3*health/100);
      state.pitchRate+=((trim-state.pitch)*12-state.pitchRate*4.4)*h;state.pitch+=state.pitchRate*h;
      state.rollRate+=((targetRoll-state.roll)*stability-state.rollRate*3.7)*h;state.roll+=state.rollRate*h;
      state.currentX+=(current.x-state.currentX)*h*1.6;state.currentZ+=(current.z-state.currentZ)*h*1.6;
    }
    state.pitch=clamp(state.pitch,-1,1);state.roll=clamp(state.roll,-1.15,1.15);return state;
  }
  return {state,step,reset};
}

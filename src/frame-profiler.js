export function createFrameProfiler(renderer){
  const samples=[],pending=[];let start=0,updateEnd=0,active=null;
  const gl=renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
  let gpuMs=null;
  function begin(){
    start=performance.now();renderer.info.reset();
    while(pending.length&&gl.getQueryParameter(pending[0],gl.QUERY_RESULT_AVAILABLE)){
      const q=pending.shift();if(!gl.getParameter(ext.GPU_DISJOINT_EXT))gpuMs=gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6;gl.deleteQuery(q);
    }
  }
  function renderedStart(){updateEnd=performance.now();if(ext&&pending.length<4){active=gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,active);}}
  function end(dt){
    if(active){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(active);active=null;}
    samples.push({frameMs:dt*1000,updateMs:updateEnd-start,renderSubmitMs:performance.now()-updateEnd,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles});
    if(samples.length>240)samples.shift();
  }
  function snapshot(){
    const avg=k=>samples.reduce((s,v)=>s+v[k],0)/Math.max(1,samples.length),sorted=samples.map(v=>v.frameMs).sort((a,b)=>a-b);
    return {frames:samples.length,fps:1000/Math.max(.01,avg('frameMs')),p95FrameMs:sorted[Math.floor(sorted.length*.95)]??0,updateMs:avg('updateMs'),renderSubmitMs:avg('renderSubmitMs'),gpuMs,drawCalls:avg('calls'),triangles:avg('triangles')};
  }
  renderer.info.autoReset=false;return {begin,renderedStart,end,snapshot};
}

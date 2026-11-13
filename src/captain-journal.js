import {ACHIEVEMENTS,CONTRACTS,PENNANTS} from './captain-progress.js';

export function createCaptainJournal(progress,{onOpen=()=>{},onCourse=()=>{},onEquip=()=>{},onTrail=()=>{}}={}){
  const button=document.createElement('button');button.id='journal-button';button.className='journal-button';button.textContent='Captain’s journal';button.setAttribute('aria-keyshortcuts','J');
  document.querySelector('nav').prepend(button);
  const hud=document.createElement('button');hud.className='captain-objective';hud.setAttribute('aria-label','Open captain journal and objectives');document.querySelector('main').append(hud);
  const dialog=document.createElement('dialog');dialog.className='captain-journal';dialog.setAttribute('aria-labelledby','journal-title');
  dialog.innerHTML=`<header class="journal-heading"><div><p class="eyebrow">SEA WREN / CAPTAIN’S JOURNAL</p><h2 id="journal-title">Make a name<br>on open water.</h2></div><button class="close" aria-label="Close captain journal">×</button></header>
    <div class="captain-summary"></div><nav class="journal-tabs" aria-label="Journal sections"><button data-tab="orders" aria-pressed="true">Voyage board</button><button data-tab="medals" aria-pressed="false">Achievements</button><button data-tab="locker" aria-pressed="false">Signal locker</button></nav><section class="journal-content"></section><footer class="journal-footer"></footer>`;
  document.body.append(dialog);let tab='orders',tracked='castoff',revision='',clock=0,saveClock=0;
  const content=dialog.querySelector('.journal-content'),summary=dialog.querySelector('.captain-summary'),footer=dialog.querySelector('.journal-footer');
  const notice=document.createElement('div');notice.className='medal-notice';notice.hidden=true;notice.setAttribute('role','status');document.body.append(notice);let noticeTime=0;const queue=[];
  function row(a){const value=Math.min(a.goal,progress.count(a.stat)),done=value>=a.goal;return `<article class="medal-card ${done?'earned':''}"><div class="medal-seal" aria-hidden="true">${done?'✦':'◇'}</div><div><small>${a.category} · ${a.xp} RENOWN</small><h3>${a.name}</h3><p>${a.text}</p><progress value="${value}" max="${a.goal}" aria-label="${a.name}"></progress><span class="medal-count">${Math.floor(value)} / ${a.goal}${done?' · EARNED':''}</span></div>${!done?`<button class="track-medal" data-track="${a.id}">${tracked===a.id?'Tracked':'Track'}</button>`:''}</article>`;}
  function render(){
    const unlocked=progress.earned(),xp=progress.xp();summary.innerHTML=`<div class="rank-seal" aria-hidden="true">⚓</div><div><small>YOUR COMMISSION</small><strong>${progress.rank}</strong><span>${xp} renown · ${unlocked.length} / ${ACHIEVEMENTS.length} commendations</span></div><div class="journal-total"><progress value="${unlocked.length}" max="${ACHIEVEMENTS.length}" aria-label="Total achievements"></progress></div>`;
    footer.textContent=progress.saveError?'Browser saving unavailable · progress lasts for this session.':'Progress saved on this browser · Relaunch keeps your achievements · J to open journal';
    if(tab==='medals')content.innerHTML=`<p class="journal-lead">Every passage leaves a mark. Explore, master the helm, and earn your commission.</p><div class="medal-grid">${ACHIEVEMENTS.map(row).join('')}</div>`;
    else if(tab==='locker')content.innerHTML=`<p class="journal-lead">Fly your colors. Earn renown to unlock a new pennant on Sea Wren’s mast.</p><div class="locker-grid">${PENNANTS.map(p=>`<button class="pennant-choice" data-equip="${p.id}" ${xp<p.xp?'disabled':''} aria-pressed="${progress.state.pennant===p.id}"><span class="pennant-swatch" style="--pennant:${p.color}" aria-hidden="true"></span><strong>${p.name}</strong><small>${xp<p.xp?`${p.xp} RENOWN TO UNLOCK`:progress.state.pennant===p.id?'FLYING NOW':'HOIST PENNANT'}</small></button>`).join('')}</div>`;
    else{
      const next=ACHIEVEMENTS.find(a=>a.id===tracked&&!unlocked.includes(a))??ACHIEVEMENTS.find(a=>!unlocked.includes(a));if(next)tracked=next.id;
      content.innerHTML=`<div class="journal-orders"><div><p class="eyebrow">YOUR NEXT COMMENDATION</p>${next?`<h3>${next.name}</h3><p>${next.text}</p><button class="journal-action" data-section="medals">See all achievements ↗</button>`:'<h3>The sea knows your name.</h3><p>All commendations earned. Sail freely and improve your regatta record.</p>'}</div><aside><p class="eyebrow">NORTHERN REGATTA</p><strong>${progress.state.stats.bestRace?progress.state.stats.bestRace.toFixed(1)+' s':'No time logged'}</strong><p>Six gates in order. Beat 55 seconds for a special commendation.</p><button class="journal-action" data-course="race">Plot regatta start ↗</button></aside></div>
      <div class="journal-section-title"><h3>Harbor contracts</h3><span>LOAD · SAIL · DELIVER</span></div><p class="journal-lead">Accept a job, slow below 2 knots near its departure port to load, then reach the receiving port before time runs out. Vessel loss forfeits cargo; you can retry. Timers pause while a chart or journal is open.</p>
      <div class="contract-grid">${CONTRACTS.map(c=>{const done=progress.state.sets.deliveries.includes(c.id),active=progress.contract?.id===c.id;return `<article class="contract-card ${done?'completed':''}"><small>${done?'DELIVERED':`${c.xp} RENOWN · ${c.seconds} SECOND PASSAGE`}</small><h3>${c.name}</h3><p>${c.cargo}</p><div class="contract-route">${c.from}<span>↓</span>${c.to}</div>${active?'<button class="journal-action" data-course="contract">Plot current leg ↗</button><button class="contract-abandon">Abandon contract</button>':!done?`<button class="journal-action" data-contract="${c.id}" ${progress.contract?'disabled':''}>Accept contract</button>`:'<span class="delivered-stamp">CARGO RECEIVED ✓</span>'}</article>`;}).join('')}</div><button class="journal-action trail-action">Begin orange buoy trail ↗</button>`;
    }
  }
  function select(next){tab=next;dialog.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tab===tab)));render();}
  function open(){onOpen();document.querySelectorAll('dialog[open]').forEach(d=>d.close());render();dialog.showModal();}
  button.onclick=hud.onclick=open;dialog.querySelector('.close').onclick=()=>dialog.close();
  dialog.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.tab)select(b.dataset.tab);if(b.dataset.section)select(b.dataset.section);
    if(b.dataset.track){tracked=b.dataset.track;render();}
    if(b.dataset.contract){progress.accept(b.dataset.contract);render();}
    if(b.dataset.equip&&progress.equip(b.dataset.equip)){onEquip(PENNANTS.find(p=>p.id===b.dataset.equip));render();}
    if(b.classList.contains('contract-abandon')){progress.abandon();render();}
    if(b.classList.contains('trail-action')){onTrail();dialog.close();}
    if(b.dataset.course){const c=progress.contract;const target=b.dataset.course==='race'?{x:5,z:-54}:c?.phase==='pickup'?c.pickup:c?.drop;if(target){dialog.close();onCourse(target);}}
  });
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  function update(dt){
    clock+=dt;saveClock+=dt;const earnedNow=progress.notifications();queue.push(...earnedNow);if(earnedNow.length||saveClock>=5){progress.save();saveClock=0;}noticeTime-=dt;
    if(noticeTime<=0){notice.hidden=true;if(queue.length){const a=queue.shift();notice.innerHTML=`<span class="medal-seal" aria-hidden="true">✦</span><div><small>COMMENDATION EARNED · +${a.xp} RENOWN</small><strong>${a.name}</strong><span>${progress.rank} · ${progress.xp()} renown</span></div>`;notice.hidden=false;noticeTime=4.5;}}
    if(clock<.5)return;clock=0;
    const a=ACHIEVEMENTS.find(a=>a.id===tracked&&progress.count(a.stat)<a.goal)??ACHIEVEMENTS.find(a=>progress.count(a.stat)<a.goal),c=progress.contract;
    const heading=c?c.name:a?.name??'All commendations earned',detail=c?`${c.phase==='pickup'?'Load at '+c.from:'Deliver to '+c.to+' · '+Math.ceil(c.remaining)+' s'} · slow below 2 knots`:a?`${Math.floor(Math.min(a.goal,progress.count(a.stat)))} / ${a.goal} · ${a.text}`:'Open the journal to fly your colors.';
    const next=`${progress.rank}|${progress.xp()}|${heading}|${detail}|${progress.state.pennant}`;
    if(next!==revision){hud.innerHTML=`<small>${progress.rank.toUpperCase()} · ${progress.xp()} RENOWN <span>J ↗</span></small><strong>${heading}</strong><span>${detail}</span>`;revision=next;if(dialog.open)render();}
  }
  return {open,update};
}

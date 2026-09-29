/* Preflop IQ trainer page. Uses engine.js, achievements.js, player.js, fx.js, table.js and daily-core.js. */
const $=id=>document.getElementById(id);
let stats=PL.load();
let lastDelta=null;
let mode=store.get('pft-mode','all');
let tough=store.get('pft-tough',false);
let focus=store.get('pft-focus',null);   // drill one spot: {n,d,id,st}
STAGE=store.get('pic-stage','cev');
const CLOCK_SECONDS=7;
const statKey=s=>`${fmtKey()}-${s.id}`;
let cur=null,answered=false,lastKey='',clockTimer=null,tickTimer=null;

// A leak link (/?drill=8-100-vs-BB-UTG) starts drilling that spot.
(function(){
  const q=new URLSearchParams(location.search).get('drill');
  const p=q&&PL.parseKey(q);
  if(p&&TABLES[p.n]&&DEPTHS.includes(p.d)){focus=p;N=p.n;D=p.d;STAGE=p.st||'cev';store.set('pft-focus',focus);store.set('pft-n',N);store.set('pft-d',D);store.set('pic-stage',STAGE);}
  // A format link from the mastery map (/?fmt=6-25) switches table size and stack.
  const f=(new URLSearchParams(location.search).get('fmt')||'').match(/^(\d)-(\d+)$/);
  if(f&&TABLES[+f[1]]&&DEPTHS.includes(+f[2])){N=+f[1];D=+f[2];focus=null;store.set('pft-focus',null);store.set('pft-n',N);store.set('pft-d',D);}
  if(q||f)history.replaceState(null,'',location.pathname);
})();

// /?review=1 replays your saved mistakes, costliest first, until each is answered correctly.
let review=new URLSearchParams(location.search).get('review')?{seen:{},tick:0,cur:null}:null;
if(review)history.replaceState(null,'',location.pathname);
const reviewLocked=()=>!!(window.PIQ&&PIQ.paywallOn());

/* ---------- header: IQ, stats, streak ---------- */
function renderIQ(){
  const v=PL.iq(stats),n=stats.hist.length,prov=n<20;
  const pos=v===null?0:Math.max(0,Math.min(100,(v-25)/120*100));
  const d=lastDelta===null||lastDelta===0?'':`<span class="iqdelta ${lastDelta>0?'up':'down'}">${lastDelta>0?'+':''}${lastDelta}</span>`;
  $('iq').innerHTML=`<div class="iqnum${prov?' prov':''}">${v===null?'—':v}</div>
  <div class="iqmeta"><span class="iqlbl">Preflop IQ</span>
  <span class="iqtier">${v===null?'Play a hand to get scored':PL.tier(v)} ${d}</span>
  <div class="iqmeter" aria-hidden="true"><i style="left:${pos}%"></i></div>
  <span class="iqnote">${v===null?'Scale 25–145 · 100 is average':prov?`Provisional · ${n} of 20 hands`:`Last ${n} decisions`}</span></div>`;
}
function renderSetup(){
  $('players').innerHTML=[2,3,4,5,6,7,8,9].map(n=>`<button id="pl-${n}" data-n="${n}" aria-pressed="${n===N}" aria-label="${n} players">${n}</button>`).join('');
  $('stack').innerHTML=DEPTHS.map(d=>`<button id="st-${d}" data-d="${d}" aria-pressed="${d===D}">${d}bb</button>`).join('');
  const os=isPush()?'every open is a shove':`opens to ${openSize('CO')}bb`;
  $('stageseg').hidden=!(isPush()&&N>=3);
  $('stage').innerHTML=Object.entries(STAGES).map(([k,v])=>`<button data-st="${k}" aria-pressed="${k===(icmOn()?STAGE:'cev')}">${v}</button>`).join('');
  $('sub').textContent=`${N===2?'Heads-up':N+'-handed'} tournament · ${D}bb effective · 1bb big-blind ante · ${os} · ${isPush()?(icmOn()?`${STAGES[STAGE]} ICM solution`:'Nash-solved ranges'):'modeled ranges'}`;
  $('m-vs').textContent=isPush()?'Facing a shove':'Facing a raise';
  $('cfg').textContent=`· ${N===2?'heads-up':N+'-handed'}, ${D}bb`;
}
const MEDAL={gold:'Gold',silver:'Silver',bronze:'Bronze'};
function renderStats(){
  if(window.PIQ)renderFreeLeft();
  const acc=stats.total?Math.round(stats.correct/stats.total*100)+'%':'—';
  const st=PL.streak(stats),m=ACH.summary(stats),r=PL.rank(stats);
  renderIQ();
  $('stats').innerHTML=`<div class="stat"><b>${stats.total}</b><span>Hands</span></div><div class="stat"><b>${acc}</b><span>Accuracy</span></div><div class="stat"><b>${stats.streak}</b><span>Streak · best ${stats.best}</span></div>
    <a class="stat statlink" href="/progress/" title="${st.doneToday?'Today counts':`${st.today} of ${st.goal} hands today`}"><b class="${st.doneToday?'lit':''}">${st.days}</b><span>Day streak</span></a>
    <a class="stat statlink" href="/achievements/"><b>${m.earned}<small>/${m.total}</small></b><span>Achievements</span></a>
    <a class="stat statlink" href="/review/" title="Big blinds lost to mistakes per 100 hands, over your last ${(stats.lh||[]).length} decisions"><b>${(stats.lh||[]).length?((stats.lh.reduce((a,b)=>a+b,0)/stats.lh.length)*100).toFixed(0):'—'}</b><span>bb lost / 100</span></a>`;
  $('rankline').innerHTML=`<a href="/progress/">${r.cur.name}</a>${st.doneToday?'':` · <span>${st.today} of ${st.goal} hands for today’s streak</span>`}`;
  // 3-bet pot rows show once you've played them, or while drilling them.
  $('prog').innerHTML=SCN.filter(s=>!s.pro||mode==='pro'||(stats.per[statKey(s)]||{}).n).map(s=>{
    const p=stats.per[statKey(s)]||{n:0,c:0},pc=p.n?Math.round(p.c/p.n*100):null,md=PL.medal(p);
    return `<tr><td>${s.name}${s.pro?' <span class="protag">Pro</span>':''}${md?` <span class="medal medal-${md}" title="${MEDAL[md]} mastery">${MEDAL[md]}</span>`:''}</td><td class="n">${p.n}</td><td class="n">${p.c}</td><td><div style="display:flex;align-items:center;gap:8px"><div class="bar" style="flex:1"><span class="${pc!==null&&pc<70?'low':''}" style="width:${pc||0}%"></span></div><span class="n" style="font-family:var(--f-mono);min-width:3.5ch;text-align:right">${pc===null?'—':pc+'%'}</span></div></td></tr>`;
  }).join('');
  const lk=PL.leaks(stats,1)[0];
  $('leak').hidden=!lk||!!focus;
  if(lk&&!focus)$('leak').innerHTML=`<span class="eyebrow">Biggest leak</span><span><b>${lk.name}</b> · ${lk.format} · ${Math.round(lk.acc*100)}% over ${lk.n} hands</span><a class="btn ghost" href="/?drill=${encodeURIComponent(lk.key)}">Drill it</a>`;
}
function renderModes(){
  ['all','rfi','vs','pro'].forEach(m=>$('m-'+m).setAttribute('aria-pressed',!focus&&!review&&m===mode));
  $('m-pro').hidden=isPush()&&!review;
  $('tough').checked=tough;$('clock').checked=!!PL.settings.clock;
  $('sound').setAttribute('aria-pressed',!!PL.settings.sound);$('sound').textContent=PL.settings.sound?'Sound on':'Sound off';
  $('focusbar').hidden=!focus&&!review;
  if(review){const left=(stats.miss||[]).filter(m=>!m.c).length;
    $('focusbar').innerHTML=`<span><span class="eyebrow">Reviewing mistakes</span> <b>${left} left</b> · a miss clears when you get it right</span><button class="btn ghost" id="stopreview" type="button">Stop reviewing</button>`;return;}
  if(focus)$('focusbar').innerHTML=`<span><span class="eyebrow">Drilling</span> <b>${PL.spotName(focus.id,focus.d)}</b> · ${PL.formatName(focus.n,focus.d,focus.st)}</span><button class="btn ghost" id="stopdrill" type="button">Stop drilling</button>`;
}
function renderBanner(){
  const day=DAILY.today(),done=(PL.LS.get('pic-daily',{})[day]||{}).done;
  $('dailybanner').innerHTML=done
    ?`<span><span class="eyebrow">Daily challenge #${DAILY.number(day)}</span> Done for today. <a href="/daily/">See your result</a></span>`
    :`<span><span class="eyebrow">Daily challenge #${DAILY.number(day)}</span> 10 hands, mixed formats, one shot. Free, and it counts toward your streak.</span><a class="btn" href="/daily/">Play today’s</a>`;
}

/* ---------- dealing and answering ---------- */
function pickScenario(){
  if(focus){const s=SCN.find(x=>x.id===focus.id);if(s)return s;}
  const pro=SCN.filter(s=>s.pro),classic=SCN.filter(s=>!s.pro);
  // "All spots" mixes in 3-bet pots a quarter of the time; the chip drills them alone.
  let pool=mode==='pro'?pro:mode==='all'?(pro.length&&Math.random()<0.25?pro:classic):SCN.filter(s=>s.type===mode);
  if(!pool.length)pool=classic;
  return pool[Math.floor(Math.random()*pool.length)];
}
// The next saved mistake: costliest first, and one you just missed again goes to the back.
function nextReview(){
  const list=(stats.miss||[]).filter(m=>!m.c).sort((a,b)=>(review.seen[a.t]||0)-(review.seen[b.t]||0)||b.l-a.l);
  for(const m of list){
    const p=PL.parseKey(m.f+'-'+m.id);
    if(p){N=p.n;D=p.d;STAGE=p.st;buildScenarios();const s=SCN.find(x=>x.id===m.id);if(s&&(!s.range||s.range.has(m.k))){review.cur=m;renderSetup();return {s,k:m.k};}}
    m.c=1;   // the spot no longer exists
  }
  return null;
}
function reviewDone(){
  cur=null;answered=true;
  $('actions').innerHTML='';$('next').hidden=true;$('cards').innerHTML='';$('spotLabel').textContent='';$('prompt').textContent='';
  $('panel').innerHTML=`<div class="verdict ok"><h2>All caught up</h2></div><p>Every saved mistake has been answered correctly. New misses will show up in your <a href="/review/">mistake review</a>.</p><button class="btn" id="endreview" type="button">Back to the trainer</button>`;
}
function stopReview(){if(!review)return;review=null;N=store.get('pft-n',8);D=store.get('pft-d',100);STAGE=store.get('pic-stage','cev');}
function deal(){
  stopClock();
  if(window.PIQ&&PIQ.locked()){showPaywall();return;}
  hidePaywall();
  if(review&&reviewLocked()){review=null;renderModes();$('focusbar').hidden=false;
    $('focusbar').innerHTML='<span><span class="eyebrow">Pro</span> Drilling your saved mistakes is part of Pro.</span><a class="btn ghost" href="/pricing/">See Pro</a>';}
  let s,k,tries=0;
  if(review){const r=nextReview();if(!r){renderModes();reviewDone();return;}({s,k}=r);renderModes();}
  else do{s=pickScenario();const src=(tough||focus||Math.random()<0.6)?s.border:s.pool;k=src[Math.floor(Math.random()*src.length)];tries++;}while(s.id+k===lastKey&&tries<10);
  lastKey=s.id+k;cur={s,k,rev:review?review.cur:null};answered=false;
  $('felt').innerHTML=TBL.felt(s);
  $('cards').innerHTML=TBL.cards(k);
  $('spotLabel').textContent=s.name;
  $('prompt').innerHTML=TBL.prompt(s,k);
  $('actions').innerHTML=TBL.actions(s);
  $('next').hidden=true;
  $('panel').innerHTML=TBL.before(s);
  FX.play('deal');
  if(PL.settings.clock)startClock();
}
function answer(a,opts={}){
  if(answered||!cur)return;
  if(window.PIQ&&PIQ.locked()){showPaywall();return;}
  const btn=$('act-'+a);if(!btn)return;
  answered=true;stopClock();
  const right=actionOf(cur.s,cur.k),loss=evLoss(cur.s,cur.k,a);
  document.querySelectorAll('.act').forEach(b=>{b.disabled=true;if(b.dataset.a===right)b.classList.add('right');});
  btn.classList.add('picked');
  const res=PL.record(stats,{s:cur.s,k:cur.k,pick:a,right,loss,review:!!cur.rev,clock:!!PL.settings.clock});
  if(cur.rev){if(a===right)cur.rev.c=1;else{cur.rev.n=(cur.rev.n||1)+1;cur.rev.t2=Date.now();}review.seen[cur.rev.t]=++review.tick;renderModes();}
  lastDelta=res.delta;
  PL.save(stats);
  if(window.PIQ)PIQ.recordHand();
  renderStats();
  $('panel').innerHTML=TBL.after(cur.s,cur.k,a,right,{...opts,loss});
  FX.play(res.ok?'right':'wrong');
  if(res.fresh.length)ACH.celebrate(res.fresh);
  if(res.fresh.some(x=>x.kicker==='New rank'))FX.applyTheme(stats);
  $('next').hidden=false;$('next').focus({preventScroll:true});
}

/* ---------- shot clock: when time runs out, your hand is folded ---------- */
function startClock(){
  const bar=$('clockbar');bar.hidden=false;
  bar.innerHTML='<i></i><span></span>';
  const fill=bar.querySelector('i'),label=bar.querySelector('span');
  const t0=performance.now(),ms=CLOCK_SECONDS*1000;
  const frame=()=>{
    const left=Math.max(0,ms-(performance.now()-t0));
    fill.style.width=(left/ms*100)+'%';bar.classList.toggle('urgent',left<3000);
    label.textContent=Math.ceil(left/1000)+'s';
    if(left>0&&!answered)clockTimer=requestAnimationFrame(frame);
  };
  clockTimer=requestAnimationFrame(frame);
  tickTimer=setInterval(()=>{if(!answered&&performance.now()-t0>ms-3200)FX.play('tick');},1000);
  setTimeout(()=>{if(!answered&&cur&&performance.now()-t0>=ms-50)answer('fold',{timeout:true});},ms);
}
function stopClock(){cancelAnimationFrame(clockTimer);clearInterval(tickTimer);const b=$('clockbar');if(b){b.hidden=true;b.classList.remove('urgent');}}

function applyConfig(){buildScenarios();renderSetup();renderModes();renderStats();deal();}

/* ---------- controls ---------- */
$('actions').addEventListener('click',e=>{const b=e.target.closest('.act');if(b)answer(b.dataset.a);});
$('next').addEventListener('click',deal);
$('players').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;N=+b.dataset.n;store.set('pft-n',N);clearFocus(false);applyConfig();});
$('stack').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;D=+b.dataset.d;store.set('pft-d',D);clearFocus(false);applyConfig();});
$('stage').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;STAGE=b.dataset.st;store.set('pic-stage',STAGE);clearFocus(false);applyConfig();});
document.querySelectorAll('.modes .chip[data-mode]').forEach(c=>c.addEventListener('click',()=>{mode=c.dataset.mode;store.set('pft-mode',mode);clearFocus(false);renderModes();renderStats();deal();}));
$('tough').addEventListener('change',e=>{tough=e.target.checked;store.set('pft-tough',tough);if(!answered)deal();});
$('clock').addEventListener('change',e=>{PL.setSetting('clock',e.target.checked);if(!answered)deal();});
$('sound').addEventListener('click',()=>{PL.setSetting('sound',!PL.settings.sound);renderModes();FX.play('right');});
$('focusbar').addEventListener('click',e=>{if(e.target.id==='stopdrill'){clearFocus(true);}if(e.target.id==='stopreview'){stopReview();applyConfig();}});
$('panel').addEventListener('click',e=>{if(e.target.id==='endreview'){stopReview();applyConfig();}});
function clearFocus(redeal){if(review&&!redeal){review=null;renderModes();}if(!focus)return;focus=null;store.set('pft-focus',null);renderModes();renderStats();if(redeal)deal();}
let resetArmed=false;
$('reset').addEventListener('click',()=>{
  if(!resetArmed){resetArmed=true;$('reset').textContent='Tap again to reset';setTimeout(()=>{resetArmed=false;$('reset').textContent='Reset stats';},3000);return;}
  // Achievements, rank, day streak and best IQ are earned; a reset clears accuracy only.
  stats={total:0,correct:0,streak:0,best:0,per:{},hist:[],a:stats.a,play:stats.play,iqBest:stats.iqBest,rankIdx:stats.rankIdx};
  lastDelta=null;PL.save(stats);renderStats();resetArmed=false;$('reset').textContent='Reset stats';
});
TBL.bindKeys({answer:a=>answer(a),next:deal,isAnswered:()=>answered,spot:()=>cur&&cur.s});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&PL.settings.clock&&!answered){stopClock();}else if(!document.hidden&&PL.settings.clock&&!answered&&cur){startClock();}});

/* ---------- first visit ---------- */
function renderHero(){
  const show=stats.total===0&&!PL.LS.get('pic-hero-dismissed',false);
  $('hero').hidden=!show;
}
$('hero').addEventListener('click',e=>{
  if(e.target.id==='hero-start'){PL.LS.set('pic-hero-dismissed',true);renderHero();const f=$('felt');if(f.scrollIntoView)f.scrollIntoView({behavior:'smooth',block:'center'});}
});

/* ---------- free-hand limit and paywall ---------- */
function renderFreeLeft(){
  let el=$('freeleft');
  if(!el){el=document.createElement('a');el.id='freeleft';el.className='freeleft';el.href='/pricing/';$('stats').after(el);}
  const left=window.PIQ?PIQ.handsLeft():Infinity,st=window.PIQ&&PIQ.state;
  // Pro trial: days left. Signed out: the free trial is the offer. Signed in after the trial: Go Pro.
  if(st&&PIQ.payments&&st.onTrial){const d=PIQ.trialDaysLeft();el.hidden=false;el.href='/pricing/';el.className='freeleft trial';
    el.innerHTML=`<b>Pro trial</b> · ${d} day${d===1?'':'s'} left · <span>Keep Pro</span>`;return;}
  el.className='freeleft';el.hidden=!isFinite(left);
  const trialOffer=st&&!st.user;el.href=trialOffer?'/account/?view=signup&next=trainer':'/pricing/';
  if(isFinite(left)) el.innerHTML=left>0?`<b>${left}</b> free hand${left===1?'':'s'} left · <span>${trialOffer?'Try Pro free for 7 days':'Go Pro'}</span>`:`<b>Free hands used</b> · <span>${trialOffer?'Try Pro free for 7 days':'Go Pro'}</span>`;
}
function paywallEl(){
  let el=$('paywall');if(el)return el;
  el=document.createElement('div');el.id='paywall';el.className='paywall';el.hidden=true;
  el.innerHTML=`<div class="paywall-card" role="dialog" aria-modal="true" aria-labelledby="pw-title">
    <span class="eyebrow">Preflop IQ Pro</span>
    <h2 id="pw-title">You've played your ${PIQ.FREE_HANDS} free hands</h2>
    <p>Keep your streak going. Pro gives you unlimited hands at every table size and stack depth, 3-bet pots and squeezes, bubble and final-table ranges, and a review of what every mistake cost you. The daily challenge stays free either way.</p>
    <a class="cta trialcta" id="pw-trial" href="/account/?view=signup&next=trainer">Start a 7-day free trial <small>No card needed</small></a>
    <div class="plans">
      <button class="plan" id="pw-annual" data-plan="annual"><span class="plan-name">Annual</span><span class="plan-price">$59<small>/year</small></span><span class="plan-note">About $4.92 a month · save 38%</span></button>
      <button class="plan" id="pw-monthly" data-plan="monthly"><span class="plan-name">Monthly</span><span class="plan-price">$7.99<small>/month</small></span><span class="plan-note">Cancel anytime</span></button>
    </div>
    <p class="pw-error" id="pw-error" role="alert" hidden></p>
    <p class="pw-links"><a href="/account/?next=trainer" id="pw-signin">Already have Pro? Sign in</a> · <a href="/daily/">Play today's free challenge</a></p>
  </div>`;
  document.body.appendChild(el);
  el.addEventListener('click',async e=>{
    const b=e.target.closest('.plan');if(!b)return;
    const err=$('pw-error');err.hidden=true;b.disabled=true;
    try{await PIQ.checkout(b.dataset.plan);}catch(x){err.textContent=x.message;err.hidden=false;b.disabled=false;}
  });
  return el;
}
function showPaywall(){
  const el=paywallEl();stopClock();
  $('pw-signin').hidden=!!PIQ.state.user;
  // Signed out: the free trial comes first. Signed in: their trial has already been used.
  $('pw-trial').hidden=!!PIQ.state.user;
  $('pw-title').textContent=PIQ.state.user&&PIQ.state.trialEnds?'Your 7-day Pro trial has ended':`You've played your ${PIQ.FREE_HANDS} free hands`;
  if(el.hidden){el.hidden=false;$('pw-annual').focus({preventScroll:true});}
}
function hidePaywall(){const el=$('paywall');if(el)el.hidden=true;}

/* ---------- start ---------- */
FX.applyTheme(stats);renderHero();renderBanner();applyConfig();
PL.withRemote(stats).then(s=>{
  stats=s;FX.applyTheme(stats);renderStats();renderHero();
  if(window.PIQ){renderFreeLeft();if(PIQ.locked()&&!answered)showPaywall();}
});
if(window.PIQ)PIQ.onChange(()=>{renderFreeLeft();FX.applyTheme(stats);if(!PIQ.locked())hidePaywall();else if(!answered)showPaywall();});

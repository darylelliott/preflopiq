/* Preflop IQ trainer page */
/* ---------- stats and score ---------- */
let stats=store.get('pft-stats2',{total:0,correct:0,streak:0,best:0,per:{}});
if(!Array.isArray(stats.hist))stats.hist=[];
let lastDelta=null;
const TIERS=[[135,'Solver-brained'],[120,'Shark'],[105,'Regular'],[90,'Recreational'],[0,'Fish']];
function iqScore(){const h=stats.hist;if(!h.length)return null;let w=0,p=0;h.forEach(x=>{w+=x.w;p+=x.w*x.p;});return Math.round(25+120*p/w);}
function renderIQ(){
  const v=iqScore(),n=stats.hist.length,prov=n<20;
  const tier=v===null?'':TIERS.find(t=>v>=t[0])[1];
  const pos=v===null?0:Math.max(0,Math.min(100,(v-25)/120*100));
  const d=lastDelta===null||lastDelta===0?'':`<span class="iqdelta ${lastDelta>0?'up':'down'}">${lastDelta>0?'+':''}${lastDelta}</span>`;
  $('iq').innerHTML=`<div class="iqnum${prov?' prov':''}">${v===null?'\u2014':v}</div>
  <div class="iqmeta"><span class="iqlbl">Preflop IQ</span>
  <span class="iqtier">${v===null?'Play a hand to get scored':tier} ${d}</span>
  <div class="iqmeter" aria-hidden="true"><i style="left:${pos}%"></i></div>
  <span class="iqnote">${v===null?'Scale 25\u2013145 · 100 is average':prov?`Provisional · ${n} of 20 hands`:`Last ${n} decisions`}</span></div>`;
}
let mode=store.get('pft-mode','all');
let tough=store.get('pft-tough',false);
const statKey=s=>`${N}-${D}-${s.id}`;

/* ---------- rendering ---------- */
const $=id=>document.getElementById(id);
let cur=null,answered=false,lastKey='';

function renderSetup(){
  $('players').innerHTML=[2,3,4,5,6,7,8,9].map(n=>`<button id="pl-${n}" data-n="${n}" aria-pressed="${n===N}" aria-label="${n} players">${n}</button>`).join('');
  $('stack').innerHTML=DEPTHS.map(d=>`<button id="st-${d}" data-d="${d}" aria-pressed="${d===D}">${d}bb</button>`).join('');
  const os=isPush()?'every open is a shove':`opens to ${openSize('CO')}bb`;
  $('sub').textContent=`${N===2?'Heads-up':N+'-handed'} tournament · ${D}bb effective · 1bb big-blind ante · ${os} · ${isPush()?'Nash-solved ranges':'modeled ranges'}`;
  $('m-vs').textContent=isPush()?'Facing a shove':'Facing a raise';
  $('cfg').textContent=`· ${N===2?'heads-up':N+'-handed'}, ${D}bb`;
}
function renderStats(){
  if(typeof renderFreeLeft==='function'&&window.PIQ)renderFreeLeft();
  const acc=stats.total?Math.round(stats.correct/stats.total*100)+'%':'—';
  renderIQ();
  $('stats').innerHTML=`<div class="stat"><b>${stats.total}</b><span>Hands</span></div><div class="stat"><b>${acc}</b><span>Accuracy</span></div><div class="stat"><b>${stats.streak}</b><span>Streak · best ${stats.best}</span></div>${window.ACH?(()=>{const m=ACH.summary(stats);return `<a class="stat statlink" href="/achievements/"><b>${m.earned}<small>/${m.total}</small></b><span>Achievements</span></a>`;})():''}`;
  $('prog').innerHTML=SCN.map(s=>{
    const p=stats.per[statKey(s)]||{n:0,c:0};const pc=p.n?Math.round(p.c/p.n*100):null;
    return `<tr><td>${s.name}</td><td class="n">${p.n}</td><td class="n">${p.c}</td><td><div style="display:flex;align-items:center;gap:8px"><div class="bar" style="flex:1"><span class="${pc!==null&&pc<70?'low':''}" style="width:${pc||0}%"></span></div><span class="n" style="font-family:var(--f-mono);min-width:3.5ch;text-align:right">${pc===null?'—':pc+'%'}</span></div></td></tr>`;
  }).join('');
}
function renderModes(){
  ['all','rfi','vs'].forEach(m=>$('m-'+m).setAttribute('aria-pressed',m===mode));
  $('tough').checked=tough;
}
function renderTable(s){
  const names=TABLES[N],h=names.indexOf(s.hero),o=s.opener?names.indexOf(s.opener):-1,step=360/N;
  let html='';
  names.forEach((p,i)=>{
    const k=(i-h+N)%N,a=(90+step*k)*Math.PI/180;
    const x=50+46*Math.cos(a),y=50+43*Math.sin(a);
    const st=i===h?'hero':i===o?'open':i<h?'folded':'wait';
    html+=`<div class="seat ${st}" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%"><span class="pos">${p}</span><span class="stk">${st==='hero'?`You · ${D}bb`:st==='folded'?'folded':D+'bb'}</span></div>`;
    let bet=null;
    if(st!=='folded'){if(i===o)bet=isPush()?'All-in':s.open;else if(posted(p))bet=posted(p);}
    if(bet!==null){const cx=50+29*Math.cos(a),cy=50+25*Math.sin(a);html+=`<div class="bet ${i===o?'raise':''}" style="left:${cx.toFixed(2)}%;top:${cy.toFixed(2)}%">${bet}</div>`;}
    if(p==='BTN'){const b=a-(N<=3?0.5:0.34);html+=`<div class="dealer" style="left:${(50+35*Math.cos(b)).toFixed(2)}%;top:${(50+31*Math.sin(b)).toFixed(2)}%">D</div>`;}
  });
  const pot=s.type==='rfi'?2.5:s.pot;
  html+=`<div class="center"><div class="fmt">${N===2?'Heads-up':N+'-max'} · ${D}bb</div><div class="pot">Pot ${pot}bb</div><div class="potnote">incl. 1bb ante</div></div>`;
  $('felt').innerHTML=html;
}
function dealCards(k){
  const suits=['s','h','d','c'].sort(()=>Math.random()-.5);
  const h=info(k);const s1=suits[0],s2=h.s?suits[0]:suits[1];
  const sym={s:'♠',h:'♥',d:'♦',c:'♣'};
  return [[R[h.hi],s1],[R[h.lo],s2]].map(([r,s])=>`<div class="card s-${s}"><span class="r">${r==='T'?'10':r}</span><span class="s">${sym[s]}</span></div>`).join('');
}
function renderPanelBefore(s){
  $('panel').innerHTML=`<div class="blk"><h3>The spot</h3><p>${spotContext(s)}</p></div>
  <p class="hint">Pick an action to see the answer, why it's right, and the full range chart for this spot.</p>
  <p class="hint">Keys: <kbd>F</kbd> fold${s.type==='vs'?' · <kbd>C</kbd> call':''}${s.type==='rfi'||!isPush()?` · <kbd>R</kbd> ${s.type==='vs'?'3-bet':isPush()?'shove':'raise'}`:''} · <kbd>Space</kbd> next hand</p>`;
}
function renderPanelAfter(s,k,pick,right){
  const ok=pick===right,h=info(k);
  $('panel').innerHTML=`<div class="verdict ${ok?'ok':'no'}"><h2>${ok?'Correct':'Not quite'}</h2><span class="answerline">You: <b>${s.labels[pick]}</b> · Chart: <b>${s.labels[right]}</b> with <b>${k}</b></span></div>
  <div class="blk"><h3>The play</h3><p>${reason(s,right,h)}</p></div>
  <div class="blk"><h3>The hand</h3><p>${trait(h)}</p></div>
  <div class="blk"><h3>The spot</h3><p>${spotContext(s)}</p></div>
  <div class="catline">${catLine(s,h)}</div>
  ${gridHTML(s,k)}`;
}
function pickScenario(){
  let pool=SCN.filter(s=>mode==='all'||s.type===mode);
  if(!pool.length) pool=SCN;
  return pool[Math.floor(Math.random()*pool.length)];
}
function deal(){
  if(window.PIQ&&PIQ.locked()){showPaywall();return;}
  hidePaywall();
  let s,k,tries=0;
  do{s=pickScenario();const src=(tough||Math.random()<0.6)?s.border:HANDS;k=src[Math.floor(Math.random()*src.length)];tries++;}while(s.id+k===lastKey&&tries<10);
  lastKey=s.id+k;cur={s,k};answered=false;
  renderTable(s);
  $('cards').innerHTML=dealCards(k);
  $('spotLabel').textContent=s.name;
  const push=isPush();
  $('prompt').innerHTML=s.type==='rfi'
    ? `Folds to you on the <b>${s.hero}</b>. You hold <span class="hk">${k}</span>.`
    : `The <b>${s.opener}</b> ${push?`shoves ${D}bb`:`opens to ${s.open}bb`}${TABLES[N].indexOf(s.hero)-TABLES[N].indexOf(s.opener)>1?', folds to you':''} on the <b>${s.hero}</b>. You hold <span class="hk">${k}</span>.`;
  $('actions').innerHTML=actionsFor(s).map(x=>`<button class="act" id="act-${x.a}" data-a="${x.a}">${x.label}<kbd>${x.key}</kbd></button>`).join('');
  $('next').hidden=true;
  renderPanelBefore(s);
}
function answer(a){
  if(answered||!cur) return;
  if(window.PIQ&&PIQ.locked()){showPaywall();return;}
  const btn=$('act-'+a);if(!btn) return;
  answered=true;
  const right=actionOf(cur.s,cur.k),ok=a===right;
  document.querySelectorAll('.act').forEach(b=>{b.disabled=true;if(b.dataset.a===right)b.classList.add('right');});
  btn.classList.add('picked');
  stats.total++;if(ok){stats.correct++;stats.streak++;stats.best=Math.max(stats.best,stats.streak);}else stats.streak=0;
  const key=statKey(cur.s);const p=stats.per[key]||(stats.per[key]={n:0,c:0});p.n++;if(ok)p.c++;
  const before=iqScore();
  const pts=ok?1:(a!=='fold'&&right!=='fold'?0.4:0);
  stats.hist.push({p:pts,w:cur.s.border.includes(cur.k)&&cur.s.border!==HANDS?1.5:1});
  if(stats.hist.length>100)stats.hist.shift();
  const after=iqScore();lastDelta=before===null?null:after-before;
  let fresh=[];
  if(window.ACH){
    const h=info(cur.k);
    fresh=ACH.record(stats,{type:cur.s.type,hero:cur.s.hero,push:isPush(),N,D,hand:cur.k,pair:h.pair,suited:h.s,hi:h.hi,lo:h.lo,
      right,pick:a,ok,border:cur.s.border!==HANDS&&cur.s.border.includes(cur.k),iq:stats.hist.length>=20?after:-1});
  }
  store.set('pft-stats2',stats);
  if(window.PIQ){PIQ.recordHand();PIQ.saveStats(stats);}
  renderStats();
  renderPanelAfter(cur.s,cur.k,a,right);
  if(fresh.length)ACH.celebrate(fresh);
  $('next').hidden=false;$('next').focus({preventScroll:true});
}
function applyConfig(){buildScenarios();renderSetup();renderStats();deal();}

$('actions').addEventListener('click',e=>{const b=e.target.closest('.act');if(b)answer(b.dataset.a);});
$('next').addEventListener('click',deal);
$('players').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;N=+b.dataset.n;store.set('pft-n',N);applyConfig();});
$('stack').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;D=+b.dataset.d;store.set('pft-d',D);applyConfig();});
document.querySelectorAll('.chip').forEach(c=>c.addEventListener('click',()=>{mode=c.dataset.mode;store.set('pft-mode',mode);renderModes();deal();}));
$('tough').addEventListener('change',e=>{tough=e.target.checked;store.set('pft-tough',tough);if(!answered)deal();});
let resetArmed=false;
$('reset').addEventListener('click',()=>{
  if(!resetArmed){resetArmed=true;$('reset').textContent='Tap again to reset';setTimeout(()=>{resetArmed=false;$('reset').textContent='Reset stats';},3000);return;}
  stats={total:0,correct:0,streak:0,best:0,per:{},hist:[],a:stats.a};lastDelta=null;store.set('pft-stats2',stats);renderStats();resetArmed=false;$('reset').textContent='Reset stats';
});
document.addEventListener('keydown',e=>{
  if(e.metaKey||e.ctrlKey||e.altKey) return;
  if(e.target.tagName==='INPUT') return;
  const k=e.key.toLowerCase();
  if(!answered){
    if(k==='f')answer('fold');
    else if(k==='c')answer('call');
    else if(k==='r'||k==='3')answer(cur.s.type==='rfi'?'raise':'3bet');
  }else if(k===' '||k==='enter'||k==='n'){
    if(e.target.tagName==='BUTTON'&&e.target.id!=='next'&&k!=='n')return;
    e.preventDefault();deal();}
});

/* ---------- free-hand limit and paywall ---------- */
function renderFreeLeft(){
  let el=$('freeleft');
  if(!el){el=document.createElement('a');el.id='freeleft';el.className='freeleft';el.href='/pricing/';$('stats').after(el);}
  const left=window.PIQ?PIQ.handsLeft():Infinity;
  el.hidden=!isFinite(left);
  if(isFinite(left)) el.innerHTML=left>0?`<b>${left}</b> free hand${left===1?'':'s'} left · <span>Go Pro</span>`:'<b>Free hands used</b> · <span>Go Pro</span>';
}
function paywallEl(){
  let el=$('paywall');if(el)return el;
  el=document.createElement('div');el.id='paywall';el.className='paywall';el.hidden=true;
  el.innerHTML=`<div class="paywall-card" role="dialog" aria-modal="true" aria-labelledby="pw-title">
    <span class="eyebrow">Preflop IQ Pro</span>
    <h2 id="pw-title">You've played your ${PIQ.FREE_HANDS} free hands</h2>
    <p>Keep your streak going. Pro gives you unlimited hands at every table size and stack depth, every range chart, and your progress synced across devices.</p>
    <div class="plans">
      <button class="plan" id="pw-annual" data-plan="annual"><span class="plan-name">Annual</span><span class="plan-price">$59<small>/year</small></span><span class="plan-note">About $4.92 a month · save 38%</span></button>
      <button class="plan" id="pw-monthly" data-plan="monthly"><span class="plan-name">Monthly</span><span class="plan-price">$7.99<small>/month</small></span><span class="plan-note">Cancel anytime</span></button>
    </div>
    <p class="pw-error" id="pw-error" role="alert" hidden></p>
    <p class="pw-links"><a href="/account/?next=trainer" id="pw-signin">Already have Pro? Sign in</a> · <a href="/charts/">Browse the free charts</a></p>
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
  const el=paywallEl();
  $('pw-signin').hidden=!!PIQ.state.user;
  if(el.hidden){el.hidden=false;$('pw-annual').focus({preventScroll:true});}
}
function hidePaywall(){const el=$('paywall');if(el)el.hidden=true;}

renderModes();applyConfig();
if(window.PIQ){
  PIQ.ready.then(()=>{
    // Signed-in users pick up progress saved from their other devices.
    const remote=PIQ.state.profile&&PIQ.state.profile.stats;
    if(remote&&remote.total>stats.total){const local=stats;stats=remote;if(!Array.isArray(stats.hist))stats.hist=[];if(window.ACH)ACH.merge(stats,local);store.set('pft-stats2',stats);}
    else if(remote&&window.ACH){ACH.merge(stats,remote);store.set('pft-stats2',stats);}
    renderStats();renderFreeLeft();
    if(PIQ.locked()&&!answered)showPaywall();
  });
  PIQ.onChange(()=>{renderFreeLeft();if(!PIQ.locked())hidePaywall();else if(!answered)showPaywall();});
}


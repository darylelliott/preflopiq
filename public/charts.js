/* Preflop IQ range charts page: browse any spot's chart and inspect individual hands. */
const $=id=>document.getElementById(id);
let spotId=store.get('pic-chart-spot','rfi-UTG');
STAGE=store.get('pic-stage','cev');
// Links from the range library open a specific chart: /charts/?fmt=8-100&spot=vs-BB-BTN
(function(){
  const q=new URLSearchParams(location.search),f=(q.get('fmt')||'').match(/^(\d)-(\d+)$/);
  if(f&&TABLES[+f[1]]&&DEPTHS.includes(+f[2])){N=+f[1];D=+f[2];store.set('pft-n',N);store.set('pft-d',D);}
  if(q.get('spot')){spotId=q.get('spot');store.set('pic-chart-spot',spotId);}
  if(f||q.get('spot'))history.replaceState(null,'',location.pathname);
})();
let selected=null;

// Free users can study 8-handed 100bb opens and calls; every other format, 3-bet pots and the
// bubble and final-table charts are Pro.
const chartLocked=()=>!!(window.PIQ&&PIQ.paywallOn()&&(!(N===8&&D===100)||current().pro||icmOn()));
function renderLock(){
  const locked=chartLocked(),s=current();
  $('chartcard').classList.toggle('locked',locked);
  $('chartlock').hidden=!locked;
  const what=s.pro?`${s.name} is a Pro chart`:icmOn()?`${STAGES[STAGE]} charts are Pro`:`${N===2?'Heads-up':N+'-handed'} at ${D}bb is a Pro chart`;
  if(locked) $('chartlock').innerHTML=`<div class="lockbox"><span class="eyebrow">Pro chart</span>
    <h3>${what}</h3>
    <p>Free accounts can study the 8-handed 100bb opening and calling charts. Pro unlocks every table size and stack, 3-bet pots and squeezes, bubble and final-table charts, plus unlimited trainer hands.</p>
    <a class="cta" href="/pricing/">See Pro plans</a>
    <button class="linkbtn" id="unlock-free" type="button">Show 8-handed 100bb instead</button></div>`;
}
function tagFor(s,a){return `<span class="tag ${tagCls(a)}">${s.labels[a]}</span>`;}

function renderSetup(){
  $('players').innerHTML=[2,3,4,5,6,7,8,9].map(n=>`<button id="pl-${n}" data-n="${n}" aria-pressed="${n===N}" aria-label="${n} players">${n}</button>`).join('');
  $('stack').innerHTML=DEPTHS.map(d=>`<button id="st-${d}" data-d="${d}" aria-pressed="${d===D}">${d}bb</button>`).join('');
  $('stageseg').hidden=!(isPush()&&N>=3);
  $('stage').innerHTML=Object.entries(STAGES).map(([k,v])=>`<button data-st="${k}" aria-pressed="${k===(icmOn()?STAGE:'cev')}">${v}</button>`).join('');
}
function renderSpots(){
  const group=(type,label)=>{
    const list=SCN.filter(s=>s.type===type);
    if(!list.length) return '';
    return `<div class="spotgroup"><span class="seglbl">${label}${list[0].pro?' <span class="protag">Pro</span>':''}</span>${list.map(s=>`<button class="chip" data-spot="${s.id}" aria-pressed="${s.id===spotId}">${s.name}</button>`).join('')}</div>`;
  };
  $('spots').innerHTML=group('rfi',isPush()?'Shoving':'Opening')+group('vs',isPush()?'Facing a shove':'Facing a raise')
    +group('iso','Facing limpers')+group('v3','Facing a 3-bet')+group('sq','Squeezes')+group('lp','Blind vs blind limp');
}
function current(){return SCN.find(s=>s.id===spotId)||SCN[0];}
function renderChart(){
  const s=current();spotId=s.id;
  $('chart-title').textContent=`${s.name} · ${N===2?'heads-up':N+'-handed'} · ${D}bb${icmOn()?' · '+STAGES[STAGE].toLowerCase():''} · ${chartSource(s)}`;
  const lock=chartLocked();
  // A locked chart shows a blank grid rather than hiding real answers behind a blur.
  $('grid').innerHTML=HANDS.map(k=>{const na=!lock&&s.range&&!s.range.has(k),a=lock?'fold':actionOf(s,k);
    return `<button class="${na?'na':actCls(a)}" data-k="${k}" aria-pressed="${k===selected}" aria-label="${lock?k:na?`${k}: not in your opening range`:`${k}: ${s.labels[a]}`}"${lock?' tabindex="-1"':''}>${k}</button>`;}).join('');
  $('legend').hidden=lock;
  $('legend').innerHTML=legendHTML(s);
  renderLock();
  renderDetail();
}
function renderDetail(){
  const s=current();
  if(chartLocked()){selected=null;$('detail').innerHTML=`<div class="blk"><h3>The spot</h3><p>${spotContext(s)}</p></div>`;return;}
  if(!selected){
    $('detail').innerHTML=`<div class="blk"><h3>The spot</h3><p>${spotContext(s)}</p></div>
    <p class="hint">Tap any hand in the chart to see what to do with it and why.</p>`;
    return;
  }
  if(s.range&&!s.range.has(selected)){$('detail').innerHTML=`<div class="handhead"><h2>${selected}</h2><span class="tag fold">Not opened</span></div>
    <div class="blk"><h3>The play</h3><p>The ${s.hero} folds ${selected} before anyone 3-bets, so it never reaches this spot. See the <button class="linkbtn" data-goto="rfi-${s.hero}" type="button">${s.hero} ${isPush()?'shove':'open'} chart</button>.</p></div>
    <div class="blk"><h3>The spot</h3><p>${spotContext(s)}</p></div>`;return;}
  const h=info(selected),a=actionOf(s,selected);
  $('detail').innerHTML=`<div class="handhead"><h2>${selected}</h2>${tagFor(s,a)}</div>
  <div class="blk"><h3>The play</h3><p>${reason(s,a,h)}</p></div>
  <div class="blk"><h3>The hand</h3><p>${trait(h)}</p></div>
  <div class="catline">${catLine(s,h)}</div>
  <div class="blk"><h3>The spot</h3><p>${spotContext(s)}</p></div>`;
}
function apply(){buildScenarios();renderSetup();renderSpots();renderChart();}

$('players').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;N=+b.dataset.n;store.set('pft-n',N);apply();});
$('stack').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;D=+b.dataset.d;store.set('pft-d',D);apply();});
$('spots').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;spotId=b.dataset.spot;store.set('pic-chart-spot',spotId);renderSpots();renderChart();});
$('stage').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;STAGE=b.dataset.st;store.set('pic-stage',STAGE);apply();});
$('chartlock').addEventListener('click',e=>{if(e.target.id!=='unlock-free')return;N=8;D=100;if(current().pro){spotId='rfi-UTG';store.set('pic-chart-spot',spotId);}store.set('pft-n',N);store.set('pft-d',D);apply();});
$('detail').addEventListener('click',e=>{const b=e.target.closest('[data-goto]');if(!b)return;spotId=b.dataset.goto;store.set('pic-chart-spot',spotId);renderSpots();renderChart();});
$('grid').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||chartLocked())return;selected=b.dataset.k===selected?null:b.dataset.k;
  $('grid').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x.dataset.k===selected));renderDetail();});

apply();
if(window.PIQ){PIQ.ready.then(apply);PIQ.onChange(apply);}

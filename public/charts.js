/* Preflop IQ range charts page: browse any spot's chart and inspect individual hands. */
const $=id=>document.getElementById(id);
let spotId=store.get('pic-chart-spot','rfi-UTG');
let selected=null;

// Free users can study 8-handed 100bb; every other format is Pro.
const chartLocked=()=>!!(window.PIQ&&PIQ.paywallOn()&&!(N===8&&D===100));
function renderLock(){
  const locked=chartLocked();
  $('chartcard').classList.toggle('locked',locked);
  $('chartlock').hidden=!locked;
  if(locked) $('chartlock').innerHTML=`<div class="lockbox"><span class="eyebrow">Pro chart</span>
    <h3>${N===2?'Heads-up':N+'-handed'} at ${D}bb is a Pro chart</h3>
    <p>Free accounts can study every 8-handed 100bb spot. Pro unlocks all ${DEPTHS.length*8} table and stack combinations, plus unlimited trainer hands.</p>
    <a class="cta" href="/pricing/">See Pro plans</a>
    <button class="linkbtn" id="unlock-free" type="button">Show 8-handed 100bb instead</button></div>`;
}
function tagFor(s,a){return `<span class="tag ${a==='3bet'?'t3bet':a}">${s.labels[a]}</span>`;}

function renderSetup(){
  $('players').innerHTML=[2,3,4,5,6,7,8,9].map(n=>`<button id="pl-${n}" data-n="${n}" aria-pressed="${n===N}" aria-label="${n} players">${n}</button>`).join('');
  $('stack').innerHTML=DEPTHS.map(d=>`<button id="st-${d}" data-d="${d}" aria-pressed="${d===D}">${d}bb</button>`).join('');
}
function renderSpots(){
  const group=(type,label)=>{
    const list=SCN.filter(s=>s.type===type);
    if(!list.length) return '';
    return `<div class="spotgroup"><span class="seglbl">${label}</span>${list.map(s=>`<button class="chip" data-spot="${s.id}" aria-pressed="${s.id===spotId}">${s.name}</button>`).join('')}</div>`;
  };
  $('spots').innerHTML=group('rfi',isPush()?'Shoving':'Opening')+group('vs',isPush()?'Facing a shove':'Facing a raise');
}
function current(){return SCN.find(s=>s.id===spotId)||SCN[0];}
function renderChart(){
  const s=current();spotId=s.id;
  $('chart-title').textContent=`${s.name} · ${N===2?'heads-up':N+'-handed'} · ${D}bb · ${isPush()?'Nash solution':'modeled'}`;
  const lock=chartLocked();
  // A locked chart shows a blank grid rather than hiding real answers behind a blur.
  $('grid').innerHTML=HANDS.map(k=>{const a=lock?'fold':actionOf(s,k);
    return `<button class="${a==='3bet'?'t3bet':a==='fold'?'':a}" data-k="${k}" aria-pressed="${k===selected}" aria-label="${lock?k:`${k}: ${s.labels[a]}`}"${lock?' tabindex="-1"':''}>${k}</button>`;}).join('');
  $('legend').hidden=lock;
  const acts=s.type==='rfi'?['raise',...(s.sets.limp&&s.sets.limp.size?['limp']:[]),'fold']:[...(s.sets['3bet'].size?['3bet']:[]),...(s.sets.call.size?['call']:[]),'fold'];
  $('legend').innerHTML=acts.map(a=>{let c=0;HANDS.forEach(x=>{if(actionOf(s,x)===a)c+=combos(x);});
    const col=a==='fold'?'var(--fold-bg)':a==='call'||a==='limp'?'var(--call)':'var(--raise)';
    return `<span><i style="background:${col}"></i>${s.labels[a]} ${(c/1326*100).toFixed(1)}%</span>`;}).join('');
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
$('chartlock').addEventListener('click',e=>{if(e.target.id!=='unlock-free')return;N=8;D=100;store.set('pft-n',N);store.set('pft-d',D);apply();});
$('grid').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||chartLocked())return;selected=b.dataset.k===selected?null:b.dataset.k;
  $('grid').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x.dataset.k===selected));renderDetail();});

apply();
if(window.PIQ){PIQ.ready.then(apply);PIQ.onChange(apply);}

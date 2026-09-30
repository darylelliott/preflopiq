/* Preflop IQ mistake review: what your mistakes cost, the costliest spots, and a replay of every
   missed hand with its chart. Uses engine.js, pro-data.js, player.js and table.js.
   Free players see their three most recent mistakes; Pro keeps the last 200 and drills them. */
const $=id=>document.getElementById(id);
let stats=PL.load(),sort='cost',open=null;
const FREE_SHOWN=3;
const proLocked=()=>!!(window.PIQ&&PIQ.paywallOn());
const esc=t=>String(t).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const LBL={fold:'Fold',call:'Call',limp:'Limp',check:'Check',raise:'Raise','3bet':'3-bet','4bet':'4-bet'};

// Runs fn with the engine set to a saved format ("8-10ft"), then puts everything back.
function inFormat(f,fn){
  const p=PL.parseKey(f+'-x');if(!p)return null;
  const save=[N,D,STAGE,PROFILE];N=p.n;D=p.d;STAGE=p.st;PROFILE=p.pf;buildScenarios();
  try{return fn(p);}finally{[N,D,STAGE,PROFILE]=save;buildScenarios();}
}
function ago(t){const m=Math.round((Date.now()-t)/60000);if(m<1)return 'just now';if(m<60)return `${m} min ago`;const h=Math.round(m/60);if(h<24)return `${h} hr ago`;const d=Math.round(h/24);return `${d} day${d===1?'':'s'} ago`;}

function renderSummary(){
  const lh=stats.lh||[],ev=stats.ev||{bb:0,n:0},miss=stats.miss||[],left=miss.filter(m=>!m.c).length;
  const per100=lh.length?lh.reduce((a,b)=>a+b,0)/lh.length*100:null;
  const lock=proLocked();
  $('r-summary').innerHTML=`<div class="rsum">
    <div class="rtile"><b>${per100===null?'—':per100.toFixed(1)}</b><span>bb lost per 100 hands</span><small>${lh.length?`last ${lh.length} decisions`:'play a few hands'}</small></div>
    <div class="rtile"><b>${ev.bb.toFixed(1)}</b><span>bb lost in total</span><small>over ${ev.n} decisions</small></div>
    <div class="rtile"><b>${left}</b><span>mistakes to review</span><small>${miss.length-left} cleared</small></div>
    <div class="rtile rcta">${left?(lock?`<a class="btn" href="/pricing/">Drill my misses <span class="protag">Pro</span></a><small>Pro replays every miss until you get it right.</small>`:`<a class="btn" href="/?review=1">Drill my misses</a><small>Replays each miss, costliest first, until you get it right.</small>`):`<a class="btn ghostbtn" href="/">Play hands</a><small>Nothing to review yet.</small>`}</div>
  </div>`;
}

function renderSpots(){
  const rows=Object.entries(stats.per||{}).map(([key,p])=>{const k=PL.parseKey(key)||{};return {key,...k,l:p.l||0,miss:p.n-p.c,hands:p.n};}).filter(x=>x.id&&x.l>0)
    .sort((a,b)=>b.l-a.l).slice(0,8);
  if(!rows.length){$('r-spots').innerHTML='<p class="hint">No chips lost yet. Mistakes show up here with their cost.</p>';return;}
  const max=rows[0].l;
  $('r-spots').innerHTML=`<ol class="leaks">${rows.map(x=>`<li><div><b>${PL.spotName(x.id,x.d)}</b><span>${PL.formatName(x.n,x.d,x.st,x.pf)}</span></div>
    <div class="leakacc"><div class="bar"><span class="low" style="width:${Math.round(x.l/max*100)}%"></span></div><b>${fmtBB(x.l)}</b><span>${x.miss} missed of ${x.hands}</span></div>
    <a class="btn ghostbtn" href="/?drill=${encodeURIComponent(x.key)}">Drill</a></li>`).join('')}</ol>`;
}

function missRow(m,i){
  const p=PL.parseKey(m.f+'-'+m.id)||{};
  return `<li class="miss${m.c?' cleared':''}${open===m.t?' open':''}" data-t="${m.t}">
    <button class="missbtn" type="button" aria-expanded="${open===m.t}">
      <span class="hk">${esc(m.k)}</span>
      <span class="mwhat"><b>${PL.spotName(m.id,p.d)}</b><small>${PL.formatName(p.n,p.d,p.st,p.pf)} · ${ago(m.t)}${m.src==='d'?' · daily':''}${m.c?' · cleared':''}</small></span>
      <span class="mpick">You: <b>${LBL[m.p]||m.p}</b><br>Chart: <b>${LBL[m.r]||m.r}</b></span>
      <span class="mcost${m.l>=1?' big':''}"><b>${fmtBB(m.l)}</b><small>${m.x?'exact':'estimate'}</small></span>
    </button>
    ${open===m.t?`<div class="missbody">${detail(m)}</div>`:''}
  </li>`;
}
function detail(m){
  return inFormat(m.f,()=>{
    const s=SCN.find(x=>x.id===m.id);if(!s)return '<p class="hint">This spot is no longer in the trainer.</p>';
    const h=info(m.k);
    return `<p class="prompt">${TBL.prompt(s,m.k)}</p>
      <div class="blk"><h3>The play</h3><p>${reason(s,m.r,h)}</p></div>
      <div class="blk"><h3>The spot</h3><p>${spotContext(s)}</p></div>
      <div class="catline">${catLine(s,h)}</div>${gridHTML(s,m.k)}`;
  });
}
function renderList(){
  const all=(stats.miss||[]).slice();
  if(!all.length){$('r-list').innerHTML='<p class="hint">No mistakes saved yet. Every hand you miss in the trainer or the daily challenge lands here.</p>';return;}
  const lock=proLocked();
  // Free players see their most recent few; the rest wait behind Pro.
  let list=lock?all.slice(-FREE_SHOWN).reverse():all;
  if(!lock)list=sort==='cost'?list.sort((a,b)=>b.l-a.l||b.t-a.t):list.reverse();
  $('r-sort').hidden=lock;
  $('r-list').innerHTML=`<ol class="misses">${list.map(missRow).join('')}</ol>${lock&&all.length>FREE_SHOWN?`<div class="lockbox inline"><span class="eyebrow">Pro</span>
    <h3>${all.length-FREE_SHOWN} more mistake${all.length-FREE_SHOWN===1?'':'s'} saved</h3>
    <p>Pro keeps your last 200 mistakes sorted by cost, replays each one with its chart, and drills them until you get them right.</p>
    <a class="cta" href="/pricing/">See Pro plans</a></div>`:''}`;
}
function render(){renderSummary();renderSpots();renderList();}

$('r-list').addEventListener('click',e=>{const li=e.target.closest('.miss');if(!li||!e.target.closest('.missbtn'))return;const t=+li.dataset.t;open=open===t?null:t;renderList();});
$('r-sort').addEventListener('click',e=>{const b=e.target.closest('[data-sort]');if(!b)return;sort=b.dataset.sort;
  $('r-sort').querySelectorAll('button').forEach(x=>x.setAttribute('aria-selected',x===b));open=null;renderList();});

FX.applyTheme(stats);render();
PL.withRemote(stats).then(s=>{stats=s;render();});
if(window.PIQ)PIQ.onChange(render);

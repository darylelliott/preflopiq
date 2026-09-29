/* Achievements page: the trophy case, grouped by category, with progress toward counted goals. */
(function(){
  const $=id=>document.getElementById(id);
  const esc=t=>String(t).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const blank={total:0,correct:0,streak:0,best:0,per:{},hist:[]};
  const read=()=>{try{return JSON.parse(localStorage.getItem('pft-stats2'))||{...blank};}catch(e){return {...blank};}};
  const fmtDate=ms=>new Date(ms).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
  let stats=read();

  function render(){
    const a=ACH.ensure(stats),m=ACH.summary(stats);
    $('ach-summary').innerHTML=`
      <div class="achstat"><b>${m.earned}<small>/${m.total}</small></b><span>Earned</span></div>
      <div class="achstat"><b>${m.chips.toLocaleString()}</b><span>Chips in your stack</span></div>
      <div class="achmeter" role="img" aria-label="${m.chips} of ${m.maxChips} chips"><i style="width:${(m.chips/m.maxChips*100).toFixed(1)}%"></i></div>
      <div class="chiplegend">${Object.entries(ACH.CHIPS).map(([k,c])=>`<span><i class="pchip pchip-${k}" aria-hidden="true"></i>${c.label.replace(' chip','')} ${c.value}</span>`).join('')}</div>`;
    const groups=[...new Set(ACH.LIST.map(x=>x.group))];
    $('ach-list').innerHTML=groups.map(g=>{
      const items=ACH.LIST.filter(x=>x.group===g);
      return `<section class="achgroup" aria-labelledby="g-${g.replace(/\W+/g,'')}">
        <h2 id="g-${g.replace(/\W+/g,'')}">${g}</h2>
        <ul class="achgrid">${items.map(x=>{
          const got=a.u[x.id],secret=x.hidden&&!got,p=ACH.progress(stats,x.id);
          const bar=!got&&p?`<div class="achbar" aria-label="${p.cur} of ${p.goal}"><i style="width:${(p.cur/p.goal*100).toFixed(1)}%"></i></div><span class="achprog">${p.cur.toLocaleString()} / ${p.goal.toLocaleString()}</span>`:'';
          return `<li class="ach${got?' got':''}${secret?' secret':''}" id="${x.id}">
            <span class="pchip pchip-${secret?'none':x.chip}${got?'':' dim'}" aria-hidden="true"></span>
            <div class="achtext">
              <h3>${secret?'Hidden':esc(x.name)}</h3>
              <p>${secret?'Keep playing. This one finds you.':esc(x.desc)}</p>
              ${got?`<span class="achdate">Earned ${fmtDate(got)} · ${ACH.CHIPS[x.chip].label}</span>`:bar}
            </div></li>`;}).join('')}</ul></section>`;
    }).join('');
    const hash=location.hash.slice(1);
    if(hash&&$(hash)){$(hash).classList.add('flash');$(hash).scrollIntoView({block:'center'});history.replaceState(null,'',location.pathname);}
  }
  render();
  // Signed-in players see achievements from every device they've played on.
  if(window.PIQ){PIQ.ready.then(()=>{const r=PIQ.state.profile&&PIQ.state.profile.stats;if(r&&r.a){ACH.merge(stats,r);if((r.total||0)>stats.total){stats.total=r.total;stats.best=Math.max(stats.best||0,r.best||0);stats.per=r.per||stats.per;}render();}});}
})();

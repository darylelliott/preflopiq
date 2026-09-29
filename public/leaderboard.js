/* Preflop IQ daily leaderboard (browser side). Scores are re-checked by /api/daily-submit.
   Needs accounts to be switched on (config.js); otherwise it shows a short note and does nothing. */
const LB=(function(){
  const esc=t=>String(t).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const LS=PL.LS,on=()=>!!(window.PIQ&&PIQ.configured);
  async function token(){if(!on())return null;const {data}=await PIQ.client.auth.getSession();return data.session?.access_token||null;}

  // Finishing the daily while signed out keeps the answers until you sign in.
  async function submit(day,picks){
    if(!on())return null;
    await PIQ.ready;
    const t=await token();
    if(!t){LS.set('pic-lb-pending',{day,picks});return null;}
    const res=await fetch('/api/daily-submit',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${t}`},body:JSON.stringify({day,picks})});
    if(res.ok)LS.set('pic-lb-pending',null);
    return res.ok?res.json():null;
  }
  async function flush(){const p=LS.get('pic-lb-pending',null);if(p&&p.day>=PL.addDays(DAILY.today(),-1))await submit(p.day,p.picks);}

  async function saveName(name){
    const {error}=await PIQ.client.from('profiles').update({display_name:name,updated_at:new Date().toISOString()}).eq('id',PIQ.state.user.id);
    if(error)throw new Error(/duplicate|unique/i.test(error.message)?'That name is taken. Try another.':/check|format/i.test(error.message)?'Use 3 to 20 letters, numbers, spaces, dots, dashes or underscores.':error.message);
    PIQ.state.profile.display_name=name;
  }

  function table(rows,kind){
    if(!rows.length)return `<p class="hint">${kind==='daily'?'No scores yet today. Be the first.':'No scores this week yet.'}</p>`;
    return `<div class="tablewrap"><table class="lbtable"><thead><tr><th>#</th><th>Player</th><th style="text-align:right">${kind==='daily'?'Score':'Total'}</th></tr></thead><tbody>${rows.slice(0,20).map(r=>
      `<tr class="${r.me?'me':''}"><td class="n">${r.rank}</td><td>${esc(r.name)}${r.me?' <span class="youtag">You</span>':''}</td><td class="n">${kind==='daily'?`${r.score}/10`:`${r.total} <small>(${r.days} day${r.days===1?'':'s'})</small>`}</td></tr>`).join('')}</tbody></table></div>`;
  }

  async function render(el,day){
    if(!el)return;
    if(!on()){el.innerHTML='';return;}
    await PIQ.ready;
    const user=PIQ.state.user,named=user&&PIQ.state.profile&&PIQ.state.profile.display_name;
    let who='';
    if(!user)who=`<p><a href="/account/?next=daily">Sign in or create a free account</a> to put your score on the board.</p>`;
    else if(!named)who=`<form class="form lbname" id="lb-name-form"><label for="lb-name">Choose a leaderboard name</label><div class="rowbtns"><input id="lb-name" maxlength="20" required pattern="[A-Za-z0-9 _.\\-]{3,20}" autocomplete="nickname"><button class="btn" type="submit">Save</button></div><p class="pw-error" id="lb-err" hidden></p></form>`;
    el.innerHTML=`<section class="lb"><div class="lbhead"><h2>Leaderboard</h2><a href="/leaderboard/">Full board</a></div>${who}<div id="lb-body"><p class="hint">Loading…</p></div></section>`;
    const f=el.querySelector('#lb-name-form');
    if(f)f.addEventListener('submit',async e=>{e.preventDefault();const err=el.querySelector('#lb-err');err.hidden=true;
      try{await saveName(el.querySelector('#lb-name').value.trim());render(el,day);}catch(x){err.textContent=x.message;err.hidden=false;}});
    try{
      const t=await token();
      const res=await fetch(`/api/leaderboard?day=${day}`,{headers:t?{authorization:`Bearer ${t}`}:{}});
      const data=await res.json();if(!res.ok)throw new Error(data.error||'Could not load the leaderboard.');
      el.querySelector('#lb-body').innerHTML=`<div class="lbcols"><div><h3>Today</h3>${table(data.daily,'daily')}</div><div><h3>This week</h3>${table(data.weekly,'weekly')}</div></div>`;
    }catch(x){el.querySelector('#lb-body').innerHTML=`<p class="hint">${esc(x.message)}</p>`;}
  }
  if(on())PIQ.ready.then(flush).catch(()=>{});
  return {submit,render,flush};
})();

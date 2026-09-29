/* Clubs page: create a club, share its invite link, and follow the club's daily challenge board.
   /clubs/?join=CODE joins a club (after signing in, if needed). Needs accounts switched on. */
(function(){
  const $=id=>document.getElementById(id);
  const esc=t=>String(t).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const LS=PL.LS,box=$('clubsbox');
  const q=new URLSearchParams(location.search);
  if(q.get('join')){LS.set('pic-club-join',q.get('join').toUpperCase().slice(0,6));history.replaceState(null,'',location.pathname);}
  let notice=null;

  async function api(method,body,query=''){
    const {data}=await PIQ.client.auth.getSession();
    const res=await fetch('/api/clubs'+query,{method,headers:{'content-type':'application/json',authorization:`Bearer ${data.session?.access_token||''}`},body:body?JSON.stringify(body):undefined});
    const out=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(out.error||`Request failed (${res.status})`);
    return out;
  }
  const noticeHTML=()=>notice?`<p class="notice ${notice.kind}" role="${notice.kind==='err'?'alert':'status'}">${esc(notice.text)}</p>`:'';
  const inviteLink=c=>`${location.origin}/clubs/?join=${c.invite_code}`;

  async function render(){
    if(!PIQ.configured){
      box.innerHTML=`<section class="pcard"><h2>Clubs open once accounts are switched on</h2><p>A club is a private group, like your home game or study group. Everyone plays the same daily challenge, and the club gets its own leaderboard for the day and the week.</p><a class="btn" href="/daily/">Play today’s challenge</a></section>`;
      return;
    }
    await PIQ.ready;
    if(!PIQ.state.user){
      const pending=LS.get('pic-club-join',null);
      box.innerHTML=`<section class="pcard"><h2>${pending?`You’ve been invited to a club`:'Sign in to join or start a club'}</h2><p>${pending?`Sign in or create a free account and you’ll join it automatically.`:'Clubs need a free account so your daily scores can go on your club’s board.'}</p><a class="btn" href="/account/?next=clubs">Sign in or create an account</a></section>`;
      return;
    }
    // A pending invite joins as soon as you're signed in.
    const pending=LS.get('pic-club-join',null);
    if(pending){LS.set('pic-club-join',null);try{const r=await api('POST',{action:'join',code:pending});notice={kind:'ok',text:r.already?`You’re already in ${r.club.name}.`:`You joined ${r.club.name}.`};}catch(e){notice={kind:'err',text:e.message};}}
    box.innerHTML='<p class="hint">Loading your clubs…</p>';
    let clubs=[];
    try{clubs=(await api('GET')).clubs;}catch(e){box.innerHTML=`<p class="notice err">${esc(e.message)}</p>`;return;}
    const named=PIQ.state.profile&&PIQ.state.profile.display_name;
    box.innerHTML=`${noticeHTML()}
      ${named?'':`<section class="pcard"><h2>Choose a name first</h2><p>Your club sees this name on its board.</p><form class="form" id="f-name"><label for="c-name">Display name</label><div class="rowbtns"><input id="c-name" maxlength="20" required pattern="[A-Za-z0-9 _.\\-]{3,20}"><button class="btn" type="submit">Save</button></div></form></section>`}
      <div id="clublist">${clubs.length?clubs.map(c=>`<section class="pcard club" data-id="${c.id}">
          <div class="clubhead"><h2>${esc(c.name)}</h2><span class="hint">${c.members} member${c.members===1?'':'s'}${c.owner?' · You started this club':''}</span></div>
          <div class="clubboard" id="b-${c.id}"><p class="hint">Loading the board…</p></div>
          <div class="invite"><span>Invite link</span><code>${esc(inviteLink(c))}</code><button class="btn ghostbtn" type="button" data-copy="${esc(inviteLink(c))}">Copy link</button><span class="hint">Code <b>${c.invite_code}</b></span></div>
          <button class="linkbtn" type="button" data-leave="${c.id}">Leave club</button>
        </section>`).join(''):'<section class="pcard"><h2>No clubs yet</h2><p>Start one for your home game or study group, or join with an invite code.</p></section>'}</div>
      <div class="pgrid">
        <section class="pcard"><h2>Start a club</h2><form class="form" id="f-create"><label for="c-club">Club name</label><div class="rowbtns"><input id="c-club" maxlength="40" minlength="3" required placeholder="Thursday night game"><button class="btn" type="submit">Create club</button></div></form></section>
        <section class="pcard"><h2>Join a club</h2><form class="form" id="f-join"><label for="c-code">Invite code</label><div class="rowbtns"><input id="c-code" maxlength="6" required pattern="[A-Za-z0-9]{6}" autocapitalize="characters"><button class="btn" type="submit">Join</button></div></form></section>
      </div>`;
    notice=null;
    clubs.forEach(c=>loadBoard(c.id));
  }
  async function loadBoard(id){
    const el=$('b-'+id);
    try{
      const d=await api('GET',null,`?board=${id}&day=${DAILY.today()}`);
      el.innerHTML=`<div class="tablewrap"><table class="lbtable"><thead><tr><th>#</th><th>Player</th><th style="text-align:right">Today</th><th style="text-align:right">This week</th></tr></thead><tbody>${d.rows.map((r,i)=>
        `<tr class="${r.me?'me':''}"><td class="n">${i+1}</td><td>${esc(r.name)}${r.me?' <span class="youtag">You</span>':''}</td><td class="n">${r.today===null?'—':r.today+'/10'}</td><td class="n">${r.week} <small>(${r.days} day${r.days===1?'':'s'})</small></td></tr>`).join('')}</tbody></table></div>
        <p class="hint">Everyone plays the same ten hands each day. <a href="/daily/">Play today’s challenge</a>.</p>`;
    }catch(e){el.innerHTML=`<p class="hint">${esc(e.message)}</p>`;}
  }
  box.addEventListener('submit',async e=>{
    e.preventDefault();const b=e.target.querySelector('button');if(b)b.disabled=true;
    try{
      if(e.target.id==='f-create'){const r=await api('POST',{action:'create',name:$('c-club').value});notice={kind:'ok',text:`${r.club.name} is ready. Copy the invite link and send it to your group.`};}
      else if(e.target.id==='f-join'){const r=await api('POST',{action:'join',code:$('c-code').value});notice={kind:'ok',text:r.already?`You’re already in ${r.club.name}.`:`You joined ${r.club.name}.`};}
      else if(e.target.id==='f-name'){await LB.saveName($('c-name').value.trim());notice={kind:'ok',text:'Name saved.'};}
    }catch(x){notice={kind:'err',text:x.message};}
    render();
  });
  let leaveArmed=null;
  box.addEventListener('click',async e=>{
    const cp=e.target.closest('[data-copy]');
    if(cp){const t=cp.dataset.copy;const ok=()=>{cp.textContent='Copied';setTimeout(()=>cp.textContent='Copy link',2000);};
      if(navigator.clipboard)navigator.clipboard.writeText(t).then(ok,()=>{});return;}
    const lv=e.target.closest('[data-leave]');
    if(lv){
      if(leaveArmed!==lv.dataset.leave){leaveArmed=lv.dataset.leave;lv.textContent='Tap again to leave';setTimeout(()=>{if(leaveArmed===lv.dataset.leave){leaveArmed=null;lv.textContent='Leave club';}},3000);return;}
      try{await api('POST',{action:'leave',club:lv.dataset.leave});notice={kind:'ok',text:'You left the club.'};}catch(x){notice={kind:'err',text:x.message};}
      leaveArmed=null;render();
    }
  });
  render();
})();

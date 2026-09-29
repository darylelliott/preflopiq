/* Preflop IQ notifications: the bell in the top bar. Runs on every page.
   Two kinds of item:
   - logged: achievements and rank-ups, added by ACH.celebrate() as they happen (kept in this
     browser, newest first, up to 40);
   - live: worked out from your progress each time the page loads (today's daily challenge,
     a streak at risk, mistakes waiting for review, a trial about to end).
   Opening the bell marks everything read. */
const NOTES=(function(){
  const LS={get(k,d){try{const v=localStorage.getItem(k);return v===null?d:JSON.parse(v);}catch(e){return d;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}};
  const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const pad=n=>String(n).padStart(2,'0');
  const today=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
  const dailyNo=day=>{const [y,m,d]=day.split('-').map(Number);return Math.round((Date.UTC(y,m-1,d)-Date.UTC(2026,8,29))/86400000)+1;};
  const ICON={ach:'&#9824;',rank:'&#9733;',daily:'&#9830;',streak:'&#9829;',review:'&#9827;',trial:'&#9733;'};

  // Called by ACH.celebrate with the achievements (and rank-ups) just earned.
  function add(list){
    const log=LS.get('pic-notes',[]),t=Date.now();
    (list||[]).forEach(x=>log.unshift({t,kind:x.kicker==='New rank'?'rank':'ach',title:x.kicker==='New rank'?`New rank: ${x.name}`:`Achievement: ${x.name}`,body:x.desc||'',href:x.href||'/achievements/'}));
    LS.set('pic-notes',log.slice(0,40));render();
  }

  function live(){
    const out=[],day=today(),stats=LS.get('pft-stats2',null)||{};
    const done=(LS.get('pic-daily',{})[day]||{}).done;
    if(!done)out.push({key:'daily-'+day,kind:'daily',title:`Daily challenge #${dailyNo(day)} is ready`,body:'Ten hands, mixed formats, one shot. It counts toward your streak.',href:'/daily/'});
    if(window.PL&&stats.play){
      const st=PL.streak(PL.normalize(JSON.parse(JSON.stringify(stats))));
      if(st.days>=2&&!st.doneToday&&new Date().getHours()>=17)out.push({key:'streak-'+day,kind:'streak',title:`Your ${st.days}-day streak ends at midnight`,body:`Play ${st.goal-st.today} more hand${st.goal-st.today===1?'':'s'} today to keep it.`,href:'/'});
    }
    const miss=(stats.miss||[]).filter(m=>!m.c).length;
    if(miss>=5)out.push({key:'review-'+day,kind:'review',title:`${miss} mistakes to review`,body:'Replay them, costliest first, until they stick.',href:'/review/'});
    const P=window.PIQ&&PIQ.state;
    if(P&&PIQ.payments&&P.onTrial){const d=PIQ.trialDaysLeft();if(d<=2)out.push({key:'trial-'+day,kind:'trial',title:`Your Pro trial ends in ${d} day${d===1?'':'s'}`,body:'Pick a plan to keep unlimited hands and every Pro spot.',href:'/pricing/'});}
    return out;
  }

  function ago(t){const m=Math.round((Date.now()-t)/60000);if(m<1)return 'just now';if(m<60)return `${m} min ago`;const h=Math.round(m/60);if(h<24)return `${h} hr ago`;const d=Math.round(h/24);return `${d} day${d===1?'':'s'} ago`;}
  function items(){
    const seen=LS.get('pic-notes-seen',{t:0,keys:[]});
    const L=live().map(x=>({...x,unread:!seen.keys.includes(x.key)}));
    const G=LS.get('pic-notes',[]).map(x=>({...x,unread:x.t>seen.t}));
    return [...L,...G];
  }
  function render(){
    const bell=document.getElementById('bell'),panel=document.getElementById('notepanel');if(!bell||!panel)return;
    bell.hidden=false;
    const all=items(),n=all.filter(x=>x.unread).length,badge=bell.querySelector('.bellcount');
    badge.hidden=!n;badge.textContent=n>9?'9+':n;
    bell.setAttribute('aria-label',n?`Notifications, ${n} unread`:'Notifications');
    panel.innerHTML=`<div class="notehead"><b>Notifications</b>${all.length?'<button type="button" class="linkbtn" id="notes-clear">Clear</button>':''}</div>
      ${all.length?`<ul>${all.map(x=>`<li class="${x.unread?'unread':''}"><a href="${esc(x.href)}"><span class="noteicon ${x.kind}" aria-hidden="true">${ICON[x.kind]||'&#9824;'}</span><span class="notetext"><b>${esc(x.title)}</b>${x.body?`<small>${esc(x.body)}</small>`:''}${x.t?`<small class="noteago">${ago(x.t)}</small>`:''}</span></a></li>`).join('')}</ul>`:'<p class="hint">You’re all caught up. Achievements, daily challenges and streak reminders show up here.</p>'}
      <a class="notefoot" href="/achievements/">See all achievements</a>`;
  }
  function markRead(){LS.set('pic-notes-seen',{t:Date.now(),keys:live().map(x=>x.key)});}
  function open(on){
    const bell=document.getElementById('bell'),panel=document.getElementById('notepanel');
    panel.hidden=!on;bell.setAttribute('aria-expanded',on);
    if(on){render();markRead();const b=bell.querySelector('.bellcount');b.hidden=true;bell.setAttribute('aria-label','Notifications');}else render();
  }
  document.addEventListener('click',e=>{
    const bell=document.getElementById('bell'),panel=document.getElementById('notepanel');if(!bell)return;
    if(e.target.closest('#bell')){open(panel.hidden);return;}
    if(e.target.id==='notes-clear'){LS.set('pic-notes',[]);markRead();render();return;}
    if(!panel.hidden&&!e.target.closest('#notepanel'))open(false);
  });
  document.addEventListener('keydown',e=>{const p=document.getElementById('notepanel');if(e.key==='Escape'&&p&&!p.hidden){open(false);document.getElementById('bell').focus();}});
  document.addEventListener('DOMContentLoaded',render);
  if(document.readyState!=='loading')setTimeout(render,0);
  if(window.PIQ&&PIQ.onChange)PIQ.onChange(render);
  window.addEventListener('storage',e=>{if(/^(pic-notes|pft-stats2|pic-daily)/.test(e.key||''))render();});
  return {add,render};
})();

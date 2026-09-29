/* Owner admin: look up accounts and toggle free Pro. The server (/api/admin) checks that the
   signed-in email is in ADMIN_EMAILS, so this page shows nothing useful to anyone else. */
const box=document.getElementById('adm');
const esc=t=>String(t==null?'':t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const day=d=>d?new Date(d).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'—';
const PLAYS={live:'Live',online:'Online',home:'Home games',learning:'Learning'};
let q='',data=null,msg=null;

async function api(method,body,query=''){
  const {data:s}=await PIQ.client.auth.getSession();
  const res=await fetch('/api/admin'+query,{method,headers:{'content-type':'application/json',authorization:`Bearer ${s.session?.access_token||''}`},body:body?JSON.stringify(body):undefined});
  const out=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(out.error||`Request failed (${res.status})`);
  return out;
}
function plan(u){
  if(u.comp)return '<span class="probadge">Free Pro</span>';
  if(u.sub&&['active','trialing'].includes(u.sub.status))return `<span class="probadge">Paying</span><small>${u.sub.cancel_at_period_end?'ends':'renews'} ${day(u.sub.current_period_end)}</small>`;
  if(u.trial_ends&&new Date(u.trial_ends)>new Date())return `<span class="tag">Trial</span><small>to ${day(u.trial_ends)}</small>`;
  return `<span class="freebadge">Free</span>${u.sub&&u.sub.status!=='none'?`<small>${esc(u.sub.status)}</small>`:''}`;
}
function render(){
  if(!PIQ.configured){box.innerHTML='<p>Accounts aren’t switched on.</p>';return;}
  if(!PIQ.state.loaded){box.innerHTML='<p class="hint">Loading…</p>';return;}
  if(!PIQ.state.user){box.innerHTML='<p><a href="/account/">Sign in</a> with the owner account to use this page.</p>';return;}
  if(!data){box.innerHTML=msg?`<p class="notice err">${esc(msg)}</p>${/owner/.test(msg)?`<p>You're signed in as <b>${esc(PIQ.state.user.email)}</b>. To make this the owner account, add this user ID to <code>ADMIN_USER_IDS</code> in Cloudflare (Workers &amp; Pages → preflopiq → Settings → Variables and secrets), then redeploy:</p><p><code>${esc(PIQ.state.user.id)}</code></p>`:''}`:'<p class="hint">Loading accounts…</p>';return;}
  const s=data.stats;
  box.innerHTML=`<div class="rsum">
      <div class="rtile"><b>${s.users}</b><span>accounts</span></div>
      <div class="rtile"><b>${s.onTrial}</b><span>on a trial</span></div>
      <div class="rtile"><b>${s.paying}</b><span>paying</span></div>
      <div class="rtile"><b>${s.comped}</b><span>free Pro</span></div></div>
    <form class="form admsearch" id="adm-search"><label for="adm-q">Find an account</label>
      <div class="rowbtns"><input id="adm-q" type="search" placeholder="Email, name or leaderboard name" value="${esc(q)}"><button class="btn" type="submit">Search</button></div></form>
    ${msg?`<p class="notice ${msg.startsWith('Saved')?'ok':'err'}">${esc(msg)}</p>`:''}
    <p class="hint">${q?`Matches for “${esc(q)}”`:'Newest 50 accounts'}</p>
    <div class="tablewrap"><table class="lbtable admtable"><thead><tr><th>Player</th><th>Joined</th><th>Hands</th><th>Plan</th><th>Free Pro</th></tr></thead><tbody>
    ${data.users.map(u=>`<tr><td><b>${esc(u.full_name||u.display_name||'—')}</b><br><small>${esc(u.email)}${u.display_name?` · ${esc(u.display_name)}`:''}${u.plays?` · ${PLAYS[u.plays]||''}`:''}</small></td>
      <td>${day(u.created_at)}</td><td class="n">${u.hands_played||0}</td><td class="admplan">${plan(u)}</td>
      <td><label class="check" for="c-${u.id}"><input type="checkbox" id="c-${u.id}" data-id="${u.id}" ${u.comp?'checked':''}> Free Pro</label></td></tr>`).join('')||'<tr><td colspan="5">No accounts found.</td></tr>'}
    </tbody></table></div>`;
}
async function load(){
  try{data=await api('GET',null,q?`?q=${encodeURIComponent(q)}`:'');msg=null;}catch(e){data=null;msg=e.message;}
  render();
}
box.addEventListener('submit',e=>{e.preventDefault();q=document.getElementById('adm-q').value.trim();load();});
box.addEventListener('change',async e=>{
  const c=e.target.closest('[data-id]');if(!c)return;c.disabled=true;
  try{await api('POST',{user_id:c.dataset.id,comp:c.checked});msg=`Saved: ${c.checked?'free Pro on':'free Pro off'}.`;
    if(c.dataset.id===PIQ.state.user.id)await PIQ.refresh();await load();}
  catch(x){c.checked=!c.checked;c.disabled=false;msg=x.message;render();}
});
render();
PIQ.ready.then(()=>{render();if(PIQ.state.user)load();});
PIQ.onChange(()=>{if(PIQ.state.user&&!data)load();else render();});

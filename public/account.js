/* Preflop IQ account page: sign in, sign up, password reset, plan status and billing. */
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search);
let view=params.get('view')==='signup'?'signup':'signin';   // signin | signup | forgot
const PLAYS={live:'Live tournaments',online:'Online tournaments',home:'Home games',learning:'Just learning'};
let notice=null;              // {text, kind: 'ok'|'err'}
let busy=false;

const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmtDate=d=>new Date(d).toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'});
function setNotice(text,kind='ok'){notice={text,kind};render();}
function noticeHTML(){return notice?`<p class="notice ${notice.kind}" role="${notice.kind==='err'?'alert':'status'}">${esc(notice.text)}</p>`:'';}

function plansHTML(){
  return `<div class="plans">
    <button class="plan" data-plan="annual"><span class="plan-name">Annual</span><span class="plan-price">$59<small>/year</small></span><span class="plan-note">About $4.92 a month · save 38%</span></button>
    <button class="plan" data-plan="monthly"><span class="plan-name">Monthly</span><span class="plan-price">$7.99<small>/month</small></span><span class="plan-note">Cancel anytime</span></button>
  </div>`;
}

function render(){
  const st=PIQ.state,box=$('acctbox');
  if(!PIQ.configured){
    box.innerHTML=`<h2>Accounts are coming soon</h2><p>Everything on Preflop IQ is free while accounts are being set up. Your progress is saved in this browser.</p><a class="cta" href="/">Start training</a>`;
    return;
  }
  showDash(false);
  if(!st.loaded){box.innerHTML='<p class="hint">Loading your account…</p>';return;}
  if(st.loadError){box.innerHTML=`<h2>We couldn’t load your account</h2><p class="notice err">${esc(st.loadError)}</p><p>Check your connection and try again. If it keeps happening, close other Preflop IQ tabs and reload.</p><button class="btn" id="b-retry" type="button">Try again</button><button class="linkbtn" id="b-signout" type="button">Sign out</button>`;return;}

  if(st.recovery&&st.user){
    box.innerHTML=`<h2>Choose a new password</h2>${noticeHTML()}
    <form id="f-newpw" class="form">
      <label for="newpw">New password</label><input id="newpw" type="password" autocomplete="new-password" minlength="8" pattern="(?=.*[A-Za-z])(?=.*[0-9]).{8,}" title="At least 8 characters, with letters and numbers" required>
      <button class="btn" type="submit">Save password</button>
    </form>`;
    return;
  }

  if(st.user){
    const sub=st.sub,pro=st.isPro,used=PIQ.handsUsed();
    let plan;
    const paid=!!sub&&['active','trialing'].includes(sub.status);
    if(paid){
      plan=`<div class="planstatus pro"><span class="probadge">Pro</span>
        <p>${sub.cancel_at_period_end?`Your Pro plan ends on <b>${fmtDate(sub.current_period_end)}</b>. You can renew it any time before then.`:sub.current_period_end?`Renews on <b>${fmtDate(sub.current_period_end)}</b>.`:'Active.'}</p>
        </div>`;
    }else if(st.comp){
      plan=`<div class="planstatus pro"><span class="probadge">Pro</span><p>Complimentary Pro: everything is unlocked, with no billing.</p></div>`;
    }else if(!PIQ.payments){
      plan=`<div class="planstatus"><span class="freebadge">Free</span>
        <p>Every feature is open while Pro isn’t on sale yet, including 3-bet pots, bubble and final-table ranges, and the full mistake review.</p></div>`;
    }else if(st.onTrial){
      const d=PIQ.trialDaysLeft();
      plan=`<div class="planstatus pro"><span class="probadge">Pro trial</span>
        <p><b>${d} day${d===1?'':'s'} left</b> of your free Pro trial (it ends ${fmtDate(st.trialEnds)}). Everything is unlocked. Pick a plan any time to keep it.</p>
        ${plansHTML()}</div>`;
    }else{
      const lapsed=sub&&['canceled','past_due','unpaid','incomplete_expired'].includes(sub.status);
      plan=`<div class="planstatus"><span class="freebadge">Free</span>
        <p>${lapsed?`Your Pro plan is ${sub.status==='past_due'?'past due. Update your card to keep it':'no longer active'}.`:`${st.trialEnds?`Your free Pro trial ended on ${fmtDate(st.trialEnds)}. `:''}You've used <b>${Math.min(used,PIQ.FREE_HANDS)} of ${PIQ.FREE_HANDS}</b> free hands.`}</p>
        <h3>Upgrade to Pro</h3>
        <p>Unlimited hands at every table size and stack depth, 3-bet pots and squeezes, bubble and final-table ranges, and the full mistake review.</p>
        ${plansHTML()}</div>`;
    }
    const pr=st.profile||{};
    showDash(true);
    const first=pr.full_name?esc(pr.full_name.split(' ')[0]):'';
    const badge=st.comp||pro&&!st.onTrial?'<span class="probadge">Pro</span>':st.onTrial&&PIQ.payments?'<span class="probadge">Pro trial</span>':'<span class="freebadge">Free</span>';
    $('acctdash').innerHTML=`<div class="accthead"><div><span class="eyebrow">Your account</span><h1>${first?`Hi, ${first}`:'Welcome back'}</h1>
        <p class="hint">${esc(st.user.email)} ${st.user.created_at?`· member since ${fmtDate(st.user.created_at)}`:''} ${badge}</p></div>
        <button class="btn ghostbtn" id="b-signout" type="button">Sign out</button></div>
      ${noticeHTML()}
      ${gameHTML()}
      <div class="pgrid acctgrid">
        <section class="pcard"><h2>Plan</h2>${plan}${billingHTML(sub)}</section>
        <section class="pcard">${detailsHTML(pr)}</section>
        <section class="pcard">${emailPrefsHTML()}</section>
        <section class="pcard">${securityHTML()}</section>
      </div>`;
    return;
  }

  const tabs=`<div class="tabs" role="tablist">
    <button role="tab" id="t-signin" aria-selected="${view==='signin'}">Sign in</button>
    <button role="tab" id="t-signup" aria-selected="${view==='signup'}">Create account</button></div>`;
  const why=params.get('next')&&params.get('next').startsWith('checkout')?'<p class="hint">Sign in or create a free account, and we’ll take you straight to checkout.</p>':'';
  if(view==='forgot'){
    box.innerHTML=`<h2>Reset your password</h2>${noticeHTML()}
      <form id="f-forgot" class="form">
        <label for="email">Email</label><input id="email" type="email" autocomplete="email" required>
        <button class="btn" type="submit">Send reset link</button>
      </form><button class="linkbtn" id="b-back" type="button">Back to sign in</button>`;
    return;
  }
  const pitch=view==='signup'?`<div class="trialpitch"><b>${PIQ.payments?'7 days of Pro, free. No card needed.':'Free account'}</b>
    <span>${PIQ.payments?'Unlimited hands, 3-bet pots, bubble and final-table ranges and your full mistake review. After 7 days you keep your progress and the free plan.':'Sync your progress across devices, join the leaderboards and start a club.'}</span></div>`:'';
  box.innerHTML=`${tabs}${why}${pitch}${noticeHTML()}
    <form id="f-auth" class="form">
      ${view==='signup'?`<label for="fullname">Your name</label><input id="fullname" autocomplete="name" maxlength="60" required>
      <label for="dname">Leaderboard name <small>(optional)</small></label><input id="dname" autocomplete="nickname" maxlength="20" pattern="[A-Za-z0-9 _.\-]{3,20}" title="3 to 20 letters, numbers, spaces, dots, dashes or underscores">
      <p class="hint">Shown on leaderboards and in clubs instead of your name. You can set it later.</p>
      <label for="plays">Where do you usually play?</label><select id="plays"><option value="">Choose one</option>${Object.entries(PLAYS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select>`:''}
      <label for="email">Email</label><input id="email" type="email" autocomplete="email" required>
      <label for="password">Password</label><input id="password" type="password" autocomplete="${view==='signup'?'new-password':'current-password'}" minlength="${view==='signup'?8:1}" ${view==='signup'?'pattern="(?=.*[A-Za-z])(?=.*[0-9]).{8,}" title="At least 8 characters, with letters and numbers"':''} required>
      ${view==='signup'?`<p class="hint">At least 8 characters, with letters and numbers.</p>
      <label class="check" for="emails"><input type="checkbox" id="emails" checked> Email me a streak reminder and a weekly recap (unsubscribe any time)</label>`:''}
      <button class="btn" type="submit">${view==='signup'?(PIQ.payments?'Start my free trial':'Create account'):'Sign in'}</button>
    </form>
    ${view==='signin'?'<button class="linkbtn" id="b-forgot" type="button">Forgot your password?</button>':''}`;
}

// Billing: Stripe's customer portal for invoices, card, plan changes and cancellation.
function billingHTML(sub){
  if(!PIQ.payments)return '';
  const has=sub&&sub.stripe_customer_id;
  return `<div class="billing"><h3>Billing</h3>
    ${has?`<p>Download invoices and receipts, update your card, switch between monthly and yearly, or cancel.</p>
      <button class="btn" id="b-portal" type="button">Manage billing</button>`
    :'<p class="hint">No billing yet. When you choose a plan, your invoices, card and cancellation are managed here.</p>'}
    <p class="hint">Payments are handled by Stripe. Card details never reach Preflop IQ.</p></div>`;
}
function showDash(on){$('acctdash').hidden=!on;$('acctwrap').hidden=on;}
// A summary of the player's game, from the same stats the trainer keeps (synced with the account).
let gstats=PL.load();
PL.withRemote(gstats).then(s=>{gstats=s;if(PIQ.state.user)render();}).catch(()=>{});
function gameHTML(){
  const s=gstats,iq=PL.iq(s),st=PL.streak(s),r=PL.rank(s),m=ACH.summary(s),lh=s.lh||[];
  const bb=lh.length?(lh.reduce((a,b)=>a+b,0)/lh.length*100).toFixed(0):'—',miss=(s.miss||[]).filter(x=>!x.c).length;
  const acc=s.total?Math.round(s.correct/s.total*100)+'%':'—';
  return `<section class="pcard"><h2>Your game</h2><div class="rsum acctstats">
    <a class="rtile" href="/"><b>${s.total}</b><span>hands played</span><small>${acc} correct</small></a>
    <a class="rtile" href="/progress/"><b>${iq===null?'—':iq}</b><span>Preflop IQ</span><small>${iq===null?'play 20 hands':PL.tier(iq)} · best ${s.iqBest||'—'}</small></a>
    <a class="rtile" href="/progress/"><b>${esc(r.cur.name)}</b><span>rank</span><small>${r.next?`next: ${esc(r.next.name)}`:'top of the ladder'}</small></a>
    <a class="rtile" href="/progress/"><b>${st.days}</b><span>day streak</span><small>${st.doneToday?'today counts':`${st.today} of ${st.goal} today`}</small></a>
    <a class="rtile" href="/review/"><b>${bb}</b><span>bb lost / 100</span><small>${miss} mistake${miss===1?'':'s'} to review</small></a>
    <a class="rtile" href="/achievements/"><b>${m.earned}<small>/${m.total}</small></b><span>achievements</span><small>${m.chips.toLocaleString()} chips</small></a>
  </div></section>`;
}
function securityHTML(){
  return `<h2>Sign-in and security</h2>
    <form id="f-pw" class="form">
      <label for="pw1">New password</label><input id="pw1" type="password" autocomplete="new-password" minlength="8" pattern="(?=.*[A-Za-z])(?=.*[0-9]).{8,}" title="At least 8 characters, with letters and numbers" required>
      <label for="pw2">Confirm new password</label><input id="pw2" type="password" autocomplete="new-password" minlength="8" required>
      <button class="btn ghostbtn" type="submit">Change password</button>
    </form>
    <button class="linkbtn" id="b-signout-all" type="button">Sign out on every device</button>
    <details class="danger"><summary>Delete my account</summary>
      <p>This permanently deletes your account, progress, leaderboard scores and any clubs you started${PIQ.payments?', and cancels any Pro plan':''}. It can’t be undone.</p>
      <form id="f-delete" class="form"><label for="del-confirm">Type DELETE to confirm</label><input id="del-confirm" autocomplete="off" required pattern="DELETE">
      <button class="btn dangerbtn" type="submit">Delete my account</button></form>
    </details>`;
}
function detailsHTML(pr){
  return `<div><h2>Your details</h2>
    <form id="f-details" class="form">
      <label for="d-name">Name</label><input id="d-name" autocomplete="name" maxlength="60" value="${esc(pr.full_name||'')}">
      <label for="d-dname">Leaderboard name</label><input id="d-dname" autocomplete="nickname" maxlength="20" pattern="[A-Za-z0-9 _.\-]{3,20}" title="3 to 20 letters, numbers, spaces, dots, dashes or underscores" value="${esc(pr.display_name||'')}">
      <label for="d-plays">Where you usually play</label><select id="d-plays"><option value="">Not set</option>${Object.entries(PLAYS).map(([k,v])=>`<option value="${k}"${pr.plays===k?' selected':''}>${v}</option>`).join('')}</select>
      <button class="btn ghostbtn" type="submit">Save details</button>
    </form></div>`;
}
function emailPrefsHTML(){
  const p=(PIQ.state.profile&&PIQ.state.profile.email_prefs)||{streak:true,weekly:true};
  return `<div class="planstatus flat"><h2>Emails</h2>
    <label class="check" for="e-streak"><input type="checkbox" id="e-streak" data-pref="streak" ${p.streak!==false?'checked':''}> Remind me at 7 p.m. when my day streak is about to end</label>
    <label class="check" for="e-weekly"><input type="checkbox" id="e-weekly" data-pref="weekly" ${p.weekly!==false?'checked':''}> Send a weekly recap on Sunday mornings: hands, Preflop IQ and my biggest leak</label>
    <p class="hint">Times follow your device\u2019s time zone. Every email has a one-click unsubscribe.</p></div>`;
}
document.addEventListener('change',async e=>{
  const c=e.target.closest('[data-pref]');if(!c)return;
  try{await PIQ.setEmailPrefs({[c.dataset.pref]:c.checked});setNotice('Email settings saved.');}catch(x){c.checked=!c.checked;setNotice(x.message,'err');}
});
async function afterSignIn(){
  const next=params.get('next');
  if(next&&next.startsWith('checkout-')&&!PIQ.state.isPro){
    try{await PIQ.checkout(next.slice(9));}catch(e){setNotice(e.message,'err');}
  }else if(next==='trainer'){location.href='/';}
  else if(next==='daily'){location.href='/daily/';}
  else if(next==='clubs'){location.href='/clubs/';}
}

document.addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;busy=true;notice=null;
  const sb=PIQ.client,origin=location.origin;
  const btn=e.target.querySelector('button[type=submit]');if(btn)btn.disabled=true;
  try{
    if(e.target.id==='f-auth'){
      const email=$('email').value.trim(),password=$('password').value;
      if(view==='signup'){
        const dname=$('dname').value.trim();
        const data0={full_name:$('fullname').value.trim(),display_name:dname,plays:$('plays').value,emails:$('emails').checked?'true':'false'};
        const {data,error}=await sb.auth.signUp({email,password,options:{data:data0,emailRedirectTo:`${origin}/account/${location.search}`}});
        if(error)throw new Error(/already registered|already exists/i.test(error.message)?'That email already has an account. Sign in instead.':error.message);
        if(!data.session){view='signin';setNotice(`Check ${email} for a confirmation link, then sign in.`);}
        else{await PIQ.ready;await PIQ.refresh();
          const got=PIQ.state.profile&&PIQ.state.profile.display_name;
          setNotice(dname&&!got?`Welcome! “${dname}” was already taken as a leaderboard name, so choose another below.`:PIQ.payments?'Welcome! Your 7-day Pro trial has started.':'Welcome! Your account is ready.',dname&&!got?'err':'ok');}
      }else{
        const {error}=await sb.auth.signInWithPassword({email,password});
        if(error)throw new Error(error.message==='Invalid login credentials'?'That email and password don’t match an account.':error.message);
      }
    }else if(e.target.id==='f-pw'){
      if($('pw1').value!==$('pw2').value)throw new Error('The two passwords don’t match.');
      const {error}=await sb.auth.updateUser({password:$('pw1').value});
      if(error)throw error;
      e.target.reset();setNotice('Password changed.');
    }else if(e.target.id==='f-delete'){
      if($('del-confirm').value!=='DELETE')throw new Error('Type DELETE to confirm.');
      const {data:s0}=await sb.auth.getSession();
      const res=await fetch('/api/account',{method:'DELETE',headers:{authorization:`Bearer ${s0.session?.access_token||''}`}});
      const out=await res.json().catch(()=>({}));
      if(!res.ok)throw new Error(out.error||'Could not delete your account.');
      try{localStorage.removeItem('pft-stats2');}catch(x){}
      await PIQ.signOut();view='signin';setNotice('Your account has been deleted.');
    }else if(e.target.id==='f-details'){
      const dn=$('d-dname').value.trim();
      await PIQ.updateProfile({full_name:$('d-name').value.trim()||null,display_name:dn||null,plays:$('d-plays').value||null});
      setNotice('Details saved.');
    }else if(e.target.id==='f-forgot'){
      const email=$('email').value.trim();
      const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:`${origin}/account/`});
      if(error)throw error;
      setNotice(`If ${email} has an account, a reset link is on its way.`);
    }else if(e.target.id==='f-newpw'){
      const {error}=await sb.auth.updateUser({password:$('newpw').value});
      if(error)throw error;
      PIQ.state.recovery=false;setNotice('Password updated.');
    }
  }catch(err){setNotice(err.message||'Something went wrong. Try again.','err');}
  finally{busy=false;if(btn)btn.disabled=false;}
});

document.addEventListener('click',async e=>{
  const t=e.target.closest('button');if(!t||!($('acctbox').contains(t)||$('acctdash').contains(t)))return;
  if(t.id==='t-signin'||t.id==='t-signup'){view=t.id.slice(2);notice=null;render();}
  else if(t.id==='b-forgot'){view='forgot';notice=null;render();}
  else if(t.id==='b-back'){view='signin';notice=null;render();}
  else if(t.id==='b-signout'){await PIQ.signOut();notice=null;view='signin';render();}
  else if(t.id==='b-signout-all'){await PIQ.client.auth.signOut({scope:'global'});await PIQ.signOut();notice=null;view='signin';setNotice('Signed out on every device.');}
  else if(t.id==='b-retry'){await PIQ.refresh();render();}
  else if(t.id==='b-portal'){t.disabled=true;try{await PIQ.portal();}catch(x){t.disabled=false;setNotice(x.message,'err');}}
  else if(t.dataset.plan){t.disabled=true;try{await PIQ.checkout(t.dataset.plan);}catch(x){t.disabled=false;setNotice(x.message,'err');}}
});

// Stripe sends people back here after paying; the webhook may take a few seconds to land.
async function waitForPro(){
  setNotice('Payment received. Activating Pro…');
  for(let i=0;i<10&&!PIQ.state.isPro;i++){await new Promise(r=>setTimeout(r,2000));await PIQ.refresh();}
  setNotice(PIQ.state.isPro?'Welcome to Pro. Every table, every stack, unlimited hands.':'Your payment went through, but Pro hasn’t activated yet. Refresh this page in a minute.',PIQ.state.isPro?'ok':'err');
}

let wasSignedIn=false;
PIQ.onChange(st=>{render();if(st.user&&!wasSignedIn){wasSignedIn=true;afterSignIn();}if(!st.user)wasSignedIn=false;});
render();
PIQ.ready.then(st=>{wasSignedIn=!!st.user;render();if(params.get('checkout')==='success'&&st.user)waitForPro();});

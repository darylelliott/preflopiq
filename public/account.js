/* Preflop IQ account page: sign in, sign up, password reset, plan status and billing. */
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search);
let view='signin';            // signin | signup | forgot
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
  if(!st.loaded){box.innerHTML='<p class="hint">Loading your account…</p>';return;}

  if(st.recovery&&st.user){
    box.innerHTML=`<h2>Choose a new password</h2>${noticeHTML()}
    <form id="f-newpw" class="form">
      <label for="newpw">New password</label><input id="newpw" type="password" autocomplete="new-password" minlength="8" required>
      <button class="btn" type="submit">Save password</button>
    </form>`;
    return;
  }

  if(st.user){
    const sub=st.sub,pro=st.isPro,used=PIQ.handsUsed();
    let plan;
    if(pro){
      plan=`<div class="planstatus pro"><span class="probadge">Pro</span>
        <p>${sub.cancel_at_period_end?`Your Pro plan ends on <b>${fmtDate(sub.current_period_end)}</b>. You can renew it any time before then.`:sub.current_period_end?`Renews on <b>${fmtDate(sub.current_period_end)}</b>.`:'Active.'}</p>
        <button class="btn" id="b-portal" type="button">Manage billing</button>
        <p class="hint">Change plan, update your card, download invoices or cancel.</p></div>`;
    }else{
      const lapsed=sub&&['canceled','past_due','unpaid','incomplete_expired'].includes(sub.status);
      plan=`<div class="planstatus"><span class="freebadge">Free</span>
        <p>${lapsed?`Your Pro plan is ${sub.status==='past_due'?'past due. Update your card to keep it':'no longer active'}.`:`You've used <b>${Math.min(used,PIQ.FREE_HANDS)} of ${PIQ.FREE_HANDS}</b> free hands.`}</p>
        ${lapsed?'<button class="btn" id="b-portal" type="button">Manage billing</button>':''}
        <h3>Upgrade to Pro</h3>
        <p>Unlimited hands at every table size and stack depth, every range chart, and progress synced across your devices.</p>
        ${plansHTML()}</div>`;
    }
    box.innerHTML=`<h2>Your account</h2>${noticeHTML()}
      <dl class="acctinfo"><dt>Email</dt><dd>${esc(st.user.email)}</dd><dt>Hands played</dt><dd>${(st.profile&&st.profile.stats&&st.profile.stats.total)||0}</dd></dl>
      ${plan}
      ${emailPrefsHTML()}
      <button class="linkbtn" id="b-signout" type="button">Sign out</button>`;
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
  box.innerHTML=`${tabs}${why}${noticeHTML()}
    <form id="f-auth" class="form">
      <label for="email">Email</label><input id="email" type="email" autocomplete="email" required>
      <label for="password">Password</label><input id="password" type="password" autocomplete="${view==='signup'?'new-password':'current-password'}" minlength="${view==='signup'?8:1}" required>
      ${view==='signup'?'<p class="hint">At least 8 characters.</p>':''}
      <button class="btn" type="submit">${view==='signup'?'Create account':'Sign in'}</button>
    </form>
    ${view==='signin'?'<button class="linkbtn" id="b-forgot" type="button">Forgot your password?</button>':''}`;
}

function emailPrefsHTML(){
  const p=(PIQ.state.profile&&PIQ.state.profile.email_prefs)||{streak:true,weekly:true};
  return `<div class="planstatus"><h3>Emails</h3>
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
        const {data,error}=await sb.auth.signUp({email,password,options:{emailRedirectTo:`${origin}/account/${location.search}`}});
        if(error)throw error;
        if(!data.session){view='signin';setNotice(`Check ${email} for a confirmation link, then sign in.`);}
      }else{
        const {error}=await sb.auth.signInWithPassword({email,password});
        if(error)throw new Error(error.message==='Invalid login credentials'?'That email and password don’t match an account.':error.message);
      }
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
  const t=e.target.closest('button');if(!t||!$('acctbox').contains(t))return;
  if(t.id==='t-signin'||t.id==='t-signup'){view=t.id.slice(2);notice=null;render();}
  else if(t.id==='b-forgot'){view='forgot';notice=null;render();}
  else if(t.id==='b-back'){view='signin';notice=null;render();}
  else if(t.id==='b-signout'){await PIQ.signOut();notice=null;view='signin';render();}
  else if(t.id==='b-portal'){t.disabled=true;try{await PIQ.portal();}catch(x){setNotice(x.message,'err');}}
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

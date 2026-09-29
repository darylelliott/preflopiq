/* Preflop IQ accounts, Pro status and the free-hand limit. Loaded on every page after config.js.
   Exposes window.PIQ. If config.js has no Supabase settings, accounts and the paywall stay off
   and the site behaves exactly like the free version. */
(function(){
  const cfg=window.PIQ_CONFIG||{};
  const FREE_HANDS=25;
  const PRICES={monthly:'$7.99/month',annual:'$59/year'};
  const configured=!!(cfg.supabaseUrl&&cfg.supabaseAnonKey&&window.supabase);
  const payments=configured&&cfg.payments===true;   // no paywall until Stripe is live
  const ls={get(k,d){try{const v=localStorage.getItem(k);return v===null?d:JSON.parse(v);}catch(e){return d;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}};
  const sb=configured?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,detectSessionInUrl:true,autoRefreshToken:true}}):null;

  const state={user:null,session:null,profile:null,sub:null,isPro:false,loaded:!configured};
  const listeners=[];
  const emit=()=>{renderAccountLink();listeners.forEach(f=>{try{f(state);}catch(e){console.error(e);}});};

  // Anonymous hand count lives in this browser; it starts from any hands played before accounts existed.
  function localUsed(){
    let n=ls.get('pic-free-used',null);
    if(n===null){const st=ls.get('pft-stats2',null);n=st&&st.total?st.total:0;ls.set('pic-free-used',n);}
    return n;
  }

  // A query that never answers must not leave the page on "Loading" forever.
  const withTimeout=(p,ms=10000)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error('Timed out talking to the account server.')),ms))]);
  async function loadAccount(session){try{await withTimeout(loadAccountInner(session));}catch(e){console.error('Account load failed',e);state.loadError=e.message;}finally{state.loaded=true;}}
  async function loadAccountInner(session){state.loadError=null;
    state.session=session;state.user=session?.user||null;state.profile=null;state.sub=null;state.isPro=false;state.onTrial=false;state.comp=false;state.trialEnds=null;
    if(state.user){
      const [p,s]=await Promise.all([
        sb.from('profiles').select('hands_played,stats,display_name,email_prefs,timezone,full_name,plays,trial_ends,comp').eq('id',state.user.id).maybeSingle(),
        sb.from('subscriptions').select('status,price_id,current_period_end,cancel_at_period_end').eq('user_id',state.user.id).maybeSingle()
      ]);
      if(p.error)throw new Error('Could not load your profile: '+p.error.message);
      state.profile=p.data||{hands_played:0,stats:null};
      state.sub=s.data||null;
      // Reminder emails go out in the player's own evening, so keep their time zone current.
      try{const tz=Intl.DateTimeFormat().resolvedOptions().timeZone;if(tz&&state.profile.timezone!==tz){state.profile.timezone=tz;sb.from('profiles').update({timezone:tz}).eq('id',state.user.id).then(()=>{});}}catch(e){}
      // Pro is a paid (or Stripe-trialing) subscription, free Pro given by the owner (comp),
      // or the 7-day trial every new account gets.
      const paid=!!state.sub&&['active','trialing'].includes(state.sub.status);
      state.comp=!!state.profile.comp;
      state.trialEnds=state.profile.trial_ends?new Date(state.profile.trial_ends):null;
      state.onTrial=!paid&&!state.comp&&!!state.trialEnds&&state.trialEnds>new Date();
      state.isPro=paid||state.comp||state.onTrial;
      // Hands played before signing in still count toward the free limit.
      const local=localUsed();
      if(!state.isPro&&local>(state.profile.hands_played||0)){
        state.profile.hands_played=local;
        sb.from('profiles').update({hands_played:local,updated_at:new Date().toISOString()}).eq('id',state.user.id).then(()=>{});
      }
    }
    state.loaded=true;
  }

  const ready=(async()=>{
    if(!configured) return state;
    const {data}=await withTimeout(sb.auth.getSession());
    await loadAccount(data.session);
    // Supabase holds its auth lock while this callback runs, so never await a Supabase call in
    // it (that deadlocks every tab on the site). Do the work on the next tick instead.
    sb.auth.onAuthStateChange((event,session)=>{
      if(event==='PASSWORD_RECOVERY'){state.recovery=true;}
      if(['SIGNED_IN','SIGNED_OUT','USER_UPDATED','PASSWORD_RECOVERY'].includes(event)&&(session?.user?.id||null)!==(state.user?.id||null)){
        setTimeout(()=>{loadAccount(session).then(emit,e=>{console.error(e);state.loaded=true;emit();});},0);
      }else if(event==='PASSWORD_RECOVERY'){setTimeout(emit,0);}
      else if(session){state.session=session;}
    });
    return state;
  })().catch(e=>{console.error('Account load failed',e);state.loaded=true;return state;}).then(s=>{emit();return s;});

  function handsUsed(){return state.user?(state.profile?.hands_played||0):localUsed();}
  function paywallOn(){return payments&&state.loaded&&!state.isPro;}
  function handsLeft(){return paywallOn()?Math.max(0,FREE_HANDS-handsUsed()):Infinity;}
  function locked(){return paywallOn()&&handsUsed()>=FREE_HANDS;}

  function recordHand(){
    ls.set('pic-free-used',localUsed()+1);
    if(state.user&&state.profile){
      state.profile.hands_played=(state.profile.hands_played||0)+1;
      if(!state.isPro) sb.from('profiles').update({hands_played:state.profile.hands_played,updated_at:new Date().toISOString()}).eq('id',state.user.id).then(()=>{});
    }
  }

  let saveTimer=null;
  function saveStats(stats){
    if(!state.user) return;
    state.profile&&(state.profile.stats=stats);
    clearTimeout(saveTimer);
    saveTimer=setTimeout(()=>{sb.from('profiles').update({stats,updated_at:new Date().toISOString()}).eq('id',state.user.id).then(()=>{});},1500);
  }

  async function api(path,body){
    const {data}=await sb.auth.getSession();
    const res=await fetch(path,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${data.session?.access_token||''}`},body:JSON.stringify(body||{})});
    const out=await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(out.error||`Request failed (${res.status})`);
    return out;
  }
  async function checkout(plan){
    if(!payments) throw new Error('Pro isn’t on sale yet. Everything is free for now.');
    if(!state.user){location.href=`/account/?next=${encodeURIComponent('checkout-'+plan)}`;return;}
    const {url}=await api('/api/checkout',{plan});location.href=url;
  }
  async function portal(){const {url}=await api('/api/portal');location.href=url;}
  async function refresh(){if(!configured)return state;const {data}=await sb.auth.getSession();await loadAccount(data.session);emit();return state;}
  async function signOut(){if(sb)await sb.auth.signOut();await loadAccount(null);emit();}

  function renderAccountLink(){
    const a=document.getElementById('acct');if(!a)return;
    if(!configured){a.hidden=true;return;}
    a.hidden=false;
    if(state.user){a.innerHTML=state.isPro&&payments?`Account <span class="probadge">${state.onTrial?'Trial':'Pro'}</span>`:'Account';}
    else a.textContent='Sign in';
  }

  async function setEmailPrefs(prefs){
    const next={...(state.profile&&state.profile.email_prefs||{streak:true,weekly:true}),...prefs};
    const {error}=await sb.from('profiles').update({email_prefs:next}).eq('id',state.user.id);
    if(error)throw new Error(error.message);state.profile.email_prefs=next;return next;
  }
  // Days left in the sign-up trial (1 on its last day), or 0.
  function trialDaysLeft(){return state.onTrial?Math.max(1,Math.ceil((state.trialEnds-new Date())/86400000)):0;}
  // Name, leaderboard name and where they play, from the account page.
  async function updateProfile(fields){
    const {error}=await sb.from('profiles').update(fields).eq('id',state.user.id);
    if(error)throw new Error(/duplicate|unique/i.test(error.message)?'That leaderboard name is taken. Try another.':/display_name_format/i.test(error.message)?'Leaderboard names are 3 to 20 letters, numbers, spaces, dots, dashes or underscores.':error.message);
    Object.assign(state.profile,fields);emit();
  }
  window.PIQ={configured,payments,ready,state,setEmailPrefs,updateProfile,trialDaysLeft,TRIAL_DAYS:7,FREE_HANDS,PRICES,client:sb,
    onChange(f){listeners.push(f);},handsUsed,handsLeft,locked,paywallOn,recordHand,saveStats,checkout,portal,refresh,signOut};
})();

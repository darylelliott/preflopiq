/* Preflop IQ achievements: definitions, unlock checks, progress and the unlock toast.
   Everything lives in stats.a, so it is saved and synced with the rest of a player's stats:
     a.u    {id: unlockedAtMs}
     a.c    counters
     a.t    table sizes played      a.d  stack depths played      a.days  dates trained (YYYY-MM-DD)
     a.c.daily / dailyPerfect / grudge / clock / dayBest   habit counters
   Chips mark difficulty, like casino denominations: white 1, red 5, green 25, black 100. */
(function(){
  const CHIPS={white:{value:1,label:'White chip'},red:{value:5,label:'Red chip'},green:{value:25,label:'Green chip'},black:{value:100,label:'Black chip'}};
  const TABLE_SIZES=[2,3,4,5,6,7,8,9],DEPTHS=[100,60,40,25,15,10];
  const cnt=(a,k)=>(a.c&&a.c[k])||0;

  // goal: number for a counted achievement; value(a,stats) returns current progress.
  const LIST=[
    // ---- volume
    {id:'first-hand',group:'Volume',chip:'white',name:'Shuffle Up and Deal',desc:'Play your first hand.',goal:1,value:(a,s)=>s.total},
    {id:'grinder',group:'Volume',chip:'red',name:'Grinder',desc:'Play 100 hands.',goal:100,value:(a,s)=>s.total},
    {id:'iron-seat',group:'Volume',chip:'black',name:'Iron Seat',desc:'Play 1,000 hands.',goal:1000,value:(a,s)=>s.total},
    // ---- streaks
    {id:'running-good',group:'Streaks',chip:'white',name:'Running Good',desc:'Get 5 in a row right.',goal:5,value:(a,s)=>s.best},
    {id:'heater',group:'Streaks',chip:'red',name:'Heater',desc:'Get 10 in a row right.',goal:10,value:(a,s)=>s.best},
    {id:'the-nuts',group:'Streaks',chip:'black',name:'The Nuts',desc:'Get 25 in a row right.',goal:25,value:(a,s)=>s.best},
    // ---- Preflop IQ
    {id:'regs',group:'Preflop IQ',chip:'red',name:'Sat Down With the Regs',desc:'Reach a Preflop IQ of 105 (Regular).',test:c=>c.iq>=105},
    {id:'fins-out',group:'Preflop IQ',chip:'green',name:'Fins Out',desc:'Reach a Preflop IQ of 120 (Shark).',test:c=>c.iq>=120},
    {id:'nosebleeds',group:'Preflop IQ',chip:'black',name:'Nosebleeds',desc:'Reach a Preflop IQ of 135 (Solver-brained).',test:c=>c.iq>=135},
    // ---- specific plays
    {id:'laydown',group:'Plays',chip:'white',name:'The Laydown',desc:'Correctly fold a pocket pair.',test:c=>c.ok&&c.right==='fold'&&c.pair},
    {id:'wheel',group:'Plays',chip:'red',name:'Wheel of Fortune',desc:'Correctly 3-bet a suited wheel ace (A2s to A5s).',test:c=>c.ok&&c.right==='3bet'&&c.suited&&c.hi===12&&c.lo<=3},
    {id:'snap-call',group:'Plays',chip:'red',name:'Snap Call',desc:'Correctly call an all-in from the big blind.',test:c=>c.ok&&c.push&&c.type==='vs'&&c.hero==='BB'&&c.right==='call'},
    {id:'jam-session',group:'Plays',chip:'green',name:'Jam Session',desc:'Make 25 correct shoves.',goal:25,value:a=>cnt(a,'shove')},
    {id:'pickpocket',group:'Plays',chip:'green',name:'Pickpocket',desc:'Make 25 correct opens from the button.',goal:25,value:a=>cnt(a,'btn')},
    {id:'hold-the-line',group:'Plays',chip:'green',name:'Hold the Line',desc:'Correctly defend the big blind 25 times.',goal:25,value:a=>cnt(a,'bbdef')},
    {id:'suited-booted',group:'Plays',chip:'green',name:'Suited and Booted',desc:'Correctly play 15 suited connectors, 54s through JTs.',goal:15,value:a=>cnt(a,'sc')},
    {id:'thin-value',group:'Plays',chip:'green',name:'Thin Value',desc:'Get 50 borderline hands right.',goal:50,value:a=>cnt(a,'border')},
    {id:'dialed-in',group:'Plays',chip:'black',name:'Dialed In',desc:'Hold 90% accuracy over 50 or more hands in a single spot.',test:(c,s)=>Object.values(s.per||{}).some(p=>p.n>=50&&p.c/p.n>=0.9)},
    // ---- range of games
    {id:'hud',group:'Table time',chip:'green',name:'Heads-Up Display',desc:'Play 50 heads-up hands.',goal:50,value:a=>cnt(a,'hu')},
    {id:'every-seat',group:'Table time',chip:'green',name:'Every Seat in the House',desc:'Play at every table size, heads-up to 9-handed.',goal:TABLE_SIZES.length,value:a=>(a.t||[]).length},
    {id:'deep-to-short',group:'Table time',chip:'red',name:'Deep to Short',desc:'Play at every stack depth, 100bb down to 10bb.',goal:DEPTHS.length,value:a=>(a.d||[]).length},
    {id:'seven-card-stud',group:'Table time',chip:'green',name:'Seven-Card Stud',desc:'Train on seven different days.',goal:7,value:a=>(a.days||[]).length},
    // ---- habits
    {id:'daily-grind',group:'Habits',chip:'white',name:'Daily Grind',desc:'Finish a daily challenge.',goal:1,value:a=>cnt(a,'daily')},
    {id:'royal-flush',group:'Habits',chip:'black',name:'Royal Flush',desc:'Score 10 out of 10 on a daily challenge.',goal:1,value:a=>cnt(a,'dailyPerfect')},
    {id:'standing-game',group:'Habits',chip:'green',name:'Standing Game',desc:'Keep a 7-day streak.',goal:7,value:a=>cnt(a,'dayBest')},
    {id:'beat-the-clock',group:'Habits',chip:'green',name:'Beat the Clock',desc:'Get 50 hands right on the shot clock.',goal:50,value:a=>cnt(a,'clock')},
    {id:'gold-standard',group:'Habits',chip:'green',name:'Gold Standard',desc:'Earn gold mastery in any spot.',goal:1,value:(a,s)=>typeof PL==='undefined'?0:Object.values(s.per||{}).filter(p=>PL.medal(p)==='gold').length},
    {id:'grudge-match',group:'Habits',chip:'red',name:'Grudge Match',desc:'Beat a friend\u2019s score on their challenge link.',goal:1,value:a=>cnt(a,'grudge')},
    // ---- hidden until earned
    {id:'welcome',group:'Hidden',chip:'white',hidden:true,name:'Welcome to Poker',desc:'Get one wrong. Everyone does.',test:c=>!c.ok},
    {id:'late-reg',group:'Hidden',chip:'white',hidden:true,name:'Late Reg',desc:'Play a hand between midnight and 5 a.m.',test:c=>c.hour<5},
    {id:'the-hammer',group:'Hidden',chip:'white',hidden:true,name:'The Hammer',desc:'Fold 7-2 offsuit. It was never going to work out.',test:c=>c.ok&&c.hand==='72o'&&c.right==='fold'}
  ];
  const BY_ID=Object.fromEntries(LIST.map(x=>[x.id,x]));

  function ensure(stats){
    const a=stats.a||(stats.a={});
    a.u=a.u||{};a.c=a.c||{};a.t=a.t||[];a.d=a.d||[];a.days=a.days||[];
    return a;
  }
  const inc=(a,k)=>{a.c[k]=(a.c[k]||0)+1;};
  const addOnce=(arr,v,cap)=>{if(!arr.includes(v)&&(!cap||arr.length<cap))arr.push(v);};
  function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}

  // Called after each answered hand; returns the achievements unlocked by it.
  function record(stats,ctx){
    const a=ensure(stats),c={...ctx,hour:new Date().getHours()};
    addOnce(a.t,c.N);addOnce(a.d,c.D);addOnce(a.days,today(),7);
    if(c.ok){
      if(c.type==='rfi'&&c.push&&c.right==='raise')inc(a,'shove');
      if(c.type==='rfi'&&c.hero==='BTN'&&c.right==='raise')inc(a,'btn');
      if(c.type==='vs'&&c.hero==='BB'&&c.right!=='fold')inc(a,'bbdef');
      if(c.suited&&c.hi-c.lo===1&&c.hi>=3&&c.hi<=9&&c.right!=='fold')inc(a,'sc');
      if(c.border)inc(a,'border');
    }
    if(c.N===2)inc(a,'hu');
    const fresh=[];
    for(const x of LIST){
      if(a.u[x.id])continue;
      const hit=x.goal?x.value(a,stats)>=x.goal:x.test(c,stats);
      if(hit){a.u[x.id]=Date.now();fresh.push(x);}
    }
    return fresh;
  }

  // Counters bumped outside a hand (daily results, the shot clock), then a check of counted goals.
  function bump(stats,key,n=1){const a=ensure(stats);a.c[key]=(a.c[key]||0)+n;}
  function sweep(stats){
    const a=ensure(stats),fresh=[];
    for(const x of LIST){if(a.u[x.id]||!x.goal)continue;if(x.value(a,stats)>=x.goal){a.u[x.id]=Date.now();fresh.push(x);}}
    return fresh;
  }

  function progress(stats,id){
    const x=BY_ID[id],a=ensure(stats);
    if(!x.goal)return null;
    return {cur:Math.min(x.value(a,stats)||0,x.goal),goal:x.goal};
  }
  function summary(stats){
    const a=ensure(stats);const got=LIST.filter(x=>a.u[x.id]);
    return {earned:got.length,total:LIST.length,chips:got.reduce((t,x)=>t+CHIPS[x.chip].value,0),maxChips:LIST.reduce((t,x)=>t+CHIPS[x.chip].value,0)};
  }

  // ---------- unlock toast ----------
  const queue=[];let showing=false;
  const esc=t=>String(t).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  function toastHost(){
    let h=document.getElementById('toasts');
    if(!h){h=document.createElement('div');h.id='toasts';h.className='toasts';h.setAttribute('role','status');h.setAttribute('aria-live','polite');document.body.appendChild(h);}
    return h;
  }
  function next(){
    if(showing||!queue.length)return;
    showing=true;const x=queue.shift();
    const el=document.createElement('a');el.className='toast';el.href=x.href||('/achievements/'+(x.id?'#'+x.id:''));
    const kicker=x.kicker||(x.summary?'Achievements unlocked':`Achievement unlocked · ${CHIPS[x.chip].label}`);
    el.innerHTML=`<span class="pchip pchip-${x.chip}" aria-hidden="true"></span><span class="toast-body"><span class="toast-kicker">${esc(kicker)}</span><b>${esc(x.name)}</b><span>${esc(x.desc)}</span></span>`;
    if(typeof FX!=='undefined')FX.play('unlock');
    toastHost().appendChild(el);
    requestAnimationFrame(()=>el.classList.add('in'));
    setTimeout(()=>{el.classList.remove('in');el.classList.add('out');setTimeout(()=>{el.remove();showing=false;next();},320);},4200);
  }
  // Returning players can unlock several at once; show two, then roll the rest into one card.
  function celebrate(list){
    if(list.length>3){
      list.slice(0,2).forEach(x=>queue.push(x));
      const rest=list.length-2;
      queue.push({id:'',chip:'black',name:`And ${rest} more`,desc:'See them all in your trophy case.',summary:true});
    }else list.forEach(x=>queue.push(x));
    next();
  }
  // Keeps every achievement earned on either copy when stats from two devices meet.
  function merge(into,from){
    if(!from||!from.a)return into;
    const a=ensure(into),b=from.a;
    for(const [k,v] of Object.entries(b.u||{}))if(!a.u[k]||v<a.u[k])a.u[k]=v;
    for(const [k,v] of Object.entries(b.c||{}))a.c[k]=Math.max(a.c[k]||0,v);
    (b.t||[]).forEach(v=>addOnce(a.t,v));(b.d||[]).forEach(v=>addOnce(a.d,v));(b.days||[]).forEach(v=>addOnce(a.days,v,7));
    return into;
  }

  window.ACH={LIST,CHIPS,BY_ID,ensure,record,bump,sweep,progress,summary,celebrate,merge};
})();

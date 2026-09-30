/* Preflop IQ player progress, shared by every page: stats storage and sync, Preflop IQ,
   the daily streak, rank ladder, spot mastery and leak finder. Loaded after auth.js and
   achievements.js. Everything is stored in the stats object, so it syncs with an account. */
const PL=(function(){
  const LS={get(k,d){try{const v=localStorage.getItem(k);return v===null?d:JSON.parse(v);}catch(e){return d;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}};
  const pad=n=>String(n).padStart(2,'0');
  const dateKey=(d=new Date())=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const fromKey=k=>{const [y,m,d]=k.split('-').map(Number);return new Date(y,m-1,d);};
  const addDays=(k,n)=>{const d=fromKey(k);d.setDate(d.getDate()+n);return dateKey(d);};
  const weekOf=k=>{const d=fromKey(k);d.setDate(d.getDate()-((d.getDay()+6)%7));return dateKey(d);};

  function normalize(s){
    s=s||{};
    for(const [k,v] of Object.entries({total:0,correct:0,streak:0,best:0}))if(typeof s[k]!=='number')s[k]=v;
    s.per=s.per||{};s.play=s.play||{};if(!Array.isArray(s.hist))s.hist=[];
    return s;
  }
  function load(){return normalize(LS.get('pft-stats2',null));}
  function save(s){LS.set('pft-stats2',s);if(window.PIQ)PIQ.saveStats(s);}

  // Signed-in players get progress from their other devices. Resolves to the merged stats.
  function withRemote(s){
    if(!window.PIQ)return Promise.resolve(s);
    return PIQ.ready.then(()=>{
      const r=PIQ.state.profile&&PIQ.state.profile.stats;
      if(!r)return s;
      let out=s;
      if((r.total||0)>s.total){out=normalize(JSON.parse(JSON.stringify(r)));if(window.ACH)ACH.merge(out,s);mergePlay(out,s);}
      else{if(window.ACH)ACH.merge(out,r);mergePlay(out,r);out.iqBest=Math.max(out.iqBest||0,r.iqBest||0);out.rankIdx=Math.max(out.rankIdx||0,r.rankIdx||0);}
      LS.set('pft-stats2',out);
      return out;
    });
  }
  function mergePlay(into,from){for(const [k,v] of Object.entries(from.play||{}))into.play[k]=Math.max(into.play[k]||0,v);}

  // ---------- Preflop IQ ----------
  const TIERS=[[135,'Solver-brained'],[120,'Shark'],[105,'Regular'],[90,'Recreational'],[0,'Fish']];
  function iq(s){const h=s.hist;if(!h||!h.length)return null;let w=0,p=0;h.forEach(x=>{w+=x.w;p+=x.w*x.p;});return Math.round(25+120*p/w);}
  const tier=v=>TIERS.find(t=>v>=t[0])[1];

  // ---------- daily streak ----------
  // A day counts once you answer DAY_GOAL hands (a daily challenge is exactly that).
  // One missed day per calendar week is covered by a freeze.
  const DAY_GOAL=10;
  function streak(s){
    const play=s.play||{},today=dateKey(),ok=k=>(play[k]||0)>=DAY_GOAL;
    const used=new Set(),frozen=[];let n=0,k=addDays(today,-1);
    for(let i=0;i<800;i++){
      if(ok(k)){n++;k=addDays(k,-1);continue;}
      const w=weekOf(k),prev=addDays(k,-1);
      if(n>=0&&!used.has(w)&&ok(prev)){used.add(w);frozen.push(k);k=prev;continue;}
      break;
    }
    const doneToday=ok(today);if(doneToday)n++;
    return {days:n,doneToday,today:play[today]||0,goal:DAY_GOAL,freezeLeft:!used.has(weekOf(today)),frozen};
  }
  function markDay(s,n=1){
    const k=dateKey();s.play[k]=(s.play[k]||0)+n;
    const keys=Object.keys(s.play).sort();while(keys.length>400)delete s.play[keys.shift()];
    const st=streak(s);
    if(window.ACH){const c=ACH.ensure(s).c;c.dayBest=Math.max(c.dayBest||0,st.days);}
    return st;
  }

  // ---------- rank ladder ----------
  const RANKS=[
    {name:'Home Game',hands:0,iq:0,blurb:'Everyone starts at the kitchen table.'},
    {name:'Local Card Room',hands:100,iq:95,blurb:'You know which end of the chart is up.'},
    {name:'Daily Tournament',hands:250,iq:105,blurb:'Solid, reliable, hard to push around.'},
    {name:'Circuit Regular',hands:500,iq:112,blurb:'The regs nod when you sit down.'},
    {name:'Main Event',hands:1000,iq:120,blurb:'Ranges most players spend years on.'},
    {name:'High Roller',hands:2500,iq:128,blurb:'Few leaks, fewer excuses.'},
    {name:'Super High Roller',hands:5000,iq:135,blurb:'The top of the ladder. Play it like a solver.'}
  ];
  // Rank never drops: it's the highest rung you've reached.
  function rank(s){
    let i=0;RANKS.forEach((r,j)=>{if(s.total>=r.hands&&(s.iqBest||0)>=r.iq)i=j;});
    i=Math.max(i,s.rankIdx||0);s.rankIdx=i;
    const next=RANKS[i+1]||null;
    return {i,cur:RANKS[i],next,
      handsPct:next?Math.min(1,s.total/next.hands):1,iqPct:next?Math.min(1,(s.iqBest||0)/next.iq):1};
  }

  // ---------- spot mastery and leaks ----------
  function medal(p){
    if(!p||!p.n)return null;const a=p.c/p.n;
    if(p.n>=50&&a>=0.9)return 'gold';if(p.n>=25&&a>=0.8)return 'silver';if(p.n>=10&&a>=0.7)return 'bronze';return null;
  }
  // Stats keys: "8-100-rfi-UTG", or "8-10ft-vs-BB-SB" for a spot at a final table (bub = bubble).
  function parseKey(key){const m=key.match(/^(\d+)-(\d+)(bub|ft)?(tight|loose|aggro)?-(.+)$/);if(!m)return null;return {n:+m[1],d:+m[2],st:m[3]||'cev',pf:m[4]||'bal',id:m[5]};}
  // Position names can contain a dash (UTG+1 is stored as-is), so split on the known shapes.
  function spotName(id,d){
    const push=d<=15,m=id.match(/^(rfi|vs|v3|sq|lp|iso)-(.+)$/);if(!m)return id;
    const pos=m[2].match(/(UTG\+\d|UTG|LJ|HJ|CO|BTN|SB|BB)/g)||[];
    if(m[1]==='rfi')return `${pos[0]} ${push?'shove':'open'}`;
    if(m[1]==='v3')return `${pos[0]} vs ${pos[1]} 3-bet`;
    if(m[1]==='sq')return `${pos[0]} vs ${pos[1]} open + ${pos[2]} call`;
    if(m[1]==='lp')return `${pos[0]} vs ${pos[1]} limp`;
    if(m[1]==='iso')return `${pos[0]} vs ${pos.slice(1).join(' + ')} limp${pos.length>2?'s':''}`;
    return `${pos[0]} vs ${pos[1]} ${push?'shove':'open'}`;
  }
  const STG={bub:'Bubble',ft:'Final table'};
  const PFN={tight:'vs tight',loose:'vs loose-passive',aggro:'vs aggressive'};
  const formatName=(n,d,st,pf)=>`${n===2?'Heads-up':n+'-handed'} · ${d}bb${STG[st]?' · '+STG[st]:''}${PFN[pf]?' · '+PFN[pf]:''}`;
  function leaks(s,limit=3){
    return Object.entries(s.per||{}).map(([key,p])=>{const k=parseKey(key)||{};return {key,...k,players:k.n,n:p.n,c:p.c,l:p.l||0,acc:p.c/p.n};})
      .filter(x=>x.id&&x.n>=6&&x.acc<0.85)
      .sort((a,b)=>(b.n-b.c)-(a.n-a.c)||a.acc-b.acc).slice(0,limit)
      .map(x=>({...x,name:spotName(x.id,x.d),format:formatName(x.players,x.d,x.st,x.pf)}));
  }

  // ---------- recording an answer (trainer and daily) ----------
  // ctx: {s, k, pick, right, clock}. Uses engine globals N and D for the format.
  function record(s,ctx){
    const {k,pick,right}=ctx,sc=ctx.s,ok=pick===right;
    const border=sc.border!==HANDS&&sc.border.includes(k);
    const rankBefore=rank(s).i,before=iq(s);
    s.total++;if(ok){s.correct++;s.streak++;s.best=Math.max(s.best,s.streak);}else s.streak=0;
    const f=fmtKey(),key=`${f}-${sc.id}`,p=s.per[key]||(s.per[key]={n:0,c:0});p.n++;if(ok)p.c++;
    // Chips lost: running totals, the last 100 decisions, per spot, and the last 200 mistakes.
    const lost=ok||!ctx.loss?0:Math.round(ctx.loss.bb*100)/100;
    if(!ok)p.l=Math.round(((p.l||0)+lost)*100)/100;
    s.ev=s.ev||{bb:0,n:0};s.ev.bb=Math.round((s.ev.bb+lost)*100)/100;s.ev.n++;
    s.lh=s.lh||[];s.lh.push(lost);if(s.lh.length>100)s.lh.shift();
    if(!ok&&!ctx.review){s.miss=s.miss||[];s.miss.push({t:Date.now(),f,id:sc.id,k,p:pick,r:right,l:lost,x:ctx.loss&&ctx.loss.exact?1:0,src:ctx.src||'t'});
      if(s.miss.length>200)s.miss.shift();}
    s.hist.push({p:ok?1:(pick!=='fold'&&right!=='fold'?0.4:0),w:border?1.5:1});
    if(s.hist.length>100)s.hist.shift();
    const after=iq(s);
    if(s.hist.length>=20)s.iqBest=Math.max(s.iqBest||0,after);
    markDay(s,1);
    let fresh=[];
    if(window.ACH){
      const h=info(k);
      if(ctx.clock&&ok)ACH.bump(s,'clock');
      fresh=ACH.record(s,{type:sc.type,hero:sc.hero,push:isPush(),N,D,hand:k,pair:h.pair,suited:h.s,hi:h.hi,lo:h.lo,
        right,pick,ok,border,iq:s.hist.length>=20?after:-1});
    }
    const r=rank(s);
    if(r.i>rankBefore)fresh.push({id:'',chip:'black',kicker:'New rank',name:r.cur.name,desc:r.cur.blurb,href:'/progress/'});
    return {ok,border,delta:before===null?null:after-before,fresh};
  }

  // ---------- settings (per device) ----------
  const settings=Object.assign({sound:false,theme:'classic',clock:false},LS.get('pic-settings',{}));
  function setSetting(k,v){settings[k]=v;LS.set('pic-settings',settings);}

  return {load,save,withRemote,normalize,iq,tier,TIERS,streak,markDay,DAY_GOAL,RANKS,rank,medal,leaks,parseKey,spotName,formatName,
    record,dateKey,addDays,settings,setSetting,LS};
})();

/* Preflop IQ daily challenge page.
   /daily/                                  today's 10 hands
   /daily/?d=YYYY-MM-DD&by=Name&s=7&m=1101  a friend's challenge: the same hands, with their score to beat */
(function(){
  const $=id=>document.getElementById(id);
  const esc=t=>String(t).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const q=new URLSearchParams(location.search);
  const today=DAILY.today();
  const reqDay=q.get('d');
  const day=reqDay&&DAILY.valid(reqDay)&&reqDay<=today?reqDay:today;
  const isToday=day===today;
  const rival=q.get('by')&&/^\d+$/.test(q.get('s')||'')?{name:q.get('by').slice(0,24),score:Math.min(10,+q.get('s')),marks:(q.get('m')||'').replace(/[^01]/g,'').slice(0,10)}:null;
  const STORE=isToday?'pic-daily':'pic-challenges';
  const set=DAILY.forDay(day);
  let saved=PL.LS.get(STORE,{});
  let run=saved[day]||{picks:[],done:false};
  let stats=PL.load();
  let idx=run.picks.length,cur=null,answered=false;
  const saveN=N,saveD=D;       // the trainer's format, restored when we leave a hand

  function persist(){saved=PL.LS.get(STORE,{});saved[day]=run;
    // keep the last 60 days only
    const keys=Object.keys(saved).sort();while(keys.length>60)delete saved[keys.shift()];
    PL.LS.set(STORE,saved);}

  function head(){
    $('d-eyebrow').textContent=isToday?'Daily challenge':'Friend challenge';
    $('d-title').textContent=`${isToday?'Daily Challenge':'Challenge'} #${set.number}`;
    const when=new Date(day+'T12:00:00').toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
    $('d-lede').textContent=isToday?`${when}. Ten hands in mixed formats, the same for everyone today. One shot.`:`The hands from ${when}. Same ten spots, same cards.`;
    $('d-vs').hidden=!rival;
    if(rival)$('d-vs').innerHTML=`<span class="eyebrow">Challenge from ${esc(rival.name)}</span><span><b>${esc(rival.name)}</b> scored <b>${rival.score}/10</b> on these hands. Your turn.</span>`;
  }

  /* ---------- intro ---------- */
  function intro(){
    show('d-intro');
    const st=PL.streak(stats);
    $('d-intro').innerHTML=`<div class="dintro-card">
      <ul class="dfacts"><li><b>10</b><span>hands</span></li><li><b>Mixed</b><span>table sizes and stacks</span></li><li><b>1</b><span>shot a day</span></li></ul>
      <p>Most hands sit near the edge of a range, so expect a few hard ones. You'll see the answer after each hand. Finishing counts toward your day streak${st.days?`, currently <b>${st.days} day${st.days===1?'':'s'}</b>`:''}.</p>
      <p class="hint">Free for everyone, and it doesn't use your free trainer hands.</p>
      <button class="btn" id="d-start" type="button">${run.picks.length?`Resume at hand ${run.picks.length+1}`:'Deal the first hand'}</button></div>`;
  }

  /* ---------- play ---------- */
  function dots(){
    $('d-dots').innerHTML=set.hands.map((h,i)=>{const done=i<run.picks.length,ok=done&&run.marks&&run.marks[i];
      return `<span class="ddot${i===idx?' now':''}${done?(ok?' ok':' no'):''}" aria-label="Hand ${i+1}${done?(ok?', correct':', missed'):''}"></span>`;}).join('')+`<span class="dcount">Hand ${Math.min(idx+1,10)} of 10</span>`;
  }
  function deal(){
    if(idx>=set.hands.length){finish();return;}
    show('d-play');answered=false;
    const h=set.hands[idx],{s}=DAILY.load(h);cur={h,s};
    $('felt').innerHTML=TBL.felt(s);
    $('cards').innerHTML=TBL.cards(h.hand,DAILY.rng(`${day}-${idx}`));
    $('spotLabel').textContent=`${s.name} · ${PL.formatName(h.n,h.d)}`;
    $('prompt').innerHTML=TBL.prompt(s,h.hand);
    $('actions').innerHTML=TBL.actions(s);
    $('next').hidden=true;
    $('panel').innerHTML=TBL.before(s);
    dots();FX.play('deal');
  }
  function answer(a){
    if(answered||!cur)return;
    const btn=$('act-'+a);if(!btn)return;
    answered=true;
    const {s,h}=cur,right=actionOf(s,h.hand),loss=evLoss(s,h.hand,a);
    document.querySelectorAll('.act').forEach(b=>{b.disabled=true;if(b.dataset.a===right)b.classList.add('right');});
    btn.classList.add('picked');
    const res=PL.record(stats,{s,k:h.hand,pick:a,right,loss,src:'d'});
    run.picks.push(a);run.marks=(run.marks||[]).concat([res.ok?1:0]);persist();
    PL.save(stats);
    $('panel').innerHTML=TBL.after(s,h.hand,a,right,{loss});
    FX.play(res.ok?'right':'wrong');
    if(res.fresh.length)ACH.celebrate(res.fresh);
    idx++;dots();
    $('next').innerHTML=idx>=10?'See your result':'Next hand <span style="opacity:.6;font-weight:400">· Space</span>';
    $('next').hidden=false;$('next').focus({preventScroll:true});
  }

  /* ---------- results ---------- */
  function finish(){
    const first=!run.done;
    const sc=DAILY.score(day,run.picks);run.marks=sc.marks;run.score=sc.score;
    if(first){
      run.done=true;persist();
      let fresh=[];
      if(isToday){ACH.bump(stats,'daily');if(sc.score===10)ACH.bump(stats,'dailyPerfect');}
      fresh=ACH.sweep(stats);PL.save(stats);
      if(fresh.length)ACH.celebrate(fresh);
      if(window.LB&&isToday)LB.submit(day,run.picks);
    }
    N=saveN;D=saveD;buildScenarios();
    results(sc);
  }
  function shareText(sc){
    return `Preflop IQ ${isToday?'Daily':'Challenge'} #${set.number} · ${sc.score}/10\n${sc.marks.map(m=>m?'\u{1F7E9}':'\u{1F7E5}').join('')}\n${location.origin}/daily/`;
  }
  function challengeLink(sc,name){
    const u=new URL(location.origin+'/daily/');
    u.searchParams.set('d',day);if(name)u.searchParams.set('by',name);u.searchParams.set('s',sc.score);u.searchParams.set('m',sc.marks.join(''));
    return u.toString();
  }
  function verdict(sc){
    if(sc.score===10)return 'A perfect ten. Royal flush.';
    if(sc.score>=8)return 'Sharp. Most players drop two or three here.';
    if(sc.score>=6)return 'Solid. The borderline hands are the hard part.';
    return 'Tough set. Every miss below comes with the reasoning.';
  }
  function countdown(){const n=new Date(),t=new Date(n.getFullYear(),n.getMonth(),n.getDate()+1);const m=Math.max(0,Math.round((t-n)/60000));return `${Math.floor(m/60)}h ${m%60}m`;}
  function results(sc){
    show('d-result');
    // Beating a friend's score counts once per friend per day, even if you played before opening their link.
    if(rival&&sc.score>rival.score){
      const tag=rival.name.toLowerCase();run.beat=run.beat||[];
      if(!run.beat.includes(tag)){run.beat.push(tag);persist();ACH.bump(stats,'grudge');const f=ACH.sweep(stats);PL.save(stats);if(f.length)ACH.celebrate(f);}
    }
    const st=PL.streak(stats);
    const name=PL.LS.get('pic-name','')||(window.PIQ&&PIQ.state.profile&&PIQ.state.profile.display_name)||'';
    let vs='';
    if(rival){
      const w=sc.score>rival.score?'You win':sc.score===rival.score?'Split pot':`${esc(rival.name)} takes it`;
      vs=`<div class="vsresult"><div><span>You</span><b>${sc.score}</b></div><div class="vsmid">${w}</div><div><span>${esc(rival.name)}</span><b>${rival.score}</b></div></div>`;
    }
    const review=set.hands.map((h,i)=>{const {s,right}=DAILY.load(h);const pick=run.picks[i];
      return `<li class="${sc.marks[i]?'ok':'no'}"><span class="rv-mark" aria-label="${sc.marks[i]?'Correct':'Missed'}"></span><span class="rv-hand">${h.hand}</span><span class="rv-spot">${s.name} · ${PL.formatName(h.n,h.d)}</span><span class="rv-pick">${sc.marks[i]?s.labels[right]:`You: ${s.labels[pick]||'—'} · Chart: ${s.labels[right]}`}</span></li>`;}).join('');
    N=saveN;D=saveD;buildScenarios();
    $('d-result').innerHTML=`
      <div class="dres">
        <div class="dscore"><b>${sc.score}<small>/10</small></b><span>${verdict(sc)}</span></div>
        <div class="dmarks" aria-label="${sc.marks.map(m=>m?'correct':'missed').join(', ')}">${sc.marks.map(m=>`<span class="${m?'ok':'no'}"></span>`).join('')}</div>
        ${vs}
        <p class="dmeta">${isToday?`Day streak: <b>${st.days}</b> · Next challenge in ${countdown()}`:`<a href="/daily/">Play today’s challenge</a>`}</p>
      </div>
      <div class="dshare">
        <div class="dshare-box">
          <h2>Share your result</h2>
          <pre class="sharetext" id="d-text">${esc(shareText(sc))}</pre>
          <div class="rowbtns"><button class="btn" id="d-copy" type="button">Copy result</button>${navigator.share?'<button class="btn ghostbtn" id="d-share" type="button">Share</button>':''}</div>
          <p class="hint" id="d-copied" role="status"></p>
        </div>
        <div class="dshare-box">
          <h2>Challenge a friend</h2>
          <p>Send them these exact hands with your score to beat.</p>
          <label for="d-name">Your name, as your friend will see it</label>
          <input id="d-name" maxlength="24" value="${esc(name)}" autocomplete="nickname">
          <div class="rowbtns"><button class="btn" id="d-challenge" type="button">Copy challenge link</button></div>
          <p class="hint" id="d-linked" role="status"></p>
        </div>
      </div>
      <div class="lbslot" id="lbslot"></div>
      <section class="dreview"><h2>The hands</h2><ol>${review}</ol></section>
      <div class="rowbtns"><a class="btn" href="/">Keep training</a><a class="btn ghostbtn" href="/progress/">Your progress</a></div>`;
    $('d-copy').onclick=()=>copy(shareText(sc),$('d-copied'),'Copied. Paste it anywhere.');
    if($('d-share'))$('d-share').onclick=()=>navigator.share({text:shareText(sc)}).catch(()=>{});
    $('d-challenge').onclick=()=>{const n=$('d-name').value.trim();PL.LS.set('pic-name',n);copy(challengeLink(sc,n),$('d-linked'),'Link copied. Whoever opens it plays these ten hands against your score.');};
    if(window.LB&&isToday)LB.render($('lbslot'),day);
  }
  function copy(text,out,msg){
    const done=()=>{out.textContent=msg;};
    if(navigator.clipboard)navigator.clipboard.writeText(text).then(done,()=>fallback(text,done));else fallback(text,done);
  }
  function fallback(text,done){const t=document.createElement('textarea');t.value=text;document.body.appendChild(t);t.select();try{document.execCommand('copy');done();}catch(e){}t.remove();}

  function show(id){['d-intro','d-play','d-result'].forEach(x=>$(x).hidden=x!==id);}

  /* ---------- wiring ---------- */
  document.addEventListener('click',e=>{
    if(e.target.id==='d-start')deal();
    const b=e.target.closest('.act');if(b&&$('d-play').contains(b))answer(b.dataset.a);
  });
  $('next').addEventListener('click',()=>deal());
  TBL.bindKeys({answer,next:()=>deal(),isAnswered:()=>answered,spot:()=>cur&&!$('d-play').hidden?cur.s:null});

  head();FX.applyTheme(stats);
  if(run.done)results(DAILY.score(day,run.picks));else intro();
  PL.withRemote(stats).then(s=>{stats=s;FX.applyTheme(stats);});
})();

/* Preflop IQ table rendering, shared by the trainer and the daily challenge.
   Returns HTML strings; uses engine globals N and D for the current format. */
const TBL=(function(){
  // Who is in the hand, and what they have in front of them, for any spot.
  function seats(s){
    const names=TABLES[N],hi=names.indexOf(s.hero),st={},bet={},allin=x=>x>=D?'All-in':x;
    names.forEach((p,i)=>{st[p]=i===hi?'hero':i<hi?'folded':'wait';if(posted(p))bet[p]=posted(p);});
    if(s.type==='vs'){st[s.opener]='open';bet[s.opener]=isPush()?'All-in':s.open;}
    else if(s.type==='v3'){names.forEach(p=>{if(p!==s.hero)st[p]='folded';});st[s.opener]='open';bet[s.hero]=s.open;bet[s.opener]=allin(s.threeTo);}
    else if(s.type==='sq'){st[s.opener]='open';st[s.caller]='called';bet[s.opener]=s.open;bet[s.caller]=s.open;}
    else if(s.type==='iso'){s.limpers.forEach(p=>{st[p]='called';bet[p]=1;});}
    else if(s.type==='lp'){names.forEach(p=>{if(p!=='BB'&&p!==s.opener)st[p]='folded';});st[s.opener]='called';bet[s.opener]=1;}
    return {st,bet};
  }
  function felt(s){
    const names=TABLES[N],h=names.indexOf(s.hero),step=360/N,{st:ss,bet:bb}=seats(s);
    let html='';
    names.forEach((p,i)=>{
      const k=(i-h+N)%N,a=(90+step*k)*Math.PI/180;
      const x=50+46*Math.cos(a),y=50+43*Math.sin(a),st=ss[p];
      const tag=profOn()&&st!=='hero'&&st!=='folded'?`<span class="ptag ${PROFILE}">${PROFILES[PROFILE].tag}</span>`:'';
      html+=`<div class="seat ${st}" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%">${tag}<span class="pos">${p}</span><span class="stk">${st==='hero'?`You · ${D}bb`:st==='folded'?'folded':D+'bb'}</span></div>`;
      const bet=st==='folded'?null:bb[p];
      if(bet!==undefined&&bet!==null){const cx=50+29*Math.cos(a),cy=50+25*Math.sin(a);html+=`<div class="bet ${st==='open'?'raise':st==='called'?'called':''}" style="left:${cx.toFixed(2)}%;top:${cy.toFixed(2)}%">${bet}</div>`;}
      if(p==='BTN'){const b=a-(N<=3?0.5:0.34);html+=`<div class="dealer" style="left:${(50+35*Math.cos(b)).toFixed(2)}%;top:${(50+31*Math.sin(b)).toFixed(2)}%">D</div>`;}
    });
    const pot=s.type==='rfi'?2.5:s.pot;
    html+=`<div class="center"><div class="fmt">${N===2?'Heads-up':N+'-max'} · ${D}bb${icmOn()?' · '+STAGES[STAGE]:''}${profOn()?` · vs ${PROFILES[PROFILE].tag}s`:''}</div><div class="pot">Pot ${pot}bb</div><div class="potnote">incl. 1bb ante</div></div>`;
    return html;
  }
  // rand: a function returning 0..1 (seeded for the daily, so suits stay the same on reload).
  function cards(k,rand=Math.random){
    const suits=['s','h','d','c'];for(let i=3;i>0;i--){const j=Math.floor(rand()*(i+1));[suits[i],suits[j]]=[suits[j],suits[i]];}
    const h=info(k),s1=suits[0],s2=h.s?suits[0]:suits[1];
    const sym={s:'♠',h:'♥',d:'♦',c:'♣'};
    return [[R[h.hi],s1],[R[h.lo],s2]].map(([r,s],i)=>face(r==='T'?'10':r,s,sym[s],'deal',i*90)).join('');
  }
  // A card face with corner indices, like a real deck (four-color: blue diamonds, green clubs).
  function face(rank,suit,glyph,cls='',delay=0){
    const idx=`<b>${rank}</b><i>${glyph}</i>`;
    return `<div class="card s-${suit} ${cls}"${delay?` style="animation-delay:${delay}ms"`:''}><span class="ci">${idx}</span><span class="r">${rank}</span><span class="s">${glyph}</span><span class="ci ci-br" aria-hidden="true">${idx}</span></div>`;
  }
  function prompt(s,k){
    const you=`You hold <span class="hk">${k}</span>.`,gap=(a,b)=>TABLES[N].indexOf(b)-TABLES[N].indexOf(a)>1;
    if(s.type==='rfi') return `Folds to you on the <b>${s.hero}</b>. ${you}`;
    if(s.type==='v3') return `You open to ${s.open}bb from the <b>${s.hero}</b> and the <b>${s.opener}</b> ${s.threeTo>=D?`moves all-in for ${D}bb`:`3-bets to ${s.threeTo}bb`}. It's back to you. ${you}`;
    if(s.type==='sq') return `The <b>${s.opener}</b> opens to ${s.open}bb and the <b>${s.caller}</b> calls${gap(s.caller,s.hero)?'. Folds to you':''} on the <b>${s.hero}</b>. ${you}`;
    if(s.type==='iso'){const L=s.limpers.map(p=>`<b>${p}</b>`);return `The ${L.join(' and the ')} limp${L.length>1?'':'s'}${gap(s.limpers[s.limpers.length-1],s.hero)?', and it folds to you':''}. You\u2019re on the <b>${s.hero}</b>. ${you}`;}
    if(s.type==='lp') return N===2?`The <b>BTN</b> completes to 1bb. You're in the <b>BB</b>. ${you}`:`Folds to the <b>SB</b>, who limps. You're in the <b>BB</b>. ${you}`;
    return `The <b>${s.opener}</b> ${isPush()?`shoves ${D}bb`:`opens to ${s.open}bb`}${gap(s.opener,s.hero)?', folds to you':''} on the <b>${s.hero}</b>. ${you}`;
  }
  function actions(s){return actionsFor(s).map(x=>`<button class="act" id="act-${x.a}" data-a="${x.a}">${x.label}<kbd>${x.key}</kbd></button>`).join('');}
  const VERB={fold:'fold',call:'call',limp:'limp',check:'check',raise:'raise','3bet':'3-bet','4bet':'4-bet'};
  function keysHint(s){
    return `Keys: ${actionsFor(s).map(x=>`<kbd>${x.key}</kbd> ${x.a==='raise'&&isPush()?'shove':x.a==='3bet'&&s.type==='sq'?'squeeze':VERB[x.a]}`).join(' · ')} · <kbd>Space</kbd> next hand`;
  }
  function before(s){
    return `<div class="blk"><h3>The spot</h3><p>${spotContext(s)}</p></div>
    <p class="hint">Pick an action to see the answer, why it's right, and the full range chart for this spot.</p>
    <p class="hint">${keysHint(s)}</p>`;
  }
  function after(s,k,pick,right,opts={}){
    const ok=pick===right,h=info(k);
    const head=opts.timeout
      ?`<div class="verdict ${ok?'ok':'no'}"><h2>${ok?'Folded, and right':'Time'}</h2><span class="answerline">The clock ran out, so your hand was folded. Chart: <b>${s.labels[right]}</b> with <b>${k}</b></span></div>`
      :`<div class="verdict ${ok?'ok':'no'}"><h2>${ok?'Correct':'Not quite'}</h2><span class="answerline">You: <b>${s.labels[pick]}</b> · Chart: <b>${s.labels[right]}</b> with <b>${k}</b></span></div>`;
    return `${head}${costLine(opts.loss)}
    <div class="blk"><h3>The play</h3><p>${reason(s,right,h)}</p></div>
    ${pick==='limp'&&right!=='limp'?`<div class="blk"><h3>Why not limp</h3><p>${limpNote(s)}</p></div>`:''}
    <div class="blk"><h3>The hand</h3><p>${trait(h)}</p></div>
    <div class="blk"><h3>The spot</h3><p>${spotContext(s)}</p></div>
    <div class="catline">${catLine(s,h)}</div>
    ${gridHTML(s,k)}`;
  }
  // What the mistake cost. Exact for shove-or-fold spots and all-in calls, estimated elsewhere.
  function costLine(l){
    if(!l)return '';
    const icm=icmOn()&&isPush(),v=fmtBB(l.bb);
    const what=l.bb<0.1?`A close call: this cost ${v}.`:`This mistake cost ${l.exact?'':'about '}<b>${v}</b>${icm?' in chip equivalents':''}.`;
    return `<p class="costline${l.bb>=1?' big':''}">${what} <span>${l.exact?(icm?'ICM solve':'Exact'):'Estimate'}</span></p>`;
  }
  // Keyboard shortcuts shared by both pages. handlers: {answer(a), next(), isAnswered(), spot()}
  function bindKeys(hd){
    document.addEventListener('keydown',e=>{
      if(e.metaKey||e.ctrlKey||e.altKey)return;
      if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
      const k=e.key.toLowerCase(),s=hd.spot();if(!s)return;
      if(!hd.isAnswered()){
        const K=k==='3'?'R':k.toUpperCase(),hit=actionsFor(s).find(x=>x.key===K);
        if(hit)hd.answer(hit.a);
      }else if(k===' '||k==='enter'||k==='n'){
        if(e.target.tagName==='BUTTON'&&!e.target.classList.contains('nextbtn')&&k!=='n')return;
        e.preventDefault();hd.next();
      }
    });
  }
  return {felt,cards,face,prompt,actions,before,after,keysHint,bindKeys,costLine};
})();

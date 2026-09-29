/* Preflop IQ table rendering, shared by the trainer and the daily challenge.
   Returns HTML strings; uses engine globals N and D for the current format. */
const TBL=(function(){
  function felt(s){
    const names=TABLES[N],h=names.indexOf(s.hero),o=s.opener?names.indexOf(s.opener):-1,step=360/N;
    let html='';
    names.forEach((p,i)=>{
      const k=(i-h+N)%N,a=(90+step*k)*Math.PI/180;
      const x=50+46*Math.cos(a),y=50+43*Math.sin(a);
      const st=i===h?'hero':i===o?'open':i<h?'folded':'wait';
      html+=`<div class="seat ${st}" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%"><span class="pos">${p}</span><span class="stk">${st==='hero'?`You · ${D}bb`:st==='folded'?'folded':D+'bb'}</span></div>`;
      let bet=null;
      if(st!=='folded'){if(i===o)bet=isPush()?'All-in':s.open;else if(posted(p))bet=posted(p);}
      if(bet!==null){const cx=50+29*Math.cos(a),cy=50+25*Math.sin(a);html+=`<div class="bet ${i===o?'raise':''}" style="left:${cx.toFixed(2)}%;top:${cy.toFixed(2)}%">${bet}</div>`;}
      if(p==='BTN'){const b=a-(N<=3?0.5:0.34);html+=`<div class="dealer" style="left:${(50+35*Math.cos(b)).toFixed(2)}%;top:${(50+31*Math.sin(b)).toFixed(2)}%">D</div>`;}
    });
    const pot=s.type==='rfi'?2.5:s.pot;
    html+=`<div class="center"><div class="fmt">${N===2?'Heads-up':N+'-max'} · ${D}bb</div><div class="pot">Pot ${pot}bb</div><div class="potnote">incl. 1bb ante</div></div>`;
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
    return s.type==='rfi'
      ? `Folds to you on the <b>${s.hero}</b>. You hold <span class="hk">${k}</span>.`
      : `The <b>${s.opener}</b> ${isPush()?`shoves ${D}bb`:`opens to ${s.open}bb`}${TABLES[N].indexOf(s.hero)-TABLES[N].indexOf(s.opener)>1?', folds to you':''} on the <b>${s.hero}</b>. You hold <span class="hk">${k}</span>.`;
  }
  function actions(s){return actionsFor(s).map(x=>`<button class="act" id="act-${x.a}" data-a="${x.a}">${x.label}<kbd>${x.key}</kbd></button>`).join('');}
  function keysHint(s){return `Keys: <kbd>F</kbd> fold${s.type==='vs'?' · <kbd>C</kbd> call':''}${s.type==='rfi'||!isPush()?` · <kbd>R</kbd> ${s.type==='vs'?'3-bet':isPush()?'shove':'raise'}`:''} · <kbd>Space</kbd> next hand`;}
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
    return `${head}
    <div class="blk"><h3>The play</h3><p>${reason(s,right,h)}</p></div>
    <div class="blk"><h3>The hand</h3><p>${trait(h)}</p></div>
    <div class="blk"><h3>The spot</h3><p>${spotContext(s)}</p></div>
    <div class="catline">${catLine(s,h)}</div>
    ${gridHTML(s,k)}`;
  }
  // Keyboard shortcuts shared by both pages. handlers: {answer(a), next(), isAnswered(), spot()}
  function bindKeys(hd){
    document.addEventListener('keydown',e=>{
      if(e.metaKey||e.ctrlKey||e.altKey)return;
      if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
      const k=e.key.toLowerCase(),s=hd.spot();if(!s)return;
      if(!hd.isAnswered()){
        if(k==='f')hd.answer('fold');else if(k==='c')hd.answer('call');
        else if(k==='r'||k==='3')hd.answer(s.type==='rfi'?'raise':'3bet');
      }else if(k===' '||k==='enter'||k==='n'){
        if(e.target.tagName==='BUTTON'&&!e.target.classList.contains('nextbtn')&&k!=='n')return;
        e.preventDefault();hd.next();
      }
    });
  }
  return {felt,cards,face,prompt,actions,before,after,keysHint,bindKeys};
})();

/* Preflop IQ progress page: rank ladder, day streak, leaks, spot mastery, table themes, share card. */
(function(){
  const $=id=>document.getElementById(id);
  const esc=t=>String(t).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  let stats=PL.load();

  /* ---------- rank ---------- */
  function rankHTML(){
    const r=PL.rank(stats),iqNow=PL.iq(stats);
    const ladder=PL.RANKS.map((x,i)=>`<li class="${i<r.i?'past':i===r.i?'now':''}"><span class="rung"></span><span class="rname">${x.name}</span><span class="rreq">${i===0?'Start':`${x.hands.toLocaleString()} hands · IQ ${x.iq}`}</span></li>`).join('');
    const next=r.next?`<div class="rnext"><h3>Next: ${r.next.name}</h3>
      <div class="rbar"><span>Hands</span><div class="bar"><span style="width:${(r.handsPct*100).toFixed(1)}%"></span></div><b>${stats.total.toLocaleString()} / ${r.next.hands.toLocaleString()}</b></div>
      <div class="rbar"><span>Best IQ</span><div class="bar"><span style="width:${(r.iqPct*100).toFixed(1)}%"></span></div><b>${stats.iqBest||'—'} / ${r.next.iq}</b></div>
      <p class="hint">Best IQ counts once you've played 20 hands. Your rank never drops.</p></div>`:'<div class="rnext"><h3>Top of the ladder.</h3><p>Nothing left to climb. Keep the score where it is.</p></div>';
    return `<div class="rankcard"><div><span class="eyebrow">Your rank</span><h2 class="rankname">${r.cur.name}</h2><p>${r.cur.blurb}</p>
      <p class="hint">Preflop IQ now: <b>${iqNow===null?'—':iqNow}</b>${iqNow!==null?` (${PL.tier(iqNow)})`:''}</p>${next}</div>
      <ol class="ladder">${ladder}</ol></div>`;
  }

  /* ---------- streak calendar ---------- */
  function streakHTML(){
    const st=PL.streak(stats),today=PL.dateKey(),frozen=new Set(st.frozen);
    // five weeks, Monday first, ending with this week
    const d=new Date();const start=new Date(d.getFullYear(),d.getMonth(),d.getDate()-((d.getDay()+6)%7)-28);
    let cells='';
    for(let i=0;i<35;i++){
      const k=PL.dateKey(new Date(start.getFullYear(),start.getMonth(),start.getDate()+i)),n=(stats.play||{})[k]||0;
      const cls=k>today?'future':n>=PL.DAY_GOAL?'done':frozen.has(k)?'frozen':n>0?'part':'';
      cells+=`<span class="cal ${cls}${k===today?' today':''}" title="${k}: ${k>today?'':frozen.has(k)?'covered by a freeze':`${n} hand${n===1?'':'s'}`}"></span>`;
    }
    return `<div class="streakcard"><div class="streakbig"><b>${st.days}</b><span>day streak</span></div>
      <div class="streakinfo"><p>${st.doneToday?'Today counts. See you tomorrow.':`<b>${st.today} of ${st.goal}</b> hands today to keep it going. <a href="/daily/">The daily challenge</a> covers it in one go.`}</p>
      <p class="hint">${st.freezeLeft?'Freeze ready: miss one day this week and your streak holds.':'This week’s freeze is used. Don’t miss another day before Monday.'} Best ever: ${Math.max(ACH.ensure(stats).c.dayBest||0,st.days)} days.</p></div>
      <div class="calgrid" aria-label="Last five weeks">${['M','T','W','T','F','S','S'].map(x=>`<span class="calh">${x}</span>`).join('')}${cells}</div>
      <div class="callegend"><span><i class="cal done"></i>Streak day</span><span><i class="cal frozen"></i>Freeze</span><span><i class="cal part"></i>Some hands</span></div></div>`;
  }

  /* ---------- leaks ---------- */
  function leaksHTML(){
    const L=PL.leaks(stats,3);
    if(!L.length){
      const n=stats.total;
      return `<p>${n<20?`Play ${20-n} more hand${20-n===1?'':'s'} and your leaks will show up here.`:'No leaks worth drilling right now. Every spot you’ve played enough is above 85%.'}</p>`;
    }
    return `<ol class="leaks">${L.map(x=>`<li><div><b>${x.name}</b><span>${x.format}</span></div>
      <div class="leakacc"><div class="bar"><span class="low" style="width:${Math.round(x.acc*100)}%"></span></div><b>${Math.round(x.acc*100)}%</b><span>${x.n-x.c} missed of ${x.n}</span></div>
      <a class="btn" href="/?drill=${encodeURIComponent(x.key)}">Drill it</a></li>`).join('')}</ol>`;
  }

  /* ---------- mastery map ---------- */
  function masteryHTML(){
    const saveN=N,saveD=D,sizes=[2,3,4,5,6,7,8,9];let totals={gold:0,silver:0,bronze:0,spots:0};
    const head=`<tr><th></th>${DEPTHS.map(d=>`<th>${d}bb</th>`).join('')}</tr>`;
    const rows=sizes.map(n=>`<tr><th>${n===2?'HU':n+'-max'}</th>${DEPTHS.map(d=>{
      N=n;D=d;buildScenarios();
      const m={gold:0,silver:0,bronze:0};let played=0;
      SCN.forEach(s=>{const p=stats.per[`${n}-${d}-${s.id}`];if(p&&p.n)played++;const md=PL.medal(p);if(md)m[md]++;});
      totals.spots+=SCN.length;Object.keys(m).forEach(k=>totals[k]+=m[k]);
      const got=m.gold+m.silver+m.bronze,best=m.gold?'gold':m.silver?'silver':m.bronze?'bronze':played?'played':'';
      return `<td><a class="mcell ${best}" href="/?fmt=${n}-${d}" title="${PL.formatName(n,d)}: ${m.gold} gold, ${m.silver} silver, ${m.bronze} bronze of ${SCN.length} spots">${got?`${got}<small>/${SCN.length}</small>`:played?'·':''}</a></td>`;}).join('')}</tr>`).join('');
    N=saveN;D=saveD;buildScenarios();
    return `<p class="mtotals"><span class="medal medal-gold">Gold</span> ${totals.gold} <span class="medal medal-silver">Silver</span> ${totals.silver} <span class="medal medal-bronze">Bronze</span> ${totals.bronze} <span class="hint">of ${totals.spots} spots</span></p>
      <div class="tablewrap"><table class="mastery">${head}${rows}</table></div>
      <p class="hint">Bronze: 70% over 10 hands. Silver: 80% over 25. Gold: 90% over 50. Tap a format to train it.</p>`;
  }

  /* ---------- themes ---------- */
  function themesHTML(){
    return `<div class="themes">${FX.THEMES.map(t=>{const open=t.unlock(stats),sel=PL.settings.theme===t.id&&open;
      return `<button class="theme${sel?' sel':''}" data-theme="${t.id}" ${open?'':'disabled'} aria-pressed="${sel}">
        <span class="swatch" style="--sw-felt:${t.felt};--sw-rail:${t.rail}"></span><b>${t.name}</b><span>${open?(sel?'In use':'Use this table'):t.how}</span></button>`;}).join('')}</div>`;
  }

  /* ---------- share card ---------- */
  function drawCard(){
    const cv=$('card-canvas'),c=cv.getContext&&cv.getContext('2d'),W=1200,H=630;
    if(!c)return;
    const r=PL.rank(stats),v=PL.iq(stats),st=PL.streak(stats),m=ACH.summary(stats);
    const theme=FX.THEMES.find(t=>t.id===document.documentElement.dataset.felt)||FX.THEMES[0];
    const g=c.createRadialGradient(W*0.45,H*0.4,40,W*0.5,H*0.5,W*0.75);g.addColorStop(0,shade(theme.felt,28));g.addColorStop(1,shade(theme.felt,-22));
    c.fillStyle=theme.rail;c.fillRect(0,0,W,H);c.fillStyle=g;roundRect(c,18,18,W-36,H-36,34);c.fill();
    c.fillStyle='rgba(255,255,255,.08)';roundRect(c,18,18,W-36,H-36,34);c.lineWidth=2;c.strokeStyle='rgba(255,255,255,.12)';c.stroke();
    const disp='"Barlow Condensed","Arial Narrow",sans-serif',mono='"IBM Plex Mono",ui-monospace,monospace';
    c.fillStyle='#eaf3ef';c.font=`700 40px ${disp}`;c.fillText('PREFLOP',70,100);const w=c.measureText('PREFLOP ').width;c.fillStyle='#e2b13b';c.fillText('IQ',70+w,100);
    c.fillStyle='rgba(234,243,239,.7)';c.font=`600 26px ${disp}`;c.fillText('RANK',70,190);
    c.fillStyle='#ffffff';c.font=`700 92px ${disp}`;c.fillText(r.cur.name.toUpperCase(),66,272);
    c.fillStyle='rgba(234,243,239,.7)';c.font=`600 26px ${disp}`;c.fillText('PREFLOP IQ',70,350);
    c.fillStyle='#ffffff';c.font=`700 120px ${disp}`;const iqText=v===null?'—':String(v);c.fillText(iqText,66,460);
    const iqW=c.measureText(iqText).width;
    if(v!==null){c.fillStyle='#e2b13b';c.font=`700 40px ${disp}`;c.fillText(PL.tier(v).toUpperCase(),66+iqW+22,452);}
    const items=[['HANDS',stats.total.toLocaleString()],['ACCURACY',stats.total?Math.round(stats.correct/stats.total*100)+'%':'—'],['DAY STREAK',String(st.days)],['ACHIEVEMENTS',`${m.earned}/${m.total}`]];
    items.forEach(([l,val],i)=>{const x=70+i*190;c.fillStyle='rgba(234,243,239,.65)';c.font=`600 20px ${disp}`;c.fillText(l,x,540);c.fillStyle='#ffffff';c.font=`600 34px ${mono}`;c.fillText(val,x,578);});
    // chip stack
    const chips=[['#1b1f23','#e2b13b'],['#1f7a4d','#f7f4ee'],['#c23a2e','#f7f4ee'],['#f1eee6','#2a61a5']];
    chips.forEach((cc,i)=>drawChip(c,980,420-i*34,96,cc[0],cc[1]));
    c.fillStyle='rgba(234,243,239,.6)';c.font=`500 22px ${mono}`;c.textAlign='right';c.fillText(location.host,W-70,100);c.textAlign='left';
  }
  function drawChip(c,x,y,rad,col,edge){
    c.save();c.translate(x,y);c.scale(1,0.34);
    c.fillStyle='rgba(0,0,0,.35)';c.beginPath();c.arc(0,34,rad,0,Math.PI*2);c.fill();
    for(let i=0;i<16;i++){c.fillStyle=i%2?edge:col;c.beginPath();c.moveTo(0,0);c.arc(0,0,rad,i*Math.PI/8,(i+1)*Math.PI/8);c.fill();}
    c.fillStyle=col;c.beginPath();c.arc(0,0,rad*0.72,0,Math.PI*2);c.fill();
    c.strokeStyle=edge;c.lineWidth=5;c.beginPath();c.arc(0,0,rad*0.62,0,Math.PI*2);c.stroke();
    c.restore();
  }
  function roundRect(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
  function shade(hex,pct){const n=parseInt(hex.slice(1),16);const f=v=>Math.max(0,Math.min(255,Math.round(v+(pct/100)*255)));return `rgb(${f(n>>16)},${f(n>>8&255)},${f(n&255)})`;}
  function cardBlob(){return new Promise(res=>$('card-canvas').toBlob(res,'image/png'));}

  /* ---------- page ---------- */
  function render(){
    $('p-rank').innerHTML=rankHTML();
    $('p-streak').innerHTML=streakHTML();
    $('p-leaks').innerHTML=leaksHTML();
    $('p-mastery').innerHTML=masteryHTML();
    $('p-themes').innerHTML=themesHTML();
    const m=ACH.summary(stats);$('p-trophy').innerHTML=`<b>${m.earned}</b> of ${m.total} achievements · ${m.chips.toLocaleString()} chips`;
    (document.fonts?document.fonts.ready:Promise.resolve()).then(drawCard);
  }
  $('p-themes').addEventListener('click',e=>{const b=e.target.closest('.theme');if(!b||b.disabled)return;PL.setSetting('theme',b.dataset.theme);FX.applyTheme(stats);render();});
  $('card-download').addEventListener('click',async()=>{const b=await cardBlob();const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='preflop-iq.png';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);});
  const shareBtn=$('card-share');
  if(navigator.canShare&&navigator.canShare({files:[new File([''],'x.png',{type:'image/png'})]})){
    shareBtn.hidden=false;
    shareBtn.addEventListener('click',async()=>{const b=await cardBlob();navigator.share({files:[new File([b],'preflop-iq.png',{type:'image/png'})],text:`My Preflop IQ: ${location.origin}`}).catch(()=>{});});
  }
  FX.applyTheme(stats);render();
  PL.withRemote(stats).then(s=>{stats=s;FX.applyTheme(stats);render();});
})();

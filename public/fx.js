/* Preflop IQ sound effects and table themes. Sounds are synthesized (no audio files) and off by
   default; they start only after the player turns them on. Themes recolor the felt and rail. */
const FX=(function(){
  let ctx=null;
  function ac(){
    if(!PL.settings.sound)return null;
    try{ctx=ctx||new (window.AudioContext||window.webkitAudioContext)();if(ctx.state==='suspended')ctx.resume();}catch(e){return null;}
    return ctx;
  }
  function noise(c,t,dur,freq,vol){
    const len=Math.floor(c.sampleRate*dur),buf=c.createBuffer(1,len,c.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2);
    const src=c.createBufferSource();src.buffer=buf;
    const f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=freq;f.Q.value=0.9;
    const g=c.createGain();g.gain.value=vol;
    src.connect(f).connect(g).connect(c.destination);src.start(t);
  }
  function tone(c,t,freq,dur,vol,type='sine'){
    const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);
    g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g).connect(c.destination);o.start(t);o.stop(t+dur+0.02);
  }
  const SOUNDS={
    deal(c,t){noise(c,t,0.07,3200,0.22);noise(c,t+0.09,0.07,3000,0.2);},
    right(c,t){tone(c,t,2100,0.05,0.09,'triangle');tone(c,t+0.045,2700,0.06,0.07,'triangle');noise(c,t,0.03,5000,0.12);},
    wrong(c,t){tone(c,t,196,0.22,0.09,'sine');tone(c,t+0.02,147,0.28,0.06,'sine');},
    tick(c,t){tone(c,t,1400,0.03,0.05,'square');},
    unlock(c,t){[0,0.07,0.14].forEach((d,i)=>tone(c,t+d,[1320,1760,2640][i],0.12,0.06,'triangle'));}
  };
  function play(name){const c=ac();if(!c)return;try{SOUNDS[name](c,c.currentTime+0.01);}catch(e){}}

  // ---------- table themes ----------
  const THEMES=[
    {id:'classic',name:'Classic green',felt:'#1d5946',rail:'#3b2c23',unlock:()=>true,how:'Always available'},
    {id:'midnight',name:'Midnight',felt:'#173a5e',rail:'#20242c',unlock:s=>PL.rank(s).i>=1,how:'Reach Local Card Room'},
    {id:'burgundy',name:'Card room burgundy',felt:'#5a1f2a',rail:'#2b1a14',unlock:s=>window.ACH&&ACH.summary(s).earned>=10,how:'Earn 10 achievements'},
    {id:'highroller',name:'High roller',felt:'#1a1c1f',rail:'#8a6a2a',unlock:s=>PL.rank(s).i>=4||!!(window.PIQ&&PIQ.state.isPro),how:'Reach Main Event, or go Pro'}
  ];
  function applyTheme(s){
    const t=THEMES.find(x=>x.id===PL.settings.theme);
    const ok=t&&(!s||t.unlock(s));
    document.documentElement.dataset.felt=ok?t.id:'classic';
  }
  applyTheme();
  return {play,THEMES,applyTheme};
})();

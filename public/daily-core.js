/* Preflop IQ daily challenge generator. Deterministic: the same date always produces the same
   10 hands, for every player and on the server (which re-scores leaderboard entries).
   Depends on engine.js globals (N, D, buildScenarios, SCN, HANDS) and never touches the DOM. */
const DAILY=(function(){
  const EPOCH=[2026,8,29];          // #1 is 29 Sep 2026 (months are 0-based)
  const COUNT=10;
  const PLAYERS=[9,8,8,8,7,6,6,5,4,3,2];
  const STACKS=[100,100,60,40,25,25,15,15,10,10];

  // xmur3 string hash -> mulberry32 generator
  function seedFrom(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19;}
    return function(){h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);return (h^=h>>>16)>>>0;};}
  function rng(str){let a=seedFrom(str)();return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
  const pick=(r,arr)=>arr[Math.floor(r()*arr.length)];

  const pad=n=>String(n).padStart(2,'0');
  function today(){const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;}
  function valid(day){return /^\d{4}-\d{2}-\d{2}$/.test(day)&&number(day)>=1;}
  function number(day){const [y,m,d]=day.split('-').map(Number);return Math.round((Date.UTC(y,m-1,d)-Date.UTC(...EPOCH))/86400000)+1;}

  // Returns {day, number, hands:[{n,d,spot,hand}]}. Leaves N and D as they were.
  function forDay(day){
    const r=rng('preflopiq-daily-'+day),saveN=N,saveD=D,saveS=STAGE,saveP=PROFILE,hands=[],seen=new Set();STAGE='cev';PROFILE='bal';
    for(let i=0;hands.length<COUNT&&i<200;i++){
      N=pick(r,PLAYERS);D=pick(r,STACKS);buildScenarios();
      const s=pick(r,SCN.filter(x=>!x.pro));   // the daily sticks to opens and facing a raise
      const pool=r()<0.75&&s.border.length<HANDS.length?s.border:HANDS;
      const hand=pick(r,pool),key=`${N}-${D}-${s.id}-${hand}`;
      if(seen.has(key))continue;
      seen.add(key);hands.push({n:N,d:D,spot:s.id,hand});
    }
    N=saveN;D=saveD;STAGE=saveS;PROFILE=saveP;buildScenarios();
    return {day,number:number(day),hands};
  }
  // The chart's answer for one daily hand. Leaves N and D set to that hand's format.
  function load(h){N=h.n;D=h.d;STAGE='cev';PROFILE='bal';buildScenarios();const s=SCN.find(x=>x.id===h.spot);return {s,right:actionOf(s,h.hand)};}
  // Scores a list of picks against the day's chart answers.
  function score(day,picks){
    const saveN=N,saveD=D,saveS=STAGE,saveP=PROFILE,set=forDay(day);
    const marks=set.hands.map((h,i)=>{const {right}=load(h);return picks[i]===right?1:0;});
    N=saveN;D=saveD;STAGE=saveS;PROFILE=saveP;buildScenarios();
    return {score:marks.reduce((a,b)=>a+b,0),marks};
  }
  return {COUNT,today,number,valid,forDay,load,score,rng};
})();

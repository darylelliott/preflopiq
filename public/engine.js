/* Preflop IQ engine: hand data, range model, Nash solutions, scenarios and explanations.
   Shared by every page. No DOM access here except inside the HTML-string helpers. */
const R='23456789TJQKA';
const NAME={A:'ace',K:'king',Q:'queen',J:'jack',T:'ten',9:'nine',8:'eight',7:'seven',6:'six',5:'five',4:'four',3:'three',2:'deuce'};
const PLUR={A:'aces',K:'kings',Q:'queens',J:'jacks',T:'tens',9:'nines',8:'eights',7:'sevens',6:'sixes',5:'fives',4:'fours',3:'threes',2:'deuces'};
const ri=c=>R.indexOf(c);
const hk=(hi,lo,s)=>hi===lo?R[hi]+R[hi]:R[hi]+R[lo]+(s?'s':'o');
const combos=k=>k.length===2?6:(k[2]==='s'?4:12);
function info(k){const hi=ri(k[0]),lo=ri(k[1]);return{k,hi,lo,pair:hi===lo,s:k[2]==='s'}}

/* 169 hands in chart order (row = first card, suited above the diagonal) */
const HANDS=[];
for(let a=0;a<13;a++)for(let b=0;b<13;b++){const ra=12-a,rb=12-b;HANDS.push(a===b?hk(ra,ra):a<b?hk(ra,rb,true):hk(rb,ra,false));}
/* all-in equity vs a random hand, 100k-trial Monte Carlo, same order as HANDS */
const EQA=[85.2,67.1,66.2,65.4,64.6,62.7,61.9,61,59.9,60,59,58.1,57.4,65.3,82.4,63.4,62.6,61.7,60,58.3,57.5,56.7,55.8,54.9,54.1,53.2,64.4,61.5,80,60.2,59.5,57.6,56,54.3,53.6,52.8,51.9,51,50.2,63.6,60.6,58.1,77.5,57.6,55.7,54,52.3,50.7,49.9,49.1,48.2,47.3,62.8,59.7,57.2,55.3,75,54,52.3,50.6,48.9,47.3,46.5,45.7,44.8,60.8,57.8,55.3,53.2,51.5,72.1,50.8,49.1,47.5,45.7,43.9,43.2,42.4,59.8,56,53.6,51.5,49.7,48.1,69.1,47.9,46.3,44.6,42.7,40.8,40.3,58.9,55.1,51.7,49.7,47.9,46.3,45.1,66.2,45.3,43.7,41.9,40,38.2,57.7,54.3,51,47.8,46.1,44.5,43.2,42.3,63.3,43.1,41.4,39.5,37.7,57.7,53.3,50.1,47.2,44.2,42.6,41.4,40.6,40,60.3,41.4,39.7,37.8,56.8,52.4,49.1,46.2,43.5,40.7,39.5,38.6,38,38.2,57,38.6,36.8,55.8,51.4,48.2,45.3,42.6,40,37.5,36.6,36.1,36.2,35.2,53.7,36,54.9,50.5,47.2,44.3,41.7,39.1,36.9,34.6,34.1,34.3,33.2,32.3,50.3];
const EQ={};HANDS.forEach((k,i)=>EQ[k]=EQA[i]);
/* Chip-EV Nash push/fold solutions (10bb and 15bb, 2-9 players, 1bb BB ante), solved offline
   from a 169x169 hand-vs-hand equity matrix. Key "players-stack"; s = shove range per seat,
   c["shover-caller"] = calling range. Each range is 169 bits in chart order, hex-packed. */
const NASH={"2-10":{"s":["fffffffffffffffffffdff9ff7fffe1ef30b3047001"],"c":{"0-1":"ffffffffffff7ff1ef3cf38740701e04c1093043001"}},"3-10":{"s":["fffffffff9f70ff1ef3c0781c130360c40090041001","fffffffffffffffffffdff9ff7fffe1ef30b3047001"],"c":{"0-1":"ffffffcf08f10f10640c01804010120440090041001","0-2":"ffffffff38f30f70ec0c01814030120440090041001","1-2":"ffffffffffff7ff1ef3cf38740701e04c1093043001"}},"4-10":{"s":["fffff7cf18f30f706c140380c010120440090041001","fffffffff9f70ff1ef3c0781c130360c40090041001","fffffffffffffffffffdff9ff7fffe1ef30b3047001"],"c":{"0-1":"ffff70c708500310240401804010120440010040001","0-2":"ffff70c708f00310240401804010120440090041001","0-3":"fffff3cf08f10730640401804010120440090041001","1-2":"ffffffcf08f10f10640c01804010120440090041001","1-3":"ffffffff38f30f70ec0c01814030120440090041001","2-3":"ffffffffffff7ff1ef3cf38740701e04c1093043001"}},"5-10":{"s":["fffff0cf08f10b702c0401804010120440090041001","fffff7cf18f30f706c140380c010120440090041001","fffffffff9f70ff1ef3c0781c130360c40090041001","fffffffffffffffffffdff9ff7fffe1ef30b3047001"],"c":{"0-1":"fffe30c308500110240401804000100400010040001","0-2":"fffe30c308500110240401804000100400010040001","0-3":"ffff30c708500110240401804010120400010040001","0-4":"fffff0cf08f00330240401804010120440090040001","1-2":"ffff70c708500310240401804010120440010040001","1-3":"ffff70c708f00310240401804010120440090041001","1-4":"fffff3cf08f10730640401804010120440090041001","2-3":"ffffffcf08f10f10640c01804010120440090041001","2-4":"ffffffff38f30f70ec0c01814030120440090041001","3-4":"ffffffffffff7ff1ef3cf38740701e04c1093043001"}},"6-10":{"s":["ffff70cf08d10130240401804010120400010040001","fffff0cf08f10b702c0401804010120440090041001","fffff7cf18f30f706c140380c010120440090041001","fffffffff9f70ff1ef3c0781c130360c40090041001","fffffffffffffffffffdff9ff7fffe1ef30b3047001"],"c":{"0-1":"ff0e10c108400110240401004000100400010040000","0-2":"ff0e10c108400110240401004000100400010040000","0-3":"ff0e10c108400110240401004000100400010040000","0-4":"ff3e30c108400110240401804000100400010040001","0-5":"ffff30c708d00110240401804010100400010040001","1-2":"fffe30c308500110240401804000100400010040001","1-3":"fffe30c308500110240401804000100400010040001","1-4":"ffff30c708500110240401804010120400010040001","1-5":"fffff0cf08f00330240401804010120440090040001","2-3":"ffff70c708500310240401804010120440010040001","2-4":"ffff70c708f00310240401804010120440090041001","2-5":"fffff3cf08f10730640401804010120440090041001","3-4":"ffffffcf08f10f10640c01804010120440090041001","3-5":"ffffffff38f30f70ec0c01814030120440090041001","4-5":"ffffffffffff7ff1ef3cf38740701e04c1093043001"}},"7-10":{"s":["fffe30c708d00110240401004000100400010040001","ffff70cf08d10130240401804010120400010040001","fffff0cf08f10b702c0401804010120440090041001","fffff7cf18f30f706c140380c010120440090041001","fffffffff9f70ff1ef3c0781c130360c40090041001","fffffffffffffffffffdff9ff7fffe1ef30b3047001"],"c":{"0-1":"ff0e004108400110240001004000100400010040000","0-2":"ff0e004108400110240001004000100400010040000","0-3":"ff0e004108400110240001004000100400010040000","0-4":"ff0e004108400110240001004000100400010040000","0-5":"ff2e10c108400110240401004000100400010040000","0-6":"fffe30c708c00110240401804000100400010040001","1-2":"ff0e10c108400110240401004000100400010040000","1-3":"ff0e10c108400110240401004000100400010040000","1-4":"ff0e10c108400110240401004000100400010040000","1-5":"ff3e30c108400110240401804000100400010040001","1-6":"ffff30c708d00110240401804010100400010040001","2-3":"fffe30c308500110240401804000100400010040001","2-4":"fffe30c308500110240401804000100400010040001","2-5":"ffff30c708500110240401804010120400010040001","2-6":"fffff0cf08f00330240401804010120440090040001","3-4":"ffff70c708500310240401804010120440010040001","3-5":"ffff70c708f00310240401804010120440090041001","3-6":"fffff3cf08f10730640401804010120440090041001","4-5":"ffffffcf08f10f10640c01804010120440090041001","4-6":"ffffffff38f30f70ec0c01814030120440090041001","5-6":"ffffffffffff7ff1ef3cf38740701e04c1093043001"}},"8-10":{"s":["ff3e30c708c00110240001004000100400010040000","fffe30c708d00110240401004000100400010040001","ffff70cf08d10130240401804010120400010040001","fffff0cf08f10b702c0401804010120440090041001","fffff7cf18f30f706c140380c010120440090041001","fffffffff9f70ff1ef3c0781c130360c40090041001","fffffffffffffffffffdff9ff7fffe1ef30b3047001"],"c":{"0-1":"f70e004108400110240001004000100400010000000","0-2":"f70e004108400110240001004000100400010000000","0-3":"f70e004108400110240001004000100400010000000","0-4":"f70e004108400110240001004000100400010000000","0-5":"f70e004108400110240001004000100400010000000","0-6":"f70e104108400110240001004000100400010040000","0-7":"ff3e30c708c00110240401004000100400010040001","1-2":"ff0e004108400110240001004000100400010040000","1-3":"ff0e004108400110240001004000100400010040000","1-4":"ff0e004108400110240001004000100400010040000","1-5":"ff0e004108400110240001004000100400010040000","1-6":"ff2e10c108400110240401004000100400010040000","1-7":"fffe30c708c00110240401804000100400010040001","2-3":"ff0e10c108400110240401004000100400010040000","2-4":"ff0e10c108400110240401004000100400010040000","2-5":"ff0e10c108400110240401004000100400010040000","2-6":"ff3e30c108400110240401804000100400010040001","2-7":"ffff30c708d00110240401804010100400010040001","3-4":"fffe30c308500110240401804000100400010040001","3-5":"fffe30c308500110240401804000100400010040001","3-6":"ffff30c708500110240401804010120400010040001","3-7":"fffff0cf08f00330240401804010120440090040001","4-5":"ffff70c708500310240401804010120440010040001","4-6":"ffff70c708f00310240401804010120440090041001","4-7":"fffff3cf08f10730640401804010120440090041001","5-6":"ffffffcf08f10f10640c01804010120440090041001","5-7":"ffffffff38f30f70ec0c01814030120440090041001","6-7":"ffffffffffff7ff1ef3cf38740701e04c1093043001"}},"9-10":{"s":["ff0e30c708400110240001004000100400010040000","ff3e30c708c00110240001004000100400010040000","fffe30c708d00110240401004000100400010040001","ffff70cf08d10130240401804010120400010040001","fffff0cf08f10b702c0401804010120440090041001","fffff7cf18f30f706c140380c010120440090041001","fffffffff9f70ff1ef3c0781c130360c40090041001","fffffffffffffffffffdff9ff7fffe1ef30b3047001"],"c":{"0-1":"f30e004108400110040001004000100400010000000","0-2":"f30e004108400110040001004000100400010000000","0-3":"f30e004108400110040001004000100400010000000","0-4":"f30e004108400110040001004000100400010000000","0-5":"f30e004108400110040001004000100400010000000","0-6":"f30e004108400110040001004000100400010000000","0-7":"f70e004108400110240001004000100400010000000","0-8":"ff2e30c308400110240001004000100400010040000","1-2":"f70e004108400110240001004000100400010000000","1-3":"f70e004108400110240001004000100400010000000","1-4":"f70e004108400110240001004000100400010000000","1-5":"f70e004108400110240001004000100400010000000","1-6":"f70e004108400110240001004000100400010000000","1-7":"f70e104108400110240001004000100400010040000","1-8":"ff3e30c708c00110240401004000100400010040001","2-3":"ff0e004108400110240001004000100400010040000","2-4":"ff0e004108400110240001004000100400010040000","2-5":"ff0e004108400110240001004000100400010040000","2-6":"ff0e004108400110240001004000100400010040000","2-7":"ff2e10c108400110240401004000100400010040000","2-8":"fffe30c708c00110240401804000100400010040001","3-4":"ff0e10c108400110240401004000100400010040000","3-5":"ff0e10c108400110240401004000100400010040000","3-6":"ff0e10c108400110240401004000100400010040000","3-7":"ff3e30c108400110240401804000100400010040001","3-8":"ffff30c708d00110240401804010100400010040001","4-5":"fffe30c308500110240401804000100400010040001","4-6":"fffe30c308500110240401804000100400010040001","4-7":"ffff30c708500110240401804010120400010040001","4-8":"fffff0cf08f00330240401804010120440090040001","5-6":"ffff70c708500310240401804010120440010040001","5-7":"ffff70c708f00310240401804010120440090041001","5-8":"fffff3cf08f10730640401804010120440090041001","6-7":"ffffffcf08f10f10640c01804010120440090041001","6-8":"ffffffff38f30f70ec0c01814030120440090041001","7-8":"ffffffffffff7ff1ef3cf38740701e04c1093043001"}},"2-15":{"s":["ffffffffffffffffef7cff9ff37cfe0cd10b1043001"],"c":{"0-1":"fffffffff8f70f70e50c118140301604c0091041001"}},"3-15":{"s":["ffffffcf38f70ff06e340780c010320440090041001","ffffffffffffffffef7cff9ff37cfe0cd10b1043001"],"c":{"0-1":"ffff70c708500310240401804010120440010040001","0-2":"fffff0c708f00310240401804010120440090041001","1-2":"fffffffff8f70f70e50c118140301604c0091041001"}},"4-15":{"s":["fffff1cf18f30f702c0403804010120440010040001","ffffffcf38f70ff06e340780c010320440090041001","ffffffffffffffffef7cff9ff37cfe0cd10b1043001"],"c":{"0-1":"ff3e30c108400110240401004000100400010040000","0-2":"ff7e30c308500110240401804000100400010040000","0-3":"ffff30c308500110240401804000100400010040001","1-2":"ffff70c708500310240401804010120440010040001","1-3":"fffff0c708f00310240401804010120440090041001","2-3":"fffffffff8f70f70e50c118140301604c0091041001"}},"5-15":{"s":["fffff0cf08f10b702c0401004000100400010040001","fffff1cf18f30f702c0403804010120440010040001","ffffffcf38f70ff06e340780c010320440090041001","ffffffffffffffffef7cff9ff37cfe0cd10b1043001"],"c":{"0-1":"f70e004108400110240001004000100400010000000","0-2":"f70e004108400110240001004000100400010000000","0-3":"f70e10c108400110240001004000100400010000000","0-4":"ff2e10c108400110240001004000100400010040000","1-2":"ff3e30c108400110240401004000100400010040000","1-3":"ff7e30c308500110240401804000100400010040000","1-4":"ffff30c308500110240401804000100400010040001","2-3":"ffff70c708500310240401804010120440010040001","2-4":"fffff0c708f00310240401804010120440090041001","3-4":"fffffffff8f70f70e50c118140301604c0091041001"}},"6-15":{"s":["ff2e70cf08d10130240001004000100400010040000","fffff0cf08f10b702c0401004000100400010040001","fffff1cf18f30f702c0403804010120440010040001","ffffffcf38f70ff06e340780c010320440090041001","ffffffffffffffffef7cff9ff37cfe0cd10b1043001"],"c":{"0-1":"f106004108400110040001004000100400000000000","0-2":"f106004108400110040001004000100400000000000","0-3":"f106004108400110040001004000100400000000000","0-4":"f30e004108400110040001004000100400000000000","0-5":"f30e004108400110040001004000100400000000000","1-2":"f70e004108400110240001004000100400010000000","1-3":"f70e004108400110240001004000100400010000000","1-4":"f70e10c108400110240001004000100400010000000","1-5":"ff2e10c108400110240001004000100400010040000","2-3":"ff3e30c108400110240401004000100400010040000","2-4":"ff7e30c308500110240401804000100400010040000","2-5":"ffff30c308500110240401804000100400010040001","3-4":"ffff70c708500310240401804010120440010040001","3-5":"fffff0c708f00310240401804010120440090041001","4-5":"fffffffff8f70f70e50c118140301604c0091041001"}},"7-15":{"s":["f70e30c708c00110040001004000100400010000000","ff2e70cf08d10130240001004000100400010040000","fffff0cf08f10b702c0401004000100400010040001","fffff1cf18f30f702c0403804010120440010040001","ffffffcf38f70ff06e340780c010320440090041001","ffffffffffffffffef7cff9ff37cfe0cd10b1043001"],"c":{"0-1":"f106004108400010040001004000100000000000000","0-2":"f106004108400010040001004000100000000000000","0-3":"f106004108400010040001004000100000000000000","0-4":"f106004108400010040001004000100000000000000","0-5":"f106004108400010040001004000100000000000000","0-6":"f10e004108400110040001004000100400000000000","1-2":"f106004108400110040001004000100400000000000","1-3":"f106004108400110040001004000100400000000000","1-4":"f106004108400110040001004000100400000000000","1-5":"f30e004108400110040001004000100400000000000","1-6":"f30e004108400110040001004000100400000000000","2-3":"f70e004108400110240001004000100400010000000","2-4":"f70e004108400110240001004000100400010000000","2-5":"f70e10c108400110240001004000100400010000000","2-6":"ff2e10c108400110240001004000100400010040000","3-4":"ff3e30c108400110240401004000100400010040000","3-5":"ff7e30c308500110240401804000100400010040000","3-6":"ffff30c308500110240401804000100400010040001","4-5":"ffff70c708500310240401804010120440010040001","4-6":"fffff0c708f00310240401804010120440090041001","5-6":"fffffffff8f70f70e50c118140301604c0091041001"}},"8-15":{"s":["f30e304108400110040001004000100400000000000","f70e30c708c00110040001004000100400010000000","ff2e70cf08d10130240001004000100400010040000","fffff0cf08f10b702c0401004000100400010040001","fffff1cf18f30f702c0403804010120440010040001","ffffffcf38f70ff06e340780c010320440090041001","ffffffffffffffffef7cff9ff37cfe0cd10b1043001"],"c":{"0-1":"f006004108400010040001004000000000000000000","0-2":"f006004108400010040001004000000000000000000","0-3":"f006004108400010040001004000000000000000000","0-4":"f006004108400010040001004000000000000000000","0-5":"f006004108400010040001004000000000000000000","0-6":"f006004108400010040001004000000000000000000","0-7":"f106004108400010040001004000100000000000000","1-2":"f106004108400010040001004000100000000000000","1-3":"f106004108400010040001004000100000000000000","1-4":"f106004108400010040001004000100000000000000","1-5":"f106004108400010040001004000100000000000000","1-6":"f106004108400010040001004000100000000000000","1-7":"f10e004108400110040001004000100400000000000","2-3":"f106004108400110040001004000100400000000000","2-4":"f106004108400110040001004000100400000000000","2-5":"f106004108400110040001004000100400000000000","2-6":"f30e004108400110040001004000100400000000000","2-7":"f30e004108400110040001004000100400000000000","3-4":"f70e004108400110240001004000100400010000000","3-5":"f70e004108400110240001004000100400010000000","3-6":"f70e10c108400110240001004000100400010000000","3-7":"ff2e10c108400110240001004000100400010040000","4-5":"ff3e30c108400110240401004000100400010040000","4-6":"ff7e30c308500110240401804000100400010040000","4-7":"ffff30c308500110240401804000100400010040001","5-6":"ffff70c708500310240401804010120440010040001","5-7":"fffff0c708f00310240401804010120440090041001","6-7":"fffffffff8f70f70e50c118140301604c0091041001"}},"9-15":{"s":["f10e104108400010040001004000100000000000000","f30e304108400110040001004000100400000000000","f70e30c708c00110040001004000100400010000000","ff2e70cf08d10130240001004000100400010040000","fffff0cf08f10b702c0401004000100400010040001","fffff1cf18f30f702c0403804010120440010040001","ffffffcf38f70ff06e340780c010320440090041001","ffffffffffffffffef7cff9ff37cfe0cd10b1043001"],"c":{"0-1":"f006004100400010040001004000000000000000000","0-2":"f006004100400010040001004000000000000000000","0-3":"f006004100400010040001004000000000000000000","0-4":"f006004100400010040001004000000000000000000","0-5":"f006004100400010040001004000000000000000000","0-6":"f006004100400010040001004000000000000000000","0-7":"f006004100400010040001004000000000000000000","0-8":"f006004108400010040001004000000000000000000","1-2":"f006004108400010040001004000000000000000000","1-3":"f006004108400010040001004000000000000000000","1-4":"f006004108400010040001004000000000000000000","1-5":"f006004108400010040001004000000000000000000","1-6":"f006004108400010040001004000000000000000000","1-7":"f006004108400010040001004000000000000000000","1-8":"f106004108400010040001004000100000000000000","2-3":"f106004108400010040001004000100000000000000","2-4":"f106004108400010040001004000100000000000000","2-5":"f106004108400010040001004000100000000000000","2-6":"f106004108400010040001004000100000000000000","2-7":"f106004108400010040001004000100000000000000","2-8":"f10e004108400110040001004000100400000000000","3-4":"f106004108400110040001004000100400000000000","3-5":"f106004108400110040001004000100400000000000","3-6":"f106004108400110040001004000100400000000000","3-7":"f30e004108400110040001004000100400000000000","3-8":"f30e004108400110040001004000100400000000000","4-5":"f70e004108400110240001004000100400010000000","4-6":"f70e004108400110240001004000100400010000000","4-7":"f70e10c108400110240001004000100400010000000","4-8":"ff2e10c108400110240001004000100400010040000","5-6":"ff3e30c108400110240401004000100400010040000","5-7":"ff7e30c308500110240401804000100400010040000","5-8":"ffff30c308500110240401804000100400010040001","6-7":"ffff70c708500310240401804010120440010040001","6-8":"fffff0c708f00310240401804010120440090041001","7-8":"fffffffff8f70f70e50c118140301604c0091041001"}}};
function unpack(hx){const set=new Set();for(let k=0;k<169;k++){if(parseInt(hx[k>>2],16)>>(k&3)&1)set.add(HANDS[k]);}return set;}
const nashFor=()=>NASH[`${N}-${D}`];

/* ---------- range model ---------- */
function deepScore(k){const h=info(k);let v=EQ[k];
  if(h.pair) v+=6+(h.hi<4?2:0);
  else{const gap=h.hi-h.lo-1;
    if(h.s){v+=4; if(gap===0)v+=h.lo>=2?9:5;else if(gap===1)v+=h.lo>=2?6:3.5;else if(gap===2)v+=h.lo>=2?3:1.5;
      if(h.hi===12)v+=h.lo<=3?1.5:0.5;}
    else{ if(h.lo<8) v-=h.hi<11?2.5:1.8; if(gap===0&&h.lo>=5)v+=1; }
  }
  return v;}
function shortScore(k){return EQ[k]+(k[0]===k[1]?2:0);}
// ranking for value 3-bets: big cards first, small and middle pairs pushed down
function valueScore(k){const h=info(k);return EQ[k]+(h.pair?(h.hi>=8?3:-5):0)+(h.s?0.5:0)+(h.lo>=8?1.5:0)+(h.hi===12&&h.lo===11?3:0);}
const score=(k,w)=>w==='value'?valueScore(k):w*deepScore(k)+(1-w)*shortScore(k);
function topRange(pct,w,excl){
  const list=HANDS.slice().sort((a,b)=>score(b,w)-score(a,w));const set=new Set();let c=0;const tgt=pct/100*1326;
  for(const k of list){if(excl&&excl.has(k))continue;if(c+combos(k)/2>tgt)break;set.add(k);c+=combos(k);}
  return set;}
const pctOf=set=>{let c=0;set.forEach(k=>c+=combos(k));return Math.round(c/1326*100);};

const TABLES={
  2:['BTN','BB'],3:['BTN','SB','BB'],4:['CO','BTN','SB','BB'],5:['HJ','CO','BTN','SB','BB'],
  6:['UTG','HJ','CO','BTN','SB','BB'],7:['UTG','LJ','HJ','CO','BTN','SB','BB'],
  8:['UTG','UTG+1','LJ','HJ','CO','BTN','SB','BB'],9:['UTG','UTG+1','UTG+2','LJ','HJ','CO','BTN','SB','BB']};
const DEPTHS=[100,60,40,25,15,10];
const W={100:1,60:0.8,40:0.6,25:0.3,15:0,10:0};
// open % by players left to act [8,7,6,5,4,3,2], then SB, then heads-up button
const OPEN={
  100:{b:[16,19,21,26,30,39,53],sb:44,hu:80},
  60:{b:[15,18,20,25,29,37,50],sb:42,hu:78},
  40:{b:[14,16,19,23,27,34,46],sb:40,hu:75},
  25:{b:[12,14,16,20,24,30,42],sb:40,hu:70},
  15:{b:[10,11,13,15,18,23,32],sb:45,hu:60},
  10:{b:[13,14,16,19,23,29,40],sb:55,hu:70}};
const DEPTH_NOTE={
  100:'At 100bb there is plenty of money behind, so small pairs and suited connectors gain value from implied odds.',
  60:'At 60bb implied odds are still good, a little less than at 100bb.',
  40:'At 40bb a 3-bet commits a big share of your stack, so high cards and pairs gain ground on speculative suited hands.',
  25:'At 25bb you min-raise and often face 3-bet shoves. Speculative hands lose most of their implied odds, and high cards and pairs matter most.',
  15:'At 15bb there is no room to raise and then fold, so the play is shove or fold. What matters is your equity when someone calls. These ranges are a solved Nash equilibrium: against them, nobody can gain by shoving or calling differently.',
  10:'At 10bb the play is shove or fold, and the blinds and ante are a big share of your stack, so shoving ranges get wider. These ranges are a solved Nash equilibrium: against them, nobody can gain by shoving or calling differently.'};

let N=8,D=100;
const isPush=()=>D<=15;
function openSize(pos){
  if(isPush()) return D;
  if(N===2) return D>=60?2.5:D>=40?2.2:2;
  if(pos==='SB') return D>=60?3:D>=40?2.8:2.5;
  return D>=60?2.2:D>=40?2.1:2;
}
function posted(pos){return pos==='BB'?1:(pos==='SB'||(N===2&&pos==='BTN'))?0.5:0;}
function openPct(pos){
  const names=TABLES[N],i=names.indexOf(pos),behind=N-1-i,o=OPEN[D];
  if(N===2) return o.hu;
  if(pos==='SB') return o.sb;
  return o.b[Math.max(0,Math.min(6,8-behind))];
}
function behindOf(pos){return N-1-TABLES[N].indexOf(pos);}

// The small blind (and the heads-up button, who posts it) raises its best hands, limps a
// middle band and folds the rest. [raise %, limp %] by stack depth. Everyone else never limps.
const LIMP={sb:{100:[28,42],60:[30,38],40:[32,33],25:[34,28]},hu:{100:[70,16],60:[68,16],40:[66,16],25:[62,18]}};
function limpRow(pos){if(isPush())return null;if(N===2&&pos==='BTN')return LIMP.hu[D];if(N>2&&pos==='SB')return LIMP.sb[D];return null;}
const raisePct=pos=>{const r=limpRow(pos);return r?r[0]:openPct(pos);};

let SCN=[];
function buildScenarios(){
  const names=TABLES[N],w=W[D],push=isPush();
  SCN=[];
  names.slice(0,-1).forEach(p=>{
    const set=push?unpack(nashFor().s[names.indexOf(p)]):topRange(raisePct(p),w);
    const lr=limpRow(p),limp=lr?topRange(lr[1],w,set):new Set();
    SCN.push({id:'rfi-'+p,type:'rfi',hero:p,name:`${p} ${push?'shove':'open'}`,size:openSize(p),pct:pctOf(set),limpPct:pctOf(limp),limpable:!!lr,
      labels:{raise:push?'Shove':'Open',limp:'Limp',fold:'Fold'},sets:{raise:set,limp}});
  });
  const spots=[];const s0=names[0];
  if(N>=4) spots.push(['BB',s0]);
  if(N>=5) spots.push(['CO',s0]);
  if(N>=6) spots.push(['BTN','HJ']);
  if(N>=4) spots.push(['BTN','CO'],['SB','CO'],['BB','CO']);
  if(N>=3) spots.push(['SB','BTN'],['BB','BTN'],['BB','SB']);
  if(N===2) spots.push(['BB','BTN']);
  const seen=new Set();
  spots.forEach(([hero,op])=>{
    const id=`vs-${hero}-${op}`;if(seen.has(id))return;seen.add(id);
    const kind=hero==='BB'?'bb':hero==='SB'?'sb':'ip';
    const op_pct=push?pctOf(unpack(nashFor().s[names.indexOf(op)])):raisePct(op),open=openSize(op);
    // at shove depths the BB pays the ante from its stack, so anything it's in is for one big blind less
    const live=push&&(hero==='BB'||op==='BB')?D-1:Math.min(open,D);
    const call=+(live-posted(hero)).toFixed(1);
    const pot=+(2.5+live-posted(op)).toFixed(1);
    const odds=Math.round(call/(pot+call)*100);
    let three=new Set(),callSet=new Set(),threeTo=null;
    if(push){
      callSet=unpack(nashFor().c[`${names.indexOf(op)}-${names.indexOf(hero)}`]);
    }else{
      let tp,dp;
      if(kind==='bb'){dp=Math.min(op_pct+{100:15,60:13,40:11,25:8}[D],85);tp=Math.max(3,op_pct*(op==='SB'?0.32:0.14));}
      else if(kind==='sb'){tp=op_pct*(D===25?0.36:0.32);dp=tp;}
      else{dp=op_pct*{100:.55,60:.5,40:.42,25:.34}[D];tp=Math.max(2.5,op_pct*(D===25?0.25:0.2));}
      three=topRange(tp,'value');
      if(D>=60) ['A5s','A4s'].forEach(k=>three.add(k));
      if(dp>tp) callSet=topRange(dp-pctOf(three),w,three);
      const ip=kind==='ip';
      threeTo=D<=25?D:Math.round(open*(ip?3.2:4.4)*2)/2;
      if(threeTo>D*0.4) threeTo=D;
    }
    const shove3=!push&&threeTo===D;
    SCN.push({id,type:'vs',hero,opener:op,kind,name:`${hero} vs ${op} ${push?'shove':'open'}`,
      open,call,pot,odds,opPct:op_pct,threeTo,
      labels:{fold:'Fold',call:'Call','3bet':shove3?'3-bet shove':'3-bet'},
      sets:{'3bet':three,call:callSet}});
  });
  SCN.forEach(s=>{
    const g=HANDS.map(k=>actionOf(s,k)),b=[];
    for(let i=0;i<169;i++){const r=Math.floor(i/13),c=i%13;
      const nb=[[r-1,c],[r+1,c],[r,c-1],[r,c+1]].filter(([x,y])=>x>=0&&x<13&&y>=0&&y<13);
      if(nb.some(([x,y])=>g[x*13+y]!==g[i]))b.push(HANDS[i]);}
    s.border=b.length?b:HANDS;
  });
}
function actionOf(s,k){
  if(s.type==='rfi') return s.sets.raise.has(k)?'raise':s.sets.limp&&s.sets.limp.has(k)?'limp':'fold';
  if(s.sets['3bet'].has(k)) return '3bet';
  if(s.sets.call.has(k)) return 'call';
  return 'fold';
}
function actionsFor(s){
  if(s.type==='rfi'){
    // Deep-stack opens always offer a limp, so it has to be ruled out, not just ignored.
    if(isPush()) return [{a:'fold',label:'Fold',key:'F'},{a:'raise',label:`Shove ${D}bb`,key:'R'}];
    const sbSeat=s.hero==='SB'||N===2;
    return [{a:'fold',label:'Fold',key:'F'},{a:'limp',label:sbSeat?'Complete to 1bb':'Limp 1bb',key:'C'},{a:'raise',label:`Raise to ${s.size}bb`,key:'R'}];
  }
  const out=[{a:'fold',label:'Fold',key:'F'},{a:'call',label:`Call ${s.call}bb`,key:'C'}];
  if(!isPush()) out.push({a:'3bet',label:s.threeTo===D?`3-Bet all-in ${D}bb`:`3-Bet to ${s.threeTo}bb`,key:'R'});
  return out;
}

/* ---------- shared settings (players, stack) ---------- */
const store={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}};
N=store.get('pft-n',8);D=store.get('pft-d',100);
if(!TABLES[N])N=8;if(!DEPTHS.includes(D))D=100;

/* ---------- explanations ---------- */
function trait(h){
  const H=R[h.hi];
  if(h.pair){
    if(h.hi>=10) return 'A premium pair. It is ahead of nearly every range and wants to build a big pot.';
    if(h.hi>=8) return 'A strong pair. It is a clear value hand, though it does not love a lot of aggression from tight ranges.';
    if(h.hi>=4) return D>=60?'A middle pair. It wins some pots unimproved, but much of its value comes from flopping a set, which happens about once in eight and a half flops.':'A middle pair. At this stack depth it is often a favorite over two overcards and a fine hand to get all-in with against wide ranges.';
    return D>=60?'A small pair. It plays mostly for set value, which works at deep stacks because the chips behind pay you off when you hit.':'A small pair. With shallow stacks there is little money behind to win when you flop a set, so it plays mostly as a coin flip against overcards.';
  }
  if(h.hi===12){
    if(h.s){
      if(h.lo<=3) return 'A suited wheel ace. It makes the nut flush, can make a 5-high straight, and holding an ace makes AA and AK less likely for opponents. At deep stacks that makes it a favorite 3-bet bluff.';
      if(h.lo>=8) return 'A suited ace with a big kicker: strong top pairs plus nut-flush draws.';
      return 'A suited ace with a middling kicker. Its value is mostly the nut-flush potential and the ace itself; when it pairs the ace it is often outkicked.';
    }
    if(h.lo>=8) return 'An offsuit broadway ace. It makes strong top pairs, but it can be dominated by better aces when you meet resistance.';
    return D<=25?'An offsuit ace with a weak kicker. It is poor for raising and folding, but holding an ace blocks calls and it has solid all-in equity, so it gains value as stacks get short.':'An offsuit ace with a weak kicker. When you pair the ace you are often outkicked, and there is no flush to fall back on.';
  }
  if(h.lo>=8) return h.s?'Suited broadway cards. They make plenty of top pairs, straights, and flushes, and they play well after the flop.':'Offsuit broadway cards. They make top pair often, but they are dominated by better kickers when you get action.';
  if(h.s){
    const gap=h.hi-h.lo-1;
    if(h.hi<=8&&gap===0) return D>=60?'A suited connector. It rarely makes big pairs, but it makes straights and flushes. It needs deep stacks and position to realize its value.':'A suited connector. Its value comes from making straights and flushes, which needs deep stacks. At this depth it loses much of that value.';
    if(h.hi<=8&&gap===1) return 'A suited one-gapper. Like a connector it plays for straights and flushes, with slightly fewer straight possibilities.';
    if(h.hi>=9) return `A suited ${NAME[H]} with a low kicker. It has flush potential, but when you pair the ${NAME[H]} you are often outkicked.`;
    return 'Suited but disconnected. The flush potential is the only real asset, and the high card is weak.';
  }
  if(h.hi>=9) return `An offsuit ${NAME[H]} with a weak kicker. It pairs the ${NAME[H]} and gets outkicked, with no flush or straight potential to compensate.`;
  if(h.hi-h.lo<=2) return 'Offsuit connected cards. They make some straights but no flushes, and their pairs are weak. They only play in the widest spots.';
  return 'Offsuit and disconnected. It rarely makes a strong hand and plays poorly after the flop.';
}
function runs(idx){const out=[];idx.sort((a,b)=>a-b);let st=null,pv=null;idx.forEach(i=>{if(st===null){st=pv=i;}else if(i===pv+1)pv=i;else{out.push([st,pv]);st=pv=i;}});if(st!==null)out.push([st,pv]);return out;}
function catLine(s,h){
  let name,members;
  if(h.pair){name='Pocket pairs';members=[...Array(13).keys()].map(i=>({i,k:hk(i,i)}));}
  else{name=`${h.s?'Suited':'Offsuit'} ${PLUR[R[h.hi]]} (${R[h.hi]}x${h.s?'s':'o'})`;members=[...Array(h.hi).keys()].map(i=>({i,k:hk(h.hi,i,h.s)}));}
  const order=s.type==='rfi'?['raise','limp']:['3bet','call'];
  const parts=[];
  order.forEach(a=>{
    const idx=members.filter(m=>actionOf(s,m.k)===a).map(m=>m.i);
    if(!idx.length) return;
    const txt=runs(idx).reverse().map(([lo,hi])=>{
      if(h.pair){const f=i=>hk(i,i);return lo===hi?f(lo):hi===12?f(lo)+'+':f(lo)+'–'+f(hi);}
      const f=i=>hk(h.hi,i,h.s),topI=h.hi-1;
      return lo===hi?f(lo):hi===topI?f(lo)+'+':f(hi)+'–'+f(lo);
    }).join(', ');
    parts.push(`<span class="tag ${a==='3bet'?'t3bet':a}">${s.labels[a]}</span>${txt}`);
  });
  const anyFold=members.some(m=>actionOf(s,m.k)==='fold');
  if(!parts.length) return `<b>${name}:</b> every one folds here.`;
  return `<b>${name}:</b><br>${parts.join('<br>')}${anyFold?'<br><span class="tag fold">Fold</span>the rest':''}`;
}
const plural=(n,w)=>`${n} ${w}${n===1?'':'s'}`;
function spotContext(s){
  const push=isPush();
  if(s.type==='rfi'){
    const n=behindOf(s.hero);let t;
    if(N===2) t=push?'Heads-up, the button posts the small blind and acts first. Against one opponent, with the ante in the pot, the button shoves a wide range.':'Heads-up, the button posts the small blind and acts first before the flop, then has position on every later street. The button raises most hands, completes with a band of weaker ones that still play well in position, and folds the rest.';
    else if(s.hero==='SB') t=push?'Only the big blind is left. With the blinds and ante in the pot, a shove from the small blind takes it down often enough to be wide.':'Only the big blind is left, but you will be out of position after the flop. The small blind raises its best hands, completes (limps) with a wide middle band to keep the pot small, and folds the rest.';
    else if(s.hero==='BTN') t='Only the blinds are left, and you will have position for the whole hand. With the ante, 2.5bb is in the pot before you act, so you can play wide.';
    else if(n===3) t='Only the button and the blinds are left. Stealing works often enough that most suited hands and decent offsuit aces play.';
    else if(n>=6) t=`${n} players are still to act, and one of them wakes up with a strong hand fairly often. Play only hands that hold up when someone ${push?'calls':'calls or 3-bets'}.`;
    else t=`${n} players are still to act. From the middle of the table you can add more ${push?'aces, pairs and broadways':'suited hands and the better offsuit broadways'}.`;
    const freq=s.limpable?`raises about ${s.pct}% of hands and limps about ${s.limpPct}%`:`${push?'shoves':'opens'} about ${s.pct}% of hands`;
    return `${t} ${DEPTH_NOTE[D]} Here the ${s.hero} ${freq}.`;
  }
  const after=behindOf(s.hero);
  if(push){
    const extra=s.kind==='bb'?'You close the action, so you can call wider than anyone else.':`${plural(after,'player')} can still wake up behind you, so call a little tighter.`;
    return `The ${s.opener} shoves ${D}bb with about ${s.opPct}% of hands. Calling costs ${s.call}bb to win ${s.pot}bb, so you need about ${s.odds}% equity against that range. ${extra}`;
  }
  let t;
  if(s.kind==='bb') t=`The ${s.opener} opens about ${s.opPct}% of hands. You close the action and need about ${s.odds}% equity to call, ${s.opener==='SB'?'and for once the big blind has position after the flop.':'but you will play out of position.'}`+(s.opPct<30?' Against a range this tight, dominated hands still fold.':' Against a range this wide, the big blind defends a lot of hands.');
  else if(s.kind==='sb') t=`You will be out of position, and the big blind still acts behind you. Flatting invites the big blind to squeeze or overcall at a good price, so against a ${s.opener} open (about ${s.opPct}%) the small blind plays 3-bet or fold.`;
  else t=`The ${s.opener} opens about ${s.opPct}% of hands, and you will have position after the flop. ${plural(after,'player')} behind you can still squeeze, so don't flat too wide.`;
  return `${t} ${DEPTH_NOTE[D]}`;
}
function reason(s,a,h){
  const push=isPush();
  if(s.type==='rfi'){
    const n=behindOf(s.hero);
    if(a==='limp') return N===2?'Complete. Heads-up, this hand plays well enough to see a flop in position, but not well enough to raise and face a 3-bet. Completing for half a big blind keeps the pot small.':'Complete. This hand is worth playing but not strong enough to raise and play a bigger pot out of position. Limping for half a big blind keeps the pot small and your range hard to attack.';
    if(a==='raise') return push?'Shove. This hand has enough equity when called, and the blinds and ante you win when everyone folds make it profitable.':`Open. With ${plural(n,'player')} left to act, this hand wins the blinds and ante often enough and has enough strength or playability when called.`;
    return push?'Fold. When you get called, this hand is too often in bad shape, and that costs more than the 2.5bb you would win when everyone folds.':`Fold. With ${plural(n,'player')} left to act, this hand is too often dominated or hard to play when called or 3-bet, and that costs more than the 2.5bb you would steal.`;
  }
  if(a==='3bet'){
    if(D>=60&&h.s&&h.hi===12&&h.lo<=3) return '3-bet as a bluff. The ace blocks AA and AK, and the hand still has nut-flush and straight outs when called.';
    if(s.threeTo===D) return `3-bet shove. This hand is well ahead of the ${s.opener}'s opening range, and shoving denies them the chance to see a flop.`;
    return `3-bet for value. This hand is well ahead of the ${s.opener}'s opening range and wants to build the pot.`;
  }
  if(a==='call'){
    if(push) return 'Call. This hand has enough equity against the shoving range to beat the price.';
    if(s.kind==='bb') return 'Call. The price is good and this hand has enough equity to defend, even out of position.';
    return 'Call. This hand plays well in position and doesn’t need to 3-bet to profit.';
  }
  if(push) return 'Fold. Against the shoving range this hand doesn’t have enough equity to call, even at this price.';
  if(s.kind==='bb') return 'Fold. Even at a good price, this hand doesn’t realize enough equity out of position against this range.';
  if(s.kind==='sb') return 'Fold. Out of position with the big blind behind, this hand is not strong enough to 3-bet, and flatting would be worse.';
  return 'Fold. This hand is behind the opening range too often, and flatting leaves you open to a squeeze.';
}

// Shown when a player limps and the chart doesn't.
function limpNote(s){
  if(s.limpable)return `Limping is part of the ${N===2?'button':'small blind'}\u2019s strategy, but not with this hand. The chart ${s.sets.raise.size?'raises its best hands and ':''}folds its weakest.`;
  return 'Open-limping from here is almost always a mistake. Anyone behind can raise and take the pot away, the big blind sees a free flop, and you give up the chance to win the blinds and ante without a fight.';
}
function gridHTML(s,k){
  let g='';HANDS.forEach(x=>{const a=actionOf(s,x);g+=`<div class="cell ${a==='3bet'?'t3bet':a==='fold'?'':a}${x===k?' me':''}" title="${x}">${x}</div>`;});
  const acts=s.type==='rfi'?['raise',...(s.sets.limp&&s.sets.limp.size?['limp']:[]),'fold']:[...(s.sets['3bet'].size?['3bet']:[]),...(s.sets.call.size?['call']:[]),'fold'];
  const leg=acts.map(a=>{let c=0;HANDS.forEach(x=>{if(actionOf(s,x)===a)c+=combos(x);});
    const col=a==='fold'?'var(--fold-bg)':a==='call'||a==='limp'?'var(--call)':'var(--raise)';
    return `<span><i style="background:${col}"></i>${s.labels[a]} ${(c/1326*100).toFixed(1)}%</span>`;}).join('');
  return `<div class="blk"><h3>${s.name} chart · ${D}bb · ${isPush()?'Nash solution':'modeled'}</h3></div><div class="gridwrap"><div class="grid">${g}</div></div><div class="legend">${leg}</div>`;
}


// Builds public/profiles-data.js: charts against opponent types (tight, loose-passive, aggressive).
//   nash - at 10bb and 15bb (chip EV), the exact best response to opponents whose shoving and
//          calling ranges are the balanced Nash ranges scaled by type (see SHOVE/SNAP below):
//          s = your shove range per seat, c = your call range per shover/caller pair,
//          v = the opponents' actual shove % per seat (what the explanations quote)
//   ev   - what each wrong push/fold decision costs against that type, in big blinds
//   v3   - facing an all-in 3-bet at 25bb from that type: exact calls by pot odds
// Deeper ranges are modeled in public/engine.js (PMULT). Rerun after changing ranges:
//   node tools/build-profiles.js   (about a minute)
const fs = require('fs'), path = require('path'), vm = require('vm');
const { makeGame, evaluate } = require('./icm');
const M = require('./data/matrix.json');
const root = path.join(__dirname, '..');

// How much wider (>1) or tighter (<1) each type shoves first-in and calls a shove, versus Nash.
const SHOVE = { tight: 0.65, loose: 0.9, aggro: 1.45 };
const SNAP = { tight: 0.65, loose: 1.6, aggro: 1.15 };

function engine(PROFD) {
  const ctx = { localStorage: { getItem() { return null; }, setItem() {} }, console, PROFD };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'public', 'engine.js'), 'utf8') + `
;this.E={set(n,d,p){N=n;D=d;STAGE='cev';PROFILE=p||'bal';buildScenarios();},scn:()=>SCN,actionOf,HANDS,NASH,unpack,TABLES,combos,EQ};`, ctx);
  return ctx.E;
}
const EVA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const enc = x => { x = Math.max(0, x); const v = x < 3.05 ? Math.round(x * 10) : Math.min(63, 31 + Math.round((x - 3) * 2)); return EVA[Math.min(v, 63)]; };
const hex = f => { let s = ''; for (let k = 0; k < 169; k += 4) { let v = 0; for (let b = 0; b < 4; b++) if (k + b < 169 && f[k + b] > 0) v |= 1 << b; s += v.toString(16); } return s; };
const cmb = h => { const r = Math.floor(h / 13), c = h % 13; return r === c ? 6 : r < c ? 4 : 12; };

const PROFD = { nash: {}, ev: {}, v3: {} };
let E = engine(PROFD);
// Hands by all-in strength (pairs get a small bonus, like the engine's short-stack ranking).
const order = E.HANDS.map((k, h) => h).sort((a, b) => (E.EQ[E.HANDS[b]] + (b % 14 === 0 ? 2 : 0)) - (E.EQ[E.HANDS[a]] + (a % 14 === 0 ? 2 : 0)));
// Scale a pure 0/1 range to `mult` times its combos: trim its weakest hands, or add the strongest outside it.
function scale(arr, mult) {
  const have = arr.reduce((t, x, h) => t + (x ? cmb(h) : 0), 0), tgt = Math.min(1326, have * mult), out = arr.slice();
  if (mult < 1) { let c = have; for (const h of [...order].reverse()) { if (!out[h]) continue; if (c - cmb(h) / 2 < tgt) break; out[h] = 0; c -= cmb(h); } }
  else { let c = have; for (const h of order) { if (out[h]) continue; if (c + cmb(h) / 2 > tgt) break; out[h] = 1; c += cmb(h); } }
  return out;
}
const pure = hx => { const s = E.unpack(hx); return E.HANDS.map(k => (s.has(k) ? 1 : 0)); };
const pct = arr => +(arr.reduce((t, x, h) => t + (x ? cmb(h) : 0), 0) / 13.26).toFixed(0);

// 1. Best response to each type at 10bb and 15bb
const diffs = {};
for (const p of Object.keys(SHOVE)) for (const S of [10, 15]) for (let n = 2; n <= 9; n++) {
  const nash = E.NASH[`${n}-${S}`];
  const shoveV = nash.s.map(h => scale(pure(h), SHOVE[p])), callV = [];
  for (let i = 0; i < n - 1; i++) { callV[i] = []; for (let j = i + 1; j < n; j++) callV[i][j] = scale(pure(nash.c[`${i}-${j}`]), SNAP[p]); }
  const ev = evaluate(makeGame(n, S, null), M, shoveV, callV);
  const o = { s: ev.shove.map(d => hex(d.map(x => (x > 0 ? 1 : 0)))), c: {}, v: shoveV.map(pct) };
  for (let i = 0; i < n - 1; i++) for (let j = i + 1; j < n; j++) o.c[`${i}-${j}`] = hex(ev.call[i][j].map(x => (x > 0 ? 1 : 0)));
  PROFD.nash[`${p}-${n}-${S}`] = o; diffs[`${p}-${n}-${S}`] = ev;
}
console.log('Best responses done');
E = engine(PROFD);

// 2. Cost of wrong push/fold decisions against each type
for (const key of Object.keys(PROFD.nash)) {
  const [p, n, S] = key.split('-'), ev = diffs[key];
  E.set(+n, +S, p);
  const names = E.TABLES[+n], out = {};
  for (const s of E.scn()) {
    const d = s.type === 'rfi' ? ev.shove[names.indexOf(s.hero)] : ev.call[names.indexOf(s.opener)][names.indexOf(s.hero)];
    out[s.id] = E.HANDS.map((k, h) => enc(E.actionOf(s, k) === 'fold' ? -d[h] : d[h])).join('');
  }
  PROFD.ev[key] = out;
}
console.log('EV tables done');

// 3. Facing an all-in 3-bet at 25bb from each type: call when equity beats the price
const hexSet = f => hex(f);
for (const p of Object.keys(SHOVE)) for (let n = 2; n <= 9; n++) {
  E.set(n, 25, p);
  const out = {};
  for (const s of E.scn().filter(x => x.type === 'v3' && x.threeTo >= 25)) {
    const Ti = E.HANDS.map(k => s.vT.has(k)), flags = [], cost = [];
    E.HANDS.forEach((k, h) => {
      let w = 0, e = 0; for (let g = 0; g < 169; g++) if (Ti[g]) { w += M.W[h][g]; e += M.W[h][g] * M.EQ[h][g]; }
      const diff = w ? (e / w) * (s.pot + s.call) - s.call : -s.call;
      flags.push(diff > 0 ? 1 : 0); cost.push(Math.abs(diff));
    });
    out[s.id] = { c: hexSet(flags), e: cost.map(enc).join('') };
  }
  if (Object.keys(out).length) PROFD.v3[`${p}-${n}-25`] = out;
}
console.log('3-bet shove calls done');

const file = path.join(root, 'public', 'profiles-data.js');
fs.writeFileSync(file, `/* Preflop IQ opponent-type data. GENERATED by tools/build-profiles.js; do not edit.
   nash: best responses to tight, loose-passive and aggressive opponents at 10-15bb (s, c) and
   their shove % per seat (v); ev: cost of each wrong push/fold decision; v3: exact calls of an
   all-in 3-bet at 25bb. */
const PROFD=${JSON.stringify(PROFD)};
`);
console.log('Wrote public/profiles-data.js', (fs.statSync(file).size / 1024).toFixed(0) + 'KB');

// Exports every range the site teaches as JSON, for tools/build-pages.py to turn into static
// chart pages. Runs public/engine.js in a sandbox so the pages always match the trainer.
// Usage: node tools/range-data.js > /tmp/ranges.json   (build-pages.py runs this itself)
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'engine.js'), 'utf8');
const ctx = { localStorage: { getItem() { return null; }, setItem() {} }, console };
vm.createContext(ctx);
vm.runInContext(src + `
;this.E = { set(n, d) { N = n; D = d; buildScenarios(); }, scn: () => SCN, actionOf, actionsFor, spotContext, pctOf, combos,
  HANDS, EQ, TABLES, DEPTHS, isPush, openSize, info, R };`, ctx);
const E = ctx.E;
const R = '23456789TJQKA';
const CODE = { raise: 'r', '3bet': 'r', limp: 'l', call: 'c', fold: 'f' };

// Standard range notation: 22+, A2s+, K9s+, T8s-T6s, ATo+ ...
function notation(set) {
  const out = [];
  const runs = idx => { idx.sort((a, b) => a - b); const r = []; let s = null, p = null; for (const i of idx) { if (s === null) { s = p = i; } else if (i === p + 1) p = i; else { r.push([s, p]); s = p = i; } } if (s !== null) r.push([s, p]); return r; };
  const pairs = []; for (let i = 0; i < 13; i++) if (set.has(R[i] + R[i])) pairs.push(i);
  for (const [lo, hi] of runs(pairs).reverse()) out.push(hi === 12 ? `${R[lo]}${R[lo]}+` : lo === hi ? R[lo] + R[lo] : `${R[hi]}${R[hi]}-${R[lo]}${R[lo]}`);
  for (const suf of ['s', 'o']) for (let h = 12; h >= 1; h--) {
    const ks = []; for (let l = 0; l < h; l++) if (set.has(R[h] + R[l] + suf)) ks.push(l);
    for (const [lo, hi] of runs(ks).reverse()) out.push(hi === h - 1 && lo !== hi ? `${R[h]}${R[lo]}${suf}+` : lo === hi ? `${R[h]}${R[lo]}${suf}` : `${R[h]}${R[hi]}${suf}-${R[h]}${R[lo]}${suf}`);
  }
  return out.join(', ');
}

const slugPos = p => p.toLowerCase().replace('+', '-plus-');
function spotSlug(s, push) {
  const verb = push ? 'shove' : 'open';
  return s.type === 'rfi' ? `${slugPos(s.hero)}-${verb}` : `${slugPos(s.hero)}-vs-${slugPos(s.opener)}-${verb}`;
}
const formatSlug = (n, d) => `${n === 2 ? 'heads-up' : n + '-max'}-${d}bb`;
const formatLabel = (n, d) => `${n === 2 ? 'Heads-Up' : n + '-Max'} ${d}bb`;

const formats = [];
for (const n of [2, 3, 4, 5, 6, 7, 8, 9]) for (const d of E.DEPTHS) {
  E.set(n, d);
  const push = E.isPush();
  const spots = E.scn().filter(s => !s.pro).map(s => {   // Pro spots (3-bet pots) stay out of the free library
    const acts = E.HANDS.map(k => E.actionOf(s, k));
    const by = {};
    acts.forEach((a, i) => { (by[a] = by[a] || new Set()).add(E.HANDS[i]); });
    const combosOf = a => { let c = 0; (by[a] || new Set()).forEach(k => c += E.combos(k)); return c; };
    const actions = [...new Set(acts)].sort((a, b) => ['raise', '3bet', 'limp', 'call', 'fold'].indexOf(a) - ['raise', '3bet', 'limp', 'call', 'fold'].indexOf(b));
    const border = new Set(s.border.length < 169 ? s.border : []);
    const edge = {};
    for (const a of actions) {
      const hands = [...(by[a] || [])].filter(k => border.has(k));
      hands.sort((x, y) => a === 'fold' ? E.EQ[y] - E.EQ[x] : E.EQ[x] - E.EQ[y]);
      edge[a] = hands.slice(0, 8);
    }
    return {
      id: s.id, slug: spotSlug(s, push), name: s.name, type: s.type, hero: s.hero, opener: s.opener || null,
      labels: s.labels, grid: acts.map(a => CODE[a]).join(''),
      actions: actions.map(a => ({ a, label: s.labels[a], combos: combosOf(a), pct: +(combosOf(a) / 1326 * 100).toFixed(1), notation: a === 'fold' ? '' : notation(by[a] || new Set()) })),
      buttons: E.actionsFor(s).map(x => x.label), context: E.spotContext(s), edge,
      size: s.size || null, open: s.open || null, call: s.call || null, pot: s.pot || null, odds: s.odds || null, threeTo: s.threeTo || null, limpable: !!s.limpable,
    };
  });
  formats.push({ n, d, push, slug: formatSlug(n, d), label: formatLabel(n, d), openTo: push ? null : E.openSize('CO'), spots });
}
process.stdout.write(JSON.stringify({ formats }));

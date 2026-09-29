// Push/fold game with either chip-EV or prize-pool (ICM) payoffs, for 2-9 equal stacks.
// Same model as tools/nash.js: everyone starts with S big blinds; the SB posts 0.5 (the button in
// heads-up), the BB posts 1 plus a 1bb ante from its own stack. Players act in preflop order; the
// first player in may shove and players behind may call. At most one player calls.
//
// With payouts, every terminal stack vector is valued with the Malmuth-Harville ICM model, and
// folding is valued by what happens after you fold (others can still bust each other).
// EV differences are reported in big blinds; for ICM they are "chip equivalents": prize equity
// converted at the average rate (all chips at the table = all prize money still to be paid).

function icmEquity(stacks, pay) {
  const n = stacks.length, res = new Array(n).fill(0);
  const alive = [], dead = [];
  stacks.forEach((s, i) => (s > 1e-9 ? alive : dead).push(i));
  if (dead.length) { const share = pay.slice(n - dead.length).reduce((a, b) => a + b, 0) / dead.length; dead.forEach(i => (res[i] = share)); }
  const m = alive.length, st = alive.map(i => stacks[i]), memo = new Map();
  function rec(mask) { // equity vector over alive players still in `mask`, for the places still open
    if (memo.has(mask)) return memo.get(mask);
    const out = new Array(m).fill(0); let tot = 0, cnt = 0;
    for (let a = 0; a < m; a++) if (mask >> a & 1) { tot += st[a]; cnt++; }
    const place = m - cnt;
    if (cnt === 0) { memo.set(mask, out); return out; }
    for (let a = 0; a < m; a++) if (mask >> a & 1) {
      const p = st[a] / tot, sub = rec(mask & ~(1 << a));
      out[a] += p * pay[place];
      for (let b = 0; b < m; b++) if (b !== a) out[b] += p * sub[b];
    }
    memo.set(mask, out); return out;
  }
  const eq = rec((1 << m) - 1);
  alive.forEach((i, a) => (res[i] = eq[a]));
  return res;
}

function makeGame(N, S, pay) {
  const BB = N - 1;
  const post = new Array(N).fill(0); post[BB] = 1; if (N === 2) post[0] = 0.5; else post[N - 2] = 0.5;
  const ante = k => (k === BB ? 1 : 0);
  const eff = (i, j) => (i === BB || j === BB ? S - 1 : S);
  const base = () => post.map((p, k) => S - p - ante(k));
  const U = pay ? v => icmEquity(v, pay) : v => v.slice();
  const unc = [], sd = [];
  for (let i = 0; i < N; i++) { const v = base(); v[i] += 2.5; unc[i] = U(v); }
  for (let i = 0; i < N; i++) { sd[i] = []; for (let j = i + 1; j < N; j++) {
    const e = eff(i, j); let dead = 1; for (let k = 0; k < N; k++) if (k !== i && k !== j) dead += post[k];
    const pot = 2 * e + dead, mk = w => { const v = base(); v[i] = S - e - ante(i); v[j] = S - e - ante(j); v[w] += pot; return U(v); };
    sd[i][j] = [mk(i), mk(j)]; // [i wins, j wins]
  } }
  const scale = pay ? N * S / pay.reduce((a, b) => a + b, 0) : 1;
  return { N, S, pay, unc, sd, scale };
}

// EV of each pure action given everyone else's (possibly mixed) strategy.
// Returns shove[i][h] and call[i][j][h] = EV(play) - EV(fold), in big blinds.
function evaluate(g, { EQ, W }, shove, call) {
  const { N, unc, sd, scale } = g, H = 169, BB = N - 1;
  // p[i][l]: chance l calls i's shove; E[i][l]: i's equity when called (both averaged over ranges)
  const p = [], E = [];
  for (let i = 0; i < N - 1; i++) { p[i] = []; E[i] = [];
    for (let l = i + 1; l < N; l++) {
      let ns = 0, nc = 0, eq = 0; const c = call[i][l];
      for (let a = 0; a < H; a++) { const sa = shove[i][a]; if (!sa) continue; const Wa = W[a], Ea = EQ[a];
        for (let b = 0; b < H; b++) { const w = Wa[b] * sa; if (!w) continue; ns += w; const x = w * c[b]; nc += x; eq += x * Ea[b]; } }
      p[i][l] = ns ? nc / ns : 0; E[i][l] = nc ? eq / nc : 0.5;
    } }
  // V[i]: value vector (every player) when i shoves first, averaged over i's range and the callers'
  const V = [];
  for (let i = 0; i < N - 1; i++) { const v = new Array(N).fill(0); let reach = 1;
    for (let l = i + 1; l < N; l++) { const q = reach * p[i][l]; for (let k = 0; k < N; k++) v[k] += q * (E[i][l] * sd[i][l][0][k] + (1 - E[i][l]) * sd[i][l][1][k]); reach *= 1 - p[i][l]; }
    for (let k = 0; k < N; k++) v[k] += reach * unc[i][k]; V[i] = v; }
  // A[k]: value vector when the action is on k and everyone before k folded
  const A = []; A[BB] = unc[BB];
  for (let k = N - 2; k >= 0; k--) {
    let q = 0, t = 0; for (let h = 0; h < H; h++) { const w = hcombo(h); t += w; q += w * shove[k][h]; } q /= t;
    A[k] = A[k + 1].map((x, m) => q * V[k][m] + (1 - q) * x);
  }
  const outS = [], outC = [];
  for (let i = 0; i < N - 1; i++) {
    outC[i] = [];
    for (let j = i + 1; j < N; j++) {
      // j folds: later players may still call i
      let F = 0, reach = 1;
      for (let l = j + 1; l < N; l++) { F += reach * p[i][l] * (E[i][l] * sd[i][l][0][j] + (1 - E[i][l]) * sd[i][l][1][j]); reach *= 1 - p[i][l]; }
      F += reach * unc[i][j];
      const win = sd[i][j][1][j], lose = sd[i][j][0][j], d = new Array(H);
      for (let h = 0; h < H; h++) { let ws = 0, ev = 0; const Wh = W[h], Eh = EQ[h];
        for (let a = 0; a < H; a++) { const w = Wh[a] * shove[i][a]; if (!w) continue; ws += w; ev += w * (Eh[a] * win + (1 - Eh[a]) * lose); }
        d[h] = ws ? (ev / ws - F) * scale : 0; }
      outC[i][j] = d;
    }
    const G = A[i + 1][i], d = new Array(H);
    for (let h = 0; h < H; h++) { let reach = 1, ev = 0; const Wh = W[h], Eh = EQ[h];
      for (let j = i + 1; j < N; j++) { const c = call[i][j]; let wt = 0, wc = 0, eq = 0;
        for (let a = 0; a < H; a++) { const w = Wh[a]; if (!w) continue; wt += w; const x = w * c[a]; wc += x; eq += x * Eh[a]; }
        const pc = wt ? wc / wt : 0;
        if (pc > 0) { const e = eq / wc; ev += reach * pc * (e * sd[i][j][0][i] + (1 - e) * sd[i][j][1][i]); }
        reach *= 1 - pc; }
      ev += reach * unc[i][i]; d[h] = (ev - G) * scale; }
    outS[i] = d;
  }
  return { shove: outS, call: outC };
}
// combos of starting-hand class h in HANDS order (13x13 grid: diagonal pairs, above suited, below offsuit)
function hcombo(h) { const r = Math.floor(h / 13), c = h % 13; return r === c ? 6 : r < c ? 4 : 12; }

function solve(g, M, iters = 600) {
  const { N } = g, H = 169, shove = [], call = [];
  for (let i = 0; i < N - 1; i++) { shove[i] = new Array(H).fill(0.5); call[i] = []; for (let j = i + 1; j < N; j++) call[i][j] = new Array(H).fill(0.3); }
  for (let t = 1; t <= iters; t++) {
    const lr = 1 / (t + 1), ev = evaluate(g, M, shove, call);
    for (let i = 0; i < N - 1; i++) {
      for (let h = 0; h < H; h++) shove[i][h] += lr * ((ev.shove[i][h] > 0 ? 1 : 0) - shove[i][h]);
      for (let j = i + 1; j < N; j++) for (let h = 0; h < H; h++) call[i][j][h] += lr * ((ev.call[i][j][h] > 0 ? 1 : 0) - call[i][j][h]);
    }
  }
  return { shove, call };
}

module.exports = { icmEquity, makeGame, evaluate, solve };

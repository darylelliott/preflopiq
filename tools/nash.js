// Chip-EV Nash equilibrium for N-handed shove-or-fold play.
// Model: every player starts with S big blinds; SB posts 0.5 (the button in heads-up), BB posts 1 plus a 1bb ante
// paid from its own stack (so the BB has S-1 live). Players act in preflop order; the first-in player may shove,
// and players behind may call. At most one player calls (no three-way all-ins).
// Solved by fictitious play: each iteration computes pure best responses and averages them into the strategy.
function solve(N, S, { EQ, W }, iters = 800) {
  const H = 169;
  const post = new Array(N).fill(0); post[N - 1] = 1; if (N === 2) post[0] = 0.5; else post[N - 2] = 0.5;
  const isBB = k => k === N - 1;
  const eff = (i, j) => (isBB(i) || isBB(j) ? S - 1 : S);
  const potOf = (i, j) => { let dead = 1; for (let k = 0; k < N; k++) if (k !== i && k !== j) dead += post[k]; return 2 * eff(i, j) + dead; };
  const shove = [], call = [];
  for (let i = 0; i < N - 1; i++) { shove[i] = new Array(H).fill(0.5); call[i] = []; for (let j = i + 1; j < N; j++) call[i][j] = new Array(H).fill(0.3); }

  for (let t = 1; t <= iters; t++) {
    const lr = 1 / (t + 1), brCall = [], brShove = [];
    for (let i = 0; i < N - 1; i++) {
      brCall[i] = [];
      for (let j = i + 1; j < N; j++) {
        const e = eff(i, j), pot = potOf(i, j), br = new Array(H);
        for (let h = 0; h < H; h++) {
          let ws = 0, ev = 0;
          for (let g = 0; g < H; g++) { const w = W[h][g] * shove[i][g]; if (!w) continue; ws += w; ev += w * (EQ[h][g] * pot - e); }
          br[h] = ws > 0 && ev / ws > -post[j] ? 1 : 0;
        }
        brCall[i][j] = br;
      }
    }
    for (let i = 0; i < N - 1; i++) {
      const br = new Array(H);
      for (let h = 0; h < H; h++) {
        let reach = 1, ev = 0;
        for (let j = i + 1; j < N; j++) {
          const c = call[i][j]; let wt = 0, wc = 0, eq = 0;
          for (let g = 0; g < H; g++) { const w = W[h][g]; if (!w) continue; wt += w; const x = w * c[g]; wc += x; eq += x * EQ[h][g]; }
          const pc = wt ? wc / wt : 0;
          if (pc > 0) ev += reach * pc * ((eq / wc) * potOf(i, j) - eff(i, j));
          reach *= 1 - pc;
        }
        ev += reach * (2.5 - post[i]);
        br[h] = ev > -post[i] ? 1 : 0;
      }
      brShove[i] = br;
    }
    for (let i = 0; i < N - 1; i++) {
      for (let h = 0; h < H; h++) shove[i][h] += lr * (brShove[i][h] - shove[i][h]);
      for (let j = i + 1; j < N; j++) for (let h = 0; h < H; h++) call[i][j][h] += lr * (brCall[i][j][h] - call[i][j][h]);
    }
  }
  return { shove, call };
}
module.exports = { solve };

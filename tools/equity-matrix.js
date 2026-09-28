// Monte Carlo equity for every pair of the 169 hand classes, with card removal.
// Output: tools/data/matrix.json = { EQ[i][j]: equity of class i vs class j, W[i][j]: number of non-conflicting combo pairs }
// Usage: node tools/equity-matrix.js [trialsPerMatchup=20000]   (about 2.5 minutes on 2 cores at 20000)
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os'), fs = require('fs'), path = require('path');
const { rank7, CLASSES } = require('./evaluator');

function matchup(i, j, T) {
  const valid = [];
  for (const x of CLASSES[i].combos) for (const y of CLASSES[j].combos)
    if (x[0] !== y[0] && x[0] !== y[1] && x[1] !== y[0] && x[1] !== y[1]) valid.push([x, y]);
  if (!valid.length) return [0, 0];
  let won = 0;
  for (let t = 0; t < T; t++) {
    const [x, y] = valid[(Math.random() * valid.length) | 0];
    const used = [x[0], x[1], y[0], y[1]], board = [];
    while (board.length < 5) { const c = (Math.random() * 52) | 0; if (!used.includes(c) && !board.includes(c)) board.push(c); }
    const a = rank7([x[0], x[1], ...board]), b = rank7([y[0], y[1], ...board]);
    won += a > b ? 1 : a === b ? 0.5 : 0;
  }
  return [won / T, valid.length];
}

if (isMainThread) {
  const T = +process.argv[2] || 20000, n = Math.max(1, os.cpus().length);
  const jobs = []; for (let i = 0; i < 169; i++) for (let j = i; j < 169; j++) jobs.push([i, j]);
  const EQ = Array.from({ length: 169 }, () => new Array(169).fill(0));
  const W = Array.from({ length: 169 }, () => new Array(169).fill(0));
  let done = 0;
  console.log(`Simulating ${jobs.length} matchups x ${T} boards on ${n} threads...`);
  for (let w = 0; w < n; w++) {
    const worker = new Worker(__filename, { workerData: { jobs: jobs.filter((_, k) => k % n === w), T } });
    worker.on('message', res => {
      for (const [i, j, e, c] of res) { EQ[i][j] = e; EQ[j][i] = c ? 1 - e : 0; W[i][j] = W[j][i] = c; }
      if (++done === n) {
        const out = path.join(__dirname, 'data', 'matrix.json');
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, JSON.stringify({ trials: T, EQ: EQ.map(r => r.map(v => +v.toFixed(4))), W }));
        console.log('Saved', out);
      }
    });
  }
} else {
  parentPort.postMessage(workerData.jobs.map(([i, j]) => [i, j, ...matchup(i, j, workerData.T)]));
}

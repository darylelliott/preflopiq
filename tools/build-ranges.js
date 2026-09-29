// Rebuilds the range data embedded in index.html from tools/data/matrix.json:
//   EQA  - each hand's all-in equity vs a random hand (drives the modeled 25-100bb ranges)
//   NASH - push/fold Nash solutions for 2-9 players at each stack depth in STACKS
// Usage: node tools/build-ranges.js
const fs = require('fs'), path = require('path');
const { solve } = require('./nash');
const STACKS = [10, 15];
const root = path.join(__dirname, '..', 'public');
const matrix = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'matrix.json'), 'utf8'));

const EQA = matrix.EQ.map((row, i) => {
  let w = 0, e = 0; row.forEach((v, j) => { w += matrix.W[i][j]; e += matrix.W[i][j] * v; });
  return +(e / w * 100).toFixed(1);
});
const hex = f => { let s = ''; for (let k = 0; k < 169; k += 4) { let v = 0; for (let b = 0; b < 4; b++) if (k + b < 169 && f[k + b] >= 0.5) v |= 1 << b; s += v.toString(16); } return s; };
const NASH = {};
for (const S of STACKS) for (let N = 2; N <= 9; N++) {
  process.stdout.write(`Solving ${N}-handed ${S}bb... `);
  const r = solve(N, S, matrix);
  const o = { s: r.shove.map(hex), c: {} };
  for (let i = 0; i < N - 1; i++) for (let j = i + 1; j < N; j++) o.c[`${i}-${j}`] = hex(r.call[i][j]);
  NASH[`${N}-${S}`] = o;
  console.log('done');
}
const file = path.join(root, 'engine.js');
let html = fs.readFileSync(file, 'utf8');
const swap = (name, value) => {
  const re = new RegExp(`const ${name}=.*?;\\n`);
  if (!re.test(html)) throw new Error(`Could not find "const ${name}=" in engine.js`);
  html = html.replace(re, `const ${name}=${JSON.stringify(value)};\n`);
};
swap('EQA', EQA); swap('NASH', NASH);
fs.writeFileSync(file, html);
console.log('Updated engine.js');

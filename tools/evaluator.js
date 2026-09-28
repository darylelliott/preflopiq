// 7-card poker hand evaluator. Cards are ints 0..51: rank = c >> 2 (0 = deuce ... 12 = ace), suit = c & 3.
// Returns a number where higher beats lower.
function straightHigh(m) {
  for (let h = 12; h >= 4; h--) { const mask = 0x1f << (h - 4); if ((m & mask) === mask) return h; }
  return (m & 0x100f) === 0x100f ? 3 : -1; // wheel A-2-3-4-5
}
function rank7(c) {
  const cnt = new Array(13).fill(0), sc = [0, 0, 0, 0], sm = [0, 0, 0, 0];
  for (const x of c) { const r = x >> 2, s = x & 3; cnt[r]++; sc[s]++; sm[s] |= 1 << r; }
  for (let s = 0; s < 4; s++) if (sc[s] >= 5) {
    const sh = straightHigh(sm[s]); if (sh >= 0) return 8e6 + sh;
    let v = 0, n = 0; for (let r = 12; r >= 0 && n < 5; r--) if (sm[s] >> r & 1) { v = v * 13 + r; n++; }
    return 5e6 + v;
  }
  let m = 0; for (let r = 0; r < 13; r++) if (cnt[r]) m |= 1 << r;
  const q = [], t = [], p = [], k = [];
  for (let r = 12; r >= 0; r--) { if (cnt[r] === 4) q.push(r); else if (cnt[r] === 3) t.push(r); else if (cnt[r] === 2) p.push(r); else if (cnt[r] === 1) k.push(r); }
  if (q.length) return 7e6 + q[0] * 13 + Math.max(...t, ...p, ...k);
  if (t.length >= 2 || (t.length && p.length)) return 6e6 + t[0] * 13 + (t.length >= 2 ? Math.max(t[1], p[0] ?? -1) : p[0]);
  const sh = straightHigh(m); if (sh >= 0) return 4e6 + sh;
  if (t.length) return 3e6 + t[0] * 169 + k[0] * 13 + k[1];
  if (p.length >= 2) return 2e6 + p[0] * 169 + p[1] * 13 + Math.max(...p.slice(2), ...k);
  if (p.length) return 1e6 + p[0] * 2197 + k[0] * 169 + k[1] * 13 + k[2];
  return k.slice(0, 5).reduce((a, b) => a * 13 + b, 0);
}
// The 169 starting-hand classes in chart order (row = first card, suited above the diagonal),
// each as its list of card combos.
const R = '23456789TJQKA';
const CLASSES = [];
for (let a = 0; a < 13; a++) for (let b = 0; b < 13; b++) {
  const ra = 12 - a, rb = 12 - b;
  let hi, lo, suited, name;
  if (a === b) { hi = lo = ra; suited = null; name = R[ra] + R[ra]; }
  else if (a < b) { hi = ra; lo = rb; suited = true; name = R[hi] + R[lo] + 's'; }
  else { hi = rb; lo = ra; suited = false; name = R[hi] + R[lo] + 'o'; }
  const combos = [];
  for (let s1 = 0; s1 < 4; s1++) for (let s2 = 0; s2 < 4; s2++) {
    if (hi === lo) { if (s2 <= s1) continue; } else if (suited && s1 !== s2) continue; else if (!suited && s1 === s2) continue;
    combos.push([hi * 4 + s1, lo * 4 + s2]);
  }
  CLASSES.push({ name, combos });
}
module.exports = { rank7, CLASSES };

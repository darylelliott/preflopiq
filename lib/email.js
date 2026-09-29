// Reminder email logic shared by the reminders Worker and /api/unsubscribe:
// streak math (matches public/player.js), leak finding, signed unsubscribe links, and the templates.

// ---------- dates in the player's own time zone ----------
export function localParts(timeZone, now = new Date()) {
  let tz = timeZone;
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); } catch { tz = 'America/New_York'; }
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', weekday: 'short' })
    .formatToParts(now).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: +p.hour, weekday: p.weekday };
}
const addDays = (key, n) => { const d = new Date(key + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const weekOf = key => { const d = new Date(key + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); };

// ---------- streak: a day counts at 10 hands; one missed day per week is covered by a freeze ----------
export const DAY_GOAL = 10;
export function streak(play, today) {
  play = play || {};
  const ok = k => (play[k] || 0) >= DAY_GOAL, used = new Set();
  let n = 0, k = addDays(today, -1);
  for (let i = 0; i < 800; i++) {
    if (ok(k)) { n++; k = addDays(k, -1); continue; }
    const w = weekOf(k), prev = addDays(k, -1);
    if (!used.has(w) && ok(prev)) { used.add(w); k = prev; continue; }
    break;
  }
  const doneToday = ok(today);
  return { days: n + (doneToday ? 1 : 0), doneToday, today: play[today] || 0, alive: n > 0 };
}

// ---------- stats summaries for the weekly recap ----------
export function iq(stats) { const h = (stats && stats.hist) || []; if (h.length < 20) return null; let w = 0, p = 0; h.forEach(x => { w += x.w; p += x.w * x.p; }); return Math.round(25 + 120 * p / w); }
const TIERS = [[135, 'Solver-brained'], [120, 'Shark'], [105, 'Regular'], [90, 'Recreational'], [0, 'Fish']];
export const tier = v => TIERS.find(t => v >= t[0])[1];
const RANKS = ['Home Game', 'Local Card Room', 'Daily Tournament', 'Circuit Regular', 'Main Event', 'High Roller', 'Super High Roller'];
export const rankName = stats => RANKS[Math.min(RANKS.length - 1, (stats && stats.rankIdx) || 0)];
export function handsInWeek(play, today) { let t = 0; for (let i = 0; i < 7; i++) t += (play || {})[addDays(today, -i)] || 0; return t; }
export function lastActive(play) { const keys = Object.keys(play || {}).filter(k => play[k] > 0).sort(); return keys[keys.length - 1] || null; }
export function topLeak(stats) {
  const best = Object.entries((stats && stats.per) || {}).map(([key, p]) => ({ key, ...p, acc: p.c / p.n }))
    .filter(x => x.n >= 6 && x.acc < 0.85).sort((a, b) => (b.n - b.c) - (a.n - a.c) || a.acc - b.acc)[0];
  if (!best) return null;
  const m = best.key.match(/^(\d+)-(\d+)-(.+)$/); if (!m) return null;
  const [, n, d, id] = m, parts = id.split('-'), verb = +d <= 15 ? 'shove' : 'open';
  const name = parts[0] === 'rfi' ? `${parts.slice(1).join('-')} ${verb}` : `${parts[1]} vs ${parts.slice(2).join('-')} ${verb}`;
  return { key: best.key, name, format: `${+n === 2 ? 'Heads-up' : n + '-handed'} · ${d}bb`, acc: Math.round(best.acc * 100), n: best.n };
}

// ---------- signed unsubscribe links ----------
async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
}
export async function unsubscribeUrl(site, secret, userId, kind) {
  return `${site}/api/unsubscribe?u=${userId}&k=${kind}&t=${await hmac(secret, `${userId}:${kind}`)}`;
}
export async function verifyUnsubscribe(secret, userId, kind, token) {
  const good = await hmac(secret, `${userId}:${kind}`);
  if (!token || token.length !== good.length) return false;
  let r = 0; for (let i = 0; i < good.length; i++) r |= good.charCodeAt(i) ^ token.charCodeAt(i);
  return r === 0;
}

// ---------- templates ----------
const escape = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function shell({ title, body, cta, ctaUrl, unsub, why }) {
  return `<!doctype html><html><body style="margin:0;background:#e6ebe7;font-family:Helvetica,Arial,sans-serif;color:#15191c">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e6ebe7;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;overflow:hidden">
<tr><td style="background:#1d5946;padding:22px 26px;border-bottom:8px solid #3b2c23">
<div style="font:700 13px Arial,sans-serif;letter-spacing:2px;color:#f0cf7a">PREFLOP IQ</div>
<div style="font:800 26px/1.15 Arial,sans-serif;color:#ffffff;margin-top:6px">${escape(title)}</div></td></tr>
<tr><td style="padding:22px 26px;font-size:15px;line-height:1.55">${body}
<p style="margin:22px 0 4px"><a href="${ctaUrl}" style="display:inline-block;background:#c23a2e;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px">${escape(cta)}</a></p></td></tr>
<tr><td style="padding:14px 26px 22px;font-size:12px;color:#56615b;border-top:1px solid #e1e6e2">${escape(why)} <a href="${unsub}" style="color:#56615b">Unsubscribe</a></td></tr>
</table></td></tr></table></body></html>`;
}
export function streakEmail({ site, days, today, unsub }) {
  const left = DAY_GOAL - today;
  const subject = `Your ${days}-day streak ends at midnight`;
  const body = `<p style="margin:0 0 12px">You've trained ${days} days in a row. ${today ? `You're ${left} hand${left === 1 ? '' : 's'} short today.` : 'Ten hands today keeps it going.'}</p>
<p style="margin:0">Today's daily challenge covers it in one go: ten hands, about two minutes.</p>`;
  const text = `You've trained ${days} days in a row. ${today ? `You're ${left} hands short today.` : 'Ten hands today keeps it going.'}\n\nPlay today's challenge: ${site}/daily/\n\nUnsubscribe: ${unsub}`;
  return { subject, html: shell({ title: subject, body, cta: "Play today's challenge", ctaUrl: `${site}/daily/`, unsub, why: 'You get this because streak reminders are on in your Preflop IQ account.' }), text };
}
export function weeklyEmail({ site, hands, iqNow, streakDays, rank, leak, unsub }) {
  const subject = hands ? `Your week: ${hands} hands${iqNow ? `, Preflop IQ ${iqNow}` : ''}` : 'Your seat is still warm';
  const rows = [['Hands this week', hands], ['Preflop IQ', iqNow ? `${iqNow} (${tier(iqNow)})` : 'Needs 20 hands'], ['Day streak', streakDays], ['Rank', rank]]
    .map(([k, v]) => `<tr><td style="padding:6px 0;color:#56615b">${k}</td><td style="padding:6px 0;text-align:right;font-weight:700">${escape(v)}</td></tr>`).join('');
  const leakHtml = leak ? `<p style="margin:16px 0 0"><b>Biggest leak:</b> ${escape(leak.name)} (${escape(leak.format)}), ${leak.acc}% over ${leak.n} hands. Ten minutes on it this week will show.</p>` : '';
  const body = `${hands ? '' : `<p style="margin:0 0 12px">No hands this week. Here's where you left off.</p>`}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px">${rows}</table>${leakHtml}`;
  const cta = leak ? 'Drill your leak' : 'Keep training';
  const ctaUrl = leak ? `${site}/?drill=${encodeURIComponent(leak.key)}` : `${site}/`;
  const text = `Hands this week: ${hands}\nPreflop IQ: ${iqNow || 'needs 20 hands'}\nDay streak: ${streakDays}\nRank: ${rank}\n${leak ? `Biggest leak: ${leak.name} (${leak.format}), ${leak.acc}%\n` : ''}\n${cta}: ${ctaUrl}\n\nUnsubscribe: ${unsub}`;
  return { subject, html: shell({ title: subject, body, cta, ctaUrl, unsub, why: 'You get this because the weekly recap is on in your Preflop IQ account.' }), text };
}

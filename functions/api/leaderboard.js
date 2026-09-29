// GET /api/leaderboard?day=YYYY-MM-DD  ->  { day, daily: [...], weekly: [...], me }
// Public. Top 50 for the day, and totals over the seven days ending that day.
import { json, handle, requireEnv, HttpError } from '../../lib/server.js';

function sb(env, path) {
  return fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } })
    .then(r => { if (!r.ok) throw new HttpError(502, 'Could not load the leaderboard.'); return r.json(); });
}
const nameOf = (p, id) => (p && p.display_name) || `Player ${id.slice(0, 4)}`;

export const onRequestGet = handle(async ({ request, env }) => {
  requireEnv(env, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  const url = new URL(request.url);
  const day = url.searchParams.get('day') || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new HttpError(400, 'Bad date.');
  const start = new Date(Date.parse(day) - 6 * 86400000).toISOString().slice(0, 10);

  const [daily, week] = await Promise.all([
    sb(env, `daily_scores?day=eq.${day}&select=user_id,score,created_at&order=score.desc,created_at.asc&limit=50`),
    sb(env, `daily_scores?day=gte.${start}&day=lte.${day}&select=user_id,score,created_at&limit=5000`),
  ]);
  const totals = {};
  for (const r of week) { const t = totals[r.user_id] || (totals[r.user_id] = { user_id: r.user_id, total: 0, days: 0, first: r.created_at }); t.total += r.score; t.days++; if (r.created_at < t.first) t.first = r.created_at; }
  const weekly = Object.values(totals).sort((a, b) => b.total - a.total || b.days - a.days || a.first.localeCompare(b.first)).slice(0, 50);

  const ids = [...new Set([...daily.map(r => r.user_id), ...weekly.map(r => r.user_id)])];
  const profiles = ids.length ? await sb(env, `profiles?id=in.(${ids.join(',')})&select=id,display_name`) : [];
  const byId = Object.fromEntries(profiles.map(p => [p.id, p]));

  // If the caller is signed in, mark their rows.
  let me = null;
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (token) {
    const u = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${token}` } });
    if (u.ok) me = (await u.json()).id;
  }
  const rank = (arr, key) => { let last = null, r = 0; return arr.map((x, i) => { if (x[key] !== last) { r = i + 1; last = x[key]; } return r; }); };
  const dr = rank(daily, 'score'), wr = rank(weekly, 'total');
  return json({
    day,
    daily: daily.map((r, i) => ({ rank: dr[i], name: nameOf(byId[r.user_id], r.user_id), score: r.score, me: r.user_id === me })),
    weekly: weekly.map((r, i) => ({ rank: wr[i], name: nameOf(byId[r.user_id], r.user_id), total: r.total, days: r.days, me: r.user_id === me })),
  });
});

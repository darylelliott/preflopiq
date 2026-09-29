// POST /api/daily-submit  { day: "YYYY-MM-DD", picks: [10 actions] }  ->  { score, marks, saved }
// Scores the picks on the server with the same engine as the site. The first submission per day counts.
import { json, handle, requireEnv, getUser, HttpError, readJson } from '../../lib/server.js';
import { DAILY } from '../../lib/engine.mjs';

const ACTIONS = new Set(['fold', 'call', 'limp', 'raise', '3bet']);
const dayOffset = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

export const onRequestPost = handle(async ({ request, env }) => {
  requireEnv(env, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  const user = await getUser(request, env);
  const { day, picks } = await readJson(request);
  // Players are in every time zone, so "today" may be yesterday or tomorrow in UTC.
  if (!DAILY.valid(day || '') || day < dayOffset(-1) || day > dayOffset(1)) throw new HttpError(400, 'That daily challenge is closed.');
  if (!Array.isArray(picks) || picks.length !== DAILY.COUNT || !picks.every(p => ACTIONS.has(p))) throw new HttpError(400, 'Send one answer for each of the ten hands.');
  const { score, marks } = DAILY.score(day, picks);
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/daily_scores?on_conflict=user_id,day`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'content-type': 'application/json', prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify({ user_id: user.id, day, score, picks }),
  });
  if (!res.ok) throw new HttpError(502, 'Could not save your score.');
  const rows = await res.json();
  return json({ score, marks, saved: rows.length > 0 });
});

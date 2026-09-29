// Owner tools: look up accounts and give (or take away) free Pro.
// Only accounts whose user ID is listed in the ADMIN_USER_IDS environment variable
// (comma-separated, in Cloudflare) can use it. IDs, not emails: with email confirmation off,
// anyone could sign up with an unclaimed address, but nobody can choose their user ID.
//   GET  /api/admin?q=text   ->  { stats, users }   (q matches email, name or leaderboard name; blank = newest 50)
//   POST /api/admin  { user_id, comp: true|false }  ->  { ok: true }
import { json, handle, requireEnv, getUser, sb, HttpError, readJson } from '../../lib/server.js';

async function requireAdmin(request, env) {
  const user = await getUser(request, env);
  const admins = (env.ADMIN_USER_IDS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!admins.includes(String(user.id).toLowerCase())) throw new HttpError(403, 'This page is for the site owner.');
  requireEnv(env, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  return user;
}
// Row count for a REST query, without downloading the rows.
async function count(env, path) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, { method: 'HEAD', headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, prefer: 'count=exact' } });
  if (!res.ok) throw new HttpError(502, 'Could not count accounts.');
  return +((res.headers.get('content-range') || '*/0').split('/')[1]) || 0;
}
const COLS = 'id,email,full_name,display_name,plays,created_at,trial_ends,comp,hands_played';
// PostgREST filter values: strip characters that would change the filter's meaning.
const clean = q => q.replace(/[,()*%\\:"']/g, ' ').trim().slice(0, 60);

export const onRequestGet = handle(async ({ request, env }) => {
  await requireAdmin(request, env);
  const q = clean(new URL(request.url).searchParams.get('q') || '');
  const filter = q ? `&or=(email.ilike.*${encodeURIComponent(q)}*,full_name.ilike.*${encodeURIComponent(q)}*,display_name.ilike.*${encodeURIComponent(q)}*)` : '';
  const now = new Date().toISOString();
  const [users, total, onTrial, comped, paying] = await Promise.all([
    sb(env, `profiles?select=${COLS}${filter}&order=created_at.desc&limit=50`),
    count(env, 'profiles?select=id'),
    count(env, `profiles?select=id&comp=eq.false&trial_ends=gt.${now}`),
    count(env, 'profiles?select=id&comp=eq.true'),
    count(env, 'subscriptions?select=user_id&status=in.(active,trialing)'),
  ]);
  const subs = users.length ? await sb(env, `subscriptions?user_id=in.(${users.map(u => u.id).join(',')})&select=user_id,status,current_period_end,cancel_at_period_end`) : [];
  const subBy = Object.fromEntries(subs.map(s => [s.user_id, s]));
  return json({ stats: { users: total, onTrial, paying, comped }, users: users.map(u => ({ ...u, sub: subBy[u.id] || null })) });
});

export const onRequestPost = handle(async ({ request, env }) => {
  await requireAdmin(request, env);
  const body = await readJson(request);
  if (!/^[0-9a-f-]{36}$/i.test(body.user_id || '') || typeof body.comp !== 'boolean') throw new HttpError(400, 'Send a user_id and comp: true or false.');
  const rows = await sb(env, `profiles?id=eq.${body.user_id}`, { method: 'PATCH', body: { comp: body.comp }, prefer: 'return=representation' });
  if (!rows || !rows.length) throw new HttpError(404, 'No account with that id.');
  return json({ ok: true, comp: rows[0].comp });
});

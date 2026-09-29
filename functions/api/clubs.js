// Clubs: small private groups (home games, study groups) with their own daily challenge board.
// GET  /api/clubs                        -> { clubs: [{ id, name, invite_code, owner, members }] }
// GET  /api/clubs?board=<id>&day=DATE    -> { club, day, rows: [{ name, today, week, days, me }] }
// POST /api/clubs { action: 'create', name } | { action: 'join', code } | { action: 'leave', club }
import { json, handle, requireEnv, getUser, sb, HttpError, readJson } from '../../lib/server.js';

const MAX_CLUBS = 10, MAX_MEMBERS = 200;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // no 0/O or 1/I
const newCode = () => [...crypto.getRandomValues(new Uint8Array(6))].map(b => ALPHABET[b % ALPHABET.length]).join('');
const isUuid = s => /^[0-9a-f-]{36}$/i.test(s || '');
const nameOf = (p, id) => (p && p.display_name) || `Player ${id.slice(0, 4)}`;

async function myClubs(env, userId) {
  const rows = await sb(env, `club_members?user_id=eq.${userId}&select=club_id`);
  if (!rows.length) return [];
  const ids = rows.map(r => r.club_id).join(',');
  const [clubs, members] = await Promise.all([
    sb(env, `clubs?id=in.(${ids})&select=id,name,invite_code,owner_id,created_at&order=created_at.asc`),
    sb(env, `club_members?club_id=in.(${ids})&select=club_id`),
  ]);
  const count = {}; members.forEach(m => count[m.club_id] = (count[m.club_id] || 0) + 1);
  return clubs.map(c => ({ id: c.id, name: c.name, invite_code: c.invite_code, owner: c.owner_id === userId, members: count[c.id] || 0 }));
}

async function board(env, userId, clubId, day) {
  if (!isUuid(clubId)) throw new HttpError(400, 'Unknown club.');
  const mine = await sb(env, `club_members?club_id=eq.${clubId}&user_id=eq.${userId}&select=user_id`);
  if (!mine.length) throw new HttpError(403, 'You are not in this club.');
  const [club] = await sb(env, `clubs?id=eq.${clubId}&select=id,name`);
  const members = await sb(env, `club_members?club_id=eq.${clubId}&select=user_id`);
  const ids = members.map(m => m.user_id);
  const start = new Date(Date.parse(day) - 6 * 86400000).toISOString().slice(0, 10);
  const [profiles, scores] = await Promise.all([
    sb(env, `profiles?id=in.(${ids.join(',')})&select=id,display_name`),
    sb(env, `daily_scores?user_id=in.(${ids.join(',')})&day=gte.${start}&day=lte.${day}&select=user_id,day,score`),
  ]);
  const byId = Object.fromEntries(profiles.map(p => [p.id, p]));
  const rows = ids.map(id => {
    const mineScores = scores.filter(s => s.user_id === id);
    const today = mineScores.find(s => s.day === day);
    return { name: nameOf(byId[id], id), today: today ? today.score : null, week: mineScores.reduce((t, s) => t + s.score, 0), days: mineScores.length, me: id === userId };
  }).sort((a, b) => b.week - a.week || (b.today ?? -1) - (a.today ?? -1) || a.name.localeCompare(b.name));
  return { club, day, rows };
}

export const onRequestGet = handle(async ({ request, env }) => {
  requireEnv(env, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  const user = await getUser(request, env);
  const url = new URL(request.url);
  const clubId = url.searchParams.get('board');
  if (clubId) {
    const day = url.searchParams.get('day') || new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new HttpError(400, 'Bad date.');
    return json(await board(env, user.id, clubId, day));
  }
  return json({ clubs: await myClubs(env, user.id) });
});

export const onRequestPost = handle(async ({ request, env }) => {
  requireEnv(env, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  const user = await getUser(request, env);
  const body = await readJson(request);
  const current = await myClubs(env, user.id);

  if (body.action === 'create') {
    const name = String(body.name || '').trim().replace(/\s+/g, ' ');
    if (name.length < 3 || name.length > 40) throw new HttpError(400, 'Club names are 3 to 40 characters.');
    if (current.length >= MAX_CLUBS) throw new HttpError(400, `You can be in up to ${MAX_CLUBS} clubs.`);
    for (let i = 0; i < 5; i++) {
      try {
        const [club] = await sb(env, 'clubs', { method: 'POST', body: { name, invite_code: newCode(), owner_id: user.id }, prefer: 'return=representation' });
        await sb(env, 'club_members', { method: 'POST', body: { club_id: club.id, user_id: user.id }, prefer: 'return=minimal' });
        return json({ club: { id: club.id, name: club.name, invite_code: club.invite_code, owner: true, members: 1 } });
      } catch (e) { if (e.status !== 409) throw e; }   // invite code collision: try another
    }
    throw new HttpError(500, 'Could not create the club. Try again.');
  }

  if (body.action === 'join') {
    const code = String(body.code || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) throw new HttpError(400, 'Invite codes are 6 letters and numbers.');
    const [club] = await sb(env, `clubs?invite_code=eq.${code}&select=id,name,invite_code,owner_id`);
    if (!club) throw new HttpError(404, 'No club has that invite code.');
    if (current.some(c => c.id === club.id)) return json({ club: current.find(c => c.id === club.id), already: true });
    if (current.length >= MAX_CLUBS) throw new HttpError(400, `You can be in up to ${MAX_CLUBS} clubs.`);
    const members = await sb(env, `club_members?club_id=eq.${club.id}&select=user_id`);
    if (members.length >= MAX_MEMBERS) throw new HttpError(400, 'That club is full.');
    await sb(env, 'club_members', { method: 'POST', body: { club_id: club.id, user_id: user.id }, prefer: 'return=minimal' });
    return json({ club: { id: club.id, name: club.name, invite_code: club.invite_code, owner: club.owner_id === user.id, members: members.length + 1 } });
  }

  if (body.action === 'leave') {
    if (!isUuid(body.club)) throw new HttpError(400, 'Unknown club.');
    const c = current.find(x => x.id === body.club);
    if (!c) throw new HttpError(404, 'You are not in that club.');
    await sb(env, `club_members?club_id=eq.${c.id}&user_id=eq.${user.id}`, { method: 'DELETE' });
    // The last member out closes the club.
    if (c.members <= 1) await sb(env, `clubs?id=eq.${c.id}`, { method: 'DELETE' });
    return json({ left: true });
  }
  throw new HttpError(400, 'Unknown action.');
});

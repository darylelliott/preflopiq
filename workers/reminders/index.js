// Preflop IQ reminder emails. A Cloudflare Worker that runs every hour (see wrangler.toml).
// For each player with an email and reminders on, in their own time zone:
//   7 p.m.         streak reminder, if their streak is alive and today isn't done yet
//   Sunday 10 a.m. weekly recap, if they've played in the last three weeks
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, EMAIL_SECRET
// Vars:    EMAIL_FROM (e.g. "Preflop IQ <hello@yourdomain.com>"), SITE_URL
import { localParts, streak, iq, rankName, handsInWeek, lastActive, topLeak, unsubscribeUrl, streakEmail, weeklyEmail } from '../../lib/email.js';

const STREAK_HOUR = 19, WEEKLY_HOUR = 10, PAGE = 500;

async function sb(env, path, init = {}) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init, headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'content-type': 'application/json', ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  const t = await res.text(); return t ? JSON.parse(t) : null;
}
async function send(env, to, mail, unsub) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject: mail.subject, html: mail.html, text: mail.text,
      headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

// Decides what (if anything) a player gets this hour. Exported for tests.
export function plan(p, now = new Date()) {
  if (!p.email) return null;
  const prefs = p.email_prefs || {}, stats = p.stats || {}, play = stats.play || {};
  const t = localParts(p.timezone || 'America/New_York', now);
  if (prefs.streak !== false && t.hour === STREAK_HOUR && p.last_streak_email !== t.date) {
    const s = streak(play, t.date);
    if (s.alive && !s.doneToday && s.days >= 2) return { kind: 'streak', date: t.date, days: s.days, today: s.today };
  }
  if (prefs.weekly !== false && t.weekday === 'Sun' && t.hour === WEEKLY_HOUR && p.last_weekly_email !== t.date) {
    const last = lastActive(play);
    if (last && (Date.parse(t.date) - Date.parse(last)) / 86400000 <= 21) {
      return { kind: 'weekly', date: t.date, hands: handsInWeek(play, t.date), iqNow: iq(stats), streakDays: streak(play, t.date).days, rank: rankName(stats), leak: topLeak(stats) };
    }
  }
  return null;
}

async function run(env, now = new Date()) {
  const site = env.SITE_URL.replace(/\/$/, '');
  let sent = 0, failed = 0;
  for (let offset = 0; ; offset += PAGE) {
    const rows = await sb(env, `profiles?email=not.is.null&select=id,email,timezone,email_prefs,stats,last_streak_email,last_weekly_email&order=id&limit=${PAGE}&offset=${offset}`);
    for (const p of rows) {
      const job = plan(p, now);
      if (!job) continue;
      try {
        const unsub = await unsubscribeUrl(site, env.EMAIL_SECRET, p.id, job.kind);
        const mail = job.kind === 'streak' ? streakEmail({ site, days: job.days, today: job.today, unsub })
          : weeklyEmail({ site, hands: job.hands, iqNow: job.iqNow, streakDays: job.streakDays, rank: job.rank, leak: job.leak, unsub });
        await send(env, p.email, mail, unsub);
        await sb(env, `profiles?id=eq.${p.id}`, { method: 'PATCH', headers: { prefer: 'return=minimal' },
          body: JSON.stringify(job.kind === 'streak' ? { last_streak_email: job.date } : { last_weekly_email: job.date }) });
        sent++;
      } catch (e) { failed++; console.error(`Email to ${p.id} failed:`, e.message); }
    }
    if (rows.length < PAGE) break;
  }
  console.log(`Reminders: ${sent} sent, ${failed} failed`);
  return { sent, failed };
}

export default {
  async scheduled(event, env, ctx) { ctx.waitUntil(run(env, new Date(event.scheduledTime))); },
  // A manual trigger for testing: GET /?key=EMAIL_SECRET runs one pass now.
  async fetch(request, env) {
    const key = new URL(request.url).searchParams.get('key');
    if (!env.EMAIL_SECRET || key !== env.EMAIL_SECRET) return new Response('Not found', { status: 404 });
    return Response.json(await run(env));
  },
};

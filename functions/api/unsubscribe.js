// GET or POST /api/unsubscribe?u=<user id>&k=streak|weekly&t=<signature>
// Turns off one kind of reminder email. The signature comes from the link in the email,
// so no sign-in is needed. POST supports mail apps' one-click unsubscribe.
import { handle, requireEnv, sb, HttpError } from '../../lib/server.js';
import { verifyUnsubscribe } from '../../lib/email.js';

const NAMES = { streak: 'streak reminders', weekly: 'the weekly recap' };
const page = (title, msg, status = 200) => new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} · Preflop IQ</title><body style="margin:0;font-family:system-ui,sans-serif;background:#e6ebe7;color:#15191c">
<div style="max-width:480px;margin:10vh auto;background:#fff;border-radius:14px;padding:28px 26px;border-top:8px solid #1d5946">
<h1 style="margin:0 0 10px;font-size:1.5rem">${title}</h1><p style="margin:0 0 18px;line-height:1.5">${msg}</p>
<a href="/account/" style="color:#2a61a5">Email settings</a> · <a href="/" style="color:#2a61a5">Back to training</a></div></body>`,
  { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });

async function unsubscribe({ request, env }) {
  requireEnv(env, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'EMAIL_SECRET']);
  const q = new URL(request.url).searchParams, u = q.get('u') || '', k = q.get('k') || '', t = q.get('t') || '';
  if (!/^[0-9a-f-]{36}$/i.test(u) || !NAMES[k] || !(await verifyUnsubscribe(env.EMAIL_SECRET, u, k, t)))
    return page('That link didn’t work', 'It may be incomplete. You can turn emails off from your account page instead.', 400);
  const [p] = await sb(env, `profiles?id=eq.${u}&select=email_prefs`);
  if (!p) throw new HttpError(404, 'Account not found.');
  await sb(env, `profiles?id=eq.${u}`, { method: 'PATCH', body: { email_prefs: { ...(p.email_prefs || {}), [k]: false } }, prefer: 'return=minimal' });
  return page('You’re unsubscribed', `You won’t get ${NAMES[k]} any more. Everything else stays as it was.`);
}
export const onRequestGet = handle(unsubscribe);
export const onRequestPost = handle(unsubscribe);

// DELETE /api/account  ->  { ok: true }
// Permanently deletes the signed-in player's account. Cancels an active Stripe subscription
// first (if payments are set up), then deletes the auth user; profiles, scores, club
// memberships and clubs they own go with it (foreign keys cascade).
import { json, handle, requireEnv, getUser, getSubscriptionRow, stripe, HttpError } from '../../lib/server.js';

export const onRequestDelete = handle(async ({ request, env }) => {
  requireEnv(env, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  const user = await getUser(request, env);
  if (env.STRIPE_SECRET_KEY) {
    const sub = await getSubscriptionRow(env, user.id);
    if (sub?.stripe_subscription_id && ['active', 'trialing', 'past_due', 'unpaid'].includes(sub.status)) {
      await stripe(env, 'DELETE', `subscriptions/${encodeURIComponent(sub.stripe_subscription_id)}`);
    }
  }
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(user.id)}`, {
    method: 'DELETE',
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) throw new HttpError(502, 'Could not delete the account. Try again, or contact support.');
  return json({ ok: true });
});

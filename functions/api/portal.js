// POST /api/portal  ->  { url }  (Stripe customer portal: change plan, update card, cancel)
import { json, handle, requireEnv, getUser, getSubscriptionRow, stripe, HttpError } from '../../lib/server.js';

export const onRequestPost = handle(async ({ request, env }) => {
  requireEnv(env, ['STRIPE_SECRET_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  const user = await getUser(request, env);
  const row = await getSubscriptionRow(env, user.id);
  if (!row?.stripe_customer_id) throw new HttpError(404, 'No billing account yet. Choose a plan first.');
  const origin = new URL(request.url).origin;
  const session = await stripe(env, 'POST', 'billing_portal/sessions', { customer: row.stripe_customer_id, return_url: `${origin}/account/` });
  return json({ url: session.url });
});

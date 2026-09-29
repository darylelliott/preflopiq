// POST /api/checkout  { plan: "monthly" | "annual" }  ->  { url }  (Stripe Checkout page)
import { json, handle, requireEnv, getUser, getSubscriptionRow, upsertSubscription, stripe, HttpError } from '../../lib/server.js';

export const onRequestPost = handle(async ({ request, env }) => {
  requireEnv(env, ['STRIPE_SECRET_KEY', 'STRIPE_PRICE_MONTHLY', 'STRIPE_PRICE_ANNUAL', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  const user = await getUser(request, env);
  const { plan } = await request.json().catch(() => ({}));
  const price = plan === 'annual' ? env.STRIPE_PRICE_ANNUAL : plan === 'monthly' ? env.STRIPE_PRICE_MONTHLY : null;
  if (!price) throw new HttpError(400, 'Choose monthly or annual.');

  const existing = await getSubscriptionRow(env, user.id);
  if (existing && ['active', 'trialing'].includes(existing.status)) throw new HttpError(409, 'You already have Pro. Manage it from your account page.');

  let customer = existing?.stripe_customer_id;
  if (!customer) {
    const c = await stripe(env, 'POST', 'customers', { email: user.email, metadata: { user_id: user.id } });
    customer = c.id;
    await upsertSubscription(env, { user_id: user.id, stripe_customer_id: customer, status: existing?.status || 'none' });
  }

  const origin = new URL(request.url).origin;
  const session = await stripe(env, 'POST', 'checkout/sessions', {
    mode: 'subscription',
    customer,
    client_reference_id: user.id,
    line_items: { 0: { price, quantity: 1 } },
    subscription_data: { metadata: { user_id: user.id } },
    allow_promotion_codes: 'true',
    success_url: `${origin}/account/?checkout=success`,
    cancel_url: `${origin}/pricing/?checkout=canceled`,
  });
  return json({ url: session.url });
});

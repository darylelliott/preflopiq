// POST /api/stripe-webhook  (Stripe -> us). Keeps the subscriptions table in sync with Stripe.
// Stripe events to send: checkout.session.completed, customer.subscription.created,
// customer.subscription.updated, customer.subscription.deleted
import { json, handle, requireEnv, verifyStripeSignature, stripe, upsertSubscription, findUserIdByCustomer, HttpError } from '../../lib/server.js';

async function syncSubscription(env, sub, userIdHint) {
  const userId = userIdHint || sub.metadata?.user_id || await findUserIdByCustomer(env, sub.customer);
  if (!userId) { console.warn('No user for subscription', sub.id); return; }
  const item = sub.items?.data?.[0];
  const periodEnd = item?.current_period_end ?? sub.current_period_end;
  await upsertSubscription(env, {
    user_id: userId,
    stripe_customer_id: sub.customer,
    stripe_subscription_id: sub.id,
    status: sub.status,
    price_id: item?.price?.id || null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: !!sub.cancel_at_period_end,
  });
}

export const onRequestPost = handle(async ({ request, env }) => {
  requireEnv(env, ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  const payload = await request.text();
  if (payload.length > 1_000_000) throw new HttpError(413, 'Payload too large.');
  const ok = await verifyStripeSignature(payload, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET);
  if (!ok) throw new HttpError(400, 'Invalid signature');
  const event = JSON.parse(payload);
  const obj = event.data.object;

  switch (event.type) {
    case 'checkout.session.completed':
      if (obj.mode === 'subscription' && obj.subscription) {
        const sub = await stripe(env, 'GET', `subscriptions/${obj.subscription}`);
        await syncSubscription(env, sub, obj.client_reference_id);
      }
      break;
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await syncSubscription(env, obj);
      break;
  }
  return json({ received: true });
});

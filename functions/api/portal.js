// POST /api/portal  ->  { url }  (Stripe customer portal: change plan, update card, invoices, cancel)
// The portal's settings are created through the API the first time (tagged metadata.app =
// preflopiq), so nothing has to be configured by hand in the Stripe dashboard.
import { json, handle, requireEnv, getUser, getSubscriptionRow, stripe, priceIds, HttpError } from '../../lib/server.js';

async function portalConfig(env) {
  const list = await stripe(env, 'GET', 'billing_portal/configurations?active=true&limit=50');
  const mine = (list.data || []).find(c => c.metadata && c.metadata.app === 'preflopiq');
  if (mine) return mine.id;
  const { monthly, annual } = priceIds(env);
  const price = await stripe(env, 'GET', `prices/${monthly}`);
  const c = await stripe(env, 'POST', 'billing_portal/configurations', {
    business_profile: { headline: 'Manage your Preflop IQ Pro plan' },
    features: {
      customer_update: { enabled: 'true', allowed_updates: { 0: 'email' } },
      invoice_history: { enabled: 'true' },
      payment_method_update: { enabled: 'true' },
      subscription_cancel: { enabled: 'true', mode: 'at_period_end' },
      subscription_update: { enabled: 'true', default_allowed_updates: { 0: 'price' }, proration_behavior: 'create_prorations',
        products: { 0: { product: price.product, prices: { 0: monthly, 1: annual } } } },
    },
    metadata: { app: 'preflopiq' },
  });
  return c.id;
}

export const onRequestPost = handle(async ({ request, env }) => {
  requireEnv(env, ['STRIPE_SECRET_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  const user = await getUser(request, env);
  const row = await getSubscriptionRow(env, user.id);
  if (!row?.stripe_customer_id) throw new HttpError(404, 'No billing account yet. Choose a plan first.');
  const origin = new URL(request.url).origin;
  const session = await stripe(env, 'POST', 'billing_portal/sessions', { customer: row.stripe_customer_id, return_url: `${origin}/account/`, configuration: await portalConfig(env) });
  return json({ url: session.url });
});

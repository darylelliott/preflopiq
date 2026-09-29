# Turning on accounts and Pro

Until these steps are done the site stays fully free: no sign-in link, no paywall. Do everything in **Stripe test mode** first, check it end to end, then repeat the Stripe steps in live mode.

You'll set up three things: **Supabase** (accounts and database), **Stripe** (payments), and **Cloudflare** (the secret keys the payment endpoints use).

---

## 1. Supabase — accounts and database

1. Create a free project at [supabase.com](https://supabase.com). Pick a region near your players (US East is fine).
2. **SQL Editor → New query**, paste the contents of `supabase/schema.sql`, and click **Run**.
3. **Authentication → URL Configuration**
   - **Site URL:** `https://preflopiq.pages.dev` (change to your custom domain later)
   - **Redirect URLs:** add `https://preflopiq.pages.dev/account/**` (and the same for your custom domain later)
4. **Authentication → Emails → SMTP Settings:** turn on custom SMTP and enter any mail provider's SMTP details. Supabase's built-in sender only allows a handful of emails an hour, which isn't enough for sign-up confirmations on a live site.
5. **Project Settings → API:** copy the **Project URL** and the **anon / publishable key** into `public/config.js`. Both are safe to publish.
6. Also on that page, copy the **service_role / secret key**. It's for Cloudflare in step 3. **Never** put it in `config.js` or commit it.

## 2. Stripe — payments

1. **Product catalog → Add product:** name it `Preflop IQ Pro`, and add two recurring prices:
   - $7.99 USD, monthly
   - $59.00 USD, yearly

   Copy both **price IDs** (they start with `price_`).
2. **Developers → Webhooks → Add endpoint**
   - **Endpoint URL:** `https://preflopiq.pages.dev/api/stripe-webhook`
   - **Events:** `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`

   After saving, reveal and copy the **signing secret** (starts with `whsec_`).
3. **Settings → Billing → Customer portal:** turn on cancellation, card updates and invoice history, and allow switching between the monthly and yearly prices. Save.
4. **Developers → API keys:** copy the **secret key** (starts with `sk_test_` in test mode, `sk_live_` in live mode).

Before going live, Stripe will ask for business details. It also expects the site to show contact information, terms of service and a refund policy.

## 3. Cloudflare — secret keys

In Cloudflare, go to **Workers & Pages → preflopiq → Settings → Variables and secrets**, and add these to **Production** (and **Preview** if you want preview branches to take payments). Use the **Secret** type for the three keys.

| Name | Value |
|---|---|
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key (secret) |
| `STRIPE_SECRET_KEY` | Stripe secret key (secret) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (secret) |
| `STRIPE_PRICE_MONTHLY` | Monthly price ID |
| `STRIPE_PRICE_ANNUAL` | Yearly price ID |

Then commit and push `public/config.js`. The push redeploys the site, which also picks up the new variables.

## 4. Test it

1. Open the site in a private window and play 25 hands. The paywall should appear on the 26th.
2. Choose a plan, create an account, and confirm it from the email.
3. At checkout, pay with Stripe's test card `4242 4242 4242 4242`, any future expiry and any CVC.
4. You should land on your account page, which switches to **Pro** within a few seconds. The trainer should no longer be capped.
5. On the account page, click **Manage billing** and cancel. After the period ends (or right away, if you cancel immediately in Stripe), the account returns to Free.

If Pro doesn't switch on, check **Stripe → Developers → Webhooks → your endpoint** for failed deliveries; the error message comes from the site.

## Going live

Repeat step 2 in Stripe **live mode** (new prices, new webhook, new secret key), then replace `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY` and `STRIPE_PRICE_ANNUAL` in Cloudflare and redeploy.

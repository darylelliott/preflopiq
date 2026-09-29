# Turning on accounts and Pro

Until these steps are done the site stays fully free: no sign-in link, no paywall.

**Status:** Supabase is set up (project `pupddxyrckkyrorkmqld`), `public/config.js` has its URL and anon key, and Cloudflare has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Accounts, sync, leaderboards and clubs are live. The paywall is off (`payments: false` in `config.js`) until Stripe is done; set it to `true` after steps 2 and 3. "Confirm email" is off in Supabase until custom SMTP is set up (Supabase's built-in sender only reaches your own team), so password-reset emails won't reach players until then. Do everything in **Stripe test mode** first, check it end to end, then repeat the Stripe steps in live mode.

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

## Leaderboards and clubs

`supabase/schema.sql` includes the leaderboard, club and email-preference tables. If you ran an older copy of it, run the whole file again; it's safe to re-run. Nothing else is needed: leaderboards and clubs use the same Supabase keys.

## 5. Reminder emails (optional)

Two emails go out from a small scheduled Cloudflare Worker in `workers/reminders/`:

- **Streak reminder** at 7 p.m. in the player's time zone, when they have a streak of 2+ days and haven't played today.
- **Weekly recap** on Sunday at 10 a.m. local, for anyone who played in the last three weeks.

Players can turn each one off on their account page or with the unsubscribe link in every email.

1. **Resend:** create an account at [resend.com](https://resend.com), add your domain under **Domains** and add the DNS records it shows (sending needs a domain you own; `pages.dev` won't work). Then **API Keys → Create** and copy the key.
2. **Pick a signing secret:** any long random string, e.g. the output of `openssl rand -hex 32`. It signs the unsubscribe links.
3. **Pages:** add `EMAIL_SECRET` (Secret type) to **Workers & Pages → preflopiq → Settings → Variables and secrets**, with the value from step 2, so `/api/unsubscribe` can check links.
4. **Worker:** edit `workers/reminders/wrangler.toml` and set `EMAIL_FROM` (e.g. `Preflop IQ <reminders@yourdomain.com>`) and `SITE_URL`. Then from that folder:

   ```sh
   npx wrangler login
   npx wrangler secret put SUPABASE_URL
   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   npx wrangler secret put RESEND_API_KEY
   npx wrangler secret put EMAIL_SECRET        # same value as step 3
   npx wrangler deploy
   ```

5. **Test:** open `https://preflopiq-reminders.<your-subdomain>.workers.dev/?key=YOUR_EMAIL_SECRET`. It runs one pass and returns what it sent (usually nothing unless it's someone's 7 p.m.). Runs hourly after that; see **Workers → preflopiq-reminders → Logs**.

## 4. Test it

1. Open the site in a private window and play 25 hands. The paywall should appear on the 26th.
2. Choose a plan, create an account, and confirm it from the email.
3. At checkout, pay with Stripe's test card `4242 4242 4242 4242`, any future expiry and any CVC.
4. You should land on your account page, which switches to **Pro** within a few seconds. The trainer should no longer be capped.
5. On the account page, click **Manage billing** and cancel. After the period ends (or right away, if you cancel immediately in Stripe), the account returns to Free.

Also finish a daily challenge while signed in, choose a leaderboard name, and check that your score appears on `/leaderboard/`.

If Pro doesn't switch on, check **Stripe → Developers → Webhooks → your endpoint** for failed deliveries; the error message comes from the site.

## Free Pro for chosen accounts (owner page)

`/admin/` (not linked anywhere, not indexed) lists accounts, shows who is on a trial, paying or on free Pro, and has a **Free Pro** checkbox per account. Only signed-in accounts whose email is in the Cloudflare variable `ADMIN_EMAILS` (comma-separated, type Text) can use it. Free Pro never expires and never bills.

## Turning the paywall on

When Stripe is working (steps 2–4), set `payments: true` in `public/config.js` and push. At the same moment, give everyone who signed up while the site was free a fresh 7-day trial, so their trial isn't already used up. In Supabase → SQL Editor, run:

```sql
update public.profiles set trial_ends = now() + interval '7 days'
where not comp and (trial_ends is null or trial_ends < now() + interval '7 days');
```

## Going live

Repeat step 2 in Stripe **live mode** (new prices, new webhook, new secret key), then replace `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY` and `STRIPE_PRICE_ANNUAL` in Cloudflare and redeploy.

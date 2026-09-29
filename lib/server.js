// Shared helpers for the Cloudflare Pages Functions in /functions.
// Required environment variables (Cloudflare -> preflopiq -> Settings -> Variables and secrets):
//   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_ANNUAL,
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export function requireEnv(env, names) {
  const missing = names.filter(n => !env[n]);
  if (missing.length) throw new HttpError(500, `Server is missing configuration: ${missing.join(', ')}`);
}

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function handle(fn) {
  return async ctx => {
    try { return await fn(ctx); }
    catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      if (status === 500) console.error(e);
      return json({ error: e.message || 'Something went wrong' }, status);
    }
  };
}

// ---------- Stripe (REST API, form-encoded; no SDK needed) ----------
function formEncode(obj, prefix = '', out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === 'object') formEncode(v, key, out);
    else out.append(key, String(v));
  }
  return out;
}

export async function stripe(env, method, path, params) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: params ? formEncode(params) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new HttpError(502, `Stripe: ${data.error?.message || res.status}`);
  return data;
}

// Verifies the Stripe-Signature header (HMAC-SHA256 over "timestamp.payload").
export async function verifyStripeSignature(payload, header, secret, toleranceSec = 300) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(',').map(p => p.split('=')).map(([k, ...v]) => [k, v.join('=')]));
  const signatures = header.split(',').filter(p => p.startsWith('v1=')).map(p => p.slice(3));
  const t = parts.t;
  if (!t || !signatures.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > toleranceSec) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${payload}`));
  const expected = [...new Uint8Array(mac)].map(b => b.toString(16).padStart(2, '0')).join('');
  return signatures.some(sig => timingSafeEqual(sig, expected));
}
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// ---------- Supabase (REST, service role) ----------
function sbHeaders(env, extra = {}) {
  return { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'content-type': 'application/json', ...extra };
}

// Returns the signed-in user for the request's bearer token, or throws 401.
export async function getUser(request, env) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'Sign in first.');
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new HttpError(401, 'Your session has expired. Sign in again.');
  return res.json();
}

export async function getSubscriptionRow(env, userId) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${encodeURIComponent(userId)}&select=*`, { headers: sbHeaders(env) });
  if (!res.ok) throw new HttpError(502, 'Could not read subscription.');
  const rows = await res.json();
  return rows[0] || null;
}

export async function findUserIdByCustomer(env, customerId) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/subscriptions?stripe_customer_id=eq.${encodeURIComponent(customerId)}&select=user_id`, { headers: sbHeaders(env) });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0]?.user_id || null;
}

export async function upsertSubscription(env, row) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/subscriptions?on_conflict=user_id`, {
    method: 'POST',
    headers: sbHeaders(env, { prefer: 'resolution=merge-duplicates,return=minimal' }),
    body: JSON.stringify({ ...row, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new HttpError(502, `Could not save subscription: ${await res.text()}`);
}

// Generic Supabase REST call with the service role. Returns parsed JSON (or null for empty bodies).
export async function sb(env, path, { method = 'GET', body, prefer } = {}) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    method, headers: sbHeaders(env, prefer ? { prefer } : {}), body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) { const e = new HttpError(res.status === 409 ? 409 : 502, text); e.detail = text; throw e; }
  return text ? JSON.parse(text) : null;
}

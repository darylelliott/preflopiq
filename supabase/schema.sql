-- Preflop IQ database schema for Supabase.
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste this file -> Run.

-- One row per user, created automatically at sign-up.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  hands_played integer not null default 0,
  stats jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Written only by the Stripe webhook (service role). Users can read their own row.
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  status text not null default 'none',          -- Stripe status: active, trialing, past_due, canceled, ...
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "read own subscription" on public.subscriptions;
create policy "read own subscription" on public.subscriptions
  for select to authenticated using (auth.uid() = user_id);

-- Users may only change their progress columns, never email or ids.
revoke update on public.profiles from authenticated;
grant update (hands_played, stats, updated_at) on public.profiles to authenticated;
revoke insert, update, delete on public.subscriptions from authenticated, anon;

-- Create a profile whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

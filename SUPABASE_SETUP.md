# Supabase setup for auth + cross-device sync

This app uses Supabase Auth (email/password) and two tables: one for syncing snapshots and one for user profiles (Pro status).

## 1) Configure environment variables

Set these in `.env`:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## 2) Create sync table

Run in Supabase SQL editor:

```sql
create table if not exists public.user_sync_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_sync_snapshots enable row level security;
```

## 3) Add RLS policies

Run in Supabase SQL editor:

```sql
create policy "Users can read own snapshot"
on public.user_sync_snapshots
for select
using (auth.uid() = user_id);

create policy "Users can insert own snapshot"
on public.user_sync_snapshots
for insert
with check (auth.uid() = user_id);

create policy "Users can update own snapshot"
on public.user_sync_snapshots
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

## 4) Enable Email auth

In Supabase dashboard:

- Authentication → Providers → Email: enable Email provider.
- Optional: disable email confirmation for easier local testing.

## 5) Enable social login (Google + Apple)

In Supabase dashboard:

- Authentication → Providers → Google: enable provider and set OAuth client ID/secret.
- Authentication → Providers → Apple: enable provider and set Service ID / key / team data.

Required redirect URL for both providers:

- `slow-to-pro://auth/callback`

Also add this callback URL in your Google and Apple developer console app configuration.

## 6) How sync behaves

- First login on an account:
  - If a cloud snapshot exists → pulls it to local stores.
  - If not → seeds cloud with local snapshot.
- After login:
  - Use **Pull from cloud** or **Push to cloud** in Settings.

## 7) Create user profiles table (Pro status)

Run in Supabase SQL editor:

```sql
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_pro boolean not null default false,
  pro_expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create policy "Users can read own profile"
  on public.user_profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on public.user_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

The app writes to this table automatically whenever a RevenueCat purchase, restore, or entitlement refresh updates the Pro status. You can query `user_profiles` in the Supabase dashboard to see who has an active subscription.

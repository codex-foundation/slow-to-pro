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

## 8) Create Shared Spaces tables (Pro feature)

Run in Supabase SQL editor:

```sql
create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.spaces enable row level security;

create table if not exists public.space_members (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  invited_email text not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique(space_id, invited_email)
);
alter table public.space_members enable row level security;

create table if not exists public.space_finance_snapshots (
  space_id uuid primary key references public.spaces(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.space_finance_snapshots enable row level security;

create table if not exists public.space_task_snapshots (
  space_id uuid primary key references public.spaces(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.space_task_snapshots enable row level security;

-- RLS policies
create policy "Space owner full access" on public.spaces for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Accepted members can read space" on public.spaces for select using (exists (select 1 from public.space_members sm where sm.space_id = id and sm.user_id = auth.uid() and sm.status = 'accepted'));

create policy "Owner manages members" on public.space_members for all using (exists (select 1 from public.spaces s where s.id = space_id and s.owner_id = auth.uid())) with check (exists (select 1 from public.spaces s where s.id = space_id and s.owner_id = auth.uid()));
create policy "Invitee can see and update own membership" on public.space_members for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Space members read finance snapshot" on public.space_finance_snapshots for select using (exists (select 1 from public.space_members sm where sm.space_id = space_id and sm.user_id = auth.uid() and sm.status = 'accepted') or exists (select 1 from public.spaces s where s.id = space_id and s.owner_id = auth.uid()));
create policy "Space members write finance snapshot" on public.space_finance_snapshots for all using (exists (select 1 from public.space_members sm where sm.space_id = space_id and sm.user_id = auth.uid() and sm.status = 'accepted') or exists (select 1 from public.spaces s where s.id = space_id and s.owner_id = auth.uid())) with check (exists (select 1 from public.space_members sm where sm.space_id = space_id and sm.user_id = auth.uid() and sm.status = 'accepted') or exists (select 1 from public.spaces s where s.id = space_id and s.owner_id = auth.uid()));

create policy "Space members read task snapshot" on public.space_task_snapshots for select using (exists (select 1 from public.space_members sm where sm.space_id = space_id and sm.user_id = auth.uid() and sm.status = 'accepted') or exists (select 1 from public.spaces s where s.id = space_id and s.owner_id = auth.uid()));
create policy "Space members write task snapshot" on public.space_task_snapshots for all using (exists (select 1 from public.space_members sm where sm.space_id = space_id and sm.user_id = auth.uid() and sm.status = 'accepted') or exists (select 1 from public.spaces s where s.id = space_id and s.owner_id = auth.uid())) with check (exists (select 1 from public.space_members sm where sm.space_id = space_id and sm.user_id = auth.uid() and sm.status = 'accepted') or exists (select 1 from public.spaces s where s.id = space_id and s.owner_id = auth.uid()));
```

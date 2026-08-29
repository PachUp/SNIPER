-- SNIPER Phase 2 — run in Supabase SQL editor (or supabase db push)
-- One portfolio blob per auth user. Guest localStorage remains dual-path.

create table if not exists public.sniper_portfolios (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.sniper_portfolios enable row level security;

create policy "Users read own portfolio"
  on public.sniper_portfolios for select
  using (auth.uid() = user_id);

create policy "Users insert own portfolio"
  on public.sniper_portfolios for insert
  with check (auth.uid() = user_id);

create policy "Users update own portfolio"
  on public.sniper_portfolios for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists sniper_portfolios_email_idx
  on public.sniper_portfolios (email);

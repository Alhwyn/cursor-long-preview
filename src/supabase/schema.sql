-- RPC Zombie Game Supabase schema
-- Run this script in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.servers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_public boolean not null default true,
  max_players integer not null default 4 check (max_players >= 1 and max_players <= 32),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists servers_public_created_at_idx on public.servers (is_public, created_at);

create table if not exists public.server_players (
  id bigint generated always as identity primary key,
  server_id uuid not null references public.servers(id) on delete cascade,
  player_id text not null,
  player_name text not null,
  joined_at timestamptz not null default now(),
  unique (server_id, player_id)
);

create index if not exists server_players_server_id_idx on public.server_players (server_id);

create table if not exists public.game_snapshots (
  id bigint generated always as identity primary key,
  server_id uuid references public.servers(id) on delete set null,
  session_id text not null,
  tick integer not null,
  status text not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists game_snapshots_server_tick_idx on public.game_snapshots (server_id, tick);
create index if not exists game_snapshots_session_tick_idx on public.game_snapshots (session_id, tick);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_servers_touch_updated_at on public.servers;
create trigger trg_servers_touch_updated_at
before update on public.servers
for each row execute function public.touch_updated_at();

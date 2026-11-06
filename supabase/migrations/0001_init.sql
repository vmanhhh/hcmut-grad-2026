-- HCMUT graduation invitation: schema (Principle II: RLS on, no policies, server-only access)

create extension if not exists pgcrypto;

-- Enums -------------------------------------------------------------------
create type guest_role as enum ('lecturer', 'family', 'friend', 'other');
create type rsvp_answer as enum ('yes', 'no', 'maybe');
create type meeting_window as enum ('early', 'late');
create type gate_distance as enum ('far', 'near');

-- guests ------------------------------------------------------------------
create table guests (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null unique
    check (invite_code ~ '^[A-HJ-NP-Za-km-z2-9]{12}$'),
  display_name text not null check (char_length(display_name) between 1 and 80),
  role guest_role not null default 'other',
  salutation text check (salutation is null or char_length(salutation) <= 120),
  message_title text not null check (char_length(message_title) <= 120),
  message_body text not null check (char_length(message_body) <= 2000),
  opened_at timestamptz,
  journey_version_seen int not null default 0,
  rsvp rsvp_answer,
  meeting_window meeting_window,
  party_size smallint check (party_size is null or party_size between 1 and 5),
  wish text check (wish is null or char_length(wish) <= 500),
  rsvp_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- yes/maybe must carry a meeting window (FR-009a)
  constraint rsvp_window_required
    check (rsvp is null or rsvp = 'no' or meeting_window is not null),
  -- no => no window and no party size
  constraint rsvp_no_clears
    check (rsvp is distinct from 'no' or (meeting_window is null and party_size is null)),
  -- no answer yet => nothing else filled in
  constraint rsvp_null_clears
    check (rsvp is not null or (meeting_window is null and party_size is null and wish is null))
);

-- event (singleton) -------------------------------------------------------
create table event (
  id smallint primary key default 1 check (id = 1),
  title text not null,
  host_name text not null,
  host_degree text not null,
  host_school text not null,
  contact_phone text not null,
  address text not null,
  meeting_point_name text not null,
  meeting_lat double precision not null,
  meeting_lng double precision not null,
  meeting_note text,
  windows jsonb not null,
  busy_note text,
  timezone text not null default 'Asia/Ho_Chi_Minh',
  public_base_url text not null,
  journey_version int not null default 0,
  updated_at timestamptz not null default now()
);

-- gates -------------------------------------------------------------------
create table gates (
  id text primary key,
  sort_order smallint not null,
  name text not null,
  distance gate_distance not null,
  headline text not null,
  parking_note text,
  best_for text[] not null default '{}',
  lat double precision not null,
  lng double precision not null,
  photo_url text,
  steps jsonb not null default '[]'
);

-- rate_limits -------------------------------------------------------------
create table rate_limits (
  key text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (key, window_start)
);

-- updated_at trigger ------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger guests_set_updated_at before update on guests
  for each row execute function set_updated_at();
create trigger event_set_updated_at before update on event
  for each row execute function set_updated_at();

-- Row level security: enabled, NO policies => anon/authenticated read nothing ----
alter table guests enable row level security;
alter table event enable row level security;
alter table gates enable row level security;
alter table rate_limits enable row level security;

-- Fixed-window rate limiter -----------------------------------------------
create or replace function check_rate_limit(p_key text, p_max int, p_window_s int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  w timestamptz;
  c int;
begin
  w := to_timestamp(floor(extract(epoch from now()) / p_window_s) * p_window_s);
  insert into rate_limits as r (key, window_start, count)
  values (p_key, w, 1)
  on conflict (key, window_start) do update set count = r.count + 1
  returning r.count into c;
  return c <= p_max;
end;
$$;

revoke execute on function check_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function check_rate_limit(text, int, int) to service_role;

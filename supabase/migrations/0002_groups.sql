-- Group invite links (/g/{slug}): one shared link for a cohort or walk-in guests.
-- A guest opens it, types a name and an optional note, and gets a personal guests row + /i/{code} link.
-- Same rules as 0001: RLS on, no policies, server-only access with the service role.

create table groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  label text not null check (char_length(label) between 1 and 80), -- e.g. 'Khóa 2023'
  role guest_role not null default 'friend',
  salutation text check (salutation is null or char_length(salutation) <= 120),
  message_title text check (message_title is null or char_length(message_title) <= 120), -- null => role default
  message_body text not null check (char_length(message_body) between 1 and 2000),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table groups enable row level security;

alter table guests
  add column group_id uuid references groups(id) on delete set null,
  add column note text check (note is null or char_length(note) <= 500);

create index guests_group_id_idx on guests (group_id);

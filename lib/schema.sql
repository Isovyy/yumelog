-- Run this in your Supabase SQL editor

create table archives (
  slug             text primary key,
  password_hash    text not null,
  data_published   jsonb default null,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Auto-update updated_at on every change
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger archives_updated_at
  before update on archives
  for each row execute function update_updated_at();

-- No public read access to password_hash — ever
alter table archives enable row level security;

create policy "Public can read published archive data"
  on archives for select
  using (true);

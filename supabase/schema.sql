create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  whatsapp_number text,
  google_maps_url text,
  address text,
  rating numeric,
  website text,
  instagram text,
  facebook text,
  city text not null,
  call_status text not null default 'pending',
  sale_status text not null default 'pending',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for fast city filtering
create index if not exists leads_city_idx on leads(city);

-- Index for dedup check by phone
create index if not exists leads_phone_idx on leads(phone);

-- Auto-update updated_at on row change
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger leads_updated_at
before update on leads
for each row execute function update_updated_at();

-- Enable Row Level Security (RLS)
alter table leads enable row level security;

-- Enable public access policies since the app is open/no auth
create policy "Allow public read access" on leads for select using (true);
create policy "Allow public insert access" on leads for insert with check (true);
create policy "Allow public update access" on leads for update using (true) with check (true);

create extension if not exists "pgcrypto";

create table if not exists public.couriers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null default 'Coloncito',
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.coverage_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  state text not null default 'Táchira',
  status text not null default 'activa' check (status in ('activa', 'proxima')),
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null,
  city text not null default 'Coloncito',
  type text not null check (type in ('comida', 'paquete', 'mandado')),
  status text not null check (status in ('nuevos', 'asignados', 'recogidos', 'en_camino', 'entregados', 'cancelados')) default 'nuevos',
  rider_name text,
  restaurant_name text,
  pickup_location text,
  destination text,
  item_details text,
  notes text,
  photo_url text,
  priority text not null default 'normal' check (priority in ('normal', 'alta')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger orders_updated_at
before update on public.orders
for each row
execute function public.update_updated_at_column();

alter table public.orders enable row level security;
alter table public.coverage_zones enable row level security;
alter table public.couriers enable row level security;

create policy "Allow authenticated reads and writes" on public.orders
for all using (true) with check (true);

create policy "Allow authenticated reads and writes" on public.coverage_zones
for all using (true) with check (true);

create policy "Allow authenticated reads and writes" on public.couriers
for all using (true) with check (true);

insert into public.coverage_zones (name, state, status, description)
values
  ('Coloncito', 'Táchira', 'activa', 'Centro comercial y barrios vecinos'),
  ('La Fría', 'Táchira', 'proxima', 'Próxima apertura'),
  ('Colón', 'Táchira', 'proxima', 'Próxima apertura')
on conflict do nothing;

insert into public.couriers (name, city, phone, active)
values
  ('José', 'Coloncito', '0414-1234567', true),
  ('Luis', 'Coloncito', '0424-7654321', true),
  ('Néstor', 'Coloncito', '0412-9876543', true)
on conflict do nothing;

insert into public.orders (customer_name, customer_phone, city, type, status, rider_name, restaurant_name, pickup_location, destination, item_details, notes, priority)
values
  ('María V.', '0414-1234567', 'Coloncito', 'comida', 'en_camino', 'José', 'La Casona Grill', 'La Casona Grill', 'Calle 5, esquina 7', '2 arepas rellenas + 1 hamburguesa', 'Entrega rápida', 'alta'),
  ('Luis R.', '0424-7654321', 'Coloncito', 'paquete', 'asignados', 'Luis', 'Bodega Central', 'Bodega Central', 'Residencias Los Pinos', 'Caja pequeña con documentos', 'Sin comentarios', 'normal'),
  ('Ana M.', '0412-9876543', 'Coloncito', 'mandado', 'nuevos', null, null, 'Panadería de la plaza', 'Urbanización El Progreso', '1 pan de queso y 2 leche de coco', 'Verificar horario de la panadería', 'normal')
on conflict do nothing;

create extension if not exists "pgcrypto";

create table if not exists public.couriers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  city text not null default 'Coloncito',
  phone text,
  active boolean not null default true,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.couriers
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null,
  add column if not exists email text;

create unique index if not exists couriers_email_lower_uidx
  on public.couriers (lower(email))
  where email is not null;

create table if not exists public.coverage_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
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

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

create or replace function public.current_courier_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.id
  from public.couriers as c
  where c.auth_user_id = auth.uid()
    and c.active = true
  limit 1;
$$;

create or replace function public.current_courier_name()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select c.name
  from public.couriers as c
  where c.auth_user_id = auth.uid()
    and c.active = true
  limit 1;
$$;

create or replace function public.current_courier_city()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select c.city
  from public.couriers as c
  where c.auth_user_id = auth.uid()
    and c.active = true
  limit 1;
$$;

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at
before update on public.orders
for each row
execute function public.update_updated_at_column();

alter table public.orders enable row level security;
alter table public.coverage_zones enable row level security;
alter table public.couriers enable row level security;

drop policy if exists "Allow authenticated reads and writes" on public.orders;
drop policy if exists "Allow authenticated reads and writes" on public.coverage_zones;
drop policy if exists "Allow authenticated reads and writes" on public.couriers;
drop policy if exists "Public customers can create new orders" on public.orders;
drop policy if exists "Admins can manage orders" on public.orders;
drop policy if exists "Couriers can view local and assigned orders" on public.orders;
drop policy if exists "Admins can manage couriers" on public.couriers;
drop policy if exists "Couriers can view their own profile" on public.couriers;
drop policy if exists "Public can view active coverage" on public.coverage_zones;
drop policy if exists "Admins can manage coverage" on public.coverage_zones;

create policy "Public customers can create new orders"
on public.orders
for insert
to anon, authenticated
with check (status = 'nuevos' and rider_name is null);

create policy "Admins can manage orders"
on public.orders
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Couriers can view local and assigned orders"
on public.orders
for select
to authenticated
using (
  public.current_courier_id() is not null
  and (
    (status = 'nuevos' and city = public.current_courier_city())
    or rider_name = public.current_courier_name()
  )
);

create policy "Admins can manage couriers"
on public.couriers
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Couriers can view their own profile"
on public.couriers
for select
to authenticated
using (auth_user_id = auth.uid());

create policy "Public can view active coverage"
on public.coverage_zones
for select
to anon, authenticated
using (status = 'activa');

create policy "Admins can manage coverage"
on public.coverage_zones
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

revoke all on function public.current_courier_id() from public, anon;
revoke all on function public.current_courier_name() from public, anon;
revoke all on function public.current_courier_city() from public, anon;
grant execute on function public.current_courier_id() to authenticated;
grant execute on function public.current_courier_name() to authenticated;
grant execute on function public.current_courier_city() to authenticated;

create or replace function public.courier_accept_order(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_courier_id uuid := public.current_courier_id();
  v_courier_name text := public.current_courier_name();
  v_courier_city text := public.current_courier_city();
begin
  if v_courier_id is null then
    raise exception 'Esta cuenta no está asociada a un repartidor activo.';
  end if;

  update public.orders
  set status = 'asignados',
      rider_name = v_courier_name
  where id = p_order_id
    and status = 'nuevos'
    and rider_name is null
    and city = v_courier_city
  returning * into v_order;

  if not found then
    raise exception 'Este pedido ya fue aceptado o no está disponible en tu zona.';
  end if;

  return v_order;
end;
$$;

create or replace function public.courier_update_order_status(
  p_order_id uuid,
  p_new_status text
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_courier_id uuid := public.current_courier_id();
  v_expected_status text;
begin
  if v_courier_id is null then
    raise exception 'Esta cuenta no está asociada a un repartidor activo.';
  end if;

  v_expected_status := case p_new_status
    when 'recogidos' then 'asignados'
    when 'en_camino' then 'recogidos'
    when 'entregados' then 'en_camino'
    else null
  end;

  if v_expected_status is null then
    raise exception 'El estado solicitado no es válido para un repartidor.';
  end if;

  update public.orders
  set status = p_new_status
  where id = p_order_id
    and rider_name = public.current_courier_name()
    and city = public.current_courier_city()
    and status = v_expected_status
  returning * into v_order;

  if not found then
    raise exception 'No se pudo avanzar este pedido; actualiza la lista e inténtalo de nuevo.';
  end if;

  return v_order;
end;
$$;

revoke all on function public.courier_accept_order(uuid) from public, anon;
revoke all on function public.courier_update_order_status(uuid, text) from public, anon;
grant execute on function public.courier_accept_order(uuid) to authenticated;
grant execute on function public.courier_update_order_status(uuid, text) to authenticated;

insert into public.coverage_zones (name, state, status, description)
values
  ('Coloncito', 'Táchira', 'activa', 'Centro comercial y barrios vecinos'),
  ('La Fría', 'Táchira', 'proxima', 'Próxima apertura'),
  ('Colón', 'Táchira', 'proxima', 'Próxima apertura')
on conflict do nothing;

insert into public.couriers (name, city, phone, active)
select seed.name, seed.city, seed.phone, seed.active
from (values
  ('José', 'Coloncito', '0414-1234567', true),
  ('Luis', 'Coloncito', '0424-7654321', true),
  ('Néstor', 'Coloncito', '0412-9876543', true)
) as seed(name, city, phone, active)
where not exists (
  select 1
  from public.couriers as existing
  where existing.name = seed.name and existing.city = seed.city
);

insert into public.orders (customer_name, customer_phone, city, type, status, rider_name, restaurant_name, pickup_location, destination, item_details, notes, priority)
select 'María V.', '0414-1234567', 'Coloncito', 'comida', 'en_camino', 'José', 'La Casona Grill', 'La Casona Grill', 'Calle 5, esquina 7', '2 arepas rellenas + 1 hamburguesa', 'Entrega rápida', 'alta'
where not exists (
  select 1 from public.orders
  where customer_name = 'María V.' and item_details = '2 arepas rellenas + 1 hamburguesa'
);

insert into public.orders (customer_name, customer_phone, city, type, status, rider_name, restaurant_name, pickup_location, destination, item_details, notes, priority)
select 'Luis R.', '0424-7654321', 'Coloncito', 'paquete', 'asignados', 'Luis', 'Bodega Central', 'Bodega Central', 'Residencias Los Pinos', 'Caja pequeña con documentos', 'Sin comentarios', 'normal'
where not exists (
  select 1 from public.orders
  where customer_name = 'Luis R.' and item_details = 'Caja pequeña con documentos'
);

insert into public.orders (customer_name, customer_phone, city, type, status, rider_name, restaurant_name, pickup_location, destination, item_details, notes, priority)
select 'Ana M.', '0412-9876543', 'Coloncito', 'mandado', 'nuevos', null, null, 'Panadería de la plaza', 'Urbanización El Progreso', '1 pan de queso y 2 leche de coco', 'Verificar horario de la panadería', 'normal'
where not exists (
  select 1 from public.orders
  where customer_name = 'Ana M.' and item_details = '1 pan de queso y 2 leche de coco'
);

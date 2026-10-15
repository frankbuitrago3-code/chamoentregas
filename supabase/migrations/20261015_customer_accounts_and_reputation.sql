create table if not exists public.customer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  phone text,
  reputation_score integer not null default 100
    check (reputation_score between 0 and 100),
  orders_blocked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_profiles
  add column if not exists email text,
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists reputation_score integer not null default 100,
  add column if not exists orders_blocked_until timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.customer_violations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customer_profiles(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete restrict,
  violation_type text not null default 'impago' check (violation_type = 'impago'),
  evidence_summary text not null check (length(btrim(evidence_summary)) > 0),
  notes text,
  points_deducted integer not null default 20 check (points_deducted = 20),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (order_id, violation_type)
);

alter table public.orders
  add column if not exists customer_id uuid references auth.users(id) on delete set null,
  add column if not exists customer_email text;

alter table public.orders alter column customer_phone drop not null;

insert into public.customer_profiles (id, email, full_name)
select
  u.id,
  u.email,
  coalesce(nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''), split_part(u.email, '@', 1))
from auth.users as u
where u.email is not null
on conflict (id) do update
set email = excluded.email;

create or replace function public.create_customer_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is not null then
    insert into public.customer_profiles (id, email, full_name)
    values (
      new.id,
      new.email,
      coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1))
    )
    on conflict (id) do update
      set email = excluded.email;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_customer_profile on auth.users;
create trigger on_auth_user_customer_profile
after insert or update of email on auth.users
for each row execute function public.create_customer_profile();

create or replace function public.set_order_customer_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.customer_profiles;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para solicitar una entrega.';
  end if;

  select * into v_profile
  from public.customer_profiles
  where id = auth.uid();

  if not found then
    raise exception 'No se encontró tu perfil. Cierra sesión y vuelve a ingresar.';
  end if;

  if v_profile.orders_blocked_until > now() then
    raise exception 'Tu cuenta tiene temporalmente pausadas las nuevas solicitudes. Contacta a soporte.';
  end if;

  new.customer_id := auth.uid();
  new.customer_email := v_profile.email;
  new.customer_name := v_profile.full_name;
  if nullif(btrim(coalesce(new.customer_phone, '')), '') is null then
    new.customer_phone := v_profile.phone;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_set_customer_identity on public.orders;
create trigger orders_set_customer_identity
before insert on public.orders
for each row execute function public.set_order_customer_identity();

create or replace function public.apply_customer_violation_score()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.customer_profiles
  set reputation_score = greatest(0, reputation_score - new.points_deducted),
      updated_at = now()
  where id = new.customer_id;
  return new;
end;
$$;

drop trigger if exists customer_violation_score on public.customer_violations;
create trigger customer_violation_score
after insert on public.customer_violations
for each row execute function public.apply_customer_violation_score();

create or replace function public.admin_confirm_customer_nonpayment(
  p_customer_id uuid,
  p_order_id uuid,
  p_evidence_summary text,
  p_notes text default null
)
returns public.customer_violations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_violation public.customer_violations;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede confirmar un impago.';
  end if;

  if nullif(btrim(p_evidence_summary), '') is null then
    raise exception 'Describe la evidencia antes de confirmar el impago.';
  end if;

  if not exists (
    select 1 from public.orders
    where id = p_order_id
      and customer_id = p_customer_id
      and status = 'entregados'
  ) then
    raise exception 'El pedido debe estar entregado y pertenecer al cliente seleccionado.';
  end if;

  insert into public.customer_violations (
    customer_id, order_id, evidence_summary, notes, created_by
  )
  values (
    p_customer_id, p_order_id, btrim(p_evidence_summary), nullif(btrim(p_notes), ''), auth.uid()
  )
  returning * into v_violation;

  return v_violation;
exception
  when unique_violation then
    raise exception 'Ya existe un reporte confirmado para este pedido.';
end;
$$;

create or replace function public.admin_set_customer_order_block(
  p_customer_id uuid,
  p_blocked_until timestamptz
)
returns public.customer_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.customer_profiles;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede limitar nuevas solicitudes.';
  end if;

  if p_blocked_until is not null and p_blocked_until <= now() then
    raise exception 'La fecha de limitación debe estar en el futuro.';
  end if;

  update public.customer_profiles
  set orders_blocked_until = p_blocked_until,
      updated_at = now()
  where id = p_customer_id
  returning * into v_profile;

  if not found then
    raise exception 'No se encontró el perfil del cliente.';
  end if;

  return v_profile;
end;
$$;

alter table public.customer_profiles enable row level security;
alter table public.customer_violations enable row level security;

drop policy if exists "Customers can view own profile" on public.customer_profiles;
drop policy if exists "Customers can update own profile" on public.customer_profiles;
drop policy if exists "Admins can manage customer profiles" on public.customer_profiles;
drop policy if exists "Customers can view own violations" on public.customer_violations;
drop policy if exists "Admins can manage customer violations" on public.customer_violations;
drop policy if exists "Public customers can create new orders" on public.orders;
drop policy if exists "Registered customers can create orders" on public.orders;
drop policy if exists "Customers can view own orders" on public.orders;

create policy "Customers can view own profile"
on public.customer_profiles
for select to authenticated
using (id = auth.uid());

create policy "Customers can update own profile"
on public.customer_profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Admins can manage customer profiles"
on public.customer_profiles
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Customers can view own violations"
on public.customer_violations
for select to authenticated
using (customer_id = auth.uid());

create policy "Admins can manage customer violations"
on public.customer_violations
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Registered customers can create orders"
on public.orders
for insert to authenticated
with check (
  customer_id = auth.uid()
  and status = 'nuevos'
  and rider_name is null
  and exists (
    select 1
    from public.customer_profiles as profile
    where profile.id = auth.uid()
      and (profile.orders_blocked_until is null or profile.orders_blocked_until <= now())
  )
);

create policy "Customers can view own orders"
on public.orders
for select to authenticated
using (customer_id = auth.uid());

revoke insert on public.orders from anon, public;
grant select, insert on public.orders to authenticated;
revoke insert, update, delete on public.customer_profiles from anon, public, authenticated;
revoke all on public.customer_violations from anon, public;
grant select on public.customer_profiles, public.customer_violations to authenticated;
grant update (full_name, phone) on public.customer_profiles to authenticated;
grant insert, update, delete on public.customer_violations to authenticated;

revoke all on function public.create_customer_profile() from public, anon, authenticated;
revoke all on function public.set_order_customer_identity() from public, anon, authenticated;
revoke all on function public.apply_customer_violation_score() from public, anon, authenticated;
revoke all on function public.admin_confirm_customer_nonpayment(uuid, uuid, text, text) from public, anon;
revoke all on function public.admin_set_customer_order_block(uuid, timestamptz) from public, anon;
grant execute on function public.admin_confirm_customer_nonpayment(uuid, uuid, text, text) to authenticated;
grant execute on function public.admin_set_customer_order_block(uuid, timestamptz) to authenticated;

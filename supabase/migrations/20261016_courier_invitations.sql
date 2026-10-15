alter table public.couriers
  add column if not exists email text;

create unique index if not exists couriers_email_lower_uidx
  on public.couriers (lower(email))
  where email is not null;

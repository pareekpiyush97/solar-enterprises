-- Solar Energy Enterprises - management system
-- Adds staff roles, clients and bookings on top of the existing leads/portal_access schema.
-- Project: jsbzinoecnqfjgrhkqzi
--
-- Access model, unchanged in principle: this site is static and has no server, so the
-- browser can never be the gate. Postgres is. Every table below is sealed by row level
-- security against public.portal_access, and portal_access itself can only be written by
-- an admin. Nobody gets in because a page let them in.

-- ---------------------------------------------------------------- roles on portal_access
alter table public.portal_access add column if not exists role   text    not null default 'staff';
alter table public.portal_access add column if not exists active boolean not null default true;

do $$ begin
  alter table public.portal_access add constraint portal_access_role_valid check (role in ('admin','staff'));
exception when duplicate_object then null; end $$;

-- The two owner accounts that already existed are the admins.
update public.portal_access set role = 'admin' where role is distinct from 'admin';

-- ---------------------------------------------------------------- access predicates
-- Deactivating someone must revoke access immediately, so both predicates check `active`.
create or replace function public.is_portal_user() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.portal_access
    where email = coalesce(auth.jwt() ->> 'email','') and active
  );
$$;

create or replace function public.is_portal_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.portal_access
    where email = coalesce(auth.jwt() ->> 'email','') and active and role = 'admin'
  );
$$;

revoke execute on function public.is_portal_user()  from anon, public;
revoke execute on function public.is_portal_admin() from anon, public;
grant  execute on function public.is_portal_user()  to authenticated;
grant  execute on function public.is_portal_admin() to authenticated;

-- ---------------------------------------------------------------- who may sign up at all
-- Second layer: RLS decides what a signed-in account can see; this decides who can get an
-- account in the first place. An unapproved or deactivated email cannot even register.
create or replace function public.reject_unapproved_signup() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not exists (
    select 1 from public.portal_access where email = new.email and active
  ) then
    raise exception 'This email is not approved for the Solar Energy Enterprises portal.';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------- staff administration
-- Staff can see who else has access (useful, and not sensitive to a colleague).
-- Only an admin can add, change or deactivate anyone.
drop policy if exists "portal users read the staff list" on public.portal_access;
create policy "portal users read the staff list" on public.portal_access
  for select to authenticated using (public.is_portal_user());

drop policy if exists "admins add staff" on public.portal_access;
create policy "admins add staff" on public.portal_access
  for insert to authenticated with check (public.is_portal_admin());

drop policy if exists "admins change staff" on public.portal_access;
create policy "admins change staff" on public.portal_access
  for update to authenticated using (public.is_portal_admin());

-- Deliberately no DELETE policy. Access is withdrawn by setting active = false, which
-- keeps the record of who once had access. Deleting the row would erase that.

-- Guard rail: an admin can lock the whole company out by deactivating or demoting the
-- last remaining admin. Refuse that at the database, where no UI mistake can get past it.
create or replace function public.protect_last_admin() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if (old.role = 'admin' and old.active)
     and (new.role is distinct from 'admin' or not new.active) then
    if (select count(*) from public.portal_access
        where role = 'admin' and active and email <> old.email) = 0 then
      raise exception 'This is the last active admin. Make someone else an admin first.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_last_admin on public.portal_access;
create trigger protect_last_admin before update on public.portal_access
  for each row execute function public.protect_last_admin();

-- ---------------------------------------------------------------- clients
-- Customers who bought. This is also where the 200+ back catalogue lands, which is why
-- referral_asked_at exists: the referral engine needs to know who has already been asked.
create table if not exists public.clients (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz,
  name               text not null,
  phone              text not null,
  alt_phone          text,
  address            text,
  city               text,
  segment            text,
  system_kw          numeric(8,2),
  system_type        text,
  install_date       date,
  order_value        numeric(12,2),
  subsidy_status     text,
  discom_consumer_no text,
  lead_source        text,
  referred_by        text,
  referral_asked_at  timestamptz,
  health_check_at    date,
  notes              text,
  source_lead_id     uuid references public.leads(id) on delete set null
);

do $$ begin
  alter table public.clients add constraint clients_segment_valid
    check (segment is null or segment in ('residential','commercial','enterprise'));
  alter table public.clients add constraint clients_system_type_valid
    check (system_type is null or system_type in ('on_grid','off_grid','hybrid','ground_mount','solar_pump'));
  alter table public.clients add constraint clients_subsidy_valid
    check (subsidy_status is null or subsidy_status in ('not_applicable','applied','approved','received'));
  alter table public.clients add constraint clients_source_valid
    check (lead_source is null or lead_source in
      ('referral','google_search','google_maps','instagram','facebook','whatsapp','walk_in','hoarding','ads','tender','other'));
exception when duplicate_object then null; end $$;

create index if not exists clients_install_idx on public.clients (install_date desc nulls last);
create index if not exists clients_source_idx  on public.clients (lead_source);

alter table public.clients enable row level security;

drop policy if exists "portal users read clients"   on public.clients;
drop policy if exists "portal users add clients"    on public.clients;
drop policy if exists "portal users update clients" on public.clients;
create policy "portal users read clients"   on public.clients for select to authenticated using (public.is_portal_user());
create policy "portal users add clients"    on public.clients for insert to authenticated with check (public.is_portal_user());
create policy "portal users update clients" on public.clients for update to authenticated using (public.is_portal_user());
-- No delete policy, and none of these are open to anon. A client record is business history.

-- ---------------------------------------------------------------- bookings
-- Site surveys, installations, service calls and the referral-engine health checks.
create table if not exists public.bookings (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz,
  kind         text not null default 'site_survey',
  scheduled_at timestamptz not null,
  status       text not null default 'scheduled',
  name         text not null,
  phone        text,
  address      text,
  city         text,
  assigned_to  text,
  notes        text,
  lead_id      uuid references public.leads(id)   on delete set null,
  client_id    uuid references public.clients(id) on delete set null
);

do $$ begin
  alter table public.bookings add constraint bookings_kind_valid
    check (kind in ('site_survey','installation','service','health_check','meeting'));
  alter table public.bookings add constraint bookings_status_valid
    check (status in ('scheduled','done','cancelled','no_show'));
exception when duplicate_object then null; end $$;

create index if not exists bookings_when_idx on public.bookings (scheduled_at);

alter table public.bookings enable row level security;

drop policy if exists "portal users read bookings"   on public.bookings;
drop policy if exists "portal users add bookings"    on public.bookings;
drop policy if exists "portal users update bookings" on public.bookings;
create policy "portal users read bookings"   on public.bookings for select to authenticated using (public.is_portal_user());
create policy "portal users add bookings"    on public.bookings for insert to authenticated with check (public.is_portal_user());
create policy "portal users update bookings" on public.bookings for update to authenticated using (public.is_portal_user());

-- ---------------------------------------------------------------- updated_at
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists clients_touch  on public.clients;
drop trigger if exists bookings_touch on public.bookings;
create trigger clients_touch  before update on public.clients  for each row execute function public.touch_updated_at();
create trigger bookings_touch before update on public.bookings for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- lead source on tenders
-- The enterprise/EPC line needs a source value of its own; see scope-and-capability.md.
do $$ begin
  alter table public.leads drop constraint if exists leads_source_valid;
  alter table public.leads add  constraint leads_source_valid
    check (lead_source is null or lead_source in
      ('referral','google_search','google_maps','instagram','facebook','whatsapp','walk_in','hoarding','ads','tender','other'));
exception when others then null; end $$;

-- ---------------------------------------------------------------- seal trigger functions
-- Trigger functions must never be callable over the REST API. protect_last_admin and
-- reject_unapproved_signup are SECURITY DEFINER, so an exposed /rpc/ endpoint for either is
-- a real hole. is_portal_user and is_portal_admin stay callable by `authenticated` on
-- purpose - the portal asks them "am I allowed in?" on every load.
revoke execute on function public.protect_last_admin()       from anon, authenticated, public;
revoke execute on function public.touch_updated_at()         from anon, authenticated, public;
revoke execute on function public.reject_unapproved_signup() from anon, authenticated, public;

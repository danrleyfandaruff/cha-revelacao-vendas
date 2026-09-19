-- Apply in the Supabase SQL Editor before deploying the new webhook and frontend.
-- Existing events, links, reservations and expiration dates are preserved.
begin;

alter table public.events
  add column if not exists event_type text,
  add column if not exists baby_sex text,
  add column if not exists archived_at timestamptz;

alter table public.events drop constraint if exists events_event_type_check;
alter table public.events add constraint events_event_type_check
  check (event_type in ('revelacao', 'bebe', 'casamento', 'panela', 'casa_nova', 'aniversario'));
alter table public.events drop constraint if exists events_baby_sex_check;
alter table public.events add constraint events_baby_sex_check check (baby_sex in ('menino', 'menina'));

-- Replace the one-event-per-account constraint with one current event per account.
-- Resolve catalog names instead of assuming the original constraint's name.
do $$
declare
  v_column smallint;
  v_object record;
begin
  select attnum into v_column from pg_attribute
    where attrelid = 'public.events'::regclass and attname = 'user_id';
  for v_object in
    select conname from pg_constraint
    where conrelid = 'public.events'::regclass and contype = 'u'
      and conkey = array[v_column]
  loop
    execute format('alter table public.events drop constraint %I', v_object.conname);
  end loop;
  for v_object in
    select indexrelid::regclass as index_name from pg_index
    where indrelid = 'public.events'::regclass and indisunique and not indisprimary
      and indnkeyatts = 1 and indkey[0] = v_column and indpred is null
  loop
    execute format('drop index %s', v_object.index_name);
  end loop;
end;
$$;

create unique index if not exists events_one_current_per_user
  on public.events(user_id) where archived_at is null;

create or replace function public.archive_expired_event(p_event_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare v_event public.events%rowtype;
begin
  select * into v_event from public.events
    where id = p_event_id and user_id = auth.uid() for update;
  if not found then raise exception 'Event not found'; end if;
  if v_event.archived_at is not null then return; end if;
  if v_event.expires_at is null or v_event.expires_at > now() then
    raise exception 'Event has not expired';
  end if;
  update public.events set archived_at = now() where id = p_event_id;
end;
$$;
revoke all on function public.archive_expired_event(uuid) from public, anon;
grant execute on function public.archive_expired_event(uuid) to authenticated;

create or replace function public.activate_event_by_id(p_event_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_event public.events%rowtype;
begin
  select * into v_event from public.events where id = p_event_id for update;
  if not found then return jsonb_build_object('success', false, 'reason', 'event_not_found'); end if;
  -- Stripe retries must never extend the period or activate a different event.
  if not v_event.paid and v_event.archived_at is null then
    update public.events set paid = true, expires_at = now() + interval '60 days'
      where id = p_event_id returning * into v_event;
  end if;
  return jsonb_build_object('success', v_event.paid, 'event_id', v_event.id, 'expires_at', v_event.expires_at);
end;
$$;
revoke all on function public.activate_event_by_id(uuid) from public, anon, authenticated;
grant execute on function public.activate_event_by_id(uuid) to service_role;

-- Old payment links reference a user, who could only have one event at that time.
-- Always resolve the original event, including on delayed webhook retries.
-- Legacy installations may return json or another type instead of jsonb.
-- Recreate within this transaction and restore grants below; never use CASCADE.
drop function if exists public.activate_event(uuid);
create function public.activate_event(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  select id into v_id from public.events where user_id = p_user_id
    order by created_at, id limit 1;
  return public.activate_event_by_id(v_id);
end;
$$;
revoke all on function public.activate_event(uuid) from public, anon, authenticated;
grant execute on function public.activate_event(uuid) to service_role;

-- Only the trusted activation/archive functions may change lifecycle fields.
create or replace function public.protect_event_lifecycle()
returns trigger language plpgsql set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      if coalesce(new.paid, false) or new.expires_at is not null or new.archived_at is not null then
        raise exception 'Invalid initial event status';
      end if;
    elsif new.paid is distinct from old.paid
       or new.expires_at is distinct from old.expires_at
       or new.archived_at is distinct from old.archived_at
       or new.user_id is distinct from old.user_id
       or new.id is distinct from old.id
       or old.archived_at is not null
       or old.expires_at <= now() then
      raise exception 'Event status cannot be changed';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_event_lifecycle on public.events;
create trigger protect_event_lifecycle before insert or update on public.events
  for each row execute function public.protect_event_lifecycle();

-- Enforce expiration even when a guest leaves an old tab open.
create or replace function public.check_event_open_for_reservation()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_event public.events%rowtype;
begin
  if tg_table_name = 'event_reservations' then
    select e.* into v_event from public.events e
      join public.event_items i on i.event_id = e.id where i.id = new.item_id for share of e;
  else
    select * into v_event from public.events where id = new.event_id for share;
  end if;
  if v_event.id is null or not v_event.paid or v_event.archived_at is not null
     or v_event.expires_at <= now() then
    raise exception 'O periodo de reservas deste evento esta encerrado.';
  end if;
  return new;
end;
$$;
drop trigger if exists check_event_open on public.event_reservations;
create trigger check_event_open before insert on public.event_reservations
  for each row execute function public.check_event_open_for_reservation();
drop trigger if exists check_event_open on public.event_confirmations;
create trigger check_event_open before insert on public.event_confirmations
  for each row execute function public.check_event_open_for_reservation();

commit;

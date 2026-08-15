create table if not exists public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  phone text,
  auth_provider text,
  phone_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_user_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;

create trigger set_user_profiles_updated_at
before update on public.user_profiles
for each row
execute procedure public.set_user_profiles_updated_at();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (
    id,
    email,
    phone,
    auth_provider,
    phone_source
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'phone',
    new.raw_app_meta_data ->> 'provider',
    case
      when new.raw_user_meta_data ? 'phone' then 'auth_metadata'
      else null
    end
  )
  on conflict (id) do update
    set email = excluded.email,
        phone = coalesce(excluded.phone, public.user_profiles.phone),
        auth_provider = coalesce(excluded.auth_provider, public.user_profiles.auth_provider),
        phone_source = coalesce(excluded.phone_source, public.user_profiles.phone_source);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;

create trigger on_auth_user_created_profile
after insert on auth.users
for each row
execute procedure public.handle_new_user_profile();

alter table public.user_profiles enable row level security;

drop policy if exists "Users can view own profile" on public.user_profiles;
create policy "Users can view own profile"
on public.user_profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.user_profiles;
create policy "Users can insert own profile"
on public.user_profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.user_profiles;
create policy "Users can update own profile"
on public.user_profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

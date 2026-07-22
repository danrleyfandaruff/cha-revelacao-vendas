-- Tabela de acesso ao Pré-Natal: um token único por compra no Stripe.
create table if not exists pre_natal_access (
  id                 uuid primary key default gen_random_uuid(),
  token              text unique not null default gen_random_uuid()::text,
  stripe_session_id  text unique,
  email              text,
  created_at         timestamptz not null default now(),
  active             boolean not null default true
);

alter table pre_natal_access
  add column if not exists download_count integer not null default 0,
  add column if not exists max_downloads integer not null default 1,
  add column if not exists downloaded_at timestamptz;

-- RLS ligado, sem policy nenhuma pra anon/authenticated: ninguém lê a tabela
-- direto. O único jeito de "ler" um token é através das funções abaixo
-- (security definer, rodam com privilégio de dono, ignoram RLS).
alter table pre_natal_access enable row level security;

-- Chamada pela página /pre-natal logo depois do redirect do Stripe
-- (?session_id={CHECKOUT_SESSION_ID}). Devolve o token gerado pelo webhook
-- pra essa sessão de checkout específica, ou null se ainda não processou
-- (ou nunca vai processar, se a sessão for inválida).
create or replace function claim_pre_natal_token(p_session_id text)
returns text
language sql
security definer
set search_path = public
as $$
  select token
  from pre_natal_access
  where stripe_session_id = p_session_id
    and active = true
  limit 1;
$$;

-- Chamada quando o cliente digita/cola o código de acesso manualmente,
-- ou quando abre um link salvo /pre-natal?token=XYZ.
create or replace function verify_pre_natal_token(p_token text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1 from pre_natal_access
    where token = p_token and active = true
  );
$$;

create or replace function get_pre_natal_token_status(p_token text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'valid', true,
        'active', active,
        'downloads_used', download_count,
        'max_downloads', max_downloads,
        'can_download', active and download_count < max_downloads,
        'downloaded_at', downloaded_at
      )
      from pre_natal_access
      where token = p_token
      limit 1
    ),
    jsonb_build_object(
      'valid', false,
      'active', false,
      'downloads_used', 0,
      'max_downloads', 1,
      'can_download', false,
      'downloaded_at', null
    )
  );
$$;

create or replace function consume_pre_natal_download(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row pre_natal_access%rowtype;
begin
  update pre_natal_access
     set download_count = download_count + 1,
         downloaded_at = now(),
         active = case
           when download_count + 1 >= max_downloads then false
           else active
         end
   where token = p_token
     and active = true
     and download_count < max_downloads
  returning * into v_row;

  if found then
    return jsonb_build_object(
      'success', true,
      'status', jsonb_build_object(
        'valid', true,
        'active', v_row.active,
        'downloads_used', v_row.download_count,
        'max_downloads', v_row.max_downloads,
        'can_download', v_row.active and v_row.download_count < v_row.max_downloads,
        'downloaded_at', v_row.downloaded_at
      )
    );
  end if;

  if exists(select 1 from pre_natal_access where token = p_token) then
    return jsonb_build_object('success', false, 'reason', 'already_used');
  end if;

  return jsonb_build_object('success', false, 'reason', 'invalid');
end;
$$;

-- Pra revogar o acesso de alguém específico no futuro, rode:
-- update pre_natal_access set active = false where email = 'cliente@email.com';

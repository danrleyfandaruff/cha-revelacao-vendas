-- Tabela de acesso ao Pré-Natal: um token único por compra no Stripe.
create table if not exists pre_natal_access (
  id                 uuid primary key default gen_random_uuid(),
  token              text unique not null default gen_random_uuid()::text,
  stripe_session_id  text unique,
  email              text,
  created_at         timestamptz not null default now(),
  active             boolean not null default true
);

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

-- Pra revogar o acesso de alguém específico no futuro, rode:
-- update pre_natal_access set active = false where email = 'cliente@email.com';

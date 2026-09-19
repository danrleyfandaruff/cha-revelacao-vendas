create or replace function public.activate_event(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event events%rowtype;
begin
  update public.events
     set paid = true,
         expires_at = now() + interval '60 days'
   where user_id = p_user_id
   returning * into v_event;

  if not found then
    return jsonb_build_object('success', false, 'reason', 'event_not_found');
  end if;

  return jsonb_build_object('success', true, 'event_id', v_event.id, 'expires_at', v_event.expires_at);
end;
$$;

-- Conferência dos usuários ativos que terão a validade reajustada para 60 dias a partir de agora
select
  id,
  user_id,
  slug,
  paid,
  event_datetime,
  expires_at
from public.events
where paid = true
  and (expires_at is null or expires_at >= now())
order by created_at desc;

-- Correção dos eventos já ativos para expirar em 60 dias a partir de agora
update public.events
set expires_at = now() + interval '60 days'
where paid = true
  and (expires_at is null or expires_at >= now());

-- Apply after 20260919_event_types_and_history.sql. No existing data is changed.
begin;

create or replace function public.delete_event_entry(
  p_event_id uuid, p_entry_id uuid, p_kind text, p_expected_reservations integer default null
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_item public.event_items%rowtype;
  v_event public.events%rowtype;
  v_item_id uuid;
  v_count integer;
begin
  if auth.uid() is null or p_kind is null or p_kind not in ('reservation', 'item') then
    raise exception 'Operacao nao permitida.';
  end if;

  if p_kind = 'reservation' then
    select item_id into v_item_id from public.event_reservations where id = p_entry_id;
  else
    v_item_id := p_entry_id;
  end if;

  -- Use the same joined row locks as reserve_event_item to serialize inventory changes.
  select i.* into v_item from public.event_items i
    join public.events e on e.id = i.event_id
    where i.id = v_item_id and e.id = p_event_id and e.user_id = auth.uid()
    for update of i, e;
  if not found then
    raise exception 'Registro nao encontrado ou sem permissao. Atualize as respostas.';
  end if;
  select * into v_event from public.events where id = p_event_id;
  if v_event.archived_at is not null or v_event.expires_at <= now() then
    raise exception 'Evento encerrado. O historico de respostas e somente leitura.';
  end if;

  if p_kind = 'reservation' then
    delete from public.event_reservations where id = p_entry_id and item_id = v_item.id;
    -- A repeated request must never return another unit to the list.
    if found then
      update public.event_items set quantity_available = least(quantity_total, quantity_available + 1)
        where id = v_item.id;
    end if;
  else
    select count(*) into v_count from public.event_reservations where item_id = v_item.id;
    if p_expected_reservations is null or p_expected_reservations <> v_count then
      raise exception 'As reservas deste item mudaram. Atualize as respostas e confirme novamente.';
    end if;
    delete from public.event_reservations where item_id = v_item.id;
    delete from public.event_items where id = v_item.id;
  end if;
end;
$$;

revoke all on function public.delete_event_entry(uuid, uuid, text, integer) from public, anon;
grant execute on function public.delete_event_entry(uuid, uuid, text, integer) to authenticated;

commit;

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('owner deletion is atomic, scoped and restores availability exactly once', async () => {
  const db = new PGlite();
  const owner = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
  const stranger = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
  const event = '11111111-1111-4111-8111-111111111111';
  const item = '22222222-2222-4222-8222-222222222222';
  const otherItem = '33333333-3333-4333-8333-333333333333';
  const first = '44444444-4444-4444-8444-444444444444';
  const second = '55555555-5555-4555-8555-555555555555';
  const call = async (user, entry, kind, count = null, role = 'authenticated', eventId = event) => {
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user ?? '']);
    await db.exec(`set role ${role}`);
    try { return await db.query('select delete_event_entry($1, $2, $3, $4)', [eventId, entry, kind, count]); }
    finally { await db.exec('reset role'); }
  };
  const inventory = async () => (await db.query('select quantity_available from event_items where id=$1', [item])).rows[0]?.quantity_available;
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create function auth.uid() returns uuid language sql as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to anon, authenticated;
      create table events(id uuid primary key, user_id uuid, expires_at timestamptz, archived_at timestamptz);
      create table event_items(id uuid primary key, event_id uuid references events(id), quantity_total int, quantity_available int);
      create table event_reservations(id uuid primary key, item_id uuid references event_items(id) on delete restrict, guest_name text);
      create table event_confirmations(event_id uuid references events(id), guest_name text);
      insert into events values ('${event}', '${owner}', now() + interval '1 day', null);
      insert into event_items values ('${item}', '${event}', 2, 0), ('${otherItem}', '${event}', 1, 1);
      insert into event_reservations values ('${first}', '${item}', 'Maria'), ('${second}', '${item}', 'Maria');
      insert into event_confirmations values ('${event}', 'Maria');
      alter table event_reservations enable row level security;
      grant select, delete on event_reservations to authenticated;
    `);
    const migration = await readFile(new URL('../supabase/sql/20260927_owner_reservation_management.sql', import.meta.url), 'utf8');
    await db.exec(migration);
    await db.exec(migration);
    assert.equal(await inventory(), 0);
    await assert.rejects(call(null, first, 'reservation', null, 'anon'), /permission denied/);
    await assert.rejects(call(null, first, 'reservation'), /nao permitida/);
    await assert.rejects(call(stranger, first, 'reservation'), /sem permissao/);
    await assert.rejects(call(stranger, item, 'item', 2), /sem permissao/);
    await assert.rejects(call(owner, first, 'reservation', null, 'authenticated', otherItem), /sem permissao/);
    await assert.rejects(call(owner, item, 'invalid'), /nao permitida/);
    await assert.rejects(call(owner, item, 'item', 1), /mudaram/);
    await assert.rejects(call(owner, item, 'item'), /mudaram/);
    assert.equal(await inventory(), 0);
    await call(owner, first, 'reservation');
    assert.equal(await inventory(), 1);
    await assert.rejects(call(owner, first, 'reservation'), /nao encontrado/);
    assert.equal(await inventory(), 1);
    assert.equal((await db.query('select * from event_reservations')).rows.length, 1);

    await db.exec(`update events set expires_at=now() - interval '1 second'`);
    await assert.rejects(call(owner, second, 'reservation'), /encerrado/);
    await assert.rejects(call(owner, item, 'item', 1), /encerrado/);
    await db.exec(`update events set expires_at=now() + interval '1 day', archived_at=now()`);
    await assert.rejects(call(owner, item, 'item', 1), /encerrado/);
    await db.exec('update events set archived_at=null');

    // An item-delete failure rolls back its preceding reservation deletion.
    await db.exec(`create function deny_delete() returns trigger language plpgsql as $$ begin raise exception 'test failure'; end; $$;
      create trigger deny_delete before delete on event_items for each row execute function deny_delete();`);
    await assert.rejects(call(owner, item, 'item', 1), /test failure/);
    assert.equal((await db.query('select * from event_reservations')).rows.length, 1);
    assert.equal(await inventory(), 1);
    await db.exec('drop trigger deny_delete on event_items');
    await call(owner, item, 'item', 1);
    assert.equal((await db.query('select * from event_reservations')).rows.length, 0);
    assert.equal((await db.query('select * from event_items')).rows[0].id, otherItem);
    assert.equal((await db.query('select * from event_confirmations')).rows.length, 1);
    await call(owner, otherItem, 'item', 0);
    assert.equal((await db.query('select * from event_items')).rows.length, 0);
  } finally { await db.close(); }
});

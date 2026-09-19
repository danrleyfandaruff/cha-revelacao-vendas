import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import ts from 'typescript';
import { createHmac, webcrypto } from 'node:crypto';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../src/app/models/event-types.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022 } }).outputText;
const model = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('legacy baby events and all new occasions resolve correctly', () => {
  assert.equal(model.resolveEventType({ baby_name_1: 'Ana', baby_name_2: 'Ana' }), 'bebe');
  assert.equal(model.resolveEventType({ baby_name_1: 'Ana', baby_name_2: 'Pedro' }), 'revelacao');
  for (const type of model.EVENT_TYPES) {
    const event = { event_type: type.id, baby_name_1: 'Ana e Pedro', baby_name_2: 'Ana e Pedro' };
    assert.equal(model.resolveEventType(event), type.id);
    assert.equal(model.isBabyEvent(type.id), ['bebe', 'revelacao'].includes(type.id));
    if (!model.isBabyEvent(type.id)) {
      assert.equal(model.eventNames(event), 'Ana e Pedro');
      assert.ok(model.giftSuggestions(type.id).length >= 6);
    }
  }
  assert.equal(model.isEventType('invalid'), false);
});

test('expiration includes its exact boundary and archived events', () => {
  const now = Date.parse('2026-09-19T12:00:00Z');
  assert.equal(model.isEventExpired({ expires_at: null }, now), false);
  assert.equal(model.isEventExpired({ expires_at: new Date(now).toISOString() }, now), true);
  assert.equal(model.isEventExpired({ expires_at: new Date(now + 1).toISOString() }, now), false);
  assert.equal(model.isEventExpired({ expires_at: null, archived_at: new Date(now).toISOString() }, now), true);
});

test('webhook requires signed paid sessions and routes new and legacy references', async () => {
  const source = await readFile(new URL('../supabase/functions/stripe-webhook/index.ts', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  let handler;
  const calls = [];
  runInNewContext(code, {
    exports: {}, Request, Response, TextEncoder, crypto: webcrypto,
    console: { log() {}, error() {} },
    Deno: { serve(fn) { handler = fn; }, env: { get() { return 'fixture-secret'; } } },
    require() { return { createClient() { return { async rpc(name, params) {
      calls.push({ name, params }); return { data: { success: true }, error: null };
    } }; } }; },
  });
  const send = (reference, paid, type = 'checkout.session.completed', validSignature = true) => {
    const body = JSON.stringify({ type, data: { object: { client_reference_id: reference, payment_status: paid ? 'paid' : 'unpaid' } } });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac('sha256', 'fixture-secret').update(`${timestamp}.${body}`).digest('hex');
    return handler(new Request('http://localhost/webhook', { method: 'POST', body,
      headers: { 'stripe-signature': `t=${timestamp},v1=${validSignature ? signature : 'invalid'}` } }));
  };
  assert.equal((await send('event_new', true, undefined, false)).status, 400);
  assert.equal((await send('event_new', false)).status, 200);
  assert.equal(calls.length, 0);
  assert.equal((await send('event_new', true)).status, 200);
  assert.equal(calls[0].name, 'activate_event_by_id');
  assert.equal(calls[0].params.p_event_id, 'new');
  await send('old-user', true);
  assert.equal(calls[1].name, 'activate_event');
  assert.equal(calls[1].params.p_user_id, 'old-user');
  await send('event_async', true, 'checkout.session.async_payment_succeeded');
  assert.equal(calls[2].params.p_event_id, 'async');
});

test('database migration preserves history and isolates activation of each event', async () => {
  const db = new PGlite();
  const owner = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
  const stranger = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
  const oldId = '11111111-1111-4111-8111-111111111111';
  const newId = '22222222-2222-4222-8222-222222222222';
  const activeId = '33333333-3333-4333-8333-333333333333';
  const itemId = '44444444-4444-4444-8444-444444444444';
  const runAs = async (role, userId, sql, params = []) => {
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId ?? '']);
    await db.exec(`set role ${role}`);
    try { return await db.query(sql, params); }
    finally { await db.exec('reset role'); }
  };
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create schema auth;
      create function auth.uid() returns uuid language sql as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to anon, authenticated, service_role;
      create table events (
        id uuid primary key default gen_random_uuid(), user_id uuid not null unique,
        slug text not null unique, baby_name_1 text not null, baby_name_2 text not null,
        paid boolean not null default false, expires_at timestamptz,
        created_at timestamptz not null default now(), address text, event_datetime timestamptz
      );
      create table event_items (id uuid primary key, event_id uuid references events(id), name text);
      create table event_reservations (id uuid primary key default gen_random_uuid(),
        item_id uuid references event_items(id), guest_name text);
      create table event_confirmations (id uuid primary key default gen_random_uuid(),
        event_id uuid references events(id), guest_name text);
      create function public.activate_event(p_user_id uuid)
        returns json language sql as $$ select '{"success": false}'::json $$;
      alter table events enable row level security;
      create policy owner_events on events for all to authenticated
        using (user_id = auth.uid()) with check (user_id = auth.uid());
      create policy guest_events on events for select to anon using (paid);
      grant select, insert, update on events to authenticated;
      grant select on events to anon;
      grant select, insert on event_items, event_reservations, event_confirmations to anon, authenticated;
      insert into events(id, user_id, slug, baby_name_1, baby_name_2, paid, expires_at, created_at)
      values ('${oldId}', '${owner}', 'original-link', 'Ana', 'Pedro', true, now() - interval '1 day', now() - interval '61 days'),
        ('${activeId}', '${stranger}', 'active-link', 'Bia', 'Bia', true, now() + interval '10 days', now() - interval '20 days');
      insert into event_items values ('${itemId}', '${oldId}', 'Presente original');
      insert into event_reservations(item_id, guest_name) values ('${itemId}', 'Convidado original');
      insert into event_confirmations(event_id, guest_name) values ('${oldId}', 'Convidado original');
    `);
    const original = (await db.query('select id, slug, paid, expires_at from events order by id')).rows;
    const migration = await readFile(new URL('../supabase/sql/20260919_event_types_and_history.sql', import.meta.url), 'utf8');
    await db.exec(migration);
    await db.exec(migration);
    assert.equal((await db.query("select pg_get_function_result('public.activate_event(uuid)'::regprocedure) as result")).rows[0].result, 'jsonb');
    assert.deepEqual((await db.query('select id, slug, paid, expires_at from events order by id')).rows, original);

    await assert.rejects(runAs('authenticated', stranger, 'select archive_expired_event($1)', [oldId]), /Event not found/);
    await assert.rejects(runAs('authenticated', stranger, 'select archive_expired_event($1)', [activeId]), /has not expired/);
    await assert.rejects(runAs('authenticated', owner, 'select activate_event_by_id($1)', [oldId]), /permission denied/);
    await assert.rejects(runAs('authenticated', owner, 'select activate_event($1)', [owner]), /permission denied/);
    await assert.rejects(runAs('anon', null, 'select activate_event($1)', [owner]), /permission denied/);
    await assert.rejects(runAs('authenticated', owner, 'update events set expires_at = now() + interval \'60 days\' where id = $1', [oldId]), /cannot be changed/);

    const insertNext = () => runAs('authenticated', owner,
      'insert into events(id, user_id, slug, baby_name_1, baby_name_2, event_type) values ($1, $2, $3, $4, $4, $5)',
      [newId, owner, 'new-wedding-link', 'Ana e Pedro', 'casamento']);
    await assert.rejects(insertNext(), /duplicate key/);
    await runAs('authenticated', owner, 'select archive_expired_event($1)', [oldId]);
    await runAs('authenticated', owner, 'select archive_expired_event($1)', [oldId]);
    await insertNext();
    assert.equal((await runAs('authenticated', owner, 'select * from events')).rows.length, 2);
    assert.equal((await db.query('select * from event_reservations')).rows.length, 1);
    assert.equal((await db.query('select * from event_confirmations')).rows.length, 1);
    await assert.rejects(runAs('authenticated', owner, 'update events set paid = true where id = $1', [newId]), /cannot be changed/);

    await runAs('service_role', null, 'select activate_event($1)', [owner]);
    assert.equal((await db.query('select paid from events where id = $1', [newId])).rows[0].paid, false);
    const activated = (await runAs('service_role', null, 'select activate_event_by_id($1) as result', [newId])).rows[0].result;
    assert.equal(activated.success, true);
    assert.ok(Math.abs(Date.parse(activated.expires_at) - Date.now() - 60 * 86400000) < 10000);
    const retry = (await runAs('service_role', null, 'select activate_event_by_id($1) as result', [newId])).rows[0].result;
    assert.equal(retry.expires_at, activated.expires_at);
    assert.equal((await db.query('select expires_at from events where id = $1', [oldId])).rows[0].expires_at.getTime(), original[0].expires_at.getTime());

    await assert.rejects(runAs('anon', null,
      'insert into event_reservations(item_id, guest_name) values ($1, $2)', [itemId, 'Late guest']), /encerrado/);
    await assert.rejects(runAs('anon', null,
      'insert into event_confirmations(event_id, guest_name) values ($1, $2)', [oldId, 'Late guest']), /encerrado/);
    await runAs('anon', null, 'insert into event_confirmations(event_id, guest_name) values ($1, $2)', [newId, 'New guest']);
    const visibleOld = await runAs('anon', null, 'select slug from events where id = $1', [oldId]);
    assert.equal(visibleOld.rows[0].slug, 'original-link');
  } finally {
    await db.close();
  }
});

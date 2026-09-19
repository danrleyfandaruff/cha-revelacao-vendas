import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/app/models/auth-flow.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022 } }).outputText;
const { safeNextUrl, readAuthCallback, formatPhone, phoneDigits, isAuthPage, isPrivatePage } =
  await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('return destination stays inside private application pages', () => {
  for (const value of [null, '', '//example.com', '/\\example.com', 'https://example.com', '/login', '/landing', '/comece', '/missing', '/%2fexample.com', '/resultados\n']) {
    assert.equal(safeNextUrl(value), '/configurar', String(value));
  }
  assert.equal(safeNextUrl('/resultados?event=123'), '/resultados?event=123');
  assert.equal(safeNextUrl('/pagar'), '/pagar');
  assert.equal(isAuthPage('/comece'), true);
  assert.equal(isPrivatePage('/cha'), false);
});

test('callback detection supports the root, login, errors and password recovery', () => {
  assert.equal(readAuthCallback('https://app.test/#access_token=fixture&refresh_token=fixture').present, true);
  assert.equal(readAuthCallback('https://app.test/login?code=fixture&next=%2Fpagar').next, '/pagar');
  assert.equal(readAuthCallback('https://app.test/#error=access_denied').error, 'access_denied');
  assert.equal(readAuthCallback('https://app.test/#access_token=fixture&type=recovery').recovery, true);
  assert.equal(readAuthCallback('https://app.test/cha?e=fixture').present, false);
});

test('phone formatting preserves DDD 55 and handles a complete country code', () => {
  assert.equal(formatPhone('55999999999'), '(55) 99999-9999');
  assert.equal(formatPhone('+55 (55) 99999-9999'), '(55) 99999-9999');
  assert.equal(phoneDigits('5555999999999'), '55999999999');
  assert.equal(formatPhone('48999999999'), '(48) 99999-9999');
  assert.equal(formatPhone('4833334444'), '(48) 3333-4444');
  assert.equal(formatPhone('55'), '(55');
});

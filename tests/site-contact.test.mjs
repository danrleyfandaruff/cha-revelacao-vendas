import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/app/models/site-contact.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022 } }).outputText;
const { SUPPORT_WHATSAPP_NUMBER, supportWhatsAppUrl } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('all support links use the requested WhatsApp number', () => {
  assert.equal(SUPPORT_WHATSAPP_NUMBER, '5514982325360');
  const url = new URL(supportWhatsAppUrl());
  assert.equal(url.origin, 'https://wa.me');
  assert.equal(url.pathname, '/5514982325360');
  assert.match(url.searchParams.get('text'), /Listas para celebrar/);
});

test('custom support messages remain encoded in a single text parameter', () => {
  const message = 'Olá! Dúvida sobre acesso & lista? #ajuda';
  const url = new URL(supportWhatsAppUrl(message));
  assert.equal(url.searchParams.get('text'), message);
  assert.equal(url.searchParams.size, 1);
  assert.equal(url.hash, '');
});

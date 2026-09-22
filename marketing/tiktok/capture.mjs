import { chromium } from '@playwright/test';
import ts from 'typescript';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(dir, 'assets', 'screens');
await mkdir(out, { recursive: true });
const source = await readFile(path.join(dir, '../../tests/e2e/fixtures.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022 } }).outputText;
const { mockSite, event, eventId } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 680 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
const state = await mockSite(context, { loggedIn: true, events: [] });
const page = await context.newPage();
const shots = [];
async function shot(name, locator) {
  if (locator) await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, name + '.png'), animations: 'disabled' });
  shots.push(name);
  console.log('Captured', name);
}
try {
  const publicContext = await browser.newContext({ viewport: { width: 390, height: 680 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  await mockSite(publicContext);
  const publicPage = await publicContext.newPage();
  await publicPage.goto('http://127.0.0.1:4205/login');
  await publicPage.getByPlaceholder('seu@email.com').waitFor();
  await publicPage.waitForTimeout(600);
  await publicPage.screenshot({ path: path.join(out, 'login.png'), animations: 'disabled' });
  await publicContext.close();

  await page.goto('http://127.0.0.1:4205/configurar');
  await page.getByRole('button', { name: /Começar/ }).click();
  await page.locator('.event-type-options').waitFor();
  await shot('tipos');
  await page.locator('.event-type-options').getByRole('button', { name: 'Casamento', exact: true }).click();
  await page.locator('.wizard-input').fill('Lia e Lucas');
  await shot('nomes');
  await page.getByRole('button', { name: /Continuar/ }).click();
  await page.locator('.wizard-input').fill('Espaço Jardim · Rua das Flores, 120');
  await shot('local');
  await page.getByRole('button', { name: /Continuar/ }).click();
  const date = new Date(Date.now() + 35 * 86400000).toISOString().slice(0, 10) + 'T16:00';
  await page.locator('.wizard-date-input').fill(date);
  await shot('data');
  await page.getByRole('button', { name: /Continuar/ }).click();
  await page.getByRole('button', { name: /Montar minha lista de presentes/ }).click();
  await page.locator('.items-card').evaluate(el => el.scrollIntoView({ block: 'start' }));
  await shot('presentes');
  await page.locator('.item-row').first().locator('.qty-btn').last().click();
  await shot('quantidades');
  await page.getByRole('button', { name: 'Salvar e gerar link', exact: true }).click();
  await page.getByRole('heading', { name: 'Sua lista está pronta!' }).waitFor();
  await shot('salvar');
  await page.goto('http://127.0.0.1:4205/pagar');
  await page.getByRole('button', { name: /Pagar R\$19,90/ }).waitFor();
  await shot('ativar');

  // Only local fixtures are activated. No payment or production write occurs.
  state.events[0].paid = true;
  state.events[0].expires_at = new Date(Date.now() + 60 * 86400000).toISOString();
  await page.goto('http://127.0.0.1:4205/configurar');
  await page.locator('.link-card').waitFor();
  await page.addStyleTag({ content: '.link-url { filter: blur(5px); }' });
  await page.locator('.link-card').evaluate(el => el.scrollIntoView({ block: 'start' }));
  await shot('compartilhar');

  const guest = await browser.newContext({ viewport: { width: 390, height: 680 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  const guestState = await mockSite(guest);
  const guestPage = await guest.newPage();
  const occasions = [
    ['revelacao', 'Lia', 'Lucas'], ['bebe', 'Lia', 'Lia'], ['casamento', 'Lia e Lucas', 'Lia e Lucas'],
    ['panela', 'Marina', 'Marina'], ['casa_nova', 'Bia e Rafa', 'Bia e Rafa'], ['aniversario', 'Gabriel', 'Gabriel'],
  ];
  for (const [type, name1, name2] of occasions) {
    guestState.events[0] = { ...event, event_type: type, baby_sex: 'menina', baby_name_1: name1, baby_name_2: name2, event_datetime: date };
    await guestPage.goto('http://127.0.0.1:4205/cha?e=fixture-list');
    await guestPage.getByRole('button', { name: /Ver a lista de presentes/ }).waitFor();
    await guestPage.waitForTimeout(400);
    await guestPage.screenshot({ path: path.join(out, `tipo-${type}.png`), animations: 'disabled' });
  }
  guestState.events[0] = { ...event, baby_name_1: 'Lia e Lucas', baby_name_2: 'Lia e Lucas' };
  guestState.items[0].quantity_total = 1;
  guestState.items[0].quantity_available = 1;
  await guestPage.goto('http://127.0.0.1:4205/cha?e=fixture-list');
  await guestPage.getByRole('button', { name: /Ver a lista de presentes/ }).click();
  await guestPage.getByRole('button', { name: 'Quero presentear!', exact: true }).waitFor();
  await guestPage.screenshot({ path: path.join(out, 'convidado-lista.png'), animations: 'disabled' });
  await guestPage.getByRole('button', { name: 'Quero presentear!', exact: true }).click();
  await guestPage.getByRole('button', { name: 'Finalizar', exact: true }).click();
  await guestPage.getByPlaceholder('Seu nome completo').fill('Marina Souza');
  await guestPage.screenshot({ path: path.join(out, 'convidado-nome.png'), animations: 'disabled' });
  await guestPage.getByRole('button', { name: /Confirmar/ }).click();
  await guestPage.getByRole('heading', { name: 'Obrigado, Marina Souza!' }).waitFor();
  await guestPage.screenshot({ path: path.join(out, 'reserva.png'), animations: 'disabled' });
  await guest.close();

  state.events[0] = { ...event, baby_name_1: 'Lia e Lucas', baby_name_2: 'Lia e Lucas' };
  state.items = [{ id: '44444444-4444-4444-8444-444444444444', event_id: eventId, category: 'presentes', name: 'Jogo de jantar', emoji: '🎁', quantity_total: 1, quantity_available: 0, sort_order: 0 }];
  state.confirmations = [{ id: 'demo-confirmation', event_id: eventId, guest_name: 'Marina Souza', confirmed_at: new Date().toISOString() }];
  await context.route('**/rest/v1/event_reservations*', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ id: 'demo-reservation', item_id: state.items[0].id, guest_name: 'Marina Souza', created_at: new Date().toISOString(), event_items: state.items[0] }]) }));
  await page.goto(`http://127.0.0.1:4205/resultados?event=${eventId}`);
  await page.locator('.res-item-name').filter({ hasText: 'Jogo de jantar' }).waitFor();
  await page.addStyleTag({ content: '.link-url { filter: blur(5px); }' });
  await shot('painel');
  state.events[0] = { ...event, event_type: 'bebe', baby_name_1: 'Lia', baby_name_2: 'Lia', baby_sex: 'menina' };
  state.items = [{ ...state.items[0], category: 'fraldas', name: 'Fralda M', emoji: '🧷', quantity_total: 10, quantity_available: 10 }];
  await page.goto('http://127.0.0.1:4205/configurar');
  await page.locator('.items-card').waitFor();
  await page.locator('.items-card').evaluate(el => el.scrollIntoView({ block: 'start' }));
  await shot('fraldas');
  await writeFile(path.join(out, 'capture-info.json'), JSON.stringify({ capturedAt: new Date().toISOString(), source: 'Actual local Angular app; mocked authentication, payments and data; fictional people.', shots }, null, 2));
} finally { await browser.close(); }

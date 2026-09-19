import { test, expect } from '@playwright/test';
import { event, eventId, mockSite } from './fixtures';

test('expired list creates a separate wedding list and preserves its history', async ({ page, context }) => {
  const state = await mockSite(context, { loggedIn: true, events: [{ ...event, expires_at: new Date(Date.now() - 86400000).toISOString() }] });
  await page.goto('/configurar');
  await expect(page.getByRole('heading', { name: 'Sua lista foi encerrada' })).toBeVisible();
  await page.getByRole('button', { name: 'Criar outro evento', exact: true }).click();
  await page.getByRole('button', { name: /Começar/ }).click();
  await expect(page.locator('.event-type-options button')).toHaveCount(6);
  await page.locator('.event-type-options').getByRole('button', { name: 'Casamento', exact: true }).click();
  await page.locator('.wizard-input').fill('Lia e Lucas');
  await page.getByRole('button', { name: /Continuar/ }).click();
  await page.getByRole('button', { name: 'Definir depois', exact: true }).click();
  await page.getByRole('button', { name: 'Definir depois', exact: true }).click();
  await page.getByRole('button', { name: /Montar minha lista de presentes/ }).click();
  await page.getByRole('button', { name: 'Salvar e gerar link', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sua lista está pronta!' })).toBeVisible();
  expect(state.events).toHaveLength(2);
  expect(state.events[0].event_type).toBe('casamento');
  expect(state.events[0].paid).toBe(false);
  expect(state.events[0].expires_at).toBeNull();
  expect(state.events[0].slug).not.toBe(event.slug);
  expect(state.events[1].slug).toBe(event.slug);
  expect(state.items.every(item => item.category === 'presentes')).toBe(true);
  await page.goto(`/resultados?event=${eventId}`);
  await expect(page.getByText('Evento encerrado · Histórico de respostas', { exact: true })).toBeVisible();
});

for (const [type, title] of [['casamento', 'Casamento'], ['panela', 'Chá de panela'], ['casa_nova', 'Casa nova'], ['aniversario', 'Aniversário']]) {
  test(`${type} guest reserves gifts without selecting diapers`, async ({ page, context }) => {
    const state = await mockSite(context, { events: [{ ...event, event_type: type }] });
    await page.goto(`/cha?e=${event.slug}`);
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Ver a lista de presentes/ }).click();
    await expect(page.locator('.step-tabs').getByText('Fraldas', { exact: false })).toHaveCount(0);
    await page.getByRole('button', { name: 'Quero presentear!', exact: true }).click();
    await page.getByRole('button', { name: 'Finalizar', exact: true }).click();
    await page.getByPlaceholder('Seu nome completo').fill('Maria convidada');
    await page.getByRole('button', { name: /Confirmar/ }).click();
    await expect(page.getByRole('heading', { name: 'Obrigado, Maria convidada!' })).toBeVisible();
    expect(state.reservations).toHaveLength(1);
    expect(state.confirmations).toHaveLength(1);
  });
}

test('preview never records reservations and cannot bypass expiration', async ({ page, context }) => {
  const state = await mockSite(context, { events: [{ ...event, paid: false, expires_at: null }] });
  await page.goto(`/cha?e=${event.slug}&preview=1`);
  await page.getByRole('button', { name: /Ver a lista de presentes/ }).click();
  await page.getByRole('button', { name: 'Quero presentear!', exact: true }).click();
  await page.getByRole('button', { name: 'Finalizar', exact: true }).click();
  await page.getByPlaceholder('Seu nome completo').fill('Maria');
  await page.getByRole('button', { name: /Confirmar/ }).click();
  await expect(page.getByRole('heading', { name: 'Obrigado, Maria!' })).toBeVisible();
  expect(state.reservations).toHaveLength(0);
  state.events[0].expires_at = new Date(Date.now() - 86400000).toISOString();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Evento encerrado' })).toBeVisible();
});

test('baby lists still offer diapers before gifts', async ({ page, context }) => {
  const state = await mockSite(context, { events: [{ ...event, event_type: null, baby_name_1: 'Lia', baby_name_2: 'Lia' }] });
  state.items.unshift({ ...state.items[0], id: 'diaper-fixture', name: 'Fralda M', category: 'fraldas' });
  await page.goto(`/cha?e=${event.slug}&s=menina`);
  await expect(page.getByRole('heading', { name: 'Chá de bebê', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Ver a lista de presentes/ }).click();
  await expect(page.getByText('Fralda M', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Quero presentear!', exact: true }).click();
  await expect(page.getByText('Fralda escolhida:', { exact: true })).toBeVisible();
  await expect(page.getByText('Jogo de jantar', { exact: true })).toBeVisible();
});

test('payment return waits for the webhook and checkout references the exact event', async ({ page, context }) => {
  const state = await mockSite(context, { loggedIn: true, events: [{ ...event, paid: false, expires_at: null }] });
  await page.goto('/pagar?status=success');
  await expect(page.getByRole('status')).toContainText('Aguardando confirmação');
  expect(state.requests.some(r => r.resource.startsWith('activate_event'))).toBe(false);
  state.events[0].paid = true;
  state.events[0].expires_at = event.expires_at;
  await page.getByRole('button', { name: 'Consultar novamente' }).click();
  await expect(page.getByRole('heading', { name: 'Evento ativado!' })).toBeVisible();
  state.events[0].paid = false;
  state.events[0].expires_at = null;
  await page.goto('/pagar');
  const checkout = page.waitForRequest(request => request.url().startsWith('https://buy.stripe.com/'));
  await page.getByRole('button', { name: 'Pagar R$19,90 e ativar agora' }).click();
  expect(new URL((await checkout).url()).searchParams.get('client_reference_id')).toBe(`event_${eventId}`);
});

test('authenticated hosts can still open the public guest page', async ({ page, context }) => {
  await mockSite(context, { loggedIn: true });
  await page.goto(`/cha?e=${event.slug}`);
  await expect(page.getByRole('heading', { name: 'Casamento', exact: true })).toBeVisible();
  await expect(page).toHaveURL(`/cha?e=${event.slug}`);
});

test('returning from payment refreshes dashboard activation', async ({ page, context }) => {
  const state = await mockSite(context, { loggedIn: true, events: [{ ...event, paid: false, expires_at: null }] });
  await page.goto('/configurar');
  await page.locator('.preview-activate-cta').click();
  await page.getByRole('button', { name: /Ativar agora por/ }).click();
  await expect(page).toHaveURL(/\/pagar$/);
  await expect(page.getByRole('button', { name: 'Pagar R$19,90 e ativar agora' })).toBeEnabled();
  state.events[0].paid = true;
  state.events[0].expires_at = event.expires_at;
  await page.getByRole('button', { name: 'Voltar ao evento' }).click();
  await expect(page.getByText('Evento ativo e pronto para compartilhar', { exact: true })).toBeVisible();
});

test('returning from results preserves unsaved edits in the dashboard', async ({ page, context }) => {
  await mockSite(context, { loggedIn: true });
  await page.goto('/configurar');
  await page.locator('.item-name-input').fill('Presente editado');
  await page.getByText('Acompanhar respostas', { exact: true }).click();
  await expect(page).toHaveURL(/\/resultados\?/);
  await page.getByRole('button', { name: 'Voltar ao evento' }).click();
  await expect(page.locator('.item-name-input')).toHaveValue('Presente editado');
});

test('failed item fetch cannot be mistaken for an empty list or saved over it', async ({ page, context }) => {
  const state = await mockSite(context, { loggedIn: true, failResources: ['event_items'] });
  await page.goto('/configurar');
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar');
  await expect(page.getByRole('button', { name: 'Salvar e gerar link' })).toHaveCount(0);
  state.failResources.clear();
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.locator('.item-name-input')).toHaveValue('Jogo de jantar');
});

test('guest can retry a temporary connection failure', async ({ page, context }) => {
  const state = await mockSite(context, { failResources: ['event_items'] });
  await page.goto(`/cha?e=${event.slug}`);
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar a lista');
  state.failResources.clear();
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByRole('heading', { name: 'Casamento', exact: true })).toBeVisible();
});

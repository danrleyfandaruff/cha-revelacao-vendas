import { test, expect } from '@playwright/test';
import { event, eventId, mockSite } from './fixtures';

async function seed(context: Parameters<typeof mockSite>[0]) {
  const state = await mockSite(context, { loggedIn: true });
  state.items[0].quantity_available = 0;
  state.reservationRows.push(...['first', 'second'].map(id => ({ id, item_id: state.items[0].id,
    guest_name: 'Maria', created_at: '2026-09-20T12:00:00Z' })));
  state.confirmations.push({ id: 'attendance', event_id: eventId, guest_name: 'Maria', confirmed_at: '2026-09-20T12:00:00Z' });
  return state;
}

test('reservation deletion requires confirmation and releases only the selected unit', async ({ page, context }) => {
  const state = await seed(context);
  await page.goto('/resultados');
  await page.getByRole('button', { name: /Excluir reserva de Maria/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Excluir esta reserva?' })).toBeVisible();
  expect(state.requests.filter(r => r.resource === 'delete_event_entry')).toHaveLength(0);
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Excluir esta reserva?' })).toBeHidden();
  expect(state.reservationRows).toHaveLength(2);
  await page.getByRole('button', { name: /Excluir reserva de Maria/ }).first().click();
  await page.getByRole('button', { name: 'Sim, excluir', exact: true }).click();
  await expect(page.getByRole('button', { name: /Excluir reserva de Maria/ })).toHaveCount(1);
  expect(state.items[0].quantity_available).toBe(1);
  expect(state.reservationRows[0].id).toBe('second');
  expect(state.confirmations).toHaveLength(1);
});

test('item deletion warns about its reservations and cannot reappear in the cached dashboard', async ({ page, context }) => {
  const state = await seed(context);
  await page.goto('/configurar');
  await page.getByText('Acompanhar respostas', { exact: true }).click();
  await page.getByRole('button', { name: 'Excluir item Jogo de jantar', exact: true }).click();
  await expect(page.locator('ion-modal')).toContainText('2 reserva(s)');
  await page.getByRole('button', { name: 'Sim, excluir', exact: true }).click();
  await expect(page.getByText('Nenhum item cadastrado.', { exact: true })).toBeVisible();
  expect(state.items).toHaveLength(0);
  expect(state.reservationRows).toHaveLength(0);
  expect(state.confirmations).toHaveLength(1);
  await page.getByRole('button', { name: 'Voltar ao evento' }).click();
  await expect(page.locator('.item-name-input')).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('Evento ativo e pronto para compartilhar', { exact: true })).toBeVisible();
  await expect(page.locator('.item-name-input')).toHaveCount(0);
});

test('returning from management preserves other draft edits but drops deleted items', async ({ page, context }) => {
  const state = await seed(context);
  state.items.push({ ...state.items[0], id: 'other-item', name: 'Toalhas', quantity_available: 2 });
  await page.goto('/configurar');
  await page.locator('.item-name-input').nth(1).fill('Toalhas editadas');
  await page.getByText('Acompanhar respostas', { exact: true }).click();
  await page.getByRole('button', { name: 'Excluir item Jogo de jantar', exact: true }).click();
  await page.getByRole('button', { name: 'Sim, excluir', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Excluir item Jogo de jantar', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Voltar ao evento' }).click();
  await expect(page.locator('.item-name-input')).toHaveCount(1);
  await expect(page.locator('.item-name-input')).toHaveValue('Toalhas editadas');
  await page.getByRole('button', { name: /Salvar/, exact: false }).click();
  await expect.poll(() => state.items[0]?.name).toBe('Toalhas editadas');
  expect(state.items).toHaveLength(1);
});

test('deletion failure keeps the warning open and supports retry', async ({ page, context }) => {
  const state = await seed(context);
  state.failResources.add('delete_event_entry');
  await page.goto('/resultados');
  await page.getByRole('button', { name: /Excluir reserva de Maria/ }).first().click();
  await page.getByRole('button', { name: 'Sim, excluir', exact: true }).click();
  await expect(page.locator('ion-modal [role="alert"]')).toContainText('Não foi possível excluir');
  expect(state.reservationRows).toHaveLength(2);
  state.failResources.clear();
  await page.getByRole('button', { name: 'Sim, excluir', exact: true }).click();
  await expect(page.getByRole('button', { name: /Excluir reserva de Maria/ })).toHaveCount(1);
});

test('new reservations require a fresh item deletion confirmation', async ({ page, context }) => {
  const state = await seed(context);
  await page.goto('/resultados');
  await page.getByRole('button', { name: 'Excluir item Jogo de jantar', exact: true }).click();
  state.reservationRows.pop();
  await page.getByRole('button', { name: 'Sim, excluir', exact: true }).click();
  await expect(page.locator('ion-modal [role="alert"]')).toContainText('As reservas deste item mudaram');
  expect(state.items).toHaveLength(1);
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.getByRole('button', { name: 'Atualizar respostas' }).click();
  await expect(page.getByRole('button', { name: /Excluir reserva de Maria/ })).toHaveCount(1);
  await page.getByRole('button', { name: 'Excluir item Jogo de jantar', exact: true }).click();
  await expect(page.locator('ion-modal')).toContainText('1 reserva(s)');
  await page.getByRole('button', { name: 'Sim, excluir', exact: true }).click();
  await expect(page.getByText('Nenhum item cadastrado.', { exact: true })).toBeVisible();
});

test('expired history offers no destructive actions', async ({ page, context }) => {
  await mockSite(context, { loggedIn: true, events: [{ ...event, expires_at: '2020-01-01T00:00:00Z' }] });
  await page.goto('/resultados');
  await expect(page.getByText('Evento encerrado · Histórico de respostas', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Excluir/ })).toHaveCount(0);
});

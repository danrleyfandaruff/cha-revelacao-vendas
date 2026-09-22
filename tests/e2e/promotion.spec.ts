import { test, expect } from '@playwright/test';
import { event, mockSite } from './fixtures';

const supportName = 'Falar com Listas para celebrar no WhatsApp (abre em outra aba)';
const occasions = ['Chá revelação', 'Chá de bebê', 'Casamento', 'Chá de panela', 'Casa nova', 'Aniversário'];

test('expired guest event presents all occasions and opens signup', async ({ page, context }, testInfo) => {
  const state = await mockSite(context, { events: [{ ...event, expires_at: new Date(Date.now() - 86400000).toISOString() }] });
  await page.goto('/cha?e=fixture-list');
  await expect(page.getByRole('heading', { name: 'Evento encerrado' })).toBeVisible();
  const promotion = page.getByRole('region', { name: 'Conheça o Listas para celebrar' });
  await expect(promotion.getByRole('link', { name: 'Criar meu evento', exact: true })).toBeInViewport();
  for (const name of occasions) await expect(promotion.getByText(name, { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('expired-promotion.png') });
  await page.getByRole('link', { name: 'Criar meu evento', exact: true }).click();
  await expect(page).toHaveURL(/\/login\?mode=cadastrar&next=%2Fconfigurar$/);
  expect(state.reservations).toHaveLength(0);
});

test('reservation success and a returning guest both promote the site without duplicating reservations', async ({ page, context }, testInfo) => {
  const state = await mockSite(context);
  await page.goto('/cha?e=fixture-list');
  await page.getByRole('button', { name: /Ver a lista de presentes/ }).click();
  await page.getByRole('button', { name: 'Quero presentear!', exact: true }).click();
  await page.getByRole('button', { name: 'Finalizar', exact: true }).click();
  await page.getByPlaceholder('Seu nome completo').fill('Marina');
  await page.getByRole('button', { name: /Confirmar/ }).click();
  await expect(page.getByRole('heading', { name: 'Obrigado, Marina!' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Criar minha lista', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('reservation-promotion.png') });
  await page.reload();
  await expect(page.getByText('Você já participou desta lista de presentes.')).toBeVisible();
  await expect(page.locator('.already-card app-site-promotion')).toBeVisible();
  await expect(page.locator('app-site-promotion')).toHaveCount(1);
  expect(state.reservations).toHaveLength(1);
  expect(state.confirmations).toHaveLength(1);
});

test('invalid event link preserves its explanation and lets the guest discover the site', async ({ page, context }) => {
  await mockSite(context, { events: [] });
  await page.goto('/cha?e=missing');
  await expect(page.getByRole('heading', { name: 'Evento não encontrado' })).toBeVisible();
  await page.getByRole('link', { name: /Conhecer o site/ }).click();
  await expect(page).toHaveURL(/\/landing$/);
});

test('promotion never replaces a retry after a connection error', async ({ page, context }) => {
  const state = await mockSite(context, { failResources: ['event_items'] });
  await page.goto('/cha?e=fixture-list');
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar a lista');
  await expect(page.getByRole('link', { name: /Conhecer o site/ })).toBeVisible();
  state.failResources.clear();
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByRole('button', { name: /Ver a lista de presentes/ })).toBeVisible();
});

test('discreet promotion opens separately without losing the guest cart', async ({ page, context }) => {
  await mockSite(context);
  await page.goto('/cha?e=fixture-list');
  await page.getByRole('button', { name: /Ver a lista de presentes/ }).click();
  await page.getByRole('button', { name: 'Quero presentear!', exact: true }).click();
  const link = page.getByRole('link', { name: /Conheça e crie sua lista/ });
  await expect(link).toHaveAttribute('target', '_blank');
  const popupPromise = page.waitForEvent('popup');
  await link.click();
  const popup = await popupPromise;
  await popup.waitForURL(/\/landing$/);
  await expect(page).toHaveURL(/\/cha\?e=fixture-list$/);
  await expect(page.getByRole('button', { name: 'Finalizar', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: /Escolhido/ })).toBeVisible();
  await popup.close();
});

test('owner preview has no acquisition cards before or after a simulated reservation', async ({ page, context }) => {
  await mockSite(context, { events: [{ ...event, paid: false, expires_at: null }] });
  await page.goto('/cha?e=fixture-list&preview=1');
  await page.getByRole('button', { name: /Ver a lista de presentes/ }).click();
  await expect(page.locator('app-site-promotion')).toHaveCount(0);
  await page.getByRole('button', { name: 'Quero presentear!', exact: true }).click();
  await page.getByRole('button', { name: 'Finalizar', exact: true }).click();
  await page.getByPlaceholder('Seu nome completo').fill('Prévia');
  await page.getByRole('button', { name: /Confirmar/ }).click();
  await expect(page.getByRole('heading', { name: 'Obrigado, Prévia!' })).toBeVisible();
  await expect(page.locator('app-site-promotion')).toHaveCount(0);
});

for (const route of ['/landing', '/comece2', '/login', '/comece']) {
  test(`floating WhatsApp on ${route} keeps the correct contact visible while scrolling`, async ({ page, context }, testInfo) => {
    await mockSite(context);
    await context.addInitScript(() => sessionStorage.setItem('comece_kit_popup_shown', '1'));
    await page.goto(route);
    const link = page.getByRole('link', { name: supportName });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', /^https:\/\/wa\.me\/5514982325360\?text=/);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    const before = await link.boundingBox();
    expect(before).not.toBeNull();
    await page.locator('ion-content').evaluate((el: any) => el.scrollToBottom(0));
    await page.waitForTimeout(150);
    const after = await link.boundingBox();
    expect(Math.abs(after!.y - before!.y)).toBeLessThan(2);
    expect(after!.x + after!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(after!.y + after!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    if (route === '/landing') await page.screenshot({ path: testInfo.outputPath('whatsapp-home.png') });
  });
}

test('WhatsApp opens a separate tab with the requested number, without sending a message', async ({ page, context }) => {
  await mockSite(context);
  await page.goto('/landing');
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('link', { name: supportName }).click();
  const popup = await popupPromise;
  await popup.waitForURL(/^https:\/\/wa\.me\/5514982325360\?/);
  await expect(page).toHaveURL(/\/landing$/);
  await popup.close();
});

test('comece popup hides the floating contact until closed', async ({ page, context }) => {
  await mockSite(context);
  await page.goto('/comece2');
  await expect(page.getByRole('button', { name: 'Fechar', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: supportName })).toHaveCount(0);
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await expect(page.getByRole('link', { name: supportName })).toBeVisible();
});

for (const route of ['/convite', '/dicas', '/pre-natal']) {
  test(`public tool ${route} also introduces the six list types`, async ({ page, context }) => {
    await mockSite(context);
    await page.goto(route);
    const promotion = page.locator('app-site-promotion');
    await promotion.scrollIntoViewIfNeeded();
    for (const name of occasions) await expect(promotion.getByText(name, { exact: true })).toBeVisible();
    await expect(promotion.getByRole('link', { name: 'Criar minha lista', exact: true })).toHaveAttribute('href', /\/login\?mode=cadastrar/);
  });
}

test('Ionic navigation replaces the home contact with a single dashboard contact', async ({ page, context }) => {
  await mockSite(context);
  await page.goto('/landing');
  await page.getByRole('button', { name: 'Já tenho conta', exact: true }).click();
  await expect(page.locator('app-whatsapp-support:visible')).toHaveCount(1);
  await page.getByPlaceholder('seu@email.com').fill('fixture@example.test');
  await page.locator('input[autocomplete="current-password"]').fill('fixture-password');
  await page.locator('ion-button').filter({ hasText: /^\s*Entrar\s*$/ }).click();
  await expect(page).toHaveURL(/\/configurar$/);
  await expect(page.locator('app-whatsapp-support:visible')).toHaveCount(1);
  await expect(page.locator('app-configurar app-whatsapp-support')).toBeVisible();
});

for (const route of ['/configurar', '/pagar', '/resultados']) {
  test(`private support on ${route} opens the correct contact without leaving the event`, async ({ page, context }) => {
    await mockSite(context, { loggedIn: true, events: [{ ...event, paid: false, expires_at: null }] });
    await page.goto(route);
    const link = page.getByRole('link', { name: supportName });
    await expect(link).toBeInViewport();
    await expect(link).toHaveAttribute('href', /^https:\/\/wa\.me\/5514982325360\?text=/);
    const popupPromise = page.waitForEvent('popup');
    await link.click();
    const popup = await popupPromise;
    await popup.waitForURL(/^https:\/\/wa\.me\/5514982325360\?/);
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    await popup.close();
  });
}

test('dashboard support clears the save bar and hides behind the QR dialog', async ({ page, context }, testInfo) => {
  await mockSite(context, { loggedIn: true });
  await page.goto('/configurar');
  const link = page.getByRole('link', { name: supportName });
  const saveBar = page.locator('.save-bar');
  await expect(saveBar).toBeVisible();
  await expect(link).toBeInViewport();
  const contactBox = await link.boundingBox();
  const barBox = await saveBar.boundingBox();
  expect(contactBox!.y + contactBox!.height).toBeLessThan(barBox!.y);
  await page.screenshot({ path: testInfo.outputPath('configurar-whatsapp.png') });
  await page.getByRole('button', { name: /Ver QR Code/ }).click();
  await expect(page.locator('.qr-modal')).toBeVisible();
  await expect(link).toHaveCount(0);
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await expect(link).toBeVisible();
});

test('expired public link lets its owner enter the dashboard and create a separate event', async ({ page, context }) => {
  const state = await mockSite(context, { loggedIn: true, events: [{ ...event, expires_at: new Date(Date.now() - 86400000).toISOString() }] });
  await page.goto('/cha?e=fixture-list');
  await expect(page.getByRole('link', { name: supportName })).toBeVisible();
  await page.getByRole('link', { name: 'Já tenho conta: acessar meus eventos' }).click();
  await expect(page).toHaveURL(/\/configurar$/);
  await expect(page.getByRole('heading', { name: 'Sua lista foi encerrada' })).toBeVisible();
  await expect(page.locator('app-cha')).toBeHidden();
  await expect(page.locator('app-whatsapp-support:visible')).toHaveCount(1);
  await expect(page.getByRole('link', { name: supportName })).toBeInViewport();
  await page.getByRole('button', { name: 'Criar outro evento', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Vamos criar sua lista!' })).toBeVisible();
  expect(state.events).toHaveLength(1);
  expect(state.events[0].archived_at).not.toBeNull();
});

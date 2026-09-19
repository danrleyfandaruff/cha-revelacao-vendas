import { test, expect } from '@playwright/test';
import { mockSite, session, storageKey, eventId } from './fixtures';

for (const oauthReturn of ['requested', 'root', 'landing', 'landing-slash'] as const) {
  test(`Google from landing completes when callback returns to ${oauthReturn}`, async ({ page, context }) => {
    const state = await mockSite(context, { oauthReturn });
    await page.goto('/landing');
    await page.getByRole('button', { name: /Continuar com Google/ }).click();
    await expect(page).toHaveURL(/\/configurar$/);
    await expect(page.getByText('Evento ativo e pronto para compartilhar', { exact: true })).toBeVisible();
    const request = state.requests.find(r => r.resource === 'authorize')!;
    expect(new URL(request.url).searchParams.get('redirect_to')).toBe(new URL('/login', page.url()).href);
  });
}

test('restoring a cached landing rechecks the persisted session', async ({ page, context }) => {
  await mockSite(context);
  await page.goto('/landing');
  await expect(page.getByRole('button', { name: /Continuar com Google/ })).toBeVisible();
  await page.evaluate(({ key, auth }) => {
    localStorage.setItem(key, JSON.stringify(auth));
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  }, { key: storageKey, auth: session() });
  await expect(page).toHaveURL(/\/configurar$/);
  await expect(page.getByText('Evento ativo e pronto para compartilhar', { exact: true })).toBeVisible();
});

test('Google button uses a session saved after landing opened without another OAuth request', async ({ page, context }) => {
  const state = await mockSite(context);
  await page.goto('/landing');
  await expect(page.getByRole('button', { name: /Continuar com Google/ })).toBeVisible();
  await page.evaluate(({ key, auth }) => localStorage.setItem(key, JSON.stringify(auth)),
    { key: storageKey, auth: session() });
  await page.getByRole('button', { name: /Continuar com Google/ }).click();
  await expect(page).toHaveURL(/\/configurar$/);
  await expect(page.getByText('Evento ativo e pronto para compartilhar', { exact: true })).toBeVisible();
  expect(state.requests.some(r => r.resource === 'authorize')).toBe(false);
});

test('protected destination survives a visit to landing before email login', async ({ page, context }) => {
  await mockSite(context);
  await page.goto('/landing');
  await page.getByRole('button', { name: 'Já tenho conta', exact: true }).click();
  await page.goto('/resultados');
  await expect(page).toHaveURL(/\/login\?.*next=/);
  await page.getByPlaceholder('seu@email.com').fill('fixture@example.test');
  await page.locator('input[autocomplete="current-password"]').fill('fixture-password');
  await page.locator('ion-button').filter({ hasText: /^\s*Entrar\s*$/ }).click();
  await expect(page).toHaveURL(/\/resultados$/);
});

test('Google cancellation shows a retry instead of a pending spinner', async ({ page, context }) => {
  await mockSite(context, { oauthReturn: 'root', oauthError: true });
  await page.goto('/landing');
  await page.getByRole('button', { name: /Continuar com Google/ }).click();
  await expect(page.getByRole('alert')).toContainText(/cancelad|concluir/i);
  await expect(page.getByRole('button', { name: /Continuar com Google/ })).toBeEnabled();
});

test('slow Google callback finishes without the old short polling timeout', async ({ page, context }) => {
  await mockSite(context, { oauthReturn: 'landing', userDelay: 3000 });
  await page.goto('/landing');
  await page.getByRole('button', { name: /Continuar com Google/ }).click();
  await expect(page).toHaveURL(/\/configurar$/);
  await expect(page.getByText('Evento ativo e pronto para compartilhar', { exact: true })).toBeVisible();
});

test('existing session redirects from landing and survives a reload', async ({ page, context }) => {
  await mockSite(context, { loggedIn: true });
  await page.goto('/landing');
  await expect(page).toHaveURL(/\/configurar$/);
  await page.reload();
  await expect(page.getByText('Evento ativo e pronto para compartilhar', { exact: true })).toBeVisible();
});

test('Google preserves the protected destination even when sent back to root', async ({ page, context }) => {
  await mockSite(context, { oauthReturn: 'root' });
  await page.goto(`/resultados?event=${eventId}`);
  await expect(page).toHaveURL(/\/login\?/);
  await page.getByRole('button', { name: /Continuar com Google/ }).click();
  await expect(page).toHaveURL(`/resultados?event=${eventId}`);
  expect(await page.evaluate(() => sessionStorage.getItem('auth_return_to'))).toBeNull();
  await page.goto('/landing');
  await expect(page).toHaveURL(/\/configurar$/);
});

for (const entry of ['/login', '/comece']) {
  test(`authenticated visit to ${entry} goes straight to the requested private page`, async ({ page, context }) => {
    await mockSite(context, { loggedIn: true });
    await page.goto(`${entry}?next=${encodeURIComponent(`/resultados?event=${eventId}`)}`);
    await expect(page).toHaveURL(`/resultados?event=${eventId}`);
    await expect(page.locator('app-login')).toHaveCount(0);
  });
}

test('optional login tracking storage cannot prevent Google authentication', async ({ page, context }) => {
  await mockSite(context);
  await page.goto('/landing');
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key: string, value: string) {
      if (key === 'auth_return_to' || key === 'pending_google_login') throw new DOMException('Quota exceeded', 'QuotaExceededError');
      original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: /Continuar com Google/ }).click();
  await expect(page).toHaveURL(/\/configurar$/);
  await expect(page.getByText('Evento ativo e pronto para compartilhar', { exact: true })).toBeVisible();
});

test('email login errors release loading and permit retry', async ({ page, context }) => {
  await mockSite(context, { passwordError: true });
  await page.goto('/login');
  await page.getByPlaceholder('seu@email.com').fill('fixture@example.test');
  await page.locator('input[autocomplete="current-password"]').fill('wrong-password');
  await page.locator('ion-button').filter({ hasText: /^\s*Entrar\s*$/ }).click();
  await expect(page.getByRole('alert')).toContainText('E-mail ou senha incorretos');
  await expect(page.locator('ion-button').filter({ hasText: /^\s*Entrar\s*$/ })).toBeEnabled();
});

test('signup preserves DDD 55 and asks for email confirmation', async ({ page, context }) => {
  const state = await mockSite(context, { confirmEmail: true });
  await page.goto('/comece');
  await page.getByPlaceholder('seu@email.com').fill('new@example.test');
  await page.getByPlaceholder('(48) 99159-3331').fill('55999999999');
  await page.locator('input[autocomplete="new-password"]').fill('fixture-password');
  await page.locator('ion-button').filter({ hasText: /^\s*Criar conta\s*$/ }).click();
  await expect(page.getByRole('heading', { name: 'Confirme seu e-mail' })).toBeVisible();
  expect(state.requests.find(r => r.resource === 'signup')?.body.data.phone).toBe('+5555999999999');
});

test('signup with a session enters the event setup wizard', async ({ page, context }) => {
  await mockSite(context, { events: [] });
  await page.goto('/login?mode=cadastrar');
  await page.getByPlaceholder('seu@email.com').fill('new@example.test');
  await page.getByPlaceholder('(48) 99159-3331').fill('48999999999');
  await page.locator('input[autocomplete="new-password"]').fill('fixture-password');
  await page.locator('ion-button').filter({ hasText: /^\s*Criar conta\s*$/ }).click();
  await expect(page).toHaveURL(/\/configurar$/);
  await expect(page.getByRole('heading', { name: 'Vamos criar sua lista!' })).toBeVisible();
});

test('Google login keeps a previously captured profile phone', async ({ page, context }) => {
  const state = await mockSite(context, { loggedIn: true });
  await page.goto('/configurar');
  await expect(page.getByText('Evento ativo e pronto para compartilhar', { exact: true })).toBeVisible();
  expect(state.profile.phone).toBe('+5555999999999');
  await expect(page.getByRole('heading', { name: 'Só mais um passo' })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('Evento ativo e pronto para compartilhar', { exact: true })).toBeVisible();
  expect(state.profile.phone).toBe('+5555999999999');
});

test('new Google user captures phone and keeps it on the next visit', async ({ page, context }) => {
  const state = await mockSite(context, { loggedIn: true, noProfilePhone: true, events: [] });
  await page.goto('/configurar');
  await expect(page.getByRole('heading', { name: 'Só mais um passo' })).toBeVisible();
  await page.getByPlaceholder('(48) 99159-3331').fill('55999999999');
  await page.getByRole('button', { name: /Salvar telefone/ }).click();
  await expect(page.getByRole('heading', { name: 'Vamos criar sua lista!' })).toBeVisible();
  expect(state.profile.phone).toBe('+5555999999999');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Vamos criar sua lista!' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Só mais um passo' })).toHaveCount(0);
});

test('logout returns to landing and back cannot expose the private page', async ({ page, context }) => {
  await mockSite(context, { loggedIn: true });
  await page.goto('/configurar');
  await page.locator('ion-button[title="Sair"]').click();
  await expect(page).toHaveURL(/\/landing$/);
  await page.goto('/configurar');
  await expect(page).toHaveURL(/\/login\?/);
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBeNull();
});

test('password recovery request and recovery callback complete', async ({ page, context }) => {
  const state = await mockSite(context);
  await page.goto('/login');
  await page.getByPlaceholder('seu@email.com').fill('fixture@example.test');
  await page.getByRole('button', { name: 'Esqueci minha senha' }).click();
  await expect(page.getByRole('status')).toContainText('receberá um link');
  expect(state.requests.some(r => r.resource === 'recover')).toBe(true);
  const auth = session();
  await page.goto('/#' + new URLSearchParams({ access_token: auth.access_token, refresh_token: auth.refresh_token,
    expires_in: '3600', token_type: 'bearer', type: 'recovery' }).toString());
  await expect(page).toHaveURL(/\/redefinir-senha$/);
  await page.locator('input[autocomplete="new-password"]').nth(0).fill('new-password123');
  await page.locator('input[autocomplete="new-password"]').nth(1).fill('new-password123');
  await page.getByRole('button', { name: 'Salvar nova senha' }).click();
  await expect(page.getByRole('heading', { name: 'Senha atualizada!' })).toBeVisible();
  await page.getByRole('button', { name: /Continuar/ }).click();
  await expect(page).toHaveURL(/\/configurar$/);
});

test('failed phone save keeps the capture form open for retry', async ({ page, context }) => {
  const state = await mockSite(context, { loggedIn: true, noProfilePhone: true });
  await page.goto('/configurar');
  await expect(page.getByRole('heading', { name: 'Só mais um passo' })).toBeVisible();
  state.failResources.add('user_profiles');
  await page.getByPlaceholder('(48) 99159-3331').fill('48999999999');
  await page.getByRole('button', { name: /Salvar telefone/ }).click();
  await expect(page.getByRole('alert')).toContainText('Não foi possível salvar o telefone');
  await expect(page.getByRole('button', { name: /Salvar telefone/ })).toBeEnabled();
  await expect(page.getByRole('heading', { name: 'Só mais um passo' })).toBeVisible();
  expect(state.profile.phone).toBeNull();
  state.failResources.clear();
  await page.getByRole('button', { name: /Salvar telefone/ }).click();
  await expect(page.getByRole('heading', { name: 'Só mais um passo' })).toHaveCount(0);
  expect(state.profile.phone).toBe('+5548999999999');
});

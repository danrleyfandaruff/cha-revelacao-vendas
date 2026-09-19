import { BrowserContext } from '@playwright/test';

export const userId = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
export const eventId = '11111111-1111-4111-8111-111111111111';
export const storageKey = 'sb-mpkrpzzcdqoaolxyrmit-auth-token';
export const origin = 'http://127.0.0.1:4205';
export const user = { id: userId, email: 'fixture@example.test', role: 'authenticated', aud: 'authenticated',
  app_metadata: { provider: 'google' }, user_metadata: {} };
export const session = () => {
  const expires_at = Math.floor(Date.now() / 1000) + 3600;
  const access_token = [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify({ sub: userId, exp: expires_at, role: 'authenticated' })).toString('base64url'),
    'fixture',
  ].join('.');
  return { access_token, refresh_token: 'fixture-refresh', expires_at, expires_in: 3600, token_type: 'bearer', user };
};
export const event = {
  id: eventId, user_id: userId, slug: 'fixture-list', baby_name_1: 'Ana e Pedro', baby_name_2: 'Ana e Pedro',
  paid: true, expires_at: new Date(Date.now() + 86400000).toISOString(), archived_at: null,
  event_type: 'casamento', baby_sex: null, address: 'Local do evento', event_datetime: '2027-01-01T18:00:00Z',
  created_at: '2026-07-01T12:00:00Z',
};

export async function mockSite(context: BrowserContext, options: {
  loggedIn?: boolean; oauthReturn?: 'requested' | 'root' | 'landing'; userDelay?: number;
  oauthError?: boolean; passwordError?: boolean; confirmEmail?: boolean; noProfilePhone?: boolean;
  events?: any[]; profileError?: boolean;
  failResources?: string[];
} = {}) {
  const state = {
    events: options.events ?? [{ ...event }],
    items: [{ id: '44444444-4444-4444-8444-444444444444', event_id: eventId, category: 'presentes',
      name: 'Jogo de jantar', emoji: '', quantity_total: 2, quantity_available: 2, sort_order: 0 }],
    profile: { id: userId, email: user.email, phone: options.noProfilePhone ? null : '+5555999999999',
      auth_provider: 'google', phone_source: 'manual' },
    requests: [] as { resource: string; method: string; body: any; url: string }[],
    reservations: [] as any[], confirmations: [] as any[],
    failResources: new Set(options.failResources ?? []),
  };
  await context.addInitScript(({ initialSession, storageKey, userId }) => {
    if (initialSession && !sessionStorage.getItem('fixture-seeded')) {
      localStorage.setItem(storageKey, JSON.stringify(initialSession));
      sessionStorage.setItem('fixture-seeded', '1');
    }
    localStorage.setItem(`cfg_tutorial_${userId}`, '1');
  }, { initialSession: options.loggedIn ? session() : null, storageKey, userId });
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === origin) return route.continue();
    // Tests cannot reach Google, Stripe, analytics or the production database.
    if (!url.hostname.endsWith('supabase.co')) return route.fulfill({ status: 200, body: '' });
    const method = request.method();
    const body = request.postDataJSON();
    const resource = url.pathname.split('/').pop()!;
    state.requests.push({ resource, method, body, url: url.toString() });
    const reply = (value: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
    const singular = (request.headers()['accept'] ?? '').includes('vnd.pgrst.object');
    const rows = (value: unknown[]) => reply(singular ? value[0] ?? null : value);
    if (state.failResources.has(resource)) return reply({ message: 'Temporary connection failure' }, 503);
    if (resource === 'authorize') {
      const target = options.oauthReturn === 'root' ? new URL('/', origin)
        : options.oauthReturn === 'landing' ? new URL('/landing', origin)
        : new URL(url.searchParams.get('redirect_to')!);
      const auth = session();
      target.hash = options.oauthError ? 'error=access_denied&error_description=Cancelled'
        : new URLSearchParams({ access_token: auth.access_token, refresh_token: auth.refresh_token,
          expires_in: '3600', token_type: 'bearer', type: 'signup' }).toString();
      return route.fulfill({ status: 302, headers: { location: target.toString() }, body: '' });
    }
    if (url.pathname.startsWith('/auth/')) {
      if (resource === 'user') {
        if (options.userDelay) await new Promise(resolve => setTimeout(resolve, options.userDelay));
        return reply(user);
      }
      if (resource === 'token') return options.passwordError
        ? reply({ code: 'invalid_credentials', msg: 'Invalid login credentials' }, 400) : reply(session());
      if (resource === 'signup') return options.confirmEmail ? reply(user) : reply(session());
      if (resource === 'recover' || resource === 'logout') return reply({});
    }
    if (resource === 'user_profiles') {
      if (options.profileError) return reply({ message: 'Profile temporarily unavailable' }, 503);
      if (method === 'POST' || method === 'PATCH') Object.assign(state.profile, body);
      return rows([state.profile]);
    }
    if (resource === 'events') {
      if (method === 'POST') {
        const next = { ...event, ...body, id: crypto.randomUUID(), archived_at: null };
        state.events.unshift(next); return rows([next]);
      }
      if (method === 'PATCH') {
        const target = state.events.find(e => e.id === url.searchParams.get('id')?.slice(3));
        Object.assign(target, body); return rows([target]);
      }
      let result = state.events;
      for (const field of ['id', 'user_id', 'slug']) {
        if (url.searchParams.has(field)) result = result.filter(e => e[field] === url.searchParams.get(field)!.slice(3));
      }
      if (url.searchParams.has('archived_at')) result = result.filter(e => !e.archived_at);
      if (url.searchParams.has('paid')) result = result.filter(e => e.paid);
      return rows(result);
    }
    if (resource === 'archive_expired_event') {
      state.events.find(e => e.id === body.p_event_id).archived_at = new Date().toISOString();
      return reply(null);
    }
    if (resource === 'event_items') {
      if (method === 'POST') { state.items = body; return reply(null); }
      if (method === 'DELETE') return reply(null);
      return rows(state.items.filter(e => e.event_id === url.searchParams.get('event_id')?.slice(3)));
    }
    if (resource === 'reserve_event_item') { state.reservations.push(body); return reply({ success: true }); }
    if (resource === 'event_confirmations') {
      if (method === 'POST') { state.confirmations.push(body); return reply(null); }
      return rows(state.confirmations);
    }
    if (resource === 'event_reservations') return rows([]);
    return reply({ message: `Unexpected mocked request: ${resource}` }, 500);
  });
  return state;
}

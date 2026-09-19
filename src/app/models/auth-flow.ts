const AUTH_PAGES = new Set(['/', '/landing', '/login', '/comece']);
const PRIVATE_PAGES = new Set(['/configurar', '/pagar', '/resultados']);

export function safeNextUrl(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return '/configurar';
  try {
    const url = new URL(value, 'https://app.invalid');
    return url.origin === 'https://app.invalid' && PRIVATE_PAGES.has(url.pathname)
      ? url.pathname + url.search : '/configurar';
  } catch { return '/configurar'; }
}

export function isAuthPage(path: string): boolean { return AUTH_PAGES.has(path); }
export function isPrivatePage(path: string): boolean { return PRIVATE_PAGES.has(path); }

export function readAuthCallback(href: string) {
  const url = new URL(href);
  const hash = new URLSearchParams(url.hash.slice(1));
  const get = (key: string) => hash.get(key) ?? url.searchParams.get(key);
  return {
    present: !!(get('access_token') || get('code') || get('error') || get('error_description') || get('oauth') === 'google'),
    recovery: get('type') === 'recovery',
    error: get('error') || get('error_description'),
    next: url.searchParams.get('next'),
  };
}

export function phoneDigits(value: string): string {
  const digits = value.replace(/\D/g, '');
  return ((digits.length > 11 || value.trim().startsWith('+55')) && digits.startsWith('55')
    ? digits.slice(2) : digits).slice(0, 11);
}

export function formatPhone(value: string): string {
  const digits = phoneDigits(value);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

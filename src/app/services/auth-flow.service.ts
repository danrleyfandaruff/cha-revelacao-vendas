import { Injectable, NgZone, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Session } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { isAuthPage, isPrivatePage, readAuthCallback, safeNextUrl } from '../models/auth-flow';

@Injectable({ providedIn: 'root' })
export class AuthFlowService {
  readonly error = signal('');
  readonly googleLoading = signal(false);
  private session: Session | null = null;
  private ready = false;
  private recovery = false;
  private destination = '/configurar';
  private navigatingTo = '';
  private navigation: Promise<boolean> | null = null;
  private refreshingEntry = false;
  private signingOut = false;

  constructor(private supa: SupabaseService, private router: Router, private zone: NgZone) {}

  async initialize(): Promise<void> {
    window.addEventListener('pageshow', () => this.zone.run(() => {
      this.googleLoading.set(false);
      void this.refreshEntrySession();
    }));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.zone.run(() => { void this.refreshEntrySession(); });
      }
    });
    const callback = readAuthCallback(window.location.href);
    this.recovery = callback.recovery;
    this.destination = safeNextUrl(callback.next ?? this.readDestination());
    this.supa.onAuthStateChange((session, event) => {
      // Leave Supabase's notification/lock before starting a guarded navigation.
      setTimeout(() => this.zone.run(() => {
        this.session = session;
        if (event === 'PASSWORD_RECOVERY') this.recovery = true;
        if (event === 'SIGNED_OUT') this.recovery = false;
        this.reconcile();
      }), 0);
    });
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        if (isPrivatePage(new URL(event.urlAfterRedirects, window.location.origin).pathname)) {
          this.destination = '/configurar';
          try { sessionStorage.removeItem('auth_return_to'); } catch { /* storage unavailable */ }
        }
        this.reconcile();
      }
    });

    try {
      const { error } = await this.supa.initializeAuth();
      this.session = await this.supa.getSession();
      if (callback.error || error || (callback.present && !this.session)) {
        this.error.set(callback.error === 'access_denied'
          ? 'A entrada com Google foi cancelada. Você pode tentar novamente.'
          : 'Não foi possível concluir a entrada. Tente novamente ou use seu e-mail.');
      }
    } catch {
      this.error.set('Não foi possível verificar sua sessão. Confira sua conexão e tente novamente.');
    } finally {
      // Strip callback credentials/errors before Angular interprets the URL.
      if (callback.present) {
        const url = new URL(window.location.href);
        url.hash = '';
        for (const key of ['code', 'error', 'error_code', 'error_description', 'oauth', 'type']) url.searchParams.delete(key);
        window.history.replaceState(window.history.state, '', url.pathname + url.search);
      }
      this.ready = true;
    }
  }

  private reconcile() {
    if (!this.ready || !this.router.navigated || this.signingOut) return;
    const url = new URL(this.router.url, window.location.origin);
    if (this.session && this.recovery) {
      if (url.pathname !== '/redefinir-senha') this.navigate('/redefinir-senha');
    } else if (this.session && isAuthPage(url.pathname)) {
      const next = safeNextUrl(url.searchParams.get('next') ?? this.destination);
      this.navigate(next);
    } else if (!this.session && isPrivatePage(url.pathname)) {
      this.navigate('/login?mode=entrar&next=' + encodeURIComponent(url.pathname + url.search));
    }
  }

  async entryDestination(next: string | null): Promise<string | null> {
    if (this.signingOut) return null;
    try {
      this.session = await this.supa.getSession();
      if (!this.session || this.signingOut) return null;
      return this.recovery ? '/redefinir-senha' : safeNextUrl(next ?? this.destination);
    } catch {
      this.session = null;
      this.error.set('Não foi possível verificar sua sessão. Confira sua conexão e tente novamente.');
      return null;
    }
  }

  private async refreshEntrySession(): Promise<void> {
    if (!this.ready || this.signingOut || this.refreshingEntry) return;
    const entryUrl = this.router.url;
    const url = new URL(entryUrl, window.location.origin);
    if (!isAuthPage(url.pathname)) return;
    this.refreshingEntry = true;
    try {
      const target = await this.entryDestination(url.searchParams.get('next'));
      // The user may have left the landing while session restoration was pending.
      if (target && this.router.url === entryUrl && !this.signingOut) {
        await this.navigate(target);
      }
    } finally { this.refreshingEntry = false; }
  }

  private navigate(target: string): Promise<boolean> {
    if (this.navigatingTo === target && this.navigation) return this.navigation;
    if (this.router.url === target) return Promise.resolve(true);
    this.navigatingTo = target;
    this.navigation = this.zone.run(() => this.router.navigateByUrl(target, { replaceUrl: true }))
      .then(success => {
        if (!success && isAuthPage(new URL(this.router.url, window.location.origin).pathname)) {
          this.error.set('Não foi possível abrir seu evento. Tente novamente.');
        }
        return success;
      }).catch(() => {
        this.error.set('Não foi possível abrir seu evento. Tente novamente.');
        return false;
      }).finally(() => {
        if (this.navigatingTo === target) { this.navigatingTo = ''; this.navigation = null; }
      });
    return this.navigation;
  }

  async completeLogin(next: string) {
    this.session = await this.supa.getSession();
    if (!this.session) throw new Error('Session not available');
    this.destination = safeNextUrl(next);
    await this.navigate(this.recovery ? '/redefinir-senha' : this.destination);
  }

  async startGoogle(next = '/configurar') {
    if (this.googleLoading()) return;
    this.error.set('');
    this.googleLoading.set(true);
    this.destination = safeNextUrl(next);
    try {
      this.session = await this.supa.getSession();
      if (this.session) {
        await this.navigate(this.recovery ? '/redefinir-senha' : this.destination);
        this.googleLoading.set(false);
        return;
      }
      try {
        sessionStorage.setItem('auth_return_to', this.destination);
        sessionStorage.setItem('pending_google_login', '1');
      } catch { /* OAuth still works when optional tab storage is unavailable. */ }
      const { error } = await this.supa.signInWithGoogle();
      if (error) throw error;
    } catch {
      try { sessionStorage.removeItem('pending_google_login'); } catch { /* storage unavailable */ }
      this.error.set('Não foi possível abrir o Google. Tente novamente ou use seu e-mail.');
      this.googleLoading.set(false);
    }
  }

  finishRecovery() {
    this.recovery = false;
    this.navigate('/configurar');
  }

  async signOut(): Promise<void> {
    this.signingOut = true;
    try {
      const { error } = await this.supa.signOut();
      if (error) throw error;
      this.session = null;
      this.recovery = false;
      this.destination = '/configurar';
      this.error.set('');
      try {
        sessionStorage.removeItem('auth_return_to');
        sessionStorage.removeItem('pending_google_login');
        sessionStorage.removeItem('phone_capture_dismissed');
      } catch { /* storage unavailable */ }
      await this.router.navigateByUrl('/landing', { replaceUrl: true });
    } finally { this.signingOut = false; }
  }

  private readDestination(): string | null {
    try { return sessionStorage.getItem('auth_return_to'); } catch { return null; }
  }
}

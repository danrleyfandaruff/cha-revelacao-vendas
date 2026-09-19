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
  private signingOut = false;

  constructor(private supa: SupabaseService, private router: Router, private zone: NgZone) {}

  async initialize(): Promise<void> {
    window.addEventListener('pageshow', () => this.zone.run(() => this.googleLoading.set(false)));
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
      if (event instanceof NavigationEnd) this.reconcile();
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

  private navigate(target: string) {
    if (this.navigatingTo === target || this.router.url === target) return;
    this.navigatingTo = target;
    void this.zone.run(() => this.router.navigateByUrl(target, { replaceUrl: true }))
      .then(success => {
        if (success && isPrivatePage(new URL(target, window.location.origin).pathname)) {
          this.destination = '/configurar';
          try { sessionStorage.removeItem('auth_return_to'); } catch { /* storage unavailable */ }
        }
      }).catch(() => this.error.set('Não foi possível abrir seu evento. Tente novamente.'))
      .finally(() => { this.navigatingTo = ''; });
  }

  async completeLogin(next: string) {
    this.session = await this.supa.getSession();
    if (!this.session) throw new Error('Session not available');
    this.destination = safeNextUrl(next);
    this.reconcile();
  }

  async startGoogle(mode: 'entrar' | 'cadastrar', next = '/configurar') {
    if (this.googleLoading()) return;
    this.error.set('');
    this.googleLoading.set(true);
    this.destination = safeNextUrl(next);
    try {
      this.session = await this.supa.getSession();
      if (this.session) { this.googleLoading.set(false); this.reconcile(); return; }
      sessionStorage.setItem('auth_return_to', this.destination);
      sessionStorage.setItem('pending_google_login', '1');
      const { error } = await this.supa.signInWithGoogle(mode, this.destination);
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

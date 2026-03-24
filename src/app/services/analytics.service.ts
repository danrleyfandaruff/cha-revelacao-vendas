import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {

  private track(name: string, props?: Record<string, unknown>): void {
    try {
      const va = (window as unknown as Record<string, unknown>)['va'] as
        ((event: string, data: Record<string, unknown>) => void) | undefined;
      if (va) va('event', { name, ...props });
    } catch (_e) { /* ignora se o script ainda não carregou */ }
  }

  // ── Landing ──────────────────────────────────────────────────────────────────
  landingView(): void              { this.track('landing_view'); }

  // ── Login / Cadastro ─────────────────────────────────────────────────────────
  loginSuccess(): void             { this.track('login_success'); }
  signupSuccess(): void            { this.track('signup_success'); }

  // ── Configurar ───────────────────────────────────────────────────────────────
  configSaved(type: string): void  { this.track('config_saved', { type }); }
  tutorialCompleted(): void        { this.track('tutorial_completed'); }
  tutorialSkipped(step: number): void { this.track('tutorial_skipped', { step }); }

  // ── Pagar ────────────────────────────────────────────────────────────────────
  goToStripe(): void               { this.track('go_to_stripe'); }

  // ── Chá (convidado) ──────────────────────────────────────────────────────────
  guestConfirmedPresence(): void   { this.track('guest_confirmed_presence'); }
  guestAddedToCart(category: string): void { this.track('guest_add_to_cart', { category }); }
  guestFinalized(): void           { this.track('guest_finalized'); }
}

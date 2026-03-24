import { Injectable } from '@angular/core';
import { track } from '@vercel/analytics';

type TrackProps = Record<string, string | number | boolean | null | undefined>;

@Injectable({ providedIn: 'root' })
export class AnalyticsService {

  private send(name: string, props?: TrackProps): void {
    try {
      track(name, props);
    } catch (_e) { /* ignora em dev local */ }
  }

  // ── Landing ──────────────────────────────────────────────────────────────────
  landingView(): void              { this.send('landing_view'); }

  // ── Login / Cadastro ─────────────────────────────────────────────────────────
  loginSuccess(): void             { this.send('login_success'); }
  signupSuccess(): void            { this.send('signup_success'); }

  // ── Configurar ───────────────────────────────────────────────────────────────
  configSaved(type: string): void  { this.send('config_saved', { type }); }
  tutorialCompleted(): void        { this.send('tutorial_completed'); }
  tutorialSkipped(step: number): void { this.send('tutorial_skipped', { step }); }

  // ── Resultados ───────────────────────────────────────────────────────────────
  resultadosView(): void           { this.send('resultados_view'); }

  // ── Pagar ────────────────────────────────────────────────────────────────────
  goToStripe(): void               { this.send('go_to_stripe'); }

  // ── Chá (convidado) ──────────────────────────────────────────────────────────
  guestConfirmedPresence(): void   { this.send('guest_confirmed_presence'); }
  guestAddedToCart(category: string): void { this.send('guest_add_to_cart', { category }); }
  guestFinalized(): void           { this.send('guest_finalized'); }
}

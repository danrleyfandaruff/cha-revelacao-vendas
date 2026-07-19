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
  wizardCompleted(): void          { this.send('wizard_completed'); }
  wizardSkipped(step: string): void { this.send('wizard_skipped', { step }); }

  // ── Dicas ────────────────────────────────────────────────────────────────────
  dicasView(): void                              { this.send('dicas_view'); }
  dicasScrollDepth(pct: number): void            { this.send('dicas_scroll_depth', { pct }); }
  dicasWhatsAppClick(local: string): void        { this.send('dicas_whatsapp_click', { local }); }
  dicasQuizBannerClick(): void                   { this.send('dicas_quiz_banner_click'); }
  dicasPromoBannerClick(): void                  { this.send('dicas_promo_banner_click'); }
  dicasCategoriaClick(categoria: string): void   { this.send('dicas_categoria_click', { categoria }); }
  dicasCardOpen(titulo: string, categoria: string): void { this.send('dicas_card_open', { titulo, categoria }); }
  dicasQuizAnswered(pergunta: number, titulo: string): void { this.send('dicas_quiz_answered', { pergunta, titulo }); }
  dicasQuizCompleted(resultado: string): void    { this.send('dicas_quiz_completed', { resultado }); }
  dicasQuizPdfDownload(): void                   { this.send('dicas_quiz_pdf_download'); }
  dicasProdutoCtaClick(local: string): void      { this.send('dicas_produto_cta_click', { local }); }
  dicasConviteCtaClick(): void                   { this.send('dicas_convite_cta_click'); }

  // ── Resultados ───────────────────────────────────────────────────────────────
  resultadosView(): void           { this.send('resultados_view'); }

  // ── Pagar ────────────────────────────────────────────────────────────────────
  goToStripe(): void               { this.send('go_to_stripe'); }

  // ── Chá (convidado) ──────────────────────────────────────────────────────────
  guestConfirmedPresence(): void   { this.send('guest_confirmed_presence'); }
  guestAddedToCart(category: string): void { this.send('guest_add_to_cart', { category }); }
  guestFinalized(): void           { this.send('guest_finalized'); }
}

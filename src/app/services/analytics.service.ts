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

  // ── Comece (landing page de ads) ────────────────────────────────────────────
  comeceView(): void                 { this.send('comece_view'); }
  comeceCtaClick(local: string): void { this.send('comece_cta_click', { local }); }
  comeceKitPopupView(): void          { this.send('comece_kit_popup_view'); }
  comeceKitPopupClose(): void         { this.send('comece_kit_popup_close'); }
  comeceKitPopupWhatsapp(): void      { this.send('comece_kit_popup_whatsapp'); }

  // ── Login / Cadastro ─────────────────────────────────────────────────────────
  loginView(tab: string): void              { this.send('login_view', { tab }); }
  loginTabSwitch(tab: string): void         { this.send('login_tab_switch', { tab }); }
  loginEmailEngaged(tab: string): void      { this.send('login_email_engaged', { tab }); }
  loginGoogleClick(): void                  { this.send('login_google_click'); }
  loginGoogleSuccess(): void                { this.send('login_google_success'); }
  loginSubmitClick(tab: string): void       { this.send('login_submit_click', { tab }); }
  loginValidationError(tab: string, reason: string): void { this.send('login_validation_error', { tab, reason }); }
  loginError(tab: string, reason: string): void { this.send('login_error', { tab, reason }); }
  loginSuccess(): void                      { this.send('login_success'); }
  signupSuccess(): void                     { this.send('signup_success'); }

  // ── Configurar ───────────────────────────────────────────────────────────────
  configurarView(hasEvent: boolean, isPaid: boolean): void { this.send('configurar_view', { hasEvent, isPaid }); }
  configTipoChange(tipo: string): void      { this.send('config_tipo_change', { tipo }); }
  configSexoChange(sexo: string): void      { this.send('config_sexo_change', { sexo }); }
  configTabChange(tab: string): void        { this.send('config_tab_change', { tab }); }
  configItemToggle(categoria: string, checked: boolean): void { this.send('config_item_toggle', { categoria, checked }); }
  configItemAdd(categoria: string): void    { this.send('config_item_add', { categoria }); }
  configItemDeleteConfirm(categoria: string): void { this.send('config_item_delete_confirm', { categoria }); }
  configItemDeleteCancel(): void            { this.send('config_item_delete_cancel'); }
  configSaveClick(): void                   { this.send('config_save_click'); }
  configSaveValidationError(reason: string): void { this.send('config_save_validation_error', { reason }); }
  configSaved(type: string): void           { this.send('config_saved', { type }); }
  configSaveError(): void                   { this.send('config_save_error'); }
  configActivationOpen(): void              { this.send('config_activation_open'); }
  configGoPagar(): void                     { this.send('config_go_pagar'); }
  configCopyLink(): void                    { this.send('config_copy_link'); }
  configShareWhatsApp(): void               { this.send('config_share_whatsapp'); }
  configQrOpen(): void                      { this.send('config_qr_open'); }
  configQrDownload(): void                  { this.send('config_qr_download'); }
  configPreviewOpen(): void                 { this.send('config_preview_open'); }
  configGoResultados(): void                { this.send('config_go_resultados'); }
  configLogout(): void                      { this.send('config_logout'); }
  configSuccessModalCta(): void             { this.send('config_success_modal_cta'); }
  tutorialCompleted(): void                 { this.send('tutorial_completed'); }
  tutorialSkipped(step: number): void       { this.send('tutorial_skipped', { step }); }
  configWizardStepView(step: string): void  { this.send('config_wizard_step_view', { step }); }
  configWizardStepCompleted(step: string, props?: TrackProps): void { this.send('config_wizard_step_completed', { step, ...props }); }
  configSetupCompleted(props?: TrackProps): void { this.send('config_setup_completed', props); }
  wizardCompleted(props?: TrackProps): void { this.send('wizard_completed', props); }
  wizardSkipped(step: string): void         { this.send('wizard_skipped', { step }); }

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

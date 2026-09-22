import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import { SupabaseService } from '../../services/supabase.service';
import { AuthFlowService } from '../../services/auth-flow.service';
import { WhatsAppSupportComponent } from '../../components/whatsapp-support/whatsapp-support.component';
import { formatPhone, phoneDigits, safeNextUrl } from '../../models/auth-flow';
import { AnalyticsService } from '../../services/analytics.service';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  eyeOffOutline,
  eyeOutline,
  sparklesOutline,
} from 'ionicons/icons';

type Tab = 'entrar' | 'cadastrar';

@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrls: ['login.page.scss'],
  standalone: true,
  imports: [FormsModule, IonButton, IonContent, IonIcon, IonSpinner, WhatsAppSupportComponent],
})
export class LoginPage {
  private destroyRef = inject(DestroyRef);
  private hasTrackedView = false;
  private emailEngaged = false;

  tab = signal<Tab>('entrar');
  loading = signal(false);
  errorMsg = signal('');
  awaitingConfirmation = signal(false);
  showPassword = signal(false);
  resetSent = signal(false);
  nextUrl = signal('/configurar');

  email = '';
  phone = '';
  password = '';

  highlights = [
    'Convidados acessam o convite sem criar conta',
    'Reserva automática para evitar presente repetido',
    'Painel em tempo real para acompanhar tudo pelo celular',
  ];

  constructor(
    private supa: SupabaseService,
    private router: Router,
    private route: ActivatedRoute,
    private analytics: AnalyticsService,
    public auth: AuthFlowService
  ) {
    addIcons({
      arrowBackOutline,
      eyeOffOutline,
      eyeOutline,
      sparklesOutline,
    });

    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const defaultTab = this.route.snapshot.data['defaultTab'] as
          | Tab
          | undefined;
        const requestedMode = params.get('mode') ?? params.get('tab') ?? defaultTab;
        this.tab.set(requestedMode === 'cadastrar' ? 'cadastrar' : 'entrar');
        this.nextUrl.set(safeNextUrl(params.get('next')));
        this.errorMsg.set('');

        if (!this.hasTrackedView) {
          this.analytics.loginView(this.tab());
          this.hasTrackedView = true;
        }

      });
  }

  goHome() {
    this.router.navigate(['/landing']);
  }

  setTab(tab: Tab) {
    this.tab.set(tab);
    this.awaitingConfirmation.set(false);
    this.errorMsg.set('');
    this.auth.error.set('');
    this.resetSent.set(false);
    this.analytics.loginTabSwitch(tab);
  }

  togglePassword() {
    this.showPassword.update((value) => !value);
  }

  onEmailBlur() {
    if (this.emailEngaged || !this.email.trim()) return;
    this.emailEngaged = true;
    this.analytics.loginEmailEngaged(this.tab());
  }

  onPhoneChange(value: string) {
    this.phone = formatPhone(value);
  }

  podeEnviar(): boolean {
    if (this.loading() || this.auth.googleLoading()) return false;
    if (this.tab() === 'cadastrar') {
      return !!this.email.trim() && !!this.password && this.telefoneValido();
    }

    return !!this.email.trim() && !!this.password;
  }

  async submit() {
    if (this.loading() || this.auth.googleLoading()) return;
    this.errorMsg.set('');
    this.auth.error.set('');
    this.email = this.email.trim();
    this.analytics.loginSubmitClick(this.tab());

    if (!this.email || !this.password) {
      this.analytics.loginValidationError(this.tab(), 'campos_vazios');
      this.errorMsg.set('Preencha e-mail e senha.');
      return;
    }

    if (this.tab() === 'cadastrar' && !this.telefoneValido()) {
      this.analytics.loginValidationError('cadastrar', 'telefone_invalido');
      this.errorMsg.set('Informe um número de telefone válido com DDD.');
      return;
    }

    this.loading.set(true);
    try {
    if (this.tab() === 'entrar') {
      const { error } = await this.supa.signInWithEmail(this.email, this.password);

      if (error) {
        if (
          error.message.includes('Email not confirmed') ||
          error.code === 'email_not_confirmed'
        ) {
          this.awaitingConfirmation.set(true);
        } else {
          this.analytics.loginError(
            'entrar',
            this.errorReason(error.message, error.code)
          );
          this.errorMsg.set(this.friendlyError(error.message, error.code));
        }
      } else {
        this.analytics.loginSuccess();
        await this.auth.completeLogin(this.nextUrl());
      }
    } else {
      const { data, error } = await this.supa.signUpWithEmail(
        this.email,
        this.password,
        this.telefoneCompleto()
      );

      if (error) {
        this.analytics.loginError(
          'cadastrar',
          this.errorReason(error.message, error.code)
        );
        this.errorMsg.set(this.friendlyError(error.message, error.code));
      } else if (data.session) {
        this.analytics.signupSuccess();
        await this.auth.completeLogin(this.nextUrl());
      } else {
        this.analytics.signupSuccess();
        this.awaitingConfirmation.set(true);
      }
    }

    } catch {
      this.errorMsg.set('Não foi possível conectar. Verifique sua conexão e tente novamente.');
    } finally {
      this.loading.set(false);
    }
  }

  async googleLogin() {
    if (this.loading()) return;
    this.errorMsg.set('');
    this.analytics.loginGoogleClick();
    await this.auth.startGoogle(this.nextUrl());
  }

  async forgotPassword() {
    if (this.loading() || this.auth.googleLoading()) return;
    this.errorMsg.set('');
    if (!this.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) {
      this.errorMsg.set('Informe seu e-mail para receber o link de recuperação.');
      return;
    }
    this.loading.set(true);
    try {
      const { error } = await this.supa.resetPassword(this.email.trim());
      if (error) throw error;
      this.resetSent.set(true);
    } catch {
      this.errorMsg.set('Não foi possível enviar o link. Tente novamente em instantes.');
    } finally { this.loading.set(false); }
  }

  private digitsFromPhone(): string {
    return phoneDigits(this.phone);
  }

  private telefoneValido(): boolean {
    const digits = this.digitsFromPhone();
    return digits.length === 10 || digits.length === 11;
  }

  private telefoneCompleto(): string {
    const digits = this.digitsFromPhone();
    return digits ? `+55${digits}` : '';
  }

  private errorReason(msg: string, code?: string): string {
    if (
      code === 'invalid_credentials' ||
      msg.includes('Invalid login credentials')
    ) {
      return 'credenciais_invalidas';
    }
    if (msg.includes('Email not confirmed')) return 'email_nao_confirmado';
    if (msg.includes('User already registered')) return 'email_ja_cadastrado';
    if (msg.includes('Password should be at least')) return 'senha_fraca';
    return 'outro';
  }

  private friendlyError(msg: string, code?: string): string {
    if (
      code === 'invalid_credentials' ||
      msg.includes('Invalid login credentials')
    ) {
      return 'E-mail ou senha incorretos.';
    }
    if (msg.includes('Email not confirmed')) {
      return 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.';
    }
    if (msg.includes('User already registered')) {
      return 'Este e-mail já está cadastrado. Tente entrar.';
    }
    if (msg.includes('Password should be at least')) {
      return 'A senha deve ter pelo menos 6 caracteres.';
    }
    return msg;
  }

}

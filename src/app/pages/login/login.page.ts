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
  imports: [FormsModule, IonButton, IonContent, IonIcon, IonSpinner],
})
export class LoginPage {
  private destroyRef = inject(DestroyRef);
  private authFlowToken = 0;
  private hasTrackedView = false;
  private emailEngaged = false;

  tab = signal<Tab>('entrar');
  loading = signal(false);
  errorMsg = signal('');
  awaitingConfirmation = signal(false);
  showPassword = signal(false);
  oauthPending = signal(false);
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
    private analytics: AnalyticsService
  ) {
    addIcons({
      arrowBackOutline,
      eyeOffOutline,
      eyeOutline,
      sparklesOutline,
    });

    const {
      data: { subscription },
    } = this.supa.onAuthStateChange((session) => {
      if (session) {
        this.finishAuth();
      }
    });

    this.destroyRef.onDestroy(() => subscription.unsubscribe());

    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const defaultTab = this.route.snapshot.data['defaultTab'] as
          | Tab
          | undefined;
        const requestedMode = params.get('mode') ?? params.get('tab') ?? defaultTab;
        const fromGoogle = params.get('oauth') === 'google';

        this.tab.set(requestedMode === 'cadastrar' ? 'cadastrar' : 'entrar');
        this.nextUrl.set(this.normalizeNext(params.get('next')));
        this.oauthPending.set(fromGoogle);
        this.errorMsg.set('');

        if (!this.hasTrackedView) {
          this.analytics.loginView(this.tab());
          this.hasTrackedView = true;
        }

        void this.syncSessionState(fromGoogle);
      });
  }

  goHome() {
    this.router.navigate(['/landing']);
  }

  setTab(tab: Tab) {
    this.tab.set(tab);
    this.awaitingConfirmation.set(false);
    this.errorMsg.set('');
    this.oauthPending.set(false);
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
    this.phone = this.formatPhone(value);
  }

  podeEnviar(): boolean {
    if (this.loading()) return false;
    if (this.tab() === 'cadastrar') {
      return !!this.email.trim() && !!this.password && this.telefoneValido();
    }

    return !!this.email.trim() && !!this.password;
  }

  async submit() {
    this.errorMsg.set('');
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
        this.finishAuth();
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
        await this.supa.syncCurrentUserProfile(this.telefoneCompleto());
        this.analytics.signupSuccess();
        this.finishAuth();
      } else {
        this.analytics.signupSuccess();
        this.awaitingConfirmation.set(true);
      }
    }

    this.loading.set(false);
  }

  async googleLogin() {
    this.errorMsg.set('');
    this.analytics.loginGoogleClick();
    sessionStorage.setItem('pending_google_login', '1');
    this.loading.set(true);

    const { error } = await this.supa.signInWithGoogle(this.tab(), this.nextUrl());

    if (error) {
      sessionStorage.removeItem('pending_google_login');
      this.loading.set(false);
      this.errorMsg.set('Nao foi possivel abrir o Google. Tente novamente.');
    }
  }

  private async syncSessionState(fromGoogle: boolean) {
    const currentFlow = ++this.authFlowToken;

    if (fromGoogle) {
      this.loading.set(true);
    }

    const session = await this.supa.getSession();
    if (currentFlow !== this.authFlowToken) {
      return;
    }

    if (session) {
      this.finishAuth();
      return;
    }

    if (!fromGoogle) {
      this.loading.set(false);
      return;
    }

    for (let attempt = 0; attempt < 6; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 350));

      const restoredSession = await this.supa.getSession();
      if (currentFlow !== this.authFlowToken) {
        return;
      }

      if (restoredSession) {
        this.finishAuth();
        return;
      }
    }

    sessionStorage.removeItem('pending_google_login');
    this.loading.set(false);
    this.oauthPending.set(false);
    this.errorMsg.set(
      'Nao conseguimos concluir a entrada com Google. Tente novamente.'
    );
  }

  private finishAuth() {
    this.loading.set(false);
    this.oauthPending.set(false);
    this.errorMsg.set('');
    this.router.navigateByUrl(this.nextUrl(), { replaceUrl: true });
  }

  private digitsFromPhone(): string {
    return this.phone.replace(/\D/g, '').slice(0, 11);
  }

  private telefoneValido(): boolean {
    const digits = this.digitsFromPhone();
    return digits.length === 10 || digits.length === 11;
  }

  private telefoneCompleto(): string {
    const digits = this.digitsFromPhone();
    return digits ? `+55${digits}` : '';
  }

  private formatPhone(value: string): string {
    const digits = value.replace(/\D/g, '').replace(/^55/, '').slice(0, 11);
    if (digits.length <= 2) return digits ? `(${digits}` : '';
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
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

  private normalizeNext(next: string | null): string {
    if (!next || !next.startsWith('/') || next.startsWith('/login')) {
      return '/configurar';
    }

    return next;
  }
}

import { Component, OnInit, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonButton, IonSpinner,
} from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular';
import { SupabaseService } from '../../services/supabase.service';
import { AnalyticsService } from '../../services/analytics.service';
import { take } from 'rxjs/operators';

type Tab = 'entrar' | 'cadastrar';

@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrls: ['login.page.scss'],
  standalone: true,
  imports: [FormsModule, IonContent, IonButton, IonSpinner],
})
export class LoginPage implements OnInit {
  tab      = signal<Tab>('entrar');
  email    = '';
  phone    = '';
  password = '';
  loading  = signal(false);
  private emailEngaged = false;

  constructor(
    private supa: SupabaseService,
    private router: Router,
    private route: ActivatedRoute,
    private toastCtrl: ToastController,
    private analytics: AnalyticsService,
  ) {
    this.supa.getSession().then(s => {
      if (s) this.router.navigate(['/configurar'], { replaceUrl: true });
    });

    const defaultTab = this.route.snapshot.data['defaultTab'] as Tab | undefined;
    if (defaultTab) this.tab.set(defaultTab);

    this.route.queryParams.pipe(take(1)).subscribe(params => {
      if (params['tab'] === 'cadastrar') this.tab.set('cadastrar');
    });
  }

  ngOnInit() {
    this.analytics.loginView(this.tab());
  }

  setTab(t: Tab) {
    this.tab.set(t);
    this.analytics.loginTabSwitch(t);
  }

  onEmailBlur() {
    if (this.emailEngaged || !this.email.trim()) return;
    this.emailEngaged = true;
    this.analytics.loginEmailEngaged(this.tab());
  }

  async submit() {
    this.analytics.loginSubmitClick(this.tab());

    if (!this.email || !this.password) {
      this.analytics.loginValidationError(this.tab(), 'campos_vazios');
      this.showToast('Preencha e-mail e senha.', 'danger');
      return;
    }

    if (this.tab() === 'cadastrar' && !this.telefoneValido()) {
      this.analytics.loginValidationError('cadastrar', 'telefone_invalido');
      this.showToast('Informe um número de telefone válido com DDD.', 'danger');
      return;
    }
    this.loading.set(true);

    if (this.tab() === 'entrar') {
      const { error } = await this.supa.signInWithEmail(this.email, this.password);
      if (error) {
        this.analytics.loginError('entrar', this.errorReason(error.message, error.code));
        this.showToast(this.friendlyError(error.message, error.code), 'danger');
      } else {
        this.analytics.loginSuccess();
        this.router.navigate(['/configurar'], { replaceUrl: true });
      }

    } else {
      const { data, error } = await this.supa.signUpWithEmail(
        this.email,
        this.password,
        this.telefoneCompleto()
      );
      if (error) {
        this.analytics.loginError('cadastrar', this.errorReason(error.message, error.code));
        this.showToast(this.friendlyError(error.message, error.code), 'danger');
      } else {
        this.analytics.signupSuccess();
        this.router.navigate(['/configurar'], { replaceUrl: true });
      }
    }

    this.loading.set(false);
  }

  async googleLogin() {
    this.analytics.loginGoogleClick();
    sessionStorage.setItem('pending_google_login', '1');
    await this.supa.signInWithGoogle();
  }

  onPhoneChange(value: string) {
    this.phone = this.formatPhone(value);
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
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  private errorReason(msg: string, code?: string): string {
    if (code === 'invalid_credentials' || msg.includes('Invalid login credentials')) return 'credenciais_invalidas';
    if (msg.includes('Email not confirmed')) return 'email_nao_confirmado';
    if (msg.includes('User already registered')) return 'email_ja_cadastrado';
    if (msg.includes('Password should be at least')) return 'senha_fraca';
    return 'outro';
  }

  private friendlyError(msg: string, code?: string): string {
    if (code === 'invalid_credentials' || msg.includes('Invalid login credentials'))
      return 'E-mail ou senha incorretos.';
    if (msg.includes('Email not confirmed'))
      return 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.';
    if (msg.includes('User already registered'))
      return 'Este e-mail já está cadastrado. Tente entrar.';
    if (msg.includes('Password should be at least'))
      return 'A senha deve ter pelo menos 6 caracteres.';
    return msg;
  }

  private async showToast(msg: string, color: 'dark' | 'success' | 'danger' = 'dark') {
    const t = await this.toastCtrl.create({
      message: msg,
      color,
      duration: 4000,
      position: 'top',
    });
    await t.present();
  }
}

import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonButton, IonSpinner,
} from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular';
import { SupabaseService } from '../../services/supabase.service';

type Tab = 'entrar' | 'cadastrar';

@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrls: ['login.page.scss'],
  standalone: true,
  imports: [FormsModule, IonContent, IonButton, IonSpinner],
})
export class LoginPage {
  tab      = signal<Tab>('entrar');
  email    = '';
  password = '';
  loading  = signal(false);

  // Estado após cadastro: aguardando confirmação de e-mail
  awaitingConfirmation = signal(false);

  constructor(
    private supa: SupabaseService,
    private router: Router,
    private toastCtrl: ToastController,
  ) {
    this.supa.getSession().then(s => {
      if (s) this.router.navigate(['/configurar'], { replaceUrl: true });
    });
  }

  setTab(t: Tab) {
    this.tab.set(t);
    this.awaitingConfirmation.set(false);
  }

  async submit() {
    if (!this.email || !this.password) {
      this.showToast('Preencha e-mail e senha.', 'danger');
      return;
    }
    this.loading.set(true);

    if (this.tab() === 'entrar') {
      const { error } = await this.supa.signInWithEmail(this.email, this.password);
      if (error) {
        // E-mail não confirmado → mostra tela de aviso em vez de toast
        if (error.message.includes('Email not confirmed') || error.code === 'email_not_confirmed') {
          this.awaitingConfirmation.set(true);
        } else {
          this.showToast(this.friendlyError(error.message, error.code), 'danger');
        }
      } else {
        this.router.navigate(['/configurar'], { replaceUrl: true });
      }

    } else {
      const { data, error } = await this.supa.signUpWithEmail(this.email, this.password);
      if (error) {
        this.showToast(this.friendlyError(error.message, error.code), 'danger');
      } else if (data.session) {
        // Confirmação de e-mail desabilitada → já entra direto
        this.router.navigate(['/configurar'], { replaceUrl: true });
      } else {
        // Confirmação de e-mail habilitada → mostra aviso
        this.awaitingConfirmation.set(true);
      }
    }

    this.loading.set(false);
  }

  async googleLogin() {
    await this.supa.signInWithGoogle();
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

import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonContent, IonButton, IonSpinner } from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular';
import { SupabaseService } from '../../services/supabase.service';
import { AuthFlowService } from '../../services/auth-flow.service';

@Component({
  selector: 'app-redefinir-senha',
  templateUrl: 'redefinir-senha.page.html',
  styleUrls: ['redefinir-senha.page.scss'],
  standalone: true,
  imports: [FormsModule, IonContent, IonButton, IonSpinner],
})
export class RedefinirSenhaPage implements OnInit {
  senha = '';
  confirmarSenha = '';
  loading = signal(false);
  success = signal(false);
  sessaoValida = signal(true);

  constructor(
    private supa: SupabaseService,
    private router: Router,
    private toastCtrl: ToastController,
    private auth: AuthFlowService,
  ) {}

  async ngOnInit() {
    // O Supabase estabelece uma sessão de recuperação a partir do token no link do e-mail.
    try {
      const session = await this.supa.getSession();
      this.sessaoValida.set(!!session);
    } catch { this.sessaoValida.set(false); }
  }

  podeEnviar(): boolean {
    return this.senha.length >= 6 && this.senha === this.confirmarSenha && !this.loading();
  }

  async salvar() {
    if (this.loading() || !this.sessaoValida()) return;
    if (this.senha.length < 6) {
      this.showToast('A senha deve ter pelo menos 6 caracteres.', 'danger');
      return;
    }
    if (this.senha !== this.confirmarSenha) {
      this.showToast('As senhas não coincidem.', 'danger');
      return;
    }
    this.loading.set(true);
    try {
      const { error } = await this.supa.updatePassword(this.senha);
      if (error) {
        this.showToast('Não foi possível redefinir a senha. Solicite um novo link.', 'danger');
      } else {
        this.success.set(true);
      }
    } catch (e) {
      this.showToast('Não foi possível conectar. Tente novamente.', 'danger');
    } finally {
      this.loading.set(false);
    }
  }

  goConfigurar() { this.auth.finishRecovery(); }
  goLogin() { this.router.navigate(['/login'], { replaceUrl: true }); }

  private async showToast(msg: string, color: 'dark' | 'success' | 'danger' = 'dark') {
    const t = await this.toastCtrl.create({ message: msg, color, duration: 4000, position: 'top' });
    await t.present();
  }
}

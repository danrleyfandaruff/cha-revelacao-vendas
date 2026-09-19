import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent, IonButton, IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowForwardOutline,
  checkmarkCircleOutline,
  sparklesOutline,
} from 'ionicons/icons';
import { AnalyticsService } from '../../services/analytics.service';
import { SupabaseService } from '../../services/supabase.service';

type AuthMode = 'entrar' | 'cadastrar';

@Component({
  selector: 'app-landing',
  templateUrl: 'landing.page.html',
  styleUrls: ['landing.page.scss'],
  standalone: true,
  imports: [IonContent, IonButton, IonIcon],
})
export class LandingPage implements OnInit {
  googleLoading = signal(false);

  features = [
    { icon: '🎁', title: 'Para cada ocasião', desc: 'Chás, casamento, casa nova e aniversário, com presentes que combinam com seu evento.' },
    { icon: '🔒', title: 'Sem duplicação', desc: 'O sistema reserva automaticamente. Dois convidados não pegam o mesmo item.' },
    { icon: '📱', title: 'Funciona no celular', desc: 'Convidados acessam pelo link, sem precisar instalar nada.' },
    { icon: '📊', title: 'Painel em tempo real', desc: 'Você vê quem reservou o quê, com data e hora, a qualquer momento.' },
    { icon: '✏️', title: 'Sugestões prontas', desc: 'Itens para o bebê, a casa ou o aniversariante: selecione e personalize sua lista.' },
    { icon: '🔗', title: 'Link personalizado', desc: 'Cada evento tem seu próprio link para compartilhar com os convidados.' },
  ];

  constructor(private router: Router, private analytics: AnalyticsService, private supa: SupabaseService) {
    addIcons({
      arrowForwardOutline,
      checkmarkCircleOutline,
      sparklesOutline,
    });
  }

  async ngOnInit() {
    const session = await this.supa.getSession();
    if (session) { this.router.navigate(['/configurar'], { replaceUrl: true }); return; }

    // Cobre o retorno do OAuth (Google): o Supabase ainda pode estar processando
    // o token da URL nesse instante, e getSession() acima pega "sem sessão" por
    // uma fração de segundo. Esse listener pega a sessão assim que ela existir.
    const { data: sub } = this.supa.onAuthStateChange((s) => {
      if (s) {
        sub.subscription.unsubscribe();
        this.router.navigate(['/configurar'], { replaceUrl: true });
      }
    });

    this.analytics.landingView();
  }

  goLogin(mode: AuthMode = 'entrar') {
    this.router.navigate(['/login'], {
      queryParams: {
        mode,
        next: '/configurar',
      },
    });
  }

  goCadastro() {
    this.goLogin('cadastrar');
  }

  async continueWithGoogle() {
    this.googleLoading.set(true);
    sessionStorage.setItem('pending_google_login', '1');

    const { error } = await this.supa.signInWithGoogle('cadastrar', '/configurar');

    if (error) {
      this.googleLoading.set(false);
      sessionStorage.removeItem('pending_google_login');
      this.goCadastro();
    }
  }

  scrollTo(sectionId: string) {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  goDicas()    { this.router.navigate(['/dicas']); }
  goConvite()  { this.router.navigate(['/convite']); }
}

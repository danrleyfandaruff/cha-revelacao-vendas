import { Component, OnInit } from '@angular/core';
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
import { AuthFlowService } from '../../services/auth-flow.service';

type AuthMode = 'entrar' | 'cadastrar';

@Component({
  selector: 'app-landing',
  templateUrl: 'landing.page.html',
  styleUrls: ['landing.page.scss'],
  standalone: true,
  imports: [IonContent, IonButton, IonIcon],
})
export class LandingPage implements OnInit {
  googleLoading = this.auth.googleLoading;

  features = [
    { icon: '🎁', title: 'Para cada ocasião', desc: 'Chás, casamento, casa nova e aniversário, com presentes que combinam com seu evento.' },
    { icon: '🔒', title: 'Sem duplicação', desc: 'O sistema reserva automaticamente. Dois convidados não pegam o mesmo item.' },
    { icon: '📱', title: 'Funciona no celular', desc: 'Convidados acessam pelo link, sem precisar instalar nada.' },
    { icon: '📊', title: 'Painel em tempo real', desc: 'Você vê quem reservou o quê, com data e hora, a qualquer momento.' },
    { icon: '✏️', title: 'Sugestões prontas', desc: 'Itens para o bebê, a casa ou o aniversariante: selecione e personalize sua lista.' },
    { icon: '🔗', title: 'Link personalizado', desc: 'Cada evento tem seu próprio link para compartilhar com os convidados.' },
  ];

  constructor(private router: Router, private analytics: AnalyticsService, public auth: AuthFlowService) {
    addIcons({
      arrowForwardOutline,
      checkmarkCircleOutline,
      sparklesOutline,
    });
  }

  ngOnInit() {
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
    this.analytics.loginGoogleClick();
    await this.auth.startGoogle('cadastrar');
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

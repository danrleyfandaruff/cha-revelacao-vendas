import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent, IonButton, IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowForwardOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { AnalyticsService } from '../../services/analytics.service';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-landing',
  templateUrl: 'landing.page.html',
  styleUrls: ['landing.page.scss'],
  standalone: true,
  imports: [IonContent, IonButton, IonIcon],
})
export class LandingPage implements OnInit {
  features = [
    { icon: '🧷', title: 'Fraldas + presentes', desc: 'Organize dois tipos de lista: fraldas por tamanho e mimos personalizados.' },
    { icon: '🔒', title: 'Sem duplicação', desc: 'O sistema reserva automaticamente. Dois convidados não pegam o mesmo item.' },
    { icon: '📱', title: 'Funciona no celular', desc: 'Convidados acessam pelo link, sem precisar instalar nada.' },
    { icon: '📊', title: 'Painel em tempo real', desc: 'Você vê quem reservou o quê, com data e hora, a qualquer momento.' },
    { icon: '✏️', title: 'Sugestões prontas', desc: 'Fraldas Huggies, lenços, shampoo e muito mais: só marcar o que quer.' },
    { icon: '🔗', title: 'Link personalizado', desc: 'Seu evento tem um link único com o nome do bebê.' },
  ];

  constructor(private router: Router, private analytics: AnalyticsService, private supa: SupabaseService) {
    addIcons({ arrowForwardOutline, checkmarkCircleOutline });
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

  goLogin()    { this.router.navigate(['/login']); }
  goCadastro() { this.router.navigate(['/login'], { queryParams: { tab: 'cadastrar' } }); }
  goDicas()    { this.router.navigate(['/dicas']); }
  goConvite()  { this.router.navigate(['/convite']); }
}

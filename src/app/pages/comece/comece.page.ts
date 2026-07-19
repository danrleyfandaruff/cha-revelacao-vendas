import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonButton } from '@ionic/angular/standalone';
import { AnalyticsService } from '../../services/analytics.service';

@Component({
  selector: 'app-comece',
  templateUrl: 'comece.page.html',
  styleUrls: ['comece.page.scss'],
  standalone: true,
  imports: [IonContent, IonButton],
})
export class ComecePage implements OnInit {
  dicas = [
    {
      emoji: '🎀',
      titulo: 'Chá revelação inesquecível',
      texto: 'Convide os padrinhos para revelar o sexo junto com vocês, sincronize confetes coloridos e grave o momento em vídeo vertical — dá pra reviver depois quantas vezes quiser.',
    },
    {
      emoji: '🧷',
      titulo: 'Quantas fraldas pedir',
      texto: 'Recém-nascido usa de 8 a 12 fraldas por dia. Peça mais das menores (RN e P), que ele usa por pouco tempo, e menos das maiores.',
    },
    {
      emoji: '🎁',
      titulo: 'Nunca mais presente repetido',
      texto: 'Liste exatamente o que você precisa e deixe os convidados reservarem online. Ninguém trava na dúvida do que comprar, e você não recebe cinco banheiras iguais.',
    },
  ];

  features = [
    { icon: '🔒', title: 'Sem duplicação', desc: 'O sistema reserva automaticamente — dois convidados não escolhem o mesmo item.' },
    { icon: '📱', title: 'Funciona no celular', desc: 'Convidados acessam pelo link, sem precisar instalar nada.' },
    { icon: '📊', title: 'Painel em tempo real', desc: 'Veja quem confirmou e o que já foi escolhido, a qualquer momento.' },
  ];

  constructor(private router: Router, private analytics: AnalyticsService) {}

  ngOnInit() { this.analytics.comeceView(); }

  goCadastro(local: string) {
    this.analytics.comeceCtaClick(local);
    this.router.navigate(['/login'], { queryParams: { tab: 'cadastrar' } });
  }

  goLogin() { this.router.navigate(['/login']); }
  goDicas() { this.router.navigate(['/dicas']); }
}

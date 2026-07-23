import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonButton } from '@ionic/angular/standalone';
import { AnalyticsService } from '../../services/analytics.service';

const KIT_POPUP_SESSION_KEY = 'comece_kit_popup_shown';
const WA_NUMBER = '5548991593331';
const WA_MESSAGE = 'Oi! Acabei de me cadastrar na Lista de Presentes e quero resgatar o kit PDF de pré-natal 🎁';

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

  showKitPopup = signal(false);
  kitImages = [
    'assets/images/kit-preview-1.jpg',
    'assets/images/kit-preview-2.jpg',
    'assets/images/kit-preview-3.jpg',
  ];

  constructor(private router: Router, private analytics: AnalyticsService) {}

  ngOnInit() {
    this.analytics.comeceView();

    // Só mostra uma vez por sessão, com um pequeno atraso pra não brigar
    // com o primeiro carregamento da página.
    if (!sessionStorage.getItem(KIT_POPUP_SESSION_KEY)) {
      setTimeout(() => {
        this.showKitPopup.set(true);
        this.analytics.comeceKitPopupView();
        sessionStorage.setItem(KIT_POPUP_SESSION_KEY, '1');
      }, 1200);
    }
  }

  fecharKitPopup() {
    this.analytics.comeceKitPopupClose();
    this.showKitPopup.set(false);
  }

  kitPopupCadastro() {
    this.showKitPopup.set(false);
    this.goCadastro('popup_kit');
  }

  kitPopupWhatsapp() {
    this.analytics.comeceKitPopupWhatsapp();
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_MESSAGE)}`, '_blank');
  }

  goCadastro(local: string) {
    this.analytics.comeceCtaClick(local);
    this.router.navigate(['/login'], { queryParams: { tab: 'cadastrar' } });
  }

  goLogin() { this.router.navigate(['/login']); }
  goDicas() { this.router.navigate(['/dicas']); }
}

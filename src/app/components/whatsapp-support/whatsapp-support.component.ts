import { Component, Input } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logoWhatsapp } from 'ionicons/icons';
import { supportWhatsAppUrl } from '../../models/site-contact';
import { AnalyticsService } from '../../services/analytics.service';

@Component({
  selector: 'app-whatsapp-support',
  standalone: true,
  imports: [IonIcon],
  template: `
    <a [href]="url" target="_blank" rel="noopener noreferrer"
       aria-label="Falar com Listas para celebrar no WhatsApp (abre em outra aba)"
       title="Falar no WhatsApp" (click)="track()">
      <ion-icon name="logo-whatsapp" aria-hidden="true"></ion-icon>
      <span>Precisa de ajuda?</span>
    </a>
  `,
  styles: [`
    :host { position: absolute; right: max(18px, env(safe-area-inset-right)); bottom: calc(18px + env(safe-area-inset-bottom)); z-index: 20; }
    a { display: flex; align-items: center; justify-content: center; gap: 10px; min-width: 56px; min-height: 56px; padding: 12px 18px; border-radius: 999px; background: #13784b; color: #fff; text-decoration: none; box-shadow: 0 6px 22px #123b3430; font-weight: 700; font-size: .88rem; border: 2px solid #fff; }
    ion-icon { font-size: 28px; flex: none; }
    a:hover { background: #0b623c; }
    a:focus-visible { outline: 3px solid var(--brand-brown); outline-offset: 4px; }
    @media (max-width: 600px) { span { display: none; } a { padding: 12px; } }
  `],
})
export class WhatsAppSupportComponent {
  @Input() placement = 'home';
  readonly url = supportWhatsAppUrl();

  constructor(private analytics: AnalyticsService) { addIcons({ logoWhatsapp }); }

  track() { this.analytics.supportWhatsAppClick(this.placement); }
}

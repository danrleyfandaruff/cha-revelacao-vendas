import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton,
  IonButtons, IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { SupabaseService } from '../../services/supabase.service';
import { AnalyticsService } from '../../services/analytics.service';
import { isEventExpired } from '../../models/event-types';

@Component({
  selector: 'app-pagar',
  templateUrl: 'pagar.page.html',
  styleUrls: ['pagar.page.scss'],
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton,
    IonButtons, IonIcon,
  ],
})
export class PagarPage implements OnInit {
  // ⚠️ Substitua pela URL real do Stripe Payment Link:
  // private STRIPE_LINK = 'https://buy.stripe.com/test_28E8wPdaWcLwedtaJrbjW00';
  private STRIPE_LINK = 'https://buy.stripe.com/5kQ14nfiKdivftlecS6kg02';

  userId   = '';
  success  = signal(false);
  eventId = '';
  ready = signal(false);
  checking = signal(false);
  message = signal('');

  features = [
    'Link personalizado do evento',
    'Itens de presentes ilimitados na sua lista',
    'Painel de resultados em tempo real',
    'Reservas automáticas sem duplicação',
    'Controle de quantidade por item',
    '60 dias com reservas abertas aos convidados',
  ];

  constructor(private supa: SupabaseService, private router: Router, private analytics: AnalyticsService) {
    addIcons({ arrowBackOutline, checkmarkCircleOutline });
  }

  async ngOnInit() {
    const session = await this.supa.getSession();
    if (!session) { this.router.navigate(['/login']); return; }
    this.userId = session.user.id;

    // Only the webhook activates an event after verifying the payment.
    const params = new URLSearchParams(window.location.search);
    this.checking.set(params.get('status') === 'success');
    await this.checkPayment();
  }

  async goToStripe() {
    if (!this.ready() || !this.eventId) return;
    this.ready.set(false);
    try {
      const ev = await this.supa.getMyEvent(this.userId);
      if (!ev || ev.id !== this.eventId || ev.paid || isEventExpired(ev)) {
        this.router.navigate(['/configurar']);
        return;
      }
    this.analytics.goToStripe();
    // Stripe Payment Links não aceitam success_url por parâmetro —
    // a URL de retorno deve ser configurada no Dashboard do Stripe.
    window.location.href = `${this.STRIPE_LINK}?client_reference_id=event_${this.eventId}`;
    } catch {
      this.message.set('Não foi possível abrir o pagamento. Tente novamente.');
      this.ready.set(true);
    }
  }

  async checkPayment() {
    this.ready.set(false);
    try {
      const ev = await this.supa.getMyEvent(this.userId);
      if (!ev || isEventExpired(ev)) {
        this.router.navigate(['/configurar']);
        return;
      }
      this.eventId = ev.id;
      this.success.set(ev.paid);
      if (this.checking() && !ev.paid) {
        this.message.set('Aguardando confirmação do pagamento. Consulte novamente em instantes.');
      }
      this.ready.set(true);
    } catch {
      this.message.set('Não foi possível consultar seu evento. Tente novamente.');
    }
  }

  goConfig() { this.router.navigate(['/configurar']); }
  goBack()   { this.router.navigate(['/configurar']); }
}

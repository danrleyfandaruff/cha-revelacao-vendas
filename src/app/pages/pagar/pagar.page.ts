import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton,
  IonButtons, IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { SupabaseService } from '../../services/supabase.service';

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

  features = [
    'Link personalizado do evento',
    'Listas de fraldas e presentes ilimitadas',
    'Painel de resultados em tempo real',
    'Reservas automáticas sem duplicação',
    'Controle de quantidade por item',
    '30 dias com reservas abertas aos convidados',
  ];

  constructor(private supa: SupabaseService, private router: Router) {
    addIcons({ arrowBackOutline, checkmarkCircleOutline });
  }

  async ngOnInit() {
    const session = await this.supa.getSession();
    if (!session) { this.router.navigate(['/login']); return; }
    this.userId = session.user.id;

    // Check if returning from Stripe with ?status=success
    const params = new URLSearchParams(window.location.search);
    if (params.get('status') === 'success') {
      await this.activate();
      return;
    }

    // If already paid, redirect
    const ev = await this.supa.getMyEvent(this.userId);
    if (ev?.paid) { this.router.navigate(['/configurar']); }
  }

  goToStripe() {
    const returnUrl = encodeURIComponent(
      `${window.location.origin}/pagar?status=success`
    );
    window.location.href = `${this.STRIPE_LINK}?client_reference_id=${this.userId}&success_url=${returnUrl}`;
  }

  private async activate() {
    const result = await this.supa.activateEvent(this.userId);
    if (result.success) {
      this.success.set(true);
    } else {
      this.router.navigate(['/configurar']);
    }
  }

  goConfig() { this.router.navigate(['/configurar']); }
  goBack()   { this.router.navigate(['/configurar']); }
}

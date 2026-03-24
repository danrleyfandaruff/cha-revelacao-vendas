import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton,
  IonButtons, IonSpinner, IonToast, IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { refreshOutline, arrowBackOutline, copyOutline } from 'ionicons/icons';
import { SupabaseService, ChaEvent, EventItem, EventReservation, EventConfirmation } from '../../services/supabase.service';
import { AnalyticsService } from '../../services/analytics.service';

export interface PersonSummary {
  name: string;
  items: string[];
  lastDate: string;
}

export interface ItemProgress {
  item: EventItem;
  reserved: number;
  guests: string;
}

@Component({
  selector: 'app-resultados',
  templateUrl: 'resultados.page.html',
  styleUrls: ['resultados.page.scss'],
  standalone: true,
  imports: [
    DatePipe,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton,
    IonButtons, IonSpinner, IonToast, IonIcon,
  ],
})
export class ResultadosPage implements OnInit, OnDestroy {
  event       = signal<ChaEvent | null>(null);
  allItems         = signal<EventItem[]>([]);
  allRes           = signal<EventReservation[]>([]);
  allConfirmations = signal<EventConfirmation[]>([]);
  loading          = signal(true);

  statConfirmados = computed(() => this.allConfirmations().length);
  toastMsg    = signal('');
  toastOpen   = signal(false);
  updatedAt   = '';
  private refreshInterval: any;

  eventLink = computed(() => {
    const ev = this.event();
    return ev ? `${window.location.origin}/cha?e=${ev.slug}` : '';
  });

  // Stats
  statPessoas  = computed(() => new Set(this.allRes().map(r => r.guest_name)).size);
  statFraldas  = computed(() => this.allRes().filter(r =>
    this.allItems().find(i => i.id === r.item_id && i.category === 'fraldas')
  ).length);
  statMimos    = computed(() => this.allRes().filter(r =>
    this.allItems().find(i => i.id === r.item_id && i.category === 'presentes')
  ).length);
  statTotal    = computed(() => this.allRes().length);

  // Fraldas with progress
  fraldasProgress = computed((): ItemProgress[] =>
    this.allItems()
      .filter(i => i.category === 'fraldas')
      .map(i => ({
        item: i,
        reserved: i.quantity_total - i.quantity_available,
        guests: this.allRes()
          .filter(r => r.item_id === i.id)
          .map(r => r.guest_name)
          .join(', ') || '—',
      }))
  );

  // Mimos with progress
  mimosProgress = computed((): ItemProgress[] =>
    this.allItems()
      .filter(i => i.category === 'presentes')
      .map(i => ({
        item: i,
        reserved: i.quantity_total - i.quantity_available,
        guests: this.allRes()
          .filter(r => r.item_id === i.id)
          .map(r => r.guest_name)
          .join(', ') || '—',
      }))
  );

  // People
  people = computed((): PersonSummary[] => {
    const names = [...new Set(this.allRes().map(r => r.guest_name))];
    return names.map(name => {
      const itens = this.allRes().filter(r => r.guest_name === name);
      return {
        name,
        items: itens.map(r => {
          const it = this.allItems().find(i => i.id === r.item_id);
          return it ? `${it.emoji} ${it.name}` : '?';
        }),
        lastDate: new Date(itens[itens.length - 1].created_at)
          .toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
      };
    });
  });

  constructor(private supa: SupabaseService, private router: Router, private analytics: AnalyticsService) {
    addIcons({ refreshOutline, arrowBackOutline, copyOutline });
  }

  async ngOnInit() {
    this.analytics.resultadosView();
    const session = await this.supa.getSession();
    if (!session) { this.router.navigate(['/login']); return; }

    const ev = await this.supa.getMyEvent(session.user.id);
    if (!ev) { this.router.navigate(['/configurar']); return; }
    this.event.set(ev);

    await this.loadAll();
    this.refreshInterval = setInterval(() => this.loadAll(), 60000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }

  async loadAll() {
    this.loading.set(true);
    const ev = this.event();
    if (!ev) return;
    const [items, res, confirmations] = await Promise.all([
      this.supa.getItems(ev.id),
      this.supa.getReservationsByEvent(ev.id),
      this.supa.getConfirmations(ev.id),
    ]);
    this.allItems.set(items);
    this.allRes.set(res);
    this.allConfirmations.set(confirmations);
    this.updatedAt = new Date().toLocaleTimeString('pt-BR');
    this.loading.set(false);
  }

  pct(prog: ItemProgress): number {
    return Math.round((prog.reserved / prog.item.quantity_total) * 100);
  }

  copyLink() {
    navigator.clipboard.writeText(this.eventLink()).then(() =>
      this.showToast('Link copiado! 🔗')
    );
  }

  goBack() { this.router.navigate(['/configurar']); }

  private showToast(msg: string) {
    this.toastMsg.set(msg);
    this.toastOpen.set(true);
  }
}

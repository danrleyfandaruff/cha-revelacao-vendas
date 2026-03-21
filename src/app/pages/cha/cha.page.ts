import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonButton, IonSpinner, IonToast,
} from '@ionic/angular/standalone';
import { SupabaseService, ChaEvent, EventItem } from '../../services/supabase.service';

type Step = 'fraldas' | 'mimos';

export interface CartItem {
  id: string;
  name: string;
  emoji: string;
  category: string;
}

interface SavedResponse {
  name: string;
  items: CartItem[];
  timestamp: number;
}

@Component({
  selector: 'app-cha',
  templateUrl: 'cha.page.html',
  styleUrls: ['cha.page.scss'],
  standalone: true,
  imports: [FormsModule, IonContent, IonButton, IonSpinner, IonToast],
})
export class ChaPage implements OnInit {
  // Tipo do evento (lido da URL: ?t=bebe&s=menino)
  eventType = signal<'revelacao' | 'bebe'>('revelacao');
  babySex   = signal<'menino' | 'menina' | null>(null);
  themeClass = computed(() => {
    if (this.eventType() !== 'bebe') return '';
    return this.babySex() === 'menino' ? 'theme-menino'
         : this.babySex() === 'menina' ? 'theme-menina' : '';
  });

  // State flags
  state = signal<'loading' | 'notfound' | 'expired' | 'ready' | 'done'>('loading');

  event    = signal<ChaEvent | null>(null);
  allItems = signal<EventItem[]>([]);
  cart     = signal<CartItem[]>([]);
  step     = signal<Step>('fraldas');
  guestName = '';
  submitting = signal(false);
  showModal  = signal(false);
  toastMsg   = signal('');
  toastOpen  = signal(false);
  doneName   = '';

  // Resposta anterior salva no localStorage
  previousResponse = signal<SavedResponse | null>(null);
  showPreviousBanner = signal(false);
  private storageKey = '';

  // Computed
  fraldas  = computed(() => this.sorted(this.allItems().filter(i => i.category === 'fraldas')));
  mimos    = computed(() => this.sorted(this.allItems().filter(i => i.category === 'presentes')));
  fraldasInCart = computed(() => this.cart().filter(i => i.category === 'fraldas'));
  mimosInCart   = computed(() => this.cart().filter(i => i.category === 'presentes'));
  cartTotal     = computed(() => this.cart().length);

  barInfo = computed(() => {
    const nF = this.fraldasInCart().length;
    const nM = this.mimosInCart().length;
    if (nF === 0) return 'Escolha uma fralda para começar';
    if (nM === 0) return 'Agora escolha um presente 🎁';
    return `${this.cartTotal()} iten${this.cartTotal() > 1 ? 's' : ''} no carrinho`;
  });

  canFinalizar = computed(() =>
    this.fraldasInCart().length > 0 && this.mimosInCart().length > 0
  );

  constructor(private route: ActivatedRoute, private supa: SupabaseService) {}

  async ngOnInit() {
    const slug = this.route.snapshot.queryParamMap.get('e');
    if (!slug) { this.state.set('notfound'); return; }

    // Lê tipo e sexo da URL
    const t = this.route.snapshot.queryParamMap.get('t');
    const s = this.route.snapshot.queryParamMap.get('s');
    if (t === 'bebe') this.eventType.set('bebe');
    if (s === 'menino' || s === 'menina') this.babySex.set(s);

    const ev = await this.supa.getEventBySlug(slug);
    if (!ev) { this.state.set('notfound'); return; }
    if (ev.expires_at && new Date(ev.expires_at) < new Date()) {
      this.state.set('expired'); return;
    }

    this.event.set(ev);
    const items = await this.supa.getItems(ev.id);
    this.allItems.set(items);

    // Verifica se o convidado já respondeu antes
    this.storageKey = `cha_done_${slug}`;
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        const parsed: SavedResponse = JSON.parse(saved);
        this.previousResponse.set(parsed);
        this.showPreviousBanner.set(true);
      } catch { /* ignora JSON inválido */ }
    }

    this.state.set('ready');
  }

  private sorted(items: EventItem[]): EventItem[] {
    return [...items].sort((a, b) => {
      const rank = (i: EventItem) =>
        this.inCart(i.id) ? 0 : i.quantity_available > 0 ? 1 : 2;
      return rank(a) - rank(b) || a.sort_order - b.sort_order;
    });
  }

  inCart(id: string) { return this.cart().some(i => i.id === id); }

  addToCart(item: EventItem) {
    if (this.inCart(item.id)) return;
    const cartItem: CartItem = {
      id: item.id, name: item.name,
      emoji: item.emoji, category: item.category,
    };
    if (item.category === 'fraldas') {
      // Only one fralda
      this.cart.update(arr => [...arr.filter(i => i.category !== 'fraldas'), cartItem]);
      this.showToast(`${item.emoji} ${item.name} adicionado!`);
      setTimeout(() => this.step.set('mimos'), 600);
    } else {
      this.cart.update(arr => [...arr, cartItem]);
      this.showToast(`${item.emoji} ${item.name} adicionado!`);
    }
  }

  removeFromCart(id: string) {
    this.cart.update(arr => arr.filter(i => i.id !== id));
  }

  goStep(s: Step) {
    if (s === 'mimos' && this.fraldasInCart().length === 0) {
      this.showToast('Escolha uma fralda primeiro! 🧷');
      return;
    }
    this.step.set(s);
  }

  dismissPreviousBanner() {
    this.showPreviousBanner.set(false);
  }

  chooseAgain() {
    // Limpa localStorage e banner para permitir nova escolha
    if (this.storageKey) localStorage.removeItem(this.storageKey);
    this.previousResponse.set(null);
    this.showPreviousBanner.set(false);
    this.cart.set([]);
    this.step.set('fraldas');
  }

  openModal() { this.showModal.set(true); }
  closeModal() { this.showModal.set(false); this.guestName = ''; }

  async confirmFinalizar() {
    if (!this.guestName.trim()) return;
    this.submitting.set(true);

    for (const item of this.cart()) {
      const result = await this.supa.reserveEventItem(item.id, this.guestName.trim());
      if (!result.success) {
        this.showToast(result.message || 'Erro ao reservar. Tente novamente.');
        this.submitting.set(false);
        return;
      }
      // Update local quantity
      this.allItems.update(items => items.map(i =>
        i.id === item.id
          ? { ...i, quantity_available: Math.max(0, i.quantity_available - 1) }
          : i
      ));
    }

    this.doneName = this.guestName.trim();

    // Salva resposta no localStorage do celular
    const saved: SavedResponse = {
      name: this.doneName,
      items: this.cart(),
      timestamp: Date.now(),
    };
    if (this.storageKey) {
      localStorage.setItem(this.storageKey, JSON.stringify(saved));
    }

    this.closeModal();
    this.state.set('done');
    this.submitting.set(false);
  }

  private showToast(msg: string) {
    this.toastMsg.set(msg);
    this.toastOpen.set(true);
  }

  qtyLabel(item: EventItem): string {
    if (item.quantity_available <= 0) return 'Esgotado';
    if (item.quantity_available === 1) return 'Último item!';
    return `${item.quantity_available} de ${item.quantity_total} disponíveis`;
  }

  isLow(item: EventItem): boolean {
    return item.quantity_available > 0 && item.quantity_available <= 3;
  }

  isLast(item: EventItem): boolean {
    return item.quantity_available === 1;
  }

  expiresLabel(): string {
    const ev = this.event();
    if (!ev?.expires_at) return '';
    return `Reservas abertas até ${new Date(ev.expires_at).toLocaleDateString('pt-BR')}`;
  }

  protected readonly Math = Math;
}

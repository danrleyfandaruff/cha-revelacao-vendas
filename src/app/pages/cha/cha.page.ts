import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonButton, IonSpinner, IonToast,
} from '@ionic/angular/standalone';
import { SupabaseService, ChaEvent, EventItem } from '../../services/supabase.service';
import { AnalyticsService } from '../../services/analytics.service';

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

interface SavedConfirmation {
  guestName: string;
  address: string;
  link: string;
  confirmedAt: number;
}

@Component({
  selector: 'app-cha',
  templateUrl: 'cha.page.html',
  styleUrls: ['cha.page.scss'],
  standalone: true,
  imports: [FormsModule, IonContent, IonButton, IonSpinner, IonToast],
})
export class ChaPage implements OnInit {
  // Tipo do evento (lido da URL: ?t=bebe&s=menino&a=...&d=...)
  eventType     = signal<'revelacao' | 'bebe'>('revelacao');
  babySex       = signal<'menino' | 'menina' | null>(null);
  eventAddress  = signal('');
  eventDatetime = signal('');
  confirmed     = signal(false);

  themeClass = computed(() => {
    if (this.eventType() !== 'bebe') return '';
    return this.babySex() === 'menino' ? 'theme-menino'
         : this.babySex() === 'menina' ? 'theme-menina' : '';
  });

  formattedDatetime = computed(() => {
    const dt = this.eventDatetime();
    if (!dt) return '';

    let iso = dt.trim();

    // Corrige ano inválido (mais de 4 dígitos)
    const yearMatch = iso.match(/^(\d{5,})/);
    if (yearMatch) {
      console.warn('Ano inválido detectado:', yearMatch[1]);
      return ''; // ou corrige manualmente se fizer sentido
    }

    if (iso.includes(' ') && !iso.includes('T')) {
      iso = iso.replace(' ', 'T');
    }

    if (iso.length === 16) {
      iso += ':00';
    }

    const date = new Date(iso);

    if (Number.isNaN(date.getTime())) return '';

    return new Intl.DateTimeFormat('pt-BR', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }).format(date)
        + ' às ' +
        new Intl.DateTimeFormat('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }).format(date);
  });

  // State flags
  state = signal<'loading' | 'notfound' | 'expired' | 'ready' | 'done'>('loading');

  event    = signal<ChaEvent | null>(null);
  allItems = signal<EventItem[]>([]);
  cart     = signal<CartItem[]>([]);
  step     = signal<Step>('fraldas');
  guestName = '';
  confirmingName = '';
  confirmSubmitting = signal(false);
  submitting = signal(false);
  showModal  = signal(false);
  toastMsg   = signal('');
  toastOpen  = signal(false);
  doneName   = '';

  isPreview = signal(false);   // true quando ?preview=1

  // Resposta anterior salva no localStorage
  previousResponse = signal<SavedResponse | null>(null);
  showPreviousBanner = signal(false);
  private storageKey = '';
  private confirmKey = '';     // chave de confirmação de presença, amarrada ao slug

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

  constructor(private route: ActivatedRoute, private supa: SupabaseService, private analytics: AnalyticsService) {}

  async ngOnInit() {
    const slug = this.route.snapshot.queryParamMap.get('e');
    if (!slug) { this.state.set('notfound'); return; }

    // Lê tipo e sexo da URL
    const t = this.route.snapshot.queryParamMap.get('t');
    const s = this.route.snapshot.queryParamMap.get('s');
    if (t === 'bebe') this.eventType.set('bebe');
    if (s === 'menino' || s === 'menina') this.babySex.set(s);
    if (this.route.snapshot.queryParamMap.get('preview') === '1') {
      this.isPreview.set(true);
    }

    const a = this.route.snapshot.queryParamMap.get('a');
    const d = this.route.snapshot.queryParamMap.get('d');
    if (a) this.eventAddress.set(a);
    if (d) this.eventDatetime.set(d);

    const ev = this.isPreview()
      ? await this.supa.getEventBySlugPreview(slug)
      : await this.supa.getEventBySlug(slug);
    if (!ev) { this.state.set('notfound'); return; }

    // Se o evento já está pago, ignora o preview — trata como link normal
    if (this.isPreview() && ev.paid) {
      this.isPreview.set(false);
    }

    if (!this.isPreview() && ev.expires_at && new Date(ev.expires_at) < new Date()) {
      this.state.set('expired'); return;
    }

    this.event.set(ev);

    // Detecção automática de tipo: se os dois nomes são iguais, é chá de bebê
    if (ev.baby_name_1 === ev.baby_name_2) {
      this.eventType.set('bebe');
    }
    const items = await this.supa.getItems(ev.id);
    this.allItems.set(items);

    // Chaves de localStorage amarradas ao slug do evento
    this.storageKey = `cha_done_${slug}`;
    this.confirmKey = `cha_confirmed_${slug}`;

    // Verifica se o convidado já confirmou presença neste evento
    const savedConfirm = localStorage.getItem(this.confirmKey);
    if (savedConfirm) {
      try {
        const parsed: SavedConfirmation = JSON.parse(savedConfirm);
        this.confirmingName = parsed.guestName;
        this.guestName      = parsed.guestName;
        this.confirmed.set(true);   // pula tela de confirmação
      } catch { /* ignora JSON inválido */ }
    }

    // Verifica se o convidado já escolheu presentes antes
    const savedDone = localStorage.getItem(this.storageKey);
    if (savedDone) {
      try {
        const parsed: SavedResponse = JSON.parse(savedDone);
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
      this.analytics.guestAddedToCart(item.category);
      this.showToast(`${item.emoji} ${item.name} adicionado!`);
    }
  }

  async confirmPresence() {
    if (!this.confirmingName.trim()) {
      this.showToast('Digite seu nome para confirmar! 😊');
      return;
    }
    // Em preview, simula a confirmação sem gravar no banco
    if (this.isPreview()) {
      this.guestName = this.confirmingName.trim();
      this.confirmed.set(true);
      return;
    }
    this.confirmSubmitting.set(true);
    const ev = this.event();
    if (ev) {
      await this.supa.saveConfirmation(ev.id, this.confirmingName.trim());
    }
    // Pré-preenche o nome no modal de presentes
    this.guestName = this.confirmingName.trim();

    // Persiste a confirmação no dispositivo do convidado, amarrada ao slug
    if (this.confirmKey) {
      const confirmation: SavedConfirmation = {
        guestName:   this.confirmingName.trim(),
        address:     this.eventAddress(),
        link:        window.location.href,
        confirmedAt: Date.now(),
      };
      localStorage.setItem(this.confirmKey, JSON.stringify(confirmation));
    }

    this.analytics.guestConfirmedPresence();
    this.confirmed.set(true);
    this.confirmSubmitting.set(false);
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
    // Em preview, simula a finalização sem gravar no banco
    if (this.isPreview()) {
      this.doneName = this.guestName.trim();
      this.closeModal();
      this.state.set('done');
      return;
    }
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

    this.analytics.guestFinalized();
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

import { Component, OnInit, HostListener, signal, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonButton, IonSpinner, IonToast,
} from '@ionic/angular/standalone';
import { SupabaseService, ChaEvent, EventItem } from '../../services/supabase.service';
import { AnalyticsService } from '../../services/analytics.service';
import { SitePromotionComponent } from '../../components/site-promotion/site-promotion.component';
import { EventType, eventDefinition, eventNames, isEventExpired, isEventType, resolveEventType } from '../../models/event-types';

type Step = 'intro' | 'fraldas' | 'mimos';

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
  imports: [FormsModule, IonContent, IonButton, IonSpinner, IonToast, SitePromotionComponent],
})
export class ChaPage implements OnInit {
  // Tipo do evento (lido da URL: ?t=bebe&s=menino&a=...&d=...)
  eventType     = signal<EventType>('revelacao');
  definition = computed(() => eventDefinition(this.eventType()));
  names = computed(() => this.event() ? eventNames(this.event()!) : '');
  hasDiapers = computed(() => this.fraldas().length > 0);
  babySex       = signal<'menino' | 'menina' | null>(null);
  eventAddress  = signal('');
  eventDatetime = signal('');

  themeClass = computed(() => {
    if (this.eventType() !== 'bebe') return this.eventType() === 'revelacao' ? '' : 'theme-celebration';
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
  state = signal<'loading' | 'error' | 'notfound' | 'expired' | 'ready' | 'done'>('loading');

  event    = signal<ChaEvent | null>(null);
  allItems = signal<EventItem[]>([]);
  cart     = signal<CartItem[]>([]);
  committedItems = signal<CartItem[]>([]);
  private reservationName = '';
  step     = signal<Step>('intro');
  guestName = '';
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

  // Computed
  fraldas  = computed(() => this.sorted(this.allItems().filter(i => i.category === 'fraldas')));
  mimos    = computed(() => this.sorted(this.allItems().filter(i => i.category === 'presentes')));
  fraldasInCart = computed(() => this.cart().filter(i => i.category === 'fraldas'));
  mimosInCart   = computed(() => this.cart().filter(i => i.category === 'presentes'));
  cartTotal     = computed(() => this.cart().length);

  barInfo = computed(() => {
    const nF = this.fraldasInCart().length;
    const nM = this.mimosInCart().length;
    if (this.hasDiapers() && nF === 0) return 'Escolha uma fralda para começar';
    if (nM === 0) return 'Agora escolha um presente 🎁';
    return `${this.cartTotal()} iten${this.cartTotal() > 1 ? 's' : ''} no carrinho`;
  });

  canFinalizar = computed(() => this.cartTotal() > 0);

  constructor(private route: ActivatedRoute, private supa: SupabaseService, private analytics: AnalyticsService) {}

  async ngOnInit() {
    this.state.set('loading');
    try {
    const slug = this.route.snapshot.queryParamMap.get('e');
    if (!slug) { this.state.set('notfound'); return; }

    // Lê tipo e sexo da URL
    const t = this.route.snapshot.queryParamMap.get('t');
    const s = this.route.snapshot.queryParamMap.get('s');
    if (isEventType(t)) this.eventType.set(t);
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

    if (isEventExpired(ev)) {
      this.state.set('expired'); return;
    }

    this.event.set(ev);

    this.eventType.set(resolveEventType(ev));
    if (ev.baby_sex) this.babySex.set(ev.baby_sex);
    if (ev.address !== null) this.eventAddress.set(ev.address);
    if (ev.event_datetime !== null) this.eventDatetime.set(ev.event_datetime);
    const items = await this.supa.getItems(ev.id);
    this.allItems.set(items);

    // Chave de localStorage amarrada ao slug do evento
    this.storageKey = `cha_done_${slug}`;

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
    } catch { this.state.set('error'); }
  }

  // Convidado escolheu presentes mas ainda não clicou em "Finalizar" →
  // "Confirmar": nada foi salvo no banco ainda. Se ele tentar sair da
  // página assim, o navegador avisa antes de perder a seleção.
  @HostListener('window:beforeunload', ['$event'])
  warnUnsavedSelection(event: BeforeUnloadEvent) {
    if (this.state() === 'ready' && !this.isPreview() && this.cartTotal() > 0) {
      event.preventDefault();
      event.returnValue = true;
    }
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

  removeFromCart(id: string) {
    if (this.committedItems().some(item => item.id === id)) {
      this.showToast('Este presente já foi reservado. Conclua a confirmação dos demais itens.');
      return;
    }
    this.cart.update(arr => arr.filter(i => i.id !== id));
  }

  goStep(s: Step) {
    if (s === 'mimos' && this.hasDiapers() && this.fraldasInCart().length === 0 && this.fraldas().some(i => i.quantity_available > 0)) {
      this.showToast('Escolha uma fralda primeiro! 🧷');
      return;
    }
    this.step.set(s);
  }

  startChoosing() {
    this.step.set(this.hasDiapers() ? 'fraldas' : 'mimos');
  }

  diapersRequired = computed(() => this.hasDiapers() && this.fraldas().some(i => i.quantity_available > 0));

  dismissPreviousBanner() {
    this.showPreviousBanner.set(false);
  }

  chooseAgain() {
    // Limpa localStorage e banner para permitir nova escolha
    if (this.storageKey) localStorage.removeItem(this.storageKey);
    this.previousResponse.set(null);
    this.showPreviousBanner.set(false);
    this.cart.set([]);
    this.startChoosing();
  }

  openModal() { this.showModal.set(true); }
  closeModal() { this.showModal.set(false); }

  // Uma única ação: grava a confirmação de presença e as reservas dos itens
  // do carrinho, sempre com o mesmo nome — não existe mais um segundo campo
  // de nome em outra tela que possa divergir deste aqui. Reserva primeiro,
  // confirmação só é gravada depois que todos os itens foram reservados com
  // sucesso: só confirma quem realmente conseguiu escolher os presentes.
  async confirmFinalizar() {
    if (!this.guestName.trim() || this.submitting() || !this.cartTotal()) return;
    if (isEventExpired(this.event())) { this.closeModal(); this.state.set('expired'); return; }
    const name = this.reservationName || this.guestName.trim();

    // Em preview, simula a finalização sem gravar no banco
    if (this.isPreview()) {
      this.doneName = name;
      this.closeModal();
      this.state.set('done');
      return;
    }
    this.submitting.set(true);
    try {
    for (const item of this.cart()) {
      if (this.committedItems().some(saved => saved.id === item.id)) continue;
      const result = await this.supa.reserveEventItem(item.id, name);
      if (!result.success) {
        this.showToast(result.message || 'Erro ao reservar. Tente novamente.');
        this.submitting.set(false);
        return;
      }
      this.reservationName = name;
      this.committedItems.update(items => [...items, item]);
      // Update local quantity
      this.allItems.update(items => items.map(i =>
        i.id === item.id
          ? { ...i, quantity_available: Math.max(0, i.quantity_available - 1) }
          : i
      ));
    }

    const ev = this.event();
    if (ev) {
      await this.supa.saveConfirmation(ev.id, name);
    }

    this.doneName = name;

    // Salva resposta no localStorage do celular
    const saved: SavedResponse = {
      name: this.doneName,
      items: this.cart(),
      timestamp: Date.now(),
    };
    if (this.storageKey) {
      localStorage.setItem(this.storageKey, JSON.stringify(saved));
    }

    this.analytics.guestConfirmedPresence();
    this.analytics.guestFinalized();
    this.closeModal();
    this.state.set('done');
    } catch {
      this.showToast('Não foi possível concluir. As reservas já confirmadas foram mantidas. Tente novamente.');
    } finally {
      this.submitting.set(false);
    }
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

import { Component, OnInit, signal, computed, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton,
  IonButtons, IonSpinner, IonToast, IonBadge, IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, trashOutline, logOutOutline, barChartOutline, copyOutline, chevronForwardOutline, arrowBackOutline, calendarOutline } from 'ionicons/icons';
import { SupabaseService, ChaEvent, EventItem } from '../../services/supabase.service';
import { AnalyticsService } from '../../services/analytics.service';
import {ToastController} from "@ionic/angular";

// ── Suggestions data ──────────────────────────────────────────────────────────
const SUGESTOES: Record<string, Array<{ name: string; emoji: string; qty: number }>> = {
  fraldas: [
    { name: 'Huggies P',  emoji: '🧷', qty: 5  },
    { name: 'Huggies M',  emoji: '🧷', qty: 20 },
    { name: 'Huggies G',  emoji: '🧷', qty: 20 },
    { name: 'Huggies GG', emoji: '🧷', qty: 5  },
  ],
  presentes: [
    { name: 'Lenço umedecido',   emoji: '🧻', qty: 10 },
    { name: 'Termômetro digital',emoji: '🌡️', qty: 1  },
    { name: 'Kit de unha',       emoji: '💅', qty: 1  },
    { name: 'Escova e pente',    emoji: '🪮', qty: 1  },
    { name: 'Sabonete líquido',  emoji: '🧴', qty: 10 },
    { name: 'Shampoo bebê',      emoji: '🧴', qty: 10 },
    { name: 'Fralda de boca',    emoji: '👄', qty: 10 },
    { name: 'Termômetro banheira',emoji:'🛁', qty: 1  },
    { name: 'Óleo para bebê',    emoji: '💧', qty: 1  },
    { name: 'Cueiro',            emoji: '🧸', qty: 3  },
    { name: 'Manta bebê',        emoji: '🛏️', qty: 2  },
    { name: 'Trocador',          emoji: '🛒', qty: 1  },
  ],
};

export interface DraftItem {
  name: string;
  emoji: string;
  qty: number;
  category: 'fraldas' | 'presentes';
  checked: boolean;
  isCustom?: boolean;
}

export type EventType = 'revelacao' | 'bebe';
export type BabySex   = 'menino' | 'menina';

@Component({
  selector: 'app-configurar',
  templateUrl: 'configurar.page.html',
  styleUrls: ['configurar.page.scss'],
  standalone: true,
  imports: [
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton,
    IonButtons,
    IonSpinner, IonToast, IonBadge, IonIcon,
  ],
})
export class ConfigurarPage implements OnInit {
  // Auth / Event
  userId   = '';
  event    = signal<ChaEvent | null>(null);
  isPaid   = computed(() => this.event()?.paid ?? false);
  eventSlug = computed(() => this.event()?.slug ?? '');
  eventLink = computed(() => {
    const slug = this.eventSlug();
    if (!slug) return '';
    const type    = this.eventType();
    const sex     = this.babySex();
    const address = this.eventAddress();
    const dt      = this.eventDatetime();
    let url = `${window.location.origin}/cha?e=${slug}`;
    if (type === 'bebe') {
      url += `&t=bebe`;
      if (sex) url += `&s=${sex}`;
    }
    if (address) url += `&a=${encodeURIComponent(address)}`;
    if (dt)      url += `&d=${encodeURIComponent(dt)}`;
    return url;
  });

  // Tipo do evento e sexo
  eventType = signal<EventType>('revelacao');
  babySex   = signal<BabySex | null>(null);

  // Detalhes do evento
  eventAddress  = signal('');
  eventDatetime = signal('');


  // Baby names
  name1 = '';
  name2 = '';

  // Tabs
  activeTab = signal<'fraldas' | 'presentes'>('fraldas');

  // Items
  fraldas  = signal<DraftItem[]>([]);
  presentes = signal<DraftItem[]>([]);
  currentItems = computed(() =>
    this.activeTab() === 'fraldas' ? this.fraldas() : this.presentes()
  );

  // Custom item add
  newName  = '';
  newEmoji = '';
  newQty   = 1;

  protected readonly Math = Math;

  // UI
  loading    = signal(false);
  saving     = signal(false);
  configOpen = signal(true);   // se já tem evento salvo, começa fechado (ajustado no ngOnInit)

  // Tutorial de primeira vez (3 passos)
  tutorialStep = signal(0);    // 0 = inativo

  readonly TUTORIAL_STEPS = [
    {
      emoji: '🎀',
      title: 'Configure seu evento',
      desc: 'Escolha o tipo (Revelação ou Bebê), informe o nome, endereço e data do chá.',
      highlight: 'config',
    },
    {
      emoji: '🎁',
      title: 'Monte a lista de presentes',
      desc: 'Selecione as fraldas e os mimos que seus convidados poderão reservar. Ajuste as quantidades à vontade.',
      highlight: 'items',
    },
    {
      emoji: '💾',
      title: 'Salve sua lista',
      desc: 'Toque em "Salvar e gerar link" para guardar tudo. Você pode editar quantas vezes quiser antes de ativar.',
      highlight: 'save',
    },
  ];

  tutorialCurrent = computed(() => {
    const s = this.tutorialStep();
    return s > 0 ? this.TUTORIAL_STEPS[s - 1] : null;
  });

  nextTutorialStep() {
    const next = this.tutorialStep() + 1;
    if (next > this.TUTORIAL_STEPS.length) {
      this.analytics.tutorialCompleted();
      this.dismissTutorial();
    } else {
      this.tutorialStep.set(next);
    }
  }

  dismissTutorial() {
    this.analytics.tutorialSkipped(this.tutorialStep());
    localStorage.setItem(`cfg_tutorial_${this.userId}`, '1');
    this.tutorialStep.set(0);
  }

  // Fecha sem salvar — reaparece na próxima vez que entrar na tela
  closeTutorialTemporarily() {
    this.tutorialStep.set(0);
  }

  private checkTutorial() {
    if (!localStorage.getItem(`cfg_tutorial_${this.userId}`)) {
      this.tutorialStep.set(1);
    }
  }

  configSummary = computed(() => {
    const type = this.eventType();
    const sex  = this.babySex();
    const n1   = this.name1;
    const n2   = this.name2;
    const dt   = this.eventDatetime();
    const addr = this.eventAddress();

    const parts: string[] = [];
    if (type === 'bebe') {
      parts.push('🍼 Chá de Bebê');
      if (sex === 'menino') parts.push('👦 Menino');
      else if (sex === 'menina') parts.push('👧 Menina');
      if (n1) parts.push(n1);
    } else {
      parts.push('🎊 Chá Revelação');
      if (n1 && n2) parts.push(`${n1} ou ${n2}`);
      else if (n1) parts.push(n1);
    }
    if (dt) {
      const d = new Date(dt.length === 16 ? dt + ':00' : dt);
      if (!isNaN(d.getTime())) {
        parts.push(`📅 ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);
      }
    }
    if (addr) parts.push(`📍 ${addr.length > 30 ? addr.slice(0, 30) + '…' : addr}`);
    return parts.join('  ·  ');
  });
  toastMsg  = signal('');
  toastOpen = signal(false);
  showActivationSheet = signal(false);
  showSuccessModal = signal(false);
  highlightLink = signal(false);
  highlightPreview = signal(false);
  showQrModal = signal(false);

  @ViewChild('linkCard',    { read: ElementRef }) linkCardRef?: ElementRef;
  @ViewChild('previewCard', { read: ElementRef }) previewCardRef?: ElementRef;
  @ViewChild('qrContainer', { read: ElementRef }) qrContainerRef?: ElementRef;

  // ── Wizard de primeiro cadastro (cards estilo stories) ────────────────────────
  wizardActive     = signal(false);
  wizardStep       = signal(0);
  wizardDirection  = signal<'fwd' | 'back'>('fwd');
  private wizardTouchStartX = 0;

  readonly wizardStepIds = computed<string[]>(() => {
    const ids = ['intro', 'tipo'];
    if (this.eventType() === 'bebe') ids.push('sexo');
    ids.push('nome', 'local', 'data', 'final');
    return ids;
  });

  wizardStepId = computed(() => this.wizardStepIds()[this.wizardStep()] ?? 'final');

  constructor(private supa: SupabaseService, private router: Router, private toastCtrl: ToastController, private analytics: AnalyticsService) {
    addIcons({ addOutline, trashOutline, logOutOutline, barChartOutline, copyOutline, chevronForwardOutline, arrowBackOutline, calendarOutline });
  }

  async ngOnInit() {
    this.loading.set(true);
    const session = await this.supa.getSession();
    if (!session) { this.router.navigate(['/login']); return; }
    this.userId = session.user.id;

    // Carrega metadados salvos localmente (tipo e sexo)
    this.loadMeta();

    // Detecta retorno do Stripe e mostra modal de boas-vindas
    const params = new URLSearchParams(window.location.search);
    if (params.get('status') === 'success') {
      window.history.replaceState({}, '', '/configurar');
      // Pequeno delay para garantir que o evento já foi ativado pelo webhook
      setTimeout(() => this.showSuccessModal.set(true), 800);
    }

    const ev = await this.supa.getMyEvent(this.userId);
    this.event.set(ev);

    if (ev) {
      this.configOpen.set(false);   // já configurado — começa compacto
      this.name1 = ev.baby_name_1;
      // Se for revelação, name2 vem do banco; se for bebê, ignora
      if (this.eventType() === 'revelacao') {
        this.name2 = ev.baby_name_2;
      }
      // Banco tem prioridade sobre o localStorage; se ainda não tiver sido salvo
      // no banco (evento criado antes desta coluna existir), mantém o valor local.
      if (ev.address)        this.eventAddress.set(ev.address);
      if (ev.event_datetime) this.eventDatetime.set(this.isoToDatetimeLocal(ev.event_datetime));
      // Load existing items
      const items = await this.supa.getItems(ev.id);
      if (items.length) {
        this.fraldas.set(items.filter(i => i.category === 'fraldas').map(i => ({
          name: i.name, emoji: i.emoji, qty: i.quantity_total,
          category: 'fraldas', checked: true,
        })));
        this.presentes.set(items.filter(i => i.category === 'presentes').map(i => ({
          name: i.name, emoji: i.emoji, qty: i.quantity_total,
          category: 'presentes', checked: true,
        })));
      } else {
        this.initSuggestions();
      }
    } else {
      this.initSuggestions();
    }
    this.savedSnapshot = this.buildSnapshot();
    this.loading.set(false);

    if (!ev) {
      // Primeiro acesso: o wizard guiado substitui o tutorial explicativo antigo
      localStorage.setItem(`cfg_tutorial_${this.userId}`, '1');
      this.wizardActive.set(true);
    } else {
      this.checkTutorial();
    }
  }

  private initSuggestions() {
    this.fraldas.set(SUGESTOES['fraldas'].map(s => ({ ...s, category: 'fraldas', checked: true })));
    this.presentes.set(SUGESTOES['presentes'].map(s => ({ ...s, category: 'presentes', checked: true })));
  }

  setTab(t: 'fraldas' | 'presentes') { this.activeTab.set(t); }

  toggleItem(item: DraftItem) { item.checked = !item.checked; }

  addCustomItem() {
    if (!this.newName.trim()) { this.showToast('Digite o nome do item.'); return; }
    const cat = this.activeTab();
    const item: DraftItem = {
      name: this.newName.trim(),
      emoji: this.newEmoji || '🎁',
      qty: this.newQty || 1,
      category: cat,
      checked: true,
      isCustom: true,
    };
    if (cat === 'fraldas') {
      this.fraldas.update(arr => [...arr, item]);
    } else {
      this.presentes.update(arr => [...arr, item]);
    }
    this.newName = '';
    this.newEmoji = '';
    this.newQty = 1;
  }

  // Pede confirmação antes de remover — evita exclusão acidental
  confirmDeleteItem = signal<DraftItem | null>(null);

  askRemoveItem(item: DraftItem) {
    this.confirmDeleteItem.set(item);
  }

  cancelRemoveItem() {
    this.confirmDeleteItem.set(null);
  }

  confirmRemoveItem() {
    const item = this.confirmDeleteItem();
    if (!item) return;
    if (item.category === 'fraldas') {
      this.fraldas.update(arr => arr.filter(i => i !== item));
    } else {
      this.presentes.update(arr => arr.filter(i => i !== item));
    }
    this.confirmDeleteItem.set(null);
  }

  totalChecked(cat: 'fraldas' | 'presentes') {
    const arr = cat === 'fraldas' ? this.fraldas() : this.presentes();
    return arr.filter(i => i.checked).length;
  }

  setEventType(t: EventType) {
    this.eventType.set(t);
    if (t === 'revelacao') this.babySex.set(null);
    this.saveMeta();
  }

  setBabySex(s: BabySex) {
    this.babySex.set(s);
    this.saveMeta();
  }

  private metaKey() { return `event_meta_${this.userId}`; }

  saveMeta() {
    localStorage.setItem(this.metaKey(), JSON.stringify({
      eventType:    this.eventType(),
      babySex:      this.babySex(),
      eventAddress: this.eventAddress(),
      eventDatetime: this.eventDatetime(),
    }));
  }

  private loadMeta() {
    if (!this.userId) return;
    try {
      const raw = localStorage.getItem(this.metaKey());
      if (raw) {
        const meta = JSON.parse(raw);
        if (meta.eventType)     this.eventType.set(meta.eventType);
        if (meta.babySex)       this.babySex.set(meta.babySex);
        if (meta.eventAddress)  this.eventAddress.set(meta.eventAddress);
        if (meta.eventDatetime) this.eventDatetime.set(meta.eventDatetime);
      }
    } catch { /* ignora */ }
  }

  private toIsoOrNull(local: string): string | null {
    if (!local) return null;
    const d = new Date(local.length === 16 ? local + ':00' : local);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  private isoToDatetimeLocal(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // ── Alterações não salvas ────────────────────────────────────────────────────
  private savedSnapshot = '';

  private buildSnapshot(): string {
    return JSON.stringify({
      eventType:     this.eventType(),
      babySex:       this.babySex(),
      name1:         this.name1,
      name2:         this.name2,
      eventAddress:  this.eventAddress(),
      eventDatetime: this.eventDatetime(),
      fraldas:       this.fraldas().map(i => ({ name: i.name, emoji: i.emoji, qty: i.qty, checked: i.checked })),
      presentes:     this.presentes().map(i => ({ name: i.name, emoji: i.emoji, qty: i.qty, checked: i.checked })),
    });
  }

  // true se nunca salvou (primeiro cadastro) ou se algo mudou desde o último save
  needsSave(): boolean {
    return !this.event() || this.buildSnapshot() !== this.savedSnapshot;
  }

  async save() {
    const isBebe = this.eventType() === 'bebe';
    if (!this.name1) { this.showToast('Digite o nome do bebê.'); return; }
    if (!isBebe && !this.name2) { this.showToast('Digite os dois nomes para revelação.'); return; }
    if (isBebe && !this.babySex()) { this.showToast('Selecione o sexo do bebê.'); return; }
    this.saving.set(true);

    const n2   = isBebe ? this.name1 : this.name2;
    const slug = this.supa.slugify(
      isBebe ? this.name1 : `${this.name1}-ou-${this.name2}`,
      this.userId
    );
    const ev = await this.supa.upsertEvent({
      user_id:        this.userId,
      slug,
      baby_name_1:    this.name1,
      baby_name_2:    n2,
      paid:           this.event()?.paid ?? false,
      expires_at:     this.event()?.expires_at ?? null,
      address:        this.eventAddress() || null,
      event_datetime: this.toIsoOrNull(this.eventDatetime()),
    });
    this.saveMeta();
    this.event.set(ev);

    if (ev) {
      const checked = [
        ...this.fraldas().filter(i => i.checked),
        ...this.presentes().filter(i => i.checked),
      ];
      const itemsPayload = checked.map((i, idx) => ({
        event_id:           ev.id,
        category:           i.category,
        name:               i.name,
        emoji:              i.emoji,
        quantity_total:     i.qty,
        quantity_available: i.qty,
        sort_order:         idx,
      }));
      await this.supa.replaceItems(ev.id, itemsPayload as any);
      this.analytics.configSaved(this.eventType());
      this.savedSnapshot = this.buildSnapshot();
      if (!ev.paid) {
        this.showToast('Lista salva! Veja como seus convidados vão ver 👀');
        this.highlightPreviewCard();
      } else {
        this.showToast('Salvo com sucesso! 🎉');
      }
    }
    this.saving.set(false);
  }

  verMeuLink() {
    this.showSuccessModal.set(false);
    setTimeout(() => {
      this.linkCardRef?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.highlightLink.set(true);
      setTimeout(() => this.highlightLink.set(false), 3000);
    }, 300);
  }

  private highlightPreviewCard() {
    setTimeout(() => {
      this.previewCardRef?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.highlightPreview.set(true);
      setTimeout(() => this.highlightPreview.set(false), 3000);
    }, 300);
  }

  // Ativação é sempre uma escolha explícita do usuário — nunca abre sozinha
  openActivation() {
    this.showActivationSheet.set(true);
  }

  // ── Wizard de primeiro cadastro ────────────────────────────────────────────
  wizardNext() {
    this.saveMeta();
    const ids = this.wizardStepIds();
    if (this.wizardStep() < ids.length - 1) {
      this.wizardDirection.set('fwd');
      this.wizardStep.update(s => s + 1);
    }
  }

  wizardBack() {
    if (this.wizardStep() > 0) {
      this.wizardDirection.set('back');
      this.wizardStep.update(s => s - 1);
    }
  }

  skipWizard() {
    this.analytics.wizardSkipped(this.wizardStepId());
    this.wizardActive.set(false);
  }

  selectWizardType(t: EventType) {
    this.setEventType(t);
    this.wizardNext();
  }

  selectWizardSex(s: BabySex) {
    this.setBabySex(s);
    this.wizardNext();
  }

  wizardCanContinueNome(): boolean {
    if (this.eventType() === 'bebe') return !!this.name1.trim();
    return !!this.name1.trim() && !!this.name2.trim();
  }

  onWizardTouchStart(ev: TouchEvent) {
    this.wizardTouchStartX = ev.touches[0].clientX;
  }

  onWizardTouchEnd(ev: TouchEvent) {
    const dx = ev.changedTouches[0].clientX - this.wizardTouchStartX;
    if (dx > 70) this.wizardBack();
  }

  finishWizard() {
    this.analytics.wizardCompleted();
    this.wizardActive.set(false);
  }

  // Link de preview — abre a página do chá com ?preview=1, sem precisar pagar
  previewLink = computed(() => {
    const link = this.eventLink();
    if (!link) return '';
    return link + '&preview=1';
  });

  openPreview() {
    const link = this.previewLink();
    if (link) window.open(link, '_blank');
  }

  copyLink() {
    navigator.clipboard.writeText(this.eventLink()).then(() =>
      this.showToast('Link copiado! 🔗')
    );
  }

  shareWhatsApp() {
    const ev = this.event();
    const link = this.eventLink();
    if (!link) return;
    const name = ev?.baby_name_1 && ev?.baby_name_2 && ev.baby_name_1 !== ev.baby_name_2
      ? `${ev.baby_name_1} ou ${ev.baby_name_2}`
      : ev?.baby_name_1 ?? 'o bebê';
    const msg = `Oi! 🎀 Criei a listinha de presentes do chá de ${name}.\n\nEscolha o que você vai dar aqui 👇\n${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  }

  openQrModal() {
    this.showQrModal.set(true);
    // Aguarda o DOM renderizar o #qrContainer antes de gerar
    setTimeout(() => this.renderQrCode(), 80);
  }

  private renderQrCode() {
    const container = this.qrContainerRef?.nativeElement as HTMLElement | undefined;
    const link = this.eventLink();
    if (!container || !link) return;

    container.innerHTML = '';          // limpa geração anterior
    const QRCode = (window as unknown as Record<string, unknown>)['QRCode'] as
      (new (el: HTMLElement, opts: Record<string, unknown>) => void) | undefined;
    if (!QRCode) { container.textContent = 'QR Code indisponível'; return; }

    new QRCode(container, {
      text:          link,
      width:         220,
      height:        220,
      colorDark:     '#3d2314',
      colorLight:    '#ffffff',
      correctLevel:  2, // M
    });
  }

  downloadQr() {
    const container = this.qrContainerRef?.nativeElement as HTMLElement | undefined;
    const canvas = container?.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = 'qrcode-cha.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  }

  goResultados() { this.router.navigate(['/resultados']); }
  goPagar()      { this.router.navigate(['/pagar']); }

  async logout() {
    await this.supa.signOut();
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  async showToast(msg: string) {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 3000,
      position: 'top',
    });

    await toast.present();
  }

  onToastDismiss() {
    this.toastOpen.set(false);
  }
}

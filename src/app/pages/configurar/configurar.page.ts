import { Component, OnInit, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton,
  IonButtons, IonSegment, IonSegmentButton, IonLabel,
  IonSpinner, IonToast, IonBadge, IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, trashOutline, logOutOutline, barChartOutline, copyOutline, chevronForwardOutline } from 'ionicons/icons';
import { SupabaseService, ChaEvent, EventItem } from '../../services/supabase.service';
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

@Component({
  selector: 'app-configurar',
  templateUrl: 'configurar.page.html',
  styleUrls: ['configurar.page.scss'],
  standalone: true,
  imports: [
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton,
    IonButtons, IonSegment, IonSegmentButton, IonLabel,
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
    return slug ? `${window.location.origin}/cha?e=${slug}` : '';
  });

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
  loading  = signal(false);
  saving   = signal(false);
  toastMsg  = signal('');
  toastOpen = signal(false);
  showActivationSheet = signal(false);

  constructor(private supa: SupabaseService, private router: Router, private toastCtrl: ToastController) {
    addIcons({ addOutline, trashOutline, logOutOutline, barChartOutline, copyOutline, chevronForwardOutline });
  }

  async ngOnInit() {
    this.loading.set(true);
    const session = await this.supa.getSession();
    if (!session) { this.router.navigate(['/login']); return; }
    this.userId = session.user.id;

    const ev = await this.supa.getMyEvent(this.userId);
    this.event.set(ev);

    if (ev) {
      this.name1 = ev.baby_name_1;
      this.name2 = ev.baby_name_2;
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
    this.loading.set(false);
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

  removeItem(item: DraftItem) {
    if (item.category === 'fraldas') {
      this.fraldas.update(arr => arr.filter(i => i !== item));
    } else {
      this.presentes.update(arr => arr.filter(i => i !== item));
    }
  }

  totalChecked(cat: 'fraldas' | 'presentes') {
    const arr = cat === 'fraldas' ? this.fraldas() : this.presentes();
    return arr.filter(i => i.checked).length;
  }

  async save() {
    if (!this.name1 || !this.name2) { this.showToast('Digite os nomes dos bebês.'); return; }
    this.saving.set(true);

    const slug = this.supa.slugify(`${this.name1}-ou-${this.name2}`, this.userId);
    const ev = await this.supa.upsertEvent({
      user_id:     this.userId,
      slug,
      baby_name_1: this.name1,
      baby_name_2: this.name2,
      paid:        this.event()?.paid ?? false,
      expires_at:  this.event()?.expires_at ?? null,
    });
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
      if (!ev.paid) {
        // Mostra sheet de ativação em vez de toast simples
        this.showActivationSheet.set(true);
      } else {
        this.showToast('Salvo com sucesso! 🎉');
      }
    }
    this.saving.set(false);
  }

  copyLink() {
    navigator.clipboard.writeText(this.eventLink()).then(() =>
      this.showToast('Link copiado! 🔗')
    );
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

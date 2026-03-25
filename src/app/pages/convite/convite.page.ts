import {
  Component, AfterViewInit, OnInit, OnDestroy, ViewChild, ElementRef, inject, NgZone
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { take } from 'rxjs/operators';

export type Tema = 'rosa' | 'azul' | 'neutro' | 'safari';
export type TipoEvento = 'bebe' | 'fraldas' | 'revelacao';
type PShape = 'rect' | 'circle' | 'star' | 'heart' | 'ribbon';

interface TConfig {
  label: string; emoji: string;
  hdr: string; hdrDark: string; dark: string; mid: string;
  confetes: string[]; footerLine: string;
}

const TEMAS: Record<Tema, TConfig> = {
  rosa: {
    label: 'Menina 🌸', emoji: '🎀',
    hdr: '#e91e8c', hdrDark: '#ad1457', dark: '#880e4f', mid: '#f48fb1',
    confetes: ['#f48fb1','#f06292','#e91e8c','#fff','#fce4ec','#ff80ab','#ff4081','#f8bbd0'],
    footerLine: '💕  🌸  🎀  👶  💗'
  },
  azul: {
    label: 'Menino 💙', emoji: '🍼',
    hdr: '#1976d2', hdrDark: '#0d47a1', dark: '#0d47a1', mid: '#90caf9',
    confetes: ['#90caf9','#42a5f5','#1976d2','#fff','#e3f2fd','#448aff','#82b1ff','#bbdefb'],
    footerLine: '💙  🍼  🚂  👶  ⭐'
  },
  neutro: {
    label: 'Neutro ✨', emoji: '⭐',
    hdr: '#c9953e', hdrDark: '#8a6520', dark: '#3d2314', mid: '#f5c97a',
    confetes: ['#c9953e','#f5c97a','#fff','#f0e6d3','#ffe082','#ffd740','#ffab40','#ffe0b2'],
    footerLine: '⭐  🌙  🍭  👶  ✨'
  },
  safari: {
    label: 'Safari 🦁', emoji: '🦁',
    hdr: '#388e3c', hdrDark: '#1b5e20', dark: '#1b5e20', mid: '#66bb6a',
    confetes: ['#a5d6a7','#66bb6a','#388e3c','#fff','#f9fbe7','#b9f6ca','#ccff90','#c8e6c9'],
    footerLine: '🦁  🐘  🦒  👶  🌿'
  }
};

const TIPOS: Record<TipoEvento, { label: string; titulo: string; emoji: string }> = {
  bebe:      { label: 'Chá de Bebê',    titulo: 'Chá de Bebê',    emoji: '👶' },
  fraldas:   { label: 'Chá de Fraldas', titulo: 'Chá de Fraldas', emoji: '🍼' },
  revelacao: { label: 'Chá Revelação',  titulo: 'Chá Revelação',  emoji: '🎊' },
};

interface Pt {
  x: number; y: number; vx: number; vy: number;
  sz: number; color: string; rot: number; rotV: number; shape: PShape;
}

interface Sparkle {
  x: number; y: number; life: number; maxLife: number; sz: number; color: string;
}

const MONTHS = ['janeiro','fevereiro','março','abril','maio','junho',
                'julho','agosto','setembro','outubro','novembro','dezembro'];

function fmtDate(d: string): string {
  if (!d) return '';
  const p = d.split('-');
  if (p.length < 3) return d;
  const [y, m, day] = [+p[0], +p[1], +p[2]];
  if (!day || !m || m > 12) return d;
  return `${day} de ${MONTHS[m - 1]} de ${y}`;
}

function randShape(): PShape {
  const r = Math.random();
  if (r < 0.28) return 'rect';
  if (r < 0.52) return 'circle';
  if (r < 0.68) return 'star';
  if (r < 0.84) return 'heart';
  return 'ribbon';
}

@Component({
  selector: 'app-convite',
  standalone: true,
  imports: [IonContent, FormsModule],
  templateUrl: './convite.page.html',
  styleUrls: ['./convite.page.scss']
})
export class ConvitePage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('cvs') cvsRef!: ElementRef<HTMLCanvasElement>;
  private router = inject(Router);
  private route  = inject(ActivatedRoute);
  private zone   = inject(NgZone);

  nome      = '';
  data      = '';
  local     = '';
  mensagem  = '';
  tema: Tema       = 'rosa';
  tipo: TipoEvento = 'bebe';

  isShareMode = false;
  linkCopiado = false;

  readonly temaList = (Object.keys(TEMAS) as Tema[]).map(k => ({ id: k, ...TEMAS[k] }));
  readonly tipoList = (Object.keys(TIPOS) as TipoEvento[]).map(k => ({ id: k, ...TIPOS[k] }));

  private W = 800; private H = 1050;
  private ctx!: CanvasRenderingContext2D;
  private pts: Pt[] = [];
  private sparkles: Sparkle[] = [];
  private raf = 0;
  private burstFrames = 0;
  private sparkTimer  = 0;
  private readonly DRAFT_KEY = 'convite_draft';

  /* ── Lifecycle ──────────────────────────────────────── */

  ngOnInit() {
    this.route.queryParams.pipe(take(1)).subscribe(params => {
      if (params['nome'])  this.nome     = params['nome'];
      if (params['data'])  this.data     = params['data'];
      if (params['local']) this.local    = params['local'];
      if (params['msg'])   this.mensagem = params['msg'];
      if (params['tema'] && ['rosa','azul','neutro','safari'].includes(params['tema']))
        this.tema = params['tema'] as Tema;
      if (params['tipo'] && ['bebe','fraldas','revelacao'].includes(params['tipo']))
        this.tipo = params['tipo'] as TipoEvento;
      this.isShareMode = Object.keys(params).length > 0;
      if (!this.isShareMode) this.loadDraft();
    });
  }

  ngAfterViewInit() {
    const cvs = this.cvsRef.nativeElement;
    cvs.width = this.W; cvs.height = this.H;
    this.ctx = cvs.getContext('2d')!;
    this.initPts();
    this.zone.runOutsideAngular(() => this.loop());
  }

  ngOnDestroy() { cancelAnimationFrame(this.raf); }

  /* ── Public ─────────────────────────────────────────── */

  setTema(t: Tema) {
    this.tema = t;
    this.initPts();
    this.saveDraft();
    this.zone.runOutsideAngular(() => this.draw());
  }

  setTipo(t: TipoEvento) {
    this.tipo = t;
    this.saveDraft();
    this.zone.runOutsideAngular(() => this.draw());
  }

  saveDraft() {
    try {
      localStorage.setItem(this.DRAFT_KEY, JSON.stringify({
        nome: this.nome, data: this.data, local: this.local,
        msg: this.mensagem, tema: this.tema, tipo: this.tipo
      }));
    } catch {}
  }

  loadDraft() {
    try {
      const raw = localStorage.getItem(this.DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.nome)  this.nome     = d.nome;
      if (d.data)  this.data     = d.data;
      if (d.local) this.local    = d.local;
      if (d.msg)   this.mensagem = d.msg;
      if (d.tema && ['rosa','azul','neutro','safari'].includes(d.tema))
        this.tema = d.tema as Tema;
      if (d.tipo && ['bebe','fraldas','revelacao'].includes(d.tipo))
        this.tipo = d.tipo as TipoEvento;
    } catch {}
  }

  copyLink() {
    const p = new URLSearchParams({ nome: this.nome, data: this.data, local: this.local, tema: this.tema, tipo: this.tipo });
    if (this.mensagem) p.set('msg', this.mensagem);
    navigator.clipboard.writeText(`${window.location.origin}/convite?${p}`).then(() => {
      this.linkCopiado = true;
      setTimeout(() => { this.linkCopiado = false; }, 2500);
    });
  }

  goCreate() {
    this.isShareMode = false;
    this.loadDraft();
    this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
  }

  download() {
    const a = document.createElement('a');
    a.download = `convite-${(this.nome || 'cha').replace(/\s+/g,'-').toLowerCase()}.png`;
    a.href = this.cvsRef.nativeElement.toDataURL('image/png');
    a.click();
  }

  goBack() { this.router.navigate(['/']); }

  /* ── Particle system ────────────────────────────────── */

  private initPts() {
    const c = TEMAS[this.tema];
    if (this.isShareMode) {
      this.burstFrames = 100;
      this.pts = Array.from({ length: 100 }, () => this.mkBurstPt(c));
    } else {
      this.burstFrames = 0;
      this.pts = Array.from({ length: 70 }, () => this.mkPt(c, true));
    }
    this.sparkles = [];
  }

  private mkPt(c: TConfig, scattered = false): Pt {
    return {
      x: Math.random() * this.W,
      y: scattered ? Math.random() * this.H : -20,
      vx: (Math.random() - 0.5) * 1.5,
      vy: 0.6 + Math.random() * 1.3,
      sz: 5 + Math.random() * 11,
      color: c.confetes[Math.floor(Math.random() * c.confetes.length)],
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.1,
      shape: randShape()
    };
  }

  private mkBurstPt(c: TConfig): Pt {
    const angle = Math.random() * Math.PI * 2;
    const speed = 5 + Math.random() * 11;
    return {
      x: this.W / 2 + (Math.random() - 0.5) * 80,
      y: this.H / 2 + (Math.random() - 0.5) * 80,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      sz: 6 + Math.random() * 13,
      color: c.confetes[Math.floor(Math.random() * c.confetes.length)],
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.2,
      shape: randShape()
    };
  }

  private loop() {
    try { this.draw(); } catch (e) { console.error('[convite] draw error:', e); }
    this.raf = requestAnimationFrame(() => this.loop());
  }

  /* ── Canvas helpers ─────────────────────────────────── */

  private rr(x: number, y: number, w: number, h: number, r: number) {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(x+r,y); c.lineTo(x+w-r,y); c.arcTo(x+w,y,x+w,y+r,r);
    c.lineTo(x+w,y+h-r); c.arcTo(x+w,y+h,x+w-r,y+h,r);
    c.lineTo(x+r,y+h); c.arcTo(x,y+h,x,y+h-r,r);
    c.lineTo(x,y+r); c.arcTo(x,y,x+r,y,r);
    c.closePath();
  }

  private drawStar(x: number, y: number, r: number) {
    const ctx = this.ctx;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      const rad = i % 2 === 0 ? r : r * 0.42;
      i === 0 ? ctx.moveTo(x + rad*Math.cos(a), y + rad*Math.sin(a))
              : ctx.lineTo(x + rad*Math.cos(a), y + rad*Math.sin(a));
    }
    ctx.closePath();
  }

  private drawHeart(x: number, y: number, sz: number) {
    const s = sz * 0.055;
    const ctx = this.ctx;
    const cy = y - sz * 0.05;
    ctx.beginPath();
    ctx.moveTo(x, cy - 3*s);
    ctx.bezierCurveTo(x-5*s, cy-9*s, x-11*s, cy-3*s, x-5*s, cy+4*s);
    ctx.bezierCurveTo(x-2*s, cy+7.5*s, x, cy+9.5*s, x, cy+9.5*s);
    ctx.bezierCurveTo(x, cy+9.5*s, x+2*s, cy+7.5*s, x+5*s, cy+4*s);
    ctx.bezierCurveTo(x+11*s, cy-3*s, x+5*s, cy-9*s, x, cy-3*s);
    ctx.closePath();
  }

  private drawSparkle(x: number, y: number, sz: number, alpha: number, color: string) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    const w = sz * 0.15;
    ctx.beginPath();
    ctx.moveTo(x, y-sz); ctx.lineTo(x+w, y-w);
    ctx.lineTo(x+sz, y); ctx.lineTo(x+w, y+w);
    ctx.lineTo(x, y+sz); ctx.lineTo(x-w, y+w);
    ctx.lineTo(x-sz, y); ctx.lineTo(x-w, y-w);
    ctx.closePath(); ctx.fill();
    // tiny center dot
    ctx.beginPath(); ctx.arc(x, y, sz*0.18, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  private wrap(text: string, x: number, y: number, maxW: number, lh: number): number {
    const ctx = this.ctx;
    const words = text.split(' ');
    let line = '', curY = y;
    for (const w of words) {
      const t = line + w + ' ';
      if (ctx.measureText(t).width > maxW && line) {
        ctx.fillText(line.trim(), x, curY); line = w + ' '; curY += lh;
      } else { line = t; }
    }
    ctx.fillText(line.trim(), x, curY);
    return curY;
  }

  /* ── Main draw ──────────────────────────────────────── */

  private draw() {
    const { ctx, W, H } = this;
    const cfg   = TEMAS[this.tema];
    const tpCfg = TIPOS[this.tipo];
    const nome  = (this.nome  || 'Nome da Mamãe').slice(0, 28);
    const data  = fmtDate(this.data) || 'Data a confirmar';
    const local = (this.local || 'Local a confirmar').slice(0, 55);
    const msg   = this.mensagem.slice(0, 80);

    const CX = 36, CY = 48, CW = W - 72, CH = H - 96;
    const HDR = 162; // header band height

    /* ── Background ─────────────────────────────────────── */
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#f9f4ee');
    bg.addColorStop(0.5, cfg.mid + '28');
    bg.addColorStop(1, cfg.hdr + '22');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // Bokeh circles
    const bokeh: [number,number,number][] = [[0,0,270],[W,0,210],[0,H,240],[W,H,190],[W*.5,H*.35,320]];
    bokeh.forEach(([bx,by,br]) => {
      const g = ctx.createRadialGradient(bx,by,0,bx,by,br);
      g.addColorStop(0, cfg.hdr+'1a'); g.addColorStop(1,'transparent');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(bx,by,br,0,Math.PI*2); ctx.fill();
    });

    /* ── Confetti ────────────────────────────────────────── */
    const bursting = this.burstFrames > 0;
    if (bursting) this.burstFrames--;

    this.pts.forEach(p => {
      if (bursting) { p.vy += 0.13; p.vx *= 0.994; }
      p.x += p.vx; p.y += p.vy; p.rot += p.rotV;
      if (p.y > H + 24 || (bursting && (p.x < -70 || p.x > W+70 || p.y < -70)))
        Object.assign(p, this.mkPt(cfg));
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color; ctx.globalAlpha = 0.9;
      switch (p.shape) {
        case 'rect':   ctx.fillRect(-p.sz/2, -p.sz/4, p.sz, p.sz/2); break;
        case 'circle': ctx.beginPath(); ctx.arc(0,0,p.sz/2,0,Math.PI*2); ctx.fill(); break;
        case 'ribbon': ctx.fillRect(-p.sz*.6, -p.sz*.12, p.sz*1.2, p.sz*.24); break;
        case 'star':   this.drawStar(0,0,p.sz/2); ctx.fill(); break;
        case 'heart':  this.drawHeart(0,0,p.sz); ctx.fill(); break;
      }
      ctx.restore();
    });
    ctx.globalAlpha = 1;

    /* ── Card — multi-layer shadow ───────────────────────── */
    ctx.save();
    ctx.shadowColor='rgba(0,0,0,0.07)'; ctx.shadowBlur=70; ctx.shadowOffsetY=28;
    ctx.fillStyle='rgba(255,255,255,0.3)'; this.rr(CX,CY,CW,CH,40); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.shadowColor='rgba(0,0,0,0.14)'; ctx.shadowBlur=32; ctx.shadowOffsetY=12;
    ctx.fillStyle='#fff'; this.rr(CX,CY,CW,CH,40); ctx.fill();
    ctx.restore();

    /* ── Card fill ───────────────────────────────────────── */
    ctx.fillStyle='#fff'; this.rr(CX,CY,CW,CH,40); ctx.fill();

    /* ── Inner card border ───────────────────────────────── */
    ctx.strokeStyle = cfg.hdr+'20'; ctx.lineWidth = 2;
    this.rr(CX+10, CY+10, CW-20, CH-20, 32); ctx.stroke();

    /* ── Header gradient band ────────────────────────────── */
    const hGrad = ctx.createLinearGradient(CX, CY, CX+CW, CY+HDR);
    hGrad.addColorStop(0, cfg.hdr);
    hGrad.addColorStop(0.5, cfg.hdrDark);
    hGrad.addColorStop(1, cfg.hdr);
    ctx.fillStyle = hGrad;
    ctx.beginPath();
    ctx.moveTo(CX+40,CY); ctx.lineTo(CX+CW-40,CY);
    ctx.arcTo(CX+CW,CY,CX+CW,CY+40,40);
    ctx.lineTo(CX+CW,CY+HDR); ctx.lineTo(CX,CY+HDR); ctx.lineTo(CX,CY+40);
    ctx.arcTo(CX,CY,CX+40,CY,40);
    ctx.closePath(); ctx.fill();

    // Header shimmer
    const shimmer = ctx.createLinearGradient(CX,CY,CX,CY+HDR);
    shimmer.addColorStop(0,'rgba(255,255,255,0.2)');
    shimmer.addColorStop(0.5,'rgba(255,255,255,0.05)');
    shimmer.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=shimmer;
    ctx.beginPath();
    ctx.moveTo(CX+40,CY); ctx.lineTo(CX+CW-40,CY);
    ctx.arcTo(CX+CW,CY,CX+CW,CY+40,40);
    ctx.lineTo(CX+CW,CY+HDR); ctx.lineTo(CX,CY+HDR); ctx.lineTo(CX,CY+40);
    ctx.arcTo(CX,CY,CX+40,CY,40);
    ctx.closePath(); ctx.fill();

    // Dot pattern on header
    ctx.fillStyle='rgba(255,255,255,0.1)';
    for (let dx=20; dx<CW-20; dx+=26)
      for (let dy=10; dy<HDR-10; dy+=26) {
        ctx.beginPath(); ctx.arc(CX+dx,CY+dy,2,0,Math.PI*2); ctx.fill();
      }

    /* ── Header emoji ────────────────────────────────────── */
    ctx.font = '66px "Apple Color Emoji","Segoe UI Emoji",serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.tipo === 'revelacao' ? '💙 🎊 💗' : cfg.emoji, W/2, CY+HDR-26);

    /* ── "você está convidada!" ──────────────────────────── */
    ctx.font = '500 19px Arial,sans-serif';
    ctx.fillStyle = cfg.mid;
    ctx.fillText('— você está convidada! —', W/2, CY+HDR+46);

    /* ── Gradient title ──────────────────────────────────── */
    const fs = tpCfg.titulo.length > 12 ? '46' : '52';
    ctx.font = `bold ${fs}px Georgia,serif`;
    const tw = ctx.measureText(tpCfg.titulo).width;
    const tGrad = ctx.createLinearGradient(W/2-tw/2, 0, W/2+tw/2, 0);
    tGrad.addColorStop(0, cfg.hdr);
    tGrad.addColorStop(0.5, cfg.dark);
    tGrad.addColorStop(1, cfg.hdr);
    ctx.fillStyle = tGrad;
    ctx.fillText(tpCfg.titulo, W/2, CY+HDR+108);

    /* ── "de [nome]" ─────────────────────────────────────── */
    ctx.font = 'italic 34px Georgia,serif'; ctx.fillStyle = cfg.hdr;
    ctx.fillText('de ' + nome, W/2, CY+HDR+156);

    /* ── Ornamental divider ──────────────────────────────── */
    const divY = CY + HDR + 192;
    ctx.strokeStyle = cfg.mid+'99'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(CX+90, divY); ctx.lineTo(W/2-40, divY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W/2+40, divY); ctx.lineTo(CX+CW-90, divY); ctx.stroke();
    ctx.fillStyle = cfg.hdr;
    ctx.save(); ctx.translate(W/2, divY); ctx.rotate(Math.PI/4); ctx.fillRect(-7,-7,14,14); ctx.restore();
    [W/2-62, W/2-22, W/2+22, W/2+62].forEach(dx => {
      ctx.beginPath(); ctx.arc(dx, divY, 2.5, 0, Math.PI*2); ctx.fill();
    });

    /* ── Date ────────────────────────────────────────────── */
    ctx.textAlign = 'left';
    ctx.font = '28px "Apple Color Emoji","Segoe UI Emoji",serif'; ctx.fillStyle = cfg.dark;
    ctx.fillText('📅', CX+90, CY+HDR+248);
    ctx.font = '23px Arial,sans-serif'; ctx.fillStyle = cfg.dark;
    ctx.fillText(data, CX+136, CY+HDR+248);

    /* ── Local ───────────────────────────────────────────── */
    ctx.font = '28px "Apple Color Emoji","Segoe UI Emoji",serif';
    ctx.fillText('📍', CX+90, CY+HDR+298);
    ctx.font = '23px Arial,sans-serif'; ctx.fillStyle = cfg.dark;
    this.wrap(local, CX+136, CY+HDR+298, CW-230, 34);

    /* ── Message ─────────────────────────────────────────── */
    if (msg) {
      ctx.textAlign = 'center';
      ctx.font = 'italic 22px Georgia,serif';
      ctx.fillStyle = cfg.hdr + 'bb';
      this.wrap('"' + msg + '"', W/2, CY+HDR+378, CW-160, 32);
    }

    /* ── Sparkles ────────────────────────────────────────── */
    this.sparkTimer++;
    if (this.sparkTimer % 13 === 0 && this.sparkles.length < 8) {
      this.sparkles.push({
        x: CX + 70 + Math.random() * (CW - 140),
        y: CY + HDR + 60 + Math.random() * (CH - HDR - 150),
        life: 0, maxLife: 44 + Math.random() * 28,
        sz: 7 + Math.random() * 11, color: cfg.mid
      });
    }
    this.sparkles = this.sparkles.filter(s => s.life < s.maxLife);
    this.sparkles.forEach(s => {
      s.life++;
      const prog = s.life / s.maxLife;
      const alpha = prog < 0.25 ? prog/0.25 : 1 - (prog-0.25)/0.75;
      this.drawSparkle(s.x, s.y, s.sz * Math.sin(prog * Math.PI), alpha * 0.7, s.color);
    });

    /* ── Footer emojis ───────────────────────────────────── */
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.font = '28px "Apple Color Emoji","Segoe UI Emoji",serif';
    ctx.fillText(cfg.footerLine, W/2, CY+CH-52);

    /* ── Footer gradient strip ───────────────────────────── */
    const fGrad = ctx.createLinearGradient(CX, CY+CH-42, CX+CW, CY+CH);
    fGrad.addColorStop(0, cfg.hdr); fGrad.addColorStop(1, cfg.hdrDark);
    ctx.fillStyle = fGrad;
    const fTop = CY + CH - 42;
    ctx.beginPath();
    ctx.moveTo(CX, fTop); ctx.lineTo(CX+CW, fTop);
    ctx.lineTo(CX+CW, CY+CH-40);
    ctx.arcTo(CX+CW, CY+CH, CX+CW-40, CY+CH, 40);
    ctx.lineTo(CX+40, CY+CH);
    ctx.arcTo(CX, CY+CH, CX, CY+CH-40, 40);
    ctx.lineTo(CX, fTop); ctx.closePath(); ctx.fill();

    // Footer shimmer
    const fShim = ctx.createLinearGradient(CX, fTop, CX+CW, CY+CH);
    fShim.addColorStop(0,'rgba(255,255,255,0.22)'); fShim.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle = fShim;
    ctx.beginPath();
    ctx.moveTo(CX, fTop); ctx.lineTo(CX+CW, fTop);
    ctx.lineTo(CX+CW, CY+CH-40);
    ctx.arcTo(CX+CW, CY+CH, CX+CW-40, CY+CH, 40);
    ctx.lineTo(CX+40, CY+CH);
    ctx.arcTo(CX, CY+CH, CX, CY+CH-40, 40);
    ctx.lineTo(CX, fTop); ctx.closePath(); ctx.fill();
  }
}

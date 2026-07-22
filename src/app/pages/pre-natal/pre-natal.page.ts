import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonContent, IonButton, IonSpinner } from '@ionic/angular/standalone';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { SupabaseService } from '../../services/supabase.service';

const TOKEN_STORAGE_KEY = 'pre_natal_token';

const TEMPLATE_URL = 'assets/templates/pre-natal-rosa.pdf';
const COVER_FONT_URL = 'assets/fonts/LibreBaskerville-Regular.ttf'; // mesma fonte serifada do design original
const BROWN = { r: 0x4a / 255, g: 0x37 / 255, b: 0x28 / 255 };

// Posições dos valores na página 2 (Dados Pessoais), extraídas do template
// (xMax do rótulo + yMax do rótulo, no sistema de coordenadas do PDF, origem no topo).
const FIELD_ROWS: Array<{ labelXMax: number; labelYMax: number; getValue: (f: FormData) => string }> = [
  { labelXMax: 137.786923, labelYMax: 269.822433, getValue: f => f.nome },
  { labelXMax: 211.048623, labelYMax: 305.836003, getValue: f => f.nascimento },
  { labelXMax: 138.477468, labelYMax: 341.849572, getValue: f => f.idade },
  { labelXMax: 114.027062, labelYMax: 377.863141, getValue: f => f.cpf },
  { labelXMax: 153.592729, labelYMax: 413.876710, getValue: f => f.celular },
  { labelXMax: 253.286953, labelYMax: 449.890279, getValue: f => f.emergencia },
  { labelXMax: 204.718629, labelYMax: 485.903848, getValue: f => f.sus },
];

interface FormData {
  nome: string;
  nascimento: string; // dd/mm/aaaa, já formatado pro PDF
  idade: string;
  cpf: string;
  celular: string;
  emergencia: string;
  sus: string;
  endereco: string;
}

// Campo "Endereço" — mais largo, pode quebrar em 2 linhas. Coordenadas extraídas do template.
const ENDERECO_LABEL = { xMin: 118.596881, xMax: 240.619525, yMax: 651.403450 };

// Pontos da borda direita da mancha lilás da capa (y no topo-origem do PDF, x em pt),
// amostrados diretamente da imagem do template. Usados pra desenhar o nome em curva,
// do lado de fora (na área branca), acompanhando o contorno em vez de uma reta única.
const COVER_EDGE: Array<[number, number]> = [
  [288.0,168.2],[291.6,169.4],[295.2,170.2],[298.8,172.3],[302.4,173.8],[306.0,173.3],
  [309.6,176.4],[313.2,178.1],[316.8,179.5],[320.4,181.2],[324.0,182.9],[327.6,184.6],
  [331.2,186.5],[334.8,188.4],[338.4,190.6],[342.0,192.7],[345.6,195.1],[349.2,197.8],
  [352.8,200.6],[356.4,203.5],[360.0,206.6],[363.6,210.0],[367.2,213.6],[370.8,217.2],
  [374.4,221.0],[378.0,225.1],[381.6,229.2],[385.2,233.3],[388.8,237.4],[392.4,241.7],
  [396.0,246.0],[399.6,250.1],[403.2,254.4],[406.8,258.7],[410.4,263.0],[414.0,267.4],
  [417.6,271.7],[421.2,276.0],[424.8,280.3],[428.4,284.6],[432.0,288.7],[435.6,293.0],
  [439.2,297.1],[442.8,301.2],[446.4,305.0],[450.0,309.1],[453.6,313.0],[457.2,316.6],
  [460.8,320.2],[464.4,323.8],[468.0,327.1],[471.6,330.5],[475.2,333.6],[478.8,336.7],
  [482.4,339.6],[486.0,342.5],[489.6,345.1],[493.2,347.8],[496.8,350.2],[500.4,352.6],
  [504.0,354.7],[507.6,356.9],[511.2,358.8],[514.8,361.0],[518.4,362.9],[522.0,364.6],
  [525.6,366.2],[529.2,367.9],[532.8,369.4],[536.4,370.8],[540.0,372.2],[543.6,373.7],
  [547.2,374.9],[550.8,376.1],[554.4,377.0],[558.0,378.0],[561.6,379.0],[565.2,379.9],
  [568.8,380.6],[572.4,381.4],[576.0,382.1],[579.6,382.6],[583.2,383.0],[586.8,383.5],
  [590.4,384.0],[594.0,384.2],[597.6,384.5],[601.2,384.5],[604.8,384.7],[608.4,384.7],
  [612.0,384.7],[615.6,384.5],[619.2,384.2],[622.8,384.0],[626.4,383.8],[630.0,383.3],
  [633.6,382.8],[637.2,382.3],[640.8,381.8],[644.4,381.1],[648.0,380.4],[651.6,379.4],
  [655.2,378.7],[658.8,377.8],[662.4,376.6],[666.0,375.6],[669.6,374.4],[673.2,373.0],
  [676.8,371.5],[680.4,370.1],[684.0,368.6],[687.6,367.0],[691.2,365.3],[694.8,363.6],
  [698.4,361.7],[702.0,359.8],[705.6,357.6],[709.2,355.4],[712.8,353.0],[716.4,350.6],
  [720.0,348.2],[723.6,345.6],[727.2,342.7],[730.8,339.8],[734.4,337.0],[738.0,333.6],
  [741.6,330.2],[745.2,326.9],[748.8,323.0],[752.4,319.2],[756.0,315.1],[759.6,310.8],
  [763.2,306.2],[766.8,301.4],[770.4,296.4],[774.0,290.6],[777.6,284.6],[781.2,277.0],
  [784.8,271.9],[788.4,264.2],
];

function edgeXAt(yTop: number): number {
  for (let i = 0; i < COVER_EDGE.length - 1; i++) {
    const [y0, x0] = COVER_EDGE[i];
    const [y1, x1] = COVER_EDGE[i + 1];
    if (yTop >= y0 && yTop <= y1) {
      const t = (yTop - y0) / (y1 - y0);
      return x0 + t * (x1 - x0);
    }
  }
  return yTop < COVER_EDGE[0][0] ? COVER_EDGE[0][1] : COVER_EDGE[COVER_EDGE.length - 1][1];
}

function slopeAt(yTop: number): number {
  const d = 3;
  return (edgeXAt(yTop + d) - edgeXAt(yTop - d)) / (2 * d);
}

@Component({
  selector: 'app-pre-natal',
  templateUrl: 'pre-natal.page.html',
  styleUrls: ['pre-natal.page.scss'],
  standalone: true,
  imports: [FormsModule, IonContent, IonButton, IonSpinner],
})
export class PreNatalPage implements OnInit {
  unlocked = signal(false);
  checking = signal(true); // true enquanto tenta liberar sozinho (token salvo ou retorno do Stripe)
  passwordInput = '';
  passwordError = signal(false);
  passwordChecking = signal(false);

  constructor(private supa: SupabaseService) {}

  async ngOnInit() {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const tokenFromUrl = params.get('token');

    // 1) Já tem token salvo de uma visita anterior?
    const saved = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (saved && await this.supa.verifyPreNatalToken(saved)) {
      this.unlocked.set(true);
      this.checking.set(false);
      return;
    }

    // 2) Voltando do Stripe agora mesmo — o webhook pode levar alguns
    // segundos pra gerar o token, então tenta algumas vezes.
    if (sessionId) {
      for (let tentativa = 0; tentativa < 6; tentativa++) {
        const token = await this.supa.claimPreNatalToken(sessionId);
        if (token) {
          localStorage.setItem(TOKEN_STORAGE_KEY, token);
          window.history.replaceState({}, '', '/pre-natal');
          this.unlocked.set(true);
          this.checking.set(false);
          return;
        }
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    // 3) Link direto /pre-natal?token=XYZ (ex: reenviado por suporte)
    if (tokenFromUrl && await this.supa.verifyPreNatalToken(tokenFromUrl)) {
      localStorage.setItem(TOKEN_STORAGE_KEY, tokenFromUrl);
      window.history.replaceState({}, '', '/pre-natal');
      this.unlocked.set(true);
      this.checking.set(false);
      return;
    }

    // 4) Nada disso — mostra o campo pra digitar o código manualmente.
    this.checking.set(false);
  }

  nome = '';
  dataNascimento = ''; // input type="date" -> aaaa-mm-dd
  cpf = '';
  celular = '';
  emergencia = '';
  sus = '';
  endereco = '';

  generating = signal(false);
  errorMsg = signal('');

  // Métodos comuns (não computed()) — nome/dataNascimento são propriedades
  // simples ligadas por ngModel, não signals, então um computed() não
  // reagiria às mudanças. Chamados diretamente no template, são reavaliados
  // a cada ciclo de change detection.
  idadeCalculada(): number | null {
    if (!this.dataNascimento) return null;
    const nasc = new Date(this.dataNascimento + 'T00:00:00');
    if (isNaN(nasc.getTime())) return null;
    const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const aindaNaoFezAniversario =
      hoje.getMonth() < nasc.getMonth() ||
      (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate());
    if (aindaNaoFezAniversario) idade--;
    return idade >= 0 ? idade : null;
  }

  podeGerar(): boolean {
    return !!this.nome.trim() && !!this.dataNascimento && !this.generating();
  }

  async tentarDesbloquear() {
    const token = this.passwordInput.trim();
    if (!token) return;
    this.passwordChecking.set(true);
    this.passwordError.set(false);

    const valido = await this.supa.verifyPreNatalToken(token);
    if (valido) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      this.unlocked.set(true);
    } else {
      this.passwordError.set(true);
    }
    this.passwordChecking.set(false);
  }

  private formatarNascimento(): string {
    const [ano, mes, dia] = this.dataNascimento.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  async gerarPdf() {
    if (!this.podeGerar()) return;
    this.generating.set(true);
    this.errorMsg.set('');

    try {
      const [templateBytes, coverFontBytes] = await Promise.all([
        fetch(TEMPLATE_URL).then(r => {
          if (!r.ok) throw new Error('Não foi possível carregar o modelo do PDF.');
          return r.arrayBuffer();
        }),
        fetch(COVER_FONT_URL).then(r => {
          if (!r.ok) throw new Error('Não foi possível carregar a fonte da capa.');
          return r.arrayBuffer();
        }),
      ]);

      const pdfDoc = await PDFDocument.load(templateBytes);
      pdfDoc.registerFontkit(fontkit);
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const coverFont = await pdfDoc.embedFont(coverFontBytes); // Libre Baskerville, igual à fonte original da capa
      const color = rgb(BROWN.r, BROWN.g, BROWN.b);
      const pages = pdfDoc.getPages();
      const capa = pages[0];
      const dados = pages[1];
      const pageHeight = dados.getHeight();

      const dadosForm: FormData = {
        nome: this.nome.trim(),
        nascimento: this.formatarNascimento(),
        idade: this.idadeCalculada() != null ? `${this.idadeCalculada()} anos` : '',
        cpf: this.cpf.trim(),
        celular: this.celular.trim(),
        emergencia: this.emergencia.trim(),
        sus: this.sus.trim(),
        endereco: this.endereco.trim(),
      };

      // Capa: nome em curva, letra por letra, do lado de fora da mancha lilás
      // (na área branca), encolhendo a fonte se for muito longo.
      const maxVerticalSpace = 260;
      let coverSize = 34;
      while (coverFont.widthOfTextAtSize(dadosForm.nome, coverSize) > maxVerticalSpace && coverSize > 10) {
        coverSize -= 1;
      }
      const coverPageHeight = capa.getHeight();
      let yTop = 395; // ponto de partida da curva, logo abaixo da citação
      const margin = 16; // distância constante da borda, pro lado de fora (branco)
      for (const ch of dadosForm.nome) {
        const slope = slopeAt(yTop);
        const angleDeg = -90 + (Math.atan(slope) * 160) / Math.PI;
        capa.drawText(ch, {
          x: edgeXAt(yTop) + margin,
          y: coverPageHeight - yTop,
          size: coverSize,
          font: coverFont,
          color,
          rotate: degrees(angleDeg),
        });
        const charWidth = coverFont.widthOfTextAtSize(ch, coverSize);
        yTop += charWidth / Math.sqrt(1 + slope * slope);
      }

      // Dados pessoais: cada valor ao lado do rótulo correspondente
      for (const row of FIELD_ROWS) {
        const value = row.getValue(dadosForm);
        if (!value) continue;
        dados.drawText(value, {
          x: row.labelXMax + 12,
          y: pageHeight - row.labelYMax + 14,
          size: 24,
          font,
          color,
        });
      }

      // Endereço: campo mais largo, quebra em quantas linhas forem necessárias
      // (a 1ª ao lado do rótulo, as seguintes alinhadas à esquerda do rótulo).
      if (dadosForm.endereco) {
        const enderecoSize = 24;
        const rightLimit = 536; // margem direita da página, simétrica à esquerda (59.5pt)
        const lineHeight = 36;
        const firstLineX = ENDERECO_LABEL.xMax + 12;
        const wrapX = ENDERECO_LABEL.xMin;
        const firstLineMaxWidth = rightLimit - firstLineX;
        const wrapMaxWidth = rightLimit - wrapX;

        let words = dadosForm.endereco.split(' ');
        let lineIndex = 0;
        while (words.length) {
          const maxWidth = lineIndex === 0 ? firstLineMaxWidth : wrapMaxWidth;
          const line: string[] = [];
          let i = 0;
          while (i < words.length) {
            const attempt = [...line, words[i]].join(' ');
            if (font.widthOfTextAtSize(attempt, enderecoSize) > maxWidth && line.length) break;
            line.push(words[i]);
            i++;
          }
          dados.drawText(line.join(' '), {
            x: lineIndex === 0 ? firstLineX : wrapX,
            y: pageHeight - ENDERECO_LABEL.yMax + 14 - lineIndex * lineHeight,
            size: enderecoSize,
            font,
            color,
          });
          words = words.slice(i);
          lineIndex++;
        }
      }

      const bytes = await pdfDoc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Pre-Natal - ${dadosForm.nome}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      this.errorMsg.set('Não deu pra gerar o PDF agora. Tenta de novo em alguns segundos.');
    } finally {
      this.generating.set(false);
    }
  }
}

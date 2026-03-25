import { Component, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

export type Categoria = 'todas' | 'gravidez' | 'revelacao' | 'bebe' | 'presentes' | 'economia';
export type Palpite = 'menino' | 'menina' | null;

export interface QuizItem {
  emoji: string;
  titulo: string;
  descricao: string;
  peso: number;      // 1–5 — weight used in final score
  estrelas: string;  // display stars e.g. "★★★★☆"
  fonte: string;     // short accuracy note shown in PDF
}

export interface Dica {
  emoji: string;
  titulo: string;
  resumo: string;
  detalhes: string;
  categoria: Categoria;
  destaque?: boolean;
  cor?: 'pink' | 'blue' | 'gold' | 'brown';
  quiz?: QuizItem[];
}

const DICAS: Dica[] = [
  // ── GRAVIDEZ ──────────────────────────────────────────
  {
    emoji: '🤢',
    titulo: 'Enjoo matinal? Biscoito cream cracker resolve',
    resumo: 'Antes de sair da cama, coma algo leve. O estômago vazio piora os enjoos.',
    detalhes: 'Mantenha biscoito de água ou cream cracker na mesinha de cabeceira. Assim que acordar, ainda deitada, coma 2-3 biscoitos antes de se levantar. Isso estabiliza a glicemia e reduz muito o enjoo. Alimentação fracionada (6x ao dia em porções menores) também ajuda bastante. Gengibre fresco no chá ou bala de gengibre são aliados naturais aprovados por obstetras.',
    categoria: 'gravidez',
    cor: 'pink',
  },
  {
    emoji: '💊',
    titulo: 'Ácido fólico: comece antes de engravidar',
    resumo: 'O ideal é tomar 3 meses antes. Ele protege o bebê contra defeitos do tubo neural.',
    detalhes: 'O ácido fólico é essencial nas primeiras 4 semanas de gestação — muitas vezes antes mesmo de saber que está grávida. A dose padrão é 400 mcg/dia, mas mulheres com histórico de gravidez com defeitos do tubo neural podem precisar de doses maiores (até 4 mg). Alimentos ricos: feijão, lentilha, aspargo, espinafre, laranja. Converse com seu médico sobre suplementação.',
    categoria: 'gravidez',
  },
  {
    emoji: '🩺',
    titulo: 'Consultas de pré-natal: não pule nenhuma',
    resumo: 'O calendário mínimo são 6 consultas. Cada uma tem exames específicos importantes.',
    detalhes: 'O Ministério da Saúde recomenda no mínimo 6 consultas de pré-natal, mas o ideal é mensalmente até 28 semanas, quinzenal até 36, e semanal até o parto. Os exames mudam a cada trimestre: 1º tri — ultrassom morfológico, translucência nucal; 2º tri — glicose, toxoplasmose, ecocardiograma fetal; 3º tri — cardiotocografia, posição do bebê. Registre todas as dúvidas no celular para perguntar na consulta!',
    categoria: 'gravidez',
  },
  {
    emoji: '🛏️',
    titulo: 'Durma de lado esquerdo a partir do 2º trimestre',
    resumo: 'Melhora a circulação para o bebê e reduz o inchaço das pernas.',
    detalhes: 'Deitar de lado esquerdo melhora o retorno venoso, diminui a pressão na veia cava inferior e aumenta o fluxo de sangue para a placenta e o bebê. Use um travesseiro de gestante em formato U ou J para apoiar a barriga e as costas. Se acordar de costas ou lado direito, não se preocupe — retorne suavemente para o esquerdo. O corpo naturalmente muda de posição durante o sono.',
    categoria: 'gravidez',
  },
  {
    emoji: '🏃‍♀️',
    titulo: 'Exercício na gravidez é seguro e recomendado',
    resumo: 'Caminhada, yoga e hidroginástica são excelentes. Evite impacto alto após o 1º tri.',
    detalhes: 'Mulheres sem complicações podem manter 150 min/semana de atividade moderada. A hidroginástica é a queridinha das gestantes: alivia dores, reduz inchaço e melhora o humor. Yoga pré-natal trabalha respiração e postura para o parto. Pilates fortalece o core e o assoalho pélvico. Sempre consulte seu obstetra antes de iniciar qualquer atividade. Atividades a evitar: esportes de contato, mergulho, altitude acima de 2.500 m.',
    categoria: 'gravidez',
  },
  {
    emoji: '🧴',
    titulo: 'Hidrate a barriga desde o 1º trimestre',
    resumo: 'Previne estrias. Comece cedo, antes que a pele comece a esticar.',
    detalhes: 'As estrias surgem quando a pele se estica mais rápido do que consegue se adaptar. Hidratação diária com óleos de amêndoas, rosa mosqueta, vitamina E ou cremes específicos para gestantes ajuda muito. Aplique após o banho com a pele ainda úmida para melhor absorção. Áreas a focar: barriga, seios, quadris e coxas. Beber bastante água também é essencial — a hidratação vem de dentro para fora.',
    categoria: 'gravidez',
  },
  {
    emoji: '🍎',
    titulo: 'Alimentação: o que evitar na gravidez',
    resumo: 'Alguns alimentos oferecem risco real. Saiba quais e por quê.',
    detalhes: 'Evite: peixe cru (sushi/sashimi) — risco de anisakiase e mercúrio; queijos moles não pasteurizados (brie, gorgonzola) — listeria; embutidos crus (salame, presunto cru) — toxoplasmose; ovos crus ou mal cozidos — salmonela; carne mal passada — toxoplasmose. Podem consumir com moderação: cafeína (até 200 mg/dia, equivalente a 1-2 cafés); salmão e atum light cozidos. Sempre lave frutas e verduras com hipoclorito.',
    categoria: 'gravidez',
  },
  {
    emoji: '💆‍♀️',
    titulo: 'Saúde mental na gravidez importa tanto quanto física',
    resumo: 'Ansiedade e depressão gestacional são comuns. Falar ajuda mais do que parece.',
    detalhes: 'Até 20% das gestantes têm sintomas de ansiedade ou depressão. Hormônios, mudanças corporais, medos sobre o parto e a maternidade são causas frequentes. Sinais de alerta: tristeza persistente por mais de 2 semanas, insônia, desinteresse por coisas que antes te davam prazer, pensamentos muito negativos. Procure seu obstetra, psicólogo ou psiquiatra — tratamento na gravidez é seguro e essencial. Grupos de apoio também fazem muita diferença.',
    categoria: 'gravidez',
  },

  // ── REVELAÇÃO ─────────────────────────────────────────
  {
    emoji: '🎀',
    titulo: 'Como fazer um chá revelação inesquecível',
    resumo: 'Planejamento é tudo. Comece pelo momento da revelação e trabalhe de trás pra frente.',
    detalhes: `📋 PREPARATIVOS (comece com 6-8 semanas de antecedência)

Defina primeiro o momento da revelação — ele é o coração do evento. As opções mais amadas: estouro de bexiga com confetes coloridos, canhão de fumaça, bolo com recheio surpresa ou caixinha de balões. Só 1-2 pessoas devem saber o sexo antes do evento para garantir reações genuínas.

Escolha a paleta de cores neutra para a decoração principal (branco, dourado, bege, verde) e deixe os elementos coloridos para o momento da revelação. Reserve local com antecedência, prefira ambientes com boa iluminação natural para as fotos.

🍰 RECEITAS E CARDÁPIO

Mesa de salgados: mini quiche de queijo, coxinha cremosa, empada de frango, folhado de presunto. Mesa de doces: brigadeiro clássico e gourmet, macarons nas cores da revelação, naked cake com recheio colorido, cupcakes decorados. Para beber: limonada com hortelã, água aromatizada com frutas, sucos naturais e chá gelado de hibisco (cor neutra até a revelação!).

Dica de ouro: prepare um bolo falso para o corte (visual lindo para as fotos) e um bolo real com o recheio colorido guardado escondido até o momento certo.

👥 LISTA DE CONVIDADOS — organize antes do evento!

A lista de convidados é onde tudo começa a dar errado quando não há organização. Com um sistema de lista de presentes online, cada convidado:
• Confirma presença direto pelo link
• Escolhe um presente único (sem duplicatas)
• Vê em tempo real o que ainda está disponível

Você acompanha tudo pelo painel: quem confirmou, quem escolheu o quê, quantos itens ainda faltam. Sem planilha, sem mensagem de WhatsApp perdida, sem presente repetido. Crie sua lista antes de enviar os convites — assim o link já vai junto no convite e você começa a organizar desde o início!`,
    categoria: 'revelacao',
    cor: 'gold',
    destaque: true,
  },
  {
    emoji: '🎈',
    titulo: 'Ideias criativas para revelar o sexo',
    resumo: 'Além do bolo e das bexigas, existem formas muito mais impactantes e fotogênicas.',
    detalhes: `Tendências que estão bombando: 1) Caixinha de balões gigante — toda a família abre junto; 2) Fumaça colorida com canhão ou pó (fica lindo em fotos!); 3) Revelação em coração de balões — os pais estouram com espinhos; 4) Pinata com confetes coloridos; 5) Revelação via lista de presentes digital — os convidados veem a cor da lista na hora! 6) Bolo com recheio colorido — o clássico que nunca decepciona; 7) Balão gigante com confetes dentro. Combine com música e um bom fotógrafo!`,
    categoria: 'revelacao',
  },
  {
    emoji: '📋',
    titulo: 'Lista de presentes: organize antes do chá',
    resumo: 'Uma lista organizada evita presentes duplicados e garante que você receba o que realmente precisa.',
    detalhes: 'Com uma lista de presentes online, cada convidado pode escolher um item único — sem duplicatas, sem constrangimento. Inclua fraldas de vários tamanhos (RN, P, M), mimos úteis como body, macacão, babador e naninha. Organize por categoria e quantidade disponível. Os convidados veem em tempo real o que ainda está disponível. Muito mais prático que lista de papel e loja física!',
    categoria: 'revelacao',
    destaque: true,
  },
  {
    emoji: '🥧',
    titulo: 'Receitas econômicas que impressionam no chá',
    resumo: 'Pastelão, empadão e outras receitas caseiras que rendem muito e custam pouco.',
    detalhes: `Não precisa gastar uma fortuna para ter uma mesa incrível. Essas receitas rendem bastante, ficam lindas na apresentação e cabem no orçamento:

🥧 EMPADÃO DE FRANGO
Rende muito, é fácil de fatiar e fica ainda melhor no dia seguinte. Faça uma versão grande (assadeira retangular) ou mini empadões individuais para servir de forma mais elegante. Recheio cremoso de frango com requeijão é a combinação favorita. Pode ser preparado na véspera.

🥟 PASTELÃO ASSADO
Diferente do pastel frito, o pastelão assado é feito em assadeira e cortado em pedaços. Massa caseira de margarina fica crocante e dourada. Recheios populares: frango com catupiry, carne moída, palmito. Rende muito mais que os salgadinhos fritos e fica igual quentinho ou frio.

🍕 ESFIHA DE ASSADEIRA
Uma única receita de esfiha aberta, feita em assadeira grande e cortada em quadradinhos, alimenta muito mais convidados que a versão individual. Recheio de carne temperada com tomate e cebola é o clássico. Pode variar com frango ou queijo.

🧀 TORTA FRIA DE PÃO DE FORMA
Sem forno, sem fogão. Montar na véspera, gelar e servir fatiada. Recheio: atum, frango, presunto e queijo. Cobrir com maionese temperada e decorar com azeitonas. Fica linda e custa muito menos que salgados finos.

🍮 BOLO DE ROLO / ROCAMBOLE RECHEADO
Para a mesa de doces, rocambole com doce de leite ou goiabada custa pouco, rende bastante e faz bonito na mesa quando fatiado em rodinhas. Uma receita única serve 20+ pessoas.

💡 DICA DE OURO: faça tudo na véspera. Comida preparada no dia anterior fica mais saborosa, você não fica estressada no dia do evento, e sobra tempo para se arrumar com calma.`,
    categoria: 'economia',
    cor: 'gold',
  },
  {
    emoji: '🍰',
    titulo: 'Cardápio perfeito para o chá revelação',
    resumo: 'Salgados finos, doces temáticos e uma mesa bem montada fazem toda a diferença.',
    detalhes: 'Aposte em salgados de festa tradicionais (coxinha, empada, mini quiche) mais 2-3 opções especiais. Para a mesa de doces: brigadeiro, beijinho, bem-casado, macarons e cupcakes decorados com o tema. Opções sem glúten e veganas são bem-vindas. Mesa neutra antes da revelação (branco, dourado, bege) e após, adicione balões e elementos na cor do bebê. Hidratação: sucos naturais, limonada e água com frutas.',
    categoria: 'revelacao',
  },
  {
    emoji: '🔮',
    titulo: 'Menino ou menina? Todas as superstições e brincadeiras',
    resumo: 'Tabela chinesa, pêndulo, brincadeira da colher e muito mais. Vale a diversão!',
    detalhes: `Nenhuma dessas previsões é científica — mas são divertidíssimas de fazer no chá! Reúna os convidados e testem juntos 😄

📊 TABELA CHINESA (pode fazer online)
Cruza a idade lunar da mãe na concepção com o mês lunar da concepção. Procure "tabela chinesa de gravidez" no Google e insira suas datas — resultado na hora. Dizem ter 70% de acerto... ou não 😄

💓 BATIMENTO CARDÍACO
Acima de 140 bpm = menina / Abaixo de 140 bpm = menino. Veja no laudo do ultrassom. Estudos mostram que não tem base científica, mas todo mundo adora checar.

🔺 FORMATO DA BARRIGA
Barriga pontuda para frente = menino / Barriga redonda e larga = menina. Faça uma votação ao vivo no chá com os convidados!

🍕 DESEJO NA GRAVIDEZ
Vontade de doce = menina / Vontade de salgado e azedo = menino. Conta o que você mais comeu e veja quem acerta.

🍋 TESTE DO BICARBONATO (sugestão para fazer em casa)
2 colheres de bicarbonato em um copo + um pouco de urina da manhã. Borbulhou muito = menino / Ficou quieto = menina. Divertido e completamente aleatório 😂

💍 PÊNDULO DO ANEL (brincadeira ao vivo no chá)
Passe o anel de casamento em um fio ou cabelo. Segure sobre a barriga. Balança em círculo = menina / De um lado para o outro = menino. Ótima para fazer na frente de todos!

🥄 BRINCADEIRA DA COLHER E DO GARFO
Esconda uma colher embaixo de uma cadeira e um garfo embaixo de outra. Peça para a grávida escolher sem saber o que tem embaixo. Colher = menina / Garfo = menino. Simples, hilária, a reação é a melhor parte.

🔑 BRINCADEIRA DA CHAVE
Coloque uma chave sobre a mesa e peça para a grávida pegá-la naturalmente. Pegou pela parte redonda = menina / Pegou pela ponta longa = menino. Pode variar com tesoura e colher — veja o que ela pega primeiro.

🫀 TEORIA DO CRÂNIO (ultrassom)
Olhe o perfil do bebê no ultrassom. Fronte arredondada e maxilar suave = menina / Testa mais proeminente e queixo quadrado = menino. Vire o ultrassom para os convidados e peça um palpite de cada um!

💡 DICA: MONTE UMA VOTAÇÃO AO VIVO
Crie dois times — Menino vs Menina. A cada brincadeira, quem acertou ganha ponto. Revele o resultado no final com o bolo ou a fumaça. Os convidados ficam engajados o evento inteiro e a revelação fica ainda mais emocionante!`,
    categoria: 'revelacao',
    cor: 'pink',
    quiz: [
      {
        emoji: '🔬',
        titulo: 'Lado do Saco Gestacional',
        descricao: 'Lado direito do utero = menino / Lado esquerdo = menina',
        peso: 5,
        estrelas: '★★★★★',
        fonte: 'Nub Theory — estudos apontam ate 97% de acerto apos 12 semanas quando analisado por especialista',
      },
      {
        emoji: '📊',
        titulo: 'Tabela Chinesa',
        descricao: 'Cruzou idade lunar da mae com mes lunar da concepcao',
        peso: 4,
        estrelas: '★★★★☆',
        fonte: 'A mais famosa do mundo — estudos independentes apontam ~55% de acerto (levemente acima do acaso)',
      },
      {
        emoji: '🫀',
        titulo: 'Teoria do Cranio',
        descricao: 'Fronte arredondada = menina / Testa proeminente = menino',
        peso: 3,
        estrelas: '★★★☆☆',
        fonte: 'Baseada em diferencas anatomicas reais — alguns estudos relatam ~70% de acerto no ultrassom',
      },
      {
        emoji: '💓',
        titulo: 'Batimento Cardiaco',
        descricao: '+140 bpm = menina / -140 bpm = menino',
        peso: 2,
        estrelas: '★★☆☆☆',
        fonte: 'Popular, mas estudos controlados nao encontraram correlacao significativa com o sexo',
      },
      {
        emoji: '🔺',
        titulo: 'Formato da Barriga',
        descricao: 'Pontuda = menino / Redonda e larga = menina',
        peso: 1,
        estrelas: '★☆☆☆☆',
        fonte: 'Sem base cientifica — formato depende da musculatura e posicao do bebe',
      },
      {
        emoji: '🍕',
        titulo: 'Desejo na Gravidez',
        descricao: 'Doce = menina / Salgado e azedo = menino',
        peso: 1,
        estrelas: '★☆☆☆☆',
        fonte: 'Sem evidencias cientificas — desejos variam por carencias nutricionais e habitos',
      },
      {
        emoji: '🍋',
        titulo: 'Teste do Bicarbonato',
        descricao: 'Borbulhou muito = menino / Ficou quieto = menina',
        peso: 1,
        estrelas: '★☆☆☆☆',
        fonte: 'Sem base cientifica — reacao depende do pH urinario, nao do sexo do bebe',
      },
      {
        emoji: '💍',
        titulo: 'Pendulo do Anel',
        descricao: 'Circulo = menina / Vai e vem = menino',
        peso: 1,
        estrelas: '★☆☆☆☆',
        fonte: 'Pura diversao — movimento causado pelo ideomotor (microtremores involuntarios)',
      },
      {
        emoji: '🥄',
        titulo: 'Colher e Garfo',
        descricao: 'Sentou na colher = menina / No garfo = menino',
        peso: 1,
        estrelas: '★☆☆☆☆',
        fonte: 'Brincadeira tradicional sem base cientifica — mas a reacao da gravida e hilaria!',
      },
      {
        emoji: '🔑',
        titulo: 'Brincadeira da Chave',
        descricao: 'Pegou pela parte redonda = menina / Pela ponta = menino',
        peso: 1,
        estrelas: '★☆☆☆☆',
        fonte: 'Tradicao popular sem embasamento — resultado depende do habito de pegar a chave',
      },
    ],
  },
  {
    emoji: '📸',
    titulo: 'Fotos que você vai querer ter para sempre',
    resumo: 'O momento da revelação passa em segundos. Um bom fotógrafo é o melhor investimento.',
    detalhes: 'Orçamente no mínimo 2 fotógrafos: um focado nos pais no momento da revelação e outro capturando as reações dos convidados (são as melhores fotos!). Combine com o fotógrafo a sequência de eventos. Crie uma hashtag exclusiva para os convidados compartilharem. Posicione-se de costas para a luz natural ou em local bem iluminado. Para o vídeo da revelação: faça mais de uma tomada, muda ângulo.',
    categoria: 'revelacao',
  },
  {
    emoji: '💌',
    titulo: 'Convites: digital ou impresso?',
    resumo: 'Convites digitais chegam mais rápido e permitem confirmar presença online.',
    detalhes: 'Convites digitais via WhatsApp têm taxa de leitura altíssima e custo zero. Envie com 3-4 semanas de antecedência, peça confirmação de presença até 1 semana antes. Para registrar as confirmações, use uma lista de presentes digital que permita o convidado confirmar a presença direto pelo link. Convites impressos ficam lindos como lembrança, mas reserve o budget para o que realmente importa: o momento da revelação e a lista de presentes.',
    categoria: 'revelacao',
  },

  // ── BEBÊ ──────────────────────────────────────────────
  {
    emoji: '👶',
    titulo: 'Enxoval do bebê: o que realmente precisa',
    resumo: 'Menos é mais. Bebê cresce rápido — compre pouco de cada tamanho.',
    detalhes: 'Enxoval básico: 7 bodies manga curta, 7 bodies manga longa, 5 macacões, 5 pijamas, 10 babadores, 10 fraldas de boca (panos), 5 toalhas, 3 cobertores de malha, 1 cobertor mais grosso. Fraldas: compre apenas 1-2 pacotes RN (os bebês saem dele rápido), mais pacotes do tamanho P. Para roupas, prefira tamanho 3 meses ou 0-3 meses, nunca "recém-nascido" — muitos bebês nascem grandes e já saem dessa fase.',
    categoria: 'bebe',
    cor: 'blue',
  },
  {
    emoji: '🍼',
    titulo: 'Amamentação: prepare-se antes do nascimento',
    resumo: 'Fazer curso pré-natal de aleitamento aumenta muito a chance de sucesso.',
    detalhes: 'O leite materno é o alimento perfeito para o bebê, mas a amamentação tem uma curva de aprendizado. Durante a gestação: faça um curso de amamentação, conheça uma consultora de aleitamento na sua cidade, não use buchas na mama (remove proteção natural), use hidratante nos mamilos. Após o nascimento: amamente na primeira hora de vida, sob livre demanda — não olhe o relógio nas primeiras semanas. Dor não é normal — procure ajuda!',
    categoria: 'bebe',
  },
  {
    emoji: '💤',
    titulo: 'Sono do bebê: expectativas reais',
    resumo: 'Recém-nascidos dormem 16-18h/dia, mas não em períodos longos. Prepare-se.',
    detalhes: 'Recém-nascidos têm ciclos de sono de 45-50 min e precisam mamar de 2-3h em 2-3h, inclusive à noite. Isso é biologicamente normal — o estômago deles é do tamanho de uma cereja. Não existe "treino de sono" seguro antes de 4-6 meses. O que ajuda: manter ambiente escuro e silencioso à noite, criar rotina consistente (banho, massagem, amamentação), levar o bebê a dormir sonolento mas ainda acordado. Reveze com o parceiro para não exaurir.',
    categoria: 'bebe',
  },
  {
    emoji: '🏥',
    titulo: 'Pediatra: escolha antes do nascimento',
    resumo: 'O bebê precisa de consulta na 1ª semana de vida. Já tenha o médico escolhido.',
    detalhes: 'Procure o pediatra durante o 3º trimestre e marque uma consulta pré-natal. Avalie: localização, atendimento de urgência, filosofia sobre amamentação e sono, disponibilidade por WhatsApp. Perguntas importantes: "Qual sua posição sobre amamentação?", "Como funciona atendimento em emergências?", "Você atende no hospital X onde vou parir?". Primeira consulta: 3-5 dias após alta hospitalar para avaliar icterícia, peso e pega no peito.',
    categoria: 'bebe',
  },
  {
    emoji: '🧠',
    titulo: 'Estimulação do bebê nos primeiros meses',
    resumo: 'O cérebro do bebê absorve mais nos 3 primeiros anos do que em toda a vida.',
    detalhes: 'Estimulação nos primeiros meses: conversa e canto (bebê ama sua voz!), contato pele a pele (método canguru), objetos em preto e branco (visão ainda está se desenvolvendo), móbile pendurado a 25-30 cm de distância, tummy time — barriga para baixo por alguns minutos enquanto acordado e supervisionado (fundamental para pescoço e motricidade). Leitura em voz alta desde os primeiros dias acelera o desenvolvimento da linguagem. Telas: zero até 2 anos.',
    categoria: 'bebe',
  },
  {
    emoji: '🛁',
    titulo: 'Primeiro banho em casa: sem medo!',
    resumo: 'Água morna, ambiente quente e movimentos calmos. O bebê sente sua segurança.',
    detalhes: 'Temperatura da água: 36-37°C (cotovelo dentro — deve parecer neutro). Temperatura do ambiente: 24-26°C, sem corrente de ar. Materiais prontos antes: toalha, fralda, body, sabonete infantil neutro. Técnica: segure a cabeça com a mão não dominante, use a outra para lavar suavemente. Comece pelo rosto sem sabão, depois couro cabeludo, tronco, membros, partes íntimas. O banho pode durar 3-5 min — é suficiente. Coto umbilical: álcool 70% após cada banho.',
    categoria: 'bebe',
  },
  {
    emoji: '✈️',
    titulo: 'Viagem com bebê: dicas para o 1º passeio',
    resumo: 'Com organização, viajar com bebê é possível e maravilhoso desde cedo.',
    detalhes: 'Antes de 3 meses: evite ambientes fechados com muitas pessoas (shoppings, aviões) — imunidade ainda baixa. Após isso, aviões são seguros — as cabines são pressurizadas e o ar é filtrado. Checklist de viagem: fraldas dobradas (1 por hora de viagem + extra), trocador portátil, saco plástico para fraldas usadas, chupeta extra, body sobressalente, cobertor leve, documentos (certidão de nascimento para bebês de colo). Nos aviões: amamente na decolagem e aterrissagem para equalizar a pressão das orelhinhas.',
    categoria: 'bebe',
  },

  // ── PRESENTES ─────────────────────────────────────────
  {
    emoji: '🎁',
    titulo: 'Lista de presentes digital: por que usar?',
    resumo: 'Sem duplicatas, sem presentes inúteis. Os convidados escolhem o que mais precisam.',
    detalhes: 'Uma lista de presentes digital resolve os maiores problemas do chá de bebê tradicional: convidados que compram o mesmo item, presentes que o bebê nunca vai usar, constrangimento de pedir o que realmente precisa. Com uma lista online, cada item tem quantidade disponível — quando alguém reserva, some da lista. Você monitora em tempo real quem escolheu o quê. Os convidados adoram porque é fácil e rápido. Crie sua lista em minutos!',
    categoria: 'presentes',
    destaque: true,
  },
  {
    emoji: '🧷',
    titulo: 'Fraldas: o presente mais útil de todos',
    resumo: 'Um bebê usa até 10 fraldas por dia no início. Nunca sobra fralda.',
    detalhes: 'Cálculo rápido: recém-nascido usa 8-10 fraldas/dia. No 1º mês: ~300 fraldas. Nos 3 primeiros meses: ~700-900 fraldas. Distribuição ideal na lista: 30% RN (tamanho 1), 50% tamanho P (2), 20% tamanho M (3). Marcas mais amadas pelas mamães brasileiras: Pampers Premium Care (pele sensível), Huggies Supreme Care, Turma da Mônica Premium. Dica: peça também lenços umedecidos — usa muito mais do que imagina!',
    categoria: 'presentes',
    cor: 'gold',
  },
  {
    emoji: '👕',
    titulo: 'Roupas: o que é realmente útil',
    resumo: 'Priorize bodies, macacões e pijamas. Evite roupas bonitas mas pouco práticas.',
    detalhes: 'O que realmente usa: bodies com abertura no ombro (facilitam a troca sem passar pela cabeça quando tem cocô), macacões com zíper de baixo para cima (facilita troca noturna sem acender luz), pijamas quentinhos (bebê esfria rápido). O que evita: roupas com muitos botões, laços grandes nas costas (ficam deitados!), toucas e luvinhas (médicos não recomendam — bebê precisa sentir). Tecido: preferir algodão 100%, malha ou moletinho.',
    categoria: 'presentes',
  },
  {
    emoji: '🐘',
    titulo: 'Presentes que duram mais: invista no crescimento',
    resumo: 'Brinquedos de estimulação, livros e itens de tamanho maior têm vida útil maior.',
    detalhes: 'Presentes com mais custo-benefício: livros de tecido e banho (do nascimento até 2 anos), brinquedos de causa e efeito como chocalho e móbile (0-6 meses), tapete de atividades (0-12 meses), cadeirinha de descanso com vibração (0-6 meses), andador de empurrar (10-24 meses), kit de pintura e massa de modelar (2+ anos). Evite presentes por faixa etária estreita — crescem rápido! Livros são sempre um acerto: nunca ficam velhos.',
    categoria: 'presentes',
  },
  {
    emoji: '💝',
    titulo: 'Como organizar sua lista para o chá',
    resumo: 'Divida por categoria, coloque quantidade real e inclua diferentes faixas de preço.',
    detalhes: 'Lista ideal para o chá: 40% fraldas e lenços (variedade de tamanhos), 30% roupas e acessórios, 20% mimos e brinquedos, 10% itens especiais. Faixas de preço: inclua itens de R$20 a R$200+ para todos os bolsos. Quantidade: coloque o total que realmente precisa — não subestime. Descrição: seja específica (marca, tamanho, cor) para facilitar a compra. Com uma lista digital, o convidado vê tudo isso em segundos e escolhe online!',
    categoria: 'presentes',
  },

  // ── ECONOMIA ──────────────────────────────────────────
  {
    emoji: '💰',
    titulo: 'Quanto custa um chá revelação? Guia completo de preços',
    resumo: 'Saiba exatamente o que esperar de cada faixa de orçamento para não ter surpresas.',
    detalhes: `Os custos variam muito dependendo do número de convidados e das escolhas. Aqui está um guia realista:

💰 ECONÔMICO — R$ 300 a R$ 700 (até 20 convidados)
Local: casa própria ou de familiar. Comida: receitas caseiras (empadão, pastelão, torta fria). Decoração: balões de ar, tecido TNT colorido, flores artificiais. Bolo: feito em casa ou padaria simples. Fotografia: celular + aplicativo de edição.

💛 INTERMEDIÁRIO — R$ 800 a R$ 1.800 (até 40 convidados)
Local: salão de festas alugado ou espaço ao ar livre. Comida: mix de caseiro + salgados de buffet. Decoração: kit de festa temático + balões de hélio. Bolo: confeitaria local. Fotografia: fotógrafo iniciante ou semiprofissional.

✨ PREMIUM — R$ 2.000 a R$ 5.000+ (50+ convidados)
Local: espaço de eventos decorado. Comida: buffet completo com garçons. Decoração: decorador profissional com arco de balões, flores naturais, mesa farta. Bolo: confeitaria especializada com recheio surpresa elaborado. Fotografia: fotógrafo profissional + filmagem.

💡 ONDE ECONOMIZAR SEM PERDER QUALIDADE:
• Faça as receitas caseiras (empadão, pastelão) — rende mais e fica mais gostoso
• Alugue louças ao invés de comprar descartáveis premium
• DIY na decoração: balões, fitas e cartazes feitos em casa
• Lista de presentes digital — evita presentear o que não precisa e orienta convidados com qualquer orçamento`,
    categoria: 'economia',
    cor: 'gold',
  },
  {
    emoji: '🍬',
    titulo: 'Docinhos caseiros: brigadeiro gourmet e muito mais',
    resumo: 'Receitas fáceis que custam pouco e impressionam qualquer convidado.',
    detalhes: `Fazer os docinhos em casa reduz o custo em até 60% comparado à compra pronta. Aqui estão as receitas favoritas:

🍫 BRIGADEIRO GOURMET
Ingredientes: 1 lata de leite condensado, 2 colheres de manteiga sem sal, 4 colheres de chocolate em pó 50% cacau (ou cacau puro para versão mais sofisticada). Modo: cozinhe em fogo médio mexendo sempre até desgrudar da panela. Esfrie, enrole com as mãos untadas e passe no granulado belga ou chocolate raspado. Rende ~35 unidades.

🥥 BEIJINHO CREMOSO
Mesma base do brigadeiro mas substituindo o chocolate por coco ralado. Finalize com um cravo na ponta. Dica: use coco fresco ralado na hora para sabor mais intenso. Rende ~35 unidades.

🥜 CAJUZINHO
Ingredientes: 1 lata de leite condensado, 2 xícaras de amendoim torrado e triturado, 1 colher de manteiga. Cozinhe igual ao brigadeiro. Modele em formato de caju com um amendoim inteiro na ponta. Passa no açúcar cristal colorido. Rende ~40 unidades.

🌸 DOCINHO DE AMEIXA
Enrole a massa de brigadeiro ao redor de uma ameixa seca e passe em açúcar cristal. Sofisticado, diferente e muito fácil.

💡 DICAS PARA PRODUÇÃO EM ESCALA:
Faça tudo 2 dias antes e guarde em potes herméticos na geladeira. Use luvas descartáveis para enrolar — mais higiênico e rápido. Para 50 convidados: faça 5 receitas de cada tipo. Invista em forminhas de papel dourado — transforma completamente a apresentação.`,
    categoria: 'economia',
    cor: 'pink',
  },
  {
    emoji: '✅',
    titulo: 'Checklist completo: o que não pode faltar no chá',
    resumo: 'Da reserva do local até o dia do evento. Nada vai ficar para trás com esse guia.',
    detalhes: `📅 COM 2 MESES DE ANTECEDÊNCIA
☐ Definir data e horário
☐ Reservar o local
☐ Decidir o tema e paleta de cores
☐ Escolher como será a revelação (bolo, balões, fumaça…)
☐ Criar a lista de presentes online e compartilhar o link no convite
☐ Contratar fotógrafo (os bons lotam rápido!)
☐ Encomendar o bolo

📋 COM 1 MÊS
☐ Enviar convites (digital ou impresso)
☐ Confirmar número de convidados
☐ Fechar cardápio e definir o que será caseiro x contratado
☐ Encomendar decoração ou comprar materiais DIY
☐ Separar músicas para o evento

🛒 COM 1 SEMANA
☐ Comprar ingredientes das receitas caseiras
☐ Confirmar com fotógrafo, confeiteiro e fornecedores
☐ Verificar lista de presentes — quem confirmou, o que ainda falta
☐ Preparar a playlist do evento
☐ Separar roupas (mamãe, papai, irmãos)

🍳 NA VÉSPERA
☐ Preparar toda a comida caseira
☐ Montar a decoração (exceto balões de hélio)
☐ Separar utensílios: pratos, talheres, copos, guardanapos
☐ Carregar câmera/celular

🎀 NO DIA
☐ Inflar balões de hélio (duram ~8h)
☐ Montar a mesa de frios e doces 1h antes
☐ Deixar um responsável pelo segredo da revelação
☐ Aproveitar cada momento — passa muito rápido! 💛`,
    categoria: 'economia',
  },
  {
    emoji: '🎨',
    titulo: 'Decoração DIY: lindo sem gastar muito',
    resumo: 'Com balões, TNT e um pouco de criatividade você decora sozinha por menos de R$100.',
    detalhes: `Decoração profissional pode custar R$500 a R$2.000+. Com essas ideias você faz algo lindo com R$80 a R$150:

🎈 ARCO DE BALÕES SEM SUPORTE
Compre balões nas cores do tema em tamanhos variados (9", 11" e 5"). Encha com ar (sem hélio), prenda dois a dois em pares e entrelace os pares em formato de arco. Fixe com cola quente em papelão ou prenda com fita dupla-face na parede. Resultado visual impressionante por menos de R$40.

🌸 PAINEL DE FLORES DE PAPEL
Flores gigantes feitas de papel crepom ou papel seda ficam lindas como painel de fundo. Tutorial fácil no YouTube. Uma flor de 40 cm custa ~R$3 para fazer. Um painel com 8-10 flores fica pronto em 2 horas.

✨ MESA DOURADA COM O QUE TEM EM CASA
Use um tecido bege ou branco como base. Adicione galhos com folhas verdes (naturais ou artificiais), velas e porta-retratos com ultrassom do bebê. Misture alturas com caixas cobertas de tecido. Fica elegante sem gastar quase nada.

💫 TOTEM DE LETRAS
Recorte as iniciais do nome do bebê em papelão grosso, pinte de dourado com spray ou tinta acrílica. Fica como decoração de mesa de presente ou foto.

📸 BACKDROP PARA FOTOS
Pregue fios de barbante horizontalmente na parede e pendure fotos da gestante, ultrassons e bilhetinhos. Adicione balões nas pontas. Fica lindo nas fotos e custa quase zero.`,
    categoria: 'economia',
    cor: 'blue',
  },
  {
    emoji: '🤍',
    titulo: 'Como pedir presentes sem parecer interesseira',
    resumo: 'Existe um jeito elegante de organizar os presentes que os convidados adoram.',
    detalhes: `Essa é a dúvida de praticamente toda mamãe: como pedir presentes sem parecer grossa ou interesseira? A resposta é mais simples do que parece.

O PROBLEMA DO "PRESENTES À VONTADE"
Quando não há uma lista, os convidados ficam perdidos. Compram o que acham que é útil (que muitas vezes já tem em casa), compram itens repetidos, ou dão dinheiro em envelope sem saber o valor adequado. Resultado: você recebe 4 cueiros iguais e nenhuma fralda tamanho M.

A SOLUÇÃO: LISTA COMO SERVIÇO, NÃO COMO EXIGÊNCIA
Apresente a lista como um recurso para facilitar a vida dos convidados, não como obrigação. A frase certa é: "Para quem quiser presentear, preparei uma listinha para facilitar a escolha 🎀" — e inclui o link.

O QUE COLOCAR NA LISTA
Varie os valores: inclua itens de R$20 (lenços, fraldas P) até R$200+ (carrinho de banho, cadeirinha). Assim cada convidado escolhe dentro do seu orçamento sem constrangimento.

POR QUE LISTA DIGITAL É MELHOR
Com uma lista online cada convidado vê o que ainda está disponível em tempo real. Quem quer presentear acessa pelo celular, escolhe um item, e o presente fica reservado — ninguém compra o mesmo que outra pessoa. Você acompanha tudo pelo painel sem precisar perguntar para ninguém.

A maioria dos convidados PREFERE ter uma lista — remove a pressão de adivinhar o que você precisa e garante que o presente vai ser realmente usado.`,
    categoria: 'presentes',
    destaque: true,
  },
];

@Component({
  selector: 'app-dicas',
  templateUrl: 'dicas.page.html',
  styleUrls: ['dicas.page.scss'],
  standalone: true,
  imports: [IonContent],
})
export class DicasPage {
  private router = inject(Router);

  readonly WA_GROUP_LINK = 'https://chat.whatsapp.com/Jck0GuQi9UD4On5dP1gsLk?mode=gi_t';

  categoriaAtiva = signal<Categoria>('todas');
  expandedId = signal<number | null>(null);
  modalDica = signal<Dica | null>(null);

  categorias: { id: Categoria; label: string; emoji: string }[] = [
    { id: 'todas',     label: 'Todas',        emoji: '✨' },
    { id: 'gravidez',  label: 'Gravidez',     emoji: '🤰' },
    { id: 'revelacao', label: 'Revelação',    emoji: '🎀' },
    { id: 'bebe',      label: 'Bebê',         emoji: '👶' },
    { id: 'presentes', label: 'Presentes',    emoji: '🎁' },
    { id: 'economia',  label: 'Economize',    emoji: '💰' },
  ];

  dicasFiltradas = computed(() => {
    const cat = this.categoriaAtiva();
    return cat === 'todas' ? DICAS : DICAS.filter(d => d.categoria === cat);
  });

  setCategoria(id: Categoria) {
    this.categoriaAtiva.set(id);
    this.expandedId.set(null);
  }

  toggleExpand(index: number) {
    this.expandedId.update(v => v === index ? null : index);
  }

  isExpanded(index: number) {
    return this.expandedId() === index;
  }

  // ── quiz state ─────────────────────────────────────────
  quizRespostas = signal<Record<number, Palpite>>({});

  quizTotal = computed(() => {
    const r = this.quizRespostas();
    const dica = this.modalDica();
    const quiz = dica?.quiz ?? [];
    let pesoMenino = 0, pesoMenina = 0, contMenino = 0, contMenina = 0, total = 0;
    quiz.forEach((item, i) => {
      const resp = r[i];
      if (resp === 'menino') { pesoMenino += item.peso; contMenino++; total++; }
      else if (resp === 'menina') { pesoMenina += item.peso; contMenina++; total++; }
    });
    const pesoTotal = pesoMenino + pesoMenina;
    const pctMenino = pesoTotal ? Math.round((pesoMenino / pesoTotal) * 100) : 0;
    const pctMenina = pesoTotal ? Math.round((pesoMenina / pesoTotal) * 100) : 0;
    return { menino: contMenino, menina: contMenina, pesoMenino, pesoMenina, pctMenino, pctMenina, total };
  });

  quizTemResposta = computed(() => this.quizTotal().total > 0);

  setPalpite(index: number, valor: Palpite) {
    this.quizRespostas.update(r => ({ ...r, [index]: valor }));
  }

  getPalpite(index: number): Palpite {
    return this.quizRespostas()[index] ?? null;
  }

  openModal(dica: Dica, event: Event) {
    event.stopPropagation();
    this.modalDica.set(dica);
    this.quizRespostas.set({});
    document.body.style.overflow = 'hidden';
  }

  openQuizModal() {
    const quizDica = DICAS.find(d => d.quiz && d.quiz.length > 0);
    if (quizDica) {
      this.modalDica.set(quizDica);
      this.quizRespostas.set({});
      document.body.style.overflow = 'hidden';
    }
  }

  closeModal() {
    this.modalDica.set(null);
    this.quizRespostas.set({});
    document.body.style.overflow = '';
  }

  gerarPdf() {
    const dica = this.modalDica();
    if (!dica?.quiz) return;
    const { pctMenino, pctMenina, pesoMenino, pesoMenina, menino, menina, total } = this.quizTotal();
    const vencedor = pesoMenino > pesoMenina ? 'MENINO' : pesoMenina > pesoMenino ? 'MENINA' : 'EMPATE';
    const respondidas = total;
    const totalPerguntas = dica.quiz.length;

    // ── Canvas chart (emoji ok here) ──────────────────────
    const canvas = document.createElement('canvas');
    canvas.width = 500; canvas.height = 220;
    const ctx = canvas.getContext('2d')!;

    // bg
    ctx.fillStyle = '#fff8f0';
    ctx.fillRect(0, 0, 500, 220);

    // title
    ctx.fillStyle = '#3d2314';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('Pontuacao ponderada por confiabilidade', 20, 22);

    const maxW = 360;
    // bar menino
    ctx.fillStyle = '#dbeafe';
    ctx.beginPath(); ctx.roundRect(20, 36, maxW, 68, 8); ctx.fill();
    ctx.fillStyle = '#3a8fd4';
    ctx.beginPath(); ctx.roundRect(20, 36, Math.max((pctMenino / 100) * maxW, 4), 68, 8); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`${pctMenino}%`, 30, 77);
    ctx.font = '13px sans-serif';
    ctx.fillText(`Menino — ${menino} respostas / peso ${pesoMenino}`, 30, 94);

    // bar menina
    ctx.fillStyle = '#fce7f3';
    ctx.beginPath(); ctx.roundRect(20, 118, maxW, 68, 8); ctx.fill();
    ctx.fillStyle = '#e0608a';
    ctx.beginPath(); ctx.roundRect(20, 118, Math.max((pctMenina / 100) * maxW, 4), 68, 8); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`${pctMenina}%`, 30, 159);
    ctx.font = '13px sans-serif';
    ctx.fillText(`Menina — ${menina} respostas / peso ${pesoMenina}`, 30, 176);

    // note
    ctx.fillStyle = '#9a7050';
    ctx.font = '11px sans-serif';
    ctx.fillText(`${respondidas} de ${totalPerguntas} brincadeiras respondidas`, 20, 210);

    const imgData = canvas.toDataURL('image/png');

    // ── jsPDF ─────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210;

    // Header
    doc.setFillColor(61, 35, 20);
    doc.rect(0, 0, W, 52, 'F');
    doc.setTextColor(201, 149, 62);
    doc.setFontSize(24); doc.setFont('helvetica', 'bold');
    doc.text('Menino ou Menina?', W / 2, 22, { align: 'center' });
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11); doc.setFont('helvetica', 'normal');
    doc.text('Resultado das Supersticoes e Brincadeiras com Ponderacao', W / 2, 33, { align: 'center' });
    doc.setFontSize(9);
    doc.text(`${respondidas} de ${totalPerguntas} brincadeiras respondidas`, W / 2, 43, { align: 'center' });

    // Veredicto box
    const isEmpate = pesoMenino === pesoMenina;
    const isMenino = pesoMenino > pesoMenina;
    if (isMenino)       doc.setFillColor(219, 234, 254);
    else if (!isEmpate) doc.setFillColor(252, 231, 243);
    else                doc.setFillColor(247, 243, 236);
    doc.roundedRect(15, 59, W - 30, 26, 7, 7, 'F');

    if (isMenino)       doc.setTextColor(37, 99, 200);
    else if (!isEmpate) doc.setTextColor(190, 24, 93);
    else                doc.setTextColor(100, 80, 50);
    doc.setFontSize(17); doc.setFont('helvetica', 'bold');
    doc.text(`Resultado: ${vencedor}`, W / 2, 75, { align: 'center' });

    // Score summary line
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 80, 50);
    doc.text(`Pontuacao ponderada — Menino: ${pesoMenino} pts (${pctMenino}%)   Menina: ${pesoMenina} pts (${pctMenina}%)`, W / 2, 90, { align: 'center' });

    // Chart
    doc.addImage(imgData, 'PNG', 15, 96, 180, 66);

    // Legend
    doc.setFontSize(8); doc.setTextColor(130, 100, 60);
    doc.text('* Pontuacao ponderada: metodos com maior base cientifica valem mais pontos no calculo final.', 15, 168);

    // Divider
    doc.setDrawColor(201, 149, 62); doc.setLineWidth(0.4);
    doc.line(15, 173, W - 15, 173);

    // Table header
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(61, 35, 20);
    doc.text('Detalhamento por brincadeira', 15, 182);

    // Column headers
    doc.setFontSize(8); doc.setTextColor(120, 90, 50);
    doc.text('Brincadeira', 15, 190);
    doc.text('Confiabilidade', 108, 190, { align: 'center' });
    doc.text('Peso', 148, 190, { align: 'center' });
    doc.text('Resultado', 185, 190, { align: 'right' });
    doc.setDrawColor(220, 200, 170); doc.setLineWidth(0.2);
    doc.line(15, 192, W - 15, 192);

    let y = 200;
    const respostas = this.quizRespostas();

    dica.quiz!.forEach((item, i) => {
      const resp = respostas[i];
      const respLabel = resp === 'menino' ? 'Menino' : resp === 'menina' ? 'Menina' : '—';
      const corResp: [number, number, number] = resp === 'menino' ? [37, 99, 200] : resp === 'menina' ? [190, 24, 93] : [160, 140, 120];

      // Alternating row bg
      if (i % 2 === 0) { doc.setFillColor(252, 248, 242); doc.rect(15, y - 5, W - 30, 12, 'F'); }

      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(61, 35, 20);
      doc.text(item.titulo, 17, y);

      doc.setFont('helvetica', 'normal'); doc.setTextColor(140, 100, 40);
      doc.setFontSize(8);
      doc.text(item.estrelas, 108, y, { align: 'center' });

      doc.setTextColor(100, 80, 50);
      doc.text(`${item.peso} pts`, 148, y, { align: 'center' });

      doc.setFont('helvetica', 'bold'); doc.setTextColor(...corResp);
      doc.text(respLabel, 185, y, { align: 'right' });

      // fonte line
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(150, 125, 95);
      const fonteText = item.fonte.length > 95 ? item.fonte.substring(0, 92) + '...' : item.fonte;
      doc.text(fonteText, 17, y + 4);

      y += 14;
      if (y > 275) { doc.addPage(); y = 20; }
    });

    // Footer
    doc.setFontSize(8); doc.setTextColor(160, 130, 90);
    doc.line(15, 285, W - 15, 285);
    doc.text('Gerado por miminho.com.br', 15, 290);
    doc.text('Lista de presentes online para o cha de bebe', W - 15, 290, { align: 'right' });

    doc.save('menino-ou-menina.pdf');
  }

  openWhatsApp() {
    window.open(this.WA_GROUP_LINK, '_blank');
  }

  openProduto() {
    this.router.navigate(['/']);
  }

  goConvite() {
    this.closeModal();
    this.router.navigate(['/convite']);
  }

  tagClass(cat: Categoria): string {
    return {
      gravidez:  'tag-gravida',
      revelacao: 'tag-revelacao',
      bebe:      'tag-bebe',
      presentes: 'tag-presente',
      economia:  'tag-economia',
      todas:     '',
    }[cat] ?? '';
  }

  tagLabel(cat: Categoria): string {
    return {
      gravidez:  '🤰 Gravidez',
      revelacao: '🎀 Revelação',
      bebe:      '👶 Bebê',
      presentes: '🎁 Presentes',
      economia:  '💰 Economize',
      todas:     '',
    }[cat] ?? '';
  }

  cardClass(dica: Dica): string {
    if (dica.destaque) return 'tip-card destaque';
    if (dica.cor === 'pink')  return 'tip-card pink-card';
    if (dica.cor === 'blue')  return 'tip-card blue-card';
    if (dica.cor === 'gold')  return 'tip-card gold-card';
    return 'tip-card';
  }
}

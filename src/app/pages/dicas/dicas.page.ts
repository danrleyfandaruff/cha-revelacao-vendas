import { Component, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

export type Categoria = 'todas' | 'gravidez' | 'revelacao' | 'bebe' | 'presentes' | 'economia';

export interface Dica {
  emoji: string;
  titulo: string;
  resumo: string;
  detalhes: string;
  categoria: Categoria;
  destaque?: boolean;
  cor?: 'pink' | 'blue' | 'gold' | 'brown';
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

  openModal(dica: Dica, event: Event) {
    event.stopPropagation();
    this.modalDica.set(dica);
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    this.modalDica.set(null);
    document.body.style.overflow = '';
  }

  openWhatsApp() {
    window.open(this.WA_GROUP_LINK, '_blank');
  }

  openProduto() {
    this.router.navigate(['/']);
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

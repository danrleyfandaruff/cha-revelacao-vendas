# Listas para celebrar: vídeo para TikTok

Pesquisa e produção: 19 de setembro de 2026.

## O que foi produzido

- **Versões revisadas, com preço somente no encerramento:** `exports/listas-para-celebrar-passo-a-passo-valor-no-final.mp4` e `exports/listas-para-celebrar-anuncio-curto-valor-no-final.mp4`. O preço aparece apenas na última cena, nos cerca de 9 segundos finais. A narração, as legendas e as telas anteriores não apresentam o valor. Os originais abaixo foram preservados.
- `exports/listas-para-celebrar-passo-a-passo.mp4`: tutorial vertical de aproximadamente 57 segundos, com as seis ocasiões e o fluxo de criação, ativação, compartilhamento e reserva.
- `exports/listas-para-celebrar-anuncio-curto.mp4`: corte de aproximadamente 32 segundos, com problema, ocasiões, painel, oferta e chamada para o site.
- `exports/capa-tiktok.jpg`: capa vertical.
- Os arquivos `.srt` contêm as legendas. Os MP4 já têm legendas incorporadas; não sobreponha outra legenda automática sem revisar o resultado.
- `narration.json`, `storyboard.html`, `capture.mjs` e `render.mjs` preservam o roteiro e a montagem editável.

Formato: 1080 × 1920, 9:16, 30 quadros por segundo, MP4/H.264 com áudio AAC. Narração em português brasileiro. Trilha discreta sintetizada especificamente para a montagem, sem amostras de músicas comerciais.

## Informações verificadas no produto

As seis opções em `src/app/models/event-types.ts` são chá revelação, chá de bebê, casamento, chá de panela, casa nova e aniversário. O vídeo apresenta o fluxo comum; os chás também têm a categoria de fraldas. Não sugere que é necessário repetir o cadastro para cada ocasião.

O fluxo demonstrado é: entrar com Google ou e-mail; selecionar a ocasião; preencher nomes, local e data; ajustar presentes e quantidades; salvar; ativar; compartilhar; receber reservas; acompanhar as respostas.

A oferta usada é a exibida nas páginas locais de landing e pagamento: **R$ 19,90 por evento, pagamento único, sem mensalidade e 60 dias a partir da ativação**. Isso não inclui a compra ou a entrega dos presentes. Não foi feita compra no checkout de produção nem auditoria do valor configurado no Stripe. Confirme a correspondência entre vídeo, site publicado e checkout antes de investir.

Os convidados entram pelo link sem criar conta. O sistema controla reservas e quantidades; a comunicação usa “ajuda a evitar presentes repetidos”, não uma garantia sobre compras feitas fora da lista. Os nomes, eventos e números vistos nas telas são dados fictícios de demonstração, não depoimentos ou métricas de clientes.

Nenhum usuário real foi cadastrado, nenhum evento de produção foi alterado e nenhum pagamento foi realizado. Os endereços locais dos links de demonstração foram desfocados. O domínio público não foi informado, por isso a chamada é “Crie sua lista no site”, sem inventar uma URL ou afirmar que existe link na bio.

## Pesquisa aplicada

**Estrutura criativa.** O TikTok recomenda apresentar a proposta nos primeiros segundos, trabalhar um gancho, explicar os diferenciais e terminar com uma chamada clara. A montagem abre com a dificuldade de organizar presentes por mensagens, mostra o produto e fecha com a oferta. O formato vertical, a narração e os textos curtos seguem as [boas práticas oficiais para anúncios de performance](https://ads.tiktok.com/resources/help/article/creative-best-practices?lang=en). Essas práticas orientam a criação, mas não garantem desempenho.

**Entrega técnica.** O MP4 vertical foi escolhido a partir das [especificações oficiais de anúncios In-Feed](https://ads.tiktok.com/resources/help/article/tiktok-auction-in-feed-ads?lang=en). Textos principais ficam afastados da lateral direita e da parte inferior. A área segura varia conforme legenda, botão e posicionamento: confira a prévia do anúncio com os elementos que você realmente usar.

**Oferta transparente.** Não foram incluídos descontos fictícios, contagem regressiva, depoimentos inventados, promessa de vendas ou “100% gratuito”. Preço, prazo e recursos devem corresponder à página de destino, conforme a [política contra conteúdo enganoso](https://ads.tiktok.com/resources/help/article/tiktok-ads-policy-misleading-and-false-content?lang=en).

**Identificação de publicidade.** Ao postar para promover o próprio negócio, ative a divulgação de conteúdo comercial e selecione a opção correspondente à sua marca. Não selecione parceria paga com terceiros se não houver parceria. Consulte as [orientações oficiais sobre conteúdo comercial](https://ads.us.tiktok.com/resources/help/article/about-the-content-disclosure-setting-for-creators).

**Identificação de IA.** A locução é sintética e não imita uma pessoa específica. Além do aviso no vídeo, ative a identificação de conteúdo gerado por IA na publicação ou no anúncio. O TikTok inclui áudio sintético em seus [requisitos de identificação](https://ads.tiktok.com/resources/help/article/about-ad-disclaimers-in-tiktok-ads-manager?lang=en).

**Áudio.** A documentação do fornecedor da locução permite uso comercial dos conteúdos gerados, sem exigência de crédito, conforme a [orientação oficial do Runway](https://help.runwayml.com/hc/en-us/articles/21668707517587-Can-I-use-the-content-I-made-in-Runway-for-commercial-purposes). Se trocar ou adicionar uma música no TikTok, use uma faixa autorizada para publicidade, verificando território e posicionamento. A [orientação sobre uso comercial de música](https://support.tiktok.com/en/business-and-creator/creator-and-business-accounts/commercial-use-of-music-on-tiktok) diferencia esse uso do consumo pessoal de músicas.

## Legenda sugerida

Uma lista de presentes para cada comemoração. Chá revelação, chá de bebê, casamento, chá de panela, casa nova ou aniversário: personalize os itens, compartilhe o link e acompanhe as reservas. Seus convidados não precisam criar conta. Ativação por R$ 19,90 por evento, sem mensalidade, com 60 dias de acesso após ativar. Conheça Listas para celebrar no site. Demonstração com dados fictícios e narração gerada por IA.

Para anúncio com limite menor de texto: “Organize os presentes da sua comemoração em um link. Conheça Listas para celebrar.” A oferta completa continua no vídeo e deve estar na landing.

## Antes de patrocinar

1. Publique as correções do site e teste Google, cadastro, pagamento e reserva no endereço real. Não anuncie um fluxo que ainda esteja travando na landing.
2. Confira os seis tipos de evento, preço de R$ 19,90 e prazo de 60 dias na versão publicada e no checkout.
3. Configure o endereço real do site como destino. Use uma página que mostre o mesmo produto, oferta e condições do vídeo.
4. Ative as identificações de conteúdo comercial e de IA. O aviso incorporado não substitui uma configuração exigida pelo TikTok.
5. Confira a prévia com o botão e a legenda do anúncio. Verifique se não cobrem preço, prazo ou legendas do vídeo.
6. Assista com som e sem som em um celular antes de publicar. Não use os resultados de demonstração como prova social.
7. Compare o corte curto e o tutorial em um teste controlado. Avalie retenção e cadastros ou ativações reais, não apenas curtidas. Só use otimização para conversão se a mensuração estiver corretamente implementada.

A aprovação depende da análise da plataforma, da conta, do destino e das configurações. Nenhum anúncio foi publicado e nenhum orçamento foi aplicado durante esta produção.

## Reproduzir a montagem

Execute `npm start -- --host 127.0.0.1 --port 4205 --no-open` para disponibilizar o app local. Em outro terminal, rode `node marketing/tiktok/capture.mjs` para capturar telas com dados isolados.

Com FFmpeg instalado, execute `FFMPEG=/caminho/para/ffmpeg node marketing/tiktok/render.mjs`. Acrescente `--short` para o corte curto. A renderização usa o Chrome e as dependências já presentes no projeto. A locução já está preservada em `assets/audio`; não é necessário gerar ou pagar novamente para renderizar.

Acrescente `--price-at-end` para as versões revisadas com oferta somente no encerramento. Combine com `--short` para o anúncio curto.

# Chá Revelação — App Ionic + Angular

SaaS de listas de presentes para chá revelação, construído com Ionic 7 + Angular 17 + Supabase.

## Pré-requisitos

- Node.js 18+
- npm 9+
- Ionic CLI: `npm install -g @ionic/cli`

## Como rodar

```bash
cd ionic-app
npm install
ionic serve
```

O app abre em `http://localhost:8100`.

## Páginas

| Rota | Descrição |
|------|-----------|
| `/` | Landing page |
| `/login` | Login / Cadastro |
| `/configurar` | Dashboard do evento (requer login) |
| `/pagar` | Página de pagamento (requer login) |
| `/resultados` | Painel de resultados (requer login) |
| `/cha?e=SLUG` | Página pública do evento (convidados) |

## Configurações importantes

### Stripe Payment Link
Edite `src/app/pages/pagar/pagar.page.ts` e substitua:
```ts
private STRIPE_LINK = 'https://buy.stripe.com/SEU_LINK_AQUI';
```
pela URL real do seu Stripe Payment Link.

### Supabase
As credenciais já estão configuradas em `src/app/services/supabase.service.ts`.
Para trocar de projeto Supabase, edite as constantes `SUPABASE_URL` e `SUPABASE_ANON_KEY`.

## Build para produção

```bash
ionic build --prod
```

Os arquivos ficam em `www/` — faça upload para Vercel, Netlify ou qualquer CDN.

## Deploy no Vercel

```bash
npm install -g vercel
vercel --prod
```
Configure o diretório de saída como `www` e o comando de build como `ionic build --prod`.

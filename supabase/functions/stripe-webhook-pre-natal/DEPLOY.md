# Deploy do Webhook do Stripe — Pré-Natal

Pré-requisito: já ter rodado o SQL em `supabase/sql/pre_natal_access.sql` no
SQL Editor do Supabase (cria a tabela `pre_natal_access` e as funções
`claim_pre_natal_token` / `verify_pre_natal_token`).

## 1. Criar o produto e o Payment Link no Stripe

1. Dashboard do Stripe → **Product catalog** → criar produto "Pré-Natal" com o preço desejado.
2. Criar um **Payment Link** pra esse produto.
3. Na aba **After payment** do Payment Link, escolha "Redirecionar para seu site" e configure a URL:
   ```
   https://seusite.com/pre-natal?session_id={CHECKOUT_SESSION_ID}
   ```
   (o placeholder `{CHECKOUT_SESSION_ID}` é preenchido pelo próprio Stripe)

## 2. Deploy da função (se ainda não tiver a CLI, veja o passo 1 do DEPLOY.md do `stripe-webhook`)

```bash
supabase link --project-ref mpkrpzzcdqoaolxyrmit
supabase functions deploy stripe-webhook-pre-natal --no-verify-jwt
```

## 3. Registrar o webhook no Stripe

1. https://dashboard.stripe.com/webhooks → **Adicionar endpoint**
2. URL do endpoint:
   ```
   https://mpkrpzzcdqoaolxyrmit.supabase.co/functions/v1/stripe-webhook-pre-natal
   ```
3. Evento: **`checkout.session.completed`**
4. Copie o **Signing secret** (`whsec_...`) desse endpoint (é diferente do webhook do chá revelação!)

## 4. Configurar o secret

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET_PRE_NATAL=whsec_SEU_SECRET_AQUI
```

> Nome diferente (`STRIPE_WEBHOOK_SECRET_PRE_NATAL`) do secret do outro produto
> (`STRIPE_WEBHOOK_SECRET`) — são endpoints/segredos distintos, um por produto.

## 5. Testar

No painel do Stripe → Webhooks → esse endpoint → aba **Testar** → envie um
evento de teste `checkout.session.completed`. Depois:

```bash
supabase functions logs stripe-webhook-pre-natal
```

Deve aparecer "Token de acesso gerado para sessão ...".

## Fluxo completo

```
Cliente paga no Payment Link do Pré-Natal
        ↓
Stripe POST → supabase.co/functions/v1/stripe-webhook-pre-natal
        ↓
Gera uma linha em pre_natal_access (token novo, ligado ao stripe_session_id)
        ↓
Stripe redireciona o cliente → /pre-natal?session_id=cs_xxx
        ↓
A página chama claim_pre_natal_token(session_id) e recebe o token
        ↓
Acesso liberado — o token fica salvo no navegador do cliente pra próximas visitas
```

## Revogar acesso de alguém

No SQL Editor do Supabase:
```sql
update pre_natal_access set active = false where email = 'cliente@email.com';
```

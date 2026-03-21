# Deploy do Webhook do Stripe

## 1. Instalar Supabase CLI

```bash
npm install -g supabase
```

## 2. Fazer login e linkar ao projeto

```bash
supabase login
supabase link --project-ref mpkrpzzcdqoaolxyrmit
```

## 3. Fazer deploy da função

```bash
supabase functions deploy stripe-webhook --no-verify-jwt
```

> `--no-verify-jwt` é necessário porque o Stripe não envia token JWT — ele usa assinatura própria.

## 4. Configurar variáveis de ambiente na Supabase

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXX
```

O `STRIPE_WEBHOOK_SECRET` você pega no próximo passo (Stripe dashboard).

As variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já são injetadas automaticamente pela Supabase.

## 5. Registrar o webhook no Stripe

1. Acesse https://dashboard.stripe.com/webhooks
2. Clique em **"Adicionar endpoint"**
3. URL do endpoint:
   ```
   https://mpkrpzzcdqoaolxyrmit.supabase.co/functions/v1/stripe-webhook
   ```
4. Eventos para escutar: selecione **`checkout.session.completed`**
5. Clique em **Criar endpoint**
6. Copie o **"Signing secret"** (começa com `whsec_`)
7. Cole no comando do passo 4:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_SEU_SECRET_AQUI
   ```

## 6. Testar

No painel do Stripe → Webhooks → seu endpoint → aba **"Testar"**:
- Selecione o evento `checkout.session.completed`
- Clique em **Enviar evento de teste**
- Verifique nos logs da Edge Function:
  ```bash
  supabase functions logs stripe-webhook
  ```

## Fluxo completo após o deploy

```
Cliente paga no Stripe
        ↓
Stripe POST → supabase.co/functions/v1/stripe-webhook
        ↓
Edge Function verifica assinatura HMAC
        ↓
Chama activate_event(user_id) no PostgreSQL
        ↓
events.paid = true, expires_at = hoje + 30 dias ✅
        ↓
(Stripe também redireciona cliente para /pagar?status=success)
```

Com isso o evento é ativado **mesmo se o cliente fechar o browser** após o pagamento.

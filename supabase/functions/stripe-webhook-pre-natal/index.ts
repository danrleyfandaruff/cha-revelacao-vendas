import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Verifica a assinatura do Stripe manualmente usando Web Crypto API (Deno) */
async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string
): Promise<boolean> {
  const parts = sigHeader.split(',');
  const tPart = parts.find((p) => p.startsWith('t='));
  const v1Part = parts.find((p) => p.startsWith('v1='));
  if (!tPart || !v1Part) return false;

  const timestamp = tPart.slice(2);
  const signature = v1Part.slice(3);
  const signedPayload = `${timestamp}.${payload}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
  const computed = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (computed !== signature) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) return false;

  return true;
}

// ── Handler principal ─────────────────────────────────────────────────────────
// Igual ao supabase/functions/stripe-webhook, mas pro produto Pré-Natal:
// em vez de ativar um evento existente, gera um token de acesso novo por compra.

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET_PRE_NATAL');
  const supabaseUrl         = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  if (!stripeWebhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET_PRE_NATAL não configurado');
    return new Response('Webhook secret não configurado', { status: 500 });
  }

  const payload   = await req.text();
  const sigHeader = req.headers.get('stripe-signature') ?? '';

  const isValid = await verifyStripeSignature(payload, sigHeader, stripeWebhookSecret);
  if (!isValid) {
    console.error('Assinatura do Stripe inválida');
    return new Response('Assinatura inválida', { status: 400 });
  }

  const event = JSON.parse(payload);
  console.log(`Evento recebido: ${event.type}`);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const sessionId = session.id as string;
    const email = session.customer_details?.email ?? session.customer_email ?? null;

    if (!sessionId) {
      console.error('session.id ausente');
      return new Response('session_id ausente', { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { error } = await supabase.from('pre_natal_access').insert({
      stripe_session_id: sessionId,
      email,
    });

    if (error) {
      // conflito de stripe_session_id (já processado antes) não é um erro real —
      // o Stripe reenvia o mesmo evento às vezes.
      if (error.code === '23505') {
        console.log(`Sessão ${sessionId} já tinha token gerado, ignorando duplicata.`);
      } else {
        console.error('Erro ao gerar token de acesso:', error.message);
        return new Response(`Erro: ${error.message}`, { status: 500 });
      }
    } else {
      console.log(`Token de acesso gerado para sessão ${sessionId} (${email})`);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

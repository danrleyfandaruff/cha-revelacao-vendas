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

  // Verifica se a assinatura bate
  if (computed !== signature) return false;

  // Verifica se o timestamp não é muito antigo (5 minutos)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) return false;

  return true;
}

// ── Handler principal ─────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Só aceita POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const supabaseUrl         = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  if (!stripeWebhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET não configurado');
    return new Response('Webhook secret não configurado', { status: 500 });
  }

  // Lê o body como texto para verificar a assinatura
  const payload   = await req.text();
  const sigHeader = req.headers.get('stripe-signature') ?? '';

  // Verifica a assinatura do Stripe
  const isValid = await verifyStripeSignature(payload, sigHeader, stripeWebhookSecret);
  if (!isValid) {
    console.error('Assinatura do Stripe inválida');
    return new Response('Assinatura inválida', { status: 400 });
  }

  // Parseia o evento
  const event = JSON.parse(payload);
  console.log(`Evento recebido: ${event.type}`);

  // Só processa pagamentos confirmados
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object;
    if (session.payment_status !== 'paid') {
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    // New links identify the exact event; legacy links still contain the user ID.
    const reference = session.client_reference_id as string;

    if (!reference) {
      console.error('client_reference_id ausente na sessão do Stripe');
      return new Response('user_id ausente', { status: 400 });
    }

    // Ativa o evento no Supabase usando a service role key (bypassa RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = reference.startsWith('event_')
      ? await supabase.rpc('activate_event_by_id', { p_event_id: reference.slice(6) })
      : await supabase.rpc('activate_event', { p_user_id: reference });

    if (error || !data?.success) {
      console.error('Erro ao ativar evento:', error?.message ?? data?.reason);
      return new Response('Erro ao ativar evento', { status: 500 });
    }

    console.log(`Evento ativado para referência ${reference}:`, data);
  }

  // Retorna 200 para o Stripe saber que recebeu
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

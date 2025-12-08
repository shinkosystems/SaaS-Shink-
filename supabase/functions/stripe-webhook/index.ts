

import Stripe from 'https://esm.sh/stripe@14.21.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: any;

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
})

const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET')

Deno.serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature')

  if (!signature || !endpointSecret) {
      return new Response("Missing signature or endpoint secret", { status: 400 })
  }

  let event
  try {
    const body = await req.text() // Raw body needed for signature verification
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
  } catch (err) {
    console.error(`Webhook Signature Error: ${err.message}`)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  // Inicializa Supabase com Service Role (Admin)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Processa o evento
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object
    const { userId, planId, orgId } = paymentIntent.metadata

    if (userId && planId) {
        console.log(`[Webhook] Pagamento confirmado! User: ${userId}, Plano: ${planId}, Org: ${orgId}, Valor: ${paymentIntent.amount}`)

        // Calcula validade (30 dias)
        const startDate = new Date()
        const endDate = new Date()
        endDate.setDate(endDate.getDate() + 30)

        // 1. Registrar no Histórico (cliente_plano)
        const { error: subError } = await supabase.from('cliente_plano').insert({
            dono: userId,
            plano: parseInt(planId),
            datainicio: startDate.toISOString(),
            datafim: endDate.toISOString(),
            valor: paymentIntent.amount / 100 // Convert cents back to currency
        })

        if (subError) {
            console.error('[Webhook] Erro ao salvar histórico:', subError)
        }

        // 2. Atualizar Plano E LIMITE da Organização (Fonte da Verdade para Acesso)
        if (orgId) {
            // Fetch plan details to get colabtotal limit
            const { data: planData } = await supabase.from('planos').select('colabtotal').eq('id', parseInt(planId)).single();
            
            const updatePayload: any = { plano: parseInt(planId) };
            if (planData && planData.colabtotal) {
                updatePayload.colaboradores = planData.colabtotal;
            }

            const { error: orgError } = await supabase
                .from('organizacoes')
                .update(updatePayload)
                .eq('id', parseInt(orgId))

            if (orgError) {
                console.error('[Webhook] Erro ao atualizar organização:', orgError)
                return new Response('Database Error (Org Update)', { status: 500 })
            }
            console.log(`[Webhook] Organização ${orgId} atualizada com plano ${planId} e limite ${updatePayload.colaboradores}.`)
        } else {
            console.warn('[Webhook] OrgID não encontrado nos metadados. Apenas histórico foi salvo.')
        }
        
    } else {
        console.warn('[Webhook] Metadata incompleto no pagamento:', paymentIntent.metadata)
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  })
})
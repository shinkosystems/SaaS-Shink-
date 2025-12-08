import Stripe from 'https://esm.sh/stripe@14.21.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: any;

// Configuração do Stripe
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // 1. Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Lê o corpo da requisição
    const { planId, userId, email, planName } = await req.json()

    // Validação básica
    if (!planId || !userId || !email) {
        throw new Error("Dados incompletos: planId, userId e email são obrigatórios.");
    }

    // 2. Inicializar Supabase Admin (para buscar preço seguro e dados do user)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. Buscar o valor real do plano no banco de dados (Segurança: Não confiar no front)
    const { data: planData, error: planError } = await supabaseAdmin
      .from('planos')
      .select('valor, nome')
      .eq('id', planId)
      .single()

    if (planError || !planData) {
      throw new Error('Plano não encontrado ou inválido no banco de dados.')
    }

    const realAmount = planData.valor; // Valor em Reais (ex: 349.00)

    // 4. Buscar Organização do Usuário para vincular o plano à empresa
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('organizacao')
      .eq('id', userId)
      .single();
    
    const orgId = userData?.organizacao;

    console.log(`Iniciando checkout: ${planData.nome} - R$ ${realAmount} para ${email} (Org: ${orgId})`);

    // 5. Create or Retrieve Stripe Customer
    const customers = await stripe.customers.list({ email: email, limit: 1 });
    let customer = customers.data[0];

    if (!customer) {
      customer = await stripe.customers.create({ 
          email: email, 
          name: userId,
          metadata: { supabase_uid: userId, orgId: orgId ? String(orgId) : '' }
      });
    }

    // 6. Create PaymentIntent
    // O Stripe espera centavos (int), então multiplicamos por 100 e arredondamos
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(realAmount * 100), 
      currency: 'brl',
      customer: customer.id,
      automatic_payment_methods: { enabled: true },
      description: `Assinatura Shinkō OS: ${planData.nome}`,
      metadata: {
        userId: userId,
        planId: planId,
        planName: planData.nome,
        orgId: orgId ? String(orgId) : '', // CRÍTICO: Passar OrgID para o Webhook atualizar a tabela correta
        environment: 'production'
      },
    })

    // 7. Retorna o Client Secret para o Frontend
    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        customerId: customer.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error("Erro no Payment Sheet:", error.message);
    return new Response(
        JSON.stringify({ error: error.message }), 
        {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        }
    )
  }
})
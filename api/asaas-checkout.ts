
import { createClient } from '@supabase/supabase-js';

// Configurações de ambiente (Vercel Environment Variables)
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
const ASAAS_URL = 'https://sandbox.asaas.com/api/v3';

// Cliente Supabase com Service Role para poder atualizar tabelas protegidas
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: any, res: any) {
  // Garantir que apenas requisições POST sejam aceitas
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { userId, orgId, planId, value, billingType } = req.body;

  if (!userId || !orgId || !value || !billingType) {
    return res.status(400).json({ error: 'Dados incompletos para o checkout.' });
  }

  try {
    // 1. Buscar dados da Organização e do Usuário no Supabase
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizacoes')
      .select('asaas_customer_id, nome')
      .eq('id', orgId)
      .single();

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('email, nome')
      .eq('id', userId)
      .single();

    if (orgError || userError || !user) {
      throw new Error('Falha ao recuperar dados da conta para o checkout.');
    }

    let asaasCustomerId = org.asaas_customer_id;

    // 2. Se a organização não tem asaas_customer_id, precisamos resolver isso
    if (!asaasCustomerId) {
      // 2.1 Tentar buscar cliente existente no Asaas pelo e-mail
      const searchRes = await fetch(`${ASAAS_URL}/customers?email=${encodeURIComponent(user.email)}`, {
        headers: { 'access_token': ASAAS_API_KEY! }
      });
      const searchData = await searchRes.json();

      if (searchData.data && searchData.data.length > 0) {
        asaasCustomerId = searchData.data[0].id;
      } else {
        // 2.2 Criar novo cliente no Asaas
        const createCustRes = await fetch(`${ASAAS_URL}/customers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'access_token': ASAAS_API_KEY!
          },
          body: JSON.stringify({
            name: org.nome || user.nome,
            email: user.email,
            externalReference: `ORG-${orgId}`
          })
        });
        const newCustData = await createCustRes.json();
        if (newCustData.id) {
          asaasCustomerId = newCustData.id;
        } else {
          throw new Error('Falha ao criar registro de cliente no gateway de pagamento.');
        }
      }

      // 3. Salvar o asaas_customer_id na organização para futuros usos
      await supabaseAdmin
        .from('organizacoes')
        .update({ asaas_customer_id: asaasCustomerId })
        .eq('id', orgId);
    }

    // 4. Criar a cobrança no Asaas
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3); // Vencimento em 3 dias

    const paymentRes = await fetch(`${ASAAS_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY!
      },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: billingType, // PIX, BOLETO ou CREDIT_CARD
        value: value,
        dueDate: dueDate.toISOString().split('T')[0],
        description: `Upgrade Shinkō OS - Plano ID ${planId}`,
        externalReference: `PAY-${Date.now()}-${orgId}`,
        postalService: false
      })
    });

    const paymentData = await paymentRes.json();

    if (paymentData.invoiceUrl) {
      // 5. Retornar a URL da fatura para o front-end fazer o redirect
      return res.status(200).json({ 
        success: true, 
        invoiceUrl: paymentData.invoiceUrl 
      });
    } else {
      console.error('Asaas Error Payload:', paymentData);
      throw new Error(paymentData.errors?.[0]?.description || 'Erro ao gerar fatura no Asaas.');
    }

  } catch (error: any) {
    console.error('Checkout API Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}


import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { name, email, phone, assetName } = await req.json()

    // Initialize Supabase Admin Client (Service Role) to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Hardcoded Organization ID for Shinkō OS Leads
    const ORG_ID = 3;

    // Try to find the default 'dono' of org 3 to assign the lead
    const { data: users } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('organizacao', ORG_ID)
        .eq('perfil', 'dono')
        .limit(1);
    
    const ownerId = users && users.length > 0 ? users[0].id : null;

    // Build Payload matching the provided DB Schema for crm_opportunities
    // Populating both naming conventions found in typical CRM schemas to ensure persistence
    const newLead = {
        organizacao: ORG_ID,
        titulo: `Download: ${assetName}`,
        valor: 0,
        probabilidade: 20,
        estagio: 'qualification',
        data_fechamento_prevista: new Date(new Date().setDate(new Date().getDate() + 15)).toISOString().split('T')[0],
        responsavel: ownerId,
        
        // standard naming
        nome: name,
        email: email,
        whatsapp: phone,

        // contato naming (from crm_opportunities schema provided)
        contato_nome: name,
        contato_email: email,
        contato_telefone: phone,
        contato_cargo: 'Lead Site',
        
        origem: 'Download Material Blog',
        empresa_nome: `${name} (Lead Individual)`,
        
        // Initial activity as JSONB
        atividades: JSON.stringify([{
            id: crypto.randomUUID(),
            type: 'task',
            status: 'pending',
            subject: 'Novo Lead de Material Rico: ' + assetName,
            date: new Date().toISOString().split('T')[0],
            owner: 'Sistema'
        }])
    };

    console.log("Iniciando inserção de lead no CRM...", newLead);

    const { data, error } = await supabaseAdmin
        .from('crm_opportunities')
        .insert(newLead)
        .select()
        .single();

    if (error) {
        console.error("Erro Crítico na Inserção DB:", error);
        throw new Error(`Falha ao salvar no CRM: ${error.message}`);
    }

    console.log("Lead registrado com sucesso ID:", data.id);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("Lead Function Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

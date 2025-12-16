
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

    // Hardcoded Organization ID for Leads (as per requirement)
    const ORG_ID = 3;

    // Optional: Try to find a default owner in this organization to assign the lead to
    // If not found, we might need to leave it null or assign to a system user if known.
    // For now, we try to find the first 'dono' or 'admin' of org 3.
    const { data: users } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('organizacao', ORG_ID)
        .eq('perfil', 'dono')
        .limit(1);
    
    const ownerId = users && users.length > 0 ? users[0].id : null;

    const newLead = {
        organizacao: ORG_ID,
        titulo: `Download: ${assetName}`,
        valor: 0,
        probabilidade: 20,
        estagio: 'qualification',
        data_fechamento_prevista: new Date().toISOString(),
        responsavel: ownerId, // Can be null if DB allows, otherwise might fail if constraint exists
        
        // Contact Info
        contato_nome: name,
        contato_email: email,
        contato_telefone: phone,
        contato_cargo: 'Lead Site',
        origem: 'Blog Download',
        
        empresa_nome: name + ' (Pessoa)',
        
        atividades: [{
            id: crypto.randomUUID(),
            type: 'task',
            status: 'pending',
            subject: 'Novo Lead de Material Rico',
            date: new Date().toISOString().split('T')[0],
            owner: 'Sistema'
        }]
    };

    const { data, error } = await supabaseAdmin
        .from('crm_opportunities')
        .insert(newLead)
        .select()
        .single();

    if (error) {
        console.error("Db Insert Error:", error);
        throw new Error(error.message);
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

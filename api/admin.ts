
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, payload } = req.body;

  // Credenciais administrativas protegidas no servidor
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL || 'https://zjssfnbcboibqeoubeou.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  try {
    if (action === 'create_partner') {
      const { email, password, nome, organizacao, telefone, cnpj, status } = payload;

      if (!email || !password || !organizacao) {
        return res.status(400).json({ error: "Dados insuficientes para criação de parceiro." });
      }

      // 1. Criar Usuário no Supabase Auth (Admin mode - não desloga ninguém)
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: nome, perfil: 'cliente', organizacao }
      });

      if (authError) throw authError;

      const userId = authUser.user.id;

      // 2. Sincronizar na tabela 'users'
      const { error: userTableError } = await supabaseAdmin
        .from('users')
        .insert({
          id: userId,
          nome,
          email,
          organizacao,
          perfil: 'cliente',
          status: 'Ativo',
          ativo: true
        });

      if (userTableError) throw userTableError;

      // 3. Criar registro na tabela 'clientes'
      const { data: clientRecord, error: clientError } = await supabaseAdmin
        .from('clientes')
        .insert({
          id: userId,
          nome,
          email,
          telefone,
          cnpj,
          status,
          organizacao,
          contrato: 'Draft',
          valormensal: 0,
          meses: 12,
          data_inicio: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (clientError) throw clientError;

      return res.status(200).json({ success: true, data: clientRecord });
    }

    return res.status(400).json({ error: "Ação inválida" });

  } catch (error: any) {
    console.error("Admin API Error:", error);
    return res.status(500).json({ error: error.message || "Erro interno no servidor administrativo." });
  }
}

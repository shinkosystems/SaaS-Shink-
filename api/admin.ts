
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  // Garantir que a resposta inicial seja JSON
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const { action, payload } = req.body;

  // Validação de Variáveis de Ambiente
  const supabaseUrl = process.env.SUPABASE_URL || 'https://zjssfnbcboibqeoubeou.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    console.error("ERRO CRÍTICO: SUPABASE_SERVICE_ROLE_KEY não configurada.");
    return res.status(500).json({ error: "Configuração do servidor incompleta (Service Role Key ausente)." });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    if (action === 'create_partner') {
      const { email, password, nome, organizacao, telefone, cnpj, status } = payload;

      if (!email || !password || !organizacao) {
        return res.status(400).json({ error: "E-mail, senha e organização são obrigatórios." });
      }

      console.log(`[AdminAPI] Tentando criar acesso para: ${email}`);

      // 1. Criar Usuário no Supabase Auth
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: nome, perfil: 'cliente', organizacao }
      });

      if (authError) {
        console.error("[AdminAPI] Erro Auth:", authError.message);
        return res.status(400).json({ error: `Erro de Autenticação: ${authError.message}` });
      }

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

      if (userTableError) {
        console.error("[AdminAPI] Erro Tabela Users:", userTableError.message);
        // Não interrompemos aqui para tentar criar o registro de cliente se o user já existir
      }

      // 3. Criar registro na tabela 'clientes'
      const { data: clientRecord, error: clientError } = await supabaseAdmin
        .from('clientes')
        .insert({
          id: userId,
          nome,
          email,
          telefone,
          cnpj,
          status: status || 'Ativo',
          organizacao: Number(organizacao),
          contrato: 'Draft',
          valormensal: 0,
          meses: 12,
          data_inicio: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (clientError) {
        console.error("[AdminAPI] Erro Tabela Clientes:", clientError.message);
        return res.status(400).json({ error: `Erro no Banco de Dados: ${clientError.message}` });
      }

      console.log(`[AdminAPI] Sucesso: Parceiro ${nome} criado.`);
      return res.status(200).json({ success: true, data: clientRecord });
    }

    return res.status(400).json({ error: "Ação administrativa não reconhecida." });

  } catch (error: any) {
    console.error("[AdminAPI] Erro Inesperado:", error);
    return res.status(500).json({ error: error.message || "Erro interno catastrófico no servidor." });
  }
}

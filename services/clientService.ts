
import { supabase } from './supabaseClient';
import { DbClient } from '../types';

export const fetchClients = async (organizationId: number): Promise<DbClient[]> => {
    if (!organizationId) return [];

    const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('organizacao', organizationId)
        .order('nome');
    
    if (error) {
        console.error('Erro ao buscar clientes:', error);
        return [];
    }
    return data as DbClient[];
};

/**
 * Cria um cliente/stakeholder e gera suas credenciais de acesso no Auth.
 */
export const createClient = async (client: Partial<DbClient>, password?: string): Promise<DbClient | null> => {
    // 1. Validação de Organização
    let orgId = client.organizacao;
    if (!orgId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: userData } = await supabase.from('users').select('organizacao').eq('id', user.id).single();
            orgId = userData?.organizacao;
        }
    }

    if (!orgId) {
        throw new Error("Organização não identificada.");
    }

    if (!client.email || !password) {
        throw new Error("E-mail e Senha são obrigatórios para criar acesso.");
    }

    // 2. Criar Usuário no Auth do Supabase
    // Nota: Em ambientes de produção com RLS estrito, isso pode exigir uma Edge Function se o admin não puder criar outros usuários.
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: client.email,
        password: password,
        options: {
            data: {
                full_name: client.nome,
                perfil: 'cliente'
            }
        }
    });

    if (authError) {
        throw new Error(`Erro ao criar acesso: ${authError.message}`);
    }

    const authUserId = authData.user?.id;
    if (!authUserId) throw new Error("Falha ao gerar ID de acesso.");

    // 3. Criar Perfil na tabela 'users' (necessário para o sistema reconhecer o login)
    await supabase.from('users').upsert({
        id: authUserId,
        nome: client.nome,
        email: client.email,
        organizacao: orgId,
        perfil: 'cliente',
        ativo: true
    });

    // 4. Persistência na Tabela Clientes
    const payload: any = {
        id: authUserId, // O ID do cliente é o mesmo do Auth para facilitar o vínculo
        nome: client.nome || 'Novo Stakeholder',
        email: client.email || '',
        telefone: client.telefone || '',
        cnpj: client.cnpj || '00.000.000/0000-00',
        endereco: client.endereco || '',
        valormensal: 0,
        meses: client.meses || 12,
        data_inicio: client.data_inicio || new Date().toISOString().split('T')[0],
        status: client.status || 'Ativo',
        organizacao: orgId,
        contrato: client.contrato || 'Draft',
        projetos: client.projetos || []
    };

    const { data, error } = await supabase
        .from('clientes')
        .insert(payload)
        .select()
        .single();

    if (error) {
        console.error('Erro na tabela clientes:', error);
        throw new Error(`Falha ao salvar dados do cliente: ${error.message}`);
    }
    
    return data as DbClient;
};

export const linkProjectToClient = async (clientId: string, projectId: number) => {
    try {
        const { data: client, error } = await supabase
            .from('clientes')
            .select('projetos')
            .eq('id', clientId)
            .maybeSingle();
            
        if (error || !client) return;

        const currentProjects = client.projetos || [];
        if (!currentProjects.includes(projectId)) {
            const updated = [...currentProjects, projectId];
            await supabase.from('clientes').update({ projetos: updated }).eq('id', clientId);
        }
    } catch (e) {
        console.warn("Falha ao vincular projeto:", e);
    }
};

export const updateClient = async (id: string, client: Partial<DbClient>): Promise<DbClient | null> => {
    const { data, error } = await supabase
        .from('clientes')
        .update(client)
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data as DbClient;
};

export const deleteClient = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('clientes').delete().eq('id', id);
    return !error;
};

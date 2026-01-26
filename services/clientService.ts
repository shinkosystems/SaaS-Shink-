
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
 * Cria um cliente/stakeholder. 
 * Se uma senha for fornecida, tenta criar o acesso de autenticação.
 */
export const createClient = async (client: Partial<DbClient>, password?: string): Promise<DbClient | null> => {
    // 1. Validação de Organização (Obrigatório para RLS)
    let orgId = client.organizacao;
    if (!orgId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: userData } = await supabase.from('users').select('organizacao').eq('id', user.id).single();
            orgId = userData?.organizacao;
        }
    }

    if (!orgId) {
        throw new Error("Não foi possível identificar sua organização. Tente recarregar o sistema.");
    }

    let authUserId = null;

    // 2. Criação de Acesso no Auth do Supabase
    if (password && client.email) {
        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: client.email,
                password: password,
                options: {
                    data: {
                        full_name: client.nome,
                        perfil: 'cliente',
                        organizacao: orgId
                    }
                }
            });

            if (authError) {
                console.warn("Aviso: O acesso de login não pôde ser criado ou e-mail duplicado.", authError.message);
            } else if (authData.user) {
                authUserId = authData.user.id;
            }
        } catch (e) {
            console.error("Erro na camada de Auth:", e);
        }
    }

    // 3. Persistência na Tabela Clientes
    const payload: any = {
        id: authUserId || crypto.randomUUID(), 
        nome: client.nome || 'Novo Stakeholder',
        email: client.email || '',
        telefone: client.telefone || '',
        cnpj: client.cnpj || '00.000.000/0000-00',
        endereco: client.endereco || '',
        valormensal: client.valormensal || 0,
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
        throw new Error(`Falha ao salvar no banco: ${error.message}`);
    }
    
    if (authUserId) {
        await supabase.from('users').upsert({
            id: authUserId,
            nome: payload.nome,
            email: payload.email,
            organizacao: orgId,
            perfil: 'cliente',
            status: 'Ativo',
            ativo: true
        });
    }
    
    return data as DbClient;
};

/**
 * Adiciona ou remove um projeto da array de projetos do cliente.
 * Uso de maybeSingle para evitar quebras se o cliente for deletado durante a operação.
 */
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
        console.warn("Falha não crítica ao vincular projeto ao cliente:", e);
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


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

    // 2. Criação de Acesso (Opcional, mas desejado)
    if (password && client.email) {
        try {
            // Nota: signUp padrão em SPAs pode tentar trocar a sessão. 
            // Em produção idealmente usa-se uma Edge Function com Admin Auth API.
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
                console.warn("Aviso: O acesso de login não pôde ser criado (o e-mail já pode existir), mas tentaremos salvar os dados do cliente.", authError.message);
            } else if (authData.user) {
                authUserId = authData.user.id;
            }
        } catch (e) {
            console.error("Erro na camada de Auth:", e);
        }
    }

    // 3. Persistência na Tabela Clientes
    const payload: any = {
        nome: client.nome || 'Novo Stakeholder',
        email: client.email || '',
        telefone: client.telefone || '',
        cnpj: client.cnpj || '00.000.000/0000-00',
        endereco: client.endereco || '',
        valormensal: client.valormensal || 0,
        meses: client.meses || 12,
        data_inicio: client.data_inicio || new Date().toISOString().split('T')[0],
        status: client.status || 'Ativo',
        organizacao: orgId
    };

    // Se conseguimos um ID de usuário, vinculamos para que ele possa logar
    if (authUserId) {
        payload.id = authUserId;
    }

    const { data, error } = await supabase
        .from('clientes')
        .insert(payload)
        .select()
        .single();

    if (error) {
        console.error('Erro na tabela clientes:', error);
        throw new Error(`Falha ao salvar no banco: ${error.message}`);
    }
    
    return data as DbClient;
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

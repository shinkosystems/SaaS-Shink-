
import { supabase } from './supabaseClient';
import { DbClient } from '../types';

export const fetchClients = async (organizationId: number): Promise<DbClient[]> => {
    // Security: If no organization ID is provided, do not return any data.
    if (!organizationId) return [];

    const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('organizacao', organizationId) // Strict Organization Filter
        .order('nome');
    
    if (error) {
        console.error('Erro ao buscar clientes:', error);
        return [];
    }
    return data as DbClient[];
};

export const createClient = async (client: Partial<DbClient>, password?: string): Promise<DbClient | null> => {
    const { data: user } = await supabase.auth.getUser();
    
    // Ensure we use the Organization ID passed in the object or fetch from current user if missing
    let orgId = client.organizacao;
    
    if (!orgId && user?.user) {
         const { data: userData } = await supabase.from('users').select('organizacao').eq('id', user.user.id).single();
         orgId = userData?.organizacao;
    }

    if (!orgId) {
        console.error("Erro Crítico: ID da Organização é obrigatório para criar um cliente.");
        throw new Error("Falha de Segurança: Organização não identificada. Ação bloqueada.");
    }

    let newClientId = undefined;

    // 1. If password is provided, create Auth User first
    if (password && client.email) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: client.email,
            password: password,
            options: {
                data: {
                    full_name: client.nome,
                    role: 'cliente',
                    perfil: 'cliente',
                    org_id: orgId
                }
            }
        });

        if (authError) {
            console.error('Erro ao criar usuário de autenticação:', authError);
            throw new Error(`Erro ao criar login: ${authError.message}`);
        }

        if (authData.user) {
            newClientId = authData.user.id;
        }
    }

    // 2. Create the Client record in `clientes` table
    const payload: any = {
        nome: client.nome || '',
        email: client.email || '',
        telefone: client.telefone || '',
        cnpj: client.cnpj || '00.000.000/0000-00',
        endereco: client.endereco || '',
        numcolaboradores: client.numcolaboradores || 1,
        valormensal: client.valormensal || 0,
        meses: client.meses || 12,
        data_inicio: client.data_inicio || new Date().toISOString().split('T')[0],
        contrato: client.contrato || '',
        logo_url: client.logo_url || '',
        status: client.status || 'Ativo',
        organizacao: orgId // Force Organization Link
    };

    if (newClientId) {
        payload.id = newClientId;
    }

    const { data, error } = await supabase
        .from('clientes')
        .insert(payload)
        .select()
        .single();

    if (error) {
        console.error('Erro ao criar cliente na tabela:', error);
        throw new Error(error.message);
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

    if (error) {
        console.error('Erro ao atualizar cliente:', error);
        throw new Error(error.message);
    }
    return data as DbClient;
};

export const deleteClient = async (id: string): Promise<boolean> => {
    const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Erro ao deletar cliente:', error);
        return false;
    }
    return true;
};

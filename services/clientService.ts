
import { supabase } from './supabaseClient';
import { DbClient } from '../types';

export const fetchClients = async (): Promise<DbClient[]> => {
    const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nome');
    
    if (error) {
        console.error('Erro ao buscar clientes:', error);
        return [];
    }
    return data as DbClient[];
};

export const createClient = async (client: Partial<DbClient>, password?: string): Promise<DbClient | null> => {
    const { data: user } = await supabase.auth.getUser();
    // Fallback organization ID if not provided
    const orgId = client.organizacao || 3; 

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
    // We try to use the Auth ID as the Client ID if possible to link them 1:1
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
        organizacao: orgId
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
        // If auth user was created but table insert failed, we have a zombie user. 
        // Ideally we would rollback (delete auth user), but for now just throw.
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

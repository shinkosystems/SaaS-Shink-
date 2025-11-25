
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

export const createClient = async (client: Partial<DbClient>): Promise<DbClient | null> => {
    const { data: user } = await supabase.auth.getUser();
    // Fallback organization ID if not provided
    const orgId = client.organizacao || 3; 

    const { data, error } = await supabase
        .from('clientes')
        .insert({
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
        })
        .select()
        .single();

    if (error) {
        console.error('Erro ao criar cliente:', error);
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

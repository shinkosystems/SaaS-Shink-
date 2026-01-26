
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
 * Cria um parceiro através da API Route segura.
 */
export const createClient = async (client: Partial<DbClient>, password?: string): Promise<DbClient | null> => {
    let orgId = client.organizacao;
    
    if (!orgId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: userData } = await supabase.from('users').select('organizacao').eq('id', user.id).single();
            orgId = userData?.organizacao;
        }
    }

    if (!orgId) throw new Error("Organização ativa não identificada.");

    const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'create_partner',
            payload: {
                ...client,
                password,
                organizacao: orgId
            }
        })
    });

    // Se o servidor retornar algo que não é JSON (ex: erro HTML), capturamos como texto
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Falha na resposta do servidor.");
        }
        return result.data as DbClient;
    } else {
        const errorText = await response.text();
        console.error("Erro Não-JSON do Servidor:", errorText);
        throw new Error(`Erro do Servidor (${response.status}): O endpoint administrativo não retornou um formato válido.`);
    }
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

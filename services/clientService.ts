
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { DbClient } from '../types';

// Credenciais extraídas para o Ghost Client
const supabaseUrl = 'https://zjssfnbcboibqeoubeou.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpqc3NmbmJjYm9pYnFlb3ViZW91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5ODE5NDcsImV4cCI6MjA3NDU1Nzk0N30.hM0WRkgCMsWczSvCoCwVpF7q7TawwKLVAjifKWaTIkU';

/**
 * Ghost Client: Instância isolada para operações de Auth que não devem 
 * interferir na sessão global (persistSession: false).
 */
const ghostSupabase = createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
    }
});

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
 * Cria um parceiro (User + Cliente) usando Ghost Authentication.
 * Evita conflitos de sessão e o erro de Service Role Key.
 */
export const createClient = async (client: Partial<DbClient>, password?: string): Promise<DbClient | null> => {
    const orgId = client.organizacao;
    if (!orgId) throw new Error("Organização ativa não identificada.");
    if (!client.email || !password) throw new Error("E-mail e senha são obrigatórios.");

    try {
        // 1. Criar credencial no Auth via Ghost Client (Não desloga o admin)
        const { data: authData, error: authError } = await ghostSupabase.auth.signUp({
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

        if (authError) throw authError;
        if (!authData.user) throw new Error("Falha ao gerar UID do parceiro.");

        const userId = authData.user.id;

        // 2. Sincronizar na tabela 'users' usando a sessão do Admin atual
        const { error: userTableError } = await supabase
            .from('users')
            .insert({
                id: userId,
                nome: client.nome,
                email: client.email,
                organizacao: orgId,
                perfil: 'cliente',
                status: 'Ativo',
                ativo: true
            });

        if (userTableError) {
            console.warn("Aviso: Falha ao inserir na tabela de usuários (pode já existir):", userTableError.message);
        }

        // 3. Criar registro na tabela 'clientes' usando a sessão do Admin atual
        const { data: clientRecord, error: clientError } = await supabase
            .from('clientes')
            .insert({
                id: userId,
                nome: client.nome,
                email: client.email,
                telefone: client.telefone,
                cnpj: client.cnpj,
                status: client.status || 'Ativo',
                organizacao: orgId,
                contrato: 'Draft',
                valormensal: 0,
                meses: 12,
                data_inicio: new Date().toISOString().split('T')[0]
            })
            .select()
            .single();

        if (clientError) throw clientError;

        return clientRecord as DbClient;

    } catch (error: any) {
        console.error("Erro na criação do Parceiro:", error);
        let msg = error.message;
        if (msg.includes("User already registered")) msg = "Este e-mail já possui um acesso cadastrado.";
        throw new Error(msg);
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

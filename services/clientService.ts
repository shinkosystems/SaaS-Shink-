
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { DbClient } from '../types';

// Credenciais Shinkō para o Ghost Client (Isolamento de sessão)
const supabaseUrl = 'https://zjssfnbcboibqeoubeou.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpqc3NmbmJjYm9pYnFlb3ViZW91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5ODE5NDcsImV4cCI6MjA3NDU1Nzk0N30.hM0WRkgCMsWczSvCoCwVpF7q7TawwKLVAjifKWaTIkU';

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
    
    if (error) return [];
    return data as DbClient[];
};

/**
 * Cria um parceiro sem deslogar o admin.
 * Lógica robusta: Auth -> Wait -> Sync Clientes
 */
export const createClient = async (client: Partial<DbClient>, password?: string): Promise<DbClient | null> => {
    const orgId = client.organizacao;
    if (!orgId) throw new Error("Organização ativa não identificada.");

    try {
        // 1. Criar credencial no Auth via Ghost Client (Garante que o admin permaneça logado)
        const { data: authData, error: authError } = await ghostSupabase.auth.signUp({
            email: client.email!,
            password: password!,
            options: {
                data: {
                    full_name: client.nome,
                    perfil: 'cliente',
                    organizacao: orgId
                }
            }
        });

        if (authError) {
            if (authError.message.includes("already registered")) {
                throw new Error("Este e-mail já possui um acesso cadastrado no sistema.");
            }
            throw authError;
        }
        
        if (!authData.user) throw new Error("O provedor de autenticação não gerou um identificador válido.");

        const userId = authData.user.id;

        // 2. Aguarda propagação do Trigger de Banco de Dados (Fundamental no Supabase)
        // Isso dá tempo para que o gatilho 'on_auth_user_created' crie o registro na tabela users.
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 3. Tenta atualizar dados extras na tabela 'users' (Se falhar por RLS, não trava o fluxo principal)
        try {
            await supabase.from('users').update({
                nome: client.nome,
                organizacao: orgId,
                perfil: 'cliente',
                status: 'Ativo',
                ativo: true
            }).eq('id', userId);
        } catch (uErr) {
            console.warn("Aviso: Falha na atualização manual de 'users', confiando no trigger de banco.");
        }

        // 4. Criar registro na tabela 'clientes' (Dados de Contrato e CRM)
        // O Admin tem permissão total nesta tabela.
        const { data: clientRecord, error: clientError } = await supabase
            .from('clientes')
            .insert({
                id: userId,
                nome: client.nome,
                email: client.email,
                telefone: client.telefone,
                cnpj: client.cnpj,
                status: 'Ativo',
                organizacao: orgId,
                contrato: 'Draft',
                valormensal: client.valormensal || 0,
                meses: client.meses || 12,
                data_inicio: new Date().toISOString().split('T')[0]
            })
            .select()
            .single();

        if (clientError) {
            console.error("Erro crítico na tabela clientes:", clientError);
            throw new Error(`Falha ao registrar dados do parceiro: ${clientError.message}`);
        }

        return clientRecord as DbClient;

    } catch (error: any) {
        console.error("Erro detalhado na criação de Parceiro:", error);
        throw new Error(error.message || "Falha desconhecida na comunicação com o servidor de dados.");
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

export const linkProjectToClient = async (clientId: string, projectId: number): Promise<boolean> => {
    try {
        const { data, error: fetchError } = await supabase.from('clientes').select('projetos').eq('id', clientId).single();
        if (fetchError) throw fetchError;
        const currentProjects = data.projetos || [];
        if (currentProjects.includes(projectId)) return true;
        const { error: updateError } = await supabase.from('clientes').update({ projetos: [...currentProjects, projectId] }).eq('id', clientId);
        return !updateError;
    } catch (err) {
        return false;
    }
};

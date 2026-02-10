
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { DbClient } from '../types';

// Credenciais Shinkō para o Ghost Client (Isolamento de sessão para admin criar usuários)
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

export const fetchClientById = async (id: string): Promise<DbClient | null> => {
    if (!id) return null;
    const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) return null;
    return data as DbClient;
};

/**
 * Cria um cliente/parceiro integrando Auth -> Users -> Clientes.
 * Resolve o erro "Database error saving new user" ao simplificar o processo de Auth.
 */
export const createClient = async (client: Partial<DbClient>, password?: string): Promise<DbClient | null> => {
    const orgId = Number(client.organizacao);
    if (!orgId || isNaN(orgId)) {
        throw new Error("Não foi possível identificar uma organização ativa para este cadastro.");
    }

    try {
        // ETAPA 1: Verificar se o usuário já existe na tabela pública (evita conflitos de trigger)
        const { data: existingUser } = await supabase.from('users').select('id').eq('email', client.email).maybeSingle();
        if (existingUser) {
            throw new Error("Este e-mail já possui um acesso cadastrado no sistema.");
        }

        // ETAPA 2: Criar credencial no Supabase Auth via Ghost Client
        // ENVIAMOS APENAS O FULL_NAME. O erro "Database error..." geralmente ocorre quando 
        // o trigger tenta inserir campos que não existem ou estão com tipo errado no banco.
        const { data: authData, error: authError } = await ghostSupabase.auth.signUp({
            email: client.email!,
            password: password!,
            options: {
                data: {
                    full_name: client.nome // Bare minimum metadata
                }
            }
        });

        if (authError) {
            // Se o erro de banco persistir, o problema está na função do trigger dentro do Postgres.
            // Tentaremos uma mensagem mais explicativa para o usuário.
            if (authError.message.includes("Database error saving new user")) {
                throw new Error("Falha Crítica de Sincronização: O servidor de banco de dados rejeitou a criação automática do perfil. Contate o suporte técnico.");
            }
            throw new Error(`Falha de Autenticação: ${authError.message}`);
        }
        
        if (!authData.user) throw new Error("O provedor de autenticação não retornou um ID de usuário.");

        const userId = authData.user.id;

        // ETAPA 3: Upsert manual na tabela public.users
        // Não confiamos no trigger. Inserimos nós mesmos para garantir.
        const { error: upsertError } = await supabase.from('users').upsert({
            id: userId,
            nome: client.nome,
            email: client.email,
            organizacao: orgId,
            perfil: 'cliente',
            ativo: true,
            status: 'Ativo',
            ultimo_acesso: new Date().toISOString()
        }, { onConflict: 'id' });

        if (upsertError) {
            console.error("Erro no Upsert manual de Users:", upsertError);
            throw new Error(`Erro ao preparar perfil de acesso: ${upsertError.message}`);
        }

        // Aguarda um breve momento para propagação de índices (1.5s)
        await new Promise(r => setTimeout(r, 1500));

        // ETAPA 4: Registro de dados contratuais na tabela 'clientes'
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
                valormensal: Number(client.valormensal) || 0,
                meses: Number(client.meses) || 12,
                data_inicio: new Date().toISOString().split('T')[0]
            })
            .select()
            .single();

        if (clientError) {
            console.error("Erro na tabela de Clientes:", clientError);
            throw new Error(`Erro na base de clientes: ${clientError.message}`);
        }

        return clientRecord as DbClient;

    } catch (error: any) {
        console.error("DEBUG CRITICAL [createClient]:", error);
        throw new Error(error.message || "Falha técnica inesperada ao salvar novo cliente.");
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
    if (error) return false;
    await supabase.from('users').update({ ativo: false, status: 'Inativo' }).eq('id', id);
    return true;
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

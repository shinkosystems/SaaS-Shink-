
import { supabase } from './supabaseClient';
import { Comment } from '../types';

export const fetchComments = async (taskId: number): Promise<Comment[]> => {
    // 1. Tenta buscar com Join (Padrão)
    const { data, error } = await supabase
        .from('comentarios')
        .select(`
            id,
            task,
            usuario,
            mensagem,
            created_at,
            user_data:users(nome, avatar_url)
        `)
        .eq('task', taskId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Erro ao buscar comentários (com Join):', error.message);
        
        // 2. Fallback: Se o Join falhar (erro de relacionamento), busca apenas os dados brutos
        // Isso garante que o usuário veja as mensagens mesmo sem o nome do autor por enquanto
        const { data: fallbackData, error: fallbackError } = await supabase
            .from('comentarios')
            .select('id, task, usuario, mensagem, created_at')
            .eq('task', taskId)
            .order('created_at', { ascending: true });

        if (fallbackError) {
            console.error('Erro crítico no fallback de comentários:', fallbackError.message);
            return [];
        }

        return (fallbackData || []) as Comment[];
    }
    
    return (data || []) as Comment[];
};

export const addComment = async (taskId: number, userId: string, text: string): Promise<Comment | null> => {
    const { data, error } = await supabase
        .from('comentarios')
        .insert({
            task: taskId,
            usuario: userId,
            mensagem: text,
            created_at: new Date().toISOString()
        })
        .select(`
            id,
            task,
            usuario,
            mensagem,
            created_at,
            user_data:users(nome, avatar_url)
        `)
        .single();

    if (error) {
        console.error('Erro detalhado Supabase (inserção comentario):', error.message);
        
        // Fallback de inserção caso o Join no select pós-insert falhe
        const { data: retryData, error: retryError } = await supabase
            .from('comentarios')
            .insert({
                task: taskId,
                usuario: userId,
                mensagem: text,
                created_at: new Date().toISOString()
            })
            .select()
            .single();
            
        if (retryError) return null;
        return retryData as Comment;
    }
    return data as Comment;
};

export const deleteComment = async (commentId: string): Promise<boolean> => {
    const { error } = await supabase
        .from('comentarios')
        .delete()
        .eq('id', commentId);
    return !error;
};

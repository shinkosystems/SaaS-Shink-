
import { supabase } from './supabaseClient';
import { Comment } from '../types';

export const fetchComments = async (taskId: number): Promise<Comment[]> => {
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
        console.error('Erro ao buscar comentários:', error);
        return [];
    }
    return data as Comment[];
};

export const addComment = async (taskId: number, userId: string, text: string): Promise<Comment | null> => {
    // 1. Inserção do comentário
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
        console.error('Erro detalhado Supabase (comentarios):', error.message, error.details, error.hint);
        // Fallback: Tenta inserir sem o select complexo caso o join falhe
        if (error.message.includes('relationship') || error.message.includes('column')) {
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
             
             if (retryError) {
                 console.error('Erro no fallback de inserção:', retryError.message);
                 return null;
             }
             return retryData as Comment;
        }
        return null;
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

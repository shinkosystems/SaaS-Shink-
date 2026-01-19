
import { supabase } from './supabaseClient';
import { Comment } from '../types';

export const fetchComments = async (taskId: number): Promise<Comment[]> => {
    const { data, error } = await supabase
        .from('comentarios')
        .select(`
            *,
            user_data:users!user_id(nome, avatar_url)
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
    const { data, error } = await supabase
        .from('comentarios')
        .insert({
            task: taskId,
            user_id: userId,
            text: text,
            created_at: new Date().toISOString()
        })
        .select(`
            *,
            user_data:users!user_id(nome, avatar_url)
        `)
        .single();

    if (error) {
        console.error('Erro detalhado ao adicionar comentário:', error);
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

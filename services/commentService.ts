
import { supabase } from './supabaseClient';
import { Comment } from '../types';

export const fetchComments = async (taskId: number): Promise<Comment[]> => {
    // 1. Busca os comentários brutos
    const { data: rawComments, error } = await supabase
        .from('comentarios')
        .select('*')
        .eq('task', taskId)
        .order('created_at', { ascending: true });

    if (error || !rawComments) {
        console.error('Erro ao buscar comentários:', error);
        return [];
    }

    // 2. Extrai IDs únicos de usuários para buscar os dados em lote
    const userIds = Array.from(new Set(rawComments.map(c => c.usuario)));
    
    if (userIds.length === 0) return [];

    // 3. Busca os dados dos usuários na tabela 'users'
    const { data: usersData } = await supabase
        .from('users')
        .select('id, nome, avatar_url')
        .in('id', userIds);

    const userMap = new Map(usersData?.map(u => [u.id, u]) || []);

    // 4. Monta o objeto final injetando os dados do usuário
    return rawComments.map(c => ({
        ...c,
        user_data: userMap.get(c.usuario) || { nome: 'Membro do Time', avatar_url: null }
    })) as Comment[];
};

export const addComment = async (taskId: number, userId: string, text: string): Promise<Comment | null> => {
    // 1. Inserção
    const { data: newComment, error } = await supabase
        .from('comentarios')
        .insert({
            task: taskId,
            usuario: userId,
            mensagem: text,
            created_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error || !newComment) {
        console.error('Erro ao inserir comentário:', error.message);
        return null;
    }

    // 2. Busca dados do autor para retornar o objeto completo para a UI
    const { data: userData } = await supabase
        .from('users')
        .select('nome, avatar_url')
        .eq('id', userId)
        .single();

    return {
        ...newComment,
        user_data: userData || { nome: 'Você', avatar_url: null }
    } as Comment;
};

export const deleteComment = async (commentId: string): Promise<boolean> => {
    const { error } = await supabase
        .from('comentarios')
        .delete()
        .eq('id', commentId);
    return !error;
};

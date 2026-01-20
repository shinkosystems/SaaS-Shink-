
import { supabase } from './supabaseClient';
import { Comment } from '../types';

/**
 * Busca comentários de uma tarefa com hidratação manual de usuários.
 * Evita falhas de join do Supabase se o schema não estiver perfeitamente relacionado.
 */
export const fetchComments = async (taskId: number): Promise<Comment[]> => {
    // 1. Busca os comentários crus
    const { data: rawComments, error } = await supabase
        .from('comentarios')
        .select('*')
        .eq('task', taskId)
        .order('created_at', { ascending: true });

    if (error || !rawComments) {
        console.error('Erro ao buscar comentários:', error);
        return [];
    }

    // 2. Extrai IDs únicos de usuários
    const userIds = Array.from(new Set(rawComments.map(c => c.usuario).filter(Boolean)));
    
    if (userIds.length === 0) return rawComments as any[];

    // 3. Busca dados dos usuários na tabela 'users'
    const { data: usersData } = await supabase
        .from('users')
        .select('id, nome, avatar_url')
        .in('id', userIds);

    const userMap = new Map(usersData?.map(u => [u.id, u]) || []);

    // 4. Injeta os dados do usuário em cada comentário
    return rawComments.map(c => ({
        ...c,
        user_data: userMap.get(c.usuario) || { nome: 'Membro do Time', avatar_url: null }
    })) as Comment[];
};

/**
 * Adiciona um comentário e retorna o objeto já hidratado para atualização imediata da UI.
 */
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
        console.error('Erro ao inserir comentário:', error?.message);
        return null;
    }

    // 2. Busca dados do autor para hidratação imediata
    const { data: userData } = await supabase
        .from('users')
        .select('nome, avatar_url')
        .eq('id', userId)
        .maybeSingle();

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

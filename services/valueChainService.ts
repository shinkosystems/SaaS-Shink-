
import { supabase } from './supabaseClient';
import { TaskProcess } from '../types';

export const fetchValueChainTasks = async (orgId: number, projectId?: number): Promise<TaskProcess[]> => {
    let query = supabase
        .from('tasks_process')
        .select('*')
        .eq('organizacao_id', orgId);
    
    if (projectId) {
        query = query.eq('projeto_id', projectId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return [];
    return data as TaskProcess[];
};

export const createValueChainTask = async (task: Partial<TaskProcess>): Promise<TaskProcess | null> => {
    const { data, error } = await supabase
        .from('tasks_process')
        .insert(task)
        .select()
        .single();
    
    if (error) {
        console.error("Erro ao criar processo:", error);
        return null;
    }
    return data as TaskProcess;
};

export const updateProcessStatus = async (id: string, status: string) => {
    const { error } = await supabase
        .from('tasks_process')
        .update({ status })
        .eq('id', id);
    return !error;
};

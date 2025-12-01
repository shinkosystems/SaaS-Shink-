
import { supabase } from './supabaseClient';
import { DbProject, DbTask, AreaAtuacao } from '../types';

const TASKS_TABLE = 'tasks';
const PROJECT_TABLE = 'projetos';

// --- PROJETOS ---

export const fetchProjects = async (organizationId?: number): Promise<DbProject[]> => {
    // Strict Organization Filter
    if (!organizationId) return [];

    let query = supabase
        .from(PROJECT_TABLE)
        .select(`
            *,
            clienteData:clientes(nome, logo_url)
        `)
        .eq('organizacao', organizationId)
        .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
        console.error('Erro ao buscar projetos:', error);
        return [];
    }
    return data as any[];
};

export const createProject = async (nome: string, cliente: string | null, userId: string): Promise<DbProject | null> => {
    const { data: userData } = await supabase.from('users').select('organizacao').eq('id', userId).single();
    const orgId = userData?.organizacao;

    if (!orgId) {
        console.error("Erro Crítico: Tentativa de criar projeto sem organização definida.");
        throw new Error("Erro de Segurança: Organização não identificada.");
    }

    const { data, error } = await supabase
        .from(PROJECT_TABLE)
        .insert({
            nome,
            cliente,
            descricao: '',
            rde: 'Morno',
            velocidade: 1,
            viabilidade: 1,
            receita: 1,
            prioseis: 0,
            arquetipo: 'Interno / Marketing',
            intensidade: 1,
            tadsescalabilidade: false,
            tadsintegracao: false,
            tadsdorreal: false,
            tadsrecorrencia: false,
            tadsvelocidade: false,
            organizacao: orgId,
            projoport: false 
        })
        .select()
        .single();

    if (error) {
        console.error('Erro ao criar projeto:', error);
        return null;
    }
    return data;
};

// --- ÁREAS DE ATUAÇÃO & MEMBROS ---

export const fetchAreasAtuacao = async (): Promise<AreaAtuacao[]> => {
    const { data, error } = await supabase.from('area_atuacao').select('*').order('nome');
    if (error) {
        console.error('Erro ao buscar áreas de atuação:', error);
        return [];
    }
    return data as AreaAtuacao[];
};

export const fetchOrgMembers = async (organizationId: number): Promise<{id: string, nome: string, cargo: number, area?: string}[]> => {
    const { data, error } = await supabase
        .from('users')
        .select(`
            id, 
            nome, 
            cargo,
            areaData:area_atuacao(nome)
        `)
        .eq('organizacao', organizationId);

    if (error) {
        console.error('Erro ao buscar membros:', error);
        return [];
    }
    
    // Flatten result
    return data.map((u: any) => ({
        id: u.id,
        nome: u.nome,
        cargo: u.cargo,
        area: u.areaData?.nome || 'Sem Cargo'
    }));
};

// --- TAREFAS (TASKS) ---

export const fetchAllTasks = async (organizationId?: number): Promise<DbTask[]> => {
    // Strict Organization Filter
    if (!organizationId) return [];

    try {
        let query = supabase
            .from(TASKS_TABLE)
            .select(`
                *,
                projetoData:projetos(nome)
            `)
            .eq('organizacao', organizationId)
            .order('dataproposta', { ascending: true });

        const { data: tasks, error } = await query;

        if (error) throw error;
        if (!tasks || tasks.length === 0) return [];

        const userIds = [...new Set(tasks.map((t: any) => t.responsavel).filter(Boolean))];

        let userMap = new Map<string, any>();
        
        if (userIds.length > 0) {
            const { data: users } = await supabase
                .from('users')
                .select('id, nome, perfil, organizacao, desenvolvedor, avatar_url')
                .in('id', userIds);
            
            if (users) {
                users.forEach(u => userMap.set(u.id, u));
            }
        }

        const hydratedTasks: DbTask[] = tasks.map((t: any) => ({
            ...t,
            responsavelData: userMap.get(t.responsavel) || { nome: 'Desconhecido', desenvolvedor: false, organizacao: 0 }
        }));

        return hydratedTasks;

    } catch (error) {
        console.error('Erro ao buscar tarefas (tasks):', error);
        return [];
    }
};

export const fetchUserTasks = async (userId: string, organizationId?: number): Promise<DbTask[]> => {
    // STRICT SECURITY: Organization ID is mandatory to prevent data leakage
    if (!organizationId) return [];

    try {
        let query = supabase
            .from(TASKS_TABLE)
            .select(`
                *,
                projetoData:projetos(nome)
            `)
            .eq('responsavel', userId)
            .eq('organizacao', organizationId) // Always filter by organization
            .neq('status', 'done')
            .neq('status', 'Archived')
            .order('datafim', { ascending: true });

        const { data: tasks, error } = await query;

        if (error) throw error;
        return tasks as DbTask[];
    } catch (error) {
        console.error('Erro ao buscar tarefas do usuário:', error);
        return [];
    }
};

export const fetchSubtasks = async (parentId: number): Promise<any[]> => {
    try {
        // Busca subtarefas ligadas ao pai
        // REMOVED JOIN responsavelData:users(nome) because foreign key points to auth.users, not public.users
        const { data, error } = await supabase
            .from(TASKS_TABLE)
            .select('*')
            .eq('tarefamae', parentId)
            .order('dataproposta', { ascending: true });

        if (error) throw error;
        if (!data || data.length === 0) return [];

        // Manual Hydration
        const userIds = [...new Set(data.map((t: any) => t.responsavel).filter(Boolean))];
        let userMap = new Map<string, string>();

        if (userIds.length > 0) {
            const { data: users } = await supabase
                .from('users')
                .select('id, nome')
                .in('id', userIds);
            
            users?.forEach(u => userMap.set(u.id, u.nome));
        }

        // Mapeia para o formato BpmnSubTask usado no frontend
        return data.map((t: any) => ({
            id: t.id.toString(),
            text: t.titulo,
            completed: t.status === 'done',
            startDate: t.datainicio,
            dueDate: t.datafim,
            estimatedHours: t.duracaohoras,
            assigneeId: t.responsavel,
            assignee: userMap.get(t.responsavel) || 'Desconhecido'
        }));
    } catch (error: any) {
        console.error('Erro ao buscar subtarefas:', error.message || error);
        return [];
    }
};

export const fetchDevelopers = async (organizationId: number): Promise<{id: string, nome: string}[]> => {
    const { data, error } = await supabase
        .from('users')
        .select('id, nome')
        .eq('organizacao', organizationId)
        .eq('desenvolvedor', true);

    if (error) {
        console.error('Erro ao buscar desenvolvedores:', error);
        return [];
    }
    return data || [];
};

export const createTask = async (task: Partial<DbTask>): Promise<DbTask | null> => {
    try {
        if (!task.responsavel) {
            console.error("CREATE TASK FAILED: Missing responsavel (UUID)");
            throw new Error("Responsável (UUID) é obrigatório para criar tarefa.");
        }

        if (!task.organizacao) {
            console.error("CREATE TASK FAILED: Missing organizacao ID");
            throw new Error("Erro de Segurança: ID da Organização não fornecido.");
        }

        // Remover campos que não devem ir para o banco ou que podem estar undefined
        const { projetoData, responsavelData, createdat, id, ...cleanTask } = task as any;

        const prazo = cleanTask.datafim || new Date().toISOString();

        const payload = {
            projeto: cleanTask.projeto || null,
            titulo: cleanTask.titulo,
            descricao: cleanTask.descricao || 'VAZIO',
            status: cleanTask.status || 'todo',
            responsavel: cleanTask.responsavel,
            gravidade: cleanTask.gravidade || 1,
            urgencia: cleanTask.urgencia || 1,
            tendencia: cleanTask.tendencia || 1,
            dataproposta: prazo,
            deadline: prazo,
            datainicio: cleanTask.datainicio || new Date().toISOString(),
            datafim: prazo,
            duracaohoras: cleanTask.duracaohoras || 2,
            sutarefa: cleanTask.sutarefa || false,
            tarefamae: cleanTask.tarefamae || null,
            organizacao: cleanTask.organizacao
        };

        const { data, error } = await supabase
            .from(TASKS_TABLE)
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error: any) {
        console.error('Erro ao criar tarefa (tasks):', error.message || error);
        throw error;
    }
};

export const updateTask = async (id: number, updates: Partial<DbTask>): Promise<DbTask | null> => {
    // Explicitly clean payload: Remove undefined, null (unless intended), and extra hydration fields
    const payload: any = {};
    
    Object.entries(updates).forEach(([key, value]) => {
        // Exclude internal/hydration keys and undefined values
        if (value !== undefined && key !== 'projetoData' && key !== 'responsavelData' && key !== 'createdat' && key !== 'id') {
            payload[key] = value;
        }
    });

    // Safety: Ensure we don't accidentally set responsavel to NULL if it's not allowed
    if (payload.responsavel === null) {
        delete payload.responsavel;
    }

    const { data, error } = await supabase
        .from(TASKS_TABLE)
        .update(payload)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        // Improve logging to show full error message instead of [object Object]
        const errorMsg = typeof error === 'object' && error !== null && 'message' in error 
            ? (error as any).message 
            : JSON.stringify(error);
        console.error(`Erro ao atualizar tarefa (ID: ${id}):`, errorMsg);
        return null;
    }
    return data;
};

export const deleteTask = async (id: number): Promise<boolean> => {
    // 1. Delete Subtasks first to avoid constraint errors
    const { error: subError } = await supabase.from(TASKS_TABLE).delete().eq('tarefamae', id);
    if (subError) {
        console.error('Erro ao deletar subtarefas:', subError);
    }

    // 2. Delete Main Task
    const { error } = await supabase.from(TASKS_TABLE).delete().eq('id', id);
    if (error) {
        console.error('Erro ao deletar tarefa:', error);
        return false;
    }
    return true;
};

export const syncSubtasks = async (parentTaskId: number, subtasks: { nome: string, status: string, dueDate?: string, startDate?: string, estimatedHours?: number, assigneeId?: string }[]) => {
    const { data: parent } = await supabase.from(TASKS_TABLE).select('projeto, responsavel, organizacao').eq('id', parentTaskId).single();
    if (!parent) return;

    const inserts = subtasks.map(sub => ({
        projeto: parent.projeto,
        titulo: sub.nome,
        status: sub.status,
        responsavel: sub.assigneeId || parent.responsavel, 
        organizacao: parent.organizacao,
        sutarefa: true,
        tarefamae: parentTaskId,
        duracaohoras: sub.estimatedHours || 2,
        gravidade: 1, urgencia: 1, tendencia: 1,
        dataproposta: new Date().toISOString(),
        datainicio: sub.startDate || new Date().toISOString(),
        datafim: sub.dueDate || undefined,
        deadline: sub.dueDate || undefined
    }));

    if (inserts.length > 0) {
        await supabase.from(TASKS_TABLE).insert(inserts);
    }
};

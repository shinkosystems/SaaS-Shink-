
import { supabase } from './supabaseClient';
import { DbProject, DbTask } from '../types';

const TASKS_TABLE = 'tasks';
const PROJECT_TABLE = 'projetos';

// --- PROJETOS ---

export const fetchProjects = async (): Promise<DbProject[]> => {
    const { data, error } = await supabase
        .from(PROJECT_TABLE)
        .select(`
            *,
            clienteData:clientes(nome, logo_url)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erro ao buscar projetos:', error);
        return [];
    }
    return data as any[];
};

export const createProject = async (nome: string, cliente: string | null, userId: string): Promise<DbProject | null> => {
    const { data: userData } = await supabase.from('users').select('organizacao').eq('id', userId).single();
    const orgId = userData?.organizacao || 3;

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

// --- TAREFAS (TASKS) ---

export const fetchAllTasks = async (): Promise<DbTask[]> => {
    try {
        // 1. Fetch Raw Tasks with Project Data
        // Note: We do NOT join with auth.users here because of complexity/restrictions.
        const { data: tasks, error } = await supabase
            .from(TASKS_TABLE)
            .select(`
                *,
                projetoData:projetos(nome)
            `)
            .order('dataproposta', { ascending: true });

        if (error) throw error;
        if (!tasks || tasks.length === 0) return [];

        // 2. Extract unique User UUIDs from tasks (responsavel field)
        const userIds = [...new Set(tasks.map((t: any) => t.responsavel).filter(Boolean))];

        // 3. Fetch User Profiles from public.users manually
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

        // 4. Hydrate tasks with responsavelData
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

export const fetchUserTasks = async (userId: string): Promise<DbTask[]> => {
    try {
        const { data: tasks, error } = await supabase
            .from(TASKS_TABLE)
            .select(`
                *,
                projetoData:projetos(nome)
            `)
            .eq('responsavel', userId)
            .neq('status', 'done')
            .neq('status', 'Archived')
            .order('datafim', { ascending: true }); // Bring nearest deadlines first

        if (error) throw error;
        return tasks as DbTask[];
    } catch (error) {
        console.error('Erro ao buscar tarefas do usuário:', error);
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

        // Mapping based on user request:
        // dataproposta = Prazo (task.datafim or now)
        // deadline = Prazo (task.datafim)
        // datafim = Prazo (task.datafim)
        const prazo = task.datafim || new Date().toISOString();

        const payload = {
            projeto: task.projeto || null, // Allow null for free tasks
            titulo: task.titulo,
            descricao: task.descricao || 'VAZIO',
            status: task.status || 'todo',
            responsavel: task.responsavel, // UUID (Required by Schema)
            gravidade: task.gravidade || 1,
            urgencia: task.urgencia || 1,
            tendencia: task.tendencia || 1,
            dataproposta: prazo, // Mapped to Prazo
            deadline: prazo,     // Mapped to Prazo
            datainicio: task.datainicio || new Date().toISOString(),
            datafim: prazo,      // Mapped to Prazo
            duracaohoras: task.duracaohoras || 2,
            sutarefa: task.sutarefa || false,
            tarefamae: task.tarefamae || null, // Set parent ID if it's a subtask
            organizacao: task.organizacao || 3
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
        throw error; // Re-throw to be caught by UI
    }
};

export const updateTask = async (id: number, updates: Partial<DbTask>): Promise<DbTask | null> => {
    // Remove readonly/joined fields before update
    const { projetoData, responsavelData, createdat, id: _id, ...cleanUpdates } = updates as any;

    const { data, error } = await supabase
        .from(TASKS_TABLE)
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Erro ao atualizar tarefa (tasks):', error);
        return null;
    }
    return data;
};

export const deleteTask = async (id: number): Promise<boolean> => {
    const { error } = await supabase.from(TASKS_TABLE).delete().eq('id', id);
    if (error) {
        console.error('Erro ao deletar tarefa:', error);
        return false;
    }
    return true;
};

export const syncSubtasks = async (parentTaskId: number, subtasks: { nome: string, status: string, dueDate?: string, assigneeId?: string }[]) => {
    // 1. Get parent info
    const { data: parent } = await supabase.from(TASKS_TABLE).select('projeto, responsavel, organizacao').eq('id', parentTaskId).single();
    if (!parent) return;

    // For this feature scope, we assume simple insertion of subtasks linked to the parent.
    // In a real scenario we might want to upsert based on ID if provided.
    
    const inserts = subtasks.map(sub => ({
        projeto: parent.projeto,
        titulo: sub.nome,
        status: sub.status,
        // Use specific subtask assignee OR fallback to parent responsible (often user who created it)
        responsavel: sub.assigneeId || parent.responsavel, 
        organizacao: parent.organizacao,
        sutarefa: true,
        tarefamae: parentTaskId, // Use the tarefamae column as requested
        duracaohoras: 1,
        gravidade: 1, urgencia: 1, tendencia: 1,
        dataproposta: new Date().toISOString(),
        datafim: sub.dueDate || undefined, // Save individual due date
        deadline: sub.dueDate || undefined
    }));

    if (inserts.length > 0) {
        await supabase.from(TASKS_TABLE).insert(inserts);
    }
};

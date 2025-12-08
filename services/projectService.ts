
import { supabase } from './supabaseClient';
import { DbProject, DbTask, AreaAtuacao, BpmnNode, Attachment } from '../types';

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
        console.error('Erro ao buscar projetos:', error.message);
        return [];
    }
    return data as any[];
};

export const fetchProjectsByClient = async (clientId: string): Promise<DbProject[]> => {
    const { data, error } = await supabase
        .from(PROJECT_TABLE)
        .select('*')
        .eq('cliente', clientId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erro ao buscar projetos do cliente:', error.message);
        return [];
    }
    return data as DbProject[];
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
        console.error('Erro ao criar projeto:', error.message);
        return null;
    }
    return data;
};

export const addAttachmentToProject = async (projectId: number, attachment: Attachment) => {
    try {
        // Fetch current project structure
        const { data: proj, error } = await supabase.from(PROJECT_TABLE).select('bpmn_structure').eq('id', projectId).single();
        if (error || !proj) throw new Error("Project not found or load failed");

        const structure = proj.bpmn_structure || { nodes: [], lanes: [], edges: [] };
        const currentAttachments = (structure as any).attachments || [];
        
        // Add new attachment
        (structure as any).attachments = [attachment, ...currentAttachments];

        // Update project
        await supabase.from(PROJECT_TABLE).update({ bpmn_structure: structure }).eq('id', projectId);
        return true;
    } catch (e: any) {
        console.error("Failed to add attachment to project:", e.message);
        return false;
    }
};

export const fetchProjectAttachments = async (projectId: number): Promise<Attachment[]> => {
    const { data: proj } = await supabase.from(PROJECT_TABLE).select('bpmn_structure').eq('id', projectId).single();
    if (proj && proj.bpmn_structure) {
        return (proj.bpmn_structure as any).attachments || [];
    }
    return [];
};

// --- ÁREAS DE ATUAÇÃO & MEMBROS ---

export const fetchAreasAtuacao = async (): Promise<AreaAtuacao[]> => {
    // Select * instead of specific columns to avoid error if 'nome' is missing
    const { data, error } = await supabase.from('area_atuacao').select('*');
    
    if (error) {
        console.error('Erro ao buscar áreas de atuação:', error.message);
        return [];
    }
    
    // Map with fallbacks for the name property
    return data.map((d: any) => ({
        id: d.id,
        nome: d.nome || d.name || d.titulo || d.descricao || `Cargo ${d.id}`
    })).sort((a, b) => a.nome.localeCompare(b.nome));
};

export const fetchOrgMembers = async (organizationId: number): Promise<{id: string, nome: string, cargo: number, area?: string}[]> => {
    const { data: users, error } = await supabase
        .from('users')
        .select('id, nome, cargo')
        .eq('organizacao', organizationId);

    if (error) {
        console.error('Erro ao buscar membros:', error.message);
        return [];
    }

    // Manual Hydration for Area Name (avoiding join issues)
    const cargoIds = [...new Set(users.map((u: any) => u.cargo).filter(Boolean))];
    let areaMap = new Map<number, string>();

    if (cargoIds.length > 0) {
        // Select * to be safe
        const { data: areas } = await supabase.from('area_atuacao').select('*').in('id', cargoIds);
        areas?.forEach((a: any) => {
            const name = a.nome || a.name || a.titulo || a.descricao || `Cargo ${a.id}`;
            areaMap.set(a.id, name);
        });
    }
    
    return users.map((u: any) => ({
        id: u.id,
        nome: u.nome,
        cargo: u.cargo,
        area: areaMap.get(u.cargo) || 'Sem Cargo'
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

    } catch (error: any) {
        console.error('Erro ao buscar tarefas (tasks):', error.message);
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
    } catch (error: any) {
        console.error('Erro ao buscar tarefas do usuário:', error.message);
        return [];
    }
};

export const fetchSubtasks = async (parentId: number): Promise<any[]> => {
    try {
        // Busca subtarefas ligadas ao pai
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
        console.error('Erro ao buscar subtarefas:', error.message);
        return [];
    }
};

export const fetchAssignableUsers = async (organizationId: number): Promise<{id: string, nome: string}[]> => {
    const { data, error } = await supabase
        .from('users')
        .select('id, nome')
        .eq('organizacao', organizationId);
        // Removed filter for 'desenvolvedor' to support all types of assignable users

    if (error) {
        console.error('Erro ao buscar usuários atribuíveis:', error.message);
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
            duracaohoras: cleanTask.duracaohoras ? Math.round(Number(cleanTask.duracaohoras)) : 2, // Force Integer
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
            if (key === 'duracaohoras') {
                payload[key] = Math.round(Number(value)); // Force Integer
            } else {
                payload[key] = value;
            }
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
        console.error(`Erro ao atualizar tarefa (ID: ${id}):`, error.message);
        return null;
    }
    return data;
};

export const deleteTask = async (id: number): Promise<boolean> => {
    // 1. Delete Subtasks first to avoid constraint errors
    const { error: subError } = await supabase.from(TASKS_TABLE).delete().eq('tarefamae', id);
    if (subError) {
        console.error('Erro ao deletar subtarefas:', subError.message);
    }

    // 2. Delete Main Task
    const { error } = await supabase.from(TASKS_TABLE).delete().eq('id', id);
    if (error) {
        console.error('Erro ao deletar tarefa:', error.message);
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
        duracaohoras: sub.estimatedHours ? Math.round(Number(sub.estimatedHours)) : 2, // Force Integer
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

// Function to Sync BPMN Nodes directly to Tasks Table
export const syncBpmnTasks = async (projectId: number, organizationId: number, nodes: BpmnNode[]): Promise<BpmnNode[]> => {
    const updatedNodes = JSON.parse(JSON.stringify(nodes)); // Deep copy to avoid mutation issues
    
    // Default Assignee fallback (current user if possible, but we don't have user context here easily, so require assigneeId on tasks)
    // We assume tasks already have assigneeId from the UI or AI assignment step.

    for (const node of updatedNodes) {
        if (!node.checklist) continue;

        for (let i = 0; i < node.checklist.length; i++) {
            const task = node.checklist[i];
            
            // Validate Assignee
            if (!task.assigneeId) {
                console.warn(`Task "${task.text}" skipped sync: No assigneeId.`);
                continue; 
            }

            let dbId = task.dbId;

            // 1. CREATE or UPDATE Parent Task
            if (dbId) {
                // Update existing
                await updateTask(dbId, {
                    titulo: task.text,
                    descricao: task.description,
                    status: task.status,
                    responsavel: task.assigneeId,
                    duracaohoras: task.estimatedHours,
                    datainicio: task.startDate,
                    datafim: task.dueDate
                });
            } else {
                // Insert new
                const created = await createTask({
                    projeto: projectId,
                    titulo: task.text,
                    descricao: task.description || node.label, // Use node label as description context
                    status: task.status || 'todo',
                    responsavel: task.assigneeId,
                    duracaohoras: task.estimatedHours || 2,
                    datainicio: task.startDate || new Date().toISOString(),
                    datafim: task.dueDate || new Date().toISOString(),
                    organizacao: organizationId,
                    sutarefa: false
                });
                
                if (created) {
                    dbId = created.id;
                    task.dbId = created.id;
                    task.id = created.id.toString(); // Sync frontend ID to DB ID
                }
            }

            // 2. Sync Subtasks
            if (dbId && task.subtasks && task.subtasks.length > 0) {
                for (let j = 0; j < task.subtasks.length; j++) {
                    const sub = task.subtasks[j];
                    let subDbId = sub.dbId;

                    if (subDbId) {
                        await updateTask(subDbId, {
                            titulo: sub.text,
                            status: sub.completed ? 'done' : 'todo',
                            responsavel: sub.assigneeId || task.assigneeId,
                            duracaohoras: sub.estimatedHours
                        });
                    } else {
                        const createdSub = await createTask({
                            projeto: projectId,
                            titulo: sub.text,
                            descricao: 'Subtarefa BPMN',
                            status: sub.completed ? 'done' : 'todo',
                            responsavel: sub.assigneeId || task.assigneeId,
                            duracaohoras: sub.estimatedHours || 1,
                            datainicio: sub.startDate || task.startDate,
                            datafim: sub.dueDate || task.dueDate,
                            organizacao: organizationId,
                            sutarefa: true,
                            tarefamae: dbId
                        });

                        if (createdSub) {
                            sub.dbId = createdSub.id;
                            sub.id = createdSub.id.toString();
                        }
                    }
                }
            }
        }
    }

    return updatedNodes;
};

// --- PROMOTION ---
export const promoteSubtask = async (subtaskId: number): Promise<boolean> => {
    // Desvincula a tarefa do pai (tarefamae = null) e remove a flag sutarefa
    const { error } = await supabase
        .from(TASKS_TABLE)
        .update({ sutarefa: false, tarefamae: null })
        .eq('id', subtaskId);

    if (error) {
        console.error('Erro ao promover subtarefa:', error.message);
        return false;
    }
    return true;
};

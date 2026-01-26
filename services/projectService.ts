
import { supabase } from './supabaseClient';
import { DbProject, DbTask, AreaAtuacao, BpmnNode, Attachment, BpmnSubTask } from '../types';

const TASKS_TABLE = 'tasks';
const PROJECT_TABLE = 'projetos';

// --- HELPERS PARA ANEXOS EM DESCRIÇÃO ---
const ATTACHMENT_MARKER = "\n\n<!--_SHINKO_ATTACHMENTS_";
const ATTACHMENT_END = "_-->";

function packAttachments(desc: string, atts: Attachment[] | undefined): string {
    if (!desc) desc = "";
    const cleanDesc = desc.split(ATTACHMENT_MARKER)[0];
    if (!atts || atts.length === 0) return cleanDesc;
    try {
        const json = JSON.stringify(atts);
        return `${cleanDesc}${ATTACHMENT_MARKER}${json}${ATTACHMENT_END}`;
    } catch (e) {
        console.error("Erro ao compactar anexos:", e);
        return cleanDesc;
    }
}

function unpackAttachments(rawDesc: string): { description: string, anexos: Attachment[] } {
    if (!rawDesc) return { description: '', anexos: [] };
    const parts = rawDesc.split(ATTACHMENT_MARKER);
    if (parts.length < 2) return { description: rawDesc, anexos: [] };
    try {
        const jsonPart = parts[1].split(ATTACHMENT_END)[0];
        const anexos = JSON.parse(jsonPart);
        return { description: parts[0], anexos: Array.isArray(anexos) ? anexos : [] };
    } catch (e) {
        console.error("Erro ao descompactar anexos:", e);
        return { description: parts[0], anexos: [] };
    }
}

// --- PROJETOS ---

export const fetchProjects = async (organizationId?: number): Promise<DbProject[]> => {
    if (!organizationId) return [];
    try {
        let query = supabase
            .from(PROJECT_TABLE)
            .select(`*, clienteData:clientes(nome, logo_url)`)
            .eq('organizacao', organizationId)
            .order('created_at', { ascending: false });
        const { data, error: actualError } = await query;
        if (actualError) return [];
        return data as any[];
    } catch (error: any) { return []; }
};

export const fetchProjectsByClient = async (clientId: string): Promise<DbProject[]> => {
    const { data, error } = await supabase.from(PROJECT_TABLE).select('*').eq('cliente', clientId).order('created_at', { ascending: false });
    if (error) return [];
    return data as DbProject[];
};

export const createProject = async (nome: string, cliente: string | null, userId: string): Promise<DbProject | null> => {
    const { data: userData } = await supabase.from('users').select('organizacao').eq('id', userId).single();
    const orgId = userData?.organizacao;
    if (!orgId) throw new Error("Erro de Segurança: Organização não identificada.");

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
            projoport: false,
            cor: '#3b82f6'
        })
        .select().maybeSingle();
    if (error) return null;
    return data;
};

// --- ÁREAS DE ATUAÇÃO & MEMBROS ---

export const fetchOrgMembers = async (organizationId: number): Promise<{id: string, nome: string, cargo: number, area?: string, avatar_url?: string}[]> => {
    const { data: users, error } = await supabase.from('users').select('id, nome, cargo, avatar_url').eq('organizacao', organizationId);
    if (error) return [];
    const cargoIds = [...new Set(users.map((u: any) => u.cargo).filter(Boolean))];
    let areaMap = new Map<number, string>();
    if (cargoIds.length > 0) {
        const { data: areas } = await supabase.from('area_atuacao').select('*').in('id', cargoIds);
        areas?.forEach((a: any) => {
            const name = a.nome || a.cargo || `Cargo ${a.id}`;
            areaMap.set(a.id, name);
        });
    }
    return users.map((u: any) => ({
        id: u.id,
        nome: u.nome,
        cargo: u.cargo,
        avatar_url: u.avatar_url,
        area: areaMap.get(u.cargo) || 'Membro'
    }));
};

// --- TAREFAS (TASKS) ---

export const fetchAllTasks = async (organizationId?: number): Promise<DbTask[]> => {
    if (!organizationId) return [];
    try {
        let query = supabase.from(TASKS_TABLE).select(`*, projetoData:projetos(nome, cor)`).eq('organizacao', organizationId).order('dataproposta', { ascending: true });
        const { data: tasks, error } = await query;
        if (error) throw error;
        if (!tasks || tasks.length === 0) return [];
        const userIds = [...new Set(tasks.map((t: any) => t.responsavel).filter(Boolean))];
        let userMap = new Map<string, any>();
        if (userIds.length > 0) {
            const { data: users } = await supabase.from('users').select('id, nome, avatar_url').in('id', userIds);
            if (users) users.forEach(u => userMap.set(u.id, u));
        }
        return tasks.map((t: any) => {
            const { description, anexos } = unpackAttachments(t.descricao);
            return { ...t, descricao: description, responsavelData: userMap.get(t.responsavel) || { nome: 'N/A' }, anexos: anexos };
        });
    } catch (error: any) { return []; }
};

export const createTask = async (task: Partial<DbTask>): Promise<DbTask | null> => {
    try {
        const { projetoData, responsavelData, createdat, id, anexos, ...cleanTask } = task as any;
        
        // EXTRAÇÃO INTELIGENTE DE CAMPOS (FRONT -> DB)
        const tituloFinal = cleanTask.titulo || cleanTask.text || 'Nova Tarefa';
        const descricaoOriginal = cleanTask.descricao || cleanTask.description || '';
        const packedDescription = packAttachments(descricaoOriginal, anexos || []);

        const payload = {
            projeto: cleanTask.projeto || null,
            titulo: tituloFinal,
            descricao: packedDescription,
            status: cleanTask.status || 'todo',
            responsavel: cleanTask.responsavel || cleanTask.assigneeId,
            category: cleanTask.category || 'Gestão',
            gravidade: cleanTask.gravidade || cleanTask.gut?.g || 1,
            urgencia: cleanTask.urgencia || cleanTask.gut?.u || 1,
            tendencia: cleanTask.tendencia || cleanTask.gut?.t || 1,
            dataproposta: cleanTask.datafim || cleanTask.dueDate || new Date().toISOString(),
            datainicio: cleanTask.datainicio || cleanTask.startDate || new Date().toISOString(),
            datafim: cleanTask.datafim || cleanTask.dueDate || new Date().toISOString(),
            duracaohoras: Math.round(Number(cleanTask.duracaohoras || cleanTask.estimatedHours || 2)), 
            organizacao: cleanTask.organizacao,
            sutarefa: cleanTask.sutarefa || false,
            tarefamae: cleanTask.tarefamae || null
        };

        const { data, error } = await supabase.from(TASKS_TABLE).insert(payload).select().maybeSingle();
        if (error) throw error;
        return data;
    } catch (error: any) {
        console.error('Error creating task:', error);
        return null;
    }
};

export const updateTask = async (id: number, updates: Partial<DbTask>): Promise<DbTask | null> => {
    try {
        const { projetoData, responsavelData, createdat, id: _, anexos, ...cleanUpdates } = updates as any;
        
        const payload: any = { ...cleanUpdates };
        
        // Mapeamento Inteligente (Shinkō OS Proxy)
        if (cleanUpdates.text && !cleanUpdates.titulo) payload.titulo = cleanUpdates.text;
        
        // CORREÇÃO CRÍTICA: Garantir que a descrição seja mapeada para a coluna correta
        const finalDesc = cleanUpdates.descricao !== undefined ? cleanUpdates.descricao : cleanUpdates.description;
        if (finalDesc !== undefined) {
            payload.descricao = packAttachments(finalDesc, anexos);
        }

        // Mapeamento GUT
        if (cleanUpdates.gut) {
            payload.gravidade = cleanUpdates.gut.g;
            payload.urgencia = cleanUpdates.gut.u;
            payload.tendencia = cleanUpdates.gut.t;
        }

        const { data, error } = await supabase.from(TASKS_TABLE).update(payload).eq('id', id).select().maybeSingle();
        if (error) throw error;
        return data;
    } catch (e: any) {
        console.error("Error updating task:", e.message);
        return null;
    }
};

export const deleteTask = async (id: number): Promise<boolean> => {
    const { error } = await supabase.from(TASKS_TABLE).delete().eq('id', id);
    return !error;
};

export const syncTaskChecklist = async (parentId: number, subtasks: BpmnSubTask[], organizationId: number, projectId?: number, defaultAssigneeId?: string) => {
    for (const sub of subtasks) {
        if (!sub.dbId) {
            await createTask({
                tarefamae: parentId,
                titulo: sub.text,
                status: sub.completed ? 'done' : 'todo',
                responsavel: sub.assigneeId || defaultAssigneeId,
                organizacao: organizationId,
                projeto: projectId,
                sutarefa: true
            });
        }
    }
};

export const syncBpmnTasks = async (projectId: number, organizationId: number, nodes: BpmnNode[]): Promise<BpmnNode[]> => {
    const updatedNodes = JSON.parse(JSON.stringify(nodes));
    const { data: { user } } = await supabase.auth.getUser();
    const defaultAssignee = user?.id;

    for (const node of updatedNodes) {
        if (!node.checklist) continue;
        for (let i = 0; i < node.checklist.length; i++) {
            const task = node.checklist[i];
            
            if (task.dbId) { 
                await updateTask(task.dbId, { 
                    titulo: task.text, 
                    descricao: task.description, 
                    status: task.status, 
                    responsavel: task.assigneeId || defaultAssignee, 
                    duracaohoras: task.estimatedHours, 
                    datainicio: task.startDate, 
                    datafim: task.dueDate,
                    category: node.label
                }); 
            } else {
                const created = await createTask({ 
                    projeto: projectId, 
                    titulo: task.text, 
                    descricao: task.description || node.label, 
                    status: task.status || 'todo', 
                    responsavel: task.assigneeId || defaultAssignee, 
                    duracaohoras: task.estimatedHours || 2, 
                    datainicio: task.startDate || new Date().toISOString(), 
                    datafim: task.dueDate || new Date().toISOString(), 
                    organizacao: organizationId, 
                    category: node.label 
                });
                if (created) { 
                    task.dbId = created.id; 
                    task.id = created.id.toString(); 
                }
            }
        }
    }
    return updatedNodes;
};


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
        const { data, error } = await query;
        if (error) return [];
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

export const addAttachmentToProject = async (projectId: number, attachment: Attachment) => {
    try {
        const { data: proj, error = null } = await supabase.from(PROJECT_TABLE).select('bpmn_structure').eq('id', projectId).single();
        if (error || !proj) throw new Error("Project not found");
        const structure = proj.bpmn_structure || { nodes: [], lanes: [], edges: [] };
        const currentAttachments = (structure as any).attachments || [];
        (structure as any).attachments = [attachment, ...currentAttachments];
        await supabase.from(PROJECT_TABLE).update({ bpmn_structure: structure }).eq('id', projectId);
        return true;
    } catch (e: any) { return false; }
};

export const fetchProjectAttachments = async (projectId: number): Promise<Attachment[]> => {
    const { data: proj } = await supabase.from(PROJECT_TABLE).select('bpmn_structure').eq('id', projectId).maybeSingle();
    if (proj && proj.bpmn_structure) return (proj.bpmn_structure as any).attachments || [];
    return [];
};

// --- ÁREAS DE ATUAÇÃO & MEMBROS ---

export const fetchAreasAtuacao = async (): Promise<AreaAtuacao[]> => {
    const { data, error } = await supabase.from('area_atuacao').select('*');
    if (error) return [];
    return data.map((d: any) => ({
        id: d.id,
        nome: d.nome || d.name || d.titulo || d.descricao || `Cargo ${d.id}`
    })).sort((a, b) => a.nome.localeCompare(b.nome));
};

export const fetchOrgMembers = async (organizationId: number): Promise<{id: string, nome: string, cargo: number, area?: string}[]> => {
    const { data: users, error } = await supabase.from('users').select('id, nome, cargo').eq('organizacao', organizationId);
    if (error) return [];
    const cargoIds = [...new Set(users.map((u: any) => u.cargo).filter(Boolean))];
    let areaMap = new Map<number, string>();
    if (cargoIds.length > 0) {
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
    if (!organizationId) return [];
    try {
        let query = supabase.from(TASKS_TABLE).select(`*, projetoData:projetos(nome, cor)`).eq('organizacao', organizationId).order('dataproposta', { ascending: true });
        const { data: tasks, error } = await query;
        if (error) throw error;
        if (!tasks || tasks.length === 0) return [];
        const userIds = [...new Set(tasks.map((t: any) => t.responsavel).filter(Boolean))];
        tasks.forEach((t: any) => { if (t.membros && Array.isArray(t.membros)) t.membros.forEach((mId: string) => userIds.push(mId)); });
        let userMap = new Map<string, any>();
        const uniqueUserIds = [...new Set(userIds)];
        if (uniqueUserIds.length > 0) {
            const { data: users } = await supabase.from('users').select('id, nome, perfil, organizacao, desenvolvedor, avatar_url').in('id', uniqueUserIds);
            if (users) users.forEach(u => userMap.set(u.id, u));
        }
        return tasks.map((t: any) => {
            const { description, anexos } = unpackAttachments(t.descricao);
            return { ...t, descricao: description, responsavelData: userMap.get(t.responsavel) || { nome: 'Desconhecido', desenvolvedor: false, organizacao: 0 }, anexos: anexos };
        });
    } catch (error: any) { return []; }
};

export const createTask = async (task: Partial<DbTask>): Promise<DbTask | null> => {
    try {
        if (!task.responsavel) {
             const { data: user } = await supabase.auth.getUser();
             if (user.user) task.responsavel = user.user.id;
             else throw new Error("Responsável (UUID) é obrigatório.");
        }
        if (!task.organizacao) {
            const { data: u = null } = await supabase.from('users').select('organizacao').eq('id', task.responsavel).single();
            if (u) task.organizacao = u.organizacao;
            else throw new Error("ID da Organização não fornecido.");
        }

        const { projetoData, responsavelData, createdat, id, anexos, ...cleanTask } = task as any;
        const prazo = cleanTask.datafim || new Date().toISOString();
        const packedDescription = packAttachments(cleanTask.descricao || '', anexos || []);

        const finalTitle = cleanTask.titulo || cleanTask.text || 'Nova Tarefa';

        const payload = {
            projeto: cleanTask.projeto || null,
            titulo: finalTitle,
            descricao: packedDescription,
            status: cleanTask.status || 'todo',
            responsavel: cleanTask.responsavel,
            category: cleanTask.category || (cleanTask.tags?.[0]) || 'Gestão',
            gravidade: cleanTask.gravidade || 1,
            urgencia: cleanTask.urgencia || 1,
            tendencia: cleanTask.tendencia || 1,
            dataproposta: prazo,
            deadline: cleanTask.deadline || prazo,
            datainicio: cleanTask.datainicio || new Date().toISOString(),
            datafim: prazo,
            duracaohoras: cleanTask.duracaohoras ? Math.round(Number(cleanTask.duracaohoras)) : 2, 
            sutarefa: cleanTask.sutarefa || false,
            tarefamae: cleanTask.tarefamae || null,
            organizacao: cleanTask.organizacao,
            membros: cleanTask.membros || [],
            etiquetas: cleanTask.etiquetas || []
        };

        const { data, error = null } = await supabase.from(TASKS_TABLE).insert(payload).select().maybeSingle();
        if (error) throw error;
        if (!data) return null;
        const { description, anexos: savedAnexos } = unpackAttachments(data.descricao);
        return { ...data, descricao: description, anexos: savedAnexos };
    } catch (error: any) {
        console.error('Erro ao criar tarefa (tasks):', error.message || error);
        return null;
    }
};

export const updateTask = async (id: number, updates: Partial<DbTask>): Promise<DbTask | null> => {
    const payload: any = {};
    let hasAttachmentsUpdate = false;
    let newAttachments: Attachment[] = [];

    // Captura campos válidos
    Object.entries(updates).forEach(([key, value]) => {
        if (key === 'anexos' || key === 'attachments') { 
            hasAttachmentsUpdate = true; 
            newAttachments = value as Attachment[]; 
        }
        else if (value !== undefined && key !== 'projetoData' && key !== 'responsavelData' && key !== 'createdat' && key !== 'id') {
            if (key === 'duracaohoras') payload[key] = Math.round(Number(value));
            else payload[key] = value;
        }
    });

    if (Object.keys(payload).length === 0 && !hasAttachmentsUpdate) return null;
    if (payload.responsavel === null) delete payload.responsavel;

    // Lógica de empacotamento de anexos na descrição (padrão do sistema)
    const { data: currentTask } = await supabase.from(TASKS_TABLE).select('descricao').eq('id', id).maybeSingle();
    const currentUnpacked = unpackAttachments(currentTask?.descricao || "");
    
    const finalDescription = payload.descricao !== undefined ? payload.descricao : currentUnpacked.description;
    const finalAttachments = hasAttachmentsUpdate ? newAttachments : currentUnpacked.anexos;
    
    payload.descricao = packAttachments(finalDescription, finalAttachments);
    delete payload.anexos;
    delete payload.attachments;

    const { data, error = null } = await supabase.from(TASKS_TABLE).update(payload).eq('id', id).select().maybeSingle();
    if (error) return null;
    if (!data) return null;
    
    const { description, anexos } = unpackAttachments(data.descricao);
    return { ...data, descricao: description, anexos: anexos };
};

export const syncTaskChecklist = async (parentId: number, subtasks: BpmnSubTask[], organizationId: number, projectId?: number, defaultAssigneeId?: string): Promise<void> => {
    try {
        const { data: existing, error } = await supabase.from(TASKS_TABLE).select('id').eq('tarefamae', parentId);
        if (error) throw error;
        const existingIds = new Set((existing as { id: number }[])?.map(t => t.id) || []);
        const incomingIds = new Set(subtasks.filter(s => s.dbId).map(s => Number(s.dbId)));
        const toDelete = [...existingIds].filter(id => !incomingIds.has(id));
        if (toDelete.length > 0) { await supabase.from('comentarios').delete().in('task', toDelete); await supabase.from(TASKS_TABLE).delete().in('id', toDelete); }
        for (const sub of subtasks) {
            if (sub.dbId) {
                await updateTask(Number(sub.dbId), { titulo: sub.text, status: sub.completed ? 'done' : 'todo', responsavel: sub.assigneeId, datafim: sub.dueDate, datainicio: sub.startDate, duracaohoras: sub.estimatedHours });
            } else {
                await createTask({ tarefamae: parentId, titulo: sub.text, status: sub.completed ? 'done' : 'todo', responsavel: sub.assigneeId || defaultAssigneeId, datafim: sub.dueDate, datainicio: sub.startDate || new Date().toISOString(), duracaohoras: sub.estimatedHours || 1, sutarefa: true, projeto: projectId, organizacao: organizationId });
            }
        }
    } catch (e: any) { console.error(e.message); }
};

export const deleteTask = async (id: number): Promise<boolean> => {
    const { data: subtasks } = await supabase.from(TASKS_TABLE).select('id').eq('tarefamae', id);
    if (subtasks && subtasks.length > 0) {
        const subIds = subtasks.map(s => s.id);
        await supabase.from('comentarios').delete().in('task', subIds);
        await supabase.from(TASKS_TABLE).delete().in('id', subIds);
    }
    await supabase.from('comentarios').delete().eq('task', id);
    const { error } = await supabase.from(TASKS_TABLE).delete().eq('id', id);
    return !error;
};

export const syncBpmnTasks = async (projectId: number, organizationId: number, nodes: BpmnNode[]): Promise<BpmnNode[]> => {
    const updatedNodes = JSON.parse(JSON.stringify(nodes));
    for (const node of updatedNodes) {
        if (!node.checklist) continue;
        for (let i = 0; i < node.checklist.length; i++) {
            const task = node.checklist[i];
            if (!task.assigneeId) continue; 
            let dbId = task.dbId;
            if (dbId) { await updateTask(dbId, { titulo: task.text, descricao: task.description, status: task.status, responsavel: task.assigneeId, duracaohoras: task.estimatedHours, datainicio: task.startDate, datafim: task.dueDate }); }
            else {
                const created = await createTask({ projeto: projectId, titulo: task.text, descricao: task.description || node.label, status: task.status || 'todo', responsavel: task.assigneeId, duracaohoras: task.estimatedHours || 2, datainicio: task.startDate || new Date().toISOString(), datafim: task.dueDate || new Date().toISOString(), organizacao: organizationId, sutarefa: false });
                if (created) { dbId = created.id; task.dbId = created.id; task.id = created.id.toString(); }
            }
            if (dbId && task.subtasks) { await syncTaskChecklist(dbId, task.subtasks, organizationId, projectId, task.assigneeId); }
        }
    }
    return updatedNodes;
};

import { supabase } from './supabaseClient';
import { DbProject, DbTask, AreaAtuacao, BpmnNode, Attachment, BpmnSubTask } from '../types';

const TASKS_TABLE = 'tasks';
const PROJECT_TABLE = 'projetos';

// --- HELPERS PARA ANEXOS EM DESCRIÇÃO (WORKAROUND SEM ALTERAR SCHEMA) ---
const ATTACHMENT_MARKER = "\n\n<!--_SHINKO_ATTACHMENTS_";
const ATTACHMENT_END = "_-->";

function packAttachments(desc: string, atts: Attachment[] | undefined): string {
    if (!desc) desc = "";
    // Remove existing marker first to avoid duplication
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
    } catch (error: any) {
        console.error('Exceção ao buscar projetos:', error);
        return [];
    }
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
            projoport: false,
            cor: '#3b82f6'
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
        const { data: proj, error } = await supabase.from(PROJECT_TABLE).select('bpmn_structure').eq('id', projectId).single();
        if (error || !proj) throw new Error("Project not found or load failed");

        const structure = proj.bpmn_structure || { nodes: [], lanes: [], edges: [] };
        const currentAttachments = (structure as any).attachments || [];
        (structure as any).attachments = [attachment, ...currentAttachments];

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
    const { data, error } = await supabase.from('area_atuacao').select('*');
    
    if (error) {
        console.error('Erro ao buscar áreas de atuação:', error.message);
        return [];
    }
    
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
        let query = supabase
            .from(TASKS_TABLE)
            .select(`
                *,
                projetoData:projetos(nome, cor)
            `)
            .eq('organizacao', organizationId)
            .order('dataproposta', { ascending: true });

        const { data: tasks, error } = await query;

        if (error) throw error;
        if (!tasks || tasks.length === 0) return [];

        // Collect from responsavel
        const userIds = [...new Set(tasks.map((t: any) => t.responsavel).filter(Boolean))];
        
        // Collect from membros array
        tasks.forEach((t: any) => {
            if (t.membros && Array.isArray(t.membros)) {
                t.membros.forEach((mId: string) => userIds.push(mId));
            }
        });

        let userMap = new Map<string, any>();
        
        // Fetch unique users
        const uniqueUserIds = [...new Set(userIds)];

        if (uniqueUserIds.length > 0) {
            const { data: users } = await supabase
                .from('users')
                .select('id, nome, perfil, organizacao, desenvolvedor, avatar_url')
                .in('id', uniqueUserIds);
            
            if (users) {
                users.forEach(u => userMap.set(u.id, u));
            }
        }

        const hydratedTasks: DbTask[] = tasks.map((t: any) => {
            // Unpack description and attachments
            const { description, anexos } = unpackAttachments(t.descricao);
            
            return {
                ...t,
                descricao: description, // Clean description for UI
                responsavelData: userMap.get(t.responsavel) || { nome: 'Desconhecido', desenvolvedor: false, organizacao: 0 },
                anexos: anexos // Hydrated array
            };
        });

        return hydratedTasks;

    } catch (error: any) {
        console.error('Erro ao buscar tarefas (tasks):', error.message);
        return [];
    }
};

export const fetchAssignableUsers = async (organizationId: number): Promise<{id: string, nome: string}[]> => {
    const { data, error } = await supabase
        .from('users')
        .select('id, nome')
        .eq('organizacao', organizationId);

    if (error) {
        console.error('Erro ao buscar usuários atribuíveis:', error.message);
        return [];
    }
    return data || [];
};

export const createTask = async (task: Partial<DbTask>): Promise<DbTask | null> => {
    try {
        // Validation: If no responsavel is provided, try to fetch current user (fallback)
        // But better to throw if not provided by caller.
        if (!task.responsavel) {
             const { data: user } = await supabase.auth.getUser();
             if (user.user) task.responsavel = user.user.id;
             else throw new Error("Responsável (UUID) é obrigatório para criar tarefa.");
        }

        if (!task.organizacao) {
            // Fallback fetch org from responsavel
            const { data: u } = await supabase.from('users').select('organizacao').eq('id', task.responsavel).single();
            if (u) task.organizacao = u.organizacao;
            else throw new Error("Erro de Segurança: ID da Organização não fornecido.");
        }

        const { projetoData, responsavelData, createdat, id, anexos, ...cleanTask } = task as any;
        const prazo = cleanTask.datafim || new Date().toISOString();

        // Pack attachments into description
        const packedDescription = packAttachments(cleanTask.descricao || '', anexos || []);

        const payload = {
            projeto: cleanTask.projeto || null,
            titulo: cleanTask.titulo,
            descricao: packedDescription,
            status: cleanTask.status || 'todo',
            responsavel: cleanTask.responsavel,
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
            // NO 'anexos' COLUMN HERE
        };

        const { data, error } = await supabase
            .from(TASKS_TABLE)
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        
        // Return unwrapped
        const { description, anexos: savedAnexos } = unpackAttachments(data.descricao);
        return { ...data, descricao: description, anexos: savedAnexos };

    } catch (error: any) {
        console.error('Erro ao criar tarefa (tasks):', error.message || error);
        return null; // Return null gracefully on error so UI can handle it
    }
};

export const updateTask = async (id: number, updates: Partial<DbTask>): Promise<DbTask | null> => {
    // Explicitly clean payload
    const payload: any = {};
    let hasAttachmentsUpdate = false;
    let newAttachments: Attachment[] = [];

    Object.entries(updates).forEach(([key, value]) => {
        // Filter out hydration and local-only fields
        if (key === 'anexos') {
            hasAttachmentsUpdate = true;
            newAttachments = value as Attachment[];
        } else if (value !== undefined && key !== 'projetoData' && key !== 'responsavelData' && key !== 'createdat' && key !== 'id') {
            if (key === 'duracaohoras') {
                payload[key] = Math.round(Number(value));
            } else {
                payload[key] = value;
            }
        }
    });

    if (payload.responsavel === null) {
        delete payload.responsavel;
    }

    // Handle Attachments packing
    if (hasAttachmentsUpdate) {
        let descriptionToPack = payload.descricao;
        
        // If description is not in updates, we must fetch it from DB to avoid losing it
        if (descriptionToPack === undefined) {
            const { data: currentTask } = await supabase.from(TASKS_TABLE).select('descricao').eq('id', id).single();
            if (currentTask) {
                // Unpack existing to get clean description, then repack with new attachments
                const { description } = unpackAttachments(currentTask.descricao);
                descriptionToPack = description;
            } else {
                descriptionToPack = "";
            }
        }
        
        // Pack
        payload.descricao = packAttachments(descriptionToPack, newAttachments);
    } 
    // If we are updating description but NOT attachments, we must preserve existing attachments
    else if (payload.descricao !== undefined) {
         const { data: currentTask } = await supabase.from(TASKS_TABLE).select('descricao').eq('id', id).single();
         if (currentTask) {
             const { anexos } = unpackAttachments(currentTask.descricao);
             payload.descricao = packAttachments(payload.descricao, anexos);
         }
    }

    // REMOVE ANEXOS FROM PAYLOAD TO PREVENT DB ERROR
    delete (payload as any).anexos;

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
    
    // Return unwrapped
    const { description, anexos } = unpackAttachments(data.descricao);
    return { ...data, descricao: description, anexos: anexos };
};

// --- SYNC CHECKLIST (SUBTASKS) ---
export const syncTaskChecklist = async (
    parentId: number, 
    subtasks: BpmnSubTask[], 
    organizationId: number, 
    projectId?: number, 
    defaultAssigneeId?: string
): Promise<void> => {
    try {
        console.log(`Syncing checklist for Parent ${parentId}`, subtasks);

        // 1. Fetch Existing Subtasks from DB
        const { data: existing, error } = await supabase
            .from(TASKS_TABLE)
            .select('id')
            .eq('tarefamae', parentId);

        if (error) throw error;

        const existingIds = new Set((existing as { id: number }[])?.map(t => t.id) || []);
        const incomingIds = new Set(subtasks.filter(s => s.dbId).map(s => Number(s.dbId)));

        // 2. Delete Orphans (In DB but not in new list)
        const toDelete = [...existingIds].filter(id => !incomingIds.has(id));
        if (toDelete.length > 0) {
            await supabase.from(TASKS_TABLE).delete().in('id', toDelete);
        }

        // 3. Upsert (Update or Insert)
        for (const sub of subtasks) {
            
            if (sub.dbId) {
                // Update
                await updateTask(Number(sub.dbId), {
                    titulo: sub.text,
                    status: sub.completed ? 'done' : 'todo',
                    responsavel: sub.assigneeId, // Only update if explicitly set
                    datafim: sub.dueDate,
                    datainicio: sub.startDate,
                    duracaohoras: sub.estimatedHours
                });
            } else {
                // Insert
                await createTask({
                    tarefamae: parentId,
                    titulo: sub.text,
                    descricao: 'Item de Checklist',
                    status: sub.completed ? 'done' : 'todo',
                    responsavel: sub.assigneeId || defaultAssigneeId, // Use fallback if not set
                    datafim: sub.dueDate,
                    datainicio: sub.startDate || new Date().toISOString(),
                    duracaohoras: sub.estimatedHours || 1,
                    sutarefa: true,
                    projeto: projectId,
                    organizacao: organizationId
                });
            }
        }

    } catch (e: any) {
        console.error("Erro ao sincronizar checklist:", e.message);
    }
};

export const deleteTask = async (id: number): Promise<boolean> => {
    const { error: subError } = await supabase.from(TASKS_TABLE).delete().eq('tarefamae', id);
    if (subError) {
        console.error('Erro ao deletar subtarefas:', subError.message);
    }

    const { error } = await supabase.from(TASKS_TABLE).delete().eq('id', id);
    if (error) {
        console.error('Erro ao deletar tarefa:', error.message);
        return false;
    }
    return true;
};

export const syncBpmnTasks = async (projectId: number, organizationId: number, nodes: BpmnNode[]): Promise<BpmnNode[]> => {
    // This function handles the main nodes sync, but for checklist inside nodes, it was only doing 1 level deep.
    // If BpmnNode.checklist items are "Tasks", they are main tasks.
    // Their `subtasks` property are the checklist items (level 2).
    
    const updatedNodes = JSON.parse(JSON.stringify(nodes));
    
    for (const node of updatedNodes) {
        if (!node.checklist) continue;

        for (let i = 0; i < node.checklist.length; i++) {
            const task = node.checklist[i];
            
            if (!task.assigneeId) {
                console.warn(`Task "${task.text}" skipped sync: No assigneeId.`);
                continue; 
            }

            let dbId = task.dbId;

            // 1. Sync Parent Task
            if (dbId) {
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
                const created = await createTask({
                    projeto: projectId,
                    titulo: task.text,
                    descricao: task.description || node.label,
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
                    task.id = created.id.toString(); 
                }
            }

            // 2. Sync Subtasks (Checklist) using the new robust helper
            if (dbId && task.subtasks) {
                await syncTaskChecklist(dbId, task.subtasks, organizationId, projectId, task.assigneeId);
            }
        }
    }

    return updatedNodes;
};
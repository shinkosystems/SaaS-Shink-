
import { supabase } from './supabaseClient';
import { Opportunity, ProjectStatus, DbProject, RDEStatus, Archetype, IntensityLevel, TadsCriteria, DbTask, BpmnTask, BpmnNode } from '../types';

const TABLE_NAME = 'projetos';

export const fetchOpportunities = async (): Promise<Opportunity[] | null> => {
  if (!supabase) return null;
  
  try {
    // 1. Fetch Projects
    const { data: projects, error } = await supabase
      .from(TABLE_NAME)
      .select(`
        *,
        clienteData:clientes(nome, logo_url)
      `)
      .order('prioseis', { ascending: false });

    if (error) {
      console.warn('Supabase Fetch Error (Projetos):', error.message);
      return null;
    }

    // 2. Fetch Tasks separately to handle manual hydration
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*'); // Fetching all tasks for now, could be optimized with .in('projeto', projectIds)

    if (tasksError) console.warn('Supabase Fetch Error (Tasks):', tasksError.message);

    // 3. Fetch Users to map Assignees
    let userMap = new Map<string, any>();
    if (tasks && tasks.length > 0) {
        const userIds = [...new Set(tasks.map((t: any) => t.responsavel).filter(Boolean))];
        if (userIds.length > 0) {
            const { data: users } = await supabase.from('users').select('id, nome, desenvolvedor').in('id', userIds);
            users?.forEach(u => userMap.set(u.id, u));
        }
    }

    // 4. Map and Attach
    return projects.map((row: any) => {
        const projectTasks = tasks ? tasks.filter((t: any) => t.projeto === row.id) : [];
        
        // Hydrate tasks
        const hydratedTasks = projectTasks.map((t: any) => ({
            ...t,
            responsavelData: userMap.get(t.responsavel)
        }));

        return mapDbProjectToOpportunity(row, hydratedTasks);
    });

  } catch (err) {
    console.warn('Supabase Connection Unavailable.');
    return null;
  }
};

export const createOpportunity = async (opp: Opportunity): Promise<Opportunity | null> => {
    if (!supabase) return null;

    try {
        const dbPayload = mapOpportunityToDbProject(opp);
        
        const { data: projectData, error } = await supabase.from(TABLE_NAME).insert(dbPayload).select().single();

        if (error) {
            console.warn('Supabase Insert Error:', error.message);
            return null;
        }

        // Insert Tasks recursively
        if (opp.bpmn && opp.bpmn.nodes && Array.isArray(opp.bpmn.nodes)) {
            const { data: { user } } = await supabase.auth.getUser();
            const defaultAssignee = user?.id;

            // Iterate nodes
            for (const node of opp.bpmn.nodes) {
                if (node.checklist && Array.isArray(node.checklist)) {
                    // Iterate main tasks
                    for (const task of node.checklist) {
                        const responsibleId = task.assigneeId || defaultAssignee;
                        if (!responsibleId) continue;

                        // Insert Parent Task
                        const { data: parentTaskData, error: parentError } = await supabase.from('tasks').insert({
                            projeto: projectData.id,
                            titulo: task.text,
                            descricao: task.description || 'VAZIO',
                            status: task.status || 'todo',
                            responsavel: responsibleId, 
                            gravidade: task.gut?.g || 1,
                            urgencia: task.gut?.u || 1,
                            tendencia: task.gut?.t || 1,
                            dataproposta: new Date().toISOString(),
                            duracaohoras: task.estimatedHours || 2,
                            sutarefa: false,
                            organizacao: opp.organizationId || 3,
                        }).select().single();

                        if (!parentError && parentTaskData && task.subtasks && Array.isArray(task.subtasks) && task.subtasks.length > 0) {
                            // Insert Subtasks linked to Parent
                            const subtasksToInsert = task.subtasks.map(sub => ({
                                projeto: projectData.id,
                                titulo: sub.text,
                                descricao: 'Subtarefa',
                                status: sub.completed ? 'done' : 'todo',
                                responsavel: sub.assigneeId || responsibleId, // Inherit or use specific
                                gravidade: 1, urgencia: 1, tendencia: 1,
                                dataproposta: new Date().toISOString(),
                                duracaohoras: 1,
                                sutarefa: true,
                                tarefamae: parentTaskData.id, // Link to parent
                                organizacao: opp.organizationId || 3,
                            }));

                            if (subtasksToInsert.length > 0) {
                                await supabase.from('tasks').insert(subtasksToInsert);
                            }
                        }
                    }
                }
            }
        }
        
        return fetchOpportunities().then(res => res ? res.find(o => o.id === projectData.id.toString()) || null : null);
    } catch (err) {
        console.warn('Supabase Connection Unavailable (Insert).', err);
        return null;
    }
};

export const updateOpportunity = async (opp: Opportunity): Promise<Opportunity | null> => {
    if (!supabase) return null;

    try {
        const dbPayload = mapOpportunityToDbProject(opp);
        const { id, created_at, ...updateData } = dbPayload;

        const { data, error } = await supabase
            .from(TABLE_NAME)
            .update(updateData)
            .eq('id', opp.id)
            .select()
            .single();

        if (error) {
            console.warn('Supabase Update Error:', error.message);
            return null;
        }

        // We don't update tasks structure here usually, individual tasks are updated via task service
        return mapDbProjectToOpportunity(data, []); 
    } catch (err) {
        console.warn('Supabase Connection Unavailable (Update).');
        return null;
    }
};

export const deleteOpportunity = async (id: string): Promise<boolean> => {
    if (!supabase) return false;

    try {
        // 1. EXCLUIR TAREFAS ASSOCIADAS PRIMEIRO (Obrigatório devido à FK)
        const { error: tasksError } = await supabase.from('tasks').delete().eq('projeto', id);
        
        if (tasksError) {
            console.warn('Supabase Delete Tasks Error:', tasksError.message);
            // Se falhar ao deletar tarefas, aborta para não deixar estado inconsistente
            return false; 
        }

        // 2. EXCLUIR O PROJETO
        const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id);

        if (error) {
            console.warn('Supabase Delete Project Error:', error.message);
            return false;
        }
        return true;
    } catch (err) {
        console.warn('Supabase Connection Unavailable (Delete).', err);
        return false;
    }
};

// --- MAPPERS ---

const mapDbProjectToOpportunity = (row: DbProject, tasks: DbTask[] = []): Opportunity => {
    const tads: TadsCriteria = {
        scalability: row.tadsescalabilidade,
        integration: row.tadsintegracao,
        painPoint: row.tadsdorreal,
        recurring: row.tadsrecorrencia,
        mvpSpeed: row.tadsvelocidade
    };

    const tadsScore = Object.values(tads).filter(Boolean).length * 2;

    // Map 'tasks' rows to BPMN Nodes/Tasks
    const bpmnNodes: BpmnNode[] = [];
    
    const mappedTasks: BpmnTask[] = tasks
        .filter(t => !t.sutarefa) // Main tasks only
        .map(t => ({
            id: t.id.toString(),
            dbId: t.id,
            text: t.titulo,
            description: t.descricao,
            status: t.status as any,
            completed: t.status === 'done',
            assignee: t.responsavelData?.nome || undefined,
            assigneeId: t.responsavel || undefined, // Map UUID for logic
            assigneeIsDev: t.responsavelData?.desenvolvedor,
            startDate: t.datainicio || t.dataproposta,
            dueDate: t.datafim || t.deadline,
            estimatedHours: t.duracaohoras,
            gut: { g: t.gravidade, u: t.urgencia, t: t.tendencia },
            subtasks: []
        }));

    // Re-attach subtasks if loaded
    if (tasks.length > 0) {
        const subtasks = tasks.filter(t => t.sutarefa);
        
        subtasks.forEach(sub => {
            // Check both 'tarefa' (legacy) and 'tarefamae' (new) columns
            const parentId = sub.tarefamae || sub.tarefa;
            
            if (parentId) {
                const parent = mappedTasks.find(p => p.dbId === parentId);
                if (parent) {
                    parent.subtasks = parent.subtasks || [];
                    parent.subtasks.push({
                        id: sub.id.toString(),
                        text: sub.titulo,
                        completed: sub.status === 'done',
                        dbId: sub.id,
                        dueDate: sub.datafim || sub.deadline,
                        assignee: sub.responsavelData?.nome,
                        assigneeId: sub.responsavel
                    });
                }
            }
        });
    }

    if (mappedTasks.length > 0) {
        bpmnNodes.push({
            id: 'node_main_execution',
            label: 'Lista de Execução',
            laneId: 'lane_main',
            type: 'task',
            checklist: mappedTasks,
            x: 100, 
            y: 80
        });
    }

    // Use saved structure if available, otherwise use generated default
    const baseBpmn = row.bpmn_structure && (row.bpmn_structure as any).nodes ? row.bpmn_structure : {
        lanes: [{ id: 'lane_main', label: 'Fluxo' }],
        nodes: bpmnNodes,
        edges: []
    };

    return {
        id: row.id.toString(),
        title: row.nome,
        description: row.descricao,
        clientId: row.cliente || undefined,
        organizationId: row.organizacao,
        rde: row.rde as RDEStatus,
        viability: row.viabilidade,
        velocity: row.velocidade,
        revenue: row.receita,
        prioScore: row.prioseis,
        archetype: row.arquetipo as Archetype,
        intensity: row.intensidade as IntensityLevel,
        tads: tads,
        tadsScore: tadsScore,
        evidence: { clientsAsk: [], clientsSuffer: [], wontPay: [] },
        status: row.projoport ? 'Future' : 'Active',
        createdAt: row.created_at,
        bpmn: baseBpmn as any,
        dbProjectId: row.id,
        docsContext: row.contexto_ia || ''
    };
};

const mapOpportunityToDbProject = (opp: Opportunity): any => {
    return {
        nome: opp.title,
        descricao: opp.description || '',
        cliente: opp.clientId || null,
        rde: opp.rde,
        velocidade: opp.velocity,
        viabilidade: opp.viability,
        receita: opp.revenue,
        prioseis: opp.prioScore,
        arquetipo: opp.archetype,
        intensidade: opp.intensity,
        tadsescalabilidade: opp.tads.scalability,
        tadsintegracao: opp.tads.integration,
        tadsdorreal: opp.tads.painPoint,
        tadsrecorrencia: opp.tads.recurring,
        tadsvelocidade: opp.tads.mvpSpeed,
        organizacao: opp.organizationId || 3,
        projoport: opp.status === 'Future' || opp.status === 'Negotiation' || opp.status === 'Frozen',
        bpmn_structure: opp.bpmn || {},
        contexto_ia: opp.docsContext || ''
    };
};


import { supabase } from './supabaseClient';
import { Opportunity, DbProject, RDEStatus, Archetype, IntensityLevel, TadsCriteria, DbTask, BpmnTask, BpmnNode } from '../types';

const TABLE_NAME = 'projetos';

export const fetchOpportunities = async (organizationId?: number, clientId?: string): Promise<Opportunity[] | null> => {
  if (!supabase) return null;
  
  try {
    let query = supabase
      .from(TABLE_NAME)
      .select(`*, clienteData:clientes(nome, logo_url)`)
      .order('prioseis', { ascending: false });

    if (clientId) {
        query = query.eq('cliente', clientId);
    } else if (organizationId !== undefined && organizationId !== null) {
        query = query.eq('organizacao', organizationId);
    } else {
        return [];
    }

    const { data: projects, error } = await query;
    if (error) return null;

    if (!projects || projects.length === 0) return [];

    const projectIds = projects.map(p => p.id);

    let tasksQuery = supabase.from('tasks').select('*').in('projeto', projectIds);
    const { data: tasks } = await tasksQuery;

    let userMap = new Map<string, any>();
    if (tasks && tasks.length > 0) {
        const userIds = [...new Set(tasks.map((t: any) => t.responsavel).filter(Boolean))];
        if (userIds.length > 0) {
            const { data: users } = await supabase.from('users').select('id, nome, desenvolvedor').in('id', userIds);
            users?.forEach(u => userMap.set(u.id, u));
        }
    }

    return projects.map((row: any) => {
        const projectTasks = tasks ? tasks.filter((t: any) => t.projeto === row.id) : [];
        const hydratedTasks = projectTasks.map((t: any) => ({
            ...t,
            responsavelData: userMap.get(t.responsavel)
        }));
        return mapDbProjectToOpportunity(row, hydratedTasks);
    });
  } catch (err) {
    console.error("fetchOpportunities error:", err);
    return null;
  }
};

export const fetchOpportunityById = async (id: string | number): Promise<Opportunity | null> => {
    if (!supabase) return null;
    try {
        const { data: project, error } = await supabase.from(TABLE_NAME).select(`*, clienteData:clientes(nome, logo_url)`).eq('id', id).single();
        if (error || !project) return null;

        const { data: tasks } = await supabase.from('tasks').select('*').eq('projeto', id);
        return mapDbProjectToOpportunity(project, tasks || []);
    } catch (e) { return null; }
};

export const createOpportunity = async (opp: Opportunity): Promise<Opportunity | null> => {
    if (!supabase) return null;

    try {
        const { data: auth } = await supabase.auth.getUser();
        let targetOrgId = opp.organizationId;

        if (!targetOrgId && auth.user) {
            const { data: u } = await supabase.from('users').select('organizacao').eq('id', auth.user.id).single();
            targetOrgId = u?.organizacao;
        }

        if (!targetOrgId) return null;

        const dbPayload = mapOpportunityToDbProject({ ...opp, organizationId: Number(targetOrgId) });
        delete dbPayload.id; 
        
        const { data: projectData, error } = await supabase
            .from(TABLE_NAME)
            .insert(dbPayload)
            .select()
            .single();
        
        if (error) throw new Error(`Falha no banco: ${error.message}`);

        if (opp.bpmn?.nodes && opp.bpmn.nodes.length > 0) {
            const defaultAssignee = auth.user?.id;
            for (const node of opp.bpmn.nodes) {
                if (node.checklist) {
                    for (const task of node.checklist) {
                        const { data: parentTask } = await supabase.from('tasks').insert({
                            projeto: projectData.id,
                            titulo: task.text,
                            descricao: task.description || node.label || '',
                            status: 'todo',
                            responsavel: task.assigneeId || defaultAssignee,
                            duracaohoras: Number(task.estimatedHours) || 2,
                            organizacao: Number(targetOrgId),
                            gravidade: task.gut?.g || 1, 
                            urgencia: task.gut?.u || 1, 
                            tendencia: task.gut?.t || 1,
                            dataproposta: new Date().toISOString(),
                            sutarefa: false
                        }).select().single();

                        if (parentTask && task.subtasks) {
                            const subtasksPayload = task.subtasks.map(sub => ({
                                projeto: projectData.id,
                                titulo: sub.text,
                                status: 'todo',
                                responsavel: sub.assigneeId || defaultAssignee,
                                tarefamae: parentTask.id,
                                sutarefa: true,
                                organizacao: Number(targetOrgId),
                                descricao: 'Subtarefa automatizada',
                                dataproposta: new Date().toISOString(),
                                gravidade: 1, urgencia: 1, tendencia: 1,
                                duracaohoras: 1
                            }));
                            if(subtasksPayload.length > 0) await supabase.from('tasks').insert(subtasksPayload);
                        }
                    }
                }
            }
        }
        
        return mapDbProjectToOpportunity(projectData, []);
    } catch (err: any) {
        console.error("createOpportunity error:", err);
        return null;
    }
};

export const updateOpportunity = async (opp: Opportunity): Promise<Opportunity | null> => {
    if (!supabase) return null;
    try {
        const dbPayload = mapOpportunityToDbProject(opp);
        const { id, ...updateData } = dbPayload;
        
        const { data, error } = await supabase.from(TABLE_NAME).update(updateData).eq('id', opp.id).select().single();
        if (error) return null;

        const { data: tasks } = await supabase.from('tasks').select('*').eq('projeto', opp.id);
        return mapDbProjectToOpportunity(data, tasks || []); 
    } catch (err) { return null; }
};

export const deleteOpportunity = async (id: string | number): Promise<boolean> => {
    if (!supabase) return false;
    const numericId = Number(id);
    if (isNaN(numericId)) return false;

    try {
        const { data: tasks } = await supabase.from('tasks').select('id').eq('projeto', numericId);
        if (tasks && tasks.length > 0) {
            const taskIds = tasks.map((t: any) => t.id);
            await supabase.from('comentarios').delete().in('task', taskIds);
            await supabase.from('tasks').delete().eq('projeto', numericId);
        }
        const { error } = await supabase.from(TABLE_NAME).delete().eq('id', numericId);
        return !error;
    } catch (err) { return false; }
};

const mapDbProjectToOpportunity = (row: DbProject, tasks: DbTask[] = []): Opportunity => {
    const tads: TadsCriteria = {
        scalability: !!row.tadsescalabilidade,
        integration: !!row.tadsintegracao,
        painPoint: !!row.tadsdorreal,
        recurring: !!row.tadsrecorrencia,
        mvpSpeed: !!row.tadsvelocidade
    };

    const bpmnStructure = row.bpmn_structure || { lanes: [], nodes: [], edges: [] };
    const savedStatus = (bpmnStructure as any).status || (row.projoport ? 'Future' : 'Active');

    return {
        id: row.id.toString(),
        title: row.nome,
        description: row.descricao || '',
        clientId: row.cliente || undefined,
        organizationId: row.organizacao,
        rde: (row.rde as RDEStatus) || RDEStatus.WARM,
        viability: row.viabilidade || 1,
        velocity: row.velocidade || 1,
        revenue: row.receita || 1,
        prioScore: row.prioseis || 0,
        archetype: (row.arquetipo as Archetype) || Archetype.SAAS_ENTRY,
        intensity: (row.intensidade as IntensityLevel) || IntensityLevel.L1,
        tads: tads,
        tadsScore: Object.values(tads).filter(Boolean).length * 2, 
        status: savedStatus,
        createdAt: row.created_at,
        bpmn: bpmnStructure,
        dbProjectId: row.id,
        docsContext: row.contexto_ia || '',
        color: row.cor || '#F59E0B',
        mrr: row.mrr || 0,
        meses: row.meses || 12
    };
};

const mapOpportunityToDbProject = (opp: Opportunity): any => {
    const updatedBpmn = { ...opp.bpmn, status: opp.status };

    return {
        nome: opp.title || 'Sem Título',
        descricao: opp.description || '',
        cliente: opp.clientId || null,
        rde: opp.rde || 'Morno',
        velocidade: Number(opp.velocity) || 1,
        viabilidade: Number(opp.viability) || 1,
        receita: Number(opp.revenue) || 1,
        prioseis: Number(opp.prioScore) || 0,
        arquetipo: opp.archetype || 'SaaS de Entrada',
        intensidade: Number(opp.intensity) || 1,
        tadsescalabilidade: !!opp.tads?.scalability,
        tadsintegracao: !!opp.tads?.integration,
        tadsdorreal: !!opp.tads?.painPoint,
        tadsrecorrencia: !!opp.tads?.recurring,
        tadsvelocidade: !!opp.tads?.mvpSpeed,
        organizacao: Number(opp.organizationId), 
        projoport: opp.status !== 'Active',
        bpmn_structure: updatedBpmn,
        contexto_ia: opp.docsContext || '',
        color: opp.color || '#F59E0B',
        mrr: Number(opp.mrr) || 0,
        meses: Number(opp.meses) || 12
    };
};


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

    // Criamos o array de oportunidades e aplicamos um DEEP CLONE no resultado final 
    // para garantir que nenhuma referência "read-only" do driver do Supabase chegue ao React
    const results = projects.map((row: any) => {
        const projectTasks = tasks ? tasks.filter((t: any) => t.projeto === row.id) : [];
        const hydratedTasks = projectTasks.map((t: any) => ({
            ...t,
            responsavelData: userMap.get(t.responsavel)
        }));
        return mapDbProjectToOpportunity(row, hydratedTasks);
    });

    return JSON.parse(JSON.stringify(results));
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
        const result = mapDbProjectToOpportunity(project, tasks || []);
        return JSON.parse(JSON.stringify(result));
    } catch (e) { return null; }
};

export const createOpportunity = async (opp: Opportunity): Promise<Opportunity | null> => {
    if (!supabase) return null;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        let targetOrgId = opp.organizationId;

        if (!targetOrgId && user) {
            const { data: u } = await supabase.from('users').select('organizacao').eq('id', user.id).single();
            targetOrgId = u?.organizacao;
        }

        if (!targetOrgId) {
            console.error("createOpportunity: organizationId not found.");
            return null;
        }

        const dbPayload = mapOpportunityToDbProject({ ...opp, organizationId: Number(targetOrgId) });
        
        // Remove ID to allow serial generation
        const { id, ...insertData } = dbPayload;
        
        const { data: projectData, error } = await supabase
            .from(TABLE_NAME)
            .insert(insertData)
            .select()
            .single();
        
        if (error) {
            console.error("DB Insert Error:", error.message);
            throw new Error(`Falha no banco: ${error.message}`);
        }

        const result = mapDbProjectToOpportunity(projectData, []);
        return JSON.parse(JSON.stringify(result));
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
        const result = mapDbProjectToOpportunity(data, tasks || []); 
        return JSON.parse(JSON.stringify(result));
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

    // Snapshot BPMN snapshot inicial
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
        id: opp.id ? Number(opp.id) : undefined,
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
        cor: opp.color || '#F59E0B',
        mrr: Number(opp.mrr) || 0,
        meses: Number(opp.meses) || 12
    };
};
